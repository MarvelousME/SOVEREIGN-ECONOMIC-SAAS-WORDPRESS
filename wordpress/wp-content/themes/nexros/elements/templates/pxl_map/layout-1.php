<?php
$image_size = !empty($settings['img_size']) ? $settings['img_size'] : 'full';
$img  = pxl_get_image_by_size( array(
    'attach_id'  => $settings['image']['id'],
    'thumb_size' => $image_size,
    'class' => 'no-lazyload'
) );
$thumbnail    = $img['thumbnail'];
?>
<div class="pxl-item--inner">
    <?php echo wp_kses_post($thumbnail);  ?>
</div>
<?php
if(isset($settings['link']) && !empty($settings['link']) && count($settings['link'])): ?>
    <ul class="pxl-map">
        <?php
        foreach ($settings['link'] as $key => $link):
            $item_cls = [ 'elementor-repeater-item-'.$link['_id'] ];
            $image_size = !empty($link['image_size']) ? $link['image_size'] : '80x80';
            $thumbnail = '';
            if (!empty($link['image']['id'])) {
                $img = pxl_get_image_by_size( array(
                    'attach_id'  => $link['image']['id'],
                    'thumb_size' => $image_size,
                    'class' => 'no-lazyload'
                ) );
                $thumbnail = $img['thumbnail'];
            }
            $link_key = $widget->get_repeater_setting_key( 'link', 'value', $key );
            if ( ! empty( $link['link']['url'] ) ) {
                $widget->add_render_attribute( $link_key, 'href', $link['link']['url'] );
                if ( $link['link']['is_external'] ) {
                    $widget->add_render_attribute( $link_key, 'target', '_blank' );
                }
                if ( $link['link']['nofollow'] ) {
                    $widget->add_render_attribute( $link_key, 'rel', 'nofollow' );
                }
            }
            $link_attributes = $widget->get_render_attribute_string( $link_key );
            ?>
            <?php if(in_array($link['type_position'], ['top-left', 'top-right', 'bottom-left', 'bottom-right'])) : ?>
                <li class="<?php echo implode(' ', $item_cls) ?>">
                    <a <?php echo implode( ' ', [ $link_attributes ] ); ?>>
                        <span><?php echo pxl_print_html($link['text']); ?></span>
                        <?php echo wp_kses_post($thumbnail); ?>
                    </a>
                    <div class="de-circle-1"></div>
                    <div class="de-circle-2"></div>
                </li>
            <?php endif; ?>
    <?php endforeach; ?>
</ul>
<?php endif; ?>
