import type Config from './types.ts';

const config: Config = {
  cameras: [
    {
      ip: "192.168.8.21",
      user: "admin",
      password: "password123",
      port: 2020
    },
  ],
  telegram: {
    botToken: "your_telegram_bot_token",
    channelId: "-100123456789",
  },
};

export default config;