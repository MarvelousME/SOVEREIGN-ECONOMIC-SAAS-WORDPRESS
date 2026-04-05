<?php
if (!defined('ABSPATH')) exit;

class SAAOS_Performance_Widget extends SAAOS_Analytics_Widget {
    protected string $type = 'performance';
    protected string $title = 'Page Performance';
    protected string $description = 'Display page performance metrics including pageviews, clicks, and engagement.';

    public function render(array $params = []): string {
        $period = sanitize_text_field($params['period'] ?? '30d');
        $metric = sanitize_text_field($params['metric'] ?? 'pageviews');
        $days = $this->get_period_days($period);
        $since = time() - ($days * DAY_IN_SECONDS);

        global $wpdb;
        $clicks_table = $wpdb->prefix . 'saaos_clicks';

        $results = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT DATE(FROM_UNIXTIME(created_at)) as date, COUNT(*) as count
                FROM {$clicks_table}
                WHERE created_at >= %d
                GROUP BY DATE(FROM_UNIXTIME(created_at))
                ORDER BY date ASC",
                $since
            ),
            ARRAY_A
        );

        $labels = [];
        $data = [];

        foreach ($results as $row) {
            $labels[] = $row['date'];
            $data[] = (int) $row['count'];
        }

        $content = '<div class="saaos-performance-widget">';
        $content .= '<div class="saaos-performance-header">';
        $content .= '<span class="saaos-performance-title">' . esc_html(ucfirst($metric)) . '</span>';
        $content .= '<span class="saaos-performance-period">' . esc_html($period) . '</span>';
        $content .= '</div>';

        if (empty($labels)) {
            $content .= '<div class="saaos-performance-empty">No data available for this period.</div>';
        } else {
            $content .= '<div class="saaos-performance-chart-container">';
            $content .= '<canvas class="saaos-performance-chart" data-labels="' . esc_attr(wp_json_encode($labels)) . '" data-data="' . esc_attr(wp_json_encode($data)) . '"></canvas>';
            $content .= '</div>';

            $total = array_sum($data);
            $avg = count($data) > 0 ? round($total / count($data), 1) : 0;
            $max = count($data) > 0 ? max($data) : 0;

            $content .= '<div class="saaos-performance-stats">';
            $content .= '<div class="saaos-stat-item"><span class="saaos-stat-label">Total</span><span class="saaos-stat-value">' . esc_html($this->format_number($total)) . '</span></div>';
            $content .= '<div class="saaos-stat-item"><span class="saaos-stat-label">Daily Avg</span><span class="saaos-stat-value">' . esc_html($this->format_number($avg)) . '</span></div>';
            $content .= '<div class="saaos-stat-item"><span class="saaos-stat-label">Peak</span><span class="saaos-stat-value">' . esc_html($this->format_number($max)) . '</span></div>';
            $content .= '</div>';
        }

        $content .= '</div>';

        return $this->render_container($content, $params);
    }
}
