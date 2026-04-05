<?php
/**
 * Define Tnex User hook
 *
 * @author Jax
 **/
add_action( 'pxl-user-form/form/login/after', 'up_hook_login_form_recaptcha' );

/**
 * Providing an implementation for 'up_hook_login_form_recaptcha'
 * to add Google recatcha to login form
 *
 * @author Jax
 */
function up_hook_login_form_recaptcha() {
    global $tnex_user;
    $tnex_user['template'] = (isset($tnex_user['template']) && $tnex_user['template'] != '')? $tnex_user['template'] : 'default';
    up_get_template_part( "{$tnex_user['template']}/recaptcha" );
}