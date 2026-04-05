<?php
/**
 * Plugin Name: Sovereign WP Hooks
 * Description: Captures affiliate clicks and tenant onboarding submissions from WordPress into the Sovereign backend.
 * Version: 1.0.0
 */
if (!defined('ABSPATH')) { exit; }

final class Sovereign_WP_Hooks {
    private string $option_key = 'sovereign_wp_hooks_settings';
    public function __construct() {
        add_action('admin_menu', [$this, 'menu']);
        add_action('admin_init', [$this, 'settings']);
        add_action('init', [$this, 'capture_referral_click']);
        add_action('admin_post_nopriv_sovereign_backend_tenant_apply', [$this, 'tenant_apply']);
        add_action('admin_post_sovereign_backend_tenant_apply', [$this, 'tenant_apply']);
        add_shortcode('sovereign_backend_tenant_form', [$this, 'tenant_form']);
    }
    public function menu(): void { add_options_page('Sovereign WP Hooks', 'Sovereign WP Hooks', 'manage_options', 'sovereign-wp-hooks', [$this, 'page']); }
    public function settings(): void { register_setting('sovereign_wp_hooks_group', $this->option_key, ['type' => 'array', 'sanitize_callback' => [$this, 'sanitize']]); }
    public function sanitize(array $input): array { return ['api_base' => esc_url_raw($input['api_base'] ?? ''), 'tenant_id' => sanitize_text_field($input['tenant_id'] ?? 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'), 'jwt' => sanitize_text_field($input['jwt'] ?? '')]; }
    private function opts(): array { return get_option($this->option_key, []); }
    public function page(): void { $o = $this->opts(); ?>
      <div class="wrap"><h1>Sovereign WP Hooks</h1><form method="post" action="options.php">
      <?php settings_fields('sovereign_wp_hooks_group'); ?>
      <table class="form-table">
        <tr><th>API Base</th><td><input class="regular-text" name="<?php echo esc_attr($this->option_key); ?>[api_base]" value="<?php echo esc_attr($o['api_base'] ?? ''); ?>"></td></tr>
        <tr><th>Tenant ID</th><td><input class="regular-text" name="<?php echo esc_attr($this->option_key); ?>[tenant_id]" value="<?php echo esc_attr($o['tenant_id'] ?? ''); ?>"></td></tr>
        <tr><th>JWT</th><td><input class="regular-text" name="<?php echo esc_attr($this->option_key); ?>[jwt]" value="<?php echo esc_attr($o['jwt'] ?? ''); ?>"></td></tr>
      </table><?php submit_button(); ?></form></div><?php
    }
    private function post_json(string $path, array $body): array {
      $o = $this->opts();
      $response = wp_remote_post(rtrim((string)($o['api_base'] ?? ''), '/') . $path, [
        'headers' => ['Content-Type' => 'application/json', 'Authorization' => 'Bearer ' . ($o['jwt'] ?? ''), 'x-tenant-id' => $o['tenant_id'] ?? '', 'idempotency-key' => wp_generate_uuid4()],
        'body' => wp_json_encode($body),
        'timeout' => 20
      ]);
      if (is_wp_error($response)) return ['error' => $response->get_error_message()];
      return json_decode((string) wp_remote_retrieve_body($response), true) ?: ['error' => 'invalid_response'];
    }
    public function capture_referral_click(): void {
      if (empty($_GET['ref']) || !is_string($_GET['ref'])) return;
      $ref = sanitize_text_field(wp_unslash($_GET['ref']));
      setcookie('sovereign_ref', $ref, time() + MONTH_IN_SECONDS, COOKIEPATH ?: '/');
      $_COOKIE['sovereign_ref'] = $ref;
      $this->post_json('/api/referrals/click', ['refCode' => $ref, 'sessionId' => wp_generate_uuid4(), 'landingUrl' => home_url(add_query_arg([], $_SERVER['REQUEST_URI'] ?? '/')), 'userAgent' => $_SERVER['HTTP_USER_AGENT'] ?? '']);
    }
    public function tenant_form(): string {
      ob_start(); ?>
      <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
        <input type="hidden" name="action" value="sovereign_backend_tenant_apply">
        <?php wp_nonce_field('sovereign_backend_tenant_apply'); ?>
        <p><label>Company Name<br><input type="text" name="company_name" required></label></p>
        <p><label>Contact Email<br><input type="email" name="contact_email" required></label></p>
        <p><label>Requested Slug<br><input type="text" name="requested_slug" required></label></p>
        <p><button type="submit">Apply</button></p>
      </form>
      <?php return (string) ob_get_clean();
    }
    public function tenant_apply(): void {
      check_admin_referer('sovereign_backend_tenant_apply');
      $result = $this->post_json('/api/tenants/apply', ['companyName' => sanitize_text_field($_POST['company_name'] ?? ''), 'contactEmail' => sanitize_email($_POST['contact_email'] ?? ''), 'requestedSlug' => sanitize_title($_POST['requested_slug'] ?? '')]);
      wp_safe_redirect(add_query_arg(['sovereign_tenant_apply' => isset($result['id']) ? 'ok' : 'failed'], wp_get_referer() ?: home_url('/')));
      exit;
    }
}
new Sovereign_WP_Hooks();
