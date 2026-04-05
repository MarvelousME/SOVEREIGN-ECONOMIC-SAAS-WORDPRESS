<?php
$settings = $widget->get_settings_for_display();

$sphere_size = isset($settings['sphere_size']['size']) ? $settings['sphere_size']['size'] : 950;
$sphere_radius = $sphere_size * 0.5;
$sphere_color = isset($settings['sphere_color']) ? $settings['sphere_color'] : 'rgba(255, 255, 255, 0.15)';
$rotation_type = isset($settings['rotation_type']) ? $settings['rotation_type'] : 'y_axis';
$rotation_speed = isset($settings['rotation_speed']['size']) ? $settings['rotation_speed']['size'] : 0.005;
$custom_x_speed = isset($settings['custom_x_speed']['size']) ? $settings['custom_x_speed']['size'] : 0.003;
$custom_y_speed = isset($settings['custom_y_speed']['size']) ? $settings['custom_y_speed']['size'] : 0.005;
// $tilt_angle = isset($settings['tilt_angle']['size']) ? $settings['tilt_angle']['size'] : -30;

$canvas_id = 'sphereCanvas_' . uniqid();
?>

<div class="pxl-sphere" 
    data-size="<?php echo esc_attr($sphere_size); ?>"
    data-radius="<?php echo esc_attr($sphere_radius); ?>"
    data-color="<?php echo esc_attr($sphere_color); ?>"
    data-rotation="<?php echo esc_attr($rotation_type); ?>"
    data-speed="<?php echo esc_attr($rotation_speed); ?>"
    data-xspeed="<?php echo esc_attr($custom_x_speed); ?>"
    data-yspeed="<?php echo esc_attr($custom_y_speed); ?>">
    <canvas id="<?php echo esc_attr($canvas_id); ?>"></canvas>
</div>
