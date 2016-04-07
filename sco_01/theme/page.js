/// <reference path="../../framework/scripts/jquery-1.11.0.min.js" />

// User Agent Sniffing 
var ua = window.navigator.userAgent,
    isFirefox = ua.toLowerCase().indexOf('firefox') > -1,
    isChrome = ua.toLowerCase().indexOf('chrome') > -1,
    isiPad = ua.match(/iPad/i) != null,
    isIE = ua.indexOf('MSIE'),
    interactivedWith = new Array(), //stores which buttons have been interactived with
    scoLocation = parent.sco.apiConnector.bookmark('location');

var contentFrame = parent.document.getElementById('contentframe'),
    scrollContainer = $(parent.document).find('html, body');

$(document).ready(function () {
    //make iFrame same height as its content
    resizeContentFrame(contentFrame);
    //scroll window to top
    $(parent.document).scrollTop(0);

    // Initial calls
    alignPage();
    top.iframeLoaded.resolve();
    setTimeout(alignPage, 50);

    // Initial listeners
    $(window).on('resize', alignPage);
    $('body').on('touchstart', function () {
        $(this).click()
    });

    $(document).on('touchstart', 'button, .touchstart div', function (e) {
        //Removing check for scrollable items because it evaluates to true on items 
        //that overflow but are hidden and there is no non-assessment page that has scrolling.
        //If this causes an issue uncomment the bottom check.
        //if (!($(this).parent().get(0).scrollHeight > $(this).parent().height())) {
        $(this).click();
        return false;
        //}
    });

    function alignPage() {
        var maxHeight = parseInt($('#page-align').css('max-height')), windowHeight = $(window).height() - 20,
            top = windowHeight > maxHeight ? (windowHeight - maxHeight) / 2 : 0;
        $('#page-align').css({ top: top });
    }

    //course completion
        //var checkCompletionBtn = parent.sco.apiConnector.bookmark('progressMeasure');
        //if (checkCompletionBtn == 100) {
        //    checkCompletionActions();
        //} else {
        //    var showCompletionBtn = setInterval(function () {
        //        if (checkCompletionBtn != parent.sco.apiConnector.bookmark('progressMeasure')) {
        //            checkCompletionActions();
        //        }
        //    }, 100);
        //}
        //function checkCompletionActions() {
        //    clearInterval(showCompletionBtn);
        //    clearTimeout(completeTimeout);
        //    showCompleteButton();
        //}
        //var completeTimeout = setTimeout(function () {
        //    clearInterval(showCompletionBtn);
        //    showCompleteButton();
        //}, 5000);
        //$('.completion-btn').click(parent.completedButton);
    // END -- COURSE MODULE NAVIGATION/COMPLETION


    //changes button id's name to match anchor name
    $('.next-module button').click(function () {
        var $btnID = $(this).prop('id'),
            scrollID = '#' + $btnID.substring(0, $btnID.indexOf('Anchor'));
        scrollToAnchor(scrollID);
    });


    //Fake audio 
    // audio video initialization
    $('.audio-video').each(function (i, el) {
        var self = $(this);
        var id = $(this).attr('id');
        var video = videojs(id, {
            "controls": true,
        });

        var audio = self.parent().siblings('.custom-audio-controls');
        var seek = audio.find('.js-seek');
        var playButton = $($('.js-audio-play').get(i));
        //console.log(playButton);

        video.ready(function () {
            var thisVideo = this;

            thisVideo.on('timeupdate', function () {
                $('#' + id).parent().prev().find('.js-seek-progress')
                .css('width', thisVideo.currentTime() / thisVideo.duration() * 100 + '%');
            });

            thisVideo.on('play', function (e) {
                if (playButton.hasClass('replay')) playButton.removeClass('replay');
                playButton.addClass('play');
                //$('#' + id).parent().prev().find('.js-seek').addClass('visible');

                $.each(window._V_.players, function (i, player) {
                    if (player !== thisVideo)
                        player.pause();
                });

            });

            thisVideo.on('pause', function (e) {
                playButton.removeClass('play');
                //console.log('paused');
            });

            thisVideo.on('ended', function (e) {
                //console.log('ended');
                playButton.removeClass('play').addClass('replay interacted', function () {
                    var interactedScope = $(this).closest('.sublime-carousel-slide'),
                        allPlayButtons = interactedScope.find('.js-audio-play'),
                        interactedButtons = interactedScope.find('.js-audio-play.interacted');

                    if (allPlayButtons.length === interactedButtons.length) {
                        interactedScope.removeClass('interaction');
                        interactedScope.parents('.carousel').find('.sublime-carousel-next').removeClass('disabled');
                    }
                });

            });

        });

    });

    // =================================
    //  VIDEOJS PSEUDO-AUDIO EVENT HANDLERS
    // =================================

    // Triggers on audio -- PLAYS THE PSEUDO AUDIO. 
    $('.js-audio-play').on('click', function () {
        var self = $(this);
        var scope = self.parent().siblings('.audio-only');
        scope.find('.vjs-play-control').click();
        self.siblings('.js-seek').addClass('visible');
    });

    // Triggers on audio play controls when the user seeks. 
    // SEEK BAR HANDLER
    $('.js-seek').on('click', function (event) {
        var self = $(this);
        var scope = self.parent();
        var audioVideo = scope.next().find('.audio-video');
        var video = videojs(audioVideo.attr('id'));

        //cross-browser variables: needed to function in firefox
        var e = event || window.event;
        var x = e.offsetX || e.layerX || e.clientX - $(this).offset().left;

        video.currentTime((x / self.width()) * video.duration());
    });









    // Parallax Scrolling Background
    $(window.top).on('scroll', function () {
        //console.log('scrolling');
        var scroll = $(this).scrollTop();
        requestAnimationFrame(function () {

            // IF THERE IS ANIMATION TRIGGER CODE ON THIS PAGE. 
            if ($('.js-scroll-trigger').length) {
                var trigger = $(window.top).scrollTop();
                //for each trigger
                $('.js-scroll-trigger').each(function (i, el) {
                    var self = $(this);
                    var triggerPoint = self.position().top;
                    //if element is scrolled to 100px from top of window and the module is not locked
                    if ((trigger + 100) > triggerPoint && !$(this).hasClass('locked')) {
                        self.find('.js-fade-in').each(function (i) {
                            $(this).delay(i * 400).fadeIn(400);
                        });
                        $(this).removeClass('js-scroll-trigger');
                    }
                });
            }
        });
    });



    $('.js-close-btn').click(function (e) {
        var closeBtn = $(e.target);
        var lightbox = closeBtn.closest('.lightbox');

        lightbox.fadeOut();
    });

    $('.js-review-profiles').click(function (e) {
        var button = $(e.target);
        var scope = button.closest('article');
        var lightbox = scope.find('.lightbox.profiles');

        lightbox.fadeIn();
    });















  
});


//auto scroll
function scrollToAnchor(theAnchor) {
    $(scrollContainer).stop().animate({
        scrollTop: $(theAnchor).position().top
    }, 1200);
}


function IEVersionCheck() {
    var myNav = navigator.userAgent.toLowerCase();
    return (myNav.indexOf('msie') != -1) ? parseInt(myNav.split('msie')[1]) : false;
}



// ================================
//  ADDITIONAL LIBRARIES, FIXES, ETC. 
// ================================

// MIT license - requestAnimationFrame polyfill by Erik Möller. fixes from Paul Irish and Tino Zijdel
(function () {
    var lastTime = 0;
    var vendors = ['ms', 'moz', 'webkit', 'o'];
    for (var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
        window.requestAnimationFrame = window[vendors[x] + 'RequestAnimationFrame'];
        window.cancelAnimationFrame = window[vendors[x] + 'CancelAnimationFrame']
                                   || window[vendors[x] + 'CancelRequestAnimationFrame'];
    }
    if (!window.requestAnimationFrame)
        window.requestAnimationFrame = function (callback, element) {
            var currTime = new Date().getTime();
            var timeToCall = Math.max(0, 16 - (currTime - lastTime));
            var id = window.setTimeout(function () { callback(currTime + timeToCall); },
              timeToCall);
            lastTime = currTime + timeToCall;
            return id;
        };
    if (!window.cancelAnimationFrame)
        window.cancelAnimationFrame = function (id) {
            clearTimeout(id);
        };
}());


//IE9: Console Exception Fix. 
if (typeof console == 'undefined') {
    window.console = {
        log: function () {
            // do nothing
        }
    };
    console.error = console.dir = console.warn = console.debug = console.info = console.log;
}

function resizeContentFrame(obj) {
    //set content frame height to page height
    setTimeout(function () { obj.style.height = document.getElementById('page-align').scrollHeight + 'px'; }, 100);
    //store initial 'page-align' height and create variable for future page heights
    var startHeight = document.getElementById('page-align').scrollHeight,
        currentHeight;
    //set interval to check height periodically and adjust content frame as necessary
    setTimeout(function timer () {
        //get the current height
        currentHeight = document.getElementById('page-align').scrollHeight;
        //if current height is not equal to stored height, reassign height to content frame
        if (startHeight != currentHeight) {
            obj.style.height = document.getElementById('page-align').scrollHeight + 'px';
            //reassign start height to current
            startHeight = currentHeight;
        }
        setTimeout(timer, 100);
    }, 100);   
}