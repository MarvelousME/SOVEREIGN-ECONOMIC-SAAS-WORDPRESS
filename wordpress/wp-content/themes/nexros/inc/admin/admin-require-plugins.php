<?php
/**
 * Include the TGM_Plugin_Activation class.
 */
get_template_part( 'inc/admin/libs/tgmpa/class-tgm-plugin-activation' );

add_action( 'tgmpa_register', 'nexros_register_required_plugins' );
function nexros_register_required_plugins() {
    include( locate_template( 'inc/admin/demo-data/demo-config.php' ) );
    $pxl_server_info = apply_filters( 'pxl_server_info', ['plugin_url' => 'http://plugins.tnexthemes.com/'] ) ; 
    $default_path = $pxl_server_info['plugin_url'];  
    $images = get_template_directory_uri() . '/inc/admin/assets/img/plugins';
    $plugins = array(

        array(
            'name'               => esc_html__('Redux Framework', 'nexros'),
            'slug'               => 'redux-framework',
            'required'           => true,
            'logo'        => $images . '/redux.png',
            'description' => esc_html__( 'Build theme options and post, page options for WordPress Theme.', 'nexros' ),
        ),

        array(
            'name'               => esc_html__('Elementor', 'nexros'),
            'slug'               => 'elementor',
            'required'           => true,
            'logo'        => $images . '/elementor.png',
            'description' => esc_html__( 'Introducing a WordPress website builder, with no limits of design. A website builder that delivers high-end page designs and advanced capabilities', 'nexros' ),
        ),

        array(
            'name'               => esc_html__('Tnex Addons', 'nexros'),
            'slug'               => 'tnex-addons',
            'source'             => 'tnex-addons.zip',
            'required'           => true,
            'logo'        => $images . '/tnex-logo.png',
            'description' => esc_html__( 'Main process and Powerful Elements Plugin, exclusively for nexros WordPress Theme.', 'nexros' ),
        ),

        array(
            'name'               => esc_html__('Tnex User', 'nexros'),
            'slug'               => 'tnex-user',
            'source'             => 'tnex-user.zip',
            'required'           => true,
            'logo'        => $images . '/wp-user.png',
            'description' => esc_html__( 'Active Shortcode User, exclusively for nexros WordPress Theme.', 'nexros' ),
        ),
        
        array(
            'name'               => esc_html__('Contact Form 7', 'nexros'),
            'slug'               => 'contact-form-7',
            'required'           => true,
            'logo'        => $images . '/contact-f7.png',
            'description' => esc_html__( 'Contact Form 7 can manage multiple contact forms, you can customize the form and the mail contents flexibly with simple markup', 'nexros' ),
        ), 
        array(
            'name'               => esc_html__('WooCommerce', 'nexros'),
            'slug'               => "woocommerce",
            'required'           => true,
            'logo'        => $images . '/woo.png',
            'description' => esc_html__( 'WooCommerce is the world’s most popular open-source eCommerce solution.', 'nexros' ),
        ),
    );
    $config = array(
        'default_path' => $default_path,           // Default absolute path to pre-packaged plugins.
        'menu'         => 'tgmpa-install-plugins', // Menu slug.
        'is_automatic' => true,
    );

    tgmpa( $plugins, $config );

}