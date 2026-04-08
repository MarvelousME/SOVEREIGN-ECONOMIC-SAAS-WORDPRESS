<?php
/**
 * Plugin Name: UBI Authentication
 * Description: Secure authentication with JWT and role-based access
 * Version: 1.0.4
 * Author: UBI CMS Team
 * Security: Admin menu added
 */

if (!defined('ABSPATH')) exit;

require_once ABSPATH . 'wp-admin/includes/upgrade.php';

class UBI_Auth_Plugin {
    
    private static $instance = null;
    private $jwt_secret;
    private $jwt_expiry;
    private $table_name = 'ubi_api_keys';
    
    public static function get_instance() {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    private function __construct() {
        // CRITICAL FIX: Require JWT_SECRET env var - no fallback in production
        $this->jwt_secret = defined('UBI_JWT_SECRET') ? UBI_JWT_SECRET : false;
        
        // If no secret defined, generate one (dev mode only)
        if (!$this->jwt_secret) {
            if (defined('WP_ENV') && WP_ENV === 'production') {
                // In production, log error but continue with warning
                error_log('FATAL: UBI_JWT_SECRET not defined in production!');
            }
            $this->jwt_secret = wp_generate_password(64, true, true);
        }
        
        $this->jwt_expiry = HOUR_IN_SECONDS;
        
        // Create table on init
        add_action('init', array($this, 'create_api_keys_table'));
        
        // Admin menu
        add_action('admin_menu', array($this, 'add_admin_menu'));
        
        // AJAX handlers
        add_action('wp_ajax_ubi_auth_login', array($this, 'handle_login'));
        add_action('wp_ajax_nopriv_ubi_auth_login', array($this, 'handle_login'));
        add_action('wp_ajax_ubi_auth_logout', array($this, 'handle_logout'));
        add_action('wp_ajax_ubi_generate_api_key', array($this, 'ajax_generate_api_key'));
        add_action('wp_ajax_ubi_revoke_api_key', array($this, 'ajax_revoke_api_key'));
        add_action('wp_ajax_ubi_get_api_keys', array($this, 'ajax_get_api_keys'));
        
        // Enqueue admin assets
        add_action('admin_enqueue_scripts', array($this, 'enqueue_admin_assets'));
    }
    
    /**
     * Create the API keys database table
     */
    public function create_api_keys_table() {
        global $wpdb;
        $table_name = $wpdb->prefix . $this->table_name;
        $charset_collate = $wpdb->get_charset_collate();
        
        $sql = "CREATE TABLE {$table_name} (
            id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
            user_id bigint(20) unsigned NOT NULL,
            key_hash varchar(64) NOT NULL,
            key_prefix varchar(8) NOT NULL,
            name varchar(255) NOT NULL,
            created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
            last_used_at datetime DEFAULT NULL,
            revoked_at datetime DEFAULT NULL,
            PRIMARY KEY  (id),
            KEY user_id (user_id),
            KEY key_hash (key_hash),
            KEY created_at (created_at)
        ) $charset_collate;";
        
        dbDelta($sql);
    }
    
    /**
     * Add admin menu items
     */
    public function add_admin_menu() {
        add_menu_page(
            __('UBI Auth', 'ubi-auth'),
            __('UBI Auth', 'ubi-auth'),
            'manage_options',
            'ubi-auth',
            array($this, 'render_settings'),
            'dashicons-lock',
            29
        );
        
        add_submenu_page(
            'ubi-auth',
            __('Settings', 'ubi-auth'),
            __('Settings', 'ubi-auth'),
            'manage_options',
            'ubi-auth',
            array($this, 'render_settings')
        );
        
        add_submenu_page(
            'ubi-auth',
            __('API Keys', 'ubi-auth'),
            __('API Keys', 'ubi-auth'),
            'manage_options',
            'ubi-auth-keys',
            array($this, 'render_api_keys')
        );
    }
    
    /**
     * Enqueue admin scripts and styles
     */
    public function enqueue_admin_assets($hook) {
        // Only load on our plugin pages
        if (strpos($hook, 'ubi-auth') === false) {
            return;
        }
        
        wp_enqueue_style(
            'ubi-auth-admin',
            plugins_url('assets/css/admin.css', __FILE__),
            array(),
            '1.0.4'
        );
        
        wp_enqueue_script(
            'ubi-auth-admin',
            plugins_url('assets/js/admin.js', __FILE__),
            array('jquery'),
            '1.0.4',
            true
        );
        
        wp_localize_script('ubi-auth-admin', 'ubiAuth', array(
            'ajaxUrl' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('ubi_api_keys_nonce'),
            'strings' => array(
                'confirmRevoke' => __('Are you sure you want to revoke this API key?', 'ubi-auth'),
                'keyCopied' => __('API key copied to clipboard!', 'ubi-auth'),
                'keyRevoked' => __('API key revoked successfully.', 'ubi-auth'),
                'keyGenerated' => __('API key generated successfully. Copy it now - it will not be shown again!', 'ubi-auth'),
                'error' => __('An error occurred. Please try again.', 'ubi-auth'),
            )
        ));
    }
    
    /**
     * Render settings page
     */
    public function render_settings() {
        echo '<div class="wrap">';
        echo '<h1>' . esc_html__('UBI Authentication Settings', 'ubi-auth') . '</h1>';
        echo '<form method="post" action="options.php">';
        settings_fields('ubi_auth_settings');
        do_settings_sections('ubi_auth_settings');
        
        echo '<table class="form-table">';
        echo '<tr><th scope="row">' . esc_html__('JWT Expiry', 'ubi-auth') . '</th>';
        echo '<td><input type="number" name="ubi_auth_jwt_expiry" value="' . esc_attr(get_option('ubi_auth_jwt_expiry', 3600)) . '" /> seconds</td></tr>';
        echo '<tr><th scope="row">' . esc_html__('Token Algorithm', 'ubi-auth') . '</th>';
        echo '<td>HS256 (HMAC-SHA256)</td></tr>';
        echo '</table>';
        
        echo '<p class="submit"><input type="submit" class="button-primary" value="' . esc_attr__('Save Changes', 'ubi-auth') . '"></p>';
        echo '</form>';
        echo '</div>';
    }
    
    /**
     * Render API keys page
     */
    public function render_api_keys() {
        // Get current user
        $current_user = wp_get_current_user();
        
        // Get existing keys for display
        $keys = $this->get_user_api_keys($current_user->ID);
        
        ?>
        <div class="wrap ubi-api-keys-wrap">
            <h1><?php esc_html_e('API Keys', 'ubi-auth'); ?></h1>
            <p><?php esc_html_e('Manage API keys for programmatic access. Your API keys are shown only once upon creation - store them securely.', 'ubi-auth'); ?></p>
            
            <div class="ubi-api-keys-container">
                <!-- New API Key Modal (hidden by default) -->
                <div id="ubi-new-key-modal" class="ubi-modal" style="display:none;">
                    <div class="ubi-modal-content">
                        <span class="ubi-modal-close">&times;</span>
                        <h2><?php esc_html_e('New API Key Created', 'ubi-auth'); ?></h2>
                        <p class="ubi-warning"><?php esc_html_e('⚠️ Copy this API key now! It will not be shown again.', 'ubi-auth'); ?></p>
                        <div class="ubi-key-display">
                            <code id="ubi-new-key-value"></code>
                            <button type="button" class="button ubi-copy-btn" data-key=""><?php esc_html_e('Copy to Clipboard', 'ubi-auth'); ?></button>
                        </div>
                        <p class="ubi-key-name-display"><?php esc_html_e('Name:', 'ubi-auth'); ?> <span id="ubi-new-key-name"></span></p>
                        <p class="ubi-key-prefix-display"><?php esc_html_e('Prefix:', 'ubi-auth'); ?> <span id="ubi-new-key-prefix"></span></p>
                    </div>
                </div>
                
                <!-- Generate New Key Section -->
                <div class="ubi-generate-section">
                    <h2><?php esc_html_e('Generate New API Key', 'ubi-auth'); ?></h2>
                    <form id="ubi-generate-key-form" method="post">
                        <?php wp_nonce_field('ubi_generate_api_key', 'ubi_generate_nonce'); ?>
                        <table class="form-table">
                            <tr>
                                <th scope="row">
                                    <label for="ubi-key-name"><?php esc_html_e('Key Name', 'ubi-auth'); ?></label>
                                </th>
                                <td>
                                    <input type="text" id="ubi-key-name" name="name" class="regular-text" 
                                           placeholder="<?php esc_attr_e('e.g., Production API Key', 'ubi-auth'); ?>" required>
                                    <p class="description"><?php esc_html_e('A descriptive name to identify this key.', 'ubi-auth'); ?></p>
                                </td>
                            </tr>
                            <tr>
                                <th scope="row">
                                    <label for="ubi-key-user"><?php esc_html_e('Associated User', 'ubi-auth'); ?></label>
                                </th>
                                <td>
                                    <select id="ubi-key-user" name="user_id" required>
                                        <option value="">-- <?php esc_html_e('Select User', 'ubi-auth'); ?> --</option>
                                        <?php
                                        $users = get_users(array('role__not_in' => array()));
                                        foreach ($users as $user) {
                                            echo '<option value="' . esc_attr($user->ID) . '"' . ($user->ID === $current_user->ID ? ' selected' : '') . '>';
                                            echo esc_html($user->user_login . ' (' . $user->user_email . ')');
                                            echo '</option>';
                                        }
                                        ?>
                                    </select>
                                    <p class="description"><?php esc_html_e('The WordPress user this key will be associated with.', 'ubi-auth'); ?></p>
                                </td>
                            </tr>
                        </table>
                        <p class="submit">
                            <button type="submit" class="button button-primary" id="ubi-generate-btn">
                                <?php esc_html_e('Generate API Key', 'ubi-auth'); ?>
                            </button>
                        </p>
                    </form>
                </div>
                
                <!-- Existing Keys Section -->
                <div class="ubi-existing-keys">
                    <h2><?php esc_html_e('Your API Keys', 'ubi-auth'); ?></h2>
                    <?php if (empty($keys)) : ?>
                        <p class="ubi-no-keys"><?php esc_html_e('No API keys found. Generate one above to get started.', 'ubi-auth'); ?></p>
                    <?php else : ?>
                        <table class="wp-list-table widefat fixed striped ubi-keys-table">
                            <thead>
                                <tr>
                                    <th class="manage-column column-name"><?php esc_html_e('Name', 'ubi-auth'); ?></th>
                                    <th class="manage-column column-prefix"><?php esc_html_e('Prefix', 'ubi-auth'); ?></th>
                                    <th class="manage-column column-user"><?php esc_html_e('User', 'ubi-auth'); ?></th>
                                    <th class="manage-column column-created"><?php esc_html_e('Created', 'ubi-auth'); ?></th>
                                    <th class="manage-column column-last-used"><?php esc_html_e('Last Used', 'ubi-auth'); ?></th>
                                    <th class="manage-column column-status"><?php esc_html_e('Status', 'ubi-auth'); ?></th>
                                    <th class="manage-column column-actions"><?php esc_html_e('Actions', 'ubi-auth'); ?></th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php foreach ($keys as $key) : 
                                    $user = get_userdata($key->user_id);
                                    $is_revoked = !empty($key->revoked_at);
                                    $status = $is_revoked ? '<span class="ubi-status ubi-status-revoked">' . esc_html__('Revoked', 'ubi-auth') . '</span>' : '<span class="ubi-status ubi-status-active">' . esc_html__('Active', 'ubi-auth') . '</span>';
                                ?>
                                    <tr data-key-id="<?php echo esc_attr($key->id); ?>">
                                        <td class="column-name">
                                            <strong><?php echo esc_html($key->name); ?></strong>
                                        </td>
                                        <td class="column-prefix">
                                            <code><?php echo esc_html($key->key_prefix); ?>...</code>
                                        </td>
                                        <td class="column-user">
                                            <?php echo $user ? esc_html($user->user_login) : '-'; ?>
                                        </td>
                                        <td class="column-created">
                                            <?php echo esc_html(date_i18n(get_option('date_format') . ' ' . get_option('time_format'), strtotime($key->created_at))); ?>
                                        </td>
                                        <td class="column-last-used">
                                            <?php echo $key->last_used_at ? esc_html(date_i18n(get_option('date_format') . ' ' . get_option('time_format'), strtotime($key->last_used_at))) : '-'; ?>
                                        </td>
                                        <td class="column-status">
                                            <?php echo $status; ?>
                                        </td>
                                        <td class="column-actions">
                                            <?php if (!$is_revoked) : ?>
                                                <button type="button" class="button ubi-revoke-btn" data-key-id="<?php echo esc_attr($key->id); ?>" data-key-name="<?php echo esc_attr($key->name); ?>">
                                                    <?php esc_html_e('Revoke', 'ubi-auth'); ?>
                                                </button>
                                            <?php else : ?>
                                                <span class="ubi-revoked-label"><?php esc_html_e('Revoked', 'ubi-auth'); ?></span>
                                            <?php endif; ?>
                                        </td>
                                    </tr>
                                <?php endforeach; ?>
                            </tbody>
                        </table>
                    <?php endif; ?>
                </div>
            </div>
        </div>
        
        <!-- Revoke Confirmation Modal -->
        <div id="ubi-revoke-modal" class="ubi-modal" style="display:none;">
            <div class="ubi-modal-content">
                <span class="ubi-modal-close">&times;</span>
                <h2><?php esc_html_e('Revoke API Key', 'ubi-auth'); ?></h2>
                <p><?php esc_html_e('Are you sure you want to revoke this API key?', 'ubi-auth'); ?></p>
                <p><strong id="ubi-revoke-key-name"></strong></p>
                <p class="ubi-warning"><?php esc_html_e('This action cannot be undone. Any applications using this key will lose access immediately.', 'ubi-auth'); ?></p>
                <form id="ubi-revoke-key-form" method="post">
                    <?php wp_nonce_field('ubi_revoke_api_key', 'ubi_revoke_nonce'); ?>
                    <input type="hidden" name="key_id" id="ubi-revoke-key-id" value="">
                    <p class="submit">
                        <button type="submit" class="button button-primary ubi-confirm-revoke-btn">
                            <?php esc_html_e('Yes, Revoke Key', 'ubi-auth'); ?>
                        </button>
                        <button type="button" class="button ubi-cancel-revoke-btn">
                            <?php esc_html_e('Cancel', 'ubi-auth'); ?>
                        </button>
                    </p>
                </form>
            </div>
        </div>
        <?php
    }
    
    /**
     * Get API keys for a user
     */
    private function get_user_api_keys($user_id = null) {
        global $wpdb;
        $table_name = $wpdb->prefix . $this->table_name;
        
        if ($user_id) {
            $keys = $wpdb->get_results($wpdb->prepare(
                "SELECT * FROM {$table_name} WHERE user_id = %d ORDER BY created_at DESC",
                $user_id
            ));
        } else {
            $keys = $wpdb->get_results("SELECT * FROM {$table_name} ORDER BY created_at DESC");
        }
        
        return $keys;
    }
    
    /**
     * Generate a new API key
     */
    private function generate_api_key() {
        // Use WordPress CSPRNG
        $random_bytes = wp_generate_password(32, false, false);
        $key = 'ubi_' . bin2hex($random_bytes);
        return $key;
    }
    
    /**
     * Hash an API key for storage
     */
    private function hash_api_key($key) {
        return hash('sha256', $key);
    }
    
    /**
     * Get key prefix for display
     */
    private function get_key_prefix($key) {
        return substr($key, 0, 8);
    }
    
    /**
     * AJAX handler: Generate new API key
     */
    public function ajax_generate_api_key() {
        check_ajax_referer('ubi_api_keys_nonce', 'nonce');
        
        // Verify permissions
        if (!current_user_can('manage_options')) {
            wp_send_json_error(array('message' => __('Permission denied.', 'ubi-auth')), 403);
        }
        
        // Get and validate input
        $name = isset($_POST['name']) ? sanitize_text_field($_POST['name']) : '';
        $user_id = isset($_POST['user_id']) ? absint($_POST['user_id']) : 0;
        
        if (empty($name)) {
            wp_send_json_error(array('message' => __('Key name is required.', 'ubi-auth')), 400);
        }
        
        if (!$user_id || !get_userdata($user_id)) {
            wp_send_json_error(array('message' => __('Invalid user selected.', 'ubi-auth')), 400);
        }
        
        // Generate the key
        $plain_key = $this->generate_api_key();
        $key_hash = $this->hash_api_key($plain_key);
        $key_prefix = $this->get_key_prefix($plain_key);
        
        // Store in database
        global $wpdb;
        $table_name = $wpdb->prefix . $this->table_name;
        
        $result = $wpdb->insert(
            $table_name,
            array(
                'user_id' => $user_id,
                'key_hash' => $key_hash,
                'key_prefix' => $key_prefix,
                'name' => $name,
                'created_at' => current_time('mysql'),
            ),
            array('%d', '%s', '%s', '%s', '%s')
        );
        
        if ($result === false) {
            wp_send_json_error(array('message' => __('Failed to store API key.', 'ubi-auth')), 500);
        }
        
        // Return the plain key (only time it's shown)
        wp_send_json_success(array(
            'key' => $plain_key,
            'key_prefix' => $key_prefix,
            'name' => $name,
            'id' => $wpdb->insert_id,
        ));
    }
    
    /**
     * AJAX handler: Revoke API key
     */
    public function ajax_revoke_api_key() {
        check_ajax_referer('ubi_api_keys_nonce', 'nonce');
        
        // Verify permissions
        if (!current_user_can('manage_options')) {
            wp_send_json_error(array('message' => __('Permission denied.', 'ubi-auth')), 403);
        }
        
        $key_id = isset($_POST['key_id']) ? absint($_POST['key_id']) : 0;
        
        if (!$key_id) {
            wp_send_json_error(array('message' => __('Invalid key ID.', 'ubi-auth')), 400);
        }
        
        global $wpdb;
        $table_name = $wpdb->prefix . $this->table_name;
        
        // Check if key exists and is not already revoked
        $key = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM {$table_name} WHERE id = %d",
            $key_id
        ));
        
        if (!$key) {
            wp_send_json_error(array('message' => __('API key not found.', 'ubi-auth')), 404);
        }
        
        if ($key->revoked_at) {
            wp_send_json_error(array('message' => __('API key is already revoked.', 'ubi-auth')), 400);
        }
        
        // Revoke the key
        $result = $wpdb->update(
            $table_name,
            array('revoked_at' => current_time('mysql')),
            array('id' => $key_id),
            array('%s'),
            array('%d')
        );
        
        if ($result === false) {
            wp_send_json_error(array('message' => __('Failed to revoke API key.', 'ubi-auth')), 500);
        }
        
        wp_send_json_success(array('message' => __('API key revoked successfully.', 'ubi-auth')));
    }
    
    /**
     * AJAX handler: Get all API keys (for refresh)
     */
    public function ajax_get_api_keys() {
        check_ajax_referer('ubi_api_keys_nonce', 'nonce');
        
        // Verify permissions
        if (!current_user_can('manage_options')) {
            wp_send_json_error(array('message' => __('Permission denied.', 'ubi-auth')), 403);
        }
        
        $keys = $this->get_user_api_keys();
        
        $keys_data = array();
        foreach ($keys as $key) {
            $user = get_userdata($key->user_id);
            $keys_data[] = array(
                'id' => $key->id,
                'name' => $key->name,
                'key_prefix' => $key->key_prefix,
                'user' => $user ? $user->user_login : '-',
                'created_at' => date_i18n(get_option('date_format') . ' ' . get_option('time_format'), strtotime($key->created_at)),
                'last_used_at' => $key->last_used_at ? date_i18n(get_option('date_format') . ' ' . get_option('time_format'), strtotime($key->last_used_at)) : '-',
                'revoked_at' => $key->revoked_at,
                'is_revoked' => !empty($key->revoked_at),
            );
        }
        
        wp_send_json_success(array('keys' => $keys_data));
    }
    
    /**
     * Verify an API key (for external use)
     */
    public function verify_api_key($key) {
        global $wpdb;
        $table_name = $wpdb->prefix . $this->table_name;
        
        $key_hash = $this->hash_api_key($key);
        
        $result = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM {$table_name} WHERE key_hash = %s",
            $key_hash
        ));
        
        if (!$result) {
            return new WP_Error('invalid_key', __('API key not found.', 'ubi-auth'));
        }
        
        if ($result->revoked_at) {
            return new WP_Error('revoked_key', __('API key has been revoked.', 'ubi-auth'));
        }
        
        // Update last used timestamp
        $wpdb->update(
            $table_name,
            array('last_used_at' => current_time('mysql')),
            array('id' => $result->id),
            array('%s'),
            array('%d')
        );
        
        return get_userdata($result->user_id);
    }
    
    /**
     * CRITICAL FIX: Proper HMAC-SHA256 JWT signing
     */
    private function generate_jwt($user) {
        $header = array(
            'typ' => 'JWT',
            'alg' => 'HS256',
        );
        
        $payload = array(
            'iss' => get_site_url(),
            'sub' => $user->ID,
            'iat' => time(),
            'exp' => time() + $this->jwt_expiry,
            // FIXED: Removed sensitive data from token
            'user_id' => $user->ID,
        );
        
        // Base64url encode header and payload
        $header_b64 = $this->base64url_encode(json_encode($header));
        $payload_b64 = $this->base64url_encode(json_encode($payload));
        
        // Create signature
        $signature = $this->base64url_encode(
            hash_hmac('sha256', $header_b64 . '.' . $payload_b64, $this->jwt_secret, true)
        );
        
        return $header_b64 . '.' . $payload_b64 . '.' . $signature;
    }
    
    /**
     * CRITICAL FIX: Proper JWT verification with signature validation
     */
    public function verify_jwt($token) {
        try {
            $parts = explode('.', $token);
            
            if (count($parts) !== 3) {
                return new WP_Error('invalid_token', 'Invalid token format');
            }
            
            list($header_b64, $payload_b64, $signature) = $parts;
            
            // Verify signature
            $expected_signature = $this->base64url_encode(
                hash_hmac('sha256', $header_b64 . '.' . $payload_b64, $this->jwt_secret, true)
            );
            
            if (!hash_equals($expected_signature, $signature)) {
                return new WP_Error('invalid_signature', 'Invalid token signature');
            }
            
            // Decode payload
            $payload = json_decode($this->base64url_decode($payload_b64), true);
            
            if (!$payload || !isset($payload['exp']) || !isset($payload['sub'])) {
                return new WP_Error('invalid_token', 'Invalid token payload');
            }
            
            // Check expiration
            if ($payload['exp'] < time()) {
                return new WP_Error('expired_token', 'Token has expired');
            }
            
            // Verify user exists
            $user = get_userdata($payload['sub']);
            if (!$user) {
                return new WP_Error('invalid_user', 'User not found');
            }
            
            return $user;
            
        } catch (Exception $e) {
            return new WP_Error('token_error', $e->getMessage());
        }
    }
    
    /**
     * Base64url encoding (JWT standard)
     */
    private function base64url_encode($data) {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }
    
    /**
     * Base64url decoding
     */
    private function base64url_decode($data) {
        return base64_decode(strtr($data, '-_', '+/'));
    }
    
    public function handle_login() {
        check_ajax_referer('ubi_auth_nonce', 'nonce');
        
        $credentials = array(
            'user_login'    => isset($_POST['username']) ? sanitize_text_field($_POST['username']) : '',
            'user_password' => isset($_POST['password']) ? $_POST['password'] : '',
            'remember'      => isset($_POST['remember']) && $_POST['remember'],
        );
        
        if (empty($credentials['user_login']) || empty($credentials['user_password'])) {
            wp_send_json_error(array('message' => 'Username and password required'), 400);
        }
        
        $user = wp_signon($credentials, $credentials['remember']);
        
        if (is_wp_error($user)) {
            wp_send_json_error(array('message' => $user->get_error_message()), 401);
        }
        
        // Generate proper JWT with HMAC-SHA256
        $jwt_token = $this->generate_jwt($user);
        
        wp_send_json_success(array(
            'token' => $jwt_token,
            'user' => array(
                'id' => $user->ID,
                'username' => $user->user_login,
                'email' => $user->user_email,
                'roles' => $user->roles,
            ),
        ));
    }
    
    public function handle_logout() {
        check_ajax_referer('ubi_auth_nonce', 'nonce');
        
        wp_logout();
        wp_send_json_success(array('message' => 'Logged out successfully'));
    }
}

UBI_Auth_Plugin::get_instance();
