import { Cam } from 'onvif/promises';

const username = process.env.USERNAME;
const password = process.env.PASSWORD;
const cameraHost = process.env.CAMERA_HOST;

const cam = new Cam({username: username, password: password, hostname: cameraHost, port: 2020});

let previousIsMotion: boolean | null = null;

(async () => {
  await cam.connect();
  cam.on('event', (event: any) => {
    if (event.message && event.message.data && event.message.data.simpleItem) {
      const isMotionItem = Array.isArray(event.message.data.simpleItem) ? event.message.data.simpleItem.find((item: any) => item.$.Name === 'IsMotion') : event.message.data.simpleItem;
      if (isMotionItem) {
        const currentIsMotion = isMotionItem.$.Value === 'true';
        if (previousIsMotion !== null && previousIsMotion !== currentIsMotion) {
          console.log('IsMotion changed to:', currentIsMotion);
        }
        previousIsMotion = currentIsMotion;
      }
    }
  });
})().catch(console.error);