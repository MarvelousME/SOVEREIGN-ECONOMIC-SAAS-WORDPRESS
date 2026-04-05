(function ($) {

    var pxl_widget_progressbar_handler = function ($scope, $) {
        elementorFrontend.waypoint($scope.find('.pxl--progressbar'), function () {
            $(this).progressbar();
        });
    };

    $(window).on('elementor/frontend/init', function () {
        elementorFrontend.hooks.addAction('frontend/element_ready/pxl_progressbar.default', pxl_widget_progressbar_handler);
        elementorFrontend.hooks.addAction('frontend/element_ready/pxl_banner_box.default', pxl_widget_progressbar_handler);
    });
})(jQuery);