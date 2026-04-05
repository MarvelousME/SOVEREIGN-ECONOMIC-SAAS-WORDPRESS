<?php
/**
 * UBI CMS Theme Functions
 * 
 * @package UBI_CMS
 * @version 1.0.1
 */

if (!defined('ABSPATH')) {
    exit;
}

// Theme version
define('UBI_CMS_THEME_VERSION', '1.0.1');

// Security: Disable XML-RPC
add_filter('xmlrpc_enabled', '__return_false');
add_filter('xmlrpc_methods', '__return_false');

// Security: Remove WP version
remove_action('wp_head', 'wp_generator');

// Security: Disable file editing
define('DISALLOW_FILE_EDIT', true);

// Enqueue scripts and styles
function ubi_cms_enqueue_assets() {
    $theme_dir = get_template_directory_uri();
    
    $css_file = get_template_directory() . '/css/main.css';
    if (file_exists($css_file)) {
        wp_enqueue_style('ubi-cms-main', $theme_dir . '/css/main.css', array(), UBI_CMS_THEME_VERSION);
    }
    
    $js_file = get_template_directory() . '/js/main.js';
    if (file_exists($js_file)) {
        wp_enqueue_script('ubi-cms-main', $theme_dir . '/js/main.js', array('jquery'), UBI_CMS_THEME_VERSION, true);
        
        wp_localize_script('ubi-cms-main', 'ubiCmsData', array(
            'ajaxUrl' => admin_url('admin-ajax.php'),
            'nonce'   => wp_create_nonce('ubi_cms_nonce'),
            'siteUrl' => get_site_url(),
        ));
    }
}
add_action('wp_enqueue_scripts', 'ubi_cms_enqueue_assets');

// Register navigation menus
function ubi_cms_register_menus() {
    register_nav_menus(array(
        'primary' => __('Primary Menu', 'ubi-cms'),
        'footer' => __('Footer Menu', 'ubi-cms'),
    ));
}
add_action('after_setup_theme', 'ubi_cms_register_menus');

// UBI Dashboard shortcode
function ubi_cms_dashboard_shortcode($atts) {
    $atts = shortcode_atts(array(
        'type' => 'overview',
    ), $atts);
    
    // Validate shortcode attribute against allowed values
    $allowed_types = array('overview', 'detailed', 'summary');
    if (!in_array($atts['type'], $allowed_types)) {
        $atts['type'] = 'overview';
    }
    
    ob_start();
    ?>
    <div class="ubi-dashboard" data-type="<?php echo esc_attr($atts['type']); ?>">
        <div class="ubi-dashboard-header">
            <h2><?php esc_html_e('UBI Dashboard', 'ubi-cms'); ?></h2>
        </div>
        <div class="ubi-dashboard-content">
            <div class="ubi-stat-card">
                <span class="ubi-stat-label"><?php esc_html_e('Total Earnings', 'ubi-cms'); ?></span>
                <span class="ubi-stat-value" id="ubi-total-earnings">--</span>
            </div>
            <div class="ubi-stat-card">
                <span class="ubi-stat-label"><?php esc_html_e('UBI Balance', 'ubi-cms'); ?></span>
                <span class="ubi-stat-value" id="ubi-balance">--</span>
            </div>
            <div class="ubi-stat-card">
                <span class="ubi-stat-label"><?php esc_html_e('Reputation Score', 'ubi-cms'); ?></span>
                <span class="ubi-stat-value" id="ubi-reputation">--</span>
            </div>
        </div>
    </div>
    <?php
    return ob_get_clean();
}
add_shortcode('ubi_dashboard', 'ubi_cms_dashboard_shortcode');

// AJAX handler for UBI data - AUTHENTICATED USERS ONLY
function ubi_cms_get_dashboard_data() {
    check_ajax_referer('ubi_cms_nonce', 'nonce');
    
    // Verify user is logged in
    if (!is_user_logged_in()) {
        wp_send_json_error(array('message' => 'Unauthorized'), 401);
    }
    
    $user_id = get_current_user_id();
    
    $ubi_balance = get_user_meta($user_id, 'ubi_balance', true) ?: 0;
    $total_earnings = get_user_meta($user_id, 'total_earnings', true) ?: 0;
    $reputation_score = get_user_meta($user_id, 'reputation_score', true) ?: 0;
    
    wp_send_json_success(array(
        'ubi_balance' => floatval($ubi_balance),
        'total_earnings' => floatval($total_earnings),
        'reputation_score' => intval($reputation_score),
    ));
}
// FIXED: Removed nopriv hook - only authenticated users can access
add_action('wp_ajax_ubi_get_dashboard_data', 'ubi_cms_get_dashboard_data');

// Security: Add CSP headers
function ubi_cms_security_headers() {
    if (!headers_sent()) {
        header('X-Content-Type-Options: nosniff');
        header('X-Frame-Options: DENY');
        header('X-XSS-Protection: 1; mode=block');
        header('Referrer-Policy: strict-origin-when-cross-origin');
    }
}
add_action('init', 'ubi_cms_security_headers');

// Theme support
function ubi_cms_theme_support() {
    add_theme_support('title-tag');
    add_theme_support('post-thumbnails');
    add_theme_support('html5', array('search-form', 'comment-form', 'comment-list', 'gallery', 'caption'));
    add_theme_support('custom-logo');
}
add_action('after_setup_theme', 'ubi_cms_theme_support');
