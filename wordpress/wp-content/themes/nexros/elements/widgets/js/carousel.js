(function ($) {

    function pxl_swiper_handler($scope) {
        $scope.find('.pxl-swiper-slider').each(function (index, element) {
            var $this = $(this);

            var settings = $this.find(".pxl-swiper-container").data().settings;
            var numberOfSlides = $this.find(".pxl-swiper-slide").length;
            var carousel_settings = {
                direction: settings['slide_direction'],
                effect: settings['slide_mode'],
                wrapperClass: 'pxl-swiper-wrapper',
                slideClass: 'pxl-swiper-slide',
                slidesPerView: settings['slides_to_show'],
                slidesPerGroup: settings['slides_to_scroll'],
                slidesPerColumn: settings['slide_percolumn'],
                allowTouchMove: settings['allow_touch_move'] !== undefined ? settings['allow_touch_move'] : true,
                spaceBetween: 0,
                observer: true,
                observeParents: true,
                // mousewheel: true,
                parallax: true,
                navigation: {
                    nextEl: $this.find('.pxl-swiper-arrow-next')[0],
                    prevEl: $this.find('.pxl-swiper-arrow-prev')[0],
                },
                pagination: {
                    type: settings['pagination_type'],
                    el: $this.find('.pxl-swiper-dots')[0],
                    clickable: true,
                    modifierClass: 'pxl-swiper-pagination-',
                    bulletClass: 'pxl-swiper-pagination-bullet',
                    renderCustom: function (swiper, element, current, total) {
                        return current + ' of ' + total;
                    }
                },
                speed: settings['speed'],
                watchSlidesProgress: true,
                watchSlidesVisibility: true,
                breakpoints: {
                    0: {
                        slidesPerView: settings['slides_to_show_xs'],
                        slidesPerGroup: settings['slides_to_scroll'],
                    },
                    576: {
                        slidesPerView: settings['slides_to_show_sm'],
                        slidesPerGroup: settings['slides_to_scroll'],
                    },
                    768: {
                        slidesPerView: settings['slides_to_show_md'],
                        slidesPerGroup: settings['slides_to_scroll'],
                    },
                    992: {
                        slidesPerView: settings['slides_to_show_lg'],
                        slidesPerGroup: settings['slides_to_scroll'],
                    },
                    1200: {
                        slidesPerView: settings['slides_to_show'],
                        slidesPerGroup: settings['slides_to_scroll'],
                    },
                    1400: {
                        slidesPerView: settings['slides_to_show_xxl'],
                        slidesPerGroup: settings['slides_to_scroll'],
                    }
                },
                on: {
                    init: function (swiper) {
                        const progress = 0;
                        if ($scope.find('.pxl-portfolio-carousel1').length > 0) {
                            animateFilterWhileDragging(progress);
                        }
                        if ($scope.find('.pxl-service-carousel').length > 0) {
                            vintech_svg_color();
                        }
                        setBoxHeight();
                    },

                    slideChange: function (swiper) {

                        const currentIndex = swiper.activeIndex;
                        const totalSlides = swiper.slides.length;
                        const progress = currentIndex / (totalSlides - 1);

                        if ($scope.find('.pxl-portfolio-carousel1').length > 0) {
                            animateFilterWhileDragging(progress);
                        }
                    },
                }
            };

            if (settings['center_slide'] || settings['center_slide'] === 'true') {
                if (settings['loop'] || settings['loop'] === 'true') {
                    carousel_settings['initialSlide'] = Math.floor(numberOfSlides / 2);
                } else {
                    if (carousel_settings['slidesPerView'] > 1) {
                        carousel_settings['initialSlide'] = Math.floor((numberOfSlides - carousel_settings['slidesPerView']) / 2);
                    } else {
                        carousel_settings['initialSlide'] = Math.ceil((numberOfSlides / 2) - 1);
                    }
                }
            }

            if (settings['center_slide'] || settings['center_slide'] == 'true')
                carousel_settings['centeredSlides'] = true;

            if (settings['loop'] || settings['loop'] === 'true') {
                carousel_settings['loop'] = true;
            }

            if (settings['autoplay'] || settings['autoplay'] === 'true') {
                carousel_settings['autoplay'] = {
                    delay: settings['delay'],
                    disableOnInteraction: settings['pause_on_interaction']
                };
            } else {
                carousel_settings['autoplay'] = false;
            }

            // parallax
            if (settings['parallax'] === 'true') {
                carousel_settings['parallax'] = true;
            }

            if (settings['slide_mode'] === 'fade') {
                carousel_settings['fadeEffect'] = {
                    crossFade: true
                };
            }

            if (settings['reverse'] === 'true') {
                carousel_settings['autoplay']['reverseDirection'] = true;
            }

            if (settings['slide_mode'] === 'cards') {
                carousel_settings['cardsEffect'] = {
                    slideShadows: false,
                    rotate: false,
                    perSlideOffset: 12
                };
            }

            if (settings['slide_mode'] === 'carousel') {
                carousel_settings['modules'] = [EffectCarousel]
            }

            if (settings['slide_mode'] === 'gl') {
                carousel_settings['modules'] = [SwiperGL]
            }

            // Creative Effect
            if (settings['creative-effect'] === 'effect1') {
                carousel_settings['creativeEffect'] = {
                    prev: {
                        opacity: 0,
                    },
                    next: {
                        opacity: 0,
                    },
                };
            }

            // Start Swiper Thumbnail
            if ($this.find('.pxl-swiper-thumbs').length > 0) {

                var thumb_settings = $this.find('.pxl-swiper-thumbs').data().settings;
                var loop = $scope.find(".pxl-swiper-thumbs").data("loop");

                var thumb_carousel_settings = {
                    effect: 'slide',
                    direction: 'horizontal',
                    wrapperClass: 'pxl-swiper-wrapper',
                    slideClass: 'pxl-swiper-slide',
                    spaceBetween: 11,
                    slidesPerView: thumb_settings['slides_to_show'],
                    centeredSlides: true,
                    freeMode: true,
                    loop: thumb_settings['loop'],
                    watchSlidesProgress: true,
                    slideToClickedSlide: true,
                };

                var slide_thumbs = new Swiper($this.find('.pxl-swiper-thumbs')[0], thumb_carousel_settings);
                carousel_settings['thumbs'] = { swiper: slide_thumbs };
            }
            // End Swiper Thumbnail

            var allSlides = $this.find(".pxl-swiper-slide");

            var swiper = new Swiper($this.find(".pxl-swiper-container")[0], carousel_settings);

            if (settings['autoplay'] === 'true' && settings['pause_on_hover'] === 'true') {
                $($this.find('.pxl-swiper-container')).on({
                    mouseenter: function mouseenter() {
                        this.swiper.autoplay.stop();
                    },
                    mouseleave: function mouseleave() {
                        this.swiper.autoplay.start();
                    }
                });
            }

            // Navigation-Carousel
            $('.pxl-navigation-carousel').parents('.elementor-element').addClass('pxl--hide-arrow');
            setTimeout(function () {
                $('.pxl-navigation-carousel .pxl-navigation-arrow-prev').on('click', function () {
                    $(this).parents('.elementor-element').find('.pxl-swiper-arrow.pxl-swiper-arrow-prev').trigger('click');
                });
                $('.pxl-navigation-carousel .pxl-navigation-arrow-next').on('click', function () {
                    $(this).parents('.elementor-element').find('.pxl-swiper-arrow.pxl-swiper-arrow-next').trigger('click');
                });
            }, 300);

            $(".pxl-portfolio-carousel2").on("mouseenter", ".pxl-swiper-slide .pxl-post--inner", function () {
                $(".pxl-post--inner").removeClass("active");
                $(this).addClass("active");
            });

            /* Arrow Custom */
            var section_tab = $('.pxl-pagination-carousel').parents('.elementor-element:not(.elementor-inner-section)').addClass('pxl--hide-arrow');
            var target = section_tab.find('.pxl-swiper-slider .pxl-swiper-dots');

            var target_tab = target.parents('.elementor-element.pxl--hide-arrow').find('.pxl-pagination-carousel');
            target_tab.empty();

            var target_clone = target.clone();
            target_tab.append(target_clone);

            target_tab.find('.pxl-swiper-pagination-bullet').each(function (index) {
                var stepText = 'Step ' + (index + 1) + '.';
                $(this).text(stepText);
            });

            target_tab.find('.pxl-swiper-pagination-bullet').on('click', function () {
                var $this = $(this);
                var $section = $this.parents('.elementor-element.pxl--hide-arrow');

                $section.find('.pxl-pagination-carousel .pxl-swiper-pagination-bullet').removeClass('swiper-pagination-bullet-active').attr('aria-current', 'false');
                $section.find('.pxl-swiper-slider .pxl-swiper-pagination-bullet').removeClass('swiper-pagination-bullet-active').attr('aria-current', 'false');

                $this.addClass('swiper-pagination-bullet-active').attr('aria-current', 'true');
                var index = $this.index();
                $section.find('.pxl-swiper-slider .pxl-swiper-pagination-bullet').eq(index).addClass('swiper-pagination-bullet-active').attr('aria-current', 'true');

                $section.find('.pxl-swiper-slider .pxl-swiper-pagination-bullet').eq(index).trigger('click');
            });
            // 

            $scope.find(".pxl--filter-inner .filter-item").on("click", function () {
                var target = $(this).attr('data-filter-target');
                var $parent = $(this).closest('.pxl-swiper-slider');
                $(this).siblings().removeClass("active");
                $(this).addClass("active");
                $parent.find(".pxl-swiper-slide").remove();
                if (target == "all") {
                    allSlides.each(function () {

                        $this.find('.pxl-swiper-wrapper').append($(this)[0].outerHTML);

                    });

                } else {
                    allSlides.each(function () {
                        if ($(this).is("[data-filter^='" + target + "']") || $(this).is("[data-filter*='" + target + "']")) {
                            $this.find('.pxl-swiper-wrapper').append($(this)[0].outerHTML);
                        }
                    });
                }
                numberOfSlides = $parent.find(".pxl-swiper-slide").length;
                if (carousel_settings['centeredSlides']) {
                    if (carousel_settings['loop']) {
                        carousel_settings['initialSlide'] = Math.floor(numberOfSlides / 2);
                    } else {
                        if (carousel_settings['slidesPerView'] > 1) {
                            carousel_settings['initialSlide'] = Math.ceil((numberOfSlides - carousel_settings['slidesPerView']) / 2);
                        } else {
                            carousel_settings['initialSlide'] = Math.ceil((numberOfSlides / 2) - 1);
                        }
                    }

                }
                swiper.destroy();
                swiper = new Swiper($parent.find(".pxl-swiper-container")[0], carousel_settings);
            });
        });

        function vintech_svg_color() {
            $('.pxl-service-carousel .pxl-post--icon img').each(function () {
                var $img = jQuery(this);
                var imgID = $img.attr('id');
                var imgClass = $img.attr('class');
                var imgURL = $img.attr('src');

                if (imgURL) {
                    setTimeout(function () {
                        jQuery.get(imgURL, function (data) {
                            var $svg = jQuery(data).find('svg');
                            if (imgID) {
                                $svg.attr('id', imgID);
                            }
                            if (imgClass) {
                                $svg.attr('class', imgClass + ' replaced-svg');
                            }
                            $svg.removeAttr('xmlns:a');
                            if (!$svg.attr('viewBox') && $svg.attr('height') && $svg.attr('width')) {
                                $svg.attr('viewBox', '0 0 24 24');
                            }
                            $img.replaceWith($svg);
                        }, 'xml');
                    }, 500);
                }
            });
        }

        function setBoxHeight() {
            $('.pxl-swiper-slider:not(.pxl-testimonial-carousel4.default) .swiper-vertical').each(function () {
                const $swiper = $(this);
                const $slides = $swiper.find('.pxl-swiper-slide:not(.swiper-slide-duplicate)');
                if (!$slides.length) return;

                let maxSlideHeight = 0;
                $slides.css('height', '');

                $slides.each(function () {
                    const $slide = $(this);
                    const totalInnerHeight = $slide.find('.pxl-item--inner')
                        .toArray()
                        .reduce((sum, el) => sum + $(el).outerHeight(), 0);

                    const paddingY = (parseInt($slide.css('padding-top')) || 0) +
                        (parseInt($slide.css('padding-bottom')) || 0);

                    maxSlideHeight = Math.max(maxSlideHeight, totalInnerHeight + paddingY + 2);
                });

                $slides.height(maxSlideHeight);

                const visibleCount = $swiper.find('.swiper-slide-visible').length || 1;
                $swiper.height(maxSlideHeight * visibleCount);
            });
        }

        function animateFilterWhileDragging(progress) {
            if (window.innerWidth <= 767) return;
            const filterElements = document.querySelectorAll('.pxl-portfolio-carousel1 .swiper-filter.style-2');

            filterElements.forEach((filterElement) => {
                let translateX = progress * -1000;
                let rotateY = progress * -1000;
                let translateZ = 5 * progress * -1000;

                gsap.to(filterElement, {
                    duration: 0.5,
                    x: translateX,
                    z: translateZ,
                    rotateY: rotateY,
                    opacity: 1,
                    ease: 'power3.out'
                });
            });
        }

    };

    $(window).on('elementor/frontend/init', function () {

        elementorFrontend.hooks.addAction('frontend/element_ready/pxl_post_carousel.default', function ($scope) {
            pxl_swiper_handler($scope);
        });
        elementorFrontend.hooks.addAction('frontend/element_ready/pxl_slider_carousel.default', function ($scope) {
            pxl_swiper_handler($scope);
        });

        elementorFrontend.hooks.addAction('frontend/element_ready/pxl_team_carousel.default', function ($scope) {
            pxl_swiper_handler($scope);
        });

        elementorFrontend.hooks.addAction('frontend/element_ready/pxl_client_carousel.default', function ($scope) {
            pxl_swiper_handler($scope);
        });

        elementorFrontend.hooks.addAction('frontend/element_ready/pxl_text_carousel.default', function ($scope) {
            pxl_swiper_handler($scope);
        });

        elementorFrontend.hooks.addAction('frontend/element_ready/pxl_image_carousel.default', function ($scope) {
            pxl_swiper_handler($scope);
        });

        elementorFrontend.hooks.addAction('frontend/element_ready/pxl_testimonial_slip.default', function ($scope) {
            pxl_swiper_handler($scope);
        });

        elementorFrontend.hooks.addAction('frontend/element_ready/pxl_tabs_slip.default', function ($scope) {
            pxl_swiper_handler($scope);
        });

        elementorFrontend.hooks.addAction('frontend/element_ready/pxl_testimonial_carousel.default', function ($scope) {
            pxl_swiper_handler($scope);
        });

        elementorFrontend.hooks.addAction('frontend/element_ready/pxl_partner_carousel.default', function ($scope) {
            pxl_swiper_handler($scope);
        });

        elementorFrontend.hooks.addAction('frontend/element_ready/pxl_iconbox_carousel.default', function ($scope) {
            pxl_swiper_handler($scope);
        });

        elementorFrontend.hooks.addAction('frontend/element_ready/pxl_tabs_slip.default', function ($scope) {
            pxl_swiper_handler($scope);

            function reinitializeTabSwiper($tabContent) {
                if ($tabContent.is(':visible')) {
                    $tabContent.find('.pxl-swiper-slider').each(function () {
                        var $swiperContainer = $(this);
                        if ($swiperContainer.find('.pxl-swiper-container').length > 0) {
                            if ($swiperContainer[0].swiper) {
                                $swiperContainer[0].swiper.destroy(true, true);
                            }
                            pxl_swiper_handler($tabContent);
                        }
                    });
                }
            }
        });

    });
})(jQuery);