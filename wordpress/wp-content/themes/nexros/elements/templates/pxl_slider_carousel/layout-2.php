<?php
$html_id = pxl_get_element_id($settings);
extract($settings);

$ids = esc_attr('grad-'.$html_id);
$ids1 = esc_attr('grad1-'.$html_id);

$col_xs = $widget->get_setting('col_xs', '');
$col_sm = $widget->get_setting('col_sm', '');
$col_md = $widget->get_setting('col_md', '');
$col_lg = $widget->get_setting('col_lg', '');
$col_xl = $widget->get_setting('col_xl', '');
$col_xxl = $widget->get_setting('col_xxl', '');
$allow_touchmove = $widget->get_setting('allow_touchmove',false);
if($col_xxl == 'inherit') {
    $col_xxl = $col_xl;
}
$slides_to_scroll = $widget->get_setting('slides_to_scroll', '');
$arrows = $widget->get_setting('arrows',false);
$pagination = $widget->get_setting('pagination',false);
$pagination_type = $widget->get_setting('pagination_type','bullets');
$effect = $widget->get_setting('effect','gl');
$pause_on_hover = $widget->get_setting('pause_on_hover');
$autoplay = $widget->get_setting('autoplay', '');
$autoplay_speed = $widget->get_setting('autoplay_speed', '5000');
$infinite = $widget->get_setting('infinite',false);
$speed = $widget->get_setting('speed', '500');
$opts = [
    'slide_direction'               => 'horizontal',
    'slide_percolumn'               => '1',
    'slide_mode'                    => $effect,
    'slides_to_show'                => (int)$col_xl,
    'slides_to_show_xxl'            => (int)$col_xxl,
    'slides_to_show_lg'             => (int)$col_lg,
    'slides_to_show_md'             => (int)$col_md,
    'slides_to_show_sm'             => (int)$col_sm,
    'slides_to_show_xs'             => (int)$col_xs,
    'slides_to_scroll'              => (int)$slides_to_scroll,
    'arrow'                         => (bool)$arrows,
    'pagination'                    => (bool)$pagination,
    'pagination_type'               => $pagination_type,
    'autoplay'                      => (bool)$autoplay,
    'pause_on_hover'                => (bool)$pause_on_hover,
    'pause_on_interaction'          => true,
    'delay'                         => (int)$autoplay_speed,
    'loop'                          => (bool)$infinite,
    'speed'                         => (int)$speed,
    'allow_touch_move'              => true
];
$widget->add_render_attribute( 'carousel', [
    'class'         => 'pxl-swiper-container',
    'dir'           => is_rtl() ? 'rtl' : 'ltr',
    'data-settings' => wp_json_encode($opts)
]);
if(isset($settings['slider1']) && !empty($settings['slider1']) && count($settings['slider1'])): ?>
    <div class="pxl-swiper-slider pxl-slider-carousel pxl-slider-carousel2 pxl-drag-area pxl-parent-transition pxl-parent-cursor pxl-swiper-arrow-show <?php echo esc_attr($settings['style']); ?> <?php if($arrows == 'true') { echo esc_attr__( 'pxl-show-arrow', 'nexros' ); } ?>" data-view-auto="<?php echo esc_attr($col_xl); ?>">
        <div class="pxl-carousel-inner">
            <div <?php pxl_print_html($widget->get_render_attribute_string( 'carousel' )); ?>>
                <div class="pxl-swiper-wrapper">
                    <?php foreach ($settings['slider1'] as $key => $value):
                        $image_light = isset($value['image1']) ? $value['image1'] : '';
                        $position1 = isset($value['position1']) ? $value['position1'] : '';
                        $title = isset($value['title1']) ? $value['title1'] : '';
                        $position_text = isset($value['position_text1']) ? $value['position_text1'] : '';
                        $desc = isset($value['desc1']) ? $value['desc1'] : '';
                        $btn_text = isset($value['btn_text1']) ? $value['btn_text1'] : '';
                        $btn_text2 = isset($value['btn_text2']) ? $value['btn_text2'] : '';
                        $link = isset($value['btn_link1']) ? $value['btn_link1'] : '';
                        $link2 = isset($value['btn_link2']) ? $value['btn_link2'] : '';
                        $link_key = $widget->get_repeater_setting_key( 'title1', 'value', $key );
                        $link_key2 = $widget->get_repeater_setting_key( 'title1', 'value', $key );
                        if ( ! empty( $link['url'] ) ) {
                            $widget->add_render_attribute( $link_key, 'href', $link['url'] );

                            if ( $link['is_external'] ) {
                                $widget->add_render_attribute( $link_key, 'target', '_blank' );
                            }

                            if ( $link['nofollow'] ) {
                                $widget->add_render_attribute( $link_key, 'rel', 'nofollow' );
                            }
                        }
                        $link_attributes = $widget->get_render_attribute_string( $link_key );
                        if ( ! empty( $link2['url'] ) ) {
                            $widget->add_render_attribute( $link_key2, 'href', $link2['url'] );

                            if ( $link2['is_external'] ) {
                                $widget->add_render_attribute( $link_key2, 'target', '_blank' );
                            }

                            if ( $link2['nofollow'] ) {
                                $widget->add_render_attribute( $link_key2, 'rel', 'nofollow' );
                            }
                        }
                        $link_attributes2 = $widget->get_render_attribute_string( $link_key2 );
                        ?>
                        <div class="pxl-swiper-slide">
                            <div class="pxl-item--inner <?php echo esc_attr($settings['pxl_animate']); ?>"  data-wow-delay="<?php echo esc_attr($settings['pxl_animate_delay']); ?>ms">
                              <?php if(!empty($image_light['id'])) { 
                                $img = pxl_get_image_by_size( array(
                                    'attach_id'  => $image_light['id'],
                                    'thumb_size' => 'full',
                                    'class' => 'no-lazyload swiper-gl-image',
                                ));
                                $thumbnail = $img['thumbnail'];
                                ?>
                                <div class="pxl-item--image ">
                                    <?php echo wp_kses_post($thumbnail); ?>
                                </div>
                            <?php } ?>
                            <div class="content--wrapper">
                                <?php if(!empty($title)) : ?>
                                    <h1 class="pxl-item--title el-empty wow fadeInUp" data-duration="200ms" data-wow-delay="500ms"><?php echo pxl_print_html($title); ?></h1>
                                <?php endif; ?>
                                <?php if(!empty($desc)) : ?>
                                    <p class="pxl-item--desc el-empty wow fadeInRight"  data-duration="200ms" data-wow-delay="700ms"><?php echo pxl_print_html($desc); ?></p>
                                <?php endif; ?>
                                <div class="pxl-item--link  wow fadeInUp"  data-duration="200ms" data-wow-delay="900ms">
                                    <?php if ( !empty( $link['url'] ) ) { ?>
                                        <a class="item--button btn  btn-glossy" <?php echo implode( ' ', [ $link_attributes ] ); ?>>
                                            <span class="btn-text">
                                                <?php if(!empty($btn_text)) {
                                                    echo pxl_print_html($btn_text);
                                                } else {
                                                    echo esc_html__('Our Services', 'nexros');
                                                } ?>
                                            </span> 
                                            <span class="button-arrow-hover"><svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 9 9" fill="none">
                                                <path d="M7.66931 2.276L1.93131 8.014L0.988647 7.07133L6.72597 1.33333H1.66931V0H9.00264V7.33333H7.66931V2.276Z" fill="#fff"></path>
                                            </svg><svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 9 9" fill="none">
                                                <path d="M7.66931 2.276L1.93131 8.014L0.988647 7.07133L6.72597 1.33333H1.66931V0H9.00264V7.33333H7.66931V2.276Z" fill="#fff"></path>
                                            </svg></span>
                                        </a>
                                    <?php } ?>
                                    <?php if ( !empty( $link2['url'] ) ) { ?>
                                        <a class="item--button btn  btn-glossy" <?php echo implode( ' ', [ $link_attributes2 ] ); ?>>
                                            <span class="btn-text">
                                                <?php if(!empty($btn_text2)) {
                                                    echo pxl_print_html($btn_text2);
                                                } else {
                                                    echo esc_html__('Get a Quote', 'nexros');
                                                } ?>
                                            </span> 
                                            <span class="button-arrow-hover"><svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 9 9" fill="none">
                                                <path d="M7.66931 2.276L1.93131 8.014L0.988647 7.07133L6.72597 1.33333H1.66931V0H9.00264V7.33333H7.66931V2.276Z" fill="#fff"></path>
                                            </svg><svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 9 9" fill="none">
                                                <path d="M7.66931 2.276L1.93131 8.014L0.988647 7.07133L6.72597 1.33333H1.66931V0H9.00264V7.33333H7.66931V2.276Z" fill="#fff"></path>
                                            </svg></span>
                                        </a>
                                    <?php } ?>
                                </div>
                                <?php if(!empty($position1['id'])) { 
                                    $img = pxl_get_image_by_size( array(
                                        'attach_id'  => $position1['id'],
                                        'thumb_size' => '64x32',
                                        'class' => 'no-lazyload',
                                    ));
                                    $thumbnail = $img['thumbnail'];?>
                                    <div class="pxl-item--avatar wow fadeInUp" data-duration="200ms" data-wow-delay="1100ms">
                                        <?php echo wp_kses_post($thumbnail); ?>
                                        <?php echo esc_html($position_text); ?>
                                    </div>
                                <?php } ?>
                            </div>
                        </div>
                    </div>
                <?php endforeach; ?>
            </div>
        </div>
        <?php if($pagination !== false): ?>
            <div class="pxl-swiper-dots style-1"></div>
        <?php endif; ?>
        <?php if($arrows !== false): ?>
            <div class="pxl-swiper-arrow-wrap style-5 ">
                <div class="pxl-swiper-arrow pxl-swiper-arrow-prev"><i class="fas fa-angle-left"></i></div>
                <div class="pxl-swiper-arrow pxl-swiper-arrow-next"><i class="fas fa-angle-right"></i></div>
            </div>
        <?php endif; ?>
    </div>
</div>
<?php endif; ?>
