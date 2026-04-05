<?php $html_id = pxl_get_element_id($settings); 
if(isset($settings['tabs']) && !empty($settings['tabs']) && count($settings['tabs'])): 
    $tab_bd_ids = [];
?>
<div class="pxl-tabs pxl-tabs1 <?php echo esc_attr($settings['tab_effect'].' '.$settings['style'].' '.$settings['pxl_animate']); ?>" data-wow-delay="<?php echo esc_attr($settings['pxl_animate_delay']); ?>ms">
    <div class="pxl-tabs--inner">
        <div class="pxl-tabs--title">
            <?php foreach ($settings['tabs'] as $key => $value) :
                $icon_key = $widget->get_repeater_setting_key( 'pxl_icon_tab', 'icons', $key ); ?>
                <span class="pxl-item--title <?php if($settings['tab_active'] == $key + 1) { echo 'active'; } ?>" data-target="#<?php echo esc_attr($html_id.'-'.$value['_id']); ?>">
                 <?php if(!empty($value['pxl_icon_tab'])) { ?>
                    <span class="icon-tab">
                        <?php \Elementor\Icons_Manager::render_icon( $value['pxl_icon_tab'], [ 'aria-hidden' => 'true', 'class' => '' ], 'i' ); ?>
                    </span>
                <?php } ?> 
                <span class="pxl-title--text">
                    <?php echo pxl_print_html($value['title']); ?>
                </span>
            </span>
            <?php if($settings['style'] == 'style-text-gradient') { echo '<br/>'; } ?>
        <?php endforeach; ?>
    </div>
    <div class="pxl-tabs--content">
        <?php foreach ($settings['tabs'] as $key => $content) : ?>
            <div id="<?php echo esc_attr($html_id.'-'.$content['_id']); ?>" class="pxl-item--content <?php if($settings['tab_active'] == $key + 1) { echo 'active'; } ?> <?php if($content['content_type'] == 'template') { echo 'pxl-tabs--elementor'; } ?>" <?php if($settings['tab_active'] == $key + 1) { ?>style="display: block;"<?php } ?>>
                <?php if($content['content_type'] && !empty($content['desc'])) {
                    echo pxl_print_html($content['desc']); 
                } elseif(!empty($content['content_template'])) {
                    $tab_content = Elementor\Plugin::$instance->frontend->get_builder_content_for_display( (int)$content['content_template']);
                    $tab_bd_ids[] = (int)$content['content_template'];
                    pxl_print_html($tab_content);
                } ?>        
            </div>
        <?php endforeach; ?>
    </div>
    
</div>
</div>
<?php endif; ?>