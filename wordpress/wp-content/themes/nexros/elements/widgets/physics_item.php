<?php
// Register Button Widget
pxl_add_custom_widget(
    array(
        'name' => 'physics_item',
        'title' => esc_html__('Tnex Physics', 'nexros' ),
        'icon' => 'eicon-cart-medium icon-brand-elementor',
        'categories' => array('pxltheme-core'),
        'scripts' => array(
            'pxl-matter'
        ),
        'params' => array(
            'sections' => array(
                array(
                    'name' => 'source_section',
                    'label' => esc_html__('Source Settings', 'nexros' ),
                    'tab' => \Elementor\Controls_Manager::TAB_CONTENT,
                    'controls' => array(
                        array(
                            'name' => 'texts',
                            'label' => esc_html__('List', 'nexros'),
                            'type' => \Elementor\Controls_Manager::REPEATER,
                            
                            'controls' => array(
                                array(
                                    'name' => 'pxl_icon',
                                    'label' => esc_html__('Icon', 'nexros' ),
                                    'type' => \Elementor\Controls_Manager::ICONS,
                                    'fa4compatibility' => 'icon',
                                ),
                                array(
                                    'name' => 'text',
                                    'label' => esc_html__('Text', 'nexros' ),
                                    'type' => \Elementor\Controls_Manager::TEXTAREA,
                                ),
                            ),
                        ),
                    ),
                ),
                array(
                    'name' => 'style_section',
                    'label' => esc_html__('Style Settings', 'nexros' ),
                    'tab' => \Elementor\Controls_Manager::TAB_STYLE,
                    'controls' => array(
                        array(
                            'name' => 'height',
                            'label' => esc_html__('Height', 'nexros' ),
                            'type' => \Elementor\Controls_Manager::SLIDER,
                            'control_type' => 'responsive',
                            'default' => array(
                                'size' => 495,
                            ),
                            'selectors' => [
                                '{{WRAPPER}} .pxl-physics-item' => 'height: {{SIZE}}{{UNIT}};',
                            ],
                        ),
                        array(    
                            'name' => 'text_typography',
                            'label' => esc_html__('Typography', 'nexros' ),
                            'type' => \Elementor\Group_Control_Typography::get_type(),
                            'control_type' => 'group',
                            'selector' => '{{WRAPPER}} .pxl-physics-item p',
                        ),
                    ),
                ),
            ),
        ),
    ),
    nexros_get_class_widget_path()
);