<?php
if (!defined('ABSPATH')) exit;

class SAAOS_Analytics_Token_Manager {
    private string $option_key = 'saaos_analytics_embed_tokens';
    private int $token_expiry = HOUR_IN_SECONDS;
    private string $encryption_key;

    public function __construct() {
        $this->encryption_key = $this->get_encryption_key();
    }

    public function generate_embed_token(string $widget, int $expiry = null): string {
        $expiry = $expiry ?? $this->token_expiry;

        $token_data = [
            'widget' => $widget,
            'blog_id' => get_current_blog_id(),
            'created' => time(),
            'expires' => time() + $expiry,
            'random' => wp_generate_password(16, false)
        ];

        $encoded = base64_encode(wp_json_encode($token_data));
        $signature = $this->generate_signature($encoded);
        $token = $encoded . '.' . $signature;

        $this->store_token($token, $token_data);

        return $token;
    }

    public function validate_embed_token(string $token, string $widget): bool {
        if (empty($token)) {
            return false;
        }

        $parts = explode('.', $token);

        if (count($parts) !== 2) {
            return false;
        }

        list($encoded, $signature) = $parts;

        if (!$this->verify_signature($encoded, $signature)) {
            return false;
        }

        $data = json_decode(base64_decode($encoded), true);

        if (!$data) {
            return false;
        }

        if ($data['widget'] !== $widget) {
            return false;
        }

        if ($data['blog_id'] !== get_current_blog_id()) {
            return false;
        }

        if (isset($data['expires']) && $data['expires'] < time()) {
            $this->revoke_token($token);
            return false;
        }

        return true;
    }

    public function revoke_token(string $token): bool {
        $tokens = $this->get_stored_tokens();

        unset($tokens[$token]);

        return update_option($this->option_key, $tokens);
    }

    public function revoke_expired_tokens(): int {
        $tokens = $this->get_stored_tokens();
        $now = time();
        $revoked = 0;

        foreach ($tokens as $token => $data) {
            if (isset($data['expires']) && $data['expires'] < $now) {
                unset($tokens[$token]);
                $revoked++;
            }
        }

        update_option($this->option_key, $tokens);

        return $revoked;
    }

    public function get_token_info(string $token): ?array {
        $tokens = $this->get_stored_tokens();

        return $tokens[$token] ?? null;
    }

    public function generate_api_token(string $label, int $expiry = null): string {
        $expiry = $expiry ?? YEAR_IN_SECONDS;

        $api_token = sprintf(
            'saaos_%s_%s',
            wp_generate_password(32, false),
            bin2hex(random_bytes(16))
        );

        $token_data = [
            'label' => sanitize_text_field($label),
            'token' => $api_token,
            'created' => time(),
            'expires' => time() + $expiry,
            'type' => 'api'
        ];

        $settings = get_option($this->option_key, []);
        $settings['api_tokens'] = $settings['api_tokens'] ?? [];
        $settings['api_tokens'][md5($api_token)] = $token_data;

        update_option($this->option_key, $settings);

        return $api_token;
    }

    public function validate_api_token(string $api_token): bool {
        $settings = get_option($this->option_key, []);
        $api_tokens = $settings['api_tokens'] ?? [];

        $token_hash = md5($api_token);

        if (!isset($api_tokens[$token_hash])) {
            return false;
        }

        $token_data = $api_tokens[$token_hash];

        if (isset($token_data['expires']) && $token_data['expires'] < time()) {
            unset($api_tokens[$token_hash]);
            update_option($this->option_key, $settings);
            return false;
        }

        return true;
    }

    public function revoke_api_token(string $api_token): bool {
        $settings = get_option($this->option_key, []);
        $token_hash = md5($api_token);

        if (!isset($settings['api_tokens'][$token_hash])) {
            return false;
        }

        unset($settings['api_tokens'][$token_hash]);

        return update_option($this->option_key, $settings);
    }

    public function get_api_tokens(): array {
        $settings = get_option($this->option_key, []);
        return $settings['api_tokens'] ?? [];
    }

    private function store_token(string $token, array $data): void {
        $tokens = $this->get_stored_tokens();
        $tokens[$token] = $data;

        if (count($tokens) > 1000) {
            $this->cleanup_old_tokens($tokens);
        }

        update_option($this->option_key, $tokens);
    }

    private function get_stored_tokens(): array {
        return get_option($this->option_key, []);
    }

    private function cleanup_old_tokens(array &$tokens): void {
        $now = time();
        $keep = [];

        foreach ($tokens as $token => $data) {
            if (isset($data['expires']) && $data['expires'] > $now) {
                $keep[$token] = $data;
            }
        }

        if (count($keep) < 500) {
            $keep = array_slice($tokens, -500, 500, true);
        }

        $tokens = $keep;
    }

    private function generate_signature(string $data): string {
        return hash_hmac('sha256', $data, $this->encryption_key);
    }

    private function verify_signature(string $data, string $signature): bool {
        $expected = $this->generate_signature($data);

        return hash_equals($expected, $signature);
    }

    private function get_encryption_key(): string {
        $settings = get_option('saaos_analytics_embed_settings', []);

        if (!empty($settings['encryption_key'])) {
            return $settings['encryption_key'];
        }

        $key = wp_generate_password(64, true);

        $settings['encryption_key'] = $key;
        update_option('saaos_analytics_embed_settings', $settings);

        return $key;
    }
}
