<?php
/**
 * The template for displaying logout text.
 *
 * @package Tnex User
 * @author Tnex-Themes Team
 * @since Tnex User 1.0.0
 */

if (! defined ( 'ABSPATH' )) {
	exit ();
}

global $tnex_user;

?>

<div class="pxl-user-form-logout">
	<a class="btn" href="<?php echo esc_url(wp_logout_url( get_permalink() )); ?>"><?php echo esc_html($tnex_user['is_logged_text']); ?></a>
</div>