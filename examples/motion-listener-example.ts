// This script demonstrates how to listen for motion events from an ONVIF camera.
// It uses the 'motion-listener' module to connect to the camera and subscribe to events.
// The script will print out any motion events that are detected by the camera.
// This script uses bun to run.

import { MotionEventListener } from '../motion-listener';
import type { MotionOutput } from '../types';
import adze from 'adze';

let HOSTNAME: string = '192.168.8.21',
    PORT: number = 2020,
    USERNAME: string = 'tpuser',
    PASSWORD: string = 'tppass';

// Main function to connect to the camera and start listening for events.
async function main() {
    const logger = new adze();
    try {
        logger.log('Creating MotionEventListener');
        const listener = new MotionEventListener(HOSTNAME, PORT, USERNAME, PASSWORD, (event: MotionOutput) => {
            logger.log('Event received:', event);
        }, (logMessage: string) => {
            logger.log('MotionEventListener log:', logMessage);
        }, false);

        logger.log('Starting motion listener');
        await listener.startListening();

        setTimeout(() => {
            logger.log('Stopping motion listener');
            listener.stopListening();
        }, 300000);

    } catch (error) {
        logger.error('Error in main:', error);
    }
}

main();