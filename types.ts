
export interface Reaction {
  emoji: string;
  count: number;
  userReacted: boolean; // simple tracking for this session
}

export interface Comment {
  id: string;
  userId: string;
  user: string;
  avatar: string;
  text: string;
  timestamp: string;
  reactions: Record<string, number>; // emoji -> count
  replies: Comment[];
}

export type SubTopicType = 'VIDEO' | 'EXERCISE_UPLOAD' | 'EXERCISE_QUIZ';

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswers: number[]; // Changed to array for multi-select
  multiSelect?: boolean;
}

export interface QuizAttempt {
  subTopicId: string;
  timestamp: string;
  answers: Record<string, number[]>; // questionId -> selected indices
  passed: boolean;
  score: number;
  total: number;
  timeTaken: number; // in seconds
  wrongAnswers: string[]; // question texts or IDs of wrong answers
}

export interface CompletionRecord {
  id: string;
  completedAt: string;
}

export interface ExerciseConfig {
  allowedFileTypes: string[]; // e.g. ['.pdf', '.zip', '.jpg']
  maxFiles: number;
  maxFileSizeMB: number;
}

export interface ExerciseSubmission {
  id: string;
  userId: string;
  userName: string;
  subTopicId: string;
  topicId: string;
  files: {
    name: string;
    url: string;
    size: number;
    type: string;
    requirementLabel?: string;
  }[];
  timestamp: string;
  status: 'pending' | 'reviewed' | 'rejected';
  feedback?: string;
  grade?: string | number;
  comments?: Comment[];
}

export interface SubTopic {
  id: string;
  type: SubTopicType;
  title: string;
  description: string;
  videoUrl?: string; // Path to local video: /media/[topic]/[subtopic]/video.mp4
  posterUrl?: string; // Path to local thumb: /media/[topic]/[subtopic]/thumb.jpg
  duration: string;
  comments: Comment[];
  // Resources
  resources?: {
    notesUrl?: string;  // Path to PDF
    sourceUrl?: string; // Path to ZIP
  };
  // Exercise Specifics
  exerciseImage?: string; 
  uploadRequirements?: string[]; // Labels for required upload fields
  exerciseConfig?: ExerciseConfig;
  // Quiz Specifics
  quizQuestions?: QuizQuestion[];
  
  // Builder Specific Optionals
  _subId?: string; 
  hasResources?: boolean;
  _isManualId?: boolean;
  _key?: string;
}

export interface Teacher {
  id: string;
  name: string;
  role: string;
  email: string;
  avatar: string;
  bio?: string; // Short description
}

export interface Topic {
  id: string;
  title: string;
  shortDescription: string;
  fullDescription: string;
  imageUrl: string;
  color: string;
  level: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10; 
  subTopics: SubTopic[];
  relatedTopics: string[]; // IDs of related topics for the graph
  teacher: Teacher;
  order?: number;
  
  // Builder Specific Optionals
  teacherKey?: string;
  variableName?: string;
  subListVariableName?: string;
  _isManualId?: boolean;
  _key?: string;
}

export interface LandingConfig {
  // Landing Page (Login)
  title: string;
  subtitle: string;
  description: string;
  tag: string;
  heroImage: string;
  quote: string;

  // Welcome Overlay
  welcomeTitle?: string;
  welcomeSubtitle?: string;
  welcomeDescription?: string;
  welcomeButtonText?: string;

  // Knowledge Graph Interface
  graphTitle?: string;
  graphSubtitle?: string;
  appLogoUrl?: string;

  // Browser Browser Metadata
  browserTitle?: string;
  faviconUrl?: string;

  // Interface Settings
  showTeachersTab?: boolean;
  showStudentAnalytics?: boolean;
  showStudentRadar?: boolean;
  showStudentBar?: boolean;
  showStudentLine?: boolean;
  showStudentScatter?: boolean;
  showStudentSubmissions?: boolean;

  // Login Page
  loginTitle?: string;
  loginSubtitle?: string;
  firstTimeLoginTitle?: string;
  firstTimeLoginSubtitle?: string;
}

export enum ViewState {
  LOGIN = 'LOGIN',
  HOME = 'HOME',
  TOPIC = 'TOPIC',
  ADMIN_BUILDER = 'ADMIN_BUILDER'
}

export interface Tag {
  id: string;
  name: string;
  description: string;
  color: string;
}

export interface UserStats {
  modulesCompleted: number;
  totalModules: number;
  lastActive: string;
  quizScores: { quizTitle: string; score: number }[];
}

export interface User {
  id: string;
  email: string;
  password?: string; // For mock auth
  name: string;
  avatar: string;
  role?: 'student' | 'admin';
  status?: 'pending' | 'active';
  tags?: string[];
  allowedTopics?: string[]; // IDs of allowed topics. If undefined/empty, allow all? Or assume strict.
  stats?: UserStats; // Mock stats for admin
  completedSubTopics?: CompletionRecord[];
  submittedExercises?: string[];
  quizAttempts?: QuizAttempt[];
  profileColor?: string;
  hasCompletedTour?: boolean;
  hasCompletedTopicTour?: boolean;
}

export interface Notification {
  id: string;
  userId: string;
  userName: string;
  topicId: string;
  subTopicId: string;
  topicTitle: string;
  subTopicTitle: string;
  submissionId: string;
  timestamp: string;
  read: boolean;
  evaluated?: boolean;
  completed?: boolean;
  grade?: number | string;
  feedback?: string;
  comments?: Comment[];
  lastCommentTimestamp?: string;
  hasNewComments?: boolean;
  targetUserId?: string; // 'admin' or a specific student userId
  deadlineNotificationSent?: boolean;
  type: 'EXERCISE_SUBMISSION' | 'DEADLINE_WARNING' | 'SUBMISSION_COMMENT';
  files: {
    name: string;
    url: string;
  }[];
}
