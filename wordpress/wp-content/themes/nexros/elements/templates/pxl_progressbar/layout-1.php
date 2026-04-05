<?php
if(isset($settings['progressbar']) && !empty($settings['progressbar'])): ?>
    <div class="pxl-progressbar pxl-progressbar-1 <?php echo esc_attr($settings['style']); ?>">
        <?php foreach ($settings['progressbar'] as $key => $progressbar): ?>
            <div class="pxl--item <?php echo esc_attr($settings['pxl_animate']); ?>" data-wow-delay="<?php echo esc_attr($settings['pxl_animate_delay']); ?>ms">
                <div class="pxl--meta pxl-flex-middle">
                    <h5 class="pxl--title pxl-flex-grow el-empty pxl-mr-20"><?php echo pxl_print_html($progressbar['title']); ?></h5>
                    <?php if ($settings['style'] == 'style-1'){ ?>
                            <div class="pxl--percentage"><?php echo pxl_print_html($progressbar['percent']['size']); ?>%</div>
                        <?php } ?>
                        <?php if ($settings['style'] == 'style-3'){ ?>
                            <div class="pxl--number"><?php echo esc_html($progressbar['number']); ?></div>
                        <?php } ?>
                </div>
                <div class="pxl-progressbar--wrap">
                    <div class="pxl--progressbar" role="progressbar" data-valuetransitiongoal="<?php echo esc_attr($progressbar['percent']['size']); ?>">
                        <?php if ($settings['style'] == 'style-2'){ ?>
                            <div class="pxl--percentage"><?php echo pxl_print_html($progressbar['percent']['size']); ?>%</div>
                        <?php } ?>
                    </div>
                </div>
            </div>
        <?php endforeach; ?>
    </div>
<?php endif; ?>