<?php
$col_xs = $widget->get_setting('col_xs', '');
$col_sm = $widget->get_setting('col_sm', '');
$col_md = $widget->get_setting('col_md', '');
$col_lg = $widget->get_setting('col_lg', '');
$col_xl = $widget->get_setting('col_xl', '');

$col_xl = 12 / intval($col_xl);
$col_lg = 12 / intval($col_lg);
$col_md = 12 / intval($col_md);
$col_sm = 12 / intval($col_sm);
$col_xs = 12 / intval($col_xs);

$grid_sizer = "col-xl-{$col_xl} col-lg-{$col_lg} col-md-{$col_md} col-sm-{$col_sm} col-{$col_xs}";
$item_class = "pxl-grid-item col-xl-{$col_xl} col-lg-{$col_lg} col-md-{$col_md} col-sm-{$col_sm} col-{$col_xs}";
?>
<?php if(isset($settings['testimonial']) && !empty($settings['testimonial']) && count($settings['testimonial'])): ?>
<div class="pxl-grid pxl-testimonial-grid pxl-testimonial-grid1 <?php echo esc_attr($settings['style']); ?>" data-layout="<?php echo esc_attr($settings['layout_mode']); ?>">
    <div class="pxl-grid-inner pxl-grid-masonry row" data-gutter="15">
        <div class="grid-sizer <?php echo esc_attr($grid_sizer); ?>"></div>
        <?php foreach ($settings['testimonial'] as $key => $value):
           $title = isset($value['title']) ? $value['title'] : '';
           $position = isset($value['position']) ? $value['position'] : '';
           $desc = isset($value['description']) ? $value['description'] : '';
           $image = isset($value['image']) ? $value['image'] : '';
           ?>
           <div class="<?php echo esc_attr($item_class); ?>">
            <div class="pxl-item--inner <?php echo esc_attr($settings['pxl_animate']); ?>">
                <p class="pxl-item--description"><?php echo pxl_print_html($desc); ?></p>
                <div class="bottom-content">
                    <div class="content-bottom">
                        <div class="pxl-item--holder">
                            <?php if(!empty($image['id'])) { 
                                $img = pxl_get_image_by_size( array(
                                    'attach_id'  => $image['id'],
                                    'thumb_size' => '90x90',
                                    'class' => 'no-lazyload',
                                ));
                                $thumbnail = $img['thumbnail'];?>
                                <div class="pxl-item--avatar ">
                                    <?php echo wp_kses_post($thumbnail); ?>
                                </div>
                            <?php } ?>
                            <div class="info">
                                <h3 class="pxl-item--title">    
                                    <?php echo pxl_print_html($title); ?>
                                </h3>
                                <div class="pxl-item--position"><?php echo pxl_print_html($position); ?></div>
                            </div>
                        </div>
                    </div>
                    <div class="quote">
                        <div class="line"></div>
                        <div class="icon"><svg id="Layer_1" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 746.34 523.25"><path d="M304.21,573.88q-71,0-127.77-57.8T119.66,344.7q0-129.76,70-211.93T389.39,50.63q46.64,0,73,6.08V150q-28.43-4-73-4.06-69,0-111.54,46.65-40.61,40.59-46.65,107.49,26.34-32.43,85.18-32.45,60.86,0,103.43,41.57t42.6,108.51q0,69-44.62,112.56T304.21,573.88Zm403.59,0q-71,0-127.76-57.8T523.25,344.7q0-129.76,70-211.93T793,50.63q44.58,0,73,6.08V150q-28.43-4-73-4.06-69,0-111.55,46.65-40.59,40.59-46.64,107.49,26.33-32.43,85.18-32.45,60.84,0,103.43,41.57T866,417.72q0,69-44.62,112.56T707.8,573.88Z" transform="translate(-119.66 -50.63)"/></svg></div>
                    </div>
                </div>
            </div>
        </div>
    <?php endforeach; ?>
</div>
</div>
<?php endif; ?>
