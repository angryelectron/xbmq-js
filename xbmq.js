var xbee = require('./xbee');
var mqtt = require('./mqtt');
var log = require('./logger');

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
    xbee.getLocalNI().then(function (name) {
        gatewayTopic = rootTopic + '/' + name;
        log('info', 'Gateway Topic: ' + gatewayTopic);
        mqtt.begin(broker, gatewayTopic, whenMqttMessageReceived);
    });
}

function whenMqttMessageReceived(error, topic, message) {

    if (error) {
        log(error);
        /*
         * Logging MQTT errors back to MQTT may create a infinite loop.
         */
        //mqtt.publishLog(error);
        return;
    }

    try {
        xbee.transmitMqttMessage(message);
    } catch (error) {
        log(error);
        mqtt.publishLog(error);
    }
}

function whenXBeeMessageReceived(error, frame) {
    try {
        if (error) {
            log('error', error);
            if (mqtt.isConnected()) {
                mqtt.publishLog(error);
            }
        } else {
            if (mqtt.isConnected()) {
                mqtt.publishXBeeFrame(frame);
            }
        }
    } catch (error) {
        log('error', error);
        if (mqtt.isConnected()) {
            mqtt.publishLog(error);
        }
    }
}


module.exports = {
    whenMqttMessageReceived: whenMqttMessageReceived,
    whenXBeeMessageReceived: whenXBeeMessageReceived
};
