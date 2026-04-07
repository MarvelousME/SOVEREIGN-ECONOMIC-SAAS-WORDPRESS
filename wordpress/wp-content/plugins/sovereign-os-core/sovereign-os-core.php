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
        add_action('user_register', [$this, 'sync_registered_user_to_crm'], 20, 1);
        add_action('show_user_profile', [$this, 'render_user_tenant_field']);
        add_action('edit_user_profile', [$this, 'render_user_tenant_field']);
        add_action('personal_options_update', [$this, 'save_user_tenant_field']);
        add_action('edit_user_profile_update', [$this, 'save_user_tenant_field']);
        add_action('fluent_support/ticket_created', [$this, 'bind_fluent_ticket_tenant'], 10, 2);
        add_filter('fluent_support/can_customer_access_ticket', [$this, 'filter_fluent_customer_ticket_access'], 10, 4);
        add_action('fluent_support/tickets_query_by_permission_ref', [$this, 'scope_fluent_ticket_query_by_tenant'], 20, 2);
        add_action('admin_post_sovereign_fluent_backfill', [$this, 'handle_fluent_backfill_post']);
        add_filter('rest_pre_dispatch', [$this, 'fluent_rest_enforce_agent_ticket_tenant'], 10, 3);
        add_shortcode('sovereign_wallet_balance', [$this, 'wallet_balance_shortcode']);
        add_shortcode('sovereign_task_list', [$this, 'task_list_shortcode']);
        add_shortcode('sovereign_tenant_dashboard', [$this, 'tenant_dashboard_shortcode']);
        add_action('plugins_loaded', [$this, 'maybe_register_woocommerce_hooks'], 20);
    }

    public function maybe_register_woocommerce_hooks(): void {
        if (!class_exists('WooCommerce')) {
            return;
        }
        add_filter('pre_option_woocommerce_default_gateway', [$this, 'pre_option_woocommerce_default_gateway'], 10, 3);
        add_filter('woocommerce_default_gateway', [$this, 'filter_woocommerce_default_gateway'], 100);
        add_filter('woocommerce_available_payment_gateways', [$this, 'filter_woocommerce_available_payment_gateways'], 100);
    }

    /**
     * Platform default gateway ID from Sovereign settings (WooCommerce gateway id, e.g. bacs, stripe).
     */
    private function get_sovereign_woocommerce_default_gateway_id(): string {
        $settings = $this->get_settings();
        return sanitize_key((string) ($settings['woocommerce_default_gateway_id'] ?? ''));
    }

    private function woocommerce_restrict_to_default_gateway(): bool {
        $settings = $this->get_settings();
        return ($settings['woocommerce_restrict_to_default_gateway'] ?? '0') === '1';
    }

    /**
     * Short-circuit option read so WooCommerce and extensions see the configured default immediately.
     *
     * @param mixed $pre_value Value to return instead of the option value.
     */
    public function pre_option_woocommerce_default_gateway($pre_value, string $option, $default = false) {
        $id = $this->get_sovereign_woocommerce_default_gateway_id();
        if ($id === '') {
            return $pre_value;
        }
        return $id;
    }

    public function filter_woocommerce_default_gateway(string $gateway_id): string {
        $id = $this->get_sovereign_woocommerce_default_gateway_id();
        return $id !== '' ? $id : $gateway_id;
    }

    /**
     * @param array<string, \WC_Payment_Gateway> $gateways
     * @return array<string, \WC_Payment_Gateway>
     */
    public function filter_woocommerce_available_payment_gateways(array $gateways): array {
        if (is_admin() && !wp_doing_ajax()) {
            return $gateways;
        }
        if (!$this->woocommerce_restrict_to_default_gateway()) {
            return $gateways;
        }
        $id = $this->get_sovereign_woocommerce_default_gateway_id();
        if ($id === '' || !isset($gateways[$id])) {
            return $gateways;
        }
        return [$id => $gateways[$id]];
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
        $out = [
            'api_base' => esc_url_raw($input['api_base'] ?? ''),
            'jwt_shared_secret' => sanitize_text_field($input['jwt_shared_secret'] ?? ''),
            'tenant_id' => sanitize_text_field($input['tenant_id'] ?? 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
            'caller_id' => sanitize_text_field($input['caller_id'] ?? '11111111-1111-1111-1111-111111111111'),
            'crm_base' => esc_url_raw($input['crm_base'] ?? ''),
            'crm_bearer_token' => sanitize_text_field($input['crm_bearer_token'] ?? ''),
            'sync_new_users_to_crm' => !empty($input['sync_new_users_to_crm']) ? '1' : '0',
            'fluent_superadmin_sees_all_tickets' => (isset($input['fluent_superadmin_sees_all_tickets']) && (string) $input['fluent_superadmin_sees_all_tickets'] === '1') ? '1' : '0',
            'fluent_enforce_agent_rest_tenant' => (isset($input['fluent_enforce_agent_rest_tenant']) && (string) $input['fluent_enforce_agent_rest_tenant'] === '1') ? '1' : '0',
            'woocommerce_default_gateway_id' => sanitize_key((string) ($input['woocommerce_default_gateway_id'] ?? '')),
            'woocommerce_restrict_to_default_gateway' => (isset($input['woocommerce_restrict_to_default_gateway']) && (string) $input['woocommerce_restrict_to_default_gateway'] === '1') ? '1' : '0',
        ];
        if ($out['woocommerce_default_gateway_id'] !== '') {
            update_option('woocommerce_default_gateway', $out['woocommerce_default_gateway_id']);
        }
        return $out;
    }

    public function render_settings_page(): void {
        $settings = get_option($this->option_key, []);
        if (isset($_GET['fluent_backfill']) && is_numeric($_GET['fluent_backfill'])) {
            $n = (int) $_GET['fluent_backfill'];
            echo '<div class="notice notice-success is-dismissible"><p>' . esc_html(sprintf(
                /* translators: %d: number of tickets updated */
                _n('Stamped tenant scope on %d Fluent Support ticket.', 'Stamped tenant scope on %d Fluent Support tickets.', $n, 'sovereign-os-core'),
                $n
            )) . '</p></div>';
        }
        $enforce_agent = ($settings['fluent_enforce_agent_rest_tenant'] ?? '1') === '1';
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
                    <tr><th>CRM Base URL</th><td><input class="regular-text" type="url" name="<?php echo esc_attr($this->option_key); ?>[crm_base]" value="<?php echo esc_attr($settings['crm_base'] ?? ''); ?>"><p class="description">Example: http://localhost:3004</p></td></tr>
                    <tr><th>CRM Bearer Token</th><td><input class="regular-text" type="password" name="<?php echo esc_attr($this->option_key); ?>[crm_bearer_token]" value="<?php echo esc_attr($settings['crm_bearer_token'] ?? ''); ?>"></td></tr>
                    <tr><th>Sync New Users to CRM</th><td><label><input type="checkbox" name="<?php echo esc_attr($this->option_key); ?>[sync_new_users_to_crm]" value="1" <?php checked(($settings['sync_new_users_to_crm'] ?? '0'), '1'); ?>> Enable user_register -> CRM contact sync</label></td></tr>
                    <tr><th scope="row">Fluent Support</th><td><fieldset>
                        <input type="hidden" name="<?php echo esc_attr($this->option_key); ?>[fluent_superadmin_sees_all_tickets]" value="0">
                        <label><input type="checkbox" name="<?php echo esc_attr($this->option_key); ?>[fluent_superadmin_sees_all_tickets]" value="1" <?php checked(($settings['fluent_superadmin_sees_all_tickets'] ?? '0'), '1'); ?>> <?php esc_html_e('WordPress administrators see all tickets (skip tenant list filter & REST enforcement)', 'sovereign-os-core'); ?></label><br>
                        <input type="hidden" name="<?php echo esc_attr($this->option_key); ?>[fluent_enforce_agent_rest_tenant]" value="0">
                        <label><input type="checkbox" name="<?php echo esc_attr($this->option_key); ?>[fluent_enforce_agent_rest_tenant]" value="1" <?php checked($enforce_agent); ?>> <?php esc_html_e('Enforce tenant match on Fluent agent REST routes (recommended)', 'sovereign-os-core'); ?></label>
                        <p class="description"><?php esc_html_e('Assign each support agent a Tenant ID on their user profile for isolation. Customers already use sovereign_tenant_id.', 'sovereign-os-core'); ?></p>
                    </fieldset></td></tr>
                    <tr><th scope="row">WooCommerce</th><td><fieldset>
                        <p><label><?php esc_html_e('Default payment gateway ID', 'sovereign-os-core'); ?>
                            <input class="regular-text" type="text" name="<?php echo esc_attr($this->option_key); ?>[woocommerce_default_gateway_id]" value="<?php echo esc_attr($settings['woocommerce_default_gateway_id'] ?? ''); ?>" placeholder="bacs">
                        </label></p>
                        <p class="description"><?php esc_html_e('WooCommerce internal ID (same as in wp-admin → WooCommerce → Settings → Payments). Saving also updates the WooCommerce default option. New gateways still load; this forces which one is selected by default.', 'sovereign-os-core'); ?></p>
                        <input type="hidden" name="<?php echo esc_attr($this->option_key); ?>[woocommerce_restrict_to_default_gateway]" value="0">
                        <label><input type="checkbox" name="<?php echo esc_attr($this->option_key); ?>[woocommerce_restrict_to_default_gateway]" value="1" <?php checked(($settings['woocommerce_restrict_to_default_gateway'] ?? '0'), '1'); ?>> <?php esc_html_e('Checkout: only offer this gateway (hide other methods on the storefront)', 'sovereign-os-core'); ?></label>
                    </fieldset></td></tr>
                </table>
                <?php submit_button(); ?>
            </form>
            <hr>
            <h2><?php esc_html_e('Fluent Support — backfill ticket tenants', 'sovereign-os-core'); ?></h2>
            <p><?php esc_html_e('Stamp sovereign_tenant_id on existing tickets from the linked customer WordPress user (or the default tenant). Run after enabling Fluent Support.', 'sovereign-os-core'); ?></p>
            <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
                <?php wp_nonce_field('sovereign_fluent_backfill'); ?>
                <input type="hidden" name="action" value="sovereign_fluent_backfill">
                <?php submit_button(__('Backfill up to 500 tickets', 'sovereign-os-core'), 'secondary'); ?>
            </form>
            <p class="description"><?php esc_html_e('WP-CLI: wp sovereign-os fluent-backfill-tickets [--batch-size=200]', 'sovereign-os-core'); ?></p>
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

    private function get_default_tenant_id(): string {
        $settings = $this->get_settings();
        return $settings['tenant_id'] ?? 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    }

    private function get_user_tenant_id(int $user_id): string {
        $tenant = (string) get_user_meta($user_id, 'sovereign_tenant_id', true);
        if ($tenant !== '') {
            return sanitize_text_field($tenant);
        }
        $legacy = (string) get_user_meta($user_id, 'tenant_id', true);
        if ($legacy !== '') {
            return sanitize_text_field($legacy);
        }
        return $this->get_default_tenant_id();
    }

    private function get_effective_tenant_id(?int $user_id = null): string {
        if ($user_id === null) {
            $user_id = get_current_user_id();
        }
        if ($user_id > 0) {
            return $this->get_user_tenant_id($user_id);
        }
        return $this->get_default_tenant_id();
    }

    private function get_caller_id(): string {
        $settings = $this->get_settings();
        return $settings['caller_id'] ?? '11111111-1111-1111-1111-111111111111';
    }

    private function get_dev_token(?string $tenant_id = null): string {
        $settings = $this->get_settings();
        $secret = $settings['jwt_shared_secret'] ?? '';
        if (!$secret) {
            return '';
        }
        $tenant_id = $tenant_id ?: $this->get_effective_tenant_id();

        $header = rtrim(strtr(base64_encode(wp_json_encode(['alg' => 'HS256', 'typ' => 'JWT'])), '+/', '-_'), '=');
        $payload = rtrim(strtr(base64_encode(wp_json_encode([
            'sub' => $this->get_caller_id(),
            'tenant_id' => $tenant_id,
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
        $tenant_id = $this->get_effective_tenant_id();

        $response = wp_remote_get($base . $path, [
            'headers' => [
                'Authorization' => 'Bearer ' . $this->get_dev_token($tenant_id),
                'x-tenant-id' => $tenant_id,
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

    private function get_crm_base(): string {
        $settings = $this->get_settings();
        return rtrim($settings['crm_base'] ?? '', '/');
    }

    private function get_crm_bearer_token(): string {
        $settings = $this->get_settings();
        return $settings['crm_bearer_token'] ?? '';
    }

    private function should_sync_new_users_to_crm(): bool {
        $settings = $this->get_settings();
        return ($settings['sync_new_users_to_crm'] ?? '0') === '1';
    }

    public function sync_registered_user_to_crm(int $user_id): void {
        if (!$this->should_sync_new_users_to_crm()) {
            return;
        }
        $crm_base = $this->get_crm_base();
        if ($crm_base === '') {
            return;
        }

        $user = get_userdata($user_id);
        if (!$user || !is_email($user->user_email)) {
            return;
        }

        // Ensure a tenant is attached at registration time; fallback to plugin default.
        $tenant_id = $this->get_user_tenant_id($user_id);
        update_user_meta($user_id, 'sovereign_tenant_id', $tenant_id);

        $first_name = get_user_meta($user_id, 'first_name', true);
        $last_name = get_user_meta($user_id, 'last_name', true);
        if ($first_name === '' && $last_name === '') {
            $display = trim((string) $user->display_name);
            if ($display !== '') {
                $parts = preg_split('/\s+/', $display);
                $first_name = $parts[0] ?? 'User';
                $last_name = isset($parts[1]) ? implode(' ', array_slice($parts, 1)) : 'User';
            } else {
                $first_name = 'User';
                $last_name = (string) $user->user_login;
            }
        }

        $payload = [
            'firstName' => sanitize_text_field((string) $first_name),
            'lastName' => sanitize_text_field((string) $last_name),
            'email' => sanitize_email((string) $user->user_email),
            'customFields' => [
                'wordpressUserId' => $user_id,
                'source' => 'wordpress_registration',
                'roles' => $user->roles,
            ],
        ];

        $headers = [
            'Content-Type' => 'application/json',
            'x-tenant-id' => $tenant_id,
            'x-caller-id' => $this->get_caller_id(),
            'idempotency-key' => wp_generate_uuid4(),
        ];
        $token = $this->get_crm_bearer_token();
        if ($token !== '') {
            $headers['Authorization'] = 'Bearer ' . $token;
        }

        $response = wp_remote_post($crm_base . '/crm/contacts', [
            'headers' => $headers,
            'body' => wp_json_encode($payload),
            'timeout' => 20,
        ]);

        if (is_wp_error($response)) {
            error_log('[Sovereign_OS_Core] CRM user sync failed: ' . $response->get_error_message());
            return;
        }

        $code = (int) wp_remote_retrieve_response_code($response);
        if ($code < 200 || $code >= 300) {
            error_log('[Sovereign_OS_Core] CRM user sync non-2xx response: ' . $code);
        }
    }

    public function render_user_tenant_field(\WP_User $user): void {
        if (!current_user_can('edit_users')) {
            return;
        }
        $tenant_id = $this->get_user_tenant_id((int) $user->ID);
        ?>
        <h2>Sovereign Tenant Scope</h2>
        <table class="form-table" role="presentation">
            <tr>
                <th><label for="sovereign_tenant_id">Tenant ID</label></th>
                <td>
                    <input type="text" name="sovereign_tenant_id" id="sovereign_tenant_id" value="<?php echo esc_attr($tenant_id); ?>" class="regular-text" />
                    <p class="description">This user can only read/write CRM/API data under this tenant scope.</p>
                </td>
            </tr>
        </table>
        <?php
    }

    public function save_user_tenant_field(int $user_id): void {
        if (!current_user_can('edit_users') || !current_user_can('edit_user', $user_id)) {
            return;
        }
        if (!isset($_POST['sovereign_tenant_id'])) {
            return;
        }
        $tenant_id = sanitize_text_field(wp_unslash((string) $_POST['sovereign_tenant_id']));
        if ($tenant_id === '') {
            $tenant_id = $this->get_default_tenant_id();
        }
        update_user_meta($user_id, 'sovereign_tenant_id', $tenant_id);
    }

    private function get_fluent_meta_table(): string {
        global $wpdb;
        return $wpdb->prefix . 'fs_meta';
    }

    private function get_ticket_tenant_scope(int $ticket_id): string {
        global $wpdb;
        $meta_table = $this->get_fluent_meta_table();
        $value = $wpdb->get_var(
            $wpdb->prepare(
                "SELECT value FROM {$meta_table} WHERE object_type = 'ticket_meta' AND object_id = %d AND `key` = 'sovereign_tenant_id' LIMIT 1",
                $ticket_id
            )
        );
        return sanitize_text_field((string) $value);
    }

    private function upsert_ticket_tenant_scope(int $ticket_id, string $tenant_id): void {
        global $wpdb;
        $meta_table = $this->get_fluent_meta_table();
        $existing_id = $wpdb->get_var(
            $wpdb->prepare(
                "SELECT id FROM {$meta_table} WHERE object_type = 'ticket_meta' AND object_id = %d AND `key` = 'sovereign_tenant_id' LIMIT 1",
                $ticket_id
            )
        );

        if ($existing_id) {
            $wpdb->update(
                $meta_table,
                ['value' => $tenant_id],
                ['id' => (int) $existing_id],
                ['%s'],
                ['%d']
            );
            return;
        }

        $wpdb->insert(
            $meta_table,
            [
                'object_type' => 'ticket_meta',
                'object_id' => $ticket_id,
                'key' => 'sovereign_tenant_id',
                'value' => $tenant_id,
            ],
            ['%s', '%d', '%s', '%s']
        );
    }

    /**
     * Stamp each Fluent Support ticket with tenant scope in fs_meta.
     * Hook: fluent_support/ticket_created
     */
    public function bind_fluent_ticket_tenant($ticket, $customer): void {
        if (!is_object($ticket) || empty($ticket->id)) {
            return;
        }

        $tenant_id = '';
        if (is_object($customer) && !empty($customer->user_id)) {
            $tenant_id = $this->get_user_tenant_id((int) $customer->user_id);
        }

        if ($tenant_id === '') {
            $tenant_id = $this->get_effective_tenant_id();
        }

        $this->upsert_ticket_tenant_scope((int) $ticket->id, $tenant_id);
    }

    /**
     * Restrict Fluent Support customer portal ticket access to same-tenant scope.
     * Hook: fluent_support/can_customer_access_ticket
     */
    public function filter_fluent_customer_ticket_access(bool $can_access, $customer, $ticket, $action): bool {
        if (!$can_access || !is_object($ticket) || empty($ticket->id)) {
            return $can_access;
        }

        $ticket_tenant = $this->get_ticket_tenant_scope((int) $ticket->id);
        if ($ticket_tenant === '' && is_object($customer) && !empty($customer->user_id)) {
            $ticket_tenant = $this->get_user_tenant_id((int) $customer->user_id);
            if ($ticket_tenant !== '') {
                $this->upsert_ticket_tenant_scope((int) $ticket->id, $ticket_tenant);
            }
        }

        $user_tenant = $this->get_effective_tenant_id();
        if ($ticket_tenant === '' || $user_tenant === '') {
            return false;
        }

        return hash_equals($ticket_tenant, $user_tenant);
    }

    /**
     * Scope Fluent Support ticket list queries by current tenant.
     * Hook: fluent_support/tickets_query_by_permission_ref
     */
    public function scope_fluent_ticket_query_by_tenant(&$tickets_model, $for_export = false): void {
        if (!is_object($tickets_model) || !method_exists($tickets_model, 'whereIn')) {
            return;
        }

        if ($this->fluent_superadmin_bypasses_fluent_scope()) {
            return;
        }

        $tenant_id = $this->get_effective_tenant_id();
        if ($tenant_id === '') {
            return;
        }

        global $wpdb;
        $meta_table = $this->get_fluent_meta_table();
        $ticket_ids = $wpdb->get_col(
            $wpdb->prepare(
                "SELECT object_id FROM {$meta_table} WHERE object_type = 'ticket_meta' AND `key` = 'sovereign_tenant_id' AND value = %s",
                $tenant_id
            )
        );

        if (empty($ticket_ids)) {
            $tickets_model->whereIn('id', [-1]);
            return;
        }

        $tickets_model->whereIn('id', array_map('intval', $ticket_ids));
    }

    private function fluent_superadmin_bypasses_fluent_scope(): bool {
        $settings = $this->get_settings();
        return !empty($settings['fluent_superadmin_sees_all_tickets'])
            && ($settings['fluent_superadmin_sees_all_tickets'] === '1')
            && current_user_can('manage_options');
    }

    private function fluent_enforce_agent_rest_tenant(): bool {
        $settings = $this->get_settings();
        return !isset($settings['fluent_enforce_agent_rest_tenant']) || $settings['fluent_enforce_agent_rest_tenant'] === '1';
    }

    public function handle_fluent_backfill_post(): void {
        if (!current_user_can('manage_options')) {
            wp_die(esc_html__('Forbidden.', 'sovereign-os-core'), '', ['response' => 403]);
        }
        check_admin_referer('sovereign_fluent_backfill');
        $n = $this->backfill_fluent_ticket_tenants_batch(500);
        wp_safe_redirect(
            add_query_arg(
                ['page' => 'sovereign-os', 'fluent_backfill' => $n],
                admin_url('admin.php')
            )
        );
        exit;
    }

    /**
     * Stamp missing sovereign_tenant_id on Fluent tickets (batch). Returns rows updated this batch.
     */
    public function backfill_fluent_ticket_tenants_batch(int $limit = 200): int {
        global $wpdb;
        $tickets_table = $wpdb->prefix . 'fs_tickets';
        $persons_table = $wpdb->prefix . 'fs_persons';
        $meta_table = $wpdb->prefix . 'fs_meta';
        if ($wpdb->get_var($wpdb->prepare('SHOW TABLES LIKE %s', $tickets_table)) !== $tickets_table) {
            return 0;
        }
        $limit = max(1, min(2000, $limit));
        $sql = "
            SELECT t.id AS ticket_id, p.user_id AS wp_user_id
            FROM `{$tickets_table}` t
            LEFT JOIN `{$persons_table}` p ON p.id = t.customer_id AND p.person_type = 'customer'
            WHERE NOT EXISTS (
                SELECT 1 FROM `{$meta_table}` m
                WHERE m.object_type = 'ticket_meta' AND m.object_id = t.id AND m.`key` = 'sovereign_tenant_id'
            )
            LIMIT %d
        ";
        $rows = $wpdb->get_results($wpdb->prepare($sql, $limit), ARRAY_A);
        if (empty($rows)) {
            return 0;
        }
        $updated = 0;
        foreach ($rows as $row) {
            $ticket_id = (int) ($row['ticket_id'] ?? 0);
            if ($ticket_id <= 0) {
                continue;
            }
            $wp_uid = isset($row['wp_user_id']) ? (int) $row['wp_user_id'] : 0;
            $tenant_id = $wp_uid > 0 ? $this->get_user_tenant_id($wp_uid) : $this->get_default_tenant_id();
            $this->upsert_ticket_tenant_scope($ticket_id, $tenant_id);
            $updated++;
        }
        return $updated;
    }

    /**
     * Block cross-tenant ticket access on Fluent Support agent REST routes when enforcement is on.
     *
     * @param mixed $result
     * @param \WP_REST_Server $server
     * @param \WP_REST_Request $request
     * @return mixed|\WP_Error
     */
    public function fluent_rest_enforce_agent_ticket_tenant($result, $server, $request) {
        if ($result !== null) {
            return $result;
        }
        if (!$this->fluent_enforce_agent_rest_tenant() || $this->fluent_superadmin_bypasses_fluent_scope()) {
            return $result;
        }
        if (!is_user_logged_in() || !class_exists('\FluentSupport\App\Services\Helper')) {
            return $result;
        }
        $route = $request->get_route();
        if (!is_string($route) || !preg_match('#^/fluent-support/v\\d+/tickets/(\\d+)#', $route, $m)) {
            return $result;
        }
        $agent = \FluentSupport\App\Services\Helper::getAgentByUserId();
        if (!$agent || empty($agent->id)) {
            return $result;
        }
        $ticket_id = (int) $m[1];
        $ticket_tenant = $this->get_ticket_tenant_scope($ticket_id);
        if ($ticket_tenant === '') {
            return new \WP_Error(
                'sovereign_tenant_required',
                __('This ticket is not scoped to a tenant yet. Run the Fluent backfill or recreate metadata.', 'sovereign-os-core'),
                ['status' => 403]
            );
        }
        $agent_tenant = $this->get_user_tenant_id((int) get_current_user_id());
        if (!hash_equals($ticket_tenant, $agent_tenant)) {
            return new \WP_Error(
                'sovereign_tenant_mismatch',
                __('You do not have access to tickets outside your tenant scope.', 'sovereign-os-core'),
                ['status' => 403]
            );
        }
        return $result;
    }
}

Sovereign_OS_Core::instance();

if (defined('WP_CLI') && WP_CLI && class_exists('WP_CLI')) {
    \WP_CLI::add_command(
        'sovereign-os fluent-backfill-tickets',
        static function (array $_args, array $assoc_args): void {
            $limit = isset($assoc_args['batch-size']) ? max(1, (int) $assoc_args['batch-size']) : 200;
            $core = Sovereign_OS_Core::instance();
            $grand = 0;
            do {
                $n = $core->backfill_fluent_ticket_tenants_batch($limit);
                $grand += $n;
                if ($n > 0) {
                    \WP_CLI::log("Stamped {$n} tickets (running total {$grand})");
                }
            } while ($n > 0);
            \WP_CLI::success("Backfill complete. Total stamped: {$grand}");
        }
    );
}
