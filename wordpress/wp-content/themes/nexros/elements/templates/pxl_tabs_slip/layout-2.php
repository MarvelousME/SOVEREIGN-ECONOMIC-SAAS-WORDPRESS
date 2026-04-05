<?php 
$number_title = 1;
$number_content = 1;
$col_xs = $widget->get_setting('col_xs', '');
$col_sm = $widget->get_setting('col_sm', '');
$col_md = $widget->get_setting('col_md', '');
$col_lg = $widget->get_setting('col_lg', '');
$col_xl = $widget->get_setting('col_xl', '');
$col_xxl = $widget->get_setting('col_xxl', '');
if($col_xxl == 'inherit') {
    $col_xxl = $col_xl;
}
$arrows = $widget->get_setting('arrows', false);
$pagination = $widget->get_setting('pagination', false);
$slides_to_scroll = $widget->get_setting('slides_to_scroll', '');
$pause_on_hover = $widget->get_setting('pause_on_hover', false);
$autoplay = $widget->get_setting('autoplay', false);
$autoplay_speed = $widget->get_setting('autoplay_speed', '5000');
$infinite = $widget->get_setting('infinite', false);
$speed = $widget->get_setting('speed', '500');
$center = $widget->get_setting('center', false);
$drap = $widget->get_setting('drap', false);
$html_id = pxl_get_element_id($settings); 
$opts = [
    'slide_direction'               => 'horizontal',
    'slide_percolumn'               => 1, 
    'slide_percolumnfill'           => 1, 
    'slide_mode'                    => 'slide', 
    'center_slide'                  => false, 
    'slides_to_show'                => $col_xl === 'auto' ? 'auto' : (int)$col_xl,
    'slides_to_show_xxl'            => $col_xxl === 'auto' ? 'auto' : (int)$col_xxl, 
    'slides_to_show_lg'             => $col_lg === 'auto' ? 'auto' : (int)$col_lg, 
    'slides_to_show_md'             => $col_md === 'auto' ? 'auto' : (int)$col_md, 
    'slides_to_show_sm'             => $col_sm === 'auto' ? 'auto' : (int)$col_sm, 
    'slides_to_show_xs'             => $col_xs === 'auto' ? 'auto' : (int)$col_xs, 
    'slides_to_scroll'              => (int)$slides_to_scroll,  
    'slides_gutter'                 => 30, 
    'arrow'                         => (bool)$arrows,
    'pagination'                    => (bool)$pagination,
    'pause_on_hover'                => (bool)$pause_on_hover,
    'pause_on_interaction'          => true,
    'delay'                         => (int)$autoplay_speed,
    'loop'                          => (bool)$infinite,
    'autoplay'                      => (bool)$autoplay,
    'speed'                         => (int)$speed,
    'center'                        => (bool)$center
];
$widget->add_render_attribute( 'carousel', [
    'class'         => 'pxl-swiper-container',
    'dir'           => is_rtl() ? 'rtl' : 'ltr',
    'data-settings' => wp_json_encode($opts)
]); 

if (!empty($settings['tabs']) && is_array($settings['tabs'])): ?>
    <div class="pxl-swiper-slider pxl-tabs-slip pxl-tabs-slip2" <?php if($drap !== false): ?>data-cursor-drap="<?php echo esc_html('DRAG', 'nexros'); ?>"<?php endif; ?>>
        <div class="pxl-carousel-inner">
            <div <?php pxl_print_html($widget->get_render_attribute_string( 'carousel' )); ?>>
                <div class="pxl-tabs--content pxl-swiper-wrapper">
                    <?php foreach ($settings['tabs'] as $key => $tab) : 
                        $template_id = !empty($tab['content_template']) ? (int) $tab['content_template'] : 0;
                        $content_id = $html_id . '-' . $tab['_id'];
                        ?>
                        <div 
                        id="<?php echo esc_attr($content_id); ?>" 
                        class="pxl-swiper-slide pxl-tab-content pxl-item--content-<?php echo esc_attr($number_content++); ?>">
                        <?php 
                        if ($template_id) {
                            $tab_content = Elementor\Plugin::$instance->frontend->get_builder_content_for_display($template_id);
                            pxl_print_html($tab_content);
                        }
                        ?>        
                    </div>
                <?php endforeach; ?>
            </div>
        </div>
        <?php if($pagination !== false || $arrows !== false): ?>
            <div class="pxl-swiper-bottom pxl-flex-middle">
                <?php if($pagination !== false): ?>
                    <div class="pxl-swiper-dots style-1"></div>
                <?php endif; ?>
                <?php if($arrows !== false): ?>
                    <div class="pxl-wrap-arrow pxl-flex-middle">
                        <div class="pxl-swiper-arrow pxl-swiper-arrow-prev"><svg xmlns="http://www.w3.org/2000/svg" width="15" height="14" viewBox="0 0 15 14" fill="none">
                        <path d="M3.37943 7.99567L13.8534 8.0104C14.0892 8.0104 14.2881 7.92928 14.4504 7.76704C14.6126 7.6048 14.6935 7.40602 14.6931 7.17072C14.6931 6.93501 14.612 6.73604 14.4498 6.5738C14.2875 6.41156 14.0888 6.33063 13.8535 6.33103L3.37943 6.34576L7.85777 1.86742C8.02473 1.70046 8.10821 1.50385 8.10821 1.27757C8.10821 1.0513 8.02473 0.855075 7.85777 0.688905C7.69082 0.521949 7.4942 0.438471 7.26793 0.438471C7.04166 0.438471 6.84543 0.521949 6.67926 0.688905L0.786707 6.58146C0.619752 6.74842 0.536274 6.94503 0.536274 7.17131C0.536274 7.39758 0.619751 7.5938 0.786707 7.75997L6.67926 13.6525C6.84622 13.8195 7.04283 13.903 7.26911 13.903C7.49538 13.903 7.6916 13.8195 7.85777 13.6525C8.02473 13.4856 8.10821 13.289 8.10821 13.0627C8.10821 12.8364 8.02473 12.6402 7.85777 12.474L3.37943 7.99567Z" fill="#1B1712"/>
                        </svg></div>
                        <div class="pxl-swiper-arrow pxl-swiper-arrow-next"><svg xmlns="http://www.w3.org/2000/svg" width="15" height="14" viewBox="0 0 15 14" fill="none">
                        <path d="M11.6206 7.99567L1.14655 8.0104C0.910848 8.0104 0.711876 7.92928 0.549634 7.76704C0.387392 7.6048 0.306468 7.40602 0.306861 7.17072C0.306861 6.93501 0.387982 6.73604 0.550223 6.5738C0.712465 6.41156 0.91124 6.33063 1.14655 6.33103L11.6206 6.34576L7.14223 1.86742C6.97527 1.70046 6.89179 1.50385 6.89179 1.27757C6.89179 1.0513 6.97527 0.855075 7.14223 0.688905C7.30918 0.521949 7.5058 0.438471 7.73207 0.438471C7.95834 0.438471 8.15457 0.521949 8.32074 0.688905L14.2133 6.58146C14.3802 6.74842 14.4637 6.94503 14.4637 7.17131C14.4637 7.39758 14.3802 7.5938 14.2133 7.75997L8.32074 13.6525C8.15378 13.8195 7.95717 13.903 7.73089 13.903C7.50462 13.903 7.3084 13.8195 7.14223 13.6525C6.97527 13.4856 6.89179 13.289 6.89179 13.0627C6.89179 12.8364 6.97527 12.6402 7.14223 12.474L11.6206 7.99567Z" fill="#1B1712"/>
                        </svg></div>
                  </div>
              <?php endif; ?>
          </div>
      <?php endif; ?>
    </div>
</div>
<?php endif; ?>
