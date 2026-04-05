<div class="pxl-process pxl-process2 <?php echo esc_attr($settings['pxl_animate']); ?> <?php echo esc_attr($settings['pxl_animate']); ?>" data-wow-delay="<?php echo esc_attr($settings['pxl_animate_delay']); ?>ms">
    <div class="pxl-process-wrapper">
        <?php foreach ($settings['process2'] as $key => $value):
            $img2 = isset($value['img2']) ? $value['img2'] : '';
            $title2 = isset($value['title2']) ? $value['title2'] : '';
            $desc2 = isset($value['desc2']) ? $value['desc2'] : '';
            $step2 = isset($value['step2']) ? $value['step2'] : '';
            ?>
            
            <div class="pxl-item--inner <?php echo esc_attr($key % 2 == 0 ? 'pxl-item--left' : 'pxl-item--right'); ?>">
                <div class="pxl-item--step">
                    <?php echo pxl_print_html($step2); ?>
                </div>
                <div class="pxl-item--line"></div>
                <div class="pxl-item--content">
                <<?php echo esc_attr($settings['title_tag']); ?> class="pxl-item--title el-empty">
                <?php echo pxl_print_html($title2); ?>
                </<?php echo esc_attr($settings['title_tag']); ?>>
                <?php if(!empty($img2['id'])) { 
                    $img = pxl_get_image_by_size( array(
                        'attach_id'  => $img2['id'],
                        'thumb_size' => 'full',
                        'class' => 'no-lazyload',
                    ));
                    $thumbnail = $img['thumbnail'];
                    ?>
                    <div class="pxl-item--image">
                            <?php echo wp_kses_post($thumbnail); ?>
                    </div>
                <?php } ?>
                <div class="pxl-item--description el-empty">
                        <?php echo pxl_print_html($desc2); ?>
                    </div>
                </div>
            </div>
        <?php endforeach; ?>
    </div>
</div>
