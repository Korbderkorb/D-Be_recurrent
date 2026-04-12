# Learning Platform - Software Architecture

## Overview

This is a **React + Firebase learning platform** where students learn through modules (topics containing subtopics), complete quizzes and exercises, and receive feedback from instructors. Admins manage curriculum and view student analytics.

**Stack:**
- **Frontend:** React 19 + TypeScript + Tailwind CSS
- **Backend:** Firebase (Auth, Firestore, Storage)
- **Build:** Vite
- **Hosting:** Cloudflare Pages

---

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Learning Platform                         │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                  App.tsx (Core)                       │   │
│  │  - Main state management                             │   │
│  │  - Route handling (LOGIN → HOME → TOPIC)             │   │
│  │  - User session management                           │   │
│  └──────────────────────────────────────────────────────┘   │
│                           │                                   │
│           ┌───────────────┼───────────────┐                  │
│           │               │               │                  │
│      ┌────▼────┐  ┌──────▼──────┐  ┌────▼────┐              │
│      │  Login  │  │ TopicGraph  │  │ TopicDe-│              │
│      │Component│  │  Component  │  │ tail    │              │
│      └─────────┘  │             │  │Component│              │
│                   │ - D3 visual │  │         │              │
│                   │ - Node edges│  │ - Video │              │
│                   │ - Progress  │  │ - Quiz  │              │
│                   │   tracking  │  │ - Upload│              │
│                   └─────────────┘  └────┬────┘              │
│                                         │                    │
│                    ┌────────────────────┼──────────┐         │
│                    │                    │          │         │
│              ┌─────▼──────┐      ┌─────▼────┐  ┌─▼─────┐   │
│              │  ModuleList │      │ AdminBui-│  │ Video │   │
│              │  Component  │      │lder      │  │Player │   │
│              │             │      │Component │  │       │   │
│              │ - Tree view │      │          │  │ - Norm│   │
│              │ - Progress  │      │ - CRUD   │  │alize │   │
│              │   stats     │      │ - Create │  │ URLs  │   │
│              └─────────────┘      │ - Delete │  └───────┘   │
│                                   │ - Upload │              │
│                                   │ - Analytics            │
│                                   └──────────┘              │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                 firebase.ts                           │   │
│  │  - Auth initialization                              │   │
│  │  - Firestore/Storage exports                        │   │
│  │  - Environment variable loading                     │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
    ┌───▼────┐        ┌───▼────┐       ┌──▼──┐
    │Firebase │        │ Firestore     │Cloud│
    │ Auth    │        │ Database      │Storage
    │         │        │              │      │
    │- Login  │        │Collections:   │Images│
    │- Sign up│        │ - users       │Videos│
    │- Logout │        │ - topics      │PDFs  │
    └─────────┘        │ - submissions │      │
                       │ - comments    └──────┘
                       │ - notifications
                       └────────┘
```

---

## File Breakdown: What Does What?

### 🎯 Core Application Files

| File | Responsibility | Key Changes |
|------|-----------------|-------------|
| **App.tsx** (2,949 lines) | Main component managing entire app state, routing, user session | - Authentication flow<br>- View switching (LOGIN/HOME/TOPIC)<br>- Global state (currentUser, topics, submissions)<br>- Event handlers for all features<br>⚠️ **TODO:** Split into smaller components |
| **index.tsx** | React app entry point | Mounts App.tsx to #root |
| **firebase.ts** | Firebase initialization & exports | - Loads config from .env.local<br>- Exports: auth, db, storage<br>- Validates environment variables |

---

### 📦 Component Files

| File | Responsibility | What to Change |
|------|-----------------|-----------------|
| **Login.tsx** | Authentication UI | Login form → Change auth logic here<br>User registration → Modify signup flow<br>Error messages → Update text in try/catch blocks |
| **TopicGraph.tsx** | Knowledge graph visualization | D3 graph rendering → Modify node positions, spacing, colors<br>Edge connectors → Change line styling<br>Teacher filtering → Update teacher list logic<br>Topic click handlers → Change topic selection |
| **ModuleList.tsx** | List view of all topics | Curriculum list view → Modify sorting, filtering<br>Progress bars → Change calculation logic<br>Topic expansion → Modify UI state management |
| **TopicDetail.tsx** | Single topic/subtopic view | Module content display → Change layout<br>Video player → Update video integration<br>Comments section → Modify comment UI<br>Quiz/Exercise UI → Change form layouts<br>Completion status → Update progress tracking |
| **VideoPlayer.tsx** | Video embedding & URL normalization | Video URLs → Modify URL parsing logic<br>Embed parameters → Change player settings<br>Supported platforms → Add new video sources (YouTube, Vimeo)<br>Error states → Change placeholder UI |
| **AdminBuilder.tsx** | Admin dashboard & content management | Admin CRUD → Change form fields<br>Analytics dashboard → Modify charts & data<br>Submission review → Change grading UI<br>Notifications → Modify notification display<br>Student management → Change admin controls |

---

### 📋 Configuration & Data Files

| File | Responsibility | What to Change |
|------|-----------------|-----------------|
| **types.ts** | TypeScript interfaces for all data | Data structure → Add/remove fields<br>User roles → Add new roles<br>Quiz types → Modify question structure<br>Exercise config → Change submission requirements |
| **constants.ts** | Hardcoded values & utilities | Placeholder URLs → Update media root paths<br>API endpoints → Not used, but would go here |
| **firebase-blueprint.json** | Firebase data structure reference | Database schema documentation |
| **firestore.rules** | Firebase security rules | Access control → Modify read/write rules<br>User permissions → Change role-based access<br>Data validation → Update validation checks |
| **vite.config.ts** | Build configuration | Build settings → Change port, build output<br>Environment variables → Add new VITE_* vars<br>Aliases → Modify @/ path alias |
| **.env.example** | Environment variables template | Add new variables → Document in this file |
| **.env.local** | Environment variables (local) | Firebase credentials → Set actual values here |
| **package.json** | Dependencies & scripts | Add packages → `npm install <package>`<br>Scripts → Add npm commands |
| **tsconfig.json** | TypeScript configuration | Type checking rules → Modify compiler options |

---

## Data Flow: How Data Moves Through the App

### 1. **User Login Flow**
```
User enters credentials
        ↓
Login.tsx → handleAuth()
        ↓
Firebase Auth.signInWithEmailAndPassword()
        ↓
Firestore: fetch user doc from /users/{userId}
        ↓
App.tsx: onAuthStateChanged() triggered
        ↓
Update currentUser state
        ↓
Redirect to HOME view
```

### 2. **Loading Topics & Progress**
```
App.tsx mounts
        ↓
Load initial curriculum from src/data/curriculum.json
        ↓
Firestore: fetch /topics collection
        ↓
Firestore: fetch user's /progress/{userId}
        ↓
Set completedSubTopics Set (for quick lookup)
        ↓
Pass topics & completed status to child components
```

### 3. **Viewing a Topic**
```
TopicGraph shows nodes
        ↓
User clicks topic node
        ↓
TopicGraph.onSelectTopic()
        ↓
App.tsx: setCurrentTopic()
        ↓
Switch to TOPIC view
        ↓
Render TopicDetail with topic data
        ↓
TopicDetail loads comments from Firestore
        ↓
Display video, description, exercises
```

### 4. **Quiz Submission**
```
User completes quiz in TopicDetail
        ↓
TopicDetail.onSubmitExercise() called
        ↓
Create QuizAttempt object with answers
        ↓
Check answers against correctAnswers
        ↓
Calculate score & store in user's quizAttempts
        ↓
Update user doc in Firestore
        ↓
Mark subtopic as completed
        ↓
Firestore: update completedSubTopics
        ↓
UI updates with completion badge
```

### 5. **Exercise Upload**
```
User uploads file in TopicDetail
        ↓
TopicDetail: validateFile() checks type & size
        ↓
Firebase Storage: uploadBytesResumable()
        ↓
Get download URL from Storage
        ↓
Firestore: create doc in /submissions
        ↓
Create notification for admin
        ↓
Show "Submission Received" message
```

---

## Firestore Data Structure

### Collections & Document Structure

```
/users/{userId}
  ├─ email: string
  ├─ name: string
  ├─ role: 'admin' | 'student'
  ├─ avatar: string
  ├─ status: 'active' | 'pending'
  ├─ allowedTopics: string[] (topic IDs)
  ├─ completedSubTopics: CompletionRecord[]
  ├─ quizAttempts: QuizAttempt[]
  └─ stats: UserStats

/topics/{topicId}
  ├─ title: string
  ├─ shortDescription: string
  ├─ level: 1-10
  ├─ color: string
  ├─ imageUrl: string
  ├─ relatedTopics: string[] (topic IDs)
  ├─ teacher: Teacher object
  └─ subTopics: SubTopic[]
    ├─ id: string
    ├─ type: 'VIDEO' | 'EXERCISE_QUIZ' | 'EXERCISE_UPLOAD'
    ├─ title: string
    ├─ videoUrl: string
    ├─ quizQuestions: QuizQuestion[]
    └─ comments: Comment[]

/submissions/{submissionId}
  ├─ userId: string
  ├─ userName: string
  ├─ subTopicId: string
  ├─ topicId: string
  ├─ files: File[]
  ├─ timestamp: string
  ├─ status: 'pending' | 'reviewed' | 'rejected'
  ├─ feedback: string
  └─ grade: number | string

/comments/{subTopicId}
  └─ comments: Comment[]
    ├─ id: string
    ├─ userId: string
    ├─ user: string
    ├─ text: string
    ├─ timestamp: string
    └─ replies: Comment[]

/notifications/{notificationId}
  ├─ userId: string
  ├─ type: 'EXERCISE_SUBMISSION' | 'DEADLINE_WARNING' | 'SUBMISSION_COMMENT'
  ├─ submissionId: string
  ├─ read: boolean
  └─ timestamp: string
```

---

## How to Modify Specific Features

### 🎨 Change the Look/Style

**Files to modify:**
- Tailwind classes in component files (className attributes)
- `index.html` for global styles
- Component background/text colors in conditional themes

**Example:** Change topic card colors in TopicGraph
```typescript
// TopicGraph.tsx - Find the topic node rendering
// Modify className with Tailwind colors
```

---

### 📝 Add a New Quiz Question Type

**Files to modify:**
1. **types.ts** - Add to `QuizQuestion` interface
2. **TopicDetail.tsx** - Add new form input for question type
3. **AdminBuilder.tsx** - Add editor for new question type
4. **firestore.rules** - Update validation rules if needed

---

### 👥 Add New User Role

**Files to modify:**
1. **types.ts** - Update `User.role` enum
2. **firestore.rules** - Add permission checks for new role
3. **App.tsx** - Add role-specific view or menu items
4. **Login.tsx** - Update role assignment logic

---

### 📊 Add New Analytics Chart

**Files to modify:**
1. **AdminBuilder.tsx** - Add new chart in StudentAnalyticsView
2. **types.ts** - If new data structure needed
3. **recharts imports** - Already has Bar, Line, Radar, etc.

---

### 💾 Change Submission File Handling

**Files to modify:**
1. **types.ts** - Modify `ExerciseConfig` and file limits
2. **TopicDetail.tsx** - Update validateFile() function
3. **firestore.rules** - Update file size validation
4. **AdminBuilder.tsx** - Update file preview/download

---

### 🔐 Change Security Permissions

**Files to modify:**
1. **firestore.rules** - Primary file for all security
2. **Login.tsx** - If bootstrap admin logic needs change
3. **AdminBuilder.tsx** - If admin features need restriction

---

## Key Technologies & Libraries

| Library | Usage | File Location |
|---------|-------|----------------|
| **React 19** | UI framework | All .tsx files |
| **TypeScript** | Type safety | All .ts/.tsx files |
| **Tailwind CSS** | Styling | className attributes |
| **Vite** | Build tool | vite.config.ts |
| **Firebase Auth** | User authentication | firebase.ts, Login.tsx |
| **Firestore** | Database | firebase.ts, App.tsx |
| **Cloud Storage** | File uploads | firebase.ts, TopicDetail.tsx |
| **D3.js** | Graph visualization | TopicGraph.tsx |
| **Recharts** | Analytics charts | AdminBuilder.tsx |
| **Motion** | Animations | App.tsx, all components |
| **React Joyride** | Tutorial overlays | App.tsx, TopicDetail.tsx |

---

## Common Tasks & Where to Make Changes

| Task | Files to Edit | What to Change |
|------|---------------|-----------------|
| Add new field to user profile | types.ts, App.tsx, Login.tsx | Add interface property, form input, Firestore write |
| Change landing page content | App.tsx (landingConfig) | Update LandingConfig in loadLandingConfig() |
| Modify quiz scoring logic | TopicDetail.tsx | Edit score calculation in onSubmitExercise() |
| Change topic unlock/lock rules | App.tsx, TopicGraph.tsx | Modify getLockedTopicIds() logic |
| Add new video platform | VideoPlayer.tsx | Add URL normalization in embedUrl.useMemo() |
| Customize admin dashboard layout | AdminBuilder.tsx | Modify JSX layout and state management |
| Change notification types | types.ts, App.tsx | Add to AppNotification union type, create handlers |
| Update curriculum structure | src/data/curriculum.json | Modify JSON or change loading in App.tsx |
| Add new comment features | TopicDetail.tsx, types.ts | Extend Comment interface, add handlers |
| Modify theme colors | index.html, components | Change Tailwind color classes |

---

## Performance Optimization Tips

1. **App.tsx is too large (2,949 lines)** → Split into smaller components
2. **Code splitting** → Use React.lazy() for admin routes
3. **Memoization** → useMemo() already used for charts, expand to more
4. **Lazy loading** → Images and videos don't need to load immediately
5. **Remove unused code** → Audit imports, remove unused functions

---

## Security Checklist

- ✅ Firebase credentials in .env.local (not committed)
- ✅ Firestore rules restrict unauthenticated access
- ✅ Bootstrap admin email protected in env var
- ✅ File upload validation on client & server
- ✅ Comments sanitized (no XSS)
- ⚠️ TODO: Add error boundaries for crash protection

---

## Maintenance Guide

### Adding a New Feature
1. Define TypeScript types in `types.ts`
2. Create or update component in `components/`
3. Add state management in `App.tsx`
4. Add Firestore collection & rules in `firestore.rules`
5. Test locally with `npm run dev`
6. Deploy and monitor

### Deploying Changes
1. Test locally: `npm run dev`
2. Build: `npm run build`
3. Push to GitHub
4. Cloudflare auto-deploys
5. Monitor for errors (check browser console)

### Debugging
- Check browser console for errors
- Use Firebase Console for data inspection
- Check Firestore rules violations in logs
- Use React DevTools for state debugging

---

## Future Improvements

1. **Split App.tsx** into:
   - StudentApp.tsx
   - AdminApp.tsx
   - SharedComponents/

2. **Add error boundaries**
   - Prevent full app crashes
   - Better error messages

3. **Code splitting**
   - Lazy load admin routes
   - Faster initial load

4. **Database indexing**
   - Optimize Firestore queries
   - Better performance at scale

5. **Internationalization**
   - Support multiple languages
   - Based on LandingConfig pattern
