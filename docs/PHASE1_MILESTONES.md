# Phase 1 — Frontend Milestones (Antigravity playbook)

How to use: start a NEW Antigravity session per milestone. Make sure `AGENTS.md`,
`docs/API_CONTRACT.md` and the project documentation are in the repo. Paste the prompt
for the milestone, approve the plan, let it build, then verify the "Done when" checklist
yourself in the browser. Commit on a branch, merge, move on.

Timeline guide (from the project roadmap): M0–M2 before Class 6 (Dec 1), M3 before
Class 8 (Dec 15), M4–M5 before Class 9 (Dec 22), M6–M7 before Class 10 (Dec 29).
The Dec 8 checkpoint needs real results from upload, so start the backend slice
right after M2.

---

## M0 — Project scaffold (do this first, short session)

**Prompt**
```
Read AGENTS.md and docs/API_CONTRACT.md. Do not write feature code yet.
1) Scaffold frontend/ with Vite + React + TypeScript, Tailwind, React Router,
   TanStack Query, Axios, Konva (react-konva), Recharts, React Hook Form, Zod,
   Vitest + React Testing Library.
2) Create the folder layout from AGENTS.md.
3) Create types/ exactly from docs/API_CONTRACT.md.
4) Create services/api.ts with the CellScopeApi interface and an empty mock adapter
   skeleton selected by VITE_USE_MOCK. Add .env.example and .gitignore.
5) Add a README section on running in mock mode.
Show me the plan first, then implement. Confirm `npm run dev`, `npm run build` and
`npm test` all pass.
```
**Done when:** dev server runs, build passes, an empty test passes, folders exist.

---

## M1 — Foundation: shell, auth, dashboard, experiments

**Prompt**
```
Milestone M1. Plan first, wait for approval.
Build: app shell (header with role-aware nav, footer with the not-for-diagnosis notice),
routing with protected routes, register/login pages (React Hook Form + Zod; role chosen
at registration), mock auth with token in localStorage, researcher dashboard listing
experiments with search, create-experiment form (title required, description and sample
reference optional), experiment detail page (empty state for no images yet), delete with
confirmation. Reviewer role lands on a placeholder "Assigned reviews" page.
Implement the mock adapter for auth + experiments only, with realistic latency and errors
(wrong password, duplicate email). Add Vitest tests for the login/register form
validation and the protected-route redirect.
```
**Done when:**
- Register as researcher and as reviewer; wrong password shows a clear error
- Create, search, open and delete an experiment; reload keeps the data
- Visiting a protected URL logged-out redirects to login
- Tests pass; footer notice visible on every page

---

## M2 — Core slice: upload → analyse → inspect → save → export

**Prompt**
```
Milestone M2, the core vertical slice. Plan first, wait for approval.
Build on the experiment detail page:
1. Image upload (png/jpg/tiff, max 20 MB) with preview, client + mock-server validation
   and clear errors for invalid/corrupt/oversized files.
2. Analysis settings panel: preset (Fluorescence, Dark-stained cells, Low contrast),
   polarity toggle, min/max area. Presets are parameter bundles; show a one-line
   description of each.
3. Pre-run quality assessment using real canvas pixel stats (contrast, size) and show
   warnings with suggested actions (use the codes in the contract).
4. Run analysis with a progress state. Mock detections must respond to polarity/preset/
   minArea and compute metrics from the contour using the contract formulas.
5. Results page: Konva canvas showing the original image with red candidate-object
   outlines (toggle outlines/mask-view), zoom and pan; measurements table (count, area px²,
   perimeter, circularity, centroid, bbox) with sorting; click an outline OR a row to select
   and inspect the object with a highlighted outline and detail card.
6. Size histogram (Recharts) and a min-area DISPLAY filter that does not delete data.
7. Save/revisit: results persist in the mock layer and can be reopened from the dashboard.
8. CSV download of the selected run, with object IDs and measurements.
9. "Demo result" badge on all mock output; px² note near measurements.
Add Vitest tests for: measurement table rendering, object selection, filter not mutating
data, CSV content, upload validation.
```
**Done when:**
- Upload a real image, change polarity/preset, see different outlines and counts
- Clicking an outline selects the matching table row and vice versa
- Filter changes the display only; CSV still contains all stored objects
- Reload, reopen the experiment, results are still there
- Invalid file types and oversized files show clear errors

> After M2, start the backend slice (Python analysis function → FastAPI → swap the adapter).
> Don't wait for M7.

---

## M3 — Correction and versioning

**Prompt**
```
Milestone M3. Plan first, wait for approval. Scope is deliberately limited:
select + delete false detections, add a missed object (click-to-place polygon or ellipse),
simple boundary adjustment ONLY if it stays reliable, and undo/redo. NO split/merge.
Recalculate area/perimeter/circularity/centroid/bbox after every edit. "Save as new
version" calls saveCorrection and creates version N+1 with parentRunId, createdBy and a
change note; the original automated version must stay untouched and viewable.
Add a version history panel (v1 automated, v2 corrected...) showing who/when/what, and a
side-by-side or toggle view of two versions. Tests: original unchanged after correction,
undo/redo stack behaviour, recalculated metrics, version chain.
```
**Done when:** delete 3 objects, add 1, undo twice, redo once, save; v2 exists with
updated measurements and v1 is identical to before; CSV of v1 and v2 differ correctly.

---

## M4 — Reviewer workflow

**Prompt**
```
Milestone M4. Plan first, wait for approval.
Researcher: "Send for review" on a chosen version, picking a reviewer by email.
Reviewer workspace: list of ONLY assigned experiments; open one to see original and
annotated images, measurements and settings (read-only); add comments, add an
object/region-specific suggestion, then Approve or Request changes (with comment).
Researcher side: see feedback, accept/decline each suggestion, and create a new version
if needed. Reviewers cannot edit the source analysis or see unrelated experiments
(mock-enforced: unassigned access returns 403 and shows an access-denied page).
Record author and timestamp on every comment/decision. Tests: reviewer list shows only
assigned items, unassigned access is denied, decision updates status.
```
**Done when:** two browser profiles (researcher and reviewer) can complete the full loop.

---

## M5 — Comparison and exports

**Prompt**
```
Milestone M5. Plan first, wait for approval.
Comparison page: pick 2+ runs (across experiments or versions) and show a Recharts
comparison of count, mean area, mean perimeter and mean circularity, plus a summary
table. Annotated-image download (PNG) of the selected version. PDF report download:
mock-generate a client-side PDF with experiment info, parameters, warnings, counts,
summary stats, the annotated image and the Demo badge. Reports must reflect the selected
version only. Experiment history with search and filters on the dashboard.
```
**Done when:** compare v1 vs v2 and two experiments; exported files match the saved version.

---

## M6 — Gemini Guide panel (mocked)

**Prompt**
```
Milestone M6. Plan first, wait for approval.
Side panel on the results page: English/Bangla toggle, free-text question, suggested
questions ("Why were some objects not detected?", "What does this warning mean?",
"What does circularity mean?"), conversation display. The mock answers must use the
CURRENT run's real data (count, warnings, preset, polarity). Include loading, timeout,
quota-exceeded and generic-error states with a dev toggle to simulate them; analysis
features must keep working when the guide fails. Add a visible note: "AI explanations
may be wrong and are not scientific or medical advice." No API key or Gemini SDK in
frontend code. Ensure Bangla text renders correctly (add a Bangla-capable web font).
Tests: error fallback does not break the page; language toggle.
```
**Done when:** ask in both languages, force each error state, the rest of the app is unaffected.

---

## M7 — Polish, demo mode, tests

**Prompt**
```
Milestone M7. Plan first, wait for approval.
1) "Load sample data" demo mode with clearly labelled demo experiments and a one-click reset.
2) Consistent loading/empty/error states, responsive layout (laptop + tablet), keyboard
   focus and aria labels on interactive controls, readable colour contrast.
3) Review every page for the honesty rules in AGENTS.md (Demo badge, "candidate" wording,
   px² note, diagnosis notice).
4) Fill test gaps: forms, measurement display, object selection, role-specific pages.
5) Update README with setup, mock-mode instructions and a manual test checklist.
Report remaining mocked behaviour as a list for Phase 2.
```
**Done when:** the final demo story (doc Section 19) can be performed end-to-end in mock mode.

---

## Phase 2 preview (after M2, in parallel with M3+)

1. Standalone Python function: image → mask, annotated image, measurements
   (Gaussian blur → Otsu → opening → distance transform → watershed → filter → measure).
2. Wrap it in FastAPI; add SQLite persistence; test with HTTPX and Postman.
3. Implement the real Axios adapter against `docs/API_CONTRACT.md`; flip
   `VITE_USE_MOCK=false`; remove the Demo badge for real results.
4. Backend auth + permission checks, versioning, reviews, exports, Gemini service.
