$(document).on('ready', function () {
    //checkCompletionStatus();

    //uncomment below for testing
   //$('.locked-cover').css({ 'display': 'none' });

    var jumpLinks = $(window.parent.document.body).find('.js.module-link')

    var $carousel = $('.carousel');
    $carousel.sublimeCarousel(); // initialize

    //run if page scored
    if (parent.sco.apiConnector.suspendData(scoLocation) == '1') {

        $('.sublime-carousel-next').removeClass('disabled');
        $('.locked-cover').css({ 'display': 'none' });
        $('.progress').css({ 'visibility': 'hidden' });
        $('article').removeClass('locked');        

    //run if page unscored
    } else {

        //disable all jump buttons
        $('.sublime-carousel-jump').addClass('sublime-carousel-disabled');

        //All carousels
        $('.carousel').each(function () {

            //remove disabled class from first jump button
            var allJumps = $(this).find('.sublime-carousel-jump'),
                firstJump = $(allJumps).get(0);
            $(firstJump).removeClass('sublime-carousel-disabled');

            //slide changes
            $(this).on('slide-changed', function (e) {
                var thisSlide = $(this).find('.sublime-carousel-slide').get(e.index);

                //remove disabled class from slide's jump button when it loads
                var jumpButton = $(this).find('.sublime-carousel-jump').get(e.index);
                $(jumpButton).removeClass('sublime-carousel-disabled');

                //add next button disabled class when viewing slides with interaction class
                var nextButton = $(this).find('.sublime-carousel-next');
                if ($(thisSlide).hasClass('interaction') && !$(thisSlide).hasClass('visited')) {
                    $(nextButton).addClass('disabled');
                } else if ((!$(thisSlide).hasClass('interaction')) && ($(nextButton).hasClass('disabled'))) {
                    $(nextButton).removeClass('disabled');
                } 
            });

            //last slide
            $(this).on('reached-last-slide', function (e) {
                //hide locked-cover from next module
                var nextModule = $(this).parents('article').next();
                $(nextModule).find('.locked-cover').fadeOut(500, function () {
                    $(nextModule).removeClass('locked');
                    jumpLinks.eq(nextModule.index()-1).removeClass('disabled');
                    
                });
                
            });

        });

        //score page at end of carousel 07
        var $carousel07 = $('#carousel07 .carousel');
        $carousel07.on('reached-last-slide', function (e) {
            parent.scorePage();
        });
    }


    //Always run
    $('.carousel').each(function () {
        //slide changes
        $(this).on('slide-changed', function (e) {
            var thisSlide = $(this).find('.sublime-carousel-slide').get(e.index),
                otherSlides = $(thisSlide).siblings();

            //animations
            var animationSlide = $(this).find('.animation');
            if (animationSlide.length) {
                if ($(thisSlide).hasClass('animation')) {
                    //do animation
                    $(thisSlide).find('.js-fade-in').each(function (i) {
                        $(this).delay(i * 400).fadeIn(400);
                    });
                    $(thisSlide).find('.js-move.image-service').animate({
                        left: '+=60'
                    }, 600);
                    $(thisSlide).find('.js-move.image-content').animate({
                        left: '-=60'
                    }, 600);

                    $(thisSlide).find('.guidebox').delay(400).fadeOut(500, function () {
                        $(thisSlide).find('.js-fade-in-after').each(function (i) {
                            $(this).delay(i * 600).fadeIn(400);
                        });

                    });
                }

                if ($(otherSlides).hasClass('animation')) {
                    //undo animation
                    $(otherSlides).find('.js-fade-in').stop().css({ 'display': 'none' });
                    $(otherSlides).find('.js-fade-in-after').stop().css({ 'display': 'none' });

                    $(otherSlides).find('.js-move.image-service').stop().css({ 'left': '35px' });
                    $(otherSlides).find('.js-move.image-content').stop().css({ 'left': '280px' });

                    $(otherSlides).find('.guidebox').stop().css({ 'display': 'block' });
                }

            }

            if ($('.play-pause.play').length) {
                $.each(window._V_.players, function (i, player) {
                    player.pause();
                });
            }

            

        });

    });



    $('#module04a .play-pause').click(function () {
        $(this).siblings('.audio-container').addClass('hidden');
    });


    $('.pseudo-link').click(function () {
        var $btnID = $(this).prop('id'),
            scrollID = '#' + $btnID.substring(0, $btnID.indexOf('Anchor'));
        scrollToAnchor(scrollID);

        var carouselTwoJump = $('#carousel02').find('.sublime-carousel-jump'),
            destinationJump = $(carouselTwoJump).get(2);
        setTimeout(function () {
            $(destinationJump).trigger('click');
        }, 1200);
            

    });

    $('.transcript-modal').on('click', '.close-btn', function () {
        var self = $(this);
        self.parent().fadeOut();
        self.parent().find('.transcript-text.twin').hide();
    });

    $('.js.transcript-trigger').click(function () {
        var self = $(this);
        var person = self.attr('data-person');
        var slide = self.closest('.sublime-carousel-slide');
        var scope = slide.closest('article');
        var totalTranscripts = slide.find('.js.transcript-trigger').length;

        self.addClass('visited');
        slide.addClass('visited');
        if (self.attr('data-person'))
            scope.find('.js.transcript-modal').fadeIn().find('.' + person).fadeIn();
        else scope.find('.js.transcript-modal').fadeIn();

        if (slide.find('.js.transcript-trigger.visited').length === totalTranscripts) {
            scope.find('.sublime-carousel-next').removeClass('disabled');
        }

    });

});

$('label').on('click', function () {
    var radio = $(this).prev('input'),
        radioGroup = $(this).parent().siblings().find('label span.check');

    if (radio.prop("checked", true)) {
        $(radioGroup).removeClass('selected');
        $(this).children('span.check').addClass('selected');
    }
});

//Module 3 CYK
var optionAnswers = ['a', 'd'],
    $optionQuestion = $('#option-question');

$optionQuestion.on('click', 'label', selectOptions);

function selectOptions() {

    $optionQuestion.off('click', 'label', selectOptions);

    var $this = $(this),
        selectedDataOption = $this.attr('data-option'),
        $optionContainers = $('#option-question .option'),
        $dataOptionMatch = $optionContainers.find('label[data-option="' + selectedDataOption + '"]').not($this);

    $dataOptionMatch.click();

    $optionQuestion.on('click', 'label', selectOptions);

    var optionChecked = $optionContainers.find('input[type=radio]:checked');

    if (optionChecked.length > 1) {
        $('#option-question .check-answer').removeClass('disabled');
    }
}

$('#option-question').on('click', '.check-answer:not(.disabled)', optionResponse);

function optionResponse() {
    $(this).fadeOut();
    //find the checked radio buttons
    var radioChecked = $(this).siblings('.option').find('input[type=radio]:checked'),
        radioCheckedLength = radioChecked.length;

    radioChecked.each(function (index) {
        var radioValue = $(this).val();
        if ($.inArray(radioValue, optionAnswers) > -1) {

            //checking to see if last item
            if (index === (radioCheckedLength - 1)) {
                $('#module03a .slide02 .lightbox').addClass('correct').fadeIn();
            }    
        } else {
            $('#module03a .slide02 .lightbox').addClass('incorrect').fadeIn();
            return false;
        }
    });
}

$('#module03a .slide02 .lightbox').on('click', '.close-btn', function () {
    var feedbackLightbox = $(this).parent();

    if (feedbackLightbox.hasClass('correct')) {
        feedbackLightbox.removeClass('correct').fadeOut();
    } else {
        feedbackLightbox.removeClass('incorrect').fadeOut();
        $('.option').find('span.check').removeClass('selected');
        $('.option1').find("input[value='a']").prop("checked", true).next('label').children('span.check').addClass('selected');
        $('.option2').find("input[value='d']").prop("checked", true).next('label').children('span.check').addClass('selected');
    }

    $(this).closest('.carousel').find('.sublime-carousel-next').removeClass('disabled');
    $('#module03a .slide02').removeClass('interaction');

    disableOptionResponse();
});


function disableOptionResponse() {
    $('.option input').attr('disabled', 'true');
    $('.option label').off();
    $optionQuestion.off('click', 'label', selectOptions);
}

//Module 5 CYK
var CYKCorrectAnswers = {
    'one': 'a',
    'two': 'b',
    'three': 'b'
}

$('.question-container label').click(function () {
    $(this).parents().next('.check-answer').removeClass('disabled');

});

$('#question1').on('click', '.check-answer:not(.disabled)', q1Response);
$('#question2').on('click', '.check-answer:not(.disabled)', q2Response);
$('#question3').on('click', '.check-answer:not(.disabled)', q3Response);

function q1Response() {
    var q1 = document.getElementsByName('question1');
    for (var i = 0, length = q1.length; i < length; i++) {
        if (q1[i].checked) {
            disableResponseOne();
            //console.log(q1[i]);
            if (q1[i].value == CYKCorrectAnswers.one) {
                $('#question1 .feedback').addClass('correct');
            } else {
                $('#question1 .feedback').addClass('incorrect');
                //mark selected incorrect and mark correct selected
                $(q1[i]).next('label').find('span.check').addClass('incorrect');
                $('#question1').find("input[value='" + CYKCorrectAnswers.one + "']").next('label').children('span.check').addClass('selected');
            }
            $('#question1 .feedback .progress').addClass('answered');
            $('#question1 .check-answer').fadeOut(function () {
                $(this).closest('.carousel').find('.sublime-carousel-next').removeClass('disabled');
                $(this).closest('.sublime-carousel-slide').removeClass('interaction');
            });
        }
    }
}

function disableResponseOne() {
    $('#question1 input').attr('disabled', 'true');
    $('#question1 label').off();
}

function q2Response() {
    var q2 = document.getElementsByName('question2');
    for (var i = 0, length = q2.length; i < length; i++) {
        if (q2[i].checked) {
            disableResponseTwo();

            if (q2[i].value == CYKCorrectAnswers.two) {
                $('#question2 .feedback').addClass('correct');
            } else {
                $('#question2 .feedback').addClass('incorrect');
                //mark selected incorrect and mark correct selected
                $(q2[i]).next('label').find('span.check').addClass('incorrect');
                $('#question2').find("input[value='" + CYKCorrectAnswers.two + "']").next('label').children('span.check').addClass('selected');
            }
            $('#question2 .feedback .progress').addClass('answered');
            $('#question2 .check-answer').fadeOut(function () {
                $(this).closest('.carousel').find('.sublime-carousel-next').removeClass('disabled');
                $(this).closest('.sublime-carousel-slide').removeClass('interaction');
            });
        }
    }
}

function disableResponseTwo() {
    $('#question2 input').attr('disabled', 'true');
    $('#question2 label').off();
}

function q3Response() {
    var q3 = document.getElementsByName('question3');
    for (var i = 0, length = q3.length; i < length; i++) {
        if (q3[i].checked) {
            disableResponseThree();

            if (q3[i].value == CYKCorrectAnswers.three) {
                $('#question3 .feedback').addClass('correct');
            } else {
                $('#question3 .feedback').addClass('incorrect');
                //mark selected incorrect and mark correct selected
                $(q3[i]).next('label').find('span.check').addClass('incorrect');
                $('#question3').find("input[value='" + CYKCorrectAnswers.three + "']").next('label').children('span.check').addClass('selected');
            }
            $('#question3 .feedback .progress').addClass('answered');
            $('#question3 .check-answer').fadeOut(function () {
                $(this).closest('.carousel').find('.sublime-carousel-next').removeClass('disabled');
                $(this).closest('.sublime-carousel-slide').removeClass('interaction');
            });
        }
    }
}

function disableResponseThree() {
    $('#question3 input').attr('disabled', 'true');
    $('#question3 label').off();
}

$('#js-trigger-help').click(function () {
    var dialog = window.parent.Dialog('helpdialog');
    dialog.open();
    dialog.onCommand(function (value) {
        dialog.close();
    });
});






/*Drag and Drop*/

$('.drag-target').draggable({
    revert: true,
    revertDuration: 100,
    scroll: false
});

$('#carousel04a').on('mouseleave', function () {
    $('.drag-target').draggable('option', 'revert', true).trigger('mouseup');
});

$('.drop-target').droppable({
    accept: '.drag-target',
    drop: function (e, ui) {
        onTermDrop(e, ui);
    },
    out: function (e, ui) {
        onTermOut(e, ui);
    },
    over: function (e, ui) {
        onTermOver(e, ui);
    }
});


//set up click option
$('.drag-container').on('click', '.drag-target', function () {
    $('.drag-target').removeClass('selected');
    $(this).addClass('selected');
    checkForClickedMatch();
});

$('.drop-container').on('click', '.drop-target', function () {

    var self = $(this);

    $('.drop-target').removeClass('selected');
    self.addClass('selected');
    
    checkForClickedMatch();
});

function checkForClickedMatch() {
    var $drag = $('.drag-target.selected');
    var $drop = $('.drop-target.selected');

    if ($drag.length == 1 && $drop.length == 1) {
        runDrop($drag, $drop);
    }
}


//droppable functions
function onTermDrop(e, ui) {
    var $drag = ui.draggable,
        $drop = $(e.target);

    $drag.removeClass('over');
    $drop.find('.drag-target').removeClass('hidden');
    runDrop($drag, $drop);
}

function onTermOut(e, ui) {
    var $drag = ui.draggable,
        $drop = $(e.target);
    $drag.removeClass('over');
    $drop.removeClass('selected');
    $drop.find('.drag-target').removeClass('hidden');
}

function onTermOver(e, ui) {
    var $drag = ui.draggable,
        $drop = $(e.target);
    $drag.addClass('over');
    $drop.addClass('selected');
    $drop.find('.drag-target:not(.ui-draggable-dragging)').addClass('hidden');
}


//run both drag and click results
function runDrop($drag, $drop) {
    $('.drag-target, .drop-target').removeClass('selected').blur();

    var parentContainer = $drag.parent().attr('id');

    $drag.prop('returnTo', parentContainer);

    if ($drop.children('.ui-draggable').length > 0) {
        var currentlyOccupied = $drop.children('.ui-draggable').prop('returnTo');
        $drop.children('.ui-draggable').detach().css({ left: 0, right: 0, top: 0, bottom: 0, opacity: 1 }).appendTo($('#' + currentlyOccupied));
    }

    $drag.detach().css({ left: 0, right: 0, top: 0, bottom: 0 }).appendTo($drop);

    

    if ($('.drop-target > div').length == 2) {
        $('.drag-and-drop .check-answer').removeClass('disabled');
    }

}


$('.drag-and-drop').on('click', '.check-answer:not(.disabled)', checkIsCorrect);

function checkIsCorrect() {

    if ($('.drop-target > div[data-is-correct="false"]').length == 0) {
        $('#module04a .slide01 .feedback').addClass('correct');
    } else {
        $('#module04a .slide01 .feedback').addClass('incorrect');
    }
    $('#module04a .slide01 .feedback').show();
    $('#module04a .slide01 .feedback').animate({
        right: -70,

    });
}


$('.revisit-answer').on('click', function (e) {
    var feedback = $('#module04a .slide01 .feedback');

    feedback.animate({
        right: -570
    }, function () {
        var checkAnswer = feedback.siblings('.drag-and-drop').find('check-answer').removeClass('disabled');
        var draggables = feedback.siblings('.drag-and-drop').find('.drag-target').draggable('disable');
        feedback.hide();
    });
});








//function checkCompletionStatus() {

//    setTimeout(function timer() {
//        if (parent.sco.apiConnector.suspendData(scoLocation) == '1') {
//            console.log('scored');
//        }
        

//        setTimeout(timer, 100);

//    }, 100);

//}