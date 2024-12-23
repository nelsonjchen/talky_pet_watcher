import { Observable, Subject } from 'rxjs';
import { MotionEventListener } from './motion-listener';
import { VideoCapture } from './video-capture';
import type { MotionOutput } from './types';

interface Clip {
  filename: string;
  hostname: string;
  timestamp: string;
}

export function createCameraClipObservable(
  hostname: string,
  port: number,
  username: string,
  password: string,
  outputDir: string,
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
      if (event.dataName === 'IsMotion' && event.dataValue === true) {
        if (!videoCapture?.isRecording()) {
          currentRecordingTimestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const filename = `${outputDir}/${hostname}-${currentRecordingTimestamp}.mp4`;
          videoCapture = new VideoCapture({ input: `rtsp://${username}:${password}@${hostname}/stream1`, output: filename });
          await videoCapture.start();
        }
      } else {
        const currentVideoCapture = videoCapture;
        if (currentVideoCapture !== null && currentVideoCapture.isRecording() && currentRecordingTimestamp) {
          await currentVideoCapture.stop();
          subscriber.next({
            filename: `${hostname}-${currentRecordingTimestamp}.mp4`,
            hostname: hostname,
            timestamp: currentRecordingTimestamp,
          });
          currentRecordingTimestamp = null;
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