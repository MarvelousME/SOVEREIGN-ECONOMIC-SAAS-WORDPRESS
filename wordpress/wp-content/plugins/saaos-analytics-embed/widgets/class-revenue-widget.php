<?php
if (!defined('ABSPATH')) exit;

class SAAOS_Revenue_Widget extends SAAOS_Analytics_Widget {
    protected string $type = 'revenue';
    protected string $title = 'Revenue Widget';
    protected string $description = 'Display revenue metrics with optional comparison to previous period.';

    public function render(array $params = []): string {
        $period = sanitize_text_field($params['period'] ?? '30d');
        $show_comparison = filter_var($params['comparison'] ?? false, FILTER_VALIDATE_BOOLEAN);

        $current_data = $this->get_stats_data('revenue', $period);

        $previous_period = $this->get_previous_period($period);
        $previous_data = $this->get_stats_data('revenue', $previous_period);

        $current = $current_data['total'] ?? 0;
        $previous = $previous_data['total'] ?? 0;

        $change = 0;
        $change_class = '';
        if ($previous > 0) {
            $change = (($current - $previous) / $previous) * 100;
            $change_class = $change >= 0 ? 'positive' : 'negative';
        }

        $content = '<div class="saaos-revenue-widget">';
        $content .= '<div class="saaos-revenue-primary">';
        $content .= '<span class="saaos-revenue-label">Revenue (' . esc_html($period) . ')</span>';
        $content .= '<span class="saaos-revenue-value">' . esc_html($this->format_currency($current)) . '</span>';

        if ($show_comparison && $previous > 0) {
            $content .= '<span class="saaos-revenue-change ' . esc_attr($change_class) . '">';
            $content .= ($change >= 0 ? '&#9650;' : '&#9660;') . ' ';
            $content .= esc_html(abs(round($change, 1))) . '% vs ' . esc_html($previous_period);
            $content .= '</span>';
        }

        $content .= '</div>';

        $content .= '<div class="saaos-revenue-breakdown">';
        $content .= '<span class="saaos-breakdown-item">';
        $content .= '<span class="saaos-breakdown-label">Previous Period:</span>';
        $content .= '<span class="saaos-breakdown-value">' . esc_html($this->format_currency($previous)) . '</span>';
        $content .= '</span>';
        $content .= '</div>';

        $content .= '</div>';

        return $this->render_container($content, $params);
    }
}
