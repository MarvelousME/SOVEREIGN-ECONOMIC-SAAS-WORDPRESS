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
$arrows_type = $widget->get_setting('arrows_type', '');
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
    'center_slide'                  => false, 
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
if(isset($settings['testimonial']) && !empty($settings['testimonial']) && count($settings['testimonial'])): ?>
    <div class="pxl-swiper-slider pxl-testimonial-carousel pxl-testimonial-carousel3 <?php echo esc_attr($settings['style']); ?>" <?php if($drap !== false) : ?>data-cursor-drap="<?php echo esc_html('DRAG', 'nexros'); ?>"<?php endif; ?>>
        <?php if ($settings['show_overlay'] == 'true') { ?>
            <div class="pxl-overlay"></div>
        <?php } ?>
        <div class="pxl-carousel-inner">
            <div <?php pxl_print_html($widget->get_render_attribute_string( 'carousel' )); ?>>
                <div class="pxl-swiper-wrapper">
                    <?php foreach ($settings['testimonial'] as $key => $value):
                        $title = isset($value['title']) ? $value['title'] : '';
                        $position = isset($value['position']) ? $value['position'] : '';
                        $avatar = isset($value['avatar']) ? $value['avatar'] : '';
                        $desc = isset($value['desc']) ? $value['desc'] : '';
                        $image = isset($value['image']) ? $value['image'] : '';
                        $star = isset($value['star']) ? $value['star'] : '';
                        ?>
                        <div class="pxl-swiper-slide">
                            <div class="pxl-item--inner <?php echo esc_attr($settings['pxl_animate']); ?>" data-wow-delay="<?php echo esc_attr($settings['pxl_animate_delay']); ?>ms">
                              <div class="pxl-item--star pxl-item--<?php echo esc_attr($star); ?>">
                                <svg  width="800px" version="1.1" id="Capa_1" viewBox="0 0 53.867 53.867">
                                    <polygon  points="26.934,1.318 35.256,18.182 53.867,20.887 40.4,34.013 43.579,52.549 26.934,43.798 10.288,52.549 13.467,34.013 0,20.887 18.611,18.182 "/>
                                </svg>
                                <svg  width="800px" version="1.1" id="Capa_1" viewBox="0 0 53.867 53.867">
                                    <polygon  points="26.934,1.318 35.256,18.182 53.867,20.887 40.4,34.013 43.579,52.549 26.934,43.798 10.288,52.549 13.467,34.013 0,20.887 18.611,18.182 "/>
                                </svg>
                                <svg  width="800px" version="1.1" id="Capa_1" viewBox="0 0 53.867 53.867">
                                    <polygon  points="26.934,1.318 35.256,18.182 53.867,20.887 40.4,34.013 43.579,52.549 26.934,43.798 10.288,52.549 13.467,34.013 0,20.887 18.611,18.182 "/>
                                </svg>
                                <svg  width="800px" version="1.1" id="Capa_1" viewBox="0 0 53.867 53.867">
                                    <polygon  points="26.934,1.318 35.256,18.182 53.867,20.887 40.4,34.013 43.579,52.549 26.934,43.798 10.288,52.549 13.467,34.013 0,20.887 18.611,18.182 "/>
                                </svg>
                                <svg  width="800px" version="1.1" id="Capa_1" viewBox="0 0 53.867 53.867">
                                    <polygon  points="26.934,1.318 35.256,18.182 53.867,20.887 40.4,34.013 43.579,52.549 26.934,43.798 10.288,52.549 13.467,34.013 0,20.887 18.611,18.182 "/>
                                </svg>
                            </div>
                            <div class="pxl-item--desc"><?php echo pxl_print_html($desc); ?></div>
                            <div class="pxl-item--holder pxl-flex-middle">
                                <?php if(!empty($avatar['id'])) { 
                                    $img = pxl_get_image_by_size( array(
                                        'attach_id'  => $avatar['id'],
                                        'thumb_size' => '68x68',
                                        'class' => 'no-lazyload',
                                    ));
                                    $thumbnail = $img['thumbnail'];?>
                                    <div class="pxl-item--avatar ">
                                        <?php echo wp_kses_post($thumbnail); ?>
                                        <?php if(!empty($image['id'])) { 
                                            $img = pxl_get_image_by_size( array(
                                                'attach_id'  => $image['id'],
                                                'thumb_size' => '20x20',
                                                'class' => 'no-lazyload',
                                            ));
                                            $thumbnail = $img['thumbnail'];?>
                                            <div class="pxl-item--image ">
                                                <?php echo wp_kses_post($thumbnail); ?>
                                            </div>
                                        <?php } ?>
                                    </div>
                                <?php } ?>
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
                <div class="pxl-swiper-dots style-3"></div>
            <?php endif; ?>
        </div>
        <?php if($arrows !== false): ?>
            <div class="pxl-swiper-arrow-wrap pxl-wrap-arrow pxl-flex-middle <?php echo esc_attr($settings['arrows_type']); ?>">
                <div class="pxl-swiper-arrow pxl-swiper-arrow-prev">
                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="16" viewBox="0 0 22 16" fill="none">
                      <path d="M0.292788 8.71929L7.29286 15.7193C7.48146 15.9014 7.73407 16.0022 7.99626 16C8.25846 15.9977 8.50928 15.8925 8.69469 15.7071C8.8801 15.5217 8.98527 15.2709 8.98755 15.0087C8.98983 14.7465 8.88903 14.4939 8.70687 14.3053L3.41382 9.01229L21 9.01229C21.2652 9.01229 21.5196 8.90693 21.7071 8.7194C21.8946 8.53186 22 8.27751 22 8.01229C22 7.74707 21.8946 7.49272 21.7071 7.30518C21.5196 7.11765 21.2652 7.01229 21 7.01229L3.41382 7.01229L8.70687 1.71929C8.80238 1.62704 8.87857 1.5167 8.93098 1.39469C8.98338 1.27269 9.01097 1.14147 9.01213 1.00869C9.01328 0.875911 8.98798 0.744232 8.93769 0.621336C8.88741 0.49844 8.81316 0.386787 8.71927 0.292894C8.62537 0.199001 8.51372 0.124747 8.39082 0.0744665C8.26792 0.0241859 8.13624 -0.0011151 8.00346 3.7877e-05C7.87068 0.00119181 7.73946 0.0287787 7.61746 0.0811879C7.49545 0.133597 7.38511 0.209778 7.29286 0.305288L0.292788 7.30529C0.105315 7.49282 -1.18586e-06 7.74712 -1.20904e-06 8.01229C-1.23222e-06 8.27745 0.105315 8.53176 0.292788 8.71929Z" fill="black"/>
                  </svg>
              </div>
              <div class="pxl-swiper-arrow pxl-swiper-arrow-next">
                <svg style="transform: scalex(-1);" xmlns="http://www.w3.org/2000/svg" width="22" height="16" viewBox="0 0 22 16" fill="none">
                  <path d="M0.292788 8.71929L7.29286 15.7193C7.48146 15.9014 7.73407 16.0022 7.99626 16C8.25846 15.9977 8.50928 15.8925 8.69469 15.7071C8.8801 15.5217 8.98527 15.2709 8.98755 15.0087C8.98983 14.7465 8.88903 14.4939 8.70687 14.3053L3.41382 9.01229L21 9.01229C21.2652 9.01229 21.5196 8.90693 21.7071 8.7194C21.8946 8.53186 22 8.27751 22 8.01229C22 7.74707 21.8946 7.49272 21.7071 7.30518C21.5196 7.11765 21.2652 7.01229 21 7.01229L3.41382 7.01229L8.70687 1.71929C8.80238 1.62704 8.87857 1.5167 8.93098 1.39469C8.98338 1.27269 9.01097 1.14147 9.01213 1.00869C9.01328 0.875911 8.98798 0.744232 8.93769 0.621336C8.88741 0.49844 8.81316 0.386787 8.71927 0.292894C8.62537 0.199001 8.51372 0.124747 8.39082 0.0744665C8.26792 0.0241859 8.13624 -0.0011151 8.00346 3.7877e-05C7.87068 0.00119181 7.73946 0.0287787 7.61746 0.0811879C7.49545 0.133597 7.38511 0.209778 7.29286 0.305288L0.292788 7.30529C0.105315 7.49282 -1.18586e-06 7.74712 -1.20904e-06 8.01229C-1.23222e-06 8.27745 0.105315 8.53176 0.292788 8.71929Z" fill="black"/>
              </svg>
          </div>
      </div> 
  <?php endif; ?>
<?php endif; ?>

</div>
<?php endif; ?>
