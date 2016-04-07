/// <reference path="jquery-1.9.1.min.js" />

//var scoreComp = $.Deferred();

$(document).on('ready', function () {
    var loader = ResourceLoader();
    loader.addResource('xml', '../ini.xml', 'ini');
    loader.addResource('js', 'scripts/requirementssniffer.js');
    if (!window.JSON)
        loader.addResource('js', 'scripts/json2.js');
    loader.onSuccess(prepareFramework);
    loader.getResources();
    //scoreComp.promise().done(function () {
    //    scoreCompletion();
    //});
});

$(window).on('unload', function () {
    if (sco && sco.apiConnector) {
        sco.apiConnector.scormExit();
    }
});

function prepareFramework() {
    // set up SCORM or AICC APIs
    var apis = xml.ini.find('preferredapis > api').map(function () { return $(this).text(); }).get();

    window.sco = {
        isDebug: /localhost/i.test(window.location.hostname) || /debugmode=true/i.test(window.location.search),
        launchOrigin: getLaunchOrigin(),
        rootPath: location.href.substring(0, location.href.indexOf('framework/launch.html')),
        language: xml.ini.find('languages').attr('default'),
        scoreScheme: xml.ini.find('scorescheme').text()
    }
    window.sco.apiConnector = ApiConnector(apis);

    // check browser requirements
    var pluginstatus = RequirementsSniffer.sniffPlugins(xml.ini.find('sniffers > plugins'));
    var browserstatus = RequirementsSniffer.sniffBrowser(xml.ini.find('sniffers > browsers'));

    var qs = '';
    $.map(pluginstatus, function (obj, i) {
        qs += (qs.length > 0 ? '&' : '') + obj.name + '=' + obj.minver;
    });
    if (browserstatus != null) {
        qs += (qs.length > 0 ? '&' : '') + 'browser=' + browserstatus.minver;   // We could use browserstatus.name to get the exact client that is out
        // of date, but we probably don't need that info most of the time.
    }
    if (qs.length > 0)
        location.replace(sco.rootPath + 'sco_01/content_' + sco.language + '/config/requirements.html?' + qs, false);

    // for offline/testing purposes only!
    if (sco.apiConnector.bookmark('learnerId') == '' && sco.apiConnector.bookmark('learnerName') == '') {
        testid = xml.ini.find('testingvalues > learnerid').text(), testname = xml.ini.find('testingvalues > learnername').text();
        if (testid != null && testid.length > 0)
            sco.apiConnector.bookmark('learnerId', testid);
        if (testname != null && testname.length > 0)
            sco.apiConnector.bookmark('learnerName', testname);
    }

    setupEnvironment();
    placeWindow();

    var loader = ResourceLoader();
    loader.addResource('xml', sco.rootPath + 'sco_01/content_' + sco.language + '/config/coursemanifest.xml', 'coursemanifest');
    loader.addResource('xml', sco.rootPath + 'sco_01/content_' + sco.language + '/config/labels.xml', 'labels');
    loader.addResource('xml', sco.rootPath + 'imsmanifest.xml', 'imsmanifest');
    if (sco.scoreScheme == 'assessment') {
        loader.addResource('xml', sco.rootPath + 'sco_01/content_' + sco.language + '/xml/assessment.xml', 'asmt');
        //loader.addResource('js', 'scripts/assessment.js');
    }
    loader.onSuccess(prepareCourse);
    loader.getResources();
    //scoreComp.resolve();

    //if (sco.apiConnector.bookmark('scoreThreshold') != 'complete' && sco.apiConnector.bookmark('scoreThreshold') != 'incomplete') {
    //    sco.apiConnector.bookmark('scoreThreshold', 'incomplete');
    //}
}

function prepareCourse() {
    $('#contentframe').on('load', onPageLoaded);

    xml.coursemanifest.find('objectives > objective').each(function () {
        var obj = sco.apiConnector.objectives.getOrCreate($(this).attr('id'));
        obj.description = $(this).text();
        sco.apiConnector.objectives.set(obj);
    });

    if (sco.scoreScheme == 'assessment')
        Assessment.initialize();

    if (xml.ini.find('showintropage').text().toLowerCase() == 'true') {
        var html = xml.ini.find('showintropage').attr('html') + '.html';
        $('#contentframe').attr('src', html);
    } else {
        startCourse();
    }
}

function setupEnvironment() {
    switch (sco.launchOrigin) {
        case 'slk':
            top.document.getElementById('framesetOuter').rows = '0,*';
            var framesets = top.document.getElementById(top.MAIN_FRAME).contentWindow.document.getElementsByTagName('frameset');
            for (var f = 0; f < framesets.length; f++) {
                if (framesets[f].rows != '') {
                    framesets[f].rows = framesets[f].rows.replace(/\d+/g, 0);
                    framesets[f].rows = framesets[f].rows.replace(/[\%]/g, '');
                }
                if (framesets[f].cols != '') {
                    framesets[f].cols = framesets[f].cols.replace(/\d+/g, 0);
                    framesets[f].cols = framesets[f].cols.replace(/[\%]/g, '');
                }
            }
            break;
    }
}

function placeWindow() {
    var availW = screen.availWidth, availH = screen.availHeight;
    var desiredW = parseInt(window.xml.ini.find('dimensions').attr('width')), desiredH = parseInt(window.xml.ini.find('dimensions').attr('height'));
    var allowResize = window.xml.ini.find('dimensions').attr('allowresize').toLowerCase() == 'true';

    if (desiredW > availW || desiredH > availH)
        MessageLog.addMessage('Desired size of course window is larger than available screen size.', MessageLogLevel.Warning);

    var resizeAttempts = 0;
    var doResize = function () {
        try {
            var deltaW = desiredW - $(window).width(), deltaH = desiredH - $(window).height();
            if (deltaW != 0 || deltaH != 0) {
                var targetX = Math.max((availW - desiredW) / 2, 0), targetY = Math.max((availH - desiredH) / 2, 0);
                window.moveTo(targetX, targetY);
                window.resizeBy(deltaW, deltaH);
            }
        } catch (ex) {
            if (++resizeAttempts > 10)
                MessageLog.addMessage('Unable to place course window.', MessageLogLevel.Warning);
            else
                setTimeout(doResize, 100);
        }
    }

    if (!allowResize) {
        var resizeHandle = -1;

        $(window).on('resize', function () {
            clearTimeout(resizeHandle);
            resizeHandle = setTimeout(doResize, 100);
        });
    }

    doResize();
}

function getLaunchOrigin() {
    try {
        if (top.frames.length > 1 && top.frames[1].document.getElementsByTagName('applet').length > 0 && /^com.plateausystems\.elms/i.test(top.frames[1].document.getElementsByTagName('applet')[0].getAttribute('code')))
            return 'plateau';
        else if (window.opener != null && window.opener.API != null && /Serebra/i.test(window.opener.API.CompanyName))
            return 'serebra';
        else if (top.Rte2004Api && top._MS_Scorm2004_TypeValidator)
            return 'slk';
        else if (top.document.title == 'SCO Launch Stage' && /scoRTE\/SCORTEFooter.htm/.test(top.frames[1].location.href))
            return 'ADLTestSuite_1_2';
        else if (top.document.title == 'SCO Launch Stage' && /CP_SCORTEFooter.htm/.test(top.frames[1].location.href))
            return 'ADLTestSuite_1_3';
        else if (top.opener && top.opener.launchMethod == 'windowlauncher')
            return 'windowlauncher';
        else if (/localhost/.test(window.location.href))
            return 'localhost';
        else
            return 'unknown';
    } catch (ex) {
        return 'unknown';
    }
}

function updateLanguage() {
    var loader = ResourceLoader();
    loader.addResource('xml', sco.rootPath + 'sco_01/content_' + sco.language + '/config/coursemanifest.xml', 'coursemanifest');
    loader.addResource('xml', sco.rootPath + 'sco_01/content_' + sco.language + '/config/labels.xml', 'labels');
    if (sco.scoreScheme == 'assessment')
        loader.addResource('xml', sco.rootPath + 'sco_01/content_' + sco.language + '/xml/assessment.xml', 'asmt');
    loader.onSuccess(function () {
        //if (sco.scoreScheme == 'assessment')
        //Assessment.initialize(true);
        frames[0].location.reload(true);
    });
    loader.getResources();
}

function startCourse() {
    if (initInterface)
        initInterface();

    var firstPage = xml.coursemanifest.find('structure > module > page').eq(0).attr('id');
    if (sco.apiConnector.bookmark('location') == '')
        sco.apiConnector.bookmark('location', firstPage);

    if (sco.apiConnector.bookmark('mode') == 'review' && isTrue(xml.ini.find('dialogswitches > reviewmodedialog').text())) {
        var dialog = Dialog('reviewmodedialog');
        dialog.open();
    } else if (sco.apiConnector.bookmark('location') != firstPage && isTrue(xml.ini.find('dialogswitches > returndialog').text())) {
        var dialog = Dialog('returndialog');
        dialog.open();
        dialog.onCommand(function (value) {
            if (!isTrue(value))
                sco.apiConnector.bookmark('location', firstPage);
            dialog.close();
            gotoPage();
        });
    } else if (isTrue(xml.ini.find('dialogswitches > preassessmentdialog').text())) {
        var dialog = Dialog('preassessmentdialog');
        dialog.open();
    } else if (isTrue(xml.ini.find('dialogswitches > assessmentdialog').text())) {
        var dialog = Dialog('assessmentdialog');
        dialog.open();
    } else {
        gotoPage();
    }

    scoreCompletion();
}

function exitCourse() {
    if (isTrue(xml.ini.find('dialogswitches > exitdialog').text())) {
        var dialog = Dialog('exitdialog');
        dialog.open();
        dialog.onCommand(function (value) {
            if (isTrue(value)) {
                sco.apiConnector.scormExit();
                window.close();
            }
            dialog.close();
        });
    } else {
        sco.apiConnector.scormExit();
        window.close();
    }
}

function gotoPage(id) {
    if (!id)
        id = sco.apiConnector.bookmark('location');
    else
        sco.apiConnector.bookmark('location', id);

    var $page = xml.coursemanifest.find('#' + id);
    var html = $page.attr('htmlpage');

    $('#contentframe').attr('src', sco.rootPath + 'sco_01/content_' + sco.language + '/' + (typeof html !== 'undefined' ? html : id) + '.html');
}

function jumpToPage(mod, pageN) {
    var id = xml.coursemanifest.find('structure module').eq(mod).children('page').eq(pageN - 1).attr('id');
    gotoPage(id);
}

function gotoPreviousPage() {
    var $pages = xml.coursemanifest.find('structure page'),
        index = xml.coursemanifest.find('structure page').index(xml.coursemanifest.find('structure page#' + sco.apiConnector.bookmark('location')));

    if (index > 0) {
        var $page = $pages.eq(index - 1);
        sco.apiConnector.bookmark('location', $page.attr('id'));
        gotoPage();
    }
}

function gotoNextPage() {
    var $pages = xml.coursemanifest.find('structure page'),
        index = xml.coursemanifest.find('structure page').index(xml.coursemanifest.find('structure page#' + sco.apiConnector.bookmark('location')));

    if (index < $pages.length - 1) {
        var $page = $pages.eq(index + 1);
        sco.apiConnector.bookmark('location', $page.attr('id'));
        gotoPage();
    }
}

function onPageLoaded() {
    var id = sco.apiConnector.bookmark('location');
    var $page = xml.coursemanifest.find('#' + id), manualscore = isTrue($page.attr('manualscore'));

    if (!(manualscore || isTrue(sco.apiConnector.bookmark(id))))
        scorePage(id);

    // send updated suspend_data and location to LMS
    sco.apiConnector.commitPageValues();

    // call updateInterface in theme/interface.js
    if (updateInterface)
        updateInterface();
}

function scorePage(id, unscore) {
    if (!id)
        id = sco.apiConnector.bookmark('location');

    if (unscore)
        sco.apiConnector.suspendData(id, '0');
    else
        sco.apiConnector.suspendData(id, '1');

    scoreCompletion();

    // call updateInterface in theme/interface.js
    if (updateInterface)
        updateInterface();
}

function scoreCompletion() {
    var max = 0, raw = 0, objScores = {};

    xml.coursemanifest.find('module').each(function () {
        var objectives = !!$(this).attr('objectives') ? $(this).attr('objectives').split(' ') : [];
        for (var i = 0; i < objectives.length; i++) {
            if (!objScores[objectives[i]])
                objScores[objectives[i]] = { max: 0, raw: 0 };
        }

        $(this).find('page').each(function () {
            var weight = parseFloat($(this).attr('weight'));
            if (isNaN(weight)) weight = 1;
            max += weight;
            for (var i = 0; i < objectives.length; i++) {
                objScores[objectives[i]].max += weight;
            }

            if (isTrue(sco.apiConnector.suspendData($(this).attr('id')))) {
                raw += weight;
                for (var i = 0; i < objectives.length; i++) {
                    objScores[objectives[i]].raw += weight;
                }
            }
        });
    });

    sco.apiConnector.bookmark('progressMeasure', (raw / max).toFixed(2) * 100);

    var isCompletion = sco.scoreScheme == 'completion', scoreObjThreshold = parseFloat(xml.ini.find('scorethresholdobjectives').text());

    for (var objId in objScores) {
        var obj = sco.apiConnector.objectives.get(objId);
        obj.progressMeasure = (objScores[objId].raw / objScores[objId].max).toFixed(2);
        if (isCompletion) {
            obj.score.max = objScores[objId].max;
            obj.score.raw = objScores[objId].raw;
            obj.score.scaled = obj.progressMeasure;
            if (obj.completionStatus != 'completed')
                obj.completionStatus = obj.score.scaled >= scoreObjThreshold ? 'completed' : 'incomplete';
        }
    }

    if (isCompletion) {
        sco.apiConnector.bookmark('scoreRaw', sco.apiConnector.bookmark('progressMeasure'));
        if (sco.apiConnector.bookmark('completionStatus') != 'completed')
            sco.apiConnector.bookmark('completionStatus', sco.apiConnector.bookmark('progressMeasure') >= sco.apiConnector.bookmark('scoreThreshold') ? 'completed' : 'incomplete');
    }

    // send status/completion to Sublime database
    sendTrainingStatus();
}

function completedButton() {
    sco.apiConnector.bookmark('completionStatus', 'completed');
    sendTrainingStatus();
    parent.sco.apiConnector.scormExit();
    top.window.close();
}

function scoreAssessment() {

}

function arePrerequisitesMet(id) {
    var $module = !!xml.coursemanifest ? xml.coursemanifest.find('module#' + id) : $();
    if ($module.length == 0)
        return true;

    var prerequisites = !!$module.attr('prerequisites') ? $module.attr('prerequisites').split(' ') : [];
    var areMet = true;

    for (var i = 0; i < prerequisites.length; i++) {
        var obj = sco.apiConnector.objectives.get(prerequisites[i]);
        if (obj != null && obj.completionStatus != 'completed')
            areMet = false;
    }

    return areMet;
}

function sendFeedback() {
    var dialog = Dialog('feedbackdialog');
    dialog.open();
    dialog.onCommand(function (value) {
        if (isTrue(value.split('[,]')[0])) {
            var obj = Convert.stringToObject(value.substring(value.indexOf(']') + 1), '[,]', '[:]');

            // only add log info if the switch is set to 'true' in ini.xml
            if (isTrue(xml.ini.find('sublimelms > allowdebuglogging').text())) {
                obj.message += '\n\nlocation: ' + sco.apiConnector.bookmark('location') +
                               '\n\n' + MessageLog.getLog();
            }

            obj.catalogname = xml.imsmanifest.find('catalogentry > catalog').text();
            obj.courseid = xml.imsmanifest.find('manifest').attr('identifier');
            obj.learnerid = sco.apiConnector.bookmark('learnerId');
            obj.learnername = sco.apiConnector.bookmark('learnerName');
            obj.useragent = navigator.userAgent;
            obj.environment = getUserEnvironment();

            if (!Modernizr.cors) {
                sendFormByIFrame(xml.ini.find('sublimelms').attr('baseuri') + 'Log/New', obj);
                MessageLog.addMessage('Sent log message to server via form. Browser does not support CORS; no response received.');
            } else {
                $.support.cors = true;
                $.ajax({
                    url: xml.ini.find('sublimelms').attr('baseuri') + 'Log/New',
                    type: 'POST',
                    accepts: 'application/json',
                    contentType: 'application/json',
                    data: JSON.stringify(obj),
                    dataType: 'json'
                }).done(function (data) {
                    if (!data) {
                        MessageLog.addMessage('Sent log message to server. No response received.');
                    } else if (data.success) {
                        MessageLog.addMessage('Sent log message to server. Response was successful.', MessageLogLevel.Information);
                    } else {
                        MessageLog.addMessage('Failed to log message to server: ' + data.response, MessageLogLevel.Error);
                    }
                }).fail(function (jqxhr, textstatus) {
                    MessageLog.addMessage('Failed to log message to server (' + textstatus + ')', MessageLogLevel.Error);
                });
            }
        }

        dialog.close();
    });
}

function sendInteraction(activity, interaction) {
    if (isTrue(xml.ini.find('sublimelms > trackinteractions').text())) {
        var obj = {
            catalogname: xml.imsmanifest.find('catalogentry > catalog').text(),
            courseid: xml.imsmanifest.find('manifest').attr('identifier'),
            learnerid: sco.apiConnector.bookmark('learnerId'),
            learnername: sco.apiConnector.bookmark('learnerName'),
            activityid: activity.id,
            activityversion: activity.version,
            timestamp: interaction.timestamp.toJSON(),
            learnerresponse: interaction.learnerResponse,
            result: interaction.result,
            latency: interaction.latency
        };

        if (!Modernizr.cors) {
            sendFormByIFrame(xml.ini.find('sublimelms').attr('baseuri') + 'Interaction/New', obj);
            MessageLog.addMessage('Sent interaction to server via form. Browser does not support CORS; no response received.');
        } else {
            $.support.cors = true;
            $.ajax({
                url: xml.ini.find('sublimelms').attr('baseuri') + 'Interaction/New',
                type: 'POST',
                accepts: 'application/json',
                contentType: 'application/json',
                data: JSON.stringify(obj),
                dataType: 'json'
            }).done(function (data) {
                if (!data) {
                    MessageLog.addMessage('Sent interaction to server. No response received.');
                } else if (data.success) {
                    MessageLog.addMessage('Sent interaction to server. Response was successful.', MessageLogLevel.Information);
                } else {
                    MessageLog.addMessage('Failed sending interaction to server: ' + data.response, MessageLogLevel.Error);
                }
            }).fail(function (jqxhr, textstatus) {
                MessageLog.addMessage('Failed sending interaction to server (' + textstatus + ')', MessageLogLevel.Error);
            });
        }
    }
}

function sendTrainingStatus() {
    if (isTrue(xml.ini.find('sublimelms > trackcompletions').text())) {
        var obj = {
            catalogname: xml.imsmanifest.find('catalogentry > catalog').text(),
            courseid: xml.imsmanifest.find('manifest').attr('identifier'),
            learnerid: sco.apiConnector.bookmark('learnerId'),
            learnername: sco.apiConnector.bookmark('learnerName'),
            status: sco.apiConnector.bookmark('completionStatus'),
            score: sco.apiConnector.bookmark('scoreRaw')
        };

        if (!Modernizr.cors) {
            sendFormByIFrame(xml.ini.find('sublimelms').attr('baseuri') + 'TrainingStatus/New', obj);
            MessageLog.addMessage('Sent training status to server via form. Browser does not support CORS; no response received.');
        } else {
            $.support.cors = true;
            $.ajax({
                url: xml.ini.find('sublimelms').attr('baseuri') + 'TrainingStatus/New',
                type: 'POST',
                accepts: 'application/json',
                contentType: 'application/json',
                data: JSON.stringify(obj),
                dataType: 'json'
            }).done(function (data) {
                if (!data) {
                    MessageLog.addMessage('Sent training status to server. No response received.');
                } else if (data.success) {
                    MessageLog.addMessage('Sent training status to server. Response was successful.', MessageLogLevel.Information);
                } else {
                    MessageLog.addMessage('Failed sending training status to server: ' + data.response, MessageLogLevel.Error);
                }
            }).fail(function (jqxhr, textstatus) {
                MessageLog.addMessage('Failed sending training status to server (' + textstatus + ')', MessageLogLevel.Error);
            });
        }
    }
}