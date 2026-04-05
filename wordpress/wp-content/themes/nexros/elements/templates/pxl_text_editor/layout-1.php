<?php
$editor_content = $widget->get_settings_for_display( 'text_ed' );
$editor_content = $widget->parse_text_editor( $editor_content );
?>
<div class="pxl-text-editor <?php echo esc_attr($settings['style_hv']); ?>">
	<div class="pxl-item--inner <?php echo esc_attr($settings['pxl_animate']); ?> <?php echo esc_attr($settings['custom_font']); ?>" data-wow-delay="<?php echo esc_attr($settings['pxl_animate_delay']); ?>ms">
		<?php echo wp_kses_post($editor_content); ?>		
	</div>
</div>