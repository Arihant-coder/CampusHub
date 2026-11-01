# CampusHub Backend (FastAPI)

FastAPI service powering AI operations and technical features for CampusHub.

---

## 1. Directory Structure

```text
backend/
├── core/                       # Server runtime configuration
│   ├── config.py               # Settings & environment variables
│   ├── rate_limit.py           # In-memory sliding window rate limiter
│   └── security.py             # JWT bearer auth & Supabase token validation
├── features/                   # 1:1 Matching Feature Modules
│   ├── subjects_ai/            # router.py, schemas.py, service.py
│   └── daily_quiz/             # router.py, schemas.py, service.py
├── shared/                     # Health check endpoint
│   └── health.py
├── main.py                     # Registers routers under /api/v1/...
└── requirements.txt
```

---

## 2. Feature Workspaces & Data Flow

| Feature Module | Serves Frontend | Data & API Flow |
| :--- | :--- | :--- |
| **`features/subjects_ai/`** | `features/subject-ai-panel/` | **FastAPI** |
| **`features/daily_quiz/`** | `features/daily-quiz/` | **FastAPI** & **Supabase** |

---

## 3. Local Development

```bash
cd backend
python -m venv .venv

# Windows (PowerShell):
.venv\Scripts\Activate.ps1
# Linux/macOS:
source .venv/bin/activate

pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Health check:
```bash
curl http://localhost:8000/api/v1/health
# {"status":"ok","version":"0.1.0"}
```
