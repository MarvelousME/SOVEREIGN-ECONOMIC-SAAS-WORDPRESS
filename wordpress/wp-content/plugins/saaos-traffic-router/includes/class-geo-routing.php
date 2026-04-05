<?php
if (!defined('ABSPATH')) exit;

class SAAOS_Geo_Routing {
    private array $settings;
    private static ?array $geo_cache = null;

    public function __construct(array $settings = []) {
        $this->settings = $settings;
    }

    public function get_destination_for_geo(string $geo_code, string $campaign = ''): ?string {
        $geo_routing = $this->settings['geo_routing'] ?? [];

        if (empty($geo_routing)) {
            return null;
        }

        if ($campaign && isset($geo_routing[$campaign])) {
            $dest = $this->find_geo_destination($geo_routing[$campaign], $geo_code);
            if ($dest) {
                return $dest;
            }
        }

        foreach ($geo_routing as $campaign_key => $rules) {
            if ($campaign_key !== $campaign) {
                $dest = $this->find_geo_destination($rules, $geo_code);
                if ($dest) {
                    return $dest;
                }
            }
        }

        return null;
    }

    private function find_geo_destination(array $rules, string $geo_code): ?string {
        if (isset($rules['destinations'][$geo_code])) {
            return $rules['destinations'][$geo_code];
        }

        $region = $this->get_region_for_country($geo_code);
        if ($region && isset($rules['destinations'][$region])) {
            return $rules['destinations'][$region];
        }

        if (isset($rules['destinations']['default'])) {
            return $rules['destinations']['default'];
        }

        return null;
    }

    public function get_region_for_country(string $country_code): ?string {
        $regions = [
            'NA' => ['US', 'CA', 'MX'],
            'EU' => ['GB', 'DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'CH', 'PL', 'SE', 'DK', 'NO', 'FI', 'IE', 'PT', 'GR', 'CZ', 'HU', 'RO', 'BG', 'HR', 'SK', 'SI', 'LT', 'LV', 'EE', 'LU', 'MT', 'CY'],
            'APAC' => ['AU', 'NZ', 'JP', 'KR', 'SG', 'HK', 'TW', 'MY', 'TH', 'VN', 'ID', 'PH', 'IN', 'PK', 'BD'],
            'LATAM' => ['BR', 'AR', 'CL', 'CO', 'PE', 'VE', 'EC', 'BO', 'PY', 'UY', 'GY', 'SR'],
            'MEA' => ['ZA', 'AE', 'SA', 'IL', 'EG', 'NG', 'KE', 'GH', 'MA', 'DZ', 'TN'],
            'CIS' => ['RU', 'UA', 'BY', 'KZ', 'UZ', 'AZ', 'GE', 'AM']
        ];

        $country_code = strtoupper($country_code);

        foreach ($regions as $region => $countries) {
            if (in_array($country_code, $countries, true)) {
                return $region;
            }
        }

        return null;
    }

    public function register_geo_destination(string $campaign, string $geo_code, string $url): bool {
        $settings = get_option('saaos_traffic_router_settings', []);

        if (!isset($settings['geo_routing'])) {
            $settings['geo_routing'] = [];
        }

        if (!isset($settings['geo_routing'][$campaign])) {
            $settings['geo_routing'][$campaign] = [
                'destinations' => [],
                'created_at' => time()
            ];
        }

        $settings['geo_routing'][$campaign]['destinations'][$geo_code] = esc_url_raw($url);
        $settings['geo_routing'][$campaign]['updated_at'] = time();

        return update_option('saaos_traffic_router_settings', $settings);
    }

    public function unregister_geo_destination(string $campaign, string $geo_code): bool {
        $settings = get_option('saaos_traffic_router_settings', []);

        if (!isset($settings['geo_routing'][$campaign]['destinations'][$geo_code])) {
            return false;
        }

        unset($settings['geo_routing'][$campaign]['destinations'][$geo_code]);

        return update_option('saaos_traffic_router_settings', $settings);
    }

    public function get_geo_for_ip(string $ip_address): ?string {
        if (empty($ip_address) || $ip_address === '0.0.0.0') {
            return null;
        }

        if (defined('SAAOS_GEO_API_KEY') && SAAOS_GEO_API_KEY) {
            return $this->lookup_geo_service($ip_address);
        }

        return $this->guess_geo_from_headers();
    }

    private function lookup_geo_service(string $ip_address): ?string {
        $cache_key = 'saaos_geo_' . md5($ip_address);
        $cached = get_transient($cache_key);

        if ($cached !== false) {
            return $cached;
        }

        $response = wp_remote_get(
            'https://api.ipgeolocation.io/ipgeo?apiKey=' . SAAOS_GEO_API_KEY . '&ip=' . $ip_address,
            ['timeout' => 5]
        );

        if (is_wp_error($response)) {
            return null;
        }

        $body = json_decode(wp_remote_retrieve_body($response), true);

        if (isset($body['country_code2'])) {
            $country = strtoupper($body['country_code2']);
            set_transient($cache_key, $country, HOUR_IN_SECONDS);
            return $country;
        }

        return null;
    }

    private function guess_geo_from_headers(): ?string {
        $cf_country = isset($_SERVER['HTTP_CF_IPCOUNTRY']) ? strtoupper($_SERVER['HTTP_CF_IPCOUNTRY']) : null;
        if ($cf_country) {
            return $cf_country;
        }

        $cloudflare_country = isset($_SERVER['HTTP_X_COUNTRY_CODE']) ? strtoupper($_SERVER['HTTP_X_COUNTRY_CODE']) : null;
        if ($cloudflare_country) {
            return $cloudflare_country;
        }

        return null;
    }

    public function get_geo_stats(string $campaign = '', int $days = 30): array {
        global $wpdb;
        $clicks_table = $wpdb->prefix . 'saaos_clicks';
        $since = time() - ($days * DAY_IN_SECONDS);

        $where_clause = "WHERE cl.created_at >= %d AND cl.geo != ''";
        $params = [$since];

        if ($campaign) {
            $where_clause .= " AND cl.campaign = %s";
            $params[] = $campaign;
        }

        $sql = "SELECT cl.geo, COUNT(*) as clicks, 
                SUM(CASE WHEN cl.converted = 1 THEN 1 ELSE 0 END) as conversions
                FROM {$clicks_table} cl
                {$where_clause}
                GROUP BY cl.geo
                ORDER BY clicks DESC";

        $results = $wpdb->get_results($wpdb->prepare($sql, $params), ARRAY_A);

        $stats = [];
        foreach ($results as $row) {
            $stats[$row['geo']] = [
                'clicks' => (int) $row['clicks'],
                'conversions' => (int) $row['conversions'],
                'conversion_rate' => $row['clicks'] > 0 ? round(((int) $row['conversions'] / (int) $row['clicks']) * 100, 2) : 0
            ];
        }

        return $stats;
    }

    public function detect_device(): string {
        $ua = isset($_SERVER['HTTP_USER_AGENT']) ? $_SERVER['HTTP_USER_AGENT'] : '';

        if (preg_match('/mobile|android|iphone|ipod|blackberry|windows phone/i', $ua)) {
            if (preg_match('/tablet|ipad/i', $ua)) {
                return 'tablet';
            }
            return 'mobile';
        }

        if (preg_match('/bot|crawler|spider|crawl/i', $ua)) {
            return 'bot';
        }

        return 'desktop';
    }

    public function register_device_destination(string $campaign, string $device, string $url): bool {
        $devices = ['desktop', 'mobile', 'tablet'];

        if (!in_array($device, $devices, true)) {
            return false;
        }

        $settings = get_option('saaos_traffic_router_settings', []);

        if (!isset($settings['device_routing'])) {
            $settings['device_routing'] = [];
        }

        if (!isset($settings['device_routing'][$campaign])) {
            $settings['device_routing'][$campaign] = [
                'destinations' => [],
                'created_at' => time()
            ];
        }

        $settings['device_routing'][$campaign]['destinations'][$device] = esc_url_raw($url);
        $settings['device_routing'][$campaign]['updated_at'] = time();

        return update_option('saaos_traffic_router_settings', $settings);
    }

    public function get_device_stats(string $campaign = '', int $days = 30): array {
        global $wpdb;
        $clicks_table = $wpdb->prefix . 'saaos_clicks';
        $since = time() - ($days * DAY_IN_SECONDS);

        $where_clause = "WHERE cl.created_at >= %d";
        $params = [$since];

        if ($campaign) {
            $where_clause .= " AND cl.campaign = %s";
            $params[] = $campaign;
        }

        $sql = "SELECT cl.device, COUNT(*) as clicks,
                SUM(CASE WHEN cl.converted = 1 THEN 1 ELSE 0 END) as conversions
                FROM {$clicks_table} cl
                {$where_clause}
                GROUP BY cl.device
                ORDER BY clicks DESC";

        $results = $wpdb->get_results($wpdb->prepare($sql, $params), ARRAY_A);

        $stats = [];
        foreach ($results as $row) {
            $stats[$row['device'] ?: 'unknown'] = [
                'clicks' => (int) $row['clicks'],
                'conversions' => (int) $row['conversions'],
                'conversion_rate' => $row['clicks'] > 0 ? round(((int) $row['conversions'] / (int) $row['clicks']) * 100, 2) : 0
            ];
        }

        return $stats;
    }
}
