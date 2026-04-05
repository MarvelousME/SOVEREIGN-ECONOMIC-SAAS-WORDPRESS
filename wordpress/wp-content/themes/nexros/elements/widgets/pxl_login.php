<?php
// Register Button Widget
pxl_add_custom_widget(
    array(
        'name' => 'pxl_login',
        'title' => esc_html__('Tnex User', 'nexros' ),
        'icon' => 'eicon-user icon-brand-elementor',
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
                            'default' => 'style1',
                            'options' => [
                                'style1' => esc_html__('Style 1', 'nexros' ),
                                'style2' => esc_html__('Style 2', 'nexros' ),
                                'style3' => esc_html__('Style 3', 'nexros' ),
                            ],
                        ),
                        array(
                            'name' => 'icon_color_log_out',
                            'label' => esc_html__('Color Log Out', 'nexros' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-user-account a' => 'color: {{VALUE}};',
                            ],
                        ),
                        array(
                            'name' => 'icon_color_log_in',
                            'label' => esc_html__('Color Log In', 'nexros' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .btn-sign-up .pxl-sign-up-box li span' => 'color: {{VALUE}};',
                            ],
                        ),
                        array(
                            'name' => 'icon_color_log_in_active',
                            'label' => esc_html__('Color Active', 'nexros' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .btn-sign-up .pxl-sign-up-box li.pxl-shape-active span' => 'color: {{VALUE}};',
                            ],
                        ),
                        array(
                            'name' => 'background_color_log_in',
                            'label' => esc_html__('Background Color Log In', 'nexros' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-icon--users .btn-sign-up' => 'background-color: {{VALUE}};',
                            ],
                        ),
                        array(
                            'name' => 'typography',
                            'label' => esc_html__('Typography', 'nexros' ),
                            'type' => \Elementor\Group_Control_Typography::get_type(),
                            'control_type' => 'group',
                            'selector' => '{{WRAPPER}} .pxl-icon--users .pxl-user-account a,{{WRAPPER}} .btn-sign-up .pxl-sign-up-box li,{{WRAPPER}} .btn-sign-in',
                        ),
                        array(
                            'name' => 'bg_btn_color_out',
                            'label' => esc_html__(' Button Color Log Out', 'nexros' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-icon--users .pxl-user-account a' => 'background: {{VALUE}};',
                            ],
                        ),
                        array(
                            'name' => 'bg_btn_color_in',
                            'label' => esc_html__(' Button Color Log In', 'nexros' ),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-icon--users .btn-sign-up .pxl-divider-move' => 'background-color: {{VALUE}};',
                            ],
                        ),
                        array(
                            'name' => 'padding',
                            'label' => esc_html__( 'Padding', 'nexros' ),
                            'type' => \Elementor\Controls_Manager::DIMENSIONS,
                            'selectors' => [
                                '{{WRAPPER}} .btn-sign-up .pxl-sign-up-box li span,{{WRAPPER}} .btn-sign-in' => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}} !important;',
                            ],
                            'responsive' => true,
                        ),
                        array(
                            'name' => 'padding_log_out',
                            'label' => esc_html__( 'Padding Log Out', 'nexros' ),
                            'type' => \Elementor\Controls_Manager::DIMENSIONS,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-icon--users .pxl-user-account a' => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}} !important;',
                            ],
                            'responsive' => true,
                        ),
                        array(
                            'name' => 'border_radius',
                            'label' => esc_html__( 'Border Radius', 'nexros' ),
                            'type' => \Elementor\Controls_Manager::DIMENSIONS,
                            'selectors' => [
                                '{{WRAPPER}} .pxl-icon--users .pxl-user-account a,{{WRAPPER}} .pxl-icon--users .pxl-divider-move' => 'border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}} !important;',
                            ],
                            'responsive' => true,
                        ),
                    ),
                ),
            ),
        ),
    ),
    nexros_get_class_widget_path()
);