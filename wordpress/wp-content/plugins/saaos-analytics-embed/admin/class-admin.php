<?php
if (!defined('ABSPATH')) exit;

class SAAOS_Analytics_Embed_Admin {
    private string $option_key = 'saaos_analytics_embed_settings';

    public function __construct() {
        add_action('admin_menu', [$this, 'register_admin_menu']);
        add_action('admin_init', [$this, 'register_settings']);
        add_action('admin_enqueue_scripts', [$this, 'enqueue_admin_assets']);
    }

    public function register_admin_menu(): void {
        add_menu_page(
            'Analytics Embed',
            'Analytics Embed',
            'manage_options',
            'saaos-analytics-embed',
            [$this, 'render_dashboard'],
            'dashicons-chart-bar',
            31
        );

        add_submenu_page(
            'saaos-analytics-embed',
            'Dashboard',
            'Dashboard',
            'manage_options',
            'saaos-analytics-embed',
            [$this, 'render_dashboard']
        );

        add_submenu_page(
            'saaos-analytics-embed',
            'Widgets',
            'Widgets',
            'manage_options',
            'saaos-analytics-embed-widgets',
            [$this, 'render_widgets']
        );

        add_submenu_page(
            'saaos-analytics-embed',
            'Tokens',
            'Tokens',
            'manage_options',
            'saaos-analytics-embed-tokens',
            [$this, 'render_tokens']
        );

        add_submenu_page(
            'saaos-analytics-embed',
            'Settings',
            'Settings',
            'manage_options',
            'saaos-analytics-embed-settings',
            [$this, 'render_settings']
        );
    }

    public function register_settings(): void {
        register_setting('saaos_analytics_embed_group', $this->option_key, [
            'type' => 'array',
            'sanitize_callback' => [$this, 'sanitize_settings']
        ]);
    }

    public function sanitize_settings(array $input): array {
        return [
            'api_base' => esc_url_raw($input['api_base'] ?? ''),
            'allowed_origins' => array_map('esc_url_raw', $input['allowed_origins'] ?? []),
            'rate_limit' => absint($input['rate_limit'] ?? 100),
            'widget_configs' => $this->sanitize_widget_configs($input['widget_configs'] ?? []),
            'embed_styles' => $this->sanitize_embed_styles($input['embed_styles'] ?? [])
        ];
    }

    private function sanitize_widget_configs(array $configs): array {
        $sanitized = [];
        foreach ($configs as $widget => $config) {
            $sanitized[sanitize_text_field($widget)] = [
                'enabled' => !empty($config['enabled']),
                'require_login' => !empty($config['require_login']),
                'allowed_roles' => array_map('sanitize_text_field', $config['allowed_roles'] ?? []),
                'custom_title' => sanitize_text_field($config['custom_title'] ?? '')
            ];
        }
        return $sanitized;
    }

    private function sanitize_embed_styles(array $styles): array {
        return [
            'primary_color' => sanitize_hex_color($styles['primary_color'] ?? '#0073aa'),
            'secondary_color' => sanitize_hex_color($styles['secondary_color'] ?? '#00a0d2'),
            'text_color' => sanitize_hex_color($styles['text_color'] ?? '#23282d'),
            'background_color' => sanitize_hex_color($styles['background_color'] ?? '#ffffff'),
            'border_radius' => absint($styles['border_radius'] ?? 4)
        ];
    }

    public function enqueue_admin_assets(string $hook): void {
        if (strpos($hook, 'saaos-analytics-embed') === false) {
            return;
        }

        wp_enqueue_style(
            'saaos-analytics-embed-admin',
            plugin_dir_url(__FILE__) . '../../assets/css/admin.css',
            [],
            '1.0.0'
        );

        wp_enqueue_script(
            'saaos-analytics-embed-admin',
            plugin_dir_url(__FILE__) . '../../assets/js/admin.js',
            ['jquery'],
            '1.0.0',
            true
        );
    }

    public function render_dashboard(): void {
        $widgets = $this->get_widget_stats();
        $embed_tokens = $this->get_token_stats();
        ?>
        <div class="wrap saaos-analytics-admin">
            <h1>Analytics Embed Dashboard</h1>

            <div class="saaos-stats-grid">
                <div class="saaos-stat-card">
                    <h3>Active Embeds</h3>
                    <p class="saaos-stat-number"><?php echo esc_html($embed_tokens['active']); ?></p>
                </div>
                <div class="saaos-stat-card">
                    <h3>Total Widgets</h3>
                    <p class="saaos-stat-number"><?php echo esc_html(count($widgets)); ?></p>
                </div>
                <div class="saaos-stat-card">
                    <h3>Rate Limit</h3>
                    <p class="saaos-stat-number"><?php echo esc_html($this->get_rate_limit()); ?>/min</p>
                </div>
            </div>

            <h2>Available Widgets</h2>
            <table class="wp-list-table widefat fixed striped">
                <thead>
                    <tr>
                        <th>Widget</th>
                        <th>Type</th>
                        <th>Status</th>
                        <th>Shortcode</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($this->get_available_widgets() as $widget): ?>
                        <tr>
                            <td><strong><?php echo esc_html($widget['title']); ?></strong></td>
                            <td><?php echo esc_html($widget['type']); ?></td>
                            <td>
                                <?php echo $widget['enabled'] ? '<span style="color:green;">Enabled</span>' : '<span style="color:gray;">Disabled</span>'; ?>
                            </td>
                            <td><code>[saaos_dashboard widget="<?php echo esc_attr($widget['type']); ?>"]</code></td>
                        </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>

            <h2>Quick Start Guide</h2>
            <div class="saaos-guide">
                <h3>Embedding Analytics</h3>
                <p>Use the following shortcodes to embed analytics widgets:</p>
                <ul>
                    <li><code>[saaos_dashboard widget="overview" period="30d"]</code> - Overview dashboard</li>
                    <li><code>[saaos_stats type="revenue" period="30d"]</code> - Revenue stats</li>
                    <li><code>[saaos_lead_chart period="30d"]</code> - Lead chart</li>
                    <li><code>[saaos_performance_chart period="30d"]</code> - Performance chart</li>
                    <li><code>[saaos_revenue_widget period="30d" comparison="true"]</code> - Revenue widget</li>
                </ul>
            </div>
        </div>
        <?php
    }

    public function render_widgets(): void {
        $settings = get_option($this->option_key, []);
        $widget_configs = $settings['widget_configs'] ?? [];

        if (isset($_POST['saaos_save_widget']) && wp_verify_nonce($_POST['saaos_widget_nonce'], 'saaos_widget_action')) {
            $widget = sanitize_text_field($_POST['widget_type'] ?? '');
            $enabled = !empty($_POST['enabled']);
            $require_login = !empty($_POST['require_login']);
            $allowed_roles = array_filter(array_map('sanitize_text_field', $_POST['allowed_roles'] ?? []));
            $custom_title = sanitize_text_field($_POST['custom_title'] ?? '');

            $settings['widget_configs'] = $settings['widget_configs'] ?? [];
            $settings['widget_configs'][$widget] = [
                'enabled' => $enabled,
                'require_login' => $require_login,
                'allowed_roles' => $allowed_roles,
                'custom_title' => $custom_title
            ];

            update_option($this->option_key, $settings);
            echo '<div class="notice notice-success"><p>Widget settings saved.</p></div>';
        }

        $settings = get_option($this->option_key, []);
        $widget_configs = $settings['widget_configs'] ?? [];
        ?>
        <div class="wrap saaos-analytics-admin">
            <h1>Widget Configuration</h1>

            <table class="wp-list-table widefat fixed striped">
                <thead>
                    <tr>
                        <th>Widget</th>
                        <th>Status</th>
                        <th>Require Login</th>
                        <th>Allowed Roles</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($this->get_available_widgets() as $widget): ?>
                        <?php
                        $config = $widget_configs[$widget['type']] ?? [];
                        $enabled = !empty($config['enabled']);
                        $require_login = !empty($config['require_login']);
                        $roles = implode(', ', $config['allowed_roles'] ?? ['All']);
                        ?>
                        <tr>
                            <td><strong><?php echo esc_html($widget['title']); ?></strong></td>
                            <td><?php echo $enabled ? '<span style="color:green;">Enabled</span>' : '<span style="color:gray;">Disabled</span>'; ?></td>
                            <td><?php echo $require_login ? 'Yes' : 'No'; ?></td>
                            <td><?php echo esc_html($roles ?: 'All'); ?></td>
                            <td>
                                <button type="button" class="button button-small" onclick="editWidget('<?php echo esc_attr($widget['type']); ?>')">Edit</button>
                            </td>
                        </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>

            <div id="widget-edit-modal" style="display:none; margin-top: 20px;" class="saaos-modal">
                <h2>Edit Widget</h2>
                <form method="post">
                    <?php wp_nonce_field('saaos_widget_action', 'saaos_widget_nonce'); ?>
                    <input type="hidden" name="widget_type" id="widget_type" value="">

                    <table class="form-table">
                        <tr>
                            <th><label for="enabled">Enable Widget</label></th>
                            <td><input type="checkbox" name="enabled" id="enabled" value="1"></td>
                        </tr>
                        <tr>
                            <th><label for="require_login">Require Login</label></th>
                            <td><input type="checkbox" name="require_login" id="require_login" value="1"></td>
                        </tr>
                        <tr>
                            <th><label for="allowed_roles">Allowed Roles</label></th>
                            <td>
                                <select name="allowed_roles[]" id="allowed_roles" multiple>
                                    <?php foreach (get_editable_roles() as $role_name => $role_info): ?>
                                        <option value="<?php echo esc_attr($role_name); ?>"><?php echo esc_html($role_info['name']); ?></option>
                                    <?php endforeach; ?>
                                </select>
                                <p class="description">Leave empty to allow all users.</p>
                            </td>
                        </tr>
                        <tr>
                            <th><label for="custom_title">Custom Title</label></th>
                            <td><input type="text" name="custom_title" id="custom_title" class="regular-text"></td>
                        </tr>
                    </table>

                    <p class="submit">
                        <input type="submit" name="saaos_save_widget" class="button button-primary" value="Save Widget">
                    </p>
                </form>
            </div>
        </div>
        <?php
    }

    public function render_tokens(): void {
        $token_manager = new SAAOS_Analytics_Token_Manager();

        if (isset($_POST['saaos_generate_token']) && wp_verify_nonce($_POST['saaos_token_nonce'], 'saaos_token_action')) {
            $label = sanitize_text_field($_POST['token_label'] ?? 'API Token');
            $new_token = $token_manager->generate_api_token($label);
            echo '<div class="notice notice-success"><p>Token generated: <code>' . esc_html($new_token) . '</code></p></div>';
        }

        if (isset($_POST['saaos_revoke_token']) && wp_verify_nonce($_POST['saaos_token_nonce'], 'saaos_token_action')) {
            $token = sanitize_text_field($_POST['token_to_revoke'] ?? '');
            $token_manager->revoke_api_token($token);
            echo '<div class="notice notice-success"><p>Token revoked.</p></div>';
        }

        $tokens = $token_manager->get_api_tokens();
        ?>
        <div class="wrap saaos-analytics-admin">
            <h1>API Tokens</h1>

            <div class="saaos-form-card">
                <h2>Generate New Token</h2>
                <form method="post">
                    <?php wp_nonce_field('saaos_token_action', 'saaos_token_nonce'); ?>
                    <table class="form-table">
                        <tr>
                            <th><label for="token_label">Token Label</label></th>
                            <td>
                                <input type="text" name="token_label" id="token_label" class="regular-text" required>
                                <p class="description">Descriptive name for this token.</p>
                            </td>
                        </tr>
                    </table>
                    <p class="submit">
                        <input type="submit" name="saaos_generate_token" class="button button-primary" value="Generate Token">
                    </p>
                </form>
            </div>

            <h2>Active Tokens</h2>
            <table class="wp-list-table widefat fixed striped">
                <thead>
                    <tr>
                        <th>Label</th>
                        <th>Created</th>
                        <th>Expires</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <?php if (empty($tokens)): ?>
                        <tr><td colspan="4">No API tokens generated.</td></tr>
                    <?php else: ?>
                        <?php foreach ($tokens as $token_hash => $token_data): ?>
                            <tr>
                                <td><?php echo esc_html($token_data['label'] ?? 'Unnamed'); ?></td>
                                <td><?php echo esc_html(date('Y-m-d H:i', $token_data['created'])); ?></td>
                                <td><?php echo esc_html(date('Y-m-d H:i', $token_data['expires'])); ?></td>
                                <td>
                                    <form method="post" style="display:inline;">
                                        <?php wp_nonce_field('saaos_token_action', 'saaos_token_nonce'); ?>
                                        <input type="hidden" name="token_to_revoke" value="<?php echo esc_attr($token_data['token']); ?>">
                                        <input type="submit" name="saaos_revoke_token" class="button button-small" value="Revoke">
                                    </form>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                    <?php endif; ?>
                </tbody>
            </table>
        </div>
        <?php
    }

    public function render_settings(): void {
        $settings = get_option($this->option_key, []);
        ?>
        <div class="wrap saaos-analytics-admin">
            <h1>Analytics Embed Settings</h1>

            <form method="post" action="options.php">
                <?php settings_fields('saaos_analytics_embed_group'); ?>
                <table class="form-table">
                    <tr>
                        <th><label for="api_base">API Base URL</label></th>
                        <td>
                            <input type="url" name="<?php echo esc_attr($this->option_key); ?>[api_base]" 
                                   id="api_base" class="regular-text" 
                                   value="<?php echo esc_attr($settings['api_base'] ?? ''); ?>">
                            <p class="description">Base URL for the Sovereign Analytics API.</p>
                        </td>
                    </tr>
                    <tr>
                        <th><label for="rate_limit">Rate Limit (requests/minute)</label></th>
                        <td>
                            <input type="number" name="<?php echo esc_attr($this->option_key); ?>[rate_limit]" 
                                   id="rate_limit" class="small-text" min="10" max="1000" 
                                   value="<?php echo esc_attr($settings['rate_limit'] ?? 100); ?>">
                        </td>
                    </tr>
                    <tr>
                        <th><label for="allowed_origins">Allowed Origins</label></th>
                        <td>
                            <textarea name="<?php echo esc_attr($this->option_key); ?>[allowed_origins][]" 
                                      id="allowed_origins" class="regular-text" rows="3"><?php 
                                echo esc_textarea(implode("\n", $settings['allowed_origins'] ?? [])); 
                            ?></textarea>
                            <p class="description">One URL per line. Leave empty to allow all origins.</p>
                        </td>
                    </tr>
                </table>

                <h2>Embed Styling</h2>
                <table class="form-table">
                    <tr>
                        <th><label for="primary_color">Primary Color</label></th>
                        <td><input type="color" name="<?php echo esc_attr($this->option_key); ?>[embed_styles][primary_color]" 
                                   id="primary_color" value="<?php echo esc_attr($settings['embed_styles']['primary_color'] ?? '#0073aa'); ?>"></td>
                    </tr>
                    <tr>
                        <th><label for="text_color">Text Color</label></th>
                        <td><input type="color" name="<?php echo esc_attr($this->option_key); ?>[embed_styles][text_color]" 
                                   id="text_color" value="<?php echo esc_attr($settings['embed_styles']['text_color'] ?? '#23282d'); ?>"></td>
                    </tr>
                    <tr>
                        <th><label for="background_color">Background Color</label></th>
                        <td><input type="color" name="<?php echo esc_attr($this->option_key); ?>[embed_styles][background_color]" 
                                   id="background_color" value="<?php echo esc_attr($settings['embed_styles']['background_color'] ?? '#ffffff'); ?>"></td>
                    </tr>
                    <tr>
                        <th><label for="border_radius">Border Radius</label></th>
                        <td>
                            <input type="number" name="<?php echo esc_attr($this->option_key); ?>[embed_styles][border_radius]" 
                                   id="border_radius" class="small-text" min="0" max="20" 
                                   value="<?php echo esc_attr($settings['embed_styles']['border_radius'] ?? 4); ?>"> px
                        </td>
                    </tr>
                </table>

                <?php submit_button(); ?>
            </form>
        </div>
        <?php
    }

    private function get_available_widgets(): array {
        return [
            ['type' => 'overview', 'title' => 'Overview Dashboard', 'enabled' => true],
            ['type' => 'revenue', 'title' => 'Revenue Widget', 'enabled' => true],
            ['type' => 'performance', 'title' => 'Performance Widget', 'enabled' => true],
            ['type' => 'leads', 'title' => 'Leads Chart', 'enabled' => true]
        ];
    }

    private function get_widget_stats(): array {
        return $this->get_available_widgets();
    }

    private function get_token_stats(): array {
        $token_manager = new SAAOS_Analytics_Token_Manager();
        $tokens = $token_manager->get_api_tokens();

        $active = 0;
        $now = time();

        foreach ($tokens as $token) {
            if ($token['expires'] > $now) {
                $active++;
            }
        }

        return ['total' => count($tokens), 'active' => $active];
    }

    private function get_rate_limit(): int {
        $settings = get_option($this->option_key, []);
        return absint($settings['rate_limit'] ?? 100);
    }
}

new SAAOS_Analytics_Embed_Admin();
