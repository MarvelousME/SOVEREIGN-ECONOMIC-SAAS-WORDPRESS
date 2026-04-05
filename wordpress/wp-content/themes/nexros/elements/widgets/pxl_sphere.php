<?php
pxl_add_custom_widget(
    array(
        'name' => 'pxl_sphere',
        'title' => esc_html__('Tnex Sphere', 'nexros'),
        'icon' => 'eicon-circle-o icon-brand-elementor',
        'categories' => array('pxltheme-core'),
        'scripts' => array(
            'sphere',
            'nexros-charts',
            'nexros-sphere'
        ),
        'params' => array(
            'sections' => array(
                array(
                    'name' => 'section_content',
                    'label' => esc_html__('Content', 'nexros'),
                    'tab' => \Elementor\Controls_Manager::TAB_CONTENT,
                    'controls' => array(
                        array(
                            'name' => 'sphere_size',
                            'label' => esc_html__('Sphere Size', 'nexros'),
                            'type' => \Elementor\Controls_Manager::SLIDER,
                            'size_units' => ['px'],
                            'range' => [
                                'px' => [
                                    'min' => 200,
                                    'max' => 2000,
                                    'step' => 10,
                                ],
                            ],
                            'default' => [
                                'unit' => 'px',
                                'size' => 950,
                            ],
                        ),
                        array(
                            'name' => 'tilt_angle',
                            'label' => esc_html__('Tilt Angle', 'nexros'),
                            'type' => \Elementor\Controls_Manager::SLIDER,
                            'size_units' => ['deg'],
                            'range' => [
                                'deg' => [
                                    'min' => -90,
                                    'max' => 90,
                                    'step' => 1,
                                ],
                            ],
                            'default' => [
                                'unit' => 'deg',
                                'size' => -30,
                            ],
                        ),
                        array(
                            'name' => 'sphere_color',
                            'label' => esc_html__('Sphere Color', 'nexros'),
                            'type' => \Elementor\Controls_Manager::COLOR,
                            'default' => '#ffffff',
                        ),
                        array(
                            'name' => 'rotation_type',
                            'label' => esc_html__('Rotation Type', 'nexros'),
                            'type' => \Elementor\Controls_Manager::SELECT,
                            'default' => 'y_axis',
                            'options' => [
                                'y_axis' => esc_html__('Y Axis (Horizontal)', 'nexros'),
                                'x_axis' => esc_html__('X Axis (Vertical)', 'nexros'),
                                'both_axis' => esc_html__('Both Axes', 'nexros'),
                                'custom' => esc_html__('Custom Path', 'nexros'),
                                'none' => esc_html__('No Rotation', 'nexros'),
                            ],
                        ),
                        array(
                            'name' => 'rotation_speed',
                            'label' => esc_html__('Rotation Speed', 'nexros'),
                            'type' => \Elementor\Controls_Manager::SLIDER,
                            'size_units' => [''],
                            'range' => [
                                '' => [
                                    'min' => 0.001,
                                    'max' => 0.02,
                                    'step' => 0.001,
                                ],
                            ],
                            'default' => [
                                'size' => 0.005,
                            ],
                        ),
                        array(
                            'name' => 'custom_x_speed',
                            'label' => esc_html__('X Axis Speed', 'nexros'),
                            'type' => \Elementor\Controls_Manager::SLIDER,
                            'size_units' => [''],
                            'range' => [
                                '' => [
                                    'min' => -0.02,
                                    'max' => 0.02,
                                    'step' => 0.001,
                                ],
                            ],
                            'default' => [
                                'size' => 0.003,
                            ],
                            'condition' => [
                                'rotation_type' => ['both_axis', 'custom'],
                            ],
                        ),
                        array(
                            'name' => 'custom_y_speed',
                            'label' => esc_html__('Y Axis Speed', 'nexros'),
                            'type' => \Elementor\Controls_Manager::SLIDER,
                            'size_units' => [''],
                            'range' => [
                                '' => [
                                    'min' => -0.02,
                                    'max' => 0.02,
                                    'step' => 0.001,
                                ],
                            ],
                            'default' => [
                                'size' => 0.005,
                            ],
                            'condition' => [
                                'rotation_type' => ['both_axis', 'custom'],
                            ],
                        ),
                    ),
                ),
            ),
        ),
    ),
    nexros_get_class_widget_path()
);