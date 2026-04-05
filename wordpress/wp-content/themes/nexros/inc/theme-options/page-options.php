<?php

add_action( 'pxl_post_metabox_register', 'nexros_page_options_register' );
function nexros_page_options_register( $metabox ) {

	$panels = [
		'post' => [
			'opt_name'            => 'post_option',
			'display_name'        => esc_html__( 'Post Settings', 'nexros' ),
			'show_options_object' => false,
			'context'  => 'advanced',
			'priority' => 'default',
			'sections'  => [
				'post_settings' => [
					'title'  => esc_html__( 'Post Settings', 'nexros' ),
					'icon'   => 'el el-refresh',
					'fields' => array_merge(
						nexros_header_opts([
							'default'         => true,
							'default_value'   => '-1'
						]),
						nexros_sidebar_pos_opts(['prefix' => 'post_', 'default' => true, 'default_value' => '-1']),
						nexros_page_title_opts([
							'default'         => true,
							'default_value'   => '-1'
						]),
						array(
            array(
                'id'       => 'sg_post_title',
                'type'     => 'button_set',
                'title'    => esc_html__('Page Title Type', 'nexros'),
                'options'  => array(
                    'default' => esc_html__('Default', 'nexros'),
                    'custom_text' => esc_html__('Custom Text', 'nexros'),
                ),
                'default'  => 'default',
            ),
							array(
								'id'           => 'custom_main_title',
								'type'         => 'text',
								'title'        => esc_html__( 'Custom Main Title', 'nexros' ),
								'subtitle'     => esc_html__( 'Custom heading text title', 'nexros' ),
                'required' => array( 0 => 'sg_post_title', 1 => 'equals', 2 => 'custom_text' ),

							),
							array(
								'id'      => 'custom_ptitle_desc',
								'type'    => 'textarea',
								'title'   => esc_html__('Page Title Description', 'nexros'),
								'default' => 'Description Details',
								'required' => array( 'pt_mode', '!=', 'none' )
							),
						),
						array(
							array(
								'id'          => 'featured-video-url',
								'type'        => 'text',
								'title'       => esc_html__( 'Video URL', 'nexros' ),
								'description' => esc_html__( 'Video will show when set post format is video', 'nexros' ),
								'validate'    => 'url',
								'msg'         => 'Url error!',
							),
							array(
								'id'          => 'featured-audio-url',
								'type'        => 'text',
								'title'       => esc_html__( 'Audio URL', 'nexros' ),
								'description' => esc_html__( 'Audio that will show when set post format is audio', 'nexros' ),
								'validate'    => 'url',
								'msg'         => 'Url error!',
							),
							array(
								'id'=>'featured-quote-text',
								'type' => 'textarea',
								'title' => esc_html__('Quote Text', 'nexros'),
								'default' => '',
							),
							array(
								'id'          => 'featured-quote-cite',
								'type'        => 'text',
								'title'       => esc_html__( 'Quote Cite', 'nexros' ),
								'description' => esc_html__( 'Quote will show when set post format is quote', 'nexros' ),
							),
							array(
								'id'       => 'featured-link-url',
								'type'     => 'text',
								'title'    => esc_html__( 'Format Link URL', 'nexros' ),
								'description' => esc_html__( 'Link will show when set post format is link', 'nexros' ),
							),
							array(
								'id'          => 'featured-link-text',
								'type'        => 'text',
								'title'       => esc_html__( 'Format Link Text', 'nexros' ),
							),
						)
					)
				]
			]
		],
		'page' => [
			'opt_name'            => 'pxl_page_options',
			'display_name'        => esc_html__( 'Page Options', 'nexros' ),
			'show_options_object' => false,
			'context'  => 'advanced',
			'priority' => 'default',
			'sections'  => [
				'header' => [
					'title'  => esc_html__( 'Header', 'nexros' ),
					'icon'   => 'el-icon-website',
					'fields' => array_merge(
						nexros_header_opts([
							'default'         => true,
							'default_value'   => '-1'
						]),
						nexros_header_mobile_opts([
							'default'         => true,
							'default_value'   => '-1'
						]),
						array(
							array(
								'id'       => 'header_display',
								'type'     => 'button_set',
								'title'    => esc_html__('Header Display', 'nexros'),
								'options'  => array(
									'show' => esc_html__('Show', 'nexros'),
									'hide'  => esc_html__('Hide', 'nexros'),
								),
								'default'  => 'show',
							),
							array(
								'id'       => 'logo_m',
								'type'     => 'media',
								'title'    => esc_html__( 'Logo Mobile', 'nexros' ),
								'default' => '',
							),
							array(
								'id'       => 'p_menu',
								'type'     => 'select',
								'title'    => esc_html__( 'Menu', 'nexros' ),
								'options'  => nexros_get_nav_menu_slug(),
								'default' => '',
							),
						),
						array(
							array(
								'id'       => 'sticky_scroll',
								'type'     => 'button_set',
								'title'    => esc_html__('Sticky Scroll', 'nexros'),
								'options'  => array(
									'-1' => esc_html__('Inherit', 'nexros'),
									'pxl-sticky-stt' => esc_html__('Scroll To Top', 'nexros'),
									'pxl-sticky-stb'  => esc_html__('Scroll To Bottom', 'nexros'),
								),
								'default'  => '-1',
							),
						)
					)

				],
				'page_title' => [
					'title'  => esc_html__( 'Page Title', 'nexros' ),
					'icon'   => 'el el-indent-left',
					'fields' => array_merge(
						nexros_page_title_opts([
							'default'         => true,
							'default_value'   => '-1'
						]),
						array(
            array(
                'id'       => 'sg_post_title',
                'type'     => 'button_set',
                'title'    => esc_html__('Page Title Type', 'nexros'),
                'options'  => array(
                    'default' => esc_html__('Default', 'nexros'),
                    'custom_text' => esc_html__('Custom Text', 'nexros'),
                ),
                'default'  => 'default',
            ),
							array(
								'id'           => 'custom_main_title',
								'type'         => 'text',
								'title'        => esc_html__( 'Custom Main Title', 'nexros' ),
								'subtitle'     => esc_html__( 'Custom heading text title', 'nexros' ),
                'required' => array( 0 => 'sg_post_title', 1 => 'equals', 2 => 'custom_text' ),

							),
							array(
								'id'      => 'custom_ptitle_desc',
								'type'    => 'textarea',
								'title'   => esc_html__('Page Title Description', 'nexros'),
								'default' => 'Description Details',
								'required' => array( 'pt_mode', '!=', 'none' )
							),
						),
					)
				],
				'content' => [
					'title'  => esc_html__( 'Content', 'nexros' ),
					'icon'   => 'el-icon-pencil',
					'fields' => array_merge(
						nexros_sidebar_pos_opts(['prefix' => 'page_', 'default' => false, 'default_value' => '0']),
						array(
							array(
								'id'             => 'content_spacing',
								'type'           => 'spacing',
								'output'         => array( '#pxl-wapper #pxl-main' ),
								'right'          => false,
								'left'           => false,
								'mode'           => 'padding',
								'units'          => array( 'px' ),
								'units_extended' => 'false',
								'title'          => esc_html__( 'Spacing Top/Bottom', 'nexros' ),
								'default'        => array(
									'padding-top'    => '',
									'padding-bottom' => '',
									'units'          => 'px',
								)
							), 
						)
					)
				],
				'footer' => [
					'title'  => esc_html__( 'Footer', 'nexros' ),
					'icon'   => 'el el-website',
					'fields' => array_merge(
						nexros_footer_opts([
							'default'         => true,
							'default_value'   => '-1'
						]),
						array(
							array(
								'id'       => 'footer_display',
								'type'     => 'button_set',
								'title'    => esc_html__('Footer Display', 'nexros'),
								'options'  => array(
									'show' => esc_html__('Show', 'nexros'),
									'hide'  => esc_html__('Hide', 'nexros'),
								),
								'default'  => 'show',
							),
							array(
								'id'       => 'p_footer_fixed',
								'type'     => 'button_set',
								'title'    => esc_html__('Footer Fixed', 'nexros'),
								'options'  => array(
									'inherit' => esc_html__('Inherit', 'nexros'),
									'on' => esc_html__('On', 'nexros'),
									'off' => esc_html__('Off', 'nexros'),
								),
								'default'  => 'inherit',
							),
							array(
								'id'          => 'body_bg_color_ct',
								'type'        => 'background',
								'title'       => esc_html__('Body Background Color Custom', 'nexros'),
								'transparent' => false,
								'output' => [
									'.pxl-footer-fixed #pxl-main',
								],        
								'required' => array( 0 => 'p_footer_fixed', 1 => 'equals', 2 => 'on' ),            
								'url'      => false
							),  
							array(
								'id'       => 'back_top_top_style',
								'type'     => 'button_set',
								'title'    => esc_html__('Back to Top Style', 'nexros'),
								'options'  => array(
									'style-default' => esc_html__('Default', 'nexros'),
									'style-round' => esc_html__('Round', 'nexros'),
								),
								'default'  => 'style-default',
							),
						)
					)
				],
				'colors' => [
					'title'  => esc_html__( 'Colors', 'nexros' ),
					'icon'   => 'el el-website',
					'fields' => array_merge(
						array(
							array(
								'id'       => 'body_bg_color',
								'type'     => 'color',
								'title'    => esc_html__('Body Background Color', 'nexros'),
								'transparent' => false,
								'default'     => ''
							),
							array(
								'id'          => 'primary_color',
								'type'        => 'color',
								'title'       => esc_html__('Primary Color', 'nexros'),
								'transparent' => false,
								'default'     => ''
							),
							array(
								'id'          => 'secondary_color',
								'type'        => 'color',
								'title'       => esc_html__('Secondary Color', 'nexros'),
								'transparent' => false,
								'default'     => ''
							),
							array(
								'id'          => 'third_color',
								'type'        => 'color',
								'title'       => esc_html__('Third Color', 'nexros'),
								'transparent' => false,
								'default'     => ''
							),
							array(
								'id'          => 'four_color',
								'type'        => 'color',
								'title'       => esc_html__('Four Color', 'nexros'),
								'transparent' => false,
								'default'     => ''
							),
							array(
								'id'          => 'gradient_color',
								'type'        => 'color_gradient',
								'title'       => esc_html__('Gradient Color One', 'nexros'),
								'transparent' => false,
								'default'  => array(
									'from' => '',
									'to'   => '', 
								),
							),
							array(
								'id'          => 'gradient_color_two',
								'type'        => 'color_gradient',
								'title'       => esc_html__('Gradient Color Two', 'nexros'),
								'transparent' => false,
								'default'  => array(
									'from' => '',
									'to'   => '', 
								),
							)
						)
					)
				],
				'extra' => [
					'title'  => esc_html__( 'Extra', 'nexros' ),
					'icon'   => 'el el-website',
					'fields' => array_merge(
						array(
							array(
								'id' => 'body_custom_class',
								'type' => 'text',
								'title' => esc_html__('Body Custom Class', 'nexros'),
							),
						)
					)
				]
			]
		],
		'portfolio' => [
			'opt_name'            => 'pxl_portfolio_options',
			'display_name'        => esc_html__( 'Product Options', 'nexros' ),
			'show_options_object' => false,
			'context'  => 'advanced',
			'priority' => 'default',
			'sections'  => [
				'header1' => [
					'title'  => esc_html__( 'Header', 'nexros' ),
					'icon'   => 'el-icon-website',
					'fields' => array_merge(
						nexros_header_opts([
							'default'         => true,
							'default_value'   => '-1'
						]),
						nexros_header_mobile_opts([
							'default'         => true,
							'default_value'   => '-1'
						]),
						array(
							array(
								'id'       => 'header_display',
								'type'     => 'button_set',
								'title'    => esc_html__('Header Display', 'nexros'),
								'options'  => array(
									'show' => esc_html__('Show', 'nexros'),
									'hide'  => esc_html__('Hide', 'nexros'),
								),
								'default'  => 'show',
							),
							array(
								'id'       => 'p_menu',
								'type'     => 'select',
								'title'    => esc_html__( 'Menu', 'nexros' ),
								'options'  => nexros_get_nav_menu_slug(),
								'default' => '',
							),
						),
						array(
							array(
								'id'       => 'sticky_scroll',
								'type'     => 'button_set',
								'title'    => esc_html__('Sticky Scroll', 'nexros'),
								'options'  => array(
									'-1' => esc_html__('Inherit', 'nexros'),
									'pxl-sticky-stt' => esc_html__('Scroll To Top', 'nexros'),
									'pxl-sticky-stb'  => esc_html__('Scroll To Bottom', 'nexros'),
								),
								'default'  => '-1',
							),
						)
					)

				],
				'page_title' => [
					'title'  => esc_html__( 'Page Title', 'nexros' ),
					'icon'   => 'el el-indent-left',
					'fields' => array_merge(
						nexros_page_title_opts([
							'default'         => true,
							'default_value'   => '-1'
						]),
						array(
            array(
                'id'       => 'sg_post_title',
                'type'     => 'button_set',
                'title'    => esc_html__('Page Title Type', 'nexros'),
                'options'  => array(
                    'default' => esc_html__('Default', 'nexros'),
                    'custom_text' => esc_html__('Custom Text', 'nexros'),
                ),
                'default'  => 'default',
            ),
							array(
								'id'           => 'custom_main_title',
								'type'         => 'text',
								'title'        => esc_html__( 'Custom Main Title', 'nexros' ),
								'subtitle'     => esc_html__( 'Custom heading text title', 'nexros' ),
                'required' => array( 0 => 'sg_post_title', 1 => 'equals', 2 => 'custom_text' ),

							),
							array(
								'id'      => 'custom_ptitle_desc',
								'type'    => 'textarea',
								'title'   => esc_html__('Page Title Description', 'nexros'),
								'default' => 'Description Details',
								'required' => array( 'pt_mode', '!=', 'none' )
							),
						),
					)
				],
				'content' => [
					'title'  => esc_html__( 'Content', 'nexros' ),
					'icon'   => 'el-icon-pencil',
					'fields' => array_merge(
						nexros_sidebar_pos_opts(['prefix' => 'page_', 'default' => false, 'default_value' => '0']),
						array(
							array(
								'id'             => 'content_spacing',
								'type'           => 'spacing',
								'output'         => array( '#pxl-wapper #pxl-main' ),
								'right'          => false,
								'left'           => false,
								'mode'           => 'padding',
								'units'          => array( 'px' ),
								'units_extended' => 'false',
								'title'          => esc_html__( 'Spacing Top/Bottom', 'nexros' ),
								'default'        => array(
									'padding-top'    => '',
									'padding-bottom' => '',
									'units'          => 'px',
								)
							), 
							array(
								'id'=>'multi_text_country',
								'type' => 'multi_text',
								'title' => ('Multi Text Option'),
								'title'    => esc_html('Mutil Text', 'nexros'),
							),
						)
					)
				],
				'footer' => [
					'title'  => esc_html__( 'Footer', 'nexros' ),
					'icon'   => 'el el-website',
					'fields' => array_merge(
						nexros_footer_opts([
							'default'         => true,
							'default_value'   => '-1'
						]),
						array(
							array(
								'id'       => 'footer_display',
								'type'     => 'button_set',
								'title'    => esc_html__('Footer Display', 'nexros'),
								'options'  => array(
									'show' => esc_html__('Show', 'nexros'),
									'hide'  => esc_html__('Hide', 'nexros'),
								),
								'default'  => 'show',
							),
							array(
								'id'       => 'p_footer_fixed',
								'type'     => 'button_set',
								'title'    => esc_html__('Footer Fixed', 'nexros'),
								'options'  => array(
									'inherit' => esc_html__('Inherit', 'nexros'),
									'on' => esc_html__('On', 'nexros'),
									'off' => esc_html__('Off', 'nexros'),
								),
								'default'  => 'inherit',
							),
							array(
								'id'       => 'back_top_top_style',
								'type'     => 'button_set',
								'title'    => esc_html__('Back to Top Style', 'nexros'),
								'options'  => array(
									'style-default' => esc_html__('Default', 'nexros'),
									'style-round' => esc_html__('Round', 'nexros'),
								),
								'default'  => 'style-default',
							),
						)
					)
				],
			]
		],
		'product' => [
			'opt_name'            => 'pxl_product_options',
			'display_name'        => esc_html__( 'Portfolio Options', 'nexros' ),
			'show_options_object' => false,
			'context'  => 'advanced',
			'priority' => 'default',
			'sections'  => [
				'header1' => [
					'title'  => esc_html__( 'Header', 'nexros' ),
					'icon'   => 'el-icon-website',
					'fields' => array_merge(
						nexros_header_opts([
							'default'         => true,
							'default_value'   => '-1'
						]),
						nexros_header_mobile_opts([
							'default'         => true,
							'default_value'   => '-1'
						]),
						array(
							array(
								'id'       => 'header_display',
								'type'     => 'button_set',
								'title'    => esc_html__('Header Display', 'nexros'),
								'options'  => array(
									'show' => esc_html__('Show', 'nexros'),
									'hide'  => esc_html__('Hide', 'nexros'),
								),
								'default'  => 'show',
							),
							array(
								'id'       => 'p_menu',
								'type'     => 'select',
								'title'    => esc_html__( 'Menu', 'nexros' ),
								'options'  => nexros_get_nav_menu_slug(),
								'default' => '',
							),
						),
						array(
							array(
								'id'       => 'sticky_scroll',
								'type'     => 'button_set',
								'title'    => esc_html__('Sticky Scroll', 'nexros'),
								'options'  => array(
									'-1' => esc_html__('Inherit', 'nexros'),
									'pxl-sticky-stt' => esc_html__('Scroll To Top', 'nexros'),
									'pxl-sticky-stb'  => esc_html__('Scroll To Bottom', 'nexros'),
								),
								'default'  => '-1',
							),
						)
					)

				],
				'page_title' => [
					'title'  => esc_html__( 'Page Title', 'nexros' ),
					'icon'   => 'el el-indent-left',
					'fields' => array_merge(
						nexros_page_title_opts([
							'default'         => true,
							'default_value'   => '-1'
						]),
						array(
            array(
                'id'       => 'sg_post_title',
                'type'     => 'button_set',
                'title'    => esc_html__('Page Title Type', 'nexros'),
                'options'  => array(
                    'default' => esc_html__('Default', 'nexros'),
                    'custom_text' => esc_html__('Custom Text', 'nexros'),
                ),
                'default'  => 'default',
            ),
							array(
								'id'           => 'custom_main_title',
								'type'         => 'text',
								'title'        => esc_html__( 'Custom Main Title', 'nexros' ),
								'subtitle'     => esc_html__( 'Custom heading text title', 'nexros' ),
                'required' => array( 0 => 'sg_post_title', 1 => 'equals', 2 => 'custom_text' ),

							),
							array(
								'id'      => 'custom_ptitle_desc',
								'type'    => 'textarea',
								'title'   => esc_html__('Page Title Description', 'nexros'),
								'default' => 'Description Details',
								'required' => array( 'pt_mode', '!=', 'none' )
							),
						),
					)
				],
				'content' => [
					'title'  => esc_html__( 'Content', 'nexros' ),
					'icon'   => 'el-icon-pencil',
					'fields' => array_merge(
						nexros_sidebar_pos_opts(['prefix' => 'page_', 'default' => false, 'default_value' => '0']),
						array(
							array(
								'id'             => 'content_spacing',
								'type'           => 'spacing',
								'output'         => array( '#pxl-wapper #pxl-main' ),
								'right'          => false,
								'left'           => false,
								'mode'           => 'padding',
								'units'          => array( 'px' ),
								'units_extended' => 'false',
								'title'          => esc_html__( 'Spacing Top/Bottom', 'nexros' ),
								'default'        => array(
									'padding-top'    => '',
									'padding-bottom' => '',
									'units'          => 'px',
								)
							), 
						)
					)
				],
				'footer' => [
					'title'  => esc_html__( 'Footer', 'nexros' ),
					'icon'   => 'el el-website',
					'fields' => array_merge(
						nexros_footer_opts([
							'default'         => true,
							'default_value'   => '-1'
						]),
					)
				],
			]
		],
		'service' => [
			'opt_name'            => 'pxl_service_options',
			'display_name'        => esc_html__( 'Service Options', 'nexros' ),
			'show_options_object' => false,
			'context'  => 'advanced',
			'priority' => 'default',
			'sections'  => [
				'header' => [
					'title'  => esc_html__( 'General', 'nexros' ),
					'icon'   => 'el-icon-website',
					'fields' => array_merge(
						array(
							array(
								'id'=> 'service_external_link',
								'type' => 'text',
								'title' => esc_html__('External Link', 'nexros'),
								'validate' => 'url',
								'default' => '',
							),
							array(
								'id'       => 'service_icon_type',
								'type'     => 'button_set',
								'title'    => esc_html__('Icon Type', 'nexros'),
								'options'  => array(
									'icon'  => esc_html__('Icon', 'nexros'),
									'image'  => esc_html__('Image', 'nexros'),
								),
								'default'  => 'icon'
							),
							array(
								'id'       => 'service_icon_font',
								'type'     => 'pxl_iconpicker',
								'title'    => esc_html__('Icon', 'nexros'),
								'required' => array( 0 => 'service_icon_type', 1 => 'equals', 2 => 'icon' ),
								'force_output' => true
							),
							array(
								'id'       => 'service_icon_img',
								'type'     => 'media',
								'title'    => esc_html__('Icon Image', 'nexros'),
								'default' => '',
								'required' => array( 0 => 'service_icon_type', 1 => 'equals', 2 => 'image' ),
								'force_output' => true
							),
						)
					)
				],
				'header1' => [
					'title'  => esc_html__( 'Header', 'nexros' ),
					'icon'   => 'el-icon-website',
					'fields' => array_merge(
						nexros_header_opts([
							'default'         => true,
							'default_value'   => '-1'
						]),
						nexros_header_mobile_opts([
							'default'         => true,
							'default_value'   => '-1'
						]),
						array(
							array(
								'id'       => 'header_display',
								'type'     => 'button_set',
								'title'    => esc_html__('Header Display', 'nexros'),
								'options'  => array(
									'show' => esc_html__('Show', 'nexros'),
									'hide'  => esc_html__('Hide', 'nexros'),
								),
								'default'  => 'show',
							),
							array(
								'id'       => 'p_menu',
								'type'     => 'select',
								'title'    => esc_html__( 'Menu', 'nexros' ),
								'options'  => nexros_get_nav_menu_slug(),
								'default' => '',
							),
						),
						array(
							array(
								'id'       => 'sticky_scroll',
								'type'     => 'button_set',
								'title'    => esc_html__('Sticky Scroll', 'nexros'),
								'options'  => array(
									'-1' => esc_html__('Inherit', 'nexros'),
									'pxl-sticky-stt' => esc_html__('Scroll To Top', 'nexros'),
									'pxl-sticky-stb'  => esc_html__('Scroll To Bottom', 'nexros'),
								),
								'default'  => '-1',
							),
						)
					)

				],
				'page_title' => [
					'title'  => esc_html__( 'Page Title', 'nexros' ),
					'icon'   => 'el el-indent-left',
					'fields' => array_merge(
						nexros_page_title_opts([
							'default'         => true,
							'default_value'   => '-1'
						]),
						array(
            array(
                'id'       => 'sg_post_title',
                'type'     => 'button_set',
                'title'    => esc_html__('Page Title Type', 'nexros'),
                'options'  => array(
                    'default' => esc_html__('Default', 'nexros'),
                    'custom_text' => esc_html__('Custom Text', 'nexros'),
                ),
                'default'  => 'default',
            ),
							array(
								'id'           => 'custom_main_title',
								'type'         => 'text',
								'title'        => esc_html__( 'Custom Main Title', 'nexros' ),
								'subtitle'     => esc_html__( 'Custom heading text title', 'nexros' ),
                'required' => array( 0 => 'sg_post_title', 1 => 'equals', 2 => 'custom_text' ),

							),
							array(
								'id'      => 'custom_ptitle_desc',
								'type'    => 'textarea',
								'title'   => esc_html__('Page Title Description', 'nexros'),
								'default' => 'Description Details',
								'required' => array( 'pt_mode', '!=', 'none' )
							),
						),
					)
				],
				'content' => [
					'title'  => esc_html__( 'Content', 'nexros' ),
					'icon'   => 'el-icon-pencil',
					'fields' => array_merge(
						nexros_sidebar_pos_opts(['prefix' => 'page_', 'default' => false, 'default_value' => '0']),
						array(
							array(
								'id'             => 'content_spacing',
								'type'           => 'spacing',
								'output'         => array( '#pxl-wapper #pxl-main' ),
								'right'          => false,
								'left'           => false,
								'mode'           => 'padding',
								'units'          => array( 'px' ),
								'units_extended' => 'false',
								'title'          => esc_html__( 'Spacing Top/Bottom', 'nexros' ),
								'default'        => array(
									'padding-top'    => '',
									'padding-bottom' => '',
									'units'          => 'px',
								)
							), 
						)
					)
				],
				'footer' => [
					'title'  => esc_html__( 'Footer', 'nexros' ),
					'icon'   => 'el el-website',
					'fields' => array_merge(
						nexros_footer_opts([
							'default'         => true,
							'default_value'   => '-1'
						]),
						array(
							array(
								'id'       => 'footer_display',
								'type'     => 'button_set',
								'title'    => esc_html__('Footer Display', 'nexros'),
								'options'  => array(
									'show' => esc_html__('Show', 'nexros'),
									'hide'  => esc_html__('Hide', 'nexros'),
								),
								'default'  => 'show',
							),
							array(
								'id'       => 'p_footer_fixed',
								'type'     => 'button_set',
								'title'    => esc_html__('Footer Fixed', 'nexros'),
								'options'  => array(
									'inherit' => esc_html__('Inherit', 'nexros'),
									'on' => esc_html__('On', 'nexros'),
									'off' => esc_html__('Off', 'nexros'),
								),
								'default'  => 'inherit',
							),
							array(
								'id'       => 'back_top_top_style',
								'type'     => 'button_set',
								'title'    => esc_html__('Back to Top Style', 'nexros'),
								'options'  => array(
									'style-default' => esc_html__('Default', 'nexros'),
									'style-round' => esc_html__('Round', 'nexros'),
								),
								'default'  => 'style-default',
							),
						)
					)
				],
			]
		],

		'pxl-template' => [ //post_type
		'opt_name'            => 'pxl_hidden_template_options',
		'display_name'        => esc_html__( 'Template Options', 'nexros' ),
		'show_options_object' => false,
		'context'  => 'advanced',
		'priority' => 'default',
		'sections'  => [
			'header' => [
				'title'  => esc_html__( 'General', 'nexros' ),
				'icon'   => 'el-icon-website',
				'fields' => array(
					array(
						'id'    => 'template_type',
						'type'  => 'select',
						'title' => esc_html__('Type', 'nexros'),
						'options' => [
							'df'       	   => esc_html__('Select Type', 'nexros'), 
							'header'       => esc_html__('Header Desktop', 'nexros'),
							'header-mobile'       => esc_html__('Header Mobile', 'nexros'),
							'footer'       => esc_html__('Footer', 'nexros'), 
							'mega-menu'    => esc_html__('Mega Menu', 'nexros'), 
							'page-title'   => esc_html__('Page Title', 'nexros'), 
							'tab' => esc_html__('Tab', 'nexros'),
							'hidden-panel' => esc_html__('Hidden Panel', 'nexros'),
							'popup' => esc_html__('Popup', 'nexros'),
							'widget' => esc_html__('Widget Sidebar', 'nexros'),
							'page' => esc_html__('Page', 'nexros'),
							'slider' => esc_html__('Slider', 'nexros'),
						],
						'default' => 'df',
					),
					array(
						'id'    => 'header_type',
						'type'  => 'select',
						'title' => esc_html__('Header Type', 'nexros'),
						'options' => [
							'px-header--default'       	   => esc_html__('Default', 'nexros'), 
							'px-header--transparent'       => esc_html__('Transparent', 'nexros'),
							'px-header--left_sidebar'       => esc_html__('Left Sidebar', 'nexros'),
						],
						'default' => 'px-header--default',
						'indent' => true,
						'required' => array( 0 => 'template_type', 1 => 'equals', 2 => 'header' ),
					),

					array(
						'id'    => 'header_mobile_type',
						'type'  => 'select',
						'title' => esc_html__('Header Type', 'nexros'),
						'options' => [
							'px-header--default'       	   => esc_html__('Default', 'nexros'), 
							'px-header--transparent'       => esc_html__('Transparent', 'nexros'),
						],
						'default' => 'px-header--default',
						'indent' => true,
						'required' => array( 0 => 'template_type', 1 => 'equals', 2 => 'header-mobile' ),
					),

					array(
						'id'    => 'hidden_panel_position',
						'type'  => 'select',
						'title' => esc_html__('Hidden Panel Position', 'nexros'),
						'options' => [
							'top'       	   => esc_html__('Top', 'nexros'),
							'right'       	   => esc_html__('Right', 'nexros'),
						],
						'default' => 'right',
						'required' => array( 0 => 'template_type', 1 => 'equals', 2 => 'hidden-panel' ),
					),
					array(
						'id'          => 'hidden_panel_height',
						'type'        => 'text',
						'title'       => esc_html__('Hidden Panel Height', 'nexros'),
						'subtitle'       => esc_html__('Enter number.', 'nexros'),
						'transparent' => false,
						'default'     => '',
						'force_output' => true,
						'required' => array( 0 => 'hidden_panel_position', 1 => 'equals', 2 => 'top' ),
					),
					array(
						'id'          => 'hidden_panel_boxcolor',
						'type'        => 'color',
						'title'       => esc_html__('Box Color', 'nexros'),
						'transparent' => false,
						'default'     => '',
						'required' => array( 0 => 'template_type', 1 => 'equals', 2 => 'hidden-panel' ),
					),

					array(
						'id'          => 'header_sidebar_width',
						'type'        => 'slider',
						'title'       => esc_html__('Header Sidebar Width', 'nexros'),
						"default"   => 300,
						"min"       => 50,
						"step"      => 1,
						"max"       => 900,
						'force_output' => true,
						'required' => array( 0 => 'header_type', 1 => 'equals', 2 => 'px-header--left_sidebar' ),
					),

					array(
						'id'          => 'header_sidebar_border',
						'type'        => 'border',
						'title'       => esc_html__('Header Sidebar Border', 'nexros'),
						'force_output' => true,
						'required' => array( 0 => 'header_type', 1 => 'equals', 2 => 'px-header--left_sidebar' ),
						'default' => '',
					),
				),

			],
		]
	],
];

$metabox->add_meta_data( $panels );
}
