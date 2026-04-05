<?php
/**
 * The template for displaying login form.
 *
 * Override this template by copying it to yourtheme/tnex-user/layoutname/form-login.php
 *
 * @author 		Tnex User
 * @version     1.0.0
 */

if (! defined ( 'ABSPATH' )) {
	exit ();
}
$link_forgot_password = '';
if(class_exists('WooCommerce') ) {
    $link_forgot_password = wp_lostpassword_url();
} else {
	$link_forgot_password = get_site_url().'/wp-login.php?action=lostpassword';
}
?>
<div class="pxl-user-form-body pxl-user-form-login">
	<div class="login-form" >
		<div class="fields-content">
			<div class="field-group">
				<input id="user" type="text" class="input user_name" placeholder="<?php esc_html_e('Username or Email', 'tnex-user'); ?>" data-validate="<?php esc_html_e('Required Field', 'tnex-user'); ?>">
			</div>
			<div class="field-group">
				<input id="pass" type="password" class="input password" placeholder="<?php esc_html_e('Password', 'tnex-user'); ?>" data-validate="<?php esc_html_e('Required Field', 'tnex-user'); ?>">
				<i id="showPasswordIcon" class="fas fa-eye"></i>
			</div>
			<div class="field-group field-dflex">
				<div class="field-rememberme">
					<input type="checkbox"  name="rememberme" value="forever">
					<label><?php esc_html_e('Remember Me', 'tnex-user');?></label>
				</div>
				<div class="field-forgot-password"><a href="<?php echo esc_url($link_forgot_password); ?>"><?php esc_html_e('Forgot Password?', 'tnex-user');?></a></div>
			</div>
			<div class="field-group field-footer-group">
				<button type="button" class="button btn button-login"><?php esc_html_e('Sign in', 'tnex-user');?></button>
			</div>
		</div>
	</div>
</div>
