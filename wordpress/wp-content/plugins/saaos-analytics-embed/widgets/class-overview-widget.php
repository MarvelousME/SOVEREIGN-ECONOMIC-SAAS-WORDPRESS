<?php
if (!defined('ABSPATH')) exit;

class SAAOS_Overview_Widget extends SAAOS_Analytics_Widget {
    protected string $type = 'overview';
    protected string $title = 'Analytics Overview';
    protected string $description = 'Overview of key metrics including revenue, clicks, conversions, and leads.';

    public function render(array $params = []): string {
        $period = sanitize_text_field($params['period'] ?? '30d');
        $days = $this->get_period_days($period);
        $since = time() - ($days * DAY_IN_SECONDS);

        global $wpdb;
        $clicks_table = $wpdb->prefix . 'saaos_clicks';
        $conversions_table = $wpdb->prefix . 'saaos_conversions';

        $total_clicks = (int) $wpdb->get_var(
            $wpdb->prepare("SELECT COUNT(*) FROM {$clicks_table} WHERE created_at >= %d", $since)
        );

        $total_conversions = (int) $wpdb->get_var(
            $wpdb->prepare("SELECT COUNT(*) FROM {$clicks_table} WHERE created_at >= %d AND converted = 1", $since)
        );

        $total_revenue = (float) $wpdb->get_var(
            $wpdb->prepare("SELECT COALESCE(SUM(value), 0) FROM {$conversions_table} WHERE created_at >= %d", $since)
        );

        $total_leads = (int) $wpdb->get_var(
            $wpdb->prepare("SELECT COUNT(*) FROM {$conversions_table} WHERE created_at >= %d AND event_type = 'lead'", $since)
        );

        $conversion_rate = $total_clicks > 0 ? round(($total_conversions / $total_clicks) * 100, 2) : 0;

        $content = '<div class="saaos-overview-widget">';
        $content .= '<div class="saaos-overview-grid">';

        $content .= '<div class="saaos-metric-card">';
        $content .= '<span class="saaos-metric-value">' . esc_html($this->format_currency($total_revenue)) . '</span>';
        $content .= '<span class="saaos-metric-label">Revenue</span>';
        $content .= '<span class="saaos-metric-period">' . esc_html($period) . '</span>';
        $content .= '</div>';

        $content .= '<div class="saaos-metric-card">';
        $content .= '<span class="saaos-metric-value">' . esc_html($this->format_number($total_clicks)) . '</span>';
        $content .= '<span class="saaos-metric-label">Clicks</span>';
        $content .= '<span class="saaos-metric-period">' . esc_html($period) . '</span>';
        $content .= '</div>';

        $content .= '<div class="saaos-metric-card">';
        $content .= '<span class="saaos-metric-value">' . esc_html($this->format_number($total_conversions)) . '</span>';
        $content .= '<span class="saaos-metric-label">Conversions</span>';
        $content .= '<span class="saaos-metric-period">' . esc_html($period) . '</span>';
        $content .= '</div>';

        $content .= '<div class="saaos-metric-card">';
        $content .= '<span class="saaos-metric-value">' . esc_html($conversion_rate) . '%</span>';
        $content .= '<span class="saaos-metric-label">Conv. Rate</span>';
        $content .= '<span class="saaos-metric-period">' . esc_html($period) . '</span>';
        $content .= '</div>';

        $content .= '</div>';
        $content .= '</div>';

        return $this->render_container($content, $params);
    }
}
