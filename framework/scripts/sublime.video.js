/// <reference path="jquery-1.11.0.min.js" />
$(document).ready(function () {


    var $vid = $('video'),
        $playBt = $('.play-btn'),
        $audio = $('audio'),
        $poster = $('.video-poster');

    //preload attribute in chrome is set to none, this is a page loading issue.
    //if (!isChrome) {
    //    $($vid).each(function () {
    //        this.preload = 'auto';
    //    });
    //}

    //hides custom play buttton
    if (isFirefox || isiPad) $playBt.hide();

    //adds non <video> tag posters to due to IE video poster bug 
    if (isIE)
        $poster.css({ 'visibility': 'visible', 'display': 'block' });
    if (isiPad || isChrome || isFirefox)
        $poster.css({ 'visibility': 'collapse', 'display': 'none' });

    $playBt.on('click', toggleVideoPlayback);

    function toggleVideoPlayback() {

        var $video = $(this).prev($vid).get(0);
        $(this).addClass('play-hide');
        if ($video.paused) {
            $video.play();
        } else {
            $video.pause();
        } 
    }

    function stopVideo(ctx) {
        $vid.not(ctx).each(function () {
            $(this)
                .next($playBt)
                .removeClass('pause-state')
                .end()
                .get(0)
                .pause();
        });
    }

    $vid.on('play', function (e) {
        var $this = $(this);
        $this.next($playBt).addClass('pause-state');
        $('.strip-col').trigger({ type: 'conceal' });
        if (isIE)
            $this.prev($poster).hide();
        stopVideo($this);
        $('audio').each(function () {
            this.pause();
        });
        

        // WILL REMOVE ON PLAY REGARDLESS OF EVENTS 
        //removeNagBt($this);

        //removed CC, since it is only supported by 2 browsers and no one has the mime type .vtt
        //var tracks = $this[0].textTracks,
        //track = tracks[0];
        ////sets default CC to hidden on play
        //track.mode = 'hidden';
    });

    $vid.on('pause', function (e) {
        $(this).next($playBt).removeClass('pause-state');
    });

    $vid.on('ended', function (e) {
        $(this).next().removeClass('pause-state play-hide');
        this.pause();
        this.load();
        if (isIE) $(this).prev($poster).show();
    }); 
});