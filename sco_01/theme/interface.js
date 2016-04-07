/// <reference path="../../framework/scripts/jquery-1.11.0.min.js" />
var needsClick = true, iframeLoaded = $.Deferred(), interfaceLoaded = $.Deferred();

function initInterface() {
    var $interface = $('<div id="courseinterface"></div>');
    var $mainNav = $('<div id="mainNav"></div>');

    var $pages = $('<ul id="coursenavigation"></ul>');
    var pagecount = xml.coursemanifest.find('structure > module').length;
    var pageWidthMath = Math.floor(999 / pagecount);
    xml.coursemanifest.find('structure > module').each(function () {
        var $li = $('<li></li>');
        var $btn = $('<button><span>' + $(this).children('title').text() + '</span></button>')
            .data('moduleid', $(this).attr('id'))
            //.attr('disabled', 'disabled');
            .addClass('disabled');
        $btn.appendTo($li);
        $li.appendTo($pages);

        var $subNav = $('<div class="subNav"></div>');
        var $subPages = $('<ul class="coursesubnavigation"></ul>');
        var subNavPages = $(this).children('page');
        if (subNavPages.length > 1) {
            subNavPages.each(function () {
                var $subLi = $('<li></li>');
                var $subBtn = $('<button><span>' + $(this).children('title').text() + '</span></button>')
                    .css({ width: pageWidthMath * 1.5 })
                    .data('pageid', $(this).attr('id'));
                $subBtn.appendTo($subLi);
                $subLi.appendTo($subPages);
            });

            $subPages.appendTo($subNav);
            $subNav
                .css({ marginLeft: pageWidthMath * -1 + 3 })
                .appendTo($pages);
            $btn.addClass('hoverMenu');
        } else {
            $btn.data('pageid', $(this).children('page:first').attr('id'));
        }
    });

    $pages.appendTo($mainNav);
    $('<button id="btn-help">Help</button>').appendTo($mainNav);

    $('head').append('<style>#coursenavigation > .subNav:before {width: ' + (pageWidthMath - 5) + 'px;}</style>');

    $interface.append($mainNav);
    $interface.prependTo('body');
    interfaceLoaded.resolve();

    var menuTopBanner = '<div id="menuTopBanner">' +
        '<div>' +
        '<h1>Course Title</h1>' +
        '</div>' +
        '</div>';
    $('body').prepend(menuTopBanner);

    $('#courseinterface')
        .on('click', 'ul > li > button:not(.disabled)', function () {
            if ($(this).data('pageid')) {
                gotoPage($(this).data('pageid'));
            }
        }).on('click', '#btn-index', function () {
            var dialog = Dialog('indexdialog');
            dialog.open();
            dialog.onCommand(function (value) {
                dialog.close();
            });
            setTimeout(function () {
                var $ul = $('#dialog-body ul');
                xml.coursemanifest.find('structure > module > page').each(function () {
                    var $li = $('<li></li>');
                    var $btn = $('<button>' + $(this).children('styletitle').text() + '</button>')
                        .data('pageid', $(this).attr('id'));
                    if (!arePrerequisitesMet($(this).parent().attr('id')))
                        //$btn.attr('disabled', 'disabled');
                        $btn.addClass('disabled');
                    $btn.appendTo($li);
                    $('<p>' + $(this).children('description').text() + '</p>').appendTo($li);
                    $li.appendTo($ul);
                });
                $ul.on('click', 'button', function () {
                    gotoPage($(this).data('pageid'));
                });
            }, 0);
        }).on('click', '#btn-help', function () {
            var dialog = Dialog('helpdialog');
            dialog.open();
            dialog.onCommand(function (value) {
                dialog.close();
            });
          
        }).on('click', '#btn-exit', exitCourse)
        .on('mouseenter', '.subNav', function () {
            $(this).prev('li').children('button').addClass('hover');
        })
        .on('mouseleave', '.subNav', function () {
            $(this).prev('li').children('button').removeClass('hover');
        });

    // if this is the first time in the course, show help 
    if (!isTrue(sco.apiConnector.suspendData('firsthelp'))) {
        sco.apiConnector.suspendData('firsthelp', '1');
        var dialog = Dialog('helpdialog');
        dialog.open();
        dialog.onCommand(function (value) {
            dialog.close();
            //plays video when closing help dialog on course launch
            //document.getElementById('contentframe').contentWindow.helpCloseVideoPlay();
            //$('#contentframe')[0].contentWindow.helpCloseVideoPlay();
        });
    }

    if (navigator.userAgent.match(/(iPad|iPhone|iPod touch);.*CPU.*OS 7_\d/i) && needsClick) {
        $.when(iframeLoaded.promise(), interfaceLoaded.promise()).done(function () {
            setTimeout(function () {
                needsClick = false;
                $('#coursenavigation button:first').click();
            }, 500);
        });
    }



    // In course Actions
    $('.close-dialog').click(function () {
        dialog.close();
    });

   
    // Navigation needs to exist outside of the iframe. 
    $('.js.module-nav').click(function (e) {
        
        var self = $(this);
        var target = $(e.target);

        if(!target.hasClass('disabled'))
            self.find('.js.module-links').slideToggle();
   
       
    });

    $('.js.module-nav').on('click', '.js.module-link', function (e) {
        
        var container = $(e.delegateTarget);
        var link = $(e.target);

        if (link.hasClass('disabled'))
            return;

        var courseFrame = $('#contentframe')[0].contentWindow.document.body;
        var courseJumps = $(courseFrame).find('.js.course-jump');



        // Index and target
        var linkIdx = link.index();
        var targetModule = courseJumps.eq(linkIdx);

        // Animate to the specified module. 
        $('html, body').animate({
            scrollTop: targetModule.position().top + "px"
        }, function () {
            targetModule.find('.sublime-carousel-jump').first().click();
        });

    });


    $('#contentframe').load(function () {

        var iframe = $('#contentframe').contents();

        iframe.find("body").click(function () {
            $('.js.module-nav').find('.js.module-links').slideUp();
        });
    });

}

function updateInterface() {
    var currentModuleId = xml.coursemanifest.find('structure page[id="' + sco.apiConnector.bookmark('location') + '"]').parent('module').attr('id');
    $('#coursenavigation button').each(function () {
        // disable page buttons if prereqs aren't met
        if (!arePrerequisitesMet($(this).data('moduleid')))
            //$(this).attr('disabled', 'disabled');
            $(this).addClass('disabled');
        else
            $(this).removeClass('disabled');
        // style currently selected page
        if ($(this).data('moduleid') == currentModuleId) {
            $(this).addClass('selected');
        } else {
            $(this).removeClass('selected');
        }
        if (sco.apiConnector.suspendData($(this).data('pageid')) == 1) {
            $(this).addClass('completed');
        }
    });

    $('.coursesubnavigation button').each(function () {
        if ($(this).data('pageid') == sco.apiConnector.bookmark('location')) {
            $(this).addClass('selected');
        } else {
            $(this).removeClass('selected');
        }
        if (sco.apiConnector.suspendData($(this).data('pageid')) == 1) {
            $(this).addClass('completed');
        }
        if ($(this).parents('.coursesubnavigation').find('button').length == $(this).parents('.coursesubnavigation').find('button.completed').length) {
            $(this).parents('.subNav').prev('li').children('button').addClass('completed');
        }
    });
}

if (window.opener) {
    
    var wop = $(window.opener.document);

    $(window).on('load', function () {
        //when the course is open, this updates default.htm dialogue. 
        wop.find('h1').text('COURSE IN PROGRESS');
        wop.find('p').text('Please do not close this window until you are finished.');
        wop.find('button').css('display', 'none');
    });

    $(window).on('beforeunload', function () {
        //when the course is closed, this updates default.htm dialogue.
        try {
            wop.find('h1').text('');
            wop.find('p').html('If you have finished the course, please close this window.<br /><br /> If you have not completed the course, you may have pop-up blockers enabled, or have accidentally closed the course.');
            wop.find('button').css('display', 'block');
        }
        //user closes default.html before launch.html
        catch (err) {
            //do nothing
        }
    });
}



