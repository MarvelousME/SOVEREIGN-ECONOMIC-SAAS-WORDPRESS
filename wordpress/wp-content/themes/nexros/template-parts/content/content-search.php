<?php
/**
 * @package Nexros
 */

$archive_readmore_text = nexros()->get_theme_opt('archive_readmore_text', esc_html__('Continue Reading', 'nexros'));
$post_social_share = nexros()->get_theme_opt( 'post_social_share', false );
$archive_social = nexros()->get_theme_opt('archive_social', true);
$featured_video = get_post_meta( get_the_ID(), 'featured-video-url', true );
$audio_url = get_post_meta( get_the_ID(), 'featured-audio-url', true );
?>
<article id="post-<?php the_ID(); ?>" <?php post_class('pxl-archive-post'); ?>>
    <div class="content-inner-post">
        <?php if (has_post_thumbnail()) {
            $archive_date = nexros()->get_theme_opt( 'archive_date', true );
            ?>
            <div class="post-featured">
                <?php
                if (has_post_format('quote')){
                    $quote_text = get_post_meta( get_the_ID(), 'featured-quote-text', true );
                    $quote_cite = get_post_meta( get_the_ID(), 'featured-quote-cite', true );
                    ?>
                    <div class="format-wrap">
                        <div class="quote-inner">
                            <div class="content-top">
                                <div class="link-icon">
                                    <a href="<?php echo esc_url( get_permalink()); ?>" title="<?php the_title_attribute(); ?>">
                                       <span>“</span>
                                   </a>
                               </div>
                               <div class="content-right">
                                <?php nexros()->blog->get_archive_meta_2(); ?>
                                <div class="quote-text">
                                    <a href="<?php echo esc_url( get_permalink()); ?>"><?php echo esc_html($quote_text);?></a>
                                </div>
                            </div>
                        </div>

                        <?php
                        if (!empty($quote_cite)){
                            ?>
                            <p class="quote-cite">
                                <?php echo esc_html($quote_cite);?>
                            </p>
                            <?php
                        }
                        ?>
                    </div>
                </div>
                <?php
            }elseif (has_post_format('link')){
                $link_url = get_post_meta( get_the_ID(), 'featured-link-url', true );
                $link_text = get_post_meta( get_the_ID(), 'featured-link-text', true );
                ?>
                <div class="format-wrap">
                    <div class="link-inner">
                        <div class="content-top">
                            <div class="link-icon">
                                <a href="<?php echo esc_url( $link_url); ?>">
                                    <svg version="1.1" id="Glyph" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"
                                    viewBox="0 0 512 512" style="enable-background:new 0 0 512 512;" xml:space="preserve">
                                    <path d="M192.5,240.5c20.7-21,56-23,79,0h0.2c6.4,6.4,11,14.2,13.8,22.6c6.7-1.1,12.6-4,17.1-8.5l22.1-21.9
                                    c-5-9.6-11.4-18.4-19-26.2c-42-41.1-106.9-40-147.2,0l-80,80c-40.6,40.9-40.6,106.3,0,147.2c40.9,40.6,106.3,40.6,147.2,0l75.4-75.4
                                    c-22,3.6-43.1,1.6-62.7-5.3l-46.7,46.6c-21.1,21.3-57.9,21.3-79.2,0c-21.8-21.8-21.8-57.3,0-79C113.9,318.9,197.8,235.1,192.5,240.5
                                    L192.5,240.5z"/>
                                    <path d="M319.5,271.5c-21,21.3-56.3,22.7-79,0c-0.2,0-0.2,0-0.2,0c-6.4-6.4-11-14.2-13.8-22.6c-6.7,1.1-12.6,4-17.1,8.5l-22.1,21.9
                                    c5,9.6,11.4,18.4,19,26.2c42,41.1,106.9,40,147.2,0l80-80c40.6-40.9,40.6-106.3,0-147.2c-40.9-40.6-106.3-40.6-147.2,0L211,153.8
                                    c22-3.6,43.1-1.6,62.7,5.3l46.7-46.6c21.1-21.3,57.9-21.3,79.2,0c21.8,21.8,21.8,57.3,0,79C398.1,193.1,314.2,276.9,319.5,271.5
                                    L319.5,271.5z"/>
                                </svg>
                            </a>
                        </div>
                        <div class="content-right">
                            <?php nexros()->blog->get_archive_meta_2(); ?>
                            <h4 class="post-title">
                                <a href="<?php echo esc_url( get_permalink()); ?>" title="<?php the_title_attribute(); ?>">
                                    <?php if(is_sticky()) { ?>
                                        <i class="bi-check"></i>
                                    <?php } ?>
                                    <?php the_title(); ?>
                                </a>
                            </h4>
                        </div>
                    </div>

                    <div class="link-text">
                        <a class="link-text" target="_blank" href="<?php echo esc_url( $link_url); ?>"><?php echo esc_html($link_text);?></a>
                    </div>
                </div>
            </div>
            <?php
        }elseif (has_post_format('video')){
            if (has_post_thumbnail()) {
                ?>
                <div class="format-wrap">
                    <div class="pxl-item--image">
                        <a href="<?php echo esc_url( get_permalink()); ?>"><?php the_post_thumbnail('full'); ?></a>
                        <?php
                        if (!empty($featured_video)){
                            ?>
                            <div class="pxl-video-popup">
                                <div class="content-inner">
                                    <a class="video-play-button pxl-action-popup" href="<?php echo esc_url($featured_video); ?>">
                                        <i class="bi-play-fill"></i>
                                    </a>
                                </div>
                            </div>
                            <?php
                        }?>
                    </div>
                </div>
                <?php
            }
        }elseif ( !empty($audio_url) && has_post_format('audio')) {
            global $wp_embed;
            pxl_print_html($wp_embed->run_shortcode('[embed]' . $audio_url . '[/embed]'));
        }else{
            ?>
            <div class="pxl-item--image">
                <a href="<?php echo esc_url( get_permalink()); ?>"><?php the_post_thumbnail('full'); ?></a>
            </div>
            <?php
        }
        ?>
    </div>
<?php } ?>
<?php
if (!has_post_format('link') && !has_post_format('quote')){
    ?>
    <div class="post-content">
        <?php nexros()->blog->get_post_category(); ?>
        <h4 class="post-title">
            <a href="<?php echo esc_url( get_permalink()); ?>" title="<?php the_title_attribute(); ?>">
                <?php if(is_sticky()) { ?>
                    <i class="bi-check"></i>
                <?php } ?>
                <?php the_title(); ?>
            </a>
        </h4>
        <div class="pxl-divider"></div>
        <div class="post-excerpt">
            <?php
            nexros()->blog->get_excerpt(50);
            wp_link_pages( array(
                'before'      => '<div class="page-links">',
                'after'       => '</div>',
                'link_before' => '<span>',
                'link_after'  => '</span>',
            ) );
            ?>
        </div>
        <?php nexros()->blog->get_archive_meta(); ?>
        <?php
        if (!empty($archive_readmore_text) || $post_social_share == '1'){
            ?>
            <div class="post-btn-wrap">
                <?php
                if (!empty($archive_readmore_text)){
                    ?>
                    <a class="btn-more" href="<?php echo esc_url( get_permalink()); ?>">
                        <span><?php echo esc_html($archive_readmore_text); ?></span>
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                          <g clip-path="url(#clip0_224_2968)">
                            <path d="M17.7721 12.477L19.8245 10.4246C19.9369 10.3119 20 10.1592 20 10C20 9.84085 19.9369 9.68817 19.8245 9.57548L17.7721 7.5231C17.68 7.43332 17.5562 7.38345 17.4275 7.38429C17.2989 7.38512 17.1757 7.43659 17.0848 7.52755C16.9938 7.61851 16.9423 7.74164 16.9414 7.87028C16.9406 7.99893 16.9904 8.12273 17.0802 8.21489L18.376 9.51071H0.489219C0.35947 9.51071 0.235035 9.56226 0.143289 9.654C0.0515425 9.74575 0 9.87018 0 9.99993C0 10.1297 0.0515425 10.2541 0.143289 10.3459C0.235035 10.4376 0.35947 10.4892 0.489219 10.4892H18.3759L17.0802 11.7852C16.9896 11.8772 16.939 12.0013 16.9395 12.1304C16.94 12.2595 16.9915 12.3832 17.0828 12.4744C17.1741 12.5657 17.2978 12.6173 17.4269 12.6178C17.556 12.6183 17.6801 12.5677 17.7721 12.4771V12.477Z" fill="black"/>
                        </g>
                        <defs>
                            <clipPath id="clip0_224_2968">
                              <rect width="20" height="20" fill="white"/>
                          </clipPath>
                      </defs>
                  </svg>
              </a>
          <?php } ?>
          <?php 
          if ($post_social_share == '1' && $archive_social){
            ?><div class="post-share-wrap "><?php nexros()->blog->get_post_share(); ?></div><?php
        } ?>
    </div>
    <?php
}
?>
</div>
<?php
}
?>
</div>
</article>