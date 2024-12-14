import { Cam } from 'onvif/promises';

const username = process.env.USERNAME;
const password = process.env.PASSWORD;
const cameraHost = process.env.CAMERA_HOST;

const cam = new Cam({username: username, password: password, hostname: cameraHost, port: 2020});

(async () => {
  await cam.connect();
  cam.on('event', (event: any) => {
    console.log('Event:', event.message.topic, event.message);
  });
})().catch(console.error);