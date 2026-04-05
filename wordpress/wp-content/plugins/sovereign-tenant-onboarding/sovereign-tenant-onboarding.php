<?php
/**
 * Plugin Name: Sovereign Tenant Onboarding
 * Description: Tenant/workspace registration form and CPT creation.
 * Version: 1.0.0
 */
if (!defined('ABSPATH')) exit;

final class Sovereign_Tenant_Onboarding {
    public function __construct() {
        add_shortcode('sovereign_tenant_signup', [$this, 'render_shortcode']);
        add_action('admin_post_nopriv_sovereign_tenant_signup', [$this, 'handle_submission']);
        add_action('admin_post_sovereign_tenant_signup', [$this, 'handle_submission']);
    }

    public function render_shortcode(): string {
        ob_start(); ?>
        <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
            <input type="hidden" name="action" value="sovereign_tenant_signup">
            <?php wp_nonce_field('sovereign_tenant_signup'); ?>
            <p><label>Company Name<br><input type="text" name="company_name" required></label></p>
            <p><label>Contact Email<br><input type="email" name="contact_email" required></label></p>
            <p><label>Workspace Slug<br><input type="text" name="workspace_slug" required></label></p>
            <p><button type="submit">Create Workspace</button></p>
        </form>
        <?php
        return (string) ob_get_clean();
    }

    public function handle_submission(): void {
        check_admin_referer('sovereign_tenant_signup');
        $post_id = wp_insert_post([
            'post_type' => 'sovereign_workspace',
            'post_title' => sanitize_text_field($_POST['company_name'] ?? ''),
            'post_status' => 'publish',
            'meta_input' => [
                'contact_email' => sanitize_email($_POST['contact_email'] ?? ''),
                'workspace_slug' => sanitize_title($_POST['workspace_slug'] ?? '')
            ]
        ]);
        wp_safe_redirect(add_query_arg(['workspace_created' => (int) $post_id], home_url('/')));
        exit;
    }
}
new Sovereign_Tenant_Onboarding();
