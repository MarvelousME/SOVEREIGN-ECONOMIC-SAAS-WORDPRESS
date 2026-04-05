<?php
if (!defined('ABSPATH')) { exit; }

add_action('wp_enqueue_scripts', function () {
    wp_enqueue_style('nexros-parent-style', get_template_directory_uri() . '/style.css', [], wp_get_theme('nexros')->get('Version'));
    wp_enqueue_style('nexros-child-style', get_stylesheet_uri(), ['nexros-parent-style'], wp_get_theme()->get('Version'));
});

add_action('after_setup_theme', function () {
    load_child_theme_textdomain('nexros-child', get_stylesheet_directory() . '/languages');
});

add_filter('body_class', function ($classes) {
    $classes[] = 'nexros-sovereign-platform';
    return $classes;
});

/** Skip-link target: 404 template has no #pxl-content-main (Nexros). */
add_filter('sovereign_iam_ux_skip_target', static function (string $id): string {
    if (is_404()) {
        return 'pxl-main';
    }
    return $id;
});
