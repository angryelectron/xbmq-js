XBee to MQTT Gateway
====================
`xbmq` is a NodeJs XBee-over-MQTT gateway.  It allows two-way communication with
XBee networks through MQTT messages and aims to do as little processing as
possible, allowing it to run reliably and on low-power / embedded devices.

`xbmq` does _not_ enable MQTT messages to be sent through an XBee network.  Instead,
it enables XBee API frames to be sent and received by MQTT clients.

Quick Start
------------
Install xbmq via `npm install xbmq` or `npm install -g xbmq`.

Configure the local XBee:

* ID - set the same for all radios in the network.
* AP=1 or 2 - xbmq uses API mode to communicate with the local XBee.
* NI - the Node Identifier of the local XBee is used as an MQTT topic.  Optional,
but recommended.
* Connect the local XBee using a serial port adapter (Sparkfun's XBee Explorer,
Adafruit's XBee Adapter, etc.)

Configure xbmq with your mqtt and serial port settings using command-line
arguments.  The arguments and their default values are:

* --rootTopic xbmq
* --broker mqtt://test.mosquitto.org
* --username (none)
* --password (none)
* --port /dev/ttyUSB0
* --baud 9600
* --log ./xbmq.log
* --loglevel info
* --apiMode 2

Then start the gateway with `xbmq <options>` (for global install).  Alternatively,
if installed locally (vs. globally), you can use a config file. Copy or rename
`config.json.sample` to `config.json` and lauch using `./xbmq.js` (or via pm2).

Note: Command-line arguments override config.json.

Operation
---------
All MQTT messages (to and from the XBee network) are published to subtopics of
`rootTopic/gatewayIdentifier`, where `rootTopic` is configured as above
and `gatewayIdentifier` is the NI value of the local XBee.  If NI is not set, the
radio's 64-bit address will be used instead.

### Topic: rootTopic/gatewayIdentifier/online
* _Message Type:_ String
* _Message Value:_ "1" for online, "0" for offline
* _Description:_ Messages are published to this topic by the gateway to
  indicate the gateway's online status.  

### Topic: rootTopic/gatewayIdentifier/response
* _Message Type:_ JSON
* _Message Value:_ An [xbee-api](https://www.npmjs.com/package/xbee-api) frame
* _Description:_ Messages from the XBee network are published to this topic.

### Topic: rootTopic/gatewayIdentifier/request
* _Message Type:_ JSON
* _Message Value:_ An [xbee-api](https://www.npmjs.com/package/xbee-api) frame
* _Description:_ Mqtt clients can publish to this topic to issue commands to the
  XBee network.  

### Messages
xbee-api frames received from the XBee network will be converted to JSON and published
to the broker, but there are a few shortcuts and things to keep in mind when
building xbee-api frames to send via mqtt:

* Hexadecimal values for `type` and `id` should be decimal numbers or hedecimal strings (ie. 16, "0x10"),
* `commandParameter` is optional
* See the [xbee-api](https://www.npmjs.com/package/xbee-api) documentation
  for more information about building and parsing frames.

# Tips for Using with MQTT Clients

### MQTT module for NodeJS
* Call JSON.parse(message) on messages received from the `request` topic.
* Call JSON.stringify(message) on XBee frame objects before publishing.

### Node-Red
* Connect a JSON node to the output of the MQTT node that is subscribed to the
`request` topic.

Embedded Application Note
-------------------------
xbmq-js is intended to run on single board computers, OpenWrt routers,
and other devices with limited resources that either can't access npm repositories,
don't have native compilers, or just take forever to run `npm install`.

This is why dependencies without native components have been bundled with the
application.  `serialport` is listed as an optional dependency because
installing it involves native compiling, which typically can't be done on these
limited devices.

About
-----
* xbmq-js, copyright 2015-2017 Andrew Bythell, [abythell@ieee.org](mailto:abythell@ieee.org)
* http://github.com/angryelectron/xbmq-js

xbmq is free software: you can redistribute it and/or modify it under the terms
of the GNU General Public License as published by the Free Software Foundation,
either version 3 of the License, or (at your option) any later version.

xbmq is distributed in the hope that it will be useful, but WITHOUT ANY
WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A
PARTICULAR PURPOSE. See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with
xbmq. If not, see http://www.gnu.org/licenses/.
