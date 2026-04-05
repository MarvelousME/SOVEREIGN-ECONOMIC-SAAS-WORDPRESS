<?php
extract($settings);
$html_id = pxl_get_element_id($settings);
$tax = ['portfolio-category'];
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
extract(pxl_get_posts_of_grid('portfolio', [
    'source' => $source,
    'orderby' => $orderby,
    'order' => $order,
    'limit' => $limit,
    'post_ids' => $post_ids,
    'tax'=> $tax,
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
$effect = $widget->get_setting('effect', 'carousel');
$style_l11 = $widget->get_setting('style_l11', 'pxl-post-style1');
$pause_on_hover = $widget->get_setting('pause_on_hover', false);
$autoplay = $widget->get_setting('autoplay', false); 
$post_number = $widget->get_setting('post_number', '3');
$center = $widget->get_setting('center', false); 
$autoplay_speed = $widget->get_setting('autoplay_speed', '5000');
$infinite = $widget->get_setting('infinite', false);
$speed = $widget->get_setting('speed', '500');
$drap = $widget->get_setting('drap', false);

$img_size = $widget->get_setting('img_size');
$show_excerpt = $widget->get_setting('show_excerpt');
$show_category = $widget->get_setting('show_category');
$num_words = $widget->get_setting('num_words');
$show_button = $widget->get_setting('show_button');
$show_title = $widget->get_setting('show_title');
$button_text = $widget->get_setting('button_text');

$opts = [
    'slide_direction'               => 'horizontal',
    'slide_percolumn'               => 1, 
    'slide_percolumnfill'           => 1, 
    'slide_mode'                    => $effect, 
    'center_slide'                  => false, 
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
    'loop'                          => $infinite,
    'speed'                         => (int)$speed,
    'center'                        => (bool)$center,
];

$class = 'pxl-swiper-container';

$widget->add_render_attribute('carousel', [
    'class'         => $class,
    'dir'           => is_rtl() ? 'rtl' : 'ltr',
    'data-settings' => wp_json_encode($opts)
]); ?>

<?php if (is_array($posts)): ?>
    <div class="pxl-swiper-slider pxl-portfolio-carousel pxl-portfolio-carousel2 <?php echo esc_attr($style_l11); ?> ">
        <?php if ($settings['filter']=='true') { ?>
            <div class="swiper-filter <?php echo esc_attr($settings['filter_type']); ?>">
                <div class="container">
                    <div class="pxl-grid-filter normal style-1">
                        <div class="pxl--filter-inner">
                           <?php if(!empty($filter_default_title)): ?>
                            <span class="filter-item active" data-filter-target="all">
                                <span class="cat-name"><?php echo esc_html($filter_default_title); ?></span>
                            </span>
                        <?php endif; ?>
                        <?php foreach ($categories as $category):
                            $category_arr = explode('|', $category);
                            $term = get_term_by('slug',$category_arr[0], $category_arr[1]);
                            $tax_count = 0;
                            foreach ($posts as $key => $post){
                                $this_terms = get_the_terms( $post->ID, 'portfolio-category' );
                                $term_list = [];
                                foreach ($this_terms as $t) {
                                    $term_list[] = $t->slug;
                                } 
                                if(in_array($term->slug,$term_list))
                                    $tax_count++;
                            } 
                            if($tax_count > 0): ?>
                                <span class="filter-item" data-filter-target="<?php echo esc_attr($term->slug); ?>">
                                    <span class="cat-name"><?php echo esc_html($term->name); ?></span>
                                     <span class="filter-item-count">
                                        <?php
                                        echo esc_html($tax_count); 
                                        ?>
                                    </span> 
                                </span>
                            <?php endif; ?>
                        <?php endforeach; ?>

                    </div>
                    
                </div>
            </div>
        </div>
    <?php  } ?>
    <div class="pxl-carousel-inner" >
        <div <?php pxl_print_html($widget->get_render_attribute_string( 'carousel' )); ?>>
           <?php
           $posts_by_category = [];
           foreach ($posts as $post) {
            $categories = get_the_terms($post->ID, 'portfolio-category'); 
            if ($categories) {
                foreach ($categories as $category) {
                    $posts_by_category[$category->term_id]['posts'][] = $post;
                    $posts_by_category[$category->term_id]['name'] = $category->name; 
                }
            }
        }
        ?>
        <div class="pxl-swiper-wrapper">
         <?php 
         foreach ($posts_by_category as $category_id => $category_posts):
            $post_count = count($category_posts['posts']);
            $category_name = mb_strtolower($category_posts['name']);

 
            $is_mobile = function_exists('wp_is_mobile') ? wp_is_mobile() : false;            

            $category_posts = $category_posts['posts'];
            $posts_per_slide = $is_mobile ? 1 : $post_number;

            for ($i = 0; $i < $post_count; $i += $posts_per_slide): 
                ?>
                <div class="pxl-swiper-slide" data-filter="<?php echo esc_attr($category_name); ?>">
                    <?php 
                    for ($j = $i; $j < $i + $posts_per_slide && $j < $post_count; $j++): 
                        $post = $category_posts[$j]; 

                        $image_size = !empty($img_size) ? $img_size : '952x554';
                        $multi_text_country = get_post_meta($post->ID, 'multi_text_country', true);

                        if (has_post_thumbnail($post->ID) && wp_get_attachment_image_src(get_post_thumbnail_id($post->ID), false)){
                            $img_id = get_post_thumbnail_id($post->ID);
                            $img = pxl_get_image_by_size(array(
                                'attach_id'  => $img_id,
                                'thumb_size' => $image_size
                            ));
                            $thumbnail = $img['thumbnail'];  
                            $thumbnail_url = $img['url'];
                        }
                        $active_class = ($j === $i) ? ' active' : '';
                        ?>
                        <div class="pxl-post--inner <?php echo esc_attr($pxl_animate . $active_class); ?> wow" data-wow-duration="1.2s">
                            <div class="pxl-post--featured">
                                <a href="<?php echo esc_url(get_permalink($post->ID)); ?>">
                                    <?php echo wp_kses_post($thumbnail); ?>
                                </a>
                            </div>
                            <div class="pxl-post--holder">
                                <?php if ($show_category == 'true'): ?>
                                    <div class="pxl-post--category">
                                        <?php the_terms($post->ID, 'portfolio-category', '', ''); ?>
                                    </div>
                                <?php endif; ?>
                                <h3 class="pxl-post--title">
                                    <a href="<?php echo esc_url(get_permalink($post->ID)); ?>">
                                        <?php echo esc_attr(get_the_title($post->ID)); ?>
                                    </a>
                                </h3>
                                <?php if ($show_excerpt == 'true'): ?>
                                    <div class="pxl-post--content">
                                        <?php echo wp_trim_words($post->post_excerpt, $num_words, null); ?>
                                    </div>
                                <?php endif; ?>
                            </div>
                        </div>
                    <?php endfor; ?>
                </div>
                <?php 
            endfor; 
        endforeach; 
        ?>

    </div>

</div>
<div class="container wrap-arrow <?php echo esc_attr($settings['style-pa']) ?>">
    <?php if($pagination !== false): ?>
        <div class="pxl-swiper-dots style-1"></div>
    <?php endif; ?>
    <?php if($arrows !== false): ?>
        <div class="pxl-swiper-arrow-wrap style-1">
            <div class="pxl-swiper-arrow pxl-swiper-arrow-prev"><i class="fas fa-angle-right" style="transform: scalex(-1);"></i></div>
            <div class="pxl-swiper-arrow pxl-swiper-arrow-next"><i class="fas fa-angle-left"></i></div>
        </div>
    <?php endif; ?>
</div>
</div>
</div>
<?php endif; ?>