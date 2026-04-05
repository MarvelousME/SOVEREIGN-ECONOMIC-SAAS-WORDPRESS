<?php if($settings['search_type'] == 'popup') : ?>
	<div class="pxl-search-popup-button pxl-cursor--cta <?php echo esc_attr($settings['style']); ?>">
		<?php if(!empty($settings['pxl_icon']['value'])) {
			\Elementor\Icons_Manager::render_icon( $settings['pxl_icon'], [ 'aria-hidden' => 'true', 'class' => '' ], 'i' );
		} else  if ( !empty($settings['image']['id']) ) { 
			$image_size = !empty($settings['img_size']) ? $settings['img_size'] : 'full';
			$img  = pxl_get_image_by_size( array(
				'attach_id'  => $settings['image']['id'],
				'thumb_size' => $image_size,
			) );
			$thumbnail    = $img['thumbnail'];
			$thumbnail_url    = $img['url'];
			?>
			<?php echo wp_kses_post($thumbnail);}
			else{ ?>
				<svg xmlns="http://www.w3.org/2000/svg" width="24" height="25" viewBox="0 0 24 25" fill="none">
					<g clip-path="url(#clip0_224_2225)">
						<path d="M10.5691 0.491112C4.74145 0.491112 0 5.23256 0 11.0602C0 16.8882 4.74145 21.6293 10.5691 21.6293C16.3971 21.6293 21.1382 16.8882 21.1382 11.0602C21.1382 5.23256 16.3971 0.491112 10.5691 0.491112ZM10.5691 19.6781C5.81723 19.6781 1.95122 15.8121 1.95122 11.0603C1.95122 6.30839 5.81723 2.44233 10.5691 2.44233C15.321 2.44233 19.187 6.30835 19.187 11.0602C19.187 15.8121 15.321 19.6781 10.5691 19.6781Z" fill="black"/>
						<path d="M23.7142 22.8257L18.1207 17.2322C17.7395 16.8511 17.1223 16.8511 16.7411 17.2322C16.36 17.6131 16.36 18.231 16.7411 18.6118L22.3346 24.2053C22.5252 24.3958 22.7746 24.4911 23.0244 24.4911C23.2738 24.4911 23.5236 24.3958 23.7142 24.2053C24.0953 23.8245 24.0953 23.2065 23.7142 22.8257Z" fill="black"/>
					</g>
					<defs>
						<clipPath id="clip0_224_2225">
							<rect width="24" height="24" fill="white" transform="translate(0 0.490921)"/>
						</clipPath>
					</defs>
				</svg>
			<?php } ?>
		</div>

		<?php add_action( 'pxl_anchor_target', 'nexros_hook_anchor_search'); ?>
	<?php endif; ?>

	<?php if($settings['search_type'] == 'form') : ?>
		<form role="search" method="get" class="pxl-widget-searchform" action="<?php echo esc_url(home_url( '/' )); ?>">
			<div class="searchform-wrap">
				<input type="text" placeholder="<?php if(!empty($settings['email_placefolder'])) { echo esc_attr($settings['email_placefolder']); } else { esc_attr_e('Search...', 'nexros'); } ?>" name="s" class="search-field" />
				<button type="submit" class="search-submit"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="25" viewBox="0 0 24 25" fill="none">
					<g clip-path="url(#clip0_224_2225)">
						<path d="M10.5691 0.491112C4.74145 0.491112 0 5.23256 0 11.0602C0 16.8882 4.74145 21.6293 10.5691 21.6293C16.3971 21.6293 21.1382 16.8882 21.1382 11.0602C21.1382 5.23256 16.3971 0.491112 10.5691 0.491112ZM10.5691 19.6781C5.81723 19.6781 1.95122 15.8121 1.95122 11.0603C1.95122 6.30839 5.81723 2.44233 10.5691 2.44233C15.321 2.44233 19.187 6.30835 19.187 11.0602C19.187 15.8121 15.321 19.6781 10.5691 19.6781Z" fill="black"/>
						<path d="M23.7142 22.8257L18.1207 17.2322C17.7395 16.8511 17.1223 16.8511 16.7411 17.2322C16.36 17.6131 16.36 18.231 16.7411 18.6118L22.3346 24.2053C22.5252 24.3958 22.7746 24.4911 23.0244 24.4911C23.2738 24.4911 23.5236 24.3958 23.7142 24.2053C24.0953 23.8245 24.0953 23.2065 23.7142 22.8257Z" fill="black"/>
					</g>
					<defs>
						<clipPath id="clip0_224_2225">
							<rect width="24" height="24" fill="white" transform="translate(0 0.490921)"/>
						</clipPath>
					</defs>
				</svg></button>
			</div>
		</form>
	<?php endif; ?>
