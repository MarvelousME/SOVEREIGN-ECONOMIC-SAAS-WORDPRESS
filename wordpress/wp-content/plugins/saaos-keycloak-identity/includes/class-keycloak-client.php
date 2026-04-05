<?php
/**
 * Keycloak OIDC Client
 * 
 * Handles all OIDC protocol communications with Keycloak server
 */

declare(strict_types=1);

namespace SAAOS\Keycloak;

use WP_Error;
use Requests;

final class Keycloak_Client
{
    private const OIDC_DERIVE_PATH = '/realms/%s/.well-known/openid-configuration';
    
    private string $server_url;
    private string $realm;
    private string $client_id;
    private string $client_secret;
    
    private ?array $discovery_document = null;
    private ?array $jwks = null;
    
    private const TRANSIENT_CACHE_KEY = 'saaos_keycloak_discovery_cache';
    private const CACHE_DURATION = 3600;

    public function __construct()
    {
        $this->server_url = get_option('saaos_keycloak_server_url', '');
        $this->realm = get_option('saaos_keycloak_realm', '');
        $this->client_id = get_option('saaos_keycloak_client_id', '');
        $this->client_secret = get_option('saaos_keycloak_client_secret', '');
    }

    public function is_configured(): bool
    {
        return !empty($this->server_url) 
            && !empty($this->realm) 
            && !empty($this->client_id) 
            && !empty($this->client_secret);
    }

    public function get_server_url(): string
    {
        return $this->server_url;
    }

    public function get_realm(): string
    {
        return $this->realm;
    }

    public function get_client_id(): string
    {
        return $this->client_id;
    }

    public function get_discovery_endpoint(): string
    {
        return rtrim($this->server_url, '/') . sprintf(self::OIDC_DERIVE_PATH, $this->realm);
    }

    public function get_authorization_endpoint(): string
    {
        $discovery = $this->get_discovery_document();
        return $discovery['authorization_endpoint'] ?? '';
    }

    public function get_token_endpoint(): string
    {
        $discovery = $this->get_discovery_document();
        return $discovery['token_endpoint'] ?? '';
    }

    public function get_userinfo_endpoint(): string
    {
        $discovery = $this->get_discovery_document();
        return $discovery['userinfo_endpoint'] ?? '';
    }

    public function get_logout_endpoint(): string
    {
        $discovery = $this->get_discovery_document();
        return $discovery['end_session_endpoint'] ?? '';
    }

    public function get_jwks_uri(): string
    {
        $discovery = $this->get_discovery_document();
        return $discovery['jwks_uri'] ?? '';
    }

    public function get_issuer(): string
    {
        $discovery = $this->get_discovery_document();
        return $discovery['issuer'] ?? '';
    }

    public function get_discovery_document(): array
    {
        if ($this->discovery_document !== null) {
            return $this->discovery_document;
        }

        $cached = get_transient(self::TRANSIENT_CACHE_KEY);
        if ($cached !== false) {
            $this->discovery_document = $cached;
            return $this->discovery_document;
        }

        $response = wp_remote_get($this->get_discovery_endpoint(), [
            'timeout' => 15,
            'headers' => ['Accept' => 'application/json'],
        ]);

        if (is_wp_error($response)) {
            $this->log_error('discovery_fetch_failed', $response->get_error_message());
            return [];
        }

        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);

        if (empty($data) || !isset($data['authorization_endpoint'])) {
            $this->log_error('discovery_invalid_response', $body);
            return [];
        }

        $this->discovery_document = $data;
        set_transient(self::TRANSIENT_CACHE_KEY, $data, self::CACHE_DURATION);

        return $this->discovery_document;
    }

    public function build_authorization_url(string $state, string $nonce, string $redirect_uri, string $login_hint = ''): string
    {
        $params = [
            'client_id' => $this->client_id,
            'redirect_uri' => $redirect_uri,
            'response_type' => 'code',
            'scope' => 'openid profile email',
            'state' => $state,
            'nonce' => $nonce,
        ];

        if (!empty($login_hint)) {
            $params['login_hint'] = $login_hint;
        }

        $endpoint = $this->get_authorization_endpoint();
        if (empty($endpoint)) {
            return '';
        }

        return add_query_arg($params, $endpoint);
    }

    public function exchange_code_for_tokens(string $code, string $redirect_uri): array
    {
        $endpoint = $this->get_token_endpoint();
        if (empty($endpoint)) {
            return ['error' => 'token_endpoint_not_configured'];
        }

        $args = [
            'method' => 'POST',
            'timeout' => 30,
            'headers' => [
                'Content-Type' => 'application/x-www-form-urlencoded',
                'Accept' => 'application/json',
            ],
            'body' => [
                'grant_type' => 'authorization_code',
                'code' => $code,
                'redirect_uri' => $redirect_uri,
                'client_id' => $this->client_id,
                'client_secret' => $this->client_secret,
            ],
        ];

        $response = wp_remote_request($endpoint, $args);

        if (is_wp_error($response)) {
            $this->log_error('token_exchange_failed', $response->get_error_message());
            return ['error' => 'token_exchange_failed', 'error_description' => $response->get_error_message()];
        }

        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);

        if (isset($data['error'])) {
            $this->log_error('token_exchange_error', $data['error_description'] ?? $data['error']);
            return $data;
        }

        return $this->validate_and_decode_tokens($data);
    }

    public function refresh_token(string $refresh_token): array
    {
        $endpoint = $this->get_token_endpoint();
        if (empty($endpoint)) {
            return ['error' => 'token_endpoint_not_configured'];
        }

        $args = [
            'method' => 'POST',
            'timeout' => 30,
            'headers' => [
                'Content-Type' => 'application/x-www-form-urlencoded',
                'Accept' => 'application/json',
            ],
            'body' => [
                'grant_type' => 'refresh_token',
                'refresh_token' => $refresh_token,
                'client_id' => $this->client_id,
                'client_secret' => $this->client_secret,
            ],
        ];

        $response = wp_remote_request($endpoint, $args);

        if (is_wp_error($response)) {
            $this->log_error('token_refresh_failed', $response->get_error_message());
            return ['error' => 'token_refresh_failed'];
        }

        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);

        if (isset($data['error'])) {
            return $data;
        }

        return $this->validate_and_decode_tokens($data);
    }

    public function get_userinfo(string $access_token): array
    {
        $endpoint = $this->get_userinfo_endpoint();
        if (empty($endpoint)) {
            return ['error' => 'userinfo_endpoint_not_configured'];
        }

        $response = wp_remote_get($endpoint, [
            'timeout' => 15,
            'headers' => [
                'Authorization' => 'Bearer ' . $access_token,
                'Accept' => 'application/json',
            ],
        ]);

        if (is_wp_error($response)) {
            $this->log_error('userinfo_fetch_failed', $response->get_error_message());
            return ['error' => 'userinfo_fetch_failed'];
        }

        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);

        if (empty($data)) {
            return ['error' => 'invalid_userinfo_response'];
        }

        return $this->sanitize_userinfo($data);
    }

    public function validate_id_token(string $id_token): array
    {
        $parts = explode('.', $id_token);
        if (count($parts) !== 3) {
            return ['error' => 'invalid_token_format'];
        }

        $payload = json_decode(base64_decode(strtr($parts[1], '-_', '+/')), true);
        if (!$payload) {
            return ['error' => 'invalid_token_payload'];
        }

        if (isset($payload['exp']) && $payload['exp'] < time()) {
            return ['error' => 'token_expired'];
        }

        if (isset($payload['iss'])) {
            $expected_issuer = $this->get_issuer();
            if ($payload['iss'] !== $expected_issuer) {
                $this->log_error('issuer_mismatch', "expected: $expected_issuer, got: " . $payload['iss']);
                return ['error' => 'invalid_token_issuer'];
            }
        }

        if (isset($payload['aud'])) {
            $audiences = is_array($payload['aud']) ? $payload['aud'] : [$payload['aud']];
            if (!in_array($this->client_id, $audiences, true)) {
                $this->log_error('audience_mismatch', print_r($audiences, true));
                return ['error' => 'invalid_token_audience'];
            }
        }

        return [
            'valid' => true,
            'payload' => $payload,
        ];
    }

    public function get_jwks(): array
    {
        if ($this->jwks !== null) {
            return $this->jwks;
        }

        $jwks_uri = $this->get_jwks_uri();
        if (empty($jwks_uri)) {
            return [];
        }

        $response = wp_remote_get($jwks_uri, [
            'timeout' => 15,
            'headers' => ['Accept' => 'application/json'],
        ]);

        if (is_wp_error($response)) {
            $this->log_error('jwks_fetch_failed', $response->get_error_message());
            return [];
        }

        $body = wp_remote_retrieve_body($response);
        $this->jwks = json_decode($body, true);

        return $this->jwks ?? [];
    }

    public function logout(string $id_token, string $redirect_uri = ''): string
    {
        $endpoint = $this->get_logout_endpoint();
        if (empty($endpoint)) {
            return '';
        }

        $params = [
            'id_token_hint' => $id_token,
            'client_id' => $this->client_id,
        ];

        if (!empty($redirect_uri)) {
            $params['post_logout_redirect_uri'] = $redirect_uri;
        }

        return add_query_arg($params, $endpoint);
    }

    public function test_connection(): array
    {
        if (!$this->is_configured()) {
            return [
                'success' => false,
                'message' => 'Plugin is not configured',
            ];
        }

        $discovery = $this->get_discovery_document();
        if (empty($discovery)) {
            return [
                'success' => false,
                'message' => 'Cannot fetch OIDC discovery document',
            ];
        }

        return [
            'success' => true,
            'message' => 'Connection successful',
            'endpoints' => [
                'authorization' => $discovery['authorization_endpoint'] ?? '',
                'token' => $discovery['token_endpoint'] ?? '',
                'userinfo' => $discovery['userinfo_endpoint'] ?? '',
                'logout' => $discovery['end_session_endpoint'] ?? '',
            ],
        ];
    }

    private function validate_and_decode_tokens(array $token_data): array
    {
        $access_token = $token_data['access_token'] ?? '';
        $id_token = $token_data['id_token'] ?? '';
        $refresh_token = $token_data['refresh_token'] ?? '';

        if (!empty($id_token)) {
            $validation = $this->validate_id_token($id_token);
            if (isset($validation['error'])) {
                $this->log_error('id_token_validation_failed', $validation['error']);
                return ['error' => 'invalid_id_token'];
            }
        }

        return [
            'access_token' => $access_token,
            'id_token' => $id_token,
            'refresh_token' => $refresh_token,
            'expires_in' => $token_data['expires_in'] ?? 0,
            'token_type' => $token_data['token_type'] ?? 'Bearer',
            'expires_at' => !empty($token_data['expires_in']) ? time() + (int)$token_data['expires_in'] : 0,
        ];
    }

    private function sanitize_userinfo(array $userinfo): array
    {
        return [
            'sub' => sanitize_text_field($userinfo['sub'] ?? ''),
            'name' => sanitize_text_field($userinfo['name'] ?? ''),
            'given_name' => sanitize_text_field($userinfo['given_name'] ?? ''),
            'family_name' => sanitize_text_field($userinfo['family_name'] ?? ''),
            'preferred_username' => sanitize_text_field($userinfo['preferred_username'] ?? ''),
            'email' => sanitize_email($userinfo['email'] ?? ''),
            'email_verified' => (bool)($userinfo['email_verified'] ?? false),
            'picture' => esc_url_raw($userinfo['picture'] ?? ''),
            'roles' => $this->sanitize_roles($userinfo['roles'] ?? $userinfo['realm_access']['roles'] ?? []),
        ];
    }

    private function sanitize_roles(array $roles): array
    {
        return array_map('sanitize_text_field', array_filter($roles, 'is_string'));
    }

    private function log_error(string $code, string $message): void
    {
        if (get_option('saaos_keycloak_debug_mode', '0') === '1') {
            error_log(sprintf(
                '[SAAOS Keycloak] [%s] %s',
                $code,
                $message
            ));
        }
    }

    public function clear_cache(): void
    {
        $this->discovery_document = null;
        $this->jwks = null;
        delete_transient(self::TRANSIENT_CACHE_KEY);
    }
}
