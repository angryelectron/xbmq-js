var expect = require('chai').expect;
var mockery = require('mockery');
var events = require('events');
var sinon = require('sinon');
var xbee;

/**
 * A mock serialport class.
 */
var serialportmock = {
    SerialPort: function (port, options) {
        var eventEmitter = new events.EventEmitter();
        var sp = this;
        sp.port = port;
        sp.close = function (callback) {
            callback();
        };
        sp.on = eventEmitter.on;
        sp.emit = eventEmitter.emit;
        sp.write = function () {};

        /*
         * If the port name is 'bad', emit 'error' when this constructor
         * is called.  Otherwise, emit 'open'.
         */
        setTimeout(function () {
            sp.emit(port === 'bad' ? 'error' : 'open', "An error occured");
        }, 1000);
    }
};

describe('xbee.js', function () {

    var port = '/doesnt/matter';
    var baud = 9600;

    var serialportspy;
    before(function () {
        mockery.enable({
            warnOnUnregistered: false,
            warnOnReplace: false
        });
        serialportspy = sinon.spy(serialportmock, 'SerialPort');
        mockery.registerMock('serialport', serialportmock);
        xbee = require('../xbee');
    });
    after(function () {
        mockery.disable();
        serialportspy.reset();
    });

    describe('begin tests', function () {

        it('should throw if port is invalid', function () {
            expect(function () {
                xbee.begin();
            }).to.throw(TypeError);
        });
        it('should throw if baud is invalid', function () {
            expect(function () {
                xbee.begin(port, null);
            }).to.throw(TypeError);
        });
        it('should throw if callbacks are invalid', function () {
            expect(function () {
                xbee.begin(port, baud, null);
            }).to.throw(TypeError);
            expect(function () {
                xbee.begin(port, baud, function (arg1, arg2) {});
            }).to.throw(TypeError);
        });

        it('should open the serial port', function (done) {
            var message = function (error, frame) {
                expect(error).to.be.null;
            };
            xbee.begin(port, baud, function () {
                expect(serialportspy.called).to.be.ok;
                xbee.end(done);
            }, message);
        });

        it('should call messageCallback on error', function (done) {
            var ready = function () {};
            var message = function (error, frame) {
                expect(error).to.be.ok;
                done();
            };
            xbee.begin('bad', baud, ready, message);
        });
    });

    describe('transmittMqttMessage tests', function () {

        var testFrame = {
            type: 0x09,
            id: 0x01,
            command: 'ID',
            commandParameter: []
        };

        it('should throw if message is not valid JSON', function (done) {
            var ready = function () {
                expect(function () {
                    xbee.transmitMqttMessage('not-json');
                }).to.throw(SyntaxError);

                expect(function () {
                    xbee.transmitMqttMessage('{"hex not allowed":0x09}');
                }).to.throw(Error);

                done();
            };
            var message = function (a, b) {};
            xbee.begin(port, baud, ready, message);
        });

        it('should accept valid xbee-api frames', function (done) {
            
            var standardFrame = '{"type":9, "id":1, "command":"BD", "commandParameter":[7]}';
            var typeHex = '{"type":"0x09", "id":1, "command":"BD", "commandParameter":[7]}';
            var idHex = '{"type":9, "id":"0x01", "command":"BD", "commandParameter":[7]}';
            var noCP = '{"type":9, "id":1, "command":"BD"}';
            
            var ready = function () {
                xbee.transmitMqttMessage(standardFrame);
                xbee.transmitMqttMessage(typeHex);
                xbee.transmitMqttMessage(idHex);
                xbee.transmitMqttMessage(noCP);
                done();
            };
            var message = function (a, b) {};
            xbee.begin(port, baud, ready, message);
        });

    });
});

