<?php
/**
 * Plugin Name: Sovereign IAM UX
 * Description: Site-wide auth bar, Keycloak modal sign-in/register, and landing redirect alignment for Sovereign Economic SaaS.
 * Version: 1.0.0
 * Requires at least: 5.8
 * Requires PHP: 7.4
 */

declare(strict_types=1);

if (!defined('ABSPATH')) {
    exit;
}

define('SOVEREIGN_IAM_UX_VERSION', '1.0.0');
define('SOVEREIGN_IAM_UX_DIR', plugin_dir_path(__FILE__));
define('SOVEREIGN_IAM_UX_URL', plugin_dir_url(__FILE__));

final class Sovereign_IAM_UX
{
    private const OPTION_LANDING = 'sovereign_iam_ux_landing_url';

    private static bool $auth_bar_rendered = false;

    public static function init(): void
    {
        $plugin = new self();
        add_action('wp_enqueue_scripts', [$plugin, 'enqueue'], 20);
        add_action('wp_body_open', [$plugin, 'render_auth_bar'], 5);
        add_action('wp_footer', [$plugin, 'maybe_render_auth_bar_footer'], 1);
        add_action('wp_footer', [$plugin, 'render_modal'], 5);
        add_action('wp_head', [$plugin, 'maybe_landing_meta_description'], 3);
        add_action('wp_head', [$plugin, 'maybe_output_landing_schema'], 99);
        add_filter('saaos_keycloak_post_logout_redirect_uri', [$plugin, 'filter_post_logout_uri'], 10, 1);
        add_filter('body_class', [$plugin, 'body_class']);
        add_filter('document_title_parts', [$plugin, 'filter_landing_document_title'], 20);
    }

    public function filter_post_logout_uri(string $uri): string
    {
        $landing = get_option(self::OPTION_LANDING, '');
        if (is_string($landing) && $landing !== '') {
            $v = wp_validate_redirect($landing, false);
            if (is_string($v) && $v !== '') {
                return $v;
            }
        }
        return $uri;
    }

    private static function keycloak_enabled(): bool
    {
        return get_option('saaos_keycloak_enabled', '1') === '1'
            && class_exists(\SAAOS\Keycloak\Auth_Handler::class);
    }

    /**
     * Show "Create account" / register tab when Keycloak handles signup or WP allows registration.
     */
    private static function show_register_ui(): bool
    {
        if (self::keycloak_enabled()) {
            return true;
        }

        return (bool) get_option('users_can_register');
    }

    private static function page_has_saas_landing_shortcode(): bool
    {
        if (!is_singular()) {
            return false;
        }
        $post = get_post();

        return $post && has_shortcode((string) $post->post_content, 'sovereign_saas_landing');
    }

    private static function seo_plugin_handles_meta(): bool
    {
        return defined('WPSEO_VERSION')
            || defined('RANK_MATH_VERSION')
            || defined('AIOSEO_VERSION')
            || function_exists('seopress_get_service');
    }

    public function maybe_landing_meta_description(): void
    {
        if (!self::page_has_saas_landing_shortcode() || self::seo_plugin_handles_meta()) {
            return;
        }
        $post = get_post();
        if (!$post) {
            return;
        }
        $raw = has_excerpt($post) ? get_the_excerpt($post) : wp_strip_all_tags((string) $post->post_content);
        $desc = wp_html_excerpt($raw, 158, '…');
        $desc = apply_filters('sovereign_iam_ux_landing_meta_description', $desc, $post);
        if ($desc === '') {
            return;
        }
        echo '<meta name="description" content="' . esc_attr($desc) . '">' . "\n";
    }

    /**
     * @param array<string, string> $title_parts
     * @return array<string, string>
     */
    public function filter_landing_document_title(array $title_parts): array
    {
        if (!self::page_has_saas_landing_shortcode() || self::seo_plugin_handles_meta()) {
            return $title_parts;
        }
        $suffix = __('Sovereign Economic SaaS — workspaces, ledger & SSO', 'sovereign-iam-ux');
        $title_parts['title'] = sprintf(
            /* translators: 1: page title, 2: product suffix */
            __('%1$s — %2$s', 'sovereign-iam-ux'),
            get_the_title(),
            $suffix
        );

        return apply_filters('sovereign_iam_ux_landing_document_title_parts', $title_parts);
    }

    private static function redirect_after_auth_url(): string
    {
        if (is_front_page() || is_home()) {
            return home_url('/');
        }
        if (is_singular()) {
            $p = get_permalink();
            return is_string($p) ? $p : home_url('/');
        }
        $canonical = function_exists('wp_get_canonical_url') ? wp_get_canonical_url() : false;
        if (is_string($canonical) && $canonical !== '') {
            return $canonical;
        }
        return home_url('/');
    }

    private static function build_keycloak_login_url(string $redirect_to): string
    {
        $args = [
            'keycloak' => 'login',
            '_wpnonce' => wp_create_nonce('saaos_keycloak_auth'),
        ];
        if ($redirect_to !== '') {
            $args['redirect_to'] = $redirect_to;
        }
        return add_query_arg($args, wp_login_url());
    }

    private static function build_keycloak_register_url(string $redirect_to): string
    {
        $args = [
            'keycloak' => 'register',
            '_wpnonce' => wp_create_nonce('saaos_keycloak_auth'),
        ];
        if ($redirect_to !== '') {
            $args['redirect_to'] = $redirect_to;
        }
        return add_query_arg($args, wp_registration_url());
    }

    public function enqueue(): void
    {
        if (is_admin()) {
            return;
        }

        wp_enqueue_style(
            'sovereign-iam-ux',
            SOVEREIGN_IAM_UX_URL . 'assets/iam-ux.css',
            [],
            SOVEREIGN_IAM_UX_VERSION
        );

        wp_enqueue_script(
            'sovereign-iam-ux',
            SOVEREIGN_IAM_UX_URL . 'assets/iam-ux.js',
            [],
            SOVEREIGN_IAM_UX_VERSION,
            true
        );

        $kc = self::keycloak_enabled();
        $show_register = self::show_register_ui();
        $return = self::redirect_after_auth_url();
        $return = wp_validate_redirect($return, home_url('/'));

        wp_localize_script('sovereign-iam-ux', 'sovereignIamUx', [
            'keycloak' => $kc,
            'showRegisterTab' => $show_register,
            'landingUrl' => esc_url_raw(home_url('/')),
            'returnUrl' => esc_url_raw($return),
            'loginUrl' => $kc ? esc_url_raw(self::build_keycloak_login_url($return)) : esc_url_raw(wp_login_url($return)),
            'registerUrl' => $show_register
                ? ($kc ? esc_url_raw(self::build_keycloak_register_url($return)) : esc_url_raw(wp_registration_url($return)))
                : '',
            'logoutUrl' => esc_url_raw(home_url('/?keycloak=logout')),
            'isLoggedIn' => is_user_logged_in(),
            'displayName' => is_user_logged_in() ? wp_get_current_user()->display_name : '',
            'i18n' => [
                'signIn' => __('Sign in', 'sovereign-iam-ux'),
                'createAccount' => __('Create account', 'sovereign-iam-ux'),
                'signOut' => __('Sign out', 'sovereign-iam-ux'),
                'signedInAs' => __('Signed in as', 'sovereign-iam-ux'),
                'close' => __('Close dialog', 'sovereign-iam-ux'),
                'modalTitle' => __('Access your workspace', 'sovereign-iam-ux'),
                'continueKeycloak' => __('Continue with secure sign-in', 'sovereign-iam-ux'),
                'continueWpLogin' => __('Continue to login', 'sovereign-iam-ux'),
                'continueRegister' => __('Continue to registration', 'sovereign-iam-ux'),
                'keycloakNote' => __('You will complete sign-in at our identity provider (Keycloak). No passwords are stored on this site.', 'sovereign-iam-ux'),
                'wpNote' => __('You will use the standard WordPress login screen.', 'sovereign-iam-ux'),
            ],
        ]);
    }

    public function body_class(array $classes): array
    {
        if (!is_admin()) {
            $classes[] = 'sov-iam-has-bar';
        }
        return $classes;
    }

    public function maybe_render_auth_bar_footer(): void
    {
        if (is_admin() || self::$auth_bar_rendered) {
            return;
        }
        $this->render_auth_bar();
    }

    public function render_auth_bar(): void
    {
        if (is_admin()) {
            return;
        }
        if (self::$auth_bar_rendered) {
            return;
        }
        self::$auth_bar_rendered = true;

        $skip_id = apply_filters('sovereign_iam_ux_skip_target', 'pxl-content-main');
        echo '<a class="sov-iam-skip" href="#' . esc_attr($skip_id) . '">' . esc_html__('Skip to content', 'sovereign-iam-ux') . '</a>';
        $show_register = self::show_register_ui();
        ?>
        <div class="sov-iam-bar" role="region" aria-label="<?php esc_attr_e('Account and session', 'sovereign-iam-ux'); ?>">
            <div class="sov-iam-bar__inner">
                <a class="sov-iam-bar__brand" href="<?php echo esc_url(home_url('/')); ?>"><?php bloginfo('name'); ?></a>
                <div class="sov-iam-bar__actions">
                    <?php if (is_user_logged_in()) : ?>
                        <span class="sov-iam-bar__user" id="sov-iam-user-label">
                            <span class="sov-iam-bar__user-prefix"><?php esc_html_e('Signed in as', 'sovereign-iam-ux'); ?></span>
                            <strong class="sov-iam-bar__user-name"><?php echo esc_html(wp_get_current_user()->display_name); ?></strong>
                        </span>
                        <a class="sov-iam-btn sov-iam-btn--ghost" href="<?php echo esc_url(home_url('/?keycloak=logout')); ?>"><?php esc_html_e('Sign out', 'sovereign-iam-ux'); ?></a>
                    <?php else : ?>
                        <button type="button" class="sov-iam-btn sov-iam-btn--ghost" id="sov-iam-open-login" data-sov-iam-open="login"><?php esc_html_e('Sign in', 'sovereign-iam-ux'); ?></button>
                        <?php if ($show_register) : ?>
                        <button type="button" class="sov-iam-btn sov-iam-btn--primary" id="sov-iam-open-register" data-sov-iam-open="register"><?php esc_html_e('Create account', 'sovereign-iam-ux'); ?></button>
                        <?php endif; ?>
                    <?php endif; ?>
                </div>
            </div>
        </div>
        <?php
    }

    public function render_modal(): void
    {
        if (is_admin() || is_user_logged_in()) {
            return;
        }
        $show_register = self::show_register_ui();
        $root_class = 'sov-iam-modal-root' . ($show_register ? '' : ' sov-iam-modal-root--login-only');
        ?>
        <div class="<?php echo esc_attr($root_class); ?>" id="sov-iam-modal-root" hidden data-sov-iam-modal>
            <div class="sov-iam-modal__backdrop" data-sov-iam-close tabindex="-1" aria-hidden="true"></div>
            <div class="sov-iam-modal" role="dialog" aria-modal="true" aria-labelledby="sov-iam-modal-title" tabindex="-1">
                <div class="sov-iam-modal__header">
                    <h2 id="sov-iam-modal-title" class="sov-iam-modal__title"><?php esc_html_e('Access your workspace', 'sovereign-iam-ux'); ?></h2>
                    <button type="button" class="sov-iam-modal__close" data-sov-iam-close aria-label="<?php esc_attr_e('Close dialog', 'sovereign-iam-ux'); ?>">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                    </button>
                </div>
                <?php if ($show_register) : ?>
                <div class="sov-iam-modal__tabs" role="tablist" aria-label="<?php esc_attr_e('Sign-in options', 'sovereign-iam-ux'); ?>">
                    <button type="button" role="tab" id="sov-iam-tab-login" class="sov-iam-tab is-active" aria-selected="true" aria-controls="sov-iam-panel-login" data-sov-iam-tab="login"><?php esc_html_e('Sign in', 'sovereign-iam-ux'); ?></button>
                    <button type="button" role="tab" id="sov-iam-tab-register" class="sov-iam-tab" aria-selected="false" aria-controls="sov-iam-panel-register" data-sov-iam-tab="register"><?php esc_html_e('Create account', 'sovereign-iam-ux'); ?></button>
                </div>
                <?php endif; ?>
                <div id="sov-iam-panel-login" role="tabpanel" <?php echo $show_register ? 'aria-labelledby="sov-iam-tab-login"' : ''; ?> class="sov-iam-panel" data-sov-iam-panel="login">
                    <p class="sov-iam-modal__lead" data-sov-iam-note-login></p>
                    <a class="sov-iam-btn sov-iam-btn--primary sov-iam-btn--block" id="sov-iam-link-login" href="#"><?php esc_html_e('Continue with secure sign-in', 'sovereign-iam-ux'); ?></a>
                </div>
                <?php if ($show_register) : ?>
                <div id="sov-iam-panel-register" role="tabpanel" aria-labelledby="sov-iam-tab-register" class="sov-iam-panel is-hidden" hidden data-sov-iam-panel="register">
                    <p class="sov-iam-modal__lead" data-sov-iam-note-register></p>
                    <a class="sov-iam-btn sov-iam-btn--primary sov-iam-btn--block" id="sov-iam-link-register" href="#"><?php esc_html_e('Continue to registration', 'sovereign-iam-ux'); ?></a>
                </div>
                <?php endif; ?>
            </div>
        </div>
        <?php
    }

    public function maybe_output_landing_schema(): void
    {
        if (!self::page_has_saas_landing_shortcode()) {
            return;
        }
        $post = get_post();
        if (!$post) {
            return;
        }
        $url = get_permalink($post);
        $name = get_bloginfo('name');
        $desc = wp_strip_all_tags(get_the_excerpt($post) ?: (string) $post->post_content);
        $desc = wp_html_excerpt($desc, 300, '…');
        $schema = [
            '@context' => 'https://schema.org',
            '@graph' => [
                [
                    '@type' => 'WebPage',
                    '@id' => $url . '#webpage',
                    'name' => get_the_title($post),
                    'url' => $url,
                    'description' => $desc,
                    'isPartOf' => ['@id' => home_url('/') . '#website'],
                ],
                [
                    '@type' => 'WebSite',
                    '@id' => home_url('/') . '#website',
                    'name' => $name,
                    'url' => home_url('/'),
                    'publisher' => ['@id' => home_url('/') . '#org'],
                ],
                [
                    '@type' => 'Organization',
                    '@id' => home_url('/') . '#org',
                    'name' => $name,
                    'url' => home_url('/'),
                ],
                [
                    '@type' => 'SoftwareApplication',
                    'name' => $name . ' — Sovereign Economic SaaS',
                    'applicationCategory' => 'BusinessApplication',
                    'operatingSystem' => 'Web',
                    'offers' => [
                        '@type' => 'Offer',
                        'price' => '0',
                        'priceCurrency' => 'USD',
                    ],
                    'description' => $desc,
                ],
                [
                    '@type' => 'FAQPage',
                    'mainEntity' => [
                        [
                            '@type' => 'Question',
                            'name' => __('How do I sign in to the Sovereign workspace?', 'sovereign-iam-ux'),
                            'acceptedAnswer' => [
                                '@type' => 'Answer',
                                'text' => __('Use Sign in in the top bar to open the secure modal, then continue with Keycloak (OIDC). Your session is validated server-side.', 'sovereign-iam-ux'),
                            ],
                        ],
                        [
                            '@type' => 'Question',
                            'name' => __('What does the platform include?', 'sovereign-iam-ux'),
                            'acceptedAnswer' => [
                                '@type' => 'Answer',
                                'text' => __('Tenant workspaces, task and gamification APIs, affiliate and wallet surfaces, optional digital twin and member presence, and ledger-ready integrations—unified under Nexros with Keycloak IAM.', 'sovereign-iam-ux'),
                            ],
                        ],
                    ],
                ],
            ],
        ];
        echo '<script type="application/ld+json">' . wp_json_encode($schema, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . '</script>' . "\n";
    }
}

register_activation_hook(
    __FILE__,
    static function (): void {
        if (get_option('sovereign_iam_ux_landing_url', '') === '') {
            update_option('sovereign_iam_ux_landing_url', home_url('/'));
        }
    }
);

Sovereign_IAM_UX::init();
