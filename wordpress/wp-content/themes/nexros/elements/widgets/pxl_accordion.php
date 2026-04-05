<?php
$templates_df = ['0' => esc_html__('None', 'nexros')];
$templates = $templates_df + nexros_get_templates_option('tab') ;
pxl_add_custom_widget(
    array(
        'name' => 'pxl_accordion',
        'title' => esc_html__('Tnex Accordion', 'nexros' ),
        'icon' => 'eicon-accordion icon-brand-elementor',
        'categories' => array('pxltheme-core'),
        'scripts' => array(
            'nexros-accordion'
        ),
        'params' => array(
            'sections' => array(
                array(
                    'name' => 'section_content',
                    'label' => esc_html__('Content', 'nexros' ),
                    'tab' => \Elementor\Controls_Manager::TAB_CONTENT,
                    'controls' => array(
                        array(
                            'name' => 'style',
                            'label' => esc_html__('Style', 'nexros' ),
                            'type' => \Elementor\Controls_Manager::SELECT,
                            'options' => [
                                'style1' => 'Style 1',
                                'style2' => 'Style 2',
                                'style3' => 'Style 3',
                                'style4' => 'Style 4',
                                'style5' => 'Style 5',
                                'style6' => 'Style 6',
                                'style7' => 'Style 7',
                            ],
                            'default' => 'style1',
                        ),
                        array(
                            'name' => 'active',
                            'label' => esc_html__('Active', 'nexros' ),
                            'type' => \Elementor\Controls_Manager::NUMBER,
                            'separator' => 'after',
                            'default' => '1',
                        ),
                        array(
                            'name' => 'accordion2',
                            'label' => esc_html__('Accordion', 'nexros' ),
                            'type' => \Elementor\Controls_Manager::REPEATER,
                            'condition' => [
                                'style' => ['style2'],
                            ],
                            'controls' => array(
                                array(
                                    'name' => 'title2',
                                    'label' => esc_html__('Title', 'nexros' ),
                                    'type' => \Elementor\Controls_Manager::TEXT, 
                                    'label_block' => true,
                                ),
                                array(
                                    'name' => 'btn_text2',
                                    'label' => esc_html__('Dropdown Text', 'nexros'),
                                    'type' => \Elementor\Controls_Manager::TEXT,
                                ),  
                                array(
                                    'name' => 'popup_template',
                                    'label' => esc_html__('Select Popup Template', 'nexros'),
                                    'type' => 'select',
                                    'options' => $templates,
                                    'default' => 'df',
                                    'description' => 'Add new tab template: "<a href="' . esc_url( admin_url( 'edit.php?post_type=pxl-template' ) ) . '" target="_blank">Click Here</a>"',
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
                            'title_field' => '{{{ title2 }}}',
                            'separator' => 'after',
                        ),
                        array(
                            'name' => 'accordion',
                            'label' => esc_html__('Accordion', 'nexros' ),
                            'type' => \Elementor\Controls_Manager::REPEATER,
                            'condition' => [
                                'style!' => ['style2'],
                            ],
                            'controls' => array(
                                array(
                                    'name' => 'number',
                                    'label' => esc_html__('Number', 'nexros' ),
                                    'type' => \Elementor\Controls_Manager::TEXT, 
                                    'label_block' => true,
                                ),
                                array(
                                    'name' => 'title',
                                    'label' => esc_html__('Title', 'nexros' ),
                                    'type' => \Elementor\Controls_Manager::TEXT, 
                                    'label_block' => true,
                                ),
                                array(
                                    'name' => 'desc',
                                    'label' => esc_html__('Content', 'nexros' ),
                                    'type' => \Elementor\Controls_Manager::TEXTAREA,
                                    'rows' => 10,
                                ),
                                array(
                                    'name' => 'pxl_icon',
                                    'label' => esc_html__('Icon', 'nexros' ),
                                    'type' => \Elementor\Controls_Manager::ICONS,
                                    'fa4compatibility' => 'icon',
                                ),
                            ),
                            'title_field' => '{{{ title }}}',
                            'separator' => 'after',
                        ),
                    ),
),
array(
    'name' => 'section_style_general',
    'label' => esc_html__('General', 'nexros' ),
    'tab' => \Elementor\Controls_Manager::TAB_STYLE,
    'controls' => array(
        array(
            'name' => 'img_size',
            'label' => esc_html__('Image Size', 'nexros' ),
            'type' => \Elementor\Controls_Manager::TEXT,
            'description' => 'Enter image size (Example: "thumbnail", "medium", "large", "full" or other sizes defined by theme). Alternatively enter size in pixels (Example: 200x100 (Width x Height).',
        ),
        array(
            'name' => 'item_padding',
            'label' => esc_html__('Item Padding ', 'nexros' ),
            'type' => \Elementor\Controls_Manager::DIMENSIONS,
            'size_units' => [ 'px' ],
            'selectors' => [
                '{{WRAPPER}} .pxl-accordion1 .pxl--item' => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}} !important;',
            ],
            'control_type' => 'responsive',
        ),
        array(
            'name' => 'item_padding_at',
            'label' => esc_html__('Item Padding Active', 'nexros' ),
            'type' => \Elementor\Controls_Manager::DIMENSIONS,
            'size_units' => [ 'px' ],
            'selectors' => [
                '{{WRAPPER}} .pxl-accordion1 .pxl--item.active' => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}} !important;',
            ],
            'control_type' => 'responsive',
        ),
        array(
            'name' => 'border_radius',
            'label' => esc_html__('Border Radius', 'nexros' ),
            'type' => \Elementor\Controls_Manager::DIMENSIONS,
            'size_units' => [ 'px' ],
            'selectors' => [
                '{{WRAPPER}} .pxl-accordion1 .pxl--item' => 'border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}} !important;',
            ],
            'control_type' => 'responsive',
        ),
        array(
            'name' => 'item_space',
            'label' => esc_html__('Item Space Bottom', 'nexros' ),
            'type' => \Elementor\Controls_Manager::SLIDER,
            'control_type' => 'responsive',
            'size_units' => [ 'px' ],
            'range' => [
                'px' => [
                    'min' => 0,
                    'max' => 300,
                ],
            ],
            'selectors' => [
                '{{WRAPPER}} .pxl-accordion1 .pxl--item' => 'padding-bottom: {{SIZE}}{{UNIT}};',
            ],
        ),
        array(
            'name' => 'item_space_top',
            'label' => esc_html__('Item Space Top', 'nexros' ),
            'type' => \Elementor\Controls_Manager::SLIDER,  
            'control_type' => 'responsive',
            'size_units' => [ 'px' ],
            'range' => [
                'px' => [
                    'min' => 0,
                    'max' => 300,
                ],
            ],
            'selectors' => [
                '{{WRAPPER}} .pxl-accordion1 .pxl--item + .pxl--item' => 'margin-top: {{SIZE}}{{UNIT}};',
            ],
        ),
        array(
            'name' => 'item_color',
            'label' => esc_html__('Background Color', 'nexros' ),
            'type' => \Elementor\Controls_Manager::COLOR,
            'selectors' => [
                '{{WRAPPER}} .pxl-accordion1 .pxl--item ' => 'background-color: {{VALUE}};',
            ],
        ),
        array(
            'name' => 'item_color_active',
            'label' => esc_html__('Background Color/Actvie', 'nexros' ),
            'type' => \Elementor\Controls_Manager::COLOR,
            'selectors' => [
                '{{WRAPPER}} .pxl-accordion1 .pxl--item.active' => 'background-color: {{VALUE}};',
            ],
        ),
        array(
            'name' => 'color_i',
            'label' => esc_html__('Color Icon', 'nexros' ),
            'type' => \Elementor\Controls_Manager::COLOR,
            'condition' => [
                'style!' => ['style5'],
            ],
            'selectors' => [
                '{{WRAPPER}} .pxl-accordion1 .pxl-icon--plus path' => 'fill: {{VALUE}};',
            ],
        ),
        array(
            'name' => 'color_i_a',
            'label' => esc_html__('Color Icon/Actvie', 'nexros' ),
            'type' => \Elementor\Controls_Manager::COLOR,
            'condition' => [
                'style!' => ['style5'],
            ],
            'selectors' => [
                '{{WRAPPER}} .pxl-accordion1 .pxl--item.active .pxl-icon--plus path' => 'fill: {{VALUE}};',
            ],
        ),
        array(
            'name' => 'color_i_5',
            'label' => esc_html__('Color Icon', 'nexros' ),
            'type' => \Elementor\Controls_Manager::COLOR,
            'condition' => [
                'style' => ['style5'],
            ],
            'selectors' => [
                '{{WRAPPER}} .pxl-accordion1 .pxl-icon--plus' => 'background-color: {{VALUE}};',
            ],
        ),
        array(
            'name' => 'color_i_a_5',
            'label' => esc_html__('Color Icon/Actvie', 'nexros' ),
            'type' => \Elementor\Controls_Manager::COLOR,
            'condition' => [
                'style' => ['style5'],
            ],
            'selectors' => [
                '{{WRAPPER}} .pxl-accordion1 .pxl--item.active .pxl-icon--plus' => 'background-color: {{VALUE}};',
            ],
        ),
        array(
            'name' => 'color_i_5_a_after_before',
            'label' => esc_html__('Color Icon/After/Before', 'nexros' ),
            'type' => \Elementor\Controls_Manager::COLOR,
            'condition' => [
                'style' => ['style5'],
            ],
            'selectors' => [
                '{{WRAPPER}} .pxl-accordion1 .pxl--item .pxl-icon--plus:after,{{WRAPPER}} .pxl-accordion1 .pxl--item .pxl-icon--plus:before' => 'background-color: {{VALUE}};',
            ],
        ),
        array(
            'name' => 'color_i_5_a_after_before_a',
            'label' => esc_html__('Color Icon/Actvie/After', 'nexros' ),
            'type' => \Elementor\Controls_Manager::COLOR,
            'condition' => [
                'style' => ['style5'],
            ],
            'selectors' => [
                '{{WRAPPER}} .pxl-accordion1 .pxl--item.active .pxl-icon--plus:after,{{WRAPPER}} .pxl-accordion1 .pxl--item.active .pxl-icon--plus:before' => 'background-color: {{VALUE}};',
            ],
        ),
        array(
            'name' => 'width_i_5',
            'label' => esc_html__('Width/Height Icon', 'nexros' ),
            'type' => \Elementor\Controls_Manager::SLIDER,
            'control_type' => 'responsive',
            'condition' => [
                'style' => ['style5','style1'],
            ],
            'selectors' => [
                '{{WRAPPER}}  .pxl-icon--plus' => 'width: {{SIZE}}{{UNIT}}; height: {{SIZE}}{{UNIT}};',
            ],
        ),
        array(
            'name' => 'width_i_5_a',
            'label' => esc_html__('Width/Height Plus/Minus', 'nexros' ),
            'type' => \Elementor\Controls_Manager::SLIDER,
            'control_type' => 'responsive',
            'condition' => [
                'style' => ['style5'],
            ],
            'selectors' => [
                '{{WRAPPER}} .pxl-accordion1 .pxl--item .pxl-icon--plus:after' => 'height: {{SIZE}}{{UNIT}};',
                '{{WRAPPER}} .pxl-accordion1 .pxl--item .pxl-icon--plus:before' => 'width: {{SIZE}}{{UNIT}};',
            ],
        ),
        array(
            'name' => 'color_bd',
            'label' => esc_html__('Color Border', 'nexros' ),
            'type' => \Elementor\Controls_Manager::COLOR,
            'selectors' => [
                '{{WRAPPER}} .pxl-accordion1 .pxl--item' => 'border-color: {{VALUE}};',
            ],
        ),
        array(
            'name' => 'color_bd_a',
            'label' => esc_html__('Color Border/Actvie', 'nexros' ),
            'type' => \Elementor\Controls_Manager::COLOR,
            'selectors' => [
                '{{WRAPPER}} .pxl-accordion1 .pxl--item.active' => 'border-color: {{VALUE}};',
            ],
        ),
    ),
),
array(
    'name' => 'section_style_title',
    'label' => esc_html__('Title', 'nexros' ),
    'tab' => \Elementor\Controls_Manager::TAB_STYLE,
    'controls' => array(
        array(
            'name' => 'title_color',
            'label' => esc_html__('Color', 'nexros' ),
            'type' => \Elementor\Controls_Manager::COLOR,
            'selectors' => [
                '{{WRAPPER}} .pxl-accordion .pxl-accordion--title' => 'color: {{VALUE}};',
            ],
        ),
        array(
            'name' => 'title_color_a',
            'label' => esc_html__('Color/Active', 'nexros' ),
            'type' => \Elementor\Controls_Manager::COLOR,
            'selectors' => [
                '{{WRAPPER}} .pxl-accordion .pxl--item.active .pxl-accordion--title' => 'color: {{VALUE}};',
            ],
        ),
        array(
            'name' => 'title_typography',
            'label' => esc_html__('Typography', 'nexros' ),
            'type' => \Elementor\Group_Control_Typography::get_type(),
            'control_type' => 'group',
            'selector' => '{{WRAPPER}} .pxl-accordion .pxl-accordion--title',
        ),
        array(
            'name' => 'title_tag',
            'label' => esc_html__('HTML Tag', 'nexros' ),
            'type' => \Elementor\Controls_Manager::SELECT,
            'options' => [
                'h1' => 'H1',
                'h2' => 'H2',
                'h3' => 'H3',
                'h4' => 'H4',
                'h5' => 'H5',
                'h6' => 'H6',
                'div' => 'div',
                'span' => 'span',
                'p' => 'p',
            ],
            'default' => 'h5',
        ),
    ),
),
array(
    'name' => 'section_style_number',
    'label' => esc_html__('Number', 'nexros' ),
    'tab' => \Elementor\Controls_Manager::TAB_STYLE,
    'controls' => array(
        array(
            'name' => 'number_color',
            'label' => esc_html__('Color', 'nexros' ),
            'type' => \Elementor\Controls_Manager::COLOR,
            'selectors' => [
                '{{WRAPPER}} .pxl-accordion.pxl-accordion1 .pxl--item .pxl-accordion--title .pxl-title--number' => 'color: {{VALUE}};',
            ],
        ),
        array(
            'name' => 'number_typography',
            'label' => esc_html__('Typography', 'nexros' ),
            'type' => \Elementor\Group_Control_Typography::get_type(),
            'control_type' => 'group',
            'selector' => '{{WRAPPER}} .pxl-accordion.pxl-accordion1 .pxl--item .pxl-accordion--title .pxl-title--number',
        ),
    ),
),
array(
    'name' => 'section_style_content',
    'label' => esc_html__('Content', 'nexros' ),
    'tab' => \Elementor\Controls_Manager::TAB_STYLE,
    'controls' => array(
        array(
            'name' => 'content_color',
            'label' => esc_html__('Color', 'nexros' ),
            'type' => \Elementor\Controls_Manager::COLOR,
            'selectors' => [
                '{{WRAPPER}} .pxl-accordion .pxl-accordion--content' => 'color: {{VALUE}};',
            ],
        ),
        array(
            'name' => 'content_color_a',
            'label' => esc_html__('Color/Active', 'nexros' ),
            'type' => \Elementor\Controls_Manager::COLOR,
            'selectors' => [
                '{{WRAPPER}} .pxl-accordion .pxl--item.active .pxl-accordion--content' => 'color: {{VALUE}};',
            ],
        ),
        array(
            'name' => 'desc_typography',
            'label' => esc_html__('Typography', 'nexros' ),
            'type' => \Elementor\Group_Control_Typography::get_type(),
            'control_type' => 'group',
            'selector' => '{{WRAPPER}} .pxl-accordion .pxl-accordion--content',
        ),
        array(
            'name' => 'desc_max_width',
            'label' => esc_html__('Max Width', 'nexros' ),
            'type' => \Elementor\Controls_Manager::SLIDER,
            'control_type' => 'responsive',
            'selectors' => [
                '{{WRAPPER}} .pxl-accordion .pxl-accordion--content' => 'max-width: {{SIZE}}{{UNIT}};',
            ],
            'size_units' => [ 'px' ],
        ),
        array(
            'name' => 'ct_space_top',
            'label' => esc_html__('Space Top', 'nexros' ),
            'type' => \Elementor\Controls_Manager::SLIDER,
            'control_type' => 'responsive',
            'size_units' => [ 'px' ],
            'range' => [
                'px' => [
                    'min' => 0,
                    'max' => 300,
                ],
            ],
            'selectors' => [
                '{{WRAPPER}} .pxl-accordion .pxl-accordion--content' => 'margin-top: {{SIZE}}{{UNIT}};',
            ],
        ),
        array(
            'name' => 'ct_space_bottom',
            'label' => esc_html__('Space Bottom', 'nexros' ),
            'type' => \Elementor\Controls_Manager::SLIDER,
            'control_type' => 'responsive',
            'size_units' => [ 'px' ],
            'range' => [
                'px' => [
                    'min' => 0,
                    'max' => 300,
                ],
            ],
            'selectors' => [
                '{{WRAPPER}} .pxl-accordion .pxl-accordion--content' => 'padding-bottom: {{SIZE}}{{UNIT}};',
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