var Mqtt = require('mqtt');

module.exports = {
    begin: begin,
    end: end,
    publishXBeeFrame: publishXBeeFrame,
    publishLog: publishLog,
    publishOnlineStatus: publishOnlineStatus
};

var mqtt;
var rootTopic;

/*
 * Start the MQTT client, establish LWT, subscribe to the request topic,
 * and listen for incoming messages.
 */
function begin(broker, topic, messageCallback, connectedCallback) {
    if (!topic)
        throw new ReferenceError("Invalid root topic.");
    if (!broker)
        throw new ReferenceError("Invalid broker.");
        
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
        publishOnlineStatus(true);
    });

    mqtt.on('close', function () {
        publishOnlineStatus(false);
    });

    mqtt.on('offline', function () {
        publishOnlineStatus(false);
    });

    mqtt.on('connect', function () {
        publishOnlineStatus(true);
        mqtt.subscribe(rootTopic + '/request'); //TODO: do subscriptions survive a reconnect?
        if (connectedCallback) {
            connectedCallback();
        }
    });

    mqtt.on('error', function (error) {
        console.log(error);
        return messageCallback(error, null, null);
    });

    mqtt.on('message', function (topic, message) {
        console.log('Received: ' + topic + ': ' + message);
        return messageCallback(null, topic, message.toString());
    });

}

/**
 * Close the MQTT client.  Does nothing if the client is not open.
 * @param {function} callback - Function called once the MQTT client has closed.
 */
function end(callback) {  
    if (mqtt) {
        mqtt.end(false, function () {
            mqtt = null;
            rootTopic = null;
            if (callback) {
                callback();
            }
        });
        
    }
}

/**
 * Publish XBMQ Gateway's online status to the `online` topic.  Will publish
 * "1" when online or "0" when offline.
 * @param {Boolean} isOnline - true for online, false for offline
 *
 */
function publishOnlineStatus(isOnline) {
    if (!mqtt)
        throw new ReferenceError("Mqtt client not connected");
    if (!rootTopic)
        throw new ReferenceError("No root topic.");

    var message = isOnline ? '1' : '0';
    var topic = rootTopic + '/online';
    mqtt.publish(topic, message);
}

/**
 * Publish an XBee API frame to the `response` topic.
 * @param {type} frame - XBee API Frame object.
 * @throws {ReferenceError} - If begin() not called or rootTopic is false.
 * @throws {ReferenceError} - If frame is invalid or has no remote64 address.
 */
function publishXBeeFrame(frame) {
    if (!mqtt || !rootTopic)
        throw new ReferenceError("Calling publishXBeeFrame() before begin().");
    if (!frame || !frame.remote64)
        throw new ReferenceError("Invalid frame.");

    var topic = rootTopic + "/" + frame.remote64 + '/response';
    var message = JSON.stringify(frame);
    mqtt.publish(topic, message);
}

/**
 * Publish a message to the `log` topic.
 * @param {type} message - The string or Error to be published.
 * @throws {ReferenceError}  - If begin() not called or rootTopic is false.
 * @throws {TypeError} - If message is not an Error or a string.
 */
function publishLog(message) {
    if (!mqtt || !rootTopic)
        throw new ReferenceError("Calling publishLog() before begin().");
    if (!message instanceof Error)
        throw new TypeError("Mesage must be an Error or a String.");

    var topic = rootTopic + '/log';
    mqtt.publish(topic, message.message || message);
}