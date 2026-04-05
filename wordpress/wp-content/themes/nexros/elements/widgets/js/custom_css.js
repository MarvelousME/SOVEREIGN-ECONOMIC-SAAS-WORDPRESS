(function ($) {
    "use strict";

    $(document).ready(function ($) {
        function injectCustomCSS() {
            try {
                var $preview = $("#elementor-preview-iframe");

                if ($preview.length) {
                    var previewDoc = $preview[0].contentDocument || $preview[0].contentWindow.document;

                    if (!previewDoc) {
                        console.warn("Cannot access preview document");
                        return;
                    }

                    var $previewBody = $(previewDoc.body);

                    $previewBody.find("[data-settings]").each(function () {
                        var $element = $(this);
                        var elementId = $element.data("id");
                        var settings = $element.data("settings");

                        if (settings && settings.pxl_custom_css && elementId) {
                            var css = settings.pxl_custom_css;
                            var processedCSS = css.replace(/selector/g, ".elementor-element-" + elementId);

                            $(previewDoc.head)
                                .find("#pxl-inject-css-" + elementId)
                                .remove();
                            $(previewDoc.head).append(
                                '<style id="pxl-inject-css-' + elementId + '">' + processedCSS + "</style>"
                            );
                        }
                    });
                }
            } catch (error) {
                console.error("Error injecting custom CSS:", error);
            }
        }

    });

    function initCustomCSSControl() {
        if (typeof elementor === "undefined" || !elementor.modules || !elementor.modules.controls) {
            return;
        }

        try {
            var ControlCodeView = elementor.modules.controls.Code;

            if (!ControlCodeView) {
                return;
            }

            var CustomCSSControlView = ControlCodeView.extend({
                onReady: function () {
                    if (ControlCodeView.prototype.onReady) {
                        ControlCodeView.prototype.onReady.apply(this, arguments);
                    }

                    if (this.model && this.model.get("name") === "pxl_custom_css") {
                        this.addLivePreview();
                    }
                },

                addLivePreview: function () {
                    var self = this;
                    if (!this.container || !this.ui || !this.ui.input) {
                        return;
                    }

                    var elementId = this.container.id;
                    if (!elementId) {
                        return;
                    }

                    var $iframe = $("#elementor-preview-iframe");
                    if (!$iframe.length) return;
                    var $previewDocument = $iframe.contents();
                    var $head = $previewDocument.find("head");
                    var $styleTag = $previewDocument.find("#pxl-live-css-" + elementId);

                    var timeoutId;
                    this.ui.input.on("input", function () {
                        clearTimeout(timeoutId);
                        timeoutId = setTimeout(function () {
                            var css = self.ui.input.val();
                            var processedCSS = css.replace(/selector/g, ".elementor-element-" + elementId);

                            var open = (processedCSS.match(/\{/g) || []).length;
                            var close = (processedCSS.match(/\}/g) || []).length;
                            if (open !== close) return;

                            if ($styleTag.length && $styleTag.text() === processedCSS) return;

                            $styleTag.remove();
                            $styleTag = $("<style>")
                                .attr("id", "pxl-live-css-" + elementId)
                                .text(processedCSS)
                                .appendTo($head);
                        }, 500);
                    });
                },

                updateLiveCSS: function (elementId, css) {
                    try {
                        var $iframe = $("#elementor-preview-iframe");

                        if (!$iframe.length) {
                            return;
                        }

                        var $previewDocument;
                        try {
                            $previewDocument = $iframe.contents();
                        } catch (e) {
                            return;
                        }

                        if (!$previewDocument.length) {
                            return;
                        }

                        var styleId = "pxl-live-css-" + elementId;
                        $previewDocument.find("#" + styleId).remove();

                        if (css && css.trim()) {
                            var processedCSS = css.replace(/selector/g, ".elementor-element-" + elementId);

                            var openBraces = (processedCSS.match(/\{/g) || []).length;
                            var closeBraces = (processedCSS.match(/\}/g) || []).length;

                            if (openBraces !== closeBraces) {
                                return;
                            }

                            var $head = $previewDocument.find("head");
                            if ($head.length) {
                                $head.append('<style id="' + styleId + '">' + processedCSS + "</style>");
                            }
                        }
                    } catch (error) {
                        return;
                    }
                },

                onDestroy: function () {
                    if (this.container && this.container.id) {
                        var elementId = this.container.id;
                        var $iframe = $("#elementor-preview-iframe");
                        if ($iframe.length) {
                            try {
                                $iframe
                                    .contents()
                                    .find("#pxl-live-css-" + elementId)
                                    .remove();
                            } catch (e) { }
                        }
                    }

                    if (ControlCodeView.prototype.onDestroy) {
                        ControlCodeView.prototype.onDestroy.apply(this, arguments);
                    }
                }
            });

            elementor.addControlView("code", CustomCSSControlView);
        } catch (error) {
            return;
        }
    }

    function initCustomFunctions() {
        try {
            if (typeof nexros_section_start_render === "function") {
                nexros_section_start_render();
            }
        } catch (error) {
            console.error("Error initializing custom functions:", error);
        }
    }

    $(window).on("elementor/frontend/init", function () {
        initCustomCSSControl();
        initCustomFunctions();
    });

    $(document).ready(function () {
        setTimeout(function () {
            if (typeof elementor !== "undefined") {
                initCustomCSSControl();
                initCustomFunctions();
            }
        }, 1000);
    });

    if (typeof elementor !== "undefined") {
        $(window).on("elementor:init", function () {
            initCustomCSSControl();
        });
    }
})(jQuery);