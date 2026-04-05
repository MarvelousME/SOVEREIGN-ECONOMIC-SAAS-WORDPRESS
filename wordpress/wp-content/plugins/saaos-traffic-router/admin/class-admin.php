<?php
if (!defined('ABSPATH')) exit;

class SAAOS_Traffic_Router_Admin {
    private string $option_key = 'saaos_traffic_router_settings';

    public function __construct() {
        add_action('admin_menu', [$this, 'register_admin_menu']);
        add_action('admin_init', [$this, 'register_settings']);
        add_action('admin_enqueue_scripts', [$this, 'enqueue_admin_assets']);
    }

    public function register_admin_menu(): void {
        add_menu_page(
            'Traffic Router',
            'Traffic Router',
            'manage_options',
            'saaos-traffic-router',
            [$this, 'render_dashboard'],
            'dashicons-randomize',
            30
        );

        add_submenu_page(
            'saaos-traffic-router',
            'Dashboard',
            'Dashboard',
            'manage_options',
            'saaos-traffic-router',
            [$this, 'render_dashboard']
        );

        add_submenu_page(
            'saaos-traffic-router',
            'A/B Tests',
            'A/B Tests',
            'manage_options',
            'saaos-traffic-router-ab',
            [$this, 'render_ab_tests']
        );

        add_submenu_page(
            'saaos-traffic-router',
            'Geo Routing',
            'Geo Routing',
            'manage_options',
            'saaos-traffic-router-geo',
            [$this, 'render_geo_routing']
        );

        add_submenu_page(
            'saaos-traffic-router',
            'Conversion Pixels',
            'Conversion Pixels',
            'manage_options',
            'saaos-traffic-router-pixels',
            [$this, 'render_pixels']
        );

        add_submenu_page(
            'saaos-traffic-router',
            'Settings',
            'Settings',
            'manage_options',
            'saaos-traffic-router-settings',
            [$this, 'render_settings']
        );
    }

    public function register_settings(): void {
        register_setting('saaos_traffic_router_group', $this->option_key, [
            'type' => 'array',
            'sanitize_callback' => [$this, 'sanitize_settings']
        ]);
    }

    public function sanitize_settings(array $input): array {
        return [
            'default_landing_page' => esc_url_raw($input['default_landing_page'] ?? ''),
            'attribution_window' => absint($input['attribution_window'] ?? 30),
            'api_base' => esc_url_raw($input['api_base'] ?? ''),
            'geo_api_key' => sanitize_text_field($input['geo_api_key'] ?? ''),
            'ab_variants' => $this->sanitize_ab_variants($input['ab_variants'] ?? []),
            'geo_routing' => $this->sanitize_geo_routing($input['geo_routing'] ?? []),
            'device_routing' => $this->sanitize_device_routing($input['device_routing'] ?? []),
            'conversion_pixels' => $this->sanitize_pixels($input['conversion_pixels'] ?? [])
        ];
    }

    private function sanitize_ab_variants(array $variants): array {
        $sanitized = [];
        foreach ($variants as $campaign => $data) {
            if (empty($campaign)) continue;
            $sanitized[sanitize_text_field($campaign)] = [
                'destination_a' => esc_url_raw($data['destination_a'] ?? ''),
                'destination_b' => esc_url_raw($data['destination_b'] ?? ''),
                'weight_a' => max(0, min(100, floatval($data['weight_a'] ?? 50))),
                'weight_b' => max(0, min(100, floatval($data['weight_b'] ?? 50)))
            ];
        }
        return $sanitized;
    }

    private function sanitize_geo_routing(array $routing): array {
        $sanitized = [];
        foreach ($routing as $campaign => $destinations) {
            if (empty($campaign)) continue;
            $sanitized[sanitize_text_field($campaign)] = [
                'destinations' => array_map('esc_url_raw', $destinations['destinations'] ?? [])
            ];
        }
        return $sanitized;
    }

    private function sanitize_device_routing(array $routing): array {
        $sanitized = [];
        foreach ($routing as $campaign => $destinations) {
            if (empty($campaign)) continue;
            $sanitized[sanitize_text_field($campaign)] = [
                'destinations' => array_map('esc_url_raw', $destinations['destinations'] ?? [])
            ];
        }
        return $sanitized;
    }

    private function sanitize_pixels(array $pixels): array {
        $sanitized = [];
        foreach ($pixels as $id => $data) {
            if (empty($id)) continue;
            $sanitized[sanitize_text_field($id)] = [
                'name' => sanitize_text_field($data['name'] ?? ''),
                'url' => esc_url_raw($data['url'] ?? ''),
                'events' => array_map('sanitize_text_field', $data['events'] ?? [])
            ];
        }
        return $sanitized;
    }

    public function enqueue_admin_assets(string $hook): void {
        if (strpos($hook, 'saaos-traffic-router') === false) {
            return;
        }

        wp_enqueue_style(
            'saaos-traffic-router-admin',
            plugin_dir_url(__FILE__) . '../../assets/css/admin.css',
            [],
            '1.0.0'
        );

        wp_enqueue_script(
            'saaos-traffic-router-admin',
            plugin_dir_url(__FILE__) . '../../assets/js/admin.js',
            ['jquery'],
            '1.0.0',
            true
        );
    }

    public function render_dashboard(): void {
        $stats = $this->get_dashboard_stats();
        $recent_clicks = $this->get_recent_clicks(10);
        $recent_conversions = $this->get_recent_conversions(10);
        $top_campaigns = $this->get_top_campaigns(5);
        ?>
        <div class="wrap saaos-traffic-router-admin">
            <h1>Traffic Router Dashboard</h1>

            <div class="saaos-stats-grid">
                <div class="saaos-stat-card">
                    <h3>Total Clicks</h3>
                    <p class="saaos-stat-number"><?php echo esc_html(number_format($stats['total_clicks'])); ?></p>
                </div>
                <div class="saaos-stat-card">
                    <h3>Total Conversions</h3>
                    <p class="saaos-stat-number"><?php echo esc_html(number_format($stats['total_conversions'])); ?></p>
                </div>
                <div class="saaos-stat-card">
                    <h3>Conversion Rate</h3>
                    <p class="saaos-stat-number"><?php echo esc_html($stats['conversion_rate']); ?>%</p>
                </div>
                <div class="saaos-stat-card">
                    <h3>Total Revenue</h3>
                    <p class="saaos-stat-number">$<?php echo esc_html(number_format($stats['total_revenue'], 2)); ?></p>
                </div>
            </div>

            <div class="saaos-dashboard-row">
                <div class="saaos-dashboard-col">
                    <h2>Recent Clicks</h2>
                    <table class="wp-list-table widefat fixed striped">
                        <thead>
                            <tr>
                                <th>Click ID</th>
                                <th>Campaign</th>
                                <th>Source</th>
                                <th>Medium</th>
                                <th>Time</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php if (empty($recent_clicks)): ?>
                                <tr><td colspan="5">No clicks recorded yet.</td></tr>
                            <?php else: ?>
                                <?php foreach ($recent_clicks as $click): ?>
                                    <tr>
                                        <td><code><?php echo esc_html(substr($click['click_id'], 0, 8)); ?>...</code></td>
                                        <td><?php echo esc_html($click['campaign']); ?></td>
                                        <td><?php echo esc_html($click['source']); ?></td>
                                        <td><?php echo esc_html($click['medium']); ?></td>
                                        <td><?php echo esc_html(human_time_diff($click['created_at'], time()) . ' ago'); ?></td>
                                    </tr>
                                <?php endforeach; ?>
                            <?php endif; ?>
                        </tbody>
                    </table>
                </div>

                <div class="saaos-dashboard-col">
                    <h2>Recent Conversions</h2>
                    <table class="wp-list-table widefat fixed striped">
                        <thead>
                            <tr>
                                <th>Conversion ID</th>
                                <th>Value</th>
                                <th>Type</th>
                                <th>Time</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php if (empty($recent_conversions)): ?>
                                <tr><td colspan="4">No conversions recorded yet.</td></tr>
                            <?php else: ?>
                                <?php foreach ($recent_conversions as $conv): ?>
                                    <tr>
                                        <td><code><?php echo esc_html(substr($conv['conversion_id'], 0, 8)); ?>...</code></td>
                                        <td>$<?php echo esc_html(number_format($conv['value'], 2)); ?></td>
                                        <td><?php echo esc_html($conv['event_type']); ?></td>
                                        <td><?php echo esc_html(human_time_diff($conv['created_at'], time()) . ' ago'); ?></td>
                                    </tr>
                                <?php endforeach; ?>
                            <?php endif; ?>
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="saaos-dashboard-row">
                <div class="saaos-dashboard-col">
                    <h2>Top Campaigns</h2>
                    <table class="wp-list-table widefat fixed striped">
                        <thead>
                            <tr>
                                <th>Campaign</th>
                                <th>Clicks</th>
                                <th>Conversions</th>
                                <th>Rate</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php if (empty($top_campaigns)): ?>
                                <tr><td colspan="4">No campaign data yet.</td></tr>
                            <?php else: ?>
                                <?php foreach ($top_campaigns as $campaign): ?>
                                    <tr>
                                        <td><?php echo esc_html($campaign['campaign']); ?></td>
                                        <td><?php echo esc_html(number_format($campaign['clicks'])); ?></td>
                                        <td><?php echo esc_html(number_format($campaign['conversions'])); ?></td>
                                        <td><?php echo esc_html($campaign['rate']); ?>%</td>
                                    </tr>
                                <?php endforeach; ?>
                            <?php endif; ?>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
        <?php
    }

    public function render_ab_tests(): void {
        $settings = get_option($this->option_key, []);
        $ab_variants = $settings['ab_variants'] ?? [];

        if (isset($_POST['saaos_save_ab_test']) && wp_verify_nonce($_POST['saaos_ab_nonce'], 'saaos_ab_test_action')) {
            $campaign = sanitize_text_field($_POST['campaign_name'] ?? '');
            $dest_a = esc_url_raw($_POST['destination_a'] ?? '');
            $dest_b = esc_url_raw($_POST['destination_b'] ?? '');
            $weight_a = max(0, min(100, floatval($_POST['weight_a'] ?? 50)));

            if ($campaign && ($dest_a || $dest_b)) {
                $settings['ab_variants'] = $settings['ab_variants'] ?? [];
                $settings['ab_variants'][$campaign] = [
                    'destination_a' => $dest_a,
                    'destination_b' => $dest_b,
                    'weight_a' => $weight_a,
                    'weight_b' => 100 - $weight_a,
                    'created_at' => time()
                ];
                update_option($this->option_key, $settings);
                echo '<div class="notice notice-success"><p>A/B test saved successfully.</p></div>';
            }
        }

        if (isset($_POST['saaos_delete_ab_test']) && wp_verify_nonce($_POST['saaos_ab_nonce'], 'saaos_ab_test_action')) {
            $campaign = sanitize_text_field($_POST['campaign_name'] ?? '');
            if ($campaign && isset($settings['ab_variants'][$campaign])) {
                unset($settings['ab_variants'][$campaign]);
                update_option($this->option_key, $settings);
                echo '<div class="notice notice-success"><p>A/B test deleted successfully.</p></div>';
            }
        }

        $settings = get_option($this->option_key, []);
        $ab_variants = $settings['ab_variants'] ?? [];
        ?>
        <div class="wrap saaos-traffic-router-admin">
            <h1>A/B Tests</h1>

            <div class="saaos-form-card">
                <h2>Add/Edit A/B Test</h2>
                <form method="post">
                    <?php wp_nonce_field('saaos_ab_test_action', 'saaos_ab_nonce'); ?>
                    <table class="form-table">
                        <tr>
                            <th><label for="campaign_name">Campaign Name</label></th>
                            <td><input type="text" name="campaign_name" id="campaign_name" class="regular-text" required></td>
                        </tr>
                        <tr>
                            <th><label for="destination_a">Variant A URL</label></th>
                            <td><input type="url" name="destination_a" id="destination_a" class="regular-text"></td>
                        </tr>
                        <tr>
                            <th><label for="destination_b">Variant B URL</label></th>
                            <td><input type="url" name="destination_b" id="destination_b" class="regular-text"></td>
                        </tr>
                        <tr>
                            <th><label for="weight_a">Variant A Weight (%)</label></th>
                            <td>
                                <input type="number" name="weight_a" id="weight_a" value="50" min="1" max="99" class="small-text">
                                <p class="description">Variant B will receive the remaining percentage.</p>
                            </td>
                        </tr>
                    </table>
                    <p class="submit">
                        <input type="submit" name="saaos_save_ab_test" class="button button-primary" value="Save A/B Test">
                    </p>
                </form>
            </div>

            <h2>Active A/B Tests</h2>
            <table class="wp-list-table widefat fixed striped">
                <thead>
                    <tr>
                        <th>Campaign</th>
                        <th>Variant A</th>
                        <th>Variant B</th>
                        <th>Weight A/B</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <?php if (empty($ab_variants)): ?>
                        <tr><td colspan="5">No A/B tests configured.</td></tr>
                    <?php else: ?>
                        <?php foreach ($ab_variants as $campaign => $test): ?>
                            <tr>
                                <td><strong><?php echo esc_html($campaign); ?></strong></td>
                                <td><?php echo esc_url($test['destination_a']); ?></td>
                                <td><?php echo esc_url($test['destination_b']); ?></td>
                                <td><?php echo esc_html($test['weight_a']); ?>% / <?php echo esc_html($test['weight_b']); ?>%</td>
                                <td>
                                    <form method="post" style="display:inline;">
                                        <?php wp_nonce_field('saaos_ab_test_action', 'saaos_ab_nonce'); ?>
                                        <input type="hidden" name="campaign_name" value="<?php echo esc_attr($campaign); ?>">
                                        <input type="submit" name="saaos_delete_ab_test" class="button button-small" value="Delete">
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

    public function render_geo_routing(): void {
        $settings = get_option($this->option_key, []);
        $geo_routing = $settings['geo_routing'] ?? [];

        if (isset($_POST['saaos_save_geo']) && wp_verify_nonce($_POST['saaos_geo_nonce'], 'saaos_geo_action')) {
            $campaign = sanitize_text_field($_POST['campaign_name'] ?? '');
            $country = strtoupper(sanitize_text_field($_POST['country_code'] ?? ''));
            $destination = esc_url_raw($_POST['destination'] ?? '');

            if ($campaign && $country && $destination) {
                $settings['geo_routing'] = $settings['geo_routing'] ?? [];
                $settings['geo_routing'][$campaign] = $settings['geo_routing'][$campaign] ?? [];
                $settings['geo_routing'][$campaign]['destinations'] = $settings['geo_routing'][$campaign]['destinations'] ?? [];
                $settings['geo_routing'][$campaign]['destinations'][$country] = $destination;
                update_option($this->option_key, $settings);
                echo '<div class="notice notice-success"><p>Geo routing rule saved.</p></div>';
            }
        }

        if (isset($_POST['saaos_delete_geo']) && wp_verify_nonce($_POST['saaos_geo_nonce'], 'saaos_geo_action')) {
            $campaign = sanitize_text_field($_POST['campaign_name'] ?? '');
            $country = strtoupper(sanitize_text_field($_POST['country_code'] ?? ''));
            if ($campaign && $country && isset($settings['geo_routing'][$campaign]['destinations'][$country])) {
                unset($settings['geo_routing'][$campaign]['destinations'][$country]);
                update_option($this->option_key, $settings);
                echo '<div class="notice notice-success"><p>Geo routing rule deleted.</p></div>';
            }
        }

        $settings = get_option($this->option_key, []);
        $geo_routing = $settings['geo_routing'] ?? [];
        ?>
        <div class="wrap saaos-traffic-router-admin">
            <h1>Geo Routing</h1>

            <div class="saaos-form-card">
                <h2>Add Geo Routing Rule</h2>
                <form method="post">
                    <?php wp_nonce_field('saaos_geo_action', 'saaos_geo_nonce'); ?>
                    <table class="form-table">
                        <tr>
                            <th><label for="campaign_name">Campaign Name</label></th>
                            <td><input type="text" name="campaign_name" class="regular-text" required></td>
                        </tr>
                        <tr>
                            <th><label for="country_code">Country Code (ISO 2-letter)</label></th>
                            <td>
                                <input type="text" name="country_code" class="small-text" maxlength="2" placeholder="US" required>
                                <p class="description">e.g., US, GB, DE, FR, AU</p>
                            </td>
                        </tr>
                        <tr>
                            <th><label for="destination">Destination URL</label></th>
                            <td><input type="url" name="destination" class="regular-text" required></td>
                        </tr>
                    </table>
                    <p class="submit">
                        <input type="submit" name="saaos_save_geo" class="button button-primary" value="Add Rule">
                    </p>
                </form>
            </div>

            <h2>Active Geo Routing Rules</h2>
            <table class="wp-list-table widefat fixed striped">
                <thead>
                    <tr>
                        <th>Campaign</th>
                        <th>Country</th>
                        <th>Destination</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <?php
                    $has_rules = false;
                    foreach ($geo_routing as $campaign => $rules) {
                        if (empty($rules['destinations'])) continue;
                        foreach ($rules['destinations'] as $country => $destination) {
                            $has_rules = true;
                            ?>
                            <tr>
                                <td><?php echo esc_html($campaign); ?></td>
                                <td><code><?php echo esc_html($country); ?></code></td>
                                <td><?php echo esc_url($destination); ?></td>
                                <td>
                                    <form method="post" style="display:inline;">
                                        <?php wp_nonce_field('saaos_geo_action', 'saaos_geo_nonce'); ?>
                                        <input type="hidden" name="campaign_name" value="<?php echo esc_attr($campaign); ?>">
                                        <input type="hidden" name="country_code" value="<?php echo esc_attr($country); ?>">
                                        <input type="submit" name="saaos_delete_geo" class="button button-small" value="Delete">
                                    </form>
                                </td>
                            </tr>
                        <?php }
                    }
                    if (!$has_rules): ?>
                        <tr><td colspan="4">No geo routing rules configured.</td></tr>
                    <?php endif; ?>
                </tbody>
            </table>
        </div>
        <?php
    }

    public function render_pixels(): void {
        $settings = get_option($this->option_key, []);
        $pixels = $settings['conversion_pixels'] ?? [];

        if (isset($_POST['saaos_save_pixel']) && wp_verify_nonce($_POST['saaos_pixel_nonce'], 'saaos_pixel_action')) {
            $name = sanitize_text_field($_POST['pixel_name'] ?? '');
            $url = esc_url_raw($_POST['pixel_url'] ?? '');
            $events = array_filter(array_map('sanitize_text_field', $_POST['pixel_events'] ?? []));

            if ($name && $url) {
                $pixel_id = sanitize_title($name);
                $settings['conversion_pixels'] = $settings['conversion_pixels'] ?? [];
                $settings['conversion_pixels'][$pixel_id] = [
                    'name' => $name,
                    'url' => $url,
                    'events' => $events,
                    'created_at' => time()
                ];
                update_option($this->option_key, $settings);
                echo '<div class="notice notice-success"><p>Conversion pixel saved.</p></div>';
            }
        }

        if (isset($_POST['saaos_delete_pixel']) && wp_verify_nonce($_POST['saaos_pixel_nonce'], 'saaos_pixel_action')) {
            $pixel_id = sanitize_text_field($_POST['pixel_id'] ?? '');
            if ($pixel_id && isset($settings['conversion_pixels'][$pixel_id])) {
                unset($settings['conversion_pixels'][$pixel_id]);
                update_option($this->option_key, $settings);
                echo '<div class="notice notice-success"><p>Conversion pixel deleted.</p></div>';
            }
        }

        $settings = get_option($this->option_key, []);
        $pixels = $settings['conversion_pixels'] ?? [];
        ?>
        <div class="wrap saaos-traffic-router-admin">
            <h1>Conversion Pixels</h1>

            <div class="saaos-form-card">
                <h2>Add Conversion Pixel</h2>
                <form method="post">
                    <?php wp_nonce_field('saaos_pixel_action', 'saaos_pixel_nonce'); ?>
                    <table class="form-table">
                        <tr>
                            <th><label for="pixel_name">Pixel Name</label></th>
                            <td><input type="text" name="pixel_name" class="regular-text" required></td>
                        </tr>
                        <tr>
                            <th><label for="pixel_url">Pixel URL</label></th>
                            <td>
                                <input type="url" name="pixel_url" class="regular-text" required>
                                <p class="description">The URL to fire when a conversion occurs. Use {conversion_id}, {value}, {currency} as placeholders.</p>
                            </td>
                        </tr>
                        <tr>
                            <th><label for="pixel_events">Event Types</label></th>
                            <td>
                                <input type="text" name="pixel_events[]" class="regular-text" placeholder="purchase">
                                <input type="text" name="pixel_events[]" class="regular-text" placeholder="lead">
                                <input type="text" name="pixel_events[]" class="regular-text" placeholder="signup">
                                <p class="description">Comma-separated event types this pixel tracks.</p>
                            </td>
                        </tr>
                    </table>
                    <p class="submit">
                        <input type="submit" name="saaos_save_pixel" class="button button-primary" value="Save Pixel">
                    </p>
                </form>
            </div>

            <h2>Active Pixels</h2>
            <table class="wp-list-table widefat fixed striped">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>URL</th>
                        <th>Events</th>
                        <th>Shortcode</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <?php if (empty($pixels)): ?>
                        <tr><td colspan="5">No conversion pixels configured.</td></tr>
                    <?php else: ?>
                        <?php foreach ($pixels as $id => $pixel): ?>
                            <tr>
                                <td><?php echo esc_html($pixel['name']); ?></td>
                                <td><?php echo esc_url($pixel['url']); ?></td>
                                <td><?php echo esc_html(implode(', ', $pixel['events'])); ?></td>
                                <td><code>[saaos_conversion_pixel id="<?php echo esc_attr($id); ?>"]</code></td>
                                <td>
                                    <form method="post" style="display:inline;">
                                        <?php wp_nonce_field('saaos_pixel_action', 'saaos_pixel_nonce'); ?>
                                        <input type="hidden" name="pixel_id" value="<?php echo esc_attr($id); ?>">
                                        <input type="submit" name="saaos_delete_pixel" class="button button-small" value="Delete">
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
        <div class="wrap saaos-traffic-router-admin">
            <h1>Traffic Router Settings</h1>

            <form method="post" action="options.php">
                <?php settings_fields('saaos_traffic_router_group'); ?>
                <table class="form-table">
                    <tr>
                        <th><label for="default_landing_page">Default Landing Page</label></th>
                        <td>
                            <input type="url" name="<?php echo esc_attr($this->option_key); ?>[default_landing_page]" 
                                   id="default_landing_page" class="regular-text" 
                                   value="<?php echo esc_attr($settings['default_landing_page'] ?? ''); ?>">
                            <p class="description">Fallback URL when no routing rule matches.</p>
                        </td>
                    </tr>
                    <tr>
                        <th><label for="attribution_window">Attribution Window (Days)</label></th>
                        <td>
                            <input type="number" name="<?php echo esc_attr($this->option_key); ?>[attribution_window]" 
                                   id="attribution_window" class="small-text" min="1" max="365" 
                                   value="<?php echo esc_attr($settings['attribution_window'] ?? 30); ?>">
                            <p class="description">Number of days a click remains attributable for conversions.</p>
                        </td>
                    </tr>
                    <tr>
                        <th><label for="api_base">API Base URL</label></th>
                        <td>
                            <input type="url" name="<?php echo esc_attr($this->option_key); ?>[api_base]" 
                                   id="api_base" class="regular-text" 
                                   value="<?php echo esc_attr($settings['api_base'] ?? ''); ?>">
                            <p class="description">Base URL for the Sovereign API.</p>
                        </td>
                    </tr>
                    <tr>
                        <th><label for="geo_api_key">GeoIP API Key</label></th>
                        <td>
                            <input type="password" name="<?php echo esc_attr($this->option_key); ?>[geo_api_key]" 
                                   id="geo_api_key" class="regular-text" 
                                   value="<?php echo esc_attr($settings['geo_api_key'] ?? ''); ?>">
                            <p class="description">Optional: API key for ipgeolocation.io GeoIP service.</p>
                        </td>
                    </tr>
                </table>
                <?php submit_button(); ?>
            </form>
        </div>
        <?php
    }

    private function get_dashboard_stats(): array {
        global $wpdb;
        $clicks_table = $wpdb->prefix . 'saaos_clicks';
        $conversions_table = $wpdb->prefix . 'saaos_conversions';

        $total_clicks = (int) $wpdb->get_var("SELECT COUNT(*) FROM {$clicks_table}");
        $total_conversions = (int) $wpdb->get_var("SELECT COUNT(*) FROM {$clicks_table} WHERE converted = 1");
        $total_revenue = (float) $wpdb->get_var("SELECT COALESCE(SUM(value), 0) FROM {$conversions_table}");

        $conversion_rate = $total_clicks > 0 ? round(($total_conversions / $total_clicks) * 100, 2) : 0;

        return [
            'total_clicks' => $total_clicks,
            'total_conversions' => $total_conversions,
            'conversion_rate' => $conversion_rate,
            'total_revenue' => $total_revenue
        ];
    }

    private function get_recent_clicks(int $limit): array {
        global $wpdb;
        $table = $wpdb->prefix . 'saaos_clicks';

        return $wpdb->get_results(
            $wpdb->prepare("SELECT * FROM {$table} ORDER BY created_at DESC LIMIT %d", $limit),
            ARRAY_A
        );
    }

    private function get_recent_conversions(int $limit): array {
        global $wpdb;
        $table = $wpdb->prefix . 'saaos_conversions';

        return $wpdb->get_results(
            $wpdb->prepare("SELECT * FROM {$table} ORDER BY created_at DESC LIMIT %d", $limit),
            ARRAY_A
        );
    }

    private function get_top_campaigns(int $limit): array {
        global $wpdb;
        $table = $wpdb->prefix . 'saaos_clicks';

        $results = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT campaign, COUNT(*) as clicks,
                SUM(CASE WHEN converted = 1 THEN 1 ELSE 0 END) as conversions
                FROM {$table}
                GROUP BY campaign
                ORDER BY clicks DESC
                LIMIT %d",
                $limit
            ),
            ARRAY_A
        );

        foreach ($results as &$row) {
            $row['rate'] = $row['clicks'] > 0 ? round(($row['conversions'] / $row['clicks']) * 100, 2) : 0;
        }

        return $results;
    }
}

new SAAOS_Traffic_Router_Admin();
