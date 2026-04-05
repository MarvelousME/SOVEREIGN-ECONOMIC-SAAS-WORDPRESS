<?php
/**
 * Plugin Name: SAAOS Analytics Embed
 * Description: Securely embed selected dashboards and widgets into WordPress for customer-facing summaries.
 * Version: 1.0.0
 * Author: Sovereign OS
 * Requires at least: 6.0
 * Requires PHP: 8.0
 */

if (!defined('ABSPATH')) exit;

final class SAAOS_Analytics_Embed {
    private static ?SAAOS_Analytics_Embed $instance = null;
    private string $option_key = 'saaos_analytics_embed_settings';
    private string $token_option_key = 'saaos_analytics_embed_tokens';

    public static function instance(): SAAOS_Analytics_Embed {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    private function __construct() {
        $this->load_dependencies();
        $this->init_hooks();
    }

    private function load_dependencies(): void {
        require_once dirname(__FILE__) . '/includes/class-analytics-widget-base.php';
        require_once dirname(__FILE__) . '/widgets/class-overview-widget.php';
        require_once dirname(__FILE__) . '/widgets/class-revenue-widget.php';
        require_once dirname(__FILE__) . '/widgets/class-performance-widget.php';
        require_once dirname(__FILE__) . '/includes/class-widget-renderer.php';
        require_once dirname(__FILE__) . '/includes/class-token-manager.php';
        require_once dirname(__FILE__) . '/includes/class-embed-security.php';
        require_once dirname(__FILE__) . '/admin/class-admin.php';
        require_once dirname(__FILE__) . '/public/class-public.php';
    }

    private function init_hooks(): void {
        add_action('init', [$this, 'register_shortcodes']);
        add_action('rest_api_init', [$this, 'register_rest_routes']);
        add_action('admin_post_nopriv_saaos_embed_render', [$this, 'handle_embed_render']);
        add_action('wp_enqueue_scripts', [$this, 'enqueue_assets']);
    }

    public function register_shortcodes(): void {
        add_shortcode('saaos_dashboard', [$this, 'dashboard_shortcode']);
        add_shortcode('saaos_stats', [$this, 'stats_shortcode']);
        add_shortcode('saaos_lead_chart', [$this, 'lead_chart_shortcode']);
        add_shortcode('saaos_performance_chart', [$this, 'performance_shortcode']);
        add_shortcode('saaos_revenue_widget', [$this, 'revenue_widget_shortcode']);
    }

    public function register_rest_routes(): void {
        register_rest_route('saaos-analytics/v1', '/embed', [
            'methods' => 'GET',
            'permission_callback' => '__return_true',
            'callback' => [$this, 'rest_get_embed']
        ]);

        register_rest_route('saaos-analytics/v1', '/token/validate', [
            'methods' => 'POST',
            'permission_callback' => '__return_true',
            'callback' => [$this, 'rest_validate_token']
        ]);

        register_rest_route('saaos-analytics/v1', '/stats', [
            'methods' => 'GET',
            'permission_callback' => '__return_true',
            'callback' => [$this, 'rest_get_stats']
        ]);

        register_rest_route('saaos-analytics/v1', '/widget/(?P<widget>[a-z_]+)', [
            'methods' => 'GET',
            'permission_callback' => '__return_true',
            'callback' => [$this, 'rest_get_widget']
        ]);
    }

    public function enqueue_assets(): void {
        wp_enqueue_style(
            'saaos-analytics-embed',
            plugin_dir_url(__FILE__) . 'assets/css/analytics-embed.css',
            [],
            '1.0.0'
        );

        wp_enqueue_script(
            'saaos-analytics-embed',
            plugin_dir_url(__FILE__) . 'assets/js/analytics-embed.js',
            ['jquery'],
            '1.0.0',
            true
        );

        wp_localize_script('saaos-analytics-embed', 'saaosAnalytics', [
            'restUrl' => rest_url('saaos-analytics/v1/'),
            'ajaxUrl' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('saaos_analytics_nonce')
        ]);
    }

    public function dashboard_shortcode($atts): string {
        $atts = shortcode_atts([
            'widget' => 'overview',
            'height' => '400',
            'width' => '100%',
            'period' => '30d',
            'class' => 'saaos-dashboard-widget'
        ], $atts);

        $widget = sanitize_text_field($atts['widget']);
        $height = absint($atts['height']);
        $width = esc_attr($atts['width']);
        $period = sanitize_text_field($atts['period']);
        $class = esc_attr($atts['class']);

        $token_manager = new SAAOS_Analytics_Token_Manager();
        $embed_token = $token_manager->generate_embed_token($widget);

        $api_base = $this->get_api_base();
        $embed_url = add_query_arg([
            'widget' => $widget,
            'period' => $period,
            'token' => $embed_token,
            'wordpress_id' => get_current_blog_id()
        ], $api_base . '/embed/dashboard');

        return sprintf(
            '<div class="%s" data-widget="%s" data-period="%s" style="height:%dpx;width:%s;">
                <iframe src="%s" width="100%%" height="100%%" frameborder="0" allowtransparency="true" title="Analytics Dashboard"></iframe>
            </div>',
            esc_attr($class),
            esc_attr($widget),
            esc_attr($period),
            $height,
            $width,
            esc_url($embed_url)
        );
    }

    public function stats_shortcode($atts): string {
        $atts = shortcode_atts([
            'type' => 'revenue',
            'period' => '30d',
            'format' => 'number',
            'comparison' => 'false',
            'class' => 'saaos-stats-widget'
        ], $atts);

        $type = sanitize_text_field($atts['type']);
        $period = sanitize_text_field($atts['period']);
        $format = sanitize_text_field($atts['format']);
        $comparison = filter_var($atts['comparison'], FILTER_VALIDATE_BOOLEAN);
        $class = esc_attr($atts['class']);

        $stats = $this->get_stats_data($type, $period);

        $output = '<div class="' . $class . '" data-type="' . esc_attr($type) . '" data-period="' . esc_attr($period) . '">';

        switch ($type) {
            case 'revenue':
                $output .= $this->render_revenue_stats($stats, $format, $comparison);
                break;
            case 'clicks':
                $output .= $this->render_clicks_stats($stats, $format, $comparison);
                break;
            case 'conversions':
                $output .= $this->render_conversions_stats($stats, $format, $comparison);
                break;
            case 'leads':
                $output .= $this->render_leads_stats($stats, $format, $comparison);
                break;
            default:
                $output .= $this->render_generic_stats($stats, $format);
                break;
        }

        $output .= '</div>';

        return $output;
    }

    public function lead_chart_shortcode($atts): string {
        $atts = shortcode_atts([
            'period' => '30d',
            'height' => '300',
            'class' => 'saaos-lead-chart'
        ], $atts);

        $period = sanitize_text_field($atts['period']);
        $height = absint($atts['height']);
        $class = esc_attr($atts['class']);

        $lead_data = $this->get_lead_data($period);

        return sprintf(
            '<div class="%s" data-period="%s" style="height:%dpx;">
                <canvas class="saaos-lead-canvas" data-chart="leads" data-period="%s"></canvas>
                <div class="saaos-chart-data" style="display:none;">%s</div>
            </div>',
            esc_attr($class),
            esc_attr($period),
            $height,
            esc_attr($period),
            esc_attr(wp_json_encode($lead_data))
        );
    }

    public function performance_shortcode($atts): string {
        $atts = shortcode_atts([
            'period' => '30d',
            'height' => '300',
            'metric' => 'pageviews',
            'class' => 'saaos-performance-chart'
        ], $atts);

        $period = sanitize_text_field($atts['period']);
        $height = absint($atts['height']);
        $metric = sanitize_text_field($atts['metric']);
        $class = esc_attr($atts['class']);

        $performance_data = $this->get_performance_data($period, $metric);

        return sprintf(
            '<div class="%s" data-period="%s" data-metric="%s" style="height:%dpx;">
                <canvas class="saaos-performance-canvas" data-chart="performance" data-period="%s" data-metric="%s"></canvas>
                <div class="saaos-chart-data" style="display:none;">%s</div>
            </div>',
            esc_attr($class),
            esc_attr($period),
            esc_attr($metric),
            $height,
            esc_attr($period),
            esc_attr($metric),
            esc_attr(wp_json_encode($performance_data))
        );
    }

    public function revenue_widget_shortcode($atts): string {
        $atts = shortcode_atts([
            'period' => '30d',
            'comparison' => 'true',
            'class' => 'saaos-revenue-widget'
        ], $atts);

        $period = sanitize_text_field($atts['period']);
        $comparison = filter_var($atts['comparison'], FILTER_VALIDATE_BOOLEAN);
        $class = esc_attr($atts['class']);

        $revenue_data = $this->get_revenue_data($period);
        $previous_data = $comparison ? $this->get_revenue_data($this->get_previous_period($period)) : null;

        $current = $revenue_data['total'] ?? 0;
        $previous = $previous_data['total'] ?? 0;
        $change = $previous > 0 ? (($current - $previous) / $previous) * 100 : 0;

        $output = '<div class="' . $class . '" data-period="' . esc_attr($period) . '">';
        $output .= '<div class="saaos-revenue-current">';
        $output .= '<span class="saaos-revenue-label">Revenue (' . esc_html($period) . ')</span>';
        $output .= '<span class="saaos-revenue-value">$' . esc_html(number_format($current, 2)) . '</span>';
        if ($comparison && $previous > 0) {
            $change_class = $change >= 0 ? 'positive' : 'negative';
            $change_icon = $change >= 0 ? '&#9650;' : '&#9660;';
            $output .= '<span class="saaos-revenue-change ' . esc_attr($change_class) . '">';
            $output .= $change_icon . ' ' . esc_html(abs(round($change, 1))) . '%';
            $output .= '</span>';
        }
        $output .= '</div>';
        $output .= '</div>';

        return $output;
    }

    public function handle_embed_render(): void {
        $token = sanitize_text_field($_GET['token'] ?? '');
        $widget = sanitize_text_field($_GET['widget'] ?? '');
        $wordpress_id = absint($_GET['wordpress_id'] ?? 0);

        $token_manager = new SAAOS_Analytics_Token_Manager();

        if (!$token_manager->validate_embed_token($token, $widget)) {
            status_header(403);
            echo 'Invalid or expired embed token';
            exit;
        }

        $allowed_widgets = ['overview', 'revenue', 'performance', 'leads'];
        if (!in_array($widget, $allowed_widgets, true)) {
            status_header(400);
            echo 'Invalid widget type';
            exit;
        }

        $period = sanitize_text_field($_GET['period'] ?? '30d');

        header('Content-Type: text/html; charset=UTF-8');
        echo $this->render_embed_frame($widget, $period);
        exit;
    }

    public function rest_get_embed(WP_REST_Request $request): WP_REST_Response {
        $widget = sanitize_text_field($request->get_param('widget'));
        $period = sanitize_text_field($request->get_param('period', '30d'));
        $token = sanitize_text_field($request->get_param('token'));

        $token_manager = new SAAOS_Analytics_Token_Manager();

        if (!$token_manager->validate_embed_token($token, $widget)) {
            return new WP_REST_Response(['error' => 'Invalid token'], 403);
        }

        $embed_html = $this->dashboard_shortcode([
            'widget' => $widget,
            'period' => $period,
            'height' => 400
        ]);

        return new WP_REST_Response([
            'html' => $embed_html,
            'widget' => $widget,
            'period' => $period
        ], 200);
    }

    public function rest_validate_token(WP_REST_Request $request): WP_REST_Response {
        $token = sanitize_text_field($request->get_param('token'));
        $widget = sanitize_text_field($request->get_param('widget'));

        $token_manager = new SAAOS_Analytics_Token_Manager();
        $valid = $token_manager->validate_embed_token($token, $widget);

        return new WP_REST_Response(['valid' => $valid], 200);
    }

    public function rest_get_stats(WP_REST_Request $request): WP_REST_Response {
        $type = sanitize_text_field($request->get_param('type', 'revenue'));
        $period = sanitize_text_field($request->get_param('period', '30d'));
        $token = sanitize_text_field($request->get_param('token'));

        $token_manager = new SAAOS_Analytics_Token_Manager();
        if (!$token_manager->validate_embed_token($token, 'stats')) {
            return new WP_REST_Response(['error' => 'Invalid token'], 403);
        }

        $stats = $this->get_stats_data($type, $period);

        return new WP_REST_Response($stats, 200);
    }

    public function rest_get_widget(WP_REST_Request $request): WP_REST_Response {
        $widget = sanitize_text_field($request->get_param('widget'));
        $period = sanitize_text_field($request->get_param('period', '30d'));
        $token = sanitize_text_field($request->get_param('token'));

        $token_manager = new SAAOS_Analytics_Token_Manager();
        if (!$token_manager->validate_embed_token($token, $widget)) {
            return new WP_REST_Response(['error' => 'Invalid token'], 403);
        }

        $data = [];
        switch ($widget) {
            case 'overview':
                $data = $this->get_overview_data($period);
                break;
            case 'revenue':
                $data = $this->get_revenue_data($period);
                break;
            case 'performance':
                $data = $this->get_performance_data($period, 'pageviews');
                break;
            case 'leads':
                $data = $this->get_lead_data($period);
                break;
            default:
                return new WP_REST_Response(['error' => 'Unknown widget'], 400);
        }

        return new WP_REST_Response($data, 200);
    }

    private function get_api_base(): string {
        $settings = get_option($this->option_key, []);
        return rtrim($settings['api_base'] ?? 'https://api.sovereign-os.com', '/');
    }

    private function get_stats_data(string $type, string $period): array {
        global $wpdb;

        $periods = [
            '7d' => WEEK_IN_SECONDS,
            '30d' => 30 * DAY_IN_SECONDS,
            '90d' => 90 * DAY_IN_SECONDS,
            '365d' => 365 * DAY_IN_SECONDS
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

    private function get_revenue_data(string $period): array {
        return $this->get_stats_data('revenue', $period);
    }

    private function get_lead_data(string $period): array {
        global $wpdb;
        $periods = [
            '7d' => WEEK_IN_SECONDS,
            '30d' => 30 * DAY_IN_SECONDS,
            '90d' => 90 * DAY_IN_SECONDS
        ];

        $days = $periods[$period] ?? $periods['30d'];
        $since = time() - $days;

        $conversions_table = $wpdb->prefix . 'saaos_conversions';

        $results = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT DATE(FROM_UNIXTIME(created_at)) as date, COUNT(*) as count
                FROM {$conversions_table}
                WHERE created_at >= %d AND event_type = 'lead'
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

        return [
            'labels' => $labels,
            'data' => $data,
            'period' => $period
        ];
    }

    private function get_performance_data(string $period, string $metric): array {
        global $wpdb;
        $periods = [
            '7d' => WEEK_IN_SECONDS,
            '30d' => 30 * DAY_IN_SECONDS,
            '90d' => 90 * DAY_IN_SECONDS
        ];

        $days = $periods[$period] ?? $periods['30d'];
        $since = time() - $days;

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

        return [
            'labels' => $labels,
            'data' => $data,
            'metric' => $metric,
            'period' => $period
        ];
    }

    private function get_overview_data(string $period): array {
        $revenue = $this->get_stats_data('revenue', $period);
        $clicks = $this->get_stats_data('clicks', $period);
        $conversions = $this->get_stats_data('conversions', $period);
        $leads = $this->get_stats_data('leads', $period);

        $total_clicks = $clicks['total'] ?? 0;
        $total_conversions = $conversions['total'] ?? 0;

        return [
            'revenue' => $revenue['total'] ?? 0,
            'clicks' => $total_clicks,
            'conversions' => $total_conversions,
            'leads' => $leads['total'] ?? 0,
            'conversion_rate' => $total_clicks > 0 ? round(($total_conversions / $total_clicks) * 100, 2) : 0,
            'period' => $period
        ];
    }

    private function get_previous_period(string $period): string {
        $periods = [
            '7d' => '14d',
            '30d' => '60d',
            '90d' => '180d',
            '365d' => '730d'
        ];
        return $periods[$period] ?? '30d';
    }

    private function render_revenue_stats(array $stats, string $format, bool $comparison): string {
        $current = $stats['total'] ?? 0;
        $output = '<div class="saaos-stat saaos-revenue-stat">';
        $output .= '<span class="saaos-stat-value">$' . esc_html(number_format($current, 2)) . '</span>';
        $output .= '<span class="saaos-stat-label">Revenue</span>';
        $output .= '</div>';
        return $output;
    }

    private function render_clicks_stats(array $stats, string $format, bool $comparison): string {
        $current = $stats['total'] ?? 0;
        $output = '<div class="saaos-stat saaos-clicks-stat">';
        $output .= '<span class="saaos-stat-value">' . esc_html(number_format($current)) . '</span>';
        $output .= '<span class="saaos-stat-label">Clicks</span>';
        $output .= '</div>';
        return $output;
    }

    private function render_conversions_stats(array $stats, string $format, bool $comparison): string {
        $current = $stats['total'] ?? 0;
        $output = '<div class="saaos-stat saaos-conversions-stat">';
        $output .= '<span class="saaos-stat-value">' . esc_html(number_format($current)) . '</span>';
        $output .= '<span class="saaos-stat-label">Conversions</span>';
        $output .= '</div>';
        return $output;
    }

    private function render_leads_stats(array $stats, string $format, bool $comparison): string {
        $current = $stats['total'] ?? 0;
        $output = '<div class="saaos-stat saaos-leads-stat">';
        $output .= '<span class="saaos-stat-value">' . esc_html(number_format($current)) . '</span>';
        $output .= '<span class="saaos-stat-label">Leads</span>';
        $output .= '</div>';
        return $output;
    }

    private function render_generic_stats(array $stats, string $format): string {
        $current = $stats['total'] ?? 0;
        $output = '<div class="saaos-stat">';
        $output .= '<span class="saaos-stat-value">' . esc_html(number_format($current)) . '</span>';
        $output .= '<span class="saaos-stat-label">' . esc_html($stats['period'] ?? '') . '</span>';
        $output .= '</div>';
        return $output;
    }

    private function render_embed_frame(string $widget, string $period): string {
        $data = [];

        switch ($widget) {
            case 'overview':
                $data = $this->get_overview_data($period);
                break;
            case 'revenue':
                $data = $this->get_revenue_data($period);
                break;
            case 'performance':
                $data = $this->get_performance_data($period, 'pageviews');
                break;
            case 'leads':
                $data = $this->get_lead_data($period);
                break;
        }

        return '<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Analytics Widget</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 20px; background: transparent; }
        .widget-container { max-width: 100%; }
    </style>
</head>
<body>
    <div class="widget-container" id="widget-data" data-widget="' . esc_attr($widget) . '" data-period="' . esc_attr($period) . '">
        ' . esc_html(wp_json_encode($data)) . '
    </div>
</body>
</html>';
    }

    public function get_option_key(): string {
        return $this->option_key;
    }
}

add_action('plugins_loaded', ['SAAOS_Analytics_Embed', 'instance']);

function saaos_analytics_embed(): SAAOS_Analytics_Embed {
    return SAAOS_Analytics_Embed::instance();
}
