<?php
pxl_add_custom_widget(
    array(
        'name' => 'pxl_progressbar',
        'title' => esc_html__( 'Tnex Progress Bar', 'nexros' ),
        'icon' => 'eicon-skill-bar icon-brand-elementor',
        'categories' => array('pxltheme-core'),
        'scripts' => array(
            'pxl-progressbar',
            'nexros-progressbar',
        ),
        'params' => array(
            'sections' => array(
                array(
                    'name' => 'tab_layout',
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
                                    'image' => get_template_directory_uri() . '/elements/widgets/img-layout/pxl_progressbar/layout1.jpg'
                                ],
                                '2' => [
                                    'label' => esc_html__('Layout 2', 'nexros' ),
                                    'image' => get_template_directory_uri() . '/elements/widgets/img-layout/pxl_progressbar/layout2.jpg'
                                ],
                                '3' => [
                                    'label' => esc_html__('Layout 3', 'nexros' ),
                                    'image' => get_template_directory_uri() . '/elements/widgets/img-layout/pxl_progressbar/layout3.jpg'
                                ],
                            ],
                        ),
                    ),
                ),
                array(
                    'name' => 'tab_content',
                    'label' => esc_html__( 'Content', 'nexros' ),
                    'tab' => \Elementor\Controls_Manager::TAB_CONTENT,
                    'controls' => array(
                        array(
                            'name' => 'progressbar',
                            'label' => esc_html__( 'Progress Bar', 'nexros' ),
                            'type' => \Elementor\Controls_Manager::REPEATER,
                            'condition' => [
                                'layout' => '1',
                            ],
                            'controls' => array(
                                array(
                                    'name' => 'title',
                                    'label' => esc_html__( 'Title', 'nexros' ),
                                    'type' => \Elementor\Controls_Manager::TEXT,
                                    'label_block' => true,
                                ),
                                array(
                                    'name' => 'percent',
                                    'label' => esc_html__( 'Percentage', 'nexros' ),
                                    'type' => \Elementor\Controls_Manager::SLIDER,
                                    'default' => [
                                        'size' => 50,
                                        'unit' => '%',
                                    ],
                                    'label_block' => true,
                                ),
                                array(
                                    'name' => 'number',
                                    'label' => esc_html__( 'Number', 'nexros' ),
                                    'type' => \Elementor\Controls_Manager::TEXT,
                                    'default' => 50,
                                    'label_block' => true,
                                ),
                            ),
                            'title_field' => '{{{ title }}}',
                        ),
                        array(
                            'name' => 'progressbar1',
                            'label' => esc_html__( 'Progress Bar', 'nexros' ),
                            'type' => \Elementor\Controls_Manager::REPEATER,
                            'condition' => [
                                'layout' => '2',
                            ],
                            'controls' => array(
                                array(
                                    'name' => 'title1',
                                    'label' => esc_html__( 'Title', 'nexros' ),
                                    'type' => \Elementor\Controls_Manager::TEXT,
                                    'label_block' => true,
                                ),
                                array(
                                    'name' => 'number',
                                    'label' => esc_html__( 'Number', 'nexros' ),
                                    'type' => \Elementor\Controls_Manager::NUMBER,
                                    'label_block' => true,
                                ),
                                array(
                                    'name' => 'percent1',
                                    'label' => esc_html__( 'Percentage', 'nexros' ),
                                    'type' => \Elementor\Controls_Manager::SLIDER,
                                    'default' => [
                                        'size' => 50,
                                        'unit' => '%',
                                    ],
                                    'label_block' => true,
                                ),
                            ),
                            'title_field' => '{{{ title1 }}}',
                        ),
                        array(
                            'name' => 'progressbar_height',
                            'label' => esc_html__('Progressbar Height', 'nexros' ),
                            'type' => \Elementor\Controls_Manager::SLIDER,
                            'description' => esc_html__('Enter number.', 'nexros' ),
                            'range' => [
                                'px' => [
                                    'min' => 0,
                                    'max' => 10,
                                ],
                            ],
                            'control_type' => 'responsive',
                            'selectors' => [
                                '{{WRAPPER}} .pxl-progressbar-1 .pxl-progressbar--wrap,{{WRAPPER}} .pxl-progressbar-1 .pxl-progressbar--wrap .pxl--progressbar,{{WRAPPER}} .pxl-progressbar-2 .pxl--item' => 'height: {{SIZE}}{{UNIT}};',
                            ],
                        ),
                        array(
                            'name' => 'progressbar_border_radius',
                            'label' => esc_html__('Border Radius', 'nexros' ),
                            'type' => \Elementor\Controls_Manager::DIMENSIONS,
                            'size_units' => [ 'px' ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-progressbar-1 .pxl-progressbar--wrap,{{WRAPPER}} .pxl-progressbar-1 .pxl-progressbar--wrap .pxl--progressbar,{{WRAPPER}} .pxl-progressbar-2 .pxl--item,{{WRAPPER}} .pxl-progressbar-2 .stat-box' => 'border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                            ],
                        ),
                        array(
                            'name' => 'item_space',
                            'label' => esc_html__('Item Spacer', 'nexros' ),
                            'type' => \Elementor\Controls_Manager::SLIDER,
                            'control_type' => 'responsive',
                            'size_units' => [ 'px' ],
                            'range' => [
                                'px' => [
                                    'min' => 0,
                                    'max' => 300,
                                ],
                            ],
                            'condition' => [
                                'layout' => '1',
                            ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-progressbar .pxl--item + .pxl--item' => 'margin-top: {{SIZE}}{{UNIT}};',
                            ],
                        ),
                        array(
                            'name' => 'item_space_2',
                            'label' => esc_html__('Item Spacer', 'nexros' ),
                            'type' => \Elementor\Controls_Manager::SLIDER,
                            'control_type' => 'responsive',
                            'size_units' => [ 'px' ],
                            'range' => [
                                'px' => [
                                    'min' => 0,
                                    'max' => 300,
                                ],
                            ],
                            'condition' => [
                                'layout' => '2',
                            ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-progressbar-2' => 'gap: {{SIZE}}{{UNIT}};',
                            ],
                        ),
                    ),
                ),
                array(
                    'name'     => 'source_section',
                    'label'    => esc_html__( 'Source Settings', 'nexros' ),
                    'tab' => \Elementor\Controls_Manager::TAB_CONTENT,
                    'condition' => [                                
                        'layout' => '3',
                    ],
                    'controls' => array(
                        array(
                            'name' => 'circle_size',
                            'label'     => esc_html__( 'Size', 'nexros' ),
                            'type'      => \Elementor\Controls_Manager::SLIDER,
                            'control_type' => 'responsive',
                            'range'     => array(
                                'px' => array(
                                    'min'  => 50,
                                    'max'  => 500,
                                    'step' => 1,
                                ),
                            ),
                            'default'   => array(
                                'size' => 174,
                            ),
                            'selectors' => array(
                                '{{WRAPPER}} .pxl-progressbar-inner' => 'width: {{SIZE}}px; height: {{SIZE}}px',
                            ),
                        ),
                        array(
                            'name' => 'circle_size_max',
                            'label'     => esc_html__( 'Max Width', 'nexros' ),
                            'type'      => \Elementor\Controls_Manager::SLIDER,
                            'control_type' => 'responsive',
                            'range'     => array(
                                'px' => array(
                                    'min'  => 50,
                                    'max'  => 500,
                                    'step' => 1,
                                ),
                            ),
                            'selectors' => array(
                                '{{WRAPPER}} .pxl-progressbar-inner' => 'min-width: {{SIZE}}px;',
                            ),
                        ),
                        array(
                            'name'    => 'circle_percent',
                            'label'   => esc_html__( 'Percentage', 'nexros' ),
                            'type'    => \Elementor\Controls_Manager::SLIDER,
                            'default' => [
                                'size' => 50,
                                'unit' => '%',
                            ],
                            'label_block' => true,
                        ),
                        array(
                            'name' => 'circle_speed',
                            'label' => esc_html__('Speed (milliseconds)', 'nexros'),
                            'type' => \Elementor\Controls_Manager::NUMBER,
                        ),
                        array(
                            'name'        => 'circle_title',
                            'label'       => esc_html__( 'Title', 'nexros' ),
                            'type'        => \Elementor\Controls_Manager::TEXT,
                            'placeholder' => esc_html__( 'Enter your title', 'nexros' ),
                            'default'     => esc_html__( 'Achived', 'nexros' ),
                            'label_block' => true,
                        ),
                        array(
                            'name' => 'circle_number',
                            'label' => esc_html__('Number Value', 'nexros'),
                            'type' => \Elementor\Controls_Manager::NUMBER,
                            'default' => 50,
                        ),
                        array(
                            'name' => 'prefix',
                            'label' => esc_html__('Number Prefix', 'nexros'),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'default' => '',
                        ),
                        array(
                            'name' => 'suffix',
                            'label' => esc_html__('Number Suffix', 'nexros'),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'default' => '',
                        ),
                        
                    )
                ),
                array(
                    'name' => 'section_title_2',
                    'label' => esc_html__( 'Style', 'nexros' ),
                    'tab' => \Elementor\Controls_Manager::TAB_STYLE,
                    'condition' => [                                
                        'layout' => '3',
                    ],                   
                    'controls' => array_merge(
                        array(
                            array(
                                'name' => 'title_color_1',
                                'label' => esc_html__( 'Title Color', 'nexros' ),
                                'type' => \Elementor\Controls_Manager::COLOR,
                                'selectors' => [
                                    '{{WRAPPER}} .pxl-progressbar .progress-title' => 'color: {{VALUE}};',
                                ],
                            ),
                            array(
                                'name' => 'typography_1',
                                'label' => esc_html__( 'Title Typography', 'nexros' ),
                                'type' => \Elementor\Group_Control_Typography::get_type(),
                                'control_type' => 'group',
                                'selector' => '{{WRAPPER}} .pxl-progressbar .progress-title',
                            ),
                            array(
                                'name' => 'percent_color_1',
                                'label' => esc_html__( 'Percentage Color', 'nexros' ),
                                'type' => \Elementor\Controls_Manager::COLOR,
                                'selectors' => [
                                    '{{WRAPPER}} .pxl-progressbar .progress-percentage' => 'color: {{VALUE}};',
                                ],
                            ),
                            array(
                                'name' => 'percentage_typography_1',
                                'label' => esc_html__( 'Percentage Typography', 'nexros' ),
                                'type' => \Elementor\Group_Control_Typography::get_type(),
                                'control_type' => 'group',
                                'selector' => '{{WRAPPER}} .pxl-progressbar .progress-percentage',
                            ),
                            array(
                                'name' => 'bound_color_1',
                                'label' => esc_html__( 'Bound Background Color', 'nexros' ),
                                'type' => \Elementor\Controls_Manager::COLOR,
                                'selectors' => [
                                    '{{WRAPPER}} .pxl-progressbar .svg1 .progress-bar__progress' => 'stroke: {{VALUE}};',
                                ],
                            ),
                            array(
                                'name'         => 'box_shadow',
                                'label' => esc_html__( 'Box Shadow', 'nexros' ),
                                'type'         => \Elementor\Group_Control_Box_Shadow::get_type(),
                                'control_type' => 'group',
                                'selector'     => '{{WRAPPER}} .pxl-progressbar .pxl-progressbar-circle'
                            ),
                            array(
                                'name' => 'bar_color_1',
                                'label' => esc_html__( 'Bar Background Color', 'nexros' ),
                                'type' => \Elementor\Controls_Manager::COLOR,
                                'selectors' => [
                                    '{{WRAPPER}} .pxl-progressbar .svg2 .progress-bar__progress' => 'stroke: {{VALUE}};',
                                ],
                            ),
                            array(
                                'name' => 'bar_color_linear_1',
                                'label' => esc_html__( 'Bar Background Linear', 'nexros' ),
                                'type' => \Elementor\Controls_Manager::SWITCHER,
                                'default' => 'true',
                            ),
                            array(
                                'name' => 'bar_color_one_1',
                                'label' => esc_html__( 'Bar Background Color One', 'nexros' ),
                                'type' => \Elementor\Controls_Manager::COLOR,
                                'selectors' => [
                                    '{{WRAPPER}} .pxl-progressbar .stop1' => 'stop-color: {{VALUE}} !important;',
                                ],
                                'condition' => [
                                    'bar_color_linear' => 'true'
                                ]
                            ),
                            array(
                                'name' => 'bar_color_two_1',
                                'label' => esc_html__( 'Bar Background Color Two', 'nexros' ),
                                'type' => \Elementor\Controls_Manager::COLOR,
                                'selectors' => [
                                    '{{WRAPPER}} .pxl-progressbar .stop2' => 'stop-color: {{VALUE}} !important;',
                                ],
                                'condition' => [
                                    'bar_color_linear' => 'true'
                                ]
                            ),
                        ),
                ),
                ),
                array(
                    'name' => 'section_style_general',
                    'label' => esc_html__('General', 'nexros' ),
                    'tab' => \Elementor\Controls_Manager::TAB_STYLE,
                    'condition' => [
                        'layout' => ['1', '2'],
                    ],
                    'controls' => array(
                        array(
                            'name' => 'style',
                            'label' => esc_html__('Style', 'nexros' ),
                            'type' => \Elementor\Controls_Manager::SELECT,
                            'options' => [
                                'style-1' => 'Style 1',
                                'style-2' => 'Style 2',
                                'style-3' => 'Style 3',
                            ],
                            'default' => 'style-1',
                            'condition' => [
                                'layout' => '1',
                            ],
                        ),
                    ),
                ),

                array(
                    'name' => 'tab_style_title',
                    'label' => esc_html__( 'Title', 'nexros' ),
                    'tab' => \Elementor\Controls_Manager::TAB_STYLE,
                    'condition' => [
                        'layout' => ['1', '2'],
                    ],  
                    'controls' => array(
                        array(
                            'name' => 'title_color',
                            'label' => esc_html__( 'Title Color', 'nexros' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-progressbar .pxl--title,{{WRAPPER}} .pxl-progressbar-2 .stat-box .label' => 'color: {{VALUE}};',
                            ],
                        ),
                        array(
                            'name' => 'title_typography',
                            'label' => esc_html__( 'Title Typography', 'nexros' ),
                            'type' => \Elementor\Group_Control_Typography::get_type(),
                            'control_type' => 'group',
                            'selector' => '{{WRAPPER}}  .pxl-progressbar .pxl--title',
                        ),
                    ),
                ),
                array(
                    'name' => 'tab_style_percentage',
                    'label' => esc_html__( 'Percentage', 'nexros' ),
                    'tab' => \Elementor\Controls_Manager::TAB_STYLE,
                    'condition' => [
                        'layout' => ['1', '2'],
                    ],
                    'controls' => array(
                        array(
                            'name' => 'percentage_color',
                            'label' => esc_html__( 'Percentage Color', 'nexros' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-progressbar .pxl--percentage' => 'color: {{VALUE}};',
                            ],
                        ),
                        array(
                            'name' => 'percentage_typography',
                            'label' => esc_html__( 'Percentage Typography', 'nexros' ),
                            'type' => \Elementor\Group_Control_Typography::get_type(),
                            'control_type' => 'group',
                            'selector' => '{{WRAPPER}} .pxl-progressbar .pxl--percentage',
                        ),
                    ),
                ),
                array(
                    'name' => 'tab_style_bar',
                    'label' => esc_html__( 'Bar', 'nexros' ),
                    'tab' => \Elementor\Controls_Manager::TAB_STYLE,
                    'condition' => [
                        'layout' => ['1', '2'],
                    ],
                    'controls' => array(
                        array(
                            'name' => 'bar_color',
                            'label' => esc_html__( 'Bar Color', 'nexros' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-progressbar .pxl--progressbar,{{WRAPPER}} .pxl-progressbar-2 .stat-box' => 'background-color: {{VALUE}};',
                            ],
                        ),
                        array(
                            'name' => 'bar_bg_color',
                            'label' => esc_html__( 'Bar Background Color', 'nexros' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-progressbar .pxl-progressbar--wrap,{{WRAPPER}} .pxl-progressbar-2 .pxl--item' => 'background-color: {{VALUE}};',
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