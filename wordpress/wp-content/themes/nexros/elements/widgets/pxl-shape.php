<?php
// Register Button Widget
pxl_add_custom_widget(
    array(
        'name' => 'pxl_shape',
        'title' => esc_html__('Tnex Shape', 'nexros' ),
        'icon' => 'eicon-cart-medium icon-brand-elementor',
        'categories' => array('pxltheme-core'),
        'params' => array(
            'sections' => array(
                array(
                    'name' => 'source_section',
                    'label' => esc_html__('Source Settings', 'nexros' ),
                    'tab' => \Elementor\Controls_Manager::TAB_CONTENT,
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
                        ),
                        array(
                            'name' => 'shape_row',
                            'label' => esc_html__('Number Row', 'nexros' ),
                            'type' => \Elementor\Controls_Manager::NUMBER,
                            'control_type' => 'responsive',
                            'default' => 4,
                            'min' => 1,
                        ),
                        array(
                            'name' => 'shape_column',
                            'label' => esc_html__('Number Column', 'nexros' ),
                            'type' => \Elementor\Controls_Manager::NUMBER,
                            'control_type' => 'responsive',
                            'default' => 4,
                            'min' => 1,
                        ),
                        array(
                            'name' => 'shape_main_color',
                            'label' => esc_html__('Box Color', 'nexros' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'default' => '#FFFFFF',
                        ),
                        array(
                            'name' => 'box_height',
                            'label' => esc_html__('Box Height', 'nexros' ),
                            'type' => \Elementor\Controls_Manager::SLIDER,
                            'control_type' => 'responsive',
                            'size_units' => [ 'px' ],
                            'range' => [
                                'px' => [
                                    'min' => 0,
                                    'max' => 1000,
                                ],
                            ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-shape-container' => 'height: {{SIZE}}{{UNIT}};',
                            ],
                        ),
                        array(
                            'name' => 'box_width',
                            'label' => esc_html__('Box Width', 'nexros' ),
                            'type' => \Elementor\Controls_Manager::SLIDER,
                            'control_type' => 'responsive',
                            'size_units' => [ 'px' ],
                            'range' => [
                                'px' => [
                                    'min' => 0,
                                    'max' => 1000,
                                ],
                            ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-shape-container' => 'width: {{SIZE}}{{UNIT}};',
                            ],
                        ),
                        array(
                            'name' => 'shape_opacities',
                            'label' => esc_html__('Lists Opacities', 'nexros' ),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'default' => '1,0,1,0,0,1,0.5,0.3,1,0.7,0.5,0.1,0,0.5,0.1,0',
                            'description' => esc_html__('Enter opacity values between 0 and 1, separated by commas. Example: 1, 0.5, 0, 0.4', 'nexros'),
                        ),
                    ),
                ),
            ),
        ),
    ),
nexros_get_class_widget_path()
);