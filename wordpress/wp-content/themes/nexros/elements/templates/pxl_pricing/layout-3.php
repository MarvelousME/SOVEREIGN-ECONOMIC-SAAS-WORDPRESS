<div class="pxl-pricing pxl-pricing__style-3 <?php echo esc_attr( $settings['active_l4'] === 'true' ? 'pxl-pricing__active' : '' ); ?> <?php echo esc_attr($settings['pxl_animate']); ?>" data-wow-delay="<?php echo esc_attr($settings['pxl_animate_delay']); ?>ms" >
    <div class="pxl-pricing__top">
        <?php if (!empty($settings['popular_text_l4'])) : ?>
            <div class="pxl-pricing__popular">
                <?php echo pxl_print_html( $widget->parse_text_editor( $settings['popular_text_l4'] ) ); ?>
            </div>
        <?php endif; ?>
        <?php if (!empty($settings['plan_l4'])) : ?>
            <h5 class="pxl-pricing__title">
                <?php echo pxl_print_html( $widget->parse_text_editor( $settings['plan_l4'] ) ); ?>
            </h5>
        <?php endif; ?>
        <?php if (!empty($settings['desc_l4'])) : ?>
            <p class="pxl-pricing__desc">
                <?php echo esc_attr($settings['desc_l4']); ?>
            </p>
        <?php endif; ?>
        <div class="pxl-pricing__price">
            <span class="pxl-pricing__price-detail"><?php echo esc_html($settings['currency_l4']); ?><span data-price-st="<?php echo esc_attr($settings['price_l41']) ?>" data-price-nd="<?php echo esc_attr($settings['price_l42']) ?>"><?php echo esc_html($settings['price_l41']); ?></span></span><?php if($settings['period_l41']): ?>
            <span class="pxl-pricing__price-period"<?php if($settings['period_l41']): ?> data-period-st="<?php echo esc_attr($settings['period_l41']); ?>"<?php endif; ?><?php if($settings['period_l42']): ?> data-period-nd="<?php echo esc_attr($settings['period_l42']); ?>"<?php endif; ?>><?php echo esc_html($settings['period_l41']); ?></span><?php endif; ?>
        </div>
        <?php if (!empty($settings['sub_l4'])) : ?>
            <p class="pxl-pricing__sub">
                <?php echo esc_attr($settings['sub_l4']); ?>
            </p>
        <?php endif; ?>
    </div>
        <?php if (!empty($settings['sub_feature_l4'])) : ?>
            <p class="pxl-pricing__subfeature">
                <?php echo esc_attr($settings['sub_feature_l4']); ?>
            </p>
        <?php endif; ?>
        <?php if(isset($settings['feature_l4']) && !empty($settings['feature_l4']) && count($settings['feature_l4'])): ?>
        <ul class="pxl-pricing__fea">
            <?php
            foreach ($settings['feature_l4'] as $key => $item):
                $feature_text = $widget->parse_text_editor( $item['feature_text_l4'] ); 
                $icon_key = $widget->get_repeater_setting_key( 'feature_icon_l4', 'icons', $key );
                $widget->add_render_attribute( $icon_key, [
                    'class' => $item['feature_icon_l4'],
                    'aria-hidden' => 'true',
                ] );
                ?>
                <?php $is_title = isset($item['feature_is_title']) && $item['feature_is_title'] === 'true'; ?>
                <li class="pxl-pricing__fea-item<?php echo esc_attr( $is_title ? ' pxl-pricing__fea-title' : '' ); ?>">
                    <?php 
                    if($icon_key) :
                        \Elementor\Icons_Manager::render_icon( $item['feature_icon_l4'], [ 'aria-hidden' => 'true' ], 'i' );
                    else :
                        echo '<span class="pxl-pricing__fea-item--dot"></span>';
                    endif; 

                    if($feature_text) :
                        echo pxl_print_html($feature_text);
                    endif; ?>
                </li>
            <?php endforeach; ?>
        </ul>
    <?php endif; ?>
<?php if ( ! empty( $settings['btn_text_l4'] ) || ! empty( $settings['btn_text_l4_2'] ) ) {
            $widget->add_render_attribute( 'btn_link_l4', 'href', $settings['btn_link_l4']['url'] );
            $widget->add_render_attribute( 'btn_link_l4_2', 'href', $settings['btn_link_l4_2']['url'] );
            if ( $settings['btn_link_l4']['is_external'] ) {
                $widget->add_render_attribute( 'btn_link_l4', 'target', '_blank' );
            }
            if ( $settings['btn_link_l4_2']['is_external'] ) {
                $widget->add_render_attribute( 'btn_link_l4_2', 'target', '_blank' );
            }
            if ( $settings['btn_link_l4_2']['nofollow'] ) {
                $widget->add_render_attribute( 'btn_link_l4_2', 'rel', 'nofollow' );
            }
            if ( $settings['btn_link_l4']['nofollow'] ) {
                $widget->add_render_attribute( 'btn_link_l4', 'rel', 'nofollow' );
            }
            ?>
            <div class="pxl-pricing__bottom">
                <a <?php pxl_print_html($widget->get_render_attribute_string( 'btn_link_l4' )); ?> class="pxl-pricing__button btn btn-glossy <?php echo esc_attr( $settings['active_l4'] === 'yes' ? 'btn__pricing-active' : '' ); ?>">
                    <?php echo esc_html($settings['btn_text_l4']); ?>
                </a>
                <?php if (!empty($settings['btn_text_l4_2'])) : ?>
                    <a <?php pxl_print_html($widget->get_render_attribute_string( 'btn_link_l4_2' )); ?> class="pxl-pricing__button btn btn-glossy <?php echo esc_attr( $settings['active_l4'] === 'yes' ? 'btn__pricing-active' : '' ); ?>">
                        <?php echo esc_html($settings['btn_text_l4_2']); ?>
                    </a>
                <?php endif; ?>
        </div>
        <?php } ?>
</div>