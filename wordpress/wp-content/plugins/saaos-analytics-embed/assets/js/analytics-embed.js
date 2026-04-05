(function($) {
    'use strict';

    var SAAOS_Analytics = {
        charts: [],

        init: function() {
            this.initCharts();
            this.bindEvents();
        },

        initCharts: function() {
            if (typeof Chart === 'undefined') {
                return;
            }

            $('.saaos-performance-canvas').each(function() {
                var $canvas = $(this);
                var $container = $canvas.closest('.saaos-performance-chart');
                var chartData = $container.find('.saaos-chart-data');

                if (chartData.length) {
                    try {
                        var labels = JSON.parse($canvas.attr('data-labels') || '[]');
                        var data = JSON.parse($canvas.attr('data-data') || '[]');

                        var ctx = $canvas[0].getContext('2d');
                        var chart = new Chart(ctx, {
                            type: 'line',
                            data: {
                                labels: labels,
                                datasets: [{
                                    label: 'Performance',
                                    data: data,
                                    borderColor: '#0073aa',
                                    backgroundColor: 'rgba(0,115,170,0.1)',
                                    fill: true,
                                    tension: 0.4
                                }]
                            },
                            options: {
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: {
                                    legend: {
                                        display: false
                                    }
                                },
                                scales: {
                                    y: {
                                        beginAtZero: true
                                    }
                                }
                            }
                        });

                        SAAOS_Analytics.charts.push(chart);
                    } catch (e) {
                        console.error('Chart rendering error:', e);
                    }
                }
            });

            $('.saaos-lead-canvas').each(function() {
                var $canvas = $(this);
                var $container = $canvas.closest('.saaos-lead-chart');
                var chartData = $container.find('.saaos-chart-data');

                if (chartData.length) {
                    try {
                        var labels = JSON.parse($canvas.attr('data-labels') || '[]');
                        var data = JSON.parse($canvas.attr('data-data') || '[]');

                        var ctx = $canvas[0].getContext('2d');
                        var chart = new Chart(ctx, {
                            type: 'bar',
                            data: {
                                labels: labels,
                                datasets: [{
                                    label: 'Leads',
                                    data: data,
                                    backgroundColor: '#00a0d2',
                                    borderRadius: 4
                                }]
                            },
                            options: {
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: {
                                    legend: {
                                        display: false
                                    }
                                },
                                scales: {
                                    y: {
                                        beginAtZero: true
                                    }
                                }
                            }
                        });

                        SAAOS_Analytics.charts.push(chart);
                    } catch (e) {
                        console.error('Lead chart rendering error:', e);
                    }
                }
            });
        },

        bindEvents: function() {
            $(document).on('click', '.saaos-widget-refresh', function() {
                var $widget = $(this).closest('.saaos-widget');
                var widgetType = $widget.data('widget');
                var period = $widget.data('period');

                SAAOS_Analytics.refreshWidget(widgetType, period, $widget);
            });

            $(document).on('change', '.saaos-period-selector', function() {
                var $select = $(this);
                var $widget = $select.closest('.saaos-widget');
                var period = $select.val();

                $widget.data('period', period);
                SAAOS_Analytics.refreshWidget($widget.data('widget'), period, $widget);
            });
        },

        refreshWidget: function(widgetType, period, $widget) {
            var nonce = saaosAnalytics.nonce;

            $.ajax({
                url: saaosAnalytics.restUrl + 'widget/' + widgetType,
                type: 'GET',
                data: {
                    period: period,
                    token: SAAOS_Analytics.getEmbedToken(widgetType),
                    nonce: nonce
                },
                success: function(response) {
                    if (response.data) {
                        SAAOS_Analytics.updateWidgetContent($widget, response.data);
                    }
                },
                error: function(xhr, status, error) {
                    console.error('Widget refresh error:', error);
                }
            });
        },

        updateWidgetContent: function($widget, data) {
            var html = '';

            switch ($widget.data('widget')) {
                case 'overview':
                    html = SAAOS_Analytics.renderOverviewWidget(data);
                    break;
                case 'revenue':
                    html = SAAOS_Analytics.renderRevenueWidget(data);
                    break;
                default:
                    html = JSON.stringify(data);
            }

            $widget.html(html);
        },

        renderOverviewWidget: function(data) {
            var html = '<div class="saaos-overview-widget">';
            html += '<div class="saaos-overview-grid">';
            html += '<div class="saaos-metric-card">';
            html += '<span class="saaos-metric-value">$' + SAAOS_Analytics.formatNumber(data.revenue) + '</span>';
            html += '<span class="saaos-metric-label">Revenue</span>';
            html += '</div>';
            html += '<div class="saaos-metric-card">';
            html += '<span class="saaos-metric-value">' + SAAOS_Analytics.formatNumber(data.clicks) + '</span>';
            html += '<span class="saaos-metric-label">Clicks</span>';
            html += '</div>';
            html += '<div class="saaos-metric-card">';
            html += '<span class="saaos-metric-value">' + data.conversion_rate + '%</span>';
            html += '<span class="saaos-metric-label">Conv. Rate</span>';
            html += '</div>';
            html += '</div></div>';
            return html;
        },

        renderRevenueWidget: function(data) {
            var html = '<div class="saaos-revenue-widget">';
            html += '<div class="saaos-revenue-current">';
            html += '<span class="saaos-revenue-label">Revenue (' + data.period + ')</span>';
            html += '<span class="saaos-revenue-value">$' + SAAOS_Analytics.formatCurrency(data.total) + '</span>';
            html += '</div></div>';
            return html;
        },

        formatNumber: function(num) {
            if (num >= 1000000) {
                return (num / 1000000).toFixed(1) + 'M';
            }
            if (num >= 1000) {
                return (num / 1000).toFixed(1) + 'K';
            }
            return num.toString();
        },

        formatCurrency: function(amount) {
            return amount.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
        },

        getEmbedToken: function(widget) {
            return '';
        }
    };

    $(document).ready(function() {
        SAAOS_Analytics.init();
    });

    window.SAAOS_Analytics = SAAOS_Analytics;

})(jQuery);
