let HOSTNAME: string = '192.168.8.21',
	PORT: number = 2020,
	USERNAME: string = 'tpuser',
	PASSWORD: string = 'tppass';

const EventMethodTypes = { PULL: "pull", SUBSCRIBE: "subscribe" }
let EVENT_MODE: string = EventMethodTypes.PULL;

import { Cam } from 'onvif/promises';
let cam_obj: any = null;

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

class MotionEventListener {
    private callback: (event: string) => void;

    constructor(callback: (event: string) => void) {
        this.callback = callback;
    }

    public async startListening(cam: any) {
        cam.on('event', (camMessage: EventMessage, xml: any) => {
            this.handleEvent(camMessage, xml);
        });
    }

    private handleEvent(camMessage: EventMessage, _xml: any) {
        let eventTopic: string = camMessage.topic._
        eventTopic = stripNamespaces(eventTopic)

        if (eventTopic.includes('Motion')) {
            let eventTime: string = camMessage.message.message.$.UtcTime;
            let eventProperty: string = camMessage.message.message.$.PropertyOperation

            const { sourceName, sourceValue } = processSource(camMessage);
            this.processData(camMessage, eventTime, eventTopic, eventProperty);
        }
    }

    private processData(camMessage: EventMessage, eventTime: string, eventTopic: string, eventProperty: string) {
        // Check if data and simpleItem exist
        if (camMessage.message.message.data && camMessage.message.message.data.simpleItem) {
            // Handle array or single item
            if (Array.isArray(camMessage.message.message.data.simpleItem)) {
                for (let x = 0; x < camMessage.message.message.data.simpleItem.length; x++) {
                    let dataName: string = camMessage.message.message.data.simpleItem[x].$.Name;
                    let dataValue: string = camMessage.message.message.data.simpleItem[x].$.Value;
                    this.processEvent(eventTime, eventTopic, eventProperty, dataName, dataValue);
                }
            } else {
                let dataName: string = camMessage.message.message.data.simpleItem.$.Name;
                let dataValue: string = camMessage.message.message.data.simpleItem.$.Value;
                this.processEvent(eventTime, eventTopic, eventProperty, dataName, dataValue);
            }
        } else if (camMessage.message.message.data && camMessage.message.message.data.elementItem) {
            // Handle elementItem
            let dataName: string = 'elementItem';
            let dataValue: string = JSON.stringify(camMessage.message.message.data.elementItem);
            this.processEvent(eventTime, eventTopic, eventProperty, dataName, dataValue);
        } else {
            // Handle no data
            let dataName: string | null = null;
            let dataValue: string | null = null;
            this.processEvent(eventTime, eventTopic, eventProperty, dataName, dataValue);
        }
    }

    private processEvent(eventTime: string, eventTopic: string, eventProperty: string, dataName: string | null, dataValue: string | null) {
        let output: string = '';
        const now: Date = new Date();
        output += `EVENT: ${now.toJSON()} ${eventTopic}`
        if (typeof (eventProperty) !== "undefined") {
            output += ` PROP:${eventProperty}`
        }
        if (typeof (dataName) !== "undefined" && typeof (dataValue) !== "undefined") {
            output += ` DATA:${dataName}=${dataValue}`
        }
        this.callback(output);
    }
}


async function main() {
    cam_obj = new Cam({
        hostname: HOSTNAME,
        username: USERNAME,
        password: PASSWORD,
        port: PORT,
        timeout: 10000,
        preserveAddress: true
    });

    try {
        await cam_obj.connect();

        console.log('Connected to ONVIF Device');

        const info = await cam_obj.getDeviceInformation();
        console.log('Manufacturer  ' + info.manufacturer);
        console.log('Model         ' + info.model);
        console.log('Firmware      ' + info.firmwareVersion);
        console.log('Serial Number ' + info.serialNumber);

        const date = await cam_obj.getSystemDateAndTime();
        console.log('Device Time   ' + date);

        const capabilities = await cam_obj.getCapabilities();
        let hasEvents: boolean = !!capabilities.events;

        let hasTopics: boolean = false;
        if (hasEvents) {
            const eventTopic = await cam_obj.getEventProperties();

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
            parseNode(eventTopic.topicSet, '')
        }
        console.log('');
        console.log('');

        if (hasEvents && hasTopics && EVENT_MODE == EventMethodTypes.PULL) {
            const listener = new MotionEventListener((event) => {
                console.log(event);
            });
            await listener.startListening(cam_obj);
        }


    } catch (error) {
        console.error(error);
    }
}

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

function processSource(camMessage: EventMessage): { sourceName: string | null, sourceValue: string | null } {
	let sourceName: string | null = null;
	let sourceValue: string | null = null;

	// Check if source and simpleItem exist
	if (camMessage.message.message.source && camMessage.message.message.source.simpleItem) {
		// Handle array or single item
		if (Array.isArray(camMessage.message.message.source.simpleItem)) {
			sourceName = camMessage.message.message.source.simpleItem[0].$.Name;
			sourceValue = camMessage.message.message.source.simpleItem[0].$.Value;
		} else {
			sourceName = camMessage.message.message.source.simpleItem.$.Name;
			sourceValue = camMessage.message.message.source.simpleItem.$.Value;
		}
	}

	return { sourceName, sourceValue };
}

main();