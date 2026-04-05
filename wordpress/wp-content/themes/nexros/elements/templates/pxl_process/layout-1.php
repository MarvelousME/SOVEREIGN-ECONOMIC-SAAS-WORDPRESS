<div class="pxl-process pxl-process1 <?php echo esc_attr($settings['pxl_animate']); ?> <?php echo esc_attr($settings['pxl_animate']); ?>" data-wow-delay="<?php echo esc_attr($settings['pxl_animate_delay']); ?>ms">
    <div class="pxl-process-wrapper">
        <?php foreach ($settings['process'] as $key => $value):
            $title = isset($value['title']) ? $value['title'] : ''; 
            $desc = isset($value['desc']) ? $value['desc'] : ''; 
            $step = isset($value['step']) ? $value['step'] : ''; 
            ?>
            
            <div class="pxl-item--inner ">
                <div class="pxl-item--step">
                    <?php echo pxl_print_html($step); ?>
                </div>
                <<?php echo esc_attr($settings['title_tag']); ?> class="pxl-item--title el-empty">
                <?php echo pxl_print_html($title); ?>
                </<?php echo esc_attr($settings['title_tag']); ?>>
                <div class="pxl-item--description el-empty">
                    <?php echo pxl_print_html($desc); ?>
                </div>
            </div>
        <?php endforeach; ?>
    </div>
</div>
