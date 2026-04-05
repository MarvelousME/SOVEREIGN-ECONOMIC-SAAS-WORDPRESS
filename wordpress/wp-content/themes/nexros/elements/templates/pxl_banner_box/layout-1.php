<?php
    if ( ! empty( $settings['scl2_link']['url'] ) ) {
        $widget->add_render_attribute( 'scl2_link', 'href', $settings['scl2_link']['url'] );
    
        if ( $settings['scl2_link']['is_external'] ) {
            $widget->add_render_attribute( 'scl2_link', 'target', '_blank' );
        }
    
        if ( $settings['scl2_link']['nofollow'] ) {
            $widget->add_render_attribute( 'scl2_link', 'rel', 'nofollow' );
        }
    }
?>

<div class="pxl-banner-box pxl-banner-box__style-2">
    <?php if ( ! empty( $settings['scl2_link']['url'] ) ) { ?><a <?php pxl_print_html($widget->get_render_attribute_string( 'scl2_link' )); ?> class="pxl-banner-box__link"><?php } ?> 
    <?php if ( ! empty( $settings['scl2_link']['url'] ) ) { ?></a><?php } ?>
	<div class="pxl-banner-box__wrap-top">
        <div class="pxl-banner-box__chart">
            <h6 class="pxl-banner-box__chart-title"><?php echo esc_html($settings['scl2_chart_title']); ?></h6>
            <div class="pxl-banner-box__chart-sub"><?php echo esc_html($settings['scl2_chart_sub']); ?></div>
            <div class="pxl-banner-box__chart-number"><?php echo esc_html($settings['scl2_chart_suffix'].''.$settings['scl2_chart_number'].''.$settings['scl2_chart_prefix']); ?></div>
            <div class="pxl-banner-box__chart-number2"><?php echo esc_html($settings['scl2_chart_suffix2'].''.$settings['scl2_chart_number2'].''.$settings['scl2_chart_prefix2']); ?></div>
        </div>
        <div class="pxl-banner-box__chart-object">
            <?php if (!empty($settings['scl2_chart_svg']['value']) ) : ?>
                <?php \Elementor\Icons_Manager::render_icon( $settings['scl2_chart_svg'], [ 'aria-hidden' => 'true', 'class' => '' ], 'i' ); ?>
            <?php endif; ?>
        </div>
	</div>
</div>

<script>
    document.addEventListener('DOMContentLoaded', function() {
        const path = document.getElementById('path-line');
        
        if (!path) {
            return;
        }
        
        const ellipse = document.querySelector('circle');
        
        if (!ellipse) {
            return;
        }
        
        const pathLength = path.getTotalLength();
        let currentPosition = 0;
        const speed = 0.005;
        
        function animateEllipse() {
            currentPosition += speed;
            
            if (currentPosition > 1) {
                currentPosition = 0;
            }
            
            const point = path.getPointAtLength(currentPosition * pathLength);
            
            ellipse.setAttribute('cx', point.x);
            ellipse.setAttribute('cy', point.y);
            
            requestAnimationFrame(animateEllipse);
        }
        
        animateEllipse();
    });
</script>