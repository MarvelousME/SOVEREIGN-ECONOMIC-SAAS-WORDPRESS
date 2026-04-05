(function ($) {
    "use strict";

    const $document = $(document);
    const $window = $(window);

    function nexros_animation_handler($scope) {
        elementorFrontend.waypoint($(document).find('.pxl-animate'), function () {
            var $animate_el = $(this),
                data = $animate_el.data('settings');
            if (typeof data != 'undefined' && typeof data['animation'] != 'undefined') {
                setTimeout(function () {
                    $animate_el.removeClass('pxl-invisible').addClass('animated ' + data['animation']);
                }, data['animation_delay']);
            } else {
                setTimeout(function () {
                    $animate_el.removeClass('pxl-invisible').addClass('animated fadeInUp');
                }, 300);
            }
        });

        elementorFrontend.waypoint($scope.find('.pxl-border-animated'), function () {
            $(this).addClass('pxl-animated');
        });
        elementorFrontend.waypoint($scope.find('.pxl-shape-container .grid-item'), function () {
            $(this).addClass('pxl-animated');
        });
        elementorFrontend.waypoint($scope.find('.pxl-section-divider'), function () {
            $(this).addClass('pxl-animated');
        });
        elementorFrontend.waypoint($scope.find('.PXLZoom2'), function () {
            $(this).addClass('pxl-animated');
        });
        elementorFrontend.waypoint($scope.find('.PXLfadeInUp'), function () {
            $(this).addClass('pxl-animated');
        });
    }

    function nexros_section_start_render() {
        const _elementor = typeof elementor !== 'undefined' ? elementor : elementorFrontend;

        _elementor.hooks.addFilter('pxl_element_container/before-render', function (html, settings) {
            if (settings.pxl_parallax_bg_img?.url) {
                html += '<div class="pxl-section-bg-parallax"></div>';
            }

            if (settings.pxl_color_offset && settings.pxl_color_offset !== 'none') {
                html += '<div class="pxl-section-overlay-color"></div>';
            }

            if (settings.pxl_overlay_img?.url) {
                html += '<div class="pxl-overlay--image pxl-overlay--imageLeft"><div class="bg-image"></div></div>';
            }

            if (settings.pxl_overlay_img2?.url) {
                html += '<div class="pxl-overlay--image pxl-overlay--imageRight"><div class="bg-image"></div></div>';
            }

            return html;
        });

        $('.pxl-section-bg-parallax').closest('.elementor-element').addClass('pxl-section-parallax-overflow');
    }

    function nexros_css_inline_js() {
        const $inlineElements = $document.find('.pxl-inline-css');
        if (!$inlineElements.length) return;

        const cssRules = [];
        $inlineElements.each(function () {
            const css = $(this).attr("data-css");
            if (css) cssRules.push(css);
            $(this).remove();
        });

        if (cssRules.length) {
            const styleElement = `<style>${cssRules.join(' ')}</style>`;
            $('head').append(styleElement);
        }
    }

    function nexros_section_before_render() {
        const _elementor = typeof elementor !== 'undefined' ? elementor : elementorFrontend;

        const svgTemplates = {
            angle: '<svg class="pxl-row-angle" style="fill:#ffffff" xmlns="http://www.w3.org/2000/svg" width="100%" viewBox="0 0 100 100" version="1.1" preserveAspectRatio="none" height="130px"><path stroke="" stroke-width="0" d="M0 100 L100 0 L200 100"></path></svg>',
            angleTopBottom: '<svg class="pxl-row-angle pxl-row-angle-top" style="fill:#ffffff" xmlns="http://www.w3.org/2000/svg" width="100%" viewBox="0 0 100 100" version="1.1" preserveAspectRatio="none" height="130px"><path stroke="" stroke-width="0" d="M0 100 L100 0 L200 100"></path></svg><svg class="pxl-row-angle pxl-row-angle-bottom" style="fill:#ffffff" xmlns="http://www.w3.org/2000/svg" width="100%" viewBox="0 0 100 100" version="1.1" preserveAspectRatio="none" height="130px"><path stroke="" stroke-width="0" d="M0 100 L100 0 L200 100"></path></svg>',
            wave: '<svg class="pxl-row-angle" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" viewBox="0 0 1440 150" fill="#fff"><path d="M 0 26.1978 C 275.76 83.8152 430.707 65.0509 716.279 25.6386 C 930.422 -3.86123 1210.32 -3.98357 1439 9.18045 C 2072.34 45.9691 2201.93 62.4429 2560 26.198 V 172.199 L 0 172.199 V 26.1978 Z"><animate repeatCount="indefinite" fill="freeze" attributeName="d" dur="10s" values="M0 25.9086C277 84.5821 433 65.736 720 25.9086C934.818 -3.9019 1214.06 -5.23669 1442 8.06597C2079 45.2421 2208 63.5007 2560 25.9088V171.91L0 171.91V25.9086Z; M0 86.3149C316 86.315 444 159.155 884 51.1554C1324 -56.8446 1320.29 34.1214 1538 70.4063C1814 116.407 2156 188.408 2560 86.315V232.317L0 232.316V86.3149Z; M0 53.6584C158 11.0001 213 0 363 0C513 0 855.555 115.001 1154 115.001C1440 115.001 1626 -38.0004 2560 53.6585V199.66L0 199.66V53.6584Z; M0 25.9086C277 84.5821 433 65.736 720 25.9086C934.818 -3.9019 1214.06 -5.23669 1442 8.06597C2079 45.2421 2208 63.5007 2560 25.9088V171.91L0 171.91V25.9086Z"></animate></path></svg>',
            curved: '<svg class="pxl-row-angle" xmlns="http://www.w3.org/2000/svg" width="100%" viewBox="0 0 1920 128" version="1.1" preserveAspectRatio="none" style="fill:#ffffff"><path stroke-width="0" d="M-1,126a3693.886,3693.886,0,0,1,1921,2.125V-192H-7Z"></path></svg>'
        };

        _elementor.hooks.addFilter('pxl-custom-section/before-render', function (html, settings, el) {
            const rowDivider = settings.row_divider;
            if (!rowDivider) return html;

            if (['angle-top', 'angle-bottom', 'angle-top-right', 'angle-bottom-left'].includes(rowDivider)) {
                return svgTemplates.angle;
            }
            if (['angle-top-bottom', 'angle-top-bottom-left'].includes(rowDivider)) {
                return svgTemplates.angleTopBottom;
            }
            if (['wave-animation-top', 'wave-animation-bottom'].includes(rowDivider)) {
                return svgTemplates.wave;
            }
            if (['curved-top', 'curved-bottom'].includes(rowDivider)) {
                return svgTemplates.curved;
            }

            return html;
        });
    }

    const PXL_Icon_Contact_Form = function ($scope, $) {
        setTimeout(() => {
            $scope.find('.pxl--item').each(function () {
                const $item = $(this);
                const $iconInput = $item.find(".pxl--form-icon");
                const $controlWrap = $item.find('.wpcf7-form-control');

                if ($iconInput.length && $controlWrap.length) {
                    $controlWrap.before($iconInput.clone());
                    $iconInput.remove();
                }
            });
        }, 10);
    };


    // Optimized split text function
    function nexros_split_text($scope) {
        const $splitElements = $scope.find(".pxl-split-text");
        if (!$splitElements.length) return;

        if (window.innerWidth <= 767) {
            return;
        }

        // Ensure GSAP and plugins are ready
        if (typeof gsap === 'undefined' || typeof SplitText === 'undefined') {
            console.warn('GSAP or SplitText not loaded, retrying...');
            setTimeout(() => nexros_split_text($scope), 100);
            return;
        }

        gsap.registerPlugin(SplitText);

        // Ensure ScrollTrigger is ready
        if (typeof ScrollTrigger !== 'undefined') {
            ScrollTrigger.refresh();
        }

        $splitElements.each(function (index, el) {
            const $el = $(el);
            const els = $el.find('p').length > 0 ? $el.find('p')[0] : el;
            const pxl_split = new SplitText(els, {
                type: "lines, words, chars",
                lineThreshold: 0.5,
                linesClass: "split-line"
            });

            let split_type_set = pxl_split.chars;
            gsap.set(els, { perspective: 400 });

            // Base settings
            const settings = {
                scrollTrigger: {
                    trigger: els,
                    toggleActions: "play none none none",
                    start: "top 86%",
                    once: true
                },
                duration: 0.35,
                stagger: 0.02,
                ease: "Expo.out"
            };

            // Animation type classes mapping
            const animationTypes = {
                'split-in-fade': { opacity: 0 },
                'split-in-right': { opacity: 0, x: "50" },
                'split-in-left': { opacity: 0, x: "-50" },
                'split-in-up': { opacity: 0, y: "80" },
                'split-in-down': { opacity: 0, y: "-80" },
                'split-in-rotate': { opacity: 0, rotateX: "50deg" },
                'split-in-scale': { opacity: 0, scale: "0.5" }
            };

            // Apply animation settings based on classes
            Object.keys(animationTypes).forEach(className => {
                if ($el.hasClass(className)) {
                    Object.assign(settings, animationTypes[className]);
                }
            });

            let pxl_anim;

            // Handle split-up animation
            if ($el.hasClass('split-up')) {
                pxl_split.split({ type: "words" });
                split_type_set = pxl_split.words;

                $(split_type_set).each(function (index, elw) {
                    gsap.from(elw, {
                        opacity: 0,
                        duration: 0.65,
                        y: 60,
                        delay: 0.25 + index * 0.065,
                        ease: "expo.out",
                        scrollTrigger: {
                            trigger: el,
                            start: "top 86%",
                            toggleActions: "play none none none",
                        },
                    });
                });
            }
            // Handle split-words-scale animation
            else if ($el.hasClass('split-words-scale')) {
                pxl_split.split({ type: "words" });
                split_type_set = pxl_split.words;

                $(split_type_set).each(function (index, elw) {
                    gsap.set(elw, {
                        opacity: 0,
                        scale: index % 2 === 0 ? 0 : 2,
                        force3D: true,
                        duration: 0.1,
                        ease: "Linear.easeNone",
                        stagger: 0.02,
                    }, index * 0.01);
                });

                pxl_anim = gsap.to(split_type_set, {
                    scrollTrigger: {
                        trigger: el,
                        toggleActions: "play reverse play reverse",
                        start: "top 86%",
                    },
                    rotateX: "0",
                    scale: 1,
                    opacity: 1,
                });
            }

            else {
                pxl_anim = gsap.from(split_type_set, settings);
            }

            if ($el.hasClass('hover-split-text') && pxl_anim) {
                $el.on('mouseenter', () => pxl_anim.restart());
            }
        });
    }

    function nexros_scroll_trigger($scope) {
        ScrollTrigger.matchMedia({
            "(min-width: 1401px)": function () {
                let t2 = gsap.timeline({
                    scrollTrigger: {
                        trigger: ".pxl-section-scale",
                        scrub: true,
                        start: "top top",
                        end: "bottom bottom",
                        pin: ".pxl-section-sticky",
                    },
                });
                t2.to(".pxl-section-slide", {
                    padding: "7.5rem"
                }, ">");
                t2.to(".pxl-sticky-mask", {
                    borderRadius: "2rem"
                }, "<");
                t2.from(".is-shape-1", {
                    right: "-10%"
                }, "<");
                t2.from(".is-shape-2", {
                    left: "-10%"
                }, "<");
            },
            "(max-width: 1400px)": function () {
                let t2 = gsap.timeline({
                    scrollTrigger: {
                        trigger: ".pxl-section-scale",
                        scrub: true,
                        start: "top top",
                        end: "bottom bottom",
                        pin: ".pxl-section-sticky",
                    },
                });
                t2.to(".pxl-section-slide", {
                    padding: "4.8rem"
                }, ">");
                t2.to(".pxl-sticky-mask", {
                    borderRadius: "1.6rem"
                }, "<");
                t2.from(".is-shape-1", {
                    right: "-10%"
                }, "<");
                t2.from(".is-shape-2", {
                    left: "-10%"
                }, "<");
            },
            "(max-width: 991px)": function () {
                let t2 = gsap.timeline({
                    scrollTrigger: {
                        trigger: ".pxl-section-scale",
                        scrub: true,
                        start: "top bottom",
                        end: "bottom top",
                    },
                });
                t2.to(".pxl-section-slide", {
                    padding: "2rem"
                }, ">");
                t2.to(".pxl-sticky-mask", {
                    borderRadius: "2rem"
                }, "<");
                t2.from(".is-shape-1", {
                    right: "-10%"
                }, "<");
                t2.from(".is-shape-2", {
                    left: "-10%"
                }, "<");

            },
        });
        gsap.to(".pxl-sticker-shape.is-rotate", {
            rotation: "800",
            scrollTrigger: {
                trigger: "#pxl-content-main",
                scrub: true,
                start: "top top",
                end: "bottom bottom",
            },
        });
    }

    function nexros_zoom_point() {
        elementorFrontend.waypoint($(document).find('.pxl-zoom-point'), function () {
            var offset = $(this).offset();
            var offset_top = offset.top;
            var scroll_top = $(window).scrollTop();
        }, {
            offset: -100,
            triggerOnce: true
        });
    }


    function nexros_logo_marquee($scope) {
        const logos = $scope.find('.pxl-item--marquee');
        gsap.set(logos, { autoAlpha: 1 })

        logos.each(function (index, el) {
            gsap.set(el, { xPercent: 100 * index });
        });

        if (logos.length > 2) {
            const logosWrap = gsap.utils.wrap(-100, ((logos.length - 1) * 100));
            const durationNumber = logos.data('duration');
            const slipType = logos.data('slip-type');
            var slipResult = `-=${logos.length * 100}`;
            if (slipType == 'right') {
                slipResult = `+=${logos.length * 100}`;
            }
            gsap.to(logos, {
                xPercent: slipResult,
                duration: durationNumber,
                repeat: -1,
                ease: 'none',
                modifiers: {
                    xPercent: xPercent => logosWrap(parseFloat(xPercent))
                }
            });
        }
    }

    function nexros_text_marquee($scope) {

        const text_marquee = $scope.find('.pxl-text--marquee');

        const boxes = gsap.utils.toArray(text_marquee);

        const loop = text_horizontalLoop(boxes, { paused: false, repeat: -1, });

        function text_horizontalLoop(items, config) {
            items = gsap.utils.toArray(items);
            config = config || {};
            let tl = gsap.timeline({ repeat: config.repeat, paused: config.paused, defaults: { ease: "none" }, onReverseComplete: () => tl.totalTime(tl.rawTime() + tl.duration() * 100) }),
                length = items.length,
                startX = items[0].offsetLeft,
                times = [],
                widths = [],
                xPercents = [],
                curIndex = 0,
                pixelsPerSecond = (config.speed || 1) * 100,
                snap = config.snap === false ? v => v : gsap.utils.snap(config.snap || 1),
                totalWidth, curX, distanceToStart, distanceToLoop, item, i;
            gsap.set(items, {
                xPercent: (i, el) => {
                    let w = widths[i] = parseFloat(gsap.getProperty(el, "width", "px"));
                    xPercents[i] = snap(parseFloat(gsap.getProperty(el, "x", "px")) / w * 100 + gsap.getProperty(el, "xPercent"));
                    return xPercents[i];
                }
            });
            gsap.set(items, { x: 0 });
            totalWidth = items[length - 1].offsetLeft + xPercents[length - 1] / 100 * widths[length - 1] - startX + items[length - 1].offsetWidth * gsap.getProperty(items[length - 1], "scaleX") + (parseFloat(config.paddingRight) || 0);
            for (i = 0; i < length; i++) {
                item = items[i];
                curX = xPercents[i] / 100 * widths[i];
                distanceToStart = item.offsetLeft + curX - startX;
                distanceToLoop = distanceToStart + widths[i] * gsap.getProperty(item, "scaleX");
                tl.to(item, { xPercent: snap((curX - distanceToLoop) / widths[i] * 100), duration: distanceToLoop / pixelsPerSecond }, 0)
                    .fromTo(item, { xPercent: snap((curX - distanceToLoop + totalWidth) / widths[i] * 100) }, { xPercent: xPercents[i], duration: (curX - distanceToLoop + totalWidth - curX) / pixelsPerSecond, immediateRender: false }, distanceToLoop / pixelsPerSecond)
                    .add("label" + i, distanceToStart / pixelsPerSecond);
                times[i] = distanceToStart / pixelsPerSecond;
            }
            function toIndex(index, vars) {
                vars = vars || {};
                (Math.abs(index - curIndex) > length / 2) && (index += index > curIndex ? -length : length);
                let newIndex = gsap.utils.wrap(0, length, index),
                    time = times[newIndex];
                if (time > tl.time() !== index > curIndex) {
                    vars.modifiers = { time: gsap.utils.wrap(0, tl.duration()) };
                    time += tl.duration() * (index > curIndex ? 1 : -1);
                }
                curIndex = newIndex;
                vars.overwrite = true;
                return tl.tweenTo(time, vars);
            }
            tl.next = vars => toIndex(curIndex + 1, vars);
            tl.previous = vars => toIndex(curIndex - 1, vars);
            tl.current = () => curIndex;
            tl.toIndex = (index, vars) => toIndex(index, vars);
            tl.times = times;
            tl.progress(1, true).progress(0, true);
            if (config.reversed) {
                tl.vars.onReverseComplete();
                tl.reverse();
            }
            return tl;
        }
    }

    function nexros_scroll_fixed_section() {
        const fixed_section_top = $('.pxl-section-fix-top');
        if (fixed_section_top.length > 0) {
            ScrollTrigger.matchMedia({
                "(min-width: 991px)": function () {
                    const pinnedSections = ['.pxl-section-fix-top'];
                    pinnedSections.forEach(className => {
                        gsap.to(".pxl-section-fix-bottom", {
                            scrollTrigger: {
                                trigger: ".pxl-section-fix-bottom",
                                scrub: true,
                                pin: className,
                                pinSpacing: false,
                                start: 'top bottom',
                                end: "bottom top",
                            },
                        });
                        gsap.to(".pxl-section-fix-bottom .pxl-section-overlay-color", {
                            scrollTrigger: {
                                trigger: ".pxl-section-fix-bottom",
                                scrub: true,
                                pin: className,
                                pinSpacing: false,
                                start: 'top bottom',
                                end: "bottom top",
                            },
                        });
                    });
                }
            });
        }

        const section_overlay_color = $('.pxl-section-overlay-color');
        if (section_overlay_color.length > 0) {
            const space_top = section_overlay_color.data('space-top');
            const space_left = section_overlay_color.data('space-left');
            const space_right = section_overlay_color.data('space-right');
            const space_bottom = section_overlay_color.data('space-bottom');

            const radius_top = section_overlay_color.data('radius-top');
            const radius_left = section_overlay_color.data('radius-left');
            const radius_right = section_overlay_color.data('radius-right');
            const radius_bottom = section_overlay_color.data('radius-bottom');

            const overlay_radius = radius_top + 'px ' + radius_right + 'px ' + radius_bottom + 'px ' + radius_left + 'px ';

            ScrollTrigger.matchMedia({
                "(min-width: 991px)": function () {
                    const pinnedSections = ['.pxl-bg-color-scroll'];
                    pinnedSections.forEach(className => {
                        gsap.to(".overlay-type-scroll", {
                            scrollTrigger: {
                                trigger: ".pxl-bg-color-scroll",
                                scrub: true,
                                pinSpacing: false,
                                start: 'top bottom',
                                end: "bottom top",
                            },
                            left: space_left + "px",
                            right: space_right + "px",
                            top: space_top + "px",
                            bottom: space_bottom + "px",
                            borderRadius: overlay_radius,
                        });
                    });
                }
            });
        }
    }
    // Optimized scroll check function with throttling
    function nexros_scroll_checkp($scope) {
        const $dividers = $scope.find('.pxl-el-divider');
        if (!$dividers.length) return;

        // Throttle scroll events
        let scrollTimeout;

        function checkScrollPosition() {
            const scrollTop = $window.scrollTop();
            const viewportBottom = scrollTop + $window.height();

            $dividers.each(function () {
                const $divider = $(this);
                if ($divider.hasClass('visible')) return; // Skip if already visible

                const elementTop = $divider.offset().top;
                const elementBottom = elementTop + $divider.outerHeight();

                if (elementTop < viewportBottom && elementBottom > scrollTop) {
                    $divider.addClass('visible');
                }
            });
        }

        // Initial check
        checkScrollPosition();

        // Throttled scroll handler
        $window.on('scroll', function () {
            if (scrollTimeout) {
                clearTimeout(scrollTimeout);
            }
            scrollTimeout = setTimeout(checkScrollPosition, 16); // ~60fps
        });
    }

    // Function removed - merged with nexros_section_start_render() above 

    function pxl_widget_sphere_handler($scope) {
        const canvas = $scope.find(".pxl-sphere canvas");
        if (!canvas.length) return;

        const sphereEl = $scope.find(".pxl-sphere");
        const size = parseInt(sphereEl.data("size")) || 950;
        const radius = parseInt(sphereEl.data("radius")) || size * 0.5;
        const sphereColor = sphereEl.data("color") || "rgba(255, 255, 255, 0.15)";
        const rotationType = sphereEl.data("rotation") || "y_axis";
        const rotationSpeed = parseFloat(sphereEl.data("speed")) || 0.005;
        const customXSpeed = parseFloat(sphereEl.data("xspeed")) || 0.003;
        const customYSpeed = parseFloat(sphereEl.data("yspeed")) || 0.005;
        const tiltAngle =
            ((parseFloat(sphereEl.data("tilt")) || -30) * Math.PI) / 180;

        const ctx = canvas[0].getContext("2d");

        canvas[0].width = size;
        canvas[0].height = size;

        let angleX = tiltAngle;
        let angleY = 0;

        function rotate(point, angleX, angleY) {
            let cosX = Math.cos(angleX),
                sinX = Math.sin(angleX);
            let cosY = Math.cos(angleY),
                sinY = Math.sin(angleY);

            let y = point.y * cosX - point.z * sinX;
            let z = point.y * sinX + point.z * cosX;
            let x = point.x * cosY - z * sinY;
            z = point.x * sinY + z * cosY;
            return { x, y, z };
        }

        function drawSphere() {
            ctx.clearRect(0, 0, canvas[0].width, canvas[0].height);
            ctx.strokeStyle = sphereColor;
            ctx.lineWidth = 1;
            const cx = canvas[0].width / 2;
            const cy = canvas[0].height / 2;

            for (
                let lat = -Math.PI / 2;
                lat <= Math.PI / 2;
                lat += Math.PI / 10
            ) {
                let circlePoints = [];
                for (let lon = 0; lon < 2 * Math.PI; lon += Math.PI / 20) {
                    let x = Math.cos(lat) * Math.cos(lon);
                    let y = Math.sin(lat);
                    let z = Math.cos(lat) * Math.sin(lon);
                    let rotatedPoint = rotate({ x, y, z }, angleX, angleY);
                    circlePoints.push(rotatedPoint);
                }
                ctx.beginPath();
                circlePoints.forEach((p, i) => {
                    if (i === 0) {
                        ctx.moveTo(cx + p.x * radius, cy + p.y * radius);
                    } else {
                        ctx.lineTo(cx + p.x * radius, cy + p.y * radius);
                    }
                });
                ctx.closePath();
                ctx.stroke();
            }

            for (let lon = 0; lon < 2 * Math.PI; lon += Math.PI / 10) {
                let circlePoints = [];
                for (
                    let lat = -Math.PI / 2;
                    lat <= Math.PI / 2;
                    lat += Math.PI / 20
                ) {
                    let x = Math.cos(lat) * Math.cos(lon);
                    let y = Math.sin(lat);
                    let z = Math.cos(lat) * Math.sin(lon);
                    let rotatedPoint = rotate({ x, y, z }, angleX, angleY);
                    circlePoints.push(rotatedPoint);
                }
                ctx.beginPath();
                circlePoints.forEach((p, i) => {
                    if (i === 0) {
                        ctx.moveTo(cx + p.x * radius, cy + p.y * radius);
                    } else {
                        ctx.lineTo(cx + p.x * radius, cy + p.y * radius);
                    }
                });
                ctx.stroke();
            }
        }

        function updateRotation() {
            switch (rotationType) {
                case "y_axis":
                    angleY += rotationSpeed;
                    break;
                case "x_axis":
                    angleX += rotationSpeed;
                    break;
                case "both_axis":
                    angleX += rotationSpeed;
                    angleY += rotationSpeed;
                    break;
                case "custom":
                    angleX += customXSpeed;
                    angleY += customYSpeed;
                    break;
            }
        }

        function animate() {
            updateRotation();
            drawSphere();
            requestAnimationFrame(animate);
        }

        animate();
    };

    function nexros_parallax_bg() {
        $(document).find('.pxl-parallax-background').parallaxBackground({
            event: 'mouse_move',
            animation_type: 'shift',
            animate_duration: 2
        });
        $(document).find('.pxl-pll-basic').parallaxBackground();
        $(document).find('.pxl-pll-rotate').parallaxBackground({
            animation_type: 'rotate',
            zoom: 50,
            rotate_perspective: 500
        });
        $(document).find('.pxl-pll-mouse-move').parallaxBackground({
            event: 'mouse_move',
            animation_type: 'shift',
            animate_duration: 2
        });
        $(document).find('.pxl-pll-mouse-move-rotate').parallaxBackground({
            event: 'mouse_move',
            animation_type: 'rotate',
            animate_duration: 1,
            zoom: 70,
            rotate_perspective: 1000
        });

        $(document).find('.pxl-bg-prx-effect-pinned-zoom-clipped').each(function (index, el) {
            var $el = $(el);
            const clipped_bg_pinned = $el.find('.clipped-bg-pinned');
            const clipped_bg = $el.find('.clipped-bg');

            var clipped_bg_animation = gsap.to(clipped_bg, {
                clipPath: 'inset(0% 0% 0%)',
                scale: 1,
                duration: 1,
                ease: 'Linear.easeNone'
            });

            var clipped_bg_scene = ScrollTrigger.create({
                trigger: clipped_bg_pinned,
                start: function () {
                    const start_pin = 350;
                    return "top +=" + start_pin;
                },
                end: function () {
                    const end_pin = 0;
                    return "+=" + end_pin;
                },
                animation: clipped_bg_animation,
                scrub: 1,
                pin: true,
                pinSpacing: false,
            });

            function set_clipped_bg_wrapper_height() {
                gsap.set(clipped_bg, { height: window.innerHeight });
            }
            window.addEventListener('resize', set_clipped_bg_wrapper_height);
        });



        $(document).find('.pxl-bg-prx-effect-pinned-circle-zoom-clipped').each(function (index, el) {
            const $el = $(el);

            var svg = $el.find('.circle-zoom-mask-svg');
            var img = $el.find('.clipped-bg-circle-pinned');
            let circle = $el.find('.circle-zoom');
            let radius = +circle[0].getAttribute("r");

            gsap.set(img[0], {
                scale: 2
            });

            var tl = gsap.timeline({
                scrollTrigger: {
                    trigger: el,
                    start: "50% 90%",
                    end: "80% 100%",
                    scrub: 2,
                },
                defaults: {
                    duration: 2
                }
            })
                .to(circle[0], {
                    attr: {
                        r: () => radius
                    }
                }, 0)
                .to(img[0], {
                    scale: 1,
                }, 0)
                .to(".circle-inner-layer", {
                    alpha: 0,
                    ease: "power1.in",
                    duration: 1 - 0.25
                }, 0.25);


            window.addEventListener("load", nexros_circle_init);
            window.addEventListener("resize", nexros_circle_resize);
            function nexros_circle_init() {
                nexros_circle_resize();
            }
            function nexros_circle_resize() {
                tl.progress(0);
                var rect = $(el)[0].getBoundingClientRect();
                const rectWidth = rect.width;
                const rectHeight = rect.height
                const dx = rectWidth / 2;
                const dy = rectHeight / 2;
                radius = Math.sqrt(dx * dx + dy * dy);

                tl.invalidate();
                ScrollTrigger.refresh();
            }
        });
    }

    function pxl_progesbar_counter($scope) {
        const $items = $scope.find('.pxl-progressbar-2 .pxl--item');
        if (!$items.length) return;

        $items.each((_, el) => {
            const $wrapper = $(el);
            const value = parseInt($wrapper.data('value')) || 0;
            const $box = $wrapper.find('.stat-box');

            $box.css('height', `${value}px`);
            gsap.set($box[0], { scaleY: 0, opacity: 0, transformOrigin: "bottom" });
        });

        ScrollTrigger.batch($items.toArray(), {
            start: "top 80%",
            once: true,
            onEnter: batch => {
                batch.forEach(el => {
                    const $wrapper = $(el);
                    const value = parseInt($wrapper.data('value')) || 0;
                    const isPercentage = $wrapper.data('is-percentage') === true || $wrapper.data('is-percentage') === "true";

                    const $box = $wrapper.find('.stat-box');
                    const $numberEl = $wrapper.find('.number');
                    const obj = { count: 0 };

                    gsap.to($box[0], {
                        scaleY: 1,
                        opacity: 1,
                        duration: 1.2,
                        ease: "power2.out"
                    });

                    gsap.to(obj, {
                        count: value,
                        duration: 1.2,
                        ease: "power2.out",
                        roundProps: "count",
                        onUpdate: () => {
                            $numberEl.text(isPercentage ? `${obj.count}%` : `${obj.count}`);
                        }
                    });
                });
            }
        });
    }

    function wglPhysicsButton($scope) {
        const {
            Engine,
            Render,
            Runner,
            Bodies,
            Composite,
            MouseConstraint,
            Events,
            Body
        } = Matter;

        const logoArea = $scope[0].querySelector(".pxl-button_physics");
        if (!logoArea) return;

        try {
            const rect = logoArea.getBoundingClientRect();
            const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
            const isVisible = rect.top < viewportHeight && rect.bottom > 0;
            if (!isVisible) {
                if (typeof IntersectionObserver !== 'undefined') {
                    const observer = new IntersectionObserver(function (entries, obs) {
                        for (var i = 0; i < entries.length; i++) {
                            if (entries[i].isIntersecting) {
                                obs.unobserve(entries[i].target);
                                wglPhysicsButton($scope);
                                break;
                            }
                        }
                    }, { root: null, threshold: 0.1 });
                    observer.observe(logoArea);
                } else {
                    var onScroll = function onScroll() {
                        var r = logoArea.getBoundingClientRect();
                        var vh = window.innerHeight || document.documentElement.clientHeight;
                        if (r.top < vh && r.bottom > 0) {
                            window.removeEventListener('scroll', onScroll, { passive: true });
                            wglPhysicsButton($scope);
                        }
                    };
                    window.addEventListener('scroll', onScroll, { passive: true });
                }
                return;
            }
        } catch (e) {
        }

        if (typeof logoArea.destroyPhysics === "function") {
            logoArea.destroyPhysics();
        }

        let settings = [];
        try {
            const dataAttr = logoArea.getAttribute("data-settings");
            settings = dataAttr ? JSON.parse(dataAttr.replace(/&quot;/g, '"')) : [];
        } catch (e) {
            console.error("Invalid data-settings:", e);
            return;
        }

        let icons = [];
        try {
            const dataIcons = logoArea.getAttribute("data-icons");
            icons = dataIcons ? JSON.parse(dataIcons.replace(/&quot;/g, '"')) : [];
        } catch (e) {
            console.error("Invalid data-icons:", e);
        }

        let w = logoArea.offsetWidth;
        let h = logoArea.offsetHeight;

        const engine = Engine.create();
        engine.world.gravity.x = 0;
        engine.world.gravity.y = 0.35;

        const MAX_VELOCITY = 8;
        const VELOCITY_DAMPING = 0.98;

        const render = Render.create({
            element: logoArea,
            engine: engine,
            options: {
                width: w,
                height: h,
                background: "rgba(0,0,0,0)",
                wireframes: false,
                pixelRatio: window.devicePixelRatio
            }
        });

        const wallOptions = { isStatic: true, render: { visible: false } };
        const ceiling = Bodies.rectangle(w / 2, -10, w, 10, wallOptions);
        const ground = Bodies.rectangle(w / 2, h + 10, w, 10, wallOptions);
        const leftWall = Bodies.rectangle(-10, h / 2, 10, h, wallOptions);
        const rightWall = Bodies.rectangle(w + 10, h / 2, 10, h, wallOptions);

        const shapes = [];

        const cols = Math.ceil(Math.sqrt(settings.length));
        const spacingX = w / (cols + 1);
        const spacingY = 100;

        settings.forEach((value, index) => {
            const col = index % cols;
            const row = Math.floor(index / cols);
            const x = spacingX * (col + 1);
            const y = 60 + row * spacingY;

            const textElement = document.createElement("p");
            textElement.className = "pxl-throwable-element";
            Object.assign(textElement.style, {
                opacity: "1",
                position: "absolute",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                textAlign: "center",
                pointerEvents: "none",
                whiteSpace: "nowrap"
            });

            let iconNode = null;
            const iconData = Array.isArray(icons) ? icons[index] : null;
            try {
                const isString = (v) => typeof v === 'string' && v.trim().length > 0;
                const looksLikeSvg = (v) => isString(v) && v.trim().startsWith('<');
                const looksLikeUrl = (v) =>
                    isString(v) &&
                    (/^(https?:)?\/\//.test(v) || /\.(svg|png|jpe?g|gif|webp)(\?.*)?$/i.test(v));

                const makeSvgNode = (svgStr) => {
                    const span = document.createElement('span');
                    span.className = 'pxl-icon-svg';
                    span.style.display = 'inline-flex';
                    span.style.alignItems = 'center';
                    span.innerHTML = svgStr;
                    const svg = span.querySelector('svg');
                    if (svg) {
                        svg.setAttribute('width', 'clamp(40px, 22vw, 150px)');
                        svg.setAttribute('height', 'clamp(40px, 22vw, 150px)');
                        svg.style.width = 'clamp(40px, 22vw, 150px)';
                        svg.style.height = 'clamp(40px, 22vw, 150px)';
                        svg.style.border = '1px solid rgba(255, 255, 255, 0.30)';
                        svg.style.borderRadius = '50%';
                        svg.style.display = 'block';
                        svg.style.verticalAlign = 'middle';
                        svg.style.pointerEvents = 'none';
                    }
                    return span;
                };
                const makeImgNode = (url) => {
                    const container = document.createElement('div');
                    container.style.width = 'clamp(40px, 22vw, 150px)';
                    container.style.height = 'clamp(40px, 22vw, 150px)';
                    container.style.border = '1px solid rgba(255, 255, 255, 0.30)';
                    container.style.borderRadius = '50%';
                    container.style.display = 'flex';
                    container.style.alignItems = 'center';
                    container.style.justifyContent = 'center';
                    container.style.overflow = 'hidden';

                    const img = document.createElement('img');
                    img.src = url;
                    img.alt = '';
                    img.style.width = 'clamp(30px, 11vw, 50%)';
                    img.style.height = 'clamp(30px, 11vw, 50%)';
                    img.style.objectFit = 'contain';
                    img.style.objectPosition = 'center';
                    img.style.display = 'block';

                    container.appendChild(img);
                    return container;
                };
                const makeClassIcon = (cls) => {
                    const i = document.createElement('i');
                    i.className = cls.trim();
                    i.style.fontSize = 'clamp(40px, 22vw, 150px)';
                    i.style.border = '1px solid rgba(255, 255, 255, 0.30)';
                    i.style.lineHeight = '1';
                    i.style.borderRadius = '50%';
                    return i;
                };

                if (iconData && typeof iconData === 'object') {
                    const rawValue = iconData.value || iconData.class || null;
                    const svgStr = iconData.svg || iconData.SVG || null;
                    const urlVal = iconData.url || iconData.URL || null;

                    if (looksLikeSvg(svgStr)) iconNode = makeSvgNode(svgStr);
                    else if (urlVal && looksLikeUrl(urlVal)) iconNode = makeImgNode(urlVal);
                    else if (isString(rawValue)) {
                        if (looksLikeSvg(rawValue)) iconNode = makeSvgNode(rawValue);
                        else if (looksLikeUrl(rawValue)) iconNode = makeImgNode(rawValue);
                        else iconNode = makeClassIcon(rawValue);
                    } else if (rawValue && typeof rawValue === 'object') {
                        const nestedUrl = rawValue.url || rawValue.URL || null;
                        const nestedSvg = rawValue.svg || rawValue.SVG || null;
                        if (looksLikeSvg(nestedSvg)) iconNode = makeSvgNode(nestedSvg);
                        else if (nestedUrl && looksLikeUrl(nestedUrl)) iconNode = makeImgNode(nestedUrl);
                    }
                } else if (isString(iconData)) {
                    if (looksLikeSvg(iconData)) iconNode = makeSvgNode(iconData);
                    else if (looksLikeUrl(iconData)) iconNode = makeImgNode(iconData);
                    else iconNode = makeClassIcon(iconData);
                }
            } catch (e) {
            }

            const spanElement = document.createElement("span");
            spanElement.className = "span-element-rot";
            spanElement.textContent = value;

            if (iconNode) textElement.appendChild(iconNode);
            textElement.appendChild(spanElement);

            const hasText = typeof value === 'string' && value.trim().length > 0;
            const hasIcon = !!iconNode;
            textElement.style.padding = hasIcon && !hasText ? "0" : "clamp(10px, 3.7vw, 27px) clamp(20px, 7.2vw, 48px)";
            textElement.style.borderRadius = hasText && !hasIcon ? "46.75px" : "0";
            textElement.style.border = hasText && !hasIcon ? "1px solid rgba(255, 255, 255, 0.30)" : "0";
            logoArea.appendChild(textElement);

            const measuredWidth = Math.max(40, Math.ceil(textElement.offsetWidth));
            const measuredHeight = Math.max(24, Math.ceil(textElement.offsetHeight));

            const commonOpts = {
                restitution: 0.2,
                friction: 0.3,
                frictionStatic: 0.8,
                frictionAir: 0.02,
                slop: 0.001,
                render: { visible: false }
            };

            let body;
            if (!hasText) {
                const radius = Math.max(8, Math.ceil(Math.max(measuredWidth, measuredHeight) / 2));
                body = Bodies.circle(x, y, radius, commonOpts);
            } else {
                const chamferRadius = Math.min(Math.floor(measuredHeight / 2), 22);
                const wBody = measuredWidth > 100 ? measuredWidth - 1 : measuredWidth;
                const hBody = measuredHeight > 100 ? measuredHeight - 1 : measuredHeight;
                body = Bodies.rectangle(x, y, wBody, hBody, {
                    ...commonOpts,
                    chamfer: { radius: chamferRadius }
                });
            }

            setTimeout(() => {
                const angle = Math.random() * Math.PI * 2;
                const forceMagnitude = 0.02 + Math.random() * 0.03;
                Body.applyForce(body, body.position, {
                    x: Math.cos(angle) * forceMagnitude,
                    y: Math.sin(angle) * forceMagnitude
                });
            }, Math.random() * 1000);

            shapes.push({ body, element: textElement });
        });

        const mouseControl = MouseConstraint.create(engine, {
            element: logoArea,
            constraint: { render: { visible: false } }
        });

        logoArea.addEventListener('wheel', (e) => {
        }, { passive: true });

        logoArea.addEventListener('mousedown', (e) => {
            if (e.button === 1) { // Middle mouse button
                e.preventDefault();
            }
        });

        logoArea.addEventListener('touchstart', (e) => {
        }, { passive: true });

        logoArea.addEventListener('touchmove', (e) => {

        }, { passive: true });

        Composite.add(engine.world, [
            ground, ceiling, rightWall, leftWall,
            mouseControl, ...shapes.map(s => s.body)
        ]);

        Render.run(render);
        const runner = Runner.create();
        Runner.run(runner, engine);

        Events.on(engine, "afterUpdate", () => {
            shapes.forEach(({ body, element }) => {
                const velocity = body.velocity;
                const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);

                if (speed > MAX_VELOCITY) {
                    const scale = MAX_VELOCITY / speed;
                    Body.setVelocity(body, {
                        x: velocity.x * scale,
                        y: velocity.y * scale
                    });
                }

                if (speed > 3) {
                    Body.setVelocity(body, {
                        x: velocity.x * VELOCITY_DAMPING,
                        y: velocity.y * VELOCITY_DAMPING
                    });
                }

                const buffer = 100;
                const isOutOfBounds =
                    body.position.x < -buffer ||
                    body.position.x > w + buffer ||
                    body.position.y > h + buffer;

                if (isOutOfBounds) {
                    Body.setPosition(body, {
                        x: Math.max(buffer, Math.min(w - buffer, body.position.x)),
                        y: Math.max(buffer, Math.min(h - buffer, body.position.y))
                    });
                    Body.setVelocity(body, { x: 0, y: 0 });
                }

                element.style.display = isOutOfBounds ? "none" : "block";
                element.style.left = `${body.position.x}px`;
                element.style.top = `${body.position.y}px`;
                element.style.transform = `translate(-50%, -50%) rotate(${body.angle}rad)`;
            });
        });

        const resizeHandler = () => {
            w = logoArea.offsetWidth;
            h = logoArea.offsetHeight;
            render.canvas.width = w;
            render.canvas.height = h;
            render.options.pixelRatio = window.devicePixelRatio;

            Body.setPosition(ceiling, { x: w / 2, y: -10 });
            Body.setPosition(ground, { x: w / 2, y: h + 10 });
            Body.setPosition(leftWall, { x: -10, y: h / 2 });
            Body.setPosition(rightWall, { x: w + 10, y: h / 2 });
        };
        window.addEventListener("resize", resizeHandler);

        logoArea.destroyPhysics = function () {
            Render.stop(render);
            Runner.stop(runner);
            Composite.clear(engine.world);
            Engine.clear(engine);
            render.canvas.remove();
            render.textures = {};
            shapes.forEach(({ element }) => {
                if (element && element.parentNode) {
                    element.parentNode.removeChild(element);
                }
            });
            window.removeEventListener("resize", resizeHandler);
        };
    }


    function nexros_scroll_line_gradient($scope) {
        if (typeof SplitText === 'undefined' || typeof gsap === 'undefined') {
            console.warn('nexros_scroll_line_gradient: SplitText or GSAP not available');
            return;
        }

        $scope.find(".pxl-heading .pxl-item--title.style-linear").each(function () {
            const $container = $(this).find(".pxl-item--text");

            if (!$container.length || !$container[0]) {
                return;
            }

            try {
                const lines_list = new SplitText($container[0], {
                    type: "lines",
                    linesClass: "split-line"
                });

                const tl = gsap.timeline({
                    scrollTrigger: {
                        trigger: $container[0],
                        toggleActions: "play pause reverse pause",
                        start: "top 86%",
                        end: "top 40%",
                        scrub: 0.7,
                        onRefresh: () => {
                            if (lines_list.lines.length === 0) {
                                lines_list.split();
                            }
                        }
                    }
                });

                lines_list.lines.forEach((line) => {
                    tl.fromTo(
                        line,
                        { backgroundPosition: "100% 100%" },
                        {
                            backgroundPosition: "0% 100%",
                            duration: 0.5,
                            ease: "none"
                        },
                        ">0"
                    );
                });

                $container[0]._splitTextInstance = lines_list;
                $container[0]._gsapTimeline = tl;

            } catch (error) {
                console.error('nexros_scroll_line_gradient error:', error);
            }
        });
    }

    function nexros_progressbar_handler($scope) {
        elementorFrontend.waypoint($scope.find('.pxl-progress-bar'), function () {
            $(this).progressbar();
        });
        elementorFrontend.waypoint($scope.find('.pxl-progressbar.circle'), function () {
            var $progressbarElem = $scope.find(".pxl-progressbar-container"),
                $progressbarElemInner = $scope.find(".pxl-progressbar-inner"),
                settings = $progressbarElem.data("settings"),
                length = settings.circle_percent,
                number = settings.circle_number,
                prefix = settings.prefix,
                suffix = settings.suffix,
                speed = settings.speed;
            if (length > 100)
                length = 100;

            $progressbarElem.prop({
                'percent': 0
            }).animate({
                percent: number
            }, {
                duration: speed,
                easing: 'linear',
                step: function (percent) {
                    var rotate = (100 - percent);
                    var rotate1 = (percent + 8);
                    $progressbarElem.find(".js-progress-bar").css('stroke-dashoffset', rotate);
                    $progressbarElem.find(".js-progress-bar1").css('stroke-dashoffset', rotate1);
                }
            });

            $progressbarElemInner.prop({
                'counter': 0,
            }).animate({
                counter: number,
            }, {
                duration: speed,
                easing: 'linear',
                step: function (counter) {
                    $progressbarElem.find(".progress-percentage").text(prefix + Math.ceil(counter) + suffix);
                }
            });

        });
    }

    function nexros_process_animation($scope) {
        const processContainer = $scope.find('.pxl-process2');
        if (!processContainer.length) return;

        if (window.innerWidth <= 767) return;

        const getTriggerOffset = () => {
            if (window.innerWidth <= 991) return 80;
            if (window.innerWidth <= 1199) return 120;
            return 150;
        };

        processContainer.find(".pxl-item--inner").each(function () {
            const $item = $(this);
            const number = $item.find(".pxl-item--step")[0];
            const line = $item.find(".pxl-item--line")[0];
            const content = $item.find(".pxl-item--content")[0];
            const triggerOffset = getTriggerOffset();

            if (!number || !content) return;

            gsap.set(number, { scale: 0, opacity: 0 });
            gsap.set(content, { opacity: 0, xPercent: 100 });

            const tl = gsap.timeline({
                scrollTrigger: {
                    trigger: $item[0],
                    start: `top+=${triggerOffset} bottom`,
                    end: `top+=${triggerOffset} 40%`,
                    scrub: 1,
                }
            });

            tl.to(number, {
                scale: 1,
                opacity: 1,
                duration: 0.4,
                ease: "back.out(1.7)"
            });

            tl.to(line, { height: "100%", duration: 0.8, ease: "power3.inOut" }, "-=0.4");

            tl.to(content, {
                opacity: 1,
                xPercent: 0,
                duration: 0.8,
                ease: "power2.out"
            }, "-=0.4");

        });

        if (typeof ScrollTrigger !== 'undefined') {
            ScrollTrigger.refresh();
        }
    }

    function renderOrbit($scope) {
        $scope.find(".orbit").each(function () {
            const $orbit = $(this);
            const settings = $orbit.data("settings") || {};
            const size = settings.size || 70;
            const count = settings.count || 1;
            const type = settings.type || "dot"; // "dot" | "icon" | "both" 
            const icons = Array.isArray(settings.icons) ? settings.icons : [];
            const iconClass = settings.iconClass || "green";
            const randomStart = !!settings.randomStart;
            const dotColors = Array.isArray(settings.dotColors) ? settings.dotColors.filter(Boolean) : [];
            const useRandomColor = settings.randomColor && dotColors.length === 0;

            $orbit.css("--d", size + "%").empty();

            const fragment = $(document.createDocumentFragment());

            const createItem = (makeIcon, idx) => {
                const dur = (6 + Math.random() * 6).toFixed(1) + "s";
                const $rot = $("<div>", { class: "rotator" }).css("--dur", dur);
                if (Math.random() > .5) $rot.addClass("reverse");

                let $item;
                if (makeIcon) {
                    let iconChar = icons.length ? icons[idx % icons.length] : "⭐";
                    const isSvg = (typeof iconChar === "string") && iconChar.trim().startsWith("<");
                    $item = $("<div>", {
                        class: `item icon ${iconClass}${isSvg ? " is-svg" : ""}`
                    }).html(isSvg ? iconChar : iconChar);
                } else {
                    $item = $("<div>", { class: "item dot" });
                }
                return $rot.append($item);
            };

            for (let i = 0; i < count; i++) {
                switch (type) {
                    case "both":
                        fragment.append(createItem(false, i), createItem(true, i));
                        break;
                    case "icon":
                        fragment.append(createItem(true, i));
                        break;
                    default:
                        fragment.append(createItem(false, i));
                }
            }

            $orbit.append(fragment);

            const $rotators = $orbit.find(".rotator");
            const c = $rotators.length;
            $rotators.each(function (i) {
                const start = randomStart ? (Math.random() * 360) : ((360 / c) * i);
                $(this).css("--start", start + "deg");
            });

            const randCol = () => '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
            let colorIdx = 0;

            $orbit.find('.item').each(function () {
                const $it = $(this);
                let color = null;

                if (dotColors.length) {
                    color = dotColors[colorIdx++ % dotColors.length];
                } else if (useRandomColor) {
                    color = randCol();
                }

                if (color) {
                    if ($it.hasClass('dot')) {
                        $it.css({ borderColor: color, backgroundColor: color });
                    } else if ($it.hasClass('icon')) {
                        if ($it.hasClass('is-svg')) {
                            $it.find('svg, path, circle, rect, polygon, polyline, ellipse, line')
                                .css({ fill: color, color });
                        } else {
                            $it.css('color', color);
                        }
                    }
                }
            });
        });
    }

    $window.on('elementor/frontend/init', function () {
        elementorFrontend.hooks.addAction('frontend/element_ready/global', function ($scope) {
            nexros_scroll_checkp($scope);
            nexros_animation_handler($scope);
            renderOrbit($scope);
        });

        nexros_section_start_render();
        nexros_parallax_bg();
        nexros_css_inline_js();
        nexros_section_before_render();
        nexros_zoom_point();
        nexros_scroll_fixed_section();

        const widgetHandlers = {
            'pxl_contact_form.default': [PXL_Icon_Contact_Form],
            'pxl_heading.default': [
                nexros_split_text,
                nexros_scroll_line_gradient
            ],
            'pxl_sphere.default': [pxl_widget_sphere_handler],
            'pxl_post_slip.default': [nexros_split_text],
            'pxl_section_scale.default': [nexros_scroll_trigger],
            'pxl_logo_marquee.default': [nexros_logo_marquee],
            'pxl_progressbar.default': [
                pxl_progesbar_counter,
                nexros_progressbar_handler
            ],
            'physics_item.default': [wglPhysicsButton],
            'pxl_text_marquee.default': [nexros_text_marquee],
            'pxl_process.default': [nexros_process_animation]
        };

        Object.keys(widgetHandlers).forEach(widgetName => {
            widgetHandlers[widgetName].forEach(handler => {
                elementorFrontend.hooks.addAction(
                    `frontend/element_ready/${widgetName}`,
                    handler
                );
            });
        });
    });
})(jQuery);
