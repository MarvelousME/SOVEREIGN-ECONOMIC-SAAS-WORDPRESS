<?php

//Custom products layout on archive page
add_filter( 'loop_shop_columns', 'nexros_loop_shop_columns', 20 ); 
function nexros_loop_shop_columns() {
	$columns = isset($_GET['product-column']) ? sanitize_text_field($_GET['product-column']) : nexros()->get_theme_opt('products_columns', 3);
	return $columns;
}

// Change number of products that are displayed per page (shop page)
add_filter( 'loop_shop_per_page', 'nexros_loop_shop_per_page', 20 );
function nexros_loop_shop_per_page( $limit ) {
	$limit = isset($_GET['product-limit']) ? sanitize_text_field($_GET['product-limit']) : nexros()->get_theme_opt('product_per_page', 9);
	return $limit;
}

if(!function_exists('nexros_woocommerce_catalog_result')){
    // remove
	
    // add back
	add_action('woocommerce_before_shop_loop','nexros_woocommerce_catalog_result', 20);
	add_action('nexros_woocommerce_catalog_ordering', 'woocommerce_catalog_ordering');
	add_action('nexros_woocommerce_result_count', 'woocommerce_result_count');
	function nexros_woocommerce_catalog_result(){
		$columns = isset($_GET['col']) ? sanitize_text_field($_GET['col']) : nexros()->get_theme_opt('products_columns', '2');
		$display_type = isset($_GET['type']) ? sanitize_text_field($_GET['type']) : nexros()->get_theme_opt('shop_display_type', 'grid');
		$active_grid = 'active';
		$active_list = '';
		if( $display_type == 'list' ){
			$active_list = $display_type == 'list' ? 'active' : '';
			$active_grid = '';
		}
		?>
		<div class="pxl-shop-topbar-wrap ">
			<div class="text-heading number-result">
				<?php do_action('nexros_woocommerce_result_count'); ?>
			</div>
			<div class="pxl-view-layout-wrap ">
				<div class="woocommerce-topbar-ordering">
					<?php woocommerce_catalog_ordering(); ?>
				</div>
			</div>
		</div>
		<?php
	}
}

add_action('woocommerce_thankyou', 'add_custom_order_meta_to_thank_you', 20);
function add_custom_order_meta_to_thank_you($order_id) {
	$order = wc_get_order($order_id);
	$custom_meta = $order->get_meta('_your_custom_meta_key');

	if ($custom_meta) {
		echo '<p>Custom Meta: ' . esc_html($custom_meta) . '</p>';
	}
}

add_action('woocommerce_thankyou', 'custom_thank_you_message', 20);
function custom_thank_you_message($order_id) {
	$order = wc_get_order($order_id);
	echo '<p>Thank you for your order!</p>';
	echo '<p>Your order number is: ' . $order->get_order_number() . '</p>';
}

function utero_wc_cart_totals_shipping_method_label( $method ) {
	$label     = $method->get_label();
	$has_cost  = 0 < $method->cost;
	$hide_cost = ! $has_cost && in_array( $method->get_method_id(), array( 'free_shipping', 'local_pickup' ), true );

	if ( $has_cost && ! $hide_cost ) {
		if ( WC()->cart->display_prices_including_tax() ) {
			$label .= ' (' . wc_price( $method->cost + $method->get_shipping_tax() ).')';
			if ( $method->get_shipping_tax() > 0 && ! wc_prices_include_tax() ) {
				$label .= ' <small class="tax_label">' . WC()->countries->inc_tax_or_vat() . '</small>';
			}
		} else {
			$label .= ' (' . wc_price( $method->cost ).')';
			if ( $method->get_shipping_tax() > 0 && wc_prices_include_tax() ) {
				$label .= ' <small class="tax_label">' . WC()->countries->ex_tax_or_vat() . '</small>';
			}
		}
	}

	return apply_filters( 'woocommerce_cart_shipping_method_full_label', $label, $method );
}

add_filter( 'wc_get_template', 'nexros_wc_update_get_template', 10, 5 );
function nexros_wc_update_get_template($template, $template_name, $args, $template_path, $default_path){
	switch ($template_name) {
		case 'cart/cart-totals.php':
		$template = get_template_directory().'/'.WC()->template_path().'cart/pxl-cart-totals.php';
		break;
		case 'cart/cart.php':
		$template = get_template_directory().'/'.WC()->template_path().'cart/pxl-cart-content.php';
		break;
		case 'cart/cart-shipping.php':
		$template = get_template_directory().'/'.WC()->template_path().'cart/pxl-cart-shipping.php';
		break;
		case 'checkout/thankyou.php':
		$template = get_template_directory().'/'.WC()->template_path().'checkout/pxl-thankyou.php';
		break;
		case 'checkout/form-checkout.php':
		$template = get_template_directory().'/'.WC()->template_path().'checkout/form-checkout.php';
		break;
		case 'checkout/form-shipping.php':
		$template = get_template_directory().'/'.WC()->template_path().'checkout/form-shipping.php';
		break;
	} 

	return $template;
}

add_action('woocommerce_cart_totals_after_order_total', 'add_terms_conditions_to_cart_page');

function add_terms_conditions_to_cart_page() {
	?>
	<div class="woocommerce-terms-and-conditions">
		<label class="woocommerce-form__label woocommerce-form__label-for-checkbox checkbox">
			<input type="checkbox" class="woocommerce-form__input-checkbox" name="terms_conditions" id="terms_conditions" />
			<span><?php _e('I agree with term and conditions', 'nexros'); ?></span>
		</label>
		<p class="terms-error-message" style="color: red; display: none;"><?php _e('You must agree to the terms and conditions before proceeding.', 'nexros'); ?></p>
	</div>
	<script>
		jQuery(function($) {
			$('form.woocommerce-cart-form').on('submit', function(e) {
				if (!$('#terms_conditions').is(':checked')) {
					e.preventDefault();
					$('.terms-error-message').show();
				} else {
					$('.terms-error-message').hide();
				}
			});
		});
	</script>
	<?php
}

/* Cart action */
add_filter('woocommerce_add_to_cart_fragments', 'nexros_woocommerce_add_to_cart_fragments', 10, 1 );
function nexros_woocommerce_add_to_cart_fragments( $fragments ) {

	ob_start();
	?>
	<span class="header-count cart_total"><?php echo WC()->cart->cart_contents_count; ?></span>
	<?php
	$fragments['.cart_total'] = ob_get_clean();
	$fragments['.mini-cart-count'] = '<span class="mini-cart-total mini-cart-count">'.WC()->cart->cart_contents_count.'</span>';

	ob_start();
	wc_get_template( 'cart/mini-cart-totals.php' );
	$mini_cart_totals = ob_get_clean();
	$fragments['.pxl-hidden-template-canvas-cart .cart-footer-inner'] = $mini_cart_totals;
	$fragments['.pxl-cart-dropdown .cart-footer-inner'] = $mini_cart_totals;

	$fragments['.pxl-anchor-cart .anchor-cart-count'] = '<span class="anchor-cart-count">'.WC()->cart->cart_contents_count.'</span>';
	$fragments['.pxl-anchor-cart .anchor-cart-total'] = '<span class="anchor-cart-total">'.WC()->cart->get_cart_subtotal().'</span>';

	ob_start();
	wc_get_template( 'cart/pxl-cart-content.php' );
	$fragments['.cart-list-wrapper .cart-list-content'] = ob_get_clean();

	return $fragments;
}


/* Remove result count & product ordering & item product category..... */
function nexros_cwoocommerce_remove_function() {
	remove_action( 'woocommerce_after_shop_loop_item', 'woocommerce_template_loop_add_to_cart', 10, 0 );
	remove_action( 'woocommerce_after_shop_loop_item_title', 'woocommerce_template_loop_rating', 5, 0 );
	remove_action( 'woocommerce_after_shop_loop_item_title', 'woocommerce_template_loop_price', 10, 0 );
	remove_action( 'woocommerce_shop_loop_item_title', 'woocommerce_template_loop_product_title', 10, 0 );
	remove_action( 'woocommerce_before_shop_loop_item_title', 'woocommerce_template_loop_product_thumbnail', 10, 0 );
	remove_action( 'woocommerce_before_shop_loop' , 'woocommerce_catalog_ordering', 30 );
	remove_action( 'woocommerce_before_shop_loop', 'woocommerce_result_count', 20 );

	remove_action( 'woocommerce_single_product_summary' , 'woocommerce_template_single_title', 5 );
	remove_action( 'woocommerce_single_product_summary' , 'woocommerce_template_single_rating', 10 );
	remove_action( 'woocommerce_single_product_summary' , 'woocommerce_template_single_price', 10 );
	remove_action( 'woocommerce_single_product_summary' , 'woocommerce_template_single_excerpt', 20 );
	remove_action( 'woocommerce_single_product_summary' , 'woocommerce_template_single_meta', 40 );
	remove_action( 'woocommerce_single_product_summary' , 'woocommerce_template_single_sharing', 50 );
}
add_action( 'init', 'nexros_cwoocommerce_remove_function' );

/* Product Category */
//add_action( 'woocommerce_before_shop_loop', 'nexros_woocommerce_nav_top', 2 );
function nexros_woocommerce_nav_top() { ?>
	<div class="woocommerce-topbar">
		<div class="woocommerce-result-count pxl-pr-20">
			<?php woocommerce_result_count(); ?>
		</div>
		<div class="woocommerce-topbar-ordering">
			<?php woocommerce_catalog_ordering(); ?>
		</div>
	</div>
<?php }

add_filter( 'woocommerce_after_shop_loop_item', 'nexros_woocommerce_product' );
function nexros_woocommerce_product() {
	global $product;
	$product_id = $product->get_id();
	$shop_featured_img_size = nexros()->get_theme_opt('shop_featured_img_size');
	?>
	<div class="woocommerce-product-inner">
		<?php if (has_post_thumbnail()) {
			$img  = pxl_get_image_by_size( array(
				'attach_id'  => get_post_thumbnail_id($product_id),
				'thumb_size' => $shop_featured_img_size,
			) );
			$thumbnail    = $img['thumbnail'];
			$thumbnail_url    = $img['url']; ?>
			<div class="woocommerce-product-header">
				<a class="woocommerce-product-details" href="<?php the_permalink(); ?>">
					<?php if(!empty($shop_featured_img_size)) { echo wp_kses_post($thumbnail); } else { woocommerce_template_loop_product_thumbnail(); } ?>
				</a>
				<div class="woocommerce-product--buttons">
					<?php if ( ! $product->managing_stock() && ! $product->is_in_stock() ) { ?>
					<?php } else { ?>
						<div class="woocommerce-add-to-cart">
							<div class="woocommerce-product-meta">
								<?php if (class_exists('WPCleverWoosw')) { ?>
									<div class="woocommerce-wishlist">
										<?php echo do_shortcode('[woosw id="'.esc_attr( $product->get_id() ).'"]'); ?>
									</div>
								<?php } ?>
								<?php if ( ! $product->managing_stock() && ! $product->is_in_stock() ) { ?>
								<?php } else { ?>
									<div class="woocommerce-add-to-cart">
										<?php woocommerce_template_loop_add_to_cart(); ?>
									</div>
								<?php } ?>
							</div>
						</div>
					<?php } ?>
				</div>
			</div>
			<div class="woocommerce-product-content">
				<div class="woocommerce-product--rating">
					<?php woocommerce_template_loop_rating(); ?>
				</div>
				<h4 class="woocommerce-product--title">
					<a href="<?php the_permalink(); ?>" ><?php the_title(); ?></a>
				</h4>
				<?php woocommerce_template_loop_price(); ?>
				<div class="woocommerce-product--excerpt" style="display: none;">
					<?php woocommerce_template_single_excerpt(); ?>
				</div>
				<div class="woocommerce-add-to--cart list-v" style="display: none;">
					<?php woocommerce_template_loop_add_to_cart(); ?>
				</div>
				<?php if (class_exists('WPCleverWoosw')) { ?>
					<div class="woocommerce-wishlist" style="display: none;">
						<?php echo do_shortcode('[woosw id="'.esc_attr( $product->get_id() ).'"]'); ?>
					</div>
				<?php } ?>
			</div>
		<?php } ?>
	</div>
<?php }

/* Replace text Onsale */
add_filter('woocommerce_sale_flash', 'nexros_custom_sale_text', 10, 3);
function nexros_custom_sale_text($text, $post, $_product)
{
	return '<span class="onsale">' . esc_html__( 'Sale!', 'nexros' ) . '</span>';
}
/* Removes the "shop" title on the main shop page */
function nexros_hide_page_title()
{
	return false;
}
add_filter('woocommerce_show_page_title', 'nexros_hide_page_title');

add_action( 'woocommerce_before_single_product_summary', 'nexros_woocommerce_single_summer_start', 0 );
function nexros_woocommerce_single_summer_start() { ?>
	<?php echo '<div class="woocommerce-summary-wrap row">'; ?>
<?php }

add_action( 'woocommerce_before_add_to_cart_quantity', 'custom_before_quantity_input_field', 25 );
function custom_before_quantity_input_field() { ?>
	<?php echo '<div class="quantity-label">' . esc_html__( 'Quantity', 'nexros' ) . '</div>'; ?>
<?php } 

add_action( 'woocommerce_single_product_summary', 'custom_after_quantity_input_field', 30 );
function custom_after_quantity_input_field() {
	global $product;
	?>
	<div class="wooc-product-meta">
		<?php if (class_exists('WPCleverWoosw')) { ?>
			<?php echo do_shortcode('[woosw id="'.esc_attr( $product->get_id() ).'"]'); ?>
		<?php } ?>
	</div>
	<?php
}

add_action( 'woocommerce_after_single_product_summary', 'nexros_woocommerce_single_summer_end', 5 );
function nexros_woocommerce_single_summer_end() { ?>
	<?php echo '</div></div>'; ?>
<?php }

/* Checkout Page*/
add_action( 'woocommerce_checkout_before_order_review_heading', 'nexros_checkout_before_order_review_heading_start', 5 );
function nexros_checkout_before_order_review_heading_start() { ?>
	<?php echo '<div class="pxl-order-review-right"><div class="pxl-order-review-inner">'; ?>
<?php }

add_action( 'woocommerce_checkout_after_order_review', 'nexros_checkout_after_order_review_end', 5 );
function nexros_checkout_after_order_review_end() { ?>
	<?php echo '</div></div>'; ?>
<?php }


add_action( 'woocommerce_single_product_summary', 'nexros_woocommerce_sg_product_title', 9 );
function nexros_woocommerce_sg_product_title() { 
	global $product; 
	$product_title = nexros()->get_theme_opt( 'product_title', false ); 
	if($product_title ) : ?>
		<div class="woocommerce-sg-product-title">
			<?php woocommerce_template_single_title(); ?>
		</div>
	<?php endif; }

	add_action( 'woocommerce_single_product_summary', 'nexros_woocommerce_sg_product_rating', 1 );
	function nexros_woocommerce_sg_product_rating() { global $product; ?>
		<div class="woocommerce-sg-product-rating">
			<?php woocommerce_template_single_rating();
			if ( $rating_count = $product->get_rating_count() ) {
				echo ' <span class="review-count">(' . $rating_count . ')</span>';
			} ?>
		</div>
	<?php }

	add_action( 'woocommerce_single_product_summary', 'nexros_woocommerce_sg_product_price', 10 );
	function nexros_woocommerce_sg_product_price() { ?>
		<div class="woocommerce-sg-product-price">
			<?php woocommerce_template_single_price(); ?>
		</div>
	<?php }

	add_filter('woocommerce_get_price_html', 'custom_dynamic_discount_label', 20, 2);
	function custom_dynamic_discount_label($price, $product) {
		if ($product->is_on_sale()) {
			$regular_price = (float) $product->get_regular_price();
			$sale_price    = (float) $product->get_sale_price();

			if ($regular_price > 0 && $regular_price > $sale_price) {
				$discount = round((($regular_price - $sale_price) / $regular_price) * 100);

				$price .= '<span class="custom-discount-label">' . $discount . '% Off</span>';
			}
		}

		return $price;
	}


	add_action( 'woocommerce_single_product_summary', 'nexros_woocommerce_sg_product_meta', 30 );
	function nexros_woocommerce_sg_product_meta() { ?>
		<div class="woocommerce-sg-product-meta">
			<?php woocommerce_template_single_meta(); ?>
		</div>
	<?php }

	add_action( 'woocommerce_single_product_summary', 'nexros_woocommerce_sg_product_excerpt', 20 );
	function nexros_woocommerce_sg_product_excerpt() { ?>
		<div class="woocommerce-sg-product-excerpt">
			<?php woocommerce_template_single_excerpt(); ?>
		</div>
	<?php }

	add_action( 'woocommerce_single_product_summary', 'nexros_woocommerce_sg_social_share', 34 );
	function nexros_woocommerce_sg_social_share() { 
		$product_social_share = nexros()->get_theme_opt( 'product_social_share', false );
		if($product_social_share) : ?>
			<div class="woocommerce-social-share">
				<label class="pxl-mr-20"><?php echo esc_html__('Share:', 'nexros'); ?></label>
				<a class="fb-social pxl-mr-10" target="_blank" href="http://www.facebook.com/sharer/sharer.php?u=<?php the_permalink(); ?>"><i class="fab fa-facebook-f"></i></a>
				<a class="tw-social pxl-mr-10" target="_blank" href="https://twitter.com/intent/tweet?url=<?php the_permalink(); ?>&text=<?php the_title(); ?>%20"><i class="fab fa-x-twitter"></i></a>
				<a class="pin-social pxl-mr-10" target="_blank" href="http://pinterest.com/pin/create/button/?url=<?php the_permalink(); ?>&description=<?php the_title(); ?>%20"><i class="fab fa-pinterest-p"></i></a>
				<a class="lin-social pxl-mr-10" target="_blank" href="http://www.linkedin.com/shareArticle?mini=true&url=<?php the_permalink(); ?>&title=<?php the_title(); ?>%20"><i class="fab fa-linkedin"></i></a>
			</div>
		<?php endif; }

		add_action( 'woocommerce_single_product_summary', 'nexros_woocommerce_sg_payment_methods', 35 );

		function nexros_woocommerce_sg_payment_methods() {
			$text = nexros()->get_theme_opt('cart_payment_methods_text', '');
			$logo = nexros()->get_theme_opt('cart_payment_methods_logo', []);
			if ( !empty($text) && !empty($logo['url'])) {
				echo '<div class="payment_method_container">';
				if ( !empty($text) ) {
					echo '<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 26 26" fill="none">
					<path d="M12.7804 1.35845C12.9262 1.3159 13.081 1.3159 13.2268 1.35845L22.7731 4.14695C22.9381 4.19539 23.0831 4.29598 23.1862 4.43365C23.2893 4.57133 23.345 4.73869 23.3451 4.9107V10.6307C23.345 13.7286 22.3702 16.748 20.5586 19.261C18.7471 21.7741 16.1907 23.6534 13.2517 24.6328C13.0882 24.6873 12.9114 24.6873 12.7479 24.6328C9.80813 23.6533 7.2511 21.7736 5.43914 19.2599C3.62719 16.7463 2.65221 13.7261 2.65234 10.6275V4.9107C2.65234 4.55753 2.88634 4.24662 3.22651 4.14695L12.7804 1.35845ZM4.24376 5.50762V10.6275C4.24376 16.2088 7.75918 21.1726 13.0003 23.0359C15.5614 22.1246 17.7776 20.443 19.3449 18.2219C20.9121 16.0008 21.7536 13.3491 21.7537 10.6307V5.50762L13.0025 2.95095L4.24376 5.50762Z" fill="black"/>
					<path d="M18.8664 8.98834C19.0155 9.13765 19.0993 9.34008 19.0993 9.55114C19.0993 9.7622 19.0155 9.96462 18.8664 10.1139L12.4985 16.4807C12.3492 16.6299 12.1468 16.7137 11.9357 16.7137C11.7247 16.7137 11.5223 16.6299 11.3729 16.4807L7.65928 12.767C7.5853 12.6931 7.52661 12.6054 7.48654 12.5088C7.44648 12.4122 7.42583 12.3086 7.42578 12.2041C7.42573 12.0995 7.44628 11.9959 7.48625 11.8993C7.52622 11.8027 7.58483 11.7149 7.65874 11.6409C7.73265 11.5669 7.8204 11.5082 7.91699 11.4681C8.01358 11.4281 8.11712 11.4074 8.22169 11.4074C8.32626 11.4073 8.42982 11.4279 8.52645 11.4679C8.62308 11.5078 8.71089 11.5664 8.78486 11.6403L11.9363 14.7928L17.7408 8.98834C17.8901 8.83917 18.0925 8.75537 18.3036 8.75537C18.5146 8.75537 18.7171 8.83917 18.8664 8.98834Z" fill="black"/>
					</svg><div class="payment_method_text">'.wp_kses_post($text).'</div>';
				}

				if ( !empty($logo['url']) ) {
					echo '<div class="payment_method_logo"><img src="'.esc_url($logo['url']).'" alt="Payment Method"/></div>';
				}
				echo '</div>';
			}
		}

		add_action('woocommerce_before_single_product_summary', 'custom_single_product_testimonial', 20);
		function custom_single_product_testimonial() {
			$single_testi_text = nexros()->get_theme_opt('single_testi_text', '');
			$single_testi_title = nexros()->get_theme_opt('single_testi_title', '');
			$single_testi_position = nexros()->get_theme_opt('single_testi_position', '');
			$logoT = nexros()->get_theme_opt('single_testi_logo', []);
			$flag = nexros()->get_theme_opt('single_testi_flag', []);
			?>
			<div class="custom-testimonial-section">
				<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
					<path d="M0 29.9904H12.2016L8.2056 38.1777V42.0384L22.5504 29.9904V7.43994H0L0 29.9904Z" fill="white"/>
					<path d="M29.5898 11.6936V29.9902H39.4894L36.2465 36.6335V39.7645L47.8851 29.9902V11.6936H29.5898Z" fill="white"/>
				</svg>
				<p>
					<?php
					if ( !empty($single_testi_text) ) {
						echo wp_kses_post($single_testi_text);
					} 
					?>
				</p>
				<div class="product-testi--image">
					<?php if ( !empty($logoT['url']) || !empty($flag['url']) ) {
						echo '<div class="testi-image--flag">';
						if ( !empty($logoT['url']) ) {
							echo '<img src="'.esc_url($logoT['url']).'" alt="Testi Method"/>';
						}
						if ( !empty($flag['url']) ) {
							echo '<img class="flag" src="'.esc_url($flag['url']).'" alt="Testi flag"/>';
						}
						echo '</div>';
					} ?>
					<div class="product-testi--avatar">
						<strong><?php
						if ( !empty($single_testi_title) ) {
							echo wp_kses_post($single_testi_title);
						} 
					?></strong><br>
					<span><?php
					if ( !empty($single_testi_position) ) {
						echo wp_kses_post($single_testi_position);
					} 
				?></span>
			</div>
		</div>
	</div>
	<?php
}


/* Product Single: Gallery */
add_action( 'woocommerce_before_single_product_summary', 'nexros_woocommerce_single_gallery_start', 0 );
function nexros_woocommerce_single_gallery_start() { ?>
	<?php echo '<div class="woocommerce-gallery col-xl-6 col-lg-6 col-md-6"><div class="woocommerce-gallery-inner">'; ?>
<?php }
add_action( 'woocommerce_before_single_product_summary', 'nexros_woocommerce_single_gallery_end', 30 );
function nexros_woocommerce_single_gallery_end() { ?>
	<?php echo '</div></div><div class="woocommerce-summary-inner col-xl-6 col-lg-6 col-md-6">'; ?>
<?php }

/* Ajax update cart item */
add_filter('woocommerce_add_to_cart_fragments', 'nexros_woo_mini_cart_item_fragment');
function nexros_woo_mini_cart_item_fragment( $fragments ) {
	global $woocommerce;
	ob_start();
	?>
	<div class="widget_shopping_cart">
		<div class="widget_shopping_head">
			<div class="pxl-item--close pxl-close pxl-cursor--cta"></div>
			<div class="widget_shopping_title">
				<?php echo esc_html__( 'Cart', 'nexros' ); ?> <span class="widget_cart_counter">(<?php echo sprintf (_n( '%d item', '%d items', WC()->cart->cart_contents_count, 'nexros' ), WC()->cart->cart_contents_count ); ?>)</span>
			</div>
		</div>
		<div class="widget_shopping_cart_content">
			<?php
			$cart_is_empty = sizeof( $woocommerce->cart->get_cart() ) <= 0;
			?>
			<ul class="cart_list product_list_widget">

				<?php if ( ! WC()->cart->is_empty() ) : ?>

				<?php foreach ( WC()->cart->get_cart() as $cart_item_key => $cart_item ) {
					$_product     = apply_filters( 'woocommerce_cart_item_product', $cart_item['data'], $cart_item, $cart_item_key );
					$product_id   = apply_filters( 'woocommerce_cart_item_product_id', $cart_item['product_id'], $cart_item, $cart_item_key );

					if ( $_product && $_product->exists() && $cart_item['quantity'] > 0 && apply_filters( 'woocommerce_widget_cart_item_visible', true, $cart_item, $cart_item_key ) ) {

						$product_name  = apply_filters( 'woocommerce_cart_item_name', $_product->get_title(), $cart_item, $cart_item_key );
						$thumbnail     = apply_filters( 'woocommerce_cart_item_thumbnail', $_product->get_image(), $cart_item, $cart_item_key );
						$product_price = apply_filters( 'woocommerce_cart_item_price', WC()->cart->get_product_price( $_product ), $cart_item, $cart_item_key );
						?>
						<li>
							<?php if(!empty($thumbnail)) : ?>
								<div class="cart-product-image">
									<a href="<?php echo esc_url( $_product->get_permalink( $cart_item ) ); ?>">
										<?php echo str_replace( array( 'http:', 'https:' ), '', $thumbnail ); ?>
									</a>
								</div>
							<?php endif; ?>
							<div class="cart-product-meta">
								<h3><a href="<?php echo esc_url( $_product->get_permalink( $cart_item ) ); ?>"><?php echo esc_html($product_name); ?></a></h3>
								<?php echo apply_filters( 'woocommerce_widget_cart_item_quantity', '<span class="quantity">' . sprintf( '%s &times; %s', $cart_item['quantity'], $product_price ) . '</span>', $cart_item, $cart_item_key ); ?>
								<?php
								echo apply_filters( 'woocommerce_cart_item_remove_link', sprintf(
									'<a href="%s" class="remove_from_cart_button pxl-close" aria-label="%s" data-product_id="%s" data-cart_item_key="%s" data-product_sku="%s"></a>',
									esc_url( wc_get_cart_remove_url( $cart_item_key ) ),
									esc_attr__( 'Remove this item', 'nexros' ),
									esc_attr( $product_id ),
									esc_attr( $cart_item_key ),
									esc_attr( $_product->get_sku() )
								), $cart_item_key );
								?>
							</div>	
						</li>
						<?php
					}
				}
				?>

			<?php else : ?>

				<li class="empty">
					<i class="bootstrap-icons bi-cart3"></i>
					<span><?php esc_html_e( 'Your cart is empty', 'nexros' ); ?></span>
					<a class="btn btn-shop" href="<?php echo get_permalink( wc_get_page_id( 'shop' ) ); ?>"><?php echo esc_html__('Browse Shop', 'nexros'); ?></a>
				</li>

			<?php endif; ?>

		</ul><!-- end product list -->
	</div>
	<?php if ( ! WC()->cart->is_empty() ) : ?>
	<div class="widget_shopping_cart_footer">
		<p class="total"><strong><?php esc_html_e( 'Subtotal', 'nexros' ); ?>:</strong> <?php echo WC()->cart->get_cart_subtotal(); ?></p>

		<?php do_action( 'woocommerce_widget_shopping_cart_before_buttons' ); ?>

		<p class="buttons">
			<a href="<?php echo esc_url( wc_get_cart_url() ); ?>" class="btn btn-shop wc-forward"><?php esc_html_e( 'View Cart', 'nexros' ); ?></a>
			<a href="<?php echo esc_url( wc_get_checkout_url() ); ?>" class="btn checkout wc-forward"><?php esc_html_e( 'Checkout', 'nexros' ); ?></a>
		</p>
	</div>
<?php endif; ?>
</div>
<?php
$fragments['div.widget_shopping_cart'] = ob_get_clean();
return $fragments;
}

/* Ajax update cart total number */

function custom_related_products_on_shop_archive() {
	if (is_shop() || is_product_category() || is_product_tag()) {
		global $post;

		$product = wc_get_product($post->ID);
		if ($product) {
			$related_products = wc_get_related_products($product->get_id(), 4);

			if (!empty($related_products)) {
				echo '<h2 class="pxl-related--title">' . esc_html__('Recently Products', 'nexros') . '</h2>';
				echo '<section class="related products"><ul class="products columns-4">';

				foreach ($related_products as $related_id) {
					$related_product = wc_get_product($related_id);

					if ($related_product) {
						echo '<li class="product">';
						echo '<div class="woocommerce-product-inner">';
						echo '<div class="woocommerce-product-header">';
						echo '<a href="' . esc_url(get_permalink($related_product->get_id())) . '">';
						echo wp_kses_post($related_product->get_image());
						echo '</a>';
						echo '<div class="woocommerce-product--buttons">';
						echo '<div class="woocommerce-add-to-cart">';
						echo '<div class="woocommerce-product-meta">';
						echo '<div class="woocommerce-add-to-cart list-v">';
						woocommerce_template_loop_add_to_cart(['product' => $related_product]);
						echo '</div>';

						if (class_exists('WPCleverWoosw')) {
							echo '<div class="woocommerce-wishlist">';
							echo do_shortcode('[woosw id="' . esc_attr($related_product->get_id()) . '"]');
							echo '</div>';
						}
						echo '</div>'; 
						echo '</div>'; 
						echo '</div>'; 
						echo '</div>'; 

						echo '<div class="woocommerce-product-content">';
						echo wc_get_rating_html($related_product->get_average_rating());

						echo '<h2 class="woocommerce-loop-product__title">' . esc_html($related_product->get_name()) . '</h2>';

						echo '<span class="price">' . $related_product->get_price_html() . '</span>';

						echo '</div>'; 
						echo '</div>'; 
						echo '</li>';
					}
				}

				echo '</ul></section>';
			}
		}
	}
}


add_filter( 'woocommerce_add_to_cart_fragments', 'nexros_woocommerce_sidebar_cart_count_number' );
function nexros_woocommerce_sidebar_cart_count_number( $fragments ) {
	ob_start();
	?>
	<span class="widget_cart_counter">(<?php echo sprintf (_n( '%d', '%d', WC()->cart->cart_contents_count, 'nexros' ), WC()->cart->cart_contents_count ); ?>)</span>
	<?php

	$fragments['span.widget_cart_counter'] = ob_get_clean();

	return $fragments;
}

add_filter( 'woocommerce_output_related_products_args', 'nexros_related_sub', 20 );
function nexros_related_sub() {
	echo '<div class="heading-related">';

	echo '<h3 class="title-related">';
	echo esc_html__('Related Products','nexros');
	echo '</h3>';

	echo '</div>';
}

add_filter( 'woocommerce_output_related_products_args', 'nexros_related_products_args', 20 );
function nexros_related_products_args( $args ) {
	$args['posts_per_page'] = 4;
	$args['columns'] = 4;
	return $args;
}

/* Pagination Args */
function nexros_filter_woocommerce_pagination_args( $array ) { 
	$array['end_size'] = 1;
	$array['mid_size'] = 1;
	return $array; 
}; 
add_filter( 'woocommerce_pagination_args', 'nexros_filter_woocommerce_pagination_args', 10, 1 ); 

/* Flex Slider Arrow */
add_filter( 'woocommerce_single_product_carousel_options', 'nexros_update_woo_flexslider_options' );
function nexros_update_woo_flexslider_options( $options ) {
	$options['directionNav'] = true;
	return $options;
}

/* Single Thumbnail Size */
$single_img_size = nexros()->get_theme_opt('single_img_size');
if(!empty($single_img_size['width']) && !empty($single_img_size['height'])) {
	add_filter('woocommerce_get_image_size_single', function ($size) {
		$single_img_size = nexros()->get_theme_opt('single_img_size');
		$single_img_size_width = preg_replace('/[^0-9]/', '', $single_img_size['width']);
		$single_img_size_height = preg_replace('/[^0-9]/', '', $single_img_size['height']);
		$size['width'] = $single_img_size_width;
		$size['height'] = $single_img_size_height;
		$size['crop'] = 1;
		return $size;
	});
}
add_filter('woocommerce_get_image_size_gallery_thumbnail', function ($size) {
	$size['width'] = 600;
	$size['height'] = 600;
	$size['crop'] = 1;
	return $size;
});

add_filter('woocommerce_get_image_size_thumbnail', function ($size) {
	$size['width'] = 767;
	$size['height'] = 821;
	$size['crop'] = 1;
	return $size;
});

/* Custom Text Add to cart - Single product */
add_filter( 'woocommerce_product_single_add_to_cart_text', 'nexros_add_to_cart_button_text_single' ); 
function nexros_add_to_cart_button_text_single() {
	echo '<i class="bootstrap-icons bi-cart3 pxl-mr-12"></i>'.esc_html__('Add to Cart', 'nexros');
}