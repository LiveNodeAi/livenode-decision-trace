# LiveNode Decision Trace — Multi-topic Transcript and Export Design

Date: 2026-07-17  
Status: Approved design, pending implementation plan

## 1. Purpose

Extend the public hackathon demo from a single decision memo into a clear preview of the broader KX workflow. A user can paste a meeting transcript or AI session log, review up to five detected decision topics, generate a separate Decision Trace for each selected topic, and download the complete result as a Markdown ZIP.

The web application demonstrates the capture layer of a broader system:

- the public web demo captures, separates, grounds, and visualizes decisions;
- the existing local KX workflow refines Markdown into a durable, human-reviewed knowledge base;
- a distributable Skill with storage adapters is the planned delivery layer.

The demo must not claim that automatic Obsidian, Notion, cross-AI installation, or long-term personalization is already implemented.

## 2. Product philosophy

Most AI memory systems preserve facts, summaries, and final answers. LiveNode preserves the judgment process: the claims considered, evidence trusted, constraints accepted, alternatives rejected, and connections that shaped a decision.

That structure is an intermediate layer between a general-purpose LLM and the person using it. It can help future AI work lean toward the person's own experience, values, and judgment instead of returning only a high-quality statistical average. It is also memory for the human: a way to revisit not only what was decided, but why.

Primary positioning:

> LiveNode Decision Trace turns a conversation into a reusable memory of how a decision was made—not just what was decided.

Japanese positioning:

> 会話を、単なる決定事項ではなく「なぜそう判断したのか」を再利用できる記憶へ変える。

## 3. Scope

### Included

- Japanese and English transcripts up to 30,000 Unicode characters.
- Topic detection with a maximum of five topics.
- Human review before generation: select, exclude, and edit each topic title.
- One Decision Trace per selected topic.
- At most two topic analyses running concurrently.
- Partial success, per-topic errors, and retry of only the failed topic.
- Deterministic meeting summary and action list derived from successful traces.
- A client-generated Markdown ZIP.
- Honest explanatory cards for the local KX workflow and future Skill storage adapters.
- Updated Devpost story and product copy that explain the intermediate-layer philosophy.

### Excluded

- Direct Obsidian, Notion, Google Drive, or AI-Brain writes from the public web app.
- OAuth or account management.
- Server-side storage of transcripts, topics, traces, or ZIP files.
- More than five topics per transcript.
- Editing the detected source ranges in the public demo.
- AI-generated meeting-wide synthesis beyond the completed topic traces.

## 4. User flow

### Step 1: paste a transcript

The input panel accepts a meeting transcript, Circleback-style transcription, or AI session log. The user selects **Detect decision topics**. The interface states:

- maximum 30,000 characters;
- the public demo detects up to five topics;
- this application does not store the transcript;
- the transcript is sent to OpenAI for processing.

The existing single-memo samples remain available as a fast demonstration path.

### Step 2: review detected topics

The application shows one card per detected topic with:

- selected checkbox;
- editable title;
- short summary;
- a compact preview of the grounded source excerpts;
- a clear indication when non-decision conversation was excluded.

The user can select or exclude topics and edit titles, but cannot edit source ranges. At least one topic must be selected before generation. The interface explains the public-demo limit of five topics as a latency and API-usage safeguard.

### Step 3: generate topic traces

The browser starts at most two independent topic-analysis requests at a time. Each topic has its own state:

- queued;
- generating;
- complete;
- failed and retryable;
- failed and non-retryable.

A failure never removes completed traces. Only a failed topic is retried. Double-clicks and duplicate in-flight requests are disabled.

### Step 4: review and export

The result view begins with a deterministic meeting decision map. It lists successful topics, recommendations, change conditions, actions, and any failed topics. Each successful topic then exposes the existing six-section Decision Trace and both Markdown formats.

The working primary action is **Download Markdown ZIP**. Obsidian, Notion, and AI-Brain are presented as explanatory Skill/storage-adapter cards, not as enabled buttons.

## 5. Architecture

### Topic detection endpoint

`POST /api/topics/detect`

Input:

```json
{ "transcript": "..." }
```

Successful output:

```json
{
  "transcriptHash": "sha256-of-trimmed-transcript",
  "topics": [
    {
      "id": "topic-1",
      "title": "...",
      "summary": "...",
      "ranges": [
        { "start": 120, "end": 256, "excerpt": "..." }
      ]
    }
  ]
}
```

`start` and `end` use JavaScript UTF-16 code-unit offsets. The server computes SHA-256 over the validated, trimmed transcript and requires `transcript.slice(start, end) === excerpt` for every range. Detection range validation uses exact text, not NFKC normalization.

The detector returns one to five unique topic IDs. Range count, excerpt length, total cited length, overlap, and transcript coverage are bounded. Cross-topic sharing is allowed only for genuinely shared statements; repeated whole-transcript coverage is rejected.

### Topic analysis endpoint

`POST /api/topics/analyze`

Input:

```json
{
  "transcript": "...",
  "transcriptHash": "...",
  "topic": {
    "id": "topic-1",
    "editedTitle": "...",
    "ranges": [
      { "start": 120, "end": 256, "excerpt": "..." }
    ]
  }
}
```

The server recomputes the transcript hash and revalidates every source range. `editedTitle` is untrusted data and cannot override model instructions. The OpenAI request receives only the verified ranges plus bounded surrounding context, not the full 30,000-character transcript.

Each successful response contains the existing validated `DecisionTrace`, `highImpact`, `topicId`, verified `sourceRanges`, and an opaque attempt identifier. Existing deterministic grounding sanitization remains active. A trace whose subject is not grounded in the selected ranges returns `TOPIC_NOT_GROUNDED` rather than silently succeeding.

### Browser orchestration

A small promise pool limits active analysis requests to two. Topic state is independent and keyed by the server-issued topic ID. Cancelling, retrying, or failing one topic cannot corrupt another topic's state. The UI prevents duplicate in-flight requests.

### No persistence

The application has no transcript, topic, trace, or ZIP database. It must not log request bodies or model output. `store: false` is sent to OpenAI, while privacy copy remains precise: the application does not store the transcript; it sends it to OpenAI for processing. It does not claim that every infrastructure provider performs zero retention.

## 6. Validation, cost, and abuse protection

- Transcript semantic limit: 30,000 Unicode characters.
- Transport limit: at least 140 KB including JSON overhead, enforced before JSON parsing and again after parsing.
- Detected topic limit: five.
- Active browser analyses: two.
- One malformed structured response retry per provider operation.
- Detection and analysis use separate Cloudflare rate-limit keys.
- Public errors include only a stable code, retryability, and optional topic ID.
- Model prompts treat transcript, excerpts, and edited titles as untrusted data.
- Rendering remains React text and generated Markdown; raw HTML is never rendered.

Stable errors include:

- `INVALID_REQUEST`
- `TRANSCRIPT_TOO_SHORT`
- `TRANSCRIPT_TOO_LONG`
- `REQUEST_TOO_LARGE`
- `RATE_LIMITED`
- `HASH_MISMATCH`
- `INVALID_SOURCE_RANGE`
- `TOO_MANY_TOPICS`
- `TOPIC_NOT_GROUNDED`
- `PROVIDER_TIMEOUT`
- `PROVIDER_REFUSED`
- `PROVIDER_BUSY`
- `MALFORMED_RESPONSE`

## 7. Deterministic meeting summary

The meeting summary is a pure transformation of successful topic traces. It must not make another AI request or add new claims.

It contains:

- transcript title/date supplied by the user or a neutral generated filename label;
- selected topics in user-visible order;
- each topic's recommendation;
- change conditions as unresolved or watch items;
- all next actions, grouped by topic;
- explicit failed-topic entries;
- links to the corresponding Markdown files.

The same input traces produce byte-identical summary Markdown.

## 8. ZIP format

```text
YYYY-MM-DD_meeting-name/
├── 00-meeting-summary.md
├── 01-safe-topic-name/
│   ├── Decision-Trace.md
│   └── KX-Note.md
├── 02-safe-topic-name/
│   ├── Decision-Trace.md
│   └── KX-Note.md
├── ...
├── 99-actions.md
└── manifest.json
```

The numeric prefix is authoritative. Slugs are sanitized, length-limited, collision-safe, and resistant to traversal. Japanese titles remain inside Markdown even when a conservative filename slug is used. The manifest records topic order, status, source-range metadata, and filenames without copying the full transcript.

One successful topic is sufficient for ZIP creation. All-topic failure disables ZIP creation.

## 9. Submission and interface messaging

The application explains the relationship between layers:

- **Web demo — capture layer:** paste, separate, ground, visualize, and export.
- **Local KX — working refinement layer:** the developer's existing human-reviewed Markdown workflow.
- **Distributable Skill — planned delivery layer:** future installation and storage adapters.

The product must say that Obsidian and Notion require authorization and belong to the Skill roadmap. It must not render fake working integration controls.

The Devpost story adds the following truthful claims:

- the project emerged from an existing personal KX workflow rather than a hypothetical memory use case;
- the web demo makes the judgment-capture stage understandable and testable;
- portable Markdown supports continuity across projects and AI tools;
- the system can help shift future AI work toward the person's judgment, but does not guarantee reproduction of the person.

## 10. Testing and acceptance

### Contract and grounding

- UTF-16 range round-trips for Japanese, emoji, surrogate pairs, and CRLF.
- One-character range shifts, modified excerpts, and hash mismatches are rejected.
- Zero/six topics, duplicate IDs, out-of-range excerpts, excessive overlap, and excessive coverage are rejected.
- Edited-title prompt injection remains data.
- Existing evidence/inference sanitization and high-impact notices remain valid per topic.

### Concurrency and partial success

- Measured active request count never exceeds two.
- Four of five completed traces remain when one times out.
- Retry targets only the failed topic.
- Double-click does not create another in-flight request.
- Cancellation does not corrupt completed states.

### Long input and security

- 30,000-character ASCII, Japanese, and emoji inputs are covered.
- Oversized declared and streamed bodies are rejected before semantic processing.
- Transcript, API key, provider detail, and model output never appear in public errors, console output, or client bundles.
- Rate-limit denial and provider-call worst cases are tested.

### Summary and ZIP

- Summary order is deterministic and failed topics are explicit.
- ZIP filenames resist traversal, duplicates, long titles, and Unicode edge cases.
- Full success and partial success produce a valid manifest and both Markdown formats.
- All failure disables ZIP generation.

### Browser acceptance

- Desktop 1440 and mobile 375 flows cover paste, detect, topic review, title edit, selection, generation, partial failure, retry, result navigation, and ZIP download.
- Existing single-decision mode, six sections, evidence labels, KX export, and privacy notices do not regress.
- Production acceptance uses a bounded transcript that produces two or three topics and records request count, latency, result completeness, ZIP contents, and exposure safety.

## 11. Completion criteria

This phase is complete when:

1. a user can paste up to 30,000 characters and receive one to five source-grounded topics;
2. the user can select/exclude topics and edit titles before generation;
3. selected topics generate with maximum concurrency two and partial failures are preserved;
4. successful traces produce a deterministic meeting summary, action list, and safe Markdown ZIP;
5. the interface and Devpost story accurately explain the Web / local KX / future Skill layers;
6. all automated and production acceptance checks pass without persistence or secret exposure.
