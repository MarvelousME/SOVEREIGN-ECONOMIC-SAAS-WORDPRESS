<?php
/**
 * Public Interface
 */

declare(strict_types=1);

namespace SAAOS\Keycloak;

final class Public_Interface
{
    private Auth_Handler $auth_handler;

    public function __construct(Auth_Handler $auth_handler)
    {
        $this->auth_handler = $auth_handler;
    }

    public function init(): void
    {
        add_action('template_redirect', [$this, 'handle_template_redirect']);
        add_action('login_form', [$this, 'render_login_buttons']);
        
        add_shortcode('saaos_keycloak_login', [$this, 'shortcode_login']);
        add_shortcode('saaos_keycloak_register', [$this, 'shortcode_register']);
        
        add_action('wp_enqueue_scripts', [$this, 'enqueue_assets']);
    }

    public function handle_template_redirect(): void
    {
        if (!isset($_GET['keycloak'])) {
            return;
        }

        $action = sanitize_text_field($_GET['keycloak']);

        if ($action === 'login' || $action === 'register') {
            auth_redirect();
        }
    }

    public function render_login_buttons(): void
    {
        if (!get_option('saaos_keycloak_enabled', '1')) {
            return;
        }

        $redirect_to = isset($_REQUEST['redirect_to']) ? $_REQUEST['redirect_to'] : '';
        
        $this->auth_handler->render_login_button($redirect_to);
        $this->auth_handler->render_register_button($redirect_to);
        
        Auth_Handler::render_error_message();
    }

    public function shortcode_login(array $atts): string
    {
        $atts = shortcode_atts([
            'redirect_to' => '',
            'button_text' => __('Login with Keycloak', 'saaos-keycloak-identity'),
        ], $atts, 'saaos_keycloak_login');

        if (!get_option('saaos_keycloak_enabled', '1')) {
            return '';
        }

        $args = [
            'keycloak' => 'login',
            '_wpnonce' => wp_create_nonce('saaos_keycloak_auth'),
        ];
        if ($atts['redirect_to'] !== '') {
            $args['redirect_to'] = $atts['redirect_to'];
        }
        $url = add_query_arg($args, wp_login_url());

        return sprintf(
            '<a href="%s" class="saaos-keycloak-login-btn button">%s</a>',
            esc_url($url),
            esc_html($atts['button_text'])
        );
    }

    public function shortcode_register(array $atts): string
    {
        $atts = shortcode_atts([
            'redirect_to' => '',
            'button_text' => __('Register with Keycloak', 'saaos-keycloak-identity'),
        ], $atts, 'saaos_keycloak_register');

        if (!get_option('saaos_keycloak_enabled', '1')) {
            return '';
        }

        $args = [
            'keycloak' => 'register',
            '_wpnonce' => wp_create_nonce('saaos_keycloak_auth'),
        ];
        if ($atts['redirect_to'] !== '') {
            $args['redirect_to'] = $atts['redirect_to'];
        }
        $url = add_query_arg($args, wp_registration_url());

        return sprintf(
            '<a href="%s" class="saaos-keycloak-register-btn button">%s</a>',
            esc_url($url),
            esc_html($atts['button_text'])
        );
    }

    public function enqueue_assets(): void
    {
        if (!is_login_page() && !is_page(['login', 'register'])) {
            return;
        }

        wp_enqueue_style(
            'saaos-keycloak-login',
            SAAOS_KEYCLOAK_PLUGIN_URL . 'assets/css/login.css',
            [],
            SAAOS_KEYCLOAK_VERSION
        );

        wp_enqueue_script(
            'saaos-keycloak-login',
            SAAOS_KEYCLOAK_PLUGIN_URL . 'assets/js/login.js',
            ['jquery'],
            SAAOS_KEYCLOAK_VERSION,
            true
        );
    }
}
