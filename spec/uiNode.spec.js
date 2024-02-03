var sinon = require('sinon');
var should = require("should");
var itParam = require('mocha-param');
var helper = require("./testHelper.js");

var _ = require('lodash');
var tempRising = [];
for (var i = 10.5; i < 30; i = i + 0.5) {
    tempRising.push(i);
}

describe("uiNodes", () => {
    var RED = helper.getMockedRED();
    const sandbox = sinon.createSandbox();
    var UINode;

    beforeEach(() => {
        UINode = helper.getNodeUI();
        RED = helper.getMockedRED();
    })

    afterEach(function () {
        sandbox.restore();
    });

    it('Test Constructor: throws an error', function (done) {
        UINode.prototype.on = sinon.stub().withArgs('input', function () { }).throws(new Error('an error message'));
        should(() => {
            new UINode(RED, {
                displayMode: 'buttons',
                calendar: JSON.stringify(helper.calendar)
            });
        }).throw('an error message', 'Not expected exception message!!!');
        should(UINode.prototype.error.callCount).be.equal(1, 'Exception not logged!!!');
        should(RED.nodes.createNode.callCount).be.equal(1, 'uiNode is not extending Node-red-node');
        should(RED.require.callCount).be.equal(1, 'Dashboard node ui not called');
        should(UINode.prototype.on.callCount).be.equal(1, 'uiNode is not extending Node-red-node');
        done();
    });

    it('Test _createWidget: create design throws error', function (done) {
        RED.require = sinon.stub();
        var addWidgetStub = sinon.stub();
        var constrUI = sinon.stub();
        addWidgetStub.throws(new Error('anError'));
        constrUI.returns({
            addWidget: addWidgetStub,
            isDark: sinon.stub(),
            getTheme: sinon.stub()
        });
        RED.require.withArgs('node-red-dashboard').returns(constrUI);

        UINode.prototype.on = sinon.stub().withArgs('input', function () { }).throws(new Error('an error message'));
        should(() => {
            new UINode(RED, {
                displayMode: 'buttons',
                calendar: JSON.stringify(helper.calendar)
            });
        }).throw('anError', 'Not expected exception message!!!');
        should(UINode.prototype.error.callCount).be.equal(2, 'Exception not logged!!!');
        RED = helper.getMockedRED();
        done();
    });

    describe('Test Methods', () => {
        var uiNode = undefined;
        beforeEach(() => {
            UINode = helper.getNodeUI();
            uiNode = new UINode(RED, {
                displayMode: 'buttons',
                calendar: JSON.stringify(helper.calendar)
            });
        });

        itParam('Test addEvent: throw exception', [{ topic: undefined, func: undefined }, { topic: undefined, func: function () { } }, { topic: 'test', func: undefined }], function (val) {
            should(function () {
                uiNode.addEvent(val.topic, val.func);
            }).throw('Invalid arguments [topic:string, func:function]', 'Not throwing exception on invalid topic: ' + JSON.stringify(val));
            should(UINode.prototype.error.callCount).be.equal(1, 'Exception not logged!!!: ' + JSON.stringify(val));
        });

        it('Test addEvent: register event ', function (done) {
            var fakeFunc = sinon.fake();
            uiNode.addEvent('event1', fakeFunc);
            uiNode.input({ topic: 'event1', payload: 'test' }, sinon.fake(), sinon.fake());
            should(fakeFunc.callCount).be.equal(1, 'Event not registered or not called');
            should(fakeFunc.lastCall.args[0].topic).be.equal('event1', 'Event not registered or not called');
            done();
        });

        it('Test removeEvent: throw exception ', function (done) {
            should(() => { uiNode.removeEvent(); }).throw('Invalid argument [topic:string]', 'removeEvent does not throw exception on invalid topic');
            should(() => { uiNode.removeEvent(1); }).throw('Invalid argument [topic:string]', 'removeEvent does not throw exception on invalid topic');
            done();
        });

        it('Test removeEvent: remove event ', function (done) {
            var fakeFunc = sinon.fake();
            uiNode.addEvent('event1', fakeFunc);
            uiNode.removeEvent('event1');
            should(() => { uiNode._messageIn({ topic: 'event1', payload: 'test' }); }).throw('Calling unregistered event: event1', 'Events are not removed when calling removeEvent()');
            should(fakeFunc.callCount).be.equal(0, 'Event still exists after calling removeEvent');
            done();
        });

        itParam('Test input: throw exception ', [{}, { topic: 2 }], function (val) {
            var sendFunc = sinon.fake();
            var doneCB = sinon.fake();
            uiNode.input(val, sendFunc, doneCB);
            should(uiNode.error.callCount).be.equal(2, 'Exception is not logged ' + JSON.stringify(val));
            should(uiNode.error.firstCall.args[0]).be.equal('Invalid Topic!!! ', 'Exception is not logged ' + JSON.stringify(val));
            should(uiNode.error.secondCall.args[0].message).be.equal('Invalid Topic!!!', 'Exception is not logged ' + JSON.stringify(val));
            should(doneCB.callCount).be.equal(1, 'Exception is not forward to callback function');
            should(doneCB.firstCall.args[0]).be.deepEqual(uiNode.error.secondCall.args[0], 'Exception is not forward to callback function');
        });

        itParam('Test input: throw exception without done function ', [{}, { topic: 2 }], function (val) {
            var sendFunc = sinon.fake();
            uiNode.input(val, sendFunc);
            should(uiNode.error.callCount).be.equal(2, 'Exception is not logged ' + JSON.stringify(val));
            should(uiNode.error.firstCall.args[0]).be.equal('Invalid Topic!!! ', 'Exception is not logged ' + JSON.stringify(val));
            should(uiNode.error.secondCall.args[0].message).be.equal('Invalid Topic!!!', 'Exception is not logged ' + JSON.stringify(val));
        });

        it('Test input: event is not returning array', function (done) {
            var fakeFunc = sinon.stub().returns('strTest');
            var sendFunc = sinon.fake();
            var doneCB = sinon.fake();
            uiNode._sendToFrontEnd = sinon.fake();
            uiNode.addEvent('event1', fakeFunc);
            uiNode.input({ topic: 'event1', payload: 'test' }, sendFunc, doneCB);
            should(fakeFunc.callCount).be.equal(1, 'Event not registered or not called');
            should(fakeFunc.lastCall.args[0].topic).be.equal('event1', 'Event not registered or not called');
            should(sendFunc.callCount).be.equal(0, 'Send function is called even is not necessary');
            should(doneCB.callCount).be.equal(1, 'Input CallBack is not called');
            should(uiNode._sendToFrontEnd.callCount).be.equal(1, 'front end function not called');
            done();
        });

        it('Test input: event returns valid topics to be send to output', function (done) {
            var resp = { someTopic: { test: 'somePayload' } };
            var fakeFunc = sinon.stub().returns(resp);
            var sendFunc = sinon.fake();
            var doneCB = sinon.fake();
            uiNode.addEvent('event1', fakeFunc);
            uiNode._sendToFrontEnd = sinon.fake();
            uiNode.input({ topic: 'event1', payload: 'test' }, sendFunc, doneCB);
            should(fakeFunc.callCount).be.equal(1, 'Event not registered or not called');
            should(fakeFunc.firstCall.args[0].topic).be.equal('event1', 'Event not registered or not called');
            should(sendFunc.callCount).be.equal(1, 'Send function not called');
            should(sendFunc.firstCall.args[0]).be.Array('Should send an array');
            should(sendFunc.firstCall.args[0]).be.deepEqual([undefined, { topic: 'someTopic', payload: resp.someTopic }], 'Output should not have any heaterStatus');
            should(doneCB.callCount).be.equal(1, 'Input CallBack is not called');
            should(uiNode._sendToFrontEnd.callCount).be.equal(1, 'front end function not called');
            done();
        });

        it('Test input: with no done function', function (done) {
            var val = { someTopic: { test: 'somePayload' } };
            var fakeFunc = sinon.stub().returns(val);
            var sendFunc = sinon.fake();
            uiNode.addEvent('event1', fakeFunc);
            uiNode._sendToFrontEnd = sinon.fake();
            uiNode.input({ topic: 'event1', payload: 'test' }, sendFunc);

            should(fakeFunc.callCount).be.equal(1, 'Event not registered or not called');
            should(fakeFunc.firstCall.args[0].topic).be.equal('event1', 'Event not registered or not called');
            should(sendFunc.callCount).be.equal(1, 'Send function not called');
            should(sendFunc.firstCall.args[0]).be.Array('Should send an array');
            should(sendFunc.firstCall.args[0]).be.deepEqual([undefined, { topic: 'someTopic', payload: val.someTopic }], 'Output should not have any heaterStatus');
            should(uiNode._sendToFrontEnd.callCount).be.equal(1, 'front end function not called');
            done();
        });

        it('Test _createClientConfig: returns only configs set in node properties', function (done) {
            uiNode.config = helper.configEx;
            const acceptedKeys = [
                'title',
                'topic',
                'logLength',
                'upperHysteresis',
                'lowerHysteresis',
                'calendar',
                'unit',
                'displayMode',
                'sliderMaxValue',
                'sliderMinValue',
                'sliderStep'
            ];
            var configReturn = uiNode.filterConfig({
                'title': 'aTitle',
                'topic': 'aTopic',
                'logLength': -5,
                'upperHysteresis': 0.5,
                'lowerHysteresis': 0.5,
                'calendar': 'some calendar',
                'unit': 'K',
                'displayMode': 'aDisplayMode',
                'sliderMaxValue': 10,
                'sliderMinValue': 100,
                'sliderStep': 10,
                'someOtherThing': 'withSomeOtherValue'
            });
            should(configReturn).be.Object('Is not returning an object');
            should(_.keys(configReturn)).be.deepEqual(acceptedKeys, 'front-end config is not a valid object');
            done();
        });

        it('Test _newClientConnected: when first connect send config and status', function (done) {
            var LOCAL_RED = helper.getMockedRED();
            LOCAL_RED.server = helper.startHTTPServer();
            var config = {
                title: 'test',
                displayMode: 'buttons',
                calendar: JSON.stringify(helper.calendar)
            }
            var UINode = helper.getNodeUI();
            uiNode = new UINode(LOCAL_RED, config);
            uiNode.status = {
                currentHeaterStatus: { temp: 22 },
                nextSchedule: { temp: 20 },
                isLocked: true,
                userTargetValue: 10
            };

            var wsClient = new helper.WSClient('ws://localhost:8080/heaterController/io/' + UINode.prototype.id, undefined, (message) => {
                should(message.utf8Data).be.String("message is not an object");
                var data = JSON.parse(message.utf8Data);
                should(data).be.Object("message is not an object");
                if (data.topic === 'config') {
                    should(data.topic).be.equal('config', "Config not send on client connected");
                    should(data.payload).be.deepEqual(config, "Config not send on client connected");
                }
                if (data.topic === 'status') {
                    should(data.topic).be.equal('status', "Status not send on client connected");
                    should(data.payload).be.deepEqual(uiNode.status, "Config not send on client connected");
                }
            });
            setTimeout((() => {
                wsClient.connection.drop();
                LOCAL_RED.server.shutdown();
                done();
            }).bind(this), 3 * 1000);
        });

        it('Test sendStatus: should call WebSocket send method', function (done) {
            var WS = helper.getWsMocked();
            var UINode = helper.getNodeUI(WS);
            var id = 'dummyID';
            WS.wsw = WS.createInstance(RED, id);
            WS.wsw.send = sinon.fake();
            uiNode = new UINode(RED, Object.assign({}, { group: 'aGroup', displayMode: 'buttons' }));
            uiNode.status = { 'test': 1, 'test2': 2 };
            uiNode.sendStatus();
            should(WS.wsw.send.callCount).be.equal(1, "Websocket send is not called when nodeUI sendStatus is called");
            should(WS.wsw.send.firstCall.args[0]).be.equal('fakeIdUINode', "Websocket send called but with the wrong id");
            should(WS.wsw.send.firstCall.args[1]).be.equal('status', "Websocket send is called but with the wrong topic");
            should(WS.wsw.send.firstCall.args[2]).be.deepEqual(uiNode.status, "Websocket send is called but with the wrong");
            WS.wsw.unRegister(id);
            done();
        });

        it('Test _close: should call unregister', function (done) {
            var WS = helper.getWsMocked();
            var UINode = helper.getNodeUI(WS);
            var id = 'dummyID';
            WS.wsw = WS.createInstance(RED, id);
            WS.wsw.unRegister = sinon.fake();
            uiNode = new UINode(RED, Object.assign({}, { group: 'aGroup', displayMode: 'buttons' }));
            var fakeResolve = sinon.fake();
            uiNode._close(fakeResolve);
            should(WS.wsw.unRegister.callCount).be.equal(1, "Websocket unregister is not called when nodeUI sendStatus is called");
            should(WS.wsw.unRegister.firstCall.args[0]).be.equal('fakeIdUINode', "Websocket unregister called but with the wrong id");
            should(fakeResolve.callCount).be.equal(1, "Resolved is not called when calling _close");
            done();
        });

        it('Test _close: should call onClose if exists', function (done) {
            var RED = helper.getMockedRED(true);
            var WS = helper.getWsMocked();
            var UINode = helper.getNodeUI(WS);
            var id = 'dummyID';
            WS.wsw = WS.createInstance(RED, id);
            WS.wsw.unRegister = sinon.fake();
            UINode.prototype.onClose = sinon.fake();
            uiNode = new UINode(RED, Object.assign({}, { group: 'aGroup', displayMode: 'buttons' }));
            var fakeResolve = sinon.fake();
            uiNode._close(fakeResolve);
            should(WS.wsw.unRegister.firstCall.args[0]).be.equal('fakeIdUINode', "Websocket unregister called but with the wrong id");
            should(fakeResolve.callCount).be.equal(1, "Resolved is not called when calling _close");
            should(UINode.prototype.onClose.callCount).be.equal(1, "onClose is not called when calling _close");
            done();
        });

        itParam('Test _sendOutPut: should send message to next node', [
            { input: { heaterStatus: 'on' } },
            { input: { status: { test: 'someStatus' } } },
            { input: { logs: { logs: 'someLogs' } } },
            { input: { logs: { logs: 'someLogs' }, status: { test: 'someStatus' } } },
            { input: { status: { test: 'someStatus' }, heaterStatus: 'on' } },
            { input: { logs: { logs: 'someLogs' }, heaterStatus: 'on' } },
            { input: { logs: { logs: 'someLogs' }, heaterStatus: 'on', status: { test: 'someStatus' } } }
        ], function (val) {
            var UINode = helper.getNodeUI();
            var fakeSend = sinon.fake();
            uiNode = new UINode(RED, { id: 'dummyID', group: 'aGroup', displayMode: 'buttons', topic: 'aTopic' });
            uiNode._sendOutPut(JSON.parse(JSON.stringify(val.input)), fakeSend);

            should(fakeSend.callCount).be.equal(_.keys(val.input).length, 'Send is not call: ' + JSON.stringify(val));
            var cntTests = 0;
            var calls = fakeSend.getCalls();
            var hasHeater = false;
            if (val.input.heaterStatus) {
                cntTests++;
                should(fakeSend.firstCall.args[0]).be.Array('Heater status is not an object: ' + JSON.stringify(val));
                should(fakeSend.firstCall.args[0]).be.deepEqual([{ topic: 'aTopic', payload: val.input.heaterStatus }], 'Heater status is not an object: ' + JSON.stringify(val));
                delete val.input.heaterStatus;
                hasHeater = true;
            }
            var attr = _.keys(val.input);
            for (var i = 0; i < attr.length; i++) {
                var key = attr[i];
                var call = calls[hasHeater ? i + 1 : i];
                cntTests++
                should(call.args[0]).be.Array('Send argument should be an array');
                should(call.args[0]).be.deepEqual([undefined, { topic: key, payload: val.input[key] }], 'Send argument should be an array');
            }
            should(cntTests).be.greaterThan(0, 'No checked performed for this test');
        });

        itParam('Test _sendToFrontEnd: should call websocket.send', [
            {
                heaterStatus: "on",
                status: {
                    currentTemp: 10,
                    targetValue: 19,
                    isUserCustom: false,
                    isLocked: undefined,
                    userTargetValue: undefined,
                    currentSchedule: {
                        time: "00:00",
                        day: "Thursday",
                        temp: 19,
                    },
                    nextSchedule: {
                        time: "06:20",
                        day: "Thursday",
                        temp: 22,
                    },
                    currentHeaterStatus: "on",
                    time: "2/18/2021, 12:40:16 AM",
                },
            },
            {
                heaterStatus: "on",
                config: {
                    currentTemp: 10,
                    targetValue: 19,
                    isUserCustom: false,
                    isLocked: undefined,
                    userTargetValue: undefined,
                    currentSchedule: {
                        time: "00:00",
                        day: "Thursday",
                        temp: 19,
                    },
                    nextSchedule: {
                        time: "06:20",
                        day: "Thursday",
                        temp: 22,
                    },
                    currentHeaterStatus: "on",
                    time: "2/18/2021, 12:40:16 AM",
                },
            },
            {
                status: {
                    currentTemp: 10,
                    targetValue: 19,
                    isUserCustom: false
                },
                config: {
                    currentTemp: 10,
                    targetValue: 19,
                    isUserCustom: false,
                    isLocked: undefined,
                    userTargetValue: undefined,
                    currentSchedule: {
                        time: "00:00",
                        day: "Thursday",
                        temp: 19,
                    },
                    nextSchedule: {
                        time: "06:20",
                        day: "Thursday",
                        temp: 22,
                    },
                    currentHeaterStatus: "on",
                    time: "2/18/2021, 12:40:16 AM",
                },
            }

        ],
            function (val) {
                var WS = helper.getWsMocked();
                var UINode = helper.getNodeUI(WS);
                var id = 'dummyID';
                WS.wsw = WS.createInstance(RED, id);
                WS.wsw.send = sinon.fake();
                uiNode = new UINode(RED, Object.assign({}, { group: 'aGroup', displayMode: 'buttons' }));
                uiNode.status = { 'test': 1, 'test2': 2 };
                uiNode._sendToFrontEnd(val);
                var callCount = val.status ? 1 : 0;
                callCount = val.config ? callCount + 1 : callCount;

                should(WS.wsw.send.callCount).be.equal(callCount, "websocket.send is not called to send status or config to front-end");
                if (callCount > 0) {
                    should(WS.wsw.send.firstCall.args[0]).be.equal('fakeIdUINode', "Websocket send called but with the wrong id");
                }
                if (callCount == 2) {
                    should(WS.wsw.send.firstCall.args[1]).be.equal('status', "Websocket send is called but with the wrong topic");
                    should(WS.wsw.send.firstCall.args[2]).be.deepEqual(val.status, "Websocket send is called but with the wrong");
                    should(WS.wsw.send.secondCall.args[1]).be.equal('config', "Websocket send is called but with the wrong topic");
                    should(WS.wsw.send.secondCall.args[2]).be.deepEqual(val.config, "Websocket send is called but with the wrong");
                } else if (callCount == 1) {
                    if (val.status) {
                        should(WS.wsw.send.firstCall.args[1]).be.equal('status', "Websocket send is called but with the wrong topic");
                        should(WS.wsw.send.firstCall.args[2]).be.deepEqual(val.status, "Websocket send is called but with the wrong");
                    }
                    if (val.config) {
                        should(WS.wsw.send.firstCall.args[1]).be.equal('config', "Websocket send is called but with the wrong topic");
                        should(WS.wsw.send.firstCall.args[2]).be.deepEqual(val.config, "Websocket send is called but with the wrong");
                    }
                }
                WS.wsw.unRegister(id);
            });
    });
});
