<?php

defined( 'ABSPATH' ) || exit;

$formatted_destination    = isset( $formatted_destination ) ? $formatted_destination : WC()->countries->get_formatted_address( $package['destination'], ', ' );
$has_calculated_shipping  = ! empty( $has_calculated_shipping );
$show_shipping_calculator = ! empty( $show_shipping_calculator );
$calculator_text          = '';
 
?>
<div class="cart-shipping woocommerce-shipping-totals shipping">
	<div data-title="<?php echo esc_attr( $package_name ); ?>">
		<?php if ( $available_methods ) : ?>
			<div id="shipping_method" class="woocommerce-shipping-methods">
				<?php if ( 1 < count( $available_methods ) ) : ?>
				<select name="shipping_method" class="shipping_method nice-select" data-index="<?php echo esc_attr($index)?>">
				<?php endif; ?>

				<?php foreach ( $available_methods as $method ) : ?>
						<?php
						if ( 1 < count( $available_methods ) ) {
							printf( '<option value="%1$s" %2$s />%3$s</option>', esc_attr( $method->id ), selected( $method->id, $chosen_method, false ), nexros_wc_cart_totals_shipping_method_label( $method ) );
						} else {
							printf( '<input type="hidden" name="shipping_method[%1$d]" data-index="%1$d" id="shipping_method_%1$d_%2$s" value="%3$s" class="shipping_method" />', $index, esc_attr( sanitize_title( $method->id ) ), esc_attr( $method->id ) );
						}
						do_action( 'woocommerce_after_shipping_rate', $method, $index );
						?>
					
				<?php endforeach; ?>
				<?php if ( 1 < count( $available_methods ) ) : ?>
				</select>
				<?php endif; ?>
			</div>
		<?php
		elseif ( ! $has_calculated_shipping || ! $formatted_destination ) :
			if ( is_cart() && 'no' === get_option( 'woocommerce_enable_shipping_calc' ) ) {
				echo wp_kses_post( apply_filters( 'woocommerce_shipping_not_enabled_on_cart_html', __( 'Shipping costs are calculated during checkout.', 'nexros' ) ) );
			} else {
				echo wp_kses_post( apply_filters( 'woocommerce_shipping_may_be_available_html', __( 'Enter your address to view shipping options.', 'nexros' ) ) );
			}
		elseif ( ! is_cart() ) :
			echo wp_kses_post( apply_filters( 'woocommerce_no_shipping_available_html', __( 'There are no shipping options available. Please ensure that your address has been entered correctly, or contact us if you need any help.', 'nexros' ) ) );
		else :
			echo wp_kses_post(
				 
				apply_filters(
					'woocommerce_cart_no_shipping_available_html',
					sprintf( esc_html__( 'No shipping options were found for %s.', 'nexros' ) . ' ', '<strong>' . esc_html( $formatted_destination ) . '</strong>' ),
					$formatted_destination
				)
			);
			$calculator_text = esc_html__( 'Enter a different address', 'nexros' );
		endif; 
		?>
 		 
		<?php if ( $show_shipping_calculator ) : ?>  
			<?php woocommerce_shipping_calculator( $calculator_text ); ?>
		<?php endif; ?>
	</div>
</div>
