import config from "./config";
import { Bot, InputMediaBuilder } from "grammy";
import createLog from "adze";
import { existsSync, mkdirSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import { GoogleGenerativeAI, SchemaType, type GenerateContentRequest, type Part } from "@google/generative-ai";
import { FileState, GoogleAIFileManager } from "@google/generative-ai/server";
import { type Clip, createCameraClipObservable } from './camera-clip';
import { filter, bufferTime } from 'rxjs/operators';
import { merge } from "rxjs";

const log = new createLog();

log.info("Loaded config:", config);

const googleAI = new GoogleGenerativeAI(config.google.apiKey);
const fileManager = new GoogleAIFileManager(config.google.apiKey);

const bot = new Bot(config.telegram.botToken);

async function main() {
  log.info("Starting Talky Pet Watcher");

  const tmpDir = path.join(process.cwd(), 'tmp');
  if (!existsSync(tmpDir)) {
    mkdirSync(tmpDir);
  }

  let cameraObservables = config.cameras.map((camera, index) => {
    log.info(`Camera ${index + 1}:`, camera);

    return createCameraClipObservable(
      camera.ip,
      camera.port,
      camera.username,
      camera.password,
      tmpDir
    );
  });

  // Merge all camera observables into a single observable with merge
  const mergedCameraObservable = merge(...cameraObservables);
  // Filter out clips that are less than 7 seconds
  const filteredMergedCameraObservable = mergedCameraObservable.pipe(filter((clip: Clip) => {
    const isClipValid = clip.estimatedDuration > 4;
    if (!isClipValid) {
      log.info(`Filtered out clip with duration ${clip.estimatedDuration} seconds`);
    }
    return isClipValid;
  }));
  // Buffer the clips for 30 seconds so we can process them in batches
  const bufferedMerrgedCameraObservable = filteredMergedCameraObservable.pipe(bufferTime(30000));


  bufferedMerrgedCameraObservable.subscribe(async (clips) => {
    if (clips.length === 0) {
      log.info("No clips to process");
      return;
    }

    log.info(`Processing ${clips.length} clips`);

    // Upload all clips to Google AI

    const googleVideoClips = (await Promise.all(
      clips.map(async (clip, index) => {
        const outputVideoPath = path.join(tmpDir, clip.filename);
        log.info(`Uploading {clip.filename} to Google AI`);
        const uploadResponse = await fileManager.uploadFile(
          outputVideoPath, {
          mimeType: "video/mp4",
          displayName: `video-${index}.mp4`,
        });
        log.info(`Uploaded ${clip.filename} to Google AI`);
        const name = uploadResponse.file.name;

        // Poll getFile() on a set interval (10 seconds here) to check file state.
        let file = await fileManager.getFile(name);
        while (file.state === FileState.PROCESSING) {
          await new Promise((resolve) => setTimeout(resolve, 100));
          // Fetch the file from the API again
          file = await fileManager.getFile(name);
        }

        if (file.state === FileState.FAILED) {
          log.error(`File ${file.displayName} failed to process`);
          return;
        }

        // When file.state is ACTIVE, the file is ready to be used for inference.
        log.info(`File ${file.displayName} is ready for inference as ${file.uri}`);
        return file;
      })
    )).filter((file) => file !== undefined);

    const schema = {
      description: "Schema for relevant clips and their caption",
      type: SchemaType.OBJECT,
      properties: {
        relevantClips: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.NUMBER,
          },
          description: "Indices of relevant clips",
          nullable: false,
        },
        caption: {
          type: SchemaType.STRING,
          description: "Caption for the relevant clips",
          nullable: false,
        },
      },
      required: ["relevantClips", "caption"],
    };

    // Choose a Gemini model.
    const model = googleAI.getGenerativeModel({
      model: "gemini-2.0-flash-exp",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: schema,
      },
      systemInstruction: "You are a pet owner of a cat named Clover who wants to share a video of her with friends. You have a collection of video clips and want to generate a caption for them. Some of the clips are relevant to the caption, while others are not. You want to generate a caption that describes the relevant clips. And you also want to identify the relevant clips for sharing. Generate JSON output with the relevant clips and the caption.",
    });

    const modelInput: GenerateContentRequest | string | Array<string | Part> = [];
    googleVideoClips.forEach((clip) => {
      modelInput.push({
        fileData: {
          mimeType: clip.mimeType,
          fileUri: clip.uri,
        },
      });
    });

    modelInput.push(
      { text: "Identify relevant clips and generate a caption less than 100 words. Be sure to use a lot of emojis!" },
    );

    const result = await model.generateContent(
      modelInput
    );

    // Handle the response of generated text
    const responseText = result.response.text();

    // Try to parse the response as JSON
    let responseJson: {
      relevantClips: number[];
      caption: string;
    };
    try {
      responseJson = JSON.parse(responseText);
    } catch (error) {
      log.error("Error parsing response as JSON:", error);
      return;
    }

    log.info("Response JSON:", responseJson);

    const caption = responseJson.caption;
    log.info("Caption:", caption);

    // Only pick out the relevant clips. Look them up from the clips array.
    let relevantClips: Clip[] = [];
    try {
      relevantClips = responseJson.relevantClips.map((index) => clips[index]);
    } catch (error) {
      log.error("Error getting relevant clips:", error);
      return;
    }

    log.info("Relevant clips:", relevantClips);


    const telegramClips = relevantClips.map((clip, index) => {
      const outputVideoPath = path.join(tmpDir, clip.filename);
      // For the first clip, send as a video message with the caption
      if (index === 0) {
        return InputMediaBuilder.video(outputVideoPath, {
          caption: caption,
        });
      }
      return InputMediaBuilder.video(outputVideoPath);
    });

    try {
      await bot.api.sendMediaGroup(
        config.telegram.channelId, telegramClips,
      );
      log.info(`Video uploaded to telegram`);
    } catch (error) {
      log.error(`Error uploading`, error);
    }
    log.info(`Video uploaded`);

    // Clean up the files
    try {
      clips.forEach((clip) => {
        const outputVideoPath = path.join(tmpDir, clip.filename);
        unlinkSync(outputVideoPath);
      });
    } catch (error) {
      log.error("Error cleaning up files:", error);
    }
  });
};

main().catch(log.error);
