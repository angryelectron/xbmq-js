/* eslint-env jest */
const XBee = require('../lib/xbee.js')
const { SerialPortMock } = require('serialport')
const MockXBeeParser = require('events')
const Stream = require('stream').Transform

describe('XBee', () => {
  let xbee, mockXBee, mockSerial
  beforeEach(() => {
    const path = '/dev/TEST'
    SerialPortMock.binding.createPort(path)
    mockXBee = {
      parser: new MockXBeeParser(),
      builder: new Stream(),
      nextFrameId: () => { this.id = 1 }
    }
    mockSerial = new SerialPortMock({ path, baudRate: 9600 })
    xbee = new XBee(mockSerial, mockXBee)
  })

  afterEach(() => {
    xbee.destroy()
    SerialPortMock.binding.reset()
  })

  describe('XBee#constructor', () => {
    it('emits event with Error on XBee error', function (done) {
      xbee.on('error', (error) => {
        expect(error).toBeInstanceOf(Error)
        expect(error).toHaveProperty('message', 'test')
        done()
      })
      xbee.xbeeAPI.parser.emit('error', Error('test'))
    })
    it('emits xbee-msg event on XBee frame', (done) => {
      xbee.on('xbee-msg', (frame) => {
        expect(frame).toEqual('test-frame')
        done()
      })
      xbee.xbeeAPI.parser.emit('data', 'test-frame')
    })
  })
  describe('XBee#create', () => {
    let config
    beforeEach(() => {
      config = {
        apiMode: 2,
        port: '/dev/TEST',
        baud: 9600,
        callback: (e, f) => {}
      }
    })
    it('rejects if arguments are missing', () => {
      return expect(XBee.create()).rejects.toThrow('Bad or missing arguments')
    })
    it('rejects if baud is invalid', () => {
      config.baud = 'invalid'
      return expect(XBee.create(config)).rejects.toThrow('"baudRate" must be a number')
    })
    it('rejects if apiMode is invalid', () => {
      config.apiMode = 'invalid'
      return expect(XBee.create(config)).rejects.toThrow('Invalid API mode')
    })
    it('rejects if serial port is already open', () => {
      // beforeEach has already opened the port - try and open it again
      return expect(XBee.create(config)).rejects.toThrow('Unknown error code')
    })
  })

  describe('XBee#sendFrame', () => {
    it('throws on frame write error', () => {
      const badFrame = 'bad'
      xbee.xbeeAPI.builder.write = jest.fn().mockImplementation(() => { throw new Error('send-error') })
      expect(() => {
        xbee.sendFrame(badFrame)
      }).toThrow('send-error')
    })
    it('should accept valid xbee-api frames', () => {
      xbee.xbeeAPI.builder.write = jest.fn()
      const standardFrame = '{"type":9, "id":1, "command":"BD", "commandParameter":[7]}'
      const typeHex = '{"type":"0x09", "id":1, "command":"BD", "commandParameter":[7]}'
      const idHex = '{"type":9, "id":"0x01", "command":"BD", "commandParameter":[7]}'
      const noCP = '{"type":9, "id":1, "command":"BD"}'
      expect(() => {
        xbee.sendFrame(standardFrame)
        xbee.sendFrame(typeHex)
        xbee.sendFrame(idHex)
        xbee.sendFrame(noCP)
      }).not.toThrow()
    })
  })

  describe('XBee#sendAndReceiveFrame', () => {
    it('should reject if frame is invalid', () => {
      xbee.xbeeAPI.builder.write = jest.fn().mockImplementation(() => { throw new Error('invalid') })
      return expect(xbee.sendAndReceiveFrame({ type: 'invalid' }, 1)).rejects.toThrow('invalid')
    })

    it('resolves with a response', () => {
      const testFrame = {
        type: 0x08,
        command: 'ID',
        commandParameter: []
      }
      // keep track of event listeners and handlers
      const addSpy = jest.spyOn(xbee.xbeeAPI.parser, 'on')
      const removeSpy = jest.spyOn(xbee.xbeeAPI.parser, 'removeListener')
      // short circuit the serial port pipe
      xbee.xbeeAPI.builder.write = jest.fn().mockImplementation(() => {
        xbee.xbeeAPI.parser.emit('data', testFrame)
      })
      return xbee.sendAndReceiveFrame(testFrame, 1000).then((responseFrame) => {
        expect(responseFrame).toEqual(testFrame)
        // ensure any added listeners are removed
        // expect(addSpy.calledOnce).toEqual(true)
        expect(removeSpy).toHaveBeenCalledTimes(1)
        expect(addSpy).toHaveBeenCalledWith('data', expect.anything())
      })
    })

    it('should reject on timeout', () => {
      const testFrame = {
        type: 0x08,
        command: 'ID',
        commandParameter: []
      }
      xbee.xbeeAPI.builder.write = jest.fn()
      // since write is stubbed there will be no data event
      return expect(xbee.sendAndReceiveFrame(testFrame, 10)).rejects.toThrow('Timeout waiting for XBee')
    })
  })

  describe('XBee#getLocalAddress()', () => {
    it('should resolve with an address string', () => {
      xbee.sendAndReceiveFrame = jest.fn()
        .mockResolvedValueOnce({ commandData: '1234' })
        .mockResolvedValueOnce({ commandData: 'ABCD' })
      return xbee.getLocalAddress().then((addr) => {
        expect(xbee.sendAndReceiveFrame).toHaveBeenCalledTimes(2)
        expect(addr).toEqual('1234ABCD')
      })
    })
    it('rejects on error', () => {
      xbee.sendAndReceiveFrame = jest.fn().mockRejectedValue(Error('test'))
      return expect(xbee.getLocalAddress()).rejects.toThrow('test')
    })
  })

  describe('XBee#getLocalNI()', () => {
    it('should resolve with a node-identifier string', () => {
      xbee.sendAndReceiveFrame = jest.fn().mockResolvedValue({ commandData: 'NI' })
      return xbee.getLocalNI().then((ni) => {
        expect(xbee.sendAndReceiveFrame).toHaveBeenCalledTimes(1)
        expect(ni).toEqual('NI')
      })
    })

    it('should reject on error', () => {
      xbee.sendAndReceiveFrame = jest.fn().mockRejectedValue(Error('test'))
      return expect(xbee.getLocalNI()).rejects.toThrow('test')
    })
  })
})
