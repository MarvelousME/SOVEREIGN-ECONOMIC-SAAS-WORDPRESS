<div class="pxl-client-review pxl-client-review2 <?php echo esc_attr($settings['pxl_animate']); ?>" data-wow-delay="<?php echo esc_attr($settings['pxl_animate_delay']); ?>ms">
    <div class="pxl-item--inner">
        <?php if( $settings['show_star'] == 'true' ) : ?>
            <div class="pxl-item--rating">
                <?php
                $rating = $settings['star'];
                $fullStars = floor($rating);
                $halfStar = ($rating - $fullStars) > 0 ? true : false;
                $emptyStars = 5 - $fullStars - ($halfStar ? 1 : 0);
                for ($i = 0; $i < $fullStars; $i++) {
                    echo '<span class="pxl-item--star"><i class="fas fa-star"></i></span>';
                }
                if ($halfStar) {
                    echo '<span class="pxl-item--star"><i class="fas fa-star-half"></i></span>';
                }
                for ($i = 0; $i < $emptyStars; $i++) {
                    echo '<span class="pxl-item--star"><i class="fas fa-star empty"></i></span>';
                }
                ?>
                <span><?php echo esc_html($settings['star']); ?></span>
                <span class="pxl-text"><?php echo esc_html($settings['rating_text']); ?></span>
            </div>
            <span class="pxl-content"><?php echo esc_html($settings['rating_content']); ?></span>
        <?php endif; ?>
    </div>
</div>