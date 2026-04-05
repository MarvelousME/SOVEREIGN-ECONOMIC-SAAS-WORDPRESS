<?php
if (!defined('ABSPATH')) exit;

class SAAOS_Embed_Security {
    private static ?SAAOS_Embed_Security $instance = null;
    private array $settings;

    public static function instance(): SAAOS_Embed_Security {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    private function __construct() {
        $this->settings = get_option('saaos_analytics_embed_settings', []);
    }

    public function validate_embed_request(array $params): bool {
        if (!$this->check_nonce($params)) {
            return false;
        }

        if (!$this->check_permissions($params)) {
            return false;
        }

        if (!$this->check_rate_limit($params)) {
            return false;
        }

        if (!$this->check_widget_access($params)) {
            return false;
        }

        return true;
    }

    private function check_nonce(array $params): bool {
        if (empty($params['nonce'])) {
            return true;
        }

        return wp_verify_nonce($params['nonce'], 'saaos_analytics_nonce');
    }

    private function check_permissions(array $params): bool {
        if (empty($params['widget'])) {
            return false;
        }

        $widget_permissions = $this->settings['widget_permissions'] ?? [];

        if (!isset($widget_permissions[$params['widget']])) {
            return true;
        }

        $required_cap = $widget_permissions[$params['widget']]['capability'] ?? 'read';

        return current_user_can($required_cap);
    }

    private function check_rate_limit(array $params): bool {
        $ip = $this->get_client_ip();

        $rate_limit_key = 'saaos_embed_rate_' . md5($ip);
        $count = get_transient($rate_limit_key);

        $limit = isset($this->settings['rate_limit']) ? absint($this->settings['rate_limit']) : 100;

        if ($count !== false && $count >= $limit) {
            return false;
        }

        if ($count === false) {
            set_transient($rate_limit_key, 1, MINUTE_IN_SECONDS);
        } else {
            set_transient($rate_limit_key, $count + 1, MINUTE_IN_SECONDS);
        }

        return true;
    }

    private function check_widget_access(array $params): bool {
        $allowed_widgets = $this->get_allowed_widgets();

        if (empty($allowed_widgets)) {
            return true;
        }

        return in_array($params['widget'], $allowed_widgets, true);
    }

    public function sanitize_embed_params(array $params): array {
        $sanitized = [
            'widget' => sanitize_text_field($params['widget'] ?? ''),
            'period' => sanitize_text_field($params['period'] ?? '30d'),
            'height' => absint($params['height'] ?? 400),
            'width' => sanitize_text_field($params['width'] ?? '100%'),
            'class' => sanitize_html_class($params['class'] ?? ''),
            'token' => sanitize_text_field($params['token'] ?? ''),
            'nonce' => sanitize_text_field($params['nonce'] ?? '')
        ];

        return $sanitized;
    }

    public function get_allowed_widgets(): array {
        $widget_settings = $this->settings['widgets'] ?? [];

        if (empty($widget_settings)) {
            return ['overview', 'revenue', 'performance', 'leads'];
        }

        $allowed = [];
        foreach ($widget_settings as $widget => $config) {
            if (isset($config['enabled']) && $config['enabled']) {
                $allowed[] = $widget;
            }
        }

        return $allowed;
    }

    public function set_widget_enabled(string $widget, bool $enabled): bool {
        $settings = get_option('saaos_analytics_embed_settings', []);

        $settings['widgets'] = $settings['widgets'] ?? [];
        $settings['widgets'][$widget] = $settings['widgets'][$widget] ?? [];
        $settings['widgets'][$widget]['enabled'] = $enabled;

        return update_option('saaos_analytics_embed_settings', $settings);
    }

    public function is_embed_allowed_for_current_page(): bool {
        $allowed_post_types = $this->settings['allowed_post_types'] ?? ['post', 'page'];

        if (!is_singular()) {
            return false;
        }

        $post_type = get_post_type();

        if (!in_array($post_type, $allowed_post_types, true)) {
            return false;
        }

        return true;
    }

    public function get_allowed_origins(): array {
        $origins = $this->settings['allowed_origins'] ?? [];

        if (empty($origins)) {
            $site_url = parse_url(get_site_url(), PHP_URL_HOST);
            $origins[] = 'https://' . $site_url;
            $origins[] = 'https://app.sovereign-os.com';
        }

        return array_unique($origins);
    }

    public function validate_origin(string $origin): bool {
        $allowed = $this->get_allowed_origins();

        foreach ($allowed as $pattern) {
            if ($this->origin_matches($origin, $pattern)) {
                return true;
            }
        }

        return false;
    }

    private function origin_matches(string $origin, string $pattern): bool {
        if ($pattern === $origin) {
            return true;
        }

        $pattern_parts = parse_url($pattern);
        $origin_parts = parse_url($origin);

        if (isset($pattern_parts['scheme']) && $pattern_parts['scheme'] !== $origin_parts['scheme']) {
            return false;
        }

        if (isset($pattern_parts['host']) && $pattern_parts['host'] !== $origin_parts['host']) {
            return false;
        }

        if (isset($pattern_parts['port']) && $pattern_parts['port'] !== $origin_parts['port']) {
            return false;
        }

        return true;
    }

    public function add_security_headers(): void {
        if (!headers_sent()) {
            $origins = $this->get_allowed_origins();

            if (count($origins) === 1) {
                header('X-Frame-Options: ALLOW-FROM ' . $origins[0]);
                header('Content-Security-Policy: frame-ancestors ' . implode(' ', $origins));
            } else {
                header('X-Frame-Options: SAMEORIGIN');
            }

            header('X-Content-Type-Options: nosniff');
            header('X-XSS-Protection: 1; mode=block');
        }
    }

    private function get_client_ip(): string {
        $ip_keys = ['HTTP_CF_CONNECTING_IP', 'HTTP_X_FORWARDED_FOR', 'HTTP_X_REAL_IP', 'REMOTE_ADDR'];
        foreach ($ip_keys as $key) {
            if (!empty($_SERVER[$key])) {
                $ip = $_SERVER[$key];
                if (strpos($ip, ',') !== false) {
                    $ip = trim(explode(',', $ip)[0]);
                }
                if (filter_var($ip, FILTER_VALIDATE_IP)) {
                    return $ip;
                }
            }
        }
        return '0.0.0.0';
    }
}

SAAOS_Embed_Security::instance();
