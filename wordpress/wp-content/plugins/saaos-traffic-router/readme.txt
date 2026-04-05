=== SAAOS Traffic Router ===
Contributors: sovereign-os
Tags: traffic, routing, click tracking, conversion tracking, affiliate
Requires at least: 6.0
Tested up to: 6.4
Requires PHP: 8.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Route public traffic to published landing pages, handle click attribution, A/B testing, geo-routing, and conversion tracking.

== Description ==

SAAOS Traffic Router provides comprehensive traffic routing and attribution management for the Sovereign Autonomous Affiliate OS.

= Features =

* **Click Tracking** - Intercept and record all outbound clicks with source, medium, campaign attribution
* **Cookie Stitching** - Maintain attribution windows with persistent cookie management
* **A/B Testing** - Split traffic between variants with configurable weights
* **Geo-Based Routing** - Route visitors based on geographic location
* **Device-Based Routing** - Optimize landing pages for mobile, tablet, and desktop
* **Conversion Tracking** - Track pixel fires, revenue, and attribution
* **Shortcodes** - Easy integration with [saaos_affiliate_link], [saaos_tracked_link], [saaos_conversion_pixel]

= API Endpoints =

* `admin_post_nopriv_saaos_click` - Record click (no auth)
* `admin_post_nopriv_saaos_conversion` - Record conversion (no auth)
* REST API `/wp-json/saaos-traffic/v1/` - Routing decisions

== Installation ==

1. Upload the plugin files to `/wp-content/plugins/saaos-traffic-router/`
2. Activate the plugin through the 'Plugins' menu in WordPress
3. Configure settings under "Traffic Router" admin menu

== Shortcodes ==

= Affiliate Link =
[saaos_affiliate_link id="123" url="https://example.com/offer" campaign="summer_sale" source="affiliate" medium="banner"]

= Tracked Link =
[saaos_tracked_link url="https://example.com" campaign="test" source="newsletter" medium="email" text="Click Here"]

= Conversion Pixel =
[saaos_conversion_pixel id="pixel_id"]

== Changelog ==

= 1.0.0 =
* Initial release
