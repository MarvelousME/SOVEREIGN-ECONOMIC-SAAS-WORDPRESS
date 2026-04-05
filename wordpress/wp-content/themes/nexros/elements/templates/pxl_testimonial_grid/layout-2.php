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
<div class="pxl-grid pxl-testimonial-grid pxl-testimonial-grid2 <?php echo esc_attr($settings['style']); ?>" data-layout="<?php echo esc_attr($settings['layout_mode']); ?>">
    <div class="pxl-grid-inner pxl-grid-masonry row" data-gutter="15">
        <div class="grid-sizer <?php echo esc_attr($grid_sizer); ?>"></div>
        <?php foreach ($settings['testimonial'] as $key => $value):
         $title = isset($value['title']) ? $value['title'] : '';
         $position = isset($value['position']) ? $value['position'] : '';
         $desc = isset($value['description']) ? $value['description'] : '';
         $image = isset($value['image']) ? $value['image'] : '';
         $star = isset($value['star']) ? $value['star'] : '';
         ?>
         <div class="<?php echo esc_attr($item_class); ?>">
            <div class="pxl-item--inner <?php echo esc_attr($settings['pxl_animate']); ?>">
                <div class="top-content">
                    <div class="quote">
                        “
                    </div>
                    <p class="pxl-item--description"><?php echo pxl_print_html($desc); ?></p>
                </div>
                <div class="bottom-content">
                    <div class="left-ct">
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
                    </div>
                    <div class="right-ct">
                        <h3 class="pxl-item--title">    
                            <?php echo pxl_print_html($title); ?>
                        </h3>
                        <div class="pxl-item--star pxl-item--<?php echo esc_attr($star); ?>-star">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 245">
                                <path d="m56,237 74-228 74,228L10,96h240"/>
                            </svg>
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 245">
                                <path d="m56,237 74-228 74,228L10,96h240"/>
                            </svg>
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 245">
                                <path d="m56,237 74-228 74,228L10,96h240"/>
                            </svg>
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 245">
                                <path d="m56,237 74-228 74,228L10,96h240"/>
                            </svg>
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 245">
                                <path d="m56,237 74-228 74,228L10,96h240"/>
                            </svg>
                        </div>
                        <div class="pxl-item--position"><?php echo pxl_print_html($position); ?></div>
                    </div>
                </div>
            </div>
        </div>
    <?php endforeach; ?>
</div>
</div>
<?php endif; ?>
