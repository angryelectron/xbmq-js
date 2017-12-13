/*
 * Log all XBee events to the console.  Use a second XBee to broadcast or
 * send messages to the local XBee.  XBee frames and errors will be shown.
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
  // setup a listener to handle XBee messages
  xbee.on('xbee-msg', (frame) => {
    console.log(frame)
  })
}).catch((err) => {
  console.log(err)
  process.exit(1)
})
