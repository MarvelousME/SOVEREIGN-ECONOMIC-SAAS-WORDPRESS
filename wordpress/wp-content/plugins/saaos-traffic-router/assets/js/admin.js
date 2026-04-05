(function($) {
    'use strict';

    $(document).ready(function() {
        initABTestTracking();
        initConversionTracking();
    });

    function initABTestTracking() {
        var abTests = document.querySelectorAll('[data-ab-variant]');

        abTests.forEach(function(element) {
            var variant = element.getAttribute('data-ab-variant');
            var campaign = element.getAttribute('data-ab-campaign');

            if (variant && campaign && typeof saaosTrafficRouter !== 'undefined') {
                trackABImpression(campaign, variant);
            }
        });
    }

    function trackABImpression(campaign, variant) {
        $.ajax({
            url: saaosTrafficRouter.restUrl + 'ab-test',
            type: 'GET',
            data: {
                campaign: campaign
            },
            global: false,
            success: function(response) {
                console.log('A/B test assigned:', response);
            }
        });
    }

    function initConversionTracking() {
        var conversionPixels = document.querySelectorAll('[data-saaos-conversion]');

        conversionPixels.forEach(function(element) {
            element.addEventListener('trigger', function(e) {
                var conversionData = e.detail || {};
                fireConversion(conversionData);
            });
        });
    }

    function fireConversion(data) {
        var conversionData = {
            action: saaosTrafficRouter.conversionAction,
            nonce: saaosTrafficRouter.nonce,
            conversion_id: data.id || generateConversionId(),
            click_id: data.click_id || getCookie('saaos_last_click') || '',
            value: data.value || 0,
            currency: data.currency || 'USD',
            event_type: data.event_type || 'purchase',
            order_id: data.order_id || ''
        };

        $.ajax({
            url: saaosTrafficRouter.ajaxUrl,
            type: 'POST',
            data: conversionData,
            global: false
        });
    }

    function generateConversionId() {
        return 'conv_' + Math.random().toString(36).substr(2, 9);
    }

    function getCookie(name) {
        var value = "; " + document.cookie;
        var parts = value.split("; " + name + "=");
        if (parts.length === 2) return parts.pop().split(";").shift();
        return '';
    }

    window.SAAOS_Trigger_Conversion = function(data) {
        fireConversion(data);
    };

})(jQuery);
