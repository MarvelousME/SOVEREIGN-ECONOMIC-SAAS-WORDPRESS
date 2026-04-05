<?php
$col_xs = $widget->get_setting('col_xs', '');
$col_sm = $widget->get_setting('col_sm', '');
$col_md = $widget->get_setting('col_md', '');
$col_lg = $widget->get_setting('col_lg', '');
$col_xl = $widget->get_setting('col_xl', '');

if($col_xl == 'auto') {
    $col_xl = 'auto';
} elseif ($col_xl == '5') {
    $col_xl = 'pxl5';
} else {
    $col_xl = 12 / intval($col_xl);
}

if($col_lg == 'auto') {
    $col_lg = 'auto';
} elseif ($col_lg == '5') {
    $col_lg = 'pxl5';
} else {
    $col_lg = 12 / intval($col_lg);
}

if($col_md == 'auto') {
    $col_md = 'col-md-auto';
} else {
    $col_md = 12 / intval($col_md);
}

if($col_sm == 'auto') {
    $col_sm = 'col-sm-auto';
} else {
    $col_sm = 12 / intval($col_sm);
}

if($col_xs == 'auto') {
    $col_xs = 'col-xs-auto';
} else {
    $col_xs = 12 / intval($col_xs);
}

$item_class = "col-xl-{$col_xl} col-lg-{$col_lg} col-md-{$col_md} col-sm-{$col_sm} col-{$col_xs}";
if(isset($settings['marquee']) && !empty($settings['marquee']) && count($settings['marquee'])): ?>
    <div class="pxl-logo-marquee1">
        <div class="pxl-logo-hidden-wrap">
            <div class="pxl-logo-hidden pxl-flex-middle">
                <?php foreach ($settings['marquee'] as $key => $value):
                    $text = isset($value['text']) ? $value['text'] : '';
                    $link_key = $widget->get_repeater_setting_key( 'link', 'value', $key );
                    if ( ! empty( $value['link']['url'] ) ) {
                        $widget->add_render_attribute( $link_key, 'href', $value['link']['url'] );

                        if ( $value['link']['is_external'] ) {
                            $widget->add_render_attribute( $link_key, 'target', '_blank' );
                        }

                        if ( $value['link']['nofollow'] ) {
                            $widget->add_render_attribute( $link_key, 'rel', 'nofollow' );
                        }
                    }
                    $link_attributes = $widget->get_render_attribute_string( $link_key );
                    ?>
                    <div class="pxl-item--logo <?php echo esc_attr($item_class); ?>">
                        <div class="pxl-item--inner <?php echo esc_attr($settings['pxl_animate']); ?>" data-wow-delay="<?php echo esc_attr($settings['pxl_animate_delay']); ?>ms">
                            <?php if(!empty($text)) { ?>
                                <h1 class="pxl-item--logo">
                                    <?php if ( ! empty( $value['link']['url'] ) ) { ?><a <?php echo implode( ' ', [ $link_attributes ] ); ?>><?php } ?>
                                    <?php echo pxl_print_html($text); ?>
                                    <?php if ( ! empty( $value['link']['url'] ) ) { ?></a><?php } ?>
                                </h1>
                            <?php } ?>
                        </div>
                    </div>
                <?php endforeach; ?>
            </div>
        </div>
        <div class="pxl-logo-active pxl-flex-middle">
            <?php foreach ($settings['marquee'] as $key => $value):
                $text = isset($value['text']) ? $value['text'] : '';
                $style = isset($value['style']) ? $value['style'] : '';
                $link_key2 = $widget->get_repeater_setting_key( 'link2', 'value', $key );
                if ( ! empty( $value['link']['url'] ) ) {
                    $widget->add_render_attribute( $link_key2, 'href', $value['link']['url'] );

                    if ( $value['link']['is_external'] ) {
                        $widget->add_render_attribute( $link_key2, 'target', '_blank' );
                    }

                    if ( $value['link']['nofollow'] ) {
                        $widget->add_render_attribute( $link_key2, 'rel', 'nofollow' );
                    }
                }
                $link_attributes2 = $widget->get_render_attribute_string( $link_key2 );
                ?>
                <div class="pxl-item--marquee <?php echo esc_attr($item_class.' '.$style); ?>" data-duration="<?php echo esc_attr($settings['slip_duration']); ?>" data-slip-type="<?php echo esc_attr($settings['slip_type']); ?>">
                    <div class="pxl-item--inner pxl-flex-middle <?php echo esc_attr($settings['pxl_animate']); ?>" data-wow-delay="<?php echo esc_attr($settings['pxl_animate_delay']); ?>ms">
                        <?php if ($style == 'style-1'): ?>
                            <svg xmlns="http://www.w3.org/2000/svg" width="27" height="35" viewBox="0 0 27 35" fill="none">
                              <path d="M13.9907 1.82212L1.338 14.3247C-0.445768 16.0873 -0.446033 18.9447 1.3374 20.707C3.12084 22.4693 6.01263 22.469 7.79639 20.7064L20.4491 8.20388C22.2328 6.44128 22.2331 3.58381 20.4497 1.82154C18.6662 0.0592599 15.7744 0.0595218 13.9907 1.82212Z" fill="white"/>
                              <path d="M19.2036 14.2936L6.55093 26.7961C4.76716 28.5587 4.7669 31.4162 6.55034 33.1785C8.33377 34.9407 11.2256 34.9405 13.0093 33.1779L25.662 20.6753C27.4458 18.9127 27.446 16.0553 25.6626 14.293C23.8792 12.5307 20.9874 12.531 19.2036 14.2936Z" fill="white"/>
                          </svg>
                      <?php endif ?>
                      <?php if(!empty($text)) { ?>
                        <h1 class="pxl-item--logo">
                            <?php if ( ! empty( $value['link']['url'] ) ) { ?><a <?php echo implode( ' ', [ $link_attributes2 ] ); ?>><?php } ?>
                            <?php echo pxl_print_html($text); ?>
                            <?php if ( ! empty( $value['link']['url'] ) ) { ?></a><?php } ?>
                        </h1>
                    <?php } ?>
                </div>
            </div>
        <?php endforeach; ?>
    </div>
</div>
<?php endif; ?>
