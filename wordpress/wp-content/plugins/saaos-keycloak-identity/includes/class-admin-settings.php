<?php
/**
 * Admin Settings
 * 
 * Handles the admin settings page and options API
 */

declare(strict_types=1);

namespace SAAOS\Keycloak;

final class Admin_Settings
{
    private const PAGE_SLUG = 'saaos-keycloak-settings';
    private const OPTION_GROUP = 'saaos_keycloak_options';

    private Keycloak_Client $client;

    public function __construct(Keycloak_Client $client)
    {
        $this->client = $client;
    }

    public function init(): void
    {
        add_action('admin_init', [$this, 'register_settings']);
        add_action('admin_menu', [$this, 'add_admin_menu']);
        add_action('admin_enqueue_scripts', [$this, 'enqueue_assets']);
        add_action('wp_ajax_saaos_keycloak_test_connection', [$this, 'ajax_test_connection']);
        add_action('wp_ajax_saaos_keycloak_clear_cache', [$this, 'ajax_clear_cache']);
    }

    public function register_settings(): void
    {
        register_setting(self::OPTION_GROUP, 'saaos_keycloak_server_url', [
            'type' => 'string',
            'sanitize_callback' => [$this, 'sanitize_url'],
            'default' => '',
        ]);

        register_setting(self::OPTION_GROUP, 'saaos_keycloak_realm', [
            'type' => 'string',
            'sanitize_callback' => 'sanitize_text_field',
            'default' => 'ubi-cms',
        ]);

        register_setting(self::OPTION_GROUP, 'saaos_keycloak_client_id', [
            'type' => 'string',
            'sanitize_callback' => 'sanitize_text_field',
            'default' => 'wordpress',
        ]);

        register_setting(self::OPTION_GROUP, 'saaos_keycloak_client_secret', [
            'type' => 'string',
            'sanitize_callback' => [$this, 'sanitize_secret'],
            'default' => '',
        ]);

        register_setting(self::OPTION_GROUP, 'saaos_keycloak_enabled', [
            'type' => 'string',
            'sanitize_callback' => 'sanitize_text_field',
            'default' => '1',
        ]);

        register_setting(self::OPTION_GROUP, 'saaos_keycloak_default_role', [
            'type' => 'string',
            'sanitize_callback' => 'sanitize_text_field',
            'default' => 'subscriber',
        ]);

        register_setting(self::OPTION_GROUP, 'saaos_keycloak_role_mapping', [
            'type' => 'array',
            'sanitize_callback' => [$this, 'sanitize_role_mapping'],
            'default' => [],
        ]);

        register_setting(self::OPTION_GROUP, 'saaos_keycloak_redirect_after_login', [
            'type' => 'string',
            'sanitize_callback' => 'esc_url_raw',
            'default' => '',
        ]);

        register_setting(self::OPTION_GROUP, 'saaos_keycloak_redirect_after_logout', [
            'type' => 'string',
            'sanitize_callback' => 'esc_url_raw',
            'default' => '',
        ]);

        register_setting(self::OPTION_GROUP, 'saaos_keycloak_debug_mode', [
            'type' => 'string',
            'sanitize_callback' => 'sanitize_text_field',
            'default' => '0',
        ]);

        add_settings_section(
            'saaos_keycloak_main',
            __('Keycloak Connection', 'saaos-keycloak-identity'),
            [$this, 'render_main_section'],
            self::PAGE_SLUG
        );

        add_settings_section(
            'saaos_keycloak_roles',
            __('Role Mapping', 'saaos-keycloak-identity'),
            [$this, 'render_roles_section'],
            self::PAGE_SLUG
        );

        add_settings_section(
            'saaos_keycloak_redirects',
            __('Redirects', 'saaos-keycloak-identity'),
            [$this, 'render_redirects_section'],
            self::PAGE_SLUG
        );

        add_settings_section(
            'saaos_keycloak_advanced',
            __('Advanced', 'saaos-keycloak-identity'),
            [$this, 'render_advanced_section'],
            self::PAGE_SLUG
        );

        $this->add_settings_fields();
    }

    private function add_settings_fields(): void
    {
        add_settings_field(
            'saaos_keycloak_server_url',
            __('Keycloak Server URL', 'saaos-keycloak-identity'),
            [$this, 'render_server_url_field'],
            self::PAGE_SLUG,
            'saaos_keycloak_main'
        );

        add_settings_field(
            'saaos_keycloak_realm',
            __('Realm', 'saaos-keycloak-identity'),
            [$this, 'render_realm_field'],
            self::PAGE_SLUG,
            'saaos_keycloak_main'
        );

        add_settings_field(
            'saaos_keycloak_client_id',
            __('Client ID', 'saaos-keycloak-identity'),
            [$this, 'render_client_id_field'],
            self::PAGE_SLUG,
            'saaos_keycloak_main'
        );

        add_settings_field(
            'saaos_keycloak_client_secret',
            __('Client Secret', 'saaos-keycloak-identity'),
            [$this, 'render_client_secret_field'],
            self::PAGE_SLUG,
            'saaos_keycloak_main'
        );

        add_settings_field(
            'saaos_keycloak_enabled',
            __('Enable Keycloak Login', 'saaos-keycloak-identity'),
            [$this, 'render_enabled_field'],
            self::PAGE_SLUG,
            'saaos_keycloak_main'
        );

        add_settings_field(
            'saaos_keycloak_default_role',
            __('Default Role', 'saaos-keycloak-identity'),
            [$this, 'render_default_role_field'],
            self::PAGE_SLUG,
            'saaos_keycloak_roles'
        );

        add_settings_field(
            'saaos_keycloak_role_mapping',
            __('Role Mapping', 'saaos-keycloak-identity'),
            [$this, 'render_role_mapping_field'],
            self::PAGE_SLUG,
            'saaos_keycloak_roles'
        );

        add_settings_field(
            'saaos_keycloak_redirect_after_login',
            __('Redirect After Login', 'saaos-keycloak-identity'),
            [$this, 'render_redirect_after_login_field'],
            self::PAGE_SLUG,
            'saaos_keycloak_redirects'
        );

        add_settings_field(
            'saaos_keycloak_redirect_after_logout',
            __('Redirect After Logout', 'saaos-keycloak-identity'),
            [$this, 'render_redirect_after_logout_field'],
            self::PAGE_SLUG,
            'saaos_keycloak_redirects'
        );

        add_settings_field(
            'saaos_keycloak_debug_mode',
            __('Debug Mode', 'saaos-keycloak-identity'),
            [$this, 'render_debug_mode_field'],
            self::PAGE_SLUG,
            'saaos_keycloak_advanced'
        );
    }

    public function add_admin_menu(): void
    {
        add_menu_page(
            __('Keycloak Identity', 'saaos-keycloak-identity'),
            __('Keycloak Identity', 'saaos-keycloak-identity'),
            'manage_options',
            self::PAGE_SLUG,
            [$this, 'render_settings_page'],
            'dashicons-shield-alt',
            80
        );
    }

    public function enqueue_assets(string $hook): void
    {
        if (strpos($hook, 'saaos-keycloak-settings') === false) {
            return;
        }

        wp_enqueue_style(
            'saaos-keycloak-admin',
            SAAOS_KEYCLOAK_PLUGIN_URL . 'assets/css/admin.css',
            [],
            SAAOS_KEYCLOAK_VERSION
        );

        wp_enqueue_script(
            'saaos-keycloak-admin',
            SAAOS_KEYCLOAK_PLUGIN_URL . 'assets/js/admin.js',
            ['jquery'],
            SAAOS_KEYCLOAK_VERSION,
            true
        );

        wp_localize_script('saaos-keycloak-admin', 'saaosKeycloakAdmin', [
            'ajaxUrl' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('saaos_keycloak_admin'),
            'strings' => [
                'testConnection' => __('Test Connection', 'saaos-keycloak-identity'),
                'testing' => __('Testing...', 'saaos-keycloak-identity'),
                'success' => __('Success!', 'saaos-keycloak-identity'),
                'failed' => __('Failed', 'saaos-keycloak-identity'),
                'clearCache' => __('Clear Cache', 'saaos-keycloak-identity'),
                'cacheCleared' => __('Cache Cleared', 'saaos-keycloak-identity'),
            ],
        ]);
    }

    public function ajax_test_connection(): void
    {
        check_ajax_referer('saaos_keycloak_admin', 'nonce');

        if (!current_user_can('manage_options')) {
            wp_send_json_error(['message' => __('Permission denied', 'saaos-keycloak-identity')]);
        }

        $result = $this->client->test_connection();

        if ($result['success']) {
            wp_send_json_success($result);
        } else {
            wp_send_json_error($result);
        }
    }

    public function ajax_clear_cache(): void
    {
        check_ajax_referer('saaos_keycloak_admin', 'nonce');

        if (!current_user_can('manage_options')) {
            wp_send_json_error(['message' => __('Permission denied', 'saaos-keycloak-identity')]);
        }

        $this->client->clear_cache();

        wp_send_json_success(['message' => __('Cache cleared successfully', 'saaos-keycloak-identity')]);
    }

    public function render_settings_page(): void
    {
        if (!current_user_can('manage_options')) {
            return;
        }
        ?>
        <div class="wrap">
            <h1><?php echo esc_html__('Keycloak Identity Provider Settings', 'saaos-keycloak-identity'); ?></h1>
            
            <div class="saaos-keycloak-header">
                <div class="saaos-keycloak-status">
                    <?php $this->render_status_badge(); ?>
                </div>
                <div class="saaos-keycloak-actions">
                    <button type="button" class="button" id="saaos-keycloak-test-connection">
                        <?php esc_html_e('Test Connection', 'saaos-keycloak-identity'); ?>
                    </button>
                    <button type="button" class="button" id="saaos-keycloak-clear-cache">
                        <?php esc_html_e('Clear Cache', 'saaos-keycloak-identity'); ?>
                    </button>
                </div>
            </div>

            <div id="saaos-keycloak-test-result"></div>

            <form method="post" action="options.php">
                <?php
                settings_fields(self::OPTION_GROUP);
                do_settings_sections(self::PAGE_SLUG);
                submit_button();
                ?>
            </form>

            <hr>

            <h2><?php esc_html_e('Keycloak Realm Roles Reference', 'saaos-keycloak-identity'); ?></h2>
            <p><?php esc_html_e('Map these Keycloak roles to WordPress roles:', 'saaos-keycloak-identity'); ?></p>
            <table class="widefat">
                <thead>
                    <tr>
                        <th><?php esc_html_e('Keycloak Role', 'saaos-keycloak-identity'); ?></th>
                        <th><?php esc_html_e('Description', 'saaos-keycloak-identity'); ?></th>
                    </tr>
                </thead>
                <tbody>
                    <tr><td><code>admin</code></td><td><?php esc_html_e('Full WordPress admin access', 'saaos-keycloak-identity'); ?></td></tr>
                    <tr><td><code>ubi_admin</code></td><td><?php esc_html_e('UBI administration access', 'saaos-keycloak-identity'); ?></td></tr>
                    <tr><td><code>treasury_admin</code></td><td><?php esc_html_e('Treasury management access', 'saaos-keycloak-identity'); ?></td></tr>
                    <tr><td><code>agent_creator</code></td><td><?php esc_html_e('Can create agents', 'saaos-keycloak-identity'); ?></td></tr>
                    <tr><td><code>user</code></td><td><?php esc_html_e('Standard user access', 'saaos-keycloak-identity'); ?></td></tr>
                </tbody>
            </table>

            <h2><?php esc_html_e('Shortcodes', 'saaos-keycloak-identity'); ?></h2>
            <p><?php esc_html_e('Use these shortcodes to display login/register buttons:', 'saaos-keycloak-identity'); ?></p>
            <code>[saaos_keycloak_login redirect_to="/dashboard"]</code>
            <p><code>[saaos_keycloak_register redirect_to="/welcome"]</code></p>
        </div>
        <?php
    }

    private function render_status_badge(): void
    {
        $configured = $this->client->is_configured();
        $enabled = get_option('saaos_keycloak_enabled', '1') === '1';
        
        if ($configured && $enabled) {
            echo '<span class="saaos-status saaos-status-active">';
            esc_html_e('Active', 'saaos-keycloak-identity');
            echo '</span>';
        } elseif ($configured) {
            echo '<span class="saaos-status saaos-status-inactive">';
            esc_html_e('Configured (Disabled)', 'saaos-keycloak-identity');
            echo '</span>';
        } else {
            echo '<span class="saaos-status saaos-status-unconfigured">';
            esc_html_e('Not Configured', 'saaos-keycloak-identity');
            echo '</span>';
        }
    }

    public function render_main_section(): void
    {
        echo '<p>' . esc_html__('Configure your Keycloak server connection details.', 'saaos-keycloak-identity') . '</p>';
    }

    public function render_roles_section(): void
    {
        echo '<p>' . esc_html__('Map Keycloak roles to WordPress roles. Higher priority roles take precedence.', 'saaos-keycloak-identity') . '</p>';
    }

    public function render_redirects_section(): void
    {
        echo '<p>' . esc_html__('Configure redirect URLs after login/logout. Leave empty for default behavior.', 'saaos-keycloak-identity') . '</p>';
    }

    public function render_advanced_section(): void
    {
        echo '<p>' . esc_html__('Advanced settings for debugging and token management.', 'saaos-keycloak-identity') . '</p>';
    }

    public function render_server_url_field(): void
    {
        $value = get_option('saaos_keycloak_server_url', '');
        echo '<input type="url" id="saaos_keycloak_server_url" name="saaos_keycloak_server_url"';
        echo ' value="' . esc_attr($value) . '" class="regular-text code" placeholder="https://keycloak.example.com">';
        echo '<p class="description">' . esc_html__('The base URL of your Keycloak server (without trailing slash)', 'saaos-keycloak-identity') . '</p>';
    }

    public function render_realm_field(): void
    {
        $value = get_option('saaos_keycloak_realm', 'ubi-cms');
        echo '<input type="text" id="saaos_keycloak_realm" name="saaos_keycloak_realm"';
        echo ' value="' . esc_attr($value) . '" class="regular-text">';
        echo '<p class="description">' . esc_html__('The Keycloak realm name (e.g., ubi-cms)', 'saaos-keycloak-identity') . '</p>';
    }

    public function render_client_id_field(): void
    {
        $value = get_option('saaos_keycloak_client_id', 'wordpress');
        echo '<input type="text" id="saaos_keycloak_client_id" name="saaos_keycloak_client_id"';
        echo ' value="' . esc_attr($value) . '" class="regular-text">';
        echo '<p class="description">' . esc_html__('The OAuth 2.0 client ID registered in Keycloak', 'saaos-keycloak-identity') . '</p>';
    }

    public function render_client_secret_field(): void
    {
        $value = get_option('saaos_keycloak_client_secret', '');
        echo '<input type="password" id="saaos_keycloak_client_secret" name="saaos_keycloak_client_secret"';
        echo ' value="' . esc_attr($value) . '" class="regular-text" autocomplete="new-password">';
        echo '<p class="description">' . esc_html__('The client secret from Keycloak', 'saaos-keycloak-identity') . '</p>';
    }

    public function render_enabled_field(): void
    {
        $value = get_option('saaos_keycloak_enabled', '1');
        echo '<input type="checkbox" id="saaos_keycloak_enabled" name="saaos_keycloak_enabled"';
        echo ' value="1"' . checked('1', $value, false) . '>';
        echo '<label for="saaos_keycloak_enabled"> ' . esc_html__('Enable Keycloak authentication', 'saaos-keycloak-identity') . '</label>';
    }

    public function render_default_role_field(): void
    {
        $value = get_option('saaos_keycloak_default_role', 'subscriber');
        $roles = $this->get_wp_roles();
        
        echo '<select id="saaos_keycloak_default_role" name="saaos_keycloak_default_role">';
        foreach ($roles as $role_key => $role_name) {
            echo '<option value="' . esc_attr($role_key) . '"' . selected($role_key, $value, false) . '>';
            echo esc_html($role_name) . '</option>';
        }
        echo '</select>';
        echo '<p class="description">' . esc_html__('Default WordPress role for new users from Keycloak', 'saaos-keycloak-identity') . '</p>';
    }

    public function render_role_mapping_field(): void
    {
        $mapping = get_option('saaos_keycloak_role_mapping', []);
        if (is_string($mapping)) {
            $mapping = json_decode($mapping, true) ?: [];
        }
        
        $kc_roles = ['admin', 'ubi_admin', 'treasury_admin', 'agent_creator', 'user'];
        $wp_roles = $this->get_wp_roles();

        echo '<div id="saaos-role-mapping">';
        echo '<table class="widefat" id="saaos-role-mapping-table">';
        echo '<thead><tr><th>' . esc_html__('Keycloak Role', 'saaos-keycloak-identity') . '</th>';
        echo '<th>' . esc_html__('WordPress Role', 'saaos-keycloak-identity') . '</th></tr></thead>';
        echo '<tbody>';
        
        foreach ($kc_roles as $kc_role) {
            echo '<tr>';
            echo '<td><code>' . esc_html($kc_role) . '</code></td>';
            echo '<td><select name="saaos_keycloak_role_mapping[' . esc_attr($kc_role) . ']">';
            echo '<option value="">— ' . esc_html__('Default', 'saaos-keycloak-identity') . ' —</option>';
            foreach ($wp_roles as $wp_role_key => $wp_role_name) {
                $selected = ($mapping[$kc_role] ?? '') === $wp_role_key ? 'selected' : '';
                echo '<option value="' . esc_attr($wp_role_key) . '" ' . $selected . '>' . esc_html($wp_role_name) . '</option>';
            }
            echo '</select></td>';
            echo '</tr>';
        }
        
        echo '</tbody></table></div>';
        echo '<p class="description">' . esc_html__('Map Keycloak realm roles to WordPress roles. Empty mapping uses default role.', 'saaos-keycloak-identity') . '</p>';
    }

    public function render_redirect_after_login_field(): void
    {
        $value = get_option('saaos_keycloak_redirect_after_login', '');
        echo '<input type="url" id="saaos_keycloak_redirect_after_login" name="saaos_keycloak_redirect_after_login"';
        echo ' value="' . esc_attr($value) . '" class="regular-text">';
        echo '<p class="description">' . esc_html__('URL to redirect to after successful login. Leave empty for admin dashboard.', 'saaos-keycloak-identity') . '</p>';
    }

    public function render_redirect_after_logout_field(): void
    {
        $value = get_option('saaos_keycloak_redirect_after_logout', '');
        echo '<input type="url" id="saaos_keycloak_redirect_after_logout" name="saaos_keycloak_redirect_after_logout"';
        echo ' value="' . esc_attr($value) . '" class="regular-text">';
        echo '<p class="description">' . esc_html__('URL to redirect to after logout. Leave empty for home page.', 'saaos-keycloak-identity') . '</p>';
    }

    public function render_debug_mode_field(): void
    {
        $value = get_option('saaos_keycloak_debug_mode', '0');
        echo '<input type="checkbox" id="saaos_keycloak_debug_mode" name="saaos_keycloak_debug_mode"';
        echo ' value="1"' . checked('1', $value, false) . '>';
        echo '<label for="saaos_keycloak_debug_mode"> ' . esc_html__('Enable debug logging', 'saaos-keycloak-identity') . '</label>';
        echo '<p class="description">' . esc_html__('Logs detailed error messages to PHP error log. Disable in production.', 'saaos-keycloak-identity') . '</p>';
    }

    private function get_wp_roles(): array
    {
        $roles = [];
        $editable_roles = get_editable_roles();
        
        foreach ($editable_roles as $role_key => $role_data) {
            $roles[$role_key] = translate_user_role($role_data['name']);
        }
        
        return $roles;
    }

    public function sanitize_url(string $url): string
    {
        $url = trim($url);
        $url = rtrim($url, '/');
        return esc_url_raw($url);
    }

    public function sanitize_secret(string $secret): string
    {
        return sanitize_text_field($secret);
    }

    public function sanitize_role_mapping(array $mapping): array
    {
        $sanitized = [];
        $valid_roles = array_keys($this->get_wp_roles());
        
        foreach ($mapping as $kc_role => $wp_role) {
            $kc_role = sanitize_text_field($kc_role);
            $wp_role = sanitize_text_field($wp_role);
            
            if (empty($wp_role) || in_array($wp_role, $valid_roles, true)) {
                $sanitized[$kc_role] = $wp_role;
            }
        }
        
        return $sanitized;
    }
}
