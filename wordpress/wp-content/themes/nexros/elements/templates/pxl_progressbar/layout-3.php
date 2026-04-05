<?php 
$html_id = pxl_get_element_id($settings);
extract($settings);

$data_settings = json_encode([
    'circle_percent' => !empty($circle_percent['size']) ? (int)$circle_percent['size'] : 50,
    'circle_number' => !empty($circle_number) ? (int)$circle_number : 0,
    'prefix' => !empty($prefix) ? $prefix : '',
    'suffix' => !empty($suffix) ? $suffix : '',
    'speed' => !empty($circle_speed) ? (int)$circle_speed : 1000 
]);

$ids = esc_attr('grad-'.$html_id);

$widget->add_render_attribute( 'data-setting', 'data-settings', $data_settings );
?>
<div id="<?php echo esc_attr($html_id) ?>" class="pxl-progressbar-container pxl-progressbar circle layout-4 <?php echo esc_attr($settings['style']); ?>" <?php pxl_print_html($widget->get_render_attribute_string( 'data-setting' )); ?>>
    <div class="pxl-progressbar-inner relative">
        <div class="pxl-progressbar-circle-base"></div>
        <div class="pxl-progressbar-circle">
            <svg class="svg1" xmlns="http://www.w3.org/2000/svg"
            viewBox="-1 -1 34 34">

            <circle cx="16" cy="16" r="15.9155"
            class="progress-bar__background" />

            <circle cx="16" cy="16" r="15.9155"
            class="progress-bar__progress 
            js-progress-bar1"/></svg>
            <svg class="svg2" xmlns="http://www.w3.org/2000/svg"
            viewBox="-1 -1 34 34">
            <defs>
                <linearGradient id="<?php echo esc_attr($ids); ?>" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop class="stop1" offset="0%"  />
                  <stop class="stop2" offset="100%"  />
              </linearGradient>
          </defs>
          <circle cx="16" cy="16" r="15.9155"
          class="progress-bar__background js-progress-bar1" />

          <circle cx="16" cy="16" r="15.9155"
          class="progress-bar__progress 
          js-progress-bar" stroke="url(#<?php echo esc_attr($ids); ?>)"/></svg>
      </div>
      <div class="pxl-progressbar-circle-content">
        <?php if ( !empty($circle_number)) : ?>
            <div class="progress-percentage">0</div>
        <?php endif; ?>
        <div class="progress-title">
        <?php echo wp_kses_post( $circle_title ); ?>
    </div>
    </div>
</div>
</div>