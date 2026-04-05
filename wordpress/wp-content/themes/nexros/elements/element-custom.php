<?php

use Elementor\Element_Base;
use Elementor\Widget_Base;
use Elementor\Controls_Manager;
use Elementor\Group_Control_Image_Size;
use Elementor\Group_Control_Typography;
use Elementor\Schemes\Color;
use Elementor\Schemes\Typography;
use Elementor\Utils;
use Elementor\Control_Media;
use Elementor\Group_Control_Border;
use Elementor\Group_Control_Box_Shadow;
use Elementor\Group_Control_Text_Shadow;
use Elementor\Group_Control_Background;
use Elementor\Repeater;
use Elementor\Includes\Elements\PXL_Container;

defined('ABSPATH') || die();

class Hub_Elementor_Custom_Controls {

    public static $pxl_el_container_bg = array();

    public static function init() {

        add_action( 'elementor/frontend/before_render', [ __CLASS__, 'before_section_render' ], 1 );

//pxl sticky layout
        add_action( 'elementor/element/after_section_end', function( $element, $section_id ) {

            if ( $element->get_name() === 'container' && 'section_layout_additional_options' === $section_id ) {

                $elementor_doc_selector = '.elementor';

                $element->start_controls_section(
                    'pxl_sticky_container_layout_section',
                    [
                        'label' => __( 'Sticky <span style="font-size: 1.5em; vertical-align:middle; margin-inline-start:0.35em;">📌<span>', 'nexros' ),
                        'tab' => Controls_Manager::TAB_LAYOUT,
                    ]
                );

                $element->add_control(
                    'pxl_section_border_animated',
                    [
                        'label' => esc_html__('Border Animated', 'nexros'),
                        'type' => \Elementor\Controls_Manager::SWITCHER,
                        'label_on' => esc_html__( 'Yes', 'nexros' ),
                        'label_off' => esc_html__( 'No', 'nexros' ),
                        'return_value' => 'yes',
                        'default' => 'no',
                        'separator' => 'after',
                    ]
                );

                $element->add_control(
                    'col_fixed',
                    [
                        'label'   => esc_html__( 'Column Fixed', 'nexros' ),
                        'type'    => \Elementor\Controls_Manager::SELECT,
                        'description' => esc_html__('Only applies to the original container.', 'nexros' ),
                        'options' => array(
                            'none'        => esc_html__( 'No', 'nexros' ),
                            'fixed'   => esc_html__( 'Yes', 'nexros' ),
                        ),
                        'default' => 'none',
                        'prefix_class' => 'pxl-row-scroll-'
                    ]
                );

                $element->add_control(
                    'col_sticky',
                    [
                        'label'   => esc_html__( 'Column Sticky', 'nexros' ),
                        'type'    => \Elementor\Controls_Manager::SELECT,
                        'options' => array(
                            'none'           => esc_html__( 'No', 'nexros' ),
                            'sticky' => esc_html__( 'Yes', 'nexros' ),
                        ),
                        'default' => 'none',
                        'prefix_class' => 'pxl-column-'
                    ]
                );

                $element->add_control(
                    'col_sticky_offset_top',
                    [
                        'label' => esc_html__( 'Sticky Offset Top', 'nexros' ),
                        'type' => 'text',
                        'description' => esc_html__('Enter number.', 'nexros' ),
                        'default'  => '30',
                        'selectors' => [
                            '{{WRAPPER}}.pxl-column-sticky' => 'top: {{VALUE}}'.'px',
                        ],
                        'condition' => [
                            'col_sticky' => 'sticky'
                        ]
                    ]
                );

                $element->add_control(
                    'full_content_with_space',
                    [
                        'label' => esc_html__( 'Full Content with space from?', 'nexros' ),
                        'type'         => \Elementor\Controls_Manager::SELECT,
                        'prefix_class' => 'pxl-full-content-with-space-',
                        'options'      => array(
                            'none'    => esc_html__( 'None', 'nexros' ),
                            'start'   => esc_html__( 'Start', 'nexros' ),
                            'end'     => esc_html__( 'End', 'nexros' ),
                        ),
                        'default'      => 'none',
                    ]
                );

                $element->add_control(
                    'pxl_container_width',
                    [
                        'label' => esc_html__('Container Width', 'nexros'),
                        'type' => \Elementor\Controls_Manager::NUMBER,
                        'default' => 1200,
                        'condition' => [
                            'full_content_with_space!' => 'none'
                        ]           
                    ]
                );

                $element->end_controls_section();
            }

        }, 10, 2 );

// pxl dark layout
add_action( 'elementor/element/after_section_end', function( $element, $section_id ) {

    if ( $element->get_name() === 'container' && 'section_layout_additional_options' === $section_id ) {

        $elementor_doc_selector = '.elementor';

        $element->start_controls_section(
            'pxl_dark_container_layout_section',
            [
                'label' => __( 'Background <span style="font-size: 1.5em; vertical-align:middle; margin-inline-start:0.35em;">🖼️<span>', 'nexros' ),
                'tab' => Controls_Manager::TAB_LAYOUT,
            ]
        );

        $element->add_control(
            'pxl_parallax_bg_img',
            [
                'label' => esc_html__( 'Parallax Background Image', 'nexros' ),
                'type' => \Elementor\Controls_Manager::MEDIA,
                'selectors' => [
                    '{{WRAPPER}} .pxl-section-bg-parallax' => 'background-image: url( {{URL}} );',
                ],
            ]
        );

        $element->add_responsive_control(
            'pxl_parallax_bg_position',
            [
                'label' => esc_html__( 'Background Position', 'nexros' ),
                'type'         => \Elementor\Controls_Manager::SELECT,
                'hide_in_inner' => true,
                'options'      => array(
                    ''              => esc_html__( 'Default', 'nexros' ),
                    'center center' => esc_html__( 'Center Center', 'nexros' ),
                    'center left'   => esc_html__( 'Center Left', 'nexros' ),
                    'center right'  => esc_html__( 'Center Right', 'nexros' ),
                    'top center'    => esc_html__( 'Top Center', 'nexros' ),
                    'top left'      => esc_html__( 'Top Left', 'nexros' ),
                    'top right'     => esc_html__( 'Top Right', 'nexros' ),
                    'bottom center' => esc_html__( 'Bottom Center', 'nexros' ),
                    'bottom left'   => esc_html__( 'Bottom Left', 'nexros' ),
                    'bottom right'  => esc_html__( 'Bottom Right', 'nexros' ),
                    'initial'       =>  esc_html__( 'Custom', 'nexros' ),
                ),
                'default'      => '',
                'selectors' => [
                    '{{WRAPPER}} .pxl-section-bg-parallax' => 'background-position: {{VALUE}};',
                ],
                'condition' => [
                    'pxl_parallax_bg_img[url]!' => ''
                ]        
            ]
        );

        $element->add_responsive_control(
            'pxl_parallax_bg_pos_custom_x',
            [
                'label' => esc_html__( 'X Position', 'nexros' ),
                'type' => \Elementor\Controls_Manager::SLIDER,  
                'hide_in_inner' => true,
                'size_units' => [ 'px', 'em', '%', 'vw' ],
                'default' => [
                    'unit' => 'px',
                    'size' => 0,
                ],
                'range' => [
                    'px' => [
                        'min' => -800,
                        'max' => 800,
                    ],
                    'em' => [
                        'min' => -100,
                        'max' => 100,
                    ],
                    '%' => [
                        'min' => -100,
                        'max' => 100,
                    ],
                    'vw' => [
                        'min' => -100,
                        'max' => 100,
                    ],
                ],
                'selectors' => [
                    '{{WRAPPER}} .pxl-section-bg-parallax' => 'background-position: {{SIZE}}{{UNIT}} {{pxl_parallax_bg_pos_custom_y.SIZE}}{{pxl_parallax_bg_pos_custom_y.UNIT}}',
                ],
                'condition' => [
                    'pxl_parallax_bg_position' => [ 'initial' ],
                    'pxl_parallax_bg_img[url]!' => '',
                ],
            ]
        );
        $element->add_responsive_control(
            'pxl_parallax_bg_pos_custom_y',
            [
                'label' => esc_html__( 'Y Position', 'nexros' ),
                'type' => \Elementor\Controls_Manager::SLIDER,  
                'hide_in_inner' => true,
                'size_units' => [ 'px', 'em', '%', 'vw' ],
                'default' => [
                    'unit' => 'px',
                    'size' => 0,
                ],
                'range' => [
                    'px' => [
                        'min' => -800,
                        'max' => 800,
                    ],
                    'em' => [
                        'min' => -100,
                        'max' => 100,
                    ],
                    '%' => [
                        'min' => -100,
                        'max' => 100,
                    ],
                    'vw' => [
                        'min' => -100,
                        'max' => 100,
                    ],
                ],
                'selectors' => [
                    '{{WRAPPER}} .pxl-section-bg-parallax' => 'background-position: {{pxl_parallax_bg_pos_custom_x.SIZE}}{{pxl_parallax_bg_pos_custom_x.UNIT}} {{SIZE}}{{UNIT}}',
                ],

                'condition' => [
                    'pxl_parallax_bg_position' => [ 'initial' ],
                    'pxl_parallax_bg_img[url]!' => '',
                ],
            ]
        );
        $element->add_responsive_control(
            'pxl_parallax_bg_size',
            [
                'label' => esc_html__( 'Background Size', 'nexros' ),
                'type'         => \Elementor\Controls_Manager::SELECT,
                'hide_in_inner' => true,
                'options'      => array(
                    ''              => esc_html__( 'Default', 'nexros' ),
                    'auto' => esc_html__( 'Auto', 'nexros' ),
                    'cover'   => esc_html__( 'Cover', 'nexros' ),
                    'contain'  => esc_html__( 'Contain', 'nexros' ),
                    'initial'    => esc_html__( 'Custom', 'nexros' ),
                ),
                'default'      => '',
                'selectors' => [
                    '{{WRAPPER}} .pxl-section-bg-parallax' => 'background-size: {{VALUE}};',
                ],
                'condition' => [
                    'pxl_parallax_bg_img[url]!' => ''
                ]        
            ]
        );
        $element->add_responsive_control(
            'pxl_parallax_bg_size_custom',
            [
                'label' => esc_html__( 'Background Width', 'nexros' ),
                'type' => \Elementor\Controls_Manager::SLIDER,  
                'hide_in_inner' => true,
                'size_units' => [ 'px', 'em', '%', 'vw' ],
                'range' => [
                    'px' => [
                        'min' => 0,
                        'max' => 1000,
                    ],
                    '%' => [
                        'min' => 0,
                        'max' => 100,
                    ],
                    'vw' => [
                        'min' => 0,
                        'max' => 100,
                    ],
                ],
                'default' => [
                    'size' => 100,
                    'unit' => '%',
                ],
                'selectors' => [
                    '{{WRAPPER}} .pxl-section-bg-parallax' => 'background-size: {{SIZE}}{{UNIT}} auto',
                ],
                'condition' => [
                    'pxl_parallax_bg_size' => [ 'initial' ],
                    'pxl_parallax_bg_img[url]!' => '',
                ],
            ]
        );
        $element->add_control(
            'pxl_parallax_pos_popover_toggle',
            [
                'label' => esc_html__( 'Parallax Background Position', 'nexros' ),
                'type' => \Elementor\Controls_Manager::POPOVER_TOGGLE,
                'label_off' => esc_html__( 'Default', 'nexros' ),
                'label_on' => esc_html__( 'Custom', 'nexros' ),
                'return_value' => 'yes',
                'condition'     => [
                    'pxl_parallax_bg_img[url]!' => ''
                ] 
            ]
        );
        $element->start_popover();
        $element->add_responsive_control(
            'pxl_parallax_pos_left',
            [
                'label' => esc_html__( 'Left', 'nexros' ).' (50px) px,%,vw,auto',
                'type' => 'text',
                'default' => '',
                'selectors' => [
                    '{{WRAPPER}} .pxl-section-bg-parallax' => 'left: {{VALUE}}',
                ],
                'condition'     => [
                    'pxl_parallax_bg_img[url]!' => ''
                ] 
            ]
        );
        $element->add_responsive_control(
            'pxl_parallax_pos_top',
            [
                'label' => esc_html__( 'Top', 'nexros' ).' (50px) px,%,vw,auto',
                'type' => 'text',
                'default' => '',
                'selectors' => [
                    '{{WRAPPER}} .pxl-section-bg-parallax' => 'top: {{VALUE}}',
                ],
                'condition'     => [
                    'pxl_parallax_bg_img[url]!' => ''
                ] 
            ]
        ); 
        $element->add_responsive_control(
            'pxl_parallax_pos_right',
            [
                'label' => esc_html__( 'Right', 'nexros' ).' (50px) px,%,vw,auto',
                'type' => 'text',
                'default' => '',
                'selectors' => [
                    '{{WRAPPER}} .pxl-section-bg-parallax' => 'right: {{VALUE}}',
                ],
                'condition'     => [
                    'pxl_parallax_bg_img[url]!' => ''
                ] 
            ]
        );
        $element->add_responsive_control(
            'pxl_parallax_pos_bottom',
            [
                'label' => esc_html__( 'Bottom', 'nexros' ).' (50px) px,%,vw,auto',
                'type' => 'text',
                'default' => '',
                'selectors' => [
                    '{{WRAPPER}} .pxl-section-bg-parallax' => 'bottom: {{VALUE}}',
                ],
                'condition'     => [
                    'pxl_parallax_bg_img[url]!' => ''
                ] 
            ]
        ); 
        $element->end_popover();

        $element->add_control(
            'pxl_parallax_effect_popover_toggle',
            [
                'label' => esc_html__( 'Parallax Background Effect', 'nexros' ),
                'type' => \Elementor\Controls_Manager::POPOVER_TOGGLE,
                'label_off' => esc_html__( 'Default', 'nexros' ),
                'label_on' => esc_html__( 'Custom', 'nexros' ),
                'return_value' => 'yes',
                'condition'     => [
                    'pxl_parallax_bg_img[url]!' => ''
                ] 
            ]
        );
        $element->start_popover();
        $element->add_control(
            'pxl_parallax_bg_img_effect_x',
            [
                'label' => esc_html__( 'TranslateX', 'nexros' ).' (-80)',
                'type' => 'text',
                'default' => '',
                'condition'     => [
                    'pxl_parallax_bg_img[url]!' => ''
                ] 
            ]
        );
        $element->add_control(
            'pxl_parallax_bg_img_effect_y',
            [
                'label' => esc_html__( 'TranslateY', 'nexros' ).' (-80)',
                'type' => 'text',
                'default' => '',
                'condition'     => [
                    'pxl_parallax_bg_img[url]!' => ''
                ] 
            ]
        );
        $element->add_control(
            'pxl_parallax_bg_img_effect_z',
            [
                'label' => esc_html__( 'TranslateZ', 'nexros' ).' (-80)',
                'type' => 'text',
                'default' => '',
                'condition'     => [
                    'pxl_parallax_bg_img[url]!' => ''
                ] 
            ]
        );
        $element->add_control(
            'pxl_parallax_bg_img_effect_rotate_x',
            [
                'label' => esc_html__( 'Rotate X', 'nexros' ).' (30)',
                'type' => 'text',
                'default' => '',
                'condition'     => [
                    'pxl_parallax_bg_img[url]!' => ''
                ] 
            ]
        );
        $element->add_control(
            'pxl_parallax_bg_img_effect_rotate_y',
            [
                'label' => esc_html__( 'Rotate Y', 'nexros' ).' (30)',
                'type' => 'text',
                'default' => '',
                'condition'     => [
                    'pxl_parallax_bg_img[url]!' => ''
                ] 
            ]
        );
        $element->add_control(
            'pxl_parallax_bg_img_effect_rotate_z',
            [
                'label' => esc_html__( 'Rotate Z', 'nexros' ).' (30)',
                'type' => 'text',
                'default' => '',
                'condition'     => [
                    'pxl_parallax_bg_img[url]!' => ''
                ] 
            ]
        );
        $element->add_control(
            'pxl_parallax_bg_img_effect_scale_x',
            [
                'label' => esc_html__( 'Scale X', 'nexros' ).' (1.2)',
                'type' => 'text',
                'default' => '',
                'condition'     => [
                    'pxl_parallax_bg_img[url]!' => ''
                ] 
            ]
        ); 
        $element->add_control(
            'pxl_parallax_bg_img_effect_scale_y',
            [
                'label' => esc_html__( 'Scale Y', 'nexros' ).' (1.2)',
                'type' => 'text',
                'default' => '',
                'condition'     => [
                    'pxl_parallax_bg_img[url]!' => ''
                ] 
            ]
        );
        $element->add_control(
            'pxl_parallax_bg_img_effect_scale_z',
            [
                'label' => esc_html__( 'Scale Z', 'nexros' ).' (1.2)',
                'type' => 'text',
                'default' => '',
                'condition'     => [
                    'pxl_parallax_bg_img[url]!' => ''
                ] 
            ]
        );
        $element->add_control(
            'pxl_parallax_bg_img_effect_scale',
            [
                'label' => esc_html__( 'Scale', 'nexros' ).' (1.2)',
                'type' => 'text',
                'default' => '',
                'condition'     => [
                    'pxl_parallax_bg_img[url]!' => ''
                ] 
            ]
        );
        $element->add_control(
            'pxl_parallax_bg_from_scroll_custom',
            [
                'label' => esc_html__( 'Scroll From (px)', 'nexros' ).' (350) from offset top',
                'type' => 'text',
                'default' => '',
                'condition'     => [
                    'pxl_parallax_bg_img[url]!' => ''
                ] 
            ]
        );
        $element->end_popover(); 
        $element->add_control(
            'pxl_parallax_bg_effect_other',
            [
                'label'         => esc_html__( 'Background Effect Other', 'nexros' ),
                'type'          => \Elementor\Controls_Manager::SELECT,
                'label_block'   => true,
                'options'       => array(
                    ''        => esc_html__( 'None', 'nexros' ),
                    'pinned-zoom-clipped'    => esc_html__( 'Pinned Zoom Clipped', 'nexros' ),
                    'pinned-circle-zoom-clipped'    => esc_html__( 'Pinned Circle Zoom Clipped', 'nexros' ),
                    'mask-parallax'    => esc_html__( 'Mask Parallax ', 'nexros' ),
                    'mask-parallax light-content'    => esc_html__( 'Mask Parallax - Light Content', 'nexros' ),
                ),
                'default'      => '',
                'frontend_available' => true,
                'prefix_class' => 'pxl-bg-prx-effect-',
                'condition' => [
                    'pxl_parallax_bg_img[url]!' => ''
                ]        
            ]
        );
        $element->add_control(
            'pxl_parallax_bg_circle_zoom_bg_color',
            [
                'label'         => esc_html__( 'Circle Zoom Clipped Mask Background Color', 'nexros' ),
                'type'          => \Elementor\Controls_Manager::SELECT,
                'label_block'   => true,
                'type' => \Elementor\Controls_Manager::COLOR,
                'selectors' => [
                    '{{WRAPPER}} .circle-zoom-mask-svg .mask-bg' => 'fill: {{VALUE}};'
                ],
                'condition' => [
                    'pxl_parallax_bg_img[url]!' => '',
                    'pxl_parallax_bg_effect_other' => 'pinned-circle-zoom-clipped'
                ]        
            ]
        );
        $element->add_control(
            'pxl_parallax_bg_circle_zoom_inner_bg_color',
            [
                'label'         => esc_html__( 'Circle Zoom Inner Background Color', 'nexros' ),
                'type'          => \Elementor\Controls_Manager::SELECT,
                'label_block'   => true,
                'type' => \Elementor\Controls_Manager::COLOR,
                'selectors' => [
                    '{{WRAPPER}} .circle-zoom-mask-svg .circle-inner-layer' => 'fill: {{VALUE}};'
                ],
                'condition' => [
                    'pxl_parallax_bg_img[url]!' => '',
                    'pxl_parallax_bg_effect_other' => 'pinned-circle-zoom-clipped'
                ]        
            ]
        );
        $element->add_group_control(
            \Elementor\Group_Control_Css_Filter::get_type(),
            [
                'name'      => 'pxl_section_parallax_img_css_filter',
                'selector' => '{{WRAPPER}} .pxl-section-bg-parallax',
                'condition'     => [
                    'pxl_parallax_bg_img[url]!' => ''
                ] 
            ]
        );
        $element->add_responsive_control(
            'pxl_section_parallax_opacity',
            [
                'label'      => esc_html__( 'Parallax Opacity (0 - 100)', 'nexros' ),
                'type' => \Elementor\Controls_Manager::SLIDER,
                'size_units' => [ '%' ],
                'range' => [
                    '%' => [
                        'min' => 1,
                        'max' => 100,
                    ]
                ],
                'default'    => [
                    'unit' => '%'
                ],
                'laptop_default' => [
                    'unit' => '%',
                ],
                'tablet_extra_default' => [
                    'unit' => '%',
                ],
                'tablet_default' => [
                    'unit' => '%',
                ],
                'mobile_extra_default' => [
                    'unit' => '%',
                ],
                'mobile_default' => [
                    'unit' => '%',
                ],
                'selectors' => [
                    '{{WRAPPER}} .pxl-section-bg-parallax' => 'opacity: {{SIZE}}{{UNIT}};',
                ],
                'condition' => [
                    'pxl_parallax_bg_img[url]!' => ''
                ] 
            ]
        );

        $element->end_controls_section();
    }

}, 10, 2 );

add_action( 'elementor/element/after_section_end', function( $element, $section_id ) {

    if (
        $section_id === 'section_layout'  ||
        $section_id === 'section_advanced' ||
        $section_id === '_section_style'
    ) {

        if ( $element->get_controls( 'pxl_effect_container_layout_section' ) ) {
            return;
        }

        $element->start_controls_section(
            'pxl_effect_container_layout_section',
            [
                'label' => __( 'Effect Images 🖊', 'nexros' ),
                'tab' => Controls_Manager::TAB_ADVANCED,
            ]
        );

        $element->add_control(
            'pxl_widget_parallax_effect_popover_toggle',
            [
                'label' => esc_html__( 'Parallax Background Effect', 'nexros' ),
                'type' => \Elementor\Controls_Manager::POPOVER_TOGGLE,
                'label_off' => esc_html__( 'Default', 'nexros' ),
                'label_on' => esc_html__( 'Custom', 'nexros' ),
                'return_value' => 'yes',
            ]
        );
        $element->start_popover();
        $element->add_control(
            'pxl_widget_parallax_bg_img_effect_x',
            [
                'label' => esc_html__( 'TranslateX', 'nexros' ).' (-80)',
                'type' => 'text',
                'default' => '',
            ]
        );
        $element->add_control(
            'pxl_widget_parallax_bg_img_effect_y',
            [
                'label' => esc_html__( 'TranslateY', 'nexros' ).' (-80)',
                'type' => 'text',
                'default' => '',
            ]
        );
        $element->add_control(
            'pxl_widget_parallax_bg_img_effect_z',
            [
                'label' => esc_html__( 'TranslateZ', 'nexros' ).' (-80)',
                'type' => 'text',
                'default' => '',
            ]
        );
        $element->add_control(
            'pxl_widget_parallax_bg_img_effect_rotate_x',
            [
                'label' => esc_html__( 'Rotate X', 'nexros' ).' (30)',
                'type' => 'text',
                'default' => '',
            ]
        );
        $element->add_control(
            'pxl_widget_parallax_bg_img_effect_rotate_y',
            [
                'label' => esc_html__( 'Rotate Y', 'nexros' ).' (30)',
                'type' => 'text',
                'default' => '',
            ]
        );
        $element->add_control(
            'pxl_widget_parallax_bg_img_effect_rotate_z',
            [
                'label' => esc_html__( 'Rotate Z', 'nexros' ).' (30)',
                'type' => 'text',
                'default' => '',
            ]
        );
        $element->add_control(
            'pxl_widget_parallax_bg_img_effect_scale_x',
            [
                'label' => esc_html__( 'Scale X', 'nexros' ).' (1.2)',
                'type' => 'text',
                'default' => '',
            ]
        ); 
        $element->add_control(
            'pxl_widget_parallax_bg_img_effect_scale_y',
            [
                'label' => esc_html__( 'Scale Y', 'nexros' ).' (1.2)',
                'type' => 'text',
                'default' => '',
            ]
        );
        $element->add_control(
            'pxl_widget_parallax_bg_img_effect_scale_z',
            [
                'label' => esc_html__( 'Scale Z', 'nexros' ).' (1.2)',
                'type' => 'text',
                'default' => '',
            ]
        );
        $element->add_control(
            'pxl_widget_parallax_bg_img_effect_scale',
            [
                'label' => esc_html__( 'Scale', 'nexros' ).' (1.2)',
                'type' => 'text',
                'default' => '',
            ]
        );
        $element->add_control(
            'pxl_widget_parallax_bg_from_scroll_custom',
            [
                'label' => esc_html__( 'Scroll From (px)', 'nexros' ).' (350) from offset top',
                'type' => 'text',
                'default' => '',
            ]
        );
        $element->end_popover(); 

        $element->add_control(
            'pxl_widget_el_pos_popover_toggle',
            [
                'label' => esc_html__( 'Position', 'nexros' ),
                'type' => \Elementor\Controls_Manager::POPOVER_TOGGLE,
                'label_off' => esc_html__( 'Default', 'nexros' ),
                'label_on' => esc_html__( 'Custom', 'nexros' ),
                'return_value' => 'yes',
            ]
        );
        $element->start_popover();
        $element->add_responsive_control(
            'pxl_widget_el_position',
            [
                'label' => esc_html__( 'Position', 'nexros' ),
                'type'         => \Elementor\Controls_Manager::SELECT,
                'options'      => array(
                    ''         => esc_html__( 'Default', 'nexros' ),
                    'absolute' => esc_html__( 'Absolute', 'nexros' ),
                    'relative' => esc_html__( 'Relative', 'nexros' ),
                    'fixed'    => esc_html__( 'Fixed', 'nexros' ),
                ),
                'default'      => '',
                'selectors' => [
                    '{{WRAPPER}}' => 'position: {{VALUE}};',
                ],
            ]
        );
        $element->add_responsive_control(
            'pxl_widget_el_pos_left',
            [
                'label' => esc_html__( 'Left', 'nexros' ).' (50px) px,%,vw,auto',
                'type' => 'text',
                'default' => '',
                'selectors' => [
                    '{{WRAPPER}}' => 'left: {{VALUE}}',
                ],
                'condition'     => [
                    'pxl_widget_el_position!' => ''
                ] 
            ]
        );
        $element->add_responsive_control(
            'pxl_widget_el_pos_top',
            [
                'label' => esc_html__( 'Top', 'nexros' ).' (50px) px,%,vw,auto',
                'type' => 'text',
                'default' => '',
                'selectors' => [
                    '{{WRAPPER}}' => 'top: {{VALUE}}',
                ],
                'condition'     => [
                    'pxl_widget_el_position!' => ''
                ] 
            ]
        ); 
        $element->add_responsive_control(
            'pxl_widget_el_pos_right',
            [
                'label' => esc_html__( 'Right', 'nexros' ).' (50px) px,%,vw,auto',
                'type' => 'text',
                'default' => '',
                'selectors' => [
                    '{{WRAPPER}}' => 'right: {{VALUE}}',
                ],
                'condition'     => [
                    'pxl_widget_el_position!' => ''
                ] 
            ]
        );
        $element->add_responsive_control(
            'pxl_widget_el_pos_bottom',
            [
                'label' => esc_html__( 'Bottom', 'nexros' ).' (50px) px,%,vw,auto',
                'type' => 'text',
                'default' => '',
                'selectors' => [
                    '{{WRAPPER}}' => 'bottom: {{VALUE}}',
                ],
                'condition'     => [
                    'pxl_widget_el_position!' => ''
                ] 
            ]
        ); 
        $element->end_popover();

        $element->add_control(
            'pxl_widget_el_parallax_effect',
            [
                'label' => esc_html__('Pxl Parallax Effect', 'nexros' ),
                'type' => \Elementor\Controls_Manager::SELECT,
                'options' => [
                    ''               => esc_html__( 'None', 'nexros' ),
                    'wow PXLfadeInUp' => esc_html__( 'PXLfadeInUp', 'nexros' ),
                    'wow PXLZoom2' => esc_html__( 'PXLZoom', 'nexros' ),
                    'wow PXLfadeInUp2' => esc_html__( 'Mouse Move Scope Class (mouse-move-scope)', 'nexros' ),
                ],
                'label_block' => true,
                'default' => '',
                'prefix_class' => ''
            ]
        );
        $element->end_controls_section();
    }
}, 10, 2 );

add_action( 'elementor/element/after_section_end', function( $element, $section_id ) {

    if ( $element->get_name() === 'container' && 'section_layout_additional_options' === $section_id ) {

        $elementor_doc_selector = '.elementor';

		$element->start_controls_section(
			'pxl_orbit_section',
			[
				'label' => __( 'Effect Dot/Icon 🖊', 'nexros' ),
				'tab' => Controls_Manager::TAB_LAYOUT,
			]
		);

		$repeater = new \Elementor\Repeater();
		$repeater->add_control(
			'orbit_size',
			[
				'label' => esc_html__( 'Size', 'nexros' ),
				'type' => \Elementor\Controls_Manager::NUMBER,
				'default' => 70,
			]
		);
		$repeater->add_control(
			'orbit_count',
			[
				'label' => esc_html__( 'Count', 'nexros' ),
				'type' => \Elementor\Controls_Manager::NUMBER,
				'default' => 3,
			]
		);
		$repeater->add_control(
			'orbit_type',
			[
				'label' => esc_html__( 'Type', 'nexros' ),
				'type' => \Elementor\Controls_Manager::SELECT,
				'options' => [
					'icon' => esc_html__( 'Icon', 'nexros' ),
					'dot' => esc_html__( 'Dot', 'nexros' ),
					'both' => esc_html__( 'Both', 'nexros' ),
				],
				'default' => 'icon',
			]
		);
		$repeater->add_control(
			'orbit_icon_class',
			[
				'label' => esc_html__( 'Icon Class', 'nexros' ),
				'type' => \Elementor\Controls_Manager::TEXT,
				'placeholder' => 'orange',
			]
		);
		$repeater->add_control(
			'orbit_icons',
			[
				'label' => esc_html__( 'Icons', 'nexros' ),
				'type' => \Elementor\Controls_Manager::TEXTAREA,
				'default' => '⚡,🔥,✨',
				'description' => esc_html__( 'One per line: emoji/text or inline SVG', 'nexros' ),
			]
		);
		$repeater->add_control(
			'orbit_random_color',
			[
				'label' => esc_html__( 'Random Color', 'nexros' ),
				'type' => \Elementor\Controls_Manager::SWITCHER,
				'label_on' => esc_html__( 'Yes', 'nexros' ),
				'label_off' => esc_html__( 'No', 'nexros' ),
				'return_value' => 'yes',
				'default' => 'no',
			]
		);
		$repeater->add_control(
			'orbit_dot_colors',
			[
				'label' => esc_html__( 'Dot Colors', 'nexros' ),
				'type' => \Elementor\Controls_Manager::TEXTAREA,
				'description' => esc_html__( 'Comma or newline separated color codes (e.g. #ff0, #00ff88)', 'nexros' ),
				'default' => ''
			]
		);
		$repeater->add_control(
			'orbit_random_start',
			[
				'label' => esc_html__( 'Random Start Angle', 'nexros' ),
				'type' => \Elementor\Controls_Manager::SWITCHER,
				'label_on' => esc_html__( 'Yes', 'nexros' ),
				'label_off' => esc_html__( 'No', 'nexros' ),
				'return_value' => 'yes',
				'default' => 'no',
			]
		);

		$element->add_control(
			'pxl_orbits',
			[
				'label' => esc_html__( 'Orbits', 'nexros' ),
				'type' => \Elementor\Controls_Manager::REPEATER,
				'fields' => $repeater->get_controls(),
				'title_field' => 'Orbit: {{{ orbit_type }}} ({{{ orbit_count }}}) – {{{ orbit_icon_class }}}',
			]
		);

		$element->end_controls_section();
    }
}, 10, 3 );

add_action( 'elementor/element/after_section_end', function( $element, $section_id ) {
    if ( $element->get_name() === 'container' && 'section_layout_additional_options' === $section_id ) {

        $element->start_controls_section(
			'pxl_divider_section',
			[
				'label' => __( 'Divider 🖊', 'nexros' ),
				'tab' => Controls_Manager::TAB_LAYOUT,
			]
		);

        $element->add_control(
            'pxl_section_divider',
            [
                'label' => esc_html__( 'Divider', 'nexros' ),
                'type' => \Elementor\Controls_Manager::SWITCHER,
                'default' => 'no',
            ]
        );
        $element->add_control(
            'pxl_section_divider_position',
            [
                'label' => esc_html__( 'Position', 'nexros' ),
                'type' => \Elementor\Controls_Manager::SELECT2,
                'options' => [
                    'top' => esc_html__( 'Top', 'nexros' ),
                    'bottom' => esc_html__( 'Bottom', 'nexros' ),
                    'left' => esc_html__( 'Left', 'nexros' ),
                    'right' => esc_html__( 'Right', 'nexros' ),
                ],
                'multiple' => true,
                'default' => [ 'top' ],
                'condition' => [
                    'pxl_section_divider' => 'yes',
                ],
            ]
        );
        $element->add_responsive_control(
            'pxl_section_divider_color',
            [
                'label' => esc_html__( 'Divider Color', 'nexros' ),
                'type' => \Elementor\Controls_Manager::COLOR,
                'condition' => [
                    'pxl_section_divider' => 'yes',
                ],
            ]
        );
        $element->add_responsive_control(
            'pxl_section_divider_color_center',
            [
                'label' => esc_html__( 'Divider Color Center', 'nexros' ),
                'type' => \Elementor\Controls_Manager::COLOR,
                'condition' => [
                    'pxl_section_divider' => 'yes',
                ],
            ]
        );
        $element->add_responsive_control(
            'pxl_section_divider_color_end',
            [
                'label' => esc_html__( 'Divider Color End', 'nexros' ),
                'type' => \Elementor\Controls_Manager::COLOR,
                'condition' => [
                    'pxl_section_divider' => 'yes',
                ],
            ]
        );

        $element->add_responsive_control(
            'pxl_section_divider_width',
            [
                'label' => esc_html__( 'Divider Width', 'nexros' ),
                'type' => \Elementor\Controls_Manager::SLIDER,
                'size_units' => [ 'px' ],
                'range' => [
                    'px' => [
                        'min' => 0,
                        'max' => 10000,
                    ],
                ],
                'selectors' => [
                    '{{WRAPPER}} >.pxl-section-divider' => 'width: {{SIZE}}{{UNIT}};',
                    '{{WRAPPER}} .e-con-inner >.pxl-section-divider' => 'width: {{SIZE}}{{UNIT}};',
                ],
                'conditions' => [
                    'relation' => 'and',
                    'terms' => [
                        [
                            'name' => 'pxl_section_divider',
                            'operator' => '==',
                            'value' => 'yes',
                        ],
                        [
                            'relation' => 'or',
                            'terms' => [
                                [
                                    'name' => 'pxl_section_divider_position',
                                    'operator' => 'contains',
                                    'value' => 'left',
                                ],
                                [
                                    'name' => 'pxl_section_divider_position',
                                    'operator' => 'contains',
                                    'value' => 'right',
                                ],
                            ],
                        ],
                    ],
                ],
            ]
        );
        $element->add_responsive_control(
            'pxl_section_divider_height',
            [
                'label' => esc_html__( 'Divider Height', 'nexros' ),
                'type' => \Elementor\Controls_Manager::SLIDER,
                'size_units' => [ 'px' ],
                'range' => [
                    'px' => [
                        'min' => 0,
                        'max' => 10000,
                    ],
                ],
                'selectors' => [
                    '{{WRAPPER}} >.pxl-section-divider' => 'height: {{SIZE}}{{UNIT}};',
                    '{{WRAPPER}} .e-con-inner >.pxl-section-divider' => 'height: {{SIZE}}{{UNIT}};',
                ],
                'conditions' => [
                    'relation' => 'and',
                    'terms' => [
                        [
                            'name' => 'pxl_section_divider',
                            'operator' => '==',
                            'value' => 'yes',
                        ],
                        [
                            'relation' => 'or',
                            'terms' => [
                                [
                                    'name' => 'pxl_section_divider_position',
                                    'operator' => 'contains',
                                    'value' => 'top',
                                ],
                                [
                                    'name' => 'pxl_section_divider_position',
                                    'operator' => 'contains',
                                    'value' => 'bottom',
                                ],
                            ],
                        ],
                    ],
                ],
            ]
        );
        $element->end_controls_section();
    }
}, 10, 4 );


add_action( 'elementor/element/after_section_end', function( $element, $section_id ) {
    if ( $element->get_name() === 'container' && 'section_layout_additional_options' === $section_id ) {
    $element->start_controls_section(
        'section_particles',
        [
            'label' => esc_html__( 'Particles', 'nexros' ),
            'tab' => \Elementor\Controls_Manager::TAB_LAYOUT,
        ]
    );

    $element->add_control(
        'row_particles_display',
        [
            'label'   => esc_html__( 'Particles', 'nexros' ),
            'type' => \Elementor\Controls_Manager::SWITCHER,
            'default' => 'false',  
        ]
    );

    $element->add_control(
        'number',
        [
            'label' => esc_html__('Number', 'nexros'),
            'type' => \Elementor\Controls_Manager::NUMBER,
            'default' => 4,      
            'condition' => [
                'row_particles_display' => ['yes'],
            ],     
        ]
    );

    $element->add_control(
        'size',
        [
            'label' => esc_html__('Size', 'nexros'),
            'type' => \Elementor\Controls_Manager::NUMBER,
            'default' => 3, 
            'condition' => [
                'row_particles_display' => ['yes'],
            ],           
        ]
    );

    $element->add_control(
        'size_random',
        [
            'label' => esc_html__('Size Random', 'nexros'),
            'type' => \Elementor\Controls_Manager::SWITCHER,
            'default' => 'false',
            'condition' => [
                'row_particles_display' => ['yes'],
            ],   
        ]
    );

    $element->add_control(
        'move_direction',
        [
            'label'   => esc_html__( 'Move Direction', 'nexros' ),
            'type'    => \Elementor\Controls_Manager::SELECT,
            'options' => array(
                'none'        => esc_html__( 'None', 'nexros' ),
                'top'        => esc_html__( 'Top', 'nexros' ),
                'top-right'        => esc_html__( 'Top Right', 'nexros' ),
                'right'        => esc_html__( 'Right', 'nexros' ),
                'bottom-right'        => esc_html__( 'Bottom Right', 'nexros' ),
                'bottom'        => esc_html__( 'Bottom', 'nexros' ),
                'bottom-left'        => esc_html__( 'Bottom Left', 'nexros' ),
                'left'        => esc_html__( 'Left', 'nexros' ),
                'top-left'        => esc_html__( 'Top Left', 'nexros' ),
            ),
            'default'      => 'none',
            'condition' => [
                'row_particles_display' => ['yes'],
            ],  
        ]
    );

    $repeater = new \Elementor\Repeater();
    $repeater->add_control(
        'particle_color', 
        [
            'label' => esc_html__('Color', 'nexros' ),
            'type' => \Elementor\Controls_Manager::COLOR,
        ]
    );
    $element->add_control(
        'particle_color_item',
        [
            'label' => esc_html__('Color', 'nexros'),
            'type' => \Elementor\Controls_Manager::REPEATER,
            'fields' => $repeater->get_controls(),
            'default' => [],
            'condition' => [
                'row_particles_display' => ['yes'],
            ],    
        ]
    );
        $element->end_controls_section();
    }
}, 10, 3 );


add_action('elementor/element/after_add_attributes', 'nexros_custom_el_attributes', 10, 1);

add_filter( 'pxl_element_container/before-render', function( $html, $settings ) {
    if( isset($settings['pxl_section_border_animated']) && $settings['pxl_section_border_animated'] == 'yes' ){
        $breakpoints = ['laptop','tablet_extra','tablet','mobile_extra','mobile'];

        $unit = $settings['border_width']['unit'];
        $border_num = 0;

        $bt_width = $settings['border_width']['top'];
        $br_width = $settings['border_width']['right'];
        $bb_width = $settings['border_width']['bottom'];
        $bl_width = $settings['border_width']['left'];

        foreach ($breakpoints as $v) {
            if( isset($settings['border_width_'.$v]['top']) && (int)$settings['border_width_'.$v]['top'] > 0 )
                $bt_width = $settings['border_width_'.$v]['top'];
            if( isset($settings['border_width_'.$v]['right']) && (int)$settings['border_width_'.$v]['right'] > 0 )
                $br_width = $settings['border_width_'.$v]['right'];
            if( isset($settings['border_width_'.$v]['bottom']) && (int)$settings['border_width_'.$v]['bottom'] > 0 )
                $bb_width = $settings['border_width_'.$v]['bottom'];
            if( isset($settings['border_width_'.$v]['left']) && (int)$settings['border_width_'.$v]['left'] > 0 )
                $bl_width = $settings['border_width_'.$v]['left'];
        }

        $bd_top_style = 'style="--bd-width: '.$bt_width.$unit.' 0 0 0; border-style: '.$settings['border_border'].'; border-color: '.$settings['border_color'].';"';
        $bd_right_style = 'style="--bd-width: 0 '.$br_width.$unit.' 0 0; border-style: '.$settings['border_border'].'; border-color: '.$settings['border_color'].';"';
        $bd_bottom_style = 'style="--bd-width: 0 0 '.$bb_width.$unit.' 0; border-style: '.$settings['border_border'].'; border-color: '.$settings['border_color'].';"';
        $bd_left_style = 'style="--bd-width: 0 0 0 '.$bl_width.$unit.'; border-style: '.$settings['border_border'].'; border-color: '.$settings['border_color'].';"';

        $bd_top_w = $bd_right_w = $bd_bottom_w = $bd_left_w = '';

        foreach (['top', 'right', 'bottom', 'left'] as $side) {
            $var_name = 'bd_' . $side . '_w';
            if (isset($settings['border_width'][$side])) {
                if ($settings['border_width'][$side] == '0') {
                    $$var_name .= ' bw-no';
                } elseif ((int)$settings['border_width'][$side] > 0) {
                    $$var_name .= ' bw-yes';
                }
            }
        }

        foreach ($breakpoints as $v) {
            foreach (['top', 'right', 'bottom', 'left'] as $side) {
                $var_name = 'bd_' . $side . '_w';
                if (isset($settings['border_width_'.$v][$side])) {
                    if ($settings['border_width_'.$v][$side] == '0') {
                        $$var_name .= ' bw-'.$v.'-no';
                    } elseif ((int)$settings['border_width_'.$v][$side] > 0) {
                        $$var_name .= ' bw-'.$v.'-yes';
                    }
                }
            }
        }

        if( (int)$settings['border_width']['top'] > 0) $border_num++;
        if( (int)$settings['border_width']['right'] > 0) $border_num++;
        if( (int)$settings['border_width']['bottom'] > 0) $border_num++;
        if( (int)$settings['border_width']['left'] > 0) $border_num++;

        $html .= '<div class="pxl-border-animated num-'.$border_num.'">
        <div class="pxl-border-anm bt w-100 '.$bd_top_w.'" '.$bd_top_style.'></div>
        <div class="pxl-border-anm br h-100 '.$bd_right_w.'" '.$bd_right_style.'></div>
        <div class="pxl-border-anm bb w-100 '.$bd_bottom_w.'" '.$bd_bottom_style.'></div>
        <div class="pxl-border-anm bl h-100 '.$bd_left_w.'" '.$bd_left_style.'></div>
        </div>';
    }   

    return $html;
}, 10, 2 );

add_filter( 'pxl_element_container/before-render', function( $html, $settings ) {
    if(!empty($settings['pxl_parallax_bg_img']['url'])){
        $effects = [];
        if(!empty($settings['pxl_parallax_bg_img_effect_x'])){
            $effects['x'] = (int)$settings['pxl_parallax_bg_img_effect_x'];
        }
        if(!empty($settings['pxl_parallax_bg_img_effect_y'])){
            $effects['y'] = (int)$settings['pxl_parallax_bg_img_effect_y'];
        }
        if(!empty($settings['pxl_parallax_bg_img_effect_z'])){
            $effects['z'] = (int)$settings['pxl_parallax_bg_img_effect_z'];
        }
        if(!empty($settings['pxl_parallax_bg_img_effect_rotate_x'])){
            $effects['rotateX'] = (float)$settings['pxl_parallax_bg_img_effect_rotate_x'];
        }
        if(!empty($settings['pxl_parallax_bg_img_effect_rotate_y'])){
            $effects['rotateY'] = (float)$settings['pxl_parallax_bg_img_effect_rotate_y'];
        }
        if(!empty($settings['pxl_parallax_bg_img_effect_rotate_z'])){
            $effects['rotateZ'] = (float)$settings['pxl_parallax_bg_img_effect_rotate_z'];
        }
        if(!empty($settings['pxl_parallax_bg_img_effect_scale'])){
            $effects['scale'] = (float)$settings['pxl_parallax_bg_img_effect_scale'];
        }
        if(!empty($settings['pxl_parallax_bg_img_effect_scale_x'])){
            $effects['scaleX'] = (float)$settings['pxl_parallax_bg_img_effect_scale_x'];
        }
        if(!empty($settings['pxl_parallax_bg_img_effect_scale_y'])){
            $effects['scaleY'] = (float)$settings['pxl_parallax_bg_img_effect_scale_y'];
        }
        if(!empty($settings['pxl_parallax_bg_from_scroll_custom'])){
            $effects['from-scroll-custom'] = (int)$settings['pxl_parallax_bg_from_scroll_custom'];
        }
        
        $data_parallax = json_encode($effects);
        $pll_ccls = 'df-prl';
        if( !empty( $settings['pxl_parallax_bg_effect_other']) ){
            if( $settings['pxl_parallax_bg_effect_other'] == 'pinned-zoom-clipped' ){
                $html .= '<div class="clipped-bg-pinned"><div class="clipped-bg">';
            }
            if( $settings['pxl_parallax_bg_effect_other'] == 'pinned-circle-zoom-clipped' ){
                $html .= '<div class="clipped-bg-circle-pinned">';
            }
            if( $settings['pxl_parallax_bg_effect_other'] == 'mask-parallax' || $settings['pxl_parallax_bg_effect_other'] == 'mask-parallax light-content' ){
                $html .= '<div class="mask-parallax">';
                $pll_ccls = 'mask-prl';
            }
        }
        $html .= '<div class="pxl-section-bg-parallax '.$settings['pxl_parallax_bg_effect_other'].'" data-parallax="'.esc_attr($data_parallax).'"></div>';
        if( !empty( $settings['pxl_parallax_bg_effect_other']) ){
            if( $settings['pxl_parallax_bg_effect_other'] == 'pinned-zoom-clipped' ){
                $html .= '</div></div>';
            }
            if( $settings['pxl_parallax_bg_effect_other'] == 'pinned-circle-zoom-clipped' ){
                $html .= '<svg class="circle-zoom-mask-svg">
                <defs>
                <mask id="circle-zoom-mask">
                <rect width="100%" height="100%" fill="white"></rect>
                <circle class="circle-zoom" cx="50%" cy="50%" r="60"></circle>
                </mask>
                </defs>
                <rect class="circle-inner-layer" width="100%" height="100%" fill="white"></rect>
                <rect class="mask-bg" width="100%" height="100%" fill="#c4b5a4" mask="url(#circle-zoom-mask)"></rect>
                </svg>';
                $html .= '</div>';
            }
            if( $settings['pxl_parallax_bg_effect_other'] == 'mask-parallax' || $settings['pxl_parallax_bg_effect_other'] == 'mask-parallax light-content' ){
                $html .= '</div>';
            }
            
        }
    }

    if (!empty($settings['row_particles_display']) && $settings['row_particles_display'] === 'yes') {
        wp_enqueue_script('particles-background');

        $s_random = (!empty($settings['size_random']) && $settings['size_random'] === 'yes') ? 'true' : 'false';

        $colors = [];
        if (!empty($settings['particle_color_item']) && is_array($settings['particle_color_item'])) {
            foreach ($settings['particle_color_item'] as $values) {
                if (!empty($values['particle_color'])) {
                    $colors[] = $values['particle_color'];
                }
            }
        }
        if (empty($colors)) {
            $colors = ["#b73490","#006b41","#cd3000","#608ecb","#ffb500","#6e4e00","#6b541b","#305686","#00ffb4","#8798ff","#0044c1"];
        }

        $number = isset($settings['number']) && $settings['number'] !== '' ? (int) $settings['number'] : 4;
        $size = isset($settings['size']) && $settings['size'] !== '' ? (int) $settings['size'] : 3;
        $move_direction = isset($settings['move_direction']) ? $settings['move_direction'] : 'none';

        $data_color = esc_attr( wp_json_encode( $colors ) );

        $html .= '<div id="pxl-row-particles-'.uniqid().'" class="pxl-row-particles" data-number="'.$number.'" data-size="'.$size.'" data-size-random="'.$s_random.'" data-move-direction="'.esc_attr($move_direction).'" data-color=\''.$data_color.'\'></div>';
    }


    if(isset($settings['row_effect_images']) && !empty($settings['row_effect_images']) && count($settings['row_effect_images'])):
        $html .= '<div class="pxl-section-effect-images">';
    foreach ($settings['row_effect_images'] as $key => $value):
        $item_image = isset($value['item_image']) ? $value['item_image'] : '';
        $effect_image = isset($value['effect_image']) ? $value['effect_image'] : '';
        $image_display = isset($value['image_display']) ? $value['image_display'] : '';
        $image_display_md = isset($value['image_display_md']) ? $value['image_display_md'] : '';
        $image_display_sm = isset($value['image_display_sm']) ? $value['image_display_sm'] : '';
        $parallax_scroll_type = isset($value['parallax_scroll_type']) ? $value['parallax_scroll_type'] : '';
        $parallax_scroll_value = isset($value['parallax_scroll_value']) ? $value['parallax_scroll_value'] : '';
        $hidde_class = '';
        if($image_display !== 'false') {
           $hidde_class = 'pxl-hide-sr-lg';
       }
       $hidde_class_md = '';
       if($image_display_md !== 'false') {
           $hidde_class_md = 'pxl-hide-sr-md';
       }
       $hidde_class_sm = '';
       if($image_display_sm !== 'false') {
           $hidde_class_sm = 'pxl-hide-sr-sm';
       }
       $effects = [];
       if($parallax_scroll_type == 'y' && !empty($parallax_scroll_value)){
        $effects['y'] = (int)$parallax_scroll_value;
    }
    if($parallax_scroll_type == 'x' && !empty($parallax_scroll_value)){
        $effects['x'] = (int)$parallax_scroll_value;
    }
    if($parallax_scroll_type == 'z' && !empty($parallax_scroll_value)){
        $effects['z'] = (int)$parallax_scroll_value;
    }
    $data_parallax = json_encode($effects);

    $parallax_hover_value = isset($value['parallax_hover_value']) ? $value['parallax_hover_value'] : '';

    $html .= '<img data-parallax-value="'.esc_attr($parallax_hover_value).'" data-parallax="'.esc_attr($data_parallax).'" class="pxl-item--image elementor-repeater-item-'.$value['_id'].' '.$effect_image.' '.$hidde_class.' '.$hidde_class_md.' '.$hidde_class_sm.'" src="'.$item_image['url'].'" alt=""/>';
endforeach;
$html .= '</div>';
endif;

    if ( isset($settings['pxl_orbits']) && !empty($settings['pxl_orbits']) && is_array($settings['pxl_orbits']) ) {
        $html .= '<div class="pxl-scene">';
        foreach ($settings['pxl_orbits'] as $orbit) {
            $size = isset($orbit['orbit_size']) ? (int) $orbit['orbit_size'] : 70;
            $count = isset($orbit['orbit_count']) ? (int) $orbit['orbit_count'] : 3;
            $type = !empty($orbit['orbit_type']) ? $orbit['orbit_type'] : 'icon';
            $icon_class = !empty($orbit['orbit_icon_class']) ? $orbit['orbit_icon_class'] : '';
            $icons_raw = isset($orbit['orbit_icons']) ? $orbit['orbit_icons'] : '';
            $icons = [];
            $raw = trim((string) $icons_raw);
            if ($raw !== '') {
                $lines = preg_split('/\r\n|\r|\n/', $raw);
                $buffer = '';
                $inside_svg = false;
                foreach ($lines as $line) {
                    $line_no_trim = $line;
                    $line = trim($line);
                    if ($line === '') { continue; }
                    if ($inside_svg) {
                        $buffer .= $line_no_trim . "\n";
                        if (stripos($line, '</svg>') !== false) {
                            $icons[] = trim($buffer);
                            $buffer = '';
                            $inside_svg = false;
                        }
                        continue;
                    }
                    if (stripos($line, '<svg') === 0) {
                        $inside_svg = true;
                        $buffer = $line_no_trim . "\n";
                        if (stripos($line, '</svg>') !== false) {
                            $icons[] = trim($buffer);
                            $buffer = '';
                            $inside_svg = false;
                        }
                        continue;
                    }
                    $parts = array_map('trim', explode(',', $line));
                    foreach ($parts as $p) { if ($p !== '') { $icons[] = $p; } }
                }
                if ($inside_svg && $buffer !== '') {
                    $icons[] = trim($buffer);
                }
            }

            $settings_arr = [
                'size' => $size,
                'count' => $count,
                'type' => $type,
            ];
            if ($icon_class !== '') {
                $settings_arr['iconClass'] = $icon_class;
            }
            if (!empty($icons)) {
                $settings_arr['icons'] = array_values($icons);
            }
            if ($type === 'dot' || $type === 'both') {
                $settings_arr['dot'] = true;
            }
            if (!empty($orbit['orbit_random_start']) && $orbit['orbit_random_start'] === 'yes') {
                $settings_arr['randomStart'] = true;
            }
            if (!empty($orbit['orbit_random_color']) && $orbit['orbit_random_color'] === 'yes') {
                $settings_arr['randomColor'] = true;
            }
            if (!empty($orbit['orbit_dot_colors'])) {
                $rawColors = trim((string)$orbit['orbit_dot_colors']);
                if ($rawColors !== '') {
                    $delim = (strpos($rawColors, "\n") !== false) ? "\n" : ',';
                    $colors = array_filter(array_map('trim', explode($delim, $rawColors)));
                    if (!empty($colors)) {
                        $settings_arr['dotColors'] = array_values($colors);
                    }
                }
            }
            $data_settings = esc_attr( wp_json_encode( $settings_arr ) );

            $html .= '<div class="orbit" data-settings=\'' . $data_settings . '\'></div>';
        }
        $html .= '</div>';
    }

    if ( isset($settings['pxl_section_divider']) && $settings['pxl_section_divider'] === 'yes' ) {
        $colors = array_values(array_filter([
            isset($settings['pxl_section_divider_color']) ? $settings['pxl_section_divider_color'] : '',
            isset($settings['pxl_section_divider_color_center']) ? $settings['pxl_section_divider_color_center'] : '',
            isset($settings['pxl_section_divider_color_end']) ? $settings['pxl_section_divider_color_end'] : '',
        ], function($v){ return $v !== '' && $v !== null; }));

        $count = count($colors);
        $style_color_only = '';
        $style_h = '';
        $style_v = '';
        if ($count === 1) {
            $style_color_only = 'background-color: ' . $colors[0] . ';';
        } elseif ($count >= 2) {
            $gradient_colors = implode(', ', array_slice($colors, 0, 3));
            $style_h = 'background-image: linear-gradient(90deg, ' . $gradient_colors . ');';
            $style_v = 'background-image: linear-gradient(0deg, ' . $gradient_colors . ');';
        }

        $positions = isset($settings['pxl_section_divider_position']) ? $settings['pxl_section_divider_position'] : [];
        if (!is_array($positions)) {
            $positions = $positions !== '' ? [ $positions ] : [];
        }
        foreach ($positions as $pos) {
            $pos = sanitize_html_class($pos);
            $is_horizontal = ($pos === 'top' || $pos === 'bottom');
            $style = $style_color_only !== '' ? $style_color_only : ($is_horizontal ? $style_h : $style_v);
            $html .= '<div class="pxl-section-divider pxl-section-divider--'.$pos.'" style="'.$style.'"></div>';
        }
    }

return $html;
}, 10, 2 );

add_action('elementor/editor/after_enqueue_scripts', function () {
?>
    <script>
        jQuery(document).ready(function ($) {
            setInterval(function () {
            $('.elementor-editor-container .elementor-editor-element-settings').each(function () {
            if ($(this).find('.elementor-editor-element-play').length === 0) {
                $(this).append(`
                <li class="elementor-editor-element-setting elementor-editor-element-play" 
                title="Play children inview animations" 
                aria-label="Play children inview animations">
                <i class="eicon-play"></i>
                </li>
                `);
                }
                });
            }, 1000);

            $(document).on('click', '.elementor-editor-element-play', function () {
            var $widget = $(this).closest('.elementor-editor-element');

            $widget.find('.wow').removeClass('animated').css('visibility', 'hidden');

            setTimeout(function () {
                $widget.find('.wow').addClass('animated').css('visibility', 'visible');
                new WOW().init(); 
                }, 100);
            });
        });
    </script>
    <?php
});


function nexros_custom_el_attributes(Element_Base $el) {
    
    $settings = $el->get_settings();
    $settings_w = $el->get_settings_for_display();

    $pxl_container_width = !empty($settings['pxl_container_width']) ? (int)$settings['pxl_container_width'] : 1200;

    if (!empty($settings['stretch_section']) && $settings['stretch_section'] === 'section-stretched') {
        $pxl_container_width = max(0, $pxl_container_width - 30);
    }

    $pxl_container_width .= 'px';

    if (!empty($settings['full_content_with_space'])) {
        if ($settings['full_content_with_space'] === 'start') {
            $el->add_render_attribute('_wrapper', 'style', 'padding-left: max(15px, calc((100% - ' . $pxl_container_width . ') / 2));');
        } elseif ($settings['full_content_with_space'] === 'end') {
            $el->add_render_attribute('_wrapper', 'style', 'padding-right: max(15px, calc((100% - ' . $pxl_container_width . ') / 2));');
        }
    }

    if ($el->get_name() === 'section' && !empty($settings['pxl_header_type'])) {
        $el->add_render_attribute('_wrapper', 'class', 'pxl-header-' . $settings['pxl_header_type']);
    }

    if ( isset( $settings['pxl_section_border_animated'] ) && $settings['pxl_section_border_animated'] == 'yes'  ) {
        $el->add_render_attribute( '_wrapper', 'class', 'pxl-border-section-anm');
    }

    $effects_w = [];
    $parallax_enabled = !empty($settings_w['pxl_widget_parallax_effect_popover_toggle']) && $settings_w['pxl_widget_parallax_effect_popover_toggle'] === 'yes';
    
    $map = [
        'pxl_widget_parallax_bg_img_effect_x'        => ['x', 'int'],
        'pxl_widget_parallax_bg_img_effect_y'        => ['y', 'int'],
        'pxl_widget_parallax_bg_img_effect_z'        => ['z', 'int'],
        'pxl_widget_parallax_bg_img_effect_rotate_x' => ['rotateX', 'float'],
        'pxl_widget_parallax_bg_img_effect_rotate_y' => ['rotateY', 'float'],
        'pxl_widget_parallax_bg_img_effect_rotate_z' => ['rotateZ', 'float'],
        'pxl_widget_parallax_bg_img_effect_scale'    => ['scale', 'float'],
        'pxl_widget_parallax_bg_img_effect_scale_x'  => ['scaleX', 'float'],
        'pxl_widget_parallax_bg_img_effect_scale_y'  => ['scaleY', 'float'],
        'pxl_widget_parallax_bg_from_scroll_custom'  => ['from-scroll-custom', 'int'],
    ];
    
    if ($parallax_enabled) {
        foreach ($map as $key => [$attr, $type]) {
            if (!isset($settings_w[$key]) || $settings_w[$key] === '') {
                continue;
            }
            $value = $settings_w[$key];
            $effects_w[$attr] = $type === 'int' ? (int)$value : (float)$value;
        }

        if (!empty($effects_w)) {
            $data_parallax_w = json_encode($effects_w);
        
            $el->add_render_attribute('_wrapper', 'class', 'pxl-container-bg-parallax');
            $el->add_render_attribute('_wrapper', 'data-parallax', $data_parallax_w);
        }
    }    
}


add_action( 'elementor/element/parse_css', function( $post_css, $element ){

    if ( $post_css instanceof Dynamic_CSS ) {
        return;
    }

    $element_settings = $element->get_settings();

    if ( empty( $element_settings['pxl_custom_css'] ) ) {
        return;
    }

    $css = trim( $element_settings['pxl_custom_css'] );

    if ( empty( $css ) ) {
        return;
    }

    $css = str_replace( 'selector', $post_css->get_element_unique_selector( $element ), $css );

    $post_css->get_stylesheet()->add_raw_css( $css );

}, 10, 2 );
add_action( 'elementor/element/after_section_end', function( $element, $section_id ) {

    if (
        $section_id === 'section_layout'  ||
        $section_id === 'section_advanced' ||
        $section_id === '_section_style'
    ) {

        if ( $element->get_controls( 'pxl_custom_css_section' ) ) {
            return;
        }

        $element->start_controls_section(
            'pxl_custom_css_section',
            [
                'label' => __( 'Nexros Custom CSS 🖊', 'nexros' ),
                'tab' => Controls_Manager::TAB_ADVANCED,
            ]
        );

        $element->add_control(
            'pxl_custom_css',
            [
                'type' => Controls_Manager::CODE,
                'language' => 'css',
                'render_type' => 'ui',
            ]
        );

        $element->add_control(
            'pxl_custom_css_desc',
            [
                'raw' => sprintf(
                    esc_html__( 'Use "selector" to target wrapper element.%1$sselector {your css code}', 'nexros' ),
                    '<br><br>'
                ),
                'type' => Controls_Manager::RAW_HTML,
                'content_classes' => 'elementor-panel-alert elementor-panel-alert-info',
            ]
        );

        $element->end_controls_section();
    }
}, 10, 3 );
}

public static function before_section_render( Element_Base $element ) {

    if ( $element->get_settings( 'pxl_section_color_scheme' ) && $element->get_settings( 'pxl_section_color_scheme' ) !== '' ) {
        $element->add_render_attribute( '_wrapper', [
            'data-pxl-color-scheme' => $element->get_settings( 'pxl_section_color_scheme' ),
        ] );
    }
    if ( $element->get_settings( 'pxl_sticky_show' ) && $element->get_settings( 'pxl_sticky_show' ) === 'yes' ) {
        $element->add_render_attribute( '_wrapper', [
            'data-pxl-show-on-sticky' => 'true',
        ] );
        if ( $element->get_name() !== 'container' ) {
            $element->add_render_attribute( '_wrapper', 'class', 'hidden pxl-sticky:block');
        }
    }
    if ( $element->get_settings( 'pxl_sticky_hide' ) && $element->get_settings( 'pxl_sticky_hide' ) === 'yes' ) {
        $element->add_render_attribute( '_wrapper', [
            'data-pxl-hide-on-sticky' => 'true',
        ] );
        if ( $element->get_name() !== 'container' ) {
            $element->add_render_attribute( '_wrapper', 'class', 'pxl-sticky:hidden');
        }
    }
    if ( isset( $settings['pxl_section_border_animated'] ) && $settings['pxl_section_border_animated'] == 'yes'  ) {
        $el->add_render_attribute( '_wrapper', 'class', 'pxl-border-section-anm');
    }
}


}

Hub_Elementor_Custom_Controls::init();
