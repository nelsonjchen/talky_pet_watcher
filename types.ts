interface CameraConfig {
  ip: string;
  username: string;
  password: string;
  port: number;
}

interface TelegramConfig {
  botToken: string;
  channelId: string;
}

interface GoogleAiConfig {
  apiKey: string;
}

export interface MotionOutput {
    hostname: string;
    timestamp: string;
    eventTopic: string;
    eventProperty?: string;
    dataName?: string | null;
    dataValue?: string | boolean | null;
}

export interface Config {
  cameras: CameraConfig[];
  telegram: TelegramConfig;
  google: GoogleAiConfig;
}

interface ReadableStream<R = any> {
  [Symbol.asyncIterator](): AsyncIterableIterator<R>;
}

export type { Config as default};