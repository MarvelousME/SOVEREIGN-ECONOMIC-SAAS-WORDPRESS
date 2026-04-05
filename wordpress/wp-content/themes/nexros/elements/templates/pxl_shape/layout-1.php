<?php 
$rows = (int) $settings['shape_row'];
$cols = (int) $settings['shape_column'];
$total_items = $rows * $cols;

$delay_step = 0.05;
$main_color = !empty($settings['shape_main_color']) ? $settings['shape_main_color'] : '#FFFFFF';

$opacities = array_map('floatval', explode(',', $settings['shape_opacities']));

echo '<div class="pxl-shape-container" style="display: grid;gap: 0; grid-template-columns: repeat(' . $cols . ', 1fr);">';

for ($i = 0; $i < $total_items; $i++) {
    $delay = $i * $delay_step;
    $opacity = isset($opacities[$i]) ? $opacities[$i] : 1;
    echo '<div class="grid-item" style="background-color:' . esc_attr($main_color) . '; opacity:' . $opacity . '; animation-delay:' . $delay . 's; width: 100%; aspect-ratio: 1;mix-blend-mode: overlay;"></div>';
}

echo '</div>';
?>