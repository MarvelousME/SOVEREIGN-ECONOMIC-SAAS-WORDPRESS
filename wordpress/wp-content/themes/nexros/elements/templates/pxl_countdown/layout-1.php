<?php
	$default_settings = [
	    'date' => '2030/10/10',
	    'pxl_day' => '',
	    'pxl_hour' => '',
	    'pxl_minute' => '',
	    'pxl_second' => '',
	];
	$html_id = pxl_get_element_id($settings);
	$settings = array_merge($default_settings, $settings);
	extract($settings); 
	$month = esc_html__('Month', 'nexros');
	$months = esc_html__('Months', 'nexros');
	$day = esc_html__('Day', 'nexros');
	$days = esc_html__('Days', 'nexros');
	$hour = esc_html__('Hour', 'nexros');
	$hours = esc_html__('Hours', 'nexros');
	$minute = esc_html__('Minute', 'nexros');
	$minutes = esc_html__('Minutes', 'nexros');
	$second = esc_html__('Second', 'nexros');
	$seconds = esc_html__('Seconds', 'nexros');
	if($style == 'style3') {
		$hour = esc_html__('Hour', 'nexros');
		$hours = esc_html__('Hour', 'nexros');
		$minute = esc_html__('Min', 'nexros');
		$minutes = esc_html__('Min', 'nexros');
		$second = esc_html__('Sec', 'nexros');
		$seconds = esc_html__('Sec', 'nexros');
	}
?>
<div class="pxl-countdown pxl-countdown-layout1 <?php echo esc_attr($settings['style'].' '.$settings['pxl_animate']); ?> <?php echo esc_attr($pxl_day.' '.$pxl_hour.' '.$pxl_minute.' '.$pxl_second); ?>" 
	data-month="<?php echo esc_attr($month) ?>"
	data-months="<?php echo esc_attr($months) ?>"
	data-day="<?php echo esc_attr($day) ?>"
	data-days="<?php echo esc_attr($days) ?>"
	data-hour="<?php echo esc_attr($hour) ?>"
	data-hours="<?php echo esc_attr($hours) ?>"
	data-minute="<?php echo esc_attr($minute) ?>"
	data-minutes="<?php echo esc_attr($minutes) ?>"
	data-second="<?php echo esc_attr($second) ?>"
	data-seconds="<?php echo esc_attr($seconds) ?>" data-wow-delay="<?php echo esc_attr($settings['pxl_animate_delay']); ?>ms">
	<div class="pxl-countdown-inner" data-count-down="<?php echo esc_attr($date);?>"></div>
</div>