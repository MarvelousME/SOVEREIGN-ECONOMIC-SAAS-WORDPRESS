<?php if(!empty($settings['percentage_value'])) : 
    $main_color = nexros()->get_opt('primary_color', '#2723E0');
    ?>
    <div class="pxl-pie-chart pxl-pie-chart1 <?php echo esc_attr($settings['pxl_animate']); ?>" data-wow-delay="<?php echo esc_attr($settings['pxl_animate_delay']); ?>ms">
        <div class="wrap-chart">
            <div class="pxl-item--value pxl-percentage" style="min-height: <?php echo esc_attr($settings['chart_size']['size']); ?>px;" data-size="<?php echo esc_attr($settings['chart_size']['size']); ?>" data-bar-color-from="<?php if(!empty($settings['bar_color'])) { echo esc_attr($settings['bar_color']); } else { echo esc_attr($main_color); } ?>" data-bar-color-to="<?php if(!empty($settings['bar_color_to'])) { echo esc_attr($settings['bar_color_to']); } else { echo esc_attr($main_color); } ?>" data-track-color="<?php if(!empty($settings['track_color'])) { echo esc_attr($settings['track_color']); } else { echo '#e4eaee'; } ?>" data-line-width="<?php echo esc_attr($settings['chart_line_width']['size']); ?>" data-line-cap="<?php echo esc_attr($settings['chart_line_cap']); ?>" data-percent="-<?php echo esc_attr($settings['percentage_value']); ?>"></div>
            <div class="pxl-item--holder">
                <?php if(!empty($settings['counter_number'])) : ?>
                    <div class="pxl--counter-number">
                        <span class="pxl-counter--value" data-duration="2000" data-to-value="<?php echo esc_attr($settings['counter_number']); ?>" data-delimiter="">1</span>
                        <span class="pxl--counter-suffix"><?php echo pxl_print_html($settings['counter_suffix']); ?></span>
                    </div>
                <?php endif; ?>
            </div>
        </div>
        <div class="wrap-content">
            <div class="pxl-item-title"><span><?php echo pxl_print_html($settings['title']); ?></span></div>
            <div class="pxl-item-description"><span><?php echo pxl_print_html($settings['desc']); ?></span></div>
        </div>
    </div>
    <?php endif; ?>