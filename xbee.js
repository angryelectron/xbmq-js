var q = require('q');
var util = require('util');
var Xbmq = require('./xbmq');
var SerialPort = require('serialport').SerialPort;
var xbee_api = require('xbee-api');

var xbmq = null;
var C = xbee_api.constants;
var xbeeAPI = new xbee_api.XBeeAPI({api_mode: 2});
var serialport = new SerialPort('/dev/ttyUSB0', {
    baudrate: 9600,
    parser: xbeeAPI.rawParser()
});

serialport.on('open', function () {
    console.log('Serial Port Open');
    startXbmq();
});

serialport.on('error', function (error) {
    console.log(error);
});

xbeeAPI.on('frame_object', function publishFrame(frame) {
    if (xbmq) {
        xbmq.publishXBeeFrame(frame);
    }
});

/**
 * Send a frame to the XBee network.  Intended to be used as a callback when
 * MQTT receives new messages.
 * @param {type} error
 * @param {type} frame xbee-api frame 
 */
function xbmqCallback(error, frame) {
    if (error) {
        console.log(error);
    } else {
        serialport.write(xbeeAPI.buildFrame(frame));
    }
}

/*
 * Start XBMQ 
 */
function startXbmq() {
    getGatewayAddress().then(function (address) {
        rootTopic = 'ab123/' + address;
        console.log('rootTopic: ' + rootTopic);
        xbmq = new Xbmq('mqtt://fona.ziptrek.eco', rootTopic, xbmqCallback);
    });
}

/*
 * Send an XBee request and return a promise fulfilled with the response.
 */
function xbeeCommand(frame) {
    var timeout = 5000;
    frame.id = xbeeAPI.nextFrameId();
    var deferred = q.defer();

    var callback = function (receivedFrame) {
        if (receivedFrame.id === frame.id) {
            // This is our frame's response. Resolve the promise.
            deferred.resolve(receivedFrame);
        }
    };

    setTimeout(function () {
        xbeeAPI.removeListener('frame_object', callback);
    }, timeout + 1000);

    xbeeAPI.on('frame_object', callback);
    serialport.write(xbeeAPI.buildFrame(frame));
    return deferred.promise.timeout(timeout);
}

/**
 * Return a promise that resolves with the 64-bit address of the local XBee 
 * attached to this gateway.
 */
function getGatewayAddress() {
    var gw = null;
    var frame = {
        type: C.FRAME_TYPE.AT_COMMAND,
        commandParameter: []
    };
    frame.command = 'SH';
    return xbeeCommand(frame)
            .then(function (sh) {
                gw = sh.commandData.toString('hex');
                frame.command = 'SL';
                return xbeeCommand(frame);
            }).then(function (sl) {
        gw += sl.commandData.toString('hex');
        return gw;
    });
}
