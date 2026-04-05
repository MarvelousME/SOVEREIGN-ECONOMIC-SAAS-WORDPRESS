<?php
/**
 * Plugin Name: Sovereign — direct filesystem (no FTP)
 * Description: Forces WordPress to use direct filesystem I/O so plugin/theme installs never prompt for FTP or SSH credentials. Requires the web server user to be able to write wp-content (typical in Docker; on some hosts adjust ownership).
 * Version: 1.0.0
 */

if (!defined('ABSPATH')) {
    exit;
}

if (!defined('FS_METHOD')) {
    define('FS_METHOD', 'direct');
}

add_filter(
    'filesystem_method',
    static function ($method) {
        return 'direct';
    },
    999,
    1
);
