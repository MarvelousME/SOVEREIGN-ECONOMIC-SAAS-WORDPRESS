<?php
if(isset($settings['progressbar1']) && !empty($settings['progressbar1'])): ?>
    <div class="pxl-progressbar pxl-progressbar-2 <?php echo esc_attr($settings['style']); ?>">
        <?php foreach ($settings['progressbar1'] as $key => $progressbar): ?>
            <div class="pxl--item <?php echo esc_attr($settings['pxl_animate']); ?>" data-wow-delay="<?php echo esc_attr($settings['pxl_animate_delay']); ?>ms" data-value="<?php echo esc_attr($progressbar['percent1']['size']); ?>">
                <div class="stat-box"></div>
                <h1 class="label"><?php echo pxl_print_html($progressbar['title1']); ?></h1>
            </div>
        <?php endforeach; ?>
    </div>
    <?php endif; ?>