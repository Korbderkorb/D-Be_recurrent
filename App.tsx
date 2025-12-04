
import React, { useState, useEffect, useMemo } from 'react';
import { TOPICS, teachers as INITIAL_TEACHERS } from './constants';
import { Topic, ViewState, User, Comment, QuizAttempt, Teacher } from './types';
import TopicGraph from './components/TopicGraph';
import TopicDetail from './components/TopicDetail';
import Login from './components/Login';
import ModuleList from './components/ModuleList';
import AdminBuilder from './components/AdminBuilder';
import { BookOpen, Layers, Search, LogOut, LayoutGrid, Network, ArrowRight, ArrowLeft, Edit3, Lock, AlertTriangle, GraduationCap } from 'lucide-react';

const App: React.FC = () => {
  const [viewState, setViewState] = useState<ViewState>(ViewState.LOGIN);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [selectedSubTopicId, setSelectedSubTopicId] = useState<string | undefined>(undefined);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [lockedTopicAlert, setLockedTopicAlert] = useState<{show: boolean, topic: Topic | null, missing: Topic[]} | null>(null);
  
  // App Data State (mutable for Admin Builder)
  const [currentTopics, setCurrentTopics] = useState<Topic[]>(TOPICS);
  // Transform initial teachers Record to Array
  const [currentTeachers, setCurrentTeachers] = useState<Teacher[]>(Object.entries(INITIAL_TEACHERS).map(([key, t]) => ({...t, id: key})));
  // Mock Users State
  const [currentUsers, setCurrentUsers] = useState<User[]>([
      {
          id: 'admin',
          email: 'admin@d-be.com',
          name: 'Administrator',
          avatar: `https://ui-avatars.com/api/?name=Admin&background=334155&color=fff`,
          role: 'admin',
          password: 'admin',
          allowedTopics: TOPICS.map(t => t.id),
          stats: { modulesCompleted: 0, totalModules: 0, lastActive: 'Now', quizScores: [] }
      },
      {
          id: 'demo',
          email: 'demo@d-be.com',
          name: 'Demo Student',
          avatar: `https://ui-avatars.com/api/?name=Demo&background=0D8ABC&color=fff`,
          role: 'student',
          password: 'demo',
          allowedTopics: TOPICS.map(t => t.id), // All access by default
          stats: { modulesCompleted: 5, totalModules: 20, lastActive: 'Yesterday', quizScores: [] }
      }
  ]);

  // Dashboard State
  const [showWelcomeOverlay, setShowWelcomeOverlay] = useState(true);
  const [dashboardMode, setDashboardMode] = useState<'GRAPH' | 'LIST' | 'TEACHERS'>('GRAPH');
  const [selectedTeacherEmail, setSelectedTeacherEmail] = useState<string | null>(null);

  // Persistence State
  const [completedSubTopics, setCompletedSubTopics] = useState<Set<string>>(new Set());
  const [submittedExercises, setSubmittedExercises] = useState<Set<string>>(new Set());
  const [topicComments, setTopicComments] = useState<Record<string, Comment[]>>({});
  const [quizProgress, setQuizProgress] = useState<Record<string, QuizAttempt[]>>({});

  // Responsive Initialization
  useEffect(() => {
    if (window.innerWidth < 768) {
      setDashboardMode('LIST');
    }
  }, []);

  // Load from LocalStorage on mount
  useEffect(() => {
    const savedProgress = localStorage.getItem('dbe_progress');
    const savedExercises = localStorage.getItem('dbe_exercises');
    const savedComments = localStorage.getItem('dbe_comments');
    const savedQuizProgress = localStorage.getItem('dbe_quiz_state');

    if (savedProgress) setCompletedSubTopics(new Set(JSON.parse(savedProgress)));
    if (savedExercises) setSubmittedExercises(new Set(JSON.parse(savedExercises)));
    if (savedComments) setTopicComments(JSON.parse(savedComments));
    if (savedQuizProgress) setQuizProgress(JSON.parse(savedQuizProgress));
  }, []);

  // Save to LocalStorage on change
  useEffect(() => {
    localStorage.setItem('dbe_progress', JSON.stringify(Array.from(completedSubTopics)));
  }, [completedSubTopics]);

  useEffect(() => {
    localStorage.setItem('dbe_exercises', JSON.stringify(Array.from(submittedExercises)));
  }, [submittedExercises]);

  useEffect(() => {
    localStorage.setItem('dbe_comments', JSON.stringify(topicComments));
  }, [topicComments]);

  useEffect(() => {
      localStorage.setItem('dbe_quiz_state', JSON.stringify(quizProgress));
  }, [quizProgress]);

  // Derived Locked State based on User Permissions
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

  // Derived Teachers List (from state now)
  const uniqueTeachers = useMemo(() => {
      const map = new Map();
      // Use currentTopics teachers to ensure we show active teachers, 
      // OR just use currentTeachers state directly if we want to show all available instructors.
      // Let's use currentTeachers state for the Teachers Tab list.
      return currentTeachers;
  }, [currentTeachers]);

  const handleLogin = (user: User) => {
      // In a real app, we check the DB. Here we check the mock state.
      const foundUser = currentUsers.find(u => u.email === user.email);
      if (foundUser) {
          setCurrentUser(foundUser);
      } else {
          // Fallback for ad-hoc logins from Login component if not in DB (legacy behavior)
          setCurrentUser(user);
      }
      setViewState(ViewState.HOME);
      setShowWelcomeOverlay(true); 
  };

  const handleLogout = () => {
      setCurrentUser(null);
      setSelectedTopic(null);
      setViewState(ViewState.LOGIN);
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

  const handleApplyAdminChanges = (newTopics: Topic[], newTeachers: Teacher[], newUsers: User[]) => {
      setCurrentTopics(newTopics);
      setCurrentTeachers(newTeachers);
      setCurrentUsers(newUsers);
      
      // If current user was updated, refresh session
      if (currentUser) {
          const freshUser = newUsers.find(u => u.id === currentUser.id);
          if (freshUser) setCurrentUser(freshUser);
      }
  };

  const toggleSubTopicCompletion = (subTopicId: string) => {
    setCompletedSubTopics(prev => {
        const next = new Set(prev);
        if (next.has(subTopicId)) {
            next.delete(subTopicId);
        } else {
            next.add(subTopicId);
        }
        return next;
    });
  };

  const handleExerciseSubmission = (subTopicId: string, quizData?: QuizAttempt) => {
      if (quizData) {
          setQuizProgress(prev => ({
              ...prev,
              [subTopicId]: [...(prev[subTopicId] || []), quizData]
          }));
          
          if (quizData.passed) {
              setSubmittedExercises(prev => new Set(prev).add(subTopicId));
              setCompletedSubTopics(prev => new Set(prev).add(subTopicId));
          }
      } else {
          setSubmittedExercises(prev => new Set(prev).add(subTopicId));
          setCompletedSubTopics(prev => new Set(prev).add(subTopicId));
      }
  };

  const addComment = (subTopicId: string, text: string) => {
      if (!currentUser) return;
      const newComment: Comment = {
          id: Date.now().toString(),
          user: currentUser.name,
          avatar: currentUser.avatar,
          text: text,
          timestamp: 'Just now',
          reactions: {},
          replies: []
      };
      
      setTopicComments(prev => ({
          ...prev,
          [subTopicId]: [...(prev[subTopicId] || []), newComment]
      }));
  };

  const handleReply = (subTopicId: string, parentCommentId: string, text: string) => {
      if (!currentUser) return;
      const newReply: Comment = {
          id: Date.now().toString(),
          user: currentUser.name,
          avatar: currentUser.avatar,
          text: text,
          timestamp: 'Just now',
          reactions: {},
          replies: []
      };

      setTopicComments(prev => {
          const comments = prev[subTopicId] || [];
          const addReplyToComment = (c: Comment): Comment => {
              if (c.id === parentCommentId) {
                  return { ...c, replies: [...c.replies, newReply] };
              }
              if (c.replies.length > 0) {
                  return { ...c, replies: c.replies.map(addReplyToComment) };
              }
              return c;
          };
          return { ...prev, [subTopicId]: comments.map(addReplyToComment) };
      });
  };

  const handleDeleteComment = (subTopicId: string, commentId: string) => {
      setTopicComments(prev => {
          const comments = prev[subTopicId] || [];
          const deleteComment = (list: Comment[]): Comment[] => {
              return list
                  .filter(c => c.id !== commentId) 
                  .map(c => ({
                      ...c,
                      replies: deleteComment(c.replies) 
                  }));
          };
          return { ...prev, [subTopicId]: deleteComment(comments) };
      });
  };

  const handleReaction = (subTopicId: string, commentId: string, emoji: string) => {
      setTopicComments(prev => {
          const comments = prev[subTopicId] || [];
          const updateReactions = (c: Comment): Comment => {
              if (c.id === commentId) {
                  const currentCount = c.reactions[emoji] || 0;
                  return { 
                      ...c, 
                      reactions: { ...c.reactions, [emoji]: currentCount + 1 } 
                  };
              }
              if (c.replies.length > 0) {
                  return { ...c, replies: c.replies.map(r => updateReactions(r)) };
              }
              return c;
          };
          return { ...prev, [subTopicId]: comments.map(updateReactions) };
      });
  };

  if (viewState === ViewState.LOGIN) {
      return <Login onLogin={handleLogin} validUsers={currentUsers} />;
  }

  if (viewState === ViewState.ADMIN_BUILDER && currentUser?.role === 'admin') {
      return (
        <AdminBuilder 
            initialTopics={currentTopics} 
            initialTeachers={currentTeachers}
            initialUsers={currentUsers}
            onApplyChanges={handleApplyAdminChanges}
            onExit={() => setViewState(ViewState.HOME)}
        />
      );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 selection:bg-blue-500/30 font-sans">
      
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
        <div className="h-screen flex flex-col relative overflow-hidden">
          
          {/* Navigation Bar */}
          <nav className="h-20 border-b border-slate-800 bg-slate-950/90 backdrop-blur fixed w-full z-40 flex items-center justify-between px-6 lg:px-8">
            <div className="flex items-center gap-3">
               <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/20">
                  <Layers className="text-white w-6 h-6" />
               </div>
               <div className="hidden sm:block">
                   <span className="text-xl font-bold block leading-none text-white">D-Be</span>
                   <span className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">Recurrent Program</span>
               </div>
            </div>
            
            <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-800">
                <button 
                    onClick={() => setDashboardMode('GRAPH')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${dashboardMode === 'GRAPH' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                >
                    <Network className="w-4 h-4" />
                    <span className="hidden sm:inline">Knowledge Graph</span>
                </button>
                <button 
                    onClick={() => setDashboardMode('LIST')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${dashboardMode === 'LIST' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                >
                    <LayoutGrid className="w-4 h-4" />
                    <span className="hidden sm:inline">View Progress</span>
                </button>
                <button 
                    onClick={() => setDashboardMode('TEACHERS')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${dashboardMode === 'TEACHERS' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                >
                    <GraduationCap className="w-4 h-4" />
                    <span className="hidden sm:inline">Teachers</span>
                </button>
            </div>

            <div className="flex items-center gap-4">
                {currentUser?.role === 'admin' && (
                    <button 
                        onClick={() => setViewState(ViewState.ADMIN_BUILDER)}
                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                        <Edit3 className="w-4 h-4" />
                        Curriculum Builder
                    </button>
                )}

                {currentUser && (
                    <div className="flex items-center gap-3 border-l border-slate-800 pl-4">
                        <img src={currentUser.avatar} alt="User" className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700" />
                        <button onClick={handleLogout} className="text-slate-400 hover:text-red-400 transition-colors p-2" title="Logout">
                            <LogOut className="w-5 h-5" />
                        </button>
                    </div>
                )}
            </div>
          </nav>

          {/* Main Content Area */}
          <div className="flex-1 pt-20 h-full relative">
            
            {showWelcomeOverlay && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-500">
                    <div className="bg-slate-900 border border-slate-800 p-10 rounded-3xl max-w-2xl w-full shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                        
                        <div className="relative z-10">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-wider mb-6">
                                <BookOpen className="w-3 h-3" /> Welcome, {currentUser?.name.split(' ')[0]}
                            </div>
                            
                            <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-6 leading-tight">
                                Digital Built <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">Environment</span>
                            </h1>
                            
                            <p className="text-slate-400 text-lg mb-8 leading-relaxed">
                                You are currently logged into the <strong>Recurrent Program</strong>. 
                                Navigate the knowledge graph to access your assigned video tutorials, 
                                spanning from fundamental modeling to advanced robotic fabrication.
                            </p>

                            <div className="flex flex-col sm:flex-row gap-4">
                                <button 
                                    onClick={() => setShowWelcomeOverlay(false)}
                                    className="px-8 py-3.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-500 transition-colors flex items-center justify-center gap-2 group shadow-lg shadow-blue-900/20"
                                >
                                    Continue to Dashboard
                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="w-full h-full bg-slate-950">
                {dashboardMode === 'GRAPH' && (
                    <div className="w-full h-full relative">
                        <TopicGraph 
                            topics={currentTopics} 
                            onSelectTopic={handleTopicSelect} 
                            completedSubTopics={completedSubTopics}
                            lockedTopicIds={lockedTopicIds}
                        />
                    </div>
                )}

                {dashboardMode === 'LIST' && (
                    <ModuleList 
                        topics={currentTopics} 
                        completedSubTopics={completedSubTopics}
                        onSelectTopic={handleTopicSelect}
                    />
                )}

                {dashboardMode === 'TEACHERS' && (
                    <div className="w-full h-full bg-slate-950 overflow-y-auto">
                        {!selectedTeacherEmail ? (
                            <div className="p-8 max-w-7xl mx-auto">
                                <h2 className="text-3xl font-bold text-white mb-8">Instructors</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {uniqueTeachers.map(t => (
                                        <div 
                                            key={t.email} 
                                            onClick={() => setSelectedTeacherEmail(t.email)} 
                                            className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:bg-slate-800 hover:border-slate-700 transition-all cursor-pointer group"
                                        >
                                             <div className="flex flex-col items-center text-center">
                                                <img src={t.avatar} alt={t.name} className="w-24 h-24 rounded-full mb-4 object-cover border-4 border-slate-800 group-hover:border-blue-500/50 transition-colors" />
                                                <h3 className="text-xl font-bold text-white mb-1 group-hover:text-blue-400 transition-colors">{t.name}</h3>
                                                <p className="text-slate-400 text-sm mb-4">{t.role}</p>
                                                
                                                {t.bio && (
                                                    <p className="text-slate-500 text-xs line-clamp-2 mb-6 h-8">{t.bio}</p>
                                                )}

                                                <div className="w-full bg-slate-800/50 rounded-lg p-3 border border-slate-700/50 mb-6">
                                                    <div className="text-xs text-slate-500 font-mono mb-1 uppercase tracking-wider">Modules Taught</div>
                                                    <div className="text-lg font-bold text-white">
                                                        {currentTopics.filter(top => top.teacher.email === t.email).length}
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
                                    <button onClick={() => setSelectedTeacherEmail(null)} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-4 group">
                                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Back to Instructors
                                    </button>
                                    
                                    {(() => {
                                        const teacher = uniqueTeachers.find(t => t.email === selectedTeacherEmail);
                                        return teacher ? (
                                            <div className="flex items-center gap-4 mb-6 bg-slate-900 border border-slate-800 p-4 rounded-xl">
                                                <img src={teacher.avatar} alt={teacher.name} className="w-12 h-12 rounded-full border border-slate-700" />
                                                <div>
                                                    <h2 className="text-lg font-bold text-white">{teacher.name}</h2>
                                                    <p className="text-slate-400 text-sm">Instructor Curriculum</p>
                                                </div>
                                            </div>
                                        ) : null;
                                    })()}
                                </div>
                                <div className="flex-1">
                                    <ModuleList 
                                        topics={currentTopics.filter(t => t.teacher.email === selectedTeacherEmail)} 
                                        completedSubTopics={completedSubTopics}
                                        onSelectTopic={handleTopicSelect}
                                    />
                                </div>
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
            onToggleComplete={toggleSubTopicCompletion}
            onSubmitExercise={handleExerciseSubmission}
            userComments={topicComments}
            onAddComment={addComment}
            onReply={handleReply}
            onReaction={handleReaction}
            onDeleteComment={handleDeleteComment}
        />
      )}
    </div>
  );
};

export default App;
