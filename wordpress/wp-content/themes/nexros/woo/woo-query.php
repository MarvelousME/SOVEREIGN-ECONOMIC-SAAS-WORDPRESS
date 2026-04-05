<?php 
 
defined( 'ABSPATH' ) || exit;
class Pxl_Woo_Query {
	protected static $instance = null;
	public $pxl_query_args = array();
	public static function instance() {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}

		return self::$instance;
	}
	public function init() {
		  
		add_filter( 'woocommerce_product_query_tax_query', [ $this, 'update_product_query_tax_query', ], 10, 2 );
		add_filter( 'woocommerce_widget_get_current_page_url', [ $this, 'update_widget_get_current_page_url', ], 10, 2 );
 		 
	}
	 
	public function update_product_query_tax_query( $tax_query, $wc_query ) {

		if ( isset( $_GET['filter_product_cat'] ) ) {  
			$cats = array_filter( array_map( 'absint', explode( ',', $_GET['filter_product_cat'] ) ) );  

			if ( $cats ) {
				$tax_query[] = array(
					'taxonomy' => 'product_cat',
					'terms'    => $cats,
					'operator' => 'IN',
				);
			}
		}

		if ( isset( $_GET['filter_product_brand'] ) ) {  
			$brands = array_filter( array_map( 'absint', explode( ',', $_GET['filter_product_brand'] ) ) );  

			if ( $brands ) {
				$tax_query[] = array(
					'taxonomy' => 'product_brand',
					'terms'    => $brands,
					'operator' => 'IN',
				);
			}
		}

		if ( isset( $_GET['filter_product_tag'] ) ) {  
			$tags = array_filter( array_map( 'absint', explode( ',', $_GET['filter_product_tag'] ) ) );  

			if ( $tags ) {
				$tax_query[] = array(
					'taxonomy' => 'product_tag',
					'terms'    => $tags,
					'operator' => 'IN',
				);
			}
		}
 
		return $tax_query;
	}
	public function get_main_price_query_sql( $min_price = null, $max_price = null, $page_shop = true ) {
		global $wp_query;
		global $wpdb;

		$args = $wp_query->query_vars;

		if( !$page_shop){
			$args = $this->pxl_query_args;
		}

		$sql = [
			'join'  => '',
			'where' => '',
		];

		$current_min_price = $current_min_price = null;

		if ( isset( $min_price ) && isset( $max_price ) ) {
			$current_min_price = floatval( $min_price );
			$current_max_price = floatval( $max_price );
		} elseif ( isset( $args['min_price'] ) && isset( $args['max_price'] ) ) {
			$current_min_price = floatval( wp_unslash( $args['min_price'] ) );
			$current_max_price = floatval( wp_unslash( $args['max_price'] ) );
		}

		if ( isset( $current_min_price ) && isset( $current_max_price ) ) {
			if ( wc_tax_enabled() && 'incl' === get_option( 'woocommerce_tax_display_shop' ) && ! wc_prices_include_tax() ) {
				$tax_class = apply_filters( 'woocommerce_price_filter_widget_tax_class', '' ); // Uses standard tax class.
				$tax_rates = \WC_Tax::get_rates( $tax_class );

				if ( $tax_rates ) {
					$current_min_price -= \WC_Tax::get_tax_total( \WC_Tax::calc_inclusive_tax( $current_min_price, $tax_rates ) );
					$current_max_price -= \WC_Tax::get_tax_total( \WC_Tax::calc_inclusive_tax( $current_max_price, $tax_rates ) );
				}
			}

			$sql['join']  = " LEFT JOIN {$wpdb->wc_product_meta_lookup} wc_product_meta_lookup ON $wpdb->posts.ID = wc_product_meta_lookup.product_id ";
			$sql['where'] = $wpdb->prepare(
				' AND NOT (%f<wc_product_meta_lookup.min_price OR %f>wc_product_meta_lookup.max_price ) ',
				$current_max_price,
				$current_min_price
			);
		}

		return $sql;
	}
	public function get_main_search_query_sql() {
		global $wpdb;
		global $wp_query;

		$args = $wp_query->query_vars;

		$search_terms = isset( $args['search_terms'] ) ? $args['search_terms'] : array();
		$sql          = array();

		foreach ( $search_terms as $term ) {
			$include = '-' !== substr( $term, 0, 1 );

			if ( $include ) {
				$like_op  = 'LIKE';
				$andor_op = 'OR';
			} else {
				$like_op  = 'NOT LIKE';
				$andor_op = 'AND';
				$term     = substr( $term, 1 );
			}

			$like = '%' . $wpdb->esc_like( $term ) . '%';
			$sql[] = $wpdb->prepare( "(($wpdb->posts.post_title $like_op %s) $andor_op ($wpdb->posts.post_excerpt $like_op %s) $andor_op ($wpdb->posts.post_content $like_op %s))", $like, $like, $like );
		}

		if ( ! empty( $sql ) && ! is_user_logged_in() ) {
			$sql[] = "($wpdb->posts.post_password = '')";
		}

		return implode( ' AND ', $sql );
	}
	public function get_main_tax_query() {
		global $wp_query;

		$tax_query = isset( $wp_query->tax_query, $wp_query->tax_query->queries ) ? $wp_query->tax_query->queries : array();

		return $tax_query;
	}
	public function get_main_meta_query() {
		global $wp_query;

		$args       = $wp_query->query_vars;
		$meta_query = isset( $args['meta_query'] ) ? $args['meta_query'] : array();

		return $meta_query;
	}
	public function update_widget_get_current_page_url($link, $wg){ 
		
		if ( ! empty( $_GET['filter_product_cat'] ) ) {
			$link = add_query_arg( 'filter_product_cat', wc_clean( wp_unslash( $_GET['filter_product_cat'] ) ), $link );
		}

		if ( ! empty( $_GET['filter_product_tag'] ) ) {
			$link = add_query_arg( 'filter_product_tag', wc_clean( wp_unslash( $_GET['filter_product_tag'] ) ), $link );
		}

		if ( ! empty( $_GET['filter_product_brand'] ) ) {
			$link = add_query_arg( 'filter_product_brand', wc_clean( wp_unslash( $_GET['filter_product_brand'] ) ), $link );
		}

		return $link;
	} 

	public function get_hierarchy_tax_counts( $term_ids, $taxonomy, $query_type, $page_shop = true ) {
		global $wpdb, $wp_query;
 
		$tax_query = isset( $wp_query->tax_query, $wp_query->tax_query->queries ) ? $wp_query->tax_query->queries : array();
		$meta_args  = $wp_query->query_vars;
		$meta_query = isset( $meta_args['meta_query'] ) ? $meta_args['meta_query'] : array();

		if( !$page_shop){
			$args = $this->pxl_query_args;
			 
			$tax_query  = isset( $args['tax_query'] ) ? $args['tax_query'] : array();
			$meta_query = isset( $args['meta_query'] ) ? $args['meta_query'] : array();
		}

		if ( 'or' === $query_type ) {
			foreach ( $tax_query as $key => $query ) {
				if ( is_array( $query ) && $taxonomy === $query['taxonomy'] ) {
					unset( $tax_query[ $key ] );
				}
			}
		}

		$meta_query      = new WP_Meta_Query( $meta_query );
		$tax_query       = new WP_Tax_Query( $tax_query );
		$meta_query_sql  = $meta_query->get_sql( 'post', $wpdb->posts, 'ID' );
		$tax_query_sql   = $tax_query->get_sql( $wpdb->posts, 'ID' );
		$price_query_sql = $this->get_main_price_query_sql(null, null, $page_shop);

		$query           = array();
		$query['select'] = "SELECT {$wpdb->posts}.ID";
		$query['from']   = "FROM {$wpdb->posts}";
		$query['join']   = "
		LEFT JOIN {$wpdb->term_relationships} AS product_cat ON {$wpdb->posts}.ID = product_cat.object_id
		" . $tax_query_sql['join'] . $meta_query_sql['join'] . $price_query_sql['join'];

		$query['where'] = "
		WHERE {$wpdb->posts}.post_type = 'product' AND {$wpdb->posts}.post_status = 'publish'
		" . $tax_query_sql['where'] . $meta_query_sql['where'] . $price_query_sql['where'] . "
		AND product_cat.term_taxonomy_id IN (" . implode( ',', array_map( 'absint', $term_ids ) ) . ")";

		$search_query_sql = $this->get_main_search_query_sql();
		if ( $search_query_sql ) {
			$query['where'] .= ' AND ' . $search_query_sql;
		}
		
		$query     = apply_filters( 'woocommerce_get_filtered_term_product_counts_query', $query );
		$query_sql = implode( ' ', $query );

		$query_hash = md5( $query_sql );
		$cache     = apply_filters( 'woocommerce_layered_nav_count_maybe_cache', false );
		$cache_key = 'wc_layered_nav_counts_' . sanitize_title( $taxonomy );
		if ( true === $cache ) {
			$cached_counts = (array) get_transient( $cache_key );
		} else {
			$cached_counts = array();
		}

		if ( ! isset( $cached_counts[ $query_hash ] ) ) {
			$results  = $wpdb->get_results( $query_sql, ARRAY_A );
			$products = [];

			foreach ( $results as $record ) {
				if ( ! in_array( $record['ID'], $products ) ) {
					$products[] = $record['ID'];
				}
			}

			$product_counts = count( $products );

			$cached_counts[ $query_hash ] = $product_counts;
			if ( true === $cache ) {
				set_transient( $cache_key, $cached_counts, DAY_IN_SECONDS );
			}
		}

		return $cached_counts[ $query_hash ];
	}
	public function get_filtered_term_product_counts( $term_ids, $taxonomy, $query_type, $page_shop = true ) {
		global $wpdb;

		$tax_query  = $this->get_main_tax_query();
		$meta_query = $this->get_main_meta_query();

		if( !$page_shop){
			$args = $this->pxl_query_args;
			 
			$tax_query  = isset( $args['tax_query'] ) ? $args['tax_query'] : array();
			$meta_query = isset( $args['meta_query'] ) ? $args['meta_query'] : array();
		}
		  
		if ( 'or' === $query_type ) {
			foreach ( $tax_query as $key => $query ) {
				if ( is_array( $query ) && $taxonomy === $query['taxonomy'] ) {
					unset( $tax_query[ $key ] );
				}
			}
		}

		$meta_query      = new WP_Meta_Query( $meta_query );
		$tax_query       = new WP_Tax_Query( $tax_query );
		$meta_query_sql  = $meta_query->get_sql( 'post', $wpdb->posts, 'ID' );
		$tax_query_sql   = $tax_query->get_sql( $wpdb->posts, 'ID' );
		$price_query_sql = $this->get_main_price_query_sql(null, null, $page_shop);

		$query           = array();
		$query['select'] = "SELECT COUNT( DISTINCT {$wpdb->posts}.ID ) as term_count, {$wpdb->posts}.ID, terms.term_id as term_count_id";
		$query['from']   = "FROM {$wpdb->posts}";
		$query['join']   = "
		INNER JOIN {$wpdb->term_relationships} AS term_relationships ON {$wpdb->posts}.ID = term_relationships.object_id
		INNER JOIN {$wpdb->term_taxonomy} AS term_taxonomy USING( term_taxonomy_id )
		INNER JOIN {$wpdb->terms} AS terms USING( term_id )
		" . $tax_query_sql['join'] . $meta_query_sql['join'] . $price_query_sql['join'];

		$query['where'] = "
		WHERE {$wpdb->posts}.post_type = 'product' AND {$wpdb->posts}.post_status = 'publish'
		" . $tax_query_sql['where'] . $meta_query_sql['where'] . $price_query_sql['where'] . "
		AND terms.term_id IN (" . implode( ',', array_map( 'absint', $term_ids ) ) . ")";

		$search_query_sql = $this->get_main_search_query_sql();
		if ( $search_query_sql ) {
			$query['where'] .= ' AND ' . $search_query_sql;
		}

		$query['group_by'] = "GROUP BY terms.term_id";
		$query             = apply_filters( 'woocommerce_get_filtered_term_product_counts_query', $query );
		$query_sql         = implode( ' ', $query );

		$query_hash = md5( $query_sql );
		$cache     = apply_filters( 'woocommerce_layered_nav_count_maybe_cache', true );
		$cache_key = 'wc_layered_nav_counts_' . sanitize_title( $taxonomy );
		if ( true === $cache ) {
			$cached_counts = (array) get_transient( $cache_key );
		} else {
			$cached_counts = array();
		}

		if ( ! isset( $cached_counts[ $query_hash ] ) ) {
			$results = $wpdb->get_results( $query_sql, ARRAY_A );
			$counts  = array_map( 'absint', wp_list_pluck( $results, 'term_count', 'term_count_id' ) );

			$cached_counts[ $query_hash ] = $counts;
			if ( true === $cache ) {
				set_transient( $cache_key, $cached_counts, DAY_IN_SECONDS );
			}
		}

		return array_map( 'absint', (array) $cached_counts[ $query_hash ] );
	}
	public function nexros_woocommerce_query($type='recent_product',$post_per_page=-1,$product_ids=[],$categories=[],$param_args=[]){
	    global $wp_query;

	    $product_visibility_term_ids = wc_get_product_visibility_term_ids();
	    if(!empty($product_ids) && $type == 'separate'){
 
	        if (get_query_var('paged')) {
	            $pxl_paged = get_query_var('paged');
	        } elseif (get_query_var('page')) {
	            $pxl_paged = get_query_var('page');
	        } elseif (get_query_var('product-page')) {
	            $pxl_paged = get_query_var('product-page');
	        } else {
	            $pxl_paged = 1;
	        }

	        if ( isset( $_GET['product-page'] ) ) {
				$pxl_paged = intval( sanitize_text_field( $_GET['product-page'] ) );
			}
	         
			$args = array(
				'post_type' => 'product',
	            'post__in' => array_map('intval', $product_ids),
	            'orderby' => !empty($param_args['orderby']) ? $param_args['orderby'] : 'date',
	            'order' => !empty($param_args['order']) ? $param_args['order'] : 'DESC',
	            'tax_query' => array(
	                array(
	                    'taxonomy' => 'product_visibility',
	                    'field'    => 'term_taxonomy_id',
	                    'terms'    => is_search() ? $product_visibility_term_ids['exclude-from-search'] : $product_visibility_term_ids['exclude-from-catalog'],
	                    'operator' => 'NOT IN',
	                )
	            ),
			);	
	        $pxl_query = new WP_Query($args);
	        $posts = $pxl_query->query($pxl_query->query_vars); 
	        
	        $categories = [];

	    }else{
	        $args = array(
	            'post_type' => 'product',
	            'posts_per_page' => $post_per_page,
	            'post_status' => 'publish',
	            'tax_query' => array(
	                array(
	                    'taxonomy' => 'product_visibility',
	                    'field'    => 'term_taxonomy_id',
	                    'terms'    => is_search() ? $product_visibility_term_ids['exclude-from-search'] : $product_visibility_term_ids['exclude-from-catalog'],
	                    'operator' => 'NOT IN',
	                )
	            ),
	        );

	        if(!empty($categories)){

	            $args['tax_query'][] = array(
	                'taxonomy' => 'product_cat',
	                'field' => 'slug',
	                'operator' => 'IN',
	                'terms' => $categories,
	            );
	        }

	        if( isset($param_args['post_not_in']) && !empty($param_args['post_not_in']) )
                $args['post__not_in'] = array_map('intval', $param_args['post_not_in']);

	        if( !empty($param_args['pro_atts']) ){
	            foreach ($param_args['pro_atts'] as $k => $v) {
	                $args['tax_query'][] = array(
	                    'taxonomy' => $k,
	                    'field' => 'slug',
	                    'terms' => $v
	                );
	            }
	        }

	        if ( isset( $_GET['filter_product_cat'] ) ) {  
				$cats = array_filter( array_map( 'absint', explode( ',', $_GET['filter_product_cat'] ) ) );  

				if ( $cats ) {
					$args['tax_query'][] = array(
		                'taxonomy' => 'product_cat',
						'terms'    => $cats,
						'operator' => 'IN',
		            );
				}
			}
  
			if ( isset( $_GET['filter_product_brand'] ) ) {  
				$brands = array_filter( array_map( 'absint', explode( ',', $_GET['filter_product_brand'] ) ) );  

				if ( $brands ) {
					$args['tax_query'][] = array(
		                'taxonomy' => 'product_brand',
						'terms'    => $brands,
						'operator' => 'IN',
		            );
					 
				}
			}
	
			if ( isset( $_GET['filter_product_tag'] ) ) {  
				$tags = array_filter( array_map( 'absint', explode( ',', $_GET['filter_product_tag'] ) ) );  

				if ( $tags ) {
					$args['tax_query'][] = array(
		                'taxonomy' => 'product_tag',
						'terms'    => $tags,
						'operator' => 'IN',
		            );
					 
				}
			}
			$_chosen_attributes = WC_Query::get_layered_nav_chosen_attributes();
			if( count($_chosen_attributes) > 0){
				foreach ( $_chosen_attributes as $taxonomy => $data ) {
					$args['tax_query'][] = array(
						'taxonomy'         => $taxonomy,
						'field'            => 'slug',
						'terms'            => $data['terms'],
						'operator'         => 'and' === $data['query_type'] ? 'AND' : 'IN',
						'include_children' => false,
					);
				}
			} 

	        if( isset( $_GET['min_price'] ) && isset($_GET['max_price'])){ 
	            $args['meta_query'][] =   array(
	                'key'     => '_price',
	                'value'   => array( wc_clean( wp_unslash( $_GET['min_price'] ) ), wc_clean( wp_unslash( $_GET['max_price'] ) ) ),
	                'compare' => 'BETWEEN',
	                'type'    => 'DECIMAL(10,' . wc_get_price_decimals() . ')',
	            );
	        }

	        $args = $this->nexros_product_filter_type_args($type,$args);

	        if ( isset( $_GET['orderby'] ) ) {
	        	 
	        	switch ( $_GET['orderby'] ) {
					case 'menu_order':
					 	$args['orderby']  = 'menu_order';
						break;
					case 'popularity':
						$args['orderby']  = 'meta_value_num';
						$args['meta_key'] = 'total_sales';
						$args['order']    = 'desc';
	                    break;
					case 'rating':
						$args['orderby']  = 'meta_value_num';
						$args['meta_key'] = '_wc_average_rating';
						$args['order']    = 'desc';
						break;
					case 'price':
						$args['meta_key']   ='_price';
			            $args['orderby']    ='meta_value_num';
			            $args['order']      ='asc';
						break;
					case 'price-desc':
						$args['meta_key']   ='_price';
			            $args['orderby']    ='meta_value_num';
			            $args['order']      ='desc';
						break;
					case 'date':
						$args['orderby'] = 'date';
						$args['order']   = 'desc';
						break;
					case 'sale':
				        $args['post__in'] = wc_get_product_ids_on_sale();
						$args['orderby']   = 'post__in'; 
						break;
					case 'recent_viewed':
						if ( isset( $_COOKIE['recent_viewed_products_cookie'] ) ) {
							$viewed_pids = array_map( 'intval', explode( ',', $_COOKIE['recent_viewed_products_cookie'] ) );
					        $args['post__in'] = $viewed_pids;
							$args['orderby']   = 'post__in'; 
						}
						break;
					 
				}
				 
			}
			 
	        if (get_query_var('paged')){ 
	            $pxl_paged = get_query_var('paged'); 
	        }elseif(get_query_var('page')){ 
	            $pxl_paged = get_query_var('page'); 
	        }elseif (get_query_var('product-page')) {
	            $pxl_paged = get_query_var('product-page');
	        }else{ 
	            $pxl_paged = 1; 
	        }
	        if ( isset( $_GET['product-page'] ) ) {
				$pxl_paged = intval( sanitize_text_field( $_GET['product-page'] ) );
			}
	        if($pxl_paged > 1){
	            $args['paged'] = $pxl_paged;
	        }
 			 
	        $pxl_query = new WP_Query($args);
	 		$posts = $pxl_query->query($pxl_query->query_vars);
           
	        if (empty($categories)) {
	            $product_categories = get_categories(array( 'taxonomy' => 'product_cat' ));
	            $categories = array();
	            foreach($product_categories as $key => $category){
	                $categories[] = $category->slug;
	            }
	        }
	          
	         
	    }
	    global $wp_query;
	    $wp_query = $pxl_query;

	    global $paged;
	    $paged = $pxl_paged; 

	    $this->pxl_query_args = $args;
	    wp_reset_query(); 
	    return array(
	        'posts' => $posts,
	        'categories' => $categories,
	        'query' => $pxl_query,
	        'args' => $args,
	        'paged' => $paged,
	        'max' => $pxl_query->max_num_pages,
	        'next_link' => next_posts($pxl_query->max_num_pages, false),
	        'total' => $pxl_query->found_posts,
	    );
	 
	}
	public function nexros_product_filter_type_args($type,$args){
	    switch ($type) {
	        case 'best_selling':
	            $args['meta_key']='total_sales';
	            $args['orderby']='meta_value_num';
	            $args['ignore_sticky_posts']   = 1;
	            break;
	        case 'featured_product':
	            $args['ignore_sticky_posts'] = 1;
	            $args['tax_query'][] = array(
	                'taxonomy' => 'product_visibility',
	                'field'    => 'term_taxonomy_id',
	                'terms'    => $product_visibility_term_ids['featured'],
	            );
	            break;
	        case 'top_rate':
	            $args['meta_key']   ='_wc_average_rating';
	            $args['orderby']    ='meta_value_num';
	            $args['order']      ='DESC';
	            break;
	        case 'recent_product':
	            $args['orderby']    = 'date';
	            $args['order']      = 'DESC';
	            break;
	        case 'on_sale':
	            $args['post__in'] = wc_get_product_ids_on_sale();
	            break;
	        case 'recent_review':
	            if($post_per_page == -1) $_limit = 4;
	            else $_limit = $post_per_page;
	            global $wpdb;
	            $query = $wpdb->prepare("SELECT c.comment_post_ID FROM {$wpdb->prefix}posts p, {$wpdb->prefix}comments c WHERE p.ID = c.comment_post_ID AND c.comment_approved > 0 AND p.post_type = 'product' AND p.post_status = 'publish' AND p.comment_count > 0 ORDER BY c.comment_date ASC LIMIT 0, %d", $_limit);
	            $results = $wpdb->get_results($query, OBJECT);
	            $_pids = array();
	            foreach ($results as $re) {
	                $_pids[] = $re->comment_post_ID;
	            }

	            $args['post__in'] = $_pids;
	            break;
	        case 'deals':
	            $args['meta_query'][] = array(
	                                 'key' => '_sale_price_dates_to',
	                                 'value' => '0',
	                                 'compare' => '>');
	            $args['post__in'] = wc_get_product_ids_on_sale();
	            break;
	        case 'separate':
	            if ( ! empty( $product_ids ) ) {
	                $ids = array_map( 'trim', explode( ',', $product_ids ) );
	                if ( 1 === count( $ids ) ) {
	                    $args['p'] = $ids[0];
	                } else {
	                    $args['post__in'] = $ids;
	                }
	            }
	            break;
	    }
	    return $args;
	}

	public function nexros_woocommerce_query_search($type = 'recent_product', $post_per_page = -1, $param_args = []){
	    global $wp_query;
  
	    $product_visibility_term_ids = wc_get_product_visibility_term_ids();
	     
        $args = array(
            'post_type' => 'product',
            'posts_per_page' => $post_per_page,
            'post_status' => 'publish',
            'tax_query' => array(
                array(
                    'taxonomy' => 'product_visibility',
                    'field'    => 'term_taxonomy_id',
                    'terms'    => is_search() ? $product_visibility_term_ids['exclude-from-search'] : $product_visibility_term_ids['exclude-from-catalog'],
                    'operator' => 'NOT IN',
                )
            ),
        );
 		
 		if( !empty($param_args['offset']) ){
        	$args['offset'] = (int)$param_args['offset'];
        }
 
        if( !empty($param_args['title']) ){
        	$args['search_prod_title'] = $param_args['title'];
        }
        
        if( !empty($param_args['sku']) ){
        	$args['search_prod_sku'] = $param_args['sku'];
        }
        if( !empty($param_args['excerpt']) ){
        	$args['search_prod_excerpt'] = $param_args['excerpt'];
        }
        if( !empty($param_args['content']) ){
        	$args['search_prod_content'] = $param_args['content'];
        }
        
        if( !empty($param_args['in_terms']) ){
        	$args['search_prod_in_terms'] = $param_args['in_terms'];
        }

        if( !empty($param_args['term_id_assign']) ){
        	$args['tax_query'][] = array(
                'taxonomy' => 'product_cat',
				'terms'    => [(int)$param_args['term_id_assign']],
				'operator' => 'IN',
            );
        }
         
        $args = $this->nexros_product_filter_type_args($type,$args);
 
          
        if (get_query_var('paged')){ 
            $pxl_paged = get_query_var('paged'); 
        }elseif(get_query_var('page')){ 
            $pxl_paged = get_query_var('page'); 
        }elseif (get_query_var('product-page')) {
            $pxl_paged = get_query_var('product-page');
        }else{ 
            $pxl_paged = 1; 
        }
        if ( isset( $_GET['product-page'] ) ) {
			$pxl_paged = intval( sanitize_text_field( $_GET['product-page'] ) );
		}
        if($pxl_paged > 1){
            $args['paged'] = $pxl_paged;
        }

        
		if( !empty($param_args['sku']) || !empty($param_args['title']) || !empty($param_args['excerpt']) || !empty($param_args['content']) ){	 
		 	add_filter( 'posts_where', 'nexros_search_where_product_filter', 10, 2 );
		}

		if( !empty($param_args['sku']) ){	 
		 	add_filter( 'posts_join', 'nexros_sku_join_filter', 10, 2 );
		}
		  
        $posts = $pxl_query = new WP_Query($args);   $test = "Last SQL-Query: {$posts->request}";
        
        if( !empty($param_args['sku']) || !empty($param_args['title']) || !empty($param_args['excerpt']) || !empty($param_args['content'])){	  
	 		pxl_remove_theme_filter('posts_where', 'nexros_search_where_product_filter');
	 	}
	 	if( !empty($param_args['sku']) ){	 
	 		pxl_remove_theme_filter('posts_join', 'nexros_sku_join_filter');
		}
 
	    global $wp_query;
	    $wp_query = $pxl_query;
	   
	    global $paged;
	    $paged = $pxl_paged; 

	    $this->pxl_query_args = $args;
	    wp_reset_query(); 
	    return array(
	        'posts' => $posts,
	        'query' => $pxl_query,
	        'args' => $args,
	        'paged' => $paged,
	        'max' => $pxl_query->max_num_pages,
	        'next_link' => next_posts($pxl_query->max_num_pages, false),
	        'total' => $pxl_query->found_posts,
	        'test' => $test
	    );
	 
	}
}
Pxl_Woo_Query::instance()->init();