<?php
/**
 * Role Mapper
 * 
 * Maps Keycloak roles to WordPress roles and capabilities
 */

declare(strict_types=1);

namespace SAAOS\Keycloak;

final class Role_Mapper
{
    private const ROLE_MAPPING_OPTION = 'saaos_keycloak_role_mapping';
    private const DEFAULT_ROLE_OPTION = 'saaos_keycloak_default_role';

    private array $default_mappings = [
        'admin' => 'administrator',
        'ubi_admin' => 'administrator',
        'treasury_admin' => 'editor',
        'agent_creator' => 'author',
        'user' => 'subscriber',
    ];

    public function __construct()
    {
        $this->init_default_mapping();
    }

    private function init_default_mapping(): void
    {
        $existing_mapping = get_option(self::ROLE_MAPPING_OPTION);
        if ($existing_mapping === false || empty($existing_mapping)) {
            update_option(self::ROLE_MAPPING_OPTION, $this->default_mappings);
        }
    }

    public function get_role_mapping(): array
    {
        $mapping = get_option(self::ROLE_MAPPING_OPTION, $this->default_mappings);
        if (is_string($mapping)) {
            $mapping = json_decode($mapping, true) ?? $this->default_mappings;
        }
        return $mapping;
    }

    public function set_role_mapping(array $mapping): bool
    {
        $sanitized = [];
        foreach ($mapping as $kc_role => $wp_role) {
            $sanitized[sanitize_text_field($kc_role)] = sanitize_text_field($wp_role);
        }
        return update_option(self::ROLE_MAPPING_OPTION, $sanitized);
    }

    public function get_default_role(): string
    {
        return get_option(self::DEFAULT_ROLE_OPTION, 'subscriber');
    }

    public function set_default_role(string $role): bool
    {
        if (!get_role($role)) {
            return false;
        }
        return update_option(self::DEFAULT_ROLE_OPTION, $role);
    }

    public function map_roles_to_wp_role(array $kc_roles): string
    {
        $mapping = $this->get_role_mapping();
        $default_role = $this->get_default_role();

        if (empty($kc_roles)) {
            return $default_role;
        }

        foreach ($this->get_role_priority() as $priority_role) {
            if (in_array($priority_role, $kc_roles, true)) {
                $wp_role = $mapping[$priority_role] ?? null;
                if ($wp_role && get_role($wp_role)) {
                    return $wp_role;
                }
            }
        }

        foreach ($kc_roles as $kc_role) {
            $wp_role = $mapping[$kc_role] ?? null;
            if ($wp_role && get_role($wp_role)) {
                return $wp_role;
            }
        }

        return $default_role;
    }

    private function get_role_priority(): array
    {
        return [
            'admin',
            'ubi_admin',
            'treasury_admin',
            'agent_creator',
            'user',
        ];
    }

    public function sync_user_roles(int $user_id, array $kc_roles): bool
    {
        $new_role = $this->map_roles_to_wp_role($kc_roles);
        
        $user = get_user_by('id', $user_id);
        if (!$user) {
            return false;
        }

        $current_roles = $user->roles;
        
        if (in_array('administrator', $current_roles, true) && $new_role !== 'administrator') {
            return false;
        }

        foreach ($current_roles as $role) {
            $user->remove_role($role);
        }

        $user->add_role($new_role);

        $this->update_user_capabilities($user_id, $kc_roles);

        return true;
    }

    public function update_user_capabilities(int $user_id, array $kc_roles): void
    {
        $mapping = $this->get_role_mapping();
        $capabilities = [];

        foreach ($kc_roles as $role) {
            $wp_role = $mapping[$role] ?? null;
            if ($wp_role) {
                $role_obj = get_role($wp_role);
                if ($role_obj) {
                    foreach ($role_obj->capabilities as $cap => $granted) {
                        if ($granted) {
                            $capabilities[$cap] = true;
                        }
                    }
                }
            }
        }

        $wp_supplemental_caps = [
            'agent_creator' => 'create_agents',
            'ubi_admin' => 'manage_ubi',
            'treasury_admin' => 'manage_treasury',
        ];

        foreach ($kc_roles as $role) {
            if (isset($wp_supplemental_caps[$role])) {
                $capabilities[$wp_supplemental_caps[$role]] = true;
            }
        }

        foreach ($capabilities as $cap => $granted) {
            if ($granted) {
                $user = get_user_by('id', $user_id);
                if ($user && !$user->has_cap($cap)) {
                    $user->add_cap($cap);
                }
            }
        }

        update_user_meta($user_id, 'saaos_keycloak_roles', $kc_roles);
        update_user_meta($user_id, 'saaos_keycloak_roles_synced', current_time('mysql'));
    }

    public function get_mapped_capabilities(array $kc_roles): array
    {
        $mapping = $this->get_role_mapping();
        $capabilities = [];

        foreach ($kc_roles as $role) {
            $wp_role = $mapping[$role] ?? null;
            if ($wp_role) {
                $role_obj = get_role($wp_role);
                if ($role_obj) {
                    foreach ($role_obj->capabilities as $cap => $granted) {
                        if ($granted) {
                            $capabilities[$cap] = true;
                        }
                    }
                }
            }
        }

        return $capabilities;
    }

    public function apply_role_mapping_filters(string $wp_role, array $kc_roles): string
    {
        return apply_filters('saaos_keycloak_role_mapping', $wp_role, $kc_roles);
    }

    public function validate_role(string $role): bool
    {
        return $role !== 'administrator' && get_role($role) !== null;
    }

    public function get_available_wp_roles(): array
    {
        $editable_roles = get_editable_roles();
        $roles = [];

        foreach ($editable_roles as $role_key => $role_data) {
            if ($role_key !== 'administrator') {
                $roles[$role_key] = translate_user_role($role_data['name']);
            }
        }

        return $roles;
    }

    public function reset_to_defaults(): bool
    {
        $result1 = update_option(self::ROLE_MAPPING_OPTION, $this->default_mappings);
        $result2 = update_option(self::DEFAULT_ROLE_OPTION, 'subscriber');
        return $result1 && $result2;
    }
}
