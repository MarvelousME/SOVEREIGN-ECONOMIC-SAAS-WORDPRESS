(function( $ ) {
    
    $( document ).ready( function() {
        var ParallaxScroll = {
            /* PUBLIC VARIABLES */
            showLogs: false,
            round: 1000,

            /* PUBLIC FUNCTIONS */
            init: function() {
                this._log("init");
                if (this._inited) {
                    this._log("Already Inited");
                    return;
                }
                this._inited = true;
                this._requestAnimationFrame = (function(){
                  return  window.requestAnimationFrame       || 
                          window.webkitRequestAnimationFrame || 
                          window.mozRequestAnimationFrame    || 
                          window.oRequestAnimationFrame      || 
                          window.msRequestAnimationFrame     || 
                          function(/* function */ callback, /* DOMElement */ element){
                              window.setTimeout(callback, 1000 / 60);
                          };
                })();
                this._cacheOffsets(true);
                var self = this;
                this._resizeHandler = this._debounce(function(){ self._cacheOffsets(true); }, 150);
                $(window).on('resize orientationchange', this._resizeHandler);
                this._onScroll(true);
            },

            /* PRIVATE VARIABLES */
            _inited: false,
            _properties: ['x', 'y', 'z', 'rotateX', 'rotateY', 'rotateZ', 'scaleX', 'scaleY', 'scaleZ', 'scale'],
            _requestAnimationFrame:null,
            _elements: null,
            _resizeHandler: null,
            _lastScroll: 0,
            _lastTs: 0,

            /* PRIVATE FUNCTIONS */
            _log: function(message) {
                if (this.showLogs) console.log("Parallax Scroll / " + message);
            },
            _debounce: function(func, wait) {
                var timeout;
                return function() {
                    var context = this, args = arguments;
                    clearTimeout(timeout);
                    timeout = setTimeout(function(){ func.apply(context, args); }, wait);
                };
            },
            _cacheOffsets: function(force) {
                var $els = this._elements || $("[data-parallax]");
                this._elements = $els;
                $els.each(function(idx, el){
                    var $el = $(el);
                    // Cache starting inline style and add GPU hint once
                    var baseStyle = $el.data("style");
                    if (baseStyle == undefined) {
                        baseStyle = $el.attr("style") || "";
                        if (baseStyle.indexOf('will-change') === -1) {
                            baseStyle = "will-change: transform; " + baseStyle;
                        }
                        $el.data("style", baseStyle);
                    }
                    if (force || $el.data('_offsetTop') == undefined) {
                        var off = $el.offset();
                        $el.data('_offsetTop', off ? off.top : 0);
                    }
                });
            },
            _onScroll: function(noSmooth) {
                var scroll = $(document).scrollTop();
                var windowHeight = $(window).height();
                this._log("onScroll " + scroll);
                var now = Date.now();
                if (this._lastTs === 0) this._lastTs = now;
                var dt = Math.max(1, now - this._lastTs);
                var dScroll = Math.abs(scroll - this._lastScroll);
                var velocity = dScroll / dt; // px per ms
                var isFastScroll = velocity > 1; // > ~1000px/s
                this._lastScroll = scroll;
                this._lastTs = now;
                (this._elements || $("[data-parallax]")).each($.proxy(function(index, el) {
                    var $el = $(el);
                    var properties = [];
                    var applyProperties = false;
                    var style = $el.data("style");
                    if (style == undefined) {
                        style = $el.attr("style") || "";
                        if (style.indexOf('will-change') === -1) {
                            style = "will-change: transform; " + style;
                        }
                        $el.data("style", style);
                    }
                    var datas = [$el.data("parallax")];
                    var iData;
                    for(iData = 2; ; iData++) {
                        if($el.data("parallax"+iData)) {
                            datas.push($el.data("parallax-"+iData));
                        }
                        else {
                            break;
                        }
                    }
                    var datasLength = datas.length;
                    for(iData = 0; iData < datasLength; iData ++) {
                        var data = datas[iData];
                        var scrollFrom = data["from-scroll"];
                        var scrollFromCustom = data["from-scroll-custom"];
                        if (scrollFrom == undefined){
                            //scrollFrom = Math.max(0, $(el).offset().top - (windowHeight / 2) );
                            var elTop = $el.data('_offsetTop');
                            if (elTop == undefined) {
                                var off = $el.offset();
                                elTop = off ? off.top : 0;
                                $el.data('_offsetTop', elTop);
                            }
                            if(scrollFromCustom != undefined)
                                scrollFrom = Math.max(0, elTop - scrollFromCustom );
                            else
                                scrollFrom = Math.max(0, elTop - windowHeight );
                        } 
                        scrollFrom = scrollFrom | 0;
                        var scrollDistance = data["distance"];
                        var scrollTo = data["to-scroll"];
                        if (scrollDistance == undefined && scrollTo == undefined) scrollDistance = windowHeight;
                        scrollDistance = Math.max(scrollDistance | 0, 1);
                        var easing = data["easing"];
                        var easingReturn = data["easing-return"];
                        if (easing == undefined || !$.easing|| !$.easing[easing]) easing = null;
                        if (easingReturn == undefined || !$.easing|| !$.easing[easingReturn]) easingReturn = easing;
                        if (easing) {
                            var totalTime = data["duration"];
                            if (totalTime == undefined) totalTime = scrollDistance;
                            totalTime = Math.max(totalTime | 0, 1);
                            var totalTimeReturn = data["duration-return"];
                            if (totalTimeReturn == undefined) totalTimeReturn = totalTime;
                            scrollDistance = 1;
                            var currentTime = $el.data("current-time");
                            if(currentTime == undefined) currentTime = 0;
                        }
                        if (scrollTo == undefined) scrollTo = scrollFrom + scrollDistance;
                        scrollTo = scrollTo | 0;
                        var smoothness = data["smoothness"];
                        if (smoothness == undefined) smoothness = 30; // reduce base lag
                        var lagFactor = data["lag"]; // optional multiplier, 0 disables smoothing
                        if (lagFactor != undefined) {
                            lagFactor = parseFloat(lagFactor);
                            if (!isNaN(lagFactor)) {
                                if (lagFactor <= 0) smoothness = 1; else smoothness = Math.max(1, Math.round(smoothness * lagFactor));
                            }
                        }
                        smoothness = smoothness | 0;
                        if (noSmooth || smoothness == 0) smoothness = 1;
                        if (isFastScroll) smoothness = Math.max(1, Math.round(smoothness / 4));
                        smoothness = smoothness | 0;
                        var scrollCurrent = scroll;
                        scrollCurrent = Math.max(scrollCurrent, scrollFrom);
                        scrollCurrent = Math.min(scrollCurrent, scrollTo);
                        if(easing) {
                            if($el.data("sens") == undefined) $el.data("sens", "back");
                            if(scrollCurrent>scrollFrom) {
                                if($el.data("sens") == "back") {
                                    currentTime = 1;
                                    $el.data("sens", "go");
                                }
                                else {
                                    currentTime++;
                                }
                            }
                            if(scrollCurrent<scrollTo) {
                                if($el.data("sens") == "go") {
                                    currentTime = 1;
                                    $el.data("sens", "back");
                                }
                                else {
                                    currentTime++;
                                }
                            }
                            if(noSmooth) currentTime = totalTime;
                            $el.data("current-time", currentTime);
                        }
                        this._properties.map($.proxy(function(prop) {
                            var defaultProp = 0;
                            var to = data[prop];
                            if (to == undefined) return;
                            if(prop=="scale" || prop=="scaleX" || prop=="scaleY" || prop=="scaleZ" ) {
                                defaultProp = 1;
                            }
                            else {
                                to = to | 0;
                            }
                            var prev = $el.data("_" + prop);
                            if (prev == undefined) prev = defaultProp;
                            var next = ((to-defaultProp) * ((scrollCurrent - scrollFrom) / (scrollTo - scrollFrom))) + defaultProp;
                            var val = prev + (next - prev) / smoothness;
                            if(easing && currentTime>0 && currentTime<=totalTime) {
                                var from = defaultProp;
                                if($el.data("sens") == "back") {
                                    from = to;
                                    to = -to;
                                    easing = easingReturn;
                                    totalTime = totalTimeReturn;
                                }
                                val = $.easing[easing](null, currentTime, from, to, totalTime);
                            }
                            val = Math.ceil(val * this.round) / this.round;
                            if(val==prev&&next==to) val = to;
                            if(!properties[prop]) properties[prop] = 0;
                            properties[prop] += val;
                            if (prev != properties[prop]) {
                                $el.data("_" + prop, properties[prop]);
                                applyProperties = true;
                            }
                        }, this));
                    }
                    if (applyProperties) {
                        if (properties["z"] != undefined) {
                            var perspective = data["perspective"];
                            if (perspective == undefined) perspective = 800;
                            var $parent = $el.parent();
                            if(!$parent.data("style")) $parent.data("style", $parent.attr("style") || "");
                            $parent.attr("style", "perspective:" + perspective + "px; -webkit-perspective:" + perspective + "px; "+ $parent.data("style"));
                        }
                        if(properties["scaleX"] == undefined) properties["scaleX"] = 1;
                        if(properties["scaleY"] == undefined) properties["scaleY"] = 1;
                        if(properties["scaleZ"] == undefined) properties["scaleZ"] = 1;
                        if (properties["scale"] != undefined) {
                            properties["scaleX"] *= properties["scale"];
                            properties["scaleY"] *= properties["scale"];
                            properties["scaleZ"] *= properties["scale"];
                        }
  
                        var translate3d = "translate3d(" + (properties["x"] ? properties["x"] : 0) + "px, " + (properties["y"] ? properties["y"] : 0) + "px, " + (properties["z"] ? properties["z"] : 0) + "px)";
                        var rotate3d = "rotateX(" + (properties["rotateX"] ? properties["rotateX"] : 0) + "deg) rotateY(" + (properties["rotateY"] ? properties["rotateY"] : 0) + "deg) rotateZ(" + (properties["rotateZ"] ? properties["rotateZ"] : 0) + "deg)";
                        var scale3d = "scaleX(" + properties["scaleX"] + ") scaleY(" + properties["scaleY"] + ") scaleZ(" + properties["scaleZ"] + ")";
                        var cssTransform = translate3d + " " + rotate3d + " " + scale3d + ";";
                        this._log(cssTransform);
                        $el.attr("style", "transform:" + cssTransform + " -webkit-transform:" + cssTransform + " " + style);
                    }
                }, this));
                if(window.requestAnimationFrame) {
                    window.requestAnimationFrame($.proxy(this._onScroll, this, false));
                }
                else {
                    this._requestAnimationFrame($.proxy(this._onScroll, this, false));
                }
            }
        };
        if($(window).innerWidth() >= 1200){
            ParallaxScroll.init();
        }
    });
})(jQuery);