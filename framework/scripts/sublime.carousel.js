(function ($) {
    $.fn.extend({
        sublimeCarousel: function (params) {

            // This helps iscolate the plugin to only run on indivual elements on not multiples in the same call. The function that runs this is at the bottom.
            this.init = function (params) {


                // DEFAULTS
                var
					defaults = {
					    cloneJumpButtons: true,
					    transition: 'slide',
					    direction: 'horizontal'
					};

                $.extend(defaults, params);


                // VARIABLES
                var

					carousel = this,
					$this = $(carousel),
					$slides = $this.find('.sublime-carousel-slides'),
					$slide = $slides.find('.sublime-carousel-slide'),
					$container = $slide.parent(),
					$nav = $this.find('.sublime-carousel-navigation'),
					$prev = $nav.find('.sublime-carousel-previous'),
					$next = $nav.find('.sublime-carousel-next'),
					$jump = $nav.find('.sublime-carousel-jump'),
					currentSlide = 0,
					destinationSlide = 0,
					maxSlides = $slide.not('.sublime-carousel-disabled').length,
					jumpIndexOffset = $jump.index(),
					width = $slides.width(),
					height,
					directionTypes = {
					    horizontal: {
					        property: 'left',
					        dimension: function () { return width },
					        slide: 'left'
					    },
					    vertical: {
					        property: 'top',
					        dimension: function () { return height },
					        slide: 'none'
					    }
					},
					transitionTypes = {
					    slide: {
					        property: directionTypes[defaults.direction].property,
					        speed: 500,
					        easing: 'easeOutSine'
					    },
					    fade: {
					        property: 'opacity',
					        speed: 250,
					        easing: 'linear'
					    }
					},
					easingTypes = {
					    'easeOutQuint': 'ease', // cubic-bezier(0.23,1,0.32,1) : cubic-bezier(0.25, 1, 0.25, 1)
					    'linear': 'linear', // cubic-bezier(0,0,1,1) : cubic-bezier(0,0,1,1)
					    'easeInSine': 'ease-in', // cubic-bezier(0.47,0,0.745,0.715) : cubic-bezier(0.42,0,1,1)
					    'easeOutSine': 'ease-out', // cubic-bezier(0.39,0.575,0.565,1) : cubic-bezier(0,0,0.58,1)
					    'easeinOutSine': 'ease-in-out' // cubic-bezier(0.445,0.05,0.55,0.95) : cubic-bezier(0.42,0,0.58,1)
					},

					eventTypes = {
					    lastslide: 'reached-last-slide',
					    slidechange: 'slide-changed'
					},
					transition;

                transition = {
                    property: transitionTypes[defaults.transition].property,
                    speed: transitionTypes[defaults.transition].speed,
                    easing: transitionTypes[defaults.transition].easing
                }


                // FUNCTIONS: PRIVATE
                var
                    resizeTimeout,
                    hackysecondTimeout,
                    timeoutFunction = function () {
                        if (width !== $slides.width() || height !== $slides.height()) {
                            width = $slides.width();
                            height = getRatio();
                            var obj = {};
                            obj[transition.property] = -(Number(directionTypes[defaults.direction].dimension()) * currentSlide);
                            //console.log(obj);
                            $container.css({ 'transition': 'none' });
                            $container.css(obj);
                            resetCarousel();
                        }
                    },
                    windowResized = function () {
                        clearTimeout(resizeTimeout);
                        clearTimeout(hackysecondTimeout);

                        resizeTimeout = setTimeout(timeoutFunction, 50);
                        hackysecondTimeout = setTimeout(timeoutFunction, 200);
                    };

                var getRatio = function () {
                    return Math.round(($slides.width() / 16) * 9);
                }

                var resetButtons = function () {
                    maxSlides = $slide.not('.sublime-carousel-disabled').length;
                    $prev.removeClass('sublime-carousel-disabled');
                    $next.removeClass('sublime-carousel-disabled');
                    $jump.removeClass('sublime-carousel-selected');
                    if (currentSlide == 0) {
                        $prev.addClass('sublime-carousel-disabled');
                    }
                    if (currentSlide + 1 == maxSlides) {
                        $this.trigger(eventTypes.lastslide);
                        $next.addClass('sublime-carousel-disabled');
                    }
                    $jump.eq((currentSlide) + jumpIndexOffset).addClass('sublime-carousel-selected');
                }

                var resetCarousel = function () {
                    //$this.width(width);
                    var
						h = defaults.direction == 'vertical' ? (height * maxSlides) : height,
						w = defaults.direction == 'horizontal' ? (width * maxSlides) : width;

                    $container.height(h).width(w).css({ 'transition': transition.property + ' ' + (transition.speed / 1000) + 's ' + easingTypes[transition.easing] });
                    $slide.css({ 'max-width': width, 'max-height': height });
                }

                var transitionEnded = function () {
                    currentSlide = destinationSlide;
                    $container.opacity = 0;
                    if (defaults.transition == 'fade' && $container.css('opacity') < 1) {
                        var obj = {};
                        obj['property'] = transition.property;
                        //$container.css({obj: $container.destination});
                        $container.opacity = 1;
                        animate();
                    } else {
                        $this.trigger({ type: eventTypes.slidechange, index: currentSlide });
                    }
                    resetButtons();
                }

                var animate = function () {
                    $container.destination = -(directionTypes[defaults.direction].dimension() * destinationSlide) + 'px';
                    var obj = {};
                    obj[transition.property] = (defaults.transition == 'fade') ? $container.opacity : $container.destination;
                    if (Modernizr.csstransitions) {
                        $container.css(obj);
                    } else {
                        obj['easing'] = transition.easing;
                        $container.animate(obj, Number(transition.speed), transitionEnded);
                    }
                }

                var previousClicked = function (e) {
                    e.preventDefault();
                    previousSlide();
                }

                var nextClicked = function (e) {
                    e.preventDefault();
                    nextSlide();
                }

                var jumpClicked = function (e) {
                    e.preventDefault();
                    jumpToSlide($(this).index() - jumpIndexOffset);
                }


                // FUNCTIONS: PUBLIC via trigger()
                var previousSlide = function () {
                    if (currentSlide > 0) {
                        destinationSlide = currentSlide - 1;
                        animate();
                    }
                }

                var nextSlide = function () {
                    if ((currentSlide + 1) < maxSlides) {
                        destinationSlide = currentSlide + 1;
                        animate();
                    }
                }

                var jumpToSlide = function (index) {
                    destinationSlide = index;
                    animate();
                }

                var enableNextSlide = function () {
                    $slide.eq(currentSlide + 1).removeClass('sublime-carousel-disabled');
                    resetButtons();
                    resetCarousel();
                }


                // PROPERTIES: PUBLIC via trigger
                var onCurrentSlide = function () {
                    return currentSlide;
                }


                // SETUP
                if (defaults.cloneJumpButtons && $jump.length) {
                    for (var j = 1; j < maxSlides; j++) {
                        $jump.clone().insertAfter($jump);
                    }
                    $jump = $nav.find('.sublime-carousel-jump');
                }

                $slides.css({ 'position': 'relative', 'overflow': 'hidden' });
                $container.css({ 'position': 'relative', 'top': '0px', 'left': '0px' });
                $container.opacity = ($container.css('opacity') == 0) ? 1 : 0;
                $slide.css({ 'float': directionTypes[defaults.direction].slide, display: 'inline-block' });
                //commented out below, because it kept slider from centering on page - ChrisG
                //$this.css({ 'display': 'inline-block' });

                //resetButtons();
                //resetCarousel();

                $this.css({ 'visibility': 'visible' });


                // LISTENERS
                carousel.on('previousSlide', previousSlide);
                carousel.on('nextSlide', nextSlide);
                carousel.on('jumpToSlide', function (e) { jumpToSlide(e.index); });
                carousel.on('enableNextSlide', enableNextSlide);
                carousel.on('currentSlide', onCurrentSlide);
                $container.on('oTransitionEnd webkitTransitionEnd msTransitionEnd transitionend', function (e) {
                    if (e.target === this){
                        transitionEnded.call(this);
                    } 
                });

                $(window).resize(windowResized);
                $(window).load(windowResized);

                $prev.on('click.prev', previousClicked);
                //$next.on('click.next', nextClicked);
                //$jump.on('click.jump', jumpClicked);
                //replaced above code with code below  to render buttons disabled without 
                //using disabled property which renders funny in ie9 - ChrisG
                $nav.on('click', '.sublime-carousel-next:not(.disabled)', nextClicked);
                $nav.on('click', '.sublime-carousel-jump:not(.sublime-carousel-disabled)', jumpClicked);

                //windowResized();
                resetButtons();
                resetCarousel();

            }


            // If this has more than one of the same element, apply plugin to each indiviually
            if (this.length > 1) {
                this.each(function () {
                    $(this).sublimeCarousel(params);
                });
            } else {
                this.init(params);
            }
        }
    });
})(jQuery);