import { spawn } from 'bun';
import { type Subprocess } from 'bun';

interface Options {
  input: string;
  output: string;
}

export class VideoCapture {
  private ffmpegProcess: Subprocess | null = null;
  private options: Options;

  constructor(options: Options) {
    this.options = options;
  }

  public isRecording(): boolean {
    return this.ffmpegProcess !== null;
  }

  public async start(): Promise<void> {
    if (this.ffmpegProcess) {
      throw new Error("Recording already in progress");
    }

    this.ffmpegProcess = spawn([
      "ffmpeg",
      "-i",
      this.options.input,
      "-c:v",
      "copy",
      "-c:a",
      "aac",
      this.options.output,
      "-y",
    ]);
  }

  public async stop(): Promise<void> {
    if (!this.ffmpegProcess) {
      throw new Error("No recording in progress");
    }

    this.ffmpegProcess.kill();
    // Wait until the process is actually killed
    // Check if the process is killed every 100ms
    while (!this.ffmpegProcess.killed) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    this.ffmpegProcess = null;
  }
}