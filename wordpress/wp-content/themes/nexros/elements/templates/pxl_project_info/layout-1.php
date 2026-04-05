<?php if(isset($settings['items']) && !empty($settings['items']) && count($settings['items'])): 
    $is_new = \Elementor\Icons_Manager::is_migration_allowed();  ?>
    <div class="pxl-project-info2">
        <?php foreach ($settings['items'] as $key => $value):
            $label = isset($value['label']) ? $value['label'] : '';
            $content = isset($value['content']) ? $value['content'] : ''; 
            $icon_key = $widget->get_repeater_setting_key( 'pxl_icon', 'icons', $key );
            $widget->add_render_attribute( $icon_key, [
                'class' => $value['pxl_icon'],
                'aria-hidden' => 'true',
            ] ); ?>
            <div class="pxl--item">
                <?php if ( !empty( $value['pxl_icon']['value'] ) ) : ?>
                    <div class="pxl-item--icon pxl-mr-10">
                        <?php if ( $is_new ):
                            \Elementor\Icons_Manager::render_icon( $value['pxl_icon'], [ 'aria-hidden' => 'true' ] );
                        elseif(!empty($value['pxl_icon'])): ?>
                            <i class="<?php echo esc_attr( $value['pxl_icon'] ); ?>" aria-hidden="true"></i>
                        <?php endif; ?>
                    </div>
                <?php endif; ?>
                <div class="pxl-item--meta">
                    <?php if(!empty($label)) : ?>
                        <label><?php echo esc_html($label); ?></label>
                    <?php endif; ?>
                    <?php if(!empty($content)) : ?>
                        <span><?php echo pxl_print_html($content); ?></span>
                    <?php endif; ?>
                </div>
            </div>
        <?php endforeach; ?>
    </div>
<?php endif; ?>