<?php if(class_exists('MC4WP_Container')) : ?>
	<div class="pxl-mailchimp pxl-mailchimp-l1 <?php echo esc_attr($settings['style']); ?>">
		<?php echo do_shortcode('[mc4wp_form]'); ?>
	</div>
<?php endif; ?>
