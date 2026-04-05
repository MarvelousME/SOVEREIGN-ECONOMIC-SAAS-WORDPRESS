<?php 
$html_id = pxl_get_element_id($settings); 
$list_text = [];
$tab_count = count($settings['texts']);

if (!empty($settings['texts'])): 
  foreach ($settings['texts'] as $key => $value) {
    $list_text[] = $value['text'] ?? '';
    $list_icon[] = $value['pxl_icon'] ?? '';
  }
  $widget->add_render_attribute('lists_text', [
    'class' => 'pxl-button_physics',
    'data-settings' => wp_json_encode($list_text),
    'data-icons' => wp_json_encode($list_icon)
  ]);
  ?>
  <div <?php pxl_print_html($widget->get_render_attribute_string('lists_text')); ?>>
  </div>
<?php endif; ?>
