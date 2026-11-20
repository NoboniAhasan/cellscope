# CellScope

Web-based microscopy image analysis and research collaboration platform.

> **Disclaimer:** For educational/research use. Not for medical diagnosis.

---

## Frontend Setup & Running in Mock Mode

Phase 1 runs against a client-side mock data layer (`services/mock/`) with no active backend required.

### 1. Prerequisites
- **Node.js** (v20+ recommended, tested on v26+)
- **npm** (v10+)

### 2. Installation
Navigate into the `frontend` folder and install dependencies:
```bash
cd frontend
npm install
```

### 3. Environment Configuration
The frontend uses environment variables defined in `.env`. By default, mock mode is enabled:
```env
VITE_USE_MOCK=true
VITE_API_URL=http://localhost:8000/api/v1
```
Ensure `.env` exists in `frontend/` (copied from `.env.example`).

### 4. Running the Development Server
Start the local Vite dev server:
```bash
npm run dev
```
Open the printed URL (typically `http://localhost:5173`) in your browser.

### 5. Running Tests
Run the test suite with Vitest:
```bash
npm test
```

### 6. Production Build
Verify compilation and TypeScript type checking:
```bash
npm run build
```
