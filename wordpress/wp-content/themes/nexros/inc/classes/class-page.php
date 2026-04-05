<?php

if (!class_exists('Nexros_Page')) {

    class Nexros_Page
    {
        public function get_site_loader(){

            $site_loader = nexros()->get_theme_opt( 'site_loader', false );
            $loader_logo = nexros()->get_theme_opt('loader_logo' );
            if($site_loader) { ?>
                <div id="pxl-loadding" class="pxl-loader">
                    <div class="loader-circle">
                        <div class="loader-line-mask">
                            <div class="loader-line"></div>
                        </div>
                        <div class="loader-logo"><img src="<?php echo esc_url($loader_logo['url']); ?>" /></div>
                    </div>
                </div>
            <?php } 
        }

        public function get_link_pages() {
            wp_link_pages( array(
                'before'      => '<div class="page-links">',
                'after'       => '</div>',
                'link_before' => '<span>',
                'link_after'  => '</span>',
            ) ); 
        }

        public function get_page_title(){
            $titles = $this->get_title();
            $pt_mode = nexros()->get_opt('pt_mode');
            $ptitle_scroll_opacity = nexros()->get_opt('ptitle_scroll_opacity');
            $custom_main_title = nexros()->get_opt('custom_main_title');
            $custom_ptitle_desc = nexros()->get_opt('custom_ptitle_desc');
            // Ensure product singles use their own titles, not a global custom title
            if ( function_exists('is_singular') && is_singular('product') ) {
                $custom_main_title = '';
            }
            if( $pt_mode == 'none' ) return;
            $ptitle_layout = (int)nexros()->get_opt('ptitle_layout');
            if ($pt_mode == 'bd' && $ptitle_layout > 0 && class_exists('Pxltheme_Core') && is_callable( 'Elementor\Plugin::instance' )) {
                ?>
                <div id="pxl-page-title-elementor" class="<?php if($ptitle_scroll_opacity == true) { echo 'pxl-scroll-opacity'; } ?>">
                    <?php echo Elementor\Plugin::$instance->frontend->get_builder_content_for_display( $ptitle_layout);?>
                </div>
                <?php 
            } else {
                $ptitle_breadcrumb_on = nexros()->get_opt( 'ptitle_breadcrumb_on', '1' ); 
                wp_enqueue_script('stellar-parallax'); ?>
                <div id="pxl-page-title-default" class="pxl--parallax" data-stellar-background-ratio="0.79">
                    <div class="container">
                        <div class="row">
                            <div class="col-12">
                                <h2 class="pxl-page-title"><?php if (!empty($custom_main_title)) {
                                    echo pxl_print_html($custom_main_title);
                                } else {echo nexros_html($titles['title']);} ?></h2>
                                <p class="pxl-page-desc"><?php echo pxl_print_html($custom_ptitle_desc) ?></p>
                            </div>
                            <div class="ptitle-col-right col-12">
                                <?php if($ptitle_breadcrumb_on == '1') : ?>
                                    <?php $this->get_breadcrumb(); ?>
                                <?php endif; ?>
                            </div>
                        </div>
                        <div class="triangle-grid">
                            <div class="triangle-row"><div class="diamond"></div></div>
                            <div class="triangle-row"><div class="diamond"></div><div class="diamond"></div></div>
                            <div class="triangle-row"><div class="diamond"></div><div class="diamond"></div><div class="diamond"></div></div>
                            <div class="triangle-row"><div class="diamond"></div><div class="diamond"></div><div class="diamond"></div><div class="diamond"></div></div>
                        </div>
                    </div>
                </div>
            <?php } 
        } 

        public function get_title() {
            $title = '';
            // Default titles
            if ( ! is_archive() ) {
                // Posts page view
                if ( is_home() ) {
                    // Only available if posts page is set.
                    if ( ! is_front_page() && $page_for_posts = get_option( 'page_for_posts' ) ) {
                        $title = get_post_meta( $page_for_posts, 'custom_title', true );
                        if ( empty( $title ) ) {
                            $title = get_the_title( $page_for_posts );
                        }
                    }
                    if ( is_front_page() ) {
                        $title = esc_html__( 'Blog', 'nexros' );
                    }
                } // Single page view
                elseif ( is_page() ) {
                    $title = get_post_meta( get_the_ID(), 'custom_title', true );
                    if ( ! $title ) {
                        $title = get_the_title();
                    }
                } elseif ( is_404() ) {
                    $title = esc_html__( '404 Error', 'nexros' );
                } elseif ( is_search() ) {
                    $title = esc_html__( 'Search results', 'nexros' );
                } elseif ( is_singular('lp_course') ) {
                    $title = esc_html__( 'Course', 'nexros' );
                } else {
                    $title = get_post_meta( get_the_ID(), 'custom_title', true );
                    if ( ! $title ) {
                        $title = get_the_title();
                    }
                }
            } else {
                $title = get_the_archive_title();
                if( (class_exists( 'WooCommerce' ) && is_shop()) ) {
                    $title = get_post_meta( wc_get_page_id('shop'), 'custom_title', true );
                    if(!$title) {
                        $title = get_the_title( get_option( 'woocommerce_shop_page_id' ) );
                    }
                }
            }

            return array(
                'title' => $title,
            );
        }

        public function get_breadcrumb() {

            if ( ! class_exists( 'CASE_Breadcrumb' ) ) {
                return;
            }
        
            $breadcrumb = new CASE_Breadcrumb();
            $entries = $breadcrumb->get_entries();
        
            if ( empty( $entries ) ) {
                return;
            }
        
            ob_start();
        
            $first_item = true;
        
            foreach ( $entries as $entry ) {
                $entry = wp_parse_args( $entry, array(
                    'label' => '',
                    'url'   => ''
                ) );
        
                $entry_label = $entry['label'];
        
                if ( ! empty( $_GET['blog_title'] ) ) {
                    $blog_title   = sanitize_text_field( $_GET['blog_title'] );
                    $custom_title = explode( '_', $blog_title );
                    $arr_str_b    = [];
                    foreach ( $custom_title as $index => $value ) {
                        $arr_str_b[$index] = $value;
                    }
                    $entry_label = implode( ' ', $arr_str_b );
                }
        
                if ( empty( $entry_label ) ) {
                    continue;
                }
        
                echo '<li>';
                if ( ! $first_item ) {
                    echo '<span class="breadcrumb-sep" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="7" height="12" viewBox="0 0 7 12" fill="none"><path d="M1 1.33341L5.66667 6.00008L1 10.6667" stroke="#0B282E" stroke-opacity="0.6" stroke-linecap="round" stroke-linejoin="round"/></svg></span>';
                }
        
                if ( ! empty( $entry['url'] ) ) {
                    printf(
                        '<a class="breadcrumb-hidden" href="%1$s">%2$s</a>',
                        esc_url( $entry['url'] ),
                        esc_html( $entry_label ) 
                    );
                } else {
                    $sg_post_title        = nexros()->get_theme_opt('sg_post_title', 'default');
                    $sg_post_title_text   = nexros()->get_theme_opt('custom_main_title');
                    if ( is_singular('post') && $sg_post_title === 'custom_text' && ! empty($sg_post_title_text) ) {
                        $entry_label = $sg_post_title_text;
                    }
        
                    $sg_product_ptitle      = nexros()->get_theme_opt('sg_product_ptitle', 'default');
                    $sg_product_ptitle_text = nexros()->get_theme_opt('sg_product_ptitle_text');
                    if ( is_singular('product') && $sg_product_ptitle === 'custom_text' && ! empty($sg_product_ptitle_text) ) {
                        $entry_label = $sg_product_ptitle_text;
                    }
        
                    printf( '<span class="breadcrumb-entry">%s</span>', esc_html( $entry_label ) );
                }
        
                $first_item = false;
                echo '</li>';
            }
        
            $output = ob_get_clean();
        
            if ( $output ) {
                echo '<ul class="pxl-breadcrumb">' . $output . '</ul>';
            }
        }        

        public function get_pagination( $query = null, $ajax = false ){

            if($ajax){
                add_filter('paginate_links', 'nexros_ajax_paginate_links');
            }

            $classes = array();

            if ( empty( $query ) )
            {
                $query = $GLOBALS['wp_query'];
            }

            if ( empty( $query->max_num_pages ) || ! is_numeric( $query->max_num_pages ) || $query->max_num_pages < 2 )
            {
                return;
            }

            $paged = $query->get( 'paged', '' );

            if ( ! $paged && is_front_page() && ! is_home() )
            {
                $paged = $query->get( 'page', '' );
            }

            $paged = $paged ? intval( $paged ) : 1;

            $pagenum_link = html_entity_decode( get_pagenum_link() );
            $query_args   = array();
            $url_parts    = explode( '?', $pagenum_link );

            if ( isset( $url_parts[1] ) )
            {
                wp_parse_str( $url_parts[1], $query_args );
            }

            $pagenum_link = remove_query_arg( array_keys( $query_args ), $pagenum_link );
            $pagenum_link = trailingslashit( $pagenum_link ) . '%_%';
            $paginate_links_args = array(
                'base'     => $pagenum_link,
                'total'    => $query->max_num_pages,
                'current'  => $paged,
                'mid_size' => 1,
                'add_args' => array_map( 'urlencode', $query_args ),
                'prev_text' => '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="10" viewBox="0 0 12 10" fill="none">
                <path d="M11.8403 5.39223L8.02208 9.21041C7.9192 9.30977 7.78142 9.36475 7.6384 9.3635C7.49538 9.36226 7.35858 9.3049 7.25744 9.20376C7.15631 9.10263 7.09894 8.96583 7.0977 8.82281C7.09646 8.67979 7.15144 8.54201 7.2508 8.43914L10.1379 5.55205L0.54546 5.55205C0.400795 5.55205 0.262055 5.49458 0.159761 5.39229C0.0574676 5.28999 -3.68248e-07 5.15126 -3.80895e-07 5.00659C-3.93542e-07 4.86193 0.0574675 4.72319 0.159761 4.6209C0.262055 4.5186 0.400794 4.46114 0.545459 4.46114L10.1379 4.46114L7.2508 1.57405C7.1987 1.52373 7.15715 1.46354 7.12856 1.39699C7.09997 1.33045 7.08492 1.25887 7.0843 1.18645C7.08367 1.11402 7.09747 1.0422 7.12489 0.975163C7.15232 0.908128 7.19282 0.847227 7.24404 0.796013C7.29525 0.744799 7.35615 0.704297 7.42319 0.676871C7.49022 0.649445 7.56205 0.635643 7.63447 0.636273C7.7069 0.636902 7.77848 0.65195 7.84502 0.680537C7.91157 0.709123 7.97176 0.750676 8.02208 0.802773L11.8403 4.62095C11.9426 4.72324 12 4.86196 12 5.00659C12 5.15123 11.9426 5.28994 11.8403 5.39223Z" fill="#0B282E"/>
                </svg> ' . esc_html__('Previous', 'nexros'),
                'next_text' => esc_html__('Next', 'nexros') . ' <svg xmlns="http://www.w3.org/2000/svg" width="12" height="10" viewBox="0 0 12 10" fill="none">
                <path d="M11.8403 5.39223L8.02208 9.21041C7.9192 9.30977 7.78142 9.36475 7.6384 9.3635C7.49538 9.36226 7.35858 9.3049 7.25744 9.20376C7.15631 9.10263 7.09894 8.96583 7.0977 8.82281C7.09646 8.67979 7.15144 8.54201 7.2508 8.43914L10.1379 5.55205L0.54546 5.55205C0.400795 5.55205 0.262055 5.49458 0.159761 5.39229C0.0574676 5.28999 -3.68248e-07 5.15126 -3.80895e-07 5.00659C-3.93542e-07 4.86193 0.0574675 4.72319 0.159761 4.6209C0.262055 4.5186 0.400794 4.46114 0.545459 4.46114L10.1379 4.46114L7.2508 1.57405C7.1987 1.52373 7.15715 1.46354 7.12856 1.39699C7.09997 1.33045 7.08492 1.25887 7.0843 1.18645C7.08367 1.11402 7.09747 1.0422 7.12489 0.975163C7.15232 0.908128 7.19282 0.847227 7.24404 0.796013C7.29525 0.744799 7.35615 0.704297 7.42319 0.676871C7.49022 0.649445 7.56205 0.635643 7.63447 0.636273C7.7069 0.636902 7.77848 0.65195 7.84502 0.680537C7.91157 0.709123 7.97176 0.750676 8.02208 0.802773L11.8403 4.62095C11.9426 4.72324 12 4.86196 12 5.00659C12 5.15123 11.9426 5.28994 11.8403 5.39223Z" fill="#0B282E"/>
                </svg>',
            );
            if($ajax){
                $paginate_links_args['format'] = '?page=%#%';
            }
            $links = paginate_links( $paginate_links_args );
            if ( $links ):
                ?>
                <nav class="pxl-pagination-wrap <?php echo esc_attr($ajax?'ajax':''); ?>">
                    <div class="pxl-pagination-links">
                        <?php
                        echo ''.$links;
                        ?>
                    </div>
                </nav>
                <?php
            endif;
        }
    }
}
