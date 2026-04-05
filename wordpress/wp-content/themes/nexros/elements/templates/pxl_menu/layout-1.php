<?php
if (!isset($settings)) {
    $settings = array();
}

$p_menu = nexros()->get_page_opt('p_menu');
if (!empty($p_menu)) {
    $settings['menu'] = $p_menu;
}

$menu_item_icon_html = '';
if (!empty($settings['pxl_icon']['value'])) {
    ob_start();
    \Elementor\Icons_Manager::render_icon($settings['pxl_icon'], ['aria-hidden' => 'true', 'class' => ''], 'i');
    $menu_item_icon_html = ob_get_clean();
}

$arrow_svg = '<svg class="pxl-hide" xmlns="http://www.w3.org/2000/svg" width="6" height="5" viewBox="0 0 6 5" fill="none">
    <path d="M5.1758 0.578827L3 2.75462L0.824203 0.578827L0 1.40303L3 4.40303L6 1.40303L5.1758 0.578827Z" fill="black"/>
</svg>';

$link_before = '<span class="pxl-menu-item-text">';
$link_after = (!empty($settings['pxl_icon']['value'])) ? $menu_item_icon_html . '</span>' : $arrow_svg . '</span>';

$menu_classes = array(
    'pxl-nav-menu',
    'pxl-nav-menu1',
    !empty($settings['menu_mega_type']) ? $settings['menu_mega_type'] : '',
    !empty($settings['menu_stype']) ? $settings['menu_stype'] : '',
    !empty($settings['menu_type']) ? 'pxl-nav-' . $settings['menu_type'] : '',
    !empty($settings['hover_active_style']) ? $settings['hover_active_style'] : '',
    !empty($settings['sub_show_effect']) ? $settings['sub_show_effect'] : '',
    !empty($settings['pxl_animate']) ? $settings['pxl_animate'] : '',
    !empty($settings['hover_active_style_sub']) ? $settings['hover_active_style_sub'] : ''
);

$menu_class_string = esc_attr(implode(' ', array_filter($menu_classes)));

$menu_args = array(
    'theme_location' => 'primary',
    'menu_class' => 'pxl-menu-primary clearfix',
    'walker' => class_exists('PXL_Mega_Menu_Walker') ? new PXL_Mega_Menu_Walker : '',
    'link_before' => $link_before,
    'link_after' => $link_after
);

if (!empty($settings['menu'])) {
    $menu_object = wp_get_nav_menu_object($settings['menu']);
    if ($menu_object) {
        $menu_args['menu'] = $menu_object;
    }
}

$show_divider = (!empty($settings['hover_active_style']) && $settings['hover_active_style'] == 'fr-style-divider') || 
                (!empty($settings['menu_stype']) && $settings['menu_stype'] == 'style-box');

if (!empty($settings['menu']) || has_nav_menu('primary')) { ?>
    <div class="<?php echo esc_attr($menu_class_string); ?>" 
         <?php if (!empty($settings['pxl_animate_delay'])): ?>data-wow-delay="<?php echo esc_attr($settings['pxl_animate_delay']); ?>ms"<?php endif; ?>>
        <?php wp_nav_menu($menu_args); ?>
        
        <?php if ($show_divider): ?>
            <div class="pxl-divider-move"></div>
        <?php endif; ?>
    </div>
<?php } ?>