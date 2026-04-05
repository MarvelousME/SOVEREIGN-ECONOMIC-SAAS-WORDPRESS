<?php
pxl_add_custom_widget(
    array(
        'name' => 'pxl_banner_box',
        'title' => esc_html__('Tnex Banner Box', 'nexros'),
        'icon' => 'eicon-posts-ticker icon-brand-elementor',
        'categories' => array('pxltheme-core'),
        'scripts' => array(
            'pxl-progressbar',
            'nexros-progressbar',
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
                                    'image' => get_template_directory_uri() . '/elements/widgets/img-layout/pxl_banner_box/layout1.jpg'
                                ],
                                '2' => [
                                    'label' => esc_html__('Layout 2', 'nexros' ),
                                    'image' => get_template_directory_uri() . '/elements/widgets/img-layout/pxl_banner_box/layout2.jpg'
                                ],
                                '3' => [
                                    'label' => esc_html__('Layout 3', 'nexros' ),
                                    'image' => get_template_directory_uri() . '/elements/widgets/img-layout/pxl_banner_box/layout3.jpg'
                                ],
                                '4' => [
                                    'label' => esc_html__('Layout 4', 'nexros' ),
                                    'image' => get_template_directory_uri() . '/elements/widgets/img-layout/pxl_banner_box/layout4.jpg'
                                ],
                                '5' => [
                                    'label' => esc_html__('Layout 5', 'nexros' ),
                                    'image' => get_template_directory_uri() . '/elements/widgets/img-layout/pxl_banner_box/layout5.jpg'
                                ],
                                '6' => [
                                    'label' => esc_html__('Layout 6', 'nexros' ),
                                    'image' => get_template_directory_uri() . '/elements/widgets/img-layout/pxl_banner_box/layout6.jpg'
                                ],
                            ],
                        ),
                    ),
                ),
                array(
                    'name' => 'scl2',
                    'label' => esc_html__('Content', 'nexros'),
                    'tab' => \Elementor\Controls_Manager::TAB_CONTENT,
                    'controls' => array(
                        array(
                            'name' => 'scl2_chart_title',
                            'label' => esc_html__('Chart Title', 'nexros' ),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'default' => 'Boost in SEO Performance',
                            'label_block' => true,
                        ),
                        array(
                            'name' => 'scl2_chart_sub',
                            'label' => esc_html__('Chart Sub Description', 'nexros' ),
                            'type' => \Elementor\Controls_Manager::TEXTAREA,
                            'default' => 'Boost in SEO Performance',
                            'label_block' => true,
                        ),
                        array(
                            'name' => 'scl2_chart_number',
                            'label' => esc_html__('Chart Number', 'nexros' ),
                            'type' => \Elementor\Controls_Manager::NUMBER,
                            'default' => '70',
                            'label_block' => true,
                        ),
                        array(
                            'name' => 'scl2_chart_suffix',
                            'label' => esc_html__('Chart Suffix', 'nexros' ),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'default' => '+',
                        ),
                        array(
                            'name' => 'scl2_chart_prefix',
                            'label' => esc_html__('Chart Prefix', 'nexros' ),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'default' => '%',
                        ),
                        array(
                            'name' => 'scl2_chart_number2',
                            'label' => esc_html__('Chart Number 2', 'nexros' ),
                            'type' => \Elementor\Controls_Manager::NUMBER,
                            'default' => '100',
                            'label_block' => true,
                        ),
                        array(
                            'name' => 'scl2_chart_suffix2',
                            'label' => esc_html__('Chart Suffix 2', 'nexros' ),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'default' => '+',
                        ),
                        array(
                            'name' => 'scl2_chart_prefix2',
                            'label' => esc_html__('Chart Prefix 2', 'nexros' ),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'default' => '%',
                        ),
                        array(
                            'name' => 'scl2_chart_svg',
                            'label' => esc_html__('Chart Image(SVG)', 'nexros' ),
                            'type' => \Elementor\Controls_Manager::ICONS,
                            'description' => 'Please select "upload SVG" option and upload.'
                        ),
                        array(
                            'name' => 'scl2_link',
                            'label' => esc_html__('Description', 'nexros'),
                            'type' => \Elementor\Controls_Manager::URL,
                        ),
                    ),
                    'condition' => [
                        'layout' => '1'
                    ]
                ),
                array(
                    'name' => 'scl2_2',
                    'label' => esc_html__('Content 2', 'nexros'),
                    'tab' => \Elementor\Controls_Manager::TAB_CONTENT,
                    'condition' => [
                        'layout' => ['5', '6']
                    ],
                    'controls' => array(
                          array(
                            'name' => 'scl2_2_list',
                            'label' => esc_html__('List', 'nexros'),
                            'type' => \Elementor\Controls_Manager::REPEATER,
                            'controls' => array(
                                array(
                                    'name' => 'scl2_2_icon',
                                    'label' => esc_html__('Icon', 'nexros' ),
                                    'type' => \Elementor\Controls_Manager::ICONS,
                                    'fa4compatibility' => 'icon',
                                 ),
                                array(
                                    'name' => 'scl2_2_link',
                                    'label' => esc_html__('Link', 'nexros'),
                                    'type' => \Elementor\Controls_Manager::URL,
                                ),
                            ),
                            'title_field' => '{{{ scl2_2_icon }}}',
                    ),
                    ),
                ),
                array(
                    'name' => 'scl4',
                    'label' => esc_html__('Content', 'nexros'),
                    'tab' => \Elementor\Controls_Manager::TAB_CONTENT,
                    'controls' => array(
                        array(
                            'name' => 'scl4_content_icon',
                            'label' => esc_html__('Icon', 'nexros' ),
                            'type' => \Elementor\Controls_Manager::ICONS,
                            'fa4compatibility' => 'icon',
                        ),
                        array(
                            'name' => 'scl4_fea',
                            'label' => esc_html__('List Feature', 'nexros'),
                            'type' => \Elementor\Controls_Manager::REPEATER,
                            'description' => 'Limit 8 item',
                            'controls' => array(
                                array(
                                    'name' => 'scl4_icon',
                                    'label' => esc_html__('Icon', 'nexros' ),
                                    'type' => \Elementor\Controls_Manager::ICONS,
                                    'fa4compatibility' => 'icon',
                                ),
                                array(
                                    'name' => 'color_item',
                                    'label' => esc_html__( 'Background', 'nexros' ),
                                    'type' => \Elementor\Controls_Manager::COLOR,
                                    'default' => '',
                                    'selectors' => [
                                        '{{WRAPPER}} .pxl-banner-box {{CURRENT_ITEM}}' => 'background-color: {{VALUE}};',
                                    ],
                                ),
                                array(
                                    'name' => 'wg_wh',
                                    'label' => esc_html__('Width/Height', 'nexros' ),
                                    'type' => \Elementor\Controls_Manager::SLIDER,
                                    'control_type' => 'responsive',
                                    'size_units' => [ 'px' ],
                                    'range' => [
                                        'px' => [
                                            'min' => 0,
                                            'max' => 3000,
                                        ],
                                    ],
                                    'selectors' => [
                                        '{{WRAPPER}} .pxl-banner-box {{CURRENT_ITEM}}' => 'width: {{SIZE}}{{UNIT}}; height: {{SIZE}}{{UNIT}};',
                                    ],
                                ),
                            ),
                            'title_field' => '{{{ scl4_icon }}}',
                        ),
                        array(
                            'name' => 'scl4_link',
                            'label' => esc_html__('Description', 'nexros'),
                            'type' => \Elementor\Controls_Manager::URL,
                        ),
                    ),
                    'condition' => [
                        'layout' => ['2']
                    ]
                ),
                array(
                    'name' => 'scl4_2',
                    'label' => esc_html__('Content', 'nexros'),
                    'tab' => \Elementor\Controls_Manager::TAB_CONTENT,
                    'controls' => array(
                        array(
                            'name' => 'scl4_2_list',
                            'label' => esc_html__('List', 'nexros'),
                            'type' => \Elementor\Controls_Manager::REPEATER,
                            'controls' => array(
                                array(
                                    'name' => 'scl4_2_number',
                                    'label' => esc_html__('Number', 'nexros' ),
                                    'type' => \Elementor\Controls_Manager::TEXT,
                                ),
                                array(
                                    'name' => 'scl4_2_percent',
                                    'label' => esc_html__('Percent', 'nexros' ),
                                    'type' => \Elementor\Controls_Manager::SLIDER,
                                    'size_units' => [ '%' ],
                                    'range' => [
                                        '%' => [
                                            'min' => 0,
                                            'max' => 100,
                                        ],
                                    ],
                                    'default' => [
                                        'size' => 50,
                                        'unit' => '%',
                                    ],
                                    'label_block' => true,
                                ),
                                array(
                                    'name' => 'scl4_2_title',
                                    'label' => esc_html__('Title', 'nexros' ),
                                    'type' => \Elementor\Controls_Manager::TEXT,
                                    'label_block' => true,
                                ),
                                array(
                                    'name' => 'scl4_2_desc',
                                    'label' => esc_html__('Description', 'nexros' ),
                                    'type' => \Elementor\Controls_Manager::TEXTAREA,
                                    'label_block' => true,
                                ),
                            ),
                            'title_field' => '{{{ scl4_2_number }}}',
                        ),
                    ),
                    'condition' => [
                        'layout' => ['4']
                    ]
                ),
                array(
                    'name' => 'scl3',
                    'label' => esc_html__('Content', 'nexros'),
                    'tab' => \Elementor\Controls_Manager::TAB_CONTENT,
                    'controls' => array(
                        array(
                            'name' => 'scl3_fea',
                            'label' => esc_html__('List Feature', 'nexros'),
                            'type' => \Elementor\Controls_Manager::REPEATER,
                            'description' => 'Limit 8 item',
                            'controls' => array(
                                array(
                                    'name' => 'scl3_icon',
                                    'label' => esc_html__('Icon', 'nexros' ),
                                    'type' => \Elementor\Controls_Manager::ICONS,
                                    'fa4compatibility' => 'icon',
                                ),
                                array(
                                    'name' => 'scl3_title',
                                    'label' => esc_html__('Title', 'nexros' ),
                                    'type' => \Elementor\Controls_Manager::TEXT,
                                    'label_block' => true,
                                ),
                                array(
                                    'name' => 'wg_w',
                                    'label' => esc_html__('Width', 'nexros' ),
                                    'type' => \Elementor\Controls_Manager::SLIDER,
                                    'control_type' => 'responsive',
                                    'size_units' => [ 'px' ],
                                    'range' => [
                                        'px' => [
                                            'min' => 0,
                                            'max' => 3000,
                                        ],
                                    ],
                                    'selectors' => [
                                        '{{WRAPPER}} .pxl-banner-box {{CURRENT_ITEM}}' => 'width: {{SIZE}}{{UNIT}};',
                                    ],
                                ),
                            ),
                            'title_field' => '{{{ scl3_title }}}',
                        ),
                    ),
                    'condition' => [
                        'layout' => [ '3']
                    ]
                ),
                array(
                    'name' => 'style_number',
                    'label' => esc_html__('Style', 'nexros'),
                    'tab' => \Elementor\Controls_Manager::TAB_STYLE,
                    'condition' => [
                        'layout' => ['4'],
                    ],
                    'controls' => array(
                        array(
                            'name' => 'color_number',
                            'label' => esc_html__('Color Number', 'nexros'),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-banner-box__feature-item__number' => 'color: {{VALUE}};',
                            ],
                        ),
                        array(
                            'name' => 'color_number_bg',
                            'label' => esc_html__('Color Number/Background', 'nexros'),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-banner-box__feature-item__number' => 'background-color: {{VALUE}};',
                            ],
                        ),
                        array(
                            'name' => 'number_typography',
                            'label' => esc_html__('Typography Number', 'nexros'),
                            'type' => \Elementor\Group_Control_Typography::get_type(),
                            'control_type' => 'group',
                            'selector' => '{{WRAPPER}} .pxl-banner-box__feature-item__number',
                        ),
                        array(
                            'name' => 'color_number_title',
                            'label' => esc_html__('Color Number/Title', 'nexros'),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-banner-box__feature-item__title' => 'color: {{VALUE}};',
                            ],
                        ),
                        array(
                            'name' => 'color_number_title_typography',
                            'label' => esc_html__('Color Number/Title/Typography', 'nexros'),
                            'type' => \Elementor\Group_Control_Typography::get_type(),
                            'control_type' => 'group',
                            'selector' => '{{WRAPPER}} .pxl-banner-box__feature-item__title',
                        ),
                        array(
                            'name' => 'color_number_desc',
                            'label' => esc_html__('Color Number/Description', 'nexros'),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-banner-box__feature-item__desc' => 'color: {{VALUE}};',
                            ],
                        ),
                        array(
                            'name' => 'color_number_desc_typography',
                            'label' => esc_html__('Color Number/Description/Typography', 'nexros'),
                            'type' => \Elementor\Group_Control_Typography::get_type(),
                            'control_type' => 'group',
                            'selector' => '{{WRAPPER}} .pxl-banner-box__feature-item__desc',
                        ),
                        array(
                            'name' => 'color_number_progressbar',
                            'label' => esc_html__('Color Number/Progressbar', 'nexros'),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-banner-box__feature-item__progressbar' => 'background-color: {{VALUE}};',
                            ],
                        ),
                        array(
                            'name' => 'color_number_progressbar_bar',
                            'label' => esc_html__('Color Number/Progressbar/Bar', 'nexros'),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-banner-box__feature-item__progressbar .pxl--progressbar' => 'background-color: {{VALUE}};',
                            ],
                        ),
                    ),
                ),
            ),
        ),
    ),
    nexros_get_class_widget_path()
);