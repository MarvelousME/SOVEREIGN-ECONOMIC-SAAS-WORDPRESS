(function ($) {
    $(window).on('elementor/frontend/init', function () {
        setTimeout(function () {
            $('.pxl-grid').each(function (index, element) {
                var $grid_scope = $(this);
                // per-grid state
                $grid_scope.data('processing', false);
                $grid_scope.data('layoutTimer', null);

                function triggerLayoutDebounced() {
                    var timer = $grid_scope.data('layoutTimer');
                    if (timer) clearTimeout(timer);
                    timer = setTimeout(function () {
                        nexros_equalize_grid_desc();
                        if (typeof $grid_isotope !== 'undefined' && $grid_isotope) {
                            $grid_isotope.isotope('layout');
                        }
                    }, 100);
                    $grid_scope.data('layoutTimer', timer);
                }
                nexros_hover();
                nexros_svg_color();
                nexros_accordion();
                triggerLayoutDebounced();

                if ($grid_scope.hasClass('pxl-post-list')) {
                    var isoOptions = {};
                    var $grid_isotope = null;
                } else {
                    var $grid_masonry = $grid_scope.find('.pxl-grid-masonry');
                    var isoOptions = {
                        itemSelector: '.pxl-grid-item',
                        layoutMode: $(this).closest('.pxl-grid').attr('data-layout'),
                        fitRows: {
                            gutter: 0
                        },
                        percentPosition: true,
                        masonry: {
                            columnWidth: '.grid-sizer',
                        },
                        containerStyle: null,
                        stagger: 30,
                        sortBy: 'name',
                    };
                    var $grid_isotope = $grid_masonry.isotope(isoOptions);

                    $grid_isotope.on('arrangeComplete', function () {
                        var $inner = $grid_scope.find('.pxl-grid-inner');
                        if ($inner.data('auto-step') == 1) {
                            var idx = 0;
                            $grid_scope.find('.pxl-grid-item:visible').each(function () {
                                idx++;
                                var text = (idx < 10 ? '0' + idx : '' + idx);
                                $(this).find('.pxl-item--step').text(text).attr('data-step', idx);
                            });
                        }
                        // Re-equalize and relayout after items have been arranged
                        triggerLayoutDebounced();
                        $grid_scope.data('processing', false);
                    });

                    // Auto-trigger first filter if no "All" filter is present
                    var $firstFilter = $grid_scope.find('.pxl-grid-filter .filter-item').first();
                    if ($firstFilter.length && $firstFilter.attr('data-filter') !== '*') {
                        var firstFilterValue = $firstFilter.attr('data-filter');
                        if (firstFilterValue) {
                            $grid_isotope.isotope({ filter: firstFilterValue });
                            $grid_isotope.isotope('layout');
                        }
                    }


                    $grid_scope.on('click', '.pxl-grid-filter .filter-item', function (e) {

                        var $this = $(this);
                        var term_slug = $this.attr('data-filter');

                        if ($grid_scope.data('processing')) return;
                        $grid_scope.data('processing', true);

                        $this.siblings('.filter-item.active').removeClass('active');
                        $this.addClass('active');
                        $grid_scope.find('.pxl-post--inner').removeClass('animated');

                        if ($this.closest('.pxl-grid-filter').hasClass('ajax')) {
                            var loadmore = $grid_scope.data('loadmore');
                            loadmore.term_slug = term_slug;
                            nexros_grid_ajax_handler($this, $grid_scope, $grid_isotope,
                                { action: 'nexros_load_more_post_grid', loadmore: loadmore, iso_options: isoOptions, handler_click: 'filter', scrolltop: 0 }
                            );
                        } else {
                            $grid_isotope.isotope({ filter: term_slug });
                            $grid_isotope.isotope('layout');
                        }

                        triggerLayoutDebounced();
                    });
                }

                $grid_scope.on('input', '.grid-search-input', function () {
                    var searchQuery = $(this).val().toLowerCase();

                    // If Isotope is used
                    if ($grid_isotope) {
                        $grid_isotope.isotope({
                            filter: function () {
                                var itemTitle = $(this).find('.pxl-post--title a').text().toLowerCase();
                                return itemTitle.indexOf(searchQuery) !== -1; // Check if title starts with searchQuery
                            }
                        });
                        $grid_isotope.isotope('layout');
                    } else {
                        // AJAX search if Isotope is not used
                        var loadmore = $grid_scope.data('loadmore') || {};
                        loadmore.search_query = searchQuery;
                        nexros_grid_ajax_handler('nexros_load_more_post_grid', { action: 'nexros_load_more_post_grid', loadmore: loadmore, iso_options: isoOptions, handler_click: 'search', scrolltop: 0 }, 'search');
                    }
                });

                $grid_scope.on('click', '.pxl-grid-pagination .ajax a.page-numbers', function (e) {
                    e.preventDefault();
                    e.stopPropagation();
                    var $this = $(this);
                    if ($grid_scope.data('processing')) return;
                    $grid_scope.data('processing', true);
                    var loadmore = $grid_scope.data('loadmore');
                    var paged = $this.attr('href');
                    paged = paged.replace('#', '');
                    loadmore.paged = parseInt(paged);
                    nexros_grid_ajax_handler($this, $grid_scope, $grid_isotope,
                        { action: 'nexros_load_more_post_grid', loadmore: loadmore, iso_options: isoOptions, handler_click: 'pagination', scrolltop: 0 }
                    );
                    $('html,body').animate({ scrollTop: $grid_scope.offset().top - 130 }, 500);
                });

                $grid_scope.on('click', '.btn-grid-loadmore', function (e) {
                    e.preventDefault();
                    var $this = $(this);
                    if ($grid_scope.data('processing')) return;
                    $grid_scope.data('processing', true);
                    var loadmore = $grid_scope.data('loadmore');
                    loadmore.paged = parseInt($grid_scope.data('start-page')) + 1;

                    nexros_grid_ajax_handler($this, $grid_scope, $grid_isotope,
                        { action: 'nexros_load_more_post_grid', loadmore: loadmore, iso_options: isoOptions, handler_click: 'loadmore', scrolltop: 0 }
                    );
                });

                $grid_scope.on('change', '.orderby', function (e) {
                    e.preventDefault();
                    var $this = $(this);
                    if ($grid_scope.data('processing')) return;
                    $grid_scope.data('processing', true);
                    var loadmore = $grid_scope.data('loadmore');
                    loadmore.orderby = $this.val();

                    nexros_grid_ajax_handler($this, $grid_scope, $grid_isotope,
                        { action: 'nexros_load_more_post_grid', loadmore: loadmore, iso_options: isoOptions, handler_click: 'select_orderby', scrolltop: 0 }
                    );
                });

            });

            function nexros_equalize_grid_desc() {
                $('.pxl-box-grid1').each(function () {
                    var $grid = $(this);

                    // equal title
                    var $titles = $grid.find('.pxl-grid-item .pxl-item--title');
                    if ($titles.length > 0) {
                        $titles.css('min-height', '');
                        var maxTitleH = 0;
                        $titles.each(function () {
                            var h = $(this).outerHeight();
                            if (h > maxTitleH) maxTitleH = h;
                        });
                        if (maxTitleH > 0) {
                            $titles.css('min-height', maxTitleH + 'px');
                        }
                    }

                    // equal desc
                    var $descs = $grid.find('.pxl-grid-item .pxl-item--desc');
                    if ($descs.length > 0) {
                        $descs.css('min-height', '');
                        var maxDescH = 0;
                        $descs.each(function () {
                            var h = $(this).outerHeight();
                            if (h > maxDescH) maxDescH = h;
                        });
                        if (maxDescH > 0) {
                            $descs.css('min-height', maxDescH + 'px');
                        }
                    }
                });
            }


            function nexros_accordion() {
                $(".pxl-grid-inner .pxl-accordion--title").on("click", function (e) {
                    e.preventDefault();

                    var $clickedTitle = $(this);
                    var pxl_target = $clickedTitle.data("target");
                    var $item = $clickedTitle.closest('.pxl--item');
                    var $accordion = $clickedTitle.closest('.pxl-accordion');
                    var $allTitles = $accordion.find(".pxl-accordion--title");

                    $.each($allTitles, function (index, item) {
                        var target = $(item).data("target");
                        if (target !== pxl_target) {
                            $(item).removeClass("active");
                            $(item).closest('.pxl--item').removeClass("active");
                            $(target).slideUp(400);
                        }
                    });

                    $clickedTitle.addClass("active");
                    $item.addClass("active");
                    $(pxl_target).slideDown(400);
                });
            }

            /* Get Mouse Move Direction */
            function nexros_hover() {
                function getDirection(ev, obj) {
                    var w = $(obj).width(),
                        h = $(obj).height(),
                        x = (ev.pageX - $(obj).offset().left - (w / 2)) * (w > h ? (h / w) : 1),
                        y = (ev.pageY - $(obj).offset().top - (h / 2)) * (h > w ? (w / h) : 1),
                        d = Math.round(Math.atan2(y, x) / 1.57079633 + 5) % 4;
                    return d;
                }
                function addClass(ev, obj, state) {
                    var direction = getDirection(ev, obj),
                        class_suffix = null;
                    $(obj).removeAttr('class');
                    switch (direction) {
                        case 0: class_suffix = '--top'; break;
                        case 1: class_suffix = '--right'; break;
                        case 2: class_suffix = '--bottom'; break;
                        case 3: class_suffix = '--left'; break;
                    }
                    $(obj).addClass(state + class_suffix);
                }
                $.fn.ctDeriction = function () {
                    this.each(function () {
                        $(this).on('mouseenter', function (ev) {
                            addClass(ev, this, 'pxl-in');
                        });
                        $(this).on('mouseleave', function (ev) {
                            addClass(ev, this, 'pxl-out');
                        });
                    });
                }
                $('.pxl-effect--3d .pxl-effect--direction').ctDeriction();
            }


            function nexros_svg_color() {
                $('.pxl-service-grid .pxl-post--icon img').each(function () {
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

            function nexros_grid_ajax_handler($this, $grid_scope, $grid_isotope, args = {}) {
                var settings = $.extend(true, {}, {
                    action: '',
                    loadmore: '',
                    iso_options: {},
                    handler_click: '',
                    scrolltop: 0
                }, args);

                var offset_top = $grid_scope.offset().top;

                if (settings.handler_click == 'loadmore') {
                    var loadmore_text = $this.closest('.pxl-load-more').data('loadmore-text');
                    var loading_text = $this.closest('.pxl-load-more').data('loading-text');
                    var curoffsettop = $this.offset().top;
                }

                $.ajax({
                    url: main_data.ajax_url,
                    type: 'POST',
                    data: {
                        action: settings.action,
                        settings: settings.loadmore,
                        handler_click: settings.handler_click
                    },
                    success: function (res) {
                        if (res.status == true) {

                            if (settings.handler_click == 'loadmore') {
                                if (settings.loadmore.wg_type == 'post-list') {
                                    $grid_scope.find('.pxl-list-inner').append(res.data.html)
                                } else {
                                    $grid_scope.find('.pxl-grid-inner').append(res.data.html)
                                }
                            } else {
                                if (settings.loadmore.wg_type == 'post-list') {
                                    $grid_scope.find('.pxl-list-inner .list-item').remove();
                                    $grid_scope.find('.pxl-list-inner').append(res.data.html);
                                } else {
                                    $grid_scope.find('.pxl-grid-inner .pxl-grid-item').remove();
                                    $grid_scope.find('.pxl-grid-inner').append(res.data.html);
                                }
                            }

                            if (settings.iso_options && $grid_isotope != null) {
                                $grid_isotope.isotope('destroy');
                                $grid_isotope.isotope(settings.iso_options);
                                nexros_equalize_grid_desc();
                                $grid_isotope.isotope('layout');
                            }


                            $grid_scope.data('start-page', res.data.paged);

                            if (settings.loadmore['pagination_type'] == 'loadmore') {
                                if (res.data.paged >= res.data.max) {
                                    $grid_scope.find('.pxl-load-more').hide();
                                } else {
                                    $grid_scope.find('.pxl-load-more').show();
                                }
                            }
                            if (settings.loadmore['pagination_type'] == 'pagination') {
                                $grid_scope.find(".pxl-grid-pagination").html(res.data.pagin_html);
                            }

                            if ($grid_scope.find('.result-count').length > 0) {
                                $grid_scope.find(".result-count").html(res.data.result_count);
                            }

                            nexros_hover();
                        }

                    },
                    beforeSend: function () {
                        $grid_scope.data('processing', true);
                        $grid_scope.find('.pxl-grid-overlay-loading').removeClass('loaded').addClass('loader');
                        if (settings.handler_click == 'loadmore') {
                            $this.find('.pxl-loadmore-text').text(loading_text);
                            $this.parent().addClass('loading');
                        }
                    },
                    complete: function () {
                        $('.pxl-grid .pxl-post--icon img').each(function () {
                            var $img = jQuery(this);
                            var imgID = $img.attr('id');
                            var imgClass = $img.attr('class');
                            var imgURL = $img.attr('src');

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
                        });
                        $grid_scope.find('.pxl-grid-overlay-loading').removeClass('loader').addClass('loaded');
                        if (settings.handler_click == 'loadmore') {
                            $this.find('.pxl-loadmore-text').text(loadmore_text);
                            $this.parent().removeClass('loading');
                        }
                        if (settings.scrolltop) {
                            $('html, body').animate({ scrollTop: offset_top - 100 }, 0);
                        }
                        $grid_scope.data('processing', false);
                    }
                });
            }
        }, 150);
    });
    $(document).ready(function () {
        $('.filter-item').on('click', function () {
            var activeContent = $(this).text().trim();
            $('.label-text-fillter').text(activeContent);
        });
    });

})(jQuery);                                      