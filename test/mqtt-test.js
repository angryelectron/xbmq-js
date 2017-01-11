/* global describe it */
var mqtt = require('../lib/mqtt.js')
var expect = require('chai').expect

describe('mqtt.js', function () {
  var broker = 'mqtt://test.mosquitto.org'   /* public MQTT broker */
  var rootTopic = 'sdf987sdlk3jdjd'          /* random string */
  var Mqtt = require('mqtt')

  describe('begin tests', function () {
    var onlineTopic = rootTopic + '/online'

    it('should fail if rootTopic not given', function () {
      expect(function () {
        mqtt.begin(broker, null)
      }).to.throw(ReferenceError)
      mqtt.end()
    })

    it('should fail if broker not given', function () {
      expect(function () {
        mqtt.begin(null, rootTopic)
      }).to.throw(ReferenceError)
      mqtt.end()
    })

    it('should publish "1" to `online` topic', function (done) {
      var mqttClient = Mqtt.connect(broker)

      mqttClient.on('connect', function () {
        mqttClient.on('message', function (topic, message, packet) {
          if (!packet.retain) {
            expect(message.toString()).to.equal('1')

                        /* Unsubscribe to ignore subsequent messages. */
            mqttClient.unsubscribe(onlineTopic)

            mqtt.end(function () {
              mqttClient.end(true, done)
            })
          }
        })
        mqttClient.subscribe(onlineTopic)
        mqtt.begin(broker, rootTopic, null, null)
      })
    })
  })

  describe('end tests', function () {
    var onlineTopic = rootTopic + '/online'

    it('should close the MQTT client connection', function (done) {
      mqtt.begin(broker, rootTopic, null, function () {
        mqtt.end(done)
      })
    })

    it('should not complain if begin() not called first', function () {
      mqtt.end()
    })

    it('should publish "0" to online status topic', function (done) {
      var mqttClient = Mqtt.connect(broker)
      mqttClient.on('connect', function () {
        mqtt.begin(broker, rootTopic, null, function () {
          mqttClient.on('message', function (topic, message, packet) {
            if (!packet.retain) {
              expect(message.toString()).to.equal('0')
            }
          })
          mqttClient.subscribe(onlineTopic)
          mqtt.end()
          setTimeout(function () {
            mqttClient.end(true, done)
          }, 1000)
        })
      })
    })
  })

  describe('publishXBeeFrame tests', function () {
    var testFrame = {
      remote64: '1234'
    }

    it('should fail if MQTT not connected', function () {
      expect(function () {
        mqtt.publishXBeeFrame(testFrame)
      }).to.throw(ReferenceError)
    })
  })

  describe('publishLog tests', function () {
    this.timeout(5000)
    var logTopic = rootTopic + '/log'

    it('should fail if begin() not called', function () {
      expect(function () {
        mqtt.publishLog('test message')
      }).to.throw(ReferenceError)
    })

    it('should fail if message is incorrect type', function (done) {
      mqtt.begin(broker, rootTopic, null, function () {
        expect(function () {
          mqtt.publishLog(null)
        }).to.throw(TypeError)
        mqtt.end(done)
      })
    })

    it('should publish Errors as string to rootTopic/gateway/log', function (done) {
      var mqttClient = Mqtt.connect(broker)
      var error = new Error('Error message.')

      mqttClient.on('connect', function () {
        mqttClient.subscribe(logTopic)
        mqtt.begin(broker, rootTopic, null, function () {
          mqtt.publishLog(error)
        })
      })

      mqttClient.on('message', function (t, m) {
        expect(t).to.equal(logTopic)
        expect(m.toString()).to.equal(error.message)
        mqtt.end(function () {
          mqttClient.end(true, done)
        })
      })
    })

    it('should publish strings to rootTopic/gateway/log', function (done) {
      var mqttClient = Mqtt.connect(broker)
      var error = 'Error message.'

      mqttClient.on('connect', function () {
        mqttClient.subscribe(logTopic)
        mqtt.begin(broker, rootTopic, null, function () {
          mqtt.publishLog(error)
        })
      })

      mqttClient.on('message', function (t, m) {
        expect(t).to.equal(logTopic)
        expect(m.toString()).to.equal(error)
        mqtt.end(function () {
          mqttClient.end(true, done)
        })
      })
    })
  })
})
