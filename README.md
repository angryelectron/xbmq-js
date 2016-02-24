XBee to MQTT Gateway
====================
`xbmq` is a NodeJs XBee-to-MQTT gateway.  It allows two-way communication with
XBee networks through MQTT messages and aims to do as little processing as
possible, allowing it to run reliably and on low-power devices like OpenWrt.

PreRequisites
-------------
To run xbmq, you must have:

1. Node.js, npm
2. An XBee radio in Escaped API mode (AP=2).
3. A connection from the XBee to a serial port.

Installation
------------
1. Run `npm install xbmq -g`.
2. Edit xbmq.js to set options such as broker and serial port.
3. Connect an XBee serial adapter.
4. Run `xbmq`

Operation
---------
All MQTT messages (to and from the XBee network) are published to subtopics of
`rootTopic/nodeIdentifier`, where `rootTopic` is defined in xbmq.js 
and `nodeIdentifier` is the NI value of the local XBee.  If NI is not set, the
radio's 64-bit address will be used instead.

### Topic: rootTopic/gatewayIdentifier/Online
Message Type: String
Message Value: "1" for online, "0" for offline

Messages are published to this topic by the gateway to indicate the gateway's
online status.  

### Topic: rootTopic/gatewayIdentifier/xbeeAddress/response
Message Type: JSON string
Message Value: An [xbee-api](https://www.npmjs.com/package/xbee-api) frame

Messages from the XBee radio with address `xbeeAddress` are published to this 
topic. 

### Topic: rootTopic/gatewayIdentifier/request
Message Type: JSON string
Message Value: An [xbee-api](https://www.npmjs.com/package/xbee-api) frame

Mqtt clients can publish to this topic to issue commands on the XBee network.
Because JSON does not support hexadecimal numbers, `type` and `id` must be
passed in decimal or as hedecimal strings (ie. 16, "0x10").  Also, since many 
XBee commands don't require a commandParameter, it can be omitted from the 
message if desired.

Tips for Using with MQTT Clients
--------------------------------
### MQTT module for NodeJS 
* Call JSON.parse(message) on messages received from the `request` topic.
* Call message.toString() on messages received from the `log` topic.
* Call JSON.stringify(message) on XBee frame objects before publishing.

### Node-Red
* Connect a JSON node to the output of the MQTT node that is subscribed to the
`request` topic.

About
-----
* xbmq-js, copyright 2015-2016 Andrew Bythell, [abythell@ieee.org](mailto:abythell@ieee.org)
* http://github.com/angryelectron/xbmq-js

xbmq is free software: you can redistribute it and/or modify it under the terms
of the GNU General Public License as published by the Free Software Foundation,
either version 3 of the License, or (at your option) any later version.

xbmq is distributed in the hope that it will be useful, but WITHOUT ANY
WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A
PARTICULAR PURPOSE. See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with
xbmq. If not, see http://www.gnu.org/licenses/.
