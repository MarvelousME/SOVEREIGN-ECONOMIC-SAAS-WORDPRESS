<?php
if (!class_exists('Nexros_Blog')) {
    class Nexros_Blog
    {

        public function get_archive_meta($post_id = 0) {
            $post_author_on = nexros()->get_theme_opt('post_author_on', true);
            $post_date_on = nexros()->get_theme_opt('post_date_on', true);
            $post_comments_on = nexros()->get_theme_opt('post_comments_on', true);
            $postID = get_the_ID();
            $post = get_post($postID);
            $author_id = $post->post_author;
            $author = get_user_by('ID', get_post_field('post_author', $postID));
            if ($post_author_on || $post_date_on || $post_comments_on) : ?>
                <div class="post-metas">
                    <div class="meta-inner align-items-center">
                        <?php if($post_author_on) : ?>
                            <div class="pxl-item--author">
                                <?php echo get_avatar($author_id, 'thumbnail'); ?>
                                <?php echo esc_html__('Post by', 'nexros') . ' <span>' . esc_html(get_the_author_meta('display_name', $author_id)) . '</span>';?>
                            </div>
                        <?php endif; ?>

                        <?php if($post_date_on) : ?>
                            <span class="pxl-item--date">
                                <?php echo get_the_date('M d Y'); ?>
                            </span>
                        <?php endif; ?>

                        <?php if($post_comments_on) : ?>
                            <span class="post-comments  align-items-center">
                                <a href="<?php comments_link(); ?>">
                                    <span><?php comments_number(esc_html__('No Comments', 'nexros'), esc_html__(' 1 Comment', 'nexros'), esc_html__('%  Comments', 'nexros')); ?></span>
                                </a>
                            </span>
                        <?php endif; ?>
                    </div>
                </div>
            <?php endif;
        }

        public function get_archive_meta_2($post_id = 0) { ?>
            <div class="post-metas-2">
                <div class="meta-inner ">
                    <span class="post-date-category">
                        <span class="post-date-post"><?php echo get_the_date('d M'); ?> </span>
                        <span><?php the_terms( $post_id, 'category', '', ', ', '' ); ?></span>
                    </span>
                </div>
            </div>
        <?php }

        public function get_post_title(){
            $post_title_on = nexros()->get_theme_opt('post_title_on','0');
            if( $post_title_on == '0' ) return;
            ?>
            <h3 class="post-title">
                <a href="<?php echo esc_url( get_permalink()); ?>" title="<?php the_title_attribute(); ?>">
                    <?php the_title(); ?>
                </a>
            </h3>
            <?php 
        }

        public function get_excerpt(){
            $archive_excerpt_length = nexros()->get_theme_opt('archive_excerpt_length', '17');
            $nexros_the_excerpt = get_the_excerpt();
            if(!empty($nexros_the_excerpt)) {
                echo wp_trim_words( $nexros_the_excerpt, $archive_excerpt_length, $more = null );
            } else {
                echo wp_kses_post($this->get_excerpt_more( $archive_excerpt_length ));
            }
        }

        public function get_excerpt_more( $length = 55, $post = null ) {
            $post = get_post( $post );

            if ( empty( $post ) || 0 >= $length ) {
                return ''; 
            }

            if ( post_password_required( $post ) ) {
                return esc_html__( 'Post password required.', 'nexros' );
            }

            $content = apply_filters( 'the_content', strip_shortcodes( $post->post_content ) );
            $content = str_replace( ']]>', ']]&gt;', $content );

            $excerpt_more = apply_filters( 'nexros_excerpt_more', '&hellip;' );
            $excerpt      = wp_trim_words( $content, $length, $excerpt_more );

            return $excerpt;
        }

        public function get_post_metas(){
            $post_author_on = nexros()->get_theme_opt('post_author_on', true);
            $post_date_on = nexros()->get_theme_opt('post_date_on', true);
            $post_tag_on = nexros()->get_theme_opt('post_tag_on', true);
            $postID = get_the_ID();
            $post = get_post($postID);
            $author_id = $post->post_author;
            $author = get_user_by('ID', get_post_field('post_author', $postID));
            if ($post_author_on || $post_date_on || $post_comments_on) : ?>
                <div class="post-metas">
                    <div class="meta-inner align-items-center">
                        <?php if($post_author_on) : ?>
                            <div class="pxl-item--author">
                                <?php echo get_avatar($author_id, 'thumbnail'); ?>
                                <?php echo esc_html__('Post by', 'nexros') . ' <span>' . esc_html(get_the_author_meta('display_name', $author_id)) . '</span>';?>
                            </div>
                        <?php endif; ?>

                        <?php if($post_date_on) : ?>
                            <span class="pxl-item--date">
                                <?php echo get_the_date('M d Y'); ?>
                            </span>
                        <?php endif; ?>

                        <?php if($post_tag_on) : ?>
                            <span class="post-tags  align-items-center">
                                <?php the_tags('', ', ', ''); ?>
                            </span>
                        <?php endif; ?>
                    </div>
                </div>
            <?php endif;
        }

        public function nexros_set_post_views( $postID ) {
            $countKey = 'post_views_count';
            $count    = get_post_meta( $postID, $countKey, true );
            if ( $count == '' ) {
                $count = 0;
                delete_post_meta( $postID, $countKey );
                add_post_meta( $postID, $countKey, '0' );
            } else {
                $count ++;
                update_post_meta( $postID, $countKey, $count );
            }
        }

        public function get_post_tags(){
            $post_tag = nexros()->get_theme_opt( 'post_tag', true );
            if($post_tag != '1') return;
            $tags_list = get_the_tag_list();
            if ( $tags_list ){
                echo '<div class="post-tags ">';
                printf('%2$s', '', $tags_list);
                echo '</div>';
            }
        }

        public function get_post_category($post_id = 0) {
            $archive_category = nexros()->get_theme_opt('archive_category', true);

            $post_category = $archive_category && has_category('', $post_id);
            $post_date = true; 

            echo '<ul class="pxl-item--meta">';

            if ($post_category) {
                echo '<li class="item--category">';
                echo get_the_term_list($post_id, 'category', '', '');
                echo '</li>';
            }

            echo '</ul>';
        }

        public function get_post_share($post_id = 0) {
            $post_social_share = nexros()->get_theme_opt( 'post_social_share', false );
            $share_icons = nexros()->get_theme_opt( 'post_social_share_icon', [] );
            $social_facebook = nexros()->get_theme_opt( 'social_facebook', [] );
            $social_twitter = nexros()->get_theme_opt( 'social_twitter', [] );
            $social_pinterest = nexros()->get_theme_opt( 'social_pinterest', [] );
            $social_linkedin = nexros()->get_theme_opt( 'social_linkedin', [] );
            if($post_social_share != '1') return;
            $post = get_post($post_id);
            ?>
            <div class="post-shares align-items-center">
                <span class="label"><?php echo esc_html__('Share post:', 'nexros'); ?> </span>
                <div class="social-share">
                    <div class="social">
                        <?php if($social_facebook): ?>
                            <a class="pxl-icon " title="<?php echo esc_attr__('Facebook', 'nexros'); ?>" target="_blank" href="https://www.facebook.com/sharer/sharer.php?u=<?php echo urlencode(get_the_permalink($post_id)); ?>">
                                <i class="fab fa-facebook-f"></i>
                            </a>
                        <?php endif; ?>
                        <?php if($social_twitter): ?>
                            <a class="pxl-icon " title="<?php echo esc_attr__('Twitter', 'nexros'); ?>" target="_blank" href="https://twitter.com/intent/tweet?original_referer=<?php echo urldecode(home_url('/')); ?>&url=<?php echo urlencode(get_the_permalink($post_id)); ?>&text=<?php the_title();?>%20">
                                <span class="bi-twitter"></span>
                            </a>
                        <?php endif; ?>
                        <?php if($social_pinterest): ?>
                            <a class="pxl-icon " title="<?php echo esc_attr__('Pinterest', 'nexros'); ?>" target="_blank" href="https://pinterest.com/pin/create/button/?url=<?php echo urlencode(get_the_post_thumbnail_url($post_id, 'full')); ?>&media=&description=<?php echo urlencode(the_title_attribute(array('echo' => false, 'post' => $post))); ?>">
                                <i class="bi-pinterest"></i>
                            </a>
                        <?php endif; ?>
                        <?php if($social_linkedin): ?>
                            <a class="pxl-icon " title="<?php echo esc_attr__('Linkedin', 'nexros'); ?>" target="_blank" href="https://www.linkedin.com/cws/share?url=<?php echo urlencode(get_the_permalink($post_id));?>">
                                <i class="bi-linkedin"></i>
                            </a>
                        <?php endif; ?>
                    </div>
                </div>
            </div>
            <?php
        }

        public function get_post_nav() {
            $post_navigation = nexros()->get_theme_opt( 'post_navigation', false );
            if($post_navigation != '1') return;
            global $post;

            $previous = ( is_attachment() ) ? get_post( $post->post_parent ) : get_adjacent_post( false, '', true );
            $next     = get_adjacent_post( false, '', false );

            if ( ! $next && ! $previous )
                return;
            ?>
            <?php
            $next_post = get_next_post();
            $previous_post = get_previous_post();
            if(empty($previous_post) && empty($next_post)) return;

            ?>
            <div class="single-next-prev-nav row gx-0 justify-content-between align-items-center">
                <?php if(!empty($previous_post)): ?>
                    <div class="nav-next-prev prev col relative text-start">
                        <div class="nav-inner">
                            <?php previous_post_link('%link',''); ?>
                            <div class="nav-label-wrap justify-content-center align-items-center">
                                <i class="bootstrap-icons bi-arrow-left"></i>
                            </div>
                            <div class="nav-title-wrap d-none d-sm-flex">
                                <span class="nav-label"><?php echo esc_html__('Previous Post', 'nexros'); ?></span>
                                <div class="nav-title"><?php echo wp_trim_words(get_the_title($previous_post->ID), 5, '...'); ?></div>
                            </div>
                        </div>
                    </div>
                <?php endif; ?>
                <div class="grid-archive">
                    <a href="<?php echo get_post_type_archive_link( 'post' ); ?>">
                        <div class="nav-archive-button">
                            <div class="archive-btn-square square-1"></div>
                            <div class="archive-btn-square square-2"></div>
                            <div class="archive-btn-square square-3"></div>
                        </div>
                    </a>
                </div>
                <?php if(!empty($next_post)) : ?>
                    <div class="nav-next-prev next col relative text-end justify-content-end">
                       <div class="nav-inner">
                        <?php next_post_link('%link',''); ?>
                        <div class="nav-label-wrap justify-content-center align-items-center">
                            <i class="bootstrap-icons bi-arrow-right"></i>
                        </div>
                        <div class="nav-title-wrap  align-items-end d-none d-sm-flex">
                            <span class="nav-label"><?php echo esc_html__('Newer Post', 'nexros'); ?></span>
                            <div class="nav-title"><?php echo wp_trim_words(get_the_title($next_post->ID), 5, '...'); ?></div>
                        </div>
                    </div>
                </div>
            <?php endif; ?>
        </div> 
        <?php  
    }
    public function get_project_nav() {
        global $post;
        $previous = ( is_attachment() ) ? get_post( $post->post_parent ) : get_adjacent_post( false, '', true );
        $next     = get_adjacent_post( false, '', false );
        $link_grid = nexros()->get_theme_opt( 'link_grid', '' );
        if ( ! $next && ! $previous )
            return;
        ?>
        <?php
        $next_post = get_next_post();
        $previous_post = get_previous_post();

        if( !empty($next_post) || !empty($previous_post) ) { 
            ?>
            <div class="pxl-project--navigation">
                <div class="pxl--items">
                    <div class="pxl--item pxl--item-prev">
                        <?php if ( is_a( $previous_post , 'WP_Post' ) && get_the_title( $previous_post->ID ) != '') { 
                            ?>
                            <a  href="<?php echo esc_url(get_permalink( $previous_post->ID )); ?>"><i class="far fa-arrow-left"></i>Prev Project</a>
                        <?php } ?>
                    </div>
                    <div class="pxl--item pxl--item-grid">
                        <?php if (!empty($link_grid)) { ?>
                            <a  href="<?php echo esc_url($link_grid); ?>">
                                <span class="bl bl1"></span>
                                <span class="bl bl2"></span>
                                <span class="bl bl3"></span>
                                <span class="bl bl4"></span>
                            </a>
                        <?php } ?>
                    </div>
                    <div class="pxl--item pxl--item-next">
                        <?php if ( is_a( $next_post , 'WP_Post' ) && get_the_title( $next_post->ID ) != '') {
                            ?>
                            <a href="<?php echo esc_url(get_permalink( $next_post->ID )); ?>">Next Project <i class="far fa-arrow-right"></i> </a>
                        <?php } ?>
                    </div>
                </div><!-- .nav-links -->
            </div>
        <?php }
    }
    public function get_related_post(){
        $post_related_on = nexros()->get_theme_opt( 'post_related_on', false );

        if($post_related_on) {
            global $post;
            if (!$post) return;
            $current_id = $post->ID;
            $posttags = get_the_category($post->ID);
            if (empty($posttags)) return;

            $tags = array();

            foreach ($posttags as $tag) {

                $tags[] = $tag->term_id;
            }
            $post_number = '6';
            $query_similar = new WP_Query(array('posts_per_page' => $post_number, 'post_type' => 'post', 'post_status' => 'publish', 'category__in' => $tags,'post__not_in'   => [$current_id]));

            if (count($query_similar->posts) > 1) {
                wp_enqueue_script( 'swiper' );
                wp_enqueue_script( 'pxl-swiper' );
                $opts = [
                    'slide_direction'               => 'horizontal',
                    'slide_percolumn'               => '1', 
                    'slide_mode'                    => 'slide', 
                    'slides_to_show'                => 3, 
                    'slides_to_show_lg'             => 3, 
                    'slides_to_show_md'             => 2, 
                    'slides_to_show_sm'             => 2, 
                    'slides_to_show_xs'             => 1, 
                    'slides_to_scroll'              => 1, 
                    'slides_gutter'                 => 30, 
                    'arrow'                         => false,
                    'dots'                          => false,
                    'dots_style'                    => 'bullets'
                ];
                $data_settings = wp_json_encode($opts);
                $dir           = is_rtl() ? 'rtl' : 'ltr';

                $author_id = $post->post_author;
                $author = get_user_by('id', $author_id);

                ?>
                <div class="pxl-related-post">
                    <h3 class="widget-title"><?php echo esc_html__('Related Posts', 'nexros'); ?></h3>
                    <div class="pxl-swiper-container pxl-mouse-wheel" data-settings="<?php echo esc_attr($data_settings) ?>" data-rtl="<?php echo esc_attr($dir) ?>">
                        <div class="pxl-related-post-inner pxl-swiper-wrapper swiper-wrapper wow fadeIn" data-wow-delay="300ms" data-wow-duration="1.2s">
                            <?php foreach ($query_similar->posts as $post):
                                $thumbnail_url = '';
                                if (has_post_thumbnail(get_the_ID()) && wp_get_attachment_image_src(get_post_thumbnail_id($post->ID), false)) :
                                    $thumbnail_url = wp_get_attachment_image_src(get_post_thumbnail_id($post->ID), 'nexros-thumb-related', false);
                            endif;
                            if ($post->ID !== $current_id) : ?>
                                <div class="pxl-swiper-slide swiper-slide grid-item">
                                    <div class="pxl-post--inner">
                                        <?php if (has_post_thumbnail()) { ?>
                                            <div class="pxl-post--featured">
                                                <a href="<?php the_permalink(); ?>"><?php the_post_thumbnail('nexros-thumb-related'); ?></a>
                                            </div>
                                        <?php } ?>
                                        <div class="pxl-post--category">
                                            <?php the_terms( $post->ID, 'category', '', ' ' ); ?>
                                        </div>
                                        <h4 class="pxl-post--title">
                                            <a href="<?php the_permalink(); ?>"><?php the_title(); ?></a>
                                        </h4>
                                        <div class="pxl-post--content">
                                            <?php
                                            echo wp_trim_words( $post->post_excerpt, 17, null );
                                            ?>
                                        </div>
                                        <div class="pxl-post--meta pxl-flex-middle">
                                            <div class="pxl-item--author">
                                             <?php echo get_avatar($author_id, 'thumbnail'); ?>
                                             <?php echo esc_html__('post by','nexros') ?>
                                             <span>
                                                 <?php echo esc_html($author->display_name);?>
                                                 <span>
                                                 </div>
                                                 <div class="post-date">
                                                    <?php echo get_the_date('M d Y', $post->ID)  ?>
                                                </div>
                                                <div class="post-comments d-flex">
                                                    <a href="<?php echo get_comments_link($post->ID); ?>">
                                                        <span><?php comments_number(esc_html__('No Comments', 'nexros'), esc_html__(' 1 Comment', 'nexros'), esc_html__('%  Comments', 'nexros'), $post->ID); ?></span>
                                                    </a>
                                                </div>
                                            </div>
                                            <div class="pxl-post--button">
                                                <a class="btn--readmore" href="<?php echo esc_url(get_permalink( $post->ID )); ?>">
                                                    <span class="btn--text">
                                                        <?php echo esc_html__('Read More', 'nexros');?>
                                                    </span>
                                                    <span class="button-arrow-hover"><svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 9 9" fill="none">
                                                        <path d="M7.66931 2.276L1.93131 8.014L0.988647 7.07133L6.72597 1.33333H1.66931V0H9.00264V7.33333H7.66931V2.276Z" fill="#000"></path>
                                                    </svg><svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 9 9" fill="none">
                                                        <path d="M7.66931 2.276L1.93131 8.014L0.988647 7.07133L6.72597 1.33333H1.66931V0H9.00264V7.33333H7.66931V2.276Z" fill="#000"></path>
                                                    </svg></span>
                                                </a>
                                            </div>
                                        </div>
                                    </div>
                                <?php endif;
                            endforeach; ?>
                        </div>
                    </div>
                </div>
            <?php }
        }

        wp_reset_postdata();
    }
}

}