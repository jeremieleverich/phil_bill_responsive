
$(document).on('ready', function () {
    calcResize();
    
    $(window).on('scroll', function () {
        var //scalefactor = parent.$('#stripFrame').height() / $('article').height(),
            scalefactor = (window.scalefactor ? window.scalefactor : 1),
            scrollleft = $(window).scrollLeft() / scalefactor;
        var rightline = scrollleft + $(window).width(), leftline = scrollleft + ($(window).width() * 1);

       // console.log(leftline);
        
        $('.sm-firefunction').each(function () {
            var transitionline = parseInt($(this).attr('data-transition-line'));
            if (transitionline <= leftline && !$(this).hasClass('function-fired')) {
                $(this).addClass('function-fired');
                this.func = eval($(this).data('function'));
                this.func();
            }
        });

        $('.sm-animate').each(function () {
            var transitionline = parseInt($(this).attr('data-transition-line'));
            var pct = (transitionline - leftline) / (rightline - leftline);
            pct = Math.max(Math.min(pct, 1), 0);
            var func = eval($(this).attr('data-function'));
            func.apply(this, [$(this), pct]);
        });

        $('.sm-transition').each(function () {
            var transitionline = parseInt($(this).attr('data-transition-line'));
            if (transitionline <= leftline) {
                $(this).addClass('do-transition');
                if ($(this).is('.sm-transition-slide-up'))
                    $(this).css({ bottom: 0 });
            } else if (transitionline >= rightline) {
                $(this).removeClass('do-transition');
                if ($(this).is('.sm-transition-slide-up'))
                    $(this).css({ bottom: -($(this).height()) });
            }
        });

        $('.sm-pers-header').each(function () {
            var $header = $(this),
                $parent = $header.parent(),
                parenttop = $parent.position().top;
                parentleft = $parent.offset().left / scalefactor,
                parentwidth = $parent.outerWidth(true),
                rel_scroll_left = scrollleft - parentleft,
                headerwidth = $header.outerWidth(true);

            if ($header.hasClass('follow')) {
                if (rel_scroll_left + headerwidth >= parentwidth) {
                    $header.removeClass('follow');
                    $header.addClass('fixed-right');
                    $header.css({ transform: 'scale(' + 1 + ')', top: 0 })
                }
                else if (rel_scroll_left < 0) {
                    $header.removeClass('follow');
                    $header.css({ transform: 'scale(' + 1 + ')', top: 0 })
                }
            }

            else if ((scrollleft > parentleft) && (scrollleft < (parentleft + parentwidth - headerwidth))) {
                $header.removeClass('fixed-right');
                $header.addClass('follow');
                $header.css("top", parenttop);
                doRescale();
                rescaleContent();
            }
        });

        //function rotateKeyboard() {
        //    $('.keyboard').each(function () {
        //        var transitionline = parseInt($(this).attr('data-transition-line'));
        //        if (transitionline <= leftline) {
        //            $(this).addClass('do-transition');
        //            if ($(this).is('.keyboardRotate'));
        //            $(this).addClass('keyboardRotate');
        //        } 
        //    });
        //}

        function animateBullets_01 () {
            $('#panel-04 > div:nth-of-type(2)').animate({ 'top': '140px' }, 750);
        }
        function animateBullets_02() {
            $('#panel-04 > div:nth-of-type(3)').animate({ 'top': '140px' }, 750);
        }
        function animateBullets_03() {
            $('#panel-04 > div:nth-of-type(4)').animate({ 'top': '140px' }, 750);
        }
    }).trigger('scroll');
});

$(window).on('resize', function () {
    calcResize();
    $(window).trigger('scroll');
});

function calcResize() {
    $('.sm-transition, .sm-firefunction, .sm-animate, .sm-pers-header').each(function () {
        if ($(this).is(':visible')) {
            var o = parseInt($(this).attr('data-transition-left-offset'));
            if (isNaN(o)) o = 0;
            $(this).attr('data-transition-line', ($(this).offset().left + o) / scalefactor);
            if ($(this).is('.sm-transition-slide-up')) {
                $(this).attr('data-bottom-min', 0).attr('data-bottom-max', $(this).height());
            }
        }
    });
}