### Task 7: Document, preview in the Workers runtime, deploy, and collect submission evidence

**Files:**
- Create: `README.md`
- Create: `docs/submission/devpost-story.md`
- Create: `docs/submission/demo-script-ja.md`
- Modify: `wrangler.jsonc` only if the generated OpenNext config requires a documented compatibility adjustment.

**Interfaces:**
- Consumes: all prior tasks.
- Produces: public Worker URL, reproducible setup instructions, Devpost story draft, and 60–90 second recording script.

- [ ] **Step 1: Write the README and submission drafts**

README must include the problem, six-part Decision Trace, five-part KX Note mapping, architecture, privacy boundary, local setup, required environment variables, test commands, and deployment command. The Devpost story must use the headings Inspiration, What it does, How we built it, Challenges, Accomplishments, What we learned, and What's next. The Japanese demo script must fit 60–90 seconds and show one sample, evidence labels, and KX Note copy.

- [ ] **Step 2: Verify the Cloudflare runtime locally**

Create `.dev.vars` locally with `OPENAI_API_KEY` and `OPENAI_MODEL=gpt-5`; never add it to Git. Run:

```bash
npm run preview
```

In the preview, execute all three samples once. Expected: each produces all six sections and both Markdown formats; the terminal does not print memo or model output.

- [ ] **Step 3: Configure the production secret and deploy**

Run:

```bash
npx wrangler secret put OPENAI_API_KEY
npm run deploy
```

Entering the secret and performing the production deployment are external changes. Obtain user confirmation immediately before each final action if the execution environment requires it.

- [ ] **Step 4: Run production acceptance checks**

Against the returned `workers.dev` URL:

1. run all three samples;
2. run one Japanese and one English free-form memo;
3. measure sample click to result and record the duration;
4. inspect browser network responses for accidental secret/provider-error exposure;
5. verify the 375px and desktop layouts;
6. copy both Markdown formats and confirm all required headings;
7. confirm the deployed rate-limit binding is configured and the route maps a limiter denial to HTTP 429. Cloudflare rate limiting is approximate abuse protection, not deterministic exact request accounting, so do not require the 11th request itself to be rejected.

Save only non-sensitive screenshots and timing results in `docs/submission/verification.md`; never save submitted memo text.

- [ ] **Step 5: Final verification and commit**

```bash
npm test
npm run build
npx playwright test
git diff --check
git status --short
git add README.md docs/submission
git commit -m "docs: prepare Build Week submission"
```

Expected: all checks PASS; only intentionally untracked local secret files remain; the commit contains no credentials or memo content.

---

## Completion Gate

Implementation is complete only when:

- all Vitest and Playwright tests pass;
- the OpenNext production build succeeds;
- the deployed Worker is tested with all three samples on desktop and mobile;
- both Markdown exports are verified;
- no secret or submitted memo content appears in Git, client bundles, responses, analytics, or application logs;
- the production sample flow is measured under 30 seconds under normal conditions;
- the public demo URL, project story, screenshots, and demo-video script are ready for Devpost.
