import { spawn } from "bun";
import { type Subprocess } from "bun";

interface Options {
  input: string;
  output: string;
  logger?: (message: string) => void;
}

export class VideoCapture {
  private ffmpegProcess: Subprocess<"ignore", "pipe", "pipe"> | null = null;
  private options: Options;

  constructor(options: Options) {
    this.options = options;
    if (this.options.logger) {
      this.options.logger("VideoCapture initialized with options:");
    }
  }

  public isRecording(): boolean {
    return this.ffmpegProcess !== null;
  }

  public async start(): Promise<void> {
    if (this.options.logger) {
      this.options.logger("Starting video capture...");
    }
    // Wait until the previous recording is stopped
    while (this.ffmpegProcess) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    const ffmpegProcess = spawn([
      "ffmpeg",
      "-y",
      "-t",
      // Limit it to 20 seconds
      "20",
      "-i",
      this.options.input,
      "-c:v",
      "copy",
      "-f",
      "mp4",
      this.options.output,
    ], {
      stdout: "pipe",
      stderr: "pipe",
    });

    if (this.options.logger) {
      const logger = this.options.logger;
      const read = async () => {
        for await (const chunk of ffmpegProcess.stderr) {
          const text = new TextDecoder().decode(chunk)
          logger(text);
        }
      };
      read();
    }
    this.ffmpegProcess = ffmpegProcess;

  }

  public async stop(): Promise<void> {
    if (this.options.logger) {
      this.options.logger("Stopping video capture...");
    }
    if (!this.ffmpegProcess) {
      return;
    }

    this.ffmpegProcess.kill();
    // Wait until the process is actually killed
    // Check if the process is killed every 100ms
    while (!this.ffmpegProcess.killed) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    this.ffmpegProcess = null;
    if (this.options.logger) {
      this.options.logger("Video capture stopped.");
    }
  }
}