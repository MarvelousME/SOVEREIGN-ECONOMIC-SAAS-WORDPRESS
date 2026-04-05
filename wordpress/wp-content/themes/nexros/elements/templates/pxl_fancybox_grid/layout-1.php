<?php
$col_xs = $widget->get_setting('col_xs', '');
$col_sm = $widget->get_setting('col_sm', '');
$col_md = $widget->get_setting('col_md', '');
$col_lg = $widget->get_setting('col_lg', '');
$col_xl = $widget->get_setting('col_xl', '');
$item_limit = $widget->get_setting('item_limit', 0);

$col_xl = 12 / intval($col_xl);
$col_lg = 12 / intval($col_lg);
$col_md = 12 / intval($col_md);
$col_sm = 12 / intval($col_sm);
$col_xs = 12 / intval($col_xs);

$grid_sizer = "col-xl-{$col_xl} col-lg-{$col_lg} col-md-{$col_md} col-sm-{$col_sm} col-{$col_xs}";
$item_class = "pxl-grid-item col-xl-{$col_xl} col-lg-{$col_lg} col-md-{$col_md} col-sm-{$col_sm} col-{$col_xs}";
$image_size = !empty($settings['img_size']) ? $settings['img_size'] : 'full';
?>
<?php if(isset($settings['box']) && !empty($settings['box']) && count($settings['box'])): ?>
    <?php
    $unique_tags = array();
    foreach ($settings['box'] as $it) {
        if (!empty($it['tags'])) {
            $splits = array_map('trim', explode(',', $it['tags']));
            foreach ($splits as $tg) {
                if ($tg !== '') {
                    $slug = sanitize_title($tg);
                    $unique_tags[$slug] = $tg; 
                }
            }
        }
    }
    ?>
    <div class="pxl-grid pxl-box-grid pxl-box-grid1 pxl-effect--3d" data-layout="masonry" data-item-limit="<?php echo esc_attr($item_limit); ?>">
        <?php if (!empty($settings['show_filter']) && $settings['show_filter'] === 'yes' && !empty($unique_tags)) : ?>
            <div class="pxl-grid-filter">
                <?php if (!empty($settings['filter_all_label'])): ?>
                    <span class="filter-item active" data-filter="*"><?php echo esc_html($settings['filter_all_label']); ?></span>
                <?php endif; ?>
                <?php 
                $first_filter = true;
                foreach ($unique_tags as $slug => $label): 
                    $active_class = (empty($settings['filter_all_label']) && $first_filter) ? ' active' : '';
                ?>
                    <span class="filter-item<?php echo esc_attr($active_class); ?>" data-filter= ".tag-<?php echo esc_attr($slug); ?>"><?php echo esc_html($label); ?></span>
                <?php 
                    $first_filter = false;
                endforeach; ?>
            </div>
        <?php endif; ?>
        <div class="pxl-grid-inner pxl-grid-masonry row" data-gutter="15" data-auto-step="<?php echo !empty($settings['auto_step']) && $settings['auto_step'] === 'yes' ? '1' : '0'; ?>">
            <div class="grid-sizer <?php echo esc_attr($grid_sizer); ?>"></div>
            <?php
            $auto_counter = 0;
            $items_to_show = $item_limit > 0 ? $item_limit : count($settings['box']);
            $items_shown = 0;
            foreach ($settings['box'] as $key => $value):
                if ($items_shown >= $items_to_show) break; 
                $title = isset($value['title']) ? $value['title'] : '';
                $step = isset($value['step']) ? $value['step'] : '';
                $desc = isset($value['desc']) ? $value['desc'] : '';
                $btn_text = isset($value['btn_text']) ? $value['btn_text'] : '';
                $btn_link = isset($value['btn_link']) ? $value['btn_link'] : '';
                
                $tag_classes = array();
                if (!empty($value['tags'])) {
                    $spl = array_map('trim', explode(',', $value['tags']));
                    foreach ($spl as $tg) {
                        if ($tg !== '') {
                            $tag_classes[] = 'tag-' . sanitize_title($tg);
                        }
                    }
                }
                $link_key_2 = $widget->get_repeater_setting_key( 'btn_link', 'value', $key );
                if ( ! empty( $value['btn_link']['url'] ) ) {
                    $widget->add_render_attribute( $link_key_2, 'href', $value['btn_link']['url'] );

                    if ( $value['btn_link']['is_external'] ) {
                        $widget->add_render_attribute( $link_key_2, 'target', '_blank' );
                    }

                    if ( $value['btn_link']['nofollow'] ) {
                        $widget->add_render_attribute( $link_key_2, 'rel', 'nofollow' );
                    }
                }
                $link_attributes_2 = $widget->get_render_attribute_string( $link_key_2 );
                $auto_counter++;
                $display_step = (!empty($settings['auto_step']) && $settings['auto_step'] === 'yes') ? $auto_counter : $step;
                $display_step_num = intval($display_step);
                $display_step_text = sprintf('%02d', $display_step_num);
                ?>
                <div class="<?php echo esc_attr($item_class . (!empty($tag_classes) ? ' ' . implode(' ', $tag_classes) : '')); ?>">
                    <div class="pxl-item--inner <?php echo esc_attr($settings['pxl_animate']); ?>">
                    <div class="pxl-effect--direction">   
                        <div class="pxl-effect--content"></div>
                        <div class="pxl-item--holder">
                            <a <?php echo implode( ' ', [ $link_attributes_2 ] ); ?>>
                            </a>
                            <span class="pxl-item--step" data-step="<?php echo esc_attr($display_step_num); ?>"><?php echo pxl_print_html($display_step_text); ?></span>
                            <h3 class="pxl-item--title"><?php echo pxl_print_html($title); ?></h3>
                            <p class="pxl-item--desc"><?php echo pxl_print_html($desc); ?></p>
                            <?php if(!empty($btn_text)) : ?>
                                <div class="pxl-button">
                                    <a <?php echo implode( ' ', [ $link_attributes_2 ] ); ?> class="btn">
                                        <span><?php echo pxl_print_html($btn_text); ?></span>
                                        <i class="bi-arrow-right-short rtl-reverse"></i>
                                    </a>
                                </div>
                            <?php endif; ?>
                            </div>
                        </div>
                    </div>
                </div>
                <?php $items_shown++; ?>
            <?php endforeach; ?>
        </div>
    </div>
<?php endif; ?>
