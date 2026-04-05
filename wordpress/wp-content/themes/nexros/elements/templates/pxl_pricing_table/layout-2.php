<?php 
    $data_table = $settings['table']; 
    
    // Handle new data format with activeRows
    if (is_array($data_table) && isset($data_table['data'])) {
        $table_data = $data_table['data'];
        $active_rows = isset($data_table['activeRows']) ? $data_table['activeRows'] : [];
    } else {
        $table_data = $data_table;
        $active_rows = [];
    }
    
    $col_xs = $widget->get_setting('col_xs', '');
    $col_sm = $widget->get_setting('col_sm', '');
    $col_md = $widget->get_setting('col_md', '');
    $col_lg = $widget->get_setting('col_lg', '');
    $col_xl = $widget->get_setting('col_xl', '');
    $col_xxl = $widget->get_setting('col_xxl', '');

?>
<div class="pxl-pricing-table pxl-pricing-table__layout-2 <?php if($settings['style']) echo esc_attr('pxl-pricing-table__' . $settings['style']); ?> <?php if($settings['row']) echo esc_attr('pxl-table__title-row'); ?> <?php if($settings['column']) echo esc_attr('pxl-table__title-column'); ?>">
    <?php if($settings['feature_column']) :?>
        <?php foreach($settings['feature_column'] as $feature) :?>
            <div class="pxl-table__feature <?php if($feature['plan_active']) {echo 'active';} ?>">
                <div class="pxl-table__feature-top">
                    <?php if($feature['plan_name']) :?>
                        <div class="pxl-table__feature-title">
                            <?php echo esc_html($feature['plan_name']); ?>
                        </div>
                    <?php endif; ?>
                    <?php if($feature['plan_price']) :?>
                        <div class="pxl-table__feature-price-wrap">
                            <div class="pxl-table__feature-price">
                                <?php echo esc_html($feature['plan_price']); ?>
                            </div>
                            <?php if($feature['period']) :?>
                                <div class="pxl-table__feature-period">
                                    <?php echo esc_html($feature['period']); ?>
                                </div>
                            <?php endif; ?>
                        </div>
                    <?php endif; ?>
                    <?php if($feature['plan_description']) :?>
                        <div class="pxl-table__feature-description">
                            <?php echo esc_html($feature['plan_description']); ?>
                        </div>
                    <?php endif; ?>
                </div>
                <?php if($feature['plan_button_text']) :?>
                    <div class="pxl-table__feature-button">
                        <a class="btn-glossy" href="<?php echo esc_url($feature['plan_button_link']['url']); ?>" <?php if($feature['plan_button_link']['is_external']) echo 'target="_blank"'; ?>>
                            <?php echo esc_html($feature['plan_button_text']); ?>
                        </a>
                    </div>
                <?php endif; ?>
            </div>
        <?php endforeach; ?>
    <?php endif; ?>
    
    <?php 
    // Create the new data structure for renderTable
    $render_data = [
        'data' => $table_data,
        'activeRows' => $active_rows
    ];
    renderTable($render_data, $settings['column'], $settings['row'], $settings['res_type'] === 'column', $settings['res_screen']); 
    ?>
    <?php if($settings['res_type'] === 'column') :?>
        <div class="pxl-table__mobile column-xxl-<?php echo esc_attr($col_xxl); ?> column-xl-<?php echo esc_attr($col_xl); ?> column-lg-<?php echo esc_attr($col_lg); ?> column-md-<?php echo esc_attr($col_md); ?> column-sm-<?php echo esc_attr($col_sm); ?> column-xs-<?php echo esc_attr($col_xs); ?>"></div>
    <?php endif; ?>
</div>

