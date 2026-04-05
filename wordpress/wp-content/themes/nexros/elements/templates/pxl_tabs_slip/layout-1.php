<?php 
$number_title = 1;
$number_content = 1;
$html_id = pxl_get_element_id($settings); 

if (!empty($settings['tabs']) && is_array($settings['tabs'])): ?>
    <div class="pxl-tabs-slip pxl-tabs-slip1 <?php echo esc_attr($settings['show_shape'] ? 'show-shape' : ''); ?>">
        
        <!-- Tab Titles -->
        <div class="pxl-tabs-title" style="position: sticky; top: 100px; min-width: 230px; display: inline-block; height: fit-content;">
            <?php foreach ($settings['tabs'] as $key => $tab) : ?>
                <?php if (!empty($tab['tab1_text'])): ?>
                    <div 
                        class="pxl-tab-title pxl-item--title-<?php echo esc_attr($number_title++); ?>" 
                        data-target="#<?php echo esc_attr($html_id . '-' . $tab['_id']); ?>">
                        <?php pxl_print_html($tab['tab1_text']); ?>        
                    </div>
                <?php endif; ?>
            <?php endforeach; ?>
            <div class="pxl-shape-container" style="display: grid;gap: 0; grid-template-columns: repeat(4, 1fr);"><div class="grid-item" style="background-color:#FFFFFF; opacity:1; animation-delay:0s; width: 100%; aspect-ratio: 1;mix-blend-mode: overlay;"></div><div class="grid-item" style="background-color:#FFFFFF; opacity:0; animation-delay:0.05s; width: 100%; aspect-ratio: 1;mix-blend-mode: overlay;"></div><div class="grid-item" style="background-color:#FFFFFF; opacity:1; animation-delay:0.1s; width: 100%; aspect-ratio: 1;mix-blend-mode: overlay;"></div><div class="grid-item" style="background-color:#FFFFFF; opacity:0; animation-delay:0.15s; width: 100%; aspect-ratio: 1;mix-blend-mode: overlay;"></div><div class="grid-item" style="background-color:#FFFFFF; opacity:0; animation-delay:0.2s; width: 100%; aspect-ratio: 1;mix-blend-mode: overlay;"></div><div class="grid-item" style="background-color:#FFFFFF; opacity:1; animation-delay:0.25s; width: 100%; aspect-ratio: 1;mix-blend-mode: overlay;"></div><div class="grid-item" style="background-color:#FFFFFF; opacity:0.5; animation-delay:0.3s; width: 100%; aspect-ratio: 1;mix-blend-mode: overlay;"></div><div class="grid-item" style="background-color:#FFFFFF; opacity:0.3; animation-delay:0.35s; width: 100%; aspect-ratio: 1;mix-blend-mode: overlay;"></div><div class="grid-item" style="background-color:#FFFFFF; opacity:1; animation-delay:0.4s; width: 100%; aspect-ratio: 1;mix-blend-mode: overlay;"></div><div class="grid-item" style="background-color:#FFFFFF; opacity:0.7; animation-delay:0.45s; width: 100%; aspect-ratio: 1;mix-blend-mode: overlay;"></div><div class="grid-item" style="background-color:#FFFFFF; opacity:0.5; animation-delay:0.5s; width: 100%; aspect-ratio: 1;mix-blend-mode: overlay;"></div><div class="grid-item" style="background-color:#FFFFFF; opacity:0.1; animation-delay:0.55s; width: 100%; aspect-ratio: 1;mix-blend-mode: overlay;"></div><div class="grid-item" style="background-color:#FFFFFF; opacity:0; animation-delay:0.6s; width: 100%; aspect-ratio: 1;mix-blend-mode: overlay;"></div><div class="grid-item" style="background-color:#FFFFFF; opacity:0.5; animation-delay:0.65s; width: 100%; aspect-ratio: 1;mix-blend-mode: overlay;"></div><div class="grid-item" style="background-color:#FFFFFF; opacity:0.1; animation-delay:0.7s; width: 100%; aspect-ratio: 1;mix-blend-mode: overlay;"></div><div class="grid-item" style="background-color:#FFFFFF; opacity:0; animation-delay:0.75s; width: 100%; aspect-ratio: 1;mix-blend-mode: overlay;"></div></div>
        </div>

        <!-- Tab Contents -->
        <div class="pxl-tabs--content">
            <?php foreach ($settings['tabs'] as $key => $tab) : 
                $template_id = !empty($tab['content_template']) ? (int) $tab['content_template'] : 0;
                $content_id = $html_id . '-' . $tab['_id'];
            ?>
                <div 
                    id="<?php echo esc_attr($content_id); ?>" 
                    class="pxl-tab-content pxl-item--content-<?php echo esc_attr($number_content++); ?>">
                    <?php 
                        if ($template_id) {
                            $tab_content = Elementor\Plugin::$instance->frontend->get_builder_content_for_display($template_id);
                            pxl_print_html($tab_content);
                        }
                    ?>        
                </div>
            <?php endforeach; ?>
        </div>
    </div>
<?php endif; ?>
