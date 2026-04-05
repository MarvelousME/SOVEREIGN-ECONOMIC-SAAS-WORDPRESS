<?php
/**
 * Plugin Name: Tnex User
 * Plugin URI: https://themeforest.net/user/tnex-themes
 * Description: A wordpress login
 * Version: 1.0.0
 * Author: Tnex-Themes
 * Author URI: https://themeforest.net/user/tnex-themes
 * License: GPLv2 or later
 * Text Domain: tnex-user
 */
if (! defined('ABSPATH')) {
    exit();
}

/**
 * Main Class
 *
 * @class Tnex_User
 *
 * @version 1.0.0
 */

if (! class_exists('Tnex_User')) {

    final class Tnex_User
    {
        /**
         * Action argument used by the nonce validating the AJAX request.
         *
         * @var string
         */
        const NONCE = 'up-nonce-ajax';

        public static function instance()
        {
            static $instance = null;
            
            if (null === $instance) {
                
                $instance = new Tnex_User();
                
                // globals.
                $instance->setup_globals();
                
                // includes.
                $instance->includes();
                
                // actions.
                $instance->setup_actions();
            }
            return $instance;
        }

        /**
         * globals value.
         *
         * @package WR
         * @global path + uri.
         */
    public $file = null;
    public $basename = null;
    public $plugin_url = null;
    public $plugin_dir = null;
    public $templates_dir = null;
    public $templates_url = null;
    public $style_dir = null;
    public $style_url = null;
    public $theme_dir = null;
    public $theme_url = null;
        public function setup_globals()
        {
            $this->file = __FILE__;
            $this->basename = plugin_basename($this->file);
            $this->plugin_dir = plugin_dir_path($this->file);
            $this->plugin_url = plugin_dir_url($this->file);
            
            $this->templates_dir = trailingslashit($this->plugin_dir . 'templates');
            $this->templates_url = trailingslashit($this->plugin_url . 'templates');
            
            $this->style_dir = trailingslashit($this->plugin_dir . 'style');
            $this->style_url = trailingslashit($this->plugin_url . 'style');
            
            $this->theme_dir = trailingslashit(get_template_directory() . '/tnex-user');
            $this->theme_url = trailingslashit(get_template_directory_uri() . '/tnex-user');
        }

        /**
         * setup all actions + filter.
         *
         * @package WR
         * @version 1.0.0
         */
        private function setup_actions()
        {
            /* add front-end scripts. */
            add_action('wp_enqueue_scripts', array(
                $this,
                'add_scrips'
            ));
            
            /* add template scripts. */
            add_action('wp_enqueue_scripts', array(
                $this,
                'add_template_script'
            ));
            
            /* add admin scripts. */
            add_action('admin_enqueue_scripts', array(
                $this,
                'add_admin_script'
            ));
        }

        /**
         * include files.
         *
         * @package WR
         * @version 1.0.0
         */
        private function includes()
        {
            require_once tnexuser()->plugin_dir . 'inc/class.ajax.php';
            require_once tnexuser()->plugin_dir . 'inc/class.hook.php';
            require_once tnexuser()->plugin_dir . 'admin/class.admin.php';
            require_once tnexuser()->plugin_dir . 'inc/class.shortcodes.php';
            require_once tnexuser()->plugin_dir . 'inc/templates.php';
            require_once tnexuser()->plugin_dir . 'inc/class.core.php';
        }

        /**
         * add front-end scripts.
         *
         * @package WR
         * @version 1.0.0
         */
        function add_scrips()
        {
            $app_id = array(
                'facebook'  => get_option('pxl_user_face_api_key', ''),
                'google'    => get_option('pxl_user_google_api_key', '')
            );
            /* load jquery. */
            wp_enqueue_script('jquery');
            /* jquery lib. */
            wp_enqueue_script( 'notify', tnexuser()->style_url . 'js/notify.min.js', array('jquery'), '1.0.0' , true);
            
            $layout = get_option( 'pxl_user_layout', 'default');
            
            /* load Remodal popup */
            wp_enqueue_script('remodal', $this->style_url . 'js/remodal.min.js', array('jquery'), '1.0.0' , true);
            
            wp_register_script( 'pxl-user-form', tnexuser()->style_url . 'js/user-form.js', array('jquery'), '1.0.0' , true);
            wp_localize_script( 'pxl-user-form', 'tnexuser', array( 'ajax' => admin_url('admin-ajax.php'), 'nonce' => wp_create_nonce(Tnex_User::NONCE) ) );
            wp_enqueue_script( 'pxl-user-form');
        }

        /**
         * add back-end scripts.
         *
         * @package Tnex_User
         * @version 1.0.0
         */
        function add_admin_script()
        {
            
            $screen = get_current_screen();
            // if page not pxl-user-form_admin.
            if(!isset($screen->base))
                return ;
            
            if($screen->base != 'users_page_pxl-user-form_admin')
                return ;
                
            // load media scripts.
            wp_enqueue_media();
            wp_enqueue_script('media-upload');
            
            // admin custom script
            wp_enqueue_script('admin.options', tnexuser()->style_url . 'js/admin.options.js');
            wp_enqueue_style('admin.options', tnexuser()->style_url . 'css/admin.options.css');
        }
        
        /**
         * load custom template scripts.
         * 
         * @author Tnex-Themes Team
         * @version 1.0.0
         */
        function add_template_script(){
            
            global $post;
            
            if(!is_a( $post, 'WP_Post' ))
                return ;
            
            if(!has_shortcode( $post->post_content, 'tnex-user'))
                return ;
            
            preg_match_all ("/\[pxl-user-form(.*)\]/U", $post->post_content, $matches);
            
            if(empty($matches[0]))
                return ;
            
            foreach ($matches[0] as $item){
            
                preg_match_all('/layout="([^"]+)"/', $item, $_matches);
            
                $layout = isset($_matches[1][0]) ? $_matches[1][0] : 'default' ;
            
                up_get_template_css($layout);
            }
        }

    }
    
    if (! function_exists('tnexuser')) {

        function tnexuser()
        {
            return Tnex_User::instance();
        }
    }
    
    if (defined('USERPRESS_LATE_LOAD')) {
        
        add_action('plugins_loaded', 'tnexuser', (int) USERPRESS_LATE_LOAD);
    } else {
        tnexuser();
    }
}