import config from "./config";
import { Bot } from "grammy";
import createLog from "adze";
import { MotionEventListener } from "./motion-listener";

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

  config.cameras.forEach(async (camera, index) => {
    log.info(`Camera ${index + 1}:`, camera);
    await reportToTelegram(`Camera ${index + 1} online: ${camera.ip}`);

    const motionListener = new MotionEventListener(
      camera.ip,
      camera.port,
      camera.username,
      camera.password,
      (event) => reportToTelegram(`Camera ${index + 1}: ${event}`),
      (message) => log.info(`Motion Listener ${index + 1}:`, message)
    );
    motionListener.startListening().catch(log.error);
  });
}

main().catch(log.error);
