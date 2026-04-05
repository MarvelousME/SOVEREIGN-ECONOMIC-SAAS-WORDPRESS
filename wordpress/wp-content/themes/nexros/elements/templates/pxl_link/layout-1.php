<?php
global $wp;
$html_id = pxl_get_element_id($settings); ?>
<div class="pxl-link-wrap">
    <h3 class="pxl-widget-title pxl-empty"><?php echo pxl_print_html($settings['wg_title']); ?></h3>
    <?php if(isset($settings['link']) && !empty($settings['link']) && count($settings['link'])): 
        $current_url_path = home_url( add_query_arg( array(), $wp->request ) ); ?>
        <ul id="pxl-link-<?php echo esc_attr($html_id) ?>" class="pxl-link pxl-link-l1 <?php echo esc_attr($settings['style'].' '.$settings['type']); ?>">
            <?php
                foreach ($settings['link'] as $key => $link):
                    $icon_key = $widget->get_repeater_setting_key( 'pxl_icon', 'icons', $key );
                    $widget->add_render_attribute( $icon_key, [
                        'class' => $link['pxl_icon'],
                        'aria-hidden' => 'true',
                    ] );
                    $link_key = $widget->get_repeater_setting_key( 'link', 'value', $key );
                    if ( ! empty( $link['link']['url'] ) ) {
                        $widget->add_render_attribute( $link_key, 'href', $link['link']['url'] );

                        if ( $link['link']['is_external'] ) {
                            $widget->add_render_attribute( $link_key, 'target', '_blank' );
                        }

                        if ( $link['link']['nofollow'] ) {
                            $widget->add_render_attribute( $link_key, 'rel', 'nofollow' );
                        }
                    }
                    $link_attributes = $widget->get_render_attribute_string( $link_key );
                    $active_cls = '' ;
                    $current_id = get_the_ID();
                    if( $current_id > 0 ){
                        $current_url = get_the_permalink( $current_id, false );
                        if( $link['link']['url'] == $current_url || $link['link']['url'].'/' == $current_url || $link['link']['url'] == $current_url.'/')
                            $active_cls = 'active';
                    }
                    if( $link['link']['url'] == $current_url_path || $link['link']['url'].'/' == $current_url_path || $link['link']['url'] == $current_url_path.'/')
                        $active_cls = 'active';
                    ?>
                    <li class="pxl-item--link <?php echo esc_attr($active_cls.' '.$settings['pxl_animate'])?>">
                        <a class="<?php if($settings['icon_color_type'] == 'gradient') { echo 'pxl-icon-color-gradient'; } ?>" <?php echo implode( ' ', [ $link_attributes ] ); ?>>
                            <?php if(!empty($link['pxl_icon'])){
                                \Elementor\Icons_Manager::render_icon( $link['pxl_icon'], [ 'aria-hidden' => 'true' ], 'i' );
                            } ?>
                            <span><?php echo pxl_print_html($link['text']); ?></span>
                            <?php if($settings['style'] == 'style-box-gradient') : ?>
                                <span class="pxl-item--divider"></span>
                            <?php endif; ?>
                        </a>
                    </li>
            <?php endforeach; ?>
        </ul>
    <?php endif; ?>
</div>