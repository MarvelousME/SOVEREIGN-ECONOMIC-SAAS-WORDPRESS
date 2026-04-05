<?php
if (!defined('ABSPATH')) exit;

class SAAOS_Click_Tracker {
    private static ?SAAOS_Click_Tracker $instance = null;
    private string $cookie_name = 'saaos_click_data';
    private int $attribution_window = 30 * DAY_IN_SECONDS;

    public static function instance(): SAAOS_Click_Tracker {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    private function __construct() {
        $this->attribution_window = $this->get_attribution_window();
        add_action('init', [$this, 'init']);
        add_action('wp_ajax_saaos_ajax_click', [$this, 'ajax_record_click']);
        add_action('wp_ajax_nopriv_saaos_ajax_click', [$this, 'ajax_record_click']);
    }

    public function init(): void {
        add_filter('the_content', [$this, 'wrap_tracked_links']);
        add_filter('the_excerpt', [$this, 'wrap_tracked_links']);
    }

    public function track_click(array $data): string {
        $click_id = $this->generate_click_id();

        $click_record = [
            'id' => $click_id,
            'campaign' => $data['campaign'] ?? '',
            'source' => $data['source'] ?? '',
            'medium' => $data['medium'] ?? '',
            'content' => $data['content'] ?? '',
            'term' => $data['term'] ?? '',
            'url' => $data['url'] ?? '',
            'referer' => $data['referer'] ?? '',
            'user_agent' => $data['user_agent'] ?? '',
            'ip_address' => $data['ip_address'] ?? '',
            'device' => $data['device'] ?? $this->detect_device(),
            'geo' => $data['geo'] ?? '',
            'timestamp' => time(),
            'attribution_window' => $this->attribution_window
        ];

        $this->store_click_data($click_id, $click_record);
        $this->set_click_cookie($click_id);

        return $click_id;
    }

    public function ajax_record_click(): void {
        check_ajax_referer('saaos_traffic_nonce', 'nonce');

        $click_data = [
            'campaign' => sanitize_text_field($_POST['campaign'] ?? ''),
            'source' => sanitize_text_field($_POST['source'] ?? ''),
            'medium' => sanitize_text_field($_POST['medium'] ?? ''),
            'content' => sanitize_text_field($_POST['content'] ?? ''),
            'term' => sanitize_text_field($_POST['term'] ?? ''),
            'url' => esc_url_raw($_POST['url'] ?? ''),
            'referer' => isset($_SERVER['HTTP_REFERER']) ? esc_url_raw($_SERVER['HTTP_REFERER']) : '',
            'user_agent' => sanitize_text_field($_SERVER['HTTP_USER_AGENT'] ?? ''),
            'ip_address' => $this->get_client_ip()
        ];

        $click_id = $this->track_click($click_data);

        wp_send_json_success([
            'success' => true,
            'click_id' => $click_id,
            'attribution_window' => $this->attribution_window
        ]);
    }

    public function get_click_by_id(string $click_id): ?array {
        global $wpdb;
        $table = $wpdb->prefix . 'saaos_clicks';

        $click = $wpdb->get_row(
            $wpdb->prepare("SELECT * FROM {$table} WHERE click_id = %s", $click_id),
            ARRAY_A
        );

        return $click ?: null;
    }

    public function get_clicks_by_campaign(string $campaign, int $limit = 100): array {
        global $wpdb;
        $table = $wpdb->prefix . 'saaos_clicks';

        return $wpdb->get_results(
            $wpdb->prepare(
                "SELECT * FROM {$table} WHERE campaign = %s ORDER BY created_at DESC LIMIT %d",
                $campaign,
                $limit
            ),
            ARRAY_A
        );
    }

    public function get_clicks_by_source(string $source, int $limit = 100): array {
        global $wpdb;
        $table = $wpdb->prefix . 'saaos_clicks';

        return $wpdb->get_results(
            $wpdb->prepare(
                "SELECT * FROM {$table} WHERE source = %s ORDER BY created_at DESC LIMIT %d",
                $source,
                $limit
            ),
            ARRAY_A
        );
    }

    public function get_click_count_by_campaign(string $campaign): int {
        global $wpdb;
        $table = $wpdb->prefix . 'saaos_clicks';

        return (int) $wpdb->get_var(
            $wpdb->prepare(
                "SELECT COUNT(*) FROM {$table} WHERE campaign = %s",
                $campaign
            )
        );
    }

    public function get_conversion_rate(string $campaign): float {
        global $wpdb;
        $clicks_table = $wpdb->prefix . 'saaos_clicks';

        $total_clicks = (int) $wpdb->get_var(
            $wpdb->prepare(
                "SELECT COUNT(*) FROM {$clicks_table} WHERE campaign = %s",
                $campaign
            )
        );

        if ($total_clicks === 0) {
            return 0.0;
        }

        $converted = (int) $wpdb->get_var(
            $wpdb->prepare(
                "SELECT COUNT(*) FROM {$clicks_table} WHERE campaign = %s AND converted = 1",
                $campaign
            )
        );

        return ($converted / $total_clicks) * 100;
    }

    public function get_attribution_data(string $click_id): array {
        $click = $this->get_click_by_id($click_id);

        if (!$click) {
            return [];
        }

        $expires_at = $click['created_at'] + $this->attribution_window;
        $is_expired = time() > $expires_at;

        return [
            'click_id' => $click_id,
            'campaign' => $click['campaign'],
            'source' => $click['source'],
            'medium' => $click['medium'],
            'content' => $click['content'],
            'term' => $click['term'],
            'is_expired' => $is_expired,
            'expires_at' => $expires_at,
            'converted' => (bool) $click['converted']
        ];
    }

    public function stitch_conversion(string $conversion_id, ?string $click_id = null): bool {
        if ($click_id) {
            $click = $this->get_click_by_id($click_id);
            if ($click && !$click['converted']) {
                $this->mark_click_converted($click_id);
                return true;
            }
        }

        if (isset($_COOKIE['saaos_last_click'])) {
            $last_click_id = sanitize_text_field($_COOKIE['saaos_last_click']);
            $click = $this->get_click_by_id($last_click_id);

            if ($click && !$click['converted']) {
                $this->mark_click_converted($last_click_id);
                return true;
            }
        }

        if (isset($_COOKIE['sovereign_ref'])) {
            $ref_code = sanitize_text_field($_COOKIE['sovereign_ref']);
            return $this->stitch_by_referral($conversion_id, $ref_code);
        }

        return false;
    }

    private function stitch_by_referral(string $conversion_id, string $ref_code): bool {
        global $wpdb;
        $table = $wpdb->prefix . 'saaos_clicks';

        $click = $wpdb->get_row(
            $wpdb->prepare(
                "SELECT * FROM {$table} WHERE campaign LIKE %s AND converted = 0 ORDER BY created_at DESC LIMIT 1",
                '%' . $wpdb->esc_like($ref_code) . '%'
            ),
            ARRAY_A
        );

        if ($click) {
            $this->mark_click_converted($click['click_id']);
            return true;
        }

        return false;
    }

    public function mark_click_converted(string $click_id): void {
        global $wpdb;
        $table = $wpdb->prefix . 'saaos_clicks';

        $wpdb->update(
            $table,
            ['converted' => 1],
            ['click_id' => $click_id]
        );

        $this->store_conversion_click_relation($click_id);
    }

    private function store_conversion_click_relation(string $click_id): void {
        set_transient('saaos_conv_' . $click_id, [
            'click_id' => $click_id,
            'converted_at' => time()
        ], YEAR_IN_SECONDS);
    }

    public function wrap_tracked_links(string $content): string {
        if (!is_singular()) {
            return $content;
        }

        return preg_replace_callback(
            '/<a\s+href="([^"]*saaos_[^"]*)"[^>]*>/i',
            function ($matches) {
                $url = $matches[1];
                if (strpos($url, 'saaos_click_id=') !== false) {
                    return $matches[0];
                }

                $click_id = $this->generate_click_id();
                $this->track_click(['url' => $url]);

                $new_url = add_query_arg('saaos_click_id', $click_id, $url);
                return str_replace($url, $new_url, $matches[0]);
            },
            $content
        );
    }

    private function store_click_data(string $click_id, array $data): void {
        global $wpdb;
        $table = $wpdb->prefix . 'saaos_clicks';

        $charset_collate = $wpdb->get_charset_collate();
        $sql = "CREATE TABLE IF NOT EXISTS {$table} (
            id bigint(20) NOT NULL AUTO_INCREMENT,
            click_id varchar(36) NOT NULL,
            campaign varchar(100) DEFAULT '',
            source varchar(100) DEFAULT '',
            medium varchar(100) DEFAULT '',
            content varchar(255) DEFAULT '',
            term varchar(255) DEFAULT '',
            url varchar(500) DEFAULT '',
            referer varchar(500) DEFAULT '',
            user_agent varchar(500) DEFAULT '',
            ip_address varchar(45) DEFAULT '',
            device varchar(50) DEFAULT '',
            geo varchar(10) DEFAULT '',
            visited int(1) DEFAULT 0,
            converted int(1) DEFAULT 0,
            created_at int(11) NOT NULL,
            PRIMARY KEY (id),
            KEY click_id (click_id),
            KEY campaign (campaign),
            KEY source (source),
            KEY created_at (created_at)
        ) {$charset_collate};";

        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($sql);

        $click_record = [
            'click_id' => $data['id'],
            'campaign' => $data['campaign'],
            'source' => $data['source'],
            'medium' => $data['medium'],
            'content' => $data['content'],
            'term' => $data['term'],
            'url' => $data['url'],
            'referer' => $data['referer'],
            'user_agent' => $data['user_agent'],
            'ip_address' => $data['ip_address'],
            'device' => $data['device'],
            'geo' => $data['geo'],
            'created_at' => $data['timestamp']
        ];

        $existing = $wpdb->get_var(
            $wpdb->prepare("SELECT COUNT(*) FROM {$table} WHERE click_id = %s", $click_id)
        );

        if (!$existing) {
            $wpdb->insert($table, $click_record);
        }
    }

    private function set_click_cookie(string $click_id): void {
        setcookie('saaos_last_click', $click_id, [
            'expires' => time() + $this->attribution_window,
            'path' => COOKIEPATH ?: '/',
            'secure' => is_ssl(),
            'httponly' => false,
            'samesite' => 'Lax'
        ]);
        $_COOKIE['saaos_last_click'] = $click_id;
    }

    private function generate_click_id(): string {
        return sprintf(
            '%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
            mt_rand(0, 0xffff),
            mt_rand(0, 0xffff),
            mt_rand(0, 0xffff),
            mt_rand(0, 0x0fff) | 0x4000,
            mt_rand(0, 0x3fff) | 0x8000,
            mt_rand(0, 0xffff),
            mt_rand(0, 0xffff),
            mt_rand(0, 0xffff)
        );
    }

    private function detect_device(): string {
        $ua = isset($_SERVER['HTTP_USER_AGENT']) ? $_SERVER['HTTP_USER_AGENT'] : '';

        if (preg_match('/mobile|android|iphone|ipad|ipod|blackberry|windows phone/i', $ua)) {
            if (preg_match('/tablet|ipad/i', $ua)) {
                return 'tablet';
            }
            return 'mobile';
        }

        return 'desktop';
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

    private function get_attribution_window(): int {
        $settings = get_option('saaos_traffic_router_settings', []);
        $days = absint($settings['attribution_window'] ?? 30);
        return max(1, $days) * DAY_IN_SECONDS;
    }
}

SAAOS_Click_Tracker::instance();
