<?php
    if ( ! empty( $settings['scl4_link']['url'] ) ) {
        $widget->add_render_attribute( 'scl4_link', 'href', $settings['scl4_link']['url'] );
    
        if ( $settings['scl4_link']['is_external'] ) {
            $widget->add_render_attribute( 'scl4_link', 'target', '_blank' );
        }
    
        if ( $settings['scl4_link']['nofollow'] ) {
            $widget->add_render_attribute( 'scl4_link', 'rel', 'nofollow' );
        }
    }
$is_new = \Elementor\Icons_Manager::is_migration_allowed();

?>
<div class="pxl-banner-box pxl-banner-box__style-4">
	<?php if ( ! empty( $settings['scl4_link']['url'] ) ) { ?><a <?php pxl_print_html($widget->get_render_attribute_string( 'scl4_link' )); ?> class="pxl-banner-box__link"><?php } ?> 
	<?php if ( ! empty( $settings['scl4_link']['url'] ) ) { ?></a><?php } ?>
	<div class="pxl-banner-box__top">
		<ul class="pxl-banner-box__top-feature">
			<?php
				foreach ($settings['scl4_fea'] as $key => $item):
					$icon_key = $widget->get_repeater_setting_key( 'scl4_icon', 'icons', $key );
					$widget->add_render_attribute( $icon_key, [
						'class' => $item['scl4_icon'],
						'aria-hidden' => 'true',
					] );
					 ?>
					<li class="pxl-banner-box__feature-item elementor-repeater-item-<?php echo esc_attr($item['_id']); ?>">
						<span class="pxl-banner-box__feature-item__icon">
							<?php \Elementor\Icons_Manager::render_icon( $item['scl4_icon'], [ 'aria-hidden' => 'true' ], 'i' ); ?>
						</span>
					</li>
			<?php endforeach; ?>
		</ul>
        <svg xmlns="http://www.w3.org/2000/svg" width="430" height="301" viewBox="0 0 430 301" fill="none">
        <circle cx="220" cy="151.023" r="149" stroke="#CDCDCD" stroke-dasharray="4 4"/>
        <circle cx="220" cy="151.023" r="104" stroke="#CDCDCD" stroke-dasharray="4 4"/>
        <path d="M1 111.023V165.023H71" stroke="#CDCDCD" stroke-dasharray="4 4"/>
        <path d="M24 235.023V165.023H71" stroke="#CDCDCD" stroke-dasharray="4 4"/>
        <path d="M429 180.023V122.023H369" stroke="#CDCDCD" stroke-dasharray="4 4"/>
        <path d="M369 122.023H399.776V72.0234H404" stroke="#CDCDCD" stroke-dasharray="4 4"/>
        </svg>
		<?php if (!empty($settings['scl4_content_icon']['value']) ) : ?>
        <div class="pxl-banner-box__top-icon">
            <?php \Elementor\Icons_Manager::render_icon( $settings['scl4_content_icon'], [ 'aria-hidden' => 'true', 'class' => '' ], 'i' ); ?>
        </div>
    <?php endif; ?>

	</div>
</div>