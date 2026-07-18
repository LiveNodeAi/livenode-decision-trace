import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const rootDirectory = path.resolve(scriptDirectory, "..");
const submissionDirectory = path.join(rootDirectory, "docs", "submission");
const scenesPath = path.join(submissionDirectory, "demo-scenes.json");
const rawVideoPath = path.join(submissionDirectory, "demo-video-en.webm");
const finalVideoPath = path.join(submissionDirectory, "demo-video-en.mp4");
const audioDirectory = "/tmp/livenode-demo-audio";
const narrationRate = "145";
const minimumDurationSeconds = 75;
const maximumDurationSeconds = 100;
const minimumWidth = 1200;
const minimumHeight = 800;

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { stdio: "inherit", ...options });

  if (result.error) {
    throw new Error(`Could not run ${command}: ${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error(`${command} exited with status ${result.status ?? "unknown"}.`);
  }
}

function capture(command, args) {
  const result = spawnSync(command, args, { encoding: "utf8" });

  if (result.error) {
    throw new Error(`Could not run ${command}: ${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error(`${command} exited with status ${result.status ?? "unknown"}: ${result.stderr.trim()}`);
  }

  return result.stdout;
}

function readScenes() {
  const scenes = JSON.parse(readFileSync(scenesPath, "utf8"));

  if (!Array.isArray(scenes) || scenes.length === 0) {
    throw new Error("demo-scenes.json must contain at least one scene.");
  }

  for (const scene of scenes) {
    if (!scene.id || !scene.narration || !Number.isFinite(scene.durationMs) || scene.durationMs <= 0) {
      throw new Error("Each demo scene needs an id, narration, and positive durationMs.");
    }
  }

  return scenes;
}

function verifyFinalMedia() {
  const media = JSON.parse(capture("ffprobe", [
    "-v", "error",
    "-show_entries", "format=duration:stream=codec_name,codec_type,width,height",
    "-of", "json",
    finalVideoPath,
  ]));
  const duration = Number(media.format?.duration);
  const videoStreams = media.streams.filter((stream) => stream.codec_type === "video");
  const audioStreams = media.streams.filter((stream) => stream.codec_type === "audio");
  const video = videoStreams[0];
  const audio = audioStreams[0];

  if (!Number.isFinite(duration) || duration < minimumDurationSeconds || duration > maximumDurationSeconds) {
    throw new Error(`Final video duration must be ${minimumDurationSeconds}-${maximumDurationSeconds}s; got ${duration}s.`);
  }
  if (videoStreams.length !== 1 || video?.codec_name !== "h264") {
    throw new Error("Final video must contain exactly one H.264 video stream.");
  }
  if (video.width < minimumWidth || video.height < minimumHeight) {
    throw new Error(`Final video must be at least ${minimumWidth}x${minimumHeight}; got ${video.width}x${video.height}.`);
  }
  if (audioStreams.length !== 1 || audio?.codec_name !== "aac") {
    throw new Error("Final video must contain exactly one AAC audio stream.");
  }

  console.log(`Validated ${path.relative(rootDirectory, finalVideoPath)}: ${duration.toFixed(2)}s, ${video.width}x${video.height}, H.264/AAC.`);
}

function main() {
  if (!existsSync(rawVideoPath)) {
    throw new Error(`Missing raw rehearsal capture: ${rawVideoPath}`);
  }

  const scenes = readScenes();
  mkdirSync(audioDirectory, { recursive: true });
  const wavPaths = scenes.map((scene, index) => {
    const baseName = `${String(index + 1).padStart(2, "0")}-${scene.id}`;
    const aiffPath = path.join(audioDirectory, `${baseName}.aiff`);
    const wavPath = path.join(audioDirectory, `${baseName}.wav`);
    const durationSeconds = String(scene.durationMs / 1000);

    // Samantha is an English macOS synthetic voice. 145 WPM honors the public demo contract.
    run("say", ["-v", "Samantha", "-r", narrationRate, "-o", aiffPath, scene.narration]);
    run("ffmpeg", [
      "-y", "-i", aiffPath,
      "-af", `apad=pad_dur=${durationSeconds}`,
      "-t", durationSeconds,
      wavPath,
    ]);

    return wavPath;
  });
  const concatListPath = path.join(audioDirectory, "audio-concat.txt");
  const combinedWavPath = path.join(audioDirectory, "demo-narration.wav");
  const combinedAudioPath = path.join(audioDirectory, "demo-narration.m4a");
  writeFileSync(concatListPath, wavPaths.map((wavPath) => `file '${wavPath.replaceAll("'", "'\\\\''")}'`).join("\n") + "\n");

  run("ffmpeg", [
    "-y", "-f", "concat", "-safe", "0", "-i", concatListPath,
    "-c:a", "pcm_s16le",
    combinedWavPath,
  ]);
  run("ffmpeg", [
    "-y", "-i", combinedWavPath,
    "-c:a", "aac", "-b:a", "160k",
    combinedAudioPath,
  ]);
  run("ffmpeg", [
    "-y", "-i", rawVideoPath, "-i", combinedAudioPath,
    "-c:v", "libx264", "-preset", "medium", "-crf", "20",
    "-c:a", "aac", "-b:a", "160k",
    "-shortest", "-movflags", "+faststart",
    finalVideoPath,
  ]);
  verifyFinalMedia();
}

try {
  main();
} catch (error) {
  console.error(`Demo render failed: ${error.message}`);
  process.exitCode = 1;
}
