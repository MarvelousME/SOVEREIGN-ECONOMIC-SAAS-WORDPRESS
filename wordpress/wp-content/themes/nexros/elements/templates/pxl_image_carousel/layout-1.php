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
$effect = $widget->get_setting('effect', 'slide');
$pause_on_hover = $widget->get_setting('pause_on_hover', false);
$autoplay = $widget->get_setting('autoplay', false);
$autoplay_speed = $widget->get_setting('autoplay_speed', '5000');
$infinite = $widget->get_setting('infinite', false);  
$speed = $widget->get_setting('speed', '500');
$drap = $widget->get_setting('drap', false);  
$opts = [
    'slide_direction'               => 'horizontal',
    'slide_percolumn'               => 1, 
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
    'speed'                         => (int)$speed
];
$widget->add_render_attribute( 'carousel', [
    'class'         => 'pxl-swiper-container',
    'dir'           => is_rtl() ? 'rtl' : 'ltr',
    'data-settings' => wp_json_encode($opts)
]);
$pxl_g_id = uniqid();
$image_size = !empty($settings['img_size']) ? $settings['img_size'] : 'full';
if(isset($settings['image']) && !empty($settings['image']) && count($settings['image'])): ?>
    <div id="pxl-gallery-<?php echo esc_attr($pxl_g_id); ?>" class="pxl-swiper-slider pxl-image-carousel pxl-image-carousel1 <?php echo esc_attr($settings['style']); ?> <?php echo esc_attr($settings['pxl_animate']); ?>" <?php if($drap !== false) : ?>data-cursor-drap="<?php echo esc_html('DRAG', 'nexros'); ?>"<?php endif; ?> data-wow-delay="<?php echo esc_attr($settings['pxl_animate_delay']); ?>ms">
        <div class="pxl-carousel-inner">

            <div <?php pxl_print_html($widget->get_render_attribute_string( 'carousel' )); ?>>
                <div class="pxl-swiper-wrapper">
                    <?php foreach ($settings['image'] as $key => $value):
                        $image = isset($value['image']) ? $value['image'] : '';
                        $img_size = isset($value['img_size']) ? $value['img_size'] : '';
                        ?>
                        <div class="pxl-swiper-slide">
                            <div class="pxl-item--inner">
                                <?php if(!empty($image['id'])) { 
                                    $img_classes = 'no-lazyload';
                                    if ($effect === 'gl') {
                                        $img_classes .= ' swiper-gl-image';
                                    }

                                    $img = pxl_get_image_by_size(array(
                                        'attach_id'  => $image['id'],
                                        'thumb_size' => $image_size,
                                        'class'      => $img_classes,
                                    ));
                                    $thumbnail = $img['thumbnail'];
                                    $thumbnail_url = $img['url'];
                                    ?>
                                    <?php if ($settings['style_img'] == 'image') { ?>
                                        <div class="pxl-item--image ">
                                            <?php echo wp_kses_post($thumbnail); ?>
                                            <?php if ($settings['style'] == 'style-2'): ?>
                                                <a href="<?php echo esc_url($thumbnail_url); ?>" class="lightbox" data-elementor-lightbox-slideshow="pxl-gallery-<?php echo esc_attr($pxl_g_id); ?>"></a>
                                            <?php endif ?>
                                        </div>
                                    <?php } ?>
                                    <?php if ($settings['style_img'] == 'bgr') { ?>
                                        <div class="pxl-item--image " <?php if ($effect == 'slide') { ?> style="background-image: url(<?php echo esc_attr($thumbnail_url); ?>);" <?php } ?>>
                                            <?php echo wp_kses_post($thumbnail); ?>
                                            <?php if ($settings['style'] == 'style-2'): ?>
                                                <a href="<?php echo esc_url($thumbnail_url); ?>" class="lightbox" data-elementor-lightbox-slideshow="pxl-gallery-<?php echo esc_attr($pxl_g_id); ?>"></a>
                                            <?php endif ?>
                                        </div>
                                    <?php } ?>
                                    
                                <?php } ?>
                            </div>
                        </div>
                    <?php endforeach; ?>
                </div>
            </div>

        </div>
        <?php if($pagination !== false || $arrows !== false): ?>
            <div class="pxl-swiper-bottom pxl-flex-middle">
                <?php if($pagination !== false): ?>
                    <div class="pxl-swiper-dots style-1"></div>
                <?php endif; ?>
                <?php if($arrows !== false): ?>
                    <div class="pxl-swiper-arrow-wrap style-1">
                        <div class="pxl-swiper-arrow pxl-swiper-arrow-prev"><svg xmlns="http://www.w3.org/2000/svg" width="6" height="10" viewBox="0 0 6 10" fill="none">
                          <path d="M5.00118 9.64679C4.91344 9.6473 4.82647 9.63048 4.74524 9.5973C4.66402 9.56413 4.59014 9.51524 4.52785 9.45345L0.527846 5.45345C0.403679 5.32855 0.333984 5.15958 0.333984 4.98345C0.333984 4.80733 0.403679 4.63836 0.527846 4.51345L4.52785 0.513454C4.65538 0.404237 4.81943 0.347166 4.98722 0.353647C5.155 0.360127 5.31416 0.429682 5.43289 0.548412C5.55162 0.667141 5.62117 0.826301 5.62765 0.994085C5.63413 1.16187 5.57706 1.32592 5.46785 1.45345L1.94118 4.98012L5.46785 8.50679C5.56146 8.59964 5.62544 8.71816 5.6517 8.84737C5.67795 8.97657 5.66531 9.11067 5.61536 9.23269C5.56541 9.35471 5.4804 9.45918 5.37107 9.53289C5.26175 9.6066 5.13303 9.64624 5.00118 9.64679Z" fill="black"/>
                      </svg></div>
                      <div class="pxl-swiper-arrow pxl-swiper-arrow-next"><svg xmlns="http://www.w3.org/2000/svg" width="6" height="10" viewBox="0 0 6 10" fill="none">
                          <path d="M0.99882 9.64679C1.08656 9.6473 1.17353 9.63048 1.25476 9.5973C1.33598 9.56413 1.40986 9.51524 1.47215 9.45345L5.47215 5.45345C5.59632 5.32855 5.66602 5.15958 5.66602 4.98345C5.66602 4.80733 5.59632 4.63836 5.47215 4.51345L1.47215 0.513454C1.34462 0.404237 1.18057 0.347166 1.01278 0.353647C0.845001 0.360127 0.685842 0.429682 0.567112 0.548412C0.448382 0.667141 0.378827 0.826301 0.372346 0.994085C0.365865 1.16187 0.422936 1.32592 0.532154 1.45345L4.05882 4.98012L0.532154 8.50679C0.43854 8.59964 0.374559 8.71816 0.348302 8.84737C0.322045 8.97657 0.334692 9.11067 0.384642 9.23269C0.434593 9.35471 0.519603 9.45918 0.628926 9.53289C0.738248 9.6066 0.866972 9.64624 0.99882 9.64679Z" fill="black"/>
                      </svg></div>
                  </div>
              <?php endif; ?>
          </div>
      <?php endif; ?>
      
  </div>
<?php endif; ?>
