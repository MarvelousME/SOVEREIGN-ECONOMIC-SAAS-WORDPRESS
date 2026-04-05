<?php

if (!defined('ABSPATH'))
    exit; // Exit if accessed directly

class Pxl_El_Template_Library
{
    private static $_instance = null;
    public function __construct(){
      
        add_action( 'elementor/init', [ $this, 'pxl_register_template_library_source' ], 15 );

    }


    public static function instance(){
        if (is_null(self::$_instance)) {
            self::$_instance = new self();
        }
        return self::$_instance;
    }
 
   function pxl_register_template_library_source(){
    if ( defined('THEME_DEV_CLEAR_CACHE') && THEME_DEV_CLEAR_CACHE ) {
        delete_transient( 'elementor_remote_templates_data_' . ELEMENTOR_VERSION );
        delete_transient( 'elementor_remote_info_api_data_' . ELEMENTOR_VERSION );
        delete_option( 'elementor_remote_info_library' );
        delete_transient( 'custom_remote_update_timestamp' );
        delete_option( 'custom_remote_info_library' );
    }

    $e_library_data = get_option('elementor_remote_info_library');
    $update_timestamp = get_transient( 'custom_remote_update_timestamp' );
    $elementor_update_timestamp = get_option( '_transient_timeout_elementor_remote_info_api_data_' . ELEMENTOR_VERSION );

    if ( ! $update_timestamp || $update_timestamp != $elementor_update_timestamp ) {
        $info_file_path = get_template_directory() . '/elements/template-library/info.json';

        if ( file_exists( $info_file_path ) ) {
            $info_raw = '';
            if ( @is_readable($info_file_path) ) {
                if ( ! function_exists('WP_Filesystem') ) {
                    require_once ABSPATH . 'wp-admin/includes/file.php';
                }
                if ( function_exists('WP_Filesystem') && WP_Filesystem() ) {
                    global $wp_filesystem;
                    $info_raw = $wp_filesystem ? $wp_filesystem->get_contents( $info_file_path ) : '';
                }
                if ( $info_raw === '' ) {
                    $info_raw = @file_get_contents( $info_file_path );
                }
            }

            $info_data = json_decode( $info_raw ?: '[]', true );

            if ( ! empty( $info_data['library']['types_data']['block']['categories'] ) &&
                 ! empty( $e_library_data['types_data']['block']['categories'] ) ) {

                foreach ( (array) $info_data['library']['types_data']['block']['categories'] as $pxl_cat ) {
                    if ( ! in_array( $pxl_cat, $e_library_data['types_data']['block']['categories'], true ) ) {
                        array_unshift( $e_library_data['types_data']['block']['categories'], $pxl_cat );
                        if ( isset( $e_library_data['categories'] ) && is_array( $e_library_data['categories'] ) ) {
                            array_unshift( $e_library_data['categories'], $pxl_cat );
                        }
                    }
                }
                update_option( 'elementor_remote_info_library', $e_library_data );
            }
        }
    }

    include_once __DIR__ . '/source-custom.php';

    $unregister_source = function( $id ) {
        unset( $this->_registered_sources[ $id ] );
    };
    $unregister_source->call( \Elementor\Plugin::instance()->templates_manager, 'remote' );

    if ( class_exists( 'Elementor\TemplateLibrary\Source_Custom' ) ) {
        \Elementor\Plugin::instance()->templates_manager->register_source( 'Elementor\TemplateLibrary\Source_Custom' );
    }
}

 
}

Pxl_El_Template_Library::instance();