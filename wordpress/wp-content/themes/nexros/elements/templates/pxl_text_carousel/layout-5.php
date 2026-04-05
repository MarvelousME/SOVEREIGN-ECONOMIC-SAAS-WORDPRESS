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
    'slides_to_show'                => $col_xl === 'auto' ? 'auto' : (int)$col_xl,
    'slides_to_show_xxl'            => $col_xxl === 'auto' ? 'auto' : (int)$col_xxl, 
    'slides_to_show_lg'             => $col_lg === 'auto' ? 'auto' : (int)$col_lg, 
    'slides_to_show_md'             => $col_md === 'auto' ? 'auto' : (int)$col_md, 
    'slides_to_show_sm'             => $col_sm === 'auto' ? 'auto' : (int)$col_sm, 
    'slides_to_show_xs'             => $col_xs === 'auto' ? 'auto' : (int)$col_xs, 
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
if(isset($settings['text3']) && !empty($settings['text3']) && count($settings['text3'])): ?>
    <div class="pxl-swiper-slider pxl-text-carousel pxl-text-carousel5 <?php echo esc_attr($settings['style5']); ?>" <?php if($drap !== false) : ?>data-cursor-drap="<?php echo esc_html('DRAG', 'nexros'); ?>"<?php endif; ?>>
        <div class="pxl-carousel-inner">
            <div <?php pxl_print_html($widget->get_render_attribute_string( 'carousel' )); ?>>
                <div class="pxl-swiper-wrapper">
                    <?php foreach ($settings['text3'] as $key => $value):
                        $icon_key = $widget->get_repeater_setting_key( 'icon3', 'text3', $key );
                        $widget->add_render_attribute( $icon_key, [
                            'class' => $value['icon3'],
                            'aria-hidden' => 'true',
                        ] );
                        $link_key = $widget->get_repeater_setting_key( 'link3', 'value', $key );
                        $title3 = isset($value['title3']) ? $value['title3'] : '';
                        $link3 = isset($value['link3']) ? $value['link3'] : '';
                        if ( ! empty( $value['link3']['url'] ) ) {
                            $widget->add_render_attribute( $link_key, 'href', $value['link3']['url'] );

                            if ( $value['link3']['is_external'] ) {
                                $widget->add_render_attribute( $link_key, 'target', '_blank' );
                            }

                            if ( $value['link3']['nofollow'] ) {
                                $widget->add_render_attribute( $link_key, 'rel', 'nofollow' );
                            }
                        }
                        $link_attributes = $widget->get_render_attribute_string( $link_key );
                        ?>
                        <div class="pxl-swiper-slide">
                            <div class="pxl-item--inner <?php echo esc_attr($settings['pxl_animate']); ?>" data-wow-delay="<?php echo esc_attr($settings['pxl_animate_delay']); ?>ms">
                                <?php if(!empty($link3['url'])): ?>
                                    <a <?php echo implode( ' ', [ $link_attributes ] ); ?>></a>
                                <?php endif; ?>
                                <?php if(!empty($value['icon3'])){
                                    \Elementor\Icons_Manager::render_icon( $value['icon3'], [ 'aria-hidden' => 'true' ], 'i' );
                                } ?>
                                <h5 class="pxl-item--title el-empty"><?php echo pxl_print_html($title3); ?></h5>
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
                    <div class="pxl-wrap-arrow pxl-flex-middle">
                        <div class="pxl-swiper-arrow pxl-swiper-arrow-prev" style="transform: translateY(-50%) scalex(-1);"><svg xmlns="http://www.w3.org/2000/svg" width="7" height="10" viewBox="0 0 7 10" fill="none"><path d="M1.49882 9.64679C1.58656 9.64729 1.67353 9.63048 1.75476 9.5973C1.83598 9.56413 1.90986 9.51524 1.97215 9.45345L5.97215 5.45345C6.09632 5.32855 6.16602 5.15958 6.16602 4.98345C6.16602 4.80733 6.09632 4.63836 5.97215 4.51345L1.97215 0.513454C1.84462 0.404237 1.68057 0.347166 1.51278 0.353647C1.345 0.360127 1.18584 0.429682 1.06711 0.548412C0.948382 0.667141 0.878827 0.826301 0.872346 0.994085C0.865865 1.16187 0.922936 1.32592 1.03215 1.45345L4.55882 4.98012L1.03215 8.50679C0.93854 8.59964 0.874559 8.71816 0.848302 8.84737C0.822045 8.97657 0.834692 9.11067 0.884642 9.23269C0.934593 9.35471 1.0196 9.45918 1.12893 9.53289C1.23825 9.6066 1.36697 9.64624 1.49882 9.64679Z" fill="white"/>
                        </svg></div>
                        <div class="pxl-swiper-arrow pxl-swiper-arrow-next"><svg xmlns="http://www.w3.org/2000/svg" width="7" height="10" viewBox="0 0 7 10" fill="none">
                          <path d="M1.49882 9.64679C1.58656 9.64729 1.67353 9.63048 1.75476 9.5973C1.83598 9.56413 1.90986 9.51524 1.97215 9.45345L5.97215 5.45345C6.09632 5.32855 6.16602 5.15958 6.16602 4.98345C6.16602 4.80733 6.09632 4.63836 5.97215 4.51345L1.97215 0.513454C1.84462 0.404237 1.68057 0.347166 1.51278 0.353647C1.345 0.360127 1.18584 0.429682 1.06711 0.548412C0.948382 0.667141 0.878827 0.826301 0.872346 0.994085C0.865865 1.16187 0.922936 1.32592 1.03215 1.45345L4.55882 4.98012L1.03215 8.50679C0.93854 8.59964 0.874559 8.71816 0.848302 8.84737C0.822045 8.97657 0.834692 9.11067 0.884642 9.23269C0.934593 9.35471 1.0196 9.45918 1.12893 9.53289C1.23825 9.6066 1.36697 9.64624 1.49882 9.64679Z" fill="white"/>
                      </svg></div>
                  </div>
              <?php endif; ?>
          </div>
      <?php endif; ?>
  </div>
<?php endif; ?>
