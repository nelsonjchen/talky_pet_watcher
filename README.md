# Talky Pet Watcher

## Project Statement

Talky Pet Watcher is a tool to watch a series of ONVIF webcams and their streams. Upon motion, it starts gathering video, and submits it in 30 second intervals to AI such as Google Flash AI for summarizing and reporting. This report is then delivered to a Telegram Channel! :)

## Features

*   Monitors multiple ONVIF webcams.
*   Detects motion and records video.
*   Submits video to AI for summarization.
*   Delivers reports to a Telegram channel.

## Installation

To install and run this project, you will need to have Bun installed. You can find installation instructions at [https://bun.sh/](https://bun.sh/).

1.  Clone the repository:

    ```bash
    git clone https://github.com/your-username/talky-pet-watcher.git
    ```
2.  Navigate to the project directory:

    ```bash
    cd talky-pet-watcher
    ```
3.  Install dependencies:

    ```bash
    bun install
    ```
    This will install all the necessary packages listed in the `package.json` file.

## Usage

1.  **Configuration:**
    Before running the application, you need to configure the ONVIF webcams and Telegram channel. This involves setting up the necessary credentials and connection details.
    *   **ONVIF Webcams:** You will need the IP address, username, and password for each ONVIF camera you want to monitor.
    *   **Telegram Channel:** You will need to create a Telegram bot and obtain its API token. You will also need the chat ID of the Telegram channel where you want to receive reports.
    These configuration details should be placed in a `.env` file in the root of the project directory. Example:
    ```
    ONVIF_CAMERA_1_IP=192.168.1.100
    ONVIF_CAMERA_1_USER=admin
    ONVIF_CAMERA_1_PASSWORD=password123
    ONVIF_CAMERA_2_IP=192.168.1.101
    ONVIF_CAMERA_2_USER=admin
    ONVIF_CAMERA_2_PASSWORD=password456
    TELEGRAM_BOT_TOKEN=your_telegram_bot_token
    TELEGRAM_CHANNEL_ID=-100123456789
    ```
2.  **Running the Application:**
    Once you have configured the `.env` file, you can run the application using the following command:

    ```bash
    bun run index.ts
    ```
    This will start the Talky Pet Watcher, which will begin monitoring the specified ONVIF cameras for motion. Upon detecting motion, it will record video, submit it to AI for summarization, and send the report to the configured Telegram channel.
