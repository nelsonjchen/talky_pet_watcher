import { createCameraClipObservable } from '../camera-clip';

const hostname = '192.168.8.21';
const port = 2020;
const username = 'tpuser';
const password = 'tppass';
const outputDir = 'tmp'

const clipObservable = createCameraClipObservable(
  hostname, port, username, password, outputDir
);

clipObservable.subscribe({
    next: (clip) => {
        console.log('New clip recorded:', clip);
    },
    error: (err) => {
        console.error('Error recording clip:', err);
    },
    complete: () => {
        console.log('Clip recording completed');
    }
});