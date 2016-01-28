var xbee = require('./xbee');
var mqtt = require('./mqtt');


/*
 * User-configurable settings.
 * TODO: read these from the command line.
 */
var rootTopic = 'ab123';
var broker = 'mqtt://192.168.2.41';
var port = '/dev/ttyUSB0';
var baud = 9600;

/*
 * Global variables
 */
var gatewayTopic;

/*
 * Fire up the XBee and invoke the callback once the
 * XBee is ready to receive commands.
 * 
 * Local and remote XBees must have the same ID and use
 * API mode 2.
 */
xbee.begin(port, baud, beginMqtt, whenXBeeMessageReceived);

/*
 * Start the MQTT client.  Use the local XBee's 64-bit
 * address as part of the topic.
 */
function beginMqtt() {
    xbee.getLocalAddress().then(function (address) {
        gatewayTopic = rootTopic + '/' + address;
        console.log('Gateway Topic: ' + gatewayTopic);
        mqtt.begin(broker, gatewayTopic, whenMqttMessageReceived);
    });
}

function whenMqttMessageReceived(error, topic, message) {
        
    if (error) {
        console.log(error);
        mqtt.publishLog(error);
        return;
    }

    try {
        xbee.transmitMqttMessage(message);
    } catch(error) {
        console.log(error);
        mqtt.publishLog(error);
    }
}

function whenXBeeMessageReceived(error, frame) {
    if (error) {
        console.log(error);
        mqtt.publishLog(error);
        return;
    }

    try {
        mqtt.publishXBeeFrame(frame);
    } catch (error) {
        if (!error instanceof ReferenceError) {
            console.log(error);
        }
    }
}


module.exports = {
    whenMqttMessageReceived: whenMqttMessageReceived,
    whenXBeeMessageReceived: whenXBeeMessageReceived
}
;
