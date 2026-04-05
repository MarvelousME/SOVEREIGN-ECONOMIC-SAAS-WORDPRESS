<?php if(isset($settings['gallery']) && !empty($settings['gallery']) && count($settings['gallery'])):
    $pxl_g_id = uniqid();
    $total = count($settings['gallery']);
    $num = 0;
    wp_enqueue_script( 'pxl-scroll-mousewheel', get_template_directory_uri() . '/assets/js/libs/scroll/mousewheel.min.js', array( 'jquery' ), '3.1.13', true );
    wp_enqueue_script( 'pxl-scroll-main', get_template_directory_uri() . '/assets/js/libs/scroll/main.js', array( 'jquery' ), '1.0.0', true );
    $image_size = !empty($settings['img_size']) ? $settings['img_size'] : '282x432';
    ?>
    <div id="pxl-gallery-<?php echo esc_attr($pxl_g_id); ?>" class="pxl-gallery-scroll pxl-gallery-scroll1 h-fit-to-screen" data-item="<?php echo esc_attr($total - 1); ?>">

        <div class="pxl-gallery-backdrop">
            <?php foreach ($settings['gallery'] as $key => $value):
                $imgs = isset($value['imgs']) ? $value['imgs'] : '';
                if($key == '0') : ?>
                    <div class="pxl--item">
                        <div class="pxl--gallery">
                            <?php foreach ($imgs as $key_child => $value_child) { 
                                $img = pxl_get_image_by_size( array(    
                                    'attach_id'  => $value_child['id'],
                                    'thumb_size' => $image_size,
                                ));
                                $thumbnail = $img['thumbnail']; 
                                $thumbnail_url = $img['url']; 
                                ?>
                                <div class="pxl-item--image">
                                    <div class="pxl-image--inner">
                                        <?php echo wp_kses_post($thumbnail); ?>
                                    </div>
                                </div>
                            <?php } ?>
                        </div> 
                    </div>
                <?php endif; ?>
            <?php endforeach; ?>
        </div>

        <div class="pxl-gallery-front">
            <?php foreach (array_reverse($settings['gallery']) as $key => $value):
                $imgs = isset($value['imgs']) ? $value['imgs'] : ''; ?>
                <div class="pxl--item <?php if($num == $total-1){ echo 'active'; } ?>">
                    <h4 class="pxl-item--title"><?php echo pxl_print_html($value['title']); ?></h4>
                    <div class="pxl--gallery">
                        <?php foreach ($imgs as $key_child => $value_child) { 
                            $img = pxl_get_image_by_size( array(    
                                'attach_id'  => $value_child['id'],
                                'thumb_size' => $image_size,
                            ));
                            $thumbnail = $img['thumbnail']; 
                            $thumbnail_url = $img['url']; 
                            $img_theme_custom_link = get_post_meta( $value_child['id'], 'img_theme_custom_link', true ); ?>
                            <div class="pxl-item--image">
                                <div class="pxl-image--inner">
                                    <div class="bg-image" style="background-image: url(<?php echo esc_url($thumbnail_url); ?>);"></div>
                                    <span class="pxl-item--button">+</span>
                                    <a class="pxl-item--link" href="<?php if(!empty($img_theme_custom_link)) { echo esc_url($img_theme_custom_link); } else { echo esc_url($thumbnail_url); } ?>" <?php if(empty($img_theme_custom_link)) : ?>data-elementor-lightbox-slideshow="pxl-gallery-<?php echo esc_attr($pxl_g_id); ?>"<?php endif; ?>></a>
                                </div>
                            </div>
                        <?php } ?>
                    </div>
                </div>
                <?php $num++ ?>
            <?php endforeach; ?>
        </div>

        <div class="pxl-gallery--nav">
            <div class="pxl-group--number">
                <?php $num = 0; foreach (array_reverse($settings['gallery']) as $number => $number_child) : ?>
                    <div class="pxl-item--number <?php if($num == $total-1){ echo 'active'; } ?>">
                        <?php if($number < 10) { echo '0'; } echo esc_attr($total - $number); ?>
                    </div>
                    <?php $num++ ?>
                <?php endforeach; ?>
            </div>
            <div class="pxl-item--total"><?php if($total < 10) { echo '0'; } echo esc_attr($total); ?></div>
        </div>

    </div>
<?php endif; ?>