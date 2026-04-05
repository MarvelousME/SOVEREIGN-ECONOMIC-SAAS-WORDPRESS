<?php
/**
 * Session Manager
 * 
 * Manages WordPress sessions with Keycloak token storage
 */

declare(strict_types=1);

namespace SAAOS\Keycloak;

final class Session_Manager
{
    private const TOKEN_META_KEY = 'saaos_keycloak_tokens';
    private const SESSION_PREFIX = 'saaos_kc_';

    public function init(): void
    {
        add_action('wp_login', [$this, 'on_login'], 10, 2);
        add_action('wp_logout', [$this, 'on_logout'], 10);
        add_filter('auth_redirect', [$this, 'check_auth_redirect']);
        add_action('template_redirect', [$this, 'maybe_refresh_token'], 1);
    }

    public function store_tokens(int $user_id, array $tokens): void
    {
        $token_data = [
            'access_token' => $tokens['access_token'] ?? '',
            'id_token' => $tokens['id_token'] ?? '',
            'refresh_token' => $tokens['refresh_token'] ?? '',
            'expires_at' => $tokens['expires_at'] ?? 0,
            'stored_at' => current_time('mysql'),
        ];

        update_user_meta($user_id, self::TOKEN_META_KEY, $token_data);

        $this->create_session($user_id, $tokens);
    }

    public function get_tokens(int $user_id): array
    {
        return get_user_meta($user_id, self::TOKEN_META_KEY, true) ?: [];
    }

    public function update_tokens(int $user_id, array $tokens): bool
    {
        $existing = $this->get_tokens($user_id);
        if (empty($existing)) {
            return false;
        }

        $token_data = [
            'access_token' => $tokens['access_token'] ?? $existing['access_token'],
            'id_token' => $tokens['id_token'] ?? $existing['id_token'],
            'refresh_token' => $tokens['refresh_token'] ?? $existing['refresh_token'],
            'expires_at' => $tokens['expires_at'] ?? (time() + 300),
            'stored_at' => current_time('mysql'),
        ];

        update_user_meta($user_id, self::TOKEN_META_KEY, $token_data);
        return true;
    }

    public function clear_tokens(int $user_id): void
    {
        delete_user_meta($user_id, self::TOKEN_META_KEY);
    }

    public function is_token_expiring_soon(int $user_id, int $threshold = 300): bool
    {
        $tokens = $this->get_tokens($user_id);
        if (empty($tokens) || !isset($tokens['expires_at'])) {
            return true;
        }

        return ($tokens['expires_at'] - time()) < $threshold;
    }

    public function is_access_token_expired(int $user_id): bool
    {
        $tokens = $this->get_tokens($user_id);
        if (empty($tokens) || !isset($tokens['expires_at'])) {
            return true;
        }

        return $tokens['expires_at'] < time();
    }

    private function create_session(int $user_id, array $tokens): void
    {
        $manager = WP_Session_Tokens::get_instance($user_id);
        
        $session_info = [
            'tokens' => $tokens,
            'created' => time(),
            'ip' => $this->get_client_ip(),
            'ua' => isset($_SERVER['HTTP_USER_AGENT']) ? $_SERVER['HTTP_USER_AGENT'] : '',
        ];

        $manager->create($tokens['expires_in'] ?? 14400);
        
        $session_id = $manager->issue_session_token();
        set_transient(self::SESSION_PREFIX . $session_id, $session_info, $tokens['expires_in'] ?? 14400);
    }

    public function validate_session(int $user_id, string $token = ''): bool
    {
        $manager = WP_Session_Tokens::get_instance($user_id);
        
        if (empty($token)) {
            return $manager->verify(true);
        }

        return $manager->verify($token);
    }

    public function destroy_all_sessions(int $user_id): void
    {
        $manager = WP_Session_Tokens::get_instance($user_id);
        $manager->destroy_all();
        
        $this->clear_tokens($user_id);
        
        delete_transient(self::SESSION_PREFIX . $user_id);
    }

    public function on_login(string $user_login, WP_User $user): void
    {
        do_action('saaos_keycloak_login_success', $user, []);
    }

    public function on_logout(): void
    {
        $user_id = get_current_user_id();
        if ($user_id > 0) {
            $this->destroy_all_sessions($user_id);
            do_action('saaos_keycloak_logout', wp_get_current_user());
        }
    }

    public function check_auth_redirect(WP_User $user): void
    {
        if ($this->is_access_token_expired($user->ID)) {
            $tokens = $this->get_tokens($user->ID);
            if (!empty($tokens['refresh_token'])) {
                $this->attempt_token_refresh($user->ID, $tokens['refresh_token']);
            }
        }
    }

    public function maybe_refresh_token(): void
    {
        if (!is_user_logged_in()) {
            return;
        }

        $user_id = get_current_user_id();
        if ($this->is_token_expiring_soon($user_id)) {
            $tokens = $this->get_tokens($user_id);
            if (!empty($tokens['refresh_token'])) {
                $this->attempt_token_refresh($user_id, $tokens['refresh_token']);
            }
        }
    }

    private function attempt_token_refresh(int $user_id, string $refresh_token): bool
    {
        $client = new Keycloak_Client();
        $new_tokens = $client->refresh_token($refresh_token);

        if (isset($new_tokens['error'])) {
            $this->clear_tokens($user_id);
            wp_logout();
            return false;
        }

        $this->update_tokens($user_id, $new_tokens);
        return true;
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

    public function get_session_info(int $user_id): array
    {
        $tokens = $this->get_tokens($user_id);
        if (empty($tokens)) {
            return [];
        }

        return [
            'expires_at' => $tokens['expires_at'] ?? 0,
            'expires_in' => ($tokens['expires_at'] ?? 0) - time(),
            'has_refresh_token' => !empty($tokens['refresh_token']),
            'last_updated' => $tokens['stored_at'] ?? '',
        ];
    }
}
