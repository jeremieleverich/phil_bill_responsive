/// <reference path="jquery-1.11.0.min.js" />
$(document).ready(function () {
    //quote parasol interaction
    $('.parasol-quote button').on('click', function (e) {
        var $this = $(this);
        $this.toggleClass('is-clicked');
        //calls a method to check and remove nag buttons
        removeNagBt($this);
    });

    $('.slide-show button').on('click', function (e) {
        //calls a method to check and remove nag buttons
        removeNagBt($(this));
    });

   
    //readmore interaction
    $('.read-more').on('click', function (e) {
        
        var $this = $(this)
        /*
        $flyOut = $this.parents().next('.fly-out'),
        flyoutWidth = $flyOut.width();

        if (!Modernizr.cssanimations)
            $flyOut.animate({ 'left': '-=' + flyoutWidth + 'px' }, 700);
        else
            $flyOut.css({ transform: 'translateX(-' + flyoutWidth + 'px)' })
                .addClass('slide-fly-out');
        //calls a method to check and remove nag buttons */
        removeNagBt($this);
        /*
        $('.strip-col').trigger({ type: 'reveal' });

        //close flyout
        function closeFlyout() {
            if (!Modernizr.cssanimations)
                $flyOut.animate({ 'left': '+=' + flyoutWidth + 'px' }, 500);
            else
                $flyOut.css({ transform: 'translateX(+=' + flyoutWidth + 'px)' })
                    .addClass('slide-fly-out');
        }

        $($flyOut).children('button').one('click', function () {
            $('.strip-col').trigger({ type: 'conceal' });
        });

        $('.strip-col').one('closing', function (e) {
            closeFlyout();
        }); */
    });

 
});