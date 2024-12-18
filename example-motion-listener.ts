// This script demonstrates how to listen for motion events from an ONVIF camera.
// It uses the 'motion-listener' module to connect to the camera and subscribe to events.
// The script will print out any motion events that are detected by the camera.
// This script uses bun to run.

import { MotionEventListener } from './motion-listener';
import adze from 'adze';

let HOSTNAME: string = '192.168.8.21',
    PORT: number = 2020,
    USERNAME: string = 'tpuser',
    PASSWORD: string = 'tppass';


// Main function to connect to the camera and start listening for events.
async function main() {
    try {
        const logger = new adze().ns('motion-listener');
        const listener = new MotionEventListener(HOSTNAME, PORT, USERNAME, PASSWORD, (event) => {
            logger.log(event);
        });

        logger.log('Starting motion listener');
        await listener.startListening();

        setTimeout(() => {
            logger.log('Stopping motion listener');
            listener.stopListening();
        }, 300000);


    } catch (error) {
        new adze().ns('motion-listener').error(error);
    }
}

main();
