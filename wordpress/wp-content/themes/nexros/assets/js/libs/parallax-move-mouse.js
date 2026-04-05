(function ($) {

    $('.elementor-element').each(function () {
        var $section = $(this);

        if ($section.hasClass('elementor-widget')) {
            $section = $section.parents('.elementor-element').first();
        }

        $section.mousemove(function(e) {
            if ($(e.target).closest('.pxl-image-parallax, .pxl-parallax-hover').length) {
                $section.removeClass('pxl-section-mouseleave');

                $section.find('.pxl-image-parallax .pxl-item--image, .pxl-parallax-hover').each(function () {
                    var el_move = $(this);
                    var el_value = $(this).data('parallax-value');
                    pxl_parallax_move(e, el_move, -el_value, $section);
                });
            }
        });

        $section.mouseleave(function() {
            $section.addClass('pxl-section-mouseleave');
        });
    });

    function pxl_parallax_move(e, target, movement, section) {
        var relX = e.pageX - section.offset().left;
        var relY = e.pageY - section.offset().top;

        TweenMax.to(target, 1, {
            x: (relX - section.width() / 2) / section.width() * movement,
            y: (relY - section.height() / 2) / section.height() * movement
        });
    }

})(jQuery);
