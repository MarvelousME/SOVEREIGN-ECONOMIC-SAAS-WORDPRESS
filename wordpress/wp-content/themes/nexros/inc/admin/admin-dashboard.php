<?php
/**
* The Nexros_Admin_Dashboard base class
*/

if( !defined( 'ABSPATH' ) )
	exit; 

class Nexros_Admin_Dashboard extends Nexros_Admin_Page {
	protected $id = null;
	protected $page_title = null;
	protected $menu_title = null;
	public $position = null;
	public function __construct() {
		$this->id = 'pxlart';
		$this->page_title = nexros()->get_name();
		$this->menu_title = nexros()->get_name();
		$this->position = '50';

		parent::__construct();
	}

	public function display() {
		include_once( get_template_directory() . '/inc/admin/views/admin-dashboard.php' );
	
		do_action( 'nexros_admin_dashboard_after' );
	}
	
	public function save() {

	}
}
new Nexros_Admin_Dashboard;
