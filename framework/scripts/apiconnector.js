var ApiConnector = function (preferredApis) {
    var _api = null;
    var _bookmark = {};
    var _objectives, _interactions;

    // private methods
    var _findScorm2004Api = function () {
        var win = window, attempts = 0;
        while (win.API_1484_11 == null && ((win.parent != null && win.parent != win) || win.opener != null)) {
            if (++attempts > 15) {
                MessageLog.addMessage('Error finding SCORM 2004 API: Frames are too deeply nested.', MessageLogLevel.Warning);
                return null;
            }
            win = (win.parent != null && win.parent != win) ? win.parent : win.opener;
        }
        if (win.API_1484_11 != null)
            MessageLog.addMessage('Using SCORM 2004 API.', MessageLogLevel.Information);
        return win.API_1484_11 != null ? Scorm2004Api(win.API_1484_11) : null;
    }

    var _findScorm12Api = function () {
        var win = window, attempts = 0;
        while (win.API == null && ((win.parent != null && win.parent != win) || win.opener != null)) {
            if (++attempts > 15) {
                MessageLog.addMessage('Error finding SCORM 1.2 API: Frames are too deeply nested.', MessageLogLevel.Warning);
                return null;
            }
            win = (win.parent != null && win.parent != win) ? win.parent : win.opener;
        }
        if (win.API != null)
            MessageLog.addMessage('Using SCORM 1.2 API.', MessageLogLevel.Information);
        return win.API != null ? Scorm12Api(win.API) : null;
    }

    var _findAiccApi = function () {
        MessageLog.addMessage('Error: AICC not yet implemented.', MessageLogLevel.Error);
        return null;    // not yet implemented
    }

    var _getInitialValues = function () {
        // initialize the SCO
        _api.Initialize('');

        // get and parse suspend_data
        var suspendData = _api.GetValue(_api.path.suspendData);
        if (_api.GetLastError() != 0)
            MessageLog.addMessage('Error getting suspend data from LMS. Some saved information may be lost.', MessageLogLevel.Warning);
        _bookmark.suspendData = suspendData ? JSON.parse(suspendData) : {};

        _bookmark.learnerId = _api.GetValue(_api.path.learnerId);
        _bookmark.learnerName = _api.GetValue(_api.path.learnerName);
        _bookmark.location = _api.GetValue(_api.path.location);
        _bookmark.mode = _api.GetValue(_api.path.mode);
        _bookmark.totalTime = _api.GetValue(_api.path.totalTime);
        _bookmark.sessionStart = new Date();

        if (_api.name == 'Scorm12Api') {
            _bookmark.completionStatus = _api.GetValue(_api.path.lessonStatus);
        } else {
            _bookmark.completionStatus = _api.GetValue(_api.path.completionStatus);
            _bookmark.successStatus = _api.GetValue(_api.path.successStatus);
        }

        // I don't trust that all LMS vendors set score* elements properly; get data from ini.xml
        _bookmark.scoreMin = parseFloat(xml.ini.find('scoremin').text());
        _bookmark.scoreMax = parseFloat(xml.ini.find('scoremax').text());
        _bookmark.scoreThreshold = parseFloat(xml.ini.find('scorethreshold').text());
        _bookmark.scoreRaw = parseFloat(_api.path.scoreRaw);
        if (isNaN(_bookmark.scoreRaw)) _bookmark.scoreRaw = 0;
    }

    var _commitPageValues = function () {
        _bookmark.sessionTime = Convert.dateToTimespan(_api.name, new Date() - _bookmark.sessionStart);

        _api.SetValue(_api.path.suspendData, JSON.stringify(_bookmark.suspendData));
        _api.SetValue(_api.path.location, _bookmark.location);
        _api.SetValue(_api.path.sessionTime, _bookmark.sessionTime);

        for (var i = 0; i < _objectives.count() ; i++)
            _objectives.set(_objectives.get(i));
        _api.SetValue(_api.path.scoreRaw, _bookmark.scoreRaw);

        if (_api.name == 'Scorm12Api') {
            _api.SetValue(_api.path.lessonStatus, _bookmark.completionStatus);
        } else {
            _api.SetValue(_api.path.completionStatus, _bookmark.completionStatus);
            _api.SetValue(_api.path.successStatus, _bookmark.successStatus);
        }

        _api.Commit('');
        var errorCode = _api.GetLastError(''), errorString = '';
        if (errorCode != '0') {
            errorString = _api.GetErrorString(errorCode);
            MessageLog.addMessage('Error committing data to LMS. (' + errorCode + ') ' + errorString, MessageLogLevel.Error);
        }
    }

    var _scormExit = function () {
        _commitPageValues();
        _api.Terminate('');
    }

    // use the preferedApis array to find one communiciations API to use
    if (typeof preferredApis !== 'object' || preferredApis.length < 1)
        preferredApis = { 0: 'Scorm2004Api', 1: 'Scorm12Api' };
    $.each(preferredApis, function (key, api) {
        switch (api) {
            case 'Scorm2004Api':
                _api = _findScorm2004Api();
                return _api == null;
            case 'Scorm12Api':
                _api = _findScorm12Api();
                return _api == null;
            case 'AiccApi':
                _api = _findAiccApi();
                return _api == null;
        }
    });

    // if none of the preferred APIs could be used, emulate a SCORM 2004 API
    if (_api == null) {
        MessageLog.addMessage('Using SCORM 2004 API emulator.', MessageLogLevel.Information);
        _api = Scorm2004Api(Scorm2004ApiEmulator());
    }

    _getInitialValues();
    _objectives = ObjectivesManager(_api);
    _interactions = InteractionsManager(_api);

    // public interface
    return {
        Initialize: function () {
            _api.Initialize();
        },
        Terminate: function () {
            _api.Terminate();
        },
        GetValue: function (element) {
            return _api.GetValue(element);
        },
        SetValue: function (element, value) {
            _api.SetValue(element, value);
        },
        Commit: function () {
            _api.Commit();
        },
        GetLastError: function () {
            return _api.GetLastError();
        },
        GetErrorString: function (code) {
            return _api.GetErrorString(code);
        },
        GetDiagnostic: function (code) {
            return _api.GetDiagnostic(code);
        },
        bookmark: function (element, value) {
            if (value == null || value == undefined)
                return _bookmark[element];
            else
                _bookmark[element] = value;
        },
        suspendData: function (element, value) {
            if (value == null || value == undefined)
                return _bookmark.suspendData[element];
            else
                _bookmark.suspendData[element] = value;
        },
        commitPageValues: function () {
            _commitPageValues();
        },
        scormExit: function () {
            _scormExit();
        },
        objectives: _objectives,
        interactions: _interactions,
        getApiName: function () {
            return _api.name;
        },
        getPath: function (key) {
            return _api.path[key];
        },
        getInteractionType: function (key) {
            return _api.interactionType[key];
        },
        getResult: function (key) {
            return _api.result[key];
        }
    }
};

var ObjectivesManager = function (api) {
    var _objectives = {};
    var _count = 0;

    var count = parseInt(api.GetValue(api.path.objectives + api.path.count));
    if (!isNaN(count)) {
        _count = count;
        for (var i = 0; i < count; i++) {
            obj = {
                n: i,
                id: api.GetValue(api.path.objectivesNId(i)),
                score: {
                    scaled: parseFloat(api.GetValue(api.path.objectivesNScoreScaled(i))),
                    raw: parseFloat(api.GetValue(api.path.objectivesNScoreRaw(i))),
                    min: parseFloat(api.GetValue(api.path.objectivesNScoreMin(i))),
                    max: parseFloat(api.GetValue(api.path.objectivesNScoreMax(i)))
                },
                successStatus: api.GetValue(api.path.objectivesNSuccessStatus(i)),
                completionStatus: api.GetValue(api.path.objectivesNCompletionStatus(i))
            }
            if (api.name == 'Scorm2004Api') {
                obj.progressMeasure = parseFloat(api.GetValue(api.path.objectivesNProgressMeasure(i)));
                obj.description = api.GetValue(api.path.objectivesNDescription(i));
            }

            if (isNaN(obj.score.scaled)) obj.score.scaled = 0;
            if (isNaN(obj.score.raw)) obj.score.raw = 0;
            if (isNaN(obj.score.min)) obj.score.min = 0;
            if (isNaN(obj.score.max)) obj.score.max = 1;
            if (isNaN(obj.progressMeasure)) obj.progressMeasure = 0;
            _objectives[obj.id] = obj;
        }
    }


    // private methods
    var _get = function (id) {
        var ret = null;
        if (typeof id === 'string') {
            $.each(_objectives, function () {
                if (this.id == id)
                    ret = this;
            });
        } else if (typeof id === 'number') {
            $.each(_objectives, function () {
                if (this.n == id)
                    ret = this;
            });
        }
        return ret;
    }

    var _getOrCreate = function (id) {
        var obj = _get(id);
        if (obj == null) {
            if (typeof id === 'number' && id != _count)
                MessageLog.addMessage('Cannot create objective with the given index (' + id + '). Adding objective with next consecutive index instead.', MessageLogLevel.Warning);
            var objid = typeof id === 'string' ? id : 'objective' + _count;
            obj = {
                n: _count,
                id: objid,
                score: { scaled: 0, raw: 0, min: 0, max: 0 },
                successStatus: 'unknown',
                completionStatus: 'unknown',
                progressMeasure: 0,
                description: ''
            }
            _set(obj);
            _objectives[objid] = obj;
            _count++;
        }
        return obj;
    }

    var _set = function (obj) {
        api.SetValue(api.path.objectivesNId(obj.n), obj.id);
        api.SetValue(api.path.objectivesNScoreScaled(obj.n), obj.score.scaled);
        api.SetValue(api.path.objectivesNScoreRaw(obj.n), obj.score.raw);
        api.SetValue(api.path.objectivesNScoreMin(obj.n), obj.score.min);
        api.SetValue(api.path.objectivesNScoreMax(obj.n), obj.score.max);
        api.SetValue(api.path.objectivesNSuccessStatus(obj.n), obj.successStatus);
        api.SetValue(api.path.objectivesNCompletionStatus(obj.n), obj.completionStatus);
        if (api.name == 'Scorm2004Api') {
            api.SetValue(api.path.objectivesNProgressMeasure(obj.n), obj.progressMeasure);
            api.SetValue(api.path.objectivesNDescription(obj.n), obj.description);
        }
    }

    // public interface
    return {
        count: function () {
            /// <summary>Gets the number of objectives.</summary>
            /// <returns type="Number">Number of objectives.</returns>
            return _count;
        },
        get: function (id) {
            /// <signature>
            /// <summary>Gets the objective with the given id.</summary>
            /// <param name="id" type="String">ID of the objective you wish to get.</param>
            /// <returns type="Objective">Objective with the given id.</returns>
            /// </signature>
            /// <signature>
            /// <summary>Gets the objective with the given index.</summary>
            /// <param name="id" type="Number">Index of the objective you wish to get.</param>
            /// <returns type="Objective">Objective with the given index.</returns>
            /// </signature>
            return _get(id);
        },
        getOrCreate: function (id) {
            /// <signature>
            /// <summary>Gets the objective with the given id. If it doesn't already exist, it creates a new objective with the id.</summary>
            /// <param name="id" type="String">ID of the objective you wish to get.</param>
            /// <returns type="Objective">Objective with the given id.</returns>
            /// </signature>
            /// <signature>
            /// <summary>Gets the objective with the given index. If it doesn't already exist, it creates a new objective at that index.</summary>
            /// <param name="id" type="Number">Index of the objective you wish to get.</param>
            /// <returns type="Objective">Objective with the given index.</returns>
            /// </signature>
            return _getOrCreate(id);
        },
        set: function (obj) {
            /// <summary>Sets (saves) the objective.</summary>
            _set(obj);
        }
    }
}

var InteractionsManager = function (api) {
    var _interactions = {};
    var _count = 0;

    // private methods
    var _get = function (id) {
        var retArray = [];
        if (typeof id === 'string') {
            $.each(_interactions, function () {
                if (this.id == id)
                    retArray.push(this);
            });
        } else if (typeof id === 'number') {
            $.each(_interactions, function () {
                if (this.n == id)
                    retArray.push(this);
            });
        }
        return retArray;
    }

    var _create = function (id) {
        var interaction;
        if (typeof id === 'number' && id != _count)
            MessageLog.addMessage('Cannot create interaction with the given index (' + id + '). Adding interaction with next consecutive index instead.', MessageLogLevel.Warning);
        var interactionid = typeof id === 'string' ? id : 'interaction' + _count;
        interaction = {
            n: _count,
            id: id,
            type: '',
            timestamp: new Date(),
            weighting: '1',
            learnerResponse: '',
            result: api.result.neutral,
            latency: new Date(),
            description: '',
            objectives: _interactionObjectives(_count, 0),
            correctResponses: _interactionCorrectResponses(_count, 0)
        }
        //_set(interaction);
        _interactions[_count] = interaction;
        _count++;
        return interaction;
    }

    var _set = function (interaction) {
        api.SetValue(api.path.interactionsNId(interaction.n), interaction.id);
        api.SetValue(api.path.interactionsNType(interaction.n), interaction.type);
        api.SetValue(api.path.interactionsNTimestamp(interaction.n), Convert.dateToCmiDate(api.name, interaction.timestamp));
        api.SetValue(api.path.interactionsNWeighting(interaction.n), interaction.weighting);
        api.SetValue(api.path.interactionsNLearnerResponse(interaction.n), interaction.learnerResponse);
        api.SetValue(api.path.interactionsNResult(interaction.n), interaction.result);
        api.SetValue(api.path.interactionsNLatency(interaction.n), Convert.dateToTimespan(api.name, new Date() - interaction.timestamp));
        if (api.name == 'Scorm2004Api') {
            api.SetValue(api.path.interactionsNDescription(interaction.n), interaction.description);
        }
        for (var i = 0; i < interaction.objectives.count() ; i++)
            interaction.objectives.set(interaction.objectives.get(i));
        for (var i = 0; i < interaction.correctResponses.count() ; i++)
            interaction.correctResponses.set(interaction.correctResponses.get(i));
    }

    var _interactionObjectives = function (nIndex, objectivesCount) {
        var _objectives = {};
        var _objectivesCount = objectivesCount;

        for (var j = 0; j < _objectivesCount; j++) {
            obj = {
                n: j,
                id: api.GetValue(api.path.interactionsNObjectivesMId(nIndex, j))
            }
            _objectives[obj.id] = obj;
        }

        // private methods
        var _getObjective = function (id) {
            var ret = null;
            if (typeof id === 'string') {
                $.each(_objectives, function () {
                    if (this.id == id)
                        ret = this;
                });
            } else if (typeof id === 'number') {
                $.each(_objectives, function () {
                    if (this.n == id)
                        ret = this;
                });
            }
            return ret;
        }

        var _createObjective = function (id) {
            var obj;
            if (typeof id === 'number' && id != _objectivesCount)
                MessageLog.addMessage('Cannot create objective with the given index (' + id + '). Adding objective with next consecutive index instead.', MessageLogLevel.Warning);
            var objid = typeof id === 'string' ? id : 'objective' + _objectivesCount;
            obj = {
                n: _objectivesCount,
                id: objid
            }
            //_set(obj);
            _objectives[objid] = obj;
            _objectivesCount++;
            return obj;
        }

        var _set = function (obj) {
            api.SetValue(api.path.interactionsNObjectivesMId(nIndex, obj.n), obj.id);
        }

        // public interface
        return {
            count: function () {
                /// <summary>Gets the number of objectives assigned to the interaction.</summary>
                /// <returns type="Number">Number of objectives assigned to the interaction.</returns>
                return _objectivesCount;
            },
            get: function (id) {
                /// <signature>
                /// <summary>Gets the objective with the given id.</summary>
                /// <param name="id" type="String">ID of the objective you wish to get.</param>
                /// <returns type="Objective">Objective with the given id.</returns>
                /// </signature>
                /// <signature>
                /// <summary>Gets the objective with the given index.</summary>
                /// <param name="id" type="Number">Index of the objective you wish to get.</param>
                /// <returns type="Objective">Objective with the given index.</returns>
                /// </signature>
                return _getObjective(id);
            },
            create: function (id) {
                /// <signature>
                /// <summary>Gets the objective with the given id. If it doesn't already exist, it creates a new objective with the id.</summary>
                /// <param name="id" type="String">ID of the objective you wish to get.</param>
                /// <returns type="Objective">Objective with the given id.</returns>
                /// </signature>
                /// <signature>
                /// <summary>Gets the objective with the given index. If it doesn't already exist, it creates a new objective at that index.</summary>
                /// <param name="id" type="Number">Index of the objective you wish to get.</param>
                /// <returns type="Objective">Objective with the given index.</returns>
                /// </signature>
                return _createObjective(id);
            },
            set: function (obj) {
                /// <summary>Sets (saves) the objective.</summary>
                _set(obj);
            }
        }
    }

    var _interactionCorrectResponses = function (nIndex, correctResponsesCount) {
        var _correctResponses = {};
        var _correctResponsesCount = 0;

        for (var k = 0; k < _correctResponsesCount; k++) {
            correctResponse = {
                n: k,
                id: 'correctResponse' + k,
                pattern: api.GetValue(api.path.interactionsNCorrectResponsesMPattern(nIndex, k))
            }
            _correctResponses[correctResponse.id] = correctResponse;
        }

        // private methods
        var _getCorrectResponse = function (pattern) {
            var ret = null;
            if (typeof pattern === 'string') {
                $.each(_correctResponses, function () {
                    if (this.pattern == pattern)
                        ret = this;
                });
            } else if (typeof pattern === 'number') {
                $.each(_correctResponses, function () {
                    if (this.n == pattern)
                        ret = this;
                });
            }
            return ret;
        }

        var _createCorrectResponse = function (pattern) {
            var correctResponse;
            if (typeof id === 'number' && id != _correctResponsesCount)
                MessageLog.addMessage('Cannot create objective with the given index (' + id + '). Adding objective with next consecutive index instead.', MessageLogLevel.Warning);
            correctResponse = {
                n: _correctResponsesCount,
                id: 'correctResponse' + _correctResponsesCount,
                pattern: pattern
            }
            //_set(correctResponse);
            _correctResponses[correctResponse.id] = correctResponse;
            _correctResponsesCount++;
            return correctResponse;
        }

        var _set = function (correctResponse) {
            api.SetValue(api.path.interactionsNCorrectResponsesMPattern(nIndex, correctResponse.n), correctResponse.pattern);
        }

        // public interface
        return {
            count: function () {
                /// <summary>Gets the number of correct responses allowed by the interaction.</summary>
                /// <returns type="Number">Number of correct responses allowed by the interaction.</returns>
                return _correctResponsesCount;
            },
            get: function (pattern) {
                /// <signature>
                /// <summary>Gets the correct response with the given id.</summary>
                /// <param name="id" type="String">ID of the correct response you wish to get.</param>
                /// <returns type="Objective">Correct response with the given id.</returns>
                /// </signature>
                /// <signature>
                /// <summary>Gets the correct response with the given index.</summary>
                /// <param name="id" type="Number">Index of the correct response you wish to get.</param>
                /// <returns type="Objective">Correct response with the given index.</returns>
                /// </signature>
                return _getCorrectResponse(pattern);
            },
            create: function (pattern) {
                /// <signature>
                /// <summary>Gets the correct response with the given id. If it doesn't already exist, it creates a new correct response with the id.</summary>
                /// <param name="id" type="String">ID of the correct response you wish to get.</param>
                /// <returns type="Objective">Correct response with the given id.</returns>
                /// </signature>
                /// <signature>
                /// <summary>Gets the correct response with the given index. If it doesn't already exist, it creates a new correct response at that index.</summary>
                /// <param name="id" type="Number">Index of the correct response you wish to get.</param>
                /// <returns type="Objective">Correct response with the given index.</returns>
                /// </signature>
                return _createCorrectResponse(pattern);
            },
            set: function (correctResponse) {
                /// <summary>Sets (saves) the correct response.</summary>
                _set(correctResponse);
            }
        }
    }

    var count = parseInt(api.GetValue(api.path.interactions + api.path.count));
    if (!isNaN(count)) {
        _count = count;
        for (var i = 0; i < count; i++) {
            var objectivesCount = parseInt(api.GetValue(api.path.interactionsNObjectives(i) + api.path.count));
            if (!isNaN(objectivesCount)) objectivesCount = 0;
            var correctResponsesCount = parseInt(api.GetValue(api.path.interactionsNCorrectResponses(i) + api.path.count));
            if (!isNaN(correctResponsesCount)) correctResponsesCount = 0;
            interaction = {
                n: i,
                id: api.GetValue(api.path.interactionsNId(i)),
                type: api.GetValue(api.path.interactionsNType(i)),
                timestamp: api.GetValue(api.path.interactionsNTimestamp(i)),
                weighting: parseFloat(api.GetValue(api.path.interactionsNWeighting(i))),
                learnerResponse: api.GetValue(api.path.interactionsNLearnerResponse(i)),
                result: api.GetValue(api.path.interactionsNResult(i)),
                latency: api.GetValue(api.path.interactionsNLatency(i)),
                objectives: _interactionObjectives(i, objectivesCount),
                correctResponses: _interactionCorrectResponses(i, correctResponsesCount)
            }
            if (api.name == 'Scorm2004Api') {
                interaction.description = api.GetValue(api.path.interactionsNDescription(i));
            }
            _interactions[interaction.id] = interaction;
        }
    }

    // public interface
    return {
        count: function () {
            /// <summary>Gets the number of interactions.</summary>
            /// <returns type="Number">Number of interactions.</returns>
            return _count;
        },
        get: function (id) {
            /// <signature>
            /// <summary>Gets the objective with the given id.</summary>
            /// <param name="id" type="String">ID of the objective you wish to get.</param>
            /// <returns type="Objective">Objective with the given id.</returns>
            /// </signature>
            /// <signature>
            /// <summary>Gets the objective with the given index.</summary>
            /// <param name="id" type="Number">Index of the objective you wish to get.</param>
            /// <returns type="Objective">Objective with the given index.</returns>
            /// </signature>
            return _get(id);
        },
        create: function (id) {
            /// <signature>
            /// <summary>Gets the objective with the given id. If it doesn't already exist, it creates a new objective with the id.</summary>
            /// <param name="id" type="String">ID of the objective you wish to get.</param>
            /// <returns type="Objective">Objective with the given id.</returns>
            /// </signature>
            /// <signature>
            /// <summary>Gets the objective with the given index. If it doesn't already exist, it creates a new objective at that index.</summary>
            /// <param name="id" type="Number">Index of the objective you wish to get.</param>
            /// <returns type="Objective">Objective with the given index.</returns>
            /// </signature>
            return _create(id);
        },
        set: function (interaction) {
            /// <summary>Sets (saves) the interaction.</summary>
            _set(interaction);
            api.Commit('');
        }
    }
}

var Scorm12Api = function (handle) {
    var _handle = handle;

    return {
        Initialize: function (element) {
            if (sco.isDebug) MessageLog.addMessage('LMS: Initialize', MessageLogLevel.Information);
            return _handle.LMSInitialize('');
        },
        Terminate: function (element) {
            if (sco.isDebug) MessageLog.addMessage('LMS: Terminate', MessageLogLevel.Information);
            return _handle.LMSFinish('');
        },
        GetValue: function (element) {
            if (sco.isDebug) MessageLog.addMessage('LMS: GetValue("' + element + '")', MessageLogLevel.Information);
            return _handle.LMSGetValue(element);
        },
        SetValue: function (element, value) {
            if (sco.isDebug) MessageLog.addMessage('LMS: SetValue("' + element + '", "' + value + '")', MessageLogLevel.Information);
            return _handle.LMSSetValue(element, value);
        },
        Commit: function (element) {
            if (sco.isDebug) MessageLog.addMessage('LMS: Commit', MessageLogLevel.Information);
            return _handle.LMSCommit('');
        },
        GetLastError: function (element) {
            if (sco.isDebug) MessageLog.addMessage('LMS: GetLastError', MessageLogLevel.Information);
            return _handle.LMSGetLastError('');
        },
        GetErrorString: function (code) {
            if (sco.isDebug) MessageLog.addMessage('LMS: GetErrorString("' + code + '")', MessageLogLevel.Information);
            return _handle.LMSGetErrorString(code);
        },
        GetDiagnostic: function (code) {
            if (sco.isDebug) MessageLog.addMessage('LMS: GetDiagnostic', MessageLogLevel.Information);
            return _handle.LMSGetDiagnostic(code);
        },
        name: 'Scorm12Api',
        path: {
            children: '._children',
            count: '._count',
            learnerId: 'cmi.core.student_id',
            learnerName: 'cmi.core.student_name',
            location: 'cmi.core.lesson_location',
            credit: 'cmi.core.credit',
            lessonStatus: 'cmi.core.lesson_status',
            entry: 'cmi.core.entry',
            exit: 'cmi.core.exit',
            score: 'cmi.core.score',
            scoreRaw: 'cmi.core.score.raw',
            scoreMax: 'cmi.core.score.max',
            scoreMin: 'cmi.core.score.min',
            totalTime: 'cmi.core.total_time',
            sessionTime: 'cmi.core.session_time',
            mode: 'cmi.core.lesson_mode',
            suspendData: 'cmi.suspend_data',
            launchData: 'cmi.launch_data',
            commentsFromLearner: 'cmi.comments',
            commentsFromLms: 'cmi.comments_from_lms',
            objectives: 'cmi.objectives',
            objectivesNId: function (index) {
                /// <param name="index" type="Number">Index (0-based) of the objective.</param>
                return 'cmi.objectives.' + index + '.id';
            },
            objectivesNScoreScaled: function (index) {
                /// <param name="index" type="Number">Index (0-based) of the objective.</param>
                return 'cmi.objectives.' + index + '.score';
            },
            objectivesNScoreRaw: function (index) {
                /// <param name="index" type="Number">Index (0-based) of the objective.</param>
                return 'cmi.objectives.' + index + '.score.raw';
            },
            objectivesNScoreMin: function (index) {
                /// <param name="index" type="Number">Index (0-based) of the objective.</param>
                return 'cmi.objectives.' + index + '.score.min';
            },
            objectivesNScoreMax: function (index) {
                /// <param name="index" type="Number">Index (0-based) of the objective.</param>
                return 'cmi.objectives.' + index + '.score.max';
            },
            objectivesNSuccessStatus: function (index) {
                /// <param name="index" type="Number">Index (0-based) of the objective.</param>
                return 'cmi.objectives.' + index + '.status';
            },
            objectivesNCompletionStatus: function (index) {
                /// <param name="index" type="Number">Index (0-based) of the objective.</param>
                return 'cmi.objectives.' + index + '.status';
            },
            scaledPassingScore: 'cmi.student_data.mastery_score',
            maximumTimeAllowed: 'cmi.student_data.max_time_allowed',
            timeLimitAction: 'cmi.student_data.time_limit_action',
            learnerPreference: 'cmi.student_preference',
            learnerPreferenceAudioLevel: 'cmi.student_preference.audio',
            learnerPreferenceLanguage: 'cmi.student_preference.language',
            learnerPreferenceDeliverySpeed: 'cmi.student_preference.speed',
            learnerPreferenceAudioCaptioning: 'cmi.student_preference.text',
            interactions: 'cmi.interactions',
            interactionsNId: function (index) {
                /// <param name="index" type="Number">Index (0-based) of the interaction.</param>
                return 'cmi.interactions.' + index + '.id';
            },
            interactionsNObjectives: function (index) {
                /// <param name="index" type="Number">Index (0-based) of the interaction.</param>
                return 'cmi.interactions.' + index + '.objectives';
            },
            interactionsNObjectivesMId: function (index1, index2) {
                /// <param name="index1" type="Number">Index (0-based) of the interaction.</param>
                /// <param name="index2" type="Number">Index (0-based) of the objective.</param>
                return 'cmi.interactions.' + index1 + '.objectives.' + index2 + '.id';
            },
            interactionsNTimestamp: function (index) {
                /// <param name="index" type="Number">Index (0-based) of the interaction.</param>
                return 'cmi.interactions.' + index + '.time';
            },
            interactionsNType: function (index) {
                /// <param name="index" type="Number">Index (0-based) of the interaction.</param>
                return 'cmi.interactions.' + index + '.type';
            },
            interactionsNCorrectResponses: function (index) {
                /// <param name="index" type="Number">Index (0-based) of the interaction.</param>
                return 'cmi.interactions.' + index + '.correct_responses';
            },
            interactionsNCorrectResponsesMPattern: function (index1, index2) {
                /// <param name="index1" type="Number">Index (0-based) of the interaction.</param>
                /// <param name="index2" type="Number">Index (0-based) of the pattern.</param>
                return 'cmi.interactions.' + index1 + '.correct_responses.' + index2 + '.pattern';
            },
            interactionsNWeighting: function (index) {
                /// <param name="index" type="Number">Index (0-based) of the interaction.</param>
                return 'cmi.interactions.' + index + '.weighting';
            },
            interactionsNLearnerResponse: function (index) {
                /// <param name="index" type="Number">Index (0-based) of the interaction.</param>
                return 'cmi.interactions.' + index + '.student_response';
            },
            interactionsNResult: function (index) {
                /// <param name="index" type="Number">Index (0-based) of the interaction.</param>
                return 'cmi.interactions.' + index + '.result';
            },
            interactionsNLatency: function (index) {
                /// <param name="index" type="Number">Index (0-based) of the interaction.</param>
                return 'cmi.interactions.' + index + '.latency';
            },
            version: '',
            commentsFromLearnerNComment: '',
            commentsFromLearnerNLocation: '',
            commentsFromLearnerNTimestamp: '',
            commentsFromLmsNComment: '',
            commentsFromLmsNLocation: '',
            commentsFromLmsNTimestamp: '',
            completionThreshold: '',
            interactionsNDescription: '',
            objectivesNProgressMeasure: '',
            objectivesNDescription: '',
            progressMeasure: '',
            scoreScaled: '',
            successStatus: '',
            completionStatus: ''
        },
        interactionType: {
            trueFalse: 'true-false',
            multipleChoice: 'choice',
            fillIn: 'fill-in',
            matching: 'matching',
            performance: 'performance',
            sequencing: 'sequencing',
            likert: 'likert',
            numeric: 'numeric'
        },
        result: {
            correct: 'correct',
            incorrect: 'wrong',
            unanticipated: 'unanticipated',
            neutral: 'neutral'
        }
    }
};

var Scorm2004Api = function (handle) {
    var _handle = handle;

    return {
        Initialize: function (element) {
            if (sco.isDebug) MessageLog.addMessage('LMS: Initialize', MessageLogLevel.Information);
            return _handle.Initialize('');
        },
        Terminate: function (element) {
            if (sco.isDebug) MessageLog.addMessage('LMS: Terminate', MessageLogLevel.Information);
            return _handle.Terminate('');
        },
        GetValue: function (element) {
            if (sco.isDebug) MessageLog.addMessage('LMS: GetValue("' + element + '")', MessageLogLevel.Information);
            return _handle.GetValue(element);
        },
        SetValue: function (element, value) {
            if (sco.isDebug) MessageLog.addMessage('LMS: SetValue("' + element + '", "' + value + '")', MessageLogLevel.Information);
            return _handle.SetValue(element, value);
        },
        Commit: function (element) {
            if (sco.isDebug) MessageLog.addMessage('LMS: Commit', MessageLogLevel.Information);
            return _handle.Commit('');
        },
        GetLastError: function (element) {
            if (sco.isDebug) MessageLog.addMessage('LMS: GetLastError', MessageLogLevel.Information);
            return _handle.GetLastError('');
        },
        GetErrorString: function (code) {
            if (sco.isDebug) MessageLog.addMessage('LMS: GetErrorString("' + code + '")', MessageLogLevel.Information);
            return _handle.GetErrorString(code);
        },
        GetDiagnostic: function (code) {
            if (sco.isDebug) MessageLog.addMessage('LMS: GetDiagnostic', MessageLogLevel.Information);
            return _handle.GetDiagnostic(code);
        },
        name: 'Scorm2004Api',
        path: {
            children: '._children',
            count: '._count',
            version: 'cmi._version',
            commentsFromLearner: 'cmi.comments_from_learner',
            commentsFromLearnerNComment: function (index) {
                /// <param name="index" type="Number">Index (0-based) of the comment.</param>
                return 'cmi.comments_from_learner.' + index + '.comment';
            },
            commentsFromLearnerNLocation: function (index) {
                /// <param name="index" type="Number">Index (0-based) of the comment.</param>
                return 'cmi.comments_from_learner.' + index + '.location';
            },
            commentsFromLearnerNTimestamp: function (index) {
                /// <param name="index" type="Number">Index (0-based) of the comment.</param>
                return 'cmi.comments_from_learner.' + index + '.timestamp';
            },
            commentsFromLms: 'cmi.comments_from_lms',
            commentsFromLmsNComment: function (index) {
                /// <param name="index" type="Number">Index (0-based) of the comment.</param>
                return 'cmi.comments_from_lms.' + index + '.comment';
            },
            commentsFromLmsNLocation: function (index) {
                /// <param name="index" type="Number">Index (0-based) of the comment.</param>
                return 'cmi.comments_from_lms.' + index + '.location';
            },
            commentsFromLmsNTimestamp: function (index) {
                /// <param name="index" type="Number">Index (0-based) of the comment.</param>
                return 'cmi.comments_from_lms.' + index + '.timestamp';
            },
            completionStatus: 'cmi.completion_status',
            completionThreshold: 'cmi.completion_threshold',
            credit: 'cmi.credit',
            entry: 'cmi.entry',
            exit: 'cmi.exit',
            interactions: 'cmi.interactions',
            interactionsNId: function (index) {
                /// <param name="index" type="Number">Index (0-based) of the interaction.</param>
                return 'cmi.interactions.' + index + '.id';
            },
            interactionsNType: function (index) {
                /// <param name="index" type="Number">Index (0-based) of the interaction.</param>
                return 'cmi.interactions.' + index + '.type';
            },
            interactionsNTimestamp: function (index) {
                /// <param name="index" type="Number">Index (0-based) of the interaction.</param>
                return 'cmi.interactions.' + index + '.timestamp';
            },
            interactionsNWeighting: function (index) {
                /// <param name="index" type="Number">Index (0-based) of the interaction.</param>
                return 'cmi.interactions.' + index + '.weighting';
            },
            interactionsNLearnerResponse: function (index) {
                /// <param name="index" type="Number">Index (0-based) of the interaction.</param>
                return 'cmi.interactions.' + index + '.learner_response';
            },
            interactionsNResult: function (index) {
                /// <param name="index" type="Number">Index (0-based) of the interaction.</param>
                return 'cmi.interactions.' + index + '.result';
            },
            interactionsNLatency: function (index) {
                /// <param name="index" type="Number">Index (0-based) of the interaction.</param>
                return 'cmi.interactions.' + index + '.latency';
            },
            interactionsNDescription: function (index) {
                /// <param name="index" type="Number">Index (0-based) of the interaction.</param>
                return 'cmi.interactions.' + index + '.description';
            },
            interactionsNObjectives: function (index) {
                /// <param name="index" type="Number">Index (0-based) of the interaction.</param>
                return 'cmi.interactions.' + index + '.objectives';
            },
            interactionsNObjectivesMId: function (index1, index2) {
                /// <param name="index1" type="Number">Index (0-based) of the interaction.</param>
                /// <param name="index2" type="Number">Index (0-based) of the objective.</param>
                return 'cmi.interactions.' + index1 + '.objectives.' + index2 + '.id';
            },
            interactionsNCorrectResponses: function (index) {
                /// <param name="index" type="Number">Index (0-based) of the interaction.</param>
                return 'cmi.interactions.' + index + '.correct_responses';
            },
            interactionsNCorrectResponsesMPattern: function (index1, index2) {
                /// <param name="index1" type="Number">Index (0-based) of the interaction.</param>
                /// <param name="index2" type="Number">Index (0-based) of the pattern.</param>
                return 'cmi.interactions.' + index1 + '.correct_responses.' + index2 + '.pattern';
            },
            launchData: 'cmi.launch_data',
            learnerId: 'cmi.learner_id',
            learnerName: 'cmi.learner_name',
            learnerPreference: 'cmi.learner_preference',
            learnerPreferenceAudioLevel: 'cmi.learner_preference.audio_level',
            learnerPreferenceLanguage: 'cmi.learner_preference.language',
            learnerPreferenceDeliverySpeed: 'cmi.learner_preference.delivery_speed',
            learnerPreferenceAudioCaptioning: 'cmi.learner_preference.audio_captioning',
            location: 'cmi.location',
            maximumTimeAllowed: 'cmi.max_time_allowed',
            mode: 'cmi.mode',
            objectives: 'cmi.objectives',
            objectivesNId: function (index) {
                /// <param name="index" type="Number">Index (0-based) of the objective.</param>
                return 'cmi.objectives.' + index + '.id';
            },
            objectivesNScore: function (index) {
                /// <param name="index" type="Number">Index (0-based) of the objective.</param>
                return 'cmi.objectives.' + index + '.score';
            },
            objectivesNScoreScaled: function (index) {
                /// <param name="index" type="Number">Index (0-based) of the objective.</param>
                return 'cmi.objectives.' + index + '.score.scaled';
            },
            objectivesNScoreRaw: function (index) {
                /// <param name="index" type="Number">Index (0-based) of the objective.</param>
                return 'cmi.objectives.' + index + '.score.raw';
            },
            objectivesNScoreMin: function (index) {
                /// <param name="index" type="Number">Index (0-based) of the objective.</param>
                return 'cmi.objectives.' + index + '.score.min';
            },
            objectivesNScoreMax: function (index) {
                /// <param name="index" type="Number">Index (0-based) of the objective.</param>
                return 'cmi.objectives.' + index + '.score.max';
            },
            objectivesNSuccessStatus: function (index) {
                /// <param name="index" type="Number">Index (0-based) of the objective.</param>
                return 'cmi.objectives.' + index + '.success_status';
            },
            objectivesNCompletionStatus: function (index) {
                /// <param name="index" type="Number">Index (0-based) of the objective.</param>
                return 'cmi.objectives.' + index + '.completion_status';
            },
            objectivesNProgressMeasure: function (index) {
                /// <param name="index" type="Number">Index (0-based) of the objective.</param>
                return 'cmi.objectives.' + index + '.progress_measure';
            },
            objectivesNDescription: function (index) {
                /// <param name="index" type="Number">Index (0-based) of the objective.</param>
                return 'cmi.objectives.' + index + '.description';
            },
            progressMeasure: 'cmi.progress_measure',
            scaledPassingScore: 'cmi.scaled_passing_score',
            score: 'cmi.score',
            scoreScaled: 'cmi.score.scaled',
            scoreRaw: 'cmi.score.raw',
            scoreMax: 'cmi.score.max',
            scoreMin: 'cmi.score.min',
            sessionTime: 'cmi.session_time',
            successStatus: 'cmi.success_status',
            suspendData: 'cmi.suspend_data',
            timeLimitAction: 'cmi.time_limit_action',
            totalTime: 'cmi.total_time',
            lessonStatus: ''
        },
        interactionType: {
            trueFalse: 'true_false',
            multipleChoice: 'multiple_choice',
            fillIn: 'fill_in',
            matching: 'matching',
            performance: 'performance',
            sequencing: 'sequencing',
            likert: 'likert',
            numeric: 'numeric'
        },
        result: {
            correct: 'correct',
            incorrect: 'incorrect',
            unanticipated: 'unanticipated',
            neutral: 'neutral'
        }
    }
};

var AiccApi = function (handle) {
    var _handle = handle;

    return {
        Initialize: function () {

        },
        Terminate: function () {

        },
        GetValue: function (element) {

        },
        SetValue: function (element, value) {

        },
        Commit: function () {

        },
        GetLastError: function () {

        },
        GetErrorString: function (code) {

        },
        GetDiagnostic: function (code) {

        },
        name: 'AiccApi'
    }
};

var Scorm2004ApiEmulator = function () {
    return {
        Initialize: function () {
            //MessageLog.addMessage('LMS: Initialize', MessageLogLevel.Information);
            return 'true';
        },
        Terminate: function () {
            //MessageLog.addMessage('LMS: Terminate', MessageLogLevel.Information);
            return 'true';
        },
        GetValue: function (element) {
            //MessageLog.addMessage('LMS: GetValue("' + element + '")', MessageLogLevel.Information);
            return '';
        },
        SetValue: function (element, value) {
            //MessageLog.addMessage('LMS: SetValue("' + element + '", "' + value + '")', MessageLogLevel.Information);
            return 'true';
        },
        Commit: function () {
            //MessageLog.addMessage('LMS: Commit', MessageLogLevel.Information);
            return 'true';
        },
        GetLastError: function () {
            //MessageLog.addMessage('LMS: GetLastError', MessageLogLevel.Information);
            return '0';
        },
        GetErrorString: function (code) {
            //MessageLog.addMessage('LMS: GetErrorString("' + code + '")', MessageLogLevel.Information);
            return '';
        },
        GetDiagnostic: function (code) {
            //MessageLog.addMessage('LMS: GetDiagnostic', MessageLogLevel.Information);
            return '';
        },
        interactionType: {
            trueFalse: 'true_false',
            multipleChoice: 'multiple_choice',
            fillIn: 'fill_in',
            matching: 'matching',
            performance: 'performance',
            sequencing: 'sequencing',
            likert: 'likert',
            numeric: 'numeric'
        },
        result: {
            correct: 'correct',
            incorrect: 'incorrect',
            unanticipated: 'unanticipated',
            neutral: 'neutral'
        }
    }
}

var CompletionStatus = (function () {
    return {
        /// <field>SCO has been completed.</field>
        Completed: 'completed',
        /// <field>SCO is currently incomplete.</field>
        Warning: 'incomplete',
        /// <field>SCO has not been attempted.</field>
        NotAttempted: 'not attempted',
        /// <field>Status is currently unknown.</field>
        Unknown: 'unknown'
    }
})();

var SuccessStatus = (function () {
    return {
        /// <field>SCO has been passed.</field>
        Passed: 'passed',
        /// <field>SCO was failed.</field>
        Failed: 'failed',
        /// <field>Status is currently unknown.</field>
        Unknown: 'unknown'
    }
})();

var LessonStatus = (function () {
    return {
        /// <field>SCO has been passed.</field>
        Passed: 'passed',
        /// <field>SCO has been completed.</field>
        Completed: 'completed',
        /// <field>SCO was failed.</field>
        Failed: 'failed',
        /// <field>SCO is currently incomplete.</field>
        Warning: 'incomplete',
        /// <field>SCO has been browsed.</field>
        Browsed: 'browsed',
        /// <field>SCO has not been attempted.</field>
        NotAttempted: 'not attempted'
    }
})();