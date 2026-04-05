<?php
// 'pxl-splitting',
// 'pxl-typography-animation',
pxl_add_custom_widget(
    array(
        'name' => 'pxl_heading',
        'title' => esc_html__('Tnex Heading', 'nexros'),
        'icon' => 'eicon-heading icon-brand-elementor',
        'categories' => array('pxltheme-core'),
        'scripts' => array(
            'gsap',
            'pxl-scroll-trigger',
            'pxl-splitText',
            'nexros-typewrite',
        ),
        'params' => array(
            'sections' => array(
                array(
                    'name' => 'section_content',
                    'label' => esc_html__('Content', 'nexros'),
                    'tab' => \Elementor\Controls_Manager::TAB_CONTENT,
                    'controls' => array(
                        array(
                            'name' => 'source_type',
                            'label' => esc_html__('Source Type', 'nexros'),
                            'type' => \Elementor\Controls_Manager::SELECT,
                            'options' => [
                                'text' => 'Text',
                                'title' => 'Page Title',
                            ],
                            'default' => 'text',
                        ),
                        array(
                            'name' => 'sub_title',
                            'label' => esc_html__('Sub Title', 'nexros'),
                            'type' => \Elementor\Controls_Manager::TEXT,
                            'label_block' => true,
                        ),
                        array(
                            'name' => 'title',
                            'label' => esc_html__('Title', 'nexros'),
                            'type' => \Elementor\Controls_Manager::TEXTAREA,
                            'label_block' => true,
                            'condition' => [
                                'source_type' => ['text'],
                            ],
                            'description' => 'Create Typewriter text width shortcode: [typewriter text="Text1, Text2"] and Highlight text with shortcode: [highlight text="Text"]',
                        ),
                        array(
                            'name' => 'align',
                            'label' => esc_html__('Alignment', 'nexros'),
                            'type' => \Elementor\Controls_Manager::CHOOSE,
                            'control_type' => 'responsive',
                            'options' => [
                                'left' => [
                                    'title' => esc_html__('Left', 'nexros'),
                                    'icon' => 'eicon-text-align-left',
                                ],
                                'center' => [
                                    'title' => esc_html__('Center', 'nexros'),
                                    'icon' => 'eicon-text-align-center',
                                ],
                                'right' => [
                                    'title' => esc_html__('Right', 'nexros'),
                                    'icon' => 'eicon-text-align-right',
                                ],
                                'justify' => [
                                    'title' => esc_html__('Justified', 'nexros'),
                                    'icon' => 'eicon-text-align-justify',
                                ],
                            ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-heading' => 'text-align: {{VALUE}};',
                            ],
                        ),
                        array(
                            'name' => 'h_width',
                            'label' => esc_html__('Max Width', 'nexros'),
                            'type' => \Elementor\Controls_Manager::SLIDER,
                            'control_type' => 'responsive',
                            'size_units' => ['px', '%'],
                            'range' => [
                                'px' => [
                                    'min' => 0,
                                    'max' => 3000,
                                ],
                            ],
                            'selectors' => [
                                '{{WRAPPER}} .pxl-heading .pxl-heading--inner' => 'max-width: {{SIZE}}{{UNIT}};',
                            ],
                        ),
                    ),
                ),
                array(
                    'name' => 'section_style_title',
                    'label' => esc_html__('Title', 'nexros'),
                    'tab' => \Elementor\Controls_Manager::TAB_STYLE,
                    'controls' => array_merge(
                        array(
                            array(
                                'name' => 'title_tag',
                                'label' => esc_html__('HTML Tag', 'nexros'),
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
                                'default' => 'h3',
                            ),
                            array(
                                'name' => 'title_color',
                                'label' => esc_html__('Title Color', 'nexros'),
                                'type' => \Elementor\Controls_Manager::COLOR,
                                'selectors' => [
                                    '{{WRAPPER}} .pxl-heading .pxl-item--title' => 'color: {{VALUE}};-webkit-text-stroke-color:{{VALUE}};',
                                    '{{WRAPPER}} .pxl-heading .pxl-item--title.style-outline .pxl-text-line-backdrop svg' => 'stroke:{{VALUE}};',
                                ],
                            ),
                            array(
                                'name' => 'title_typography',
                                'label' => esc_html__('Typography', 'nexros'),
                                'type' => \Elementor\Group_Control_Typography::get_type(),
                                'control_type' => 'group',
                                'selector' => '{{WRAPPER}} .pxl-heading .pxl-item--title',
                            ),
                            array(
                                'name' => 'custom_font',
                                'label' => esc_html__('Custom Font Family', 'nexros'),
                                'type' => \Elementor\Controls_Manager::SELECT,
                                'options' => [
                                    '' => 'Default',
                                    'ft-gt' => 'Geist',
                                    'ft-gm' => 'Geist Mono',
                                ],
                                'default' => '',
                            ),
                            array(
                                'name' => 'title_box_shadow',
                                'label' => esc_html__('Title Shadow', 'nexros'),
                                'type' => \Elementor\Group_Control_Text_Shadow::get_type(),
                                'control_type' => 'group',
                                'selector' => '{{WRAPPER}} .pxl-heading .pxl-item--title'
                            ),
                            array(
                                'name' => 'title_space_bottom',
                                'label' => esc_html__('Bottom Spacer', 'nexros'),
                                'type' => \Elementor\Controls_Manager::SLIDER,
                                'control_type' => 'responsive',
                                'size_units' => ['px'],
                                'default' => [
                                    'size' => 0,
                                ],
                                'range' => [
                                    'px' => [
                                        'min' => 0,
                                        'max' => 300,
                                    ],
                                ],
                                'selectors' => [
                                    '{{WRAPPER}} .pxl-heading .pxl-item--title' => 'margin-bottom: {{SIZE}}{{UNIT}};',
                                ],
                                'separator' => 'after',
                            ),
                            array(
                                'name' => 'h_title_style',
                                'label' => esc_html__('Style', 'nexros'),
                                'type' => \Elementor\Controls_Manager::SELECT,
                                'options' => [
                                    'style-default' => 'Default',
                                    'style-outline' => 'Outline',
                                    'style-linear' => 'Linear',
                                    'style-gradient' => 'Gradient',
                                ],
                                'default' => 'style-default',
                            ),
                            array(
                                'name' => 'title_gradient_linear',
                                'label' => esc_html__('Background Type', 'nexros'),
                                'type' => \Elementor\Group_Control_Background::get_type(),
                                'control_type' => 'group',
                                'types' => ['gradient'],
                                'condition' => [
                                    'h_title_style' => 'style-gradient',
                                ],
                                'selector' => '{{WRAPPER}} .pxl-heading .pxl-item--title.style-gradient',
                                'condition' => [
                                    'h_title_style' => 'style-gradient',
                                ],
                            ),
                            array(
                                'name' => 'outline_color',
                                'label' => esc_html__('Outline Color', 'nexros'),
                                'type' => \Elementor\Controls_Manager::COLOR,
                                'selectors' => [
                                    '{{WRAPPER}} .pxl-heading .pxl-item--title' => '-webkit-text-stroke-color:{{VALUE}};',
                                ],
                            ),
                            array(
                                'name' => 'title_gradient_start',
                                'label' => esc_html__('Title Color Start', 'nexros'),
                                'type' => \Elementor\Controls_Manager::COLOR,
                                'default' => '#fff',
                                'condition' => [
                                    'h_title_style' => 'style-linear',
                                ],
                            ),
                            array(
                                'name' => 'title_gradient_end',
                                'label' => esc_html__('Title Color End', 'nexros'),
                                'type' => \Elementor\Controls_Manager::COLOR,
                                'default' => '#000',
                                'selectors' => [
                                    '{{WRAPPER}} .pxl-heading .pxl-item--title.style-linear .pxl-item--text .split-line' => 'background-image: linear-gradient(84deg, {{title_gradient_start.VALUE}} -12%, {{title_gradient_start.VALUE}} 20%, {{title_gradient_start.VALUE}} 50%, {{VALUE}} 50%, {{VALUE}} 100%);',
                                ],
                                'condition' => [
                                    'h_title_style' => 'style-linear',
                                ],
                            ),
                            array(
                                'name' => 'title_gradient',
                                'label' => esc_html__('Background Type', 'nexros'),
                                'type' => \Elementor\Group_Control_Background::get_type(),
                                'control_type' => 'group',
                                'types' => ['gradient'],
                                'condition' => [
                                    'h_title_style' => 'style-linear',
                                ],
                            ),
                            array(
                                'name' => 'pxl_animate',
                                'label' => esc_html__('Tnex Animate', 'nexros'),
                                'type' => \Elementor\Controls_Manager::SELECT,
                                'options' => nexros_widget_animate_v2(),
                                'default' => '',
                            ),
                            array(
                                'name' => 'pxl_animate_delay',
                                'label' => esc_html__('Animate Delay', 'nexros'),
                                'type' => \Elementor\Controls_Manager::TEXT,
                                'default' => '0',
                                'description' => 'Enter number. Default 0ms',
                            ),
                        ),
                        nexros_widget_gradient_color([
                            'prefix' => 'gr',
                            'label' => 'Button',
                            'selectors_class' => '.pxl-heading .pxl-item--title.style-gradient',
                            'condition' => [
                                'h_title_style' => 'style-gradient',
                            ],
                        ])
                    ),
                ),
                array(
                    'name' => 'section_style_title_sub',
                    'label' => esc_html__('Sub Title', 'nexros'),
                    'tab' => \Elementor\Controls_Manager::TAB_STYLE,
                    'controls' => array_merge(
                        array(
                            array(
                                'name' => 'sub_title_style',
                                'label' => esc_html__('Style', 'nexros'),
                                'type' => \Elementor\Controls_Manager::SELECT,
                                'options' => [
                                    'px-sub-title-default' => 'Default',
                                    'px-sub-title-2' => 'Style 2',
                                    'px-sub-title-3' => 'Style 3',
                                    'px-sub-title-liner' => 'Style Linear',
                                    'px-sub-title-gradient' => 'Text Gradient',
                                    'px-sub-title-dot' => 'Text Dot',
                                    'px-sub-title-border' => 'Border',
                                ],
                                'default' => 'px-sub-title-default',
                            ),
                            array(
                                'name' => 'sub_title_width',
                                'label' => esc_html__('Width', 'nexros'),
                                'type' => \Elementor\Controls_Manager::SLIDER,
                                'size_units' => ['px'],
                                'selectors' => [
                                    '{{WRAPPER}} .pxl-heading .pxl-item--subtitle.px-sub-title-dot .pxl-item--subtext:before' => 'width: {{SIZE}}{{UNIT}};height: {{SIZE}}{{UNIT}};',
                                ],
                                'condition' => [
                                    'sub_title_style' => 'px-sub-title-dot',
                                ],
                            ),
                            array(
                                'name' => 'border_radius',
                                'label' => esc_html__('Border Radius', 'nexros'),
                                'type' => \Elementor\Controls_Manager::SLIDER,
                                'size_units' => ['px'],
                                'selectors' => [
                                    '{{WRAPPER}} .pxl-heading .pxl-item--subtitle.px-sub-title-dot .pxl-item--subtext:before' => 'border-radius: {{SIZE}}{{UNIT}};',
                                ],
                                'condition' => [
                                    'sub_title_style' => 'px-sub-title-dot',
                                ],
                            ),
                            array(
                                'name' => 'margin_dot',
                                'label' => esc_html__('Margin Dot', 'nexros'),
                                'type' => \Elementor\Controls_Manager::DIMENSIONS,
                                'size_units' => ['px'],
                                'condition' => [
                                    'sub_title_style' => 'px-sub-title-dot',
                                ],
                                'selectors' => [
                                    '{{WRAPPER}} .pxl-heading .pxl-item--subtitle.px-sub-title-dot .pxl-item--subtext:before' => 'margin: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                                ],
                            ),
                            array(
                                'name' => 'border_style',
                                'label' => esc_html__('Border Style', 'nexros'),
                                'type' => \Elementor\Controls_Manager::SELECT,
                                'options' => [
                                    'solid' => 'Solid',
                                    'dashed' => 'Dashed',
                                    'dotted' => 'Dotted',
                                ],
                                'default' => 'solid',
                                'selectors' => [
                                    '{{WRAPPER}} .pxl-heading .pxl-item--subtitle.px-sub-title-border' => 'border-style: {{VALUE}};',
                                ],
                                'condition' => [
                                    'sub_title_style' => 'px-sub-title-border',
                                ],
                            ),
                            array(
                                'name' => 'border_color',
                                'label' => esc_html__('Border Color', 'nexros'),
                                'type' => \Elementor\Controls_Manager::COLOR,
                                'selectors' => [
                                    '{{WRAPPER}} .pxl-heading .pxl-item--subtitle.px-sub-title-border' => 'border-color: {{VALUE}};',
                                ],
                                'condition' => [
                                    'sub_title_style' => 'px-sub-title-border',
                                ],
                            ),
                            array(
                                'name' => 'border_width',
                                'label' => esc_html__('Border Width', 'nexros'),
                                'type' => \Elementor\Controls_Manager::DIMENSIONS,
                                'selectors' => [
                                    '{{WRAPPER}} .pxl-heading .pxl-item--subtitle.px-sub-title-border' => 'border-width: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                                ],
                                'condition' => [
                                    'sub_title_style' => 'px-sub-title-border',
                                ],
                            ),
                            array(
                                'name' => 'sub_title_color_dot',
                                'label' => esc_html__('Dot Color', 'nexros'),
                                'type' => \Elementor\Controls_Manager::COLOR,
                                'condition' => [
                                    'sub_title_style' => 'px-sub-title-dot',
                                ],
                                'selectors' => [
                                    '{{WRAPPER}} .pxl-heading .pxl-item--subtitle.px-sub-title-dot .pxl-item--subtext:before' => 'background-color: {{VALUE}};',
                                ],
                            ),
                            array(
                                'name' => 'sub_title_gradient',
                                'label' => esc_html__('Background Type', 'nexros'),
                                'type' => \Elementor\Group_Control_Background::get_type(),
                                'control_type' => 'group',
                                'types' => ['gradient'],
                                'condition' => [
                                    'sub_title_style' => 'px-sub-title-gradient',
                                ],
                                'selector' => '{{WRAPPER}} .pxl-heading .pxl-item--subtitle.px-sub-title-gradient .pxl-item--subtext',
                            ),
                            array(
                                'name' => 'sub_title_box_color',
                                'label' => esc_html__('Box Color', 'nexros'),
                                'type' => \Elementor\Controls_Manager::COLOR,
                                'selectors' => [
                                    '{{WRAPPER}} .pxl-heading .pxl-item--subtitle.px-sub-title-default:after' => 'background-color: {{VALUE}};',
                                ],
                                'condition' => [
                                    'sub_title_style' => 'px-sub-title-default',
                                ],
                            ),
                            array(
                                'name' => 'sub_title_padding',
                                'label' => esc_html__('Padding', 'nexros'),
                                'type' => \Elementor\Controls_Manager::DIMENSIONS,
                                'size_units' => ['px'],
                                'selectors' => [
                                    '{{WRAPPER}} .pxl-heading .pxl-item--subtitle .pxl-item--subtext' => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                                ],
                                'condition' => [
                                    'sub_title_style!' => 'px-sub-title-3',
                                ],
                                'control_type' => 'responsive',
                            ),
                            array(
                                'name' => 'sub_title_padding_3',
                                'label' => esc_html__('Padding', 'nexros'),
                                'type' => \Elementor\Controls_Manager::DIMENSIONS,
                                'control_type' => 'responsive',
                                'default' => [
                                    'size' => 0,
                                ],
                                'condition' => [
                                    'sub_title_style' => 'px-sub-title-3',
                                ],
                                'size_units' => ['px'],
                                'selectors' => [
                                    '{{WRAPPER}} .pxl-heading .pxl-item--subtitle.px-sub-title-3' => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                                ],
                            ),
                            array(
                                'name' => 'sub_title_color',
                                'label' => esc_html__('Color', 'nexros'),
                                'type' => \Elementor\Controls_Manager::COLOR,
                                'selectors' => [
                                    '{{WRAPPER}} .pxl-heading .pxl-item--subtitle .pxl-item--subtext' => 'color: {{VALUE}};-webkit-text-fill-color: unset;',
                                ],
                            ),
                            array(
                                'name' => 'sub_title_typography',
                                'label' => esc_html__('Typography', 'nexros'),
                                'type' => \Elementor\Group_Control_Typography::get_type(),
                                'control_type' => 'group',
                                'selector' => '{{WRAPPER}} .pxl-heading .pxl-item--subtitle, {{WRAPPER}} .pxl-heading .pxl-item--subtitle span',
                            ),
                            array(
                                'name' => 'sub_title_space_top',
                                'label' => esc_html__('Top Spacer', 'nexros'),
                                'type' => \Elementor\Controls_Manager::SLIDER,
                                'control_type' => 'responsive',
                                'size_units' => ['px'],
                                'range' => [
                                    'px' => [
                                        'min' => 0,
                                        'max' => 300,
                                    ],
                                ],
                                'selectors' => [
                                    '{{WRAPPER}} .pxl-heading .pxl-item--subtitle' => 'top: {{SIZE}}{{UNIT}};',
                                ],
                            ),
                            array(
                                'name' => 'sub_title_space_bottom',
                                'label' => esc_html__('Bottom Spacer', 'nexros'),
                                'type' => \Elementor\Controls_Manager::SLIDER,
                                'control_type' => 'responsive',
                                'size_units' => ['px'],
                                'range' => [
                                    'px' => [
                                        'min' => 0,
                                        'max' => 300,
                                    ],
                                ],
                                'selectors' => [
                                    '{{WRAPPER}} .pxl-heading .pxl-item--subtitle' => 'margin-bottom: {{SIZE}}{{UNIT}};',
                                ],
                            ),
                            array(
                                'name' => 'pxl_animate_sub',
                                'label' => esc_html__('Tnex Animate', 'nexros'),
                                'type' => \Elementor\Controls_Manager::SELECT,
                                'options' => nexros_widget_animate_v2(),
                                'default' => '',
                            ),
                            array(
                                'name' => 'pxl_animate_delay_sub',
                                'label' => esc_html__('Animate Delay', 'nexros'),
                                'type' => \Elementor\Controls_Manager::TEXT,
                                'default' => '0',
                                'description' => 'Enter number. Default 0ms',
                            ),
                        )
                    ),
                ),
                array(
                    'name' => 'section_style_highlight',
                    'label' => esc_html__('Highlight', 'nexros'),
                    'tab' => \Elementor\Controls_Manager::TAB_STYLE,
                    'controls' => array_merge(
                        array(
                            array(
                                'name' => 'highlight_style',
                                'label' => esc_html__('Style', 'nexros'),
                                'type' => \Elementor\Controls_Manager::SELECT,
                                'options' => [
                                    'highlight-default' => 'Default',
                                    'highlight-text-gradient' => 'Text Gradient',
                                ],
                                'default' => 'highlight-default',
                            ),
                            array(
                                'name' => 'highlight_color',
                                'label' => esc_html__('Color', 'nexros'),
                                'type' => \Elementor\Controls_Manager::COLOR,
                                'selectors' => [
                                    '{{WRAPPER}} .pxl-heading .pxl-title--highlight' => 'color: {{VALUE}};',
                                ],
                                'condition' => [
                                    'highlight_style' => ['highlight-default'],
                                ],
                            ),
                            array(
                                'name' => 'highlight_color_from',
                                'label' => esc_html__('Color From', 'nexros'),
                                'type' => \Elementor\Controls_Manager::COLOR,
                                'selectors' => [
                                    '{{WRAPPER}} .pxl-heading .pxl-title--highlight' => '--gradient-color-from: {{VALUE}};',
                                ],
                                'condition' => [
                                    'highlight_style' => ['highlight-text-gradient'],
                                ],
                            ),
                            array(
                                'name' => 'highlight_color_to',
                                'label' => esc_html__('Color To', 'nexros'),
                                'type' => \Elementor\Controls_Manager::COLOR,
                                'selectors' => [
                                    '{{WRAPPER}} .pxl-heading .pxl-title--highlight' => '--gradient-color-to: {{VALUE}};',
                                ],
                                'condition' => [
                                    'highlight_style' => ['highlight-text-gradient'],
                                ],
                            ),
                            array(
                                'name' => 'highlight_typography',
                                'label' => esc_html__('Typography', 'nexros'),
                                'type' => \Elementor\Group_Control_Typography::get_type(),
                                'control_type' => 'group',
                                'selector' => '{{WRAPPER}} .pxl-heading .pxl-title--highlight',
                            ),
                            array(
                                'name' => 'highlight_text_image',
                                'label' => esc_html__('Text Image', 'nexros'),
                                'type' => \Elementor\Controls_Manager::MEDIA,
                                'default' => '',
                                'selectors' => [
                                    '{{WRAPPER}} .pxl-heading .pxl-title--highlight' => 'background-image: url( {{URL}} );',
                                ],
                            ),
                            array(
                                'name' => 'highlight_image_position',
                                'label' => esc_html__('Text Image Position', 'nexros'),
                                'type' => \Elementor\Controls_Manager::SELECT,
                                'options' => array(
                                    '' => esc_html__('Default', 'nexros'),
                                    'center center' => esc_html__('Center Center', 'nexros'),
                                    'center left' => esc_html__('Center Left', 'nexros'),
                                    'center right' => esc_html__('Center Right', 'nexros'),
                                    'top center' => esc_html__('Top Center', 'nexros'),
                                    'top left' => esc_html__('Top Left', 'nexros'),
                                    'top right' => esc_html__('Top Right', 'nexros'),
                                    'bottom center' => esc_html__('Bottom Center', 'nexros'),
                                    'bottom left' => esc_html__('Bottom Left', 'nexros'),
                                    'bottom right' => esc_html__('Bottom Right', 'nexros'),
                                    'initial' => esc_html__('Custom', 'nexros'),
                                ),
                                'default' => '',
                                'selectors' => [
                                    '{{WRAPPER}} .pxl-heading .pxl-title--highlight' => 'background-position: {{VALUE}};',
                                ],
                                'condition' => [
                                    'highlight_text_image[url]!' => ''
                                ]
                            ),
                            array(
                                'name' => 'highlight_image_size',
                                'label' => esc_html__('Text Image Size', 'nexros'),
                                'type' => \Elementor\Controls_Manager::SELECT,
                                'hide_in_inner' => true,
                                'options' => array(
                                    '' => esc_html__('Default', 'nexros'),
                                    'auto' => esc_html__('Auto', 'nexros'),
                                    'cover' => esc_html__('Cover', 'nexros'),
                                    'contain' => esc_html__('Contain', 'nexros'),
                                    'initial' => esc_html__('Custom', 'nexros'),
                                ),
                                'default' => '',
                                'selectors' => [
                                    '{{WRAPPER}} .pxl-heading .pxl-title--highlight' => 'background-size: {{VALUE}};',
                                ],
                                'condition' => [
                                    'highlight_text_image[url]!' => ''
                                ]
                            ),
                        )
                    ),
                ),
                array(
                    'name' => 'section_style_typewriter',
                    'label' => esc_html__('Typewriter', 'nexros'),
                    'tab' => \Elementor\Controls_Manager::TAB_STYLE,
                    'controls' => array_merge(
                        array(
                            array(
                                'name' => 'typewriter_color',
                                'label' => esc_html__('Color', 'nexros'),
                                'type' => \Elementor\Controls_Manager::COLOR,
                                'selectors' => [
                                    '{{WRAPPER}} .pxl-heading .pxl-title--typewriter' => 'color: {{VALUE}};',
                                ],
                            ),
                            array(
                                'name' => 'typewriter_typography',
                                'label' => esc_html__('Typography', 'nexros'),
                                'type' => \Elementor\Group_Control_Typography::get_type(),
                                'control_type' => 'group',
                                'selector' => '{{WRAPPER}} .pxl-heading .pxl-title--typewriter',
                            ),
                        )
                    ),
                ),
            ),
        ),
    ),
    nexros_get_class_widget_path()
);