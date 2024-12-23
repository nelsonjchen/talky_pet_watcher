import { Observable, Subject } from "rxjs";
import { MotionEventListener } from "./motion-listener";
import { VideoCapture } from "./video-capture";
import type { MotionOutput } from "./types";
import { existsSync } from "node:fs";

export interface Clip {
  filename: string;
  hostname: string;
  timestamp: string;
  estimatedDuration: number;
}

export function createCameraClipObservable(
  hostname: string,
  port: number,
  username: string,
  password: string,
  outputDir: string
): Observable<Clip> {
  return new Observable((subscriber) => {
    const motionEvents = new Subject<MotionOutput>();
    const motionListener = new MotionEventListener(
      hostname,
      port,
      username,
      password,
      (event) => motionEvents.next(event),
      undefined,
      false
    );
    let currentRecordingTimestamp: string | null = null;
    let videoCapture: VideoCapture | null = null;

    motionEvents.subscribe(async (event) => {
      if (event.dataName === "IsMotion" && event.dataValue === true) {
        if (!videoCapture?.isRecording()) {
          currentRecordingTimestamp = new Date()
            .toISOString()
            .replace(/[:.]/g, "-");
          const filename = `${outputDir}/${hostname}-${currentRecordingTimestamp}.mp4`;
          videoCapture = new VideoCapture({
            input: `rtsp://${username}:${password}@${hostname}/stream1`,
            output: filename,
          });
          await videoCapture.start();
        }
      } else {
        const currentVideoCapture = videoCapture;
        if (
          currentVideoCapture !== null &&
          currentVideoCapture.isRecording() &&
          currentRecordingTimestamp
        ) {
          await currentVideoCapture.stop();
          const filename = `${outputDir}/${hostname}-${currentRecordingTimestamp}.mp4`;

          // Check if the file exists before emitting the event
          let fileExists = false;
          for (let i = 0; i < 20; i++) {
            if (existsSync(filename)) {
              fileExists = true;
              break;
            }
            await new Promise((resolve) => setTimeout(resolve, 100));
          }

          let duration = 0.0;
          // Run ffprobe to get the duration of the video
          try {
            const probe = Bun.spawnSync(
              [
                'ffprobe',
                '-v',
                'error',
                '-show_entries',
                'format=duration',
                '-of',
                'default=noprint_wrappers=1:nokey=1',
                filename]
            );
            duration = parseFloat(probe.stdout.toString());
          } catch (error) {
            // Don't log the error at all. Silently ignore it.
          }

          if (fileExists) {
            subscriber.next({
              filename: `${hostname}-${currentRecordingTimestamp}.mp4`,
              hostname: hostname,
              timestamp: currentRecordingTimestamp,
              estimatedDuration: duration,
            });
            currentRecordingTimestamp = null;
          } else {
            // Don't log the error at all. Silently ignore it.
          }
        }
        if (videoCapture) {
          videoCapture.stop();
        }
        videoCapture = null;
      }
    });

    motionListener.startListening();

    return () => {
      motionListener.stopListening();
      if (videoCapture?.isRecording()) {
        videoCapture.stop();
      }
    };
  });
}