<?php
$is_new = \Elementor\Icons_Manager::is_migration_allowed();
if(isset($settings['icons']) && !empty($settings['icons']) && count($settings['icons'])): ?>
    <div class="pxl-icon-list pxl-icon1  <?php echo esc_attr($settings['style'].' '.$settings['animate_hover'].' '.$settings['pxl_animate']); ?>" data-wow-delay="<?php echo esc_attr($settings['pxl_animate_delay']); ?>ms">
        <?php foreach ($settings['icons'] as $key => $value):
            $label = isset($value['label']) ? $value['label'] : '';
            $link_text = isset($value['link_text']) ? $value['link_text'] : '';
            $label_position = isset($value['label_position']) ? $value['label_position'] : '';
            $icon_key = $widget->get_repeater_setting_key( 'pxl_icon', 'icons', $key );
            $widget->add_render_attribute( $icon_key, [
                'class' => $value['pxl_icon'],
                'aria-hidden' => 'true',
            ] );
            $link_key = $widget->get_repeater_setting_key( 'icon_link', 'value', $key );
            if ( ! empty( $value['icon_link']['url'] ) ) {
                $widget->add_render_attribute( $link_key, 'href', $value['icon_link']['url'] );

                if ( $value['icon_link']['is_external'] ) {
                    $widget->add_render_attribute( $link_key, 'target', '_blank' );
                }

                if ( $value['icon_link']['nofollow'] ) {
                    $widget->add_render_attribute( $link_key, 'rel', 'nofollow' );
                }
            }
            $link_attributes = $widget->get_render_attribute_string( $link_key ); ?>
            <?php if ( ! empty( $value['pxl_icon'] ) ) : ?>
                <a class="elementor-repeater-item-<?php echo esc_attr($value['_id']); ?> <?php echo esc_attr($label_position); ?>" <?php echo implode( ' ', [ $link_attributes ] ); ?>>
                    <?php if (($settings['style']=='style-4' || $settings['style']=='style-7') && !empty($value['pxl_icon']['value'])): ?>
                    <span class="icon-box">
                    <?php endif ?>
                    <?php if ( $is_new ):
                        \Elementor\Icons_Manager::render_icon( $value['pxl_icon'], [ 'aria-hidden' => 'true' ] );
                    elseif(!empty($value['pxl_icon'])): ?>
                        <i class="<?php echo esc_attr( $value['pxl_icon'] ); ?>" aria-hidden="true"></i>
                    <?php endif; ?>
                    <?php if (($settings['style']=='style-4' || $settings['style']=='style-7') && !empty($value['pxl_icon']['value'])): ?>
                </span>
            <?php endif ?>
            <?php if(!empty($label) || !empty($link_text)) : ?>
                <span class="pxl-link-text-wrap pxl-flex-center">
                <?php if(!empty($label)) : ?>
                <span><?php echo pxl_print_html($label); ?></span>
            <?php endif; ?>
            <?php if(!empty($link_text)) : ?>
                <span class="pxl-link-text" ><?php echo pxl_print_html($link_text); ?></span>
            <?php endif; ?>
            </span>
            <?php endif; ?>
        </a>
    <?php endif; ?>
<?php endforeach; ?>
</div>
<?php endif; ?>