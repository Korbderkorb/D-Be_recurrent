
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db, storage } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, deleteDoc, onSnapshot, getDocFromServer, collection, getDocs, query, writeBatch, where, runTransaction, updateDoc } from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { MEDIA_ROOT } from './constants';
import initialCurriculum from './src/data/curriculum.json';
import { Topic, ViewState, User, Comment, QuizAttempt, Teacher, LandingConfig, CompletionRecord, Tag, ExerciseSubmission, Notification as AppNotification } from './types';
import TopicGraph from './components/TopicGraph';
import TopicDetail from './components/TopicDetail';
import Login from './components/Login';
import ModuleList from './components/ModuleList';
import AdminBuilder, { AnalyticsView, NotificationsView } from './components/AdminBuilder';
import Joyride, { Step, CallBackProps, STATUS } from 'react-joyride';
import { BookOpen, Layers, Search, LogOut, LayoutGrid, Network, ArrowRight, ArrowLeft, Edit3, Lock, AlertTriangle, GraduationCap, Bell, ChevronDown, User as UserIcon, X, CheckCircle2, History, RotateCcw, FileText, MessageCircle, Download, PlayCircle, Mail, Copy, Check, List, BarChart3, TrendingUp, Target, Award, Clock, MessageSquare, Send, Moon, Sun, Trash2 } from 'lucide-react';
import { 
  BarChart, Bar, LineChart, Line, RadarChart, Radar, 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, Area, AreaChart, 
  Scatter, ScatterChart, ZAxis, Cell 
} from 'recharts';

const tourSteps: Step[] = [
  {
    target: '#knowledge-graph',
    content: 'This is the knowledge graph. Finishing modules will unlock new modules in the path.',
    disableBeacon: true,
    placement: 'center',
    disableScrolling: true,
  },
  {
    target: '#recenter-button',
    content: 'Click here to recenter the graph if you get lost.',
    placement: 'auto',
    disableScrolling: true,
  },
  {
    target: '#tab-list',
    content: 'Switch to the progress view to see all modules in a list format.',
    placement: 'auto',
    disableScrolling: true,
  },
  {
    target: '#tab-teachers',
    content: 'View the instructors who created the content.',
    placement: 'auto',
    disableScrolling: true,
  },
  {
    target: '#tab-graph',
    content: 'Go back to the knowledge graph anytime.',
    placement: 'auto',
    disableScrolling: true,
  },
  {
    target: '#knowledge-graph',
    content: 'Click on any module node to enter and start learning.',
    placement: 'auto',
    disableScrolling: true,
  },
  {
    target: '#sidebar-nav',
    content: 'Select different tutorials within the module from this sidebar.',
    placement: 'right',
  },
  {
    target: '#video-player',
    content: 'Watch the tutorial video here.',
    placement: 'bottom',
  },
  {
    target: '#comments-section',
    content: 'Participate in the discussion or give feedback in the comments.',
    placement: 'top',
  },
  {
    target: '#complete-button',
    content: 'After finishing the module, mark it as complete here.',
    placement: 'left',
  },
  {
    target: '#progress-bar',
    content: 'Observe your progress updates here in the module view.',
    placement: 'bottom',
  },
  {
    target: '#progress-info',
    content: 'You can also see your global progress on the main dashboard.',
    placement: 'auto',
  },
  {
    target: '#restart-tour-button',
    content: 'You can re-watch this tutorial at any moment by clicking this button.',
    placement: 'auto',
    disableScrolling: true,
  },
];

const cleanObject = (obj: any): any => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(cleanObject);
  
  const newObj = { ...obj };
  Object.keys(newObj).forEach(key => {
    if (newObj[key] === undefined) {
      delete newObj[key];
    } else if (newObj[key] && typeof newObj[key] === 'object') {
      newObj[key] = cleanObject(newObj[key]);
    }
  });
  return newObj;
};

const TourTooltip = ({
  continuous,
  index,
  step,
  backProps,
  closeProps,
  primaryProps,
  skipProps,
  isLastStep,
  theme,
}: any) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={`border rounded-none p-5 shadow-2xl max-w-[320px] font-mono text-xs relative overflow-hidden group transition-colors duration-300 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-800'}`}
    >
      {/* Technical background pattern */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(#3b82f6 1px, transparent 1px)', backgroundSize: '12px 12px' }} />
      
      {/* Scanning line animation */}
      <div className="absolute top-0 left-0 w-full h-[1px] bg-blue-500/30 animate-[scan_3s_linear_infinite] pointer-events-none" />

      {/* Decorative corner lines */}
      <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-blue-500/40 rounded-tl-sm" />
      <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-blue-500/40 rounded-tr-sm" />
      <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-blue-500/40 rounded-bl-sm" />
      <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-blue-500/40 rounded-br-sm" />

      <div className="absolute top-0 left-0 w-full h-1 bg-blue-600/10">
        <motion.div 
          className="h-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" 
          initial={{ width: 0 }}
          animate={{ width: `${((index + 1) / tourSteps.length) * 100}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>
      
      <div className={`flex justify-between items-center mb-4 border-b pb-2 mt-2 relative ${theme === 'dark' ? 'border-slate-800' : 'border-slate-100'}`}>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
          <span className="text-blue-400 font-bold uppercase tracking-widest text-[10px]">GUIDE_SYS // STEP_{index + 1}</span>
        </div>
        <button {...skipProps} className={`transition-colors uppercase text-[10px] font-bold tracking-tighter ${theme === 'dark' ? 'text-slate-500 hover:text-red-400' : 'text-slate-400 hover:text-red-500'}`}>
          [ Terminate ]
        </button>
      </div>
      
      <AnimatePresence mode="wait">
        <motion.div 
          key={index}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          transition={{ duration: 0.2 }}
          className={`mb-6 leading-relaxed text-sm relative min-h-[3em] ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}
        >
          <span className="text-blue-500/50 mr-1 font-bold">{'>'}</span>
          {step.content}
        </motion.div>
      </AnimatePresence>
      
      <div className="flex justify-between items-center gap-3 relative">
        {index > 0 && (
          <button {...backProps} className={`px-4 py-2 border rounded-lg transition-all uppercase font-bold tracking-tighter flex items-center gap-2 ${theme === 'dark' ? 'border-slate-800 text-slate-500 hover:text-white hover:bg-slate-800' : 'border-slate-200 text-slate-400 hover:text-slate-900 hover:bg-slate-50'}`}>
            <ArrowLeft className="w-3 h-3" /> Prev
          </button>
        )}
        <button {...primaryProps} className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition-all shadow-lg shadow-blue-900/20 uppercase tracking-tighter flex items-center justify-center gap-2 group/btn">
          {isLastStep ? 'Finalize_Sequence' : 'Proceed_Next'}
          <ArrowRight className="w-3 h-3 group-hover/btn:translate-x-1 transition-transform" />
        </button>
      </div>
    </motion.div>
  );
};

// ===============================================================
// STUDENT ANALYTICS VIEW
// ===============================================================
function StudentAnalyticsView({ user, currentUser, topics, landingConfig, submissions, onPostSubmissionComment, onDeleteComment, initialTab = 'OVERVIEW', theme = 'dark' }: { 
  user: User, 
  currentUser: User | null,
  topics: Topic[], 
  landingConfig: LandingConfig,
  submissions: ExerciseSubmission[],
  onPostSubmissionComment: (id: string, text: string, isSubmission?: boolean) => Promise<void>,
  onDeleteComment?: (submissionId: string, commentId: string, isSubmission: boolean) => Promise<void>,
  initialTab?: 'OVERVIEW' | 'SUBMISSIONS',
  theme?: 'light' | 'dark'
}) {
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'SUBMISSIONS'>(initialTab);
  
  // Update activeTab if initialTab changes
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});

  const performanceData = useMemo(() => {
    const totalSubTopics = topics.reduce((acc, t) => acc + t.subTopics.length, 0) || 1;
    const completed = (user.completedSubTopics || []).length;
    const quizAttempts = user.quizAttempts || [];
    
    const avgScore = quizAttempts.length > 0 
      ? Math.round(quizAttempts.reduce((acc, a) => acc + (a.score / a.total), 0) / quizAttempts.length * 100)
      : 0;

    const uniqueDays = new Set((user.completedSubTopics || []).map(c => c.completedAt?.split('T')[0])).size;
    const consistency = Math.min(100, (uniqueDays / 7) * 100);
    const engagement = Math.min(100, (quizAttempts.length / totalSubTopics) * 100);
    const avgTime = quizAttempts.length > 0 
      ? quizAttempts.reduce((acc, a) => acc + a.timeTaken, 0) / quizAttempts.length
      : 0;
    const speed = avgTime > 0 ? Math.max(0, 100 - (avgTime / 240) * 100) : 0;

    return [
      { subject: 'Progress', A: Math.round((completed / totalSubTopics) * 100), fullMark: 100 },
      { subject: 'Score', A: avgScore, fullMark: 100 },
      { subject: 'Consistency', A: Math.round(consistency), fullMark: 100 },
      { subject: 'Engagement', A: Math.round(engagement), fullMark: 100 },
      { subject: 'Speed', A: Math.round(speed), fullMark: 100 },
    ];
  }, [user, topics]);

  const moduleProgressData = useMemo(() => {
    return topics.map(t => {
      const completed = t.subTopics.filter(st => 
        (user.completedSubTopics || []).some(c => c.id === st.id)
      ).length;
      return {
        name: t.title,
        completed,
        total: t.subTopics.length,
        percentage: Math.round((completed / t.subTopics.length) * 100)
      };
    });
  }, [user, topics]);

  const timelineData = useMemo(() => {
    const events: any[] = [];
    (user.completedSubTopics || []).forEach(c => {
      events.push({
        date: c.completedAt?.split('T')[0],
        type: 'completion',
        val: 1
      });
    });
    (user.quizAttempts || []).forEach(a => {
      events.push({
        date: a.timestamp.split('T')[0],
        type: 'quiz',
        score: Math.round((a.score / a.total) * 100)
      });
    });

    const sortedDates = [...new Set(events.map(e => e.date))].sort();
    let cumulativeProgress = 0;
    const totalSubTopics = topics.reduce((acc, t) => acc + t.subTopics.length, 0) || 1;

    return sortedDates.map(date => {
      const dayEvents = events.filter(e => e.date === date);
      const completions = dayEvents.filter(e => e.type === 'completion').length;
      cumulativeProgress += completions;
      const dayQuizzes = dayEvents.filter(e => e.type === 'quiz');
      const avgScore = dayQuizzes.length > 0 
        ? Math.round(dayQuizzes.reduce((acc, q) => acc + q.score, 0) / dayQuizzes.length)
        : null;

      return {
        date,
        progress: Math.round((cumulativeProgress / totalSubTopics) * 100),
        score: avgScore
      };
    });
  }, [user, topics]);

  const scatterData = useMemo(() => {
    return (user.quizAttempts || []).map(a => ({
      time: Math.round(a.timeTaken / 60 * 10) / 10,
      score: Math.round((a.score / a.total) * 100),
      name: topics.flatMap(t => t.subTopics).find(st => st.id === a.subTopicId)?.title || 'Unknown'
    }));
  }, [user, topics]);

  return (
    <div className={`p-4 sm:p-8 max-w-7xl mx-auto space-y-8 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className={`text-3xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Personal Analytics</h2>
          <p className={theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}>Track your learning journey and performance metrics.</p>
        </div>
        <div className="flex gap-4">
          {landingConfig.showStudentSubmissions !== false && (
            <div className={`flex rounded-2xl p-1 border ${theme === 'dark' ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
              <button 
                onClick={() => setActiveTab('OVERVIEW')}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'OVERVIEW' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : theme === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}
              >
                Overview
              </button>
              <button 
                onClick={() => setActiveTab('SUBMISSIONS')}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'SUBMISSIONS' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : theme === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}
              >
                Submissions
              </button>
            </div>
          )}
          <div className={`rounded-2xl p-4 flex items-center gap-4 border ${theme === 'dark' ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
            <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center text-blue-400">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Overall Progress</div>
              <div className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{performanceData[0].A}%</div>
            </div>
          </div>
          <div className={`rounded-2xl p-4 flex items-center gap-4 border ${theme === 'dark' ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
            <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Avg Quiz Score</div>
              <div className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{performanceData[1].A}%</div>
            </div>
          </div>
        </div>
      </div>

      {activeTab === 'OVERVIEW' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* RADAR CHART */}
          {landingConfig.showStudentRadar !== false && (
            <div className={`rounded-3xl p-6 border ${theme === 'dark' ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
              <h3 className={`text-lg font-bold mb-6 flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                <TrendingUp className="w-5 h-5 text-blue-400" />
                Performance Profile
              </h3>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="80%" data={performanceData}>
                    <PolarGrid stroke={theme === 'dark' ? '#334155' : '#e2e8f0'} />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: theme === 'dark' ? '#94a3b8' : '#64748b', fontSize: 12 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar
                      name="Performance"
                      dataKey="A"
                      stroke="#3b82f6"
                      fill="#3b82f6"
                      fillOpacity={0.5}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: theme === 'dark' ? '#0f172a' : '#ffffff', 
                        border: theme === 'dark' ? '1px solid #1e293b' : '1px solid #e2e8f0', 
                        borderRadius: '12px',
                        color: theme === 'dark' ? '#fff' : '#000'
                      }}
                      itemStyle={{ color: theme === 'dark' ? '#fff' : '#000' }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* BAR CHART */}
          {landingConfig.showStudentBar !== false && (
            <div className={`rounded-3xl p-6 border ${theme === 'dark' ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
              <h3 className={`text-lg font-bold mb-6 flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                <Layers className="w-5 h-5 text-purple-400" />
                Module Completion
              </h3>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={moduleProgressData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#1e293b' : '#e2e8f0'} horizontal={false} />
                    <XAxis type="number" domain={[0, 100]} hide />
                    <YAxis dataKey="name" type="category" width={100} tick={{ fill: theme === 'dark' ? '#94a3b8' : '#64748b', fontSize: 10 }} />
                    <Tooltip 
                      cursor={{ fill: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' }}
                      contentStyle={{ 
                        backgroundColor: theme === 'dark' ? '#0f172a' : '#ffffff', 
                        border: theme === 'dark' ? '1px solid #1e293b' : '1px solid #e2e8f0', 
                        borderRadius: '12px' 
                      }}
                    />
                    <Bar dataKey="percentage" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* LINE CHART */}
          {landingConfig.showStudentLine !== false && (
            <div className={`rounded-3xl p-6 border lg:col-span-2 ${theme === 'dark' ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
              <h3 className={`text-lg font-bold mb-6 flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                <TrendingUp className="w-5 h-5 text-emerald-400" />
                Learning Timeline
              </h3>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={timelineData}>
                    <defs>
                      <linearGradient id="colorProgress" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#1e293b' : '#e2e8f0'} vertical={false} />
                    <XAxis dataKey="date" tick={{ fill: theme === 'dark' ? '#94a3b8' : '#64748b', fontSize: 10 }} />
                    <YAxis tick={{ fill: theme === 'dark' ? '#94a3b8' : '#64748b', fontSize: 10 }} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: theme === 'dark' ? '#0f172a' : '#ffffff', 
                        border: theme === 'dark' ? '1px solid #1e293b' : '1px solid #e2e8f0', 
                        borderRadius: '12px' 
                      }}
                    />
                    <Area type="monotone" dataKey="progress" stroke="#10b981" fillOpacity={1} fill="url(#colorProgress)" strokeWidth={3} />
                    <Line type="monotone" dataKey="score" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* SCATTER CHART */}
          {landingConfig.showStudentScatter !== false && (
            <div className={`rounded-3xl p-6 border lg:col-span-2 ${theme === 'dark' ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
              <h3 className={`text-lg font-bold mb-6 flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                <Clock className="w-5 h-5 text-orange-400" />
                Quiz Performance vs Time
              </h3>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#1e293b' : '#e2e8f0'} />
                    <XAxis type="number" dataKey="time" name="Time" unit="min" tick={{ fill: theme === 'dark' ? '#94a3b8' : '#64748b', fontSize: 10 }} label={{ value: 'Time (min)', position: 'bottom', fill: theme === 'dark' ? '#94a3b8' : '#64748b', fontSize: 12 }} />
                    <YAxis type="number" dataKey="score" name="Score" unit="%" tick={{ fill: theme === 'dark' ? '#94a3b8' : '#64748b', fontSize: 10 }} label={{ value: 'Score (%)', angle: -90, position: 'left', fill: theme === 'dark' ? '#94a3b8' : '#64748b', fontSize: 12 }} />
                    <ZAxis type="category" dataKey="name" name="Module" />
                    <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: theme === 'dark' ? '#0f172a' : '#ffffff', border: theme === 'dark' ? '1px solid #1e293b' : '1px solid #e2e8f0', borderRadius: '12px' }} />
                    <Scatter name="Quizzes" data={scatterData} fill="#f97316">
                      {scatterData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.score >= 80 ? '#10b981' : entry.score >= 50 ? '#f59e0b' : '#ef4444'} />
                      ))}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {submissions.length === 0 ? (
            <div className={`rounded-3xl p-12 text-center border ${theme === 'dark' ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${theme === 'dark' ? 'bg-slate-800 text-slate-600' : 'bg-slate-100 text-slate-400'}`}>
                <FileText size={32} />
              </div>
              <h4 className={`font-bold text-lg ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>No Submissions Yet</h4>
              <p className="text-slate-500 max-w-sm mx-auto mt-2">Complete exercises in your modules to see your submissions and feedback here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {submissions.map(sub => {
                const subTopic = topics.flatMap(t => t.subTopics).find(st => st.id === sub.subTopicId);
                const topic = topics.find(t => t.id === sub.topicId);
                
                return (
                  <div key={sub.id} className={`rounded-3xl overflow-hidden border ${theme === 'dark' ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
                    <div className={`p-6 border-b flex flex-col md:flex-row md:items-center justify-between gap-4 ${theme === 'dark' ? 'border-slate-800' : 'border-slate-100'}`}>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`w-2 h-2 rounded-full ${
                            sub.status === 'reviewed' ? 'bg-emerald-500' : 
                            sub.status === 'rejected' ? 'bg-red-500' : 'bg-blue-500'
                          }`} />
                          <h4 className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{subTopic?.title || 'Exercise Submission'}</h4>
                        </div>
                        <p className="text-xs text-slate-500">{topic?.title} • {new Date(sub.timestamp).toLocaleString()}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          sub.status === 'reviewed' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 
                          sub.status === 'rejected' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 
                          'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        }`}>
                          {sub.status === 'rejected' ? 'Resubmission Requested' : sub.status}
                        </div>
                        {sub.grade !== undefined && (
                          <div className="px-3 py-1 bg-blue-600 text-white text-[10px] font-bold rounded-full">
                            Grade: {sub.grade}/100
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
                      <div className="space-y-6">
                        <div>
                          <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Evaluation & Feedback</h5>
                          {sub.feedback ? (
                            <div className={`p-4 border rounded-2xl ${
                              sub.status === 'rejected' 
                                ? 'bg-red-500/5 border-red-500/20' 
                                : theme === 'dark' ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-100'
                            }`}>
                              <p className={`text-sm italic leading-relaxed ${
                                sub.status === 'rejected' ? 'text-red-400' : theme === 'dark' ? 'text-slate-300' : 'text-slate-600'
                              }`}>"{sub.feedback}"</p>
                            </div>
                          ) : (
                            <p className="text-sm text-slate-500 italic">No feedback provided yet.</p>
                          )}
                        </div>
                        
                        <div>
                          <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Submitted Files</h5>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {sub.files.map((file, idx) => (
                              <a 
                                key={idx}
                                href={file.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`flex items-center gap-3 p-3 border rounded-xl transition-all group ${theme === 'dark' ? 'bg-slate-950/50 border-slate-800 hover:border-blue-500/50' : 'bg-slate-50 border-slate-100 hover:border-blue-300 hover:bg-white shadow-sm'}`}
                              >
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${theme === 'dark' ? 'bg-slate-900 text-slate-500 group-hover:text-blue-400' : 'bg-white text-slate-400 group-hover:text-blue-500'}`}>
                                  <FileText size={16} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className={`text-xs font-bold truncate ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>{file.name}</div>
                                  <div className="text-[10px] text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</div>
                                </div>
                                <Download size={14} className="text-slate-600 group-hover:text-blue-400" />
                              </a>
                            ))}
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="flex items-center justify-between mb-3">
                          <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Internal Discussion</h5>
                                  {currentUser?.role === 'admin' && sub.comments && sub.comments.length > 0 && (
                                    <button 
                                      onClick={() => {
                                        let content = `DISCUSSION: ${subTopic?.title || 'Unknown'} (${topic?.title || 'Unknown'})\n`;
                                        content += `Student: ${user.name}\n`;
                                        content += `Date: ${new Date(sub.timestamp).toLocaleString()}\n`;
                                        content += `--------------------------------------------------\n\n`;
                                        
                                        sub.comments?.forEach(c => {
                                          content += `[${new Date(c.timestamp).toLocaleString()}] ${c.user}:\n`;
                                          content += `${c.text}\n\n`;
                                        });
                                        
                                        const blob = new Blob([content], { type: 'text/plain' });
                                        const url = URL.createObjectURL(blob);
                                        const link = document.createElement('a');
                                        link.href = url;
                                        link.download = `discussion_${user.name.replace(/\s+/g, '_')}_${(subTopic?.title || 'Unknown').replace(/\s+/g, '_')}_${new Date().getTime()}.txt`;
                                        document.body.appendChild(link);
                                        link.click();
                                        document.body.removeChild(link);
                                        URL.revokeObjectURL(url);
                                      }}
                                      className="p-1 text-slate-500 hover:text-blue-400 transition-colors"
                                      title="Download Discussion as Text"
                                    >
                                      <Download size={12} />
                                    </button>
                                  )}
                        </div>
                        <div className={`border rounded-2xl p-4 flex flex-col h-[300px] ${theme === 'dark' ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
                          <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2 custom-scrollbar">
                            {(sub.comments || []).length === 0 ? (
                              <div className="h-full flex flex-col items-center justify-center text-center p-4">
                                <MessageSquare size={24} className={theme === 'dark' ? 'text-slate-800' : 'text-slate-300'} />
                                <p className="text-xs text-slate-600">No comments yet. Start a discussion with your teacher about this evaluation.</p>
                              </div>
                            ) : (
                              (sub.comments || []).map(comment => (
                                <div key={comment.id} className={`flex gap-3 ${comment.user === user.name ? 'flex-row-reverse' : ''}`}>
                                  <img src={comment.avatar || undefined} alt={comment.user} className="w-8 h-8 rounded-lg shrink-0" />
                                  <div className={`flex flex-col ${comment.user === user.name ? 'items-end' : ''}`}>
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className={`text-[10px] font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{comment.user}</span>
                                      <span className="text-[9px] text-slate-600">{new Date(comment.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                      {onDeleteComment && (comment.user === user.name || currentUser?.role === 'admin') && (
                                        <button 
                                          onClick={() => onDeleteComment(sub.id, comment.id, true)}
                                          className="text-red-500 hover:text-red-400 transition-colors"
                                          title="Delete comment"
                                        >
                                          <Trash2 size={10} />
                                        </button>
                                      )}
                                    </div>
                                    <div className={`p-3 rounded-2xl text-xs ${
                                      comment.user === user.name ? 'bg-blue-600 text-white rounded-tr-none' : theme === 'dark' ? 'bg-slate-800 text-slate-300 rounded-tl-none' : 'bg-white text-slate-700 border border-slate-200 rounded-tl-none shadow-sm'
                                    }`}>
                                      {comment.text}
                                    </div>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                          
                          <div className="flex gap-2">
                            <input 
                              type="text"
                              value={commentInputs[sub.id] || ''}
                              onChange={e => setCommentInputs(prev => ({ ...prev, [sub.id]: e.target.value }))}
                              onKeyDown={e => {
                                if (e.key === 'Enter' && commentInputs[sub.id]?.trim()) {
                                  onPostSubmissionComment(sub.id, commentInputs[sub.id]);
                                  setCommentInputs(prev => ({ ...prev, [sub.id]: '' }));
                                }
                              }}
                              placeholder="Type a message..."
                              className={`flex-1 border rounded-xl px-4 py-2 text-xs outline-none focus:ring-1 focus:ring-blue-500 transition-all ${theme === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
                            />
                            <button 
                              onClick={() => {
                                if (commentInputs[sub.id]?.trim()) {
                                  onPostSubmissionComment(sub.id, commentInputs[sub.id]);
                                  setCommentInputs(prev => ({ ...prev, [sub.id]: '' }));
                                }
                              }}
                              disabled={!commentInputs[sub.id]?.trim()}
                              className="w-10 h-10 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white rounded-xl flex items-center justify-center transition-all"
                            >
                              <Send size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const App: React.FC = () => {
  const [viewState, setViewState] = useState<ViewState>(ViewState.LOGIN);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [selectedSubTopicId, setSelectedSubTopicId] = useState<string | undefined>(undefined);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [lockedTopicAlert, setLockedTopicAlert] = useState<{show: boolean, topic: Topic | null, missing: Topic[]} | null>(null);
  const [showWelcomeOverlay, setShowWelcomeOverlay] = useState(true);

  // Tour State
  const [runTour, setRunTour] = useState(false);
  const [showTourPrompt, setShowTourPrompt] = useState(false);
  const [dontAskTourAgain, setDontAskTourAgain] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  const handleTourCallback = React.useCallback(async (data: CallBackProps) => {
    const { status, type } = data;
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      setRunTour(false);
      document.body.classList.remove('tour-transitioning');
      
      if (status === STATUS.FINISHED) {
        setShowCelebration(true);
        if (currentUser && !currentUser.hasCompletedTour) {
          try {
            await setDoc(doc(db, 'users', currentUser.id), {
              hasCompletedTour: true
            }, { merge: true });
            // Update local state immediately for better UX
            setCurrentUser(prev => prev ? { ...prev, hasCompletedTour: true } : null);
          } catch (error) {
            console.error("Error updating tour status:", error);
          }
        }
      }
    }

    if (type === 'step:after') {
      document.body.classList.add('tour-transitioning');
    } else if (type === 'step:before') {
      // Allow a moment for the spotlight to reposition while fully faded out
      setTimeout(() => {
        document.body.classList.remove('tour-transitioning');
      }, 300);
    }
  }, [currentUser]);

  const startTour = () => {
    setShowTourPrompt(false);
    setRunTour(true);
    if (dontAskTourAgain) {
      localStorage.setItem('skipTourPrompt', 'true');
    }
  };

  const skipTour = () => {
    setShowTourPrompt(false);
    if (dontAskTourAgain) {
      localStorage.setItem('skipTourPrompt', 'true');
    }
  };

  useEffect(() => {
    const shouldSkip = localStorage.getItem('skipTourPrompt');
    if (!shouldSkip && viewState === ViewState.HOME && !showWelcomeOverlay && !currentUser?.hasCompletedTour) {
      setShowTourPrompt(true);
    }
  }, [viewState, showWelcomeOverlay, currentUser]);

  useEffect(() => {
    if (currentUser && currentUser.hasCompletedTour && showWelcomeOverlay) {
      setShowWelcomeOverlay(false);
    }
  }, [currentUser, showWelcomeOverlay]);

  const BOOTSTRAP_ADMIN_EMAIL = import.meta.env.VITE_BOOTSTRAP_ADMIN_EMAIL || "korbinian.enzinger@gmail.com";

  // Firestore Error Handling
  enum OperationType {
    CREATE = 'create',
    UPDATE = 'update',
    DELETE = 'delete',
    LIST = 'list',
    GET = 'get',
    WRITE = 'write',
  }

  interface FirestoreErrorInfo {
    error: string;
    operationType: OperationType;
    path: string | null;
    authInfo: {
      userId: string | undefined;
      email: string | null | undefined;
      emailVerified: boolean | undefined;
      isAnonymous: boolean | undefined;
      tenantId: string | null | undefined;
      providerInfo: {
        providerId: string;
        displayName: string | null;
        email: string | null;
        photoUrl: string | null;
      }[];
    }
  }

  const handleFirestoreError = (error: unknown, operationType: OperationType, path: string | null) => {
    const errInfo: FirestoreErrorInfo = {
      error: error instanceof Error ? error.message : String(error),
      authInfo: {
        userId: auth.currentUser?.uid,
        email: auth.currentUser?.email,
        emailVerified: auth.currentUser?.emailVerified,
        isAnonymous: auth.currentUser?.isAnonymous,
        tenantId: auth.currentUser?.tenantId,
        providerInfo: auth.currentUser?.providerData.map(provider => ({
          providerId: provider.providerId,
          displayName: provider.displayName,
          email: provider.email,
          photoUrl: provider.photoURL
        })) || []
      },
      operationType,
      path
    }
    console.error('Firestore Error: ', JSON.stringify(errInfo));
    // throw new Error(JSON.stringify(errInfo)); // We'll just log for now to avoid crashing the whole app if one listener fails
  };

  // Test Connection
  useEffect(() => {
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    };
    testConnection();
  }, []);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          let userData: User;
          
          if (userDoc.exists()) {
            userData = userDoc.data() as User;
          } else {
            // Check if there is a pending record with email as ID
            const emailDoc = firebaseUser.email ? await getDoc(doc(db, 'users', firebaseUser.email)) : null;
            
            if (emailDoc?.exists() && (emailDoc.data() as User).status === 'pending') {
              // Migrate pending record to active record with UID
              const pendingData = emailDoc.data() as User;
              userData = {
                ...pendingData,
                id: firebaseUser.uid,
                status: 'active'
              };
              await setDoc(doc(db, 'users', firebaseUser.uid), userData);
              await deleteDoc(doc(db, 'users', firebaseUser.email!));
            } else if (firebaseUser.email === BOOTSTRAP_ADMIN_EMAIL) {
              userData = {
                id: firebaseUser.uid,
                email: firebaseUser.email || '',
                name: firebaseUser.displayName || 'Admin',
                avatar: firebaseUser.photoURL || `https://ui-avatars.com/api/?name=Admin&background=0D8ABC&color=fff`,
                role: 'admin',
                status: 'active',
                allowedTopics: initialCurriculum.topics.map(t => t.id),
                stats: { modulesCompleted: 0, totalModules: initialCurriculum.topics.length, lastActive: 'Just now', quizScores: [] }
              };
              await setDoc(doc(db, 'users', firebaseUser.uid), userData);
            } else {
              throw new Error("User record not found. Please use 'First Time Login' if you were invited.");
            }
          }

          // Verify admin status
          // 1. Bootstrap Admin (Hardcoded Email)
          if (firebaseUser.email === BOOTSTRAP_ADMIN_EMAIL) {
            if (userData.role !== 'admin') {
              userData.role = 'admin';
              await setDoc(doc(db, 'users', firebaseUser.uid), { role: 'admin' }, { merge: true });
            }
          }
          // Note: Other admins are verified via their role in the database.
          // The security rules now strictly control who can have the 'admin' role.

          setCurrentUser(userData);
          setViewState(ViewState.HOME);
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
          auth.signOut();
        }
      } else {
        setCurrentUser(null);
        setViewState(ViewState.LOGIN);
        // Clear progress state on logout
        setCompletionRecords([]);
        setExerciseRecords([]);
        setQuizProgress({});
        setTopicComments({});
        setIsProgressLoaded(false);
      }
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Landing Config Sync from Firestore
  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'config', 'landing'), (docSnap) => {
      if (docSnap.exists()) {
        setLandingConfig(docSnap.data() as LandingConfig);
      }
    }, (error) => {
      // It's okay if it doesn't exist yet, we have defaults
      if (error.code !== 'permission-denied') {
        handleFirestoreError(error, OperationType.GET, 'config/landing');
      }
    });

    return () => unsubscribe();
  }, []);

  // Progress Sync from Firestore
  useEffect(() => {
    if (!currentUser || !isAuthReady) {
        setIsProgressLoaded(false);
        return;
    }

    console.log(`[DATA] Loading progress for user ${currentUser.id}...`);

    // Reset loading state when user changes
    setIsProgressLoaded(false);
    setCompletionRecords([]);
    setExerciseRecords([]);
    setQuizProgress({});

    const unsubscribe = onSnapshot(doc(db, 'progress', currentUser.id), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const completed = data.completedSubTopics || [];
        const submitted = data.submittedExercises || [];
        const attempts = data.quizAttempts || [];

        setCompletionRecords(completed);
        setExerciseRecords(submitted);

        console.log(`[DATA] Progress loaded: ${completed.length} completed, ${submitted.length} submitted, ${attempts.length} quiz attempts`);

        // Convert flat array back to Record<string, QuizAttempt[]> for local state
        const grouped: Record<string, QuizAttempt[]> = {};
        attempts.forEach((a: QuizAttempt) => {
            if (!grouped[a.subTopicId]) grouped[a.subTopicId] = [];
            grouped[a.subTopicId].push(a);
        });
        setQuizProgress(grouped);
      } else {
        console.log(`[DATA] No progress document for user ${currentUser.id}`);
        // Clear state for new user
        setCompletionRecords([]);
        setExerciseRecords([]);
        setQuizProgress({});
      }
      setIsProgressLoaded(true);
    }, (error) => {
      console.error(`[DATA] Error loading progress:`, error);
      handleFirestoreError(error, OperationType.GET, `progress/${currentUser.id}`);
      setIsProgressLoaded(true); // Still mark as loaded to allow usage
    });

    return () => unsubscribe();
  }, [currentUser, isAuthReady]);

  // Comments Sync from Firestore (for selected subtopic)
  useEffect(() => {
    if (!selectedSubTopicId || !isAuthReady) return;

    const unsubscribe = onSnapshot(doc(db, 'comments', selectedSubTopicId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setTopicComments(prev => ({
          ...prev,
          [selectedSubTopicId]: data.comments || []
        }));
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `comments/${selectedSubTopicId}`);
    });

    return () => unsubscribe();
  }, [selectedSubTopicId, isAuthReady]);

  // App Data State (synced from Firestore)
  const [currentTopics, setCurrentTopics] = useState<Topic[]>([]);
  const [currentTeachers, setCurrentTeachers] = useState<Teacher[]>([]);
  const [currentTags, setCurrentTags] = useState<Tag[]>([]);
  const [isCurriculumLoaded, setIsCurriculumLoaded] = useState(false);
  // Users State
  const [currentUsers, setCurrentUsers] = useState<User[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isNotificationsLoaded, setIsNotificationsLoaded] = useState(false);
  const [adminInitialTab, setAdminInitialTab] = useState<'ANALYTICS' | 'CURRICULUM' | 'TEACHERS' | 'USERS_LIST' | 'TAGS' | 'USER_INTERFACE' | 'NOTIFICATIONS'>('ANALYTICS');
  const [studentInitialTab, setStudentInitialTab] = useState<'OVERVIEW' | 'SUBMISSIONS'>('OVERVIEW');

  // Student Submissions Sync
  useEffect(() => {
    if (!currentUser || !isAuthReady || currentUser.role === 'admin') {
      setStudentSubmissions([]);
      return;
    }

    console.log(`[DATA] Loading submissions for student ${currentUser.id}...`);

    const q = query(collection(db, 'submissions'), where('userId', '==', currentUser.id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const subs: ExerciseSubmission[] = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        let subTopicTitle = "Unknown Exercise";

        // Find title from currentTopics
        const topic = currentTopics.find(t => t.id === data.topicId);
        if (topic) {
          const subTopic = topic.subTopics.find(st => st.id === data.subTopicId);
          if (subTopic) {
            subTopicTitle = subTopic.title;
          }
        }

        subs.push({
          id: docSnap.id,
          ...data,
          subTopicTitle
        } as ExerciseSubmission);
      });
      // Sort by timestamp descending
      subs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      console.log(`[DATA] Student submissions loaded: ${subs.length} submissions`, subs);
      setStudentSubmissions(subs);
    }, (error) => {
      console.error(`[DATA] Error loading submissions:`, error);
      handleFirestoreError(error, OperationType.GET, 'submissions');
    });

    return () => unsubscribe();
  }, [currentUser, isAuthReady, currentTopics]);

  // Admin All Submissions Sync
  useEffect(() => {
    if (!currentUser || !isAuthReady || currentUser.role !== 'admin') {
      setAllSubmissions([]);
      return;
    }

    console.log(`[DATA] Loading all submissions for admin...`);

    const q = query(collection(db, 'submissions'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const subs: ExerciseSubmission[] = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        let subTopicTitle = "Unknown Exercise";

        // Find title from currentTopics
        const topic = currentTopics.find(t => t.id === data.topicId);
        if (topic) {
          const subTopic = topic.subTopics.find(st => st.id === data.subTopicId);
          if (subTopic) {
            subTopicTitle = subTopic.title;
          }
        }

        subs.push({
          id: docSnap.id,
          ...data,
          subTopicTitle
        } as ExerciseSubmission);
      });
      // Sort by timestamp descending
      subs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      console.log(`[DATA] Admin submissions loaded: ${subs.length} submissions`, subs);
      setAllSubmissions(subs);
    }, (error) => {
      console.error(`[DATA] Error loading submissions:`, error);
      handleFirestoreError(error, OperationType.GET, 'submissions');
    });

    return () => unsubscribe();
  }, [currentUser, isAuthReady, currentTopics]);

  // Deadline check effect
  useEffect(() => {
    if (currentUser?.role !== 'admin' || !isNotificationsLoaded) return;

    const checkDeadlines = async () => {
      const now = new Date();
      const batch = writeBatch(db);
      let hasChanges = false;

      for (const notif of notifications) {
        if (notif.type === 'EXERCISE_SUBMISSION' && !notif.evaluated && !notif.deadlineNotificationSent) {
          const submissionDate = new Date(notif.timestamp);
          const diffDays = (now.getTime() - submissionDate.getTime()) / (1000 * 60 * 60 * 24);

          if (diffDays >= 21) { // 3 weeks passed, 1 week left
            const warningId = `warning_${notif.id}`;
            const warningNotif: AppNotification = {
              ...notif,
              id: warningId,
              type: 'DEADLINE_WARNING',
              timestamp: now.toISOString(),
              read: false,
              evaluated: false
            };
            
            batch.set(doc(db, 'notifications', warningId), warningNotif);
            batch.update(doc(db, 'notifications', notif.id), { deadlineNotificationSent: true });
            hasChanges = true;
          }
        }
      }

      if (hasChanges) {
        try {
          await batch.commit();
        } catch (error) {
          console.error("Failed to commit deadline warnings:", error);
        }
      }
    };

    checkDeadlines();
  }, [notifications, currentUser, isNotificationsLoaded]);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);
  const [highlightedNotificationId, setHighlightedNotificationId] = useState<string | null>(null);
  const userDropdownRef = useRef<HTMLDivElement>(null);
  const notificationsDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (currentUser?.theme) {
      setTheme(currentUser.theme);
    }
  }, [currentUser]);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = async () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    if (currentUser) {
      try {
        await setDoc(doc(db, 'users', currentUser.id), { theme: newTheme }, { merge: true });
      } catch (error) {
        console.error("Error updating theme:", error);
      }
    }
  };

  const getThemeImage = (lightUrl?: string, darkUrl?: string, defaultUrl?: string) => {
    if (theme === 'light' && lightUrl) return lightUrl;
    if (theme === 'dark' && darkUrl) return darkUrl;
    return defaultUrl || '';
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
        setShowUserDropdown(false);
      }
      if (notificationsDropdownRef.current && !notificationsDropdownRef.current.contains(event.target as Node)) {
        setShowNotificationsDropdown(false);
      }
    };

    if (showUserDropdown || showNotificationsDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserDropdown, showNotificationsDropdown]);

  const handleNotificationClick = (notif: AppNotification) => {
      setShowNotificationsDropdown(false);
      setHighlightedNotificationId(notif.id);
      setDashboardMode('NOTIFICATIONS');
      // Mark as read after a short delay to allow the UI to highlight it
      setTimeout(async () => {
          try {
              await setDoc(doc(db, 'notifications', notif.id), { read: true }, { merge: true });
          } catch (error) {
              console.error("Failed to mark notification as read:", error);
          }
      }, 2000);
  };

  const handleNavigateToModule = (topicId: string, subTopicId: string) => {
    const topic = currentTopics.find(t => t.id === topicId);
    if (topic) {
        handleTopicSelect(topic, subTopicId);
    }
  };

  const pulsingRedStyle = `
    @keyframes pulse-red {
      0% { transform: scale(1); opacity: 1; color: inherit; }
      50% { transform: scale(1.1); opacity: 0.8; color: #ef4444; }
      100% { transform: scale(1); opacity: 1; color: inherit; }
    }
    .animate-pulse-red {
      animation: pulse-red 2s infinite;
    }
  `;
  const [landingConfig, setLandingConfig] = useState<LandingConfig>({
    title: "Digital Built Environment",
    subtitle: "Recurrent Program",
    description: "You are currently logged into the Recurrent Program. Navigate the knowledge graph to access your assigned video tutorials, spanning from fundamental modeling to advanced robotic fabrication.",
    tag: "Semester 2025",
    heroImage: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2670&auto=format&fit=crop",
    quote: "The Digital Built Environment is not just about tools, but the synthesis of information, geometry, and material performance.",
    browserTitle: "Digital Built Environment",
    faviconUrl: "https://picsum.photos/seed/favicon/32/32",
    loginTitle: 'Welcome back',
    loginSubtitle: 'Sign in to access your module tutorials.',
    firstTimeLoginTitle: 'First Time Login',
    firstTimeLoginSubtitle: 'Enter your invited email to set up your password.'
  });
  const [isUsersLoaded, setIsUsersLoaded] = useState(false);

  // Browser Metadata Sync
  useEffect(() => {
    if (landingConfig.browserTitle) {
      document.title = landingConfig.browserTitle;
    }
    const faviconUrl = getThemeImage(landingConfig.faviconUrlLight, landingConfig.faviconUrlDark, landingConfig.faviconUrl);
    if (faviconUrl) {
      let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.getElementsByTagName('head')[0].appendChild(link);
      }
      link.href = faviconUrl;
    }
  }, [landingConfig.browserTitle, landingConfig.faviconUrl, landingConfig.faviconUrlLight, landingConfig.faviconUrlDark, theme]);

  // Sync all users and their progress if admin
  useEffect(() => {
    if (currentUser?.role !== 'admin' || !isAuthReady) {
      setCurrentUsers([]);
      setIsUsersLoaded(false);
      return;
    }

    // Listen to users
    const unsubscribeUsers = onSnapshot(collection(db, 'users'), (userSnapshot) => {
      const usersMap: Record<string, User> = {};
      userSnapshot.forEach((doc) => {
        usersMap[doc.id] = doc.data() as User;
      });

      // Also listen to progress to merge
      const unsubscribeProgress = onSnapshot(collection(db, 'progress'), (progressSnapshot) => {
        const updatedUsers = { ...usersMap };
        progressSnapshot.forEach((doc) => {
          const progressData = doc.data();
          if (updatedUsers[doc.id]) {
            updatedUsers[doc.id] = {
              ...updatedUsers[doc.id],
              completedSubTopics: progressData.completedSubTopics || [],
              submittedExercises: progressData.submittedExercises || [],
              quizAttempts: progressData.quizAttempts || []
            };
          }
        });
        setCurrentUsers(Object.values(updatedUsers));
        setIsUsersLoaded(true);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'progress');
      });

      return () => unsubscribeProgress();
    }, (error) => {
      if (error.message.includes('insufficient permissions')) {
        setIsUsersLoaded(false);
      } else {
        handleFirestoreError(error, OperationType.LIST, 'users');
      }
    });

    return () => unsubscribeUsers();
  }, [currentUser?.role, isAuthReady]);

  // Notifications Sync
  useEffect(() => {
    if (!currentUser || !isAuthReady) {
      setNotifications([]);
      setIsNotificationsLoaded(false);
      return;
    }

    console.log(`[DATA] Setting up notifications listener for ${currentUser.role}...`);

    // Admins see all notifications targeted to 'admin', their own ID, or legacy notifications (no targetUserId)
    // Students only see notifications targeted to them
    let q;
    if (currentUser.role === 'admin') {
        q = query(collection(db, 'notifications'));
    } else {
        q = query(collection(db, 'notifications'), where('targetUserId', '==', currentUser.id));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let notifs: AppNotification[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        notifs.push({ id: doc.id, ...data } as AppNotification);
      });

      if (currentUser.role === 'admin') {
          // For admins, filter out notifications that are explicitly targeted to a specific student (not the admin)
          notifs = notifs.filter(n => !n.targetUserId || n.targetUserId === 'admin' || n.targetUserId === currentUser.id);
      }

      // Sort by lastCommentTimestamp if available, otherwise by timestamp
      const sortedNotifs = notifs.sort((a, b) => {
        const timeA = new Date(a.lastCommentTimestamp || a.timestamp).getTime();
        const timeB = new Date(b.lastCommentTimestamp || b.timestamp).getTime();
        return timeB - timeA;
      });

      console.log(`[DATA] Notifications loaded: ${sortedNotifs.length} notifications`, sortedNotifs);
      setNotifications(sortedNotifs);
      setIsNotificationsLoaded(true);
    }, (error) => {
      console.error(`[DATA] Error loading notifications:`, error);
      handleFirestoreError(error, OperationType.LIST, 'notifications');
    });

    return () => unsubscribe();
  }, [currentUser?.id, currentUser?.role, isAuthReady]);

  // Topics Sync from Firestore
  useEffect(() => {
    if (!isAuthReady || !currentUser) return;

    console.log("[DATA] Setting up topics listener...");

    const unsubscribe = onSnapshot(collection(db, 'topics'), (snapshot) => {
      const topics: Topic[] = [];
      snapshot.forEach((doc) => {
        topics.push(doc.data() as Topic);
      });
      console.log(`[DATA] Retrieved ${topics.length} topics from Firestore`);
      if (topics.length > 0) {
        const sorted = topics.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        setCurrentTopics(sorted);
        setIsCurriculumLoaded(true);
      } else if (currentUser?.email === BOOTSTRAP_ADMIN_EMAIL) {
        // Bootstrap admin will trigger initialization if empty
        console.log("[DATA] No topics found, bootstrap admin will initialize...");
        setIsCurriculumLoaded(false);
      } else {
        // If empty and not admin, we show empty state or wait for admin to bootstrap
        console.log("[DATA] No topics found for non-admin user");
        setCurrentTopics([]);
        setIsCurriculumLoaded(true);
      }
    }, (error) => {
      console.error("[DATA] Error loading topics:", error);
      handleFirestoreError(error, OperationType.LIST, 'topics');
    });

    return () => unsubscribe();
  }, [isAuthReady, currentUser?.email]);

  // Teachers Sync from Firestore
  useEffect(() => {
    if (!isAuthReady || !currentUser) return;

    console.log("[DATA] Setting up teachers listener...");

    const unsubscribe = onSnapshot(collection(db, 'teachers'), (snapshot) => {
      const teachers: Teacher[] = [];
      snapshot.forEach((doc) => {
        teachers.push(doc.data() as Teacher);
      });
      console.log(`[DATA] Retrieved ${teachers.length} teachers from Firestore:`, teachers);
      setCurrentTeachers(teachers);
    }, (error) => {
      console.error("[DATA] Error loading teachers:", error);
      handleFirestoreError(error, OperationType.LIST, 'teachers');
    });

    return () => unsubscribe();
  }, [isAuthReady, currentUser]); // Add currentUser to dependencies

  // Tags Sync from Firestore
  useEffect(() => {
    if (!isAuthReady || !currentUser) return;

    const unsubscribe = onSnapshot(collection(db, 'tags'), (snapshot) => {
      const tags: Tag[] = [];
      snapshot.forEach((doc) => {
        tags.push(doc.data() as Tag);
      });
      setCurrentTags(tags);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'tags');
    });

    return () => unsubscribe();
  }, [isAuthReady]);

  // Initialization logic for Bootstrap Admin
  useEffect(() => {
    if (currentUser?.email !== BOOTSTRAP_ADMIN_EMAIL || !isAuthReady || isCurriculumLoaded) return;

    const initCurriculum = async () => {
      try {
        const topicsSnap = await getDocs(query(collection(db, 'topics')));
        if (topicsSnap.empty) {
          console.log("Initializing topics in Firestore...");
          let index = 0;
          for (const topic of initialCurriculum.topics) {
            // Reconstitute teacher object from key
            const teacherKey = (topic as any).teacherKey;
            const teacher = (initialCurriculum.teachers as any)[teacherKey] || Object.values(initialCurriculum.teachers)[0];
            const finalTopic = { ...topic, teacher, order: index };
            await setDoc(doc(db, 'topics', topic.id), finalTopic);
            index++;
          }
        }

        const teachersSnap = await getDocs(query(collection(db, 'teachers')));
        if (teachersSnap.empty) {
          console.log("Initializing teachers in Firestore...");
          const teachersList = Object.entries(initialCurriculum.teachers).map(([key, t]) => ({...(t as any), id: key}));
          for (const teacher of teachersList) {
            await setDoc(doc(db, 'teachers', teacher.id), teacher);
          }
        }
        setIsCurriculumLoaded(true);
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, 'initialization');
      }
    };

    initCurriculum();
  }, [currentUser, isAuthReady, isCurriculumLoaded]);

  // Dashboard State
  const [dashboardMode, setDashboardMode] = useState<'GRAPH' | 'LIST' | 'TEACHERS' | 'ANALYTICS' | 'NOTIFICATIONS'>('GRAPH');
  const [selectedTeacherEmail, setSelectedTeacherEmail] = useState<string | null>(null);

  // Persistence State
  const [completionRecords, setCompletionRecords] = useState<CompletionRecord[]>([]);
  const [exerciseRecords, setExerciseRecords] = useState<CompletionRecord[]>([]);
  const [topicComments, setTopicComments] = useState<Record<string, Comment[]>>({});
  const [quizProgress, setQuizProgress] = useState<Record<string, QuizAttempt[]>>({});
  const [isProgressLoaded, setIsProgressLoaded] = useState(false);
  const [studentSubmissions, setStudentSubmissions] = useState<ExerciseSubmission[]>([]);
  const [allSubmissions, setAllSubmissions] = useState<ExerciseSubmission[]>([]);

  const userWithProgress = useMemo(() => {
    if (!currentUser) return null;
    return {
      ...currentUser,
      completedSubTopics: completionRecords,
      submittedExercises: exerciseRecords,
      quizAttempts: Object.values(quizProgress).flat()
    };
  }, [currentUser, completionRecords, exerciseRecords, quizProgress]);

  const completedSubTopics = useMemo(() => new Set(completionRecords.map(r => r.id)), [completionRecords]);
  const submittedExercises = useMemo(() => new Set(exerciseRecords.map(r => r.id)), [exerciseRecords]);

  // Responsive Initialization
  useEffect(() => {
    // We now default to GRAPH even on mobile as per user request
  }, []);


  // Save Progress to Firestore
  useEffect(() => {
    if (!currentUser || !isAuthReady || !isProgressLoaded) return;
    
    const syncProgress = async () => {
        try {
            await setDoc(doc(db, 'progress', currentUser.id), {
                userId: currentUser.id,
                completedSubTopics: completionRecords,
                submittedExercises: exerciseRecords,
                quizAttempts: Object.values(quizProgress).flat()
            }, { merge: true });
        } catch (error) {
            handleFirestoreError(error, OperationType.WRITE, `progress/${currentUser.id}`);
        }
    };
    
    syncProgress();
  }, [completionRecords, exerciseRecords, quizProgress, currentUser, isAuthReady, isProgressLoaded]);

  // Derived Locked State based on User Permissions (Permanently Locked)
  const lockedTopicIds = useMemo(() => {
      if (!currentUser || currentUser.role === 'admin') return new Set<string>();
      
      const allowed = new Set(currentUser.allowedTopics || []);
      const locked = new Set<string>();
      
      currentTopics.forEach(t => {
          if (!allowed.has(t.id)) {
              locked.add(t.id);
          }
      });
      return locked;
  }, [currentUser, currentTopics]);

  // Derived Locked State based on Prerequisites
  const prerequisiteLockedIds = useMemo(() => {
      if (!currentUser || currentUser.role === 'admin') return new Set<string>();
      
      const locked = new Set<string>();
      
      currentTopics.forEach(topic => {
          // Skip if already permanently locked
          if (lockedTopicIds.has(topic.id)) return;

          // Check Prerequisites
          const prerequisites = currentTopics.filter(t => 
              t.relatedTopics.includes(topic.id) && t.level < topic.level
          );
          
          // Check if all subtopics of prerequisites are completed
          const isMissingPrereq = prerequisites.some(p => 
              p.subTopics.some(st => !completedSubTopics.has(st.id))
          );

          if (isMissingPrereq) {
              locked.add(topic.id);
          }
      });
      return locked;
  }, [currentUser, currentTopics, lockedTopicIds, completedSubTopics]);

  // Derived Teachers List (from state now)
  const uniqueTeachers = useMemo(() => {
      const map = new Map();
      // Use currentTopics teachers to ensure we show active teachers, 
      // OR just use currentTeachers state directly if we want to show all available instructors.
      // Let's use currentTeachers state for the Teachers Tab list.
      return currentTeachers;
  }, [currentTeachers]);

  const handleLogin = (user: User) => {
      // This is now handled by onAuthStateChanged
      setViewState(ViewState.HOME);
      setShowWelcomeOverlay(true); 
  };

  const handleLogout = async () => {
      try {
          await signOut(auth);
          setCurrentUser(null);
          setSelectedTopic(null);
          setViewState(ViewState.LOGIN);
          
          // Clear progress state
          setCompletionRecords([]);
          setExerciseRecords([]);
          setQuizProgress({});
          setTopicComments({});
          setIsProgressLoaded(false);
      } catch (error) {
          console.error("Logout error", error);
      }
  };

  const handleTopicSelect = (topic: Topic, subTopicId?: string) => {
    // Check User Permissions first
    if (lockedTopicIds.has(topic.id)) {
        alert("This module is currently locked for your account.");
        return;
    }

    // Check Prerequisites
    const prerequisites = currentTopics.filter(t => 
        t.relatedTopics.includes(topic.id) && t.level < topic.level
    );
    
    // Check if all subtopics of prerequisites are completed
    const missing = prerequisites.filter(p => 
        p.subTopics.some(st => !completedSubTopics.has(st.id))
    );

    if (missing.length > 0 && currentUser?.role !== 'admin') {
        setLockedTopicAlert({ show: true, topic: topic, missing: missing });
        return;
    }

    setSelectedTopic(topic);
    setSelectedSubTopicId(subTopicId);
    setViewState(ViewState.TOPIC);
  };

  const handleBackToHome = () => {
    setViewState(ViewState.HOME);
    setSelectedTopic(null);
    setSelectedSubTopicId(undefined);
  };

  const handleApplyAdminChanges = async (newTopics: Topic[], newTeachers: Teacher[], newUsers: User[], newLandingConfig?: LandingConfig, newTags?: Tag[]) => {
      const batch = writeBatch(db);
      
      // Persist tags
      if (newTags) {
          for (const tag of newTags) {
              batch.set(doc(db, 'tags', tag.id), cleanObject(tag));
          }
          // Handle deleted tags
          const deletedTags = currentTags.filter(oldT => !newTags.find(newT => newT.id === oldT.id));
          for (const tag of deletedTags) {
              batch.delete(doc(db, 'tags', tag.id));
          }
      }

      // Persist landing config
      if (newLandingConfig) {
          batch.set(doc(db, 'config', 'landing'), cleanObject(newLandingConfig));
      }

      // Persist topics
      for (const topic of newTopics) {
          batch.set(doc(db, 'topics', topic.id), cleanObject(topic));
      }
      // Handle deleted topics
      const deletedTopics = currentTopics.filter(oldT => !newTopics.find(newT => newT.id === oldT.id));
      for (const topic of deletedTopics) {
          batch.delete(doc(db, 'topics', topic.id));
      }

      // Persist teachers
      for (const teacher of newTeachers) {
          batch.set(doc(db, 'teachers', teacher.id), cleanObject(teacher));
      }
      // Handle deleted teachers
      const deletedTeachers = currentTeachers.filter(oldT => !newTeachers.find(newT => newT.id === oldT.id));
      for (const teacher of deletedTeachers) {
          batch.delete(doc(db, 'teachers', teacher.id));
      }

      // Find deleted users
      const deletedUsers = currentUsers.filter(oldUser => !newUsers.find(newUser => newUser.id === oldUser.id));
      for (const user of deletedUsers) {
          batch.delete(doc(db, 'users', user.id));
      }

      // Persist user changes
      for (const user of newUsers) {
          batch.set(doc(db, 'users', user.id), cleanObject(user), { merge: true });
      }

      try {
          await batch.commit();

          // Update local state to match Firestore
          setCurrentTopics(newTopics);
          setCurrentTeachers(newTeachers);
          setCurrentUsers(newUsers);

          // If current user was updated, refresh session
          if (currentUser) {
              const freshUser = newUsers.find(u => u.id === currentUser.id);
              if (freshUser) setCurrentUser(freshUser);
          }
      } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, 'batch-update');
          throw error; // Re-throw so AdminBuilder knows it failed
      }
  };

  const toggleSubTopicCompletion = (subTopicId: string) => {
    const now = new Date().toISOString();
    setCompletionRecords(prev => {
        const index = prev.findIndex(r => r.id === subTopicId);
        if (index >= 0) {
            return prev.filter(r => r.id !== subTopicId);
        } else {
            return [...prev, { id: subTopicId, completedAt: now }];
        }
    });
  };

  const handleExerciseSubmission = async (subTopicId: string, quizData?: QuizAttempt, submissionData?: ExerciseSubmission) => {
      if (quizData) {
          const newAttempts = [...(quizProgress[subTopicId] || []), quizData];
          setQuizProgress(prev => ({
              ...prev,
              [subTopicId]: newAttempts
          }));
          
          if (quizData.passed) {
              const now = quizData.timestamp;
              setExerciseRecords(prev => {
                  if (prev.some(r => r.id === subTopicId)) return prev;
                  return [...prev, { id: subTopicId, completedAt: now }];
              });
              setCompletionRecords(prev => {
                  if (prev.some(r => r.id === subTopicId)) return prev;
                  return [...prev, { id: subTopicId, completedAt: now }];
              });
          }
      } else if (submissionData) {
          try {
              // Check if this is a resubmission
              const isResubmission = studentSubmissions.some(s => s.id === submissionData.id && s.status === 'rejected');
              
              await setDoc(doc(db, 'submissions', submissionData.id), cleanObject(submissionData));
              
              // Create Notification for Admin
              const topic = currentTopics.find(t => t.id === submissionData.topicId);
              const subTopic = topic?.subTopics.find(st => st.id === submissionData.subTopicId);
              
              const adminNotifId = `notif_${submissionData.id}_admin`;
              const notification: AppNotification = {
                  id: adminNotifId,
                  userId: submissionData.userId,
                  userName: submissionData.userName,
                  topicId: submissionData.topicId,
                  subTopicId: submissionData.subTopicId,
                  topicTitle: topic?.title || 'Unknown Topic',
                  subTopicTitle: subTopic?.title || 'Unknown SubTopic',
                  submissionId: submissionData.id,
                  timestamp: new Date().toISOString(),
                  read: false,
                  evaluated: false,
                  status: 'pending',
                  targetUserId: 'admin',
                  type: isResubmission ? 'EXERCISE_RESUBMISSION' : 'EXERCISE_SUBMISSION',
                  files: submissionData.files.map(f => ({ name: f.name, url: f.url }))
              };
              await setDoc(doc(db, 'notifications', adminNotifId), notification);

              setExerciseRecords(prev => {
                  if (prev.some(r => r.id === subTopicId)) return prev;
                  return [...prev, { id: subTopicId, completedAt: new Date().toISOString() }];
              });
              setCompletionRecords(prev => {
                  if (prev.some(r => r.id === subTopicId)) return prev;
                  return [...prev, { id: subTopicId, completedAt: new Date().toISOString() }];
              });
          } catch (error) {
              handleFirestoreError(error, OperationType.WRITE, `submissions/${submissionData.id}`);
          }
      } else {
          setExerciseRecords(prev => {
              if (prev.some(r => r.id === subTopicId)) return prev;
              return [...prev, { id: subTopicId, completedAt: new Date().toISOString() }];
          });
          setCompletionRecords(prev => {
              if (prev.some(r => r.id === subTopicId)) return prev;
              return [...prev, { id: subTopicId, completedAt: new Date().toISOString() }];
          });
      }
  };

  const addComment = async (subTopicId: string, text: string) => {
    if (!currentUser) return;
    const newComment: Comment = {
      id: Date.now().toString(),
      userId: currentUser.id,
      user: currentUser.name,
      avatar: currentUser.avatar,
      text: text,
      timestamp: new Date().toISOString(),
      reactions: {},
      replies: []
    };
    
    try {
      await runTransaction(db, async (transaction) => {
        const commentDocRef = doc(db, 'comments', subTopicId);
        const commentDoc = await transaction.get(commentDocRef);
        
        let updatedComments: Comment[] = [];
        if (commentDoc.exists()) {
          updatedComments = [...(commentDoc.data().comments || []), newComment];
        } else {
          updatedComments = [newComment];
        }
        
        transaction.set(commentDocRef, { comments: updatedComments }, { merge: true });

        // Notify participants
        const topic = currentTopics.find(t => t.subTopics.some(st => st.id === subTopicId));
        const subTopic = topic?.subTopics.find(st => st.id === subTopicId);
        
        // Get all unique user IDs who have commented in this thread
        const participants: string[] = Array.from(new Set(updatedComments.map(c => c.userId))).filter(id => !!id) as string[];
        // Also include admin
        if (!participants.includes('admin')) participants.push('admin');

        // Notify everyone except the current user
        for (const targetUserId of participants) {
          if (targetUserId === currentUser.id) continue;

          const notifId = `notif_${subTopicId}_${targetUserId}`;
          const notification: AppNotification = {
            id: notifId,
            userId: targetUserId,
            userName: currentUser.name,
            topicId: topic?.id || '',
            subTopicId: subTopicId,
            topicTitle: topic?.title || '',
            subTopicTitle: subTopic?.title || '',
            submissionId: '',
            timestamp: new Date().toISOString(),
            read: false,
            hasNewComments: true,
            lastCommentTimestamp: new Date().toISOString(),
            targetUserId: targetUserId,
            type: 'SUBMISSION_COMMENT',
            comments: updatedComments,
            files: []
          };
          transaction.set(doc(db, 'notifications', notifId), notification, { merge: true });
        }
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `comments/${subTopicId}`);
    }
  };

  const handleReply = async (subTopicId: string, parentCommentId: string, text: string) => {
    if (!currentUser) return;
    const newReply: Comment = {
      id: Date.now().toString(),
      userId: currentUser.id,
      user: currentUser.name,
      avatar: currentUser.avatar,
      text: text,
      timestamp: new Date().toISOString(),
      reactions: {},
      replies: []
    };

    try {
      await runTransaction(db, async (transaction) => {
        const commentDocRef = doc(db, 'comments', subTopicId);
        const commentDoc = await transaction.get(commentDocRef);
        
        if (!commentDoc.exists()) return;

        const comments = commentDoc.data().comments || [];
        let parentCommentAuthorId: string | null = null;

        const findParentAndAddReply = (c: Comment): Comment => {
          if (c.id === parentCommentId) {
            parentCommentAuthorId = c.userId;
            return { ...c, replies: [...c.replies, newReply] };
          }
          if (c.replies.length > 0) {
            return { ...c, replies: c.replies.map(findParentAndAddReply) };
          }
          return c;
        };
        const updatedComments = comments.map(findParentAndAddReply);

        transaction.set(commentDocRef, { comments: updatedComments }, { merge: true });

        // Notify participants
        const topic = currentTopics.find(t => t.subTopics.some(st => st.id === subTopicId));
        const subTopic = topic?.subTopics.find(st => st.id === subTopicId);
        
        // Get all unique user IDs who have commented in this thread
        const participants: string[] = Array.from(new Set(updatedComments.flatMap(c => {
          const ids = [c.userId];
          const getReplyIds = (r: Comment): string[] => [r.userId, ...r.replies.flatMap(getReplyIds)];
          return [...ids, ...c.replies.flatMap(getReplyIds)];
        }))).filter(id => !!id) as string[];
        // Also include admin
        if (!participants.includes('admin')) participants.push('admin');

        // Notify everyone except the current user
        for (const targetUserId of participants) {
          if (targetUserId === currentUser.id) continue;

          const notifId = `notif_${subTopicId}_${targetUserId}`;
          const notification: AppNotification = {
            id: notifId,
            userId: targetUserId,
            userName: currentUser.name,
            topicId: topic?.id || '',
            subTopicId: subTopicId,
            topicTitle: topic?.title || '',
            subTopicTitle: subTopic?.title || '',
            submissionId: '', // Not a submission
            timestamp: new Date().toISOString(),
            read: false,
            hasNewComments: true,
            lastCommentTimestamp: new Date().toISOString(),
            targetUserId: targetUserId,
            type: 'SUBMISSION_COMMENT',
            comments: updatedComments,
            files: []
          };
          transaction.set(doc(db, 'notifications', notifId), notification, { merge: true });
        }
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `comments/${subTopicId}`);
    }
  };

  const handlePostSubmissionComment = async (id: string, text: string, isSubmission: boolean = true) => {
    if (!currentUser) return;
    
    try {
      const newComment: Comment = {
        id: `comment_${Date.now()}`,
        userId: currentUser.id,
        user: currentUser.name,
        avatar: currentUser.avatar,
        text,
        timestamp: new Date().toISOString(),
        reactions: {},
        replies: []
      };

      await runTransaction(db, async (transaction) => {
        let updatedComments: Comment[] = [];
        let topicId = '';
        let subTopicId = '';
        let topicTitle = '';
        let subTopicTitle = '';
        let files: any[] = [];
        let submissionRef: any = null;
        let commentRef: any = null;

        if (isSubmission) {
          submissionRef = doc(db, 'submissions', id);
          const submissionDoc = await transaction.get(submissionRef);
          
          if (!submissionDoc.exists()) return;
          const submissionData = submissionDoc.data() as any;

          updatedComments = [...(submissionData.comments || []), newComment];
          topicId = submissionData.topicId || '';
          subTopicId = submissionData.subTopicId || '';
          topicTitle = submissionData.topicTitle || '';
          subTopicTitle = submissionData.subTopicTitle || '';
          files = submissionData.files || [];
        } else {
          // Sub-topic comment
          commentRef = doc(db, 'comments', id);
          const commentDoc = await transaction.get(commentRef);
          const commentData = commentDoc.exists() ? commentDoc.data() as any : null;
          
          updatedComments = commentData ? [...(commentData.comments || []), newComment] : [newComment];
          
          const topic = currentTopics.find(t => t.subTopics.some(st => st.id === id));
          const subTopic = topic?.subTopics.find(st => st.id === id);
          
          topicId = topic?.id || '';
          subTopicId = id;
          topicTitle = topic?.title || '';
          subTopicTitle = subTopic?.title || '';
        }

        // Update notifications for participants
        const participants: string[] = Array.from(new Set(updatedComments.map(c => c.userId))).filter(id => !!id) as string[];
        if (!participants.includes('admin')) participants.push('admin');

        // PRE-FETCH all notifications before any writes
        const notifRefs: Record<string, any> = {};
        const notifSnaps: Record<string, any> = {};
        
        for (const targetUserId of participants) {
          const notifId = isSubmission 
            ? `notif_${id}_${targetUserId}`
            : `notif_${subTopicId}_${targetUserId}`;
          
          const ref = doc(db, 'notifications', notifId);
          notifRefs[targetUserId] = ref;
          notifSnaps[targetUserId] = await transaction.get(ref);
        }

        // NOW perform all writes
        if (isSubmission) {
          transaction.set(submissionRef, { comments: updatedComments }, { merge: true });
        } else {
          transaction.set(commentRef, { comments: updatedComments }, { merge: true });
        }

        for (const targetUserId of participants) {
          const notifId = isSubmission 
            ? `notif_${id}_${targetUserId}`
            : `notif_${subTopicId}_${targetUserId}`;

          const isCurrentUser = targetUserId === currentUser.id;
          const notifSnap = notifSnaps[targetUserId];
          const existingNotif = notifSnap.exists() ? notifSnap.data() as AppNotification : null;

          const notification: any = {
            id: notifId,
            userId: targetUserId,
            userName: currentUser.name,
            topicId,
            subTopicId,
            topicTitle,
            subTopicTitle,
            submissionId: isSubmission ? id : '',
            timestamp: existingNotif?.timestamp || new Date().toISOString(),
            read: isCurrentUser, // Mark as read for the person who just commented
            hasNewComments: !isCurrentUser, // Mark as having new comments for everyone else
            lastCommentTimestamp: new Date().toISOString(),
            targetUserId: targetUserId,
            type: existingNotif?.type || (isSubmission ? 'EXERCISE_SUBMISSION' : 'SUBMISSION_COMMENT'),
            comments: updatedComments,
            files: files.length > 0 ? files : (existingNotif?.files || [])
          };

          // If it's a submission, ensure we don't downgrade the type from RESUBMISSION to SUBMISSION
          if (isSubmission && existingNotif?.type === 'EXERCISE_RESUBMISSION') {
            notification.type = 'EXERCISE_RESUBMISSION';
          }
          
          transaction.set(notifRefs[targetUserId], notification, { merge: true });
        }
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, isSubmission ? `submissions/${id}` : `comments/${id}`);
    }
  };

  const handleMarkNotificationRead = async (id: string) => {
    try {
      await setDoc(doc(db, 'notifications', id), { 
        read: true,
        hasNewComments: false 
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `notifications/${id}`);
    }
  };

  const handleDeleteNotification = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'notifications', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `notifications/${id}`);
    }
  };

  const handleRequestResubmission = async (submissionId: string, feedback: string) => {
    if (!currentUser || currentUser.role !== 'admin') return;
    try {
        await runTransaction(db, async (transaction) => {
            const submissionDocRef = doc(db, 'submissions', submissionId);
            const submissionDoc = await transaction.get(submissionDocRef);
            if (!submissionDoc.exists()) return;

            const submissionData = submissionDoc.data();
            const studentId = submissionData.userId;

            // Update submission
            transaction.set(submissionDocRef, { 
                feedback: feedback || '', 
                status: 'rejected' 
            }, { merge: true });

            // Update admin notification
            const adminNotifId = `notif_${submissionId}_admin`;
            transaction.set(doc(db, 'notifications', adminNotifId), { 
                evaluated: true,
                status: 'resubmission_requested',
                feedback: feedback || '',
                completed: false, // Not completed, needs resubmission
                read: true
            }, { merge: true });

            // Update student notification
            if (studentId) {
                const studentNotifId = `notif_${submissionId}_${studentId}`;
                transaction.set(doc(db, 'notifications', studentNotifId), {
                    read: false,
                    evaluated: true,
                    status: 'resubmission_requested',
                    feedback: feedback || '',
                    timestamp: new Date().toISOString(),
                    type: 'EXERCISE_SUBMISSION',
                    topicId: submissionData.topicId || '',
                    subTopicId: submissionData.subTopicId || '',
                    topicTitle: submissionData.topicTitle || '',
                    subTopicTitle: submissionData.subTopicTitle || '',
                    submissionId: submissionId,
                    userId: studentId,
                    userName: submissionData.userName || 'Student',
                    targetUserId: studentId,
                    files: submissionData.files || []
                }, { merge: true });
            }
        });
    } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `submissions/${submissionId}`);
    }
  };

  const handleEvaluateSubmission = async (submissionId: string, grade: number, feedback: string) => {
      if (!currentUser || currentUser.role !== 'admin') return;
      try {
          await runTransaction(db, async (transaction) => {
              const submissionDocRef = doc(db, 'submissions', submissionId);
              const submissionDoc = await transaction.get(submissionDocRef);
              if (!submissionDoc.exists()) return;

              const submissionData = submissionDoc.data();
              const studentId = submissionData.userId;

              // Update submission
              transaction.set(submissionDocRef, { 
                  grade, 
                  feedback: feedback || '', 
                  status: 'reviewed' 
              }, { merge: true });

              // Update admin notification
              const adminNotifId = `notif_${submissionId}_admin`;
              transaction.set(doc(db, 'notifications', adminNotifId), { 
                  evaluated: true,
                  status: 'evaluated',
                  grade,
                  feedback: feedback || '',
                  completed: true,
                  read: true // Admin just evaluated it, so mark as read
              }, { merge: true });

              // Update student notification
              if (studentId) {
                  const studentNotifId = `notif_${submissionId}_${studentId}`;
                  transaction.set(doc(db, 'notifications', studentNotifId), {
                      read: false,
                      evaluated: true,
                      status: 'evaluated',
                      grade,
                      feedback: feedback || '',
                      timestamp: new Date().toISOString(),
                      type: 'EXERCISE_SUBMISSION',
                      topicId: submissionData.topicId || '',
                      subTopicId: submissionData.subTopicId || '',
                      topicTitle: submissionData.topicTitle || '',
                      subTopicTitle: submissionData.subTopicTitle || '',
                      submissionId: submissionId,
                      userId: studentId,
                      userName: submissionData.userName || 'Student',
                      targetUserId: studentId,
                      files: submissionData.files || []
                  }, { merge: true });
              }
          });
      } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, `submissions/${submissionId}`);
      }
  };

  const handleToggleNotificationCompleted = async (id: string, completed: boolean) => {
      try {
          await setDoc(doc(db, 'notifications', id), { completed }, { merge: true });
      } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, `notifications/${id}`);
      }
  };

  const handleDeleteFile = async (fileUrl: string, submissionId: string, fileName: string) => {
      if (!currentUser || currentUser.role !== 'admin') return;
      try {
          // 1. Delete from Storage
          const fileRef = ref(storage, fileUrl);
          await deleteObject(fileRef);

          // 2. Update Submission in Firestore to remove the file reference
          const submissionRef = doc(db, 'submissions', submissionId);
          const submissionSnap = await getDoc(submissionRef);
          
          if (submissionSnap.exists()) {
              const data = submissionSnap.data() as ExerciseSubmission;
              const updatedFiles = data.files.filter(f => f.url !== fileUrl);
              await setDoc(submissionRef, { files: updatedFiles }, { merge: true });
              
              // 3. Update Notification in Firestore
              const notif = notifications.find(n => n.submissionId === submissionId);
              if (notif) {
                  const updatedNotifFiles = notif.files.filter(f => f.url !== fileUrl);
                  await setDoc(doc(db, 'notifications', notif.id), { files: updatedNotifFiles }, { merge: true });
              }
          }
      } catch (error) {
          console.error("Failed to delete file:", error);
          throw error;
      }
  };

  const handleDeleteComment = async (id: string, commentId: string, isSubmission: boolean = false) => {
    if (!currentUser) return;

    const findComment = (list: Comment[], targetId: string): Comment | null => {
      for (const c of list) {
        if (c.id === targetId) return c;
        const found = findComment(c.replies, targetId);
        if (found) return found;
      }
      return null;
    };

    const deleteComment = (list: Comment[]): Comment[] => {
      return list
        .filter(c => c.id !== commentId) 
        .map(c => ({
          ...c,
          replies: deleteComment(c.replies) 
        }));
    };

    try {
      // 1. Get all related notifications first (outside transaction to avoid read-after-write issues)
      const notifQuery = isSubmission 
        ? query(collection(db, 'notifications'), where('submissionId', '==', id))
        : query(collection(db, 'notifications'), where('subTopicId', '==', id), where('type', '==', 'SUBMISSION_COMMENT'));
      
      const notifSnaps = await getDocs(notifQuery);

      await runTransaction(db, async (transaction) => {
        let updatedComments: Comment[] = [];
        let originalComments: Comment[] = [];
        
        if (isSubmission) {
          const submissionDocRef = doc(db, 'submissions', id);
          const submissionDoc = await transaction.get(submissionDocRef);
          if (!submissionDoc.exists()) return;
          
          originalComments = submissionDoc.data().comments || [];
        } else {
          const commentDocRef = doc(db, 'comments', id);
          const commentDoc = await transaction.get(commentDocRef);
          if (!commentDoc.exists()) return;

          originalComments = commentDoc.data().comments || [];
        }

        const commentToDelete = findComment(originalComments, commentId);
        if (!commentToDelete) return;

        // Only allow deleting own comment (admins can delete any for moderation)
        if (currentUser.role !== 'admin' && commentToDelete.userId !== currentUser.id) {
          console.error("Unauthorized comment deletion attempt");
          return;
        }

        updatedComments = deleteComment(originalComments);

        if (isSubmission) {
          const submissionDocRef = doc(db, 'submissions', id);
          transaction.set(submissionDocRef, { comments: updatedComments }, { merge: true });
        } else {
          const commentDocRef = doc(db, 'comments', id);
          transaction.set(commentDocRef, { comments: updatedComments }, { merge: true });
        }

        // Update ALL related notifications in Firestore
        notifSnaps.forEach(notifDoc => {
          const notifData = notifDoc.data() as AppNotification;
          const updatedNotifComments = deleteComment(notifData.comments || []);
          
          if (notifData.type === 'SUBMISSION_COMMENT' && updatedNotifComments.length === 0) {
            transaction.delete(notifDoc.ref);
          } else {
            transaction.set(notifDoc.ref, { comments: updatedNotifComments }, { merge: true });
          }
        });
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, isSubmission ? `submissions/${id}` : `comments/${id}`);
    }
  };

  const handleReaction = async (id: string, commentId: string, emoji: string, isSubmission: boolean = false) => {
    if (!currentUser) return;
    try {
      await runTransaction(db, async (transaction) => {
        const docRef = doc(db, isSubmission ? 'submissions' : 'comments', id);
        const docSnap = await transaction.get(docRef);
        
        if (!docSnap.exists()) return;

        const comments = docSnap.data().comments || [];
        const updateReactions = (c: Comment): Comment => {
          if (c.id === commentId) {
            const reactions = { ...c.reactions };
            
            // Find if user already has a reaction to this comment
            let existingEmoji = '';
            Object.keys(reactions).forEach(e => {
              const uids = Array.isArray(reactions[e]) ? reactions[e] : [];
              if (uids.includes(currentUser.id)) {
                existingEmoji = e;
              }
            });

            // Remove user from ALL emojis for this comment (enforce one reaction)
            Object.keys(reactions).forEach(e => {
              const uids = Array.isArray(reactions[e]) ? reactions[e] : [];
              reactions[e] = uids.filter(uid => uid !== currentUser.id);
              if (reactions[e].length === 0) delete reactions[e];
            });

            // If clicking a DIFFERENT emoji, add it. If clicking SAME emoji, it stays removed (toggle).
            if (existingEmoji !== emoji) {
              reactions[emoji] = [...(reactions[emoji] || []), currentUser.id];
            }

            return { ...c, reactions };
          }
          if (c.replies.length > 0) {
            return { ...c, replies: c.replies.map(r => updateReactions(r)) };
          }
          return c;
        };
        const updatedComments = comments.map(updateReactions);
        transaction.set(docRef, { comments: updatedComments }, { merge: true });
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${isSubmission ? 'submissions' : 'comments'}/${id}`);
    }
  };

  if (viewState === ViewState.LOGIN) {
      return (
        <Login 
            onLogin={handleLogin} 
            validUsers={currentUsers} 
            bootstrapAdminEmail={BOOTSTRAP_ADMIN_EMAIL}
            landingConfig={landingConfig}
            theme={theme}
        />
      );
  }

  if (viewState === ViewState.ADMIN_BUILDER && currentUser?.role === 'admin') {
      return (
        <AdminBuilder 
            initialTopics={currentTopics} 
            initialTeachers={currentTeachers}
            initialUsers={currentUsers}
            initialTags={currentTags}
            initialLandingConfig={landingConfig}
            notifications={notifications}
            submissions={allSubmissions}
            initialTab={adminInitialTab}
            onApplyChanges={handleApplyAdminChanges}
            onExit={() => setViewState(ViewState.HOME)}
            onPostSubmissionComment={handlePostSubmissionComment}
            onDeleteComment={handleDeleteComment}
            onMarkNotificationRead={handleMarkNotificationRead}
            onDeleteNotification={handleDeleteNotification}
            onEvaluateSubmission={handleEvaluateSubmission}
            onRequestResubmission={handleRequestResubmission}
            onToggleNotificationCompleted={handleToggleNotificationCompleted}
            onDeleteFile={handleDeleteFile}
            isAdmin={true}
            theme={theme}
        />
      );
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 selection:bg-blue-500/30 font-sans ${theme === 'dark' ? 'bg-slate-950 text-slate-200' : 'bg-slate-50 text-slate-800'}`}>
      <style>{pulsingRedStyle}</style>
      <Joyride
        steps={tourSteps}
        run={runTour}
        continuous={true}
        showProgress={false}
        showSkipButton={true}
        callback={handleTourCallback}
        tooltipComponent={(props) => <TourTooltip {...props} theme={theme} />}
        scrollDuration={400}
        scrollOffset={150}
        disableScrolling={false}
        disableScrollParentFix={false}
        spotlightPadding={10}
        disableOverlayClose={true}
        spotlightClicks={false}
        styles={{
          options: {
            primaryColor: '#3b82f6',
            zIndex: 10000,
            overlayColor: 'rgba(2, 6, 23, 0.85)',
          },
          spotlight: {
            borderRadius: 0,
            border: 'none',
            boxShadow: '0 0 20px rgba(59, 130, 246, 0.4)',
          },
          overlay: {
            // Transitions handled via body class in index.html
          }
        }}
        floaterProps={{
          disableAnimation: true,
        }}
      />

      {showTourPrompt && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4">
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl max-w-md w-full shadow-2xl text-center animate-in zoom-in duration-300">
            <div className="w-16 h-16 bg-blue-600/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Network className="w-8 h-8 text-blue-500" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Welcome to the Platform!</h2>
            <p className="text-slate-400 mb-8">Would you like a quick tour of the interface to help you get started?</p>
            
            <div className="space-y-3">
              <button 
                onClick={startTour}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-900/20"
              >
                Take the Tour
              </button>
              <button 
                onClick={skipTour}
                className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-all"
              >
                Skip for Now
              </button>
            </div>

            <div className="mt-6 flex items-center justify-center gap-2">
              <input 
                type="checkbox" 
                id="dontAskAgain" 
                checked={dontAskTourAgain}
                onChange={(e) => setDontAskTourAgain(e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="dontAskAgain" className="text-sm text-slate-500 cursor-pointer select-none">
                Don't ask me again
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Celebration Modal */}
      <AnimatePresence>
        {showCelebration && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 p-8 md:p-12 rounded-3xl max-w-lg w-full shadow-2xl relative overflow-hidden text-center"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-green-500 to-blue-500"></div>
              
              <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-500/30">
                <CheckCircle2 className="w-10 h-10 text-green-400" />
              </div>
              
              <h2 className="text-3xl font-bold text-white mb-4">Congratulations!</h2>
              <p className="text-slate-400 text-lg mb-8">
                You now master the main interface. You're ready to start your learning journey!
              </p>
              
              <button 
                onClick={() => setShowCelebration(false)}
                className="w-full py-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-500 transition-all shadow-lg shadow-blue-900/20 active:scale-[0.98]"
              >
                Let's Get Started
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      {/* Prerequisite Alert Modal */}
      {lockedTopicAlert && lockedTopicAlert.show && (
          <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-slate-900 border border-slate-700 rounded-2xl p-8 max-w-md w-full shadow-2xl relative overflow-hidden animate-in zoom-in-95">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                  
                  <div className="flex flex-col items-center text-center">
                      <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-6 ring-4 ring-slate-800 ring-offset-2 ring-offset-slate-900">
                          <Lock className="w-8 h-8 text-yellow-500" />
                      </div>
                      
                      <h3 className="text-xl font-bold text-white mb-2">Topic Locked</h3>
                      <p className="text-slate-400 mb-6">
                          To access <span className="text-white font-medium">{lockedTopicAlert.topic?.title}</span>, you must first complete the following prerequisites:
                      </p>

                      <div className="w-full bg-slate-800/50 rounded-xl p-4 mb-6 border border-slate-700/50 text-left">
                          <ul className="space-y-3">
                              {lockedTopicAlert.missing.map(p => (
                                  <li key={p.id} className="flex items-center gap-3 text-sm text-slate-300">
                                      <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center shrink-0 border border-slate-600">
                                          <AlertTriangle className="w-3 h-3 text-yellow-500" />
                                      </div>
                                      <span>{p.title}</span>
                                  </li>
                              ))}
                          </ul>
                      </div>

                      <button 
                          onClick={() => setLockedTopicAlert(null)}
                          className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-xl transition-colors w-full"
                      >
                          I Understand
                      </button>
                  </div>
              </div>
          </div>
      )}

      {viewState === ViewState.HOME && (
        <div className={`h-screen flex flex-col relative overflow-hidden transition-colors duration-300 ${theme === 'dark' ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>
          
          {/* Navigation Bar */}
          <nav className={`h-20 border-b fixed w-full z-40 flex items-center justify-between px-6 lg:px-8 transition-colors duration-300 ${theme === 'dark' ? 'border-slate-800 bg-slate-950/90 backdrop-blur' : 'border-slate-200 bg-white/90 backdrop-blur'}`}>
            <div className="flex items-center gap-3">
               {getThemeImage(landingConfig.appLogoUrlLight, landingConfig.appLogoUrlDark, landingConfig.appLogoUrl) ? (
                   <img src={getThemeImage(landingConfig.appLogoUrlLight, landingConfig.appLogoUrlDark, landingConfig.appLogoUrl) || undefined} alt="Logo" className="h-10 w-auto object-contain" />
               ) : (
                   <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/20">
                      <Layers className="text-white w-6 h-6" />
                   </div>
               )}
               <div className="hidden lg:block">
                   <span className={`text-xl font-bold block leading-none ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{landingConfig.title}</span>
                   <span className={`text-[10px] font-medium uppercase tracking-widest ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>{landingConfig.subtitle}</span>
               </div>
            </div>
            
            <div className={`flex p-1 rounded-lg border transition-colors ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-slate-200 border-slate-300'}`}>
                <button 
                    onClick={() => setDashboardMode('GRAPH')}
                    id="tab-graph"
                    className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-md text-sm font-medium transition-all ${dashboardMode === 'GRAPH' ? 'bg-[#2c5ee8] text-white shadow-sm' : (theme === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900')}`}
                >
                    <Network className="w-4 h-4" />
                    <span className="hidden lg:inline">Knowledge Graph</span>
                </button>
                <button 
                    onClick={() => setDashboardMode('LIST')}
                    id="tab-list"
                    className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-md text-sm font-medium transition-all ${dashboardMode === 'LIST' ? (theme === 'dark' ? 'bg-slate-800 text-white' : 'bg-white text-slate-900 shadow-sm') : (theme === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900')}`}
                >
                    <List className="w-4 h-4" />
                    <span className="hidden lg:inline">Modules</span>
                </button>
                {currentUser?.role === 'admin' && (
                    <button 
                        onClick={() => setDashboardMode('NOTIFICATIONS')}
                        id="tab-notifications"
                        className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-md text-sm font-medium transition-all relative ${dashboardMode === 'NOTIFICATIONS' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                    >
                        <Bell className={`w-4 h-4 ${notifications.some(n => !n.read) ? 'text-red-500 animate-pulse-red' : ''}`} />
                        <span className="hidden lg:inline">Notifications</span>
                        {notifications.filter(n => !n.read).length > 0 && (
                            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-slate-900 shadow-[0_0_8px_rgba(239,68,68,0.5)]">
                                {notifications.filter(n => !n.read).length}
                            </span>
                        )}
                    </button>
                )}
                {landingConfig.showStudentAnalytics && (
                    <button 
                        onClick={() => setDashboardMode('ANALYTICS')}
                        id="tab-analytics"
                        className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-md text-sm font-medium transition-all ${dashboardMode === 'ANALYTICS' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                    >
                        <BarChart3 className="w-4 h-4" />
                        <span className="hidden lg:inline">Analytics</span>
                    </button>
                )}
                {(currentUser?.role === 'admin' || landingConfig.showTeachersTab !== false) && (
                    <button 
                        onClick={() => setDashboardMode('TEACHERS')}
                        id="tab-teachers"
                        className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-md text-sm font-medium transition-all ${dashboardMode === 'TEACHERS' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                    >
                        <GraduationCap className="w-4 h-4" />
                        <span className="hidden lg:inline">Teachers</span>
                    </button>
                )}
            </div>

            <div className="flex items-center gap-4">
                {currentUser?.role === 'admin' && (
                    <button 
                        onClick={() => setViewState(ViewState.ADMIN_BUILDER)}
                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                        title="Admin Builder"
                    >
                        <Edit3 className="w-4 h-4" />
                        <span className="hidden md:inline">Admin Builder</span>
                    </button>
                )}

                {currentUser && (
                    <div className="flex items-center gap-3 border-l border-slate-800 pl-4 relative">
                        {/* Notification Bell */}
                        <div className="relative" ref={notificationsDropdownRef}>
                            <button 
                                onClick={() => {
                                    if (notifications.filter(n => !n.read).length > 0) {
                                        setShowNotificationsDropdown(!showNotificationsDropdown);
                                    } else {
                                        setDashboardMode('NOTIFICATIONS');
                                    }
                                }}
                                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-all relative group"
                                title="Notifications"
                            >
                                <Bell className={`w-5 h-5 ${notifications.some(n => !n.read) ? 'text-red-500 animate-pulse-red' : ''}`} />
                                {notifications.filter(n => !n.read).length > 0 && (
                                    <span className="absolute top-1 right-1 w-4 h-4 bg-red-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-slate-950 shadow-[0_0_8px_rgba(239,68,68,0.5)]">
                                        {notifications.filter(n => !n.read).length}
                                    </span>
                                )}
                            </button>

                            {showNotificationsDropdown && (
                                <div className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <div className="px-4 py-2 border-b border-slate-800 mb-2 flex justify-between items-center">
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">New Notifications</p>
                                        <button 
                                            onClick={() => {
                                                setShowNotificationsDropdown(false);
                                                setDashboardMode('NOTIFICATIONS');
                                            }}
                                            className="text-[10px] text-blue-400 hover:text-blue-300 font-medium"
                                        >
                                            View All
                                        </button>
                                    </div>
                                    <div className="max-h-96 overflow-y-auto">
                                        {notifications.filter(n => !n.read).length === 0 ? (
                                            <div className="px-4 py-8 text-center">
                                                <Bell className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                                                <p className="text-sm text-slate-500">No new notifications</p>
                                            </div>
                                        ) : (
                                            notifications.filter(n => !n.read).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map(notif => (
                                                <button 
                                                    key={notif.id}
                                                    onClick={() => handleNotificationClick(notif)}
                                                    className="w-full px-4 py-3 hover:bg-slate-800/50 text-left transition-all border-b border-slate-800/30 last:border-0 group"
                                                >
                                                    <div className="flex gap-3">
                                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${notif.type === 'DEADLINE_WARNING' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                                            {notif.type === 'DEADLINE_WARNING' ? <AlertTriangle size={14} /> : <MessageSquare size={14} />}
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-xs font-bold text-white truncate group-hover:text-blue-400 transition-colors">{notif.userName}</p>
                                                            <p className="text-[10px] text-slate-400 truncate mb-1">{notif.subTopicTitle}</p>
                                                            <p className="text-[9px] text-slate-600 font-mono">{new Date(notif.timestamp).toLocaleString()}</p>
                                                        </div>
                                                    </div>
                                                </button>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="relative" ref={userDropdownRef}>
                            <button 
                                onClick={() => setShowUserDropdown(!showUserDropdown)}
                                className={`flex items-center gap-2 p-1 rounded-full transition-colors relative ${theme === 'dark' ? 'hover:bg-slate-800' : 'hover:bg-slate-200'}`}
                            >
                                <img src={currentUser.avatar || undefined} alt="User" className={`w-8 h-8 rounded-full border ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-slate-200 border-slate-300'}`} />
                                <ChevronDown className={`w-4 h-4 transition-transform ${showUserDropdown ? 'rotate-180' : ''} ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`} />
                            </button>

                            {showUserDropdown && (
                                <div className={`absolute right-0 mt-2 w-56 border rounded-xl shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200 ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                                    <div className={`px-4 py-2 border-b mb-2 ${theme === 'dark' ? 'border-slate-800' : 'border-slate-100'}`}>
                                        <p className={`text-sm font-bold truncate ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{currentUser.name}</p>
                                        <p className="text-[10px] text-slate-500 uppercase tracking-wider">{currentUser.role}</p>
                                    </div>
                                        
                                        <button 
                                            onClick={() => {
                                                setDashboardMode('NOTIFICATIONS');
                                                setShowUserDropdown(false);
                                            }}
                                            className={`w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors ${theme === 'dark' ? 'text-slate-300 hover:bg-slate-800 hover:text-white' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                                        >
                                            <Bell className="w-4 h-4 text-blue-400" />
                                            <span>Notifications</span>
                                            {notifications.filter(n => !n.read).length > 0 && (
                                                <span className="ml-auto bg-blue-500/20 text-blue-400 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                                                    {notifications.filter(n => !n.read).length}
                                                </span>
                                            )}
                                        </button>

                                        <button 
                                            onClick={toggleTheme}
                                            className={`w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors ${theme === 'dark' ? 'text-slate-300 hover:bg-slate-800 hover:text-white' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                                        >
                                            {theme === 'dark' ? (
                                                <>
                                                    <Sun className="w-4 h-4 text-amber-400" />
                                                    <span>Light Mode</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Moon className="w-4 h-4 text-indigo-400" />
                                                    <span>Dark Mode</span>
                                                </>
                                            )}
                                        </button>

                                        <button 
                                            onClick={handleLogout}
                                            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-400 hover:bg-red-400/10 transition-colors"
                                        >
                                            <LogOut className="w-4 h-4" />
                                            <span>Logout</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                )}
            </div>
          </nav>

          {/* Main Content Area */}
          <div className="flex-1 pt-20 h-full relative">
            
            {showWelcomeOverlay && (
                <div className={`absolute inset-0 z-50 flex items-center justify-center backdrop-blur-sm animate-in fade-in duration-500 p-4 md:p-6 ${theme === 'dark' ? 'bg-slate-950/80' : 'bg-slate-50/80'}`}>
                    <div className={`p-6 md:p-10 rounded-3xl max-w-2xl w-full shadow-2xl relative overflow-hidden border ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                        
                        <div className="relative z-10">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-wider mb-6">
                                <BookOpen className="w-3 h-3" /> {landingConfig.tag}
                            </div>
                            
                            <h1 className={`text-4xl md:text-5xl font-extrabold mb-6 leading-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                {landingConfig.welcomeTitle || landingConfig.title}
                            </h1>
                            
                            {landingConfig.welcomeSubtitle && (
                                <p className="text-blue-400 font-bold text-sm uppercase tracking-widest mb-4">
                                    {landingConfig.welcomeSubtitle}
                                </p>
                            )}
                            
                            <p className={`text-lg mb-8 leading-relaxed ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                                {landingConfig.welcomeDescription || landingConfig.description}
                            </p>

                            <div className="flex flex-col sm:flex-row gap-4">
                                <button 
                                    onClick={() => setShowWelcomeOverlay(false)}
                                    className="px-8 py-3.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-500 transition-colors flex items-center justify-center gap-2 group shadow-lg shadow-blue-900/20"
                                >
                                    {landingConfig.welcomeButtonText || 'Continue to Dashboard'}
                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className={`w-full h-full ${theme === 'dark' ? 'bg-slate-950' : 'bg-slate-50'}`}>
                {dashboardMode === 'GRAPH' && (
                    <div className="w-full h-full relative">
                        <TopicGraph 
                            topics={currentTopics} 
                            onSelectTopic={handleTopicSelect} 
                            completedSubTopics={completedSubTopics}
                            lockedTopicIds={lockedTopicIds}
                            prerequisiteLockedIds={prerequisiteLockedIds}
                            graphTitle={landingConfig.graphTitle}
                            graphSubtitle={landingConfig.graphSubtitle}
                            onStartTour={() => setRunTour(true)}
                            theme={theme}
                        />
                    </div>
                )}

                {dashboardMode === 'LIST' && (
                    <ModuleList 
                        topics={currentTopics} 
                        completedSubTopics={completedSubTopics}
                        onSelectTopic={handleTopicSelect}
                        lockedTopicIds={lockedTopicIds}
                        prerequisiteLockedIds={prerequisiteLockedIds}
                        theme={theme}
                    />
                )}

                {dashboardMode === 'TEACHERS' && (
                    <div className={`w-full h-full overflow-y-auto ${theme === 'dark' ? 'bg-[#0f172a]' : 'bg-slate-50'}`}>
                        {!selectedTeacherEmail ? (
                            <div className="p-8 max-w-7xl mx-auto">
                                <h2 className={`text-3xl font-bold mb-8 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Instructors</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {uniqueTeachers.map(t => (
                                        <div 
                                            key={t.email} 
                                            onClick={() => setSelectedTeacherEmail(t.email)} 
                                            className={`rounded-2xl border p-6 transition-all cursor-pointer group ${theme === 'dark' ? 'bg-slate-900 border-slate-800 hover:bg-slate-800 hover:border-slate-700' : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300 shadow-sm'}`}
                                        >
                                             <div className={`rounded-xl p-4 border ${theme === 'dark' ? 'bg-slate-950/50 border-slate-800/50' : 'bg-slate-50 border-slate-100'} flex flex-col items-center text-center`}>
                                                <img src={t.avatar || undefined} alt={t.name} className={`w-24 h-24 rounded-full mb-4 object-cover border-4 transition-colors ${theme === 'dark' ? 'border-slate-800 group-hover:border-blue-500/50' : 'border-white group-hover:border-blue-200 shadow-sm'}`} />
                                                <h3 className={`text-xl font-bold mb-1 transition-colors ${theme === 'dark' ? 'text-white group-hover:text-blue-400' : 'text-slate-900 group-hover:text-blue-600'}`}>{t.name}</h3>
                                                <p className={theme === 'dark' ? 'text-slate-400 text-sm mb-4' : 'text-slate-500 text-sm mb-4'}>{t.role}</p>
                                                
                                                {t.bio && (
                                                    <p className={`text-xs line-clamp-2 mb-6 h-8 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-600'}`}>{t.bio}</p>
                                                )}
 
                                                <div className={`w-full rounded-lg p-3 border mb-6 ${theme === 'dark' ? 'bg-slate-800/50 border-slate-700/50' : 'bg-white border-slate-100 shadow-sm'}`}>
                                                    <div className={`text-xs font-mono mb-1 uppercase tracking-wider p-1 rounded ${theme === 'dark' ? 'text-slate-500 bg-slate-950/50' : 'text-slate-400 bg-slate-50'}`}>Modules Taught</div>
                                                    <div className={`text-lg font-bold p-1 rounded ${theme === 'dark' ? 'text-white bg-slate-950/50' : 'text-slate-900 bg-slate-50'}`}>
                                                        {currentTopics.filter(top => top.teacher?.email === t.email).length}
                                                    </div>
                                                </div>

                                                <div className="flex items-center text-blue-500 text-sm font-bold bg-blue-500/10 px-4 py-2 rounded-full border border-blue-500/20 group-hover:bg-blue-500 group-hover:text-white transition-all">
                                                    View Curriculum <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                                                </div>
                                             </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col h-full">
                                <div className="p-6 pb-0 max-w-4xl mx-auto w-full">
                                    <button onClick={() => setSelectedTeacherEmail(null)} className={`flex items-center gap-2 transition-colors mb-4 group ${theme === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}>
                                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Back to Instructors
                                    </button>
                                    
                                    {(() => {
                                        const teacher = uniqueTeachers.find(t => t.email === selectedTeacherEmail);
                                        return teacher ? (
                                            <div className={`flex items-center gap-4 mb-6 border p-4 rounded-xl ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
                                                <img src={teacher.avatar || undefined} alt={teacher.name} className={`w-12 h-12 rounded-full border ${theme === 'dark' ? 'border-slate-700' : 'border-slate-100'}`} />
                                                <div>
                                                    <h2 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{teacher.name}</h2>
                                                    <p className={theme === 'dark' ? 'text-slate-400 text-sm' : 'text-slate-500 text-sm'}>Instructor Curriculum</p>
                                                </div>
                                            </div>
                                        ) : null;
                                    })()}
                                </div>
                                <div className="flex-1">
                                    <ModuleList 
                                        topics={currentTopics.filter(t => t.teacher?.email === selectedTeacherEmail)} 
                                        completedSubTopics={completedSubTopics}
                                        onSelectTopic={handleTopicSelect}
                                        lockedTopicIds={lockedTopicIds}
                                        prerequisiteLockedIds={prerequisiteLockedIds}
                                        theme={theme}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {dashboardMode === 'ANALYTICS' && userWithProgress && (
                    <div className="h-full overflow-y-auto">
                        {currentUser?.role === 'admin' ? (
                            <div className="p-6">
                                <AnalyticsView 
                                    users={currentUsers}
                                    topics={currentTopics}
                                    tags={currentTags}
                                    landingConfig={landingConfig}
                                    notifications={notifications}
                                    submissions={allSubmissions}
                                    onEvaluateSubmission={handleEvaluateSubmission}
                                    onRequestResubmission={handleRequestResubmission}
                                    onPostSubmissionComment={handlePostSubmissionComment}
                                    onDeleteComment={handleDeleteComment}
                                    onDeleteFile={handleDeleteFile}
                                    isAdmin={true}
                                    theme={theme}
                                />
                            </div>
                        ) : (
                            <StudentAnalyticsView 
                                user={userWithProgress} 
                                currentUser={currentUser}
                                topics={currentTopics} 
                                landingConfig={landingConfig} 
                                submissions={studentSubmissions}
                                onPostSubmissionComment={handlePostSubmissionComment}
                                onDeleteComment={handleDeleteComment}
                                initialTab={studentInitialTab}
                                theme={theme}
                            />
                        )}
                    </div>
                )}

                {dashboardMode === 'NOTIFICATIONS' && (
                    <div className={`h-full overflow-y-auto ${theme === 'dark' ? 'bg-[#0f172a]' : 'bg-slate-50'}`}>
                        {currentUser?.role === 'admin' ? (
                            <div className="p-6 max-w-7xl mx-auto">
                                <NotificationsView 
                                    notifications={notifications}
                                    highlightedId={highlightedNotificationId}
                                    onMarkRead={handleMarkNotificationRead}
                                    onDelete={handleDeleteNotification}
                                    onEvaluate={handleEvaluateSubmission}
                                    onRequestResubmission={handleRequestResubmission}
                                    onPostSubmissionComment={handlePostSubmissionComment}
                                    onToggleCompleted={handleToggleNotificationCompleted}
                                    onDeleteFile={handleDeleteFile}
                                    onNavigateToModule={handleNavigateToModule}
                                    isAdmin={true}
                                    theme={theme}
                                />
                            </div>
                        ) : (
                            <div className="p-6 max-w-7xl mx-auto">
                                <NotificationsView 
                                    notifications={notifications}
                                    highlightedId={highlightedNotificationId}
                                    onMarkRead={handleMarkNotificationRead}
                                    onDelete={handleDeleteNotification}
                                    onEvaluate={handleEvaluateSubmission}
                                    onPostSubmissionComment={handlePostSubmissionComment}
                                    onToggleCompleted={handleToggleNotificationCompleted}
                                    onDeleteFile={handleDeleteFile}
                                    onNavigateToModule={handleNavigateToModule}
                                    isAdmin={false}
                                    theme={theme}
                                />
                            </div>
                        )}
                    </div>
                )}
            </div>

          </div>
        </div>
      )}

      {viewState === ViewState.TOPIC && selectedTopic && (
        <TopicDetail 
            topic={selectedTopic} 
            topics={currentTopics}
            initialSubTopicId={selectedSubTopicId}
            currentUser={currentUser}
            onBack={handleBackToHome} 
            completedSubTopics={completedSubTopics}
            submittedExercises={submittedExercises}
            quizProgress={quizProgress}
            submissions={studentSubmissions}
            onToggleComplete={toggleSubTopicCompletion}
            onSubmitExercise={handleExerciseSubmission}
            userComments={topicComments}
            onAddComment={addComment}
            onReply={handleReply}
            onReaction={handleReaction}
            onDeleteComment={handleDeleteComment}
            onSubTopicChange={(id) => setSelectedSubTopicId(id)}
            onUpdateUser={(user) => setCurrentUser(user)}
            theme={theme}
        />
      )}
    </div>
  );
};

export default App;
