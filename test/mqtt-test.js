/* eslint-env jest */
const Mqtt = require('../lib/mqtt.js')
const EventEmitter = require('events')

describe('Mqtt', function () {
  describe('Mqtt#constructor', () => {
    it('throws if arguments are missing', () => {
      expect(() => {
        new Mqtt() // eslint-disable-line no-new
      }).toThrow(TypeError)
      expect(() => {
        new Mqtt('mqtt') // eslint-disable-line no-new
      }).toThrow(TypeError)
      expect(() => {
        new Mqtt('mqtt', 'rootTopic') // eslint-disable-line no-new
      }).toThrow(TypeError)
    })
    it('creates event listeners', () => {
      const mockClient = {
        on: jest.fn()
      }
      new Mqtt(mockClient, 'rootTopic') // eslint-disable-line no-new
      expect(mockClient.on).toHaveBeenCalledTimes(6)
      expect(mockClient.on).toHaveBeenCalledWith('connect', expect.anything())
      expect(mockClient.on).toHaveBeenCalledWith('error', expect.anything())
      expect(mockClient.on).toHaveBeenCalledWith('message', expect.anything())
    })
    it('publishes online status on connect', () => {
      const mockClient = new EventEmitter()
      mockClient.subscribe = jest.fn()
      const mqtt = new Mqtt(mockClient, 'rootTopic')
      mqtt.publishOnlineStatus = jest.fn()
      mockClient.emit('connect', { sessionPresent: true })
      expect(mqtt.publishOnlineStatus).toHaveBeenCalled()
    })
    it('subscribes to request topic on connect', () => {
      const mockClient = new EventEmitter()
      mockClient.subscribe = jest.fn()
      const mqtt = new Mqtt(mockClient, 'rootTopic')
      mqtt.publishOnlineStatus = jest.fn()
      mockClient.emit('connect', { sessionPresent: false })
      expect(mockClient.subscribe).toHaveBeenCalled()
    })
    it('does not subscribe to request topic on reconnect', () => {
      const mockClient = new EventEmitter()
      mockClient.subscribe = jest.fn()
      const mqtt = new Mqtt(mockClient, 'rootTopic')
      mqtt.publishOnlineStatus = jest.fn()
      mockClient.emit('connect', { sessionPresent: true })
      expect(mockClient.subscribe).not.toHaveBeenCalled()
    })
    it('emits event on error', (done) => {
      const mockClient = new EventEmitter()
      mockClient.subscribe = jest.fn().mockImplementation(() => { throw new Error() })
      const mqtt = new Mqtt(mockClient, 'rootTopic')
      mqtt.on('error', (error) => {
        expect(error).toBeInstanceOf(Error)
        done()
      })
      mockClient.emit('error', Error('error-event'))
    })
    it('emits event on incoming message', (done) => {
      const mockClient = new EventEmitter()
      const mqtt = new Mqtt(mockClient, 'rootTopic')
      mqtt.on('mqtt-msg', (topic, message) => {
        expect(topic).toEqual('topic')
        expect(message).toEqual('message')
        done()
      })
      mockClient.emit('message', 'topic', 'message')
    })
  })
  describe('Mqtt#destroy', () => {
    it('publishes offline status if connected', () => {
      const mockClient = new EventEmitter()
      mockClient.end = jest.fn()
      const mqtt = new Mqtt(mockClient, 'rootTopic')
      mqtt.publishOnlineStatus = jest.fn()
      mockClient.connected = true
      mqtt.destroy()
      expect(mqtt.publishOnlineStatus).toHaveBeenCalledWith(false)
    })
    it('does not publish offline status if not connected', () => {
      const mockClient = new EventEmitter()
      mockClient.end = jest.fn()
      const mqtt = new Mqtt(mockClient, 'rootTopic')
      mqtt.publishOnlineStatus = jest.fn()
      mockClient.connected = false
      mqtt.destroy()
      expect(mqtt.publishOnlineStatus).not.toHaveBeenCalled()
    })
    it('closes the mqtt client', () => {
      const mockClient = new EventEmitter()
      mockClient.end = jest.fn()
      const mqtt = new Mqtt(mockClient, 'rootTopic')
      mqtt.destroy()
      expect(mockClient.end).toHaveBeenCalled()
    })
  })
  describe('Mqtt#publishOnlineStatus', () => {
    it('publishes 0 to rootTopic/online when false', () => {
      const mockClient = new EventEmitter()
      mockClient.publish = jest.fn()
      const mqtt = new Mqtt(mockClient, 'rootTopic')
      mqtt.publishOnlineStatus(false)
      expect(mockClient.publish).toHaveBeenCalledWith('rootTopic/online', '0', { retain: true }, expect.anything())
    })
    it('publishes 1 to rootTopic/online when true', () => {
      const mockClient = new EventEmitter()
      mockClient.publish = jest.fn()
      const mqtt = new Mqtt(mockClient, 'rootTopic')
      mqtt.publishOnlineStatus(true)
      expect(mockClient.publish).toHaveBeenCalledWith('rootTopic/online', '1', { retain: true }, expect.anything())
    })
    it('emits event on error', (done) => {
      const mockClient = new EventEmitter()
      mockClient.publish = function () { this.emit('error', new Error('publish error')) }
      const mqtt = new Mqtt(mockClient, 'rootTopic')
      mqtt.on('error', (err) => {
        expect(err).toBeInstanceOf(Error)
        expect(err).toHaveProperty('message', 'publish error')
        done()
      })
      mqtt.publishOnlineStatus(true)
    })
  })
  describe('Mqtt#publishXBeeFrame', () => {
    it('emits error if not connected', (done) => {
      const mockClient = new EventEmitter()
      mockClient.connected = false
      const mqtt = new Mqtt(mockClient, 'rootTopic')
      mqtt.on('error', (err) => {
        expect(err).toBeInstanceOf(ReferenceError)
        done()
      })
      mqtt.publishXBeeFrame({})
    })
    it('does not publish empty frames', () => {
      const mockClient = new EventEmitter()
      mockClient.connected = true
      mockClient.publish = jest.fn()
      const mqtt = new Mqtt(mockClient, 'rootTopic', () => {})
      mqtt.publishXBeeFrame()
      expect(mockClient.publish).not.toHaveBeenCalled()
    })
    it('publishes a message to response topic', () => {
      const mockClient = new EventEmitter()
      mockClient.connected = true
      mockClient.publish = jest.fn()
      const mqtt = new Mqtt(mockClient, 'rootTopic', () => {})
      mqtt.publishXBeeFrame('testFrame')
      expect(mockClient.publish).toHaveBeenCalledWith('rootTopic/response', '"testFrame"', null, expect.anything())
    })
    it('emits error if publishing fails', (done) => {
      const mockClient = new EventEmitter()
      mockClient.connected = true
      mockClient.publish = function () { this.emit('error', new Error('test-error')) }
      const mqtt = new Mqtt(mockClient, 'rootTopic', done)
      mqtt.on('error', (err) => {
        expect(err).toBeInstanceOf(Error)
        done()
      })
      mqtt.publishXBeeFrame('testFrame')
    })
  })
  describe('Mqtt#publishLog', () => {
    it('emits error if not connected', (done) => {
      const mockClient = new EventEmitter()
      mockClient.connected = false
      const mqtt = new Mqtt(mockClient, 'rootTopic')
      mqtt.on('error', (err) => {
        expect(err).toBeInstanceOf(ReferenceError)
        done()
      })
      mqtt.publishLog('test')
    })
    it('only publishes strings or Errors', () => {
      const mockClient = new EventEmitter()
      const mqtt = new Mqtt(mockClient, 'rootTopic')
      expect(() => {
        mqtt.publishLog(999)
      }).toThrow(TypeError)
    })
    it('publishes to the logTopic', () => {
      const mockClient = new EventEmitter()
      mockClient.connected = true
      mockClient.publish = jest.fn()
      const mqtt = new Mqtt(mockClient, 'rootTopic')
      mqtt.publishLog('test')
      expect(mockClient.publish).toHaveBeenCalledWith('rootTopic/log', 'test', { retain: true }, expect.anything())
    })
  })
})
