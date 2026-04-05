<?php

if( !defined( 'ABSPATH' ) )
	exit; 

class Nexros_Admin_Templates extends Nexros_Base{

	public function __construct() {
		$this->add_action( 'admin_menu', 'register_page', 20 );
	}
 
	public function register_page() {
		add_submenu_page(
			'pxlart',
		    esc_html__( 'Templates', 'nexros' ),
		    esc_html__( 'Templates', 'nexros' ),
		    'manage_options',
		    'edit.php?post_type=pxl-template',
		    false
		);
	}
}
new Nexros_Admin_Templates;
