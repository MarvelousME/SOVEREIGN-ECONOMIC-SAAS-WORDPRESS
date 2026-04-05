<?php
if (!defined('ABSPATH')) exit;

class SAAOS_Widget_Renderer {
    private array $settings;
    private array $widgets = [];

    public function __construct() {
        $this->settings = get_option('saaos_analytics_embed_settings', []);
        $this->init_widgets();
    }

    private function init_widgets(): void {
        $this->widgets = [
            'overview' => new SAAOS_Overview_Widget(),
            'revenue' => new SAAOS_Revenue_Widget(),
            'performance' => new SAAOS_Performance_Widget()
        ];
    }

    public function render_widget(string $widget_type, array $params = []): string {
        if (!isset($this->widgets[$widget_type])) {
            return $this->render_error_widget('Unknown widget type: ' . esc_html($widget_type));
        }

        $widget = $this->widgets[$widget_type];

        if (!$this->user_has_access($widget_type)) {
            return $this->render_error_widget('Access denied to this widget');
        }

        try {
            return $widget->render($params);
        } catch (Exception $e) {
            return $this->render_error_widget('Widget render error: ' . esc_html($e->getMessage()));
        }
    }

    public function render_error_widget(string $message): string {
        return sprintf(
            '<div class="saaos-widget-error" style="padding: 20px; text-align: center; color: #dc3545; background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 4px;">
                <p>%s</p>
            </div>',
            esc_html($message)
        );
    }

    public function get_widget_config(string $widget_type): ?array {
        $configs = $this->settings['widget_configs'] ?? [];

        return $configs[$widget_type] ?? null;
    }

    public function save_widget_config(string $widget_type, array $config): bool {
        $settings = get_option('saaos_analytics_embed_settings', []);
        $settings['widget_configs'] = $settings['widget_configs'] ?? [];
        $settings['widget_configs'][$widget_type] = $config;

        return update_option('saaos_analytics_embed_settings', $settings);
    }

    public function get_available_widgets(): array {
        return array_keys($this->widgets);
    }

    public function get_widget_info(string $widget_type): ?array {
        if (!isset($this->widgets[$widget_type])) {
            return null;
        }

        $widget = $this->widgets[$widget_type];

        return [
            'type' => $widget_type,
            'title' => $widget->get_title(),
            'description' => $widget->get_description(),
            'supports' => $widget->get_supported_periods()
        ];
    }

    private function user_has_access(string $widget_type): bool {
        $config = $this->get_widget_config($widget_type);

        if (!$config) {
            return true;
        }

        if (isset($config['require_login']) && $config['require_login']) {
            if (!is_user_logged_in()) {
                return false;
            }
        }

        if (isset($config['allowed_roles']) && !empty($config['allowed_roles'])) {
            if (!is_user_logged_in()) {
                return false;
            }

            $user = wp_get_current_user();
            $user_roles = (array) $user->roles;

            if (!array_intersect($user_roles, $config['allowed_roles'])) {
                return false;
            }
        }

        return true;
    }

    public function enqueue_widget_assets(string $widget_type): void {
        if (!isset($this->widgets[$widget_type])) {
            return;
        }

        $widget = $this->widgets[$widget_type];

        foreach ($widget->get_dependencies() as $dep) {
            wp_enqueue_script($dep);
        }

        foreach ($widget->get_styles() as $style) {
            wp_enqueue_style($style);
        }
    }

    public function get_widget_cache_key(string $widget_type, array $params): string {
        $user_id = get_current_user_id();
        $blog_id = get_current_blog_id();

        return sprintf(
            'saaos_widget_%s_%d_%d_%s',
            $widget_type,
            $blog_id,
            $user_id,
            md5(wp_json_encode($params))
        );
    }

    public function get_cached_widget(string $widget_type, array $params): ?string {
        $cache_key = $this->get_widget_cache_key($widget_type, $params);
        $cached = get_transient($cache_key);

        return $cached ?: null;
    }

    public function set_cached_widget(string $widget_type, array $params, string $html, int $expiry = 300): bool {
        $cache_key = $this->get_widget_cache_key($widget_type, $params);

        return set_transient($cache_key, $html, $expiry);
    }

    public function invalidate_widget_cache(string $widget_type): bool {
        global $wpdb;

        $pattern = '_transient_saaos_widget_' . $widget_type . '_%';

        $wpdb->query("DELETE FROM {$wpdb->options} WHERE option_name LIKE '" . esc_sql($pattern) . "'");

        return true;
    }
}
