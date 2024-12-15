let HOSTNAME = '192.168.8.21',
	PORT = 2020,
	USERNAME = 'tpuser',
	PASSWORD = 'tppass';

const EventMethodTypes = { PULL: "pull", SUBSCRIBE: "subscribe" }
let EVENT_MODE = EventMethodTypes.PULL;

let Cam = require('onvif').Cam;
let cam_obj = null;
let flow = require('nimble');

new Cam({
	hostname: HOSTNAME,
	username: USERNAME,
	password: PASSWORD,
	port: PORT,
	timeout: 10000,
	preserveAddress: true
}, function CamFunc(err) {
	if (err) {
		console.log(err);
		return;
	}

	console.log('Connected to ONVIF Device');

	cam_obj = this;

	let hasEvents = false;
	let hasTopics = false;

	flow.series([
		function (callback) {
			cam_obj.getDeviceInformation(function (err, info, xml) {
				if (!err) { console.log('Manufacturer  ' + info.manufacturer); }
				if (!err) { console.log('Model         ' + info.model); }
				if (!err) { console.log('Firmware      ' + info.firmwareVersion); }
				if (!err) { console.log('Serial Number ' + info.serialNumber); }
				callback();
			});
		},
		function (callback) {
			cam_obj.getSystemDateAndTime(function (err, date, xml) {
				if (!err) { console.log('Device Time   ' + date); }
				callback();
			});
		},
		function (callback) {
			cam_obj.getCapabilities(function (err, data, xml) {
				if (err) {
					console.log(err);
				}
				if (data.events) hasEvents = true;
				callback();
			})
		},
		function (callback) {
			if (hasEvents) {
				cam_obj.getEventProperties(function (err, data, xml) {
					if (err) {
						console.log(err);
					} else {
						let parseNode = function (node, topicPath) {
							for (const child in node) {
								if (child == "$") { continue; } else if (child == "messageDescription") {
									let IsProperty = false;
									let source = '';
									let data = '';
									if (node[child].$ && node[child].$.IsProperty) { IsProperty = node[child].$.IsProperty }
									if (node[child].source) { source = JSON.stringify(node[child].source) }
									if (node[child].data) { data = JSON.stringify(node[child].data) }
									console.log('Found Event - ' + topicPath.toUpperCase())
									hasTopics = true
									return
								} else {
									parseNode(node[child], topicPath + '/' + child)
								}
							}
						}
						parseNode(data.topicSet, '')
					}
					console.log('');
					console.log('');
					callback()
				});
			} else {
				callback()
			}
		},
		function (callback) {
			if (hasEvents && hasTopics && EVENT_MODE == EventMethodTypes.PULL) {
				cam_obj.on('event', (camMessage, xml) => {
					ReceivedEvent(camMessage, xml);
				})
			}
			callback()
		}
	]);
})

function stripNamespaces(topic) {
	let output = '';
	let parts = topic.split('/')
	for (let index = 0; index < parts.length; index++) {
		let stringNoNamespace = parts[index].split(':').pop()
		if (output.length == 0) {
			output += stringNoNamespace
		} else {
			output += '/' + stringNoNamespace
		}
	}
	return output
}

function ReceivedEvent(camMessage, _xml) {
    let eventTopic = camMessage.topic._
	eventTopic = stripNamespaces(eventTopic)

    if (eventTopic.includes('Motion')) {
        let eventTime = camMessage.message.message.$.UtcTime;
        let eventProperty = camMessage.message.message.$.PropertyOperation
        let sourceName = null
        let sourceValue = null
        if (camMessage.message.message.source && camMessage.message.message.source.simpleItem) {
            if (Array.isArray(camMessage.message.message.source.simpleItem)) {
                sourceName = camMessage.message.message.source.simpleItem[0].$.Name
                sourceValue = camMessage.message.message.source.simpleItem[0].$.Value
            } else {
                sourceName = camMessage.message.message.source.simpleItem.$.Name
                sourceValue = camMessage.message.message.source.simpleItem.$.Value
            }
        }
        if (camMessage.message.message.data && camMessage.message.message.data.simpleItem) {
            if (Array.isArray(camMessage.message.message.data.simpleItem)) {
                for (let x = 0; x < camMessage.message.message.data.simpleItem.length; x++) {
                    let dataName = camMessage.message.message.data.simpleItem[x].$.Name
                    let dataValue = camMessage.message.message.data.simpleItem[x].$.Value
                    processEvent(eventTime, eventTopic, eventProperty, sourceName, sourceValue, dataName, dataValue)
                }
            } else {
                let dataName = camMessage.message.message.data.simpleItem.$.Name
                let dataValue = camMessage.message.message.data.simpleItem.$.Value
                processEvent(eventTime, eventTopic, eventProperty, sourceName, sourceValue, dataName, dataValue)
            }
        } else if (camMessage.message.message.data && camMessage.message.message.data.elementItem) {
            let dataName = 'elementItem'
            let dataValue = JSON.stringify(camMessage.message.message.data.elementItem)
            processEvent(eventTime, eventTopic, eventProperty, sourceName, sourceValue, dataName, dataValue)
        } else {
            let dataName = null
            let dataValue = null
            processEvent(eventTime, eventTopic, eventProperty, sourceName, sourceValue, dataName, dataValue)
        }
    }
}

function processEvent(eventTime, eventTopic, eventProperty, sourceName, sourceValue, dataName, dataValue) {
	let output = '';
    const now = new Date();
	output += `EVENT: ${now.toJSON()} ${eventTopic}`
	if (typeof (eventProperty) !== "undefined") {
		output += ` PROP:${eventProperty}`
	}
	if (typeof (sourceName) !== "undefined" && typeof (sourceValue) !== "undefined") {
		output += ` SRC:${sourceName}=${sourceValue}`
	}
	if (typeof (dataName) !== "undefined" && typeof (dataValue) !== "undefined") {
		output += ` DATA:${dataName}=${dataValue}`
	}
	console.log(output)
}