<?php
$html_id = pxl_get_element_id($settings);
$select_post_by = $widget->get_setting('select_post_by', '');
$source = $post_ids = [];
if($select_post_by === 'post_selected'){
    $post_ids = $widget->get_setting('source_'.$settings['post_type'].'_post_ids', '');
}else{
    $source  = $widget->get_setting('source_'.$settings['post_type'], '');
}
$orderby = $widget->get_setting('orderby', 'date');
$order = $widget->get_setting('order', 'desc');
$limit = $widget->get_setting('limit', 6);
$settings['layout']    = $settings['layout_'.$settings['post_type']];
extract(pxl_get_posts_of_grid('post', [
    'source' => $source,
    'orderby' => $orderby,
    'order' => $order,
    'limit' => $limit,
    'post_ids' => $post_ids,
]));

$pxl_animate = $widget->get_setting('pxl_animate', '');
$col_xs = $widget->get_setting('col_xs', '');
$col_sm = $widget->get_setting('col_sm', '');
$col_md = $widget->get_setting('col_md', '');
$col_lg = $widget->get_setting('col_lg', '');
$col_xl = $widget->get_setting('col_xl', '');
$col_xxl = $widget->get_setting('col_xxl', '');
if($col_xxl == 'inherit') {
    $col_xxl = $col_xl;
}
$slides_to_scroll = $widget->get_setting('slides_to_scroll', '');

$arrows = $widget->get_setting('arrows', false);
$pagination = $widget->get_setting('pagination', false);
$pagination_type = $widget->get_setting('pagination_type', 'bullets');
$pause_on_hover = $widget->get_setting('pause_on_hover', false);
$autoplay = $widget->get_setting('autoplay', false);
$autoplay_speed = $widget->get_setting('autoplay_speed', '5000');
$infinite = $widget->get_setting('infinite', false);
$speed = $widget->get_setting('speed', '500');
$center = $widget->get_setting('center', false);
$drap = $widget->get_setting('drap', false);

$img_size = $widget->get_setting('img_size');
$show_excerpt = $widget->get_setting('show_excerpt');
$num_words = $widget->get_setting('num_words');
$show_button = $widget->get_setting('show_button');
$show_category = $widget->get_setting('show_category');
$show_date = $widget->get_setting('show_date');
$show_author = $widget->get_setting('show_author');
$show_comment = $widget->get_setting('show_comment');
$button_text = $widget->get_setting('button_text');

$opts = [
    'slide_direction'               => 'horizontal',
    'slide_percolumn'               => 1, 
    'slide_percolumnfill'           => 1, 
    'slide_mode'                    => 'slide', 
    'slides_to_show'                => (int)$col_xl, 
    'slides_to_show_xxl'            => (int)$col_xxl, 
    'slides_to_show_lg'             => (int)$col_lg, 
    'slides_to_show_md'             => (int)$col_md, 
    'slides_to_show_sm'             => (int)$col_sm, 
    'slides_to_show_xs'             => (int)$col_xs,  
    'slides_to_scroll'              => (int)$slides_to_scroll,  
    'slides_gutter'                 => 30, 
    'arrow'                         => (bool)$arrows,
    'pagination'                    => (bool)$pagination,
    'pagination_type'               => $pagination_type,
    'autoplay'                      => (bool)$autoplay,
    'pause_on_hover'                => (bool)$pause_on_hover,
    'pause_on_interaction'          => true,
    'delay'                         => (int)$autoplay_speed,
    'loop'                          => (bool)$infinite,
    'speed'                         => (int)$speed,
    'center'                        => (bool)$center,
];

$widget->add_render_attribute( 'carousel', [
    'class'         => 'pxl-swiper-container',
    'dir'           => is_rtl() ? 'rtl' : 'ltr',
    'data-settings' => wp_json_encode($opts)
]); ?>

<?php if (is_array($posts)): ?>
    <div class="pxl-swiper-slider pxl-post-carousel pxl-post-carousel3 <?php echo pxl_print_html($settings['style_l11'])?>" <?php if($drap !== false): ?>data-cursor-drap="<?php echo esc_attr__('DRAG', 'nexros'); ?>"<?php endif; ?>>
        <div class="pxl-carousel-inner">
            <div <?php pxl_print_html($widget->get_render_attribute_string( 'carousel' )); ?>>
                <div class="pxl-swiper-wrapper">
                    <?php
                    $image_size = !empty($img_size) ? $img_size : '767x491';
                    foreach ($posts as $post):
                        $img_id       = get_post_thumbnail_id( $post->ID );
                        $author_id = $post->post_author;
                        $author_name = get_the_author_meta('display_name', $author_id); ?>
                        <div class="pxl-swiper-slide">
                            <div class="pxl-post--inner <?php echo esc_attr($pxl_animate); ?> wow" data-wow-duration="1.2s">
                                <?php if (has_post_thumbnail($post->ID) && wp_get_attachment_image_src(get_post_thumbnail_id($post->ID), false)):
                                $img_id = get_post_thumbnail_id($post->ID);
                                $img          = pxl_get_image_by_size( array(
                                    'attach_id'  => $img_id,
                                    'thumb_size' => $image_size
                                ) );
                                $thumbnail    = $img['thumbnail'];
                                ?>
                                <div class="pxl-post--featured">
                                    <a href="<?php echo esc_url(get_permalink( $post->ID )); ?>" aria-label="<?php echo esc_attr( get_the_title($post->ID) ); ?>">
                                    <?php echo get_the_post_thumbnail($post->ID, $image_size); ?>
                                    </a>
                                    <?php if($show_category == 'true'): ?>
                                        <div class="pxl-post--category d-flex">
                                            <?php 
                                            $categories = get_the_terms( $post->ID, 'category' );
                                            if ( $categories && ! is_wp_error( $categories ) ) {
                                                $category_names = array();
                                                foreach ( $categories as $category ) {
                                                    $category_names[] = esc_html( $category->name );
                                                }
                                                echo implode( ', ', $category_names );
                                            }
                                            ?>
                                        </div>
                                    <?php endif; ?>
                                </div>
                            <?php endif; ?>
                            <div class="pxl-post--container">
                              <div class="pxl-post--meta pxl-flex-middle">
                              <?php if($show_author == 'true'): ?>
                                <div class="pxl-item--author">
                                 <?php echo get_avatar($author_id, 48); ?>
                                 <div class="pxl-author--container d-flex flex-column">
                                    <span class="pxl-author--title">
                                        <?php echo esc_html__('By', 'nexros'); ?>
                                     <?php echo esc_html($author_name);?>
                                 </span>
                             </div>
                             </div>
                         <?php endif; ?>
                                <?php if($show_date == 'true'): ?>
                                            <span class="post-date">
                                                <?php echo get_the_date('M d Y', $post->ID)  ?>
                                            </span>
                                <?php endif; ?>
                        </div>
                        <h3 class="pxl-post--title ">
                            <a href="<?php echo esc_url(get_permalink( $post->ID )); ?>">
                                <?php echo pxl_print_html(get_the_title($post->ID)); ?>
                            </a>
                        </h3>
                        <?php if($show_excerpt == 'true'): ?>
                            <div class="pxl-post--content">
                                <?php
                                if ( ! empty( $post->post_excerpt ) ) {
                                    echo wp_trim_words( $post->post_excerpt, $num_words, null );
                                } else {
                                    echo wp_trim_words( $post->post_content, $num_words, null );
                                }
                                ?>
                            </div>
                        <?php endif; ?>
                        <?php if($show_button == 'true') : ?>
                            <div class="pxl-post--button">
                                <a class="btn--readmore" href="<?php echo esc_url(get_permalink( $post->ID )); ?>">
                                  <span><?php if(!empty($button_text)) {
                                    echo pxl_print_html($button_text);
                                } else {
                                    echo esc_html__('READ FULL ARTICLE', 'nexros');
                                } ?></span>
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="12" viewBox="0 0 14 12" fill="none">
                                <path fill-rule="evenodd" clip-rule="evenodd" d="M7.24473 0.323179C7.57017 -0.00225768 8.0978 -0.00225768 8.42324 0.323179L12.834 4.73392C13.4849 5.3848 13.4849 6.44007 12.834 7.09095L8.42324 11.5017C8.0978 11.8271 7.57017 11.8271 7.24473 11.5017C6.91929 11.1763 6.91929 10.6486 7.24473 10.3232L10.8221 6.74577H1.16732C0.70708 6.74577 0.333984 6.37267 0.333984 5.91243C0.333984 5.4522 0.70708 5.0791 1.16732 5.0791H10.8221L7.24473 1.50169C6.91929 1.17625 6.91929 0.648616 7.24473 0.323179Z" fill="#1AECBB"/>
                                </svg>
                      </a>
                  </div>
              <?php endif; ?>
        </div>
    </div>
</div>
<?php endforeach; ?>
</div> 
</div>

</div>
<?php if($pagination !== false): ?>
    <div class="pxl-swiper-dots style-1"></div>
<?php endif; ?>

<?php if($arrows !== false): ?>
    <div class="pxl-swiper-arrow-wrap style-1">
        <div class="pxl-swiper-arrow pxl-swiper-arrow-prev" tabindex="0" role="button" aria-label="previous slide">
            <i class="fas fa-angle-left"></i>
        </div>
        <div class="pxl-swiper-arrow pxl-swiper-arrow-next" tabindex="0" role="button" aria-label="next slide">
            <i class="fas fa-angle-right"></i>
        </div>
    </div>
<?php endif; ?>
</div>
<?php endif; ?>