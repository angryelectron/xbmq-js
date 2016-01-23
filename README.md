node-xbmq
==========
`node-xbmq` is an XBee / MQTT gateway.  It allows two-way communication with
XBee networks through MQTT messages and aims to do as little processing as
possible, allowing it to run reliably and on low-power devices like OpenWrt.

PreRequisites
-------------
To run node-xbmq, you must have:

1. Node.js and npm
2. An XBee radio in Escaped API mode (AP=2).
3. A connection from the XBee to a serial port.

Installation
------------
1. Download and extract node-xbmq or clone it from git.
2. Run `npm install` to install dependencies. 
3. Edit xbmq.js to set options such as broker and serial port.
4. Connect an XBee serial adapter.
5. Run `npm start`

Operation
=========
All MQTT messages (to and from the XBee network) are published to subtopics of
`rootTopic/gatewayAddress`, where `rootTopic` is defined in xbmq.js 
and `gatewayAddress` is the 64-bit address of the local XBee.

rootTopic/gatewayAddress/Online
-------------------------------
Messages are published to this topic by the gateway to indicate the gateway's
online status.  1=online, 0=offline. 

rootTopic/gatewayAddress/response
-----------------------------------------------------------
Messages from the XBee network are published to this topic.  The response is a
JSON object representing an [xbee-api](https://www.npmjs.com/package/xbee-api)
frame.

rootTopic/gatewayAddress/request
--------------------------------
Mqtt clients can publish to this topic to issue commands on the XBee network.
The message should be a JSON object as defined by the xbee-api.

Because JSON does not support hexadecimal numbers, `type` and `id` must be
passed in decimal or as hedecimal strings (ie. 16, "0x10").

Since many XBee commands don't require a commandParameter, it can be omitted
from the message if desired.

For more details about xbee-api commands, please see the
[xbee-api](https://www.npmjs.com/package/xbee-api).
