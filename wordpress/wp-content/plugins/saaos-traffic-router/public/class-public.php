<?php
if (!defined('ABSPATH')) exit;

class SAAOS_Traffic_Router_Public {
    private SAAOS_Click_Tracker $click_tracker;
    private SAAOS_Conversion_Tracker $conversion_tracker;

    public function __construct() {
        $this->click_tracker = new SAAOS_Click_Tracker();
        $this->conversion_tracker = new SAAOS_Conversion_Tracker();

        add_action('wp_head', [$this, 'output_tracking_pixel'], 1);
        add_filter('the_content', [$this, 'inject_click_tracking'], 1);
        add_filter('the_excerpt', [$this, 'inject_click_tracking'], 1);
    }

    public function output_tracking_pixel(): void {
        if (!is_singular()) {
            return;
        }

        $settings = get_option('saaos_traffic_router_settings', []);
        $pixels = $settings['conversion_pixels'] ?? [];

        if (empty($pixels)) {
            return;
        }

        $output = "<!-- SAAOS Traffic Router Tracking -->\n";

        foreach ($pixels as $pixel_id => $pixel) {
            $nonce = wp_create_nonce('saaos_pixel_' . $pixel_id);
            $pixel_url = add_query_arg([
                'saaos_pixel' => $pixel_id,
                'saaos_nonce' => $nonce,
                'saaos_click' => isset($_COOKIE['saaos_last_click']) ? sanitize_text_field($_COOKIE['saaos_last_click']) : '',
                'saaos_ref' => isset($_COOKIE['sovereign_ref']) ? sanitize_text_field($_COOKIE['sovereign_ref']) : ''
            ], admin_url('admin-ajax.php'));

            $output .= sprintf(
                '<img src="%s" width="1" height="1" style="display:none;" alt="" id="saaos-pixel-%s" />' . "\n",
                esc_url($pixel_url),
                esc_attr($pixel_id)
            );
        }

        echo $output;
    }

    public function inject_click_tracking(string $content): string {
        if (!is_singular()) {
            return $content;
        }

        if (is_admin() || wp_doing_ajax() || wp_doing_cron()) {
            return $content;
        }

        $tracked_urls = $this->find_external_links($content);

        foreach ($tracked_urls as $url => $count) {
            if ($count > 5) {
                continue;
            }

            $pattern = '/href=["\']' . preg_quote($url, '/') . '["\'][^>]*>/i';

            $replacement = function ($matches) use ($url) {
                if (strpos($matches[0], 'data-saaos-tracked') !== false) {
                    return $matches[0];
                }

                $click_id = $this->generate_tracking_id();
                $this->store_pending_click($click_id, $url);

                $tracked_url = add_query_arg([
                    'saaos_click_id' => $click_id,
                    'saaos_tracked' => '1'
                ], $url);

                return str_replace($url, $tracked_url, $matches[0]) . "\n";
            };

            $content = preg_replace_callback($pattern, $replacement, $content, 1);
        }

        return $content;
    }

    private function find_external_links(string $content): array {
        $links = [];

        preg_match_all('/href=["\'](https?:\/\/[^"\']+)["\']/i', $content, $matches);

        $home_domain = parse_url(home_url(), PHP_URL_HOST);

        foreach ($matches[1] as $url) {
            $link_domain = parse_url($url, PHP_URL_HOST);

            if ($link_domain && $link_domain !== $home_domain) {
                $links[$url] = isset($links[$url]) ? $links[$url] + 1 : 1;
            }
        }

        return $links;
    }

    private function generate_tracking_id(): string {
        return sprintf(
            'trk_%04x%04x%04x%04x',
            mt_rand(0, 0xffff),
            mt_rand(0, 0xffff),
            mt_rand(0, 0xffff),
            mt_rand(0, 0xffff)
        );
    }

    private function store_pending_click(string $click_id, string $url): void {
        $click_data = [
            'id' => $click_id,
            'url' => $url,
            'timestamp' => time(),
            'device' => $this->detect_device(),
            'source' => isset($_COOKIE['saaos_source']) ? sanitize_text_field($_COOKIE['saaos_source']) : 'direct',
            'medium' => isset($_COOKIE['saaos_medium']) ? sanitize_text_field($_COOKIE['saaos_medium']) : 'content',
            'campaign' => isset($_COOKIE['saaos_campaign']) ? sanitize_text_field($_COOKIE['saaos_campaign']) : ''
        ];

        set_transient('saaos_pending_' . $click_id, $click_data, HOUR_IN_SECONDS);
    }

    private function detect_device(): string {
        $ua = isset($_SERVER['HTTP_USER_AGENT']) ? $_SERVER['HTTP_USER_AGENT'] : '';

        if (preg_match('/mobile|android|iphone|ipod|blackberry|windows phone/i', $ua)) {
            if (preg_match('/tablet|ipad/i', $ua)) {
                return 'tablet';
            }
            return 'mobile';
        }

        return 'desktop';
    }

    public function track_outbound_click(string $url, string $source = '', string $medium = '', string $campaign = ''): void {
        $click_id = $this->click_tracker->track_click([
            'url' => $url,
            'source' => $source ?: 'direct',
            'medium' => $medium ?: 'outbound',
            'campaign' => $campaign ?: ''
        ]);

        setcookie('saaos_last_click', $click_id, [
            'expires' => time() + MONTH_IN_SECONDS,
            'path' => COOKIEPATH ?: '/',
            'secure' => is_ssl(),
            'httponly' => false,
            'samesite' => 'Lax'
        ]);
    }

    public function record_conversion(float $value = 0.0, string $currency = 'USD', string $event_type = 'purchase', string $order_id = ''): string {
        return $this->conversion_tracker->track_conversion([
            'click_id' => isset($_COOKIE['saaos_last_click']) ? sanitize_text_field($_COOKIE['saaos_last_click']) : '',
            'referral_code' => isset($_COOKIE['sovereign_ref']) ? sanitize_text_field($_COOKIE['sovereign_ref']) : '',
            'value' => $value,
            'currency' => $currency,
            'event_type' => $event_type,
            'order_id' => $order_id
        ]);
    }
}

new SAAOS_Traffic_Router_Public();
