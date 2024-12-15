let HOSTNAME: string = '192.168.8.21',
	PORT: number = 2020,
	USERNAME: string = 'tpuser',
	PASSWORD: string = 'tppass';

const EventMethodTypes = { PULL: "pull", SUBSCRIBE: "subscribe" }
let EVENT_MODE: string = EventMethodTypes.PULL;

import { Cam } from 'onvif';
let cam_obj: any = null;
let flow = require('nimble');

interface DeviceInfo {
	manufacturer: string;
	model: string;
	firmwareVersion: string;
	serialNumber: string;
}

interface SimpleItem {
	$: {
		Name: string;
		Value: string;
	}
}

interface EventMessage {
	topic: {
		_: string;
	};
	message: {
		message: {
			$: {
				UtcTime: string;
				PropertyOperation: string;
			};
			source?: {
				simpleItem?: SimpleItem | SimpleItem[];
			};
			data?: {
				simpleItem?: SimpleItem | SimpleItem[];
				elementItem?: any;
			}
		}
	}
}

interface EventTopic {
	topicSet: any;
}

new Cam({
	hostname: HOSTNAME,
	username: USERNAME,
	password: PASSWORD,
	port: PORT,
	timeout: 10000,
	preserveAddress: true
}, function CamFunc(err: any) {
	if (err) {
		console.log(err);
		return;
	}

	console.log('Connected to ONVIF Device');

	cam_obj = this;

	let hasEvents: boolean = false;
	let hasTopics: boolean = false;

	flow.series([
		function (callback: any) {
			cam_obj.getDeviceInformation(function (err: any, info: DeviceInfo, xml: any) {
				if (!err) { console.log('Manufacturer  ' + info.manufacturer); }
				if (!err) { console.log('Model         ' + info.model); }
				if (!err) { console.log('Firmware      ' + info.firmwareVersion); }
				if (!err) { console.log('Serial Number ' + info.serialNumber); }
				callback();
			});
		},
		function (callback: any) {
			cam_obj.getSystemDateAndTime(function (err: any, date: any, xml: any) {
				if (!err) { console.log('Device Time   ' + date); }
				callback();
			});
		},
		function (callback: any) {
			cam_obj.getCapabilities(function (err: any, data: any, xml: any) {
				if (err) {
					console.log(err);
				}
				if (data.events) hasEvents = true;
				callback();
			})
		},
		function (callback: any) {
			if (hasEvents) {
				cam_obj.getEventProperties(function (err: any, data: EventTopic, xml: any) {
					if (err) {
						console.log(err);
					} else {
						let parseNode = function (node: any, topicPath: string) {
							for (const child in node) {
								if (child == "$") { continue; } else if (child == "messageDescription") {
									let IsProperty: boolean = false;
									let source: string = '';
									let data: string = '';
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
		function (callback: any) {
			if (hasEvents && hasTopics && EVENT_MODE == EventMethodTypes.PULL) {
				cam_obj.on('event', (camMessage: EventMessage, xml: any) => {
					ReceivedEvent(camMessage, xml);
				})
			}
			callback()
		}
	]);
})

function stripNamespaces(topic: string): string {
	let output: string = '';
	let parts: string[] = topic.split('/')
	for (let index = 0; index < parts.length; index++) {
		let stringNoNamespace: string = parts[index].split(':').pop()
		if (output.length == 0) {
			output += stringNoNamespace
		} else {
			output += '/' + stringNoNamespace
		}
	}
	return output
}

function ReceivedEvent(camMessage: EventMessage, _xml: any) {
    let eventTopic: string = camMessage.topic._
	eventTopic = stripNamespaces(eventTopic)

    if (eventTopic.includes('Motion')) {
        let eventTime: string = camMessage.message.message.$.UtcTime;
        let eventProperty: string = camMessage.message.message.$.PropertyOperation
        let sourceName: string | null = null
        let sourceValue: string | null = null
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
                    let dataName: string = camMessage.message.message.data.simpleItem[x].$.Name
                    let dataValue: string = camMessage.message.message.data.simpleItem[x].$.Value
                    processEvent(eventTime, eventTopic, eventProperty, dataName, dataValue)
                }
            } else {
                let dataName: string = camMessage.message.message.data.simpleItem.$.Name
                let dataValue: string = camMessage.message.message.data.simpleItem.$.Value
                processEvent(eventTime, eventTopic, eventProperty, dataName, dataValue)
            }
        } else if (camMessage.message.message.data && camMessage.message.message.data.elementItem) {
            let dataName: string = 'elementItem'
            let dataValue: string = JSON.stringify(camMessage.message.message.data.elementItem)
            processEvent(eventTime, eventTopic, eventProperty, dataName, dataValue)
        } else {
            let dataName: string | null = null
            let dataValue: string | null = null
            processEvent(eventTime, eventTopic, eventProperty, dataName, dataValue)
        }
    }
}

function processEvent(eventTime: string, eventTopic: string, eventProperty: string, dataName: string | null, dataValue: string | null) {
	let output: string = '';
    const now: Date = new Date();
	output += `EVENT: ${now.toJSON()} ${eventTopic}`
	if (typeof (eventProperty) !== "undefined") {
		output += ` PROP:${eventProperty}`
	}
	if (typeof (dataName) !== "undefined" && typeof (dataValue) !== "undefined") {
		output += ` DATA:${dataName}=${dataValue}`
	}
	console.log(output)
}