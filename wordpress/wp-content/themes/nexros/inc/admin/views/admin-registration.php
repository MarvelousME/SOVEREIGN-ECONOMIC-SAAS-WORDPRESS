<?php
	$dev_mode = (defined('DEV_MODE') && DEV_MODE); 
	 
	$license = trim( get_option( nexros()->get_slug() . '_purchase_code' ) );

	$active = get_option( nexros()->get_slug() . '_purchase_code_status', false ) === 'valid';
	if( $dev_mode === true) $active = true;

	$register = new Nexros_Register;

	$pxl_server_info = apply_filters( 'pxl_server_info', ['docs_url' => 'https://doc.tnexthemes.com/nexros/', 'support_url' => 'mailto:tnexthemes@gmail.com'] ) ; 

?>
<?php if ($active): ?> 
	<div class="pxl-dsb-box-head"> 
		<div class="pxl-dsb-confirmation success">
			<h6><?php echo esc_html__( 'Thanks for the verification!', 'nexros' ) ?></h6>
			<p><?php echo esc_html__( 'You can now enjoy and build great websites. Looking for help? Visit', 'nexros' ) ?> <a href="<?php echo esc_url($pxl_server_info['support_url']) ?>" target="_blank"><?php echo esc_html__( 'submit a ticket', 'nexros' ) ?></a>.</p>
		</div> 

		<div class="pxl-dsb-deactive">
			<form method="POST" action="<?php echo admin_url( 'admin.php?page=pxlart' )?>">
				<input type="hidden" name="action" value="removekey"/>
				<button class="btn button" type="submit"><?php esc_html_e( 'Remove Purchase Code', 'nexros' ) ?></button>
			</form>
		</div> 
	</div> 
<?php else: ?>
	<?php $register->messages(); ?>
	  
<?php endif; ?>
 