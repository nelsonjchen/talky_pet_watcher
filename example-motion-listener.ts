// This script demonstrates how to listen for motion events from an ONVIF camera.
// It uses the 'motion-listener' module to connect to the camera and subscribe to events.
// The script will print out any motion events that are detected by the camera.
// This script uses bun to run.

import { MotionEventListener } from './motion-listener';

let HOSTNAME: string = '192.168.8.21',
    PORT: number = 2020,
    USERNAME: string = 'tpuser',
    PASSWORD: string = 'tppass';


// Main function to connect to the camera and start listening for events.
async function main() {
    try {
        const listener = new MotionEventListener(HOSTNAME, PORT, USERNAME, PASSWORD, (event) => {
            console.log(event);
        });

        console.log('Starting motion listener');
        await listener.startListening();


    } catch (error) {
        console.error(error);
    }
}

main();