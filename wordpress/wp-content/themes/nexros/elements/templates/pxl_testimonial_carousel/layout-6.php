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
    <div class="pxl-swiper-slider pxl-testimonial-carousel pxl-testimonial-carousel6 <?php echo esc_attr($settings['style']); ?>" <?php if($drap !== false) : ?>data-cursor-drap="<?php echo esc_html('DRAG', 'nexros'); ?>"<?php endif; ?>>
    <div <?php pxl_print_html($widget->get_render_attribute_string( 'carousel' )); ?>>
        <div class="pxl-swiper-wrapper">
            <?php foreach ($settings['testimonial'] as $key => $value):
                $title = isset($value['title']) ? $value['title'] : '';
                $video_link = isset($value['video_link']) ? $value['video_link'] : '';
                $position = isset($value['position']) ? $value['position'] : '';
                $desc = isset($value['desc']) ? $value['desc'] : '';
                $avatar = isset($value['avatar']) ? $value['avatar'] : '';
                $image = isset($value['avatar']) ? $value['avatar'] : '';
                $star = isset($value['star']) ? $value['star'] : '';

                ?>
                <div class="pxl-swiper-slide">
                    <div class="pxl-item--inner <?php echo esc_attr($settings['pxl_animate']); ?>" data-wow-delay="<?php echo esc_attr($settings['pxl_animate_delay']); ?>ms">
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
                  <?php if(!empty($image['id'])) { 
                        $img1 = pxl_get_image_by_size( array(
                            'attach_id'  => $image['id'],
                            'thumb_size' => 'full',
                            'class' => 'no-lazyload',
                        ));
                        $thumbnail1 = $img1['thumbnail'];?>
                        <div class="pxl-item--image ">
                            <?php echo wp_kses_post($thumbnail1); ?>
                        </div>
                    <?php } ?>
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
                    <?php endif; ?>
                    <?php if ($settings['style']!=''): ?>
                     <svg xmlns="http://www.w3.org/2000/svg" width="24" height="19" viewBox="0 0 24 19" fill="none">
                      <path d="M9.6 19L11.28 17.3375L4.56 10.6875H24V8.3125H4.56L11.28 1.6625L9.6 0L0 9.5L9.6 19Z" fill="#252525"/>
                  </svg>
              <?php endif; ?>
          </div>
          <div class="pxl-swiper-arrow pxl-swiper-arrow-next">
            <?php if ($settings['style']==''): ?>
             <i class="bootstrap-icons bi-arrow-right"></i> 
         <?php endif; ?>
         <?php if ($settings['style']!=''): ?>
             <svg xmlns="http://www.w3.org/2000/svg" width="24" height="19" viewBox="0 0 24 19" fill="none">
              <path d="M14.4 0L12.72 1.6625L19.44 8.3125H0V10.6875H19.44L12.72 17.3375L14.4 19L24 9.5L14.4 0Z" fill="#252525"/>
          </svg>
      <?php endif; ?>
  </div>
</div>
<?php endif; ?>
<?php endif; ?>
<?php endif; ?>
