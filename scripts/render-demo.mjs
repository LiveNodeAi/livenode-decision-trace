import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
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

function probeMedia(mediaPath) {
  return JSON.parse(capture("ffprobe", [
    "-v", "error",
    "-show_entries", "format=duration:stream=codec_name,codec_type,width,height",
    "-of", "json",
    mediaPath,
  ]));
}

function probeDuration(mediaPath) {
  const duration = Number(probeMedia(mediaPath).format?.duration);

  if (!Number.isFinite(duration) || duration <= 0) {
    throw new Error(`Could not determine a positive duration for ${mediaPath}.`);
  }

  return duration;
}

function verifyFinalMedia(rawVideoDuration) {
  const media = probeMedia(finalVideoPath);
  const duration = Number(media.format?.duration);
  const videoStreams = media.streams.filter((stream) => stream.codec_type === "video");
  const audioStreams = media.streams.filter((stream) => stream.codec_type === "audio");
  const video = videoStreams[0];
  const audio = audioStreams[0];

  if (!Number.isFinite(duration) || duration < minimumDurationSeconds || duration > maximumDurationSeconds) {
    throw new Error(`Final video duration must be ${minimumDurationSeconds}-${maximumDurationSeconds}s; got ${duration}s.`);
  }
  if (Math.abs(duration - rawVideoDuration) > 0.05) {
    throw new Error(`Final video duration must match the raw WebM within 0.05s; got ${duration}s vs ${rawVideoDuration}s.`);
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
  const rawVideoDuration = probeDuration(rawVideoPath);
  mkdirSync(audioDirectory, { recursive: true });
  const renderDirectory = mkdtempSync(path.join(audioDirectory, "render-"));
  const wavPaths = scenes.map((scene, index) => {
    const baseName = `${String(index + 1).padStart(2, "0")}-${scene.id}`;
    const aiffPath = path.join(renderDirectory, `${baseName}.aiff`);
    const wavPath = path.join(renderDirectory, `${baseName}.wav`);
    const durationSeconds = String(scene.durationMs / 1000);
    const narrationLimitSeconds = Math.min(scene.narrationMaxMs, scene.durationMs) / 1000;

    // Samantha is an English macOS synthetic voice. 145 WPM honors the public demo contract.
    run("say", ["-v", "Samantha", "-r", narrationRate, "-o", aiffPath, scene.narration]);
    const narrationDuration = probeDuration(aiffPath);
    if (narrationDuration > narrationLimitSeconds) {
      throw new Error(
        `Narration for ${scene.id} is ${narrationDuration.toFixed(2)}s, exceeding its ${narrationLimitSeconds.toFixed(2)}s budget.`,
      );
    }
    run("ffmpeg", [
      "-y", "-i", aiffPath,
      "-af", `apad=pad_dur=${durationSeconds}`,
      "-t", durationSeconds,
      wavPath,
    ]);

    return wavPath;
  });
  const concatListPath = path.join(renderDirectory, "audio-concat.txt");
  const combinedWavPath = path.join(renderDirectory, "demo-narration.wav");
  const combinedAudioPath = path.join(renderDirectory, "demo-narration.m4a");
  writeFileSync(concatListPath, wavPaths.map((wavPath) => `file '${wavPath.replaceAll("'", "'\\\\''")}'`).join("\n") + "\n");

  run("ffmpeg", [
    "-y", "-f", "concat", "-safe", "0", "-i", concatListPath,
    "-c:a", "pcm_s16le",
    combinedWavPath,
  ]);
  run("ffmpeg", [
    "-y", "-i", combinedWavPath,
    "-af", `apad=pad_dur=${rawVideoDuration}`,
    "-t", String(rawVideoDuration),
    "-c:a", "aac", "-b:a", "160k",
    combinedAudioPath,
  ]);
  run("ffmpeg", [
    "-y", "-i", rawVideoPath, "-i", combinedAudioPath,
    "-map", "0:v:0", "-map", "1:a:0",
    "-t", String(rawVideoDuration),
    "-c:v", "libx264", "-preset", "medium", "-crf", "20",
    "-c:a", "aac", "-b:a", "160k",
    "-movflags", "+faststart",
    finalVideoPath,
  ]);
  verifyFinalMedia(rawVideoDuration);
}

try {
  main();
} catch (error) {
  console.error(`Demo render failed: ${error.message}`);
  process.exitCode = 1;
}
