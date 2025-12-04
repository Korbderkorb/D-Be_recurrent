
import React, { useState, useMemo, useEffect } from 'react';
import { ArrowLeft, Clock, PlayCircle, MessageCircle, FileText, CheckCircle2, Circle, AlertTriangle, Upload, Check, HelpCircle, Download, User as UserIcon, Mail, Reply, Copy, Trash2, XCircle, RotateCcw, History, CheckSquare } from 'lucide-react';
import { Topic, Comment, User, QuizAttempt } from '../types';
import VideoPlayer from './VideoPlayer';

interface TopicDetailProps {
  topic: Topic;
  topics?: Topic[];
  initialSubTopicId?: string;
  currentUser: User | null;
  onBack: () => void;
  completedSubTopics: Set<string>;
  submittedExercises: Set<string>;
  quizProgress: Record<string, QuizAttempt[]>;
  onToggleComplete: (id: string) => void;
  onSubmitExercise: (id: string, quizData?: QuizAttempt) => void;
  userComments: Record<string, Comment[]>;
  onAddComment: (subTopicId: string, text: string) => void;
  onReply: (subTopicId: string, parentCommentId: string, text: string) => void;
  onReaction: (subTopicId: string, commentId: string, emoji: string) => void;
  onDeleteComment: (subTopicId: string, commentId: string) => void;
}

const EMOJIS = ['❤️', '👍', '👎', '⭐'];

const TopicDetail: React.FC<TopicDetailProps> = ({ 
    topic, 
    topics = [], 
    initialSubTopicId,
    currentUser,
    onBack, 
    completedSubTopics,
    submittedExercises, 
    quizProgress,
    onToggleComplete,
    onSubmitExercise,
    userComments,
    onAddComment,
    onReply,
    onReaction,
    onDeleteComment
}) => {
  const [activeSubTopicId, setActiveSubTopicId] = useState<string>(initialSubTopicId || topic.subTopics[0]?.id);
  const [commentInput, setCommentInput] = useState('');
  
  const [replyInputOpen, setReplyInputOpen] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [emailCopied, setEmailCopied] = useState(false);
  const [fileToast, setFileToast] = useState<{show: boolean, message: string}>({ show: false, message: '' });

  // Quiz State
  const [selectedQuizAnswers, setSelectedQuizAnswers] = useState<Record<string, number[]>>({});
  const [showQuizResults, setShowQuizResults] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const activeSubTopic = useMemo(() => 
    topic.subTopics.find(st => st.id === activeSubTopicId), 
  [activeSubTopicId, topic.subTopics]);

  useEffect(() => {
    if (initialSubTopicId && topic.subTopics.some(st => st.id === initialSubTopicId)) {
        setActiveSubTopicId(initialSubTopicId);
    }
  }, [initialSubTopicId, topic]);

  const quizAttempts = useMemo(() => activeSubTopic ? quizProgress[activeSubTopic.id] || [] : [], [activeSubTopic, quizProgress]);
  const lastAttempt = quizAttempts.length > 0 ? quizAttempts[quizAttempts.length - 1] : null;
  const hasPassed = quizAttempts.some(a => a.passed);

  useEffect(() => {
    // Reset state when changing subtopics
    setUploadedFile(null);
    setReplyInputOpen(null);
    setReplyText('');
    setEmailCopied(false);
    
    // Reset or Load Quiz State
    setSelectedQuizAnswers({});
    setShowQuizResults(false);
    
    if (activeSubTopic?.type === 'EXERCISE_QUIZ' && hasPassed) {
        setShowQuizResults(true);
    }
  }, [activeSubTopicId]);

  const currentComments = useMemo(() => {
      if (!activeSubTopic) return [];
      const dynamic = userComments[activeSubTopic.id] || [];
      return [...activeSubTopic.comments, ...dynamic].sort((a,b) => b.timestamp.localeCompare(a.timestamp));
  }, [activeSubTopic, userComments]);

  const isCompleted = activeSubTopic ? completedSubTopics.has(activeSubTopic.id) : false;
  const isSubmitted = activeSubTopic ? submittedExercises.has(activeSubTopic.id) : false;
  const completedCount = topic.subTopics.filter(st => completedSubTopics.has(st.id)).length;
  const progressPercent = Math.round((completedCount / topic.subTopics.length) * 100);

  const missingPrerequisites = useMemo(() => {
    // Only check direct parents within the provided topics list that are LOWER level
    const parents = topics.filter(t => t.relatedTopics.includes(topic.id) && t.level < topic.level);
    const missing = parents.filter(p => {
        // A parent is incomplete if ANY of its subtopics are missing from completed set
        return p.subTopics.some(st => !completedSubTopics.has(st.id));
    });
    return missing;
  }, [topic, topics, completedSubTopics]);

  const handlePostComment = () => {
      if (activeSubTopic && commentInput.trim()) {
          onAddComment(activeSubTopic.id, commentInput);
          setCommentInput('');
      }
  };

  const submitReply = (parentCommentId: string) => {
      if (activeSubTopic && replyText.trim()) {
          onReply(activeSubTopic.id, parentCommentId, replyText);
          setReplyText('');
          setReplyInputOpen(null);
      }
  };

  const handleQuizToggleOption = (qId: string, idx: number, multiSelect: boolean) => {
      if (showQuizResults && hasPassed) return; // Prevent changing if passed
      if (showQuizResults && !hasPassed) return; // Prevent changing if showing failed results (must retake)

      setSelectedQuizAnswers(prev => {
          const current = prev[qId] || [];
          if (multiSelect) {
              if (current.includes(idx)) {
                  return { ...prev, [qId]: current.filter(i => i !== idx) };
              } else {
                  return { ...prev, [qId]: [...current, idx] };
              }
          } else {
              return { ...prev, [qId]: [idx] };
          }
      });
  };

  const submitQuiz = () => {
      if (!activeSubTopic || !activeSubTopic.quizQuestions) return;

      let allCorrect = true;
      activeSubTopic.quizQuestions.forEach(q => {
          const userAnswers = selectedQuizAnswers[q.id] || [];
          const correctAnswers = q.correctAnswers;
          
          // Sort for comparison
          const sortedUser = [...userAnswers].sort();
          const sortedCorrect = [...correctAnswers].sort();
          
          if (JSON.stringify(sortedUser) !== JSON.stringify(sortedCorrect)) {
              allCorrect = false;
          }
      });

      const attempt: QuizAttempt = {
          timestamp: new Date().toLocaleString(),
          answers: selectedQuizAnswers,
          passed: allCorrect
      };

      onSubmitExercise(activeSubTopic.id, attempt);
      setShowQuizResults(true);
  };

  const retakeQuiz = () => {
      setSelectedQuizAnswers({});
      setShowQuizResults(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          setUploadedFile(e.target.files[0]);
      }
  };

  const submitUpload = () => {
      if (activeSubTopic && uploadedFile) {
          onSubmitExercise(activeSubTopic.id);
      }
  }

  const copyEmail = () => {
      navigator.clipboard.writeText(topic.teacher.email);
      setEmailCopied(true);
      setTimeout(() => setEmailCopied(false), 2000);
  };

  const handleDownload = (url?: string, type: 'Notes' | 'Files' = 'Notes') => {
      if (!url) {
          setFileToast({ show: true, message: `No ${type} Available` });
          setTimeout(() => setFileToast({ show: false, message: '' }), 3000);
      } else {
          const link = document.createElement('a');
          link.href = url;
          link.download = url.split('/').pop() || 'download';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
      }
  };

  // Helpers to get incorrect questions for past attempts
  const getIncorrectQuestions = (attempt: QuizAttempt) => {
      if (!activeSubTopic || !activeSubTopic.quizQuestions) return [];
      return activeSubTopic.quizQuestions.filter((q, idx) => {
          const userAnswers = attempt.answers[q.id] || [];
          const correctAnswers = q.correctAnswers;
          const sortedUser = [...userAnswers].sort();
          const sortedCorrect = [...correctAnswers].sort();
          return JSON.stringify(sortedUser) !== JSON.stringify(sortedCorrect);
      });
  };

  // Recursive comment renderer
  const renderComment = (comment: Comment, isReply = false) => {
      const isOwnComment = currentUser && comment.user === currentUser.name;

      return (
        <div key={comment.id} className={`flex gap-4 group animate-in fade-in slide-in-from-bottom-2 ${isReply ? 'ml-12 mt-4' : 'mb-6'}`}>
            <img src={comment.avatar} alt={comment.user} className="w-10 h-10 rounded-full bg-slate-800 object-cover shrink-0" />
            <div className="flex-1">
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 relative group/card">
                    <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-200 text-sm">{comment.user}</span>
                            <span className="text-xs text-slate-500">{comment.timestamp}</span>
                        </div>
                        {isOwnComment && (
                            <button 
                                onClick={() => activeSubTopic && onDeleteComment(activeSubTopic.id, comment.id)}
                                className="text-slate-600 hover:text-red-400 transition-colors opacity-0 group-hover/card:opacity-100"
                                title="Delete comment"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                    <p className="text-slate-400 text-sm leading-relaxed">{comment.text}</p>
                </div>
                
                <div className="flex items-center gap-4 mt-2 ml-1">
                    <button 
                        onClick={() => setReplyInputOpen(replyInputOpen === comment.id ? null : comment.id)}
                        className="text-xs font-medium text-slate-500 hover:text-blue-400 flex items-center gap-1"
                    >
                        <Reply className="w-3 h-3" /> Reply
                    </button>
                    
                    <div className="flex items-center gap-2">
                        {EMOJIS.map(emoji => (
                            <button 
                                key={emoji}
                                onClick={() => activeSubTopic && onReaction(activeSubTopic.id, comment.id, emoji)}
                                className={`text-xs px-1.5 py-0.5 rounded hover:bg-slate-800 transition-colors ${comment.reactions[emoji] ? 'bg-slate-800 text-white ring-1 ring-slate-700' : 'text-slate-500 grayscale opacity-50 hover:grayscale-0 hover:opacity-100'}`}
                            >
                                {emoji} <span className="ml-0.5">{comment.reactions[emoji] || ''}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {replyInputOpen === comment.id && (
                    <div className="mt-3 flex gap-3">
                        <input 
                            type="text" 
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder="Write a reply..."
                            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                        />
                        <button 
                            onClick={() => submitReply(comment.id)}
                            className="px-3 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-500"
                        >
                            Reply
                        </button>
                    </div>
                )}

                {comment.replies && comment.replies.length > 0 && (
                    <div className="mt-4 border-l-2 border-slate-800 pl-4">
                        {comment.replies.map(r => renderComment(r, true))}
                    </div>
                )}
            </div>
        </div>
      );
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-slate-950 overflow-hidden relative">
      
      {/* Toast Notification */}
      {fileToast.show && (
          <div className="absolute top-20 right-6 z-[60] bg-slate-800 text-white px-4 py-2 rounded-lg shadow-lg border border-slate-700 animate-in slide-in-from-right fade-in flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-500" />
              <span className="text-sm font-medium">{fileToast.message}</span>
          </div>
      )}

      <header className="h-16 border-b border-slate-800 bg-slate-900/80 backdrop-blur flex items-center px-6 gap-4 sticky top-0 z-50 shrink-0">
        <button 
          onClick={onBack}
          className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors flex items-center gap-2 group"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span className="font-medium">All Topics</span>
        </button>
        <div className="h-6 w-px bg-slate-700 mx-2" />
        <h1 className="text-xl font-bold flex items-center gap-3 text-white">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: topic.color }}></span>
            {topic.title}
        </h1>
      </header>

      <div className="flex flex-1 overflow-hidden">
        
        {/* Sidebar Navigation */}
        <aside className="w-80 bg-slate-900 border-r border-slate-800 flex flex-col overflow-y-auto hidden md:flex shrink-0">
            <div className="p-6">
                <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Course Content</h2>
                <div className="space-y-2">
                    {topic.subTopics.map((sub, index) => {
                        const isActive = sub.id === activeSubTopicId;
                        const isSubCompleted = completedSubTopics.has(sub.id);

                        return (
                            <button
                                key={sub.id}
                                onClick={() => setActiveSubTopicId(sub.id)}
                                className={`w-full text-left p-3 rounded-lg flex items-start gap-3 transition-all ${
                                    isActive 
                                    ? 'bg-blue-600/10 border border-blue-600/20' 
                                    : 'hover:bg-slate-800 border border-transparent'
                                }`}
                            >
                                <div className="mt-0.5 shrink-0">
                                    {isSubCompleted ? (
                                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                                    ) : (
                                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${isActive ? 'border-blue-500 text-blue-500' : 'border-slate-600 text-slate-600'}`}>
                                            <span className="text-[10px]">{index + 1}</span>
                                        </div>
                                    )}
                                </div>
                                
                                <div>
                                    <div className={`text-sm font-medium ${isActive ? 'text-blue-400' : 'text-slate-300'}`}>{sub.title}</div>
                                    <div className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                                        <Clock className="w-3 h-3" /> {sub.duration}
                                        {sub.type === 'EXERCISE_UPLOAD' && <span className="text-blue-400 ml-1 font-bold">TASK</span>}
                                        {sub.type === 'EXERCISE_QUIZ' && <span className="text-purple-400 ml-1 font-bold">QUIZ</span>}
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
            
            <div className="mt-auto p-6 border-t border-slate-800">
                <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                    <div className="flex justify-between items-end mb-2">
                         <h3 className="text-sm font-semibold text-white">Your Progress</h3>
                         <span className="text-xs font-mono text-green-400">{progressPercent}%</span>
                    </div>
                    
                    <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden mb-2">
                        <div 
                            className="bg-green-500 h-full transition-all duration-500 ease-out" 
                            style={{ width: `${progressPercent}%`}}
                        ></div>
                    </div>
                    <p className="text-xs text-slate-400">{completedCount} of {topic.subTopics.length} completed</p>
                </div>
            </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto relative scroll-smooth bg-slate-950">
          {activeSubTopic && (
              <div className="max-w-5xl mx-auto p-6 lg:p-10 space-y-8 pb-48">
                  
                  {/* Header & Controls */}
                  <div className="flex items-center justify-between flex-wrap gap-4 relative z-10">
                     <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">{activeSubTopic.title}</h2>
                     
                     <div className="flex items-center gap-3">
                         {missingPrerequisites.length > 0 && (
                             <div className="group relative flex items-center gap-2 px-3 py-2 bg-yellow-500/10 text-yellow-500 text-sm font-medium rounded-full border border-yellow-500/20 cursor-help animate-pulse">
                                 <AlertTriangle className="w-4 h-4" />
                                 <span className="hidden sm:inline">Missing Prerequisites</span>
                                 <div className="absolute top-full mt-2 right-0 w-64 p-3 bg-slate-900 border border-slate-700 rounded-xl shadow-xl z-50 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                     <p className="text-xs text-slate-400 mb-2">Complete these first:</p>
                                     <ul className="space-y-1">
                                         {missingPrerequisites.map(p => (
                                             <li key={p.id} className="text-xs text-white flex items-center gap-1.5">
                                                 <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                                                 {p.title}
                                             </li>
                                         ))}
                                     </ul>
                                 </div>
                             </div>
                         )}

                         <button 
                            onClick={() => onToggleComplete(activeSubTopic.id)}
                            className={`flex items-center gap-2 text-sm px-4 py-2 rounded-full border transition-all ${
                                isCompleted 
                                ? 'bg-green-500 text-white border-green-500 hover:bg-green-600' 
                                : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-500'
                            }`}
                         >
                            {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                            {isCompleted ? 'Completed' : 'Mark as Complete'}
                         </button>
                     </div>
                  </div>
                  
                  {(!activeSubTopic.type || activeSubTopic.type === 'VIDEO') && (
                      <VideoPlayer 
                          title={activeSubTopic.title} 
                          videoUrl={activeSubTopic.videoUrl} 
                          poster={activeSubTopic.posterUrl}
                      />
                  )}

                  {activeSubTopic.type === 'EXERCISE_UPLOAD' && (
                      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
                          {activeSubTopic.exerciseImage && (
                              <div className="h-64 w-full overflow-hidden relative">
                                  <img src={activeSubTopic.exerciseImage} alt="Task" className="w-full h-full object-cover" />
                                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent"></div>
                                  <div className="absolute bottom-6 left-6">
                                      <h3 className="text-2xl font-bold text-white shadow-black drop-shadow-lg">Project Task</h3>
                                  </div>
                              </div>
                          )}
                          <div className="p-8 space-y-8">
                              <div className="prose prose-invert max-w-none">
                                  <p className="text-lg text-slate-300">{activeSubTopic.description}</p>
                                  <h4 className="text-white font-bold mt-4">Deliverables:</h4>
                                  <ul className="list-disc list-inside text-slate-400 space-y-2">
                                      <li>Project Files</li>
                                      <li>Documentation</li>
                                  </ul>
                              </div>
                              
                              <div className="border-2 border-dashed border-slate-700 rounded-xl p-8 flex flex-col items-center justify-center text-center hover:bg-slate-800/50 transition-colors">
                                  {!isSubmitted ? (
                                      <>
                                          <Upload className="w-10 h-10 text-slate-500 mb-4" />
                                          <h4 className="text-white font-medium mb-2">Upload your submission</h4>
                                          <input type="file" onChange={handleFileUpload} className="hidden" id="file-upload" />
                                          <label htmlFor="file-upload" className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg cursor-pointer font-medium transition-colors">
                                              Browse Files
                                          </label>
                                          {uploadedFile && (
                                              <div className="mt-4 flex items-center gap-2 text-green-400 text-sm bg-green-500/10 px-3 py-1.5 rounded-full border border-green-500/20">
                                                  <Check className="w-4 h-4" /> {uploadedFile.name}
                                              </div>
                                          )}
                                      </>
                                  ) : (
                                      <div className="flex flex-col items-center">
                                          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
                                              <CheckCircle2 className="w-8 h-8 text-green-500" />
                                          </div>
                                          <h3 className="text-xl font-bold text-white">Submission Received</h3>
                                          <p className="text-slate-400 mt-2">You have successfully completed this exercise.</p>
                                      </div>
                                  )}
                              </div>
                              
                              {!isSubmitted && (
                                <div className="flex justify-end">
                                    <button 
                                        onClick={submitUpload}
                                        disabled={!uploadedFile} 
                                        className="px-8 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-green-500/20"
                                    >
                                        Submit Exercise
                                    </button>
                                </div>
                              )}
                          </div>
                      </div>
                  )}

                  {activeSubTopic.type === 'EXERCISE_QUIZ' && activeSubTopic.quizQuestions && (
                      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-3xl mx-auto shadow-2xl">
                          <div className="flex items-center gap-3 mb-8 pb-8 border-b border-slate-800">
                              <div className="p-3 bg-purple-500/20 rounded-xl text-purple-400">
                                  <HelpCircle className="w-8 h-8" />
                              </div>
                              <div>
                                  <h3 className="text-xl font-bold text-white">Knowledge Check</h3>
                                  <p className="text-slate-400 text-sm">Answer all questions to complete the module.</p>
                              </div>
                          </div>
                          
                          <div className="space-y-8">
                              {activeSubTopic.quizQuestions.map((q, qIndex) => {
                                  const userAnswers = selectedQuizAnswers[q.id] || [];
                                  
                                  return (
                                  <div key={q.id} className="space-y-4">
                                      <h4 className="text-white font-medium text-lg flex gap-3">
                                          <span className="text-slate-500">{qIndex + 1}.</span>
                                          {q.question}
                                          {q.multiSelect && <span className="text-xs bg-slate-800 px-2 py-0.5 rounded text-slate-400 self-center">Multi-select</span>}
                                      </h4>
                                      <div className="space-y-2 pl-8">
                                          {q.options.map((opt, optIndex) => {
                                              const isSelected = userAnswers.includes(optIndex);
                                              const isCorrect = q.correctAnswers.includes(optIndex);
                                              
                                              let optClass = "border-slate-700 hover:bg-slate-800";
                                              let icon = isSelected ? (q.multiSelect ? <CheckSquare className="w-5 h-5" /> : <div className="w-5 h-5 rounded-full border-4 border-current" />) : (q.multiSelect ? <div className="w-5 h-5 border border-slate-500 rounded" /> : <Circle className="w-5 h-5 text-slate-600" />);

                                              if (showQuizResults) {
                                                  // Independent of pass/fail, show correct selected in Green, wrong selected in Red
                                                  if (isSelected && isCorrect) {
                                                      // Correct selection
                                                      optClass = "border-green-500 bg-green-500/10 text-green-400";
                                                      icon = <CheckCircle2 className="w-5 h-5" />;
                                                  } else if (isSelected && !isCorrect) {
                                                      // Incorrect selection
                                                      optClass = "border-red-500 bg-red-500/10 text-red-400";
                                                      icon = <XCircle className="w-5 h-5" />;
                                                  } else {
                                                      // Not selected.
                                                      // If passed, we can show everything. If failed, keep neutral to not reveal?
                                                      // Prompt: "dont give the correct answer" (likely implies for missed ones)
                                                      optClass = "border-slate-800 opacity-50";
                                                  }
                                              } else if (isSelected) {
                                                  optClass = "border-blue-500 bg-blue-500/10 text-blue-400";
                                              }

                                              return (
                                                  <button
                                                      key={optIndex}
                                                      onClick={() => handleQuizToggleOption(q.id, optIndex, q.multiSelect || false)}
                                                      disabled={showQuizResults} // Lock after submission
                                                      className={`w-full text-left p-4 rounded-xl border-2 transition-all flex justify-between items-center ${optClass}`}
                                                  >
                                                      <span>{opt}</span>
                                                      <div className="shrink-0">{icon}</div>
                                                  </button>
                                              );
                                          })}
                                      </div>
                                  </div>
                              )})}
                          </div>
                          
                          <div className="mt-8 pt-8 border-t border-slate-800">
                                {/* Attempts History Summary */}
                                {quizAttempts.length > 0 && (
                                    <div className="mb-6 p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
                                        <div className="flex items-center gap-2 text-slate-300 font-bold mb-3 text-sm">
                                            <History className="w-4 h-4" />
                                            Attempt History
                                        </div>
                                        <div className="space-y-3">
                                            {quizAttempts.map((attempt, idx) => {
                                                const incorrectQs = getIncorrectQuestions(attempt);
                                                return (
                                                    <div key={idx} className="text-xs flex flex-col gap-1 pb-3 border-b border-slate-700/50 last:border-0 last:pb-0">
                                                        <div className="flex justify-between">
                                                            <span className="text-slate-400">Attempt {idx + 1} • {attempt.timestamp}</span>
                                                            <span className={attempt.passed ? "text-green-400 font-bold" : "text-red-400 font-bold"}>
                                                                {attempt.passed ? "PASSED" : "FAILED"}
                                                            </span>
                                                        </div>
                                                        {!attempt.passed && incorrectQs.length > 0 && (
                                                            <div className="text-slate-500 mt-1 pl-2 border-l-2 border-slate-700">
                                                                Incorrect answers on: <span className="text-red-400">
                                                                    {incorrectQs.map((q, i) => `${i > 0 ? ', ' : ''}Question ${activeSubTopic.quizQuestions!.indexOf(q) + 1}`)}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                              <div className="flex justify-between items-center">
                                  {!showQuizResults ? (
                                      <button 
                                        onClick={submitQuiz}
                                        disabled={Object.keys(selectedQuizAnswers).length < activeSubTopic.quizQuestions.length}
                                        className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl disabled:opacity-50 transition-all shadow-lg hover:shadow-blue-500/20 ml-auto"
                                      >
                                          Submit Answers
                                      </button>
                                  ) : (
                                      hasPassed ? (
                                        <div className="flex items-center gap-4 text-green-400 font-bold bg-green-500/10 px-6 py-3 rounded-xl border border-green-500/20 ml-auto">
                                            <CheckCircle2 className="w-6 h-6" /> Quiz Passed!
                                        </div>
                                      ) : (
                                          <div className="flex items-center gap-4 ml-auto">
                                              <span className="text-red-400 text-sm font-medium">Some answers were incorrect.</span>
                                              <button 
                                                onClick={retakeQuiz}
                                                className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl flex items-center gap-2 transition-all"
                                              >
                                                  <RotateCcw className="w-4 h-4" /> Retake Quiz
                                              </button>
                                          </div>
                                      )
                                  )}
                              </div>
                          </div>
                      </div>
                  )}

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                      {/* Left Column (Description + Discussions) */}
                      <div className="lg:col-span-2 space-y-6 order-1">
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                <FileText className="w-5 h-5 text-slate-400" />
                                Description
                            </h3>
                            <p className="text-slate-300 leading-relaxed">
                                {activeSubTopic.description}
                            </p>
                        </div>
                        
                        {/* Discussion Section */}
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                <MessageCircle className="w-5 h-5 text-slate-400" />
                                Discussion ({currentComments.length})
                            </h3>
                            
                            <div className="flex gap-4 mb-8">
                                <div className="w-10 h-10 rounded-full bg-indigo-600 shrink-0 flex items-center justify-center text-white font-bold">You</div>
                                <div className="flex-1">
                                    <textarea 
                                        value={commentInput}
                                        onChange={(e) => setCommentInput(e.target.value)}
                                        placeholder="Add to the discussion..." 
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none h-24 placeholder-slate-600"
                                    />
                                    <div className="flex justify-end mt-2">
                                        <button 
                                            onClick={handlePostComment}
                                            disabled={!commentInput.trim()}
                                            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Post Comment
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                {currentComments.length > 0 ? (
                                    currentComments.map(c => renderComment(c))
                                ) : (
                                    <p className="text-slate-500 text-sm italic text-center py-4">No comments yet. Be the first to start the conversation!</p>
                                )}
                            </div>
                        </div>
                      </div>

                      {/* Right Column (Resources + Teacher) - Moves to bottom on mobile order-2 */}
                      <div className="space-y-6 order-2 lg:order-none">
                        <div className="bg-slate-800/30 border border-slate-800 rounded-xl p-6">
                            <h4 className="font-medium text-white mb-4">Module Resources</h4>
                            <ul className="space-y-3">
                                {(activeSubTopic.resources?.notesUrl || activeSubTopic.resources?.sourceUrl) ? (
                                  <>
                                    {activeSubTopic.resources?.notesUrl && (
                                        <li>
                                            <a onClick={() => handleDownload(activeSubTopic.resources?.notesUrl, 'Notes')} className="flex items-center gap-3 text-sm text-slate-300 hover:text-blue-400 cursor-pointer transition-colors group">
                                                <div className="p-2 bg-slate-800 rounded-lg group-hover:bg-slate-700 transition-colors"><FileText className="w-4 h-4" /></div>
                                                <span>Lecture Notes (PDF)</span>
                                                <Download className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100" />
                                            </a>
                                        </li>
                                    )}
                                    {activeSubTopic.resources?.sourceUrl && (
                                        <li>
                                            <a onClick={() => handleDownload(activeSubTopic.resources?.sourceUrl, 'Files')} className="flex items-center gap-3 text-sm text-slate-300 hover:text-blue-400 cursor-pointer transition-colors group">
                                                <div className="p-2 bg-slate-800 rounded-lg group-hover:bg-slate-700 transition-colors"><PlayCircle className="w-4 h-4" /></div>
                                                <span>Source Files (.zip)</span>
                                                <Download className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100" />
                                            </a>
                                        </li>
                                    )}
                                  </>
                                ) : (
                                  <li className="text-sm text-slate-500 italic py-2 flex items-center gap-2">
                                      <AlertTriangle className="w-4 h-4" /> No files available
                                  </li>
                                )}
                            </ul>
                        </div>
                        
                        <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700/50 rounded-xl p-6 shadow-xl">
                            <h4 className="font-bold text-white mb-4 text-sm uppercase tracking-wider text-slate-400">Instructor</h4>
                            <div className="flex items-center gap-4">
                                <img 
                                    src={topic.teacher.avatar} 
                                    alt={topic.teacher.name} 
                                    className="w-14 h-14 rounded-full border-2 border-slate-600 object-cover shrink-0" 
                                />
                                <div className="min-w-0 flex-1">
                                    <h3 className="font-bold text-white text-base truncate">{topic.teacher.name}</h3>
                                    <p className="text-slate-400 text-sm mb-1 truncate">{topic.teacher.role}</p>
                                    
                                    <button 
                                        onClick={copyEmail}
                                        className="group relative flex items-center gap-1.5 text-xs text-blue-400 bg-blue-500/10 px-2 py-1 rounded-md w-full max-w-full hover:bg-blue-500/20 transition-colors text-left"
                                        title="Click to copy email"
                                    >
                                        {emailCopied ? <Check className="w-3 h-3 shrink-0 text-green-400" /> : <Mail className="w-3 h-3 shrink-0" />}
                                        <span className={`truncate ${emailCopied ? 'text-green-400' : ''}`}>
                                            {emailCopied ? 'Copied to clipboard!' : topic.teacher.email}
                                        </span>
                                        {!emailCopied && <Copy className="w-3 h-3 shrink-0 ml-auto opacity-0 group-hover:opacity-100" />}
                                    </button>
                                </div>
                            </div>
                        </div>

                      </div>
                  </div>
              </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default TopicDetail;
