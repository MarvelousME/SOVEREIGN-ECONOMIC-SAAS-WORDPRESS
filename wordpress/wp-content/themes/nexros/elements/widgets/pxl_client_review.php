<?php
// Register Icon Box Widget
pxl_add_custom_widget(
    array(
        'name' => 'pxl_client_review',
        'title' => esc_html__('Tnex Client Review', 'nexros' ),
        'icon' => 'eicon-blockquote icon-brand-elementor',
        'categories' => array('pxltheme-core'),
        'scripts' => array(
            'elementor-waypoints',
            'jquery-numerator',                    
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
                                    'image' => get_template_directory_uri() . '/elements/widgets/img-layout/pxl_client_review/layout1.jpg'
                                ],
                                '2' => [
                                    'label' => esc_html__('Layout 2', 'nexros' ),
                                    'image' => get_template_directory_uri() . '/elements/widgets/img-layout/pxl_client_review/layout2.jpg'
                                ],
                            ],
                        ),
                    ),
                ),
                array(
                    'name' => 'section_content',
                    'label' => esc_html__('Content', 'nexros' ),
                    'tab' => \Elementor\Controls_Manager::TAB_CONTENT,
                    'controls' => array(
                        array(
                            'name' => 'show_star',
                            'label' => esc_html__('Show Star', 'nexros' ),
                            'type' => \Elementor\Controls_Manager::SWITCHER,
                            'default' => 'true',
                        ),
                        array(
                            'name'      => 'star',
                            'label'     => esc_html__( 'Star', 'nexros' ),
                            'type'      => \Elementor\Controls_Manager::TEXT,
                            'default'   => esc_html__('5','nexros'),
                        ),
                        array(
                            'name'      => 'rating_text',
                            'label'     => esc_html__( 'Rating text', 'nexros' ),
                            'type'      => \Elementor\Controls_Manager::TEXT,
                            'default'   => esc_html__('Rated Company','nexros'),
                            'condition' => [
                                'layout' => ['2'],
                            ],
                        ),
                        array(
                            'name'      => 'rating_content',
                            'label'     => esc_html__( 'Content text', 'nexros' ),
                            'type'      => \Elementor\Controls_Manager::TEXT,
                            'default'   => esc_html__('Lorem ipsum dolor sit amet dolor','nexros'),
                            'condition' => [
                                'layout' => ['2'],
                            ],
                        ),
                        array(
                            'name' => 'rating_margin',
                            'label' => esc_html__('Margin(px)', 'nexros' ),
                            'type' => 'dimensions',
                            'control_type' => 'responsive',
                            'size_units' => [ 'px' ],
                            'condition' => [
                                'layout' => ['2'],
                            ],
                            'selectors' => [
                                '{{WRAPPER}} .sl-content-inner .btn' => 'margin: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                            ],
                        ),
                        array(
                            'name' => 'rating_typography',
                            'label' => esc_html__('Typography', 'nexros' ),
                            'type' => \Elementor\Group_Control_Typography::get_type(),
                            'control_type' => 'group',
                            'condition' => [
                                'layout' => ['2'],
                            ],
                            'selector' => '{{WRAPPER}} .sl-content-inner .btn',
                        ),
                        array(
                            'name' => 'style',
                            'label' => esc_html__('Style', 'nexros' ),
                            'type' => \Elementor\Controls_Manager::SELECT,
                            'default' => 'style-1',
                            'options' => [
                                'style-1' => esc_html__('(Default)', 'nexros' ),
                                'style-2' => esc_html__('Style2', 'nexros' ),
                            ],
                            'condition' => [
                                'layout' => ['1'],
                            ],
                        ),
                        array(
                            'name' => 'title',
                            'label' => esc_html__('Title', 'nexros' ),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'label_block' => true,
                            'condition' => [
                                'layout' => ['1'],
                            ],
                        ),
                        array(
                            'name' => 'title_color',
                            'label' => esc_html__( 'Title Color', 'nexros' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'default' => '',
                            'condition' => [
                                'layout' => ['1'],
                            ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-client-review1 .pxl-item--meta .pxl-item--title' => 'color: {{VALUE}};',
                            ],
                        ),
                        array(
                            'name' => 'title_typography',
                            'label' => esc_html__('Typography', 'nexros' ),
                            'type' => \Elementor\Group_Control_Typography::get_type(),
                            'control_type' => 'group',
                            'condition' => [
                                'layout' => ['1'],
                            ],
                            'selector' => '{{WRAPPER}} .pxl-client-review1 .pxl-item--meta .pxl-item--title',
                        ),
                        array(
                            'name' => 'images',
                            'label' => esc_html__('Images', 'nexros'),
                            'type' => \Elementor\Controls_Manager::GALLERY,
                            'label_block' => true,
                            'condition' => [
                                'layout' => ['1'],
                            ],
                        ),  
                        array(
                            'name' => 'image_width',
                            'label' => esc_html__('Image Width', 'nexros' ),
                            'type' => \Elementor\Controls_Manager::SLIDER,
                            'control_type' => 'responsive',
                            'size_units' => [ 'px' ],
                            'condition' => [
                                'layout' => ['1'],
                            ],
                            'range' => [
                                'px' => [
                                    'min' => 0,
                                    'max' => 300,
                                ],
                            ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-client-review1 .pxl-item--inner .pxl-item--images .pxl-item--img' => 'width: {{SIZE}}{{UNIT}};min-width: {{SIZE}}{{UNIT}};',
                            ],
                        ),
                        array(
                            'name' => 'image_space_left',
                            'label' => esc_html__('Image Spacer', 'nexros' ),
                            'type' => \Elementor\Controls_Manager::SLIDER,
                            'control_type' => 'responsive',
                            'condition' => [
                                'layout' => ['1'],
                            ],
                            'size_units' => [ 'px' ],
                            'range' => [
                                'px' => [
                                    'min' => 0,
                                    'max' => 300,
                                ],
                            ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-client-review1 .pxl-item--inner .pxl-item--images .pxl-item--img + .pxl-item--img' => 'margin-left: {{SIZE}}{{UNIT}};',
                            ],
                        ),
                        array(
                            'name' => 'border_width',
                            'label' => esc_html__( 'Border Width', 'nexros' ),
                            'type' => \Elementor\Controls_Manager::DIMENSIONS,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-client-review1 .pxl-item--inner .pxl-item--images .pxl-item--img' => 'border-width: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}} !important;',
                            ],
                            'responsive' => true,
                            'condition' => [
                                'layout' => ['1'],
                            ],
                        ),
                        array(
                            'name' => 'border_color',
                            'label' => esc_html__( 'Border Color', 'nexros' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'default' => '',
                            'selectors' => [
                                '{{WRAPPER}} .pxl-client-review1 .pxl-item--inner .pxl-item--images .pxl-item--img' => 'border-color: {{VALUE}} !important;',
                            ],
                            'separator' => 'after',
                            'condition' => [
                                'layout' => ['1'],
                            ],
                        ),
                        array(
                            'name' => 'align_client',
                            'label' => esc_html__('Alignment', 'nexros' ),
                            'type' => \Elementor\Controls_Manager::CHOOSE,
                            'control_type' => 'responsive',
                            'options' => [
                                'left'    => [
                                    'title' => esc_html__('Left', 'nexros' ),
                                    'icon' => 'fa fa-align-left',
                                ],
                                'center' => [
                                    'title' => esc_html__('Center', 'nexros' ),
                                    'icon' => 'fa fa-align-center',
                                ],
                                'right' => [
                                    'title' => esc_html__('Right', 'nexros' ),
                                    'icon' => 'fa fa-align-right',
                                ],
                            ],
                            'prefix_class' => 'elementor-align-',
                            'default' => '',
                            'selectors'         => [
                                '{{WRAPPER}} .pxl-client-review1 .pxl-item--inner' => 'justify-content: {{VALUE}}',
                            ],
                        ),
                    ),
),
nexros_widget_animation_settings(),
),
),
),
nexros_get_class_widget_path()
);