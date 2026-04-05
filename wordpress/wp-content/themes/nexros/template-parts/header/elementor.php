<?php 
$logo_m = nexros()->get_opt( 'logo_m', ['url' => get_template_directory_uri().'/assets/img/logo.png', 'id' => '' ] );
$p_menu = nexros()->get_page_opt('p_menu');
$header_mobile = nexros()->get_page_opt('header_mobile', 'show');
$header_display = nexros()->get_page_opt('header_display', 'show');
$sticky_scroll = nexros()->get_opt('sticky_scroll');
$pm_menu = nexros()->get_theme_opt('pm_menu');
$header_layout = nexros()->get_opt('header_layout');
$post_header = get_post($header_layout);
$header_type = get_post_meta( $post_header->ID, 'header_type', true );
$opt_mobile_style = nexros()->get_opt('opt_mobile_style');
$mobile_display = nexros()->get_opt('mobile_display');
$header_mobile_layout = nexros()->get_opt('header_mobile_layout');
$header_mobile_layout_count = (int)nexros()->get_opt('header_mobile_layout');
$post_header_mobile = get_post($header_mobile_layout);
?>
<?php if ($header_display == 'show' || is_search()): ?>
    
<header id="pxl-header-elementor" class="is-sticky pxl-header-<?php echo esc_attr($header_mobile); ?>"> 
    <?php if(isset($args['header_layout']) && $args['header_layout'] > 0) : ?>
        <div class="pxl-header-elementor-main <?php echo esc_attr($header_type); ?>">
          <div class="pxl-header-content">
              <div class="row">
               <div class="col-12">
                   <?php echo Elementor\Plugin::$instance->frontend->get_builder_content_for_display( $args['header_layout']); ?>
               </div>
           </div>
       </div>
   </div>
<?php endif; ?>
<?php if(isset($args['header_layout_sticky']) && $args['header_layout_sticky'] > 0) : ?>
  <div class="pxl-header-elementor-sticky pxl-onepage-sticky <?php echo esc_attr($sticky_scroll); ?>">
      <div class="pxl-header-content">
          <div class="row">
            <div class="col-12">
              <?php echo Elementor\Plugin::$instance->frontend->get_builder_content_for_display( $args['header_layout_sticky']); ?>
          </div>
      </div>
  </div>
</div>
<?php endif; ?>
<?php if($mobile_display == 'show') : ?>
    <div id="pxl-header-mobile" class="style-<?php echo esc_attr($opt_mobile_style); ?>">
        <div id="pxl-header-main" class="pxl-header-main">
            <div class="container">
                <div class="row">
                    <?php if ($header_mobile_layout_count <= 0 || !class_exists('Pxltheme_Core') || !is_callable( 'Elementor\Plugin::instance' )) { ?>
                        <div class="pxl-header-mobile-default">
                            <div class="pxl-header-branding">
                                <?php
                                if ($logo_m['url']) {
                                    printf(
                                        '<a href="%1$s" title="%2$s" rel="home"><img src="%3$s" alt="%2$s"/></a>',
                                        esc_url( home_url( '/' ) ),
                                        esc_attr( get_bloginfo( 'name' ) ),
                                        esc_url( $logo_m['url'] )
                                    );
                                }
                                ?>
                            </div>
                            <div id="pxl-nav-mobile">
                                <div class="pxl-nav-mobile-button pxl-anchor-divider pxl-cursor--cta">
                                    <span class="pxl-icon-line pxl-icon-line1"></span>
                                    <span class="pxl-icon-line pxl-icon-line2"></span>
                                    <span class="pxl-icon-line pxl-icon-line3"></span>
                                </div>
                            </div>
                        </div>
                    <?php } else { ?>
                        <div class="pxl-header-mobile-elementor <?php echo esc_attr($header_mobile_type); ?>">
                            <?php echo Elementor\Plugin::$instance->frontend->get_builder_content_for_display( $header_mobile_layout ); ?>
                        </div>
                    <?php } ?>
                    <div class="pxl-header-menu">
                        <div class="pxl-header-menu-scroll">
                            <div class="pxl-menu-close pxl-hide-xl pxl-close"></div>
                            <div class="pxl-logo-mobile pxl-hide-xl">
                                <?php
                                if ($logo_m['url']) {
                                    printf(
                                        '<a href="%1$s" title="%2$s" rel="home"><img src="%3$s" alt="%2$s"/></a>',
                                        esc_url( home_url( '/' ) ),
                                        esc_attr( get_bloginfo( 'name' ) ),
                                        esc_url( $logo_m['url'] )
                                    );
                                }
                                ?>
                            </div>
                            <?php nexros_header_mobile_search_form(); ?>
                            <nav class="pxl-header-nav">
                                <?php 
                                if ( has_nav_menu( 'primary' ) ) 
                                {
                                    $attr_menu = array(
                                        'theme_location' => 'primary',
                                        'container'  => '',
                                        'menu_id'    => '',
                                        'menu_class' => 'pxl-menu-primary clearfix',
                                        'link_before'     => '<span>',
                                        'link_after'      => '</span>',
                                        'walker'         => class_exists( 'PXL_Mega_Menu_Walker' ) ? new PXL_Mega_Menu_Walker : '',
                                    );
                                    if(isset($p_menu) && !empty($p_menu)) {
                                        $attr_menu['menu'] = $p_menu;
                                        if(isset($pm_menu) && !empty($pm_menu) && ($pm_menu) != '-1') {
                                            $attr_menu['menu'] = $pm_menu;
                                        }
                                    }
                                    wp_nav_menu( $attr_menu );
                                } else { ?>
                                    <ul class="pxl-menu-primary">
                                        <?php wp_list_pages( array(
                                            'depth'        => 0,
                                            'show_date'    => '',
                                            'date_format'  => get_option( 'date_format' ),
                                            'child_of'     => 0,
                                            'exclude'      => '',
                                            'title_li'     => '',
                                            'echo'         => 1,
                                            'authors'      => '',
                                            'sort_column'  => 'menu_order, post_title',
                                            'link_before'  => '',
                                            'link_after'   => '',
                                            'item_spacing' => 'preserve',
                                            'walker'       => '',
                                        ) ); ?>
                                    </ul>
                                <?php }
                                ?>
                            </nav>
                        </div>
                    </div>
                    <div class="pxl-header-menu-backdrop"></div>
                </div>
            </div>
        </div>
    </div>
<?php endif; ?>
</header>
<?php endif ?>
