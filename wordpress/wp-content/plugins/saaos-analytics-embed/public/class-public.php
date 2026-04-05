<?php
if (!defined('ABSPATH')) exit;

class SAAOS_Analytics_Embed_Public {
    private SAAOS_Embed_Security $security;

    public function __construct() {
        $this->security = new SAAOS_Embed_Security();

        add_action('wp_head', [$this, 'output_embed_styles'], 1);
        add_filter('the_content', [$this, 'maybe_filter_content'], 1);
    }

    public function output_embed_styles(): void {
        if (!is_singular()) {
            return;
        }

        $settings = get_option('saaos_analytics_embed_settings', []);
        $styles = $settings['embed_styles'] ?? [];

        if (empty($styles)) {
            return;
        }

        $css = sprintf(
            '<style id="saaos-analytics-styles">
                .saaos-dashboard-widget, .saaos-stats-widget, .saaos-lead-chart, .saaos-performance-chart, .saaos-revenue-widget {
                    --saaos-primary: %s;
                    --saaos-secondary: %s;
                    --saaos-text: %s;
                    --saaos-bg: %s;
                    --saaos-radius: %dpx;
                }
            </style>',
            esc_attr($styles['primary_color'] ?? '#0073aa'),
            esc_attr($styles['secondary_color'] ?? '#00a0d2'),
            esc_attr($styles['text_color'] ?? '#23282d'),
            esc_attr($styles['background_color'] ?? '#ffffff'),
            absint($styles['border_radius'] ?? 4)
        );

        echo $css;
    }

    public function maybe_filter_content(string $content): string {
        if (!is_singular()) {
            return $content;
        }

        if (!$this->security->is_embed_allowed_for_current_page()) {
            return $content;
        }

        return $content;
    }

    public function validate_embed_access(string $widget): bool {
        return $this->security->validate_embed_request(['widget' => $widget]);
    }
}

new SAAOS_Analytics_Embed_Public();
