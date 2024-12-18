import { VideoCapture } from "./video-capture";

const rtspStream = process.env.RTSP_STREAM || "rtsp://tpuser:tppass@192.168.8.21/stream1";
const outputFile = process.env.OUTPUT_FILE || "output.mp4";

const videoCapture = new VideoCapture({ input: rtspStream, output: outputFile });

async function main() {
  console.log("Starting video capture...");
  await videoCapture.start();

  // Keep recording for 10 seconds, then stop
  setTimeout(async () => {
    console.log("Stopping video capture...");
    await videoCapture.stop();
    console.log("Video capture stopped.");
  }, 10000);
}

main();