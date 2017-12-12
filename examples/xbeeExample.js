/*
 * Example showing the use of the XBMQ XBee class.
 * @copyright 2017 Andrew Bythell <abythell@ieee.org>
 */
const XBee = require('../lib/xbee.js')
const xbeeConfig = {
  apiMode: 2,
  port: '/dev/ttyUSB0',
  baud: 9600
}
let xbee
// create an XBee instance to open the port and
// connect to the XBee.
XBee.create(xbeeConfig).then((instance) => {
  xbee = instance
  // setup a listener to handle XBee errors
  xbee.on('error', (err) => {
    console.log(err)
  })
  // request local 64-bit address
  return xbee.getLocalAddress()
}).then((addr) => {
  console.log(addr)
   // now get the local node-identifier
  return xbee.getLocalNI()
}).then((ni) => {
  console.log(ni)
  // build an xbee-api frame for a local AT command.  See the xbee-api
  // project for details on building frames
  let frame = {
    type: 0x08,
    command: 'ID',
    commandParameter: []
  }
  // sendAndReceiveFrame will return a response, vs. sendFrame which will
  // send the response and return without waiting
  return xbee.sendAndReceiveFrame(frame)
}).then((id) => {
  // ID commandData response is a buffer
  console.log(id.commandData.toString('hex'))
  // now create a node-discovery request
  let frame = {
    type: 0x08,
    command: 'ND',
    commandParameter: []
  }
  // the ND command doesn't return a value immediately - instead, other XBee
  // radios will respond asynchronously, so create a listener to handle the
  // responses.
  xbee.on('xbee-msg', (frame) => {
    console.log('Got ND response: ' + JSON.stringify(frame))
  })
  // use sendFrame to make this 'asyncronous' request - unlike sendAndReceiveFrame
  // it won't wait for a response or timeout.
  return xbee.sendFrame(frame)
}).then(() => {
  // wait 15 seconds for ND responses, then close the XBee port and exit
  setInterval(() => {
    xbee.destroy().then(() => {
      process.exit(0)
    })
  }, 15000)
}).catch((err) => {
  console.log(err)
  process.exit(1)
})
