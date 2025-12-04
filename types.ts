
export interface Reaction {
  emoji: string;
  count: number;
  userReacted: boolean; // simple tracking for this session
}

export interface Comment {
  id: string;
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
  timestamp: string;
  answers: Record<string, number[]>; // questionId -> selected indices
  passed: boolean;
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
  // Quiz Specifics
  quizQuestions?: QuizQuestion[];
  
  // Builder Specific Optionals
  _subId?: string; 
  hasResources?: boolean;
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
  level: 1 | 2 | 3 | 4 | 5; 
  subTopics: SubTopic[];
  relatedTopics: string[]; // IDs of related topics for the graph
  teacher: Teacher;
  
  // Builder Specific Optionals
  teacherKey?: string;
  variableName?: string;
  subListVariableName?: string;
  _key?: string;
}

export enum ViewState {
  LOGIN = 'LOGIN',
  HOME = 'HOME',
  TOPIC = 'TOPIC',
  ADMIN_BUILDER = 'ADMIN_BUILDER'
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
  allowedTopics?: string[]; // IDs of allowed topics. If undefined/empty, allow all? Or assume strict.
  stats?: UserStats; // Mock stats for admin
}
