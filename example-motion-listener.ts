// This script demonstrates how to listen for motion events from an ONVIF camera.
// It uses the 'onvif/promises' library to connect to the camera and subscribe to events.
// The script will print out any motion events that are detected by the camera.

import { MotionEventListener } from './motion-listener';

let HOSTNAME: string = '192.168.8.21',
    PORT: number = 2020,
    USERNAME: string = 'tpuser',
    PASSWORD: string = 'tppass';

const EventMethodTypes = { PULL: "pull", SUBSCRIBE: "subscribe" }
let EVENT_MODE: string = EventMethodTypes.PULL;

import { Cam } from 'onvif/promises';
let cam_obj: any = null;


// Main function to connect to the camera and start listening for events.
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

main();