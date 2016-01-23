var Mqtt = require('mqtt');

module.exports = {
    begin: begin,
    publishXBeeFrame: publishXBeeFrame,
    publishLog: publishLog
};

var mqtt;
var rootTopic;

/*
 * Start the MQTT client, establish LWT, subscribe to the request topic,
 * and listen for incoming messages.
 */
function begin(broker, topic, callback) {

    rootTopic = topic;

    var mqttOptions = {
        will: {
            topic: rootTopic + '/online',
            payload: '0',
            qos: 0,
            retain: true
        }
    };

    mqtt = Mqtt.connect(broker, mqttOptions);

    mqtt.on('reconnect', function () {
        mqttIsOnline(true);
    });

    mqtt.on('close', function () {
        mqttIsOnline(false);
    });

    mqtt.on('offline', function () {
        mqttIsOnline(false);
    });

    mqtt.on('connect', function () {
        console.log("MQTT connected.");
        mqttIsOnline(true);
        mqtt.subscribe(rootTopic + '/request'); //TODO: do subscriptions survive a reconnect?
    });

    mqtt.on('error', function (error) {
        console.log(error);
        return callback(error, null, null);
    });

    mqtt.on('message', function (topic, message) {
        console.log('Received: ' + topic + ': ' + message);
        return callback(null, topic, message.toString());
    });

}

/*
 * Publish online status message.
 */
function mqttIsOnline(isOnline) {
    var message = isOnline ? '1' : '0';
    var topic = rootTopic + '/online';
    mqtt.publish(topic, message);
}

/*
 * Send an XBee frame as an MQTT message.
 */
function publishXBeeFrame(frame) {
    var topic = rootTopic + "/" + frame.remote64 + '/response';
    var message = JSON.stringify(frame);
    
    /* may be called before MQTT is connected, 
     * in which case don't publish anything 
     */
    if (mqtt) {
        mqtt.publish(topic, message);
    }
}

function publishLog(message) {
    var topic = rootTopic + '/log';        
    mqtt.publish(topic, message.message || message);    
}