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
<div class="pxl-pricing-table pxl-pricing-table__layout-1 <?php if($settings['row']) echo esc_attr('pxl-table__title-row'); ?> <?php if($settings['show_column']) echo esc_attr('pxl-table__none-column'); ?> <?php if($settings['column']) echo esc_attr('pxl-table__title-column'); ?>">
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