<?php
/**
 * Login Template
 * 
 * Custom login template for Keycloak SSO
 */

declare(strict_types=1);

if (!defined('ABSPATH')) {
    exit;
}

$redirect_to = isset($_REQUEST['redirect_to']) ? $_REQUEST['redirect_to'] : admin_url();
?>
<div class="saaos-keycloak-login-container">
    <div class="saaos-keycloak-login-box">
        <h2><?php esc_html_e('Sign In', 'saaos-keycloak-identity'); ?></h2>
        
        <?php Auth_Handler::render_error_message(); ?>

        <div class="saaos-keycloak-sso-section">
            <a href="<?php echo esc_url(add_query_arg([
                'keycloak' => 'login',
                'redirect_to' => urlencode($redirect_to),
                '_wpnonce' => wp_create_nonce('saaos_keycloak_auth'),
            ], wp_login_url())); ?>" class="saaos-keycloak-sso-button">
                <span class="saaos-keycloak-icon">🔐</span>
                <?php esc_html_e('Login with Keycloak', 'saaos-keycloak-identity'); ?>
            </a>
        </div>

        <div class="saaos-keycloak-divider">
            <span><?php esc_html_e('or', 'saaos-keycloak-identity'); ?></span>
        </div>

        <div class="saaos-keycloak-traditional">
            <p><a href="<?php echo esc_url(wp_login_url()); ?>">
                <?php esc_html_e('Login with username and password', 'saaos-keycloak-identity'); ?>
            </a></p>
        </div>
    </div>

    <div class="saaos-keycloak-register-box">
        <h3><?php esc_html_e('New to the platform?', 'saaos-keycloak-identity'); ?></h3>
        <a href="<?php echo esc_url(add_query_arg([
            'keycloak' => 'register',
            'redirect_to' => urlencode($redirect_to),
            '_wpnonce' => wp_create_nonce('saaos_keycloak_auth'),
        ], wp_registration_url())); ?>" class="button button-primary">
            <?php esc_html_e('Create Account with Keycloak', 'saaos-keycloak-identity'); ?>
        </a>
    </div>
</div>

<style>
.saaos-keycloak-login-container {
    max-width: 500px;
    margin: 50px auto;
    padding: 30px;
    background: #fff;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}
.saaos-keycloak-login-box {
    text-align: center;
}
.saaos-keycloak-sso-button {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    width: 100%;
    padding: 15px 20px;
    background: #00a32a;
    color: #fff;
    border-radius: 4px;
    text-decoration: none;
    font-size: 16px;
    font-weight: 500;
    transition: background 0.2s;
}
.saaos-keycloak-sso-button:hover {
    background: #008a20;
}
.saaos-keycloak-icon {
    font-size: 20px;
}
.saaos-keycloak-divider {
    margin: 25px 0;
    border-top: 1px solid #ddd;
    position: relative;
}
.saaos-keycloak-divider span {
    position: absolute;
    top: -10px;
    left: 50%;
    transform: translateX(-50%);
    background: #fff;
    padding: 0 15px;
    color: #666;
}
.saaos-keycloak-error {
    padding: 12px;
    background: #d63638;
    color: #fff;
    border-radius: 4px;
    margin-bottom: 20px;
}
</style>
