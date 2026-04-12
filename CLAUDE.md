# Claude's Project Guidelines - Learning Platform

## Project Context

**Learning Platform** is a React + Firebase educational application with 30 active users. It's hosted on Cloudflare Pages (`d-be-recurrent` project) and deployed from GitHub (`D-Be_recurrent` repo).

- **Status:** Production with active users
- **Last major work:** Folder restructure (app code moved to learning-platform/ subfolder)
- **Users:** ~30 students using for learning
- **Hosting:** Cloudflare Pages (`d-be-recurrent` project) → auto-deploys from GitHub (`D-Be_recurrent` repo)
- **GitHub Repo**: `D-Be_recurrent` (D-Be_recurrent is one of multiple repos in this GitHub account)

---

## My Role & Responsibilities

I help with:
- ✅ Bug fixes and debugging
- ✅ Code refactoring and optimization
- ✅ Security improvements
- ✅ Feature development
- ✅ Documentation and architecture review

I should **always prioritize**:
1. Zero disruption to active users
2. Safety over speed
3. Clear communication about changes
4. Testing before deployment

---

## Key Principles for This Project

### 🔴 NEVER Do These

- **Force push** to main/master
- **Delete branches** without asking
- **Commit sensitive files** (.env.local, API keys, credentials)
- **Make destructive changes** without user approval
- **Deploy without testing** changes locally
- **Modify Firestore structure** without migration plan
- **Change auth logic** without careful review

### 🟡 Always Ask First

When uncertain about:
- Modifying Firestore rules or schema
- Changing authentication flow
- Breaking changes to data structures
- Large refactors affecting multiple components
- Anything that could impact active users

### 🟢 Safe to Do Independently

- Component refactoring (same functionality)
- Bug fixes in isolated areas
- Adding error handling
- Code splitting / optimization
- Documentation updates
- Security hardening (credentials, validation)

---

## How to Approach Work

### 1. **Understand the Current State**
```
Before making changes:
□ Read relevant documentation (docs/ARCHITECTURE.md)
□ Check existing code patterns
□ Understand data flow for the feature
□ Identify all affected files
□ Check git history for context
```

### 2. **Plan Before Implementation**
```
For non-trivial changes:
□ Use EnterPlanMode to design approach
□ Identify all files that need changes
□ Trace data flow to understand impact
□ Consider backwards compatibility
□ Plan rollback strategy
```

### 3. **Implement Safely**
```
During implementation:
□ Make code changes to one area at a time
□ Test each section before moving on
□ Run type checking (TypeScript)
□ Verify no new errors introduced
□ Keep changes focused and minimal
```

### 4. **Test Thoroughly**
```
Before committing:
□ Verify local build works: npm run build
□ Check TypeScript: npm run lint
□ Manually test affected features
□ Check console for errors/warnings
□ Verify no data loss
□ Test with different user roles (student/admin)
```

### 5. **Commit to Dev Branch (Testing)**
```
Always commit to dev branch first:
□ Create descriptive commit message
□ In GitHub Desktop: Ensure you're on 'dev' branch
□ Commit changes
□ Push to GitHub (origin dev)
□ Verify Cloudflare preview build succeeds
□ Test on preview: https://dev.d-be-recurrent.pages.dev
□ Verify changes work correctly with active users unaffected
□ Check browser console for errors
```

### 6. **Merge to Main (Production Only)**
```
When dev is tested and ready:
□ Create Pull Request: dev → main (in GitHub)
□ Add description of changes
□ Merge PR in GitHub
□ Cloudflare auto-builds main branch
□ Monitor production for issues
□ Be ready to rollback if needed
```

---

## Project Structure & Key Files

### Deployment Folder (`/learning-platform/`)
**These files are deployed to production:**
- Components (App.tsx, components/*.tsx)
- Configuration (firebase.ts, types.ts, constants.ts)
- Build config (vite.config.ts, package.json, tsconfig.json)
- Security (firestore.rules)
- Data (src/data/curriculum.json)

### Reference Folder (`/docs/`)
**These are NOT deployed - for reference only:**
- **ARCHITECTURE.md** - System design, data flow, file breakdown
- **ENVIRONMENT_SETUP.md** - How to set up environment variables

### Root Level
- **CLAUDE.md** (this file) - My working guidelines
- **package.json** - Dependencies and scripts
- **.gitignore** - What not to commit (includes .env.local)
- **.env.example** - Template for environment variables
- **.env.local** - Local-only credentials (never committed)

---

## File Modification Map

When user asks to change something, I should:

1. **"Change login flow"** → Edit `components/Login.tsx`
2. **"Modify quiz scoring"** → Edit `components/TopicDetail.tsx` 
3. **"Add admin feature"** → Edit `components/AdminBuilder.tsx`
4. **"Change user data structure"** → Edit `types.ts` first, then affected components
5. **"Update security"** → Edit `firestore.rules`
6. **"Fix video player"** → Edit `components/VideoPlayer.tsx`
7. **"Modify landing page"** → Edit `App.tsx` (landingConfig section)
8. **"Change styling"** → Edit Tailwind classes in component files

For detailed reference → Check `docs/ARCHITECTURE.md`

---

## Git Workflow & Branching Strategy

### 🔄 Branch Structure

```
main          ← Production (30 active users, stable code only)
  ↑
  └─ Pull Request (manual merge after testing)
  
dev           ← Testing/Staging (auto-deploys to preview)
  ↑
  └─ Commits (all feature work happens here)
```

### ✅ Commit Flow (Always Dev First)

**Step 1: Make Changes Locally**
```bash
cd C:\Users\korbi\Documents\GitHub\D-Be_recurrent
# Edit files in learning-platform/
```

**Step 2: Verify You're on Dev Branch**
```
In GitHub Desktop:
- Top left shows current branch
- Click "Current Branch" tab
- Make sure "dev" is selected
- If on main, click "dev" to switch
```

**Step 3: Commit to Dev**
```
In GitHub Desktop:
□ Review changes
□ Write descriptive commit message
□ Click "Commit to dev" (not main!)
□ Click "Push origin"
```

**Step 4: Test on Preview**
```
Preview URL (no need to visit Cloudflare):
https://dev.d-be-recurrent.pages.dev

Wait ~2-3 minutes for Cloudflare to build, then visit this URL
Test your changes with the live app
```

**Step 5: Merge to Main (Manual)**
```
When confident everything works:
1. Go to GitHub.com → D-Be_recurrent repo
2. Click "Pull requests"
3. Click "New Pull Request"
4. Base: main, Compare: dev
5. Add description of changes
6. Click "Create Pull Request"
7. Click "Merge pull request"
8. Cloudflare auto-deploys to production
9. Monitor users for issues
```

### 🚨 Critical Rules

- ❌ **NEVER commit directly to main**
- ❌ **NEVER force push** to any branch
- ✅ **Always commit to dev first**
- ✅ **Always test on preview URL before merging**
- ✅ **Only merge to main after confirming changes work**

### 🔗 Quick Preview URL

**Format:**
```
https://dev.d-be-recurrent.pages.dev
```

**No need to visit Cloudflare!** This is predictable:
- Branch: `dev`
- Project: `d-be-recurrent`
- URL: `https://{branch}.{project}.pages.dev`

**If you push to dev and wait 2-3 minutes, visit this URL directly to test.**

### 📋 Verify Branch Before Committing

Quick check in GitHub Desktop:
```
Top left: "Current Branch"
  ↓
Shows "dev" ✅
OR
Shows "main" ❌ (SWITCH TO DEV!)
```

---

## Common Workflows

### 🐛 Fixing a Bug
1. Ensure you're on **dev** branch
2. Reproduce locally if possible
3. Identify exact file/function causing issue
4. Make minimal fix
5. Test locally: `cd learning-platform && npm run dev`
6. Commit to dev with clear message
7. Test on preview: `https://dev.d-be-recurrent.pages.dev`
8. If verified, create PR to merge dev → main
9. Monitor production after merge

### ✨ Adding a Feature
1. Ensure you're on **dev** branch
2. Use EnterPlanMode to design
3. Update types.ts if new data needed
4. Create/modify components
5. Add Firestore rules if data storage needed
6. Test all code paths locally
7. Document in ARCHITECTURE.md if complex
8. Commit to dev with descriptive message
9. Test on preview: `https://dev.d-be-recurrent.pages.dev`
10. Create PR to merge dev → main when confident

### 🔐 Improving Security
1. Ensure you're on **dev** branch
2. Identify vulnerability
3. Plan fix that won't break existing functionality
4. Update firestore.rules or code
5. Test permissions still work correctly
6. Commit to dev with security detail
7. Test thoroughly on preview before merging
8. Merge to main with caution and monitoring

### ♻️ Refactoring Code
1. Ensure you're on **dev** branch
2. Plan scope (which files affected)
3. Keep functionality identical
4. Run full test of feature after
5. Commit separately from other changes
6. Test on preview thoroughly
7. Merge to main during low-traffic time

---

## Communication Guidelines

### With the User

When reporting issues:
- **Be specific:** "Login button in Login.tsx line 45 not responding"
- **Include context:** "Happens when user enters invalid email"
- **Offer solutions:** "Recommend adding email validation in handleAuth()"

When requesting approval:
- **Use EnterPlanMode** for major changes
- **Be clear about impact:** "This affects 3 files, changes data flow"
- **Give options:** "Option A: quick fix, Option B: better long-term"

When reporting success:
- **Be concise:** Avoid long summaries
- **Focus on impact:** "Fixed auth bug, verified with test login"
- **Next steps:** "Ready to deploy or need feedback?"

### Commit Messages

Format: `[Type] Brief description`

```
✅ Good examples:
- "Fix: Firebase credential loading from .env.local"
- "Feat: Add email validation in login form"
- "Refactor: Split App.tsx components"
- "Docs: Update architecture guide"
- "Security: Add input sanitization"

❌ Bad examples:
- "Fixed stuff"
- "Update files"
- "Work in progress"
```

---

## Decision Making

### When to Ask vs. When to Act

**Ask the user first:**
- Changes to Firestore structure
- Changes to auth logic
- Anything affecting data persistence
- Breaking changes
- "Is this the right approach?" questions

**Can do independently:**
- Bug fixes in isolated components
- Code refactoring (same behavior)
- Performance optimization
- Error handling improvements
- Documentation updates
- Type safety improvements

**Use EnterPlanMode for:**
- Architectural decisions
- Multi-file refactors
- Feature design questions
- "Should I do A or B?" decisions

---

## Debugging Process

When something breaks:

1. **Identify the symptom**
   - What doesn't work? Where? When?

2. **Check recent changes**
   - `git log --oneline` - what changed?
   - `git diff` - what was modified?

3. **Trace the code path**
   - Read relevant files
   - Check console for errors
   - Use React DevTools if UI issue

4. **Check dependencies**
   - Is Firebase initialized?
   - Are environment variables set?
   - Is .env.local present?

5. **Test the fix**
   - Verify locally with `npm run dev`
   - Test multiple scenarios
   - Check for side effects

6. **Document the fix**
   - Clear commit message
   - If complex, add comment in code

---

## Before Deployment Checklist

```
Code Quality:
□ No TypeScript errors
□ No console errors/warnings
□ No unused imports/variables
□ Follows existing code style
□ Comments on complex logic

Testing:
□ Feature works locally
□ Related features still work
□ Different user roles tested
□ Edge cases handled

Security:
□ No hardcoded credentials
□ Input validation in place
□ Firebase rules checked
□ No secrets in commit

Documentation:
□ ARCHITECTURE.md updated if needed
□ Complex logic commented
□ Commit message is clear
```

---

## Important Files Reference

| File | Purpose | Edit When |
|------|---------|-----------|
| `App.tsx` | Main app logic, routing, state | Change core behavior, add views |
| `types.ts` | Data structures | Modify data schema |
| `firebase.ts` | Firebase setup | Change Firebase config loading |
| `firestore.rules` | Security rules | Update permissions or validation |
| `components/*.tsx` | UI components | Change appearance or interaction |
| `.env.example` | Env var template | Add new environment variables |
| `.gitignore` | What not to commit | Prevent credential exposure |
| `docs/ARCHITECTURE.md` | System design reference | Update for major changes |
| `vite.config.ts` | Build config | Change build output or settings |

---

## Quick Reference

### Environment Variables
**All start with `VITE_` to be exposed to browser:**
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_BOOTSTRAP_ADMIN_EMAIL`
- (See .env.example for all)

### Key Data Types
Check `types.ts` for:
- `User` - Student/Admin user object
- `Topic` - Main curriculum topic
- `SubTopic` - Individual lesson
- `QuizAttempt` - Quiz submission
- `ExerciseSubmission` - Exercise upload

### Component Hierarchy
```
App.tsx (root)
├── Login.tsx (auth)
├── TopicGraph.tsx (main view - graph)
├── ModuleList.tsx (list view)
├── TopicDetail.tsx (lesson view)
│   ├── VideoPlayer.tsx
│   └── (comments, quiz, exercises)
└── AdminBuilder.tsx (admin dashboard)
```

### Firebase Collections
```
/users/{userId} - User profiles
/topics/{topicId} - Curriculum
/submissions/{id} - Homework submissions
/comments/{subTopicId} - Discussion
/notifications/{id} - User notifications
```

---

## Success Criteria

A change is successful when:
- ✅ Solves the stated problem
- ✅ Doesn't break existing features
- ✅ Doesn't affect active users negatively
- ✅ Code is clean and maintainable
- ✅ Changes are documented
- ✅ User understands what changed and why

---

## Getting Help

If stuck:
1. Check `docs/ARCHITECTURE.md` for system overview
2. Search code for similar patterns
3. Check git history with `git log --grep="keyword"`
4. Ask the user with specific context
5. Don't guess - verify or ask

---

## Updates to This Document

This CLAUDE.md should be updated when:
- Project structure changes
- New workflows become standard
- Better practices discovered
- User preferences change
- Major refactoring completes

**The user maintains this file** - I follow it and suggest updates if needed.
