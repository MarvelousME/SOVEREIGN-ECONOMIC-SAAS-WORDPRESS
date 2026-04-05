<?php 
$img_size = '';
if(!empty($settings['img_size'])) {
    $img_size = $settings['img_size'];
} else {
    $img_size = 'full';
}
?>
<div class="pxl-video-player pxl-video-player1 pxl-video-<?php echo esc_attr($settings['btn_video_style']); ?> <?php echo esc_attr($settings['pxl_animate']); ?>" data-wow-delay="<?php echo esc_attr($settings['pxl_animate_delay']); ?>ms">
    <div class="pxl-video--inner ">
        <?php if( $settings['image_type'] != 'none' && !empty( $settings['image']['url'] ) ) : 
            $img  = pxl_get_image_by_size( array(
                'attach_id'  => $settings['image']['id'],
                'thumb_size' => $img_size,
            ) );
            $thumbnail    = $img['thumbnail'];
            ?>
            <div class="pxl-video--holder">
                <?php if ($settings['image_type'] == 'img') { ?>
                    <?php if ( ! empty( $settings['image']['url'] ) ) { echo wp_kses_post($thumbnail); } ?>
                <?php } else { ?>
                    <div class="pxl-video--imagebg">
                        <div class="bg-image <?php echo esc_attr($settings['box_style']); ?>" data-parallax='{"y":<?php if ($settings['box_style']=='parallax') {echo esc_attr('-60');} ?>}' style="background-image: url(<?php echo esc_url($settings['image']['url']); ?>);"></div>
                    </div>
                <?php } ?>
            </div>
        <?php endif; ?>
        <?php if(!empty($settings['video_link'])) : ?>
            <div class="btn-video-wrap  el-parallax-wrap <?php echo esc_attr($settings['btn_video_position']); ?>">
                <a class="pxl-btn-video pxl-action-popup el-parallax-item <?php echo esc_attr($settings['btn_video_style']); ?>" href="<?php echo esc_url($settings['video_link']); ?>">
                    <?php if ( !empty($settings['video_icon']['value']) ) { ?>
                        <?php \Elementor\Icons_Manager::render_icon( $settings['video_icon'], [ 'aria-hidden' => 'true', 'class' => '' ], 'i' ); ?>
                    <?php } else { ?>
                        <i class="bi-play-fill"></i>
                    <?php } ?>
                    <?php if ($settings['btn_video_style'] == 'style-progressbar'): ?>
                        <svg class="circle-svg" viewBox="0 0 100 100">
                            <circle class="circle-bg" cx="50" cy="50" r="45"></circle>
                            <circle class="circle-progress" cx="50" cy="50" r="45"></circle>
                        </svg>
                    <?php endif; ?>
                </a>
                <?php if (!empty($settings['label'])): ?>
                <span class="label-text">
                    <?php echo pxl_print_html($settings['label']);?>
                </span>
                <?php endif ?>
            </div>
        <?php endif; ?>
    </div>
</div>