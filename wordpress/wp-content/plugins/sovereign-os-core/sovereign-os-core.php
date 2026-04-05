<?php
/**
 * Plugin Name: Sovereign OS Core
 * Description: Core workspace, task, wallet, and API integration for Nexros-based Sovereign OS sites.
 * Version: 1.0.0
 */

if (!defined('ABSPATH')) {
    exit;
}

final class Sovereign_OS_Core {
    private static ?Sovereign_OS_Core $instance = null;
    private string $option_key = 'sovereign_os_core_settings';

    public static function instance(): Sovereign_OS_Core {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    private function __construct() {
        add_action('init', [$this, 'register_post_types']);
        add_action('rest_api_init', [$this, 'register_rest_routes']);
        add_action('admin_menu', [$this, 'register_admin_pages']);
        add_action('admin_init', [$this, 'register_settings']);
        add_shortcode('sovereign_wallet_balance', [$this, 'wallet_balance_shortcode']);
        add_shortcode('sovereign_task_list', [$this, 'task_list_shortcode']);
        add_shortcode('sovereign_tenant_dashboard', [$this, 'tenant_dashboard_shortcode']);
    }

    public function register_post_types(): void {
        register_post_type('sovereign_workspace', [
            'label' => 'Workspaces',
            'public' => false,
            'show_ui' => true,
            'supports' => ['title', 'editor', 'custom-fields'],
            'menu_icon' => 'dashicons-building'
        ]);

        register_post_type('sovereign_campaign', [
            'label' => 'Campaigns',
            'public' => false,
            'show_ui' => true,
            'supports' => ['title', 'editor', 'custom-fields'],
            'menu_icon' => 'dashicons-megaphone'
        ]);
    }

    public function register_admin_pages(): void {
        add_menu_page(
            'Sovereign OS',
            'Sovereign OS',
            'manage_options',
            'sovereign-os',
            [$this, 'render_settings_page'],
            'dashicons-superhero',
            58
        );
    }

    public function register_settings(): void {
        register_setting('sovereign_os_group', $this->option_key, [
            'type' => 'array',
            'sanitize_callback' => [$this, 'sanitize_settings']
        ]);
    }

    public function sanitize_settings(array $input): array {
        return [
            'api_base' => esc_url_raw($input['api_base'] ?? ''),
            'jwt_shared_secret' => sanitize_text_field($input['jwt_shared_secret'] ?? ''),
            'tenant_id' => sanitize_text_field($input['tenant_id'] ?? 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
            'caller_id' => sanitize_text_field($input['caller_id'] ?? '11111111-1111-1111-1111-111111111111')
        ];
    }

    public function render_settings_page(): void {
        $settings = get_option($this->option_key, []);
        ?>
        <div class="wrap">
            <h1>Sovereign OS Settings</h1>
            <form method="post" action="options.php">
                <?php settings_fields('sovereign_os_group'); ?>
                <table class="form-table">
                    <tr><th>API Base URL</th><td><input class="regular-text" type="url" name="<?php echo esc_attr($this->option_key); ?>[api_base]" value="<?php echo esc_attr($settings['api_base'] ?? ''); ?>"></td></tr>
                    <tr><th>JWT Shared Secret</th><td><input class="regular-text" type="password" name="<?php echo esc_attr($this->option_key); ?>[jwt_shared_secret]" value="<?php echo esc_attr($settings['jwt_shared_secret'] ?? ''); ?>"></td></tr>
                    <tr><th>Tenant ID</th><td><input class="regular-text" type="text" name="<?php echo esc_attr($this->option_key); ?>[tenant_id]" value="<?php echo esc_attr($settings['tenant_id'] ?? 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'); ?>"></td></tr>
                    <tr><th>Caller ID</th><td><input class="regular-text" type="text" name="<?php echo esc_attr($this->option_key); ?>[caller_id]" value="<?php echo esc_attr($settings['caller_id'] ?? '11111111-1111-1111-1111-111111111111'); ?>"></td></tr>
                </table>
                <?php submit_button(); ?>
            </form>
        </div>
        <?php
    }

    public function register_rest_routes(): void {
        register_rest_route('sovereign/v1', '/health', [
            'methods' => 'GET',
            'permission_callback' => '__return_true',
            'callback' => fn() => ['ok' => true, 'service' => 'wordpress-plugin']
        ]);
    }

    private function get_settings(): array {
        return get_option($this->option_key, []);
    }

    private function get_api_base(): string {
        $settings = $this->get_settings();
        return rtrim($settings['api_base'] ?? '', '/');
    }

    private function get_tenant_id(): string {
        $settings = $this->get_settings();
        return $settings['tenant_id'] ?? 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    }

    private function get_caller_id(): string {
        $settings = $this->get_settings();
        return $settings['caller_id'] ?? '11111111-1111-1111-1111-111111111111';
    }

    private function get_dev_token(): string {
        $settings = $this->get_settings();
        $secret = $settings['jwt_shared_secret'] ?? '';
        if (!$secret) {
            return '';
        }

        $header = rtrim(strtr(base64_encode(wp_json_encode(['alg' => 'HS256', 'typ' => 'JWT'])), '+/', '-_'), '=');
        $payload = rtrim(strtr(base64_encode(wp_json_encode([
            'sub' => $this->get_caller_id(),
            'tenant_id' => $this->get_tenant_id(),
            'iat' => time(),
            'exp' => time() + 7200
        ])), '+/', '-_'), '=');

        $signature = hash_hmac('sha256', $header . '.' . $payload, $secret, true);
        $encodedSignature = rtrim(strtr(base64_encode($signature), '+/', '-_'), '=');

        return $header . '.' . $payload . '.' . $encodedSignature;
    }

    private function api_get(string $path): array {
        $base = $this->get_api_base();
        if (!$base) {
            return ['error' => 'API base URL not configured'];
        }

        $response = wp_remote_get($base . $path, [
            'headers' => [
                'Authorization' => 'Bearer ' . $this->get_dev_token(),
                'x-tenant-id' => $this->get_tenant_id(),
                'x-caller-id' => $this->get_caller_id()
            ],
            'timeout' => 20
        ]);

        if (is_wp_error($response)) {
            return ['error' => $response->get_error_message()];
        }

        return json_decode(wp_remote_retrieve_body($response), true) ?: ['error' => 'Invalid API response'];
    }

    public function wallet_balance_shortcode(): string {
        $wallet = $this->api_get('/api/payouts');
        return '<pre>' . esc_html(wp_json_encode($wallet, JSON_PRETTY_PRINT)) . '</pre>';
    }

    public function task_list_shortcode(): string {
        $tasks = $this->api_get('/api/tasks');
        return '<pre>' . esc_html(wp_json_encode($tasks, JSON_PRETTY_PRINT)) . '</pre>';
    }

    public function tenant_dashboard_shortcode(): string {
        return '<div class="sovereign-dashboard">'
            . '<h3>Tenant Dashboard</h3>'
            . '<p>Use [sovereign_task_list] and [sovereign_wallet_balance] inside your Nexros Elementor pages.</p>'
            . '</div>';
    }
}

Sovereign_OS_Core::instance();
