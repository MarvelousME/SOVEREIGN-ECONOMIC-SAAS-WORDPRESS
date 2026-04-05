<?php
$templates = nexros_get_templates_option('tab', []) ;
pxl_add_custom_widget(
    array(
        'name' => 'pxl_tabs_slip',
        'title' => esc_html__( 'BR Tabs Slip', 'nexros' ),
        'icon' => 'eicon-tabs icon-brand-elementor',
        'categories' => array('pxltheme-core'),
        'scripts' => array(
            'nexros-tabs',
            'swiper',
            'pxl-swiper'
        ),
        'params' => array(
            'sections' => array(
                array(
                    'name' => 'section_layout',
                    'label' => esc_html__('Layout', 'nexros' ),
                    'tab' => \Elementor\Controls_Manager::TAB_LAYOUT,
                    'controls' => array(
                        array(
                            'name' => 'layout',
                            'label' => esc_html__('Templates', 'nexros' ),
                            'type' => 'layoutcontrol',
                            'default' => '1',
                            'options' => [
                                '1' => [
                                    'label' => esc_html__('Layout 1', 'nexros' ),
                                    'image' => get_template_directory_uri() . '/elements/templates/pxl_tabs_slip/layout-image/layout1.jpg'
                                ],
                                '2' => [
                                    'label' => esc_html__('Layout 2', 'nexros' ),
                                    'image' => get_template_directory_uri() . '/elements/templates/pxl_tabs_slip/layout-image/layout2.jpg'
                                ],
                            ],
                        ),
                    ),
                ),
                array(
                    'name' => 'tab_content',
                    'label' => esc_html__( 'Tabs', 'nexros' ),
                    'tab' => \Elementor\Controls_Manager::TAB_CONTENT,
                    'controls' => array(
                        array(
                            'name' => 'tabs',
                            'label' => esc_html__( 'Content', 'nexros' ),
                            'type' => \Elementor\Controls_Manager::REPEATER,
                            'controls' => array(
                              array(
                                'name'      => 'tab1_text',
                                'label'     => esc_html__('Tab Text', 'nexros'),
                                'type'      => \Elementor\Controls_Manager::TEXT,
                                'separator' => 'before'
                            ),
                              array(
                                'name' => 'content_template',
                                'label' => esc_html__('Select Templates', 'nexros'),
                                'type' => 'select',
                                'options' => $templates,
                                'default' => 'df',
                                'description' => 'Add new tab template: "<a href="' . esc_url( admin_url( 'edit.php?post_type=pxl-template' ) ) . '" target="_blank">Click Here</a>"',
                            ),
                          ),
                        ),
                    ),
                ),
                array(
                    'name' => 'section_carousel',
                    'label' => esc_html__('Carousel', 'nexros'),
                    'tab' => \Elementor\Controls_Manager::TAB_STYLE,
                    'condition' => [
                        'layout' => '2',
                    ],
                    'controls' => array(
                        array(
                            'name' => 'item_padding_r',
                            'label' => esc_html__('Item Padding', 'nexros' ),
                            'type' => \Elementor\Controls_Manager::DIMENSIONS,
                            'size_units' => [ 'px' ],
                            'default' => [
                                'top' => '15',
                                'right' => '15',
                                'bottom' => '15',
                                'left' => '15'
                            ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-swiper-container' => 'margin-top: -{{TOP}}{{UNIT}}; margin-right: -{{RIGHT}}{{UNIT}}; margin-bottom: -{{BOTTOM}}{{UNIT}}; margin-left: -{{LEFT}}{{UNIT}};',
                                '{{WRAPPER}} .pxl-swiper-container .pxl-swiper-slide' => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                            ],
                            'control_type' => 'responsive',
                        ),
                        array(
                            'name' => 'col_xs',
                            'label' => esc_html__('Columns: Screen <= 575', 'nexros' ),
                            'type' => \Elementor\Controls_Manager::SELECT,
                            'default' => 'auto',
                            'options' => [
                                '1' => '1',
                                '2' => '2',
                                '3' => '3',
                                '4' => '4',
                                '6' => '6',
                                'auto' => 'auto',
                            ],
                        ),
                        array(
                            'name' => 'col_sm',
                            'label' => esc_html__('Columns: Screen <= 767', 'nexros' ),
                            'type' => \Elementor\Controls_Manager::SELECT,
                            'default' => 'auto',
                            'options' => [
                                '1' => '1',
                                '2' => '2',
                                '3' => '3',
                                '4' => '4',
                                '6' => '6',
                                'auto' => 'auto',
                            ],
                        ),
                        array(
                            'name' => 'col_md',
                            'label' => esc_html__('Columns: Screen <= 991', 'nexros' ),
                            'type' => \Elementor\Controls_Manager::SELECT,
                            'default' => 'auto',
                            'options' => [
                                '1' => '1',
                                '2' => '2',
                                '3' => '3',
                                '4' => '4',
                                '6' => '6',
                                'auto' => 'auto',
                            ],
                        ),
                        array(
                            'name' => 'col_lg',
                            'label' => esc_html__('Columns: Screen <= 1199', 'nexros' ),
                            'type' => \Elementor\Controls_Manager::SELECT,
                            'default' => 'auto',
                            'options' => [
                                '1' => '1',
                                '2' => '2',
                                '3' => '3',
                                '4' => '4',
                                '5' => '5',
                                '6' => '6',
                                'auto' => 'auto',
                            ],
                        ),
                        array(
                            'name' => 'col_xl',
                            'label' => esc_html__('Columns: Screen => 1200', 'nexros' ),
                            'type' => \Elementor\Controls_Manager::SELECT,
                            'default' => 'auto',
                            'options' => [
                                '1' => '1',
                                '2' => '2',
                                '3' => '3',
                                '4' => '4',
                                '5' => '5',
                                '6' => '6',
                                'auto' => 'auto',
                            ],
                        ),
                        array(
                            'name' => 'col_xxl',
                            'label' => esc_html__('Columns: Screen => 1600', 'nexros' ),
                            'type' => \Elementor\Controls_Manager::SELECT,
                            'default' => 'auto',
                            'options' => [
                                '1' => '1',
                                '2' => '2',
                                '3' => '3',
                                '4' => '4',
                                '5' => '5',
                                '6' => '6',
                                'auto' => 'auto',
                            ],
                        ),

                        array(
                            'name' => 'slides_to_scroll',
                            'label' => esc_html__('Slides Scroll', 'nexros' ),
                            'type' => \Elementor\Controls_Manager::SELECT,
                            'default' => 'auto',
                            'options' => [
                                '1' => '1',
                                '2' => '2',
                                '3' => '3',
                                '4' => '4',
                                '5' => '5',
                                '6' => '6',
                            ],
                        ),
                        array(
                            'name' => 'arrows',
                            'label' => esc_html__('Show Arrows', 'nexros'),
                            'type' => \Elementor\Controls_Manager::SWITCHER,
                            'default' => false,
                        ),
                        array(
                            'name' => 'pagination',
                            'label' => esc_html__('Show Pagination', 'nexros'),
                            'type' => \Elementor\Controls_Manager::SWITCHER,
                            'default' => false,
                        ),
                        array(
                            'name' => 'pause_on_hover',
                            'label' => esc_html__('Pause on Hover', 'nexros'),
                            'type' => \Elementor\Controls_Manager::SWITCHER,
                            'default' => false,
                        ),
                        array(
                            'name' => 'autoplay',
                            'label' => esc_html__('Autoplay', 'nexros'),
                            'type' => \Elementor\Controls_Manager::SWITCHER,
                            'default' => false,
                        ),
                        array(
                            'name' => 'autoplay_speed',
                            'label' => esc_html__('Autoplay Speed', 'nexros'),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'default' => '5000',
                        ),
                        array(
                            'name' => 'infinite',
                            'label' => esc_html__('Infinite', 'nexros'),
                            'type' => \Elementor\Controls_Manager::SWITCHER,
                            'default' => false,
                        ),
                        array(
                            'name' => 'speed',
                            'label' => esc_html__('Speed', 'nexros'),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'default' => '500',
                        ),
                        array(
                            'name' => 'center',
                            'label' => esc_html__('Center', 'nexros'),
                            'type' => \Elementor\Controls_Manager::SWITCHER,
                            'default' => false,
                        ),
                        array(
                            'name' => 'drap',
                            'label' => esc_html__('Drap', 'nexros'),
                            'type' => \Elementor\Controls_Manager::SWITCHER,
                            'default' => false,
                        ),
                    ),
                ),
                array(
                    'name' => 'section_style_title',
                    'label' => esc_html__('Title', 'nexros'),
                    'tab' => \Elementor\Controls_Manager::TAB_STYLE,
                    'controls' => array(
                        array(
                            'name' => 'show_shape',
                            'label' => esc_html__('Show Shape', 'nexros' ),
                            'type' => \Elementor\Controls_Manager::SWITCHER,
                            'condition' => [
                                'layout' => '1',
                            ],
                            'default' => 'true',
                        ),
                        array(
                            'name' => 'shape_color',
                            'label' => esc_html__('Shape Color', 'nexros' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'condition' => [
                                'show_shape' => 'true',
                            ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-tabs-slip .pxl-shape-container .grid-item' => 'background-color: {{VALUE}} !important;',
                            ],
                        ),
                        array(
                            'name' => 'shape_bg',
                            'label' => esc_html__('Shape Background', 'nexros' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'condition' => [
                                'show_shape' => 'true',
                            ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-tabs-slip .pxl-shape-container' => 'background-color: {{VALUE}};',
                            ],
                        ),
                        array(
                            'name' => 'title_color',
                            'label' => esc_html__('Color', 'nexros' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-tabs-slip .pxl-tab-title' => 'background-image: linear-gradient(to right, {{VALUE}} 0%, {{VALUE}} 50%, {{VALUE}}5C 50%, {{VALUE}}5C 100%);',
                                '{{WRAPPER}} .pxl-tabs-slip .pxl-tab-title:before' => 'background-color: {{VALUE}};',
                            ],
                        ),
                        array(
                            'name' => 'title_color_line',
                            'label' => esc_html__('Color Line', 'nexros' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-tabs-slip .pxl-tab-title:after' => 'background-color: {{VALUE}};',
                            ],
                        ),
                        array(
                            'name' => 'title_typography',
                            'label' => esc_html__('Typography', 'nexros' ),
                            'type' => \Elementor\Group_Control_Typography::get_type(),
                            'control_type' => 'group',
                            'selector' => '{{WRAPPER}} .pxl-tabs-slip .pxl-tab-title',
                        ),
                        array(
                            'name' => 'title_margin',
                            'label' => esc_html__('Margin', 'nexros' ),
                            'type' => \Elementor\Controls_Manager::DIMENSIONS,
                            'size_units' => [ 'px' ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-tabs-slip .pxl-tab-title' => 'margin: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                            ],
                        ),
                    ),
                ),
            ),
        ),
    ),nexros_get_class_widget_path()
);