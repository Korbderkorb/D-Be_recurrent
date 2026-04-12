# UniTech Learning Platform

A modern, interactive learning platform built with React and Firebase that enables instructors to create structured curricula and students to learn through videos, quizzes, and hands-on exercises.

## Features

### 📚 For Students
- **Knowledge Graph Visualization** - Interactive visual representation of course structure with dependencies and prerequisites
- **Curriculum Progress Tracking** - See your progress across all topics and modules
- **Video Lessons** - Watch curated video content with support for YouTube, Vimeo, and custom sources
- **Quizzes** - Multi-choice assessments with immediate feedback on quiz performance
- **Exercise Submissions** - Upload and submit coursework for instructor review and feedback
- **Discussion Comments** - Ask questions and engage with instructors and peers in comments sections
- **Learning Tour** - Guided walkthrough for first-time users
- **Theme Support** - Light and dark mode for comfortable learning

### 👨‍🏫 For Instructors
- **Content Management** - Create and organize topics, subtopics, and learning modules
- **Student Analytics** - Track student progress, performance metrics, and engagement
- **Submission Review** - Grade submissions and provide detailed feedback
- **Notification System** - Get notified of student submissions and activity
- **Class Management** - Manage user access and permissions
- **Progress Insights** - Detailed performance analytics including radar charts, progress bars, and trend analysis

### 🔒 Security & Access Control
- **Role-Based Access** - Admin and student roles with appropriate permissions
- **Pre-Approval System** - Instructors invite students before they can register
- **Firestore Security Rules** - Field-level access control and data validation
- **Secure File Handling** - Student uploads stored securely in Cloud Storage

## Tech Stack

- **Frontend**: React 19 + TypeScript
- **Styling**: Tailwind CSS
- **Build Tool**: Vite
- **Backend/Database**: Firebase
  - Authentication
  - Firestore (NoSQL database)
  - Cloud Storage
- **Visualization**: D3.js (knowledge graph), Recharts (analytics)
- **Hosting**: Cloudflare Pages

## Getting Started

### Prerequisites

- Node.js 16 or higher
- A Firebase project configured
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd learning-platform
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Firebase credentials**
   ```bash
   cp .env.example .env.local
   ```
   
   Fill in your Firebase project credentials in `.env.local`:
   ```
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
   VITE_BOOTSTRAP_ADMIN_EMAIL=admin@example.com
   ```

4. **Run locally**
   ```bash
   npm run dev
   ```
   
   Open your browser and navigate to `http://localhost:3000`

### Build for Production

```bash
npm run build
```

The built files are in the `dist/` directory.

## Project Structure

```
├── components/              # React components
│   ├── Login.tsx           # Authentication UI
│   ├── TopicGraph.tsx      # Knowledge graph visualization
│   ├── TopicDetail.tsx     # Course module view
│   ├── VideoPlayer.tsx     # Video embedding component
│   ├── ModuleList.tsx      # List view of curriculum
│   └── AdminBuilder.tsx    # Admin dashboard
├── src/
│   └── data/
│       └── curriculum.json # Initial curriculum data
├── App.tsx                 # Main application component
├── firebase.ts             # Firebase configuration
├── types.ts                # TypeScript type definitions
├── constants.ts            # Application constants
├── vite.config.ts          # Vite configuration
└── firestore.rules         # Firestore security rules
```

## User Roles

### Student
- View assigned topics and modules
- Complete lessons and submit work
- Take quizzes and view scores
- Participate in discussion comments
- Track personal progress

### Admin
- Create and edit topics and modules
- Upload and manage video content
- Review student submissions and provide feedback
- View comprehensive student analytics
- Manage user access and permissions

## Environment Variables

All environment variables must start with `VITE_` to be exposed to the browser.

| Variable | Description |
|----------|-------------|
| `VITE_FIREBASE_API_KEY` | Firebase API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase auth domain |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID |
| `VITE_FIREBASE_APP_ID` | Firebase app ID |
| `VITE_FIREBASE_MEASUREMENT_ID` | Firebase measurement ID |
| `VITE_BOOTSTRAP_ADMIN_EMAIL` | Email of the initial admin user |

## Deployment

The application is deployed on Cloudflare Pages (project: `d-be-recurrent`) and automatically deploys on every push to the main branch.

### Setting Up Production Environment

1. Go to Cloudflare Pages → `d-be-recurrent` project → **Settings**
2. Set environment variables under **Settings > Environment variables** (same as `.env.local`)
3. Set build configuration:
   - **Build command**: `cd learning-platform && npm run build`
   - **Output directory**: `learning-platform/dist`
4. Push code to GitHub
5. Cloudflare automatically builds and deploys

## Database Schema

### Collections

- **users** - User profiles and account information
- **topics** - Course topics and curriculum structure
- **submissions** - Student homework submissions
- **comments** - Discussion comments on modules
- **notifications** - User notifications for submissions and feedback
- **progress** - User progress tracking

## Scripts

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Type check with TypeScript
npm run lint
```

## Features in Detail

### Knowledge Graph
Interactive visual representation showing relationships between topics. Students can see prerequisites and dependencies, and the graph updates to show completion status.

### Video Support
Supports multiple video platforms:
- YouTube
- Vimeo
- Custom URLs

Videos are automatically normalized and embedded with appropriate player controls.

### Quiz System
- Multiple choice questions with single and multi-select options
- Immediate scoring and feedback
- Tracks quiz attempts and best scores
- Progress calculation based on quiz performance

### Exercise System
- File upload support with type and size validation
- Student-provided requirements (e.g., "Source code", "Documentation")
- Admin review and grading
- Feedback and resubmission support

### Comments & Discussion
- Nested replies to foster discussion
- Emoji reactions for engagement
- User avatars and timestamps
- Real-time updates

### Analytics Dashboard
Comprehensive analytics for admins including:
- Student progress tracking
- Performance metrics (scores, consistency, engagement)
- Radar charts showing skill development
- Submission status and grading progress

## Contributing

When contributing to this project:

1. Create a feature branch for your changes
2. Test locally with `npm run dev`
3. Ensure TypeScript has no errors: `npm run lint`
4. Create a descriptive commit message
5. Submit a pull request

## Support

For questions or issues, please contact the development team or open an issue in the repository.

## License

This project is proprietary and all rights are reserved.
