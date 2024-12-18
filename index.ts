import config from "./config";
import { Bot, InputFile } from "grammy";
import createLog from "adze";
import { MotionEventListener } from "./motion-listener";
import { VideoCapture } from "./video-capture";
import { existsSync, mkdirSync, unlinkSync } from 'node:fs';
import path from 'node:path';

const log = new createLog();

log.info("Loaded config:", config);

const bot = new Bot(config.telegram.botToken);

async function reportToTelegram(message: string) {
  log.info("Sending to telegram:", message);
  try {
    await bot.api.sendMessage(config.telegram.channelId, message);
  } catch (error) {
    log.error("Error sending telegram message:", error);
  }
}

async function main() {
  log.info("Starting Talky Pet Watcher");
  await reportToTelegram("Talky Pet Watcher started");

  const tmpDir = path.join(process.cwd(), 'tmp');
  if (!existsSync(tmpDir)) {
    mkdirSync(tmpDir);
  }

  config.cameras.forEach(async (camera, index) => {
    log.info(`Camera ${index + 1}:`, camera);
    await reportToTelegram(`Camera ${index + 1} online: ${camera.ip}`);

    const outputVideoPath = path.join(tmpDir, `camera-${index + 1}-${Date.now()}.mp4`);
    const videoCapture = new VideoCapture({
      input: `rtsp://${camera.username}:${camera.password}@${camera.ip}/stream1`,
      output: outputVideoPath,
    });

    const motionListener = new MotionEventListener(
      camera.ip,
      camera.port,
      camera.username,
      camera.password,
      async (event) => {
        await reportToTelegram(`Camera ${index + 1}: ${event}`);
        log.info(`Motion detected on camera ${index + 1}, starting recording`);
        await videoCapture.start();
        setTimeout(async () => {
          log.info(`Stopping recording on camera ${index + 1}`);
          await videoCapture.stop();
          log.info(`Recording stopped on camera ${index + 1}, uploading to telegram`);
          try {
            await bot.api.sendVideo(config.telegram.channelId, new InputFile(outputVideoPath));
            log.info(`Video uploaded to telegram for camera ${index + 1}`);
            unlinkSync(outputVideoPath);
            log.info(`Video deleted for camera ${index + 1}`);
          } catch (error) {
            log.error(`Error uploading or deleting video for camera ${index + 1}:`, error);
          }
          log.info(`Video uploaded and deleted for camera ${index + 1}`);
        }, 10000);
      },
      (message) => log.info(`Motion Listener ${index + 1}:`, message)
    );
    motionListener.startListening().catch(log.error);
  });
}

main().catch(log.error);
