<div class="pxl-e-label <?php echo esc_attr($settings['pxl_animate']); ?>" data-wow-delay="<?php echo esc_attr($settings['pxl_animate_delay']); ?>ms">
	<?php if(!empty($settings['icon_image']['id'])) : 
	    $img  = pxl_get_image_by_size( array(
	        'attach_id'  => $settings['icon_image']['id'],
	        'thumb_size' => 'full',
	    ) );
	    $thumbnail    = $img['thumbnail'];
	    ?>
	    <div class="pxl-label--image">
	        <?php echo wp_kses_post($thumbnail); ?>
	    </div>
	<?php endif; ?>
    <label><?php echo pxl_print_html($settings['text']); ?></label>
</div>