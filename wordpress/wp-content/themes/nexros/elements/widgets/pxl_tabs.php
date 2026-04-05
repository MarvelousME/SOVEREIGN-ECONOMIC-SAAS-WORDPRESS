<?php
$templates = nexros_get_templates_option('tab', []) ;
pxl_add_custom_widget(
    array(
        'name' => 'pxl_tabs',
        'title' => esc_html__( 'BR Tabs', 'nexros' ),
        'icon' => 'eicon-tabs icon-brand-elementor',
        'categories' => array('pxltheme-core'),
        'scripts' => array(
            'nexros-tabs'
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
                                    'image' => get_template_directory_uri() . '/elements/templates/pxl_tabs/layout-image/layout1.jpg'
                                ],
                                '4' => [
                                    'label' => esc_html__('Layout 4', 'nexros' ),
                                    'image' => get_template_directory_uri() . '/elements/templates/pxl_tabs/layout-image/layout4.jpg'
                                ],
                                '7' => [
                                    'label' => esc_html__('Layout 7', 'nexros' ),
                                    'image' => get_template_directory_uri() . '/elements/templates/pxl_tabs/layout-image/layout7.jpg'
                                ],
                            ],
                        ),
                    ),
                ),
                array(
                    'name' => 'tab_content',
                    'label' => esc_html__( 'Tabs', 'nexros' ),
                    'tab' => \Elementor\Controls_Manager::TAB_CONTENT,
                    'controls' => array(
                      array(
                        'name'      => 'tab1_text',
                        'label'     => esc_html__('Tab 1 Text', 'nexros'),
                        'type'      => \Elementor\Controls_Manager::TEXT,
                        'condition' => [
                            'layout' => ['7'],
                        ],
                        'separator' => 'before'
                    ),
                      array(
                        'name' => 'content_template_tab_1',
                        'label' => esc_html__('Select Template Tab 1', 'nexros'),
                        'type' => 'select',
                        'options' => $templates,
                        'default' => 'df',
                        'description' => 'Add new tab template: "<a href="' . esc_url( admin_url( 'edit.php?post_type=pxl-template' ) ) . '" target="_blank">Click Here</a>" and Edit template "<a href="' . esc_url( admin_url( 'edit.php?s&post_status=all&post_type=pxl-template&action=-1&m=0&pxl_filter_template_type=tab&filter_action=Filter&paged=1&action2=-1' ) ) . '" target="_blank">Here.</a>"',
                        'condition' => ['layout' => '7'],
                        'separator' => 'after'
                    ),
                      array(
                        'name'      => 'tab2_text',
                        'label'     => esc_html__('Tab 2 Text', 'nexros'),
                        'type'      => \Elementor\Controls_Manager::TEXT,
                        'condition' => [
                            'layout' => ['7'],
                        ],
                    ),
                      array(
                        'name' => 'content_template_tab_2',
                        'label' => esc_html__('Select Template Tab 2', 'nexros'),
                        'type' => 'select',
                        'options' => $templates,
                        'default' => 'df',
                        'description' => 'Add new tab template: "<a href="' . esc_url( admin_url( 'edit.php?post_type=pxl-template' ) ) . '" target="_blank">Click Here</a>" and Edit template "<a href="' . esc_url( admin_url( 'edit.php?s&post_status=all&post_type=pxl-template&action=-1&m=0&pxl_filter_template_type=tab&filter_action=Filter&paged=1&action2=-1' ) ) . '" target="_blank">Here.</a>"',
                        'condition' => ['layout' => '7'],
                        'separator' => 'after'
                    ),
                      array(
                        'name' => 'subtitle_box',
                        'label' => esc_html__('Sub Title Box', 'nexros' ),
                        'type' => \Elementor\Controls_Manager::TEXT,
                        'default' => esc_html__('Sub Text', 'nexros'),
                        'condition' => ['layout' => '5'], 
                    ),
                      array(
                        'name' => 'title_box',
                        'label' => esc_html__('Title Box', 'nexros' ),
                        'type' => \Elementor\Controls_Manager::TEXTAREA,
                        'default' => esc_html__('Text', 'nexros'),
                        'condition' => ['layout' => '5'], 
                    ),
                      array(
                        'name' => 'desc_box',
                        'label' => esc_html__('Description Box', 'nexros' ),
                        'type' => \Elementor\Controls_Manager::TEXTAREA,
                        'default' => esc_html__('Text', 'nexros'),
                        'condition' => ['layout' => '5'],
                    ),
                      array(
                        'name' => 'text',
                        'label' => esc_html__('Text', 'nexros' ),
                        'type' => \Elementor\Controls_Manager::TEXT,
                        'default' => esc_html__('More about Industrial', 'nexros'),
                    ),
                      array(
                        'name' => 'link',
                        'label' => esc_html__('Link', 'nexros' ),
                        'type' => \Elementor\Controls_Manager::URL,
                        'default' => [
                            'url' => '#',
                        ],
                        'condition' => ['layout' => '5'],
                    ),
                      array(
                        'name' => 'tab_active',
                        'label' => esc_html__( 'Active Tab', 'nexros' ),
                        'type' => \Elementor\Controls_Manager::NUMBER,
                        'default' => 1,
                        'separator' => 'after',
                    ),
                      array(
                        'name' => 'tabs',
                        'label' => esc_html__( 'Content', 'nexros' ),
                        'type' => \Elementor\Controls_Manager::REPEATER,
                        'condition' => ['layout!' => '7'],
                        'controls' => array(
                            array(
                                'name' => 'pxl_icon_tab',
                                'label' => esc_html__('Icon', 'nexros' ),
                                'type' => \Elementor\Controls_Manager::ICONS,
                                'fa4compatibility' => 'icon',
                            ),
                            array(
                                'name' => 'title',
                                'label' => esc_html__( 'Title', 'nexros' ),
                                'type' => \Elementor\Controls_Manager::TEXT,
                                'label_block' => true,
                            ),
                            array(
                                'name' => 'content_type',
                                'label' => esc_html__('Content Type', 'nexros'),
                                'type' => 'select',
                                'options' => [
                                    'df' => esc_html__( 'Default', 'nexros' ),
                                    'template' => esc_html__( 'From Template Builder', 'nexros' )
                                ],
                                'default' => 'df' 
                            ),
                            array(
                                'name' => 'desc',
                                'label' => esc_html__( 'Content', 'nexros' ),
                                'type' => \Elementor\Controls_Manager::WYSIWYG,
                                'condition' => ['content_type' => 'df'] 
                            ),
                            array(
                                'name' => 'image',
                                'label' => esc_html__('Image', 'nexros' ),
                                'type' => \Elementor\Controls_Manager::MEDIA,
                                'condition' => ['content_type' => 'df'] 
                            ),
                            array(
                                'name' => 'content_template',
                                'label' => esc_html__('Select Templates', 'nexros'),
                                'type' => 'select',
                                'options' => $templates,
                                'default' => 'df',
                                'description' => 'Add new tab template: "<a href="' . esc_url( admin_url( 'edit.php?post_type=pxl-template' ) ) . '" target="_blank">Click Here</a>"',
                                'condition' => ['content_type' => 'template'] 
                            ),
                        ),
                        'title_field' => '{{{ title }}}',
                    ),
                  ),
),
array(
    'name' => 'tab_style',
    'label' => esc_html__( 'Style', 'nexros' ),
    'tab' => \Elementor\Controls_Manager::TAB_STYLE,
    'controls' => array(
        array(
            'name' => 'style',
            'label' => esc_html__('Style', 'nexros' ),
            'type' => \Elementor\Controls_Manager::SELECT,
            'options' => [
                'style-default' => 'Default',
                'style-2' => 'Style 2',
                'style-3' => 'Style 3',
                'style-4' => 'Style 4',
                'style-5' => 'Style 5',
            ],
            'default' => 'style-default',
        ),
        array(
            'name' => 'right_space',
            'label' => esc_html__('Space Right Content', 'nexros' ),
            'type' => \Elementor\Controls_Manager::SLIDER,
            'control_type' => 'responsive',
            'size_units' => [ 'px', '%' ],
            'range' => [
                'px' => [
                    'min' => 0,
                    'max' => 3000,
                ],
            ],
            'selectors' => [
                '{{WRAPPER}} .pxl-tabs--content ' => 'right: {{SIZE}}{{UNIT}} ;',
            ],
        ),
        array(
            'name' => 'top_space',
            'label' => esc_html__('Space Top Content', 'nexros' ),
            'type' => \Elementor\Controls_Manager::SLIDER,
            'control_type' => 'responsive',
            'size_units' => [ 'px', '%' ],
            'range' => [
                'px' => [
                    'min' => 0,
                    'max' => 3000,
                ],
            ],
            'selectors' => [
                '{{WRAPPER}} .pxl-tabs--content ' => 'top: {{SIZE}}{{UNIT}} ;',
            ],
        ),
        array(
            'name' => 'tab_effect',
            'label' => esc_html__('Effect', 'nexros' ),
            'type' => \Elementor\Controls_Manager::SELECT,
            'options' => [
                'tab-effect-slide' => 'Slide',
                'tab-effect-fade' => 'Fade',
            ],
            'default' => 'tab-effect-slide',
        ),
        array(
            'name' => 'title_color',
            'label' => esc_html__('Title Color', 'nexros' ),
            'type' => \Elementor\Controls_Manager::COLOR,
            'selectors' => [
                '{{WRAPPER}} .pxl-tabs .pxl-tabs--title > .pxl-item--title' => 'color: {{VALUE}};',
            ],
        ),
        array(
            'name' => 'title_active_color',
            'label' => esc_html__('Title Active Color', 'nexros' ),
            'type' => \Elementor\Controls_Manager::COLOR,
            'selectors' => [
                '{{WRAPPER}} .pxl-tabs .pxl-tabs--title > .pxl-item--title.active' => 'color: {{VALUE}};',
            ],
        ),
        array(
            'name' => 'title_box_color_w',
            'label' => esc_html__('Title Box Color', 'nexros' ),
            'type' => \Elementor\Controls_Manager::COLOR,
            'selectors' => [
                '{{WRAPPER}} .pxl-tabs .pxl-tabs--title > .pxl-tabs--title' => 'background-color: {{VALUE}};',
            ],
        ),
        array(
            'name' => 'btn_color',
            'label' => esc_html__('Background Button Color Active', 'nexros' ),
            'type' => \Elementor\Controls_Manager::COLOR,
            'selectors' => [
                '{{WRAPPER}} .pxl-tabs .pxl-tabs--title > .pxl-item--title.active' => 'background-color: {{VALUE}};',
            ],
        ),
        array(
            'name' => 'title_typography',
            'label' => esc_html__('Title Typography', 'nexros' ),
            'type' => \Elementor\Group_Control_Typography::get_type(),
            'control_type' => 'group',
            'selector' => '{{WRAPPER}} .pxl-tabs .pxl-tabs--title > .pxl-item--title',
            'separator' => 'after',
        ),
        array(
            'name' => 'content_color',
            'label' => esc_html__('Content Color', 'nexros' ),
            'type' => \Elementor\Controls_Manager::COLOR,
            'selectors' => [
                '{{WRAPPER}} .pxl-tabs .pxl-item--content' => 'color: {{VALUE}};',
            ],
        ),
        array(
            'name' => 'content_typography',
            'label' => esc_html__('Content Typography', 'nexros' ),
            'type' => \Elementor\Group_Control_Typography::get_type(),
            'control_type' => 'group',
            'selector' => '{{WRAPPER}} .pxl-tabs .pxl-item--content',
        ),
    ),
),
nexros_widget_animation_settings(),
),
),
),
nexros_get_class_widget_path()
);