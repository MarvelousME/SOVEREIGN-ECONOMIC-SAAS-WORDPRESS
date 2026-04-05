<?php
if (! defined ( 'ABSPATH' )) {
	exit ();
}
/**
 * Add Tnex User Core.
 *
 * @name Tnex User_Core
 * @since 1.0.0
 */
if (! class_exists ( 'Tnex_User_Core' )) {
	class Tnex_User_Core {
		function __construct() {
			//add_filter( 'login_redirect', array($this, 'login_redirect', 10, 3 ));
		}
		
		function login_redirect($redirepxl_to, $request, $user) {
			global $user;
			
			//return home_url();
		}
	}
	
	new Tnex_User_Core;
}