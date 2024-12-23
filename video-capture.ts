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
      "-t",
      // Limit it to 20 seconds
      "20",
      "-i",
      this.options.input,
      "-c:v",
      "copy",
      "-c:a",
      "aac",
      this.options.output,
      "-y",
    ], {
      stdout: "pipe",
      stderr: "pipe",
    });

    if (this.options.logger) {
      if (this.ffmpegProcess.stdout && !(typeof this.ffmpegProcess.stdout === 'number')) {
        const reader = this.ffmpegProcess.stdout.getReader();
        const decoder = new TextDecoder();
        const read = async () => {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            this.options.logger.log(decoder.decode(value));
          }
        };
        read();
        this.ffmpegProcess.exited.then(() => {
          reader.releaseLock();
        });
      }
      if (this.ffmpegProcess.stderr && !(typeof this.ffmpegProcess.stderr === 'number')) {
        const reader = this.ffmpegProcess.stderr.getReader();
        const decoder = new TextDecoder();
        const read = async () => {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            this.options.logger.log(decoder.decode(value));
          }
        };
        read();
        this.ffmpegProcess.exited.then(() => {
          reader.releaseLock();
        });
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