/* eslint-env mocha */

const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
const sinon = require('sinon')
chai.use(chaiAsPromised)
const expect = chai.expect

const XBee = require('../lib/xbee.js')
const MockSerialPort = require('serialport/test')
const MockXBeeParser = require('events')
const Stream = require('stream').Transform

describe('XBee', () => {
  let xbee, mockXBee, mockSerial
  beforeEach(() => {
    MockSerialPort.Binding.createPort('/dev/TEST')
    mockXBee = {
      parser: new MockXBeeParser(),
      builder: new Stream(),
      nextFrameId: () => { this.id++ || 1 }
    }
    mockSerial = new MockSerialPort('/dev/TEST')
    xbee = new XBee(mockSerial, mockXBee, () => {})
  })

  afterEach(() => {
    xbee.destroy()
    MockSerialPort.Binding.reset()
  })

  describe('XBee#constructor', () => {
    it('calls callback with Error on XBee error', function (done) {
      xbee.callback = (error, message) => {
        expect(error).to.be.instanceof(Error)
        expect(error).to.have.property('message', 'test')
        done()
      }
      xbee.xbeeAPI.parser.emit('error', Error('test'))
    })
    it('calls messageCallback with XBee frame', (done) => {
      xbee.callback = (error, frame) => {
        expect(error).to.equal(null)
        expect(frame).to.equal('test-frame')
        done()
      }
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
      return expect(XBee.create()).to.eventually.be.rejectedWith('Bad or missing arguments')
    })
    it('rejects if baud is invalid', () => {
      config.baud = 'invalid'
      return expect(XBee.create(config)).to.eventually.be.rejectedWith('"baudRate" must be a number')
    })
    it('rejects if apiMode is invalid', () => {
      config.apiMode = 'invalid'
      return expect(XBee.create(config)).to.eventually.be.rejectedWith('Invalid API mode')
    })
    it('rejects if callback is invalid', () => {
      config.callback = 'invalid'
      return expect(XBee.create(config)).to.eventually.be.rejectedWith('missing callback').then(() => {
        config.callback = () => {}
        return expect(XBee.create(config)).to.eventually.be.rejectedWith('missing callback')
      }).then(() => {
        config.callback = (a) => {}
        return expect(XBee.create(config)).to.eventually.be.rejectedWith('missing callback')
      })
    })
    it('throws if serial port is already open', () => {
      // beforeEach has already opened the port - try and open it again
      return expect(XBee.create(config)).to.eventually.be.rejectedWith('Port is locked cannot open')
    })
  })

  describe('XBee#sendFrame', () => {
    it('throws on frame write error', () => {
      var badFrame = 'bad'
      xbee.xbeeAPI.builder.write = sinon.stub().throws(Error('send-error'))
      expect(() => {
        xbee.sendFrame(badFrame)
      }).to.throw('send-error')
    })
    it('should accept valid xbee-api frames', () => {
      xbee.xbeeAPI.builder.write = sinon.stub()
      var standardFrame = '{"type":9, "id":1, "command":"BD", "commandParameter":[7]}'
      var typeHex = '{"type":"0x09", "id":1, "command":"BD", "commandParameter":[7]}'
      var idHex = '{"type":9, "id":"0x01", "command":"BD", "commandParameter":[7]}'
      var noCP = '{"type":9, "id":1, "command":"BD"}'
      expect(() => {
        xbee.sendFrame(standardFrame)
        xbee.sendFrame(typeHex)
        xbee.sendFrame(idHex)
        xbee.sendFrame(noCP)
      }).to.not.throw()
    })
  })

  describe('XBee#sendAndReceiveFrame', () => {
    it('should reject if frame is invalid', () => {
      xbee.xbeeAPI.builder.write = sinon.stub().throws()
      return expect(xbee.sendAndReceiveFrame({type: 'invalid'}, 1)).to.eventually.be.rejected
    })

    it('resolves with a response', () => {
      const testFrame = {
        type: 0x08,
        command: 'ID',
        commandParameter: []
      }
      // keep track of event listeners and handlers
      let addSpy = sinon.spy(xbee.xbeeAPI.parser, 'on')
      let removeSpy = sinon.spy(xbee.xbeeAPI.parser, 'removeListener')
      // short circuit the serial port pipe
      xbee.xbeeAPI.builder.write = sinon.stub().callsFake(() => {
        xbee.xbeeAPI.parser.emit('data', testFrame)
      })
      return xbee.sendAndReceiveFrame(testFrame, 1000).then((responseFrame) => {
        expect(responseFrame).to.eql(testFrame)
        // ensure any added listeners are removed
        expect(addSpy.calledOnce).to.equal(true)
        expect(removeSpy.calledOnce).to.equal(true)
        expect(addSpy.calledWith('data'))
      })
    })

    it('should reject on timeout', () => {
      var testFrame = {
        type: 0x08,
        command: 'ID',
        commandParameter: []
      }
      xbee.xbeeAPI.builder.write = sinon.stub()
      // since write is stubbed there will be no data event
      return expect(xbee.sendAndReceiveFrame(testFrame, 10)).to.eventually.be.rejectedWith('Timeout waiting for XBee')
    })
  })

  describe('XBee#getLocalAddress()', () => {
    it('should resolve with an address string', () => {
      let transmitStub = sinon.stub(xbee, 'sendAndReceiveFrame')
        .onFirstCall().resolves({commandData: '1234'})
        .onSecondCall().resolves({commandData: 'ABCD'})
      return xbee.getLocalAddress().then((addr) => {
        expect(transmitStub.callCount).to.equal(2)
        expect(addr).to.equal('1234ABCD')
      })
    })
    it('reject on error', () => {
      sinon.stub(xbee, 'sendAndReceiveFrame').rejects(Error('test'))
      return expect(xbee.getLocalAddress()).to.eventually.be.rejectedWith('test')
    })
  })

  describe('XBee#getLocalNI()', () => {
    it('should resolve with a node-identifier string', () => {
      let transmitStub = sinon.stub(xbee, 'sendAndReceiveFrame').resolves({commandData: 'NI'})
      return xbee.getLocalNI().then((ni) => {
        expect(transmitStub.called).to.equal(true)
        expect(ni).to.equal('NI')
      })
    })

    it('should reject on error', () => {
      sinon.stub(xbee, 'sendAndReceiveFrame').rejects(Error('test'))
      return expect(xbee.getLocalNI()).to.eventually.be.rejectedWith('test')
    })
  })
})
