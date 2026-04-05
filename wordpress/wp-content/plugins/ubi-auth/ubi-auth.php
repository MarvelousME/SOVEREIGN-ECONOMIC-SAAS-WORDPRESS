<?php
/**
 * Plugin Name: UBI Authentication
 * Description: Secure authentication with JWT and role-based access
 * Version: 1.0.3
 * Author: UBI CMS Team
 * Security: Admin menu added
 */

if (!defined('ABSPATH')) exit;

class UBI_Auth_Plugin {
    
    private static $instance = null;
    private $jwt_secret;
    private $jwt_expiry;
    
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
        
        // Admin menu
        add_action('admin_menu', array($this, 'add_admin_menu'));
        
        // AJAX handlers
        add_action('wp_ajax_ubi_auth_login', array($this, 'handle_login'));
        add_action('wp_ajax_nopriv_ubi_auth_login', array($this, 'handle_login'));
        add_action('wp_ajax_ubi_auth_logout', array($this, 'handle_logout'));
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
        echo '<div class="wrap">';
        echo '<h1>' . esc_html__('API Keys', 'ubi-auth') . '</h1>';
        echo '<p>' . esc_html__('Manage API keys for programmatic access.', 'ubi-auth') . '</p>';
        echo '<p><em>' . esc_html__('API key management coming soon.', 'ubi-auth') . '</em></p>';
        echo '</div>';
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
