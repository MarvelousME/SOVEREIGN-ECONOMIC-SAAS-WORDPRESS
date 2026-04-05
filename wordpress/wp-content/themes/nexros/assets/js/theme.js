; (function ($) {
    "use strict";

    let pxl_scroll_top = 0;
    let pxl_window_height = 0;
    let pxl_window_width = 0;
    let pxl_scroll_status = '';
    let pxl_last_scroll_top = 0;

    const $window = $(window);
    const $body = $('body');
    const $document = $(document);

    // Device capability detection
    const deviceCapabilities = {
        isLowEnd: () => {
            const memory = navigator.deviceMemory || 4;
            const cores = navigator.hardwareConcurrency || 4;
            const connection = navigator.connection;

            return memory < 4 || cores < 4 ||
                (connection && connection.effectiveType === 'slow-2g');
        },
        isSafari: () => {
            const ua = navigator.userAgent.toLowerCase();
            return ua.includes('safari') && !ua.includes('chrome');
        },
        isMobileSafari: () => {
            const ua = navigator.userAgent.toLowerCase();
            return ua.includes('safari') && ua.includes('mobile') && !ua.includes('chrome');
        },
        supportsSmoothScrolling: () => {
            return 'scrollBehavior' in document.documentElement.style;
        },
        supportsIntersectionObserver: () => {
            return 'IntersectionObserver' in window;
        },
        supportsRequestAnimationFrame: () => {
            return 'requestAnimationFrame' in window;
        }
    };

    $window.on('load', function () {
        pxl_window_width = $window.width();
        pxl_window_height = $window.height();

        setTimeout(() => {
            $(".pxl-loader").addClass("is-loaded");
        }, 60);

        $('.pxl-swiper-slider, .pxl-header-mobile-elementor').css('opacity', '1');

        initializeTheme();
    });

    function initializeTheme() {
        nexros_header_sticky();
        nexros_header_mobile();
        nexros_scroll_to_top();
        nexros_footer_fixed();
        dropdown_offices();
        nexros_shop_quantity();
        nexros_submenu_responsive();
        nexros_panel_anchor_toggle();
        nexros_slider_column_offset();
        nexros_height_ct_grid();
        nexros_bgr_parallax();
        nexros_shop_view_layout();
        nexros_menu_divider_move();
        nexros_update_onepage_marker();
        nexros_el_parallax();
        pxlTabScrollSync();
        nexros_feature_slider();
    }

    $window.on('scroll', function () {
        pxl_scroll_top = $window.scrollTop();
        pxl_window_height = $window.height();
        pxl_window_width = $window.width();

        pxl_scroll_status = pxl_scroll_top < pxl_last_scroll_top ? 'up' : 'down';
        pxl_last_scroll_top = pxl_scroll_top;

        nexros_header_sticky();
        nexros_scroll_to_top();
        nexros_footer_fixed();
        nexros_ptitle_scroll_opacity();

        if (pxl_scroll_top < 100) {
            $('.elementor > .pin-spacer').removeClass('scroll-top-active');
        }
    });


    let resizeTimeout;
    $window.on('resize', function () {
        if (resizeTimeout) {
            clearTimeout(resizeTimeout);
        }

        resizeTimeout = setTimeout(() => {
            pxl_window_height = $window.height();
            pxl_window_width = $window.width();

            nexros_submenu_responsive();
            nexros_height_ct_grid();
            nexros_header_mobile();
            nexros_slider_column_offset();
            nexros_feature_slider();

            setTimeout(() => {
                nexros_menu_divider_move();
                nexros_update_onepage_marker();
            }, 500);
        }, 250);
    });

    $document.ready(function () {
        pxl_window_width = $window.width();

        nexros_backtotop_progess_bar();
        nexros_type_file_upload();
        nexros_zoom_point();
        nexros_feature_slider();

        if (pxl_window_width > 767) {
            nexros_button_parallax();
        }

        setTimeout(() => {
            $('.pxl-section-bg-parallax').closest('.elementor-element').addClass('pxl-section-parallax-overflow');
        }, 500);

        $('.wpcf7').on('wpcf7mailsent', function () {
            const $form = $(this).find('.wpcf7-form');
            const $submitBtn = $form.find('.wpcf7-submit');

            if ($form.hasClass('sent')) {
                // Thêm class quay
                $submitBtn.addClass('btn-rotate');

                // Sau khi quay xong, đổi thành dấu tick
                setTimeout(function () {
                    $submitBtn.removeClass('btn-rotate')
                        .addClass('btn-success')
                        .text('✓')
                        .prop('disabled', true);
                }, 600);
            }
        });
        // 

        $('a[href^="#"]:not(.tabs a)').on('click', function (e) {
            e.preventDefault();

            const target = $(this.getAttribute('href'));

            if (target.length) {
                $('html, body').animate(
                    {
                        scrollTop: target.offset().top,
                    },
                    600
                );
            }
        });

        // Location
        $(".pxl-location .pxl-list .pxl--item").on("mouseenter mouseleave", function (e) {
            let id = $(this).attr("id");
            if (!id) return;

            $('.elementor-element[id="' + id + '"]').toggleClass("active", e.type === "mouseenter");
        });
        // 

        $('.pxl-check-scroll .pxl-swiper-slide .filter-item').on('mousedown', function () {
            var $gridItem = $(this).closest('.pxl-swiper-slide');
            $gridItem.removeClass('visible').addClass('visible');
        });

        $(".pxl-banner-box__style-4,.pxl-banner-box__style-3,.pxl-banner-box__style-5").each(
            function () {
                let $box = $(this);
                let $items = $box.find(".pxl-banner-box__feature-item");
                let index = 0;

                if ($items.length === 0) return;

                $items.removeClass("active").first().addClass("active");

                let limit = $items.length;

                setInterval(function () {
                    $items.removeClass("active");
                    if (index < $items.length) {
                        $items.eq(index).addClass("active");
                    }
                    index = (index + 1) % limit;
                }, 2000);
            }
        );


        // Only initialize particles if element exists and particles library is loaded
        if (typeof particlesJS !== 'undefined' && $(".pxl-particle-background-yes").length > 0) {
            $(".pxl-particle-background-yes").each(function () {
                var randomId = "id-" + Math.random().toString(16).slice(2);
                $(this).append('<div id="' + randomId + '" class="pxl-particles-bg"></div>');
            });
            $(".pxl-particles-bg").each(function () {
                particlesJS($(this).attr('id'), {
                    "particles": {
                        "number": {
                            "value": 130,
                            "density": {
                                "enable": true,
                                "value_area": 1000
                            }
                        },
                        "color": {
                            "value": ["#fff"]
                        },

                        "shape": {
                            "type": "circle",
                            "stroke": {
                                "width": 0,
                                "color": "#fff"
                            },
                            "polygon": {
                                "nb_sides": 5
                            },
                            "image": {
                                "src": "img/github.svg",
                                "width": 100,
                                "height": 100
                            }
                        },
                        "opacity": {
                            "value": 0.6,
                            "random": false,
                            "anim": {
                                "enable": false,
                                "speed": 1,
                                "opacity_min": 0.1,
                                "sync": false
                            }
                        },
                        "size": {
                            "value": 2,
                            "random": true,
                            "anim": {
                                "enable": false,
                                "speed": 40,
                                "size_min": 0.1,
                                "sync": false
                            }
                        },
                        "line_linked": {
                            "enable": true,
                            "distance": 120,
                            "color": "#ffffff",
                            "opacity": 0.4,
                            "width": 1
                        },
                    },
                    "interactivity": {
                        "detect_on": "canvas",
                        "events": {
                            "onhover": {
                                "enable": true,
                                "mode": "grab"
                            },
                            "onclick": {
                                "enable": false
                            },
                            "resize": true
                        },
                        "modes": {
                            "grab": {
                                "distance": 140,
                                "line_linked": {
                                    "opacity": 1
                                }
                            },
                            "bubble": {
                                "distance": 400,
                                "size": 40,
                                "duration": 2,
                                "opacity": 8,
                                "speed": 3
                            },
                            "repulse": {
                                "distance": 200,
                                "duration": 0.4
                            },
                            "push": {
                                "particles_nb": 4
                            },
                            "remove": {
                                "particles_nb": 2
                            }
                        }
                    },
                    "retina_detect": true
                });
            });
        }
        // 

        /* Section Particles */
        setTimeout(function () {
            $(".pxl-row-particles").each(function () {
                particlesJS($(this).attr('id'), {
                    "particles": {
                        "number": {
                            "value": $(this).data('number'),
                        },
                        "color": {
                            "value": $(this).data('color')
                        },
                        "shape": {
                            "type": "circle",
                        },
                        "size": {
                            "value": $(this).data('size'),
                            "random": $(this).data('size-random'),
                        },
                        "line_linked": {
                            "enable": false,
                        },
                        "move": {
                            "enable": true,
                            "speed": 2,
                            "direction": $(this).data('move-direction'),
                            "random": true,
                            "out_mode": "out",
                        }
                    },
                    "retina_detect": true
                });
            });
        }, 400);

        /* Start Menu Mobile */
        $('.pxl-header-menu li.menu-item-has-children').append('<span class="pxl-menu-toggle"></span>');
        $('.pxl-menu-toggle').on('click', function () {
            if ($(this).hasClass('active')) {
                $(this).closest('ul').find('.pxl-menu-toggle.active').toggleClass('active');
                $(this).closest('ul').find('.sub-menu.active').toggleClass('active').slideToggle();
            } else {
                $(this).closest('ul').find('.pxl-menu-toggle.active').toggleClass('active');
                $(this).closest('ul').find('.sub-menu.active').toggleClass('active').slideToggle();
                $(this).toggleClass('active');
                $(this).parent().find('> .sub-menu').toggleClass('active');
                $(this).parent().find('> .sub-menu').slideToggle();
            }
        });

        $('li.pxl-megamenu').hover(function () {
            $(this).parents('.elementor-element').addClass('section-mega-active')
        }, function () {
            $(this).parents('.elementor-element').removeClass('section-mega-active')
        })

        $("#pxl-nav-mobile, .pxl-anchor-mobile-menu").on('click', function () {
            $(this).toggleClass('active');
            $('body').toggleClass('body-overflow');
            $('.pxl-header-menu').toggleClass('active');
        });

        $(".pxl-menu-close, .pxl-header-menu-backdrop, #pxl-header-mobile .pxl-menu-primary a.is-one-page").on('click', function () {
            $(this).parents('.pxl-header-main').find('.pxl-header-menu').removeClass('active');
            $('#pxl-nav-mobile').removeClass('active');
            $('body').toggleClass('body-overflow');
        });
        /* End Menu Mobile */

        /* Menu Vertical */
        $('.pxl-nav-vertical li.menu-item-has-children > a').append('<span class="pxl-arrow-toggle"><i class="bi-chevron-right"></i></span>');
        $('.pxl-nav-vertical li.menu-item-has-children > a').on('click', function () {
            if ($(this).hasClass('active')) {
                $(this).next().toggleClass('active').slideToggle();
            } else {
                $(this).closest('ul').find('.sub-menu.active').toggleClass('active').slideToggle();
                $(this).closest('ul').find('a.active').toggleClass('active');
                $(this).find('.pxl-menu-toggle.active').toggleClass('active');
                $(this).toggleClass('active');
                $(this).next().toggleClass('active').slideToggle();
            }
        });

        $(".comments-area .btn-submit").append('<i class="fas fa-comment"></i>');
        /* Mega Menu Max Height */
        var m_h_mega = $('li.pxl-megamenu > .sub-menu > .pxl-mega-menu-elementor').outerHeight();
        var w_h_mega = $(window).height();
        var w_h_mega_css = w_h_mega - 120;
        if (m_h_mega > w_h_mega) {
            $('li.pxl-megamenu > .sub-menu > .pxl-mega-menu-elementor').css('max-height', w_h_mega_css + 'px');
            $('li.pxl-megamenu > .sub-menu > .pxl-mega-menu-elementor').css('overflow-y', 'scroll');
        }
        // Active Mega Menu Hover
        $('li.pxl-megamenu').hover(function () {
            $(this).parents('.elementor-element').addClass('section-mega-active');
        }, function () {
            $(this).parents('.elementor-element').removeClass('section-mega-active');
        });
        /* End Mega Menu Max Height */
        /* Search Popup */
        var $search_wrap_init = $("#pxl-search-popup");
        var search_field = $('#pxl-search-popup .search-field');
        var $body = $('body');

        $(".pxl-search-popup-button").on('click', function (e) {
            if (!$search_wrap_init.hasClass('active')) {
                $search_wrap_init.addClass('active');
                setTimeout(function () { search_field.get(0).focus(); }, 500);
            } else if (search_field.val() === '') {
                $search_wrap_init.removeClass('active');
                search_field.get(0).focus();
            }
            e.preventDefault();
            return false;
        });

        $(".pxl-subscribe-popup .pxl-item--overlay, .pxl-subscribe-popup .pxl-item--close").on('click', function (e) {
            $(this).parents('.pxl-subscribe-popup').removeClass('pxl-active');
            e.preventDefault();
            return false;
        });

        $("#pxl-search-popup .pxl-item--overlay, #pxl-search-popup .pxl-item--close").on('click', function (e) {
            $body.addClass('pxl-search-out-anim');
            setTimeout(function () {
                $body.removeClass('pxl-search-out-anim');
            }, 800);
            setTimeout(function () {
                $search_wrap_init.removeClass('active');
            }, 800);
            e.preventDefault();
            return false;
        });

        /* Scroll To Top */
        $('.pxl-scroll-top').click(function () {
            $('html, body').animate({ scrollTop: 0 }, 1200);
            $(this).parents('.pxl-wapper').find('.elementor > .pin-spacer').addClass('scroll-top-active');
            return false;
        });

        /* custom grid filter moving border */
        $('.pxl-grid-filter').each(function () {
            var marker = $(this).find('.filter-marker'),
                item = $(this).find('.filter-item'),
                current = $(this).find('.filter-item.active');

            var offsettop = current.length ? current.position().top : 0;

            marker.css({
                top: offsettop + (current.length ? current.outerHeight() : 0),
                left: current.length ? current.position().left : 0,
                width: current.length ? current.outerWidth() : 0,
                display: "block"
            });

            item.mouseover(function () {
                var self = $(this),
                    offsetactop = self.position().top,
                    offsetleft = self.position().left,
                    width = self.outerWidth() || current.outerWidth(),
                    top = offsetactop == 0 ? 0 : offsetactop || offsettop,
                    left = offsetleft == 0 ? 0 : offsetleft || current.position().left;

                marker.stop().animate({
                    top: top + (current.length ? current.outerHeight() : 0),
                    left: left,
                    width: width,
                }, 300);
            });

            item.on('click', function () {
                current = $(this);
            });

            item.mouseleave(function () {
                var offsetlvtop = current.length ? current.position().top : 0;
                marker.stop().animate({
                    top: offsetlvtop + (current.length ? current.outerHeight() : 0),
                    left: current.length ? current.position().left : 0,
                    width: current.length ? current.outerWidth() : 0
                }, 300);
            });
        });

        /* Login */
        $('.pxl-user-popup').on('click', function (e) {
            if (e.target === this) {
                $(this).removeClass('open').addClass('remove');
                $('body').removeClass('ov-hidden');
            }
        });
        $('.pxl-modal-close').on('click', function () {
            $(this).parent().removeClass('open').addClass('remove');
            $(this).parents('body').removeClass('ov-hidden');
        });
        $('.btn-sign-up').on('click', function () {
            $('.pxl-user-register').addClass('u-open').removeClass('u-close');
            $('.pxl-user-login').addClass('u-close').removeClass('u-open');
        });
        $('.btn-sign-in').on('click', function () {
            $('.pxl-user-register').addClass('u-close').removeClass('u-open');
            $('.pxl-user-login').addClass('u-open').removeClass('u-close');
        });
        $('.pxl-user-have-an-account').on('click', function () {
            $(this).parents('.pxl-modal-content').find('.pxl-user-register').addClass('u-close').removeClass('u-open');
            $(this).parents('.pxl-modal-content').find('.pxl-user-login').addClass('u-open').removeClass('u-close');
        });
        $('.h-btn-user').on('click', function () {
            $('.pxl-user-popup').addClass('open').removeClass('remove');
            $(this).find('.pxl-user-account').toggleClass('active');
        });


        /* Animate Time Delay */

        /* Related Post - Slick Slider */
        const postSlider = $(".pxl-related-post .pxl-related-post-inner");
        postSlider.slick({
            dots: false,
            infinite: true,
            arrows: false,
            slidesToShow: 3,
            slidesToScroll: 1,
            autoplay: false,
            autoplaySpeed: 500,
            cssEase: 'linear',
            responsive: [
                {
                    breakpoint: 992,
                    settings: {
                        slidesToShow: 2,
                    },
                },
                {
                    breakpoint: 768,
                    settings: {
                        slidesToShow: 1,
                    }
                }
            ]
        });

        $('.pxl-grid-masonry').each(function () {
            var eltime = 80;
            var elt_inner = $(this).children().length;
            var _elt = elt_inner - 1;
            $(this).find('> .pxl-grid-item > .wow').each(function (index, obj) {
                $(this).css('animation-delay', eltime + 'ms');
                if (_elt === index) {
                    eltime = 80;
                    _elt = _elt + elt_inner;
                } else {
                    eltime = eltime + 80;
                }
            });
        });

        $('.btn-text-nina').each(function () {
            var eltime = 0.045;
            var elt_inner = $(this).children().length;
            var _elt = elt_inner - 1;
            $(this).find('> .pxl--btn-text > span').each(function (index, obj) {
                $(this).css('transition-delay', eltime + 's');
                eltime = eltime + 0.045;
            });
        });

        $('.btn-text-nanuk').each(function () {
            var eltime = 0.05;
            var elt_inner = $(this).children().length;
            var _elt = elt_inner - 1;
            $(this).find('> .pxl--btn-text > span').each(function (index, obj) {
                $(this).css('animation-delay', eltime + 's');
                eltime = eltime + 0.05;
            });
        });

        $('.btn-text-smoke').each(function () {
            var eltime = 0.05;
            var elt_inner = $(this).children().length;
            var _elt = elt_inner - 1;
            $(this).find('> .pxl--btn-text > span > span > span').each(function (index, obj) {
                $(this).css('--d', eltime + 's');
                eltime = eltime + 0.05;
            });
        });

        $('.btn-text-reverse .pxl-text--front, .btn-text-reverse .pxl-text--back').each(function () {
            var eltime = 0.05;
            var elt_inner = $(this).children().length;
            var _elt = elt_inner - 1;
            $(this).find('.pxl-text--inner > span').each(function (index, obj) {
                $(this).css('transition-delay', eltime + 's');
                eltime = eltime + 0.05;
            });
        });

        /* End Animate Time Delay */

        $('.label-text-fillter').on('click', function () {
            $(this).parents('.pxl-grid-filter').addClass('active');
        });
        $('.filter-item').on('click', function () {
            $('.pxl-grid-filter').removeClass('active');
        });


        /* Lightbox Popup */
        $('.pxl-action-popup').magnificPopup({
            type: 'iframe',
            mainClass: 'mfp-fade',
            removalDelay: 160,
            preloader: false,
            fixedContentPos: false
        });

        $('.pxl-gallery-lightbox').each(function () {
            $(this).magnificPopup({
                delegate: 'a.lightbox',
                type: 'image',
                gallery: {
                    enabled: true
                },
                mainClass: 'mfp-fade',
            });
        });

        /* Page Title Parallax */
        if (pxl_window_width > 1024) {
            if ($('#pxl-page-title-default').hasClass('pxl--parallax')) {
                $(this).stellar();
            }
        }

        /* Cart Sidebar Popup */
        $(".pxl-cart-sidebar-button").on('click', function () {
            $('body').addClass('body-overflow');
            $('#pxl-cart-sidebar').addClass('active');
        });
        $("#pxl-cart-sidebar .pxl-popup--overlay, #pxl-cart-sidebar .pxl-item--close").on('click', function () {
            $('body').removeClass('body-overflow');
            $('#pxl-cart-sidebar').removeClass('active');
        });
        $(".pxl-accordion1.style2 .pxl-accordion--content").find("br").remove();
        /* Hover Active Item */
        $('.pxl--widget-hover').each(function () {
            $(this).hover(function () {
                $(this).parents('.elementor-row').find('.pxl--widget-hover').removeClass('pxl--item-active');
                $(this).parents('.elementor-container').find('.pxl--widget-hover').removeClass('pxl--item-active');
                $(this).addClass('pxl--item-active');
            });
        });
        /* Hover Active button */

        var wobbleElements = document.querySelectorAll('.pxl-wobble');
        wobbleElements.forEach(function (el) {
            el.addEventListener('mouseover', function () {
                if (!el.classList.contains('animating') && !el.classList.contains('mouseover')) {
                    el.classList.add('animating', 'mouseover');
                    var letters = el.innerText.split('');
                    setTimeout(function () { el.classList.remove('animating'); }, (letters.length + 1) * 50);
                    var animationName = el.dataset.animation;
                    if (!animationName) { animationName = "pxl-jump"; }
                    el.innerText = '';
                    letters.forEach(function (letter) {
                        if (letter == " ") {
                            letter = "&nbsp;";
                        }
                        el.innerHTML += '<span class="letter">' + letter + '</span>';
                    });
                    var letterElements = el.querySelectorAll('.letter');
                    letterElements.forEach(function (letter, i) {
                        setTimeout(function () {
                            letter.classList.add(animationName);
                        }, 50 * i);
                    });
                }
            });
            el.addEventListener('mouseout', function () {
                el.classList.remove('mouseover');
            });
        });

        /* Start Icon Bounce */
        var boxEls = $('.el-bounce, .pxl-image-effect1, .el-effect-zigzag');
        $.each(boxEls, function (boxIndex, boxEl) {
            loopToggleClass(boxEl, 'active');
        });

        function loopToggleClass(el, toggleClass) {
            el = $(el);
            let counter = 0;
            if (el.hasClass(toggleClass)) {
                waitFor(function () {
                    counter++;
                    return counter == 2;
                }, function () {
                    counter = 0;
                    el.removeClass(toggleClass);
                    loopToggleClass(el, toggleClass);
                }, 'Deactivate', 1000);
            } else {
                waitFor(function () {
                    counter++;
                    return counter == 3;
                }, function () {
                    counter = 0;
                    el.addClass(toggleClass);
                    loopToggleClass(el, toggleClass);
                }, 'Activate', 1000);
            }
        }

        function waitFor(condition, callback, message, time) {
            if (message == null || message == '' || typeof message == 'undefined') {
                message = 'Timeout';
            }
            if (time == null || time == '' || typeof time == 'undefined') {
                time = 100;
            }
            var cond = condition();
            if (cond) {
                callback();
            } else {
                setTimeout(function () {
                    waitFor(condition, callback, message, time);
                }, time);
            }
        }
        /* End Icon Bounce */

        /* Image Effect */
        if ($('.pxl-image-tilt').length) {
            $('.pxl-image-tilt').parents('.elementor-element').addClass('pxl-image-tilt-active');
            $('.pxl-image-tilt').each(function () {
                var pxl_maxtilt = $(this).data('maxtilt'),
                    pxl_speedtilt = $(this).data('speedtilt'),
                    pxl_perspectivetilt = $(this).data('perspectivetilt');
                VanillaTilt.init(this, {
                    max: pxl_maxtilt,
                    speed: pxl_speedtilt,
                    perspective: pxl_perspectivetilt
                });
            });
        }

        /* Select Theme Style */
        $('.widget.widget_search input').attr('required', true);
        $('.wpcf7-select').each(function () {
            var $this = $(this), numberOfOptions = $(this).children('option').length;

            $this.addClass('pxl-select-hidden');
            $this.wrap('<div class="pxl-select"></div>');
            $this.after('<div class="pxl-select-higthlight"></div>');

            var $styledSelect = $this.next('div.pxl-select-higthlight');
            $styledSelect.text($this.children('option').eq(0).text());

            var $list = $('<ul />', {
                'class': 'pxl-select-options'
            }).insertAfter($styledSelect);

            for (var i = 0; i < numberOfOptions; i++) {
                $('<li />', {
                    text: $this.children('option').eq(i).text(),
                    rel: $this.children('option').eq(i).val()
                }).appendTo($list);
            }

            var $listItems = $list.children('li');

            $styledSelect.click(function (e) {
                e.stopPropagation();
                $('div.pxl-select-higthlight.active').not(this).each(function () {
                    $(this).removeClass('active').next('ul.pxl-select-options').addClass('pxl-select-lists-hide');
                });
                $(this).toggleClass('active');
            });

            $listItems.click(function (e) {
                e.stopPropagation();
                $styledSelect.text($(this).text()).removeClass('active');
                $this.val($(this).attr('rel'));
            });

            $(document).click(function () {
                $styledSelect.removeClass('active');
            });

        });

        /* Nice Select */
        $('.woocommerce-ordering .orderby, #filter-label, #pxl-sidebar-area select, .variations_form.cart .variations select, .pxl-open-table select, .pxl-nice-select').each(function () {
            $(this).niceSelect();
        });

        $('.pxl-post-list .nice-select').each(function () {
            $(this).niceSelect();
        });

        /* Typewriter */
        if ($('.pxl-title--typewriter').length) {
            function typewriterOut(elements, callback) {
                if (elements.length) {
                    elements.eq(0).addClass('is-active');
                    elements.eq(0).delay(3000);
                    elements.eq(0).removeClass('is-active');
                    typewriterOut(elements.slice(1), callback);
                }
                else {
                    callback();
                }
            }

            function typewriterIn(elements, callback) {
                if (elements.length) {
                    elements.eq(0).addClass('is-active');
                    elements.eq(0).delay(3000).slideDown(3000, function () {
                        elements.eq(0).removeClass('is-active');
                        typewriterIn(elements.slice(1), callback);
                    });
                }
                else {
                    callback();
                }
            }

            function typewriterInfinite() {
                typewriterOut($('.pxl-title--typewriter .pxl-item--text'), function () {
                    typewriterIn($('.pxl-title--typewriter .pxl-item--text'), function () {
                        typewriterInfinite();
                    });
                });
            }
            $(function () {
                typewriterInfinite();
            });
        }
        /* End Typewriter */

        /* Get checked input - Mailchimpp */
        $('.mc4wp-form input:checkbox').change(function () {
            if ($(this).is(":checked")) {
                $('.mc4wp-form').addClass("pxl-input-checked");
            } else {
                $('.mc4wp-form').removeClass("pxl-input-checked");
            }
        });

        /* Scroll to content */
        $('.pxl-link-to-section .btn').on('click', function (e) {
            var id_scroll = $(this).attr('href');
            var offsetScroll = $('.pxl-header-elementor-sticky').outerHeight();
            e.preventDefault();
            $("html, body").animate({ scrollTop: $(id_scroll).offset().top - offsetScroll }, 600);
        });

        // Hover Item Active
        $(".pxl-post-modern1 .pxl-post--content .pxl-post--item")
            .on("mouseenter", function () {
                $(this).addClass("active");
                $(".pxl-post-modern1 .pxl-post--images .pxl-post--featured").removeClass('active');
                var selected_item = $(this).find(".pxl-content--inner").attr("data-image");
                $(selected_item).addClass('active').removeClass('non-active');
            })
            .on("mouseleave", function () {
                $(".pxl-post-modern1 .pxl-post--content .pxl-post--item").removeClass('active');
                $(".pxl-post-modern1 .pxl-post--images .pxl-post--featured").removeClass('non-active');
                var selected_item = $(this).find(".pxl-content--inner").attr("data-image");
                $(selected_item).removeClass('active').addClass('non-active');
            }
            );

        // Hover Overlay Effect
        $('.pxl-overlay-shake').mousemove(function (event) {
            var offset = $(this).offset();
            var W = $(this).outerWidth();
            var X = (event.pageX - offset.left);
            var Y = (event.pageY - offset.top);
            $(this).find('.pxl-overlay--color').css({
                'top': + Y + 'px',
                'left': + X + 'px'
            });
        });

        //Some Widget Default
        //$('.widget .cat-item a, .widget_archive li a').append('<span class="pxl-item--divider"></span>');

        /* Social Button Click */
        $('.pxl-social--button').on('click', function () {
            $(this).toggleClass('active');
        });
        $(document).on('click', function (e) {
            if (e.target.className == 'pxl-social--button active')
                $('.pxl-social--button').removeClass('active');
        });

        // Header Home 2
        $('#home-2-header').append('<span class="pxl-header-divider1"></span><span class="pxl-header-divider2"></span><span class="pxl-header-divider3"></span><span class="pxl-header-divider4"></span>');
        $('#home-2-header-sticky').append('<span class="pxl-header-divider2"></span><span class="pxl-header-divider4"></span>');

    });

    // Optimized AJAX handlers
    $document.ajaxComplete(function (event, xhr, settings) {
        nexros_shop_quantity();
        nexros_height_ct_grid();
    });

    $document.on('updated_wc_div', function () {
        nexros_shop_quantity();
    });

    /* Header Sticky */
    function nexros_header_sticky() {
        if ($('#pxl-header-elementor').hasClass('is-sticky')) {
            if (pxl_scroll_top > 100) {
                $('.pxl-header-elementor-sticky.pxl-sticky-stb').addClass('pxl-header-fixed');
                $('#pxl-header-mobile').addClass('pxl-header-mobile-fixed');
            } else {
                $('.pxl-header-elementor-sticky.pxl-sticky-stb').removeClass('pxl-header-fixed');
                $('#pxl-header-mobile').removeClass('pxl-header-mobile-fixed');
            }

            if (pxl_scroll_status == 'up' && pxl_scroll_top > 100) {
                $('.pxl-header-elementor-sticky.pxl-sticky-stt').addClass('pxl-header-fixed');
            } else {
                $('.pxl-header-elementor-sticky.pxl-sticky-stt').removeClass('pxl-header-fixed');
            }
        }

        $('.pxl-header-elementor-sticky').parents('body').addClass('pxl-header-sticky');
    }

    /* Header Mobile */
    function nexros_header_mobile() {
        var h_header_mobile = $('#pxl-header-elementor').outerHeight();
        if (pxl_window_width < 1199) {
            $('#pxl-header-elementor').css('min-height', h_header_mobile + 'px');
        }
    }

    /* Scroll To Top - Optimized */
    function nexros_scroll_to_top() {
        const $scrollTop = $('.pxl-scroll-top');
        const shouldShow = pxl_scroll_top > pxl_window_height;

        $scrollTop.toggleClass('pxl-on pxl-off', shouldShow);
    }

    /* Footer Fixed */
    function nexros_footer_fixed() {
        setTimeout(function () {
            var h_footer = $('.pxl-footer-fixed #pxl-footer-elementor').outerHeight() - 1;
            $('.pxl-footer-fixed #pxl-main').css('margin-bottom', h_footer + 'px');
        }, 600);
    }

    /* Custom Check Scroll */
    function nexros_check_scroll() {
        var $gridItems = $('.pxl-check-scroll .pxl-swiper-slide');
        var viewportBottom = pxl_scroll_top + $(window).height();

        $gridItems.each(function () {
            var $gridItem = $(this);
            var elementTop = $gridItem.offset().top;
            var elementBottom = elementTop + $gridItem.outerHeight();

            if (elementTop < viewportBottom && elementBottom > pxl_scroll_top) {
                $gridItem.addClass('visible');
            } else {
                $gridItem.removeClass('visible');
            }
        });
    }

    function dropdown_offices() {
        const $filterDropdown = $("#filter-label");
        const $items = $(".pxl-offices-list .pxl--item");

        if (!$filterDropdown.length || !$items.length) return;

        // Listen for niceSelect change events
        $filterDropdown.on("change", function () {
            const selectedLabel = this.value.toLowerCase();

            $items.each(function () {
                const $item = $(this);
                const itemLabel = $item.data('label')?.toLowerCase() || "";
                const shouldHide = selectedLabel !== "" && itemLabel !== selectedLabel;
                $item.toggleClass("hidden", shouldHide);
            });
        });
    }


    /* Unified Button Parallax Function */
    function nexros_button_parallax() {
        const $buttons = $('.btn.btn-circle, .pxl-counter5 .pxl-counter--inner');
        if ($buttons.length === 0) {
            return;
        }

        $buttons.each(function () {
            const $btn = $(this);
            const isCounter = $btn.hasClass('pxl-counter--inner');
            const $text = isCounter ? $btn.find('.pxl-counter--number') : $btn.find('svg, span');
            const sensitivity = isCounter ? 0.444 : 0.2;

            if ($text.length === 0) return;

            $btn.on('mouseenter', function () {
                if (!isCounter) {
                    gsap.set($text, { transformOrigin: "50% 50%" });
                }
            });

            $btn.on('mousemove', function (e) {
                const { left, top, width, height } = this.getBoundingClientRect();
                const centerX = left + width / 2;
                const centerY = top + height / 2;
                const deltaX = (e.clientX - centerX) * sensitivity;
                const deltaY = (e.clientY - centerY) * sensitivity;

                gsap.to([$btn, $text], {
                    duration: 0.8,
                    x: deltaX,
                    y: deltaY,
                    ease: "power3.out"
                });
            });

            $btn.on('mouseleave', function () {
                gsap.to([$btn, $text], {
                    duration: 0.8,
                    x: 0,
                    y: 0,
                    ease: "elastic.out(1, 0.3)"
                });
            });
        });
    }

    /* WooComerce Quantity */
    function nexros_shop_quantity() {
        "use strict";
        $('#pxl-wapper .quantity').append('<span class="quantity-icon quantity-down pxl-icon--minus"></span><span class="quantity-icon quantity-up pxl-icon--plus"></span>');
        $('.quantity-up').on('click', function () {
            $(this).parents('.quantity').find('input[type="number"]').get(0).stepUp();
            $(this).parents('.woocommerce-cart-form').find('.actions .button').removeAttr('disabled');
        });
        $('.quantity-down').on('click', function () {
            $(this).parents('.quantity').find('input[type="number"]').get(0).stepDown();
            $(this).parents('.woocommerce-cart-form').find('.actions .button').removeAttr('disabled');
        });
        $('.quantity-icon').on('click', function () {
            var quantity_number = $(this).parents('.quantity').find('input[type="number"]').val();
            var add_to_cart_button = $(this).parents(".product, .woocommerce-product-inner").find(".add_to_cart_button");
            add_to_cart_button.attr('data-quantity', quantity_number);
            add_to_cart_button.attr("href", "?add-to-cart=" + add_to_cart_button.attr("data-product_id") + "&quantity=" + quantity_number);
        });
        $('.woocommerce-cart-form .actions .button').removeAttr('disabled');
    }

    /* Menu Responsive Dropdown */
    function nexros_submenu_responsive() {
        var $nexros_menu = $('.pxl-header-elementor-main, .pxl-header-elementor-sticky');
        $nexros_menu.find('.pxl-menu-primary li').each(function () {
            var $nexros_submenu = $(this).find('> ul.sub-menu');
            if ($nexros_submenu.length == 1) {
                if (($nexros_submenu.offset().left + $nexros_submenu.width() + 0) > $(window).width()) {
                    $nexros_submenu.addClass('pxl-sub-reverse');
                }
            }
        });
    }

    function pxlTabScrollSync() {
        const $tabTitles = $(".pxl-tabs-slip .pxl-tab-title");
        const $tabContents = $(".pxl-tabs-slip .pxl-tab-content");

        $tabTitles.on("click", function () {
            const targetId = $(this).data("target");
            const $target = $(targetId);
            if ($target.length) {
                $('html, body').animate({
                    scrollTop: $target.offset().top
                }, 600);
            }
        });

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const id = entry.target.getAttribute("id");
                    $tabTitles.each(function () {
                        const $title = $(this);
                        const isActive = $title.data("target") === `#${id}`;
                        $title.toggleClass("active", isActive);
                    });
                }
            });
        }, {
            rootMargin: "0px 0px -70% 0px",
            threshold: 0.1
        });

        $tabContents.each(function () {
            observer.observe(this);
        });
    }

    /* Feature Slider */
    /* Feature Slider */
    function nexros_feature_slider() {
        const $slider = $('.pxl-feature-slider');
        if ($slider.length === 0) return;

        if ($slider.hasClass('slick-initialized')) {
            $slider.slick('unslick');
        }

        function updateScaleEffect(slider, currentSlide, slick) {
            const $slides = slider.find('.slick-slide').not('.slick-cloned');

            $slides.removeClass('scale-center scale-adjacent scale-second scale-far')
                .each(function () {
                    const slideIndex = $(this).data('slick-index');
                    let distance = Math.abs(slideIndex - currentSlide);

                    // Xử lý wrap-around khi infinite
                    if (slick && slick.options.infinite) {
                        const slideCount = slick.slideCount;
                        distance = Math.min(distance, slideCount - distance);
                    }

                    $(this).addClass(
                        distance === 0 ? 'scale-center' :
                            distance === 1 ? 'scale-adjacent' :
                                distance === 2 ? 'scale-second' : 'scale-far'
                    );
                });
        }

        // Gán class ban đầu sau khi khởi tạo
        $slider.on('init', function (event, slick) {
            updateScaleEffect($(slick.$slider), slick.currentSlide, slick);
        });

        // Gán class sớm ngay khi chuẩn bị chuyển slide
        $slider.on('beforeChange', function (event, slick, currentSlide, nextSlide) {
            updateScaleEffect($(slick.$slider), nextSlide, slick);
        });

        // Đảm bảo trạng thái cuối cùng sau khi chuyển xong
        $slider.on('afterChange', function (event, slick, currentSlide) {
            updateScaleEffect($(slick.$slider), currentSlide, slick);
        });

        // Khởi tạo slick
        $slider.slick({
            dots: false,
            infinite: true,
            arrows: false,
            autoplay: true,
            autoplaySpeed: 3000, // UX tốt hơn
            pauseOnHover: true,
            pauseOnFocus: true,
            pauseOnDotsHover: true,
            slidesToShow: 5,
            slidesToScroll: 1,
            centerMode: true,
            variableWidth: false,
            adaptiveHeight: false,
            speed: 500,
            cssEase: 'ease-in-out',
            touchMove: true,
            swipe: true,
            touchThreshold: 5,
            focusOnSelect: true,
        });
    }



    function nexros_panel_anchor_toggle() {
        'use strict';
        $(document).on('click', '.pxl-anchor-button', function (e) {
            e.preventDefault();
            e.stopPropagation();
            var target = $(this).attr('data-target');
            $(target).toggleClass('active');
            $('body').addClass('body-overflow');
            $('.pxl-popup--conent .wow').addClass('animated').removeClass('aniOut');
            $('.pxl-popup--conent .fadeInPopup').removeClass('aniOut');
            if ($(target).find('.pxl-search-form').length > 0) {
                setTimeout(function () {
                    $(target).find('.pxl-search-form .pxl-search-field').focus();
                }, 1000);
            }
        });

        $(document).ready(function () {
            $('.pxl-post-taxonomy .pxl-count').each(function () {
                var content = $(this).html();
                if (content) {
                    var newContent = content.replace('(', '');
                    var newContent2 = newContent.replace(')', '');
                    $(this).html(newContent2);
                }
            });
        });


        $('.pxl-anchor-button').each(function () {
            var t_target = $(this).attr('data-target');
            var t_delay = $(this).attr('data-delay-hover');
            $(t_target).find('.pxl-popup--conent').css('transition-delay', t_delay + 'ms');
            $(t_target).find('.pxl-popup--overlay').css('transition-delay', t_delay + 'ms');
        });

        $(".pxl-hidden-panel-popup .pxl-popup--overlay, .pxl-hidden-panel-popup .pxl-close-popup").on('click', function () {
            $('body').removeClass('body-overflow');
            $('.pxl-hidden-panel-popup').removeClass('active');
            $('.pxl-popup--conent .wow').addClass('aniOut').removeClass('animated');
            $('.pxl-popup--conent .fadeInPopup').addClass('aniOut');
        });

        $(".pxl-icon-box6 .btn-show-more").on('click', function () {
            $(this).parents('.pxl-icon-box6').addClass('active');
            $(this).parents('.pxl-icon-box6').find('.content-2').addClass('active');
        });


        $(".pxl-popup--close").on('click', function () {
            $('body').removeClass('body-overflow');
            $(this).parent().removeClass('active');
        });
        $(".pxl-close-popup").on('click', function () {
            $('body').removeClass('body-overflow');
            $('.pxl-page-popup').removeClass('active');
        });
    }

    /* Page Title Scroll Opacity */
    function nexros_ptitle_scroll_opacity() {
        var divs = $('#pxl-page-title-elementor.pxl-scroll-opacity .elementor-widget'),
            limit = $('#pxl-page-title-elementor.pxl-scroll-opacity').outerHeight();
        if (pxl_scroll_top <= limit) {
            divs.css({ 'opacity': (1 - pxl_scroll_top / limit) });
        }
    }

    /* Slider Column Offset */
    function nexros_slider_column_offset() {
        var content_w = ($('#pxl-main').width() - 1200) / 2;
        if (pxl_window_width > 1200) {
            $('.pxl-slider2 .pxl-item--left').css('padding-left', content_w + 'px');
        }
    }

    /* Preloader Default */
    $.fn.extend({
        jQueryImagesLoaded: function () {
            var $imgs = this.find('img[src!=""]')

            if (!$imgs.length) {
                return $.Deferred()
                    .resolve()
                    .promise()
            }

            var dfds = []

            $imgs.each(function () {
                var dfd = $.Deferred()
                dfds.push(dfd)
                var img = new Image()
                img.onload = function () {
                    dfd.resolve()
                }
                img.onerror = function () {
                    dfd.resolve()
                }
                img.src = this.src
            })

            return $.when.apply($, dfds)
        }
    })

    // Function removed - merged with unified nexros_button_parallax() above

    function nexros_bgr_parallax() {
        setTimeout(function () {
            $('.pxl-section-bg-parallax').each(function () {
                if (!$(this).hasClass('pinned-zoom-clipped') && !$(this).hasClass('pinned-circle-zoom-clipped') && !$(this).hasClass('mask-parallax')) {
                    jarallax(this, {
                        speed: 0.2,
                    });
                }
            });
        }, 300);
    }

    function nexros_el_parallax() {
        $('.el-parallax-wrap').on({
            mouseenter: function () {
                const $this = $(this);
                $this.addClass('hovered');
                $this.find('.el-parallax-item').css({
                    transition: 'none'
                });
            },
            mouseleave: function () {
                const $this = $(this);
                $this.removeClass('hovered');
                $this.find('.el-parallax-item').css({
                    transition: 'transform 0.5s ease',
                    transform: 'translate3d(0px, 0px, 0px)'
                });
            },
            mousemove: function (e) {
                const $this = $(this);
                const bounds = this.getBoundingClientRect();
                const centerX = bounds.left + bounds.width / 2;
                const centerY = bounds.top + bounds.height / 2;
                const deltaX = (centerX - e.clientX) * 0.07104;
                const deltaY = (centerY - e.clientY) * 0.10656;

                requestAnimationFrame(() => {
                    $this.find('.el-parallax-item').css({
                        transform: `translate3d(${deltaX}px, ${deltaY}px, 0px)`
                    });
                });
            }
        });
    }

    /* Menu Divider Move */
    function nexros_menu_divider_move() {
        $('.pxl-nav-menu1.fr-style-divider, .pxl-nav-menu1.style-box, .pxl-icon--users').each(function () {
            var $container = $(this);
            var marker = $container.find('.pxl-divider-move');
            var $menu = $container.find('.pxl-menu-primary, .pxl-sign-up-box');

            var current;
            if ($container.hasClass('pxl-icon--users')) {
                current = $menu.find('li.pxl-shape-active');
                if (current.length === 0) {
                    current = $menu.find('li').first();
                }
            } else {
                // First, clear all active classes
                $menu.find('> li').removeClass('pxl-shape-active');

                // Check for elements with pxl-onepage-active class (currently active one-page)
                current = $menu.find('> li > a.pxl-onepage-active').parent();
                if (current.length === 0) {
                    // Check for elements with is-one-page class
                    current = $menu.find('> li > a.is-one-page').parent();
                }
                if (current.length === 0) {
                    // Check for WordPress current menu classes
                    current = $menu.find('> .current-menu-item, > .current-menu-parent, > .current-menu-ancestor');
                }
                if (current.length === 0) {
                    current = $menu.find('> li').first();
                }
            }

            if (current.length > 0) {
                marker.css({
                    left: current.position().left,
                    width: current.outerWidth(),
                    display: "block"
                });
                marker.addClass('active');
                current.addClass('pxl-shape-active');

                if (Modernizr.csstransitions) {
                    var $menuItems = $container.hasClass('pxl-icon--users') ?
                        $menu.find('li') :
                        $menu.find('> li');

                    $menuItems.mouseover(function () {
                        var self = $(this),
                            offsetLeft = self.position().left,
                            width = self.outerWidth() || current.outerWidth(),
                            left = offsetLeft == 0 ? 0 : offsetLeft || current.position().left;
                        marker.css({
                            left: left,
                            width: width,
                        });
                        marker.addClass('active');
                        $menuItems.removeClass('pxl-shape-active');
                        self.addClass('pxl-shape-active');
                    });

                    $menu.mouseleave(function () {
                        marker.css({
                            left: current.position().left,
                            width: current.outerWidth()
                        });
                        $menuItems.removeClass('pxl-shape-active');
                        current.addClass('pxl-shape-active');
                    });
                }
            }
        });
    }

    // Function to update marker for one-page navigation
    function nexros_update_onepage_marker() {
        $('.pxl-nav-menu1.fr-style-divider, .pxl-nav-menu1.style-box').each(function () {
            var $container = $(this);
            var marker = $container.find('.pxl-divider-move');
            var $menu = $container.find('.pxl-menu-primary');

            if (marker.length && $menu.length) {
                // Find the currently active one-page element
                var activeElement = $menu.find('> li > a.pxl-onepage-active').parent();

                if (activeElement.length > 0) {
                    // Clear all active classes first
                    $menu.find('> li').removeClass('pxl-shape-active');

                    // Position marker
                    marker.css({
                        left: activeElement.position().left,
                        width: activeElement.outerWidth(),
                        display: "block"
                    });
                    marker.addClass('active');
                    activeElement.addClass('pxl-shape-active');
                }
            }
        });
    }

    // Call the update function when one-page navigation changes
    $(document).on('click', 'a.is-one-page', function () {
        setTimeout(function () {
            nexros_update_onepage_marker();
        }, 100);
    });

    // Also call on scroll for one-page navigation
    $(window).on('scroll', function () {
        nexros_update_onepage_marker();
    });


    /* Back To Top Progress Bar */
    function nexros_backtotop_progess_bar() {
        if ($('.pxl-scroll-top').length > 0) {
            var progressPath = document.querySelector('.pxl-scroll-top path');
            var pathLength = progressPath.getTotalLength();
            progressPath.style.transition = progressPath.style.WebkitTransition = 'none';
            progressPath.style.strokeDasharray = pathLength + ' ' + pathLength;
            progressPath.style.strokeDashoffset = pathLength;
            progressPath.getBoundingClientRect();
            progressPath.style.transition = progressPath.style.WebkitTransition = 'stroke-dashoffset 10ms linear';
            var updateProgress = function () {
                var scroll = $(window).scrollTop();
                var height = $(document).height() - $(window).height();
                var progress = pathLength - (scroll * pathLength / height);
                progressPath.style.strokeDashoffset = progress;
            }
            updateProgress();
            $(window).scroll(updateProgress);
            var offset = 50;
            var duration = 550;
            $(window).on('scroll', function () {
                if ($(this).scrollTop() > offset) {
                    $('.pxl-scroll-top').addClass('active-progress');
                } else {
                    $('.pxl-scroll-top').removeClass('active-progress');
                }
            });
        }
    }

    /* Custom Type File Upload*/
    function nexros_type_file_upload() {

        var multipleSupport = typeof $('<input/>')[0].multiple !== 'undefined',
            isIE = /msie/i.test(navigator.userAgent);

        $.fn.pxl_custom_type_file = function () {

            return this.each(function () {

                var $file = $(this).addClass('pxl-file-upload-hidden'),
                    $wrap = $('<div class="pxl-file-upload-wrapper">'),
                    $button = $('<button type="button" class="pxl-file-upload-button">Choose File</button>'),
                    $input = $('<input type="text" class="pxl-file-upload-input" placeholder="No File Choose" />'),
                    $label = $('<label class="pxl-file-upload-button" for="' + $file[0].id + '">Choose File</label>');
                $file.css({
                    position: 'absolute',
                    opacity: '0',
                    visibility: 'hidden'
                });

                $wrap.insertAfter($file)
                    .append($file, $input, (isIE ? $label : $button));

                $file.attr('tabIndex', -1);
                $button.attr('tabIndex', -1);

                $button.click(function () {
                    $file.focus().click();
                });

                $file.change(function () {

                    var files = [], fileArr, filename;

                    if (multipleSupport) {
                        fileArr = $file[0].files;
                        for (var i = 0, len = fileArr.length; i < len; i++) {
                            files.push(fileArr[i].name);
                        }
                        filename = files.join(', ');
                    } else {
                        filename = $file.val().split('\\').pop();
                    }

                    $input.val(filename)
                        .attr('title', filename)
                        .focus();
                });

                $input.on({
                    blur: function () { $file.trigger('blur'); },
                    keydown: function (e) {
                        if (e.which === 13) {
                            if (!isIE) {
                                $file.trigger('click');
                            }
                        } else if (e.which === 8 || e.which === 46) {
                            $file.replaceWith($file = $file.clone(true));
                            $file.trigger('change');
                            $input.val('');
                        } else if (e.which === 9) {
                            return;
                        } else {
                            return false;
                        }
                    }
                });

            });

        };
        $('.wpcf7-file[type=file]').pxl_custom_type_file();
    }

    //Shop View Grid/List
    function nexros_shop_view_layout() {

        $(document).on('click', '.pxl-view-layout .view-icon a', function (e) {
            e.preventDefault();
            if (!$(this).parent('li').hasClass('active')) {
                $('.pxl-view-layout .view-icon').removeClass('active');
                $(this).parent('li').addClass('active');
                $(this).parents('.pxl-content-area').find('ul.products').removeAttr('class').addClass($(this).attr('data-cls'));
            }
        });
    }

    function nexros_height_ct_grid($scope) {
        $('.pxl-portfolio-grid-layout1 .pxl-grid-item,.pxl-portfolio-carousel2 .pxl-swiper-slide').each(function () {
            var elementHeight = $(this).find(".pxl-post-content-hide").height();
            $(this).find(".pxl-post-content-hide").css("margin-bottom", "-" + elementHeight + "px");
        });

        $('.pxl-icon-box7').each(function () {
            var elementHeight2 = $(this).find(".pxl-item--description").height();
            $(this).find(".pxl-item--description").css("margin-bottom", "-" + elementHeight2 + "px");
        });
    }

    // Zoom Point - Optimized with throttling
    function nexros_zoom_point() {
        $(".pxl-zoom-point").each(function () {
            const $element = $(this);
            const scaleOffset = $element.data('offset') || 0;
            const scaleAmount = ($element.data('scale-mount') || 0) / 100;

            if (scaleAmount === 0) return;

            function scrollZoom() {
                const images = document.querySelectorAll("[data-scroll-zoom]");
                if (!images.length) return;

                const observerConfig = {
                    rootMargin: "0% 0% 0% 0%",
                    threshold: 0
                };

                // Throttle scroll events
                let ticking = false;

                function updateZoom() {
                    ticking = false;
                    images.forEach(image => {
                        if (image.isVisible) {
                            const percentage = percentageSeen(image);
                            const scale = 1 + scaleAmount * percentage;
                            image.style.transform = `scale(${scale})`;
                        }
                    });
                }

                function requestTick() {
                    if (!ticking) {
                        requestAnimationFrame(updateZoom);
                        ticking = true;
                    }
                }

                images.forEach(image => {
                    image.isVisible = false;

                    const observer = new IntersectionObserver((entries) => {
                        entries.forEach(entry => {
                            image.isVisible = entry.isIntersecting;
                        });
                    }, observerConfig);

                    observer.observe(image);
                });

                $window.on('scroll', requestTick);

                function percentageSeen(element) {
                    const parent = element.parentNode;
                    const viewportHeight = $window.height();
                    const scrollY = $window.scrollTop();
                    const elPosY = parent.getBoundingClientRect().top + scrollY + scaleOffset;
                    const borderHeight = parseFloat(getComputedStyle(parent).getPropertyValue('border-bottom-width')) + parseFloat(getComputedStyle(element).getPropertyValue('border-top-width'));
                    const elHeight = parent.offsetHeight + borderHeight;

                    if (elPosY > scrollY + viewportHeight) {
                        return 0;
                    } else if (elPosY + elHeight < scrollY) {
                        return 100;
                    } else {
                        const distance = scrollY + viewportHeight - elPosY;
                        const percentage = Math.round(distance / ((viewportHeight + elHeight) / 100));
                        return percentage;
                    }
                }
            }

            scrollZoom();
        });
    }
})(jQuery);