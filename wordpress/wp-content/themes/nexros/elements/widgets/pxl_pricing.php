<?php
pxl_add_custom_widget(
    array(
        'name' => 'pxl_pricing',
        'title' => esc_html__('Tnex Pricing', 'nexros'),
        'icon' => 'eicon-price-table icon-brand-elementor',
        'categories' => array('pxltheme-core'),
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
                                    'image' => get_template_directory_uri() . '/elements/widgets/img-layout/pxl_pricing/layout1.jpg'
                                ],
                                '2' => [
                                    'label' => esc_html__('Layout 2', 'nexros' ),
                                    'image' => get_template_directory_uri() . '/elements/widgets/img-layout/pxl_pricing/layout2.jpg'
                                ],
                                '3' => [
                                    'label' => esc_html__('Layout 3', 'nexros' ),
                                    'image' => get_template_directory_uri() . '/elements/widgets/img-layout/pxl_pricing/layout3.jpg'
                                ],
                                '4' => [
                                    'label' => esc_html__('Layout 4', 'nexros' ),
                                    'image' => get_template_directory_uri() . '/elements/widgets/img-layout/pxl_pricing/layout4.jpg'
                                ],
                            ],
                        ),
                    ),
                ),
                array(
                    'name' => 'section_content_l4',
                    'label' => esc_html__('Content', 'nexros'),
                    'tab' => \Elementor\Controls_Manager::TAB_CONTENT,
                    'controls' => array(
                        array(
                            'name' => 'active_l4',
                            'label' => esc_html__('Is Active?', 'nexros' ),
                            'type' => \Elementor\Controls_Manager::SWITCHER,
                            'default' => 'false',
                        ),
                        array(
                            'name' => 'img_l4',
                            'label' => esc_html__('Background Image Active', 'nexros'),
                            'type' => \Elementor\Controls_Manager::MEDIA,
                            'condition' => ['layout' => '4']
                        ),
                        array(
                            'name' => 'popular_l4',
                            'label' => esc_html__('Show Popular?', 'nexros' ),
                            'type' => \Elementor\Controls_Manager::SWITCHER,
                            'default' => 'false',
                        ),
                        array(
                            'name' => 'popular_text_l4',
                            'label' => esc_html__('Popular Text', 'nexros'),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'label_block' => true,
                            'default' => 'Most Popular',
                            'condition' => ['popular_l4' => 'true']
                        ),
                        array(
                            'name' => 'plan_l4',
                            'label' => esc_html__('Plan', 'nexros'),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'label_block' => true,
                            'default' => 'Starter'
                        ),
                        array(
                            'name' => 'sub_l4',
                            'label' => esc_html__('Sub', 'nexros'),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'label_block' => true
                        ),
                        array(
                            'name' => 'currency_l4',
                            'label' => esc_html__('Currency', 'nexros'),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'default' => '$'
                        ),
                        array(
                            'name' => 'price_l41',
                            'label' => esc_html__('Price Option 1', 'nexros'),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'default' => '12'
                        ),
                        array(
                            'name' => 'price_l42',
                            'label' => esc_html__('Price ', 'nexros'),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'default' => '99'
                        ),
                        array(
                            'name' => 'period_l41',
                            'label' => esc_html__('Price Period', 'nexros'),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'default' => '/month'
                        ),
                        array(
                            'name' => 'period_l42',
                            'label' => esc_html__('Price Period', 'nexros'),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'default' => '/year'
                        ),
                        array(
                            'name' => 'desc_l4',
                            'label' => esc_html__('Description', 'nexros'),
                            'type' => \Elementor\Controls_Manager::TEXTAREA,
                            'label_block' => true,
                            'condition' => ['layout!' => '3'],
                            'default' => 'Best for personal use, students'
                        ),  
                        array(
                            'name' => 'sub_feature_l4',
                            'label' => esc_html__('Title Feature', 'nexros'),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'condition' => ['layout!' => '3'],
                            'label_block' => true
                        ),
                        array(
                            'name' => 'feature_l4',
                            'label' => esc_html__('Feature', 'nexros'),
                            'type' => \Elementor\Controls_Manager::REPEATER,
                            'controls' => array(
                                array(
                                    'name' => 'feature_text_l4',
                                    'label' => esc_html__('Text', 'nexros'),
                                    'type' => \Elementor\Controls_Manager::TEXT,
                                    'label_block' => true,
                                ),
                                array(
                                    'name' => 'feature_icon_l4',
                                    'label' => esc_html__('Icon', 'nexros'),
                                    'type' => \Elementor\Controls_Manager::ICONS,
                                    'label_block' => true,
                                ),
                                array(
                                    'name' => 'feature_is_title',
                                    'label' => esc_html__('Is Title?', 'nexros'),
                                    'type' => \Elementor\Controls_Manager::SWITCHER,
                                    'default' => 'false',
                                ),
                            ),
                            'title_field' => '{{{ feature_text_l4 }}}',
                        ),
                        array(
                            'name' => 'btn_text_l4',
                            'label' => esc_html__('Button Text', 'nexros'),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'default' => 'Get Started'
                        ),
                        array(
                            'name' => 'btn_link_l4',
                            'label' => esc_html__('Button Link', 'nexros'),
                            'type' => \Elementor\Controls_Manager::URL,
                            'label_block' => true,
                        ),
                        array(
                            'name' => 'btn_text_l4_2',
                            'label' => esc_html__('Button Text', 'nexros'),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'default' => 'Learn more',
                            'condition' => ['layout' => '3']
                        ),
                        array(
                            'name' => 'btn_link_l4_2',
                            'label' => esc_html__('Button Link', 'nexros'),
                            'type' => \Elementor\Controls_Manager::URL,
                            'label_block' => true,
                            'condition' => ['layout' => '3']
                        ),
                    ),
),
array(
    'name' => 'section_style_box',
    'label' => esc_html__('Style Box', 'nexros'),
    'tab' => \Elementor\Controls_Manager::TAB_STYLE,
    'controls' => array(
        array(
            'name' => 'box_l4_bgcolor',
            'label' => esc_html__('Box Background Color', 'nexros'),
            'type' => \Elementor\Controls_Manager::COLOR,
            'selectors' => [
                '{{WRAPPER}} .pxl-pricing' => 'background-color: {{VALUE}};'
            ],
        ),
        array(
            'name' => 'border_type_hover',
            'label' => esc_html__( 'Border Type', 'nexros' ),
            'type' => \Elementor\Controls_Manager::SELECT,
            'options' => [
                '' => esc_html__( 'None', 'nexros' ),
                'solid' => esc_html__( 'Solid', 'nexros' ),
                'double' => esc_html__( 'Double', 'nexros' ),
                'dotted' => esc_html__( 'Dotted', 'nexros' ),
                'dashed' => esc_html__( 'Dashed', 'nexros' ),
                'groove' => esc_html__( 'Groove', 'nexros' ),
            ],
            'selectors' => [
                '{{WRAPPER}} .pxl-pricing' => 'border-style: {{VALUE}};',
            ],
        ),
        array(
            'name' => 'border_width_hover',
            'label' => esc_html__( 'Border Width', 'nexros' ),
            'type' => \Elementor\Controls_Manager::DIMENSIONS,
            'selectors' => [
                '{{WRAPPER}} .pxl-pricing' => 'border-width: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
            ],
            'responsive' => true,
        ),
        array(
            'name' => 'border_color_hover',
            'label' => esc_html__( 'Border Color', 'nexros' ),
            'type' => \Elementor\Controls_Manager::COLOR,
            'default' => '',
            'selectors' => [
                '{{WRAPPER}} .pxl-pricing' => 'border-color: {{VALUE}};',
            ],
            'condition' => [
                'border_type_hover!' => '',
            ],
        ),

        array(
            'name' => 'box_border_radius_hover',
            'label' => esc_html__('Border Radius', 'nexros' ),
            'type' => \Elementor\Controls_Manager::DIMENSIONS,
            'size_units' => [ 'px' ],
            'selectors' => [
                '{{WRAPPER}} .pxl-pricing' => 'border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
            ],
        ),

        array(
            'name'         => 'box_box_shadow_hover',
            'label' => esc_html__( 'Box Shadow', 'nexros' ),
            'type'         => \Elementor\Group_Control_Box_Shadow::get_type(),
            'control_type' => 'group',
            'selector'     => '{{WRAPPER}} .pxl-pricing',
        ),
    ),
),
array(
    'name' => 'section_style_l4',
    'label' => esc_html__('Style Text', 'nexros'),
    'tab' => \Elementor\Controls_Manager::TAB_STYLE,
    'controls' => array(
        array(
            'name' => 'popular_l4_color',
            'label' => esc_html__('Popular Color', 'nexros'),
            'type' => \Elementor\Controls_Manager::COLOR,
            'selectors' => [
                '{{WRAPPER}} .pxl-pricing__popular' => 'color: {{VALUE}};'
            ],
        ),
        array(
            'name' => 'popular_l4_typography',
            'label' => esc_html__('Popular Typography', 'nexros'),
            'type' => \Elementor\Group_Control_Typography::get_type(),
            'control_type' => 'group',
            'selector' => '{{WRAPPER}} .pxl-pricing__popular',
        ),
        array(
            'name' => 'title_l4_color',
            'label' => esc_html__('Title Color', 'nexros'),
            'type' => \Elementor\Controls_Manager::COLOR,
            'selectors' => [
                '{{WRAPPER}} .pxl-pricing__title' => 'color: {{VALUE}};'
            ],
            'separator' => 'before'
        ),
        array(
            'name' => 'title_l4_typography',
            'label' => esc_html__('Title Typography', 'nexros'),
            'type' => \Elementor\Group_Control_Typography::get_type(),
            'control_type' => 'group',
            'selector' => '{{WRAPPER}} .pxl-pricing__title',
        ),
        array(
            'name' => 'price_l4_color',
            'label' => esc_html__('Price Color', 'nexros'),
            'type' => \Elementor\Controls_Manager::COLOR,
            'selectors' => [
                '{{WRAPPER}} .pxl-pricing__price-detail' => 'color: {{VALUE}};'
            ],
            'separator' => 'before'
        ),
        array(
            'name' => 'price_l4_typography',
            'label' => esc_html__('Price Typography', 'nexros'),
            'type' => \Elementor\Group_Control_Typography::get_type(),
            'control_type' => 'group',
            'selector' => '{{WRAPPER}} .pxl-pricing__price-detail',
        ),
        array(
            'name' => 'price_l4_period_color',
            'label' => esc_html__('Price Period Color', 'nexros'),
            'type' => \Elementor\Controls_Manager::COLOR,
            'selectors' => [
                '{{WRAPPER}} .pxl-pricing__price-period' => 'color: {{VALUE}};'
            ],
            'separator' => 'before'
        ),
        array(
            'name' => 'price_l4_period_typography',
            'label' => esc_html__('Price Period Typography', 'nexros'),
            'type' => \Elementor\Group_Control_Typography::get_type(),
            'control_type' => 'group',
            'selector' => '{{WRAPPER}} .pxl-pricing__price-period',
        ),
        array(
            'name' => 'opt_l4_color',
            'label' => esc_html__('Option Color', 'nexros'),
            'type' => \Elementor\Controls_Manager::COLOR,
            'selectors' => [
                '{{WRAPPER}} .pxl-pricing__option, {{WRAPPER}} .pxl-pricing__option svg path' => 'color: {{VALUE}};'
            ],
            'separator' => 'before'
        ),
        array(
            'name' => 'opt_l4_color_hover',
            'label' => esc_html__('Option Color Hover', 'nexros'),
            'type' => \Elementor\Controls_Manager::COLOR,
            'selectors' => [
                '{{WRAPPER}} .pxl-pricing__option:hover, {{WRAPPER}} .pxl-pricing__option:hover svg path' => 'color: {{VALUE}};'
            ],
            'separator' => 'before'
        ),
        array(
            'name' => 'opt_l4_typography',
            'label' => esc_html__('Option Typography', 'nexros'),
            'type' => \Elementor\Group_Control_Typography::get_type(),
            'control_type' => 'group',
            'selector' => '{{WRAPPER}} .pxl-pricing__option',
        ),
        array(
            'name' => 'desc_l4_color',
            'label' => esc_html__('Description Color', 'nexros'),
            'type' => \Elementor\Controls_Manager::COLOR,
            'selectors' => [
                '{{WRAPPER}} .pxl-pricing__desc' => 'color: {{VALUE}};'
            ],
            'separator' => 'before'
        ),
        array(
            'name' => 'desc_l4_typography',
            'label' => esc_html__('Description Typography', 'nexros'),
            'type' => \Elementor\Group_Control_Typography::get_type(),
            'control_type' => 'group',
            'selector' => '{{WRAPPER}} .pxl-pricing__desc',
        ),
        array(
            'name' => 'feature_l4_box_bg',
            'label' => esc_html__('Feature Box Background Color', 'nexros'),
            'type' => \Elementor\Controls_Manager::COLOR,
            'selectors' => [
                '{{WRAPPER}} .pxl-pricing__bottom' => 'background-color: {{VALUE}};'
            ],
            'separator' => 'before'
        ),
        array(
            'name' => 'feature_l4_box_border_radius',
            'label' => esc_html__('Feature Box Border Radius', 'nexros'),
            'type' => \Elementor\Controls_Manager::DIMENSIONS,
            'selectors' => [
                '{{WRAPPER}} .pxl-pricing__bottom' => 'border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
            ],
        ),
        array(
            'name' => 'feature_l4_box_title_color',
            'label' => esc_html__('Feature Box Title Color', 'nexros'),
            'type' => \Elementor\Controls_Manager::COLOR,
            'selectors' => [
                '{{WRAPPER}} .pxl-pricing__bottom-tit' => 'color: {{VALUE}};'
            ],
            'separator' => 'before'
        ),
        array(
            'name' => 'feature_l4_box_title_typography',
            'label' => esc_html__('Feature Box Title Typography', 'nexros'),
            'type' => \Elementor\Group_Control_Typography::get_type(),
            'control_type' => 'group',
            'selector' => '{{WRAPPER}} .pxl-pricing__bottom-tit',
        ),
        array(
            'name' => 'feature_l4_box_desc_color',
            'label' => esc_html__('Feature Box Description Color', 'nexros'),
            'type' => \Elementor\Controls_Manager::COLOR,
            'selectors' => [
                '{{WRAPPER}} .pxl-pricing__bottom-desc' => 'color: {{VALUE}};'
            ],
            'separator' => 'before'
        ),
        array(
            'name' => 'feature_l4_box_desc_typography',
            'label' => esc_html__('Feature Box Description Typography', 'nexros'),
            'type' => \Elementor\Group_Control_Typography::get_type(),
            'control_type' => 'group',
            'selector' => '{{WRAPPER}} .pxl-pricing__bottom-desc',
        ),
        array(
            'name' => 'feature_l4_item_color',
            'label' => esc_html__('Feature Box Item Color', 'nexros'),
            'type' => \Elementor\Controls_Manager::COLOR,
            'selectors' => [
                '{{WRAPPER}} .pxl-pricing__fea-item' => 'color: {{VALUE}};'
            ],
            'separator' => 'before'
        ),
        array(
            'name' => 'feature_l4_item_typography',
            'label' => esc_html__('Feature Box Item Typography', 'nexros'),
            'type' => \Elementor\Group_Control_Typography::get_type(),
            'control_type' => 'group',
            'selector' => '{{WRAPPER}} .pxl-pricing__fea-item',
        ),
        array(
            'name' => 'feature_l4_item_spacer',
            'label' => esc_html__('Feature Box Item Spacer', 'nexros'),
            'type' => \Elementor\Controls_Manager::SLIDER,
            'selectors' => [
                '{{WRAPPER}} .pxl-pricing__fea' => 'gap: {{SIZE}}{{UNIT}};',
            ],
        ),
    ),
'condition' => ['layout' => '1']
),
array(
    'name' => 'section_style_button',
    'label' => esc_html__('Style Button', 'nexros'),
    'tab' => \Elementor\Controls_Manager::TAB_STYLE,
    'controls' => array(
        array(
            'name' => 'button_color',
            'label' => esc_html__('Button Text Color', 'nexros'),
            'type' => \Elementor\Controls_Manager::COLOR,
            'selectors' => [
                '{{WRAPPER}} .pxl-pricing__button' => 'color: {{VALUE}};'
            ],
        ),
        array(
            'name' => 'button_hover_color',
            'label' => esc_html__('Button Hover Color', 'nexros'),
            'type' => \Elementor\Controls_Manager::COLOR,
            'selectors' => [
                '{{WRAPPER}} .pxl-pricing__button:hover' => 'color: {{VALUE}};'
            ],
        ),
        array(
            'name' => 'button_typography',
            'label' => esc_html__('Button Typography', 'nexros'),
            'type' => \Elementor\Group_Control_Typography::get_type(),
            'control_type' => 'group',
            'selector' => '{{WRAPPER}} .pxl-pricing__button',
        ),
        array(
            'name' => 'button_border_color',
            'label' => esc_html__('Button Border Color', 'nexros'),
            'type' => \Elementor\Controls_Manager::COLOR,
            'selectors' => [
                '{{WRAPPER}} .pxl-pricing__button' => 'border-color: {{VALUE}};'
            ],
        ),
        array(
            'name' => 'button_border_width',
            'label' => esc_html__('Button Border Width', 'nexros'),
            'type' => \Elementor\Controls_Manager::DIMENSIONS,
            'selectors' => [
                '{{WRAPPER}} .pxl-pricing__button' => 'border-width: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
            ],
        ),
        array(
            'name' => 'button_border_radius',
            'label' => esc_html__('Button Border Radius', 'nexros'),
            'type' => \Elementor\Controls_Manager::DIMENSIONS,
            'selectors' => [
                '{{WRAPPER}} .pxl-pricing__button' => 'border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
            ],
        ),
        array(
            'name' => 'button_background_type',
            'label' => esc_html__('Button Background Type', 'nexros'),
            'type' => \Elementor\Controls_Manager::SELECT,
            'options' => [
                'default' => esc_html__('Default', 'nexros'),
                'gradient' => esc_html__('Gradient', 'nexros'),
            ],
            'default' => 'default',
        ),
        array(
            'name' => 'button_background_color',
            'label' => esc_html__('Button Background Color', 'nexros'),
            'type' => \Elementor\Controls_Manager::COLOR,
            'selectors' => [
                '{{WRAPPER}} .pxl-pricing__button' => 'background-color: {{VALUE}};'
            ],
            'condition' => [
                'button_background_type' => 'default',
            ],
        ),
        array(
            'name'         => 'btn_gradient',
            'label' => esc_html__( 'Background Type', 'nexros' ),
            'type'         => \Elementor\Group_Control_Background::get_type(),
            'control_type' => 'group',
            'types' => [ 'gradient' ],
            'selector'     => '{{WRAPPER}} .pxl-pricing__button',
            'condition' => [
                'button_background_type' => 'gradient',
            ],
        ),
        array(
            'name' => 'button_hover_background_color',
            'label' => esc_html__('Button Hover Background Color', 'nexros'),
            'type' => \Elementor\Controls_Manager::COLOR,
            'selectors' => [
                '{{WRAPPER}} .pxl-pricing__button:hover' => 'background-color: {{VALUE}};'
            ],
        ),
        array(
            'name' => 'button_hover_border_color',
            'label' => esc_html__('Button Hover Border Color', 'nexros'),
            'type' => \Elementor\Controls_Manager::COLOR,
            'selectors' => [
                '{{WRAPPER}} .pxl-pricing__button:hover' => 'border-color: {{VALUE}};'
            ],
        ),
        array(
            'name' => 'button_padding',
            'label' => esc_html__('Button Padding', 'nexros'),
            'type' => \Elementor\Controls_Manager::DIMENSIONS,
            'selectors' => [
                '{{WRAPPER}} .pxl-pricing__button' => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
            ],
        ),

        array(
            'name' => 'button_margin',
            'label' => esc_html__('Button Margin', 'nexros'),
            'type' => \Elementor\Controls_Manager::DIMENSIONS,
            'selectors' => [
                '{{WRAPPER}} .pxl-pricing__button' => 'margin: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
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