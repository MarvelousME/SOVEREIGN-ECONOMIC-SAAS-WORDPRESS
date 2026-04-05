<?php
pxl_add_custom_widget(
    array(
        'name' => 'pxl_offices_list',
        'title' => esc_html__('Tnex Offices List', 'nexros'),
        'icon' => 'eicon-editor-list-ul icon-brand-elementor',
        'categories' => array('pxltheme-core'),
        'params' => array(
            'sections' => array(
                array(
                    'name' => 'section_content',
                    'label' => esc_html__('Content', 'nexros'),
                    'tab' => \Elementor\Controls_Manager::TAB_CONTENT,
                    'controls' => array(
                        array(
                            'name' => 'filter',
                            'label' => esc_html__('Show Filter', 'nexros'),
                            'default'=>'false',
                            'type' => \Elementor\Controls_Manager::SWITCHER,
                        ),
                        array(
                            'name' => 'lists',
                            'label' => esc_html__('Content', 'nexros'),
                            'type' => \Elementor\Controls_Manager::REPEATER,
                            'controls' => array(
                                array(
                                    'name' => 'label',
                                    'label' => esc_html__('Label', 'nexros' ),
                                    'type' => \Elementor\Controls_Manager::TEXT,
                                    'rows' => 10,
                                    'show_label' => false,
                                ),
                                array(
                                    'name' => 'image',
                                    'label' => esc_html__('Image', 'nexros' ),
                                    'type' => \Elementor\Controls_Manager::MEDIA,
                                ),
                                array(
                                    'name' => 'btn_text',
                                    'label' => esc_html__('Button Text', 'nexros'),
                                    'type' => \Elementor\Controls_Manager::TEXT,
                                ),                                
                                array(
                                    'name' => 'btn_link',
                                    'label' => esc_html__('Link', 'nexros'),
                                    'type' => \Elementor\Controls_Manager::URL,
                                    'label_block' => true,
                                ),
                                array(
                                    'name' => 'social',
                                    'label' => esc_html__( 'Location', 'nexros' ),
                                    'type' => 'pxl_links',
                                ),
                            ),
                            'title_field' => '{{{ label }}}',
                        ),
                    ),
                ),
                array(
                    'name' => 'section_style',
                    'label' => esc_html__('Style', 'nexros' ),
                    'tab' => \Elementor\Controls_Manager::TAB_STYLE,
                    'controls' => array(
                        array(
                            'name' => 'label_color',
                            'label' => esc_html__('Label Color', 'nexros' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-offices-list .pxl-item-label' => 'color: {{VALUE}};',
                            ],
                        ),
                        array(
                            'name' => 'label_typography',
                            'label' => esc_html__('Label Typography', 'nexros' ),
                            'type' => \Elementor\Group_Control_Typography::get_type(),
                            'control_type' => 'group',
                            'selector' => '{{WRAPPER}} .pxl-offices-list .pxl-item-label',
                        ),
                        array(
                            'name' => ' border_color',
                            'label' => esc_html__('Border Color', 'nexros' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-offices-list .pxl--item' => 'border-color: {{VALUE}};',
                            ],
                        ),
                        array(
                            'name' => ' background_color',
                            'label' => esc_html__('Background Color', 'nexros' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-offices-list .pxl--item' => 'background-color: {{VALUE}};',
                            ],
                        ),
                        array(
                            'name' => ' background_color_h',
                            'label' => esc_html__('Background Color Hover', 'nexros' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-offices-list .pxl--item:hover' => 'background-color: {{VALUE}};',
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