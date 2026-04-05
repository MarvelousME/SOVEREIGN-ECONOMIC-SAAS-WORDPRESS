<?php
if (!defined('ABSPATH')) exit;

class SAAOS_Conversion_Tracker {
    private static ?SAAOS_Conversion_Tracker $instance = null;
    private string $cookie_name = 'saaos_conversion_data';
    private string $table_name;

    public static function instance(): SAAOS_Conversion_Tracker {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    private function __construct() {
        global $wpdb;
        $this->table_name = $wpdb->prefix . 'saaos_conversions';
        $this->create_table();
    }

    private function create_table(): void {
        global $wpdb;

        $charset_collate = $wpdb->get_charset_collate();
        $sql = "CREATE TABLE IF NOT EXISTS {$this->table_name} (
            id bigint(20) NOT NULL AUTO_INCREMENT,
            conversion_id varchar(36) NOT NULL,
            click_id varchar(36) DEFAULT '',
            referral_code varchar(100) DEFAULT '',
            order_id varchar(100) DEFAULT '',
            value decimal(10,2) DEFAULT 0.00,
            currency varchar(10) DEFAULT 'USD',
            event_type varchar(50) DEFAULT 'purchase',
            user_agent varchar(500) DEFAULT '',
            ip_address varchar(45) DEFAULT '',
            created_at int(11) NOT NULL,
            PRIMARY KEY (id),
            KEY conversion_id (conversion_id),
            KEY click_id (click_id),
            KEY referral_code (referral_code),
            KEY created_at (created_at)
        ) {$charset_collate};";

        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($sql);
    }

    public function track_conversion(array $data): string {
        $conversion_id = $data['conversion_id'] ?? $this->generate_conversion_id();

        $conversion_record = [
            'conversion_id' => $conversion_id,
            'click_id' => sanitize_text_field($data['click_id'] ?? ''),
            'referral_code' => sanitize_text_field($data['referral_code'] ?? ''),
            'order_id' => sanitize_text_field($data['order_id'] ?? ''),
            'value' => floatval($data['value'] ?? 0),
            'currency' => sanitize_text_field($data['currency'] ?? 'USD'),
            'event_type' => sanitize_text_field($data['event_type'] ?? 'purchase'),
            'user_agent' => sanitize_text_field($data['user_agent'] ?? $_SERVER['HTTP_USER_AGENT'] ?? ''),
            'ip_address' => $this->get_client_ip(),
            'created_at' => time()
        ];

        $this->store_conversion($conversion_record);

        if (!empty($conversion_record['click_id'])) {
            $this->mark_click_converted($conversion_record['click_id']);
        }

        do_action('saaos_conversion_tracked', $conversion_record);

        return $conversion_id;
    }

    private function store_conversion(array $conversion): void {
        global $wpdb;

        $existing = $wpdb->get_var(
            $wpdb->prepare(
                "SELECT COUNT(*) FROM {$this->table_name} WHERE conversion_id = %s",
                $conversion['conversion_id']
            )
        );

        if (!$existing) {
            $wpdb->insert($this->table_name, $conversion);
        }
    }

    private function mark_click_converted(string $click_id): void {
        global $wpdb;
        $clicks_table = $wpdb->prefix . 'saaos_clicks';

        $click = $wpdb->get_row(
            $wpdb->prepare("SELECT * FROM {$clicks_table} WHERE click_id = %s", $click_id),
            ARRAY_A
        );

        if ($click && !$click['converted']) {
            $wpdb->update(
                $clicks_table,
                ['converted' => 1],
                ['click_id' => $click_id]
            );
        }
    }

    public function get_conversion_by_id(string $conversion_id): ?array {
        global $wpdb;

        $conversion = $wpdb->get_row(
            $wpdb->prepare("SELECT * FROM {$this->table_name} WHERE conversion_id = %s", $conversion_id),
            ARRAY_A
        );

        return $conversion ?: null;
    }

    public function get_conversions_by_click(string $click_id): array {
        global $wpdb;

        return $wpdb->get_results(
            $wpdb->prepare("SELECT * FROM {$this->table_name} WHERE click_id = %s", $click_id),
            ARRAY_A
        );
    }

    public function get_conversions_by_campaign(string $campaign, int $limit = 100): array {
        global $wpdb;
        $clicks_table = $wpdb->prefix . 'saaos_clicks';

        return $wpdb->get_results(
            $wpdb->prepare(
                "SELECT c.* FROM {$this->table_name} c
                INNER JOIN {$clicks_table} cl ON c.click_id = cl.click_id
                WHERE cl.campaign = %s
                ORDER BY c.created_at DESC
                LIMIT %d",
                $campaign,
                $limit
            ),
            ARRAY_A
        );
    }

    public function get_conversions_by_referral(string $referral_code, int $limit = 100): array {
        global $wpdb;

        return $wpdb->get_results(
            $wpdb->prepare(
                "SELECT * FROM {$this->table_name} WHERE referral_code = %s ORDER BY created_at DESC LIMIT %d",
                $referral_code,
                $limit
            ),
            ARRAY_A
        );
    }

    public function get_total_revenue(string $campaign = '', string $currency = 'USD'): float {
        global $wpdb;
        $clicks_table = $wpdb->prefix . 'saaos_clicks';

        if ($campaign) {
            return (float) $wpdb->get_var(
                $wpdb->prepare(
                    "SELECT COALESCE(SUM(c.value), 0) FROM {$this->table_name} c
                    INNER JOIN {$clicks_table} cl ON c.click_id = cl.click_id
                    WHERE cl.campaign = %s AND c.currency = %s",
                    $campaign,
                    $currency
                )
            );
        }

        return (float) $wpdb->get_var(
            $wpdb->prepare(
                "SELECT COALESCE(SUM(value), 0) FROM {$this->table_name} WHERE currency = %s",
                $currency
            )
        );
    }

    public function get_conversion_count(string $campaign = '', string $event_type = ''): int {
        global $wpdb;
        $clicks_table = $wpdb->prefix . 'saaos_clicks';

        if ($campaign && $event_type) {
            return (int) $wpdb->get_var(
                $wpdb->prepare(
                    "SELECT COUNT(*) FROM {$this->table_name} c
                    INNER JOIN {$clicks_table} cl ON c.click_id = cl.click_id
                    WHERE cl.campaign = %s AND c.event_type = %s",
                    $campaign,
                    $event_type
                )
            );
        }

        if ($campaign) {
            return (int) $wpdb->get_var(
                $wpdb->prepare(
                    "SELECT COUNT(*) FROM {$this->table_name} c
                    INNER JOIN {$clicks_table} cl ON c.click_id = cl.click_id
                    WHERE cl.campaign = %s",
                    $campaign
                )
            );
        }

        if ($event_type) {
            return (int) $wpdb->get_var(
                $wpdb->prepare(
                    "SELECT COUNT(*) FROM {$this->table_name} WHERE event_type = %s",
                    $event_type
                )
            );
        }

        return (int) $wpdb->get_var("SELECT COUNT(*) FROM {$this->table_name}");
    }

    public function get_conversion_stats(string $campaign = '', string $period = '30d'): array {
        $periods = [
            '7d' => WEEK_IN_SECONDS,
            '30d' => 30 * DAY_IN_SECONDS,
            '90d' => 90 * DAY_IN_SECONDS,
            '365d' => 365 * DAY_IN_SECONDS
        ];

        $days = $periods[$period] ?? $periods['30d'];
        $since = time() - $days;

        global $wpdb;
        $clicks_table = $wpdb->prefix . 'saaos_clicks';

        $where_clause = "WHERE c.created_at >= %d";
        $params = [$since];

        if ($campaign) {
            $where_clause .= " AND cl.campaign = %s";
            $params[] = $campaign;
        }

        $sql = "SELECT COUNT(*) as count, COALESCE(SUM(c.value), 0) as revenue
                FROM {$this->table_name} c
                INNER JOIN {$clicks_table} cl ON c.click_id = cl.click_id
                {$where_clause}";

        $stats = $wpdb->get_row($wpdb->prepare($sql, $params), ARRAY_A);

        $click_count_sql = "SELECT COUNT(*) FROM {$clicks_table} cl WHERE cl.created_at >= %d";
        $click_params = [$since];

        if ($campaign) {
            $click_count_sql .= " AND cl.campaign = %s";
            $click_params[] = $campaign;
        }

        $click_count = $wpdb->get_var($wpdb->prepare($click_count_sql, $click_params));

        return [
            'conversions' => (int) ($stats['count'] ?? 0),
            'revenue' => (float) ($stats['revenue'] ?? 0),
            'clicks' => (int) $click_count,
            'conversion_rate' => $click_count > 0 ? round(((int) ($stats['count'] ?? 0) / $click_count) * 100, 2) : 0,
            'period' => $period,
            'since' => date('Y-m-d', $since)
        ];
    }

    public function fire_pixel(string $conversion_id, string $pixel_url): bool {
        $conversion = $this->get_conversion_by_id($conversion_id);

        if (!$conversion) {
            return false;
        }

        $pixel_url = add_query_arg([
            'conversion_id' => $conversion_id,
            'value' => $conversion['value'],
            'currency' => $conversion['currency'],
            'order_id' => $conversion['order_id']
        ], $pixel_url);

        $response = wp_remote_get($pixel_url, [
            'timeout' => 10,
            'blocking' => false
        ]);

        return !is_wp_error($response);
    }

    public function register_pixel(string $name, string $url, array $events = []): void {
        $settings = get_option('saaos_traffic_router_settings', []);

        if (!isset($settings['conversion_pixels'])) {
            $settings['conversion_pixels'] = [];
        }

        $pixel_id = sanitize_title($name);

        $settings['conversion_pixels'][$pixel_id] = [
            'name' => sanitize_text_field($name),
            'url' => esc_url_raw($url),
            'events' => array_map('sanitize_text_field', $events),
            'created_at' => time()
        ];

        update_option('saaos_traffic_router_settings', $settings);
    }

    public function unregister_pixel(string $pixel_id): bool {
        $settings = get_option('saaos_traffic_router_settings', []);

        if (!isset($settings['conversion_pixels'][$pixel_id])) {
            return false;
        }

        unset($settings['conversion_pixels'][$pixel_id]);

        return update_option('saaos_traffic_router_settings', $settings);
    }

    public function get_pixels(): array {
        $settings = get_option('saaos_traffic_router_settings', []);
        return $settings['conversion_pixels'] ?? [];
    }

    public function get_pixel_by_id(string $pixel_id): ?array {
        $pixels = $this->get_pixels();
        return $pixels[$pixel_id] ?? null;
    }

    private function generate_conversion_id(): string {
        return sprintf(
            'conv_%04x%04x%04x%04x',
            mt_rand(0, 0xffff),
            mt_rand(0, 0xffff),
            mt_rand(0, 0xffff),
            mt_rand(0, 0xffff)
        );
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

SAAOS_Conversion_Tracker::instance();
