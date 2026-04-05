<div class="pxl-info-box1 <?php echo esc_attr($settings['pxl_animate']); ?>" data-wow-delay="<?php echo esc_attr($settings['pxl_animate_delay']); ?>ms">
	<?php if (!empty($settings['number'])) { ?>
		<h5 class="pxl-number"><?php echo pxl_print_html($settings['number']); ?></h5>
	<?php } ?>
	<?php if (!empty($settings['title'])) { ?>
		<h5 class="pxl-title"><?php echo pxl_print_html($settings['title']); ?></h5>
	<?php } ?>
	<?php if (!empty($settings['desc'])) { ?>
		<p class="pxl-desc"><?php echo pxl_print_html($settings['desc']); ?></p>
	<?php } ?>
</div>