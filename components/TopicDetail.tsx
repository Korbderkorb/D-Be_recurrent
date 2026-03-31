
import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, ArrowRight, ChevronRight, Clock, PlayCircle, MessageCircle, FileText, CheckCircle2, Circle, AlertTriangle, Upload, Check, HelpCircle, Download, User as UserIcon, Mail, Reply, Copy, Trash2, XCircle, RotateCcw, History, CheckSquare, UploadCloud, Loader2, Info, AlertCircle } from 'lucide-react';
import { Topic, Comment, User, QuizAttempt, ExerciseSubmission } from '../types';
import VideoPlayer from './VideoPlayer';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage, db } from '../firebase';
import Joyride, { Step, CallBackProps, STATUS } from 'react-joyride';
import { doc, setDoc } from 'firebase/firestore';

interface TopicDetailProps {
  topic: Topic;
  topics?: Topic[];
  initialSubTopicId?: string;
  currentUser: User | null;
  onBack: () => void;
  completedSubTopics: Set<string>;
  submittedExercises: Set<string>;
  quizProgress: Record<string, QuizAttempt[]>;
  submissions: ExerciseSubmission[];
  onToggleComplete: (id: string) => void;
  onSubmitExercise: (id: string, quizData?: QuizAttempt, submissionData?: ExerciseSubmission) => Promise<void>;
  userComments: Record<string, Comment[]>;
  onAddComment: (subTopicId: string, text: string) => void;
  onReply: (subTopicId: string, parentCommentId: string, text: string) => void;
  onReaction: (subTopicId: string, commentId: string, emoji: string) => void;
  onDeleteComment: (subTopicId: string, commentId: string) => void;
  onSubTopicChange?: (subTopicId: string) => void;
  onUpdateUser?: (user: User) => void;
  theme: 'light' | 'dark';
}

const topicTourSteps: Step[] = [
  {
    target: '#video-player',
    content: 'You can watch the video and choose subtitles in your language.',
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '#module-resources',
    content: 'Some modules will use external files, download the resource file here.',
    placement: 'left',
  },
  {
    target: '#module-description',
    content: 'Read the module description to understand the context.',
    placement: 'top',
  },
  {
    target: '#comments-section',
    content: 'Participate in the discussion, ask a question to the community or just share your opinion on the Module.',
    placement: 'top',
  },
  {
    target: '#complete-button',
    content: 'Mark the module as completed once you\'re done.',
    placement: 'left',
  },
  {
    target: '#progress-bar',
    content: 'Track your progress within this topic.',
    placement: 'top',
  },
  {
    target: '#sidebar-nav',
    content: 'After finishing the first Module you can continue selecting the next module.',
    placement: 'right',
  },
  {
    target: '#restart-topic-tour-button',
    content: 'You can re-watch this tutorial at any moment by clicking this button.',
    placement: 'bottom',
  },
];

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
          animate={{ width: `${((index + 1) / topicTourSteps.length) * 100}%` }}
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
    submissions = [],
    onToggleComplete,
    onSubmitExercise,
    userComments,
    onAddComment,
    onReply,
    onReaction,
    onDeleteComment,
    onSubTopicChange,
    onUpdateUser,
    theme
}) => {
  const [activeSubTopicId, setActiveSubTopicId] = useState<string>(initialSubTopicId || topic.subTopics[0]?.id);
  const [commentInput, setCommentInput] = useState('');
  
  const [replyInputOpen, setReplyInputOpen] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [emailCopied, setEmailCopied] = useState(false);
  const [fileToast, setFileToast] = useState<{show: boolean, message: string}>({ show: false, message: '' });

  // Tour State
  const [runTour, setRunTour] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  useEffect(() => {
    if (currentUser && !currentUser.hasCompletedTopicTour) {
      setRunTour(true);
    }
  }, [currentUser]);

  const handleTourCallback = async (data: CallBackProps) => {
    const { status, type } = data;
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      setRunTour(false);
      document.body.classList.remove('tour-transitioning');
      
      if (status === STATUS.FINISHED) {
        setShowCelebration(true);
        if (currentUser && !currentUser.hasCompletedTopicTour) {
          try {
            await setDoc(doc(db, 'users', currentUser.id), {
              hasCompletedTopicTour: true
            }, { merge: true });
            if (onUpdateUser) {
              onUpdateUser({ ...currentUser, hasCompletedTopicTour: true });
            }
          } catch (error) {
            console.error("Error updating topic tour status:", error);
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
  };

  // Quiz State
  const [selectedQuizAnswers, setSelectedQuizAnswers] = useState<Record<string, number[]>>({});
  const [showQuizResults, setShowQuizResults] = useState(false);
  const [quizStartTime, setQuizStartTime] = useState<number | null>(null);
  
  // Upload State
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, File>>({});
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadErrors, setUploadErrors] = useState<Record<string, string>>({});

  const activeSubTopic = useMemo(() => 
    topic.subTopics.find(st => st.id === activeSubTopicId), 
  [activeSubTopicId, topic.subTopics]);

  useEffect(() => {
    if (initialSubTopicId && topic.subTopics.some(st => st.id === initialSubTopicId)) {
        setActiveSubTopicId(initialSubTopicId);
    }
  }, [initialSubTopicId, topic]);

  useEffect(() => {
    if (activeSubTopicId && onSubTopicChange) {
        onSubTopicChange(activeSubTopicId);
    }
  }, [activeSubTopicId, onSubTopicChange]);

  const quizAttempts = useMemo(() => activeSubTopic ? quizProgress[activeSubTopic.id] || [] : [], [activeSubTopic, quizProgress]);
  const lastAttempt = quizAttempts.length > 0 ? quizAttempts[quizAttempts.length - 1] : null;
  const hasPassed = quizAttempts.some(a => a.passed);

  useEffect(() => {
    // Reset state when changing subtopics
    setUploadedFiles({});
    setReplyInputOpen(null);
    setReplyText('');
    setEmailCopied(false);
    
    // Reset or Load Quiz State
    setSelectedQuizAnswers({});
    setShowQuizResults(false);
    
    if (activeSubTopic?.type === 'EXERCISE_QUIZ') {
        setQuizStartTime(Date.now());
        if (hasPassed) {
            setShowQuizResults(true);
        }
    }
  }, [activeSubTopicId]);

  const currentComments = useMemo(() => {
      if (!activeSubTopic) return [];
      const dynamic = userComments[activeSubTopic.id] || [];
      return [...activeSubTopic.comments, ...dynamic].sort((a,b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
  }, [activeSubTopic, userComments]);

  const isCompleted = activeSubTopic ? completedSubTopics.has(activeSubTopic.id) : false;
  const currentSubmission = useMemo(() => {
    if (!activeSubTopic || !currentUser) return null;
    return submissions.find(s => s.subTopicId === activeSubTopic.id && s.userId === currentUser.id);
  }, [submissions, activeSubTopic, currentUser]);

  const isSubmitted = !!currentSubmission;
  const isRejected = currentSubmission?.status === 'rejected';
  const isReviewed = currentSubmission?.status === 'reviewed';
  const isPending = currentSubmission?.status === 'pending';
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

  const submitQuiz = async () => {
      if (!activeSubTopic || !activeSubTopic.quizQuestions) return;

      let score = 0;
      const wrongAnswers: string[] = [];
      const total = activeSubTopic.quizQuestions.length;

      activeSubTopic.quizQuestions.forEach(q => {
          const userAnswers = selectedQuizAnswers[q.id] || [];
          const correctAnswers = q.correctAnswers;
          
          // Sort for comparison
          const sortedUser = [...userAnswers].sort();
          const sortedCorrect = [...correctAnswers].sort();
          
          if (JSON.stringify(sortedUser) === JSON.stringify(sortedCorrect)) {
              score++;
          } else {
              wrongAnswers.push(q.question);
          }
      });

      const timeTaken = quizStartTime ? Math.round((Date.now() - quizStartTime) / 1000) : 0;

      const attempt: QuizAttempt = {
          subTopicId: activeSubTopic.id,
          timestamp: new Date().toISOString(),
          answers: selectedQuizAnswers,
          passed: score === total,
          score,
          total,
          timeTaken,
          wrongAnswers
      };

      await onSubmitExercise(activeSubTopic.id, attempt);
      setShowQuizResults(true);
  };

  const retakeQuiz = () => {
      setSelectedQuizAnswers({});
      setShowQuizResults(false);
      setQuizStartTime(Date.now());
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, reqKey: string) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          const config = activeSubTopic?.exerciseConfig;
          
          // Reset error for this field
          setUploadErrors(prev => {
              const next = { ...prev };
              delete next[reqKey];
              return next;
          });

          if (config) {
              // Validate File Type
              if (config.allowedFileTypes && config.allowedFileTypes.length > 0) {
                  const extension = '.' + file.name.split('.').pop()?.toLowerCase();
                  if (!config.allowedFileTypes.includes(extension)) {
                      setUploadErrors(prev => ({ ...prev, [reqKey]: `Invalid file type. Allowed: ${config.allowedFileTypes?.join(', ')}` }));
                      return;
                  }
              }

              // Validate File Size
              if (config.maxFileSizeMB) {
                  const sizeInMB = file.size / (1024 * 1024);
                  if (sizeInMB > config.maxFileSizeMB) {
                      setUploadErrors(prev => ({ ...prev, [reqKey]: `File too large. Max size: ${config.maxFileSizeMB}MB` }));
                      return;
                  }
              }
          }

          setUploadedFiles(prev => ({ ...prev, [reqKey]: file }));
      }
  };

  const submitUpload = async () => {
      if (!activeSubTopic || !currentUser) {
          console.error("Cannot submit: missing subtopic or user", { activeSubTopic, currentUser });
          return;
      }
      
      console.log("Starting upload for files:", Object.keys(uploadedFiles));
      setIsUploading(true);
      setUploadProgress(0);
      try {
          const submissionFiles: ExerciseSubmission['files'] = [];
          const totalFiles = Object.keys(uploadedFiles).length;
          let filesCompleted = 0;
          
          for (const [reqKey, fileObj] of Object.entries(uploadedFiles)) {
              const file = fileObj as File;
              console.log(`Uploading file: ${file.name} for requirement: ${reqKey}`);
              const storageRef = ref(storage, `submissions/${currentUser.id}/${activeSubTopic.id}/${Date.now()}_${file.name}`);
              
              const uploadTask = uploadBytesResumable(storageRef, file);
              
              await new Promise<void>((resolve, reject) => {
                  uploadTask.on('state_changed', 
                      (snapshot) => {
                          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                          console.log(`File ${file.name} progress: ${Math.round(progress)}%`);
                          // Calculate overall progress across all files
                          const overallProgress = ((filesCompleted * 100) + progress) / totalFiles;
                          setUploadProgress(overallProgress);
                      }, 
                      (error: any) => {
                          console.error(`Upload error for file ${file.name}:`, error);
                          if (error.code === 'storage/retry-limit-exceeded') {
                              setFileToast({ show: true, message: `Upload failed: Network timeout. Please check your connection and try again.` });
                          } else {
                              setFileToast({ show: true, message: `Upload failed: ${error.message || 'Unknown error'}` });
                          }
                          reject(error);
                      }, 
                      () => {
                          console.log(`File ${file.name} upload complete`);
                          resolve();
                      }
                  );
              });

              const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
              console.log(`File ${file.name} download URL:`, downloadUrl);
              filesCompleted++;
              
              submissionFiles.push({
                  name: file.name,
                  url: downloadUrl,
                  size: file.size,
                  type: file.type,
                  requirementLabel: reqKey !== 'default' ? reqKey : undefined
              });
          }

          console.log("All files uploaded, creating submission document...");
          const submissionData: ExerciseSubmission = {
              id: currentSubmission?.id || Date.now().toString(),
              subTopicId: activeSubTopic.id,
              topicId: topic.id,
              userId: currentUser.id,
              userName: currentUser.name,
              timestamp: new Date().toISOString(),
              files: submissionFiles,
              status: 'pending',
              feedback: currentSubmission?.feedback || '' 
          };

          await onSubmitExercise(activeSubTopic.id, undefined, submissionData);
          setUploadedFiles({});
          setUploadProgress(100);
          setFileToast({ show: true, message: 'Submission successful!' });
          setTimeout(() => {
              setFileToast({ show: false, message: '' });
              setUploadProgress(0);
          }, 3000);
      } catch (error: any) {
          console.error("Full upload error object:", error);
          let errorMsg = 'Upload failed. Please try again.';
          if (error.code === 'storage/unauthorized') {
              errorMsg = 'Upload failed: Unauthorized. Please check storage rules.';
          } else if (error.code === 'storage/canceled') {
              errorMsg = 'Upload canceled.';
          }
          setFileToast({ show: true, message: errorMsg });
          setTimeout(() => setFileToast({ show: false, message: '' }), 5000);
      } finally {
          setIsUploading(false);
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
      const isAdmin = currentUser && currentUser.role === 'admin';

      return (
        <div key={comment.id} className={`flex gap-4 group animate-in fade-in slide-in-from-bottom-2 ${isReply ? 'ml-12 mt-4' : 'mb-6'}`}>
            <img src={comment.avatar || undefined} alt={comment.user} className="w-10 h-10 rounded-full bg-slate-800 object-cover shrink-0" />
            <div className="flex-1">
        <div className={`rounded-xl p-4 relative group/card transition-colors duration-300 ${theme === 'dark' ? 'bg-slate-950 border border-slate-800' : 'bg-white border border-slate-200 shadow-sm'}`}>
                    <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                            <span className={`font-semibold text-sm ${theme === 'dark' ? 'text-slate-200' : 'text-slate-900'}`}>{comment.user}</span>
                            <span className="text-xs text-slate-500">{comment.timestamp}</span>
                        </div>
                        {(isOwnComment || isAdmin) && (
                            <button 
                                onClick={() => activeSubTopic && onDeleteComment(activeSubTopic.id, comment.id)}
                                className={`transition-colors opacity-0 group-hover/card:opacity-100 ${theme === 'dark' ? 'text-slate-600 hover:text-red-400' : 'text-slate-400 hover:text-red-500'}`}
                                title="Delete comment"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                    <p className={`text-sm leading-relaxed ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>{comment.text}</p>
                </div>
                
                <div className="flex items-center gap-4 mt-2 ml-1">
                    <button 
                        onClick={() => setReplyInputOpen(replyInputOpen === comment.id ? null : comment.id)}
                        className={`text-xs font-medium flex items-center gap-1 transition-colors ${theme === 'dark' ? 'text-slate-500 hover:text-blue-400' : 'text-slate-500 hover:text-blue-600'}`}
                    >
                        <Reply className="w-3 h-3" /> Reply
                    </button>
                    
                    <div className="flex items-center gap-2">
                        {EMOJIS.map(emoji => {
                            const rawValue = comment.reactions[emoji];
                            const userIds = Array.isArray(rawValue) ? rawValue : [];
                            const hasReacted = currentUser && userIds.includes(currentUser.id);
                            return (
                                <button 
                                    key={emoji}
                                    onClick={() => activeSubTopic && onReaction(activeSubTopic.id, comment.id, emoji, activeSubTopic.type === 'EXERCISE_UPLOAD')}
                                    className={`text-xs px-1.5 py-0.5 rounded transition-colors ${hasReacted ? (theme === 'dark' ? 'bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/30' : 'bg-blue-50 text-blue-600 ring-1 ring-blue-100') : (userIds.length > 0 ? (theme === 'dark' ? 'bg-slate-800 text-slate-400 ring-1 ring-slate-700' : 'bg-slate-100 text-slate-600 ring-1 border-slate-200') : 'text-slate-500 grayscale opacity-50 hover:grayscale-0 hover:opacity-100')}`}
                                >
                                    {emoji} <span className="ml-0.5">{userIds.length || ''}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {replyInputOpen === comment.id && (
                    <div className="mt-3 flex gap-3">
                        <input 
                            type="text" 
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder="Write a reply..."
                            className={`flex-1 border rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-500 transition-all ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
                        />
                        <button 
                            onClick={() => submitReply(comment.id)}
                            className="px-3 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-500 transition-all shadow-lg shadow-blue-900/20"
                        >
                            Reply
                        </button>
                    </div>
                )}

                {comment.replies && comment.replies.length > 0 && (
                    <div className={`mt-4 border-l-2 pl-4 ${theme === 'dark' ? 'border-slate-800' : 'border-slate-100'}`}>
                        {comment.replies.map(r => renderComment(r, true))}
                    </div>
                )}
            </div>
        </div>
      );
  };

  return (
    <div className={`flex flex-col h-[100dvh] overflow-hidden relative transition-colors duration-300 ${theme === 'dark' ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>
      
      {/* Toast Notification */}
      {fileToast.show && (
          <div className={`absolute top-20 right-6 z-[60] px-4 py-2 rounded-lg shadow-lg border animate-in slide-in-from-right fade-in flex items-center gap-2 ${theme === 'dark' ? 'bg-slate-800 text-white border-slate-700' : 'bg-white text-slate-900 border-slate-200'}`}>
              <AlertTriangle className="w-4 h-4 text-yellow-500" />
              <span className="text-sm font-medium">{fileToast.message}</span>
          </div>
      )}

      <header className={`h-16 border-b flex items-center px-6 gap-4 sticky top-0 z-50 shrink-0 transition-colors duration-300 ${theme === 'dark' ? 'border-slate-800 bg-slate-900/80 backdrop-blur' : 'border-slate-200 bg-white/80 backdrop-blur'}`}>
        <button 
          onClick={onBack}
          className={`p-2 rounded-full transition-colors flex items-center gap-2 group ${theme === 'dark' ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900'}`}
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span className="hidden sm:inline font-medium">All Topics</span>
        </button>
        <div className="h-6 w-px bg-slate-700 mx-2 hidden sm:block" />
        <h1 className={`text-sm md:text-xl font-bold flex items-center gap-3 truncate flex-1 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: topic.color }}></span>
            <span className="truncate">{topic.title}</span>
        </h1>

        <button 
          id="restart-topic-tour-button"
          onClick={() => setRunTour(true)}
          className={`p-2 rounded-full transition-colors flex items-center gap-2 group ${theme === 'dark' ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'}`}
          title="Watch Tutorial"
        >
          <Info className="w-5 h-5" />
          <span className="hidden sm:inline text-xs font-bold uppercase tracking-widest">Tutorial</span>
        </button>
      </header>

      {/* Mobile Navigation Bar */}
      <div className={`md:hidden border-b px-4 py-2 relative z-40 transition-colors duration-300 ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          {/* Progress Line */}
          <div className={`absolute top-0 left-0 w-full h-[1px] ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'}`}>
              <div 
                  className="h-full bg-green-500 transition-all duration-500" 
                  style={{ width: `${((topic.subTopics.findIndex(st => st.id === activeSubTopicId) + 1) / topic.subTopics.length) * 100}%` }}
              />
          </div>

          <div className="flex items-center justify-between mt-1">
              <button 
                  onClick={() => {
                      const idx = topic.subTopics.findIndex(st => st.id === activeSubTopicId);
                      if (idx > 0) setActiveSubTopicId(topic.subTopics[idx - 1].id);
                  }}
                  disabled={topic.subTopics.findIndex(st => st.id === activeSubTopicId) === 0}
                  className={`p-2 transition-colors disabled:opacity-20 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}
              >
                  <ArrowLeft className="w-5 h-5" />
              </button>

              <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
                  Module <span className="text-green-400 font-bold">{topic.subTopics.findIndex(st => st.id === activeSubTopicId) + 1}</span> / {topic.subTopics.length}
              </div>

              <button 
                  onClick={() => {
                      const idx = topic.subTopics.findIndex(st => st.id === activeSubTopicId);
                      if (idx < topic.subTopics.length - 1) setActiveSubTopicId(topic.subTopics[idx + 1].id);
                  }}
                  disabled={topic.subTopics.findIndex(st => st.id === activeSubTopicId) === topic.subTopics.length - 1}
                  className={`p-2 transition-colors disabled:opacity-20 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}
              >
                  <ChevronRight className="w-5 h-5" />
              </button>
          </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        
        {/* Sidebar Navigation */}
        <aside id="sidebar-nav" className={`w-80 border-r flex flex-col overflow-y-auto hidden md:flex shrink-0 transition-colors duration-300 ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="p-6">
                <h2 className={`text-xs font-bold uppercase tracking-wider mb-4 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Course Content</h2>
                <div className="space-y-2">
                    {topic.subTopics.map((sub, index) => {
                        const isActive = sub.id === activeSubTopicId;
                        const isSubCompleted = completedSubTopics.has(sub.id);

                        return (
                            <button
                                key={sub.id}
                                onClick={() => setActiveSubTopicId(sub.id)}
                                className={`w-full text-left p-3 rounded-lg flex items-start gap-3 transition-all border ${
                                    isActive 
                                    ? (theme === 'dark' ? 'bg-blue-600/10 border-blue-600/20' : 'bg-blue-50 border-blue-100 shadow-sm') 
                                    : (theme === 'dark' ? 'hover:bg-slate-800 border-transparent' : 'hover:bg-slate-50 border-transparent')
                                }`}
                            >
                                <div className="mt-0.5 shrink-0">
                                    {isSubCompleted ? (
                                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                                    ) : (
                                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${isActive ? 'border-blue-500 text-blue-500' : (theme === 'dark' ? 'border-slate-600 text-slate-600' : 'border-slate-300 text-slate-400')}`}>
                                            <span className="text-[10px]">{index + 1}</span>
                                        </div>
                                    )}
                                </div>
                                
                                <div>
                                    <div className={`text-sm font-medium ${isActive ? (theme === 'dark' ? 'text-blue-400' : 'text-blue-600') : (theme === 'dark' ? 'text-slate-300' : 'text-slate-700')}`}>{sub.title}</div>
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
            
            <div className={`mt-auto p-6 border-t transition-colors ${theme === 'dark' ? 'border-slate-800' : 'border-slate-100'}`}>
                <div id="progress-bar" className={`p-4 rounded-xl border transition-colors ${theme === 'dark' ? 'bg-slate-800/50 border-slate-700/50' : 'bg-slate-50 border-slate-100'}`}>
                    <div className="flex justify-between items-end mb-2">
                         <h3 className={`text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Your Progress</h3>
                         <span className="text-xs font-mono text-green-400">{progressPercent}%</span>
                    </div>
                    
                    <div className={`w-full h-2 rounded-full overflow-hidden mb-2 ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'}`}>
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
        <main className={`flex-1 overflow-y-auto relative scroll-smooth transition-colors duration-300 ${theme === 'dark' ? 'bg-slate-950' : 'bg-slate-50'}`}>
          {activeSubTopic && (
              <div className="max-w-5xl mx-auto p-6 lg:p-10 space-y-8 pb-48">
                  
                  {/* Header & Controls */}
                  <div className="flex items-center justify-between flex-wrap gap-4 relative z-10">
                     <h2 className={`text-2xl md:text-3xl font-bold tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{activeSubTopic.title}</h2>
                     
                     <div className="flex items-center gap-3">
                         {missingPrerequisites.length > 0 && (
                             <div className="group relative flex items-center gap-2 px-3 py-2 bg-yellow-500/10 text-yellow-500 text-sm font-medium rounded-full border border-yellow-500/20 cursor-help animate-pulse">
                                 <AlertTriangle className="w-4 h-4" />
                                 <span className="hidden sm:inline">Missing Prerequisites</span>
                                 <div className={`absolute top-full mt-2 right-0 w-64 p-3 border rounded-xl shadow-xl z-50 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none ${theme === 'dark' ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
                                     <p className="text-xs text-slate-400 mb-2">Complete these first:</p>
                                     <ul className="space-y-1">
                                         {missingPrerequisites.map(p => (
                                             <li key={p.id} className={`text-xs flex items-center gap-1.5 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                                 <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                                                 {p.title}
                                             </li>
                                         ))}
                                     </ul>
                                 </div>
                             </div>
                         )}

                         {/* Only show "Mark as Complete" for Video modules. Exercises are auto-completed on submission. */}
                         {isCompleted && (activeSubTopic.type === 'EXERCISE_UPLOAD' || activeSubTopic.type === 'EXERCISE_QUIZ') ? (
                             <div className="flex items-center gap-2 text-sm px-4 py-2 rounded-full bg-green-500/10 text-green-500 border border-green-500/20">
                                 <CheckCircle2 className="w-4 h-4" />
                                 Completed
                             </div>
                         ) : (
                             (activeSubTopic.type === 'VIDEO' || !activeSubTopic.type) && (
                                <button 
                                    id="complete-button"
                                    onClick={() => onToggleComplete(activeSubTopic.id)}
                                    className={`flex items-center gap-2 text-sm px-4 py-2 rounded-full border transition-all ${
                                        isCompleted 
                                        ? 'bg-green-500 text-white border-green-500 hover:bg-green-600' 
                                        : (theme === 'dark' ? 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-500' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400 shadow-sm')
                                    }`}
                                >
                                    {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                                    {isCompleted ? 'Completed' : 'Mark as Complete'}
                                </button>
                             )
                         )}
                     </div>
                  </div>
                  
                  {(!activeSubTopic.type || activeSubTopic.type === 'VIDEO') && (
                      <div id="video-player">
                        <VideoPlayer 
                            key={activeSubTopic.id}
                            title={activeSubTopic.title} 
                            videoUrl={activeSubTopic.videoUrl} 
                            poster={activeSubTopic.posterUrl}
                            theme={theme}
                        />
                      </div>
                  )}

                  {activeSubTopic.type === 'EXERCISE_UPLOAD' && (
                      <div className={`border rounded-2xl overflow-hidden shadow-2xl transition-colors ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                          {activeSubTopic.exerciseImage && (
                              <div className="h-64 w-full overflow-hidden relative">
                                  <img src={activeSubTopic.exerciseImage || undefined} alt="Task" className="w-full h-full object-cover" />
                                  <div className={`absolute inset-0 bg-gradient-to-t ${theme === 'dark' ? 'from-slate-900' : 'from-white'} to-transparent`}></div>
                                  <div className="absolute bottom-6 left-6">
                                      <h3 className={`text-2xl font-bold drop-shadow-lg ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Project Task</h3>
                                  </div>
                              </div>
                          )}
                          <div className="p-8 space-y-8">
                              <div className={`prose max-w-none ${theme === 'dark' ? 'prose-invert' : ''}`}>
                                  <p className={`text-lg ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>{activeSubTopic.description}</p>
                                  <h4 className={`font-bold mt-4 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Deliverables:</h4>
                                  <ul className={`list-disc list-inside space-y-2 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                                      {activeSubTopic.uploadRequirements && activeSubTopic.uploadRequirements.length > 0 ? (
                                          activeSubTopic.uploadRequirements.map((req, i) => <li key={i}>{req}</li>)
                                      ) : (
                                          <li>Project File</li>
                                      )}
                                  </ul>
                              </div>
                              
                              <div className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center transition-colors ${theme === 'dark' ? 'border-slate-700 hover:bg-slate-800/50' : 'border-slate-200 hover:bg-slate-50'}`}>
                                  {(!isSubmitted || isRejected) ? (
                                      <>
                                          {isRejected && (
                                              <div className={`w-full mb-8 p-6 rounded-2xl border text-left animate-in fade-in slide-in-from-top-4 duration-500 ${theme === 'dark' ? 'bg-red-500/10 border-red-500/20' : 'bg-red-50 border-red-100'}`}>
                                                  <div className="flex items-center gap-3 mb-3 text-red-500">
                                                      <AlertCircle size={20} />
                                                      <h4 className="font-bold">Resubmission Requested</h4>
                                                  </div>
                                                  <p className={`text-sm leading-relaxed ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                                                      <span className="font-bold">Admin Feedback:</span> {currentSubmission?.feedback}
                                                  </p>
                                                  <p className="text-xs text-slate-500 mt-3 italic">
                                                      Please review the feedback above and re-upload your files to continue.
                                                  </p>
                                              </div>
                                          )}
                                          <Upload className={`w-10 h-10 mb-4 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`} />
                                          <h4 className={`font-medium mb-4 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                              {isRejected ? 'Re-upload your submission' : 'Upload your submission'}
                                          </h4>
                                          
                                          {/* Multiple Upload Fields */}
                                          <div className="w-full max-w-md space-y-4">
                                              {(activeSubTopic.uploadRequirements && activeSubTopic.uploadRequirements.length > 0) ? (
                                                  activeSubTopic.uploadRequirements.map((req, i) => (
                                                      <div key={i} className="flex flex-col gap-1 text-left">
                                                          <label className={`text-[10px] font-bold uppercase ml-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>{req}</label>
                                                          <div className="flex items-center gap-2">
                                                              <label className={`flex-1 flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer border transition-all group ${uploadErrors[req] ? 'border-red-500/50' : (theme === 'dark' ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 hover:border-slate-600' : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300')}`}>
                                                                  <input type="file" onChange={(e) => handleFileUpload(e, req)} className="hidden" />
                                                                  {uploadedFiles[req] ? <Check className="w-4 h-4 text-green-500" /> : <UploadCloud className={`w-4 h-4 ${theme === 'dark' ? 'text-slate-500 group-hover:text-white' : 'text-slate-400 group-hover:text-slate-600'}`} />}
                                                                  <span className={`text-sm ${uploadedFiles[req] ? 'text-green-500 font-medium' : (theme === 'dark' ? 'text-slate-300' : 'text-slate-600')}`}>
                                                                      {uploadedFiles[req] ? uploadedFiles[req].name : 'Choose File...'}
                                                                  </span>
                                                              </label>
                                                          </div>
                                                          {uploadErrors[req] && (
                                                              <span className="text-[10px] text-red-500 ml-1">{uploadErrors[req]}</span>
                                                          )}
                                                      </div>
                                                  ))
                                              ) : (
                                                  /* Default Single Upload */
                                                  <div className="flex flex-col items-center gap-2">
                                                      <label className={`px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg cursor-pointer font-medium transition-colors flex items-center gap-2 shadow-lg shadow-blue-600/20 ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                                                          <input type="file" onChange={(e) => handleFileUpload(e, 'default')} className="hidden" />
                                                          Browse Files
                                                      </label>
                                                      {uploadErrors['default'] && (
                                                          <span className="text-xs text-red-500">{uploadErrors['default']}</span>
                                                      )}
                                                  </div>
                                              )}
                                              
                                              {/* Show selected file for single upload case if needed */}
                                              {(!activeSubTopic.uploadRequirements || activeSubTopic.uploadRequirements.length === 0) && uploadedFiles['default'] && (
                                                  <div className="mt-4 flex items-center justify-center gap-2 text-green-500 text-sm bg-green-500/10 px-3 py-1.5 rounded-full border border-green-500/20 mx-auto w-fit font-medium">
                                                      <Check className="w-4 h-4" /> {uploadedFiles['default'].name}
                                                  </div>
                                              )}

                                              {/* Progress Bar */}
                                              {isUploading && (
                                                  <div className="mt-6 w-full space-y-2">
                                                      <div className={`flex justify-between text-[10px] font-bold uppercase tracking-widest ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                                                          <span>Uploading...</span>
                                                          <span>{Math.round(uploadProgress)}%</span>
                                                      </div>
                                                      <div className={`h-1.5 w-full rounded-full overflow-hidden ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'}`}>
                                                          <motion.div 
                                                              initial={{ width: 0 }}
                                                              animate={{ width: `${uploadProgress}%` }}
                                                              className="h-full bg-blue-500 rounded-full"
                                                          />
                                                      </div>
                                                  </div>
                                              )}
                                          </div>
                                      </>
                                  ) : (
                                      <div className="flex flex-col items-center">
                                          <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mb-4 border border-green-500/20">
                                              <CheckCircle2 className="w-8 h-8 text-green-500" />
                                          </div>
                                          <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                              {isReviewed ? 'Submission Evaluated' : 'Submission Received'}
                                          </h3>
                                          <p className={`mt-2 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                                              {isReviewed 
                                                  ? `Your exercise has been reviewed. Grade: ${currentSubmission?.grade}/100` 
                                                  : 'You have successfully submitted this exercise. Waiting for review.'}
                                          </p>
                                          {isReviewed && currentSubmission?.feedback && (
                                              <div className={`mt-6 p-4 rounded-xl border text-left w-full max-w-md ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                                                  <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Feedback</div>
                                                  <p className="text-sm italic">"{currentSubmission.feedback}"</p>
                                              </div>
                                          )}
                                      </div>
                                  )}
                              </div>
                              
                              {(!isSubmitted || isRejected) && (
                                <div className="flex justify-end">
                                    <button 
                                        onClick={submitUpload}
                                        disabled={
                                            isUploading ||
                                            ((activeSubTopic.uploadRequirements && activeSubTopic.uploadRequirements.length > 0)
                                            ? activeSubTopic.uploadRequirements.some(req => !uploadedFiles[req])
                                            : !uploadedFiles['default'])
                                        } 
                                        className="px-8 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-green-500/20 flex items-center gap-2"
                                    >
                                        {isUploading && <Loader2 className="w-4 h-4 animate-spin" />}
                                        {isUploading ? 'Uploading...' : (isRejected ? 'Resubmit Exercise' : 'Submit Exercise')}
                                    </button>
                                </div>
                              )}
                          </div>
                      </div>
                  )}

                  {activeSubTopic.type === 'EXERCISE_QUIZ' && activeSubTopic.quizQuestions && (
                      <div className={`border rounded-2xl p-8 max-w-3xl mx-auto shadow-2xl transition-colors ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                          <div className={`flex items-center gap-3 mb-8 pb-8 border-b ${theme === 'dark' ? 'border-slate-800' : 'border-slate-100'}`}>
                              <div className={`p-3 rounded-xl ${theme === 'dark' ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-50 text-purple-600'}`}>
                                  <HelpCircle className="w-8 h-8" />
                              </div>
                              <div>
                                  <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Knowledge Check</h3>
                                  <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Answer all questions to complete the module.</p>
                              </div>
                          </div>
                          
                          <div className="space-y-8">
                              {activeSubTopic.quizQuestions.map((q, qIndex) => {
                                  const userAnswers = selectedQuizAnswers[q.id] || [];
                                  
                                  return (
                                  <div key={q.id} className="space-y-4">
                                      <h4 className={`font-medium text-lg flex gap-3 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                          <span className="text-slate-500">{qIndex + 1}.</span>
                                          {q.question}
                                          {q.multiSelect && <span className={`text-[10px] px-2 py-0.5 rounded self-center font-bold uppercase tracking-wider ${theme === 'dark' ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>Multi-select</span>}
                                      </h4>
                                      <div className="space-y-2 pl-8">
                                          {q.options.map((opt, optIndex) => {
                                              const isSelected = userAnswers.includes(optIndex);
                                              const isCorrect = q.correctAnswers.includes(optIndex);
                                              
                                              let optClass = theme === 'dark' ? "border-slate-700 hover:bg-slate-800" : "border-slate-200 hover:bg-slate-50";
                                              let icon = isSelected ? (q.multiSelect ? <CheckSquare className="w-5 h-5" /> : <div className="w-5 h-5 rounded-full border-4 border-current" />) : (q.multiSelect ? <div className={`w-5 h-5 border rounded ${theme === 'dark' ? 'border-slate-500' : 'border-slate-300'}`} /> : <Circle className={`w-5 h-5 ${theme === 'dark' ? 'text-slate-600' : 'text-slate-300'}`} />);

                                              if (showQuizResults) {
                                                  // Independent of pass/fail, show correct selected in Green, wrong selected in Red
                                                  if (isSelected && isCorrect) {
                                                      // Correct selection
                                                      optClass = "border-green-500 bg-green-500/10 text-green-500";
                                                      icon = <CheckCircle2 className="w-5 h-5" />;
                                                  } else if (isSelected && !isCorrect) {
                                                      // Incorrect selection
                                                      optClass = "border-red-500 bg-red-500/10 text-red-500";
                                                      icon = <XCircle className="w-5 h-5" />;
                                                  } else {
                                                      // Not selected.
                                                      optClass = theme === 'dark' ? "border-slate-800 opacity-50" : "border-slate-100 opacity-50";
                                                  }
                                              } else if (isSelected) {
                                                  optClass = "border-blue-500 bg-blue-500/10 text-blue-500";
                                              }

                                              return (
                                                  <button
                                                      key={optIndex}
                                                      onClick={() => handleQuizToggleOption(q.id, optIndex, q.multiSelect || false)}
                                                      disabled={showQuizResults} // Lock after submission
                                                      className={`w-full text-left p-4 rounded-xl border-2 transition-all flex justify-between items-center text-sm font-medium ${optClass}`}
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
                          
                          <div className={`mt-8 pt-8 border-t ${theme === 'dark' ? 'border-slate-800' : 'border-slate-100'}`}>
                                {/* Attempts History Summary */}
                                {quizAttempts.length > 0 && (
                                    <div className={`mb-6 p-4 rounded-xl border transition-colors ${theme === 'dark' ? 'bg-slate-800/50 border-slate-700/50' : 'bg-slate-50 border-slate-100'}`}>
                                        <div className={`flex items-center gap-2 font-bold mb-3 text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
                                            <History className="w-4 h-4" />
                                            Attempt History
                                        </div>
                                        <div className="space-y-3">
                                            {quizAttempts.map((attempt, idx) => {
                                                const incorrectQs = getIncorrectQuestions(attempt);
                                                return (
                                                    <div key={idx} className={`text-xs flex flex-col gap-1 pb-3 border-b last:border-0 last:pb-0 ${theme === 'dark' ? 'border-slate-700/50' : 'border-slate-200'}`}>
                                                        <div className="flex justify-between">
                                                            <span className="text-slate-400">Attempt {idx + 1} • {attempt.timestamp}</span>
                                                            <span className={attempt.passed ? "text-green-500 font-bold" : "text-red-500 font-bold"}>
                                                                {attempt.passed ? "PASSED" : "FAILED"}
                                                            </span>
                                                        </div>
                                                        {!attempt.passed && incorrectQs.length > 0 && (
                                                            <div className={`mt-1 pl-2 border-l-2 ${theme === 'dark' ? 'text-slate-500 border-slate-700' : 'text-slate-500 border-slate-200'}`}>
                                                                Incorrect answers on: <span className="text-red-500 font-medium">
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
                                        className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl disabled:opacity-50 transition-all shadow-lg shadow-blue-600/20 ml-auto"
                                      >
                                          Submit Answers
                                      </button>
                                  ) : (
                                      hasPassed ? (
                                        <div className="flex items-center gap-4 text-green-500 font-bold bg-green-500/10 px-6 py-3 rounded-xl border border-green-500/20 ml-auto">
                                            <CheckCircle2 className="w-6 h-6" /> Quiz Passed!
                                        </div>
                                      ) : (
                                          <div className="flex items-center gap-4 ml-auto">
                                              <span className="text-red-500 text-sm font-medium">Some answers were incorrect.</span>
                                              <button 
                                                onClick={retakeQuiz}
                                                className={`px-6 py-3 font-bold rounded-xl flex items-center gap-2 transition-all ${theme === 'dark' ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
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
                        <div id="module-description" className={`border rounded-2xl p-6 transition-colors ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
                            <h3 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                <FileText className={`w-5 h-5 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`} />
                                Description
                            </h3>
                            <p className={`leading-relaxed ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
                                {activeSubTopic.description}
                            </p>
                        </div>
                        
                        {/* Discussion Section */}
                        <div id="comments-section" className={`border rounded-2xl p-6 transition-colors ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
                            <h3 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                <MessageCircle className={`w-5 h-5 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`} />
                                Discussion ({currentComments.length})
                            </h3>
                            
                            <div className="flex gap-4 mb-8">
                                <div className="w-10 h-10 rounded-full bg-indigo-600 shrink-0 flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-600/20">You</div>
                                <div className="flex-1">
                                    <textarea 
                                        value={commentInput}
                                        onChange={(e) => setCommentInput(e.target.value)}
                                        placeholder="Add to the discussion..." 
                                        className={`w-full border rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/50 transition-all resize-none h-24 ${theme === 'dark' ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-600' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'}`}
                                    />
                                    <div className="flex justify-end mt-2">
                                        <button 
                                            onClick={handlePostComment}
                                            disabled={!commentInput.trim()}
                                            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-600/20"
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
                        <div id="module-resources" className={`border rounded-xl p-6 transition-colors ${theme === 'dark' ? 'bg-slate-800/30 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                            <h4 className={`font-medium mb-4 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Module Resources</h4>
                            <ul className="space-y-3">
                                {(activeSubTopic.resources?.notesUrl || activeSubTopic.resources?.sourceUrl) ? (
                                  <>
                                    {activeSubTopic.resources?.notesUrl && (
                                        <li>
                                            <a onClick={() => handleDownload(activeSubTopic.resources?.notesUrl, 'Notes')} className={`flex items-center gap-3 text-sm transition-colors group cursor-pointer ${theme === 'dark' ? 'text-slate-300 hover:text-blue-400' : 'text-slate-600 hover:text-blue-600'}`}>
                                                <div className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'bg-slate-800 group-hover:bg-slate-700' : 'bg-white group-hover:bg-blue-50 shadow-sm'}`}><FileText className="w-4 h-4" /></div>
                                                <span className="font-medium">Lecture Notes (PDF)</span>
                                                <Download className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100" />
                                            </a>
                                        </li>
                                    )}
                                    {activeSubTopic.resources?.sourceUrl && (
                                        <li>
                                            <a onClick={() => handleDownload(activeSubTopic.resources?.sourceUrl, 'Files')} className={`flex items-center gap-3 text-sm transition-colors group cursor-pointer ${theme === 'dark' ? 'text-slate-300 hover:text-blue-400' : 'text-slate-600 hover:text-blue-600'}`}>
                                                <div className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'bg-slate-800 group-hover:bg-slate-700' : 'bg-white group-hover:bg-blue-50 shadow-sm'}`}><PlayCircle className="w-4 h-4" /></div>
                                                <span className="font-medium">Source Files (.zip)</span>
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
                        
                        <div className={`border rounded-xl p-6 shadow-xl transition-colors ${theme === 'dark' ? 'bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700/50' : 'bg-white border-slate-200'}`}>
                            <h4 className={`font-bold mb-4 text-xs uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Instructor</h4>
                            <div className="flex items-center gap-4">
                                <img 
                                    src={topic.teacher.avatar || undefined} 
                                    alt={topic.teacher.name} 
                                    className={`w-14 h-14 rounded-full border-2 object-cover shrink-0 ${theme === 'dark' ? 'border-slate-600' : 'border-slate-100'}`} 
                                />
                                <div className="min-w-0 flex-1">
                                    <h3 className={`font-bold text-base truncate ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{topic.teacher.name}</h3>
                                    <p className={`text-sm mb-1 truncate ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>{topic.teacher.role}</p>
                                    
                                    <button 
                                        onClick={copyEmail}
                                        className={`group relative flex items-center gap-1.5 text-xs px-2 py-1 rounded-md w-full max-w-full transition-colors text-left ${theme === 'dark' ? 'text-blue-400 bg-blue-500/10 hover:bg-blue-500/20' : 'text-blue-600 bg-blue-50 hover:bg-blue-100'}`}
                                        title="Click to copy email"
                                    >
                                        {emailCopied ? <Check className="w-3 h-3 shrink-0 text-green-500" /> : <Mail className="w-3 h-3 shrink-0" />}
                                        <span className={`truncate ${emailCopied ? 'text-green-500 font-medium' : ''}`}>
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

      <Joyride
        steps={topicTourSteps}
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
        }}
        floaterProps={{
          disableAnimation: true,
        }}
      />

      <AnimatePresence>
        {showCelebration && (
          <div className={`fixed inset-0 z-[100] flex items-center justify-center backdrop-blur-md p-4 ${theme === 'dark' ? 'bg-slate-950/90' : 'bg-white/80'}`}>
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className={`border p-8 md:p-12 rounded-3xl max-w-lg w-full shadow-2xl relative overflow-hidden text-center transition-colors ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-green-500 to-blue-500"></div>
              
              <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 border ${theme === 'dark' ? 'bg-green-500/20 border-green-500/30' : 'bg-green-50 border-green-100'}`}>
                <CheckCircle2 className="w-10 h-10 text-green-500" />
              </div>
              
              <h2 className={`text-3xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Congratulations!</h2>
              <p className={`text-lg mb-8 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                You now master the module interface. You're ready to start learning!
              </p>
              
              <button 
                onClick={() => setShowCelebration(false)}
                className="w-full py-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20 active:scale-[0.98]"
              >
                Let's Get Started
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TopicDetail;