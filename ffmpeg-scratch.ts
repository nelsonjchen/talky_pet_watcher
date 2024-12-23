// Stream from the RTSP source using FFmpeg
const rtspUrl = "rtsp://tpuser:tppass@192.168.8.21/stream1";
console.log(`Streaming from ${rtspUrl}...`);
const ffmpegProc = Bun.spawn([
  "ffmpeg",
  "-y", // Overwrite output files without asking
  "-t",
  "5", // Record for 10 seconds
  "-i",
  rtspUrl,
  "-c:v",
  "copy", // Copy the video stream without re-encoding
  "-f",
  "mp4", // Output format
  "output.mp4",
], {
  stdout: "pipe",
  stderr: "pipe",
});

const read = async () => {
  for await (const chunk of ffmpegProc.stderr) {
    console.log(new TextDecoder().decode(chunk));
  }
};
read();

// Handle process exit
ffmpegProc.exited.then((exitCode) => {
  console.log(`FFmpeg exited with code ${exitCode}`);
});
