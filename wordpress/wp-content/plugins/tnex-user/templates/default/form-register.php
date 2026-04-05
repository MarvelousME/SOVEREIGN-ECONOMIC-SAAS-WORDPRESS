<?php
/**
 * The template for displaying register form.
 *
 * Override this template
 *
 * @author 		Tnex User
 * @package 	Tnex User/Templates
 * @version     1.0.0
 */
if (! defined('ABSPATH')) {
    exit();
}
?>

<div class="pxl-user-form-body pxl-user-form-register">
	<div class="register-form">
		<div class="fields-content">
			<div class="field-group">
				<input id="res_user" type="text" class="input" placeholder="<?php esc_html_e('Username', 'tnex-user'); ?>" data-validate="<?php esc_html_e('Required Field', 'tnex-user'); ?>" data-user-length="<?php esc_html_e('Username too short. At least 4 characters is required.', 'tnex-user'); ?>" data-special-char="<?php esc_html_e("The value of text field can't contain any of the following characters: \ / : * ? \" < > space", 'tnex-user'); ?>">
			</div>
			<div class="field-group">
				<input id="res_email" type="text" class="input" placeholder="<?php esc_html_e('Email Address', 'tnex-user'); ?>" data-validate="<?php esc_html_e('Required Field', 'tnex-user'); ?>"  data-email-format="<?php esc_html_e('The Email address is incorrect!', 'tnex-user'); ?>">
			</div>
			<div class="field-group">
				<input id="res_pass1" type="password" class="input" data-type="password" placeholder="<?php esc_html_e('Password', 'tnex-user'); ?>" data-validate="<?php esc_html_e('Required Field', 'tnex-user'); ?>" data-pass-length="<?php esc_html_e( 'Password length must be greater than 5.', 'tnex-user' ); ?>">
				<i id="showPasswordIcon2" class="fas fa-eye"></i>
			</div>
			<div class="field-group">
				<input id="res_pass2" type="password" class="input" data-type="password" placeholder="<?php esc_html_e('Confirm Password', 'tnex-user'); ?>" data-validate="<?php esc_html_e('Required Field', 'tnex-user'); ?>" data-pass-confirm="<?php esc_html_e('Your password and confirmation password do not match.', 'tnex-user'); ?>">
				<i id="showPasswordIcon3" class="fas fa-eye"></i>
			</div>
			<div class="field-group field-dflex">
				<div class="field-rememberme">
					<input type="checkbox"  name="termofuser" value="forever">
					<label><?php esc_html_e('I agree to the ', 'tnex-user');?><strong><?php esc_html_e('Terms of User', 'tnex-user');?></strong></label>
				</div>
			</div>
			<div class="field-group field-footer-group">
				<button type="button" class="button btn-up-register">
					<?php esc_html_e('Sign up', 'tnex-user');?>
				</button>
			</div>
		</div>
	</div>
</div>