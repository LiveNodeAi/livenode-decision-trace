import type { SourceRange } from "@/lib/transcript-contract";

export type TranscriptSegment = {
  id: `segment-${number}`;
  start: number;
  end: number;
  text: string;
};

const MAX_SEGMENT_LENGTH = 800;
const PREFERRED_BOUNDARY = /[\n\r。！？.!?]/;

function fallbackEnd(transcript: string, start: number): number {
  let end = Math.min(start + MAX_SEGMENT_LENGTH, transcript.length);
  if (end < transcript.length) {
    const previous = transcript.charCodeAt(end - 1);
    const next = transcript.charCodeAt(end);
    if (previous >= 0xd800 && previous <= 0xdbff && next >= 0xdc00 && next <= 0xdfff) end -= 1;
  }
  return end;
}

export function segmentTranscript(transcript: string): TranscriptSegment[] {
  const segments: TranscriptSegment[] = [];
  let start = 0;
  while (start < transcript.length) {
    const limit = fallbackEnd(transcript, start);
    let end = limit;
    if (limit < transcript.length) {
      for (let index = limit - 1; index >= start; index -= 1) {
        if (PREFERRED_BOUNDARY.test(transcript[index])) {
          end = index + 1;
          break;
        }
      }
    }
    if (end <= start) end = limit;
    segments.push({
      id: `segment-${segments.length + 1}`,
      start,
      end,
      text: transcript.slice(start, end),
    });
    start = end;
  }
  return segments;
}

export function resolveSegmentIds(
  segments: TranscriptSegment[],
  ids: string[],
): SourceRange[] | undefined {
  if (new Set(ids).size !== ids.length) return undefined;
  const byId = new Map<string, TranscriptSegment>(segments.map((segment) => [segment.id, segment]));
  const resolved = ids.map((id) => byId.get(id));
  if (resolved.some((segment) => !segment)) return undefined;
  return (resolved as TranscriptSegment[])
    .sort((left, right) => left.start - right.start)
    .map(({ start, end, text }) => ({ start, end, excerpt: text }));
}
