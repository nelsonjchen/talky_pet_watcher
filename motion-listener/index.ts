// motion-listener/index.ts

import { stripNamespaces, processSource } from './utils';

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

// MotionEventListener class is responsible for listening to motion events from the camera.
export class MotionEventListener {
    private callback: (event: string) => void;

    // Constructor for the MotionEventListener class.
    constructor(callback: (event: string) => void) {
        this.callback = callback;
    }

    // Starts listening for events from the camera.
    public async startListening(cam: any) {
        cam.on('event', (camMessage: EventMessage, xml: any) => {
            this.handleEvent(camMessage, xml);
        });
    }

    // Handles the event message received from the camera.
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

    // Processes the data part of the event message.
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

    // Processes a single event and calls the callback function.
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