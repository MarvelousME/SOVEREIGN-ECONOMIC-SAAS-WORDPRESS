<?php
    if ( ! empty( $settings['scl3_link']['url'] ) ) {
        $widget->add_render_attribute( 'scl3_link', 'href', $settings['scl3_link']['url'] );
    
        if ( $settings['scl3_link']['is_external'] ) {
            $widget->add_render_attribute( 'scl3_link', 'target', '_blank' );
        }
    
        if ( $settings['scl3_link']['nofollow'] ) {
            $widget->add_render_attribute( 'scl3_link', 'rel', 'nofollow' );
        }
    }
$is_new = \Elementor\Icons_Manager::is_migration_allowed();

?>
<div class="pxl-banner-box pxl-banner-box__style-3">
	<?php if ( ! empty( $settings['scl3_link']['url'] ) ) { ?><a <?php pxl_print_html($widget->get_render_attribute_string( 'scl3_link' )); ?> class="pxl-banner-box__link"><?php } ?> 
	<?php if ( ! empty( $settings['scl3_link']['url'] ) ) { ?></a><?php } ?>
	<div class="pxl-banner-box__top">
		<ul class="pxl-banner-box__top-feature">
			<?php
				foreach ($settings['scl3_fea'] as $key => $item):
					$icon_key = $widget->get_repeater_setting_key( 'scl3_icon', 'icons', $key );
					$widget->add_render_attribute( $icon_key, [
						'class' => $item['scl3_icon'],
						'aria-hidden' => 'true',
					] );
					 ?>
					<li class="pxl-banner-box__feature-item elementor-repeater-item-<?php echo esc_attr($item['_id']); ?>">
						<span class="pxl-banner-box__feature-item__icon">
							<?php \Elementor\Icons_Manager::render_icon( $item['scl3_icon'], [ 'aria-hidden' => 'true' ], 'i' ); ?>
						</span>
                        <span class="pxl-banner-box__feature-item__title"><?php echo esc_html($item['scl3_title']); ?></span>
					</li>
			<?php endforeach; ?>
		</ul>
        <svg xmlns="http://www.w3.org/2000/svg" width="218" height="147" viewBox="0 0 218 147" fill="none">
            <g clip-path="url(#clip0_687_387)">
                <path d="M80.5 0.986328H92.8097C99.4372 0.986328 104.81 6.35891 104.81 12.9863V36.1221C104.81 40.731 108.546 44.4672 113.155 44.4672V44.4672C117.764 44.4672 121.5 48.2035 121.5 52.8124V64.9863" stroke="url(#paint0_linear_687_387)" stroke-width="1.5"/>
                <path d="M183.5 146H146.739H133.5C126.873 146 121.5 140.627 121.5 134V90.9695V77.9847V65" stroke="url(#paint1_linear_687_387)" stroke-width="1.5"/>
                <path d="M0.5 101V78C0.5 71.3726 5.87258 66 12.5 66H39.7649H79.4305H84.2384H121.5" stroke="url(#paint2_linear_687_387)" stroke-width="1.5"/>
                <path d="M217.5 34H213.896C207.269 34 201.896 39.3726 201.896 46V54C201.896 60.6274 196.523 66 189.896 66H162.88H158.151H121.5" stroke="url(#paint3_linear_687_387)" stroke-width="1.5"/>
            </g>
            <defs>
                <linearGradient id="paint0_linear_687_387" x1="122.939" y1="60.4863" x2="65.2779" y2="2.26876" gradientUnits="userSpaceOnUse">
                <stop stop-color="#115461"/>
                <stop offset="1" stop-color="#115461" stop-opacity="0"/>
                </linearGradient>
                <linearGradient id="paint1_linear_687_387" x1="119.325" y1="70.6953" x2="191.039" y2="157.209" gradientUnits="userSpaceOnUse">
                <stop stop-color="#115461"/>
                <stop offset="1" stop-color="#115461" stop-opacity="0"/>
                </linearGradient>
                <linearGradient id="paint2_linear_687_387" x1="125.746" y1="98.5391" x2="114.548" y2="37.5249" gradientUnits="userSpaceOnUse">
                <stop stop-color="#115461"/>
                <stop offset="1" stop-color="#115461" stop-opacity="0"/>
                </linearGradient>
                <linearGradient id="paint3_linear_687_387" x1="118.132" y1="63.75" x2="129.805" y2="8.55555" gradientUnits="userSpaceOnUse">
                <stop stop-color="#115461"/>
                <stop offset="1" stop-color="#115461" stop-opacity="0"/>
                </linearGradient>
                <clipPath id="clip0_687_387">
                <rect width="218" height="147" fill="white"/>
                </clipPath>
            </defs>
        </svg>
	</div>
</div>