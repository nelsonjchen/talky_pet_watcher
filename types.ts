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

export interface Config {
  cameras: CameraConfig[];
  telegram: TelegramConfig;
  google: GoogleAiConfig;
}

export type { Config as default};