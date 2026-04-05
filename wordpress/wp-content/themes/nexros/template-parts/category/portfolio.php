<?php
/**
 * @package Tnex-Themes
 */
?>
<article id="post-<?php the_ID(); ?>" <?php post_class('col-lg-4 col-md-6 col-sm-12'); ?>>
    <div class="pxl-item--inner">
        <?php if (has_post_thumbnail()) {
            echo '<div class="pxl-item--featured">'; ?>
                <a href="<?php echo esc_url( get_permalink()); ?>"><?php the_post_thumbnail('nexros-portfolio'); ?></a>
            <?php echo '</div>';
        } ?>
        <div class="pxl-item--holder pxl-pr-50">
            <h5 class="pxl-item--title">
                <a href="<?php echo esc_url( get_permalink()); ?>" title="<?php the_title(); ?>">
                    <?php echo esc_attr(get_the_title($post->ID)); ?>
                </a>
            </h5>
            <div class="pxl-item--button pxl-r-0">
                <a href="<?php echo esc_url( get_permalink()); ?>" title="<?php the_title(); ?>"><i class="bi-arrow-up-right rtl-reverse"></i></a>
            </div>
        </div>
    </div>
</article>