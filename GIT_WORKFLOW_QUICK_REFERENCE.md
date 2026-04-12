# Git Workflow - Quick Reference Card

Print this and keep it visible! 🚀

---

## ✅ Before Every Commit

**In GitHub Desktop, check TOP LEFT:**
```
Current Branch: [dev] ✅
OR
Current Branch: [main] ❌ SWITCH TO DEV!
```

---

## 🔄 Standard Workflow

### 1. Make Changes
```bash
# Work in this folder:
C:\Users\korbi\Documents\GitHub\D-Be_recurrent\learning-platform\

# Test locally:
cd learning-platform
npm run dev
```

### 2. Commit to Dev (ALWAYS Dev First!)
```
GitHub Desktop:
1. Review changes
2. Write commit message
3. Click "Commit to dev" (bottom left)
4. Click "Push origin"
```

### 3. Test on Preview (Optional but Recommended)
```
Wait 2-3 minutes for build...
Then visit: https://dev.d-be-recurrent.pages.dev

Test your changes live!
```

### 4. Merge to Production (Manual)
```
When confident:
1. Go to GitHub.com → D-Be_recurrent
2. Pull Requests → New Pull Request
3. Base: main ← Compare: dev
4. Create PR
5. Merge PR
6. Cloudflare deploys to production automatically
```

---

## 🔗 Important URLs

| Purpose | URL |
|---------|-----|
| Preview (dev branch) | `https://dev.d-be-recurrent.pages.dev` |
| Production (main) | `https://d-be-recurrent.pages.dev` |
| GitHub Repo | `https://github.com/Korbderkorb/D-Be_recurrent` |
| Cloudflare Dashboard | `https://dash.cloudflare.com` |

---

## ❌ NEVER Do This

```
❌ Commit to main directly
❌ Force push to any branch
❌ Push .env.local to GitHub
❌ Delete branches without asking
❌ Deploy without testing on preview first
```

---

## 🚨 Emergency Rollback

If something breaks in production:
```bash
cd C:\Users\korbi\Documents\GitHub\D-Be_recurrent

# Revert last commit on main:
git revert HEAD

# Push the revert:
git push origin main

# Cloudflare auto-deploys the revert
```

---

## 📋 Checklist Before Merging to Main

```
□ Changes tested locally with npm run dev
□ All TypeScript errors fixed: npm run lint
□ Tested on preview: https://dev.d-be-recurrent.pages.dev
□ No console errors in browser
□ Verified with different user roles (student/admin)
□ No hardcoded credentials in code
□ Commit message is clear and descriptive
□ Ready for 30 active users to see this change
```

---

## 🎯 Quick Decision Tree

```
I made a change...
        ↓
Is it tested locally? NO → npm run dev first
        ↓ YES
On dev branch? NO → Switch to dev in GitHub Desktop
        ↓ YES
Commit & push to dev
        ↓
Preview working? https://dev.d-be-recurrent.pages.dev
        ↓ YES
Create PR dev → main on GitHub
        ↓
Ready for production? YES → Merge PR
        ↓
Cloudflare auto-deploys
```

---

## 📖 For More Info

- **System Architecture**: `/docs/ARCHITECTURE.md`
- **Working Guidelines**: `/CLAUDE.md`
- **Setup Guide**: `/WORKING_SETUP.md`
- **Environment Setup**: `/docs/ENVIRONMENT_SETUP.md`

---

**Status**: Production Ready (30 active users)  
**Safe Branch**: dev (test here first)  
**Production Branch**: main (only merge when confident)  
**Last Updated**: April 12, 2026
