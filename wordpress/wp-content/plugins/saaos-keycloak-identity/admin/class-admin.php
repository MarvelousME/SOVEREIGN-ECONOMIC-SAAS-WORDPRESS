<?php
/**
 * Admin Interface
 */

declare(strict_types=1);

namespace SAAOS\Keycloak;

final class Admin
{
    private Admin_Settings $settings;
    private Role_Mapper $role_mapper;

    public function __construct(Admin_Settings $settings, Role_Mapper $role_mapper)
    {
        $this->settings = $settings;
        $this->role_mapper = $role_mapper;
    }

    public function init(): void
    {
        $this->settings->init();
        
        add_action('admin_head', [$this, 'admin_css']);
        add_filter('plugin_action_links_' . SAAOS_KEYCLOAK_PLUGIN_BASENAME, [$this, 'plugin_action_links']);
    }

    public function admin_css(): void
    {
        $screen = get_current_screen();
        if (!$screen || strpos($screen->id, 'saaos-keycloak') === false) {
            return;
        }
        ?>
        <style>
            .saaos-keycloak-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin: 20px 0;
                padding: 15px;
                background: #fff;
                border: 1px solid #ccd0d4;
                border-radius: 4px;
            }
            .saaos-status {
                padding: 5px 12px;
                border-radius: 3px;
                font-size: 13px;
                font-weight: 500;
            }
            .saaos-status-active { background: #00a32a; color: #fff; }
            .saaos-status-inactive { background: #f0c33c; color: #000; }
            .saaos-status-unconfigured { background: #d63638; color: #fff; }
            .saaos-keycloak-actions .button { margin-right: 5px; }
            #saaos-keycloak-test-result { margin: 15px 0; }
            #saaos-keycloak-test-result.success { padding: 10px; background: #00a32a20; border-left: 4px solid #00a32a; }
            #saaos-keycloak-test-result.error { padding: 10px; background: #d6363820; border-left: 4px solid #d63638; }
            .saaos-role-mapping-table th { text-align: left; }
            .saaos-role-mapping-table td { padding: 10px 5px; }
            .saaos-role-mapping-table select { min-width: 150px; }
        </style>
        <?php
    }

    public function plugin_action_links(array $links): array
    {
        $settings_link = sprintf(
            '<a href="%s">%s</a>',
            admin_url('admin.php?page=saaos-keycloak-settings'),
            esc_html__('Settings', 'saaos-keycloak-identity')
        );
        
        array_unshift($links, $settings_link);
        
        return $links;
    }
}
