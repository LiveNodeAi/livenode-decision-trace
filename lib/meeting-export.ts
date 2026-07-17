import JSZip from "jszip";

import type { DecisionTrace } from "./decision-trace-schema";
import { toDecisionTraceMarkdown, toKxNoteMarkdown } from "./markdown";
import type { DetectedTopic, SourceRange } from "./transcript-contract";

export type SuccessfulMeetingTopic = {
  status: "success";
  topic: DetectedTopic;
  editedTitle: string;
  trace: DecisionTrace;
};

export type FailedMeetingTopic = {
  status: "failed";
  topic: DetectedTopic;
  editedTitle: string;
  errorCode: string;
};

export type MeetingExportTopic = SuccessfulMeetingTopic | FailedMeetingTopic;

export type MeetingExportInput = {
  meetingTitle: string;
  meetingDate: string;
  topics: MeetingExportTopic[];
};

export type MeetingManifestTopic = {
  id: string;
  order: number;
  title: string;
  status: MeetingExportTopic["status"];
  sourceRanges: Array<Pick<SourceRange, "start" | "end">>;
  files?: string[];
  errorCode?: string;
};

export type MeetingManifest = {
  version: 1;
  meetingTitle: string;
  meetingDate: string;
  rootDirectory: string;
  topics: MeetingManifestTopic[];
};

const FIXED_ZIP_DATE = new Date("1980-01-01T00:00:00.000Z");
const MAX_NAME_CODE_POINTS = 44;

function safeName(value: string, fallback: string, max = MAX_NAME_CODE_POINTS): string {
  const normalized = value.normalize("NFKC")
    .replace(/[\u0000-\u001f\u007f/\\:*?"<>|]/gu, "-")
    .replace(/\.{2,}/gu, "-")
    .replace(/\s+/gu, "-")
    .replace(/-+/gu, "-")
    .replace(/^[. -]+|[. -]+$/gu, "");
  const bounded = Array.from(normalized).slice(0, max).join("").replace(/[. -]+$/gu, "");
  return bounded || fallback;
}

function topicDirectories(input: MeetingExportInput): string[] {
  const counts = new Map<string, number>();
  return input.topics.map((entry, index) => {
    const base = safeName(entry.editedTitle, `topic-${index + 1}`);
    const duplicate = (counts.get(base) ?? 0) + 1;
    counts.set(base, duplicate);
    const suffix = duplicate === 1 ? "" : `-${duplicate}`;
    const shortened = Array.from(base).slice(0, MAX_NAME_CODE_POINTS - suffix.length).join("");
    return `${String(index + 1).padStart(2, "0")}-${shortened}${suffix}`;
  });
}

function orderedActions(trace: DecisionTrace) {
  return [...trace.nextActions].sort((left, right) => left.order - right.order);
}

export function buildMeetingManifest(input: MeetingExportInput): MeetingManifest {
  const directories = topicDirectories(input);
  const date = /^\d{4}-\d{2}-\d{2}$/u.test(input.meetingDate) ? input.meetingDate : "meeting";
  const rootDirectory = `${date}_${safeName(input.meetingTitle, "meeting")}`;
  return {
    version: 1,
    meetingTitle: input.meetingTitle,
    meetingDate: input.meetingDate,
    rootDirectory,
    topics: input.topics.map((entry, index) => ({
      id: entry.topic.id,
      order: index + 1,
      title: entry.editedTitle,
      status: entry.status,
      sourceRanges: entry.topic.ranges.map(({ start, end }) => ({ start, end })),
      ...(entry.status === "success"
        ? { files: [`${directories[index]}/Decision-Trace.md`, `${directories[index]}/KX-Note.md`] }
        : { errorCode: entry.errorCode }),
    })),
  };
}

export function toMeetingSummaryMarkdown(input: MeetingExportInput): string {
  const manifest = buildMeetingManifest(input);
  const sections = input.topics.map((entry, index) => {
    const heading = `## ${index + 1}. ${entry.editedTitle}`;
    if (entry.status === "failed") {
      return `${heading}\n\n- 状態: 生成失敗（${entry.errorCode}）`;
    }
    const manifestTopic = manifest.topics[index];
    const reasons = entry.trace.recommendation.reasoning.map(({ text }) => `  - ${text}`).join("\n");
    const conditions = entry.trace.recommendation.changeConditions.length
      ? entry.trace.recommendation.changeConditions.map((condition) => `  - ${condition}`).join("\n")
      : "  - なし";
    const actions = orderedActions(entry.trace).map(({ order, action }) => `  ${order}. ${action}`).join("\n");
    return `${heading}\n\n- 推奨: ${entry.trace.recommendation.option}\n- 推奨理由:\n${reasons}\n- 判断を変える条件・監視事項:\n${conditions}\n- アクション:\n${actions}\n- ファイル: [Decision Trace](${manifestTopic.files![0]}) / [KX Note](${manifestTopic.files![1]})`;
  });
  return `# 会議サマリー\n\n- 会議名: ${input.meetingTitle}\n- 日付: ${input.meetingDate}\n\n${sections.join("\n\n")}\n`;
}

export function toMeetingActionsMarkdown(input: MeetingExportInput): string {
  const sections = input.topics.map((entry, index) => {
    const heading = `## ${index + 1}. ${entry.editedTitle}`;
    if (entry.status === "failed") return `${heading}\n\n- 生成失敗（${entry.errorCode}）`;
    const actions = orderedActions(entry.trace).map(({ order, action }) => `${order}. ${action}`).join("\n");
    return `${heading}\n\n${actions}`;
  });
  return `# アクション一覧\n\n- 会議名: ${input.meetingTitle}\n- 日付: ${input.meetingDate}\n\n${sections.join("\n\n")}\n`;
}

export async function createMeetingZip(input: MeetingExportInput): Promise<Blob> {
  if (!input.topics.some((entry) => entry.status === "success")) {
    throw new Error("Meeting ZIP requires at least one successful topic");
  }
  const manifest = buildMeetingManifest(input);
  const zip = new JSZip();
  const addFile = (relativePath: string, content: string) => {
    zip.file(`${manifest.rootDirectory}/${relativePath}`, content, {
      date: FIXED_ZIP_DATE,
      createFolders: false,
    });
  };
  addFile("00-meeting-summary.md", toMeetingSummaryMarkdown(input));
  input.topics.forEach((entry, index) => {
    if (entry.status !== "success") return;
    const [decisionPath, kxPath] = manifest.topics[index].files!;
    addFile(decisionPath, toDecisionTraceMarkdown(entry.trace));
    addFile(kxPath, toKxNoteMarkdown(entry.trace));
  });
  addFile("99-actions.md", toMeetingActionsMarkdown(input));
  addFile("manifest.json", `${JSON.stringify(manifest, null, 2)}\n`);
  const bytes = await zip.generateAsync({
    type: "uint8array",
    compression: "DEFLATE",
    compressionOptions: { level: 9 },
    platform: "DOS",
    streamFiles: false,
  });
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return new Blob([buffer], { type: "application/zip" });
}
