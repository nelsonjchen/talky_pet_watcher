import { VideoCapture } from "../video-capture";
import createLog from "adze";

const rtspStream = process.env.RTSP_STREAM || "rtsp://tpuser:tppass@192.168.8.21/stream1";
const outputFile = process.env.OUTPUT_FILE || "output.mp4";

const logger = new createLog();
const videoCapture = new VideoCapture({
  input: rtspStream,
  output: outputFile,
  logger: logger,
});

async function main() {
  logger.log("Starting video capture...");
  await videoCapture.start();

  // Keep recording for 10 seconds, then stop
  setTimeout(async () => {
    logger.log("Stopping video capture...");
    await videoCapture.stop();
    logger.log("Video capture stopped.");
  }, 10000);
}

main();