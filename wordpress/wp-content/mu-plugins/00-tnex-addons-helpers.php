<?php
/**
 * Plugin Name: Sovereign — Tnex / Nexros helper bootstrap
 * Description: Loads tnex-addons inc/functions.php early with required constants so the Nexros theme never fatals when Tnex Addons is inactive or loads after the theme.
 * Version: 1.0.0
 */

if (!defined('ABSPATH')) {
    exit;
}

$tnex_dir = WP_CONTENT_DIR . '/plugins/tnex-addons/';
$tnex_functions = $tnex_dir . 'inc/functions.php';

if (!is_readable($tnex_functions)) {
    return;
}

if (!defined('PXL_TEXT_DOMAIN')) {
    define('PXL_TEXT_DOMAIN', 'pixelart-core');
}
if (!defined('PXL_PATH')) {
    define('PXL_PATH', $tnex_dir);
}
if (!defined('PXL_URL')) {
    define('PXL_URL', plugins_url('', $tnex_dir . 'bravis-addons.php'));
}
if (!defined('DEV_MODE')) {
    define('DEV_MODE', false);
}

require_once $tnex_functions;
