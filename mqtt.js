var Mqtt = require('mqtt');

module.exports = function (broker, rootTopic, receivedMessageCallback) {

    var xbmq = this;
    xbmq.publishXBeeFrame = publishXBeeFrame;

    var mqttOptions = {
        will: {
            topic: rootTopic + '/online',
            payload: '0',
            qos: 0,
            retain: true
        }
    };

    var mqtt = Mqtt.connect(broker, mqttOptions);

    function mqttIsOnline(isOnline) {
        var message = isOnline ? '1' : '0';
        var topic = rootTopic + '/online';
        mqtt.publish(topic, message);
    }

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
    });

    mqtt.on('message', function (topic, message) {
        console.log('Received: ' + topic + ': ' + message);        
        try {
            var frame = JSON.parse(message);
            receivedMessageCallback(frame);
        } catch (error) {
            return receivedMessageCallback(error, message);
        }
        return receivedMessageCallback(null, frame);
    });

    function publishXBeeFrame(frame) {
        var message = JSON.stringify(frame, null, 0);
        mqtt.publish(rootTopic + '/response', message);
    }
};
