import { Discovery } from 'onvif';

const username = process.env.USERNAME;
const password = process.env.PASSWORD;
const cameraHost = process.env.CAMERA_HOST;

console.log("Starting ONVIF discovery...");

Discovery.on('device', async (cam: any) => {
  console.log("Device found:", cam.hostname);
  // Set credentials to connect
  cam.username = username;
  cam.password = password;
  cam.hostname = cameraHost;
  try {
    await cam.connect();
    console.log("Connected to camera:", cam.hostname);
    cam.on('event', (event: any)=> console.log(JSON.stringify(event.message, null, '\t')));
    cam.on('eventsError', console.error);
    console.log(cam.username, cam.password);
    console.log((await cam.getStreamUri({protocol:'RTSP'})).uri);
    const date = await cam.getSystemDateAndTime();
    console.log(date);
    await cam.absoluteMove({
      x: Math.random() * 2 - 1,
      y: Math.random() * 2 - 1,
      zoom: Math.random()
    });
  } catch (error) {
    console.error("Error connecting to camera:", error);
  }
});

Discovery.on('error', (error: any) => {
  console.error("Discovery error:", error);
});

Discovery.probe();