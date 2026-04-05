<?php
/**
 * Plugin Name: SAAOS Traffic Router
 * Description: Route public traffic to published landing pages, handle click attribution, A/B testing, geo-routing, and conversion tracking.
 * Version: 1.0.0
 * Author: Sovereign OS
 * Requires at least: 6.0
 * Requires PHP: 8.0
 */

if (!defined('ABSPATH')) exit;

final class SAAOS_Traffic_Router {
    private static ?SAAOS_Traffic_Router $instance = null;
    private string $option_key = 'saaos_traffic_router_settings';
    private string $cookie_name = 'saaos_traffic_data';
    private int $cookie_expiry = 30 * DAY_IN_SECONDS;

    public static function instance(): SAAOS_Traffic_Router {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    private function __construct() {
        $this->load_dependencies();
        $this->init_hooks();
    }

    private function load_dependencies(): void {
        require_once dirname(__FILE__) . '/includes/class-click-tracker.php';
        require_once dirname(__FILE__) . '/includes/class-router.php';
        require_once dirname(__FILE__) . '/includes/class-conversion-tracker.php';
        require_once dirname(__FILE__) . '/includes/class-geo-routing.php';
        require_once dirname(__FILE__) . '/admin/class-admin.php';
        require_once dirname(__FILE__) . '/public/class-public.php';
    }

    private function init_hooks(): void {
        add_action('init', [$this, 'register_shortcodes']);
        add_action('rest_api_init', [$this, 'register_rest_routes']);
        add_action('admin_post_nopriv_saaos_click', [$this, 'handle_click']);
        add_action('admin_post_nopriv_saaos_conversion', [$this, 'handle_conversion']);
        add_action('wp_enqueue_scripts', [$this, 'enqueue_assets']);
        add_filter('query_vars', [$this, 'add_query_vars']);
        add_action('template_redirect', [$this, 'handle_tracked_links'], 1);
    }

    public function register_shortcodes(): void {
        add_shortcode('saaos_affiliate_link', [$this, 'affiliate_link_shortcode']);
        add_shortcode('saaos_tracked_link', [$this, 'tracked_link_shortcode']);
        add_shortcode('saaos_conversion_pixel', [$this, 'conversion_pixel_shortcode']);
    }

    public function register_rest_routes(): void {
        register_rest_route('saaos-traffic/v1', '/route', [
            'methods' => 'GET',
            'permission_callback' => '__return_true',
            'callback' => [$this, 'rest_route_decision']
        ]);

        register_rest_route('saaos-traffic/v1', '/click', [
            'methods' => 'POST',
            'permission_callback' => '__return_true',
            'callback' => [$this, 'rest_record_click']
        ]);

        register_rest_route('saaos-traffic/v1', '/conversion', [
            'methods' => 'POST',
            'permission_callback' => '__return_true',
            'callback' => [$this, 'rest_record_conversion']
        ]);

        register_rest_route('saaos-traffic/v1', '/ab-test', [
            'methods' => 'GET',
            'permission_callback' => '__return_true',
            'callback' => [$this, 'rest_ab_test_assign']
        ]);
    }

    public function add_query_vars(array $vars): array {
        $vars[] = 'saaos_tracked';
        $vars[] = 'saaos_campaign';
        $vars[] = 'saaos_source';
        $vars[] = 'saaos_medium';
        $vars[] = 'saaos_content';
        $vars[] = 'saaos_term';
        return $vars;
    }

    public function enqueue_assets(): void {
        wp_enqueue_style(
            'saaos-traffic-router',
            plugin_dir_url(__FILE__) . 'assets/css/traffic-router.css',
            [],
            '1.0.0'
        );

        wp_enqueue_script(
            'saaos-traffic-router',
            plugin_dir_url(__FILE__) . 'assets/js/traffic-router.js',
            ['jquery'],
            '1.0.0',
            true
        );

        wp_localize_script('saaos-traffic-router', 'saaosTrafficRouter', [
            'ajaxUrl' => admin_url('admin-ajax.php'),
            'restUrl' => rest_url('saaos-traffic/v1/'),
            'nonce' => wp_create_nonce('saaos_traffic_nonce'),
            'clickAction' => 'saaos_ajax_click',
            'conversionAction' => 'saaos_ajax_conversion'
        ]);
    }

    public function affiliate_link_shortcode($atts): string {
        $atts = shortcode_atts([
            'id' => '',
            'url' => '',
            'campaign' => 'default',
            'source' => '',
            'medium' => '',
            'content' => '',
            'term' => '',
            'class' => 'saaos-affiliate-link'
        ], $atts);

        if (empty($atts['id']) && empty($atts['url'])) {
            return '';
        }

        $link_id = sanitize_text_field($atts['id']);
        $url = esc_url_raw($atts['url']);
        $campaign = sanitize_text_field($atts['campaign']);
        $source = sanitize_text_field($atts['source'] ?: $this->get_cookie('saaos_source', 'direct'));
        $medium = sanitize_text_field($atts['medium'] ?: $this->get_cookie('saaos_medium', 'link'));
        $content = sanitize_text_field($atts['content']);
        $term = sanitize_text_field($atts['term']);

        $click_id = $this->generate_click_id();

        $params = array_filter([
            'saaos_click_id' => $click_id,
            'saaos_campaign' => $campaign,
            'saaos_source' => $source,
            'saaos_medium' => $medium,
            'saaos_content' => $content,
            'saaos_term' => $term
        ]);

        $tracked_url = add_query_arg($params, $url);

        $this->store_click_data($click_id, [
            'link_id' => $link_id,
            'url' => $url,
            'campaign' => $campaign,
            'source' => $source,
            'medium' => $medium,
            'content' => $content,
            'term' => $term,
            'created_at' => time()
        ]);

        return sprintf(
            '<a href="%s" class="%s" data-click-id="%s" data-campaign="%s" data-source="%s" data-medium="%s">',
            esc_url($tracked_url),
            esc_attr($atts['class']),
            esc_attr($click_id),
            esc_attr($campaign),
            esc_attr($source),
            esc_attr($medium)
        );
    }

    public function tracked_link_shortcode($atts): string {
        $atts = shortcode_atts([
            'url' => '',
            'campaign' => 'default',
            'source' => '',
            'medium' => 'banner',
            'content' => '',
            'term' => '',
            'text' => 'Click Here',
            'class' => 'saaos-tracked-link'
        ], $atts);

        if (empty($atts['url'])) {
            return '';
        }

        $campaign = sanitize_text_field($atts['campaign']);
        $source = sanitize_text_field($atts['source'] ?: $this->get_cookie('saaos_source', 'direct'));
        $medium = sanitize_text_field($atts['medium']);
        $content = sanitize_text_field($atts['content']);
        $term = sanitize_text_field($atts['term']);
        $text = sanitize_text_field($atts['text']);

        $click_id = $this->generate_click_id();

        $params = array_filter([
            'saaos_click_id' => $click_id,
            'saaos_campaign' => $campaign,
            'saaos_source' => $source,
            'saaos_medium' => $medium,
            'saaos_content' => $content,
            'saaos_term' => $term
        ]);

        $tracked_url = add_query_arg($params, esc_url_raw($atts['url']));

        $this->store_click_data($click_id, [
            'url' => $atts['url'],
            'campaign' => $campaign,
            'source' => $source,
            'medium' => $medium,
            'content' => $content,
            'term' => $term,
            'created_at' => time()
        ]);

        return sprintf(
            '<a href="%s" class="%s" data-click-id="%s" data-campaign="%s" data-source="%s" data-medium="%s">%s</a>',
            esc_url($tracked_url),
            esc_attr($atts['class']),
            esc_attr($click_id),
            esc_attr($campaign),
            esc_attr($source),
            esc_attr($medium),
            esc_html($text)
        );
    }

    public function conversion_pixel_shortcode($atts): string {
        $atts = shortcode_atts([
            'id' => '',
            'type' => 'image',
            'width' => '1',
            'height' => '1'
        ], $atts);

        if (empty($atts['id'])) {
            return '';
        }

        $pixel_id = sanitize_text_field($atts['id']);
        $nonce = wp_create_nonce('saaos_conversion_' . $pixel_id);

        $pixel_url = add_query_arg([
            'saaos_conversion_id' => $pixel_id,
            'saaos_nonce' => $nonce,
            'saaos_ref' => isset($_COOKIE['sovereign_ref']) ? sanitize_text_field($_COOKIE['sovereign_ref']) : '',
            'saaos_click' => isset($_COOKIE['saaos_last_click']) ? sanitize_text_field($_COOKIE['saaos_last_click']) : ''
        ], admin_url('admin-post.php?action=saaos_conversion'));

        if ($atts['type'] === 'image') {
            return sprintf(
                '<img src="%s" width="%s" height="%s" style="display:none;" alt="" />',
                esc_url($pixel_url),
                esc_attr($atts['width']),
                esc_attr($atts['height'])
            );
        }

        return sprintf(
            '<script src="%s" async defer></script>',
            esc_url($pixel_url)
        );
    }

    public function handle_click(): void {
        check_ajax_referer('saaos_traffic_nonce', 'nonce');

        $click_data = [
            'click_id' => sanitize_text_field($_POST['click_id'] ?? $_GET['click_id'] ?? ''),
            'campaign' => sanitize_text_field($_POST['campaign'] ?? $_GET['campaign'] ?? ''),
            'source' => sanitize_text_field($_POST['source'] ?? $_GET['source'] ?? ''),
            'medium' => sanitize_text_field($_POST['medium'] ?? $_GET['medium'] ?? ''),
            'content' => sanitize_text_field($_POST['content'] ?? $_GET['content'] ?? ''),
            'term' => sanitize_text_field($_POST['term'] ?? $_GET['term'] ?? ''),
            'url' => esc_url_raw($_POST['url'] ?? $_GET['url'] ?? ''),
            'referer' => isset($_SERVER['HTTP_REFERER']) ? esc_url_raw($_SERVER['HTTP_REFERER']) : '',
            'user_agent' => isset($_SERVER['HTTP_USER_AGENT']) ? sanitize_text_field($_SERVER['HTTP_USER_AGENT']) : '',
            'ip_address' => $this->get_client_ip(),
            'created_at' => time()
        ];

        $this->store_click($click_data);
        $this->set_cookie('saaos_last_click', $click_data['click_id'], $this->cookie_expiry);

        if (wp_doing_ajax()) {
            wp_send_json_success(['click_recorded' => true]);
        }

        wp_redirect(home_url());
        exit;
    }

    public function handle_conversion(): void {
        $conversion_id = sanitize_text_field($_GET['saaos_conversion_id'] ?? '');
        $nonce = sanitize_text_field($_GET['saaos_nonce'] ?? '');

        if (!wp_verify_nonce($nonce, 'saaos_conversion_' . $conversion_id)) {
            status_header(403);
            exit;
        }

        $conversion_data = [
            'conversion_id' => $conversion_id,
            'click_id' => sanitize_text_field($_GET['saaos_click'] ?? $_COOKIE['saaos_last_click'] ?? ''),
            'referral_code' => sanitize_text_field($_GET['saaos_ref'] ?? $_COOKIE['sovereign_ref'] ?? ''),
            'order_id' => sanitize_text_field($_GET['order_id'] ?? ''),
            'value' => floatval($_GET['value'] ?? 0),
            'currency' => sanitize_text_field($_GET['currency'] ?? 'USD'),
            'event_type' => sanitize_text_field($_GET['event_type'] ?? 'purchase'),
            'user_agent' => isset($_SERVER['HTTP_USER_AGENT']) ? sanitize_text_field($_SERVER['HTTP_USER_AGENT']) : '',
            'ip_address' => $this->get_client_ip(),
            'created_at' => time()
        ];

        $this->store_conversion($conversion_data);

        header('Content-Type: image/gif');
        header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
        header('Pragma: no-cache');
        header('GIF89a');

        echo "\x47\x49\x46\x38\x39\x61\x01\x00\x01\x00\x80\x00\x00\xff\xff\xff\x00\x00\x00\x21\xf9\x04\x01\x00\x00\x00\x00\x2c\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02\x44\x01\x00\x3b";
        exit;
    }

    public function handle_tracked_links(): void {
        if (get_query_var('saaos_tracked') !== '1') {
            return;
        }

        $click_id = sanitize_text_field(get_query_var('saaos_click_id', ''));
        $campaign = sanitize_text_field(get_query_var('saaos_campaign', ''));
        $source = sanitize_text_field(get_query_var('saaos_source', ''));
        $medium = sanitize_text_field(get_query_var('saaos_medium', ''));
        $content = sanitize_text_field(get_query_var('saaos_content', ''));
        $term = sanitize_text_field(get_query_var('saaos_term', ''));

        $this->set_cookie('saaos_source', $source, $this->cookie_expiry);
        $this->set_cookie('saaos_medium', $medium, $this->cookie_expiry);
        $this->set_cookie('saaos_campaign', $campaign, $this->cookie_expiry);
        $this->set_cookie('saaos_content', $content, $this->cookie_expiry);
        $this->set_cookie('saaos_term', $term, $this->cookie_expiry);

        if (!empty($click_id)) {
            $this->set_cookie('saaos_last_click', $click_id, $this->cookie_expiry);
            $this->record_click_visit($click_id);
        }

        $destination = $this->get_routing_destination($campaign, $source, $medium);
        if ($destination) {
            wp_redirect($destination, 302);
            exit;
        }
    }

    public function rest_route_decision(WP_REST_Request $request): WP_REST_Response {
        $campaign = sanitize_text_field($request->get_param('campaign'));
        $source = sanitize_text_field($request->get_param('source'));
        $medium = sanitize_text_field($request->get_param('medium'));
        $device = sanitize_text_field($request->get_param('device'));
        $geo = sanitize_text_field($request->get_param('geo'));

        $destination = $this->get_routing_destination($campaign, $source, $medium, $device, $geo);

        return new WP_REST_Response([
            'destination' => $destination ?: home_url(),
            'ab_variant' => $this->get_ab_variant($campaign),
            'geo_routed' => $geo ?: null
        ], 200);
    }

    public function rest_record_click(WP_REST_Request $request): WP_REST_Response {
        $click_data = [
            'click_id' => sanitize_text_field($request->get_param('click_id') ?: $this->generate_click_id()),
            'campaign' => sanitize_text_field($request->get_param('campaign')),
            'source' => sanitize_text_field($request->get_param('source')),
            'medium' => sanitize_text_field($request->get_param('medium')),
            'content' => sanitize_text_field($request->get_param('content')),
            'term' => sanitize_text_field($request->get_param('term')),
            'url' => esc_url_raw($request->get_param('url')),
            'referer' => esc_url_raw($request->get_param('referer')),
            'user_agent' => sanitize_text_field($request->get_param('user_agent')),
            'ip_address' => $this->get_client_ip(),
            'device' => sanitize_text_field($request->get_param('device')),
            'geo' => sanitize_text_field($request->get_param('geo')),
            'created_at' => time()
        ];

        $this->store_click($click_data);

        return new WP_REST_Response(['success' => true, 'click_id' => $click_data['click_id']], 200);
    }

    public function rest_record_conversion(WP_REST_Request $request): WP_REST_Response {
        $conversion_data = [
            'conversion_id' => sanitize_text_field($request->get_param('conversion_id') ?: $this->generate_click_id()),
            'click_id' => sanitize_text_field($request->get_param('click_id')),
            'referral_code' => sanitize_text_field($request->get_param('referral_code')),
            'order_id' => sanitize_text_field($request->get_param('order_id')),
            'value' => floatval($request->get_param('value')),
            'currency' => sanitize_text_field($request->get_param('currency', 'USD')),
            'event_type' => sanitize_text_field($request->get_param('event_type', 'purchase')),
            'user_agent' => sanitize_text_field($request->get_param('user_agent')),
            'ip_address' => $this->get_client_ip(),
            'created_at' => time()
        ];

        $this->store_conversion($conversion_data);

        return new WP_REST_Response(['success' => true], 200);
    }

    public function rest_ab_test_assign(WP_REST_Request $request): WP_REST_Response {
        $campaign = sanitize_text_field($request->get_param('campaign'));
        $variant = $this->get_ab_variant($campaign);

        return new WP_REST_Response([
            'campaign' => $campaign,
            'variant' => $variant,
            'weight_a' => $this->get_ab_weight($campaign, 'a'),
            'weight_b' => $this->get_ab_weight($campaign, 'b')
        ], 200);
    }

    private function get_routing_destination(string $campaign, string $source, string $medium, ?string $device = null, ?string $geo = null): ?string {
        $settings = $this->get_settings();
        $router = new SAAOS_Router($settings);

        if ($geo) {
            $geo_routing = new SAAOS_Geo_Routing($settings);
            $geo_dest = $geo_routing->get_destination_for_geo($geo, $campaign);
            if ($geo_dest) {
                return $geo_dest;
            }
        }

        if ($device) {
            $device_dest = $router->get_device_destination($device, $campaign);
            if ($device_dest) {
                return $device_dest;
            }
        }

        $ab_dest = $router->get_ab_destination($campaign);
        if ($ab_dest) {
            return $ab_dest;
        }

        $default_dest = $settings['default_landing_page'] ?? '';
        return $default_dest ?: null;
    }

    private function get_ab_variant(string $campaign): string {
        $settings = $this->get_settings();
        $ab_variants = $settings['ab_variants'] ?? [];

        if (!isset($ab_variants[$campaign])) {
            return 'a';
        }

        $weight_a = floatval($ab_variants[$campaign]['weight_a'] ?? 50);
        $random = floatval(mt_rand(1, 100));

        return $random <= $weight_a ? 'a' : 'b';
    }

    private function get_ab_weight(string $campaign, string $variant): float {
        $settings = $this->get_settings();
        $ab_variants = $settings['ab_variants'] ?? [];

        if (!isset($ab_variants[$campaign])) {
            return 50.0;
        }

        return floatval($ab_variants[$campaign]['weight_' . $variant] ?? 50.0);
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

    private function store_click(array $click_data): void {
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
            KEY created_at (created_at)
        ) {$charset_collate};";

        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($sql);

        $wpdb->insert($table, $click_data);
    }

    private function record_click_visit(string $click_id): void {
        global $wpdb;
        $table = $wpdb->prefix . 'saaos_clicks';

        $wpdb->update(
            $table,
            ['visited' => 1],
            ['click_id' => $click_id]
        );
    }

    private function store_conversion(array $conversion_data): void {
        global $wpdb;
        $table = $wpdb->prefix . 'saaos_conversions';

        $charset_collate = $wpdb->get_charset_collate();
        $sql = "CREATE TABLE IF NOT EXISTS {$table} (
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
            KEY created_at (created_at)
        ) {$charset_collate};";

        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($sql);

        $wpdb->insert($table, $conversion_data);

        if (!empty($conversion_data['click_id'])) {
            $clicks_table = $wpdb->prefix . 'saaos_clicks';
            $wpdb->update(
                $clicks_table,
                ['converted' => 1],
                ['click_id' => $conversion_data['click_id']]
            );
        }
    }

    private function store_click_data(string $click_id, array $data): void {
        $click_data = [
            'click_id' => $click_id,
            'url' => $data['url'] ?? '',
            'campaign' => $data['campaign'] ?? '',
            'source' => $data['source'] ?? '',
            'medium' => $data['medium'] ?? '',
            'content' => $data['content'] ?? '',
            'term' => $data['term'] ?? '',
            'link_id' => $data['link_id'] ?? '',
            'created_at' => $data['created_at'] ?? time()
        ];

        set_transient('saaos_click_' . $click_id, $click_data, $this->cookie_expiry);
    }

    private function get_cookie(string $name, string $default = ''): string {
        return isset($_COOKIE[$name]) ? sanitize_text_field($_COOKIE[$name]) : $default;
    }

    private function set_cookie(string $name, string $value, int $expiry): void {
        setcookie($name, $value, [
            'expires' => time() + $expiry,
            'path' => COOKIEPATH ?: '/',
            'secure' => is_ssl(),
            'httponly' => false,
            'samesite' => 'Lax'
        ]);
        $_COOKIE[$name] = $value;
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

    private function get_settings(): array {
        return get_option($this->option_key, [
            'default_landing_page' => '',
            'ab_variants' => [],
            'geo_routing' => [],
            'device_routing' => [],
            'attribution_window' => 30,
            'api_base' => ''
        ]);
    }

    public function get_option_key(): string {
        return $this->option_key;
    }
}

add_action('plugins_loaded', ['SAAOS_Traffic_Router', 'instance']);

function saaos_traffic_router(): SAAOS_Traffic_Router {
    return SAAOS_Traffic_Router::instance();
}
