var RequirementsSniffer = (function () {

    var _sniffPlugins = function ($node) {
        var results = [];
        $node.find('allow').each(function () {
            switch ($(this).attr('plugin')) {
                case 'flash':
                    if (!_checkFlash($(this).attr('version')))
                        results.push({ name: 'flash', minver: $(this).attr('version').split('.')[0] });
                    break;
                case 'silverlight':
                    if (!_checkSilverlight($(this).attr('version')))
                        results.push({ name: 'silverlight', minver: $(this).attr('version').split('.')[0] });
                    break;
            }
        });
        return results;
    }

    var _sniffBrowser = function ($node) {
        var sniffresult = false;
        $node.find('allow, deny').each(function () {
            var platform = $(this).attr('platform'), client = $(this).attr('client'),
                minver = parseFloat($(this).attr('version')),
                matches = navigator.userAgent.match(_versionRegExp[client]);

            if (isNaN(minver)) minver = 0;
            if ((!platform || _platformRegExp[platform].test(navigator.userAgent)) &&
                 matches != null && matches.length > 1) {

                if (this.nodeName.toLowerCase() == 'deny') {
                    sniffresult = {};
                    return false;
                } else {
                    sniffresult = (parseFloat(matches[1]) >= minver) ? true : { name: client, minver: minver };
                    return false;
                }
            }
        });
        return sniffresult;
    }

    var _sniffCompatView = function () {
        var matches = navigator.userAgent.match(_versionRegExp['msie']);

        // we are in compat view if all of the following are true:
        //    1) the browser is MSIE
        //    2) the reported version (according to the user agent) is 7
        //    3) documentMode is set and is greater than zero (documentMode existed as of IE8, and is set even if the browser is in compat mode
        return matches != null && matches.length > 1 && parseInt(matches[1]) == 7 && document.documentMode && document.documentMode > 0;
    }

    var _platformRegExp = {
        android: /\Wandroid\W/i,
        iemobile: /\Wiemobile\W/i,
        ios: /[ipad|iphone|ipod]/i,
        macintosh: /\Wmacintosh\W/i,
        windows: /\Wwindows\W/i,
        x11: /\Wx11\W/i
    }

    var _versionRegExp = {
        chrome: /\sChrome\/(\d+\.\d+)/,
        firefox: /\sFirefox\/(\d+\.\d+)/,
        msie: /\sMSIE\s(\d+\.\d+);/,
        opera: /\sOpera\/(\d+\.\d+)/,
        safari: /\sVersion\/(\d+\.\d+)/
    }

    var _checkFlash = function (minVer) {
        var version = '0.0.0';
        if (navigator.plugins != null && navigator.plugins.length > 0) {
            var desc = navigator.plugins['Shockwave Flash'] ? navigator.plugins['Shockwave Flash'].description : '';
            var verArray = desc.split(' ');
            version = verArray[2] + (verArray[3] ? "." + verArray[3].split("r")[1] : "") + (verArray[4] ? "." + verArray[4].split("r")[1] : "");
        } else {
            var axoversion, axo;
            try {
                axo = new ActiveXObject('ShockwaveFlash.ShockwaveFlash.7');
                axoversion = axo.getVariable('$version');
            } catch (ex) { }
            if (!axoversion) {
                try {
                    axo = new ActiveXObject('ShockwaveFlash.ShockwaveFlash.6');
                    axoversion = 'WIN 6,0,21,0';
                    axo.AllowScriptAccess = 'always';
                    axoversion = axo.getVariable('$version');
                } catch (ex) { }
            }
            if (axoversion) {
                version = axoversion.split(' ')[1].replace(',', '.');
            }
        }

        var isok = false, mvArray = minVer.split('.'), cvArray = version.split('.'), pa;
        if (parseInt(cvArray[0]) > (pa = parseInt(mvArray[0])))
            isok = true;
        else if (parseInt(cvArray[0]) == pa) {
            if (parseInt(cvArray[1]) > (pa = parseInt(mvArray[1])))
                isok = true;
            else if (parseInt(cvArray[1]) == pa) {
                if (parseInt(cvArray[2]) > (pa = parseInt(mvArray[2])))
                    isok = true;
            }
        }

        return isok;
    }

    var _checkSilverlight = function (minVer) {
        if (minVer == undefined)
            minVer = null;

        var isVersionSupported = false;
        var container = null;

        try {
            var control = null;
            var tryNS = false;

            if (window.ActiveXObject) {
                try {
                    control = new ActiveXObject('AgControl.AgControl');
                    if (minVer === null) {
                        isVersionSupported = true;
                    }
                    else if (control.IsVersionSupported(minVer)) {
                        isVersionSupported = true;
                    }
                    control = null;
                }
                catch (e) {
                    tryNS = true;
                }
            }
            else {
                tryNS = true;
            }
            if (tryNS) {
                var plugin = navigator.plugins['Silverlight Plug-In'];
                if (plugin) {
                    if (minVer === null) {
                        isVersionSupported = true;
                    }
                    else {
                        var actualVer = plugin.description;
                        if (actualVer === '1.0.30226.2')
                            actualVer = '2.0.30226.2';
                        var actualVerArray = actualVer.split('.');
                        while (actualVerArray.length > 3) {
                            actualVerArray.pop();
                        }
                        while (actualVerArray.length < 4) {
                            actualVerArray.push(0);
                        }
                        var reqVerArray = minVer.split('.');
                        while (reqVerArray.length > 4) {
                            reqVerArray.pop();
                        }

                        var requiredVersionPart;
                        var actualVersionPart;
                        var index = 0;

                        do {
                            requiredVersionPart = parseInt(reqVerArray[index]);
                            actualVersionPart = parseInt(actualVerArray[index]);
                            index++;
                        }
                        while (index < reqVerArray.length && requiredVersionPart === actualVersionPart);

                        if (requiredVersionPart <= actualVersionPart && !isNaN(requiredVersionPart)) {
                            isVersionSupported = true;
                        }
                    }
                }
            }
        }
        catch (e) {
            isVersionSupported = false;
        }

        return isVersionSupported;
    }

    return {
        sniffPlugins: function ($node) {
            /// <summary>Checks to see if the user has the correct plugins to run this course.</summary>
            /// <param name="$node" type="jQuery">&lt;plugins&gt; node from ini.xml</param>
            /// <returns type="Array">Array of Objects detailing the issues.</returns>
            return _sniffPlugins($node);
        },
        sniffBrowser: function ($node) {
            /// <summary>Checks to see if the user is running a supported browser and version.</summary>
            /// <param name="$node" type="jQuery">&lt;browsers&gt; node from ini.xml</param>
            /// <returns type="Array">Array of Objects detailing the issues.</returns>
            var isok = _sniffBrowser($node);

            if (typeof isok === 'object')
                return isok;    // if we have an object, then it has already failed the check
            else if (isok)
                return null;    // if we have the boolean 'true', then it passed the check so return 'null'
            else
                return isTrue($node.attr('denyunlisted')) ? {} : null;  // It was unable to check since there wasn't a matching client/platform combo.
            // In that case, see if we are auto-denying unlisted clients.
        },
        sniffCompatView: function () {
            /// <summary>Checks to see if the browser is running in Compatibility View. Only applies to IE8+.</summary>
            /// <returns type="Boolean">Whether or not the browser is running in Compatibility View.</returns>
            return iscompat = _sniffCompatView();
        }
    }
})();