<?php
$col_xs = $widget->get_setting('col_xs', '');
$col_sm = $widget->get_setting('col_sm', '');
$col_md = $widget->get_setting('col_md', '');
$col_lg = $widget->get_setting('col_lg', '');
$col_xl = $widget->get_setting('col_xl', '');
$col_xxl = $widget->get_setting('col_xxl', '');
if($col_xxl == 'inherit') {
    $col_xxl = $col_xl;
}
$slides_to_scroll = $widget->get_setting('slides_to_scroll');
$arrows = $widget->get_setting('arrows', false);  
$pagination = $widget->get_setting('pagination', false);
$pagination_type = $widget->get_setting('pagination_type', 'bullets');
$pause_on_hover = $widget->get_setting('pause_on_hover', false);
$autoplay = $widget->get_setting('autoplay', false);
$autoplay_speed = $widget->get_setting('autoplay_speed', '5000');
$infinite = $widget->get_setting('infinite', false);  
$speed = $widget->get_setting('speed', '500');
$drap = $widget->get_setting('drap', false);  
$opts = [
    'slide_direction'               => 'horizontal',
    'slide_percolumn'               => 1, 
    'slide_mode'                    => 'slide', 
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
    'speed'                         => (int)$speed
];
$widget->add_render_attribute( 'carousel', [
    'class'         => 'pxl-swiper-container',
    'dir'           => is_rtl() ? 'rtl' : 'ltr',
    'data-settings' => wp_json_encode($opts)
]);
if(isset($settings['client']) && !empty($settings['client']) && count($settings['client'])): ?>
    <div class="pxl-swiper-slider pxl-client-carousel pxl-client-carousel1 pxl-swiper-arrow-show <?php echo esc_attr($settings['style']); ?>" data-arrow="<?php echo esc_attr($arrows); ?>">
        <div class="pxl-carousel-inner">
            <div <?php pxl_print_html($widget->get_render_attribute_string( 'carousel' )); ?>>
                <div class="pxl-swiper-wrapper">
                    <?php foreach ($settings['client'] as $key => $value):
                        $title = isset($value['title']) ? $value['title'] : '';
                        $logo = isset($value['logo']) ? $value['logo'] : '';
                        $logo2 = isset($value['logo2']) ? $value['logo2'] : '';
                        $star = isset($value['star']) ? $value['star'] : ''; 
                        $link_key = $widget->get_repeater_setting_key( 'btn_link', 'value', $key );
                        if ( ! empty( $value['btn_link']['url'] ) ) {
                            $widget->add_render_attribute( $link_key, 'href', $value['btn_link']['url'] );

                            if ( $value['btn_link']['is_external'] ) {
                                $widget->add_render_attribute( $link_key, 'target', '_blank' );
                            }

                            if ( $value['btn_link']['nofollow'] ) {
                                $widget->add_render_attribute( $link_key, 'rel', 'nofollow' );
                            }
                        }
                        $link_attributes = $widget->get_render_attribute_string( $link_key );
                        ?>
                        <div class="pxl-swiper-slide elementor-repeater-item-<?php echo esc_attr($value['_id']); ?>">
                            <div class="pxl-item--inner <?php echo esc_attr($settings['pxl_animate']); ?>" data-wow-delay="<?php echo esc_attr($settings['pxl_animate_delay']); ?>ms">
                                <a <?php echo implode( ' ', [ $link_attributes ] ); ?>>
                                    <?php if(!empty($logo['id'])) { 
                                        $img_logo = pxl_get_image_by_size( array(
                                            'attach_id'  => $logo['id'],
                                            'thumb_size' => 'full',
                                            'class' => 'no-lazyload',
                                        ));
                                        $thumbnail_logo = $img_logo['thumbnail'];
                                        echo wp_kses_post($thumbnail_logo); 
                                        ?>
                                    <?php } ?>
                                    
                                    <?php if(!empty($logo2['id'])) { 
                                        $img_logo2 = pxl_get_image_by_size( array(
                                            'attach_id'  => $logo2['id'],
                                            'thumb_size' => 'full',
                                            'class' => 'no-lazyload',
                                        ));
                                        $thumbnail_logo2 = $img_logo2['thumbnail'];
                                        echo wp_kses_post($thumbnail_logo2); 
                                        ?>
                                    <?php } ?>
                                </a>
                            </div>
                        </div>
                    <?php endforeach; ?>
                </div>
            </div>

            <?php if($arrows !== false): ?>
                <div class="pxl-swiper-arrow-wrap style-2">
                    <div class="pxl-swiper-arrow pxl-swiper-arrow-prev"><i class="bi-arrow-right-short rtl-icon"></i></div>
                    <div class="pxl-swiper-arrow pxl-swiper-arrow-next"><i class="bi-arrow-right-short rtl-icon"></i></div>
                </div>
            <?php endif; ?>
        </div>
    </div>
<?php endif; ?>
