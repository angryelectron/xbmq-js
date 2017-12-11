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
      new Mqtt(mockClient, 'rootTopic') // eslint-disable-line no-new
      expect(mockClient.on.callCount).to.equal(6)
      expect(mockClient.on.calledWith('connect'))
      expect(mockClient.on.calledWith('error'))
      expect(mockClient.on.calledWith('message'))
    })
    it('publishes online status on connect', () => {
      let mockClient = new EventEmitter()
      mockClient.subscribe = sinon.stub()
      let mqtt = new Mqtt(mockClient, 'rootTopic')
      let publishStub = sinon.stub(mqtt, 'publishOnlineStatus')
      mockClient.emit('connect', {sessionPresent: true})
      expect(publishStub.called).to.equal(true)
    })
    it('subscribes to request topic on connect', () => {
      let mockClient = new EventEmitter()
      mockClient.subscribe = sinon.stub()
      let mqtt = new Mqtt(mockClient, 'rootTopic')
      sinon.stub(mqtt, 'publishOnlineStatus')
      mockClient.emit('connect', {sessionPresent: false})
      expect(mockClient.subscribe.called).to.equal(true)
    })
    it('does not subscribe to request topic on reconnect', () => {
      let mockClient = new EventEmitter()
      mockClient.subscribe = sinon.stub()
      let mqtt = new Mqtt(mockClient, 'rootTopic')
      sinon.stub(mqtt, 'publishOnlineStatus')
      mockClient.emit('connect', {sessionPresent: true})
      expect(mockClient.subscribe.called).to.equal(false)
    })
    it('emits event on error', (done) => {
      let mockClient = new EventEmitter()
      mockClient.subscribe = sinon.stub().yields(Error('test'))
      let mqtt = new Mqtt(mockClient, 'rootTopic')
      mqtt.on('error', (error) => {
        expect(error).to.be.instanceof(Error)
        done()
      })
      mockClient.emit('error', Error('error-event'))
    })
    it('emits event on incoming message', (done) => {
      let mockClient = new EventEmitter()
      let mqtt = new Mqtt(mockClient, 'rootTopic')
      mqtt.on('mqtt-msg', (topic, message) => {
        expect(topic).to.equal('topic')
        expect(message).to.equal('message')
        done()
      })
      mockClient.emit('message', 'topic', 'message')
    })
  })
  describe('Mqtt#destroy', () => {
    it('publishes offline status if connected', () => {
      let mockClient = new EventEmitter()
      mockClient.end = sinon.stub()
      let mqtt = new Mqtt(mockClient, 'rootTopic')
      let publishStub = sinon.stub(mqtt, 'publishOnlineStatus')
      mockClient.connected = true
      mqtt.destroy()
      expect(publishStub.calledWith(false)).to.equal(true)
    })
    it('does not publish offline status if not connected', () => {
      let mockClient = new EventEmitter()
      mockClient.end = sinon.stub()
      let mqtt = new Mqtt(mockClient, 'rootTopic')
      let publishStub = sinon.stub(mqtt, 'publishOnlineStatus')
      mockClient.connected = false
      mqtt.destroy()
      expect(publishStub.called).to.equal(false)
    })
    it('closes the mqtt client', () => {
      let mockClient = new EventEmitter()
      mockClient.end = sinon.stub()
      let mqtt = new Mqtt(mockClient, 'rootTopic')
      mqtt.destroy()
      expect(mockClient.end.called).to.equal(true)
    })
  })
  describe('Mqtt#publishOnlineStatus', () => {
    it('publishes 0 to rootTopic/online when false', () => {
      let mockClient = new EventEmitter()
      mockClient.publish = sinon.stub().yields()
      let mqtt = new Mqtt(mockClient, 'rootTopic')
      mqtt.publishOnlineStatus(false)
      expect(mockClient.publish.calledWith('rootTopic/online', '0')).to.equal(true)
    })
    it('publishes 1 to rootTopic/online when true', () => {
      let mockClient = new EventEmitter()
      mockClient.publish = sinon.stub().yields()
      let mqtt = new Mqtt(mockClient, 'rootTopic')
      mqtt.publishOnlineStatus(true)
      expect(mockClient.publish.calledWith('rootTopic/online', '1')).to.equal(true)
    })
    it('emits event on error', (done) => {
      let mockClient = new EventEmitter()
      mockClient.publish = sinon.stub().yields(Error('publish error'))
      let mqtt = new Mqtt(mockClient, 'rootTopic')
      mqtt.on('error', (err) => {
        expect(err).to.be.instanceof(Error)
        expect(err).to.have.property('message', 'publish error')
        done()
      })
      mqtt.publishOnlineStatus(true)
    })
  })
  describe('Mqtt#publishXBeeFrame', () => {
    it('emits error if not connected', (done) => {
      let mockClient = new EventEmitter()
      mockClient.connected = false
      let mqtt = new Mqtt(mockClient, 'rootTopic')
      mqtt.on('error', (err) => {
        expect(err).to.be.instanceof(ReferenceError)
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
    it('emits error if publishing fails', (done) => {
      let mockClient = new EventEmitter()
      mockClient.connected = true
      mockClient.publish = sinon.stub().yields(Error('test-error'))
      let mqtt = new Mqtt(mockClient, 'rootTopic', done)
      mqtt.on('error', (err) => {
        expect(err).to.be.instanceof(Error)
        done()
      })
      mqtt.publishXBeeFrame('testFrame')
    })
  })
  describe('Mqtt#publishLog', () => {
    it('emits error if not connected', (done) => {
      let mockClient = new EventEmitter()
      mockClient.connected = false
      let mqtt = new Mqtt(mockClient, 'rootTopic')
      mqtt.on('error', (err) => {
        expect(err).to.be.instanceOf(ReferenceError)
        done()
      })
      mqtt.publishLog('test')
    })
    it('only publishes strings or Errors', () => {
      let mockClient = new EventEmitter()
      let mqtt = new Mqtt(mockClient, 'rootTopic')
      expect(() => {
        mqtt.publishLog(999)
      }).to.throw(TypeError)
    })
    it('publishes to the logTopic', () => {
      let mockClient = new EventEmitter()
      mockClient.connected = true
      mockClient.publish = sinon.stub()
      let mqtt = new Mqtt(mockClient, 'rootTopic')
      mqtt.publishLog('test')
      expect(mockClient.publish.calledWith('rootTopic/log', 'test')).to.equal(true)
    })
    it('calls messageCallback if publishing fails', () => {

    })
  })
})
