import config from "./config";
import { Bot, InputFile } from "grammy";
import createLog from "adze";
import { MotionEventListener } from "./motion-listener";
import { VideoCapture } from "./video-capture";
import { existsSync, mkdirSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { FileState, GoogleAIFileManager } from "@google/generative-ai/server";

const log = new createLog();

log.info("Loaded config:", config);

const googleAI = new GoogleGenerativeAI(config.google.apiKey);
const fileManager = new GoogleAIFileManager(config.google.apiKey);

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

  const tmpDir = path.join(process.cwd(), 'tmp');
  if (!existsSync(tmpDir)) {
    mkdirSync(tmpDir);
  }

  config.cameras.forEach(async (camera, index) => {
    log.info(`Camera ${index + 1}:`, camera);

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

          log.info(`Uploading video for camera ${index + 1}`);

          const uploadResponse = await fileManager.uploadFile(
            outputVideoPath, {
            mimeType: "video/mp4",
            displayName: "Talky Pet Watcher Video",
          });


          console.log('File uploaded successfully:', uploadResponse);

          console.log(`Uploaded file ${uploadResponse.file.displayName} as: ${uploadResponse.file.uri}`);

          const name = uploadResponse.file.name;

          // Poll getFile() on a set interval (10 seconds here) to check file state.
          let file = await fileManager.getFile(name);
          while (file.state === FileState.PROCESSING) {
            await new Promise((resolve) => setTimeout(resolve, 100));
            // Fetch the file from the API again
            file = await fileManager.getFile(name);
          }

          if (file.state === FileState.FAILED) {
            throw new Error("Video processing failed.");
          }

          // When file.state is ACTIVE, the file is ready to be used for inference.
          log.info(`File ${file.displayName} is ready for inference as ${file.uri}`);

          // Choose a Gemini model.
          const model = googleAI.getGenerativeModel({
            model: "gemini-2.0-flash-exp",
          });

          const result = await model.generateContent([
            {
              fileData: {
                mimeType: uploadResponse.file.mimeType,
                fileUri: uploadResponse.file.uri
              }
            },
            { text: "Describe this video." },
          ]);

          // Handle the response of generated text
          const caption = result.response.text()

          log.info(`Recording stopped on camera ${index + 1}, uploading to telegram`);
          try {
            await bot.api.sendVideo(config.telegram.channelId, new InputFile(outputVideoPath), { caption: caption });
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
