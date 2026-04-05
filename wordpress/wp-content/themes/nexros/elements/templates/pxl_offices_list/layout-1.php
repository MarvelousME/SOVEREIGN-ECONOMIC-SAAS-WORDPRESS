<?php if(isset($settings['lists']) && !empty($settings['lists']) && count($settings['lists'])): ?>
<?php 
$labels = array_unique(array_filter(array_column($settings['lists'], 'label')));
?>
<div class="pxl-offices-list pxl-offices-list1">
    <?php if ($settings['filter'] == 'true') { ?>
        <div class="pxl-offices-filter">
            <select id="filter-label">
                <option value=""><?php esc_html_e('Location', 'nexros'); ?></option>
                <?php foreach ($labels as $label): ?>
                    <option value="<?php echo esc_attr($label); ?>"><?php echo esc_html($label); ?></option>
                <?php endforeach; ?>
            </select>
        </div>
    <?php } ?>
    <?php foreach ($settings['lists'] as $key => $value):
        $social = isset($value['social']) ? $value['social'] : '';
        $image = isset($value['image']) ? $value['image'] : '';
        $btn_text = isset($value['btn_text']) ? $value['btn_text'] : '';
        $label = isset($value['label']) ? $value['label'] : '';
        $link_key = $widget->get_repeater_setting_key( 'btn_link', 'value', $key );

        if (!empty($value['btn_link']['url'])) {
            $widget->add_render_attribute( $link_key, 'href', $value['btn_link']['url'] );

            if ($value['btn_link']['is_external']) {
                $widget->add_render_attribute( $link_key, 'target', '_blank' );
            }

            if ($value['btn_link']['nofollow']) {
                $widget->add_render_attribute( $link_key, 'rel', 'nofollow' );
            }
        }
        $link_attributes = $widget->get_render_attribute_string($link_key);
        ?>
        <div class="pxl--item <?php echo esc_attr($settings['pxl_animate']); ?>" data-wow-delay="<?php echo esc_attr($settings['pxl_animate_delay']); ?>ms" data-label="<?php echo esc_attr($label); ?>" >
            <?php if(!empty($label) && !empty($btn_text)) : ?>
            <div class="pxl-item--left pxl-flex-justify">
                <h3 class="pxl-item-label"><?php echo pxl_print_html($label); ?></h3>
                <a <?php echo implode( ' ', [ $link_attributes ] ); ?>><span><?php echo pxl_print_html($btn_text); ?></span><svg xmlns="http://www.w3.org/2000/svg" width="15" height="11" viewBox="0 0 15 11" fill="none">
                  <path d="M14.8004 5.00953L10.0276 0.236805C9.899 0.112606 9.72677 0.0438825 9.548 0.0454359C9.36923 0.0469894 9.19822 0.118696 9.0718 0.24511C8.94539 0.371525 8.87368 0.542533 8.87213 0.721304C8.87057 0.900074 8.9393 1.0723 9.0635 1.2009L12.6724 4.80976L0.681825 4.80976C0.500994 4.80976 0.327569 4.88159 0.199702 5.00946C0.0718349 5.13732 0 5.31075 0 5.49158C0 5.67241 0.0718349 5.84583 0.199702 5.97369C0.327569 6.10156 0.500994 6.17339 0.681825 6.17339L12.6724 6.17339L9.0635 9.78226C8.99838 9.84515 8.94643 9.92039 8.9107 10.0036C8.87497 10.0868 8.85616 10.1762 8.85537 10.2668C8.85458 10.3573 8.87183 10.4471 8.90612 10.5309C8.9404 10.6147 8.99103 10.6908 9.05505 10.7548C9.11906 10.8188 9.19519 10.8694 9.27899 10.9037C9.36278 10.938 9.45256 10.9553 9.54309 10.9545C9.63363 10.9537 9.72309 10.9349 9.80628 10.8991C9.88947 10.8634 9.9647 10.8115 10.0276 10.7463L14.8004 5.97362C14.9282 5.84576 15 5.67237 15 5.49158C15 5.31078 14.9282 5.13739 14.8004 5.00953Z" fill="#5230DA"/>
              </svg></a>
          </div>
      <?php endif; ?>

      <?php if(!empty($social)): ?>
        <div class="pxl-item--location pxl-flex-justify">
            <?php
            $team_social = json_decode($social, true);
            foreach ($team_social as $value):
                if (!empty($value['url'])): ?>
                    <a href="<?php echo esc_url($value['url']); ?>">
                    <?php endif; ?>
                    <span><?php echo pxl_print_html($value['content']); ?></span>
                    <?php if (!empty($value['url'])): ?>
                    </a>
                <?php endif;
            endforeach;
            ?>
        </div>
    <?php endif; ?>

    <?php if(!empty($image['id'])) { 
        $img = pxl_get_image_by_size( array(
            'attach_id'  => $image['id'],
            'thumb_size' => 'full',
            'class' => 'no-lazyload',
        ));
        $thumbnail_url = $img['url'];
        ?>
        <div class="wrap-image" style="background-image:url(<?php echo esc_url($thumbnail_url); ?>);"></div>
    <?php } ?>
</div>
<?php endforeach; ?>
</div>
<?php endif; ?>
