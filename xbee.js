var q = require('q');
var SerialPort = require('serialport').SerialPort;
var xbee_api = require('xbee-api');

module.exports = {
    begin: begin,
    getLocalAddress: getLocalAddress,
    transmitMqttMessage: transmitMqttMessage
};

var serialport;
var C = xbee_api.constants;
var xbeeAPI = new xbee_api.XBeeAPI({api_mode: 2});

function begin(port, baud, readyCallback, messageCallback) {
    serialport = new SerialPort(port, {
        baudrate: baud,
        parser: xbeeAPI.rawParser()
    });

    serialport.on('open', function () {
        console.log('Serial Port Open');
        readyCallback();
    });

    serialport.on('error', function (error) {
        console.log(error);
        messageCallback(error, null);
    });

    xbeeAPI.on('frame_object', function (frame) {
        messageCallback(null, frame);
    });

    xbeeAPI.on('error', function (error) {
        messageCallback(error, null);
    });
}

function transmitMqttMessage(message) {
                    
    try {
        var frame = JSON.parse(message);
        
        /*
         * JSON doesn't support hex numbers.  If a hex string was sent,
         * convert it to an integer.
         */
        if (typeof frame.type === 'string') {
            frame.type = parseInt(frame.type);
        }        
        if (typeof frame.id === 'string') {
            frame.id = parseInt(frame.id);
        }
        
        /*
         * If the sender doesn't include a commandParameter array, add it for
         * them.  This is for convenience, as many commands don't take parameters.
         */
        if (!frame.commandParameter) {
            frame.commandParameter = [];
        }
        
        serialport.write(xbeeAPI.buildFrame(frame));
    } catch (error) {        
        xbeeAPI.emit('error', error);
    }
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
 * Return a promise that resolves with the 64-bit address of the local XBee.
 */
function getLocalAddress() {
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
