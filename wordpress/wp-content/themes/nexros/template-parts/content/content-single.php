<?php
/**
 * Template part for displaying posts in loop
 *
 * @package Tnex-Themes
 */

if(has_post_thumbnail()){
    $content_inner_cls = 'single-post-inner has-post-thumbnail';
    $meta_class    = ''; 
} else {
    $content_inner_cls = 'single-post-inner  no-post-thumbnail';
    $meta_class = '';
}

if(class_exists('\Elementor\Plugin') && \Elementor\Plugin::$instance->documents->get( $id )->is_built_with_elementor()){
    $post_content_classes = 'single-elementor-content';
} else {
    $post_content_classes = '';
}
$sg_featured_img_size = nexros()->get_theme_opt('sg_featured_img_size', '1080x354');
$feature_image_display = nexros()->get_theme_opt('feature_image_display', 'hide');
$post_breadcrumb_on = nexros()->get_opt( 'post_breadcrumb_on', '1' ); 
?>
<article id="post-<?php the_ID(); ?>" <?php post_class('pxl-single-post'); ?>>
    <div class="<?php echo esc_attr($content_inner_cls);?>">
        <?php if($post_breadcrumb_on == '1') : ?>
            <div class="pxl-post--top">
                <?php if($post_breadcrumb_on == '1') : ?>
                    <?php nexros()->page->get_breadcrumb(); ?>
                <?php endif; ?>
                <?php nexros()->blog->get_post_title(); ?>     
                <?php
                nexros()->blog->get_post_metas();
                if (has_post_thumbnail()) {
                    //* thumbnail size is set full or custom
                    ?>
                    <div class="post-image post-featured">
                    </div>
                    <?php
                }
                ?>
            </div>
        <?php endif; ?>
        <?php if (has_post_thumbnail() && ($feature_image_display == 'show')) {
            $img  = pxl_get_image_by_size( array(
                'attach_id'  => get_post_thumbnail_id($post->ID),
                'thumb_size' => $sg_featured_img_size,
            ) );
            $thumbnail    = $img['thumbnail']; ?>
            <div class="pxl-item--image">
                <?php echo wp_kses_post($thumbnail); ?>
                <?php if(!empty($post_video_link)) : ?>
                    <a href="<?php echo esc_url($post_video_link); ?>" class="post-button-video pxl-action-popup"><i class="bi-play-fill"></i></a>
                <?php endif; ?>        
            </div>
        <?php } ?>
        <div class="post-content overflow-hidden">
            <div class="content-inner clearfix <?php echo esc_attr($post_content_classes);?>"><?php
            the_content();
        ?></div>
        <div class="<?php echo trim(implode(' ', ['navigation page-links clearfix empty-none'])); ?>"><?php 
        wp_link_pages(); 
    ?></div>
</div>
<?php
$post_tag = nexros()->get_theme_opt( 'post_tag', true );
$post_social_share = nexros()->get_theme_opt( 'post_social_share', false );
if ($post_tag == '1' || $post_social_share == '1'){
    ?>
    <div class="post-tags-share d-flex">
        <?php
        if ($post_tag == '1'){
            ?><div class="post-tags-wrap "><?php  nexros()->blog->get_post_tags(); ?></div><?php
        }
        if ($post_social_share == '1'){
            ?><div class="post-share-wrap "><?php nexros()->blog->get_post_share(); ?></div><?php
        }
        ?>
    </div>
    <div class="pxl-el-divider"></div>
    <?php
}
?>
</div>

<?php nexros()->blog->get_post_nav(); ?>
</article>