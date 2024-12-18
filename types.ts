interface CameraConfig {
  ip: string;
  user: string;
  password: string;
  port: number;
}

interface TelegramConfig {
  botToken: string;
  channelId: string;
}

export interface Config {
  cameras: CameraConfig[];
  telegram: TelegramConfig;
}

export type { Config as default};