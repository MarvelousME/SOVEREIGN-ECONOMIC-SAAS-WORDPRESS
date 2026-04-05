<?php 
if ( ! empty( $settings['btn_link']['url'] ) ) {
    $widget->add_render_attribute( 'button', 'href', $settings['btn_link']['url'] );

    if ( $settings['btn_link']['is_external'] ) {
        $widget->add_render_attribute( 'button', 'target', '_blank' );
    }

    if ( $settings['btn_link']['nofollow'] ) {
        $widget->add_render_attribute( 'button', 'rel', 'nofollow' );
    }
}
if ( ! empty( $settings['btn_link2']['url'] ) ) {
    $widget->add_render_attribute( 'button2', 'href', $settings['btn_link2']['url'] );

    if ( $settings['btn_link2']['is_external'] ) {
        $widget->add_render_attribute( 'button2', 'target', '_blank' );
    }

    if ( $settings['btn_link2']['nofollow'] ) {
        $widget->add_render_attribute( 'button2', 'rel', 'nofollow' );
    }
}
?>
<div class="pxl-showcase pxl-showcase1  <?php if($settings['active'] == 'yes') { echo 'pxl-wg-active'; } ?>">
    <div class="pxl-item--inner">
        <?php if(!empty($settings['image']['id'])) :
            $img = pxl_get_image_by_size( array(
                'attach_id'  => $settings['image']['id'],
                'thumb_size' => 'full',
            ));
            $thumbnail = $img['thumbnail']; ?>
            <div class="pxl-item--image">
               <a <?php pxl_print_html($widget->get_render_attribute_string( 'button' )); ?>>
                <?php echo pxl_print_html($thumbnail); ?>
            </a>
            <div class="wrap-button">
                <?php if(!empty($settings['btn_text'])) : ?>
                    <div class="pxl-item--readmore ">
                        <a class="btn btn-glossy" <?php pxl_print_html($widget->get_render_attribute_string( 'button' )); ?>>
                            <span><?php echo esc_html($settings['btn_text']); ?></span>
                        </a>
                    </div>
                <?php endif; ?>

                <?php if(!empty($settings['btn_text2'])) : ?>
                    <div class="pxl-item--readmore ">
                        <a class="btn btn-glossy" <?php pxl_print_html($widget->get_render_attribute_string( 'button2' )); ?>>
                            <span><?php echo esc_html($settings['btn_text2']); ?></span>
                       </a>
                    </div>
                <?php endif; ?>
            </div>
            <div class="pxl-item--overlay"></div>
        </div>
    <?php endif; ?>
    
    <?php if(!empty($settings['title'])) : ?>
        <div class="pxl-item--title">
            <a <?php pxl_print_html($widget->get_render_attribute_string( 'button' )); ?>>
                <?php echo esc_html($settings['title']); ?>
            </a>
            <?php if($settings['hot'] == 'true' && $settings['new'] == 'true') : ?>
                <div class="showcase-status">
                    <?php if($settings['hot'] == 'true') : ?>
                        <span class="hot"><?php echo esc_html__('Hot', 'nexros'); ?></span>
                    <?php endif; ?>
                    <?php if($settings['new'] == 'true') : ?>
                        <span class="new"><?php echo esc_html__('New', 'nexros'); ?></span>
                    <?php endif; ?>
                </div>
            <?php endif; ?>
        </div>
    <?php endif; ?>
    <?php if($settings['active'] == 'yes' && !empty($settings['active_label']) && empty($settings['btn_text'])) : ?>
    <div class="pxl-item--label"><?php echo esc_html($settings['active_label']); ?></div>
<?php endif; ?>
</div>
</div>