<?php

pxl_add_custom_widget(
    array(
        'name' => 'pxl_map',
        'title' => esc_html__('Tnex Map', 'nexros'),
        'icon' => 'eicon-editor-link icon-brand-elementor',
        'categories' => array('pxltheme-core'),
        'params' => array(
            'sections' => array(
                array(
                    'name' => 'section_content',
                    'label' => esc_html__('Content', 'nexros'),
                    'tab' => \Elementor\Controls_Manager::TAB_CONTENT,
                    'controls' => array(
                        array(
                            'name' => 'image',
                            'label' => esc_html__('Choose Image', 'nexros'),
                            'type' => \Elementor\Controls_Manager::MEDIA,
                        ),
                        array(
                            'name' => 'position_color',
                            'label' => esc_html__('Dot Color', 'nexros'),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-map .de-circle-1' => 'background-color: {{VALUE}}!important;',
                                '{{WRAPPER}} .pxl-map .de-circle-2' => 'border-color: {{VALUE}}!important;',
                            ],
                        ),
                        array(
                            'name' => 'link',
                            'label' => esc_html__('Address', 'nexros'),
                            'type' => \Elementor\Controls_Manager::REPEATER,
                            'controls' => array(
                                array(
                                    'name' => 'image',
                                    'label' => esc_html__('Image', 'nexros'),
                                    'type' => \Elementor\Controls_Manager::MEDIA,
                                ),
                                array(
                                    'name' => 'text',
                                    'label' => esc_html__('Address', 'nexros'),
                                    'type' => \Elementor\Controls_Manager::TEXT,
                                    'label_block' => true,
                                ),
                                array(
                                    'name' => 'type_position',
                                    'label' => esc_html__('Position', 'nexros'),
                                    'type' => \Elementor\Controls_Manager::SELECT,
                                    'options' => [
                                        'top-left' => 'Top Left',
                                        'bottom-left' => 'Bottom Left',
                                        'top-right' => 'Top Right',
                                        'bottom-right' => 'Bottom Right',
                                    ],
                                    'default' => 'top-left',
                                ),
                                array(
                                    'name' => 'top_position',
                                    'label' => esc_html__('Top Position', 'nexros'),
                                    'type' => \Elementor\Controls_Manager::SLIDER,
                                    'control_type' => 'responsive',
                                    'size_units' => ['px', '%'],
                                    'default' => [
                                        'size' => 0,
                                        'unit' => '%',
                                    ],
                                    'tablet_default' => [
                                        'size' => 0,
                                        'unit' => '%',
                                    ],
                                    'mobile_default' => [
                                        'size' => 0,
                                        'unit' => '%',
                                    ],
                                    'range' => [
                                        '%' => [
                                            'min' => -100,
                                            'max' => 100,
                                        ],
                                        'px' => [
                                            'min' => -500,
                                            'max' => 500,
                                        ],
                                    ],
                                    'condition' => [
                                        'type_position' => ['top-left', 'top-right'],
                                    ],
                                    'selectors' => [
                                        '{{WRAPPER}} {{CURRENT_ITEM}}' => 'top: {{SIZE}}{{UNIT}};',
                                    ],
                                ),
                                array(
                                    'name' => 'left_position',
                                    'label' => esc_html__('Left Position', 'nexros'),
                                    'type' => \Elementor\Controls_Manager::SLIDER,
                                    'control_type' => 'responsive',
                                    'size_units' => ['px', '%'],
                                    'default' => [
                                        'size' => 0,
                                        'unit' => '%',
                                    ],
                                    'tablet_default' => [
                                        'size' => 0,
                                        'unit' => '%',
                                    ],
                                    'mobile_default' => [
                                        'size' => 0,
                                        'unit' => '%',
                                    ],
                                    'range' => [
                                        '%' => [
                                            'min' => -100,
                                            'max' => 100,
                                        ],
                                        'px' => [
                                            'min' => -500,
                                            'max' => 500,
                                        ],
                                    ],
                                    'condition' => [
                                        'type_position' => ['top-left', 'bottom-left'],
                                    ],
                                    'selectors' => [
                                        '{{WRAPPER}} {{CURRENT_ITEM}}' => 'left: {{SIZE}}{{UNIT}};',
                                    ],
                                ),
                                array(
                                    'name' => 'bottom_position',
                                    'label' => esc_html__('Bottom Position', 'nexros'),
                                    'type' => \Elementor\Controls_Manager::SLIDER,
                                    'control_type' => 'responsive',
                                    'size_units' => ['px', '%'],
                                    'default' => [
                                        'size' => 0,
                                        'unit' => '%',
                                    ],
                                    'tablet_default' => [
                                        'size' => 0,
                                        'unit' => '%',
                                    ],
                                    'mobile_default' => [
                                        'size' => 0,
                                        'unit' => '%',
                                    ],
                                    'range' => [
                                        '%' => [
                                            'min' => -100,
                                            'max' => 100,
                                        ],
                                        'px' => [
                                            'min' => -500,
                                            'max' => 500,
                                        ],
                                    ],
                                    'condition' => [
                                        'type_position' => ['bottom-left', 'bottom-right'],
                                    ],
                                    'selectors' => [
                                        '{{WRAPPER}} {{CURRENT_ITEM}}' => 'bottom: {{SIZE}}{{UNIT}};',
                                    ],
                                ),
                                array(
                                    'name' => 'right_position',
                                    'label' => esc_html__('Right Position', 'nexros'),
                                    'type' => \Elementor\Controls_Manager::SLIDER,
                                    'control_type' => 'responsive',
                                    'size_units' => ['px', '%'],
                                    'default' => [
                                        'size' => 0,
                                        'unit' => '%',
                                    ],
                                    'tablet_default' => [
                                        'size' => 0,
                                        'unit' => '%',
                                    ],
                                    'mobile_default' => [
                                        'size' => 0,
                                        'unit' => '%',
                                    ],
                                    'range' => [
                                        '%' => [
                                            'min' => -100,
                                            'max' => 100,
                                        ],
                                        'px' => [
                                            'min' => -500,
                                            'max' => 500,
                                        ],
                                    ],
                                    'condition' => [
                                        'type_position' => ['top-right', 'bottom-right'],
                                    ],
                                    'selectors' => [
                                        '{{WRAPPER}} {{CURRENT_ITEM}}' => 'right: {{SIZE}}{{UNIT}};',
                                    ],
                                ),
                            ),
                            'title_field' => '{{{ text }}}',
                        ),
                    ),
                ),
            ),
            nexros_widget_animation_settings(),
        ),
    ),
    nexros_get_class_widget_path()
);