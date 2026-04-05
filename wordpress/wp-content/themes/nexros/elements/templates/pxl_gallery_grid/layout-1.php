<?php if(isset($settings['gallery']) && !empty($settings['gallery']) && count($settings['gallery'])):
    $col_xl = $widget->get_setting('col_xl', '3');

    $col_xl = 12 / intval($col_xl);
    $pxl_g_id = uniqid();
    $grid_sizer = "col-{$col_xl}";
    $item_class = "pxl-grid-item col-{$col_xl}";
    $image_size_popup = !empty($settings['img_size_popup']) ? $settings['img_size_popup'] : '1200x800'; ?>
    <div id="pxl-gallery-<?php echo esc_attr($pxl_g_id); ?>" class="pxl-grid pxl-gallery-grid pxl-gallery-grid1" data-gutter="15">
        <div class="pxl-grid-inner pxl-grid-masonry row">
            <?php foreach ($settings['gallery'] as $key => $value):
                $img = isset($value['img']) ? $value['img'] : '';

                $img_thumb = pxl_get_image_by_size( array(
                    'attach_id'  => $img['id'],
                    'thumb_size' => 'full',
                    'class' => 'no-lazyload',
                ));
                $thumbnail = $img_thumb['thumbnail']; 

                $img_popup = pxl_get_image_by_size( array(
                    'attach_id'  => $img['id'],
                    'thumb_size' => $image_size_popup,
                    'class' => 'no-lazyload',
                ));
                $thumbnail_popup = $img_popup['url'];?>
                <div class="<?php echo esc_attr($item_class); ?> elementor-repeater-item-<?php echo esc_attr($value['_id']); ?>">
                    <div class="pxl-item--inner">
                        <div class="pxl-item--image">
                            <a href="<?php echo esc_url($thumbnail_popup); ?>" data-elementor-lightbox-slideshow="pxl-gallery-<?php echo esc_attr($pxl_g_id); ?>"><?php echo wp_kses_post($thumbnail); ?></a>
                        </div>
                   </div>
                </div>
            <?php endforeach; ?>
        </div>
    </div>
<?php endif; ?>
