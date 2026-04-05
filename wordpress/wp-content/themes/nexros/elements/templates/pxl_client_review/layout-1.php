<div class="pxl-client-review pxl-client-review1 <?php echo esc_attr($settings['pxl_animate']); ?> <?php echo esc_attr( $settings['style']) ?>" data-wow-delay="<?php echo esc_attr($settings['pxl_animate_delay']); ?>ms">
    <div class="pxl-item--inner">
        <div class="pxl-item--images el-empty">
            <?php foreach ($settings['images'] as $key => $value): 
                $img = pxl_get_image_by_size( array(
                    'attach_id'  => $value['id'],
                    'thumb_size' => '90x90',
                ));
                $thumbnail = $img['thumbnail'];
                ?>
                <div class="pxl-item--img">
                    <?php echo wp_kses_post($thumbnail); ?>
                </div>
            <?php endforeach; ?>
            <?php if( $settings['show_star'] == 'true' ) : ?>
                <?php
                $rating = floatval($settings['star']);
                $startColor = '#6C63FF';
                $endColor = '#2AFADF';

                $offsetStart = max(0, min(100, round((1 - $rating / 5) * 100)));
                ?>

                <div class="pxl-item--rating">
                    <span><?php echo esc_html($rating); ?></span>
                    <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                            <linearGradient id="star-gradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="<?php echo esc_attr($offsetStart); ?>%" stop-color="<?php echo esc_attr($startColor); ?>"/>
                                    <stop offset="100%" stop-color="<?php echo esc_attr($endColor); ?>"/>
                                    </linearGradient>
                                </defs>
                                <path fill="url(#star-gradient)" d="M12 2l2.9 6.9L22 9.3l-5.5 4.9L18.2 22 12 18.2 5.8 22l1.7-7.8L2 9.3l7.1-0.4L12 2z"/>
                            </svg>
                        </div>
                    <?php endif; ?>

                </div>
                <div class="pxl-item--meta pxl-pr-20 pxl-pl-30">
                    <div class="pxl-item--title"><?php echo pxl_print_html($settings['title']); ?></div>
                </div>
            </div>
        </div>