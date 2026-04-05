<?php
pxl_add_custom_widget(
    array(
        'name' => 'pxl_pricing_table',
        'title' => esc_html__('Tnex Pricing Table', 'nexros'),
        'icon' => 'eicon-table',
        'categories' => array('pxltheme-core'),
        'scripts' => array(
            'nexros-table',
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
                                    'image' => get_template_directory_uri() . '/elements/widgets/img-layout/pxl_pricing_table/layout1.jpg'
                                ],
                                '2' => [
                                    'label' => esc_html__('Layout 2', 'nexros' ),
                                    'image' => get_template_directory_uri() . '/elements/widgets/img-layout/pxl_pricing_table/layout2.jpg'
                                ],
                            ],
                        ),
                    ),
                ),
                array(
                    'name' => 'section_content',
                    'label' => esc_html__('Content', 'nexros'),
                    'tab' => \Elementor\Controls_Manager::TAB_CONTENT,
                    'controls' => array(
                        array(
                            'name' => 'style',
                            'label' => esc_html__('Style', 'nexros'),
                            'type' => \Elementor\Controls_Manager::SELECT,
                            'default' => 'style-1',
                            'condition' => [
                                'layout' => '2',
                            ],
                            'options' => [
                                'style-1' => esc_html__('Default', 'nexros'),
                                'style-2' => esc_html__('Style 2', 'nexros'),
                            ],
                        ),
                        array(
                            'name' => 'row',
                            'label' => esc_html__('Title Row', 'nexros'),
                            'type' => \Elementor\Controls_Manager::SWITCHER,
                            'default' => false,
                        ),
                        array(
                            'name' => 'column',
                            'label' => esc_html__('Title Column', 'nexros'),
                            'type' => \Elementor\Controls_Manager::SWITCHER,
                            'default' => false,
                        ),
                        array(
                            'name' => 'show_column',
                            'label' => esc_html__('Show Column', 'nexros'),
                            'type' => \Elementor\Controls_Manager::SWITCHER,
                            'default' => true,
                        ),
                        array(
                            'name' => 'res_type',
                            'label' => esc_html__('Responsive Type', 'nexros'),
                            'type' => \Elementor\Controls_Manager::SELECT,
                            'options' => [
                                'row'    => esc_html__('Row', 'nexros'),
                                'column'    => esc_html__('Column', 'nexros'),
                            ],
                            'default' => 'row',
                            'description' => 'Work when Title Row and Title Column on!'
                        ),
                        array(
                            'name' => 'res_screen',
                            'label' => esc_html__('Responsive When', 'nexros'),
                            'type' => \Elementor\Controls_Manager::NUMBER,
                            'default' => '767',
                        ),
                        array(
                            'name' => 'feature_column',
                            'label' => esc_html__('Feature Column', 'nexros'),
                            'type' => \Elementor\Controls_Manager::REPEATER,
                            'description' => 'Number of columns equal to column content of table below!',
                            'controls' => array(
                                array(
                                    'name' => 'plan_active',
                                    'label' => esc_html__('Active Plan', 'nexros'),
                                    'type' => \Elementor\Controls_Manager::SWITCHER,
                                    'default' => false,
                                ),
                                array(
                                    'name' => 'plan_name',
                                    'label' => esc_html__('Plan Name', 'nexros'),
                                    'type' => \Elementor\Controls_Manager::TEXT,
                                    'label_block' => true,
                                    'default' => 'Free Plan',
                                ),
                                array(
                                    'name' => 'plan_description',
                                    'label' => esc_html__('Plan Description', 'nexros'),
                                    'type' => \Elementor\Controls_Manager::TEXTAREA,
                                    'label_block' => true,
                                    'default' => '',
                                ),
                                array(
                                    'name' => 'plan_price',
                                    'label' => esc_html__('Plan Price', 'nexros'),
                                    'type' => \Elementor\Controls_Manager::TEXT,
                                    'label_block' => true,
                                    'default' => '$0',
                                ),
                                array(
                                    'name' => 'period',
                                    'label' => esc_html__('Period', 'nexros'),
                                    'type' => \Elementor\Controls_Manager::TEXT,
                                    'label_block' => true,
                                    'default' => 'Per Month',
                                ),
                                array(
                                    'name' => 'plan_button_text',
                                    'label' => esc_html__('Button Text', 'nexros'),
                                    'type' => \Elementor\Controls_Manager::TEXT,
                                    'label_block' => true,
                                    'default' => 'Start Free',
                                ),
                                array(
                                    'name' => 'plan_button_link',
                                    'label' => esc_html__('Button Link', 'nexros'),
                                    'type' => \Elementor\Controls_Manager::URL,
                                    'label_block' => true,
                                ),
                                
                            ),
                            'title_field' => '{{{ plan_name }}}',
                        ),
                        array(
                            'name' => 'table',
                            'label' => esc_html__('Table Content', 'nexros'),
                            'type' => 'pxl_table',
                            'rows' => 3, 
                            'cols' => 3, 
                            'first_row_as_header' => true, 
                            'button_text' => esc_html__('Add Row', 'nexros'),
                        ),
                    ),
                ),
                array(
                    'name' => 'section_responsive',
                    'label' => esc_html__('Mobile Settings', 'nexros'),
                    'tab' => \Elementor\Controls_Manager::TAB_SETTINGS,
                    'controls' => array(
                        array(
                            'name' => 'col_xs',
                            'label' => esc_html__('Table Columns XS Devices', 'nexros' ),
                            'type' => \Elementor\Controls_Manager::SELECT,
                            'default' => '1',
                            'options' => [
                                '1' => '1',
                                '2' => '2',
                                '3' => '3',
                            ],
                        ),
                        array(
                            'name' => 'col_sm',
                            'label' => esc_html__('Columns SM Devices', 'nexros' ),
                            'type' => \Elementor\Controls_Manager::SELECT,
                            'default' => '2',
                            'options' => [
                                '1' => '1',
                                '2' => '2',
                                '3' => '3',
                                '4' => '4',
                            ],
                        ),
                        array(
                            'name' => 'col_md',
                            'label' => esc_html__('Columns MD Devices', 'nexros' ),
                            'type' => \Elementor\Controls_Manager::SELECT,
                            'default' => '2',
                            'options' => [
                                '1' => '1',
                                '2' => '2',
                                '3' => '3',
                                '4' => '4',
                                '5' => '5',
                                '6' => '6',
                            ],
                        ),
                        array(
                            'name' => 'col_lg',
                            'label' => esc_html__('Columns LG Devices', 'nexros' ),
                            'type' => \Elementor\Controls_Manager::SELECT,
                            'default' => '3',
                            'options' => [
                                '1' => '1',
                                '2' => '2',
                                '3' => '3',
                                '4' => '4',
                                '5' => '5',
                                '6' => '6',
                            ],
                        ),
                        array(
                            'name' => 'col_xl',
                            'label' => esc_html__('Columns XL Devices', 'nexros' ),
                            'type' => \Elementor\Controls_Manager::SELECT,
                            'default' => '3',
                            'options' => [
                                '1' => '1',
                                '2' => '2',
                                '3' => '3',
                                '4' => '4',
                                '5' => '5',
                                '6' => '6',
                            ],
                        ),
                        array(
                            'name' => 'col_xxl',
                            'label' => esc_html__('Columns XXL Devices', 'nexros' ),
                            'type' => \Elementor\Controls_Manager::SELECT,
                            'default' => '3',
                            'options' => [
                                '1' => '1',
                                '2' => '2',
                                '3' => '3',
                                '4' => '4',
                                '5' => '5',
                                '6' => '6',
                            ],
                        ),
                    ),
                    'condition' => [
                        'res_type' => 'column'
                    ]
                ),
                nexros_widget_animation_settings(),
            ),
        ),
    ),
    nexros_get_class_widget_path()
);