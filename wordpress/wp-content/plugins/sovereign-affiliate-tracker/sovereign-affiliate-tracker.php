<?php
/**
 * Plugin Name: Sovereign Affiliate Tracker
 * Description: Captures referral codes, stores cookies, exposes helper shortcodes, URL submission, status tracking, and commission alerts.
 * Version: 1.1.0
 */
if (!defined('ABSPATH')) exit;

final class Sovereign_Affiliate_Tracker {
    private static ?Sovereign_Affiliate_Tracker $instance = null;
    private string $option_key = 'sovereign_affiliate_tracker_settings';
    private string $submissions_key = 'sovereign_affiliate_submissions';

    public static function instance(): Sovereign_Affiliate_Tracker {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    private function __construct() {
        add_action('init', [$this, 'capture_referral']);
        add_action('rest_api_init', [$this, 'register_rest_routes']);
        add_action('admin_menu', [$this, 'register_admin_menu']);
        add_action('admin_init', [$this, 'register_settings']);

        add_shortcode('sovereign_referral_link', [$this, 'referral_shortcode']);
        add_shortcode('sovereign_url_submission', [$this, 'url_submission_shortcode']);
        add_shortcode('sovereign_status_check', [$this, 'status_check_shortcode']);
        add_shortcode('sovereign_commission_alert', [$this, 'commission_alert_shortcode']);
        add_shortcode('sovereign_affiliate_dashboard', [$this, 'affiliate_dashboard_shortcode']);

        add_action('admin_post_nopriv_saaos_submit_url', [$this, 'handle_url_submission']);
        add_action('admin_post_nopriv_saaos_check_status', [$this, 'handle_status_check']);
        add_action('admin_post_nopriv_saaos_subscribe_alert', [$this, 'handle_alert_subscription']);
    }

    public function capture_referral(): void {
        if (!empty($_GET['ref']) && is_string($_GET['ref'])) {
            $ref = sanitize_text_field(wp_unslash($_GET['ref']));
            setcookie('sovereign_ref', $ref, time() + MONTH_IN_SECONDS, COOKIEPATH ?: '/');
            $_COOKIE['sovereign_ref'] = $ref;
        }

        if (!empty($_GET['saaos_click']) && is_string($_GET['saaos_click'])) {
            $click_id = sanitize_text_field(wp_unslash($_GET['saaos_click']));
            setcookie('saaos_last_click', $click_id, time() + MONTH_IN_SECONDS, COOKIEPATH ?: '/');
            $_COOKIE['saaos_last_click'] = $click_id;
        }
    }

    public function register_rest_routes(): void {
        register_rest_route('sovereign/v1', '/submit-url', [
            'methods' => 'POST',
            'permission_callback' => '__return_true',
            'callback' => [$this, 'rest_submit_url']
        ]);

        register_rest_route('sovereign/v1', '/status/(?P<submission_id>[a-zA-Z0-9_-]+)', [
            'methods' => 'GET',
            'permission_callback' => '__return_true',
            'callback' => [$this, 'rest_check_status']
        ]);

        register_rest_route('sovereign/v1', '/subscribe', [
            'methods' => 'POST',
            'permission_callback' => '__return_true',
            'callback' => [$this, 'rest_subscribe_alert']
        ]);

        register_rest_route('sovereign/v1', '/submissions', [
            'methods' => 'GET',
            'permission_callback' => '__return_true',
            'callback' => [$this, 'rest_get_submissions']
        ]);
    }

    public function register_admin_menu(): void {
        add_menu_page(
            'Affiliate Tracker',
            'Affiliate Tracker',
            'manage_options',
            'sovereign-affiliate-tracker',
            [$this, 'render_admin_page'],
            'dashicons-money',
            25
        );

        add_submenu_page(
            'sovereign-affiliate-tracker',
            'Submissions',
            'Submissions',
            'manage_options',
            'sovereign-affiliate-tracker',
            [$this, 'render_admin_page']
        );

        add_submenu_page(
            'sovereign-affiliate-tracker',
            'Alerts',
            'Commission Alerts',
            'manage_options',
            'sovereign-affiliate-alerts',
            [$this, 'render_alerts_page']
        );

        add_submenu_page(
            'sovereign-affiliate-tracker',
            'Settings',
            'Settings',
            'manage_options',
            'sovereign-affiliate-settings',
            [$this, 'render_settings_page']
        );
    }

    public function register_settings(): void {
        register_setting('sovereign_affiliate_group', $this->option_key, [
            'type' => 'array',
            'sanitize_callback' => [$this, 'sanitize_settings']
        ]);

        register_setting('sovereign_affiliate_group', $this->submissions_key, [
            'type' => 'array',
            'sanitize_callback' => [$this, 'sanitize_submissions']
        ]);
    }

    public function sanitize_settings(array $input): array {
        return [
            'api_base' => esc_url_raw($input['api_base'] ?? ''),
            'jwt_shared_secret' => sanitize_text_field($input['jwt_shared_secret'] ?? ''),
            'commission_rate' => max(0, min(100, floatval($input['commission_rate'] ?? 10))),
            'auto_approve' => !empty($input['auto_approve']),
            'notification_email' => sanitize_email($input['notification_email'] ?? ''),
            'alert_thresholds' => [
                'min_commission' => floatval($input['alert_thresholds']['min_commission'] ?? 0),
                'min_conversions' => absint($input['alert_thresholds']['min_conversions'] ?? 0)
            ]
        ];
    }

    public function sanitize_submissions(array $input): array {
        $sanitized = [];
        foreach ($input as $id => $submission) {
            $sanitized[sanitize_text_field($id)] = [
                'url' => esc_url_raw($submission['url'] ?? ''),
                'campaign_name' => sanitize_text_field($submission['campaign_name'] ?? ''),
                'status' => sanitize_text_field($submission['status'] ?? 'pending'),
                'commission_rate' => floatval($submission['commission_rate'] ?? 10),
                'subscriber_email' => sanitize_email($submission['subscriber_email'] ?? ''),
                'created_at' => absint($submission['created_at'] ?? time()),
                'updated_at' => absint($submission['updated_at'] ?? time())
            ];
        }
        return $sanitized;
    }

    public function referral_shortcode($atts): string {
        $atts = shortcode_atts([
            'url' => home_url('/'),
            'code' => $_COOKIE['sovereign_ref'] ?? ''
        ], $atts);

        return esc_url(add_query_arg('ref', rawurlencode($atts['code']), $atts['url']));
    }

    public function url_submission_shortcode($atts): string {
        $atts = shortcode_atts([
            'campaign' => '',
            'commission_rate' => '',
            'class' => 'sovereign-url-form'
        ], $atts);

        $nonce = wp_create_nonce('saaos_url_submission');
        $campaign = sanitize_text_field($atts['campaign']);
        $ref_code = $_COOKIE['sovereign_ref'] ?? '';

        ob_start();
        ?>
        <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>" class="<?php echo esc_attr($atts['class']); ?>">
            <input type="hidden" name="action" value="saaos_submit_url">
            <input type="hidden" name="nonce" value="<?php echo esc_attr($nonce); ?>">
            <input type="hidden" name="campaign_name" value="<?php echo esc_attr($campaign); ?>">
            <input type="hidden" name="ref_code" value="<?php echo esc_attr($ref_code); ?>">

            <div class="form-group">
                <label for="saaos_offer_url">Offer URL</label>
                <input type="url" name="offer_url" id="saaos_offer_url" class="regular-text" required placeholder="https://example.com/offer">
            </div>

            <div class="form-group">
                <label for="saaos_publisher_url">Publisher URL</label>
                <input type="url" name="publisher_url" id="saaos_publisher_url" class="regular-text" required placeholder="https://yoursite.com">
            </div>

            <div class="form-group">
                <label for="saaos_description">Description</label>
                <textarea name="description" id="saaos_description" rows="3" placeholder="Describe your traffic source..."></textarea>
            </div>

            <div class="form-group">
                <label for="saaos_email">Notification Email</label>
                <input type="email" name="email" id="saaos_email" class="regular-text" required placeholder="you@example.com">
                <p class="description">Get notified when your URL is approved or rejected.</p>
            </div>

            <?php if (!empty($atts['commission_rate'])): ?>
                <input type="hidden" name="requested_commission" value="<?php echo esc_attr($atts['commission_rate']); ?>">
                <p class="commission-notice">Requested Commission: <?php echo esc_html($atts['commission_rate']); ?>%</p>
            <?php endif; ?>

            <p class="submit">
                <input type="submit" class="button button-primary" value="Submit URL">
            </p>
        </form>
        <?php
        return ob_get_clean();
    }

    public function status_check_shortcode($atts): string {
        $atts = shortcode_atts([
            'class' => 'sovereign-status-form'
        ], $atts);

        $nonce = wp_create_nonce('saaos_status_check');

        ob_start();
        ?>
        <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>" class="<?php echo esc_attr($atts['class']); ?>">
            <input type="hidden" name="action" value="saaos_check_status">
            <input type="hidden" name="nonce" value="<?php echo esc_attr($nonce); ?>">

            <div class="form-group">
                <label for="saaos_submission_id">Submission ID</label>
                <input type="text" name="submission_id" id="saaos_submission_id" class="regular-text" required placeholder="Enter your submission ID">
            </div>

            <p class="submit">
                <input type="submit" class="button button-secondary" value="Check Status">
            </p>
        </form>
        <?php
        return ob_get_clean();
    }

    public function commission_alert_shortcode($atts): string {
        $atts = shortcode_atts([
            'class' => 'sovereign-alert-form'
        ], $atts);

        $nonce = wp_create_nonce('saaos_alert_subscription');

        ob_start();
        ?>
        <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>" class="<?php echo esc_attr($atts['class']); ?>">
            <input type="hidden" name="action" value="saaos_subscribe_alert">
            <input type="hidden" name="nonce" value="<?php echo esc_attr($nonce); ?>">

            <div class="form-group">
                <label for="saaos_alert_email">Email Address</label>
                <input type="email" name="alert_email" id="saaos_alert_email" class="regular-text" required placeholder="you@example.com">
            </div>

            <div class="form-group">
                <label for="saaos_min_commission">Minimum Commission Alert ($)</label>
                <input type="number" name="min_commission" id="saaos_min_commission" class="small-text" min="0" step="0.01" value="10">
            </div>

            <div class="form-group">
                <label for="saaos_min_conversions">Minimum Conversions</label>
                <input type="number" name="min_conversions" id="saaos_min_conversions" class="small-text" min="0" value="5">
            </div>

            <p class="submit">
                <input type="submit" class="button button-primary" value="Subscribe to Alerts">
            </p>
        </form>
        <?php
        return ob_get_clean();
    }

    public function affiliate_dashboard_shortcode($atts): string {
        $submissions = $this->get_user_submissions();
        $ref_code = $_COOKIE['sovereign_ref'] ?? $this->generate_ref_code();

        ob_start();
        ?>
        <div class="sovereign-affiliate-dashboard">
            <h3>Your Affiliate Dashboard</h3>

            <div class="dashboard-section">
                <h4>Your Referral Code</h4>
                <p class="ref-code"><code><?php echo esc_html($ref_code); ?></code></p>
                <p class="ref-link"><?php echo esc_url($this->get_referral_link($ref_code)); ?></p>
            </div>

            <div class="dashboard-section">
                <h4>Your Submissions</h4>
                <?php if (empty($submissions)): ?>
                    <p>No submissions yet. Use the URL submission form to get started.</p>
                <?php else: ?>
                    <table class="wp-list-table widefat fixed striped">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>URL</th>
                                <th>Status</th>
                                <th>Commission</th>
                                <th>Submitted</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($submissions as $id => $sub): ?>
                                <tr>
                                    <td><code><?php echo esc_html(substr($id, 0, 8)); ?>...</code></td>
                                    <td><?php echo esc_url($sub['url']); ?></td>
                                    <td><span class="status-<?php echo esc_attr($sub['status']); ?>"><?php echo esc_html(ucfirst($sub['status'])); ?></span></td>
                                    <td><?php echo esc_html($sub['commission_rate']); ?>%</td>
                                    <td><?php echo esc_html(date('Y-m-d', $sub['created_at'])); ?></td>
                                </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                <?php endif; ?>
            </div>
        </div>
        <?php
        return ob_get_clean();
    }

    public function handle_url_submission(): void {
        if (!isset($_POST['nonce']) || !wp_verify_nonce($_POST['nonce'], 'saaos_url_submission')) {
            wp_die('Invalid nonce');
        }

        $offer_url = isset($_POST['offer_url']) ? esc_url_raw($_POST['offer_url']) : '';
        $campaign_name = isset($_POST['campaign_name']) ? sanitize_text_field($_POST['campaign_name']) : '';
        $ref_code = isset($_POST['ref_code']) ? sanitize_text_field($_POST['ref_code']) : '';
        $description = isset($_POST['description']) ? sanitize_textarea_field($_POST['description']) : '';
        $email = isset($_POST['email']) ? sanitize_email($_POST['email']) : '';
        $requested_commission = isset($_POST['requested_commission']) ? floatval($_POST['requested_commission']) : 0;

        if (empty($offer_url) || empty($email)) {
            wp_safe_redirect(add_query_arg('error', 'missing_fields', wp_get_referer()));
            exit;
        }

        $submission_id = $this->generate_submission_id();

        $settings = get_option($this->option_key, []);
        $commission_rate = $requested_commission > 0 ? $requested_commission : ($settings['commission_rate'] ?? 10);

        $submission = [
            'url' => $offer_url,
            'campaign_name' => $campaign_name,
            'status' => $settings['auto_approve'] ? 'approved' : 'pending',
            'commission_rate' => $commission_rate,
            'subscriber_email' => $email,
            'description' => $description,
            'ref_code' => $ref_code,
            'created_at' => time(),
            'updated_at' => time()
        ];

        $submissions = get_option($this->submissions_key, []);
        $submissions[$submission_id] = $submission;
        update_option($this->submissions_key, $submissions);

        $this->notify_admin_new_submission($submission_id, $submission);

        wp_safe_redirect(add_query_arg([
            'submission_id' => $submission_id,
            'status' => $submission['status']
        ], wp_get_referer()));
        exit;
    }

    public function handle_status_check(): void {
        if (!isset($_POST['nonce']) || !wp_verify_nonce($_POST['nonce'], 'saaos_status_check')) {
            wp_die('Invalid nonce');
        }

        $submission_id = isset($_POST['submission_id']) ? sanitize_text_field($_POST['submission_id']) : '';

        if (empty($submission_id)) {
            wp_safe_redirect(add_query_arg('error', 'missing_id', wp_get_referer()));
            exit;
        }

        $submissions = get_option($this->submissions_key, []);

        if (!isset($submissions[$submission_id])) {
            wp_safe_redirect(add_query_arg('error', 'not_found', wp_get_referer()));
            exit;
        }

        $submission = $submissions[$submission_id];

        wp_safe_redirect(add_query_arg([
            'submission_id' => $submission_id,
            'status' => $submission['status'],
            'commission' => $submission['commission_rate']
        ], wp_get_referer()));
        exit;
    }

    public function handle_alert_subscription(): void {
        if (!isset($_POST['nonce']) || !wp_verify_nonce($_POST['nonce'], 'saaos_alert_subscription')) {
            wp_die('Invalid nonce');
        }

        $email = isset($_POST['alert_email']) ? sanitize_email($_POST['alert_email']) : '';
        $min_commission = isset($_POST['min_commission']) ? floatval($_POST['min_commission']) : 10;
        $min_conversions = isset($_POST['min_conversions']) ? absint($_POST['min_conversions']) : 5;

        if (empty($email)) {
            wp_safe_redirect(add_query_arg('error', 'invalid_email', wp_get_referer()));
            exit;
        }

        $settings = get_option($this->option_key, []);
        $settings['alert_subscriptions'] = $settings['alert_subscriptions'] ?? [];

        $sub_id = md5($email);
        $settings['alert_subscriptions'][$sub_id] = [
            'email' => $email,
            'min_commission' => $min_commission,
            'min_conversions' => $min_conversions,
            'subscribed_at' => time()
        ];

        update_option($this->option_key, $settings);

        wp_safe_redirect(add_query_arg('alert_subscribed', 'true', wp_get_referer()));
        exit;
    }

    public function rest_submit_url(WP_REST_Request $request): WP_REST_Response {
        $offer_url = $request->get_param('offer_url');
        $campaign_name = $request->get_param('campaign_name');
        $email = $request->get_param('email');
        $description = $request->get_param('description');

        if (empty($offer_url) || empty($email)) {
            return new WP_REST_Response(['error' => 'Missing required fields'], 400);
        }

        $submission_id = $this->generate_submission_id();

        $submission = [
            'url' => esc_url_raw($offer_url),
            'campaign_name' => sanitize_text_field($campaign_name ?? ''),
            'status' => 'pending',
            'commission_rate' => 10,
            'subscriber_email' => sanitize_email($email),
            'description' => sanitize_textarea_field($description ?? ''),
            'created_at' => time(),
            'updated_at' => time()
        ];

        $submissions = get_option($this->submissions_key, []);
        $submissions[$submission_id] = $submission;
        update_option($this->submissions_key, $submissions);

        return new WP_REST_Response([
            'success' => true,
            'submission_id' => $submission_id,
            'status' => $submission['status']
        ], 200);
    }

    public function rest_check_status(WP_REST_Request $request): WP_REST_Response {
        $submission_id = $request->get_param('submission_id');
        $submissions = get_option($this->submissions_key, []);

        if (!isset($submissions[$submission_id])) {
            return new WP_REST_Response(['error' => 'Submission not found'], 404);
        }

        return new WP_REST_Response($submissions[$submission_id], 200);
    }

    public function rest_subscribe_alert(WP_REST_Request $request): WP_REST_Response {
        $email = $request->get_param('email');
        $min_commission = $request->get_param('min_commission') ?? 10;
        $min_conversions = $request->get_param('min_conversions') ?? 5;

        if (empty($email) || !is_email($email)) {
            return new WP_REST_Response(['error' => 'Invalid email'], 400);
        }

        $settings = get_option($this->option_key, []);
        $settings['alert_subscriptions'] = $settings['alert_subscriptions'] ?? [];

        $sub_id = md5($email);
        $settings['alert_subscriptions'][$sub_id] = [
            'email' => sanitize_email($email),
            'min_commission' => floatval($min_commission),
            'min_conversions' => absint($min_conversions),
            'subscribed_at' => time()
        ];

        update_option($this->option_key, $settings);

        return new WP_REST_Response(['success' => true], 200);
    }

    public function rest_get_submissions(WP_REST_Request $request): WP_REST_Response {
        $email = $request->get_param('email');
        $submissions = get_option($this->submissions_key, []);

        if (!empty($email)) {
            $filtered = [];
            foreach ($submissions as $id => $sub) {
                if ($sub['subscriber_email'] === sanitize_email($email)) {
                    $filtered[$id] = $sub;
                }
            }
            $submissions = $filtered;
        }

        return new WP_REST_Response($submissions, 200);
    }

    public function render_admin_page(): void {
        $submissions = get_option($this->submissions_key, []);
        $status_filter = isset($_GET['status']) ? sanitize_text_field($_GET['status']) : '';

        if ($status_filter) {
            $filtered = [];
            foreach ($submissions as $id => $sub) {
                if ($sub['status'] === $status_filter) {
                    $filtered[$id] = $sub;
                }
            }
            $submissions = $filtered;
        }
        ?>
        <div class="wrap sovereign-affiliate-admin">
            <h1>Affiliate Submissions</h1>

            <div class="saaos-filters">
                <a href="<?php echo esc_url(admin_url('admin.php?page=sovereign-affiliate-tracker')); ?>" class="button">All</a>
                <a href="<?php echo esc_url(add_query_arg('status', 'pending')); ?>" class="button">Pending</a>
                <a href="<?php echo esc_url(add_query_arg('status', 'approved')); ?>" class="button">Approved</a>
                <a href="<?php echo esc_url(add_query_arg('status', 'rejected')); ?>" class="button">Rejected</a>
            </div>

            <table class="wp-list-table widefat fixed striped">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>URL</th>
                        <th>Campaign</th>
                        <th>Status</th>
                        <th>Commission</th>
                        <th>Email</th>
                        <th>Submitted</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <?php if (empty($submissions)): ?>
                        <tr><td colspan="8">No submissions found.</td></tr>
                    <?php else: ?>
                        <?php foreach ($submissions as $id => $sub): ?>
                            <tr>
                                <td><code><?php echo esc_html(substr($id, 0, 8)); ?>...</code></td>
                                <td><a href="<?php echo esc_url($sub['url']); ?>" target="_blank"><?php echo esc_url($sub['url']); ?></a></td>
                                <td><?php echo esc_html($sub['campaign_name']); ?></td>
                                <td><span class="status-<?php echo esc_attr($sub['status']); ?>"><?php echo esc_html(ucfirst($sub['status'])); ?></span></td>
                                <td><?php echo esc_html($sub['commission_rate']); ?>%</td>
                                <td><?php echo esc_html($sub['subscriber_email']); ?></td>
                                <td><?php echo esc_html(date('Y-m-d H:i', $sub['created_at'])); ?></td>
                                <td>
                                    <form method="post" style="display:inline;">
                                        <?php wp_nonce_field('saaos_update_status_' . $id); ?>
                                        <input type="hidden" name="submission_id" value="<?php echo esc_attr($id); ?>">
                                        <select name="new_status" style="width:100px;">
                                            <option value="pending" <?php selected($sub['status'], 'pending'); ?>>Pending</option>
                                            <option value="approved" <?php selected($sub['status'], 'approved'); ?>>Approved</option>
                                            <option value="rejected" <?php selected($sub['status'], 'rejected'); ?>>Rejected</option>
                                        </select>
                                        <input type="submit" name="saaos_update_status" class="button button-small" value="Update">
                                    </form>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                    <?php endif; ?>
                </tbody>
            </table>
        </div>
        <?php

        if (isset($_POST['saaos_update_status']) && wp_verify_nonce($_POST['_wpnonce'], 'saaos_update_status_' . $_POST['submission_id'])) {
            $id = sanitize_text_field($_POST['submission_id']);
            $new_status = sanitize_text_field($_POST['new_status']);
            $submissions[$id]['status'] = $new_status;
            $submissions[$id]['updated_at'] = time();
            update_option($this->submissions_key, $submissions);
            echo '<div class="notice notice-success"><p>Status updated.</p></div>';
        }
    }

    public function render_alerts_page(): void {
        $settings = get_option($this->option_key, []);
        $subscriptions = $settings['alert_subscriptions'] ?? [];
        ?>
        <div class="wrap sovereign-affiliate-admin">
            <h1>Commission Alert Subscriptions</h1>

            <table class="wp-list-table widefat fixed striped">
                <thead>
                    <tr>
                        <th>Email</th>
                        <th>Min Commission</th>
                        <th>Min Conversions</th>
                        <th>Subscribed</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <?php if (empty($subscriptions)): ?>
                        <tr><td colspan="5">No alert subscriptions.</td></tr>
                    <?php else: ?>
                        <?php foreach ($subscriptions as $id => $sub): ?>
                            <tr>
                                <td><?php echo esc_html($sub['email']); ?></td>
                                <td>$<?php echo esc_html($sub['min_commission']); ?></td>
                                <td><?php echo esc_html($sub['min_conversions']); ?></td>
                                <td><?php echo esc_html(date('Y-m-d H:i', $sub['subscribed_at'])); ?></td>
                                <td>
                                    <form method="post" style="display:inline;">
                                        <?php wp_nonce_field('saaos_unsubscribe_' . $id); ?>
                                        <input type="hidden" name="sub_id" value="<?php echo esc_attr($id); ?>">
                                        <input type="submit" name="saaos_unsubscribe" class="button button-small" value="Unsubscribe">
                                    </form>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                    <?php endif; ?>
                </tbody>
            </table>
        </div>
        <?php

        if (isset($_POST['saaos_unsubscribe']) && wp_verify_nonce($_POST['_wpnonce'], 'saaos_unsubscribe_' . $_POST['sub_id'])) {
            $sub_id = sanitize_text_field($_POST['sub_id']);
            unset($settings['alert_subscriptions'][$sub_id]);
            update_option($this->option_key, $settings);
            echo '<div class="notice notice-success"><p>Unsubscribed.</p></div>';
        }
    }

    public function render_settings_page(): void {
        $settings = get_option($this->option_key, []);
        ?>
        <div class="wrap sovereign-affiliate-admin">
            <h1>Affiliate Tracker Settings</h1>

            <form method="post" action="options.php">
                <?php settings_fields('sovereign_affiliate_group'); ?>
                <table class="form-table">
                    <tr>
                        <th><label for="commission_rate">Default Commission Rate (%)</label></th>
                        <td><input type="number" name="<?php echo esc_attr($this->option_key); ?>[commission_rate]" id="commission_rate" class="small-text" min="0" max="100" step="0.1" value="<?php echo esc_attr($settings['commission_rate'] ?? 10); ?>"></td>
                    </tr>
                    <tr>
                        <th><label for="auto_approve">Auto-Approve Submissions</label></th>
                        <td><input type="checkbox" name="<?php echo esc_attr($this->option_key); ?>[auto_approve]" id="auto_approve" value="1" <?php checked(!empty($settings['auto_approve'])); ?>></td>
                    </tr>
                    <tr>
                        <th><label for="notification_email">Notification Email</label></th>
                        <td><input type="email" name="<?php echo esc_attr($this->option_key); ?>[notification_email]" id="notification_email" class="regular-text" value="<?php echo esc_attr($settings['notification_email'] ?? ''); ?>"></td>
                    </tr>
                    <tr>
                        <th><label for="alert_min_commission">Alert: Min Commission ($)</label></th>
                        <td><input type="number" name="<?php echo esc_attr($this->option_key); ?>[alert_thresholds][min_commission]" id="alert_min_commission" class="small-text" min="0" step="0.01" value="<?php echo esc_attr($settings['alert_thresholds']['min_commission'] ?? 0); ?>"></td>
                    </tr>
                    <tr>
                        <th><label for="alert_min_conversions">Alert: Min Conversions</label></th>
                        <td><input type="number" name="<?php echo esc_attr($this->option_key); ?>[alert_thresholds][min_conversions]" id="alert_min_conversions" class="small-text" min="0" value="<?php echo esc_attr($settings['alert_thresholds']['min_conversions'] ?? 0); ?>"></td>
                    </tr>
                </table>
                <?php submit_button(); ?>
            </form>
        </div>
        <?php
    }

    private function generate_submission_id(): string {
        return sprintf(
            'sub_%04x%04x%04x%04x',
            mt_rand(0, 0xffff),
            mt_rand(0, 0xffff),
            mt_rand(0, 0xffff),
            mt_rand(0, 0xffff)
        );
    }

    private function generate_ref_code(): string {
        return sprintf(
            'ref_%04x%04x',
            mt_rand(0, 0xffff),
            mt_rand(0, 0xffff)
        );
    }

    private function get_referral_link(string $ref_code): string {
        return esc_url(add_query_arg('ref', rawurlencode($ref_code), home_url('/')));
    }

    private function get_user_submissions(): array {
        $submissions = get_option($this->submissions_key, []);
        $ref_code = $_COOKIE['sovereign_ref'] ?? '';

        if (empty($ref_code)) {
            return [];
        }

        $user_subs = [];
        foreach ($submissions as $id => $sub) {
            if (isset($sub['ref_code']) && $sub['ref_code'] === $ref_code) {
                $user_subs[$id] = $sub;
            }
        }

        return $user_subs;
    }

    private function notify_admin_new_submission(string $submission_id, array $submission): void {
        $settings = get_option($this->option_key, []);
        $notification_email = $settings['notification_email'] ?? get_option('admin_email');

        $subject = sprintf('[Affiliate] New submission: %s', $submission['campaign_name'] ?: 'Unknown');
        $message = sprintf(
            "New affiliate URL submission\n\nID: %s\nURL: %s\nCampaign: %s\nEmail: %s\nCommission Requested: %s%%\n\n%s",
            $submission_id,
            $submission['url'],
            $submission['campaign_name'],
            $submission['subscriber_email'],
            $submission['commission_rate'],
            admin_url('admin.php?page=sovereign-affiliate-tracker')
        );

        wp_mail($notification_email, $subject, $message);
    }
}

new Sovereign_Affiliate_Tracker();
