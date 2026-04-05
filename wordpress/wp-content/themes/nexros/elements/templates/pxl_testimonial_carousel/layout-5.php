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
if ( ! empty( $settings['link']['url'] ) ) {
    $widget->add_render_attribute( 'button', 'href', $settings['link']['url'] );

    if ( $settings['link']['is_external'] ) {
        $widget->add_render_attribute( 'button', 'target', '_blank' );
    }

    if ( $settings['link']['nofollow'] ) {
        $widget->add_render_attribute( 'button', 'rel', 'nofollow' );
    }
}
$slides_to_scroll = $widget->get_setting('slides_to_scroll');
$arrows = $widget->get_setting('arrows', false);  
$pagination = $widget->get_setting('pagination', false);
$pagination_type = $widget->get_setting('pagination_type', 'bullets');
$pause_on_hover = $widget->get_setting('pause_on_hover', false);
$autoplay = $widget->get_setting('autoplay', false);
$autoplay_speed = $widget->get_setting('autoplay_speed', '5000');
$infinite = $widget->get_setting('infinite', false); 
$center = $widget->get_setting('center', true); 
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
    'center_slide'                        => (bool)$center,
    'speed'                         => (int)$speed
];

$opts_thumb = [
    'slide_direction'               => 'horizontal',
    'slides_to_show'                => '5', 
    'slide_mode'                    => 'slide',
    'loop'                          => true,
];

$widget->add_render_attribute( 'thumb', [
    'class'         => 'pxl-swiper-thumbs',
    'data-settings' => wp_json_encode($opts_thumb)
]);

$widget->add_render_attribute( 'carousel', [
    'class'         => 'pxl-swiper-container',
    'dir'           => is_rtl() ? 'rtl' : 'ltr',
    'data-settings' => wp_json_encode($opts)
]);
if(isset($settings['testimonial']) && !empty($settings['testimonial']) && count($settings['testimonial'])): ?>
    <div class="pxl-swiper-slider pxl-testimonial-carousel pxl-testimonial-carousel5 <?php echo esc_attr($settings['style']); ?>" <?php if($drap !== false) : ?>data-cursor-drap="<?php echo esc_html('DRAG', 'nexros'); ?>"<?php endif; ?>>
        <div class="pxl-carousel-inner">
            <?php if(!empty($settings['client_title'])): ?>
            <div class="pxl-client--title"><?php echo esc_html($settings['client_title']); ?> </div>
        <?php endif ?>
        <div <?php pxl_print_html($widget->get_render_attribute_string( 'thumb' )); ?>>
            <div class="pxl-swiper-wrapper">
              <?php foreach ($settings['testimonial'] as $key => $value):
                $image = isset($value['avatar']) ? $value['avatar'] : '';

                ?>
                <div class="pxl-swiper-slide">
                    <?php if(!empty($image['id'])) { 
                        $img1 = pxl_get_image_by_size( array(
                            'attach_id'  => $image['id'],
                            'thumb_size' => '49x49',
                            'class' => 'no-lazyload',
                        ));
                        $thumbnail1 = $img1['thumbnail'];?>
                        <div class="pxl-item--image ">
                            <?php echo wp_kses_post($thumbnail1); ?>
                        </div>
                    <?php } ?>
                </div>
            <?php endforeach; ?>
        </div>
    </div>
    <div <?php pxl_print_html($widget->get_render_attribute_string( 'carousel' )); ?>>
        <div class="pxl-swiper-wrapper">
            <?php foreach ($settings['testimonial'] as $key => $value):
                $title = isset($value['title']) ? $value['title'] : '';
                $video_link = isset($value['video_link']) ? $value['video_link'] : '';
                $position = isset($value['position']) ? $value['position'] : '';
                $desc = isset($value['desc']) ? $value['desc'] : '';
                $avatar = isset($value['avatar']) ? $value['avatar'] : '';
                $image = isset($value['image']) ? $value['image'] : '';
                $star = isset($value['star']) ? $value['star'] : '';

                ?>
                <div class="pxl-swiper-slide">
                    <div class="pxl-item--inner <?php echo esc_attr($settings['pxl_animate']); ?>" data-wow-delay="<?php echo esc_attr($settings['pxl_animate_delay']); ?>ms">
                    <svg xmlns="http://www.w3.org/2000/svg" width="26" height="22" viewBox="0 0 26 22" fill="none">
                    <path d="M11.696 0.940005C11.8352 1.16273 11.9292 1.41069 11.9725 1.66972C12.0159 1.92876 12.0078 2.19381 11.9488 2.44973C11.8897 2.70564 11.7808 2.94742 11.6283 3.16126C11.4758 3.3751 11.2827 3.5568 11.06 3.69601C8.6258 5.2122 6.69202 7.4117 5.5 10.02C6.70377 9.91934 7.9099 10.1844 8.96058 10.7804C10.0113 11.3765 10.8576 12.2758 11.3888 13.3607C11.9199 14.4456 12.1113 15.6656 11.9378 16.8611C11.7642 18.0565 11.2339 19.1717 10.4162 20.0608C9.59844 20.9499 8.53137 21.5715 7.35458 21.8442C6.17779 22.1169 4.94609 22.0281 3.82062 21.5893C2.69515 21.1506 1.72833 20.3823 1.04665 19.385C0.364966 18.3878 0.000175081 17.208 0 16V15.946C0.00217482 15.7912 0.00884428 15.6364 0.02 15.482C0.038 15.182 0.0740001 14.762 0.144 14.246C0.284 13.22 0.558 11.806 1.112 10.218C2.216 7.03801 4.452 3.10801 8.94 0.304005C9.16272 0.164804 9.41068 0.0708336 9.66972 0.0274602C9.92876 -0.0159133 10.1938 -0.00784047 10.4497 0.0512176C10.7056 0.110276 10.9474 0.219162 11.1613 0.371661C11.3751 0.524159 11.5568 0.717283 11.696 0.940005ZM25.696 0.940005C25.8352 1.16273 25.9292 1.41069 25.9725 1.66972C26.0159 1.92876 26.0078 2.19381 25.9488 2.44973C25.8897 2.70564 25.7808 2.94742 25.6283 3.16126C25.4758 3.3751 25.2827 3.5568 25.06 3.69601C22.6258 5.2122 20.692 7.4117 19.5 10.02C20.7038 9.91934 21.9099 10.1844 22.9606 10.7804C24.0113 11.3765 24.8576 12.2758 25.3888 13.3607C25.9199 14.4456 26.1113 15.6656 25.9378 16.8611C25.7642 18.0565 25.2339 19.1717 24.4162 20.0608C23.5984 20.9499 22.5314 21.5715 21.3546 21.8442C20.1778 22.1169 18.9461 22.0281 17.8206 21.5893C16.6951 21.1506 15.7283 20.3823 15.0466 19.385C14.365 18.3878 14.0002 17.208 14 16V15.946C14.0022 15.7912 14.0088 15.6364 14.02 15.482C14.038 15.182 14.074 14.762 14.144 14.246C14.284 13.22 14.558 11.806 15.112 10.218C16.216 7.03801 18.452 3.10801 22.94 0.304005C23.1627 0.164804 23.4107 0.0708336 23.6697 0.0274602C23.9288 -0.0159133 24.1938 -0.00784047 24.4497 0.0512176C24.7056 0.110276 24.9474 0.219162 25.1613 0.371661C25.3751 0.524159 25.5568 0.717283 25.696 0.940005Z" fill="white"/>
                    </svg>
                      <div class="pxl-item--star pxl-item--<?php echo esc_attr($star); ?>">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 15 14" fill="none">
                          <path d="M7.49998 0L9.55801 4.95914L15 5.34753L10.83 8.80085L12.1352 14L7.49998 11.1752L2.86474 14L4.16999 8.80085L0 5.34753L5.44193 4.95914L7.49998 0Z" fill="#FF6F00"/>
                      </svg>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 15 14" fill="none">
                          <path d="M7.49998 0L9.55801 4.95914L15 5.34753L10.83 8.80085L12.1352 14L7.49998 11.1752L2.86474 14L4.16999 8.80085L0 5.34753L5.44193 4.95914L7.49998 0Z" fill="#FF6F00"/>
                      </svg>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 15 14" fill="none">
                          <path d="M7.49998 0L9.55801 4.95914L15 5.34753L10.83 8.80085L12.1352 14L7.49998 11.1752L2.86474 14L4.16999 8.80085L0 5.34753L5.44193 4.95914L7.49998 0Z" fill="#FF6F00"/>
                      </svg>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 15 14" fill="none">
                          <path d="M7.49998 0L9.55801 4.95914L15 5.34753L10.83 8.80085L12.1352 14L7.49998 11.1752L2.86474 14L4.16999 8.80085L0 5.34753L5.44193 4.95914L7.49998 0Z" fill="#FF6F00"/>
                      </svg>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 15 14" fill="none">
                          <path d="M7.49998 0L9.55801 4.95914L15 5.34753L10.83 8.80085L12.1352 14L7.49998 11.1752L2.86474 14L4.16999 8.80085L0 5.34753L5.44193 4.95914L7.49998 0Z" fill="#FF6F00"/>
                      </svg>
                  </div>
                  <div class="pxl-item--desc el-empty"><?php echo pxl_print_html($desc); ?></div>
                  <div class="pxl-item--holder pxl-flex-middle">
                    <div class="pxl-item--meta">
                        <h3 class="pxl-item--title el-empty"><?php echo pxl_print_html($title); ?></h3>
                        <div class="pxl-item--position el-empty"><?php echo pxl_print_html($position); ?></div>
                    </div>
                </div>
            </div>
        </div>
    <?php endforeach; ?>
</div>
</div>
</div>
<?php if($pagination !== false || $arrows !== false): ?>
    <div class="pxl-swiper-bottom ">
        <?php if($pagination !== false): ?>
            <div class="pxl-swiper-dots style-1"></div>
        <?php endif; ?>
        <?php if($arrows !== false): ?>
            <div class="pxl-wrap-arrow pxl-flex-middle">
                <div class="pxl-swiper-arrow pxl-swiper-arrow-prev">
                    <?php if ($settings['style']==''): ?>
                        <i class="bootstrap-icons bi-arrow-left"></i> 
                    <?php endif ?>
                    <?php if ($settings['style']!=''): ?>
                     <svg xmlns="http://www.w3.org/2000/svg" width="24" height="19" viewBox="0 0 24 19" fill="none">
                      <path d="M9.6 19L11.28 17.3375L4.56 10.6875H24V8.3125H4.56L11.28 1.6625L9.6 0L0 9.5L9.6 19Z" fill="#252525"/>
                  </svg>
              <?php endif ?>
          </div>
          <div class="pxl-swiper-arrow pxl-swiper-arrow-next">
            <?php if ($settings['style']==''): ?>
             <i class="bootstrap-icons bi-arrow-right"></i> 
         <?php endif ?>
         <?php if ($settings['style']!=''): ?>
             <svg xmlns="http://www.w3.org/2000/svg" width="24" height="19" viewBox="0 0 24 19" fill="none">
              <path d="M14.4 0L12.72 1.6625L19.44 8.3125H0V10.6875H19.44L12.72 17.3375L14.4 19L24 9.5L14.4 0Z" fill="#252525"/>
          </svg>
      <?php endif ?>
  </div>
</div>
<?php endif; ?>
</div>
<?php endif; ?>

</div>
<?php endif; ?>
