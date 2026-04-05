(function ($) {
    var PXLTypewriteHandler = function ($scope, $) {
        var elements = $scope.find('.typewrite');
        if (elements.length === 0) return;

        var TxtType = function (el, toRotate, period) {
            this.toRotate = toRotate;
            this.el = el;
            this.loopNum = 0;
            this.period = parseInt(period, 10) || 1000;
            this.txt = '';
            this.isDeleting = false;
            this.tick();
        };

        TxtType.prototype.tick = function () {
            var i = this.loopNum % this.toRotate.length;
            var fullTxt = this.toRotate[i];

            this.txt = this.isDeleting
                ? fullTxt.substring(0, this.txt.length - 1)
                : fullTxt.substring(0, this.txt.length + 1);

            this.el.innerHTML = '<span class="wrap">' + this.txt + '</span>';

            var that = this;
            var delta = this.isDeleting ? 120 : 60;

            if (!this.isDeleting && this.txt === fullTxt) {
                delta = this.period;
                this.isDeleting = true;
            } else if (this.isDeleting && this.txt === '') {
                this.isDeleting = false;
                this.loopNum++;
                delta = 300;
            }

            setTimeout(function () {
                that.tick();
            }, delta);
        };

        elements.each(function () {
            var toRotate = $(this).attr('data-type');
            var period = $(this).attr('data-period');
            if (toRotate) {
                try {
                    var parsed = JSON.parse(toRotate);
                    new TxtType(this, parsed, period);
                } catch (e) {
                    console.error("data-type JSON parse error:", toRotate);
                }
            }
        });
    };

    $(window).on('elementor/frontend/init', function () {
        elementorFrontend.hooks.addAction('frontend/element_ready/pxl_heading.default', PXLTypewriteHandler);
    });
})(jQuery);
