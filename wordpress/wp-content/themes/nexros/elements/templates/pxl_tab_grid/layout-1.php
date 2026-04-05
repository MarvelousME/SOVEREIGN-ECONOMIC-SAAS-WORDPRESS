<?php if(isset($settings['box']) && !empty($settings['box']) && count($settings['box'])):
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
    $html_id = pxl_get_element_id($settings); 
    $tab_bd_ids = [];

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
    <div id="pxl-gallery-<?php echo esc_attr($pxl_g_id); ?>" class="pxl-grid pxl-gallery-grid pxl-gallery-grid1" data-gutter="15" data-layout="<?php echo esc_attr($widget->get_setting('layout_mode', 'masonry')); ?>">
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
    <div class="pxl-grid-inner pxl-grid-masonry row">
            <div class="grid-sizer <?php echo esc_attr($grid_sizer); ?>"></div>
            <?php foreach ($settings['box'] as $key => $content):
                $title = isset($content['title']) ? $content['title'] : '';
                $tags = isset($content['tags']) ? $content['tags'] : '';

                $tag_classes = array();
                if (!empty($content['tags'])) {
                    $spl = array_map('trim', explode(',', $content['tags']));
                    foreach ($spl as $tg) {
                        if ($tg !== '') {
                            $tag_classes[] = 'tag-' . sanitize_title($tg);
                        }
                    }
                }
            ?>
                <div class="<?php echo esc_attr($item_class); ?> <?php echo esc_attr(implode(' ', $tag_classes)); ?> elementor-repeater-item-<?php echo esc_attr($content['_id']); ?>">
                    <div class="pxl-item--inner">
                        <div class="pxl-tabs--content">
                                <div id="<?php echo esc_attr($html_id.'-'.$content['_id']); ?>" class="pxl-item--content  pxl-tabs--elementor" >
                                    <?php 
                                        $tab_content = Elementor\Plugin::$instance->frontend->get_builder_content_for_display( (int)$content['content_template']);
                                        $tab_bd_ids[] = (int)$content['content_template'];
                                        pxl_print_html($tab_content);     
                                    ?>
                                </div>
                        </div>
                        <h5 class="pxl-item--title"><?php echo esc_html($title); ?></h5>
                        <div class="pxl-item--tags"><?php echo esc_html($tags); ?></div>
                   </div>
                </div>
            <?php endforeach; ?>
        </div>
    </div>
<?php endif; ?>