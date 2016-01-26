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

Topic: rootTopic/gatewayAddress/Online
--------------------------------------
Message Type: String
Message Value: "1" for online, "0" for offline

Messages are published to this topic by the gateway to indicate the gateway's
online status.  

Topic: rootTopic/gatewayAddress/xbeeAddress/response
-----------------------------------------------------
Message Type: JSON string
Message Value: An [xbee-api](https://www.npmjs.com/package/xbee-api) frame

Messages from the XBee radio with address `xbeeAddress` are published to this 
topic. 

Topic: rootTopic/gatewayAddress/request
---------------------------------------
Message Type: JSON string
Message Value: An [xbee-api](https://www.npmjs.com/package/xbee-api) frame

Mqtt clients can publish to this topic to issue commands on the XBee network.
Because JSON does not support hexadecimal numbers, `type` and `id` must be
passed in decimal or as hedecimal strings (ie. 16, "0x10").  Also, since many 
XBee commands don't require a commandParameter, it can be omitted from the 
message if desired.

Tips for Using with MQTT Clients
=========================================

MQTT (Node.js)
* Call JSON.parse(message) on messages received from the `request` topic.
* Call message.toString() on messages received from the `log` topic.
* Call JSON.stringify(message) on XBee frame objects before publishing.

Node-Red
* Connect a JSON node to the output of the MQTT node that is subscribed to the
`request` topic.