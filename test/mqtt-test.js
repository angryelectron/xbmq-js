/* eslint-env mocha */
const Mqtt = require('../lib/mqtt.js')
const expect = require('chai').expect
const sinon = require('sinon')
const EventEmitter = require('events')

describe('Mqtt', function () {
  describe('Mqtt#constructor', () => {
    it('throws if arguments are missing', () => {
      expect(() => {
        new Mqtt() // eslint-disable-line no-new
      }).to.throw(TypeError)
      expect(() => {
        new Mqtt('mqtt') // eslint-disable-line no-new
      }).to.throw(TypeError)
      expect(() => {
        new Mqtt('mqtt', 'rootTopic') // eslint-disable-line no-new
      }).to.throw(TypeError)
    })
    it('creates event listeners', () => {
      let mockClient = {
        on: sinon.stub()
      }
      new Mqtt(mockClient, 'rootTopic', () => {}) // eslint-disable-line no-new
      expect(mockClient.on.callCount).to.equal(6)
      expect(mockClient.on.calledWith('connect'))
      expect(mockClient.on.calledWith('error'))
      expect(mockClient.on.calledWith('message'))
    })
    it('publishes online status on connect', () => {
      let mockClient = new EventEmitter()
      mockClient.subscribe = sinon.stub()
      let mqtt = new Mqtt(mockClient, 'rootTopic', () => {}) // eslint-disable-line no-new
      let publishStub = sinon.stub(mqtt, 'publishOnlineStatus')
      mockClient.emit('connect', {sessionPresent: true})
      expect(publishStub.called).to.equal(true)
    })
    it('subscribes to request topic on connect', () => {
      let mockClient = new EventEmitter()
      mockClient.subscribe = sinon.stub()
      let mqtt = new Mqtt(mockClient, 'rootTopic', () => {}) // eslint-disable-line no-new
      sinon.stub(mqtt, 'publishOnlineStatus')
      mockClient.emit('connect', {sessionPresent: false})
      expect(mockClient.subscribe.called).to.equal(true)
    })
    it('does not subscribe to request topic on reconnect', () => {
      let mockClient = new EventEmitter()
      mockClient.subscribe = sinon.stub()
      let mqtt = new Mqtt(mockClient, 'rootTopic', () => {}) // eslint-disable-line no-new
      sinon.stub(mqtt, 'publishOnlineStatus')
      mockClient.emit('connect', {sessionPresent: true})
      expect(mockClient.subscribe.called).to.equal(false)
    })
    it('calls message callback on error', (done) => {
      let mockClient = new EventEmitter()
      mockClient.subscribe = sinon.stub().yields(Error('callback test'))
      let callback = (error, message) => {
        expect(error).to.be.instanceof(Error)
        done()
      }
      let mqtt = new Mqtt(mockClient, 'rootTopic', callback) // eslint-disable-line no-new
      sinon.stub(mqtt, 'publishOnlineStatus')
      mockClient.emit('connect', {sessionPresent: false})
    })
    it('calls message callback on incoming message', (done) => {
      let mockClient = new EventEmitter()
      let callback = (error, topic, message) => {
        expect(error).to.equal(null)
        expect(topic).to.equal('topic')
        expect(message).to.equal('message')
        done()
      }
      new Mqtt(mockClient, 'rootTopic', callback) // eslint-disable-line no-new
      mockClient.emit('message', 'topic', 'message')
    })
  })
  describe('Mqtt#end', () => {
    it('publishes offline status if connected', () => {
      let mockClient = new EventEmitter()
      mockClient.end = sinon.stub()
      let mqtt = new Mqtt(mockClient, 'rootTopic', () => {})
      let publishStub = sinon.stub(mqtt, 'publishOnlineStatus')
      mockClient.connected = true
      mqtt.end()
      expect(publishStub.calledWith(false)).to.equal(true)
    })
    it('does not publish offline status if not connected', () => {
      let mockClient = new EventEmitter()
      mockClient.end = sinon.stub()
      let mqtt = new Mqtt(mockClient, 'rootTopic', () => {})
      let publishStub = sinon.stub(mqtt, 'publishOnlineStatus')
      mockClient.connected = false
      mqtt.end()
      expect(publishStub.called).to.equal(false)
    })
    it('closes the mqtt client', () => {
      let mockClient = new EventEmitter()
      mockClient.end = sinon.stub()
      let mqtt = new Mqtt(mockClient, 'rootTopic', () => {})
      mqtt.end()
      expect(mockClient.end.called).to.equal(true)
    })
    it('calls messageCallback when closed', (done) => {
      let mockClient = new EventEmitter()
      mockClient.end = sinon.stub().yields()
      let mqtt = new Mqtt(mockClient, 'rootTopic', done)
      mqtt.end()
    })
  })
  describe('Mqtt#publishOnlineStatus', () => {
    it('publishes 0 to rootTopic/online when false', (done) => {
      let mockClient = new EventEmitter()
      mockClient.publish = sinon.stub().yields()
      let mqtt = new Mqtt(mockClient, 'rootTopic', () => {
        expect(mockClient.publish.calledWith('rootTopic/online', '0'))
        done()
      })
      mqtt.publishOnlineStatus(false)
    })
    it('publishes 1 to rootTopic/online when true', (done) => {
      let mockClient = new EventEmitter()
      mockClient.publish = sinon.stub().yields()
      let mqtt = new Mqtt(mockClient, 'rootTopic', () => {
        expect(mockClient.publish.calledWith('rootTopic/online', '1'))
        done()
      })
      mqtt.publishOnlineStatus(true)
    })
    it('calls messageCallback on error', (done) => {
      let mockClient = new EventEmitter()
      mockClient.publish = sinon.stub().yields(Error('publish error'))
      let mqtt = new Mqtt(mockClient, 'rootTopic', (error) => {
        expect(error).to.be.instanceOf(Error)
        done()
      })
      mqtt.publishOnlineStatus(true)
    })
  })
  describe('Mqtt#publishXBeeFrame', () => {
    it('calls messageCallback if not connected', (done) => {
      let mockClient = new EventEmitter()
      mockClient.connected = false
      let mqtt = new Mqtt(mockClient, 'rootTopic', (error) => {
        expect(error).to.be.instanceOf(Error)
        done()
      })
      mqtt.publishXBeeFrame({})
    })
    it('does not publish empty frames', () => {
      let mockClient = new EventEmitter()
      mockClient.connected = true
      mockClient.publish = sinon.stub()
      let mqtt = new Mqtt(mockClient, 'rootTopic', () => {})
      mqtt.publishXBeeFrame()
      expect(mockClient.publish.called).to.equal(false)
    })
    it('publishes a message to response topic', () => {
      let mockClient = new EventEmitter()
      mockClient.connected = true
      mockClient.publish = sinon.stub()
      let mqtt = new Mqtt(mockClient, 'rootTopic', () => {})
      mqtt.publishXBeeFrame('testFrame')
      expect(mockClient.publish.calledWith('rootTopic/response', '"testFrame"')).to.equal(true)
    })
    it('calls messageCallback if publishing fails', (done) => {
      let mockClient = new EventEmitter()
      mockClient.connected = true
      mockClient.publish = sinon.stub().yields()
      let mqtt = new Mqtt(mockClient, 'rootTopic', done)
      mqtt.publishXBeeFrame('testFrame')
    })
  })
  describe('Mqtt#publishLog', () => {
    it('calls messageCallback if not connected', (done) => {
      let mockClient = new EventEmitter()
      let callback = (error, message) => {
        expect(error).to.be.instanceOf(ReferenceError)
        done()
      }
      mockClient.connected = false
      let mqtt = new Mqtt(mockClient, 'rootTopic', callback)
      mqtt.publishLog('test')
    })
    it('only publishes strings or Errors', () => {
      let mockClient = new EventEmitter()
      let mqtt = new Mqtt(mockClient, 'rootTopic', 'callback')
      expect(() => {
        mqtt.publishLog(999)
      }).to.throw(TypeError)
    })
    it('publishes to the logTopic', () => {
      let mockClient = new EventEmitter()
      mockClient.connected = true
      mockClient.publish = sinon.stub()
      let mqtt = new Mqtt(mockClient, 'rootTopic', () => {})
      mqtt.publishLog('test')
      expect(mockClient.publish.calledWith('rootTopic/log', 'test')).to.equal(true)
    })
    it('calls messageCallback if publishing fails', () => {

    })
  })
})
