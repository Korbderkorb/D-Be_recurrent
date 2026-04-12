# UniTech Learning Platform - Working Setup Guide

## ✅ Setup Complete (April 12, 2026)

Your project is now consolidated and ready for professional development.

---

## **Where Everything Lives**

### Primary Working Directory (GitHub Repo)
```
C:\Users\korbi\Documents\GitHub\D-Be_recurrent\
├── learning-platform/              ← App code (deployed)
│   ├── App.tsx
│   ├── components/
│   ├── firebase.ts
│   ├── package.json
│   ├── vite.config.ts
│   ├── .env.local                  ← Local Firebase credentials (NOT committed)
│   ├── .env.example                ← Template (committed)
│   └── .gitignore
├── docs/                           ← Reference documentation (NOT deployed)
│   ├── ARCHITECTURE.md
│   └── ENVIRONMENT_SETUP.md
├── CLAUDE.md                       ← My working guidelines
├── README.md                       ← Project overview
└── .git/                           ← Git repository root
```

### Backup Files (in /c/Claude/)
- `.env.local.FINAL_BACKUP` - Final backup of Firebase credentials
- `.env.local.backup` - Earlier backup

---

## **Development Workflow**

### 1. **Start Working**
```bash
cd C:\Users\korbi\Documents\GitHub\D-Be_recurrent
cd learning-platform
npm run dev
```

Open browser to: `http://localhost:3000`

### 2. **Make Changes**
- Edit files in `learning-platform/` folder
- Changes auto-sync with GitHub Desktop

### 3. **Test Locally**
- Visit app at `http://localhost:3000`
- Verify your changes work
- Check browser console for errors

### 4. **Commit & Push**
- Open GitHub Desktop
- Review changes
- Create descriptive commit message
- Push to `dev` branch first (for testing)

### 5. **Deploy to Production**
- When `dev` is stable and tested
- Create Pull Request: `dev` → `main`
- Merge in GitHub
- Cloudflare auto-deploys from `main`

---

## **Key Files & Their Purpose**

| File/Folder | Purpose | Edit When |
|---|---|---|
| `learning-platform/` | App source code | Adding features, fixing bugs |
| `learning-platform/.env.local` | Firebase credentials (local only) | Never commit, only set locally |
| `learning-platform/.env.example` | Env var template (committed) | When adding new env vars |
| `learning-platform/App.tsx` | Main app component (2,949 lines) | Core logic changes ⚠️ |
| `learning-platform/components/` | React components | UI changes |
| `learning-platform/firestore.rules` | Firebase security | Permission changes |
| `docs/ARCHITECTURE.md` | System design reference | Documenting major changes |
| `CLAUDE.md` | Working guidelines | My approach to tasks |
| `README.md` | Project overview | Updating product description |

---

## **Deployment Pipeline**

```
Local Development
        ↓
GitHub Desktop (commit & push)
        ↓
GitHub Repository (D-Be_recurrent)
        ↓
Dev Branch
  └─→ Cloudflare tests build
       (auto-deploys)
        ↓
Main Branch (via PR)
  └─→ Cloudflare builds & deploys
       (production, 30 active users)
        ↓
Live at your Cloudflare domain
```

---

## **Cloudflare Configuration**

**Project:** `d-be-recurrent`  
**Repository:** `D-Be_recurrent` (GitHub)

### Build Settings
- **Root directory:** `learning-platform`
- **Build command:** `npm run build`
- **Output directory:** `dist`

---

## **Claude Code Setup**

When opening Claude Code:
- **Working directory:** `C:\Users\korbi\Documents\GitHub\D-Be_recurrent`
- **Check CLAUDE.md first** for my working guidelines
- **Check docs/ARCHITECTURE.md** for system overview

---

## **Active Users**

⚠️ You have ~30 active users depending on this platform.

**Before deploying to main:**
- Test thoroughly in `dev` branch first
- Verify Cloudflare preview build works
- Merge to `main` only when confident
- Monitor after deployment for issues

---

## **Backup & Safety**

- ✅ `.env.local.FINAL_BACKUP` saved in `/c/Claude/`
- ✅ All code version controlled in GitHub
- ✅ Git history preserved with `git mv` moves
- ✅ Easy rollback if needed (git revert)

---

## **Quick Commands**

```bash
# Development
cd C:\Users\korbi\Documents\GitHub\D-Be_recurrent\learning-platform
npm run dev          # Start dev server

# Testing
npm run build        # Build for production
npm run lint         # Check TypeScript

# Git (from GitHub Desktop)
Commit → Push → Create PR → Merge to main
```

---

## **Next Steps**

1. ✅ Set Claude Code working directory to GitHub folder
2. ✅ Verify local dev server works: `npm run dev`
3. ✅ Make a test commit to practice the workflow
4. ✅ Reference `/docs/ARCHITECTURE.md` when needed
5. ✅ Follow `/CLAUDE.md` guidelines for approach

---

**Status:** ✅ Production Ready  
**Last Updated:** April 12, 2026  
**Users:** ~30 active  
**Last Major Work:** Folder restructure with Cloudflare config update
