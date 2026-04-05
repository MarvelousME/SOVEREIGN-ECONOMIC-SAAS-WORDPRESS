<?php
$is_new = \Elementor\Icons_Manager::is_migration_allowed();

?>
<div class="pxl-banner-box pxl-banner-box__style-2">
		<ul class="pxl-banner-box__feature">
			<?php
				foreach ($settings['scl4_2_list'] as $key => $item):
                    $number = $item['scl4_2_number'];
                    $title = $item['scl4_2_title'];
                    $desc = $item['scl4_2_desc'];
                    $percent = $item['scl4_2_percent']['size'];
					 ?>
					<li class="pxl-banner-box__feature-item elementor-repeater-item-<?php echo esc_attr($item['_id']); ?>">
						<span class="pxl-banner-box__feature-item__number"><?php echo esc_html($number); ?></span>
                        <div class="pxl-banner-box__feature-item__content">
                            <span class="pxl-banner-box__feature-item__title"><?php echo esc_html($title); ?></span>
                            <div class="pxl-banner-box__feature-item__desc"><?php echo esc_html($desc); ?> 
                            <div class="pxl--percentage"><?php echo pxl_print_html($percent); ?>%</div></div>
                    </div>
                    <div class="pxl-banner-box__feature-item__progressbar">
                        <div class="pxl--progressbar" role="progressbar" data-valuetransitiongoal="<?php echo esc_attr($percent); ?>"></div>
                    </div>
					</li>
			<?php endforeach; ?>
		</ul>   
</div>