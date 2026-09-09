# Developer & Engineering Guidelines (Sections 108 & 109)

## 1. Code Quality & Standards
- **Strict TypeScript**: Strict mode must remain enabled across both `frontend/tsconfig.json` and `backend/tsconfig.json`.
- **Formatting**: Adhere to `.editorconfig` (2 spaces indentation, LF line endings, UTF-8 charset).
- **Architecture**:
  - Keep controllers thin: business logic belongs strictly in injectable services.
  - Keep components modular: UI elements belong in reusable component hierarchies.
  - Never fake features or use mock data in production pathways.

---

## 2. Git Workflow (Section 109)
- **Branch Conventions**:
  - `main`: Production releases deployed to `https://ctf.cybercrew.online`.
  - `develop`: Primary staging and integration branch.
  - `feature/*`: New platform features or challenge additions.
  - `fix/*`: Bug fixes and security patches.
- **Commit Guidelines**:
  - Write concise, imperative commit messages.
  - Never force-push to `main` or `develop`.
  - Never commit `.env` or sensitive credentials.
