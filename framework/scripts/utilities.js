//
//  ResourceLoader
//
var ResourceLoader = function (ctx) {
    var _resources = [];
    var _success = function () { }, _fail = function () { alert('Error: could not load resources.'); };
    if (!ctx) ctx = window;

    var _getResources = function () {
        if (_resources.length > 0) {
            var requests = [];
            if (!ctx.xml) ctx.xml = {};

            $.each(_resources, function () {
                switch (this.type) {
                    case 'xml':
                        requests.push(_getXmlResource(this.path, this.id));
                        break;
                    case 'css':
                        requests.push(_getCssResource(this.path));
                        break;
                    case 'js':
                        requests.push(_getJSResource(this.path));
                        break;
                }
            });

            $.when.apply($, requests).done(_success).fail(_fail);
        }
    };

    var _getXmlResource = function (path, id) {
        var ajax = $.ajax({
            url: path,
            dataType: 'xml',
            cache: false
        }).done(function (xml) {
            ctx.xml[id] = $(xml);
        });
        return ajax;
    }

    var _getCssResource = function (path) {
        var ajax = $.ajax({
            url: path,
            dataType: 'text',
            cache: true
        }).done(function () {
            $('head').append('link');
            $('head').children(':last').attr({ rel: 'stylesheet', type: 'text/css', href: path });
        });
        return ajax;
    }

    var _getJSResource = function (path) {
        var ajax = $.ajax({
            url: path,
            dataType: 'script',
            cache: true
        });
        return ajax;
    }

    return {
        addResource: function (type, path, id) {
            /// <summary>Add a new resource to the queue.</summary>
            /// <param name="type" type="String">The type of resource to load (must be "xml", "js", or "css").</param>
            /// <param name="path" type="String">The path to the resource.</param>
            /// <param name="id" type="String">The key in window.xml where the XML will be stored (applies to "xml" type only).</param>
            if (!type) type = '';
            type = type.toLowerCase();
            _resources.push({ type: type, path: path, id: id });
        },
        onSuccess: function (callback) {
            /// <summary>Set the function to call when all resources have successfully loaded.</summary>
            /// <param name="callback" type="Function">Function to call when all resources have successfully loaded.</param>
            if (typeof callback === 'function')
                _success = callback;
        },
        onFail: function (callback) {
            /// <summary>Set the function to call when one or more resources have failed to load.</summary>
            /// <param name="callback" type="Function">Function to call when one or more resources have failed to load.</param>
            if (typeof callback === 'function')
                _fail = callback;
        },
        getResources: function () {
            /// <summary>Get all queued resources.</summary>
            _getResources();
        }
    }
};


//
//  MessageLog
//
var MessageLog = (function () {
    var _logToRemote = false;
    var _logToConsole = true;
    var _loggedMessages = [];

    var _addMessage = function (message, level) {
        _loggedMessages.push({ timestamp: new Date(), level: level, message: message });

        if (_logToConsole && window.console && window.console.log) {
            try {
                switch (level) {
                    case MessageLogLevel.Information:
                        window.console.info(message);
                        break;
                    case MessageLogLevel.Warning:
                        window.console.warn(message);
                        break;
                    case MessageLogLevel.Error:
                        window.console.error(message);
                        break;
                }
            } catch (ex) { }
        }
    }

    return {
        addMessage: function (message, level) {
            /// <summary>Log a message for future use.</summary>
            /// <param name="message" type="String">The message you wish to log.</param>
            /// <param name="level" type="MessageLogLevel">The importance level of the message.</param>
            _addMessage(message, level);
        },
        getLog: function () {
            var s = '';
            for (var m in _loggedMessages) {
                var msg = _loggedMessages[m];
                s += msg.level + ' (' + msg.timestamp + '): ' + msg.message + '\n';
            }
            return s;
        },
        clearLog: function () {
            _loggedMessages = [];
        }
    }
})();

var MessageLogLevel = (function () {
    return {
        /// <field>Log a message at the Information level</field>
        Information: 'Information',
        /// <field>Log a message at the Warning level</field>
        Warning: 'Warning',
        /// <field>Log a message at the Error level</field>
        Error: 'Error'
    }
})();


//
//  Convert
//
var Convert = (function () {
    return {
        stringToObject: function (str, split1, split2) {
            var obj = {};
            $.map(str.split(split1), function (s, i) {
                var parts = s.split(split2);
                obj[parts[0]] = parts.length > 1 ? parts[1] : null;
            });
            return obj;
        },
        dateToTimespan: function (apiName, date) {
            var hours = Math.floor(date / 3600000);     // 3600000 = 1000 ms/sec * 60 sec/min * 60 min/hr
            date %= 3600000;
            var mins = Math.floor(date / 60000);        // 60000 = 1000 ms/sec * 60 sec/min
            date %= 60000;
            var secs = (date / 1000).toFixed(2);        // 1000 = 1000 ms/sec
            switch (apiName) {
                case 'Scorm2004Api':
                    return 'PT' + hours + 'H' + mins + 'M' + secs + 'S';
                    break;
                case 'Scorm12Api':
                    hours = Math.min(9999, hours);      // data element is limited to 9999 hours in SCORM 1.2
                    return (hours < 10 ? '0' : '') + hours + ':' + (mins < 10 ? '0' : '') + mins + ':' + (secs < 10 ? '0' : '') + secs;
                    break;
                case 'AiccApi':
                    return '';
                    break;
            }
        },
        dateToCmiDate: function (apiName, date) {
            switch (apiName) {
                case 'Scorm2004Api':
                    var yr = date.getFullYear(), mo = date.getMonth() + 1, dy = date.getDate();
                    var hr = date.getHours(), min = date.getMinutes(), sec = date.getSeconds(), ms = Math.round(date.getMilliseconds() / 10);
                    var tz = date.getTimezoneOffset(), tzh = Math.abs(Math.floor(tz / 60)), tzm = Math.abs(tz % 60);
                    return yr + '-' + (mo < 10 ? '0' : '') + mo + '-' + (dy < 10 ? '0' : '') + dy + 'T' + (hr < 10 ? '0' : '') + hr + ':' + (min < 10 ? '0' : '') + min + ':' + (sec < 10 ? '0' : '') + sec + '.' + (ms < 10 ? '0' : '') + ms + (tz < 0 ? '-' : '+') + (tzh < 10 ? '0' : '') + tzh + (tzm > 0 ? (tzm < 10 ? '0' : '') + tzm : '');
                    break;
                case 'Scorm12Api':
                    var hr = date.getUTCHours(), min = date.getUTCMinutes(), sec = date.getUTCSeconds(), ms = Math.round(date.getUTCMilliseconds() / 10);
                    return (hr < 10 ? '0' : '') + hr + ':' + (min < 10 ? '0' : '') + min + ':' + (sec < 10 ? '0' : '') + sec + '.' + (ms < 10 ? '0' : '') + ms;
                    break;
                case 'AiccApi':
                    return '';
                    break;
            }
        }
    }
})();


//
//  Dialog
//
var Dialog = function (type, argsObj) {
    var _callback = function () { };

    var _open = function () {
        $.get(sco.rootPath + 'sco_01/content_' + sco.language + '/config/dialogs.html').done(function (data) {
            template = $(data).find('#dialog-template').html();

            // replace template placeholders with content
            $(data).find('#' + type).children().each(function () {
                template = template.replace('{{' + this.className + '}}', $(this).html());
            });

            // replace content placeholders with bookmark values
            var dataelements = ['learnerName', 'location', 'mode', 'sessionTime', 'totalTime', 'completionStatus', 'successStatus', 'scoreRaw'], rematches;
            for (var i = 0; i < dataelements.length; i++) {
                var elem = dataelements[i], regex = new RegExp('{{' + elem + '[\|]?(.*)}}'), matches;
                while ((matches = template.match(regex)) != null) {
                    // can't use RegExp.$1 (etc.) in IE6!!!
                    template = template.replace(regex, matches.length > 1 ? eval(matches[1].replace(new RegExp('value', 'g'), sco.apiConnector.bookmark(elem))) : sco.apiConnector.bookmark(elem));
                }
            }

            // replace template placeholders with arguments
            for (var p in argsObj) {
                template = template.replace('{{' + p + '}}', argsObj[p]);
            }

            $(document.body).append($('<div id="course-dialog-cover"><div id="course-dialog" class="' + type + '">' + template + '</div></div>'));
            $(document.body).addClass('no-scroll');

            $('#course-dialog').on('click', 'button', function () {
                var returnvalue = $(this).attr('data-dialog-returns');
                $('input, textarea').each(function () {
                    returnvalue += '[,]' + $(this).attr('name') + '[:]' + $(this).val();
                });
                _callback(returnvalue);
            });
        }).fail(function (xhr, textStatus) {
            MessageLog.addMessage('Could not load "dialogs.html": ' + textStatus, MessageLogLevel.Error);
        });
    }

    var _close = function () {
        _callback = function () { };
        $('#course-dialog-cover').remove();
        $(document.body).removeClass('no-scroll');
    }

    return {
        open: function () {
            /// <summary>Opens the dialog</summary>
            _open();
        },
        onCommand: function (cb) {
            if (typeof cb === 'function')
                _callback = cb;
        },
        close: function () {
            /// <summary>Closes the dialog</summary>
            _close();
        }
    }
}


//
//  KeyDown
//
$(document).on('keydown', function (e) {
    // key was pressed; so what shall we do?
    if (e.altKey && e.ctrlKey && e.shiftKey && e.keyCode == 190)
        gotoNextPage();
    if (e.altKey && e.ctrlKey && e.shiftKey && e.keyCode == 188)
        gotoPreviousPage();
    if (e.altKey && e.ctrlKey && e.shiftKey && e.keyCode == 67)
        scorePage();
});


//
//  other helper methods
//
function isTrue(obj) {
    return (typeof obj === 'number' && obj != 0) ||
           (typeof obj === 'boolean' && obj) ||
           (typeof obj === 'string' && (obj.toLowerCase() == 't' || obj.toLowerCase() == 'true' || obj.toLowerCase() == 'completed' || obj.toLowerCase() == 'passed' || obj == '1'));
}

function getUserEnvironment() {
    var s = 'window.navigator';
    for (var o in window.navigator) {
        if (typeof window.navigator[o] === 'function' || typeof window.navigator[o] === 'object')
            continue;

        s += '\n' + o + ': ' + window.navigator[o];
    }
    s += '\n\nwindow.screen';
    for (var o in window.screen) {
        if (typeof window.screen[o] === 'function' || typeof window.screen[o] === 'object')
            continue;

        s += '\n' + o + ': ' + window.screen[o];
    }
    return s;
}

function sendFormByIFrame(url, obj) {
    var postiframe = document.createElement('iframe'), doc, rdoc;
    postiframe.setAttribute('id', 'ajaxpostiframe');
    document.body.appendChild(postiframe);

    if (postiframe.contentDocument) {
        doc = postiframe.contentDocument;
    } else if (postiframe.contentWindow) {
        doc = postiframe.contentWindow.document;
    } else if (postiframe.document) {
        doc = postiframe.document;
    }

    doc.open();
    doc.close();

    var postform = doc.createElement('form');
    postform.setAttribute('action', url);
    postform.setAttribute('method', 'POST');

    for (var p in obj) {
        var formelem = doc.createElement('input');
        formelem.setAttribute('type', 'hidden');
        formelem.setAttribute('name', p);
        formelem.setAttribute('value', obj[p]);
        postform.appendChild(formelem);
    }

    doc.body.appendChild(postform);
    postform.submit();
}

Array.prototype.shuffle = function () {
    var tmp, current, top = this.length;
    if (top)
        while (--top) {
            current = Math.floor(Math.random() * (top + 1));
            tmp = this[current]
            this[current] = this[top];
            this[top] = tmp;
        }

    return this;
}