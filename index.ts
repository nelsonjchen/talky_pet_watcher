import config from "./config";
import type { Config } from "./types";

console.log("Loaded config:", config);

// TODO: Implement Telegram reporting
function reportToTelegram(message: string) {
  console.log("Sending to telegram:", message);
  // Placeholder for telegram implementation
}

function main() {
  console.log("Starting Talky Pet Watcher");
  reportToTelegram("Talky Pet Watcher started");

  config.cameras.forEach((camera, index) => {
    console.log(`Camera ${index + 1}:`, camera);
    reportToTelegram(`Camera ${index + 1} online: ${camera.ip}`);
  });
}

main();
