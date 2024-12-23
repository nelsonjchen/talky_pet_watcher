import { spawn } from "bun";
import { type Subprocess } from "bun";

interface Options {
  input: string;
  output: string;
  logger?: any;
}

export class VideoCapture {
  private ffmpegProcess: Subprocess | null = null;
  private options: Options;

  constructor(options: Options) {
    this.options = options;
    if (this.options.logger) {
      this.options.logger.log("VideoCapture initialized with options:", options);
    }
  }

  public isRecording(): boolean {
    return this.ffmpegProcess !== null;
  }

  public async start(): Promise<void> {
    if (this.options.logger) {
      this.options.logger.log("Starting video capture...");
    }
    // Wait until the previous recording is stopped
    while (this.ffmpegProcess) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    this.ffmpegProcess = spawn([
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
      if (this.ffmpegProcess.stderr && !(typeof this.ffmpegProcess.stderr === 'number')) {
        const stderr = this.ffmpegProcess.stderr;
        const read = async () => {
          for await (const chunk of stderr) {
            console.log(new TextDecoder().decode(chunk));
          }
        };
        read();
      }
    }
  }

  public async stop(): Promise<void> {
    if (this.options.logger) {
      this.options.logger.log("Stopping video capture...");
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
      this.options.logger.log("Video capture stopped.");
    }
  }
}