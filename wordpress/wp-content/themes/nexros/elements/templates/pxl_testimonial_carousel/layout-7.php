<?php
$col_xs  = $widget->get_setting('col_xs', '');
$col_sm  = $widget->get_setting('col_sm', '');
$col_md  = $widget->get_setting('col_md', '');
$col_lg  = $widget->get_setting('col_lg', '');
$col_xl  = $widget->get_setting('col_xl', '');
$col_xxl = $widget->get_setting('col_xxl', '');

if ($col_xxl == 'inherit') {
    $col_xxl = $col_xl;
}

$slides_to_scroll = $widget->get_setting('slides_to_scroll');
$arrows           = $widget->get_setting('arrows', false);
$pagination       = $widget->get_setting('pagination', false);
$pagination_type  = $widget->get_setting('pagination_type', 'bullets');
$arrows_type      = $widget->get_setting('arrows_type', '');
$pause_on_hover   = $widget->get_setting('pause_on_hover', false);
$autoplay         = $widget->get_setting('autoplay', false);
$autoplay_speed   = $widget->get_setting('autoplay_speed', '5000');
$infinite         = $widget->get_setting('infinite', false);
$speed            = $widget->get_setting('speed', '500');
$drap             = $widget->get_setting('drap', false);

$opts = [
    'slide_direction'      => 'vertical',
    'slide_percolumn'      => 1,
    'slide_mode'           => 'cards',
    'center_slide'         => false,
    'slides_to_show'       => (int) $col_xl,
    'slides_to_show_xxl'   => (int) $col_xxl,
    'slides_to_show_lg'    => (int) $col_lg,
    'slides_to_show_md'    => (int) $col_md,
    'slides_to_show_sm'    => (int) $col_sm,
    'slides_to_show_xs'    => (int) $col_xs,
    'slides_to_scroll'     => (int) $slides_to_scroll,
    'arrow'                => (bool) $arrows,
    'pagination'           => (bool) $pagination,
    'pagination_type'      => $pagination_type,
    'autoplay'             => (bool) $autoplay,
    'pause_on_hover'       => (bool) $pause_on_hover,
    'pause_on_interaction' => true,
    'delay'                => (int) $autoplay_speed,
    'loop'                 => (bool) $infinite,
    'speed'                => (int) $speed,
];

$widget->add_render_attribute('carousel', [
    'class'         => 'pxl-swiper-container',
    'dir'           => is_rtl() ? 'rtl' : 'ltr',
    'data-settings' => wp_json_encode($opts),
]);

if (isset($settings['testimonial']) && !empty($settings['testimonial']) && count($settings['testimonial'])): ?>
    <div class="pxl-swiper-slider pxl-testimonial-carousel pxl-testimonial-carousel7 <?php echo esc_attr($settings['style']); ?>" 
         <?php if ($drap !== false): ?> data-cursor-drag="DRAG"<?php endif; ?>>

        <?php if (!empty($settings['show_overlay'])): ?>
            <div class="pxl-overlay"></div>
        <?php endif; ?>

        <div class="pxl-carousel-inner">
            <div <?php pxl_print_html($widget->get_render_attribute_string('carousel')); ?>>
                <div class="pxl-swiper-wrapper">
                    <?php foreach ($settings['testimonial'] as $key => $value):
                        $title    = !empty($value['title']) ? $value['title'] : '';
                        $position = !empty($value['position']) ? $value['position'] : '';
                        $avatar   = !empty($value['avatar']) ? $value['avatar'] : '';
                        $image    = !empty($value['image']) ? $value['image'] : '';
                        $desc     = !empty($value['desc']) ? $value['desc'] : '';
                        $star     = !empty($value['star']) ? (int) $value['star'] : 0;
                        ?>
                        <div class="pxl-swiper-slide">
                            <div class="pxl-item--inner <?php echo esc_attr($settings['pxl_animate']); ?>" 
                                 data-wow-delay="<?php echo esc_attr($settings['pxl_animate_delay']); ?>ms">
                                
                                <div class="pxl-item--star pxl-item--<?php echo esc_attr($star); ?>">
                                    <?php for ($i = 0; $i < $star; $i++): ?>
                                        <svg width="20" viewBox="0 0 53.867 53.867">
                                            <polygon points="26.934,1.318 35.256,18.182 53.867,20.887 
                                            40.4,34.013 43.579,52.549 26.934,43.798 
                                            10.288,52.549 13.467,34.013 0,20.887 18.611,18.182"/>
                                        </svg>
                                    <?php endfor; ?>
                                </div>

                                <div class="pxl-item--desc"><?php echo pxl_print_html($desc); ?></div>

                                <div class="pxl-item--holder pxl-flex-middle">
                                    <?php if (!empty($avatar['id'])):
                                        $img       = pxl_get_image_by_size([
                                            'attach_id'  => $avatar['id'],
                                            'thumb_size' => '48x48',
                                            'class'      => 'no-lazyload',
                                        ]);
                                        $thumbnail = $img['thumbnail']; ?>
                                        <div class="pxl-item--avatar">
                                            <?php echo wp_kses_post($thumbnail); ?>
                                        </div>
                                    <?php endif; ?>

                                    <div class="pxl-item--meta">
                                        <?php if ($title): ?>
                                            <h3 class="pxl-item--title"><?php echo pxl_print_html($title); ?></h3>
                                        <?php endif; ?>
                                        <?php if ($position): ?>
                                            <div class="pxl-item--position"><?php echo pxl_print_html($position); ?></div>
                                        <?php endif; ?>
                                    </div>
                                </div>

                                <?php if (!empty($image['id'])):
                                    $img       = pxl_get_image_by_size([
                                        'attach_id'  => $image['id'],
                                        'thumb_size' => 'full',
                                        'class'      => 'no-lazyload',
                                    ]);
                                    $thumbnail = $img['thumbnail']; ?>
                                    <div class="pxl-item--image">
                                        <?php echo wp_kses_post($thumbnail); ?>
                                    </div>
                                <?php endif; ?>
                            </div>
                        </div> <!-- /.pxl-swiper-slide -->
                    <?php endforeach; ?>
                </div>
            </div>
        </div>
        <?php if ($pagination !== false): ?>
        <div class="pxl-swiper-bottom">
            <div class="pxl-swiper-dots style-3"></div>
        </div>
    <?php endif; ?>

    <?php if ($arrows !== false): ?>
        <div class="pxl-swiper-arrow-wrap pxl-wrap-arrow pxl-flex-middle <?php echo esc_attr($settings['arrows_type']); ?>">
            <div class="pxl-swiper-arrow pxl-swiper-arrow-prev">
                <svg xmlns="http://www.w3.org/2000/svg" width="8" height="11" viewBox="0 0 8 11" fill="none">
                    <path d="M0.667318 5.7207L7.33398 10.7207L7.33398 0.720703L0.667318 5.7207Z" fill="white"/>
                </svg>
            </div>
            <div class="pxl-swiper-arrow pxl-swiper-arrow-next">
                <svg xmlns="http://www.w3.org/2000/svg" width="8" height="11" viewBox="0 0 8 11" fill="none">
                    <path d="M7.33268 5.7207L0.666016 10.7207L0.666016 0.720703L7.33268 5.7207Z" fill="white"/>
                </svg>
            </div>
        </div>
    <?php endif; ?>
    </div>
<?php endif; ?>
