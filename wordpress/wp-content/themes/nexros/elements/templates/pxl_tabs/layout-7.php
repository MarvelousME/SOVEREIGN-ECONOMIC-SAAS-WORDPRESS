<div class="pxl-tabs pxl-tabs--layout-3 <?php echo esc_attr($settings['tab_effect'].' '.$settings['style'].' '.$settings['pxl_animate']); ?>" data-wow-delay="<?php echo esc_attr($settings['pxl_animate_delay']); ?>ms" >
    <div class="pxl-tabs__inner">
        <div class="pxl-tabs__switch">
            <div class="pxl-tabs__switch-btn" data-st="<?php echo esc_attr($settings['tab1_text']); ?>" data-nd="<?php echo esc_attr($settings['tab2_text']); ?>">
                <div class="pricing-toggle">
                    <label class="switch">
                      <input type="checkbox" id="toggle-input" />
                      <span class="slider">
                        <span class="label-monthly"><?php echo esc_html($settings['tab1_text']); ?></span>
                        <span class="label-yearly"><?php echo esc_html($settings['tab2_text']); ?></span>   
                      </span>
                  </label>
              </div>
          </div>
      </div>

      <div class="pxl-tabs__content">
        <div class="pxl-tabs__item active">
            <?php
            $tab_content = Elementor\Plugin::$instance->frontend->get_builder_content_for_display( (int)$settings['content_template_tab_1']);
            $tab_bd_ids[] = (int)$settings['content_template_tab_1'];
            pxl_print_html($tab_content);
            ?>  
        </div>
        <div class="pxl-tabs__item">
            <?php
            $tab_content = Elementor\Plugin::$instance->frontend->get_builder_content_for_display( (int)$settings['content_template_tab_2']);
            $tab_bd_ids[] = (int)$settings['content_template_tab_2'];
            pxl_print_html($tab_content);
            ?>  
        </div>
    </div>
</div>
</div>