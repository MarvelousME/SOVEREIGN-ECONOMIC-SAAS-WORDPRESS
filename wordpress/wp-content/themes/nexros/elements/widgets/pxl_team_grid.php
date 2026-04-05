<?php
pxl_add_custom_widget(
    array(
        'name' => 'pxl_team_grid',
        'title' => esc_html__('Tnex Team Grid', 'nexros'),
        'icon' => 'eicon-person icon-brand-elementor',
        'categories' => array('pxltheme-core'),
        'scripts' => [
            'imagesloaded',
            'isotope',
            'pxl-post-grid'
        ],
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
                                    'image' => get_template_directory_uri() . '/elements/templates/pxl_team_grid/img-layout/layout1.jpg'
                                ],
                            ],
                        ),
                    ),
                ),
                array(
                    'name' => 'section_content',
                    'label' => esc_html__('Content', 'nexros'),
                    'tab' => \Elementor\Controls_Manager::TAB_CONTENT,
                    'condition' => [
                        'layout' => '1'
                    ],
                    'controls' => array(
                        array(
                            'name' => 'team',
                            'label' => esc_html__('Team', 'nexros'),
                            'type' => \Elementor\Controls_Manager::REPEATER,
                            'default' => [],
                            'controls' => array(
                                array(
                                    'name' => 'image',
                                    'label' => esc_html__('Image', 'nexros' ),
                                    'type' => \Elementor\Controls_Manager::MEDIA,
                                ),
                                array(
                                    'name' => 'title',
                                    'label' => esc_html__('Name', 'nexros'),
                                    'type' => \Elementor\Controls_Manager::TEXT,
                                    'label_block' => true,
                                ),
                                array(
                                    'name' => 'position',
                                    'label' => esc_html__('Position', 'nexros'),
                                    'type' => \Elementor\Controls_Manager::TEXT,
                                ),
                                array(
                                    'name' => 'link',
                                    'label' => esc_html__('Link', 'nexros'),
                                    'type' => \Elementor\Controls_Manager::URL,
                                    'label_block' => true,
                                ),
                                array(
                                    'name' => 'social',
                                    'label' => esc_html__( 'Social', 'nexros' ),
                                    'type' => 'pxl_icons',
                                ),                                
                            ),
                            'title_field' => '{{{ title }}}',
                        ),
                    ),
                ),
                array(
                    'name' => 'section_settings',
                    'label' => esc_html__('Grid', 'nexros' ),
                    'tab' => \Elementor\Controls_Manager::TAB_SETTINGS,
                    'controls' => array(
                        array(
                            'name' => 'img_size',
                            'label' => esc_html__('Image Size', 'nexros' ),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'description' => 'Enter image size (Example: "thumbnail", "medium", "large", "full" or other sizes defined by theme). Alternatively enter size in pixels (Default: 370x300 (Width x Height)).',
                        ),
                        array(
                            'name' => 'layout_mode',
                            'label' => esc_html__('Layout Mode', 'nexros' ),
                            'type' => \Elementor\Controls_Manager::SELECT,
                            'default' => 'masonry',
                            'options' => [
                                'masonry' => esc_html__('Masonry', 'nexros' ),
                                'fitRows' => esc_html__('Fit Rows', 'nexros' ),
                            ],
                        ),
                        array(
                            'name' => 'pxl_animate',
                            'label' => esc_html__('Pxl Animate', 'nexros' ),
                            'type' => \Elementor\Controls_Manager::SELECT,
                            'options' => nexros_widget_animate(),
                            'default' => '',
                        ),
                        array(
                            'name' => 'col_xs',
                            'label' => esc_html__('Columns XS Devices', 'nexros' ),
                            'type' => \Elementor\Controls_Manager::SELECT,
                            'default' => '1',
                            'options' => [
                                '1' => '1',
                                '2' => '2',
                                '3' => '3',
                                '4' => '4',
                                '6' => '6',
                            ],
                        ),
                        array(
                            'name' => 'col_sm',
                            'label' => esc_html__('Columns SM Devices', 'nexros' ),
                            'type' => \Elementor\Controls_Manager::SELECT,
                            'default' => '2',
                            'options' => [
                                '1' => '1',
                                '2' => '2',
                                '3' => '3',
                                '4' => '4',
                                '6' => '6',
                            ],
                        ),
                        array(
                            'name' => 'col_md',
                            'label' => esc_html__('Columns MD Devices', 'nexros' ),
                            'type' => \Elementor\Controls_Manager::SELECT,
                            'default' => '2',
                            'options' => [
                                '1' => '1',
                                '2' => '2',
                                '3' => '3',
                                '4' => '4',
                                '6' => '6',
                            ],
                        ),
                        array(
                            'name' => 'col_lg',
                            'label' => esc_html__('Columns LG Devices', 'nexros' ),
                            'type' => \Elementor\Controls_Manager::SELECT,
                            'default' => '3',
                            'options' => [
                                '1' => '1',
                                '2' => '2',
                                '3' => '3',
                                '4' => '4',
                                '6' => '6',
                            ],
                        ),
                        array(
                            'name' => 'col_xl',
                            'label' => esc_html__('Columns XL Devices', 'nexros' ),
                            'type' => \Elementor\Controls_Manager::SELECT,
                            'default' => '3',
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
                            'name' => 'item_padding',
                            'label' => esc_html__('Item Padding', 'nexros' ),
                            'type' => \Elementor\Controls_Manager::DIMENSIONS,
                            'size_units' => [ 'px' ],
                            'default' => [
                                'top' => '24',
                                'right' => '24',
                                'bottom' => '24',
                                'left' => '24'
                            ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-grid-inner' => 'margin-top: -{{TOP}}{{UNIT}}; margin-right: -{{RIGHT}}{{UNIT}}; margin-bottom: -{{BOTTOM}}{{UNIT}}; margin-left: -{{LEFT}}{{UNIT}};',
                                '{{WRAPPER}} .pxl-grid-inner .pxl-grid-item' => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                            ],
                            'control_type' => 'responsive',
                        ),
                        array(
                            'name'         => 'gap_extra',
                            'label'        => esc_html__( 'Item Gap Bottom', 'nexros' ),
                            'description'  => esc_html__( 'Add extra space at bottom of each items','nexros'),
                            'type'         => \Elementor\Controls_Manager::NUMBER,
                            'default'      => 0,
                            'control_type' => 'responsive',
                            'selectors' => [
                                '{{WRAPPER}} .pxl-grid-inner .pxl-grid-item' => 'margin-bottom: {{VALUE}}px;',
                            ],
                        ),
                    ),
),
array(
    'name' => 'section_style',
    'label' => esc_html__('Style', 'nexros' ),
    'tab' => \Elementor\Controls_Manager::TAB_STYLE,
    'controls' => array_merge(
        nexros_widget_color_type([
            'prefix' => 'icon',
            'selectors_class' => '.pxl-team-grid1.style-overlay .pxl-item--inner .pxl-item--image:before, .pxl-team-carousel1.style-overlay .pxl-item--inner .pxl-item--image:before',
        ]),
        array(
            array(
                'name' => 'style',
                'label' => esc_html__('Hover Image Effect', 'nexros' ),
                'type' => \Elementor\Controls_Manager::SELECT,
                'options' => [
                    'style-circle' => 'Circle',
                    'style-overlay' => 'Overlay',
                    'none' => 'None',
                ],
                'default' => 'style-circle',
            ),
            array(
                'name' => 'img_margin',
                'label' => esc_html__('Image Margin', 'nexros' ),
                'type' => \Elementor\Controls_Manager::DIMENSIONS,
                'control_type' => 'responsive',
                'size_units' => [ 'px', '%', 'vw', 'vh' ],
                'selectors' => [
                    '{{WRAPPER}} .pxl-team-grid .pxl-item--image' => 'margin: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                ],
            ),
            array(
                'name' => 'img_min_height',
                'label' => esc_html__('Image Min Height (px)', 'nexros' ),
                'type' => \Elementor\Controls_Manager::SLIDER,
                'description' => esc_html__('Enter number.', 'nexros' ),
                'range' => [
                    'px' => [
                        'min' => 0,
                        'max' => 3000,
                    ],
                ],
                'control_type' => 'responsive',
                'selectors' => [
                    '{{WRAPPER}} .pxl-team-grid .pxl-item--image img' => 'min-height: {{SIZE}}{{UNIT}};',
                ],
                'separator' => 'after',
            ),
            array(
                'name' => 'title_color',
                'label' => esc_html__('Title Color', 'nexros' ),
                'type' => \Elementor\Controls_Manager::COLOR,
                'selectors' => [
                    '{{WRAPPER}} .pxl-team-grid .pxl-item--title' => 'color: {{VALUE}};',
                ],
            ),
            array(
                'name' => 'hover_link_color',
                'label' => esc_html__('Hover Link Color', 'nexros' ),
                'type' => \Elementor\Controls_Manager::COLOR,
                'selectors' => [
                    '{{WRAPPER}} .pxl-team-grid .pxl-item--title a:hover' => 'color: {{VALUE}};',
                ],
            ),
            array(
                'name' => 'title_typography',
                'label' => esc_html__('Title Typography', 'nexros' ),
                'type' => \Elementor\Group_Control_Typography::get_type(),
                'control_type' => 'group',
                'selector' => '{{WRAPPER}} .pxl-team-grid .pxl-item--title',
            ),
            array(
                'name' => 'title_margin',
                'label' => esc_html__('Title Margin', 'nexros' ),
                'type' => \Elementor\Controls_Manager::DIMENSIONS,
                'control_type' => 'responsive',
                'size_units' => [ 'px', '%', 'vw', 'vh' ],
                'selectors' => [
                    '{{WRAPPER}} .pxl-team-grid .pxl-item--title' => 'margin: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                ],
                'separator' => 'after',
            ),
            array(
                'name' => 'pos_color',
                'label' => esc_html__('Position Color', 'nexros' ),
                'type' => \Elementor\Controls_Manager::COLOR,
                'selectors' => [
                    '{{WRAPPER}} .pxl-team-grid .pxl-item--position' => 'color: {{VALUE}};',
                ],
            ),
            array(
                'name' => 'pos_typography',
                'label' => esc_html__('Position Typography', 'nexros' ),
                'type' => \Elementor\Group_Control_Typography::get_type(),
                'control_type' => 'group',
                'selector' => '{{WRAPPER}} .pxl-team-grid .pxl-item--position',
            ),
            array(
                'name'  => 'line_width',
                'label' => esc_html__( 'Line Width', 'nexros' ),
                'type'  => 'slider',
                'control_type' => 'responsive',
                'size_units' => [ 'px', '%', 'vw', 'vh' ],
                'range' => [
                    'px' => [
                        'min' => 0,
                        'max' => 300,
                    ],
                ],
                'selectors' => [
                    '{{WRAPPER}} .pxl-team-grid .pxl-item--position:after' => 'width: {{SIZE}}{{UNIT}};',
                ],
            ),
            array(
                'name'  => 'line_height',
                'label' => esc_html__( 'Line Height', 'nexros' ),
                'type'  => 'slider',
                'control_type' => 'responsive',
                'size_units' => [ 'px', '%', 'vw', 'vh' ],
                'range' => [
                    'px' => [
                        'min' => 0,
                        'max' => 300,
                    ],
                ],
                'selectors' => [
                    '{{WRAPPER}} .pxl-team-grid .pxl-item--position:after' => 'height: {{SIZE}}{{UNIT}};',
                ],
            ),
            array(
                'name' => 'line_color',
                'label' => esc_html__('Line Color', 'nexros' ),
                'type' => \Elementor\Controls_Manager::COLOR,
                'selectors' => [
                    '{{WRAPPER}} .pxl-team-grid .pxl-item--position:after' => 'background-color: {{VALUE}};',
                ],
            ),
            array(
                'name'  => 'icon_size',
                'label' => esc_html__( 'Icon Size', 'nexros' ),
                'control_type' => 'responsive',
                'size_units' => [ 'px', '%', 'vw', 'vh' ],
                'type'  => 'slider',
                'range' => [
                    'px' => [
                        'min' => 0,
                        'max' => 300,
                    ],
                ],
                'selectors' => [
                    '{{WRAPPER}} .pxl-team-grid .pxl-item--social a' => 'font-size: {{SIZE}}{{UNIT}};',
                ],
            ),
            array(
                'name' => 'icon_width',
                'label' => esc_html__('Icon Width', 'nexros' ),
                'type' => \Elementor\Controls_Manager::SLIDER,
                'control_type' => 'responsive',
                'size_units' => [ 'px', '%', 'vw', 'vh' ],
                'range' => [
                    'px' => [
                        'min' => 0,
                        'max' => 3000,
                    ],
                ],
                'selectors' => [
                    '{{WRAPPER}} .pxl-team-grid .pxl-item--social a' => 'width: {{SIZE}}{{UNIT}}; height: {{SIZE}}{{UNIT}}; line-height: {{SIZE}}{{UNIT}};',
                ],
            ),
            array(
                'name' => 'icon_color',
                'label' => esc_html__('Icon Color', 'nexros' ),
                'type' => \Elementor\Controls_Manager::COLOR,
                'selectors' => [
                    '{{WRAPPER}} .pxl-team-grid .pxl-item--social a i' => 'color: {{VALUE}};',
                ],
            ),
            array(
                'name' => 'icon_color_hover',
                'label' => esc_html__('Icon Color Hover', 'nexros' ),
                'type' => \Elementor\Controls_Manager::COLOR,
                'selectors' => [
                    '{{WRAPPER}} .pxl-team-grid .pxl-item--social a:hover i' => 'color: {{VALUE}};',
                ],
            ),
            array(
                'name' => 'icon_background_color',
                'label' => esc_html__('Icon Background Color', 'nexros' ),
                'type' => \Elementor\Controls_Manager::COLOR,
                'selectors' => [
                    '{{WRAPPER}} .pxl-team-grid .pxl-item--social a' => 'background-color: {{VALUE}};',
                ],
            ),
            array(
                'name' => 'icon_background_color_hover',
                'label' => esc_html__('Icon Background Color Hover', 'nexros' ),
                'type' => \Elementor\Controls_Manager::COLOR,
                'selectors' => [
                    '{{WRAPPER}} .pxl-team-grid .pxl-item--social a span:before' => 'background-color: {{VALUE}};',
                ],
            ),
            array(
                'name' => 'box_content_color',
                'label' => esc_html__('Box Content Background Color', 'nexros' ),
                'type' => \Elementor\Controls_Manager::COLOR,
                'selectors' => [
                    '{{WRAPPER}} .pxl-item--meta' => 'background-color: {{VALUE}};',
                ],
            ),
            array(
                'name' => 'box_content_padding',
                'label' => esc_html__('Box Content Padding', 'nexros' ),
                'type' => \Elementor\Controls_Manager::DIMENSIONS,
                'control_type' => 'responsive',
                'size_units' => [ 'px', '%', 'vw', 'vh' ],
                'selectors' => [
                    '{{WRAPPER}} .pxl-team-grid .pxl-item--meta' => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                ],
            ),
            array(
                'name' => 'box_content_min_width',
                'label' => esc_html__('Box Content Min Width', 'nexros' ),
                'type' => \Elementor\Controls_Manager::SLIDER,
                'control_type' => 'responsive',
                'size_units' => [ 'px', '%', 'vw', 'vh' ],
                'range' => [
                    'px' => [
                        'min' => 0,
                        'max' => 3000,
                    ],
                ],
                'selectors' => [
                    '{{WRAPPER}} .pxl-team-grid .pxl-item--meta' => 'min-width: {{SIZE}}{{UNIT}};',
                ],
            ),
        ),
),
),
),
),
),
nexros_get_class_widget_path()
);