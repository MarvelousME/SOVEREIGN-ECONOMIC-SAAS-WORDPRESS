<?php
if (!defined('ABSPATH')) exit;

class SAAOS_Router {
    private array $settings;

    public function __construct(array $settings = []) {
        $this->settings = $settings;
    }

    public function get_ab_destination(string $campaign): ?string {
        $ab_variants = $this->settings['ab_variants'] ?? [];

        if (!isset($ab_variants[$campaign])) {
            return null;
        }

        $variant = $this->get_ab_variant($campaign);
        $destination_key = 'destination_' . $variant;

        return $ab_variants[$campaign][$destination_key] ?? null;
    }

    private function get_ab_variant(string $campaign): string {
        $ab_variants = $this->settings['ab_variants'] ?? [];

        if (!isset($ab_variants[$campaign])) {
            return 'a';
        }

        $weight_a = floatval($ab_variants[$campaign]['weight_a'] ?? 50);
        $random = floatval(mt_rand(1, 10000) / 100);

        return $random <= $weight_a ? 'a' : 'b';
    }

    public function get_device_destination(string $device, string $campaign): ?string {
        $device_routing = $this->settings['device_routing'] ?? [];

        if (!isset($device_routing[$campaign])) {
            return null;
        }

        $destinations = $device_routing[$campaign];

        switch ($device) {
            case 'mobile':
                return $destinations['mobile'] ?? null;
            case 'tablet':
                return $destinations['tablet'] ?? $destinations['mobile'] ?? null;
            case 'desktop':
            default:
                return $destinations['desktop'] ?? null;
        }
    }

    public function get_campaign_destinations(string $campaign): array {
        $ab_variants = $this->settings['ab_variants'] ?? [];

        if (!isset($ab_variants[$campaign])) {
            return [];
        }

        return [
            'a' => $ab_variants[$campaign]['destination_a'] ?? '',
            'b' => $ab_variants[$campaign]['destination_b'] ?? ''
        ];
    }

    public function get_routing_stats(string $campaign): array {
        global $wpdb;
        $table = $wpdb->prefix . 'saaos_clicks';

        $total = (int) $wpdb->get_var(
            $wpdb->prepare("SELECT COUNT(*) FROM {$table} WHERE campaign = %s", $campaign)
        );

        $variant_a = (int) $wpdb->get_var(
            $wpdb->prepare(
                "SELECT COUNT(*) FROM {$table} WHERE campaign = %s AND created_at >= %d",
                $campaign,
                time() - DAY_IN_SECONDS
            )
        );

        $converted = (int) $wpdb->get_var(
            $wpdb->prepare(
                "SELECT COUNT(*) FROM {$table} WHERE campaign = %s AND converted = 1",
                $campaign
            )
        );

        return [
            'total_clicks' => $total,
            'variant_a_clicks' => $variant_a,
            'variant_b_clicks' => $total - $variant_a,
            'total_conversions' => $converted,
            'conversion_rate' => $total > 0 ? round(($converted / $total) * 100, 2) : 0,
            'variant_a_rate' => $variant_a > 0 ? round(($converted / $variant_a) * 100, 2) : 0,
            'variant_b_rate' => ($total - $variant_a) > 0 ? round(($converted / ($total - $variant_a)) * 100, 2) : 0
        ];
    }

    public function register_ab_test(string $campaign, string $url_a, string $url_b, float $weight_a = 50.0): bool {
        if ($weight_a < 0 || $weight_a > 100) {
            return false;
        }

        $settings = get_option('saaos_traffic_router_settings', []);

        if (!isset($settings['ab_variants'])) {
            $settings['ab_variants'] = [];
        }

        $settings['ab_variants'][$campaign] = [
            'destination_a' => esc_url_raw($url_a),
            'destination_b' => esc_url_raw($url_b),
            'weight_a' => $weight_a,
            'weight_b' => 100 - $weight_a,
            'created_at' => time()
        ];

        return update_option('saaos_traffic_router_settings', $settings);
    }

    public function unregister_ab_test(string $campaign): bool {
        $settings = get_option('saaos_traffic_router_settings', []);

        if (!isset($settings['ab_variants'][$campaign])) {
            return false;
        }

        unset($settings['ab_variants'][$campaign]);

        return update_option('saaos_traffic_router_settings', $settings);
    }

    public function update_ab_weights(string $campaign, float $weight_a): bool {
        if ($weight_a < 0 || $weight_a > 100) {
            return false;
        }

        $settings = get_option('saaos_traffic_router_settings', []);

        if (!isset($settings['ab_variants'][$campaign])) {
            return false;
        }

        $settings['ab_variants'][$campaign]['weight_a'] = $weight_a;
        $settings['ab_variants'][$campaign]['weight_b'] = 100 - $weight_a;
        $settings['ab_variants'][$campaign]['updated_at'] = time();

        return update_option('saaos_traffic_router_settings', $settings);
    }

    public function get_all_campaigns(): array {
        global $wpdb;
        $table = $wpdb->prefix . 'saaos_clicks';

        $campaigns = $wpdb->get_results(
            "SELECT DISTINCT campaign FROM {$table} ORDER BY campaign ASC",
            ARRAY_A
        );

        return array_column($campaigns, 'campaign');
    }

    public function route_request(array $params): array {
        $campaign = sanitize_text_field($params['campaign'] ?? '');
        $source = sanitize_text_field($params['source'] ?? '');
        $medium = sanitize_text_field($params['medium'] ?? '');
        $device = sanitize_text_field($params['device'] ?? '');
        $geo = sanitize_text_field($params['geo'] ?? '');

        $destination = null;
        $routing_reason = 'default';

        if ($geo) {
            $geo_routing = new SAAOS_Geo_Routing($this->settings);
            $geo_dest = $geo_routing->get_destination_for_geo($geo, $campaign);
            if ($geo_dest) {
                $destination = $geo_dest;
                $routing_reason = 'geo';
            }
        }

        if (!$destination && $device) {
            $device_dest = $this->get_device_destination($device, $campaign);
            if ($device_dest) {
                $destination = $device_dest;
                $routing_reason = 'device';
            }
        }

        if (!$destination) {
            $ab_dest = $this->get_ab_destination($campaign);
            if ($ab_dest) {
                $destination = $ab_dest;
                $routing_reason = 'ab_test';
            }
        }

        if (!$destination) {
            $destination = $this->settings['default_landing_page'] ?? home_url();
            $routing_reason = 'fallback';
        }

        return [
            'destination' => $destination,
            'routing_reason' => $routing_reason,
            'campaign' => $campaign,
            'variant' => $this->get_ab_variant($campaign),
            'device' => $device,
            'geo' => $geo
        ];
    }
}
