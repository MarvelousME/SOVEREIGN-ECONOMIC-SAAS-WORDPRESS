<div class="pxl-iconbox">
	<span class="pxl-icon-container">
		<img src="<?php echo esc_url(get_template_directory_uri() . '/inc/admin/assets/img/check.png' ) ?>" alt="<?php esc_attr_e( 'Check', 'nexros' ); ?>">
	</span>
	<div class="pxl-iconbox-contents">
		<h6><?php esc_html_e( 'Enable Auto Updates', 'nexros' ); ?></h6>
		<p><?php esc_html_e( 'Smart Dashboard keeps your site up-to-date. Free for lifetime.', 'nexros' ); ?></p>
	</div>
</div>

<div class="pxl-iconbox">
	<span class="pxl-icon-container">
		<img src="<?php echo esc_url(get_template_directory_uri() . '/inc/admin/assets/img/check.png' ) ?>" alt="<?php esc_attr_e( 'Check', 'nexros' ); ?>">
	</span>
	<div class="pxl-iconbox-contents">
		<h6><?php esc_html_e( 'Exclusive and Premium Plugins', 'nexros' ); ?></h6>
		<p><?php esc_html_e( 'Get access to premium and exclusive plugins for free.', 'nexros' ); ?></p>
	</div>
</div>
<?php do_action('pxl_admin_dashboard_auto_update_theme'); ?>