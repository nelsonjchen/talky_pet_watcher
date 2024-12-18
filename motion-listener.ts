// motion-listener/index.ts

import { stripNamespaces, processSource } from './utils';
import { Cam } from 'onvif/promises';

interface SimpleItem {
    $: {
        Name: string;
        Value: string | boolean;
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

// MotionEventListener class is responsible for listening to motion events from the camera and invoking a callback with the event details.
export class MotionEventListener {
    private callback: (event: string) => void;
    private hostname: string;
    private port: number;
    private username: string;
    private password: string;
    private cam: any;
    private isListening: boolean = false;
    private retryDelay: number = 5000; // 5 seconds
    private livelinessInterval: any;
    private livelinessCheckInterval: number = 10000; // 10 seconds
    private currentMotionState: boolean | null = null;
    private reconnectDelay: number = 10000; // 10 seconds
    private logCallback: ((message: string) => void) | undefined;
    private debug: boolean;

    // Constructor for the MotionEventListener class. Takes a callback function that will be invoked when a motion event is detected.
    constructor(hostname: string, port: number, username: string, password: string, callback: (event: string) => void, logCallback?: (message: string) => void, debug: boolean = false) {
        this.callback = callback;
        this.hostname = hostname;
        this.port = port;
        this.username = username;
        this.password = password;
        this.logCallback = logCallback;
        this.debug = debug;
    }

    // Starts listening for events from the camera. Attaches an event listener to the camera object.
    public async startListening() {
        this.isListening = true;
        while (this.isListening) {
            try {
                if (this.cam) {
                    this.cam.removeAllListeners('event');
                    this.cam = null;
                }
                this.cam = new Cam({
                    hostname: this.hostname,
                    username: this.username,
                    password: this.password,
                    port: this.port,
                    timeout: 10000,
                    preserveAddress: true
                });
                await this.cam.connect();
                this.cam.on('event', async (camMessage: EventMessage, xml: any) => {
                    try {
                        this.handleEvent(camMessage, xml);
                    } catch (error) {
                        this.log('Error handling event:' + error);
                        this.log('Attempting to reconnect after event error');
                        if (this.cam) {
                            this.cam.removeAllListeners('event');
                        }
                        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
                        await new Promise(resolve => setTimeout(resolve, this.reconnectDelay));
                        return;
                    }
                });
                this.log('Motion listener connected');

                break; // Exit the loop after successful connection
            } catch (error) {
                this.log('Motion listener connection error:' + error);
                // Wait before retrying
                await new Promise(resolve => setTimeout(resolve, this.retryDelay));
            }
        }
        this.startLivelinessCheck();
    }

    private startLivelinessCheck() {
        this.livelinessInterval = setInterval(async () => {
            if (!this.cam) {
                return;
            }
            try {
                this.log('Performing liveliness check...');
                await this.cam.getSystemDateAndTime();
                this.log('Liveliness check successful.');
            } catch (error) {
                this.log('Liveliness check failed:' + error);
                this.log('Attempting to reconnect after liveliness check failure');
                if (this.cam) {
                    this.cam.removeAllListeners('event');
                }
                this.cam = null;
                await new Promise(resolve => setTimeout(resolve, this.reconnectDelay));
            }
        }, this.livelinessCheckInterval);
    }

    public stopListening() {
        this.isListening = false;
        if (this.cam) {
            this.cam.removeAllListeners('event');
            this.cam = null;
        }
        if (this.livelinessInterval) {
            clearInterval(this.livelinessInterval);
            this.livelinessInterval = null;
        }
        this.log('Motion listener stopped');
    }

    private log(message: string) {
        const logMessage = `[${this.hostname}] ${message}`;
        if (this.logCallback) {
            this.logCallback(logMessage);
        } else {
            console.log(logMessage);
        }
    }

    // Handles the event message received from the camera. Extracts the event topic and calls processData if it's a motion event.
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

    // Processes the data part of the event message. Extracts data from simpleItem or elementItem and calls processEvent.
    private processData(camMessage: EventMessage, eventTime: string, eventTopic: string, eventProperty: string) {
        // Check if data and simpleItem exist
        if (this.debug) {
            this.log(`Motion data: ${JSON.stringify(camMessage, null, 2)}`);
        }
        if (camMessage.message.message.data && camMessage.message.message.data.simpleItem) {
            // Handle array or single item
            if (Array.isArray(camMessage.message.message.data.simpleItem)) {
                for (let x = 0; x < camMessage.message.message.data.simpleItem.length; x++) {
                    let dataName: string = camMessage.message.message.data.simpleItem[x].$.Name;
                    let dataValue: string | boolean = camMessage.message.message.data.simpleItem[x].$.Value;
                    this.processEvent(eventTime, eventTopic, eventProperty, dataName, dataValue);
                }
            } else {
                let dataName: string = camMessage.message.message.data.simpleItem.$.Name;
                let dataValue: string | boolean = camMessage.message.message.data.simpleItem.$.Value;
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
    // Processes a single event and calls the callback function. Formats the event information and invokes the callback.
    private processEvent(eventTime: string, eventTopic: string, eventProperty: string, dataName: string | null, dataValue: string | boolean | null) {
        let output: string = `[${this.hostname}] `;
        const now: Date = new Date();
        let isMotion = dataName === 'IsMotion' && dataValue === true;
        if (dataName === 'IsMotion' && this.currentMotionState !== isMotion) {
            this.currentMotionState = isMotion;
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
}

// motion-listener/utils.ts

// Removes namespaces from the topic string. This function splits the topic string by '/', then removes any namespace prefixes (e.g., 'ns1:') from each part, and returns the stripped topic string.
function stripNamespaces(topic: string): string {
  let output: string = '';
  let parts: string[] = topic.split('/')
  for (let index = 0; index < parts.length; index++) {
    const popped = parts[index].split(':').pop()
    let stringNoNamespace: string = popped !== undefined ? popped : ''
    if (output.length == 0) {
      output += stringNoNamespace
    } else {
      output += '/' + stringNoNamespace
    }
  }
  return output
}

// Processes the source part of the event message. Extracts the source name and value from the simpleItem within the source, if it exists.
function processSource(camMessage: any): { sourceName: string | null, sourceValue: string | null } {
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
