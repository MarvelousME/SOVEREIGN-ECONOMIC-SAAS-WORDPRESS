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
<div class="pxl-banner-box pxl-banner-box__style-5">
	<?php if ( ! empty( $settings['scl4_link']['url'] ) ) { ?><a <?php pxl_print_html($widget->get_render_attribute_string( 'scl4_link' )); ?> class="pxl-banner-box__link"><?php } ?> 
	<?php if ( ! empty( $settings['scl4_link']['url'] ) ) { ?></a><?php } ?>
		<div class="pxl-banner-box__top-feature">
			<?php
				if (!empty($settings['scl2_2_list'][0])) {
					$first_item = $settings['scl2_2_list'][0];
					$link_key = $widget->get_repeater_setting_key( 'scl2_2_link', 'links', 0 );
					if (!empty($first_item['scl2_2_link']['url'])) {
						$widget->set_render_attribute( $link_key, [
							'href' => $first_item['scl2_2_link']['url'],
							'target' => $first_item['scl2_2_link']['is_external'] ? '_blank' : '_self',
							'rel' => $first_item['scl2_2_link']['nofollow'] ? 'nofollow' : '',
						] );
					}
					$icon_key = $widget->get_repeater_setting_key( 'scl2_2_icon', 'icons', 0 );
					$widget->add_render_attribute( $icon_key, [
						'class' => $first_item['scl2_2_icon'],
						'aria-hidden' => 'true',
					] );
			?>
					<a <?php pxl_print_html($widget->get_render_attribute_string( $link_key )); ?> class="pxl-banner-box__feature-item elementor-repeater-item-<?php echo esc_attr($first_item['_id']); ?>">
						<?php \Elementor\Icons_Manager::render_icon( $first_item['scl2_2_icon'], [ 'aria-hidden' => 'true' ], 'i' ); ?>
					</a>
			<?php } ?>
			
			<?php
				if (count($settings['scl2_2_list']) > 1) {
					$remaining_items = array_slice($settings['scl2_2_list'], 1);
					$remaining_count = count($remaining_items);
					for ($i = 0; $i < $remaining_count; $i += 2) {
			?>
					<div class="pxl-banner-box__feature-group">
						<?php
							for ($j = 0; $j < 2; $j++) {
								if (!isset($remaining_items[$i + $j])) { break; }
								$item = $remaining_items[$i + $j];
								$actual_key = 1 + $i + $j; 
								$link_key = $widget->get_repeater_setting_key( 'scl2_2_link', 'links', $actual_key );
								if (!empty($item['scl2_2_link']['url'])) {
									$widget->set_render_attribute( $link_key, [
										'href' => $item['scl2_2_link']['url'],
										'target' => $item['scl2_2_link']['is_external'] ? '_blank' : '_self',
										'rel' => $item['scl2_2_link']['nofollow'] ? 'nofollow' : '',
									] );
								}
								$icon_key = $widget->get_repeater_setting_key( 'scl2_2_icon', 'icons', $actual_key );
								$widget->add_render_attribute( $icon_key, [
									'class' => $item['scl2_2_icon'],
									'aria-hidden' => 'true',
								] );
						?>
							<a <?php pxl_print_html($widget->get_render_attribute_string( $link_key )); ?> class="pxl-banner-box__feature-item elementor-repeater-item-<?php echo esc_attr($item['_id']); ?>">
								<?php \Elementor\Icons_Manager::render_icon( $item['scl2_2_icon'], [ 'aria-hidden' => 'true' ], 'i' ); ?>
							</a>
						<?php } ?>
					</div>
			<?php
					} 
				}
			?>
		</div>
</div>