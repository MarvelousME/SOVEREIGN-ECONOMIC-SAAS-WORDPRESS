<?php
/**
 * Authentication Handler
 * 
 * Handles WordPress login/registration hooks and OIDC flow orchestration
 */

declare(strict_types=1);

namespace SAAOS\Keycloak;

final class Auth_Handler
{
    private const STATE_TRANSIENT_PREFIX = 'saaos_kc_state_';
    private const NONCE_ACTION = 'saaos_keycloak_auth';

    private Keycloak_Client $client;
    private Role_Mapper $role_mapper;
    private Session_Manager $session_manager;

    private ?string $error_message = null;

    public function __construct(
        Keycloak_Client $client,
        Role_Mapper $role_mapper,
        Session_Manager $session_manager
    ) {
        $this->client = $client;
        $this->role_mapper = $role_mapper;
        $this->session_manager = $session_manager;
    }

    public function init(): void
    {
        add_action('login_init', [$this, 'handle_login_init']);
        add_action('init', [$this, 'handle_init']);
        add_action('admin_post_keycloak_callback', [$this, 'handle_callback']);
        add_action('admin_post_nopriv_keycloak_callback', [$this, 'handle_callback']);
        add_action('wp_login', [$this, 'on_wp_login'], 10, 2);
        add_action('user_register', [$this, 'on_user_register'], 10, 2);
        add_filter('login_redirect', [$this, 'modify_login_redirect'], 10, 3);
        add_filter('logout_redirect', [$this, 'modify_logout_redirect'], 10, 3);
        
        $this->session_manager->init();
    }

    public function handle_init(): void
    {
        if (!isset($_GET['keycloak'])) {
            return;
        }

        $action = sanitize_text_field($_GET['keycloak']);

        switch ($action) {
            case 'login':
                $this->initiate_login();
                break;
            case 'register':
                $this->initiate_registration();
                break;
            case 'callback':
                $this->handle_callback();
                break;
            case 'logout':
                $this->handle_logout();
                break;
        }
    }

    public function handle_login_init(): void
    {
        if (!isset($_GET['keycloak'])) {
            return;
        }

        if ($_GET['keycloak'] === 'login' || $_GET['keycloak'] === 'register') {
            $this->initiate_oidc_flow(sanitize_text_field($_GET['keycloak']));
        }
    }

    public function initiate_login(): void
    {
        $this->initiate_oidc_flow('login');
    }

    public function initiate_registration(): void
    {
        $this->initiate_oidc_flow('register');
    }

    private function initiate_oidc_flow(string $flow_type): void
    {
        if (!wp_verify_nonce($_GET['_wpnonce'] ?? '', self::NONCE_ACTION)) {
            if (!is_user_logged_in()) {
                wp_die('Security check failed');
            }
            return;
        }

        $state = $this->generate_state();
        $nonce = $this->generate_nonce();

        $return_url = '';
        if (!empty($_GET['redirect_to'])) {
            $candidate = wp_unslash((string) $_GET['redirect_to']);
            $validated = wp_validate_redirect($candidate, false);
            if (is_string($validated) && $validated !== '') {
                $return_url = $validated;
            }
        }

        $this->store_state($state, $nonce, $flow_type, $return_url);

        $redirect_uri = $this->get_callback_url();
        $auth_url = $this->client->build_authorization_url($state, $nonce, $redirect_uri);

        if (empty($auth_url)) {
            $this->redirect_with_error('Failed to build authorization URL');
            return;
        }

        wp_safe_redirect($auth_url);
        exit;
    }

    public function handle_callback(): void
    {
        if (isset($_GET['error'])) {
            $error_description = sanitize_text_field($_GET['error_description'] ?? $_GET['error'] ?? 'Unknown error');
            $this->redirect_with_error($error_description);
            return;
        }

        $code = sanitize_text_field($_GET['code'] ?? '');
        $state = sanitize_text_field($_GET['state'] ?? '');

        if (empty($code) || empty($state)) {
            $this->redirect_with_error('Missing authorization code or state');
            return;
        }

        $state_data = $this->validate_and_clear_state($state);
        if ($state_data === false) {
            $this->redirect_with_error('Invalid or expired state parameter');
            return;
        }

        $expected_nonce = $state_data['nonce'];
        $flow_type = $state_data['flow_type'];
        $oidc_return_url = isset($state_data['return_url']) ? (string) $state_data['return_url'] : '';

        $redirect_uri = $this->get_callback_url();
        $tokens = $this->client->exchange_code_for_tokens($code, $redirect_uri);

        if (isset($tokens['error'])) {
            $this->log_error('token_exchange', $tokens['error_description'] ?? $tokens['error']);
            $this->redirect_with_error('Token exchange failed: ' . ($tokens['error_description'] ?? $tokens['error']));
            return;
        }

        $id_token_validation = $this->client->validate_id_token($tokens['id_token'] ?? '');
        if (isset($id_token_validation['error'])) {
            $this->log_error('id_token_validation', $id_token_validation['error']);
            $this->redirect_with_error('ID token validation failed');
            return;
        }

        if (!$this->validate_nonce_in_token($id_token_validation['payload'], $expected_nonce)) {
            $this->log_error('nonce_validation', 'Nonce mismatch');
            $this->redirect_with_error('Nonce validation failed');
            return;
        }

        $userinfo = $this->client->get_userinfo($tokens['access_token']);
        if (isset($userinfo['error'])) {
            $this->log_error('userinfo_fetch', $userinfo['error']);
            $this->redirect_with_error('Failed to fetch user info');
            return;
        }

        $userinfo = apply_filters('saaos_keycloak_userdata', $userinfo, $id_token_validation['payload']);

        $this->authenticate_user($userinfo, $tokens, $flow_type, $oidc_return_url);
    }

    private function authenticate_user(array $userinfo, array $tokens, string $flow_type, string $oidc_return_url = ''): void
    {
        $sub = $userinfo['sub'] ?? '';
        $email = $userinfo['email'] ?? '';
        $username = $userinfo['preferred_username'] ?? $userinfo['name'] ?? $email;

        if (empty($sub)) {
            $this->redirect_with_error('Missing subject identifier from Keycloak');
            return;
        }

        $user_id = $this->find_user_by_sub($sub);

        if ($user_id === 0 && !empty($email)) {
            $user_id = email_exists($email);
        }

        if ($user_id === 0) {
            if ($flow_type === 'login') {
                $this->redirect_with_error('User does not exist. Please register first.');
                return;
            }
            $user_id = $this->create_user($userinfo);
            if (is_wp_error($user_id)) {
                $this->redirect_with_error('User creation failed: ' . $user_id->get_error_message());
                return;
            }
            do_action('saaos_keycloak_registration', $user_id, $userinfo);
        }

        $this->update_user_from_keycloak($user_id, $userinfo);

        $this->session_manager->store_tokens($user_id, $tokens);

        $kc_roles = $userinfo['roles'] ?? [];
        $this->role_mapper->sync_user_roles($user_id, $kc_roles);

        $user = get_user_by('id', $user_id);
        
        wp_set_current_user($user_id, $user->user_login);
        wp_set_auth_cookie($user_id, true);
        
        do_action('saaos_keycloak_login_success', $user, $userinfo);

        $redirect_url = apply_filters(
            'saaos_keycloak_oidc_redirect',
            $this->get_login_redirect_url($user, $oidc_return_url),
            $user,
            $userinfo
        );
        wp_safe_redirect($redirect_url);
        exit;
    }

    private function find_user_by_sub(string $sub): int
    {
        global $wpdb;
        
        $user_id = $wpdb->get_var(
            $wpdb->prepare(
                "SELECT user_id FROM {$wpdb->usermeta} WHERE meta_key = 'saaos_keycloak_sub' AND meta_value = %s",
                $sub
            )
        );

        return (int)($user_id ?? 0);
    }

    private function create_user(array $userinfo): int|WP_Error
    {
        $username = $this->generate_username($userinfo);
        $email = $userinfo['email'] ?? '';
        $password = wp_generate_password(32, true);
        
        $userdata = [
            'user_login' => $username,
            'user_pass' => $password,
            'user_email' => $email,
            'display_name' => $userinfo['name'] ?? $username,
            'first_name' => $userinfo['given_name'] ?? '',
            'last_name' => $userinfo['family_name'] ?? '',
            'role' => $this->role_mapper->get_default_role(),
        ];

        if (!empty($userinfo['picture'])) {
            $userdata['avatar_url'] = $userinfo['picture'];
        }

        $user_id = wp_insert_user($userdata);

        if (is_wp_error($user_id)) {
            return $user_id;
        }

        update_user_meta($user_id, 'saaos_keycloak_sub', $userinfo['sub']);
        update_user_meta($user_id, 'saaos_keycloak_email_verified', $userinfo['email_verified'] ?? false);
        update_user_meta($user_id, 'saaos_keycloak_last_sync', current_time('mysql'));

        return $user_id;
    }

    private function update_user_from_keycloak(int $user_id, array $userinfo): void
    {
        $userdata = [];

        if (!empty($userinfo['name'])) {
            $userdata['display_name'] = $userinfo['name'];
        }
        if (!empty($userinfo['given_name'])) {
            $userdata['first_name'] = $userinfo['given_name'];
        }
        if (!empty($userinfo['family_name'])) {
            $userdata['last_name'] = $userinfo['family_name'];
        }
        if (!empty($userinfo['email'])) {
            $userdata['user_email'] = $userinfo['email'];
        }

        if (!empty($userdata)) {
            $userdata['ID'] = $user_id;
            wp_update_user($userdata);
        }

        update_user_meta($user_id, 'saaos_keycloak_sub', $userinfo['sub']);
        update_user_meta($user_id, 'saaos_keycloak_email_verified', $userinfo['email_verified'] ?? false);
        update_user_meta($user_id, 'saaos_keycloak_last_sync', current_time('mysql'));
    }

    private function generate_username(array $userinfo): string
    {
        $base = sanitize_user($userinfo['preferred_username'] ?? $userinfo['name'] ?? $userinfo['email'] ?? 'user', true);
        $base = preg_replace('/[^a-z0-9_]/', '', strtolower($base));
        
        if (username_exists($base)) {
            $counter = 1;
            while (username_exists($base . $counter)) {
                $counter++;
            }
            return $base . $counter;
        }

        return $base;
    }

    public function on_wp_login(string $user_login, WP_User $user): void
    {
        update_user_meta($user->ID, 'saaos_keycloak_last_login', current_time('mysql'));
    }

    public function on_user_register(int $user_id, array $userdata): void
    {
        if (isset($_SESSION['saaos_keycloak_roles'])) {
            $kc_roles = $_SESSION['saaos_keycloak_roles'];
            $this->role_mapper->sync_user_roles($user_id, $kc_roles);
            unset($_SESSION['saaos_keycloak_roles']);
        }
    }

    public function modify_login_redirect(string $redirect_to, string $requested_to, WP_User $user): string
    {
        return apply_filters('saaos_keycloak_login_redirect', $redirect_to, $user);
    }

    public function modify_logout_redirect(string $redirect_to, string $requested_to, WP_User $user): string
    {
        $kc_logout_redirect = get_option('saaos_keycloak_redirect_after_logout', '');
        if (!empty($kc_logout_redirect)) {
            return $kc_logout_redirect;
        }
        return $redirect_to;
    }

    public function handle_logout(): void
    {
        if (!is_user_logged_in()) {
            wp_safe_redirect(apply_filters('saaos_keycloak_post_logout_redirect_uri', home_url('/')));
            exit;
        }

        $user_id = get_current_user_id();
        $tokens = $this->session_manager->get_tokens($user_id);

        wp_logout();

        if (!empty($tokens['id_token'])) {
            $redirect_uri = apply_filters('saaos_keycloak_post_logout_redirect_uri', home_url('/'));
            $logout_url = $this->client->logout($tokens['id_token'], $redirect_uri);
            
            if (!empty($logout_url)) {
                wp_safe_redirect($logout_url);
                exit;
            }
        }

        wp_safe_redirect(apply_filters('saaos_keycloak_post_logout_redirect_uri', home_url('/')));
        exit;
    }

    public function render_login_button(string $redirect_to = ''): void
    {
        $args = [
            'keycloak' => 'login',
            '_wpnonce' => wp_create_nonce(self::NONCE_ACTION),
        ];
        if ($redirect_to !== '') {
            $args['redirect_to'] = $redirect_to;
        }
        $login_url = add_query_arg($args, wp_login_url());

        echo '<a href="' . esc_url($login_url) . '" class="saaos-keycloak-login-btn">';
        echo esc_html__('Login with Keycloak', 'saaos-keycloak-identity');
        echo '</a>';
    }

    public function render_register_button(string $redirect_to = ''): void
    {
        $args = [
            'keycloak' => 'register',
            '_wpnonce' => wp_create_nonce(self::NONCE_ACTION),
        ];
        if ($redirect_to !== '') {
            $args['redirect_to'] = $redirect_to;
        }
        $register_url = add_query_arg($args, wp_registration_url());

        echo '<a href="' . esc_url($register_url) . '" class="saaos-keycloak-register-btn">';
        echo esc_html__('Register with Keycloak', 'saaos-keycloak-identity');
        echo '</a>';
    }

    private function generate_state(): string
    {
        return bin2hex(random_bytes(32));
    }

    private function generate_nonce(): string
    {
        return bin2hex(random_bytes(32));
    }

    private function store_state(string $state, string $nonce, string $flow_type, string $return_url = ''): void
    {
        $data = [
            'nonce' => $nonce,
            'flow_type' => $flow_type,
            'created' => time(),
            'ip' => $this->get_client_ip(),
        ];
        if ($return_url !== '') {
            $data['return_url'] = $return_url;
        }

        set_transient(self::STATE_TRANSIENT_PREFIX . $state, $data, 600);
    }

    private function validate_and_clear_state(string $state): array|false
    {
        $data = get_transient(self::STATE_TRANSIENT_PREFIX . $state);
        
        if ($data === false) {
            return false;
        }

        if (($data['created'] + 600) < time()) {
            delete_transient(self::STATE_TRANSIENT_PREFIX . $state);
            return false;
        }

        $current_ip = $this->get_client_ip();
        if ($data['ip'] !== $current_ip && apply_filters('saaos_keycloak_strict_ip_check', true)) {
            delete_transient(self::STATE_TRANSIENT_PREFIX . $state);
            return false;
        }

        delete_transient(self::STATE_TRANSIENT_PREFIX . $state);

        return $data;
    }

    private function validate_nonce_in_token(array $payload, string $expected_nonce): bool
    {
        if (!isset($payload['nonce'])) {
            return false;
        }

        return hash_equals($payload['nonce'], $expected_nonce);
    }

    private function get_callback_url(): string
    {
        return admin_url('admin-post.php?action=keycloak_callback');
    }

    private function get_login_redirect_url(WP_User $user, string $oidc_return_url = ''): string
    {
        $custom_redirect = get_option('saaos_keycloak_redirect_after_login', '');
        if (!empty($custom_redirect)) {
            return $custom_redirect;
        }

        if ($oidc_return_url !== '') {
            $validated = wp_validate_redirect($oidc_return_url, false);
            if (is_string($validated) && $validated !== '') {
                return $validated;
            }
        }

        if (isset($_GET['redirect_to'])) {
            $maybe = wp_validate_redirect(wp_unslash((string) $_GET['redirect_to']), false);
            if (is_string($maybe) && $maybe !== '') {
                return $maybe;
            }
        }

        return apply_filters('saaos_keycloak_default_login_redirect', home_url('/'), $user);
    }

    private function redirect_with_error(string $message): void
    {
        $login_url = wp_login_url();
        $login_url = add_query_arg('keycloak_error', urlencode($message), $login_url);
        
        wp_safe_redirect($login_url);
        exit;
    }

    private function get_client_ip(): string
    {
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

    private function log_error(string $code, string $message): void
    {
        if (get_option('saaos_keycloak_debug_mode', '0') === '1') {
            error_log(sprintf(
                '[SAAOS Keycloak Auth] [%s] %s',
                $code,
                $message
            ));
        }
    }

    public function get_error_message(): ?string
    {
        return $this->error_message;
    }

    public function set_error_message(string $message): void
    {
        $this->error_message = $message;
    }

    public static function render_error_message(): void
    {
        if (isset($_GET['keycloak_error'])) {
            $error = urldecode($_GET['keycloak_error']);
            echo '<div class="saaos-keycloak-error">';
            echo esc_html__('Keycloak Error: ', 'saaos-keycloak-identity') . esc_html($error);
            echo '</div>';
        }
    }
}
