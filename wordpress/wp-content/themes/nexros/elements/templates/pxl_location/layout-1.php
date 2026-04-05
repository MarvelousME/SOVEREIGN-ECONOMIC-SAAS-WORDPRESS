<div class="pxl-location pxl-location1 <?php echo esc_attr($settings['pxl_animate']); ?>" data-wow-delay="<?php echo esc_attr($settings['pxl_animate_delay']); ?>ms">
    <?php
    if(!empty($settings['img']['id'])) : 
        $img  = pxl_get_image_by_size( array(
            'attach_id'  => $settings['img']['id'],
            'thumb_size' => 'full',
        ) );
        $thumbnail    = $img['thumbnail'];
        ?>
        <div class="pxl-image">
            <?php echo wp_kses_post($thumbnail); ?>
        </div>
    <?php endif; ?>
    <div class="pxl-list">
        <?php foreach ($settings['lists'] as $key => $value): ?>
            <div <?php if(!empty($value['id_l'])) : ?>id="<?php echo esc_attr($value['id_l']); ?>"<?php endif; ?> class="pxl--item elementor-repeater-item-<?php echo esc_attr($value['_id']); ?>">
                <?php if(!empty($value['content'])) : ?>
                    <span><?php echo pxl_print_html($value['content'])?></span>
                <?php endif; ?>
            </div>
        <?php endforeach; ?>
    </div>
</div>
