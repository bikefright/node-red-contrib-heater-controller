var _ = require("lodash");
var sinon = require('sinon');
var exp = {
    calendar: {
        "Monday": {
            "00:00": 19,
            "06:20": 22,
            "08:00": 19,
            "16:40": 22,
            "23:59": 19
        },
        "Tuesday": {
            "00:00": 19,
            "06:20": 22,
            "08:00": 19,
            "16:40": 23,
            "23:59": 19
        },
        "Wednesday": {
            "00:00": 19,
            "06:20": 22,
            "08:00": 19,
            "16:40": 22,
            "23:59": 19
        },
        "Thursday": {
            "00:00": 19,
            "06:20": 10,
            "08:00": 19,
            "16:40": 22,
            "23:59": 19
        },
        "Friday": {
            "00:00": 19,
            "06:20": 23,
            "08:00": 19,
            "16:40": 22,
            "23:59": 19
        },
        "Saturday": {
            "00:00": 19,
            "08:00": 20,
            "20:00": 22,
            "23:59": 19
        },
        "Sunday": {
            "00:00": 19,
            "08:00": 20,
            "20:00": 22,
            "23:59": 19
        }
    },
    defaLastInfoNode: {
        "currentTemp": 20, //B -> value calculated input from sensor
        "targetValue": 20, //CALC -> Value calculated based on calendar or usr input
        "isUserCustom": false, //-> IB
        "isUserCustomLocked": false, // -> IB
        "userTargetValue": 20, //-> IB
        "currentSchedule": { //-> calendar
            "temp": 20,
            "day": "Monday",
            "time": "00:00"
        },
        "nextSchedule": { //-> calendar
            "temp": 20,
            "day": "Monday",
            "time": "08:00"
        },
        "currentHeaterStatus": "off",
        "time": new Date().toLocaleString()
    },
    getMockedRED: function (params) {
        return {
            require: function (params) {
                if (params === 'node-red-dashboard') {
                    return function () {
                        return {
                            addWidget: function name(params) {

                            }
                        }
                    }
                }
            },
            nodes: {
                createNode: function (params) {
                }
            }
        }
    },
    mockedNode: {
        'context': {
            context: {},
            'get': function (key) {
                return this.context[key];
            },
            'set': function (key, value) {
                this.context[key] = value;
            }
        },
        'send': () => { },
        'error': () => { },
        'log': () => { },
        'warn': () => { },
        'send': () => { }
    },
    searchForStatusNode() {

    },
    getMockedHeaterControllerFaked: function (hc) {
        return this.getMockedHeaterController(hc, sinon.fake(), sinon.fake(), sinon.fake(), sinon.fake(), sinon.fake());
    },
    getMockedHeaterController: function (hc, onFunc, contextFunc, debugFunc, logFunc, errorFunc) {
        hc.prototype.on = onFunc || function (params) { };
        hc.prototype.context = contextFunc || function (params) { return { set: function (params) { } } };
        hc.prototype.debug = debugFunc || function (params) { };
        hc.prototype.log = logFunc || function (params) { };
        hc.prototype.error = errorFunc || function (params) { };
        return hc;
    },
    getOffSetInHHMM: function () {
        var offset = new Date().getTimezoneOffset(), o = Math.abs(offset);
        return (offset < 0 ? "+" : "-") + ("00" + Math.floor(o / 60)).slice(-2) + ":" + ("00" + (o % 60)).slice(-2);
    },
    setMockedDate: function (dateString) {
        var sinon = require('sinon');
        require('sinon');
        clock = sinon.useFakeTimers({
            now: new Date(dateString + this.getOffSetInHHMM()),
            shouldAdvanceTime: false
        });
        // const spy = sinon.
        //     .spyOn(global, 'Date')
        //     .mockImplementation(() => mockDate);
        return clock;

        // const currentDate = new Date(dateString);
        // realDate = Date;
        // global.Date = class extends Date {
        //     constructor(date) {
        //         if (date) {
        //             return super(date);
        //         }

        //         return currentDate;
        //     }
        // };
    }
};
exp.defaNewInfoNode = _.cloneDeep(exp.defaLastInfoNode);
module.exports = exp;