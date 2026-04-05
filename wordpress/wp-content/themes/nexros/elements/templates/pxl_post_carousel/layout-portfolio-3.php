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
if ($settings['filter_type'] == 'style-2') {
    $class .= ' overflow-visible';
}

$widget->add_render_attribute('carousel', [
    'class'         => $class,
    'dir'           => is_rtl() ? 'rtl' : 'ltr',
    'data-settings' => wp_json_encode($opts)
]); ?>

<?php if (is_array($posts)): ?>
    <div class="pxl-swiper-slider pxl-portfolio-carousel pxl-check-scroll pxl-portfolio-carousel3 blinds_staggered <?php echo esc_attr($style_l11); ?> ">
        <?php if ($settings['filter']=='true' && $settings['filter_type'] =='df') { ?>
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
                                </span>
                            <?php endif; ?>
                        <?php endforeach; ?>

                    </div>
                    
                </div>
            </div>
        </div>
    </div>    <?php  } ?>
    <div class="pxl-carousel-inner <?php if ($settings['filter_type'] =='style-2') {echo 'overflow-visible relative';} ?>" >
        <div class="row">
            <?php if ($settings['filter']=='true' && $settings['filter_type'] =='style-2') { ?>
                <div class="col-md-2 col-xs-12 perspective">
                    <div class="swiper-filter <?php echo esc_attr($settings['filter_type']); ?>">
                        <div class="container">
                            <div class="pxl-grid-filter normal style-1">
                                <div class="pxl--filter-inner">
                                   <?php if(!empty($filter_default_title)): ?>
                                    <span class="filter-item active" data-filter-target="all">
                                        <span class="cat-name"><?php echo esc_html($filter_default_title); ?>
                                        <span class="filter-item-count">
                                            <?php
                                            echo count($posts); 
                                            ?>
                                        </span> 
                                    </span>
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
                                        <span class="cat-name"><?php echo esc_html($term->name); ?>
                                        <span class="filter-item-count">
                                            <?php
                                            echo esc_html($tax_count); 
                                            ?>
                                        </span> 
                                    </span>
                                </span>
                            <?php endif; ?>
                        <?php endforeach; ?>

                    </div>

                </div>
            </div>
        </div>
    </div>
<?php  } ?>
<?php if ($settings['filter']=='true' && $settings['filter_type'] =='style-2') { ?>
    <div class="col-md-10 col-xs-12 carousel-nav-appended">
    <?php  } else { ?>
        <div class="col-md-12 col-xs-12 carousel-no-appended">
        <?php  } ?>
        <div <?php pxl_print_html($widget->get_render_attribute_string( 'carousel' )); ?>>
            <div class="pxl-swiper-wrapper">
                <?php
                foreach ($posts as $post):
                    $image_size = !empty($img_size) ? $img_size : 'full';
                    $multi_text_country = get_post_meta($post->ID, 'multi_text_country', true);  

                    if (has_post_thumbnail($post->ID) && wp_get_attachment_image_src(get_post_thumbnail_id($post->ID), false)){
                        $img_id       = get_post_thumbnail_id( $post->ID );
                        $img          = pxl_get_image_by_size( array(
                            'attach_id'  => $img_id,
                            'thumb_size' => $image_size
                        ) );
                        $thumbnail    = $img['thumbnail']; 
                        $thumbnail_url    = $img['url']; 
                    }
                    $filter_class = '';
                    if ($select_post_by === 'term_selected' )
                        $filter_class = pxl_get_term_of_post_to_class($post->ID, array_unique($tax));
                    ?>
                    <div class="pxl-swiper-slide visible" data-filter="<?php echo esc_attr($filter_class); ?>" <?php if($drap !== false): ?>data-cursor-drap="<?php echo esc_html('Drag.', 'nexros'); ?>"<?php endif; ?>>
                        <div class="pxl-post--inner <?php echo esc_attr($pxl_animate); ?> wow" data-wow-duration="1.2s">
                            <div class="pxl-post--featured " style="background-image:url(<?php echo esc_url($thumbnail_url); ?>);">
                                <a href="<?php echo esc_url(get_permalink( $post->ID )); ?>">   
                                    <?php echo wp_kses_post($thumbnail); ?>
                                </a>    
                            </div>
                            <div class="pxl-post--holder">
                               <?php if($show_category == 'true'): ?>
                                <div class="pxl-post--category">
                                    <?php the_terms( $post->ID, 'portfolio-category', '', '' ); ?>
                                </div>
                            <?php endif; ?>
                            <h5 class="pxl-post--title">
                                <a href="<?php echo esc_url(get_permalink( $post->ID )); ?>"><?php echo esc_html(get_the_title($post->ID)); ?></a>
                            </h5>
                            <?php if($show_excerpt == 'true'): ?>
                                <div class="pxl-post--content">
                                    <?php if($show_excerpt == 'true'): ?>
                                        <?php
                                        echo wp_trim_words( $post->post_excerpt, $num_words, null );
                                        ?>
                                    <?php endif; ?>
                                </div>
                            <?php endif; ?>
                            <?php if($show_button == 'true'): ?>
                              <a class="pxl-post--button" href="<?php echo esc_url(get_permalink( $post->ID )); ?>">
                                <span class="button-arrow-hover"><svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 12 12" fill="none">
                                  <path d="M10.1703 3.1295L2.28054 11.0192L0.984375 9.72308L8.87321 1.83333H1.92029V0H12.0036V10.0833H10.1703V3.1295Z" fill="black"/>
                              </svg>
                              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 12 12" fill="none">
                                  <path d="M10.1703 3.1295L2.28054 11.0192L0.984375 9.72308L8.87321 1.83333H1.92029V0H12.0036V10.0833H10.1703V3.1295Z" fill="black"/>
                              </svg></span>
                          </a>
                      <?php endif; ?>
                  </div>
              </div>
          </div>
      <?php endforeach; ?>
  </div> 
</div>
</div>
</div>
<div class="container wrap-arrow <?php echo esc_attr($settings['style-pa']) ?>">
    <?php if($pagination !== false): ?>
        <div class="pxl-swiper-dots style-1"></div>
    <?php endif; ?>
    <?php if($arrows !== false): ?>
        <div class="pxl-swiper-arrow-wrap style-1">
            <div class="pxl-swiper-arrow pxl-swiper-arrow-prev"><svg xmlns="http://www.w3.org/2000/svg" width="22" height="16" viewBox="0 0 22 16" fill="none">
              <path d="M0.292788 8.71929L7.29286 15.7193C7.48146 15.9014 7.73407 16.0022 7.99626 16C8.25846 15.9977 8.50928 15.8925 8.69469 15.7071C8.8801 15.5217 8.98527 15.2709 8.98755 15.0087C8.98983 14.7465 8.88903 14.4939 8.70687 14.3053L3.41382 9.01229L21 9.01229C21.2652 9.01229 21.5196 8.90693 21.7071 8.7194C21.8946 8.53186 22 8.27751 22 8.01229C22 7.74707 21.8946 7.49272 21.7071 7.30518C21.5196 7.11765 21.2652 7.01229 21 7.01229L3.41382 7.01229L8.70687 1.71929C8.80238 1.62704 8.87857 1.5167 8.93098 1.39469C8.98338 1.27269 9.01097 1.14147 9.01213 1.00869C9.01328 0.875911 8.98798 0.744232 8.93769 0.621336C8.88741 0.49844 8.81316 0.386787 8.71927 0.292894C8.62537 0.199001 8.51372 0.124747 8.39082 0.0744665C8.26792 0.0241859 8.13624 -0.0011151 8.00346 3.7877e-05C7.87068 0.00119181 7.73946 0.0287787 7.61746 0.0811879C7.49545 0.133597 7.38511 0.209778 7.29286 0.305288L0.292788 7.30529C0.105315 7.49282 -1.18586e-06 7.74712 -1.20904e-06 8.01229C-1.23222e-06 8.27745 0.105315 8.53176 0.292788 8.71929Z" fill="white"/>
          </svg></div>
          <div class="pxl-swiper-arrow pxl-swiper-arrow-next"><svg xmlns="http://www.w3.org/2000/svg" width="22" height="16" viewBox="0 0 22 16" fill="none">
              <path d="M21.7072 8.71929L14.7071 15.7193C14.5185 15.9014 14.2659 16.0022 14.0037 16C13.7415 15.9977 13.4907 15.8925 13.3053 15.7071C13.1199 15.5217 13.0147 15.2709 13.0125 15.0087C13.0102 14.7465 13.111 14.4939 13.2931 14.3053L18.5862 9.01229L1.00001 9.01229C0.73479 9.01229 0.480434 8.90693 0.292895 8.7194C0.105357 8.53186 -6.75122e-07 8.27751 -6.98308e-07 8.01229C-7.21494e-07 7.74707 0.105357 7.49272 0.292895 7.30518C0.480433 7.11765 0.73479 7.01229 1.00001 7.01229L18.5862 7.01229L13.2931 1.71929C13.1976 1.62704 13.1214 1.5167 13.069 1.39469C13.0166 1.27269 12.989 1.14147 12.9879 1.00869C12.9867 0.875911 13.012 0.744232 13.0623 0.621336C13.1126 0.49844 13.1868 0.386787 13.2807 0.292894C13.3746 0.199001 13.4863 0.124747 13.6092 0.0744665C13.7321 0.0241859 13.8638 -0.0011151 13.9965 3.7877e-05C14.1293 0.00119181 14.2605 0.0287787 14.3825 0.0811879C14.5045 0.133597 14.6149 0.209778 14.7071 0.305288L21.7072 7.30529C21.8947 7.49282 22 7.74712 22 8.01229C22 8.27745 21.8947 8.53176 21.7072 8.71929Z" fill="white"/>
          </svg></div>
      </div>
  <?php endif; ?>
</div>
</div>
</div>
<?php endif; ?>