<div class="pxl-history">
    <div class="line"></div>
    <?php
    if(isset($settings['history']) && !empty($settings['history']) && count($settings['history'])): ?>
        <div class=" pxl-history-l1 " data-wow-delay="<?php echo esc_attr($settings['pxl_animate_delay']); ?>ms">
            <?php
            foreach ($settings['history'] as $key => $history):
                $image = isset($history['image']) ? $history['image'] : '';
                $text = isset($history['text']) ? $history['text'] : '';
                $decs = isset($history['decs']) ? $history['decs'] : '';
                $img_size = isset($history['img_size']) ? $history['img_size'] : 'full';
                ?>
                <div class="entry-body pxl-item--flexnw <?php echo esc_attr($settings['pxl_animate']); ?>">
                    <?php if(!empty($image['id'])) { 
                        $img = pxl_get_image_by_size( array(
                            'attach_id'  => $image['id'],
                            'thumb_size' => $img_size,
                            'class' => 'no-lazyload',
                        ));
                        $thumbnail = $img['thumbnail'];?>
                        <div class="pxl-item--image wow fadeInUp" >
                            <?php echo wp_kses_post($thumbnail); ?>
                        </div>
                    <?php } ?>
                    <div class="wrap-center pxl-text-center">
                        <div class="date pxl-flex-center">
                            <?php echo pxl_print_html($history['date']); ?>
                        </div>
                    </div>
                    <div class="wrap-content ">
                        <h3 class="title wow fadeInUp"><?php echo pxl_print_html($history['text']); ?></h3>
                        <p class="desc wow fadeInUp"><?php echo pxl_print_html($history['decs']); ?></p>
                    </a>
                </div>
            </div>
        <?php endforeach; ?>
    </div>
<?php endif; ?>

</div>
