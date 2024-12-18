import config from "./config";
import { Bot } from "grammy";

console.log("Loaded config:", config);

const bot = new Bot(config.telegram.botToken);

// TODO: Implement Telegram reporting
async function reportToTelegram(message: string) {
  console.log("Sending to telegram:", message);
  try {
    await bot.api.sendMessage(config.telegram.channelId, message);
  } catch (error) {
    console.error("Error sending telegram message:", error);
  }
}

async function main() {
  console.log("Starting Talky Pet Watcher");
  await reportToTelegram("Talky Pet Watcher started");

  config.cameras.forEach(async (camera, index) => {
    console.log(`Camera ${index + 1}:`, camera);
    await reportToTelegram(`Camera ${index + 1} online: ${camera.ip}`);
  });
}

main().catch(console.error);
