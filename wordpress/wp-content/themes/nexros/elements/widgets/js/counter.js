(function ($) {
    var pxl_widget_counter_handler = function ($scope, $) {
        setTimeout(function () {
            elementorFrontend.waypoint($scope.find('.pxl-counter--value:not(.effect-slide)'), function () {
                var $number = $(this),
                    data = $number.data();

                var decimalDigits = data.toValue.toString().match(/\.(.*)/);

                if (decimalDigits) {
                    data.rounding = decimalDigits[1].length;
                }

                // Ensure smooth defaults if not provided via data-attributes
                if (typeof data.duration === 'undefined' || !data.duration) {
                    data.duration = 1500;
                }
                // Defer to next frame to reduce layout thrash before starting animation
                if (window.requestAnimationFrame) {
                    window.requestAnimationFrame(function () { $number.numerator(data); });
                } else {
                    $number.numerator(data);
                }
            }, {
                offset: '95%',
                triggerOnce: true
            });

            elementorFrontend.waypoint($scope.find('.pxl-counter--value.effect-slide'), function () {
                var $number = $(this),
                    data = $number.data();
                var el = $number[0];
                var startNumber = data['startnumber'], endNumber = data['endnumber'], separator = data['delimiter'], duration = data['duration'];
                var od = new Odometer({
                    el: el,
                    value: startNumber,
                    format: separator,
                    theme: 'default',
                    duration: duration || 1500
                });
                // Kick update on next frame to ensure odometer is fully initialized
                if (window.requestAnimationFrame) {
                    window.requestAnimationFrame(function () { od.update(endNumber); });
                } else {
                    od.update(endNumber);
                }
            }, {
                offset: '95%',
                triggerOnce: true
            });
        }, 300);

    };

    $(window).on('elementor/frontend/init', function () {
        elementorFrontend.hooks.addAction('frontend/element_ready/pxl_counter.default', pxl_widget_counter_handler);
        elementorFrontend.hooks.addAction('frontend/element_ready/pxl_tabs_slip.default', pxl_widget_counter_handler);
        elementorFrontend.hooks.addAction('frontend/element_ready/pxl_pie_chart.default', pxl_widget_counter_handler);
    });
})(jQuery);