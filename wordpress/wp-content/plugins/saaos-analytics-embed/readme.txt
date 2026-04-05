=== SAAOS Analytics Embed ===
Contributors: sovereign-os
Tags: analytics, dashboard, embed, widgets, reports
Requires at least: 6.0
Tested up to: 6.4
Requires PHP: 8.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Securely embed selected dashboards and widgets into WordPress for customer-facing summaries.

== Description ==

SAAOS Analytics Embed provides a secure way to embed analytics dashboards and widgets within WordPress pages.

= Features =

* **Secure iframe embedding** with token-based authentication
* **Dashboard widgets**: Overview, Revenue, Performance, Leads
* **Token management** for secure API access
* **Widget permissions** per user role
* **Responsive embed sizing**
* **Customizable styling** (colors, borders)
* **REST API** for dynamic data fetching

= Available Shortcodes =

* `[saaos_dashboard widget="overview" period="30d"]` - Main dashboard
* `[saaos_stats type="revenue" period="30d"]` - Revenue stats
* `[saaos_lead_chart period="30d"]` - Lead conversion chart
* `[saaos_performance_chart period="30d"]` - Performance metrics
* `[saaos_revenue_widget period="30d" comparison="true"]` - Revenue widget

= REST API Endpoints =

* `GET /wp-json/saaos-analytics/v1/embed` - Get embed HTML
* `GET /wp-json/saaos-analytics/v1/widget/{widget}` - Get widget data
* `GET /wp-json/saaos-analytics/v1/stats` - Get stats data
* `POST /wp-json/saaos-analytics/v1/token/validate` - Validate token

== Installation ==

1. Upload the plugin files to `/wp-content/plugins/saaos-analytics-embed/`
2. Activate the plugin through the 'Plugins' menu in WordPress
3. Configure settings under "Analytics Embed" admin menu
4. Generate API tokens for secure access
5. Add shortcodes to your pages

== Security ==

* Token-based authentication for all embeds
* Rate limiting on API requests
* Origin validation for iframes
* Capability-based widget permissions
* Nonce validation on forms

== Changelog ==

= 1.0.0 =
* Initial release
