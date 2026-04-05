<?php
class Product_Bought_Together {
	protected static $instance = null; 
	public $woobt;
	protected static $types = [ 'simple', 'variable', 'variation', 'woosb', 'bundle', 'subscription' ];
	protected static $image_size = 'woocommerce_thumbnail';

	public static function instance() {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}

		return self::$instance;
	}
	public function initialize() {
		if( !class_exists( 'WPCleverWoobt' )){
			return;
		}
		$this->woobt = \WPCleverWoobt::instance();

		add_action( 'init', [ $this, 'wp_init' ] );
		remove_action( 'woocommerce_single_product_summary', [ WPCleverWoobt::instance(), 'show_items_below_meta' ], 41 );

		add_action( 'woocommerce_single_product_summary', [ $this, 'show_items_below_meta' ], 41 );
	}
	public function wp_init() {
		self::$types  = (array) apply_filters( 'woobt_product_types', self::$types );
		self::$image_size = apply_filters( 'woobt_image_size', self::$image_size );
	}
	function show_items_position( $pos = 'before' ) {
		global $product;

		if ( ! $product || ! is_a( $product, 'WC_Product' ) ) {
			return;
		}

		$_position = get_post_meta( $product->get_id(), 'woobt_position', true ) ?: 'unset';
		$position  = $_position !== 'unset' ? $_position : apply_filters( 'woobt_position', $this->woobt->get_setting( 'position', apply_filters( 'woobt_default_position', 'before' ) ) );

		if ( $position === $pos ) {
			self::show_items();
		}
	}

	function show_items_below_meta() {
		self::show_items_position( 'below_meta' );
	}

	function show_items( $product = null, $is_custom_position = false ) {
		$product_id = 0;
		$is_default = false;

		if ( ! $product ) {
			global $product;

			if ( $product ) {
				$product_id = $product->get_id();
			}
		} else {
			if ( is_a( $product, 'WC_Product' ) ) {
				$product_id = $product->get_id();
			}

			if ( is_numeric( $product ) ) {
				$product_id = absint( $product );
				$product    = wc_get_product( $product_id );
			}
		}

		if ( ! $product_id || ! $product || $product->is_type( 'grouped' ) || $product->is_type( 'external' ) ) {
			return;
		}

		wp_enqueue_script( 'wc-add-to-cart-variation' );

		$custom_qty      = apply_filters( 'woobt_custom_qty', get_post_meta( $product_id, 'woobt_custom_qty', true ) === 'on', $product_id );
		$sync_qty        = apply_filters( 'woobt_sync_qty', get_post_meta( $product_id, 'woobt_sync_qty', true ) === 'on', $product_id );
		$separately      = apply_filters( 'woobt_separately', get_post_meta( $product_id, 'woobt_separately', true ) === 'on', $product_id );
		$selection       = apply_filters( 'woobt_selection', get_post_meta( $product_id, 'woobt_selection', true ) ?: 'multiple', $product_id );
		$_position       = get_post_meta( $product_id, 'woobt_position', true ) ?: 'unset';
		$_layout         = get_post_meta( $product_id, 'woobt_layout', true ) ?: 'unset';
		$_atc_button     = get_post_meta( $product_id, 'woobt_atc_button', true ) ?: 'unset';
		$_show_this_item = get_post_meta( $product_id, 'woobt_show_this_item', true ) ?: 'unset';

		// settings
		$default            = apply_filters( 'woobt_default', $this->woobt->get_setting( 'default', [ 'default' ] ) );
		$default_limit      = (int) apply_filters( 'woobt_default_limit', $this->woobt->get_setting( 'default_limit', 0 ) );
		$pricing            = $this->woobt->get_setting( 'pricing', 'sale_price' );
		$position           = $_position !== 'unset' ? $_position : apply_filters( 'woobt_position', $this->woobt->get_setting( 'position', apply_filters( 'woobt_default_position', 'before' ) ) );
		$layout             = $_layout !== 'unset' ? $_layout : $this->woobt->get_setting( 'layout', 'default' );
		$show_this_item     = $_show_this_item !== 'unset' ? $_show_this_item : $this->woobt->get_setting( 'show_this_item', 'yes' );
		$atc_button         = $_atc_button !== 'unset' ? $_atc_button : $this->woobt->get_setting( 'atc_button', 'main' );
		$is_separate_atc    = $atc_button === 'separate';
		$is_separate_layout = $layout === 'separate';

		// backward compatibility before 5.1.1
		if ( ! is_array( $default ) ) {
			switch ( (string) $default ) {
				case 'upsells':
				$default = [ 'upsells' ];
				break;
				case 'related':
				$default = [ 'related' ];
				break;
				case 'related_upsells':
				$default = [ 'upsells', 'related' ];
				break;
				case 'none':
				$default = [];
				break;
				default:
				$default = [];
			}
		}

		$items = $this->woobt->get_product_items( $product_id, 'view' );

		if ( ! $items && is_array( $default ) && ! empty( $default ) ) {
			$items      = [];
			$is_default = true;

			if ( in_array( 'related', $default ) ) {
				$items = array_merge( $items, wc_get_related_products( $product_id ) );
			}

			if ( in_array( 'upsells', $default ) ) {
				$items = array_merge( $items, $product->get_upsell_ids() );
			}

			if ( in_array( 'crosssells', $default ) ) {
				$items = array_merge( $items, $product->get_cross_sell_ids() );
			}

			if ( $default_limit ) {
				$items = array_slice( $items, 0, $default_limit );
			}
		}

		// filter items before showing
		$items = apply_filters( 'woobt_show_items', $items, $product_id );

		if ( ! empty( $items ) ) {
			foreach ( $items as $key => $item ) {
				if ( is_array( $item ) ) {
					if ( ! empty( $item['id'] ) ) {
						$_item['id']    = $item['id'];
						$_item['price'] = $item['price'];
						$_item['qty']   = $item['qty'];
					} else {
						// heading/paragraph
						$_item = $item;
					}
				} else {
					// make it works with upsells/cross-sells/related
					$_item['id']    = absint( $item );
					$_item['price'] = $this->woobt->get_setting( 'default_price', '100%' );
					$_item['qty']   = 1;
				}

				if ( ! empty( $_item['id'] ) ) {
					if ( $_item_product = wc_get_product( $_item['id'] ) ) {
						$_item['product'] = $_item_product;
					} else {
						unset( $items[ $key ] );
						continue;
					}
				}

				if ( ! empty( $_item['product'] ) && ( ! in_array( $_item['product']->get_type(), self::$types, true ) || ( ( $this->woobt->get_setting( 'exclude_unpurchasable', 'no' ) === 'yes' ) && ( ! $_item['product']->is_purchasable() || ! $_item['product']->is_in_stock() ) ) ) ) {
					unset( $items[ $key ] );
					continue;
				}

				$items[ $key ] = $_item;
			}

			if ( ! empty( $items ) ) {
				$wrap_class = 'woobt-wrap woobt-layout-' . esc_attr( $layout ) . ' woobt-wrap-' . esc_attr( $product_id ) . ' ' . ( $this->woobt->get_setting( 'responsive', 'yes' ) === 'yes' ? 'woobt-wrap-responsive' : '' );

				if ( $is_custom_position ) {
					$wrap_class .= ' woobt-wrap-custom-position';
				}

				if ( $is_separate_atc ) {
					$wrap_class .= ' woobt-wrap-separate-atc';
				}

				do_action( 'woobt_wrap_above', $product );

				echo '<div class="' . esc_attr( $wrap_class ) . '" data-id="' . esc_attr( $product_id ) . '" data-selection="' . esc_attr( $selection ) . '" data-position="' . esc_attr( $position ) . '" data-this-item="' . esc_attr( $show_this_item ) . '" data-layout="' . esc_attr( $layout ) . '" data-atc-button="' . esc_attr( $atc_button ) . '">';

				do_action( 'woobt_wrap_before', $product );
				

				if ( $before_text = apply_filters( 'woobt_before_text', get_post_meta( $product_id, 'woobt_before_text', true ) ?: $this->woobt->localization( 'above_text' ), $product_id ) ) {
					do_action( 'woobt_before_text_above', $product );
					echo '<h3 class="pxl-heading">' . do_shortcode( stripslashes( $before_text ) ) . '</h3>';
					do_action( 'woobt_before_text_below', $product );
				}

				echo '<div class="pxl-bt-wrap d-flex-wrap">';
				echo '<div class="pxl-bt-content">';

				if ( $is_separate_layout ) {
					do_action( 'woobt_images_above', $product );
					?>
					<div class="woobt-products-wrap woobt-images">
						<?php
						do_action( 'woobt_images_before', $product );

						echo '<div class="woobt-product-item woobt-image woobt-image-this woobt-image-order-0 woobt-image-' . esc_attr( $product_id ) . '">';
						do_action( 'woobt_product_thumb_before', $product, 0, 'separate' );
						echo '<div class="woobt-img-wrap">'; 
						$sale_badge_html = '';
						if ( ! $product->is_in_stock() ){
							$sale_badge_html .= '<div class="out-of-stock"><span>'. esc_html__('Sold out', 'nexros') .'</span></div>';
						}else{
							if ( $product->is_on_sale() ) {
								$sale_badge_percentage = nexros()->woo->get_product_sale_badge_percentage($product);
								$sale_badge_html .= '<div class="onsale"><span><span>'. $sale_badge_percentage .'%</span> '.esc_html__( 'Off', 'nexros' ).'</span></div>';
							}
						}
						if(!empty($sale_badge_html)){
							echo '<div class="pxl-loop-badges product-badges">'.$sale_badge_html.'</div>';
						}
						if( class_exists( 'WPCleverWoosw' )){
							echo '<div class="pxl-shop-woosmart-wrap">';
							echo '<div class="woosmart-item wishlist style-rounded">';
							do_action( 'woosw_button_position_archive_woosmart' );
							echo '</div>';
							echo '</div>';
						}

						echo '<span class="woobt-img woobt-img-order-0" data-img="' . esc_attr( htmlentities( $product->get_image( self::$image_size ) ) ) . '">' . $product->get_image( self::$image_size ) . '</span>';
						echo '</div>';
						do_action( 'woobt_product_thumb_after', $product, 0, 'separate' );

						echo '<div class="woobt-product-info">';
						echo '<h5 class="woobt-title">' . wp_kses_post( $product->get_name() ) .'</h5>';
						if (  wc_review_ratings_enabled() ) {
							$review_count = $product->get_review_count();
							if($review_count > 0){
								echo '<div class="product-rating d-flex align-items-center">';
								echo wc_get_rating_html( $product->get_average_rating() );
								if ( comments_open() ){
									echo '<a href="#reviews" class="woocommerce-review-link" rel="nofollow">';
									printf( _n( '%s Review', '%s Reviews', $review_count, 'nexros' ), '<span class="count">' . esc_html( $review_count ) . '</span>' ); 
									echo '</a>';
								}else{
									printf( _n( '%s Review', '%s Reviews', $review_count, 'nexros' ), '<span class="count">' . esc_html( $review_count ) . '</span>' );
								}
								echo '</div>';
							}
						}
						$price_html = $product->get_price_html();
						if($price_html)
							echo '<span class="price">'.$price_html.'</span>';
						echo '</div>';

						echo '</div>';

						$order = 1;

						foreach ( $items as $item ) {
							if ( ! empty( $item['id'] ) ) {
								$item_product = $item['product'];

								echo '<div class="woobt-product-item woobt-image woobt-image-order-' . $order . ' woobt-image-' . esc_attr( $item['id'] ) . '">';

								do_action( 'woobt_product_thumb_before', $item_product, $order, 'separate' );
								echo '<div class="woobt-img-wrap">';
								$sale_badge_html = '';
								if ( ! $item_product->is_in_stock() ){
									$sale_badge_html .= '<div class="out-of-stock"><span>'. esc_html__('Sold out', 'nexros') .'</span></div>';
								}else{
									if ( $item_product->is_on_sale() ) {
										$sale_badge_percentage = nexros()->woo->get_product_sale_badge_percentage($item_product);
										$sale_badge_html .= '<div class="onsale"><span><span>'. $sale_badge_percentage .'%</span> '.esc_html__( 'Off', 'nexros' ).'</span></div>';
									}
								}
								if(!empty($sale_badge_html)){
									echo '<div class="pxl-loop-badges product-badges">'.$sale_badge_html.'</div>';
								}
								if( class_exists( 'WPCleverWoosw' )){
									echo '<div class="pxl-shop-woosmart-wrap">';
									echo '<div class="woosmart-item wishlist style-rounded">';
									echo '<a href="?add-to-wishlist='.$item['id'].'" class="product-action woosw-btn woosw-btn-'.$item['id'].' pxl-ttip tt-left" data-id="'.$item['id'].'" data-product_name="'.$item_product->get_name().'"><span class="pxl-icon lnil lnil-heart"></span><span class="text tt-txt">'.esc_html__('Add to wishlist','nexros').'</span></a>';
									echo '</div>';
									echo '</div>';
								}
								echo '<span class="icon-plus lnil lnil-plus"></span>';
								if ( $this->woobt->get_setting( 'link', 'yes' ) !== 'no' ) {
									echo '<a class="' . esc_attr( $this->woobt->get_setting( 'link', 'yes' ) === 'yes_popup' ? 'woosq-link woobt-img woobt-img-order-' . $order : 'woobt-img woobt-img-order-' . $order ) . '" data-id="' . esc_attr( $item['id'] ) . '" data-context="woobt" href="' . $item_product->get_permalink() . '" data-img="' . esc_attr( htmlentities( $item_product->get_image( self::$image_size ) ) ) . '" ' . ( $this->woobt->get_setting( 'link', 'yes' ) === 'yes_blank' ? 'target="_blank"' : '' ) . '>' . $item_product->get_image( self::$image_size ) . '</a>';
								} else {
									echo '<span class="' . esc_attr( 'woobt-img woobt-img-order-' . $order ) . '" data-img="' . esc_attr( htmlentities( $item_product->get_image( self::$image_size ) ) ) . '">' . $item_product->get_image( self::$image_size ) . '</span>';
								}
								echo '</div>';
								do_action( 'woobt_product_thumb_after', $item_product, $order, 'separate' );
								echo '<div class="woobt-product-info">';
								if ( $this->woobt->get_setting( 'link', 'yes' ) !== 'no' ) {
									echo '<h5 class="woobt-title">';
									echo '<a class="woobt-title" href="' . $item_product->get_permalink() . '" ' . ( $this->woobt->get_setting( 'link', 'yes' ) === 'yes_blank' ? 'target="_blank"' : '' ) . '>' . $item_product->get_name() . '</a>';
									echo '</h5>';
								} else {
									echo '<h5 class="woobt-title">' . wp_kses_post( $item_product->get_name() ) .'</h5>';
								}
								if (  wc_review_ratings_enabled() ) {
									$review_count = $item_product->get_review_count();
									if($review_count > 0){
										echo '<div class="product-rating d-flex align-items-center">';
										echo wc_get_rating_html( $product->get_average_rating() );
										if ( comments_open() ){
											echo '<a href="#reviews" class="woocommerce-review-link" rel="nofollow">';
											printf( _n( '%s Review', '%s Reviews', $review_count, 'nexros' ), '<span class="count">' . esc_html( $review_count ) . '</span>' ); 
											echo '</a>';
										}else{
											printf( _n( '%s Review', '%s Reviews', $review_count, 'nexros' ), '<span class="count">' . esc_html( $review_count ) . '</span>' );
										}
										echo '</div>';
									}
								}
								$price_html = $item_product->get_price_html();
								if($price_html)
									echo '<span class="price">'.$price_html.'</span>';


								echo '</div>';
								echo '</div>';
								$order ++;
							}
						}

						do_action( 'woobt_images_after', $product );
						?>
					</div>
					<?php
					do_action( 'woobt_images_below', $product );
				}

				$sku            = $product->get_sku();
				$weight         = htmlentities( wc_format_weight( $product->get_weight() ) );
				$dimensions     = htmlentities( wc_format_dimensions( $product->get_dimensions( false ) ) );
				$price_html     = htmlentities( $product->get_price_html() );
				$products_class = apply_filters( 'woobt_products_class', 'woobt-products woobt-products-layout-' . $layout . ' woobt-products-' . $product_id, $product );

						// discount for main product
				if ( ! $separately ) {
					if ( $is_default ) {
						$discount = $this->woobt->get_setting( 'default_discount', '0' );
					} else {
						$discount = get_post_meta( $product_id, 'woobt_discount', true ) ?: '0';
					}
				} else {
					$discount = '0';
				}

				do_action( 'woobt_products_above', $product );
				?>
				<div class="<?php echo esc_attr( $products_class ); ?>" data-show-price="<?php echo esc_attr( $this->woobt->get_setting( 'show_price', 'yes' ) ); ?>" data-optional="<?php echo esc_attr( $custom_qty ? 'on' : 'off' ); ?>" data-sync-qty="<?php echo esc_attr( $sync_qty ? 'on' : 'off' ); ?>" data-variables="<?php echo esc_attr( $this->woobt->has_variables( $items ) ? 'yes' : 'no' ); ?>" data-product-id="<?php echo esc_attr( $product->is_type( 'variable' ) ? '0' : $product_id ); ?>" data-product-type="<?php echo esc_attr( $product->get_type() ); ?>" data-product-price-suffix="<?php echo esc_attr( htmlentities( $product->get_price_suffix() ) ); ?>" data-product-price-html="<?php echo esc_attr( $price_html ); ?>" data-product-o_price-html="<?php echo esc_attr( $price_html ); ?>" data-pricing="<?php echo esc_attr( $pricing ); ?>" data-discount="<?php echo esc_attr( $discount ); ?>" data-product-sku="<?php echo esc_attr( $sku ); ?>" data-product-o_sku="<?php echo esc_attr( $sku ); ?>" data-product-weight="<?php echo esc_attr( $weight ); ?>" data-product-o_weight="<?php echo esc_attr( $weight ); ?>" data-product-dimensions="<?php echo esc_attr( $dimensions ); ?>" data-product-o_dimensions="<?php echo esc_attr( $dimensions ); ?>">
					<?php
					do_action( 'woobt_products_before', $product );

							// this item
					echo self::product_this_output( $product, $show_this_item !== 'no', $is_custom_position, $is_separate_atc, $is_separate_layout );

							// other items
					$order = 1;

					$global_product = $product;

					foreach ( $items as $item_key => $item ) {
						if ( ! empty( $item['id'] ) ) {
							echo self::product_output( $item, $item_key, $product_id, $order );
							$order ++;
						} else {
									// heading/paragraph
							echo ''.$this->woobt->text_output( $item, $item_key, $product_id );
						}
					}

					$product = $global_product;

					do_action( 'woobt_products_after', $product );
					?>
				</div><!-- /woobt-products -->
				<?php
					echo '</div>'; //end col-left

					echo '<div class="col-total-action">';
					do_action( 'woobt_products_below', $product );

					do_action( 'woobt_extra_above', $product );

					echo '<div class="woobt-additional woobt-text"></div>';

					do_action( 'woobt_total_above', $product );
					echo '<div class="woobt-total woobt-text"></div>';

					do_action( 'woobt_alert_above', $product );

					if ( $after_text = apply_filters( 'woobt_after_text', get_post_meta( $product_id, 'woobt_after_text', true ) ?: $this->woobt->localization( 'under_text' ), $product_id ) ) {
						do_action( 'woobt_after_text_above', $product );
						echo '<div class="woobt-after-text woobt-text">' . do_shortcode( stripslashes( $after_text ) ) . '</div>';
						do_action( 'woobt_after_text_below', $product );
					}

					if ( $is_custom_position || $is_separate_atc ) {
						do_action( 'woobt_actions_above', $product );
						echo '<div class="woobt-actions">';
						do_action( 'woobt_actions_before', $product );
						echo '<div class="woobt-form">';
						echo '<input type="hidden" name="woobt_ids" class="woobt-ids woobt-ids-' . esc_attr( $product->get_id() ) . '" data-id="' . esc_attr( $product->get_id() ) . '"/>';
						echo '<input type="hidden" name="quantity" value="1"/>';
						echo '<input type="hidden" name="product_id" value="' . esc_attr( $product_id ) . '">';
						echo '<input type="hidden" name="variation_id" class="variation_id" value="0">';
						echo '<button type="submit" class="single_add_to_cart_button button alt"><span class="btn-text">' . $this->woobt->localization( 'add_all_to_cart', esc_html__( 'Add all to cart', 'nexros' ) ) . '</span><span class="pxl-icon-spinner lnir lnir-spinner"></span></button>';
						echo '</div>';
						do_action( 'woobt_actions_after', $product );
						echo '</div><!-- /woobt-actions -->';
						do_action( 'woobt_actions_below', $product );
					}
					echo '<div class="woobt-alert woobt-text"></div>';
					do_action( 'woobt_extra_below', $product );
					echo '</div>';
					echo '</div>';

					do_action( 'woobt_wrap_after', $product );

					echo '</div><!-- /woobt-wrap -->';

					do_action( 'woobt_wrap_below', $product );
				}
			}
		}

		function product_this_output( $product, $show_this_item = false, $is_custom_position = false, $is_separate_atc = false, $is_separate_layout = false ) {
			$hide_this          = ! $is_custom_position && ! $is_separate_atc && ! $show_this_item;
			$product_id         = $product->get_id();
			$this_item_quantity = apply_filters( 'woobt_this_item_quantity', false, $product );
			$product_name       = apply_filters( 'woobt_product_get_name', $product->get_name(), $product );
			$custom_qty         = apply_filters( 'woobt_custom_qty', get_post_meta( $product_id, 'woobt_custom_qty', true ) === 'on', $product_id );
			$separately         = apply_filters( 'woobt_separately', get_post_meta( $product_id, 'woobt_separately', true ) === 'on', $product_id );
			$plus_minus         = $this->woobt->get_setting( 'plus_minus', 'no' ) === 'yes';

			ob_start();

			if ( $hide_this ) {
				?>
				<div class="woobt-product woobt-product-this woobt-hide-this" data-order="0" data-qty="1" data-id="<?php echo esc_attr( $product->is_type( 'variable' ) || ! $product->is_in_stock() ? 0 : $product_id ); ?>" data-pid="<?php echo esc_attr( $product_id ); ?>" data-name="<?php echo esc_attr( $product_name ); ?>" data-price="<?php echo esc_attr( apply_filters( 'woobt_item_data_price', wc_get_price_to_display( $product ), $product ) ); ?>" data-regular-price="<?php echo esc_attr( apply_filters( 'woobt_item_data_regular_price', wc_get_price_to_display( $product, [ 'price' => $product->get_regular_price() ] ), $product ) ); ?>">
					<div class="woobt-choose">
						<label for="woobt_checkbox_0"><?php echo esc_html( $product_name ); ?></label>
						<input id="woobt_checkbox_0" class="woobt-checkbox woobt-checkbox-this" type="checkbox" checked disabled/>
						<span class="checkmark"></span>
					</div>
				</div>
			<?php } else { ?>
				<h5 class="pxl-wppbt--title"><?php echo esc_html__('Frequently Bought Together', 'nexros'); ?></h5>
				<?php
			}

			return apply_filters( 'woobt_product_this_output', ob_get_clean(), $product, $is_custom_position );
		}

		function product_output( $item, $item_key = '', $product_id = 0, $order = 1 ) {
			global $product;
			$product            = $item['product'];
			$item_id            = $item['id'];
			$item_price         = $item['price'];
			$item_qty           = $item['qty'];
			$item_qty_min       = 1;
			$item_qty_max       = 1000;
			$pricing            = $this->woobt->get_setting( 'pricing', 'sale_price' );
			$custom_qty         = apply_filters( 'woobt_custom_qty', get_post_meta( $product_id, 'woobt_custom_qty', true ) === 'on', $product_id );
			$checked_all        = apply_filters( 'woobt_checked_all', get_post_meta( $product_id, 'woobt_checked_all', true ) === 'on', $product_id );
			$separately         = apply_filters( 'woobt_separately', get_post_meta( $product_id, 'woobt_separately', true ) === 'on', $product_id );
			$plus_minus         = $this->woobt->get_setting( 'plus_minus', 'no' ) === 'yes';
			$layout             = $this->woobt->get_setting( 'layout', 'default' );
			$is_separate_layout = $layout === 'separate';

			if ( $custom_qty ) {
				if ( get_post_meta( $product_id, 'woobt_limit_each_min_default', true ) === 'on' ) {
					$item_qty_min = $item_qty;
				} else {
					$item_qty_min = absint( get_post_meta( $product_id, 'woobt_limit_each_min', true ) ?: 0 );
				}

				$item_qty_max = absint( get_post_meta( $product_id, 'woobt_limit_each_max', true ) ?: 1000 );

				if ( $item_qty < $item_qty_min ) {
					$item_qty = $item_qty_min;
				}

				if ( $item_qty > $item_qty_max ) {
					$item_qty = $item_qty_max;
				}
			}

			$checked_individual = apply_filters( 'woobt_checked_individual', false, $item, $product_id );
			$item_price         = apply_filters( 'woobt_item_price', ! $separately ? $item_price : '100%', $item, $product_id );
			$item_name          = apply_filters( 'woobt_product_get_name', $product->get_name(), $product );

			ob_start();
			?>
			<div class="woobt-item-product woobt-product woobt-product-together" data-key="<?php echo esc_attr( $item_key ); ?>" data-order="<?php echo esc_attr( $order ); ?>" data-id="<?php echo esc_attr( $product->is_type( 'variable' ) || ! $product->is_in_stock() ? 0 : $item_id ); ?>" data-pid="<?php echo esc_attr( $item_id ); ?>" data-name="<?php echo esc_attr( $item_name ); ?>" data-new-price="<?php echo esc_attr( $item_price ); ?>" data-price-suffix="<?php echo esc_attr( htmlentities( $product->get_price_suffix() ) ); ?>" data-price="<?php echo esc_attr( apply_filters( 'woobt_item_data_price', ( $pricing === 'sale_price' ) ? wc_get_price_to_display( $product ) : wc_get_price_to_display( $product, [ 'price' => $product->get_regular_price() ] ), $product ) ); ?>" data-regular-price="<?php echo esc_attr( apply_filters( 'woobt_item_data_regular_price', wc_get_price_to_display( $product, [ 'price' => $product->get_regular_price() ] ), $product ) ); ?>" data-qty="<?php echo esc_attr( $item_qty ); ?>" data-o_qty="<?php echo esc_attr( $item_qty ); ?>">

				<?php do_action( 'woobt_product_before', $product, $order ); ?>

				<div class="pxl-woobt--left">
					<?php if ( ! $is_separate_layout && ( $this->woobt->get_setting( 'show_thumb', 'yes' ) !== 'no' ) ) {
						echo '<div class="woobt-thumb">';

						do_action( 'woobt_product_thumb_before', $product, $order, 'default' );

						if ( $this->woobt->get_setting( 'link', 'yes' ) !== 'no' ) {
							echo '<a class="' . esc_attr( $this->woobt->get_setting( 'link', 'yes' ) === 'yes_popup' ? 'woosq-link woobt-img woobt-img-order-' . $order : 'woobt-img woobt-img-order-' . $order ) . '" data-id="' . esc_attr( $item_id ) . '" data-context="woobt" href="' . $product->get_permalink() . '" data-img="' . esc_attr( htmlentities( $product->get_image( self::$image_size ) ) ) . '" ' . ( $this->woobt->get_setting( 'link', 'yes' ) === 'yes_blank' ? 'target="_blank"' : '' ) . '>' . $product->get_image( self::$image_size ) . '</a>';
						} else {
							echo '<span class="' . esc_attr( 'woobt-img woobt-img-order-' . $order ) . '" data-img="' . esc_attr( htmlentities( $product->get_image( self::$image_size ) ) ) . '">' . $product->get_image( self::$image_size ) . '</span>';
						}

						do_action( 'woobt_product_thumb_after', $product, $order, 'default' );

						echo '</div>';
					} ?>
					<div class="pxl-woobt--content">
						<div class="woobt-title">
							<span class="woobt-title-inner">
								<?php
								do_action( 'woobt_product_name_before', $product, $order );

								if ( $product->get_rating_count() > 0 ) {
									$average_rating = $product->get_average_rating();
									$rating_html = wc_get_rating_html( $average_rating, $product->get_rating_count() );
									echo '<div class="woobt-product-review">' . $rating_html . '</div>';
								}
								if ( ! $custom_qty ) {
									$product_qty = '<span class="woobt-qty-num"><span class="woobt-qty">' . $item_qty . '</span> × </span>';
								} else {
									$product_qty = '';
								}

								echo apply_filters( 'woobt_product_qty', $product_qty, $item_qty, $product );

								if ( $product->is_in_stock() ) {
									$product_name = apply_filters( 'woobt_product_get_name', $product->get_name(), $product );
								} else {
									$product_name = '<s>' . apply_filters( 'woobt_product_get_name', $product->get_name(), $product ) . '</s>';
								}

								if ( $this->woobt->get_setting( 'link', 'yes' ) !== 'no' ) {
									$product_name = '<a ' . ( $this->woobt->get_setting( 'link', 'yes' ) === 'yes_popup' ? 'class="woosq-link" data-id="' . $item_id . '" data-context="woobt"' : '' ) . ' href="' . $product->get_permalink() . '" ' . ( $this->woobt->get_setting( 'link', 'yes' ) === 'yes_blank' ? 'target="_blank"' : '' ) . '>' . $product_name . '</a>';
								} else {
									$product_name = '<span>' . $product_name . '</span>';
								}

								echo apply_filters( 'woobt_product_name', $product_name, $product );

								do_action( 'woobt_product_name_after', $product, $order );
								?>
							</span>

							<?php if ( $is_separate_layout && ( $this->woobt->get_setting( 'show_price', 'yes' ) !== 'no' ) ) { ?>
								<span class="woobt-price">
									<?php do_action( 'woobt_product_price_before', $product, $order ); ?>
									<span class="woobt-price-new"></span>
									<span class="woobt-price-ori">
										<?php
										if ( ! $separately && ( $item_price !== '100%' ) ) {
											if ( $product->is_type( 'variable' ) ) {
												$item_ori_price_min = ( $pricing === 'sale_price' ) ? $product->get_variation_price( 'min', true ) : $product->get_variation_regular_price( 'min', true );
												$item_ori_price_max = ( $pricing === 'sale_price' ) ? $product->get_variation_price( 'max', true ) : $product->get_variation_regular_price( 'max', true );
												$item_new_price_min = $this->woobt->new_price( $item_ori_price_min, $item_price );
												$item_new_price_max = $this->woobt->new_price( $item_ori_price_max, $item_price );

												if ( $item_new_price_min < $item_new_price_max ) {
													$product_price = wc_format_price_range( $item_new_price_min, $item_new_price_max );
												} else {
													$product_price = wc_format_sale_price( $item_ori_price_min, $item_new_price_min );
												}
											} else {
												$item_ori_price = ( $pricing === 'sale_price' ) ? wc_get_price_to_display( $product, [ 'price' => $product->get_price() ] ) : wc_get_price_to_display( $product, [ 'price' => $product->get_regular_price() ] );
												$item_new_price = $this->woobt->new_price( $item_ori_price, $item_price );

												if ( $item_new_price < $item_ori_price ) {
													$product_price = wc_format_sale_price( $item_ori_price, $item_new_price );
												} else {
													$product_price = wc_price( $item_new_price );
												}
											}

											$product_price .= $product->get_price_suffix();
										} else {
											$product_price = $product->get_price_html();
										}

										echo apply_filters( 'woobt_product_price', $product_price, $product, $item );
										?>
									</span>
									<?php do_action( 'woobt_product_price_after', $product, $order ); ?>
								</span>
								<?php
							}

							if ( $this->woobt->get_setting( 'show_description', 'no' ) === 'yes' ) {
								echo '<div class="woobt-description">' . apply_filters( 'woobt_product_short_description', $product->get_short_description(), $product ) . '</div>';
							}

							if ( $product->is_type( 'variable' ) ) {
								if ( ( $this->woobt->get_setting( 'variations_selector', 'default' ) === 'wpc_radio' || $this->woobt->get_setting( 'variations_selector', 'default' ) === 'woovr' ) && class_exists( 'WPClever_Woovr' ) ) {
									echo '<div class="wpc_variations_form">';
						// use class name wpc_variations_form to prevent found_variation in woovr
									WPClever_Woovr::woovr_variations_form( $product );
									echo '</div>';
								} else {
									$attributes           = $product->get_variation_attributes();
									$available_variations = $product->get_available_variations();

									if ( is_array( $attributes ) && ( count( $attributes ) > 0 ) ) {
										echo '<div class="variations_form" data-product_id="' . absint( $product->get_id() ) . '" data-product_variations="' . htmlspecialchars( wp_json_encode( $available_variations ) ) . '">';
										echo '<div class="variations">';

										foreach ( $attributes as $attribute_name => $options ) { ?>
											<div class="variation">
												<div class="label">
													<?php echo wc_attribute_label( $attribute_name ); ?>
												</div>
												<div class="select">
													<?php
													$selected = isset( $_REQUEST[ 'attribute_' . sanitize_title( $attribute_name ) ] ) ? wc_clean( stripslashes( urldecode( $_REQUEST[ 'attribute_' . sanitize_title( $attribute_name ) ] ) ) ) : $product->get_variation_default_attribute( $attribute_name );
													wc_dropdown_variation_attribute_options( array(
														'options'          => $options,
														'attribute'        => $attribute_name,
														'product'          => $product,
														'selected'         => $selected,
														'show_option_none' => sprintf( $this->woobt->localization( 'choose', esc_html__( 'Choose %s', 'nexros' ) ), wc_attribute_label( $attribute_name ) )
													) );
													?>
												</div>
											</div>
										<?php }

										echo '<div class="reset">' . apply_filters( 'woocommerce_reset_variations_link', '<a class="reset_variations" href="#">' . $this->woobt->localization( 'clear', esc_html__( 'Clear', 'nexros' ) ) . '</a>' ) . '</div>';
										echo '</div>';
										echo '</div>';

										if ( $this->woobt->get_setting( 'show_description', 'no' ) === 'yes' ) {
											echo '<div class="woobt-variation-description"></div>';
										}
									}
								}
							}

							echo '<div class="woobt-availability">' . apply_filters( 'woobt_product_availability', wc_get_stock_html( $product ), $product ) . '</div>';
							?>
						</div>

						<?php if ( $custom_qty ) {
							echo '<div class="' . esc_attr( ( $plus_minus ? 'woobt-quantity woobt-quantity-plus-minus' : 'woobt-quantity' ) ) . '">';

							do_action( 'woobt_product_qty_before', $product, $order );

							if ( $plus_minus ) {
								echo '<div class="woobt-quantity-input">';
								echo '<div class="woobt-quantity-input-minus">-</div>';
							}

							woocommerce_quantity_input( [
								'classes'     => [ 'input-text', 'woobt-qty', 'qty', 'text' ],
								'input_value' => $item_qty,
								'min_value'   => $item_qty_min,
								'max_value'   => $item_qty_max,
								'input_name'  => 'woobt_qty_' . $order,
								'woobt_qty'   => [
									'input_value' => $item_qty,
									'min_value'   => $item_qty_min,
									'max_value'   => $item_qty_max
								]
					// compatible with WPC Product Quantity
							], $product );

							if ( $plus_minus ) {
								echo '<div class="woobt-quantity-input-plus">+</div>';
								echo '</div>';
							}

							do_action( 'woobt_product_qty_after', $product, $order );

							echo '</div>';
						}

						if ( ! $is_separate_layout && ( $this->woobt->get_setting( 'show_price', 'yes' ) !== 'no' ) ) { ?>
							<div class="woobt-price">
								<?php do_action( 'woobt_product_price_before', $product, $order ); ?>
								<div class="woobt-price-new"></div>
								<div class="woobt-price-ori">
									<?php
									if ( ! $separately && ( $item_price !== '100%' ) ) {
										if ( $product->is_type( 'variable' ) ) {
											$item_ori_price_min = ( $pricing === 'sale_price' ) ? $product->get_variation_price( 'min', true ) : $product->get_variation_regular_price( 'min', true );
											$item_ori_price_max = ( $pricing === 'sale_price' ) ? $product->get_variation_price( 'max', true ) : $product->get_variation_regular_price( 'max', true );
											$item_new_price_min = $this->woobt->new_price( $item_ori_price_min, $item_price );
											$item_new_price_max = $this->woobt->new_price( $item_ori_price_max, $item_price );

											if ( $item_new_price_min < $item_new_price_max ) {
												$product_price = wc_format_price_range( $item_new_price_min, $item_new_price_max );
											} else {
												$product_price = wc_format_sale_price( $item_ori_price_min, $item_new_price_min );
											}
										} else {
											$item_ori_price = ( $pricing === 'sale_price' ) ? wc_get_price_to_display( $product, [ 'price' => $product->get_price() ] ) : wc_get_price_to_display( $product, [ 'price' => $product->get_regular_price() ] );
											$item_new_price = $this->woobt->new_price( $item_ori_price, $item_price );

											if ( $item_new_price < $item_ori_price ) {
												$product_price = wc_format_sale_price( $item_ori_price, $item_new_price );
											} else {
												$product_price = wc_price( $item_new_price );
											}
										}

										$product_price .= $product->get_price_suffix();
									} else {
										$product_price = $product->get_price_html();
									}

									echo apply_filters( 'woobt_product_price', $product_price, $product, $item );
									?>
								</div>
								<?php do_action( 'woobt_product_price_after', $product, $order ); ?>
							</div>
						<?php }

						do_action( 'woobt_product_after', $product, $order );
						?>
					</div>
				</div>
				<div class="woobt-choose">
					<label for="<?php echo esc_attr( 'woobt_checkbox_' . $order ); ?>"><?php echo esc_html__('Add to Cart', 'nexros'); ?></label>
					<input id="<?php echo esc_attr( 'woobt_checkbox_' . $order ); ?>" class="woobt-checkbox" type="checkbox" value="<?php echo esc_attr( $item_id ); ?>" <?php echo esc_attr( ! $product->is_in_stock() ? 'disabled' : '' ); ?> <?php echo esc_attr( $product->is_in_stock() && ( $checked_all || $checked_individual ) ? 'checked' : '' ); ?>/>
					<svg xmlns="http://www.w3.org/2000/svg" width="20" height="6" viewBox="0 0 20 6" fill="none">
						<path d="M17.7721 5.477L19.8245 3.42458C19.9369 3.31189 20 3.15921 20 3.00003C20 2.84085 19.9369 2.68817 19.8245 2.57548L17.7721 0.523097C17.68 0.433323 17.5562 0.383455 17.4275 0.384288C17.2989 0.385121 17.1757 0.436588 17.0848 0.527548C16.9938 0.618508 16.9423 0.741639 16.9414 0.870284C16.9406 0.998928 16.9904 1.12273 17.0802 1.21489L18.376 2.51071H0.489219C0.35947 2.51071 0.235035 2.56226 0.143289 2.654C0.0515425 2.74575 0 2.87018 0 2.99993C0 3.12968 0.0515425 3.25412 0.143289 3.34586C0.235035 3.43761 0.35947 3.48915 0.489219 3.48915H18.3759L17.0802 4.78521C16.9896 4.8772 16.939 5.00126 16.9395 5.13037C16.94 5.25948 16.9915 5.38315 17.0828 5.47445C17.1741 5.56574 17.2978 5.61725 17.4269 5.61775C17.556 5.61825 17.6801 5.5677 17.7721 5.47712V5.477Z" fill="#5230DA"/>
					</svg>
					<span class="checkmark"></span>
				</div>
			</div>
			<?php

			return apply_filters( 'woobt_product_output', ob_get_clean(), $item, $product_id, $order );
		}
	}

	Product_Bought_Together::instance()->initialize();