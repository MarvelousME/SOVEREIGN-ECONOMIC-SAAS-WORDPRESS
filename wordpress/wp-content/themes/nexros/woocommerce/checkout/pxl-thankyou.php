	<?php
	if ( $order ) :

		do_action( 'woocommerce_before_thankyou', $order->get_id() );
		?>

		<?php wc_get_template( 'checkout/order-received.php', array( 'order' => $order ) ); ?>
		<div class="thankyou-page">
			<div class="thankyou-page--content">
				<!-- Order Overview -->
				<div class="order-overview">
					<div class="order-detail d-flex align-items-center justify-content-center">
						<p class="d-flex align-items-center"><strong><?php esc_html_e( 'Order number:', 'nexros' ); ?></strong> #<?php echo esc_html($order->get_order_number()); ?></p>
						<p class="d-flex align-items-center"><strong><?php esc_html_e( 'Order date:', 'nexros' ); ?></strong> <?php echo wc_format_datetime( $order->get_date_created() ); ?></p>
						<p class="d-flex align-items-center"><strong><?php esc_html_e( 'Order total:', 'nexros' ); ?></strong> <?php echo wp_kses_post($order->get_formatted_order_total()); ?></p>
						<p class="d-flex align-items-center"><strong><?php esc_html_e( 'Payment method:', 'nexros' ); ?></strong> <?php echo esc_html($order->get_payment_method_title()); ?></p>
					</div>
					<!-- Order Status -->
					<div class="order-status d-flex align-items-baseline justify-content-center">
						<span class="status confirmed d-flex align-items-center">
							<span class="status-icon d-flex align-items-center justify-content-center">
								<svg xmlns="http://www.w3.org/2000/svg" width="28" height="30" viewBox="0 0 28 30" fill="none">
									<path d="M19.1998 11.2587C18.7448 10.8031 18.0052 10.8031 17.5502 11.2587L12.5417 16.2666L10.4498 14.1753C9.99483 13.7198 9.25517 13.7198 8.80017 14.1753C8.34458 14.6309 8.34458 15.3694 8.80017 15.825L11.7168 18.7417C11.9443 18.9698 12.243 19.0835 12.5417 19.0835C12.8403 19.0835 13.139 18.9698 13.3665 18.7417L19.1998 12.9083C19.6554 12.4528 19.6554 11.7143 19.1998 11.2587Z" fill="black"/>
									<path d="M26.8333 13.8266C26.1893 13.8266 25.6667 14.3524 25.6667 15.0003C25.6667 21.4715 20.433 26.7363 14 26.7363C7.567 26.7363 2.33333 21.4715 2.33333 15.0003C2.33333 8.52899 7.567 3.2642 14 3.2642C17.1319 3.2642 20.0719 4.49531 22.2792 6.73103C22.7325 7.19167 23.4716 7.19402 23.9289 6.7369C24.3862 6.28037 24.3886 5.53747 23.9347 5.07742C21.2864 2.39456 17.7578 0.916992 14 0.916992C6.28017 0.916992 0 7.23451 0 15.0003C0 22.766 6.28017 29.0835 14 29.0835C21.7198 29.0835 28 22.766 28 15.0003C28 14.3524 27.4773 13.8266 26.8333 13.8266Z" fill="black"/>
								</svg>
							</span>
							<?php esc_html_e( 'Confirmed', 'nexros' ); ?> 
							<?php 
							$confirmed_date = $order->get_date_created();
							if ( $confirmed_date ) {
								echo '<small>' . $confirmed_date->date( 'j M Y' ) . '</small>'; 
							}
							?>
						</span>

						<span class="status shipped d-flex align-items-center">
							<span class="status-icon d-flex align-items-center justify-content-center">
								<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28" fill="none">
									<path d="M27.9945 6.90532C27.9618 6.60416 27.7747 6.33761 27.495 6.20707L14.37 0.0820723C14.1354 -0.0273574 13.8645 -0.0273574 13.6299 0.0820723L0.50493 6.20707C0.225258 6.33761 0.0381172 6.6041 0.00535937 6.90532C0.00464844 6.91161 0 6.99539 0 6.99999V21.875C0 22.2328 0.21782 22.5545 0.550047 22.6874L13.675 27.9374C13.7793 27.9791 13.8897 28 14 28C14.1103 28 14.2207 27.9792 14.325 27.9374L27.45 22.6874C27.7822 22.5545 28 22.2328 28 21.875V6.99999C28 6.99539 27.9952 6.91156 27.9945 6.90532ZM14 1.84055L24.9235 6.93819L20.7173 8.62071L9.58819 3.89942L14 1.84055ZM7.45445 4.89517L18.4109 9.54323L14 11.3076L3.0765 6.93819L7.45445 4.89517ZM1.75 8.29236L13.125 12.8424V25.8326L1.75 21.2826V8.29236ZM14.875 25.8326V12.8424L26.25 8.29236V21.2826L14.875 25.8326Z" fill="black"/>
								</svg>
							</span>
							<?php esc_html_e( 'Shipped', 'nexros' ); ?>  
							<?php 
							$confirmed_date = $order->get_date_created();
							if ( $confirmed_date ) {
								echo '<small>' . $confirmed_date->date( 'j M Y' ) . '</small>'; 
							}
							?>
						</span>

						<span class="status delivered d-flex align-items-center">
							<span class="status-icon d-flex align-items-center justify-content-center">
								<svg xmlns="http://www.w3.org/2000/svg" width="22" height="28" viewBox="0 0 22 28" fill="none">
									<path d="M20.3668 6.82592C18.643 3.21217 15.0905 0.928417 11.0918 0.875917C7.08425 0.823417 3.53175 3.02842 1.74675 6.65092C-0.10825 10.4047 0.32925 14.7534 2.90175 18.0172L9.543 26.4522C9.88425 26.8809 10.3918 27.1259 10.9342 27.1259C11.4767 27.1259 11.9843 26.8809 12.3255 26.4522L19.1418 17.7897C21.618 14.6397 22.0818 10.4484 20.3668 6.83467V6.82592ZM17.7768 16.7047L10.9255 25.3672L4.28425 16.9322C2.1405 14.2109 1.773 10.5622 3.32175 7.42967C4.80925 4.41967 7.653 2.63467 10.943 2.63467H11.0743C14.4517 2.68717 17.3393 4.53342 18.7917 7.58717C20.2442 10.6409 19.868 14.0447 17.7768 16.7047Z" fill="black"/>
									<path d="M10.9343 6.26592C8.3005 6.26592 6.15675 8.40967 6.15675 11.0434C6.15675 13.6772 8.3005 15.8209 10.9343 15.8209C13.568 15.8209 15.7118 13.6772 15.7118 11.0434C15.7118 8.40967 13.568 6.26592 10.9343 6.26592ZM10.9343 14.0622C9.263 14.0622 7.90675 12.7059 7.90675 11.0347C7.90675 9.36342 9.263 8.00717 10.9343 8.00717C12.6055 8.00717 13.9618 9.36342 13.9618 11.0347C13.9618 12.7059 12.6055 14.0622 10.9343 14.0622Z" fill="black"/>
								</svg>
							</span>
							<?php esc_html_e( 'Delivered', 'nexros' ); ?>   
							<?php 
							$delivered_date = $order->get_meta( '_delivery_date' ); 
							if ( $delivered_date ) {
								echo '<small>(' . date( 'F j, Y', strtotime( $delivered_date ) ) . ')</small>';
							}
							?>
						</span>
					</div>
				</div>

				<!-- Map -->
				<div class="order-map">
					<div id="map"></div>
				</div>

				<!-- Address Section -->
				<div class="address-section">
					<div class="shipping-address">
						<h3><?php esc_html_e( 'Shipping address', 'nexros' ); ?></h3>
						<p><?php echo nl2br( $order->get_formatted_shipping_address() ); ?></p>
					</div>
					<div class="billing-address">
						<h3><?php esc_html_e( 'Billing address', 'nexros' ); ?></h3>
						<p><?php echo nl2br( $order->get_formatted_billing_address() ); ?></p>
					</div>
				</div>
			</div>
			<div class="thankyou-page--sidebar">
				<!-- Order Items -->
				<div class="order-items">
					<h3><?php esc_html_e( 'Order Details', 'nexros' ); ?></h3>
					<ul>
						<?php foreach ( $order->get_items() as $item_id => $item ) : ?>
							<li>
								<span class="order-items--img">
									<?php 
									$product = $item->get_product(); 
									if ( $product ) {
										echo wp_get_attachment_image( $product->get_image_id(), 'thumbnail' ); 
									}
									?>
									<span class="product-quantity"><?php echo esc_html($item->get_quantity()); ?></span>
								</span>
								<span class="product-name"><?php echo esc_html($item->get_name()); ?></span>
								<span class="product-total"><?php echo esc_html($item->get_total()) . ' ' . esc_html($order->get_currency()); ?></span>
							</li>
						<?php endforeach; ?>
					</ul>

					<div class="order-summary">
						<p><strong><?php esc_html_e( 'Subtotal:', 'nexros' ); ?></strong> 
							<?php echo esc_html($order->get_subtotal()) . ' ' . esc_html($order->get_currency()); ?>
						</p>
						<p><strong><?php esc_html_e( 'Discount:', 'nexros' ); ?></strong> 
							<?php echo esc_html($order->get_discount_total()) . ' ' . esc_html($order->get_currency()); ?>
						</p>
						<p><strong><?php esc_html_e( 'Shipping:', 'nexros' ); ?></strong> 
							<?php echo esc_html($order->get_shipping_total()) . ' ' . esc_html($order->get_currency()); ?>
						</p>
						<p><strong><?php esc_html_e( 'Tax:', 'nexros' ); ?></strong> 
							<?php echo esc_html($order->get_total_tax()) . ' ' . esc_html($order->get_currency()); ?>
						</p>

						<p><strong><?php esc_html_e( 'Subtotal:', 'nexros' ); ?></strong> 
							<?php 
							$total = $order->get_subtotal() - $order->get_discount_total() + $order->get_shipping_total() + $order->get_total_tax();
							echo esc_html($total) . ' ' . esc_html($order->get_currency());
							?>
						</p>
					</div>
				</div>
				<!-- Feedback Form -->
				<div class="feedback-form">
					<h3><?php esc_html_e( 'Give us a feedback', 'nexros' ); ?></h3>
					<p><?php esc_html_e( 'Let us know what you think about the shopping experience, and get a gift coupon for the next shopping.', 'nexros' ); ?></p>
					<form action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" method="post">
						<input type="hidden" name="action" value="submit_feedback_form">
						<input type="text" name="name" required placeholder="<?php esc_attr_e( 'Name', 'nexros' ); ?>">
						<input type="email" name="email" required placeholder="<?php esc_attr_e( 'Email', 'nexros' ); ?>">
						<label for="rating"><?php esc_html_e( 'How was your experience?', 'nexros' ); ?></label>
						<div class="feedback-rating">
							<label><input type="radio" name="rating" value="1" required> 1</label>
							<label><input type="radio" name="rating" value="2"> 2</label>
							<label><input type="radio" name="rating" value="3"> 3</label>
							<label><input type="radio" name="rating" value="4"> 4</label>
							<label><input type="radio" name="rating" value="5"> 5</label>
						</div>
						<textarea name="feedback" required placeholder="<?php esc_attr_e( 'Share your exprience...', 'nexros' ); ?>"></textarea>
						<button type="submit"><?php esc_html_e( 'Send', 'nexros' ); ?></button>
					</form>
					<div class="social-links">
						<h3><?php esc_html_e( 'Share the love', 'nexros' ); ?></h3>
						<a href="https://www.facebook.com/sharer/sharer.php?u=" id="facebook-share" target="_blank"><i class="fab fa-facebook-f"></i></a>

						<a href="https://twitter.com/intent/tweet?url=" id="twitter-share" target="_blank"><i class="fab fa-x-twitter"></i></a>

						<a href="https://www.tiktok.com/share?url=" id="tiktok-share" target="_blank"><i class="fab fa-tiktok"></i></a>

						<a href="https://www.linkedin.com/shareArticle?mini=true&url=" id="linkedin-share" target="_blank"><i class="fab fa-linkedin-in"></i></a>
					</div>
				</div>

			</div>
		</div>
	<?php endif; ?>
	<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
	<script>
		document.addEventListener('DOMContentLoaded', function () {
			var shippingAddress = "<?php echo esc_js($order->get_shipping_address_1()); ?>";

			var geocodeUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(shippingAddress)}`;

			fetch(geocodeUrl)
			.then(response => response.json())
			.then(data => {
				if (data.length > 0) {
					var lat = data[0].lat;
					var lon = data[0].lon;
					var map = L.map('map').setView([lat, lon], 13);

					L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
						maxZoom: 19
					}).addTo(map);

					L.marker([lat, lon]).addTo(map).bindPopup('Shipping Address').openPopup();
				} else {
					alert("Address not found.");
				}
			})
			.catch(error => {
				console.error("Error geocoding the address:", error);
			});
		});
		document.getElementById('facebook-share').href = 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(window.location.href);
		document.getElementById('twitter-share').href = 'https://twitter.com/intent/tweet?url=' + encodeURIComponent(window.location.href) + '&text=' + encodeURIComponent(document.title);
		document.getElementById('linkedin-share').href = 'https://www.linkedin.com/shareArticle?mini=true&url=' + encodeURIComponent(window.location.href);
		document.getElementById('tiktok-share').href = 'https://www.tiktok.com/share?url=' + encodeURIComponent(window.location.href);
	</script>
