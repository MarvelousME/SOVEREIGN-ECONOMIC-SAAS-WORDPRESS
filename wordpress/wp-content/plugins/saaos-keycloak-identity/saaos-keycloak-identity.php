<?php
/**
 * Plugin Name: SAAOS Keycloak Identity Provider
 * Plugin URI: https://github.com/sovereign-econ-saas/saaos-keycloak-identity
 * Description: Keycloak OIDC integration for WordPress - enables SSO with Keycloak identity provider
 * Version: 1.0.0
 * Author: Sovereign Economic SaaS
 * Author URI: https://sovereign-econ-saas.com
 * License: GPL v2 or later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: saaos-keycloak-identity
 * Domain Path: /languages
 * Requires at least: 5.8
 * Requires PHP: 7.4
 */

declare(strict_types=1);

namespace SAAOS\Keycloak;

if (!defined('ABSPATH')) {
    exit;
}

define('SAAOS_KEYCLOAK_VERSION', '1.0.0');
define('SAAOS_KEYCLOAK_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('SAAOS_KEYCLOAK_PLUGIN_URL', plugin_dir_url(__FILE__));
define('SAAOS_KEYCLOAK_PLUGIN_BASENAME', plugin_basename(__FILE__));

require_once SAAOS_KEYCLOAK_PLUGIN_DIR . 'includes/class-keycloak-client.php';
require_once SAAOS_KEYCLOAK_PLUGIN_DIR . 'includes/class-role-mapper.php';
require_once SAAOS_KEYCLOAK_PLUGIN_DIR . 'includes/class-session-manager.php';
require_once SAAOS_KEYCLOAK_PLUGIN_DIR . 'includes/class-auth-handler.php';
require_once SAAOS_KEYCLOAK_PLUGIN_DIR . 'includes/class-admin-settings.php';
require_once SAAOS_KEYCLOAK_PLUGIN_DIR . 'admin/class-admin.php';
require_once SAAOS_KEYCLOAK_PLUGIN_DIR . 'public/class-public.php';

final class SAAOS_Keycloak_Identity
{
    private static ?self $instance = null;
    
    private Keycloak_Client $client;
    private Role_Mapper $role_mapper;
    private Session_Manager $session_manager;
    private Auth_Handler $auth_handler;
    private Admin_Settings $admin_settings;
    private Admin $admin;
    private Public_Interface $public;

    public static function get_instance(): self
    {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    private function __construct()
    {
        $this->init_components();
        $this->init_hooks();
    }

    private function init_components(): void
    {
        $this->client = new Keycloak_Client();
        $this->role_mapper = new Role_Mapper();
        $this->session_manager = new Session_Manager();
        $this->auth_handler = new Auth_Handler(
            $this->client,
            $this->role_mapper,
            $this->session_manager
        );
        $this->admin_settings = new Admin_Settings($this->client);
        $this->admin = new Admin($this->admin_settings, $this->role_mapper);
        $this->public = new Public_Interface($this->auth_handler);
    }

    private function init_hooks(): void
    {
        add_action('plugins_loaded', [$this, 'load_textdomain']);
        add_action('init', [$this, 'register_rewrite_rules']);
        add_filter('query_vars', [$this, 'add_query_vars']);
        
        $this->auth_handler->init();
        $this->admin->init();
        $this->public->init();
    }

    public function load_textdomain(): void
    {
        load_plugin_textdomain(
            'saaos-keycloak-identity',
            false,
            dirname(SAAOS_KEYCLOAK_PLUGIN_BASENAME) . '/languages'
        );
    }

    public function register_rewrite_rules(): void
    {
        add_rewrite_rule(
            '^keycloak/login/?$',
            'index.php?keycloak=login',
            'top'
        );
        add_rewrite_rule(
            '^keycloak/register/?$',
            'index.php?keycloak=register',
            'top'
        );
        add_rewrite_rule(
            '^keycloak/callback/?$',
            'index.php?keycloak=callback',
            'top'
        );
        add_rewrite_rule(
            '^keycloak/logout/?$',
            'index.php?keycloak=logout',
            'top'
        );
    }

    public function add_query_vars(array $vars): array
    {
        $vars[] = 'keycloak';
        return $vars;
    }

    public function get_client(): Keycloak_Client
    {
        return $this->client;
    }

    public function get_role_mapper(): Role_Mapper
    {
        return $this->role_mapper;
    }

    public function get_session_manager(): Session_Manager
    {
        return $this->session_manager;
    }

    public function get_auth_handler(): Auth_Handler
    {
        return $this->auth_handler;
    }

    public static function activate(): void
    {
        self::get_instance();
        self::register_rewrite_rules();
        flush_rewrite_rules();
        
        $default_options = [
            'saaos_keycloak_enabled' => '1',
            'saaos_keycloak_default_role' => 'subscriber',
            'saaos_keycloak_debug_mode' => '0',
        ];
        
        foreach ($default_options as $key => $value) {
            if (get_option($key) === false) {
                add_option($key, $value);
            }
        }
        
        set_transient('saaos_keycloak_activated', true, 30);
    }

    public static function deactivate(): void
    {
        flush_rewrite_rules();
        wp_clear_scheduled_hook('saaos_keycloak_token_refresh');
    }

    public static function uninstall(): void
    {
        $options = [
            'saaos_keycloak_server_url',
            'saaos_keycloak_realm',
            'saaos_keycloak_client_id',
            'saaos_keycloak_client_secret',
            'saaos_keycloak_enabled',
            'saaos_keycloak_default_role',
            'saaos_keycloak_role_mapping',
            'saaos_keycloak_debug_mode',
            'saaos_keycloak_redirect_after_login',
            'saaos_keycloak_redirect_after_logout',
        ];
        
        foreach ($options as $option) {
            delete_option($option);
        }
        
        delete_transient('saaos_keycloak_activated');
        delete_transient('saaos_keycloak_discovery_cache');
    }
}

register_activation_hook(__FILE__, ['SAAOS_Keycloak_Identity', 'activate']);
register_deactivation_hook(__FILE__, ['SAAOS_Keycloak_Identity', 'deactivate']);
register_uninstall_hook(__FILE__, ['SAAOS_Keycloak_Identity', 'uninstall']);

add_action('plugins_loaded', ['SAAOS_Keycloak_Identity', 'get_instance'], 0);
