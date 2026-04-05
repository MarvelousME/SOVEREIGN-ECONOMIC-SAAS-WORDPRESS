(function($) {
    'use strict';

    var SAAOS_Traffic_Router = {
        initialized: false,

        init: function() {
            if (this.initialized) return;
            this.initialized = true;

            this.bindEvents();
            this.setupAsyncTracking();
        },

        bindEvents: function() {
            var self = this;

            $(document).on('click', 'a[data-click-id]', function(e) {
                var $link = $(this);
                var clickId = $link.data('click-id');
                var campaign = $link.data('campaign') || '';
                var source = $link.data('source') || '';
                var medium = $link.data('medium') || '';

                self.recordClick(clickId, campaign, source, medium);
            });

            $(document).on('click', '.saaos-affiliate-link, .saaos-tracked-link', function(e) {
                var $link = $(this);
                var clickId = $link.data('click-id');

                if (clickId && typeof saaosTrafficRouter !== 'undefined') {
                    self.recordClickAjax(clickId);
                }
            });
        },

        setupAsyncTracking: function() {
            var self = this;

            $('a[href^="http"]').each(function() {
                var $link = $(this);
                var href = $link.attr('href');

                if (self.isExternalLink(href) && !$link.data('saaos-tracked')) {
                    $link.data('saaos-tracked', 'true');

                    $link.on('click', function(e) {
                        var clickId = self.generateClickId();
                        self.recordClickAjax(clickId, {
                            url: href,
                            source: self.getUrlParam('saaos_source') || 'direct',
                            medium: self.getUrlParam('saaos_medium') || 'outbound',
                            campaign: self.getUrlParam('saaos_campaign') || ''
                        });
                    });
                }
            });
        },

        recordClick: function(clickId, campaign, source, medium) {
            if (!clickId) return;

            var clickData = {
                action: saaosTrafficRouter.clickAction,
                nonce: saaosTrafficRouter.nonce,
                click_id: clickId,
                campaign: campaign,
                source: source,
                medium: medium,
                url: window.location.href,
                referer: document.referrer
            };

            if (typeof navigator.sendBeacon !== 'undefined') {
                var blob = new Blob([JSON.stringify(clickData)], {type: 'application/json'});
                navigator.sendBeacon(saaosTrafficRouter.ajaxUrl, blob);
            } else {
                $.post(saaosTrafficRouter.ajaxUrl, clickData);
            }
        },

        recordClickAjax: function(clickId, data) {
            data = data || {};
            data.action = saaosTrafficRouter.clickAction;
            data.nonce = saaosTrafficRouter.nonce;
            data.click_id = clickId;
            data.url = data.url || window.location.href;
            data.referer = document.referrer;

            $.ajax({
                url: saaosTrafficRouter.ajaxUrl,
                type: 'POST',
                data: data,
                async: true,
                global: false
            });
        },

        isExternalLink: function(url) {
            try {
                var linkDomain = new URL(url).hostname;
                var homeDomain = window.location.hostname;
                return linkDomain !== homeDomain;
            } catch (e) {
                return false;
            }
        },

        getUrlParam: function(param) {
            var params = new URLSearchParams(window.location.search);
            return params.get(param);
        },

        generateClickId: function() {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                var r = Math.random() * 16 | 0;
                var v = c === 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        }
    };

    $(document).ready(function() {
        SAAOS_Traffic_Router.init();
    });

    window.SAAOS_Traffic_Router = SAAOS_Traffic_Router;

})(jQuery);
