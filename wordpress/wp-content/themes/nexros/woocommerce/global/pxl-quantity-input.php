<?php

defined( 'ABSPATH' ) || exit;

$variable_layout = isset($_GET['variable-layout']) ? sanitize_text_field($_GET['variable-layout']) : nexros()->get_opt('product_variable_layout', 'vlayout-inline');  
$label_cls = $variable_layout == 'vlayout-inline' ? 'col-auto' : 'col-12';
?>
<div class="quantity">
	<?php
	do_action( 'woocommerce_before_quantity_input_field' );
	?>
	 
	<div class="pxl-quantity-wrap row gx-20">
		<div class="label <?php echo esc_attr($label_cls) ?>">
			<label><?php esc_html_e( 'Qty', 'nexros' ) ?></label>
		</div>
		<div class="qty-field col">
			<div class="quantity-inner">
				<span class="quantity-button quantity-down"><span class="lnil lnil-minus"></span></span>
				<input
					type="<?php echo esc_attr( $type ); ?>"
					<?php echo esc_attr($readonly) ? 'readonly="readonly"' : ''; ?>
					id="<?php echo esc_attr( $input_id ); ?>"
					class="<?php echo esc_attr( join( ' ', (array) $classes ) ); ?>"
					name="<?php echo esc_attr( $input_name ); ?>"
					value="<?php echo esc_attr( $input_value ); ?>"
					title="<?php echo esc_attr_x( 'Qty', 'Product quantity input tooltip', 'nexros' ); ?>"
					min="<?php echo esc_attr( $min_value ); ?>"
					max="<?php echo esc_attr( 0 < $max_value ? $max_value : 50 ); ?>"
					<?php if ( ! $readonly ) : ?>
						step="<?php echo esc_attr( $step ); ?>"
						placeholder="<?php echo esc_attr( $placeholder ); ?>"
						inputmode="<?php echo esc_attr( $inputmode ); ?>"
						autocomplete="<?php echo esc_attr( isset( $autocomplete ) ? $autocomplete : 'on' ); ?>"
					<?php endif; ?>
				/>
				<span class="quantity-button quantity-up"><span class="lnir lnir-plus"></span></span>
			</div>
		</div>
	</div>
	<?php
	/**
	 * Hook to output something after quantity input field
	 *
	 * @since 3.6.0
	 */
	do_action( 'woocommerce_after_quantity_input_field' );
	?>
</div>
<?php
