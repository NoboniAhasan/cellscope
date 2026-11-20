# CellScope — Agent Rules (read this first, every session)

CellScope is a web-based microscopy image analysis and research collaboration platform
for an educational Software Engineering Lab project. It is NOT a clinical or diagnostic
system. Full spec: `docs/CellScope_Complete_Project_Documentation.docx`.

## Current phase: PHASE 1 — FRONTEND ONLY
Build a fully working, clickable frontend against a MOCK data layer. No backend code yet.
The mock layer must be replaceable by the real FastAPI backend without changing any UI code.

## Fixed tech stack (do not add alternatives)
- React + TypeScript + Vite
- Tailwind CSS
- React Router
- TanStack Query + Axios
- Konva.js (interactive image canvas)
- Recharts (histogram, comparison charts)
- React Hook Form + Zod
- Vitest + React Testing Library
- NOT allowed: Redux, Next.js, UI kits that fight Tailwind, dark mode, Redis/Celery/etc.

## Architecture rules
1. Folder layout under `frontend/src/`:
   `components/ pages/ services/ hooks/ types/ routes/` and
   `features/{auth,dashboard,experiments,analysis,image-editor,reviews,comparison,assistant}/`
2. ALL data access goes through `services/api.ts`, which implements the interface in
   `docs/API_CONTRACT.md`. UI components never touch localStorage or mock data directly.
3. Mock adapter lives in `services/mock/`, selected by `VITE_USE_MOCK=true`.
   Persist mock data in localStorage / IndexedDB (images as blobs in IndexedDB).
   A real Axios adapter (`VITE_API_URL`) is added in Phase 2 — keep the interface clean for it.
4. Types in `types/` must match `docs/API_CONTRACT.md` exactly. If you need to change
   a type, update the contract file in the same commit and tell me.
5. Components: small, typed, no `any`. Pages are thin; logic lives in hooks/features.
6. Every async view needs loading, empty and error states.
7. Role-based routing: Researcher and Reviewer have separate workspaces. Reviewers only
   see experiments assigned to them (mock-enforced now; the backend enforces it later).

## Honesty and terminology rules (non-negotiable)
- Mock/demo results MUST show a visible "Demo result" badge. Never present mock data as
  real processing.
- Say "candidate cells" / "candidate objects", never "confirmed cells".
- Areas are in px² unless calibrated; show a note near measurements.
- Footer notice on every page: "For educational/research use. Not for medical diagnosis."
- Do not claim accuracy or superiority over ImageJ/Fiji or CellProfiler.
- Out of scope (do NOT build): live re-run sliders, split/merge correction, deep learning,
  public share links, patient records, hospital integration, camera/hardware features,
  dark mode, admin role.

## Working method
- One milestone per session (see `docs/PHASE1_MILESTONES.md`).
- Before coding a milestone: post a short plan and wait for my approval.
- After coding: run the app, click through the flow in the browser, then report
  (a) what works, (b) what is mocked, (c) deviations from the spec, (d) what to test manually.
- Small, meaningful commits with clear messages, on a feature branch per milestone
  (e.g. `feature/m2-core-analysis-slice`). Never commit `.env`, keys, or private images.
- Add/maintain a README section: how to install and run the frontend in mock mode.
- Add Vitest tests as specified per milestone; run them before declaring done.
