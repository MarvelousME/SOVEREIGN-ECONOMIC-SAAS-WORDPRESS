<?php 
if ( ! empty( $settings['image_link']['url'] ) ) {
    $widget->add_render_attribute( 'image_link', 'href', $settings['image_link']['url'] );

    if ( $settings['image_link']['is_external'] ) {
        $widget->add_render_attribute( 'image_link', 'target', '_blank' );
    }

    if ( $settings['image_link']['nofollow'] ) {
        $widget->add_render_attribute( 'image_link', 'rel', 'nofollow' );
    }
}
$html_id = pxl_get_element_id($settings); 
if($settings['img_effect'] == 'pxl-image-parallax') { wp_enqueue_script( 'pxl-parallax-move-mouse'); }
?>
<div id="<?php echo esc_attr($html_id) ?>" class="pxl-image-single  <?php if($settings['hide_parallax_sm'] == 'true') { echo 'pxl-disable-parallax-sm'; } ?> <?php if($settings['img_display'] == 'true') { echo 'pxl-hide-sr-lg'; } ?> <?php if(!empty($settings['img_effect'])) { echo esc_attr($settings['img_effect']); } ?> <?php echo esc_attr($settings['pxl_animate']); ?>" data-wow-delay="<?php echo esc_attr($settings['pxl_animate_delay']); ?>ms" <?php if($settings['img_effect'] == 'pxl-image-tilt') : ?>data-maxtilt="<?php echo esc_attr($settings['max_tilt']); ?>" data-speedtilt="<?php echo esc_attr($settings['speed_tilt']); ?>" data-perspectivetilt="<?php echo esc_attr($settings['perspective_tilt']); ?>"<?php endif; ?> <?php if($settings['img_effect'] == 'pxl-parallax-scroll') : ?>data-parallax='{"<?php echo esc_attr($settings['parallax_scroll_type']); ?>":<?php echo esc_attr($settings['parallax_scroll_value_x']); ?>}'<?php endif; ?>>
    <div class="pxl-item--inner <?php if($settings['img_effect'] == 'pxl-image-border') : ?>wow<?php endif;?>" data-wow-delay="120ms">
        <?php if($settings['source_type'] == 's_img' && !empty($settings['image']['id']) || $settings['source_type'] == 'f_img' && has_post_thumbnail()) : 
        $image_size = !empty($settings['img_size']) ? $settings['img_size'] : 'full';
        if(!empty($settings['image']['id'])) : $img_id = $settings['image']['id']; endif;
        if ($settings['source_type'] == 'f_img' && has_post_thumbnail()) {
            $img_id = get_post_thumbnail_id(get_the_ID());
        }
        $img  = pxl_get_image_by_size( array(
            'attach_id'  => $img_id,
            'thumb_size' => $image_size,
            'class' => 'no-lazyload'
        ) );
        $thumbnail    = $img['thumbnail'];
        $thumbnail_url    = $img['url']; ?>

        <?php switch ($settings['image_type']) {
            case 'bg': ?>
            <div class="pxl-item--bg bg-image " style="background-image: url(<?php echo esc_url($thumbnail_url); ?>);">
            </div>
            <?php break;

            default: ?>
            <div class="pxl-item--image " data-parallax-value="<?php echo esc_attr($settings['parallax_value']); ?>">
                <?php if ( ! empty( $settings['image_link']['url'] ) ) { ?><a <?php pxl_print_html($widget->get_render_attribute_string( 'image_link' )); ?>><?php } ?>
                <?php if ( ! empty( $img_id ) ) { echo wp_kses_post($thumbnail); } ?>
                <?php if ( ! empty( $settings['image_link']['url'] ) ) { ?></a><?php } ?>
            </div>
            <?php break;
        } ?>
    <?php endif; ?>

    <?php if(is_singular('service') && $settings['source_type'] == 'f_img' && has_post_thumbnail()) : 
    $service_icon_type = get_post_meta(get_the_ID(), 'service_icon_type', true);
    $service_icon_font = get_post_meta(get_the_ID(), 'service_icon_font', true);
    $service_icon_img = get_post_meta(get_the_ID(), 'service_icon_img', true); ?>
    <?php if($service_icon_type == 'icon' && !empty($service_icon_font)) : ?>
        <div class="pxl-service--icon">
            <i class="<?php echo esc_attr($service_icon_font); ?>"></i>
        </div>
    <?php endif; ?>
    <?php if($service_icon_type == 'image' && !empty($service_icon_img)) : 
        $icon_img = pxl_get_image_by_size( array(
            'attach_id'  => $service_icon_img['id'],
            'thumb_size' => 'full',
        ));
        $icon_thumbnail = $icon_img['thumbnail'];
        ?>
        <div class="pxl-service--icon">
            <?php echo wp_kses_post($icon_thumbnail); ?>
        </div>
    <?php endif; ?>
<?php endif; ?>
<?php if($settings['img_effect'] == 'pxl-image-border') : ?>
    <div class="pxl-divide--group">
        <div class="pxl-item--divider pxl-divider--top"></div>
        <div class="pxl-item--divider pxl-divider--right"></div>
        <div class="pxl-item--divider pxl-divider--bottom"></div>
        <div class="pxl-divider--box"><div class="pxl-item--divider pxl-divider--left1"></div></div>
        <div class="pxl-item--divider pxl-divider--left2"></div>
    </div>
<?php endif; ?>
</div>
</div>