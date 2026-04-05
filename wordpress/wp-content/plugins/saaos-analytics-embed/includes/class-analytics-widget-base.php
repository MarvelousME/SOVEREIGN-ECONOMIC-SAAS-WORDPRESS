<?php
/**
 * Base class for SAAOS dashboard widgets (shared helpers + DB stats).
 */
if (!defined('ABSPATH')) {
    exit;
}

abstract class SAAOS_Analytics_Widget {

    protected string $type = '';
    protected string $title = '';
    protected string $description = '';

    abstract public function render(array $params = []): string;

    public function get_title(): string {
        return $this->title;
    }

    public function get_description(): string {
        return $this->description;
    }

    public function get_supported_periods(): array {
        return ['7d', '30d', '90d', '365d'];
    }

    public function get_dependencies(): array {
        return [];
    }

    public function get_styles(): array {
        return [];
    }

    protected function render_container(string $content, array $params = []): string {
        $class = sanitize_text_field($params['class'] ?? 'saaos-widget');
        return '<div class="' . esc_attr($class) . ' saaos-widget-type-' . esc_attr($this->type) . '">' . $content . '</div>';
    }

    protected function format_currency(float $amount): string {
        return '$' . number_format($amount, 2);
    }

    protected function format_number($n): string {
        return number_format((float) $n);
    }

    protected function get_period_days(string $period): int {
        $map = [
            '7d' => 7,
            '30d' => 30,
            '90d' => 90,
            '365d' => 365,
        ];
        return $map[$period] ?? 30;
    }

    protected function get_previous_period(string $period): string {
        $periods = [
            '7d' => '14d',
            '30d' => '60d',
            '90d' => '180d',
            '365d' => '730d',
        ];
        return $periods[$period] ?? '30d';
    }

    protected function get_stats_data(string $type, string $period): array {
        global $wpdb;

        $periods = [
            '7d' => WEEK_IN_SECONDS,
            '30d' => 30 * DAY_IN_SECONDS,
            '90d' => 90 * DAY_IN_SECONDS,
            '365d' => 365 * DAY_IN_SECONDS,
        ];

        $days = $periods[$period] ?? $periods['30d'];
        $since = time() - $days;

        $clicks_table = $wpdb->prefix . 'saaos_clicks';
        $conversions_table = $wpdb->prefix . 'saaos_conversions';

        switch ($type) {
            case 'revenue':
                $total = (float) $wpdb->get_var(
                    $wpdb->prepare(
                        "SELECT COALESCE(SUM(c.value), 0) FROM {$conversions_table} c WHERE c.created_at >= %d",
                        $since
                    )
                );
                return ['total' => $total, 'currency' => 'USD', 'period' => $period];

            case 'clicks':
                $count = (int) $wpdb->get_var(
                    $wpdb->prepare("SELECT COUNT(*) FROM {$clicks_table} WHERE created_at >= %d", $since)
                );
                return ['total' => $count, 'period' => $period];

            case 'conversions':
                $count = (int) $wpdb->get_var(
                    $wpdb->prepare("SELECT COUNT(*) FROM {$clicks_table} WHERE created_at >= %d AND converted = 1", $since)
                );
                return ['total' => $count, 'period' => $period];

            case 'leads':
                $count = (int) $wpdb->get_var(
                    $wpdb->prepare(
                        "SELECT COUNT(*) FROM {$conversions_table} WHERE created_at >= %d AND event_type = 'lead'",
                        $since
                    )
                );
                return ['total' => $count, 'period' => $period];

            default:
                return ['total' => 0, 'period' => $period];
        }
    }
}
