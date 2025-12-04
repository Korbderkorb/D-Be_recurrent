
import React, { useState, useMemo, useEffect } from 'react';
import { Download, Plus, Trash2, Edit2, GripVertical, ChevronRight, Video, Upload, HelpCircle, UploadCloud, RefreshCw, Copy, AlertCircle, Info, Settings, Save, CheckSquare, Square, X } from 'lucide-react';
import { Topic, SubTopic, Teacher, SubTopicType, QuizQuestion } from '../types';
import { teachers } from '../constants';

const MEDIA_ROOT = '/media';
const MODULE_TYPES: SubTopicType[] = ['VIDEO', 'EXERCISE_UPLOAD', 'EXERCISE_QUIZ'];

// --- STRING UTILITIES ---
const generateSlug = (text: string): string => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')     
    .replace(/[^\w-]+/g, '')  
    .replace(/--+/g, '-')     
    .replace(/^-+/, '')       
    .replace(/-+$/, '');      
};

const generateVarName = (text: string): string => {
  const slug = text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_')     
    .replace(/[^\w_]+/g, '')  
    .replace(/__+/g, '_');    
  
  if (/^\d/.test(slug)) {
      return `v_${slug}`;
  }
  return slug;
};

const generateKey = () => Math.random().toString(36).substr(2, 9);

const getUniqueId = (base: string, existingIds: string[]) => {
    if (!existingIds.includes(base)) return base;
    let counter = 1;
    while (existingIds.includes(`${base}-${counter}`)) {
        counter++;
    }
    return `${base}-${counter}`;
};

const getGeneratedPath = (topicId: string, subId: string | undefined, type: 'video' | 'image' | 'thumb' | 'pdf' | 'zip') => {
  const safeTopicId = topicId || '[topic-id]';
  const safeSubId = subId || '[sub-id]';
  
  const extMap = { video: 'mp4', image: 'jpg', thumb: 'jpg', pdf: 'pdf', zip: 'zip' };
  const fileNameMap = { video: 'video', image: 'image', thumb: 'thumb', pdf: 'lecture-notes', zip: 'source-files' };
  return `${MEDIA_ROOT}/${safeTopicId}/${safeSubId}/${fileNameMap[type]}.${extMap[type]}`;
};

// --- COMPONENTS ---

const PathDisplay = ({ label, path, description }: { label: string, path: string, description?: string }) => {
    const [copied, setCopied] = useState(false);
    
    const handleCopy = () => {
        navigator.clipboard.writeText(path);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="mb-3 last:mb-0">
            <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                    {label}
                    {description && (
                        <div className="group relative">
                            <Info size={12} className="text-slate-400 cursor-help" />
                            <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 w-48 p-2 bg-slate-800 text-slate-200 text-[10px] rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10">
                                {description}
                            </div>
                        </div>
                    )}
                </span>
                {copied && <span className="text-xs text-green-600 font-medium animate-pulse">Copied!</span>}
            </div>
            <div 
                onClick={handleCopy}
                className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded p-2 cursor-pointer transition-colors group"
                title="Click to copy path"
            >
                <code className="text-xs font-mono text-slate-700 break-all flex-1">{path}</code>
                <Copy size={12} className="text-slate-400 group-hover:text-blue-600" />
            </div>
        </div>
    );
};

const ValidationMessage = ({ message }: { message: string | null }) => {
    if (!message) return null;
    return (
        <div className="flex items-center gap-1.5 mt-1 text-xs text-red-600 font-medium animate-in fade-in slide-in-from-top-1">
            <AlertCircle size={12} />
            {message}
        </div>
    );
};

// --- MODULE EDITOR ---

interface ModuleEditorProps {
  topicId: string;
  module: SubTopic;
  existingSubIds: (string | undefined)[];
  onUpdate: (m: SubTopic) => void;
  onDelete: () => void;
}

const ModuleEditor: React.FC<ModuleEditorProps> = ({ topicId, module, existingSubIds, onUpdate, onDelete }) => {
  const [expanded, setExpanded] = useState(false);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [newUploadReq, setNewUploadReq] = useState('');

  const subIdConflict = existingSubIds.includes(module._subId);

  const handleTitleChange = (newTitle: string) => {
      // NOTE: We do NOT auto-update IDs on title change for existing modules to prevent
      // orphaned progress data in localStorage. IDs should be stable.
      // If the user really wants to change ID, they can use Advanced Settings.
      onUpdate({ ...module, title: newTitle });
  };

  const handleDelete = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (window.confirm('Are you sure you want to delete this module?')) {
          onDelete();
      }
  };

  const getIcon = (type: SubTopicType) => {
    switch (type) {
        case 'VIDEO': return <Video size={18} className="text-blue-500" />;
        case 'EXERCISE_UPLOAD': return <Upload size={18} className="text-purple-500" />;
        case 'EXERCISE_QUIZ': return <HelpCircle size={18} className="text-orange-500" />;
    }
  };

  return (
    <div className={`bg-white border rounded-lg transition-all ${expanded ? 'shadow-md border-blue-200 ring-1 ring-blue-100' : 'border-slate-200 hover:border-slate-300'}`}>
        <div 
            className="flex items-center p-4 cursor-pointer"
            onClick={() => setExpanded(!expanded)}
        >
            <div className="mr-3 text-slate-300 cursor-grab active:cursor-grabbing"><GripVertical size={16} /></div>
            <div className="mr-3 p-2 bg-slate-50 rounded-md border border-slate-100">{getIcon(module.type)}</div>
            <div className="flex-1">
                <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-700 text-sm">{module.title || 'Untitled Module'}</span>
                    <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${subIdConflict ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-400'}`}>
                        {module._subId || 'no-id'}
                    </span>
                    {subIdConflict && <AlertCircle size={14} className="text-red-500" />}
                </div>
                <div className="text-xs text-slate-500 mt-0.5 truncate">{module.description || 'No description'}</div>
            </div>
            <div className="text-xs font-mono text-slate-400 mr-4">{module.duration}</div>
            <div className={`transform transition-transform text-slate-400 ${expanded ? 'rotate-90' : ''}`}><ChevronRight size={18} /></div>
        </div>

        {expanded && (
            <div className="p-4 border-t border-slate-100 bg-slate-50/50">
                <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-8">
                        <label className="block text-xs font-medium text-slate-500 mb-1">Title</label>
                        <input type="text" value={module.title} onChange={e => handleTitleChange(e.target.value)} className="w-full p-2 text-sm border border-slate-200 rounded focus:border-blue-400 outline-none bg-white font-medium" placeholder="Module Title" />
                    </div>
                    <div className="col-span-4">
                        <label className="block text-xs font-medium text-slate-500 mb-1">Type</label>
                        <select value={module.type} onChange={e => onUpdate({...module, type: e.target.value as SubTopicType})} className="w-full p-2 text-sm border border-slate-200 rounded focus:border-blue-400 outline-none bg-white">
                            {MODULE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                    <div className="col-span-8">
                         <label className="block text-xs font-medium text-slate-500 mb-1">Description</label>
                         <input type="text" value={module.description} onChange={e => onUpdate({...module, description: e.target.value})} className="w-full p-2 text-sm border border-slate-200 rounded focus:border-blue-400 outline-none bg-white" />
                    </div>
                     <div className="col-span-4">
                        <label className="block text-xs font-medium text-slate-500 mb-1">Duration</label>
                         <input type="text" value={module.duration} onChange={e => onUpdate({...module, duration: e.target.value})} placeholder="MM:SS" className="w-full p-2 text-sm border border-slate-200 rounded focus:border-blue-400 outline-none bg-white" />
                    </div>
                    <div className="col-span-12 flex justify-end">
                         <button onClick={() => setShowAdvancedSettings(!showAdvancedSettings)} className="text-xs flex items-center gap-1 text-slate-400 hover:text-blue-600 transition-colors">
                            <Settings size={12} /> {showAdvancedSettings ? 'Hide' : 'Show'} Advanced ID Settings
                        </button>
                    </div>
                    {showAdvancedSettings && (
                        <div className="col-span-12 bg-slate-100 p-3 rounded border border-slate-200">
                            <label className="block text-xs font-medium text-slate-500 mb-1">Sub-ID (Manual Override)</label>
                             <div className="flex gap-2">
                                <input type="text" value={module._subId || ''} onChange={e => { const val = generateSlug(e.target.value); const rootId = module.id.split('-').slice(0, -1).join('-'); onUpdate({...module, _subId: val, id: rootId ? `${rootId}-${val}` : module.id}); }} className={`flex-1 p-2 text-sm border rounded focus:ring-2 outline-none font-mono text-slate-600 bg-white ${subIdConflict ? 'border-red-300 ring-red-200' : 'border-slate-200 focus:ring-blue-400'}`} />
                             </div>
                             <ValidationMessage message={subIdConflict ? "ID already in use" : null} />
                             <p className="text-[10px] text-slate-500 mt-1">Changing IDs will reset progress for users who have completed this module.</p>
                        </div>
                    )}
                    
                    {/* VIDEO SPECIFIC */}
                    {module.type === 'VIDEO' && (
                         <div className="col-span-12 flex items-end pb-2">
                             <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-700 select-none">
                                <input type="checkbox" checked={module.hasResources !== false} onChange={e => onUpdate({...module, hasResources: e.target.checked})} className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" /> Has Resources (Notes/Zip)
                             </label>
                         </div>
                    )}

                    {/* UPLOAD EXERCISE SPECIFIC */}
                    {module.type === 'EXERCISE_UPLOAD' && (
                        <div className="col-span-12 bg-slate-100 p-3 rounded border border-slate-200">
                             <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Upload Requirements</label>
                             <div className="space-y-2 mb-3">
                                 {(module.uploadRequirements || []).map((req, idx) => (
                                     <div key={idx} className="flex items-center gap-2">
                                         <span className="text-sm font-medium text-slate-700 bg-white border px-2 py-1 rounded flex-1">{req}</span>
                                         <button 
                                            onClick={() => onUpdate({ ...module, uploadRequirements: (module.uploadRequirements || []).filter((_, i) => i !== idx) })}
                                            className="text-slate-400 hover:text-red-500"
                                         >
                                             <X size={14} />
                                         </button>
                                     </div>
                                 ))}
                                 {(module.uploadRequirements || []).length === 0 && (
                                     <div className="text-xs text-slate-400 italic">No specific requirements (Single file upload default).</div>
                                 )}
                             </div>
                             <div className="flex gap-2">
                                 <input 
                                    type="text" 
                                    value={newUploadReq}
                                    onChange={(e) => setNewUploadReq(e.target.value)}
                                    placeholder="E.g. Rhino Model, Render Image..."
                                    className="flex-1 p-1.5 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-blue-400 outline-none"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && newUploadReq.trim()) {
                                            onUpdate({ ...module, uploadRequirements: [...(module.uploadRequirements || []), newUploadReq.trim()] });
                                            setNewUploadReq('');
                                        }
                                    }}
                                 />
                                 <button 
                                    onClick={() => {
                                        if (newUploadReq.trim()) {
                                            onUpdate({ ...module, uploadRequirements: [...(module.uploadRequirements || []), newUploadReq.trim()] });
                                            setNewUploadReq('');
                                        }
                                    }}
                                    className="px-3 py-1 bg-blue-600 text-white text-xs font-bold rounded hover:bg-blue-500"
                                 >
                                     Add
                                 </button>
                             </div>
                        </div>
                    )}

                    <div className="col-span-12 mt-2 bg-slate-100/50 p-4 rounded border border-slate-200">
                        <h4 className="text-xs font-bold text-slate-600 uppercase mb-3 flex items-center gap-2"><UploadCloud size={14} /> File Paths</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             {module.type === 'VIDEO' && ( <> <PathDisplay label="Video File" path={getGeneratedPath(topicId, module._subId, 'video')} /> <PathDisplay label="Poster" path={getGeneratedPath(topicId, module._subId, 'thumb')} /> </> )}
                             {module.type === 'EXERCISE_UPLOAD' && ( <PathDisplay label="Image" path={getGeneratedPath(topicId, module._subId, 'image')} /> )}
                             {(module.hasResources !== false || module.resources) && ( <> <PathDisplay label="Notes" path={getGeneratedPath(topicId, module._subId, 'pdf')} /> {module.type === 'VIDEO' && ( <PathDisplay label="Source" path={getGeneratedPath(topicId, module._subId, 'zip')} /> )} </> )}
                        </div>
                    </div>
                    
                    {/* QUIZ SPECIFIC */}
                    {module.type === 'EXERCISE_QUIZ' && (
                        <div className="col-span-12 mt-2 pt-4 border-t border-slate-200">
                            <div className="flex justify-between items-center mb-2">
                                <label className="block text-xs font-bold text-slate-600 uppercase">Quiz Questions</label>
                                <button onClick={() => { const newQ: QuizQuestion = { id: `q${Date.now()}`, question: 'New Question?', options: ['Option 1', 'Option 2'], correctAnswers: [0], multiSelect: false }; onUpdate({...module, quizQuestions: [...(module.quizQuestions || []), newQ]}); }} className="text-xs text-blue-600 hover:text-blue-500 font-medium">+ Add Question</button>
                            </div>
                            <div className="space-y-4">
                                {module.quizQuestions?.map((q, qIdx) => (
                                    <div key={q.id} className="p-4 bg-white border border-slate-200 rounded shadow-sm">
                                        <div className="flex gap-2 mb-3">
                                            <span className="text-xs font-mono text-slate-400 pt-2">Q{qIdx+1}</span>
                                            <input className="flex-1 p-1.5 text-sm border-b border-slate-100 focus:border-blue-400 outline-none bg-white font-medium" value={q.question} onChange={(e) => { const newQs = [...(module.quizQuestions || [])]; newQs[qIdx] = { ...q, question: e.target.value }; onUpdate({...module, quizQuestions: newQs}); }} placeholder="Enter question..." />
                                            <button onClick={() => { const newQs = (module.quizQuestions || []).filter((_, i) => i !== qIdx); onUpdate({...module, quizQuestions: newQs}); }} className="text-slate-400 hover:text-red-400"><Trash2 size={14}/></button>
                                        </div>
                                        
                                        <div className="mb-3 flex items-center gap-4 ml-6">
                                            <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                                                <input 
                                                    type="checkbox" 
                                                    checked={q.multiSelect} 
                                                    onChange={(e) => {
                                                        const newQs = [...(module.quizQuestions || [])];
                                                        // If switching to single select, keep only first answer
                                                        const newCorrect = e.target.checked ? q.correctAnswers : [q.correctAnswers[0] || 0];
                                                        newQs[qIdx] = { ...q, multiSelect: e.target.checked, correctAnswers: newCorrect };
                                                        onUpdate({...module, quizQuestions: newQs});
                                                    }}
                                                    className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500" 
                                                />
                                                Allow Multiple Answers
                                            </label>
                                        </div>

                                        <div className="pl-6 space-y-2">
                                            {q.options.map((opt, oIdx) => {
                                                const isCorrect = q.correctAnswers.includes(oIdx);
                                                return (
                                                    <div key={oIdx} className="flex items-center gap-2">
                                                        <div 
                                                            className={`cursor-pointer ${isCorrect ? 'text-green-500' : 'text-slate-300 hover:text-slate-400'}`}
                                                            onClick={() => {
                                                                let newCorrect;
                                                                if (q.multiSelect) {
                                                                    newCorrect = isCorrect 
                                                                        ? q.correctAnswers.filter(c => c !== oIdx)
                                                                        : [...q.correctAnswers, oIdx];
                                                                } else {
                                                                    newCorrect = [oIdx];
                                                                }
                                                                const newQs = [...(module.quizQuestions || [])];
                                                                newQs[qIdx] = { ...q, correctAnswers: newCorrect };
                                                                onUpdate({...module, quizQuestions: newQs});
                                                            }}
                                                        >
                                                            {q.multiSelect 
                                                                ? (isCorrect ? <CheckSquare size={16} /> : <Square size={16} />)
                                                                : (isCorrect ? <div className="w-4 h-4 rounded-full border-4 border-green-500" /> : <div className="w-4 h-4 rounded-full border border-slate-300" />)
                                                            }
                                                        </div>
                                                        <input 
                                                            className="flex-1 text-xs p-1.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-400 rounded outline-none transition-colors" 
                                                            value={opt} 
                                                            onChange={(e) => { const newQs = [...(module.quizQuestions || [])]; const newOpts = [...q.options]; newOpts[oIdx] = e.target.value; newQs[qIdx] = { ...q, options: newOpts }; onUpdate({...module, quizQuestions: newQs}); }} 
                                                        />
                                                        <button 
                                                            onClick={() => {
                                                                const newQs = [...(module.quizQuestions || [])];
                                                                const newOpts = q.options.filter((_, i) => i !== oIdx);
                                                                // Adjust correct answer indices
                                                                const newCorrect = q.correctAnswers
                                                                    .filter(idx => idx !== oIdx)
                                                                    .map(idx => idx > oIdx ? idx - 1 : idx);
                                                                
                                                                newQs[qIdx] = { ...q, options: newOpts, correctAnswers: newCorrect };
                                                                onUpdate({...module, quizQuestions: newQs});
                                                            }}
                                                            className="text-slate-300 hover:text-red-400 opacity-0 group-hover:opacity-100"
                                                            disabled={q.options.length <= 2}
                                                        >
                                                            <Trash2 size={12} />
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                            <button 
                                                onClick={() => {
                                                    const newQs = [...(module.quizQuestions || [])];
                                                    const newOpts = [...q.options, `Option ${q.options.length + 1}`];
                                                    newQs[qIdx] = { ...q, options: newOpts };
                                                    onUpdate({...module, quizQuestions: newQs});
                                                }}
                                                className="text-xs text-blue-500 hover:text-blue-600 font-medium ml-6 mt-1 flex items-center gap-1"
                                            >
                                                <Plus size={12} /> Add Answer
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                <div className="mt-6 flex justify-end gap-2">
                     <button onClick={handleDelete} className="px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded border border-transparent hover:border-red-100 transition-colors">Delete Module</button>
                </div>
            </div>
        )}
    </div>
  );
};

// --- MAIN ADMIN BUILDER COMPONENT ---

interface AdminBuilderProps {
  initialTopics: Topic[];
  onApplyChanges: (newTopics: Topic[]) => void;
  onExit: () => void;
}

export default function AdminBuilder({ initialTopics, onApplyChanges, onExit }: AdminBuilderProps) {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedTopicId, setSelectedTopicId] = useState<string>('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [confirmationOpen, setConfirmationOpen] = useState(false);

  // Initialize from props and hydrate keys/IDs
  useEffect(() => {
    const hydratedTopics = initialTopics.map(t => {
        const teacherKey = Object.entries(teachers).find(([_, v]) => v.email === t.teacher.email)?.[0] || 'ko';
        
        return {
          ...t,
          _key: generateKey(),
          teacherKey: teacherKey,
          variableName: t.variableName || `t_${t.id.replace(/-/g, '_')}`,
          subListVariableName: t.subListVariableName || `topic_${t.id.replace(/-/g, '_')}_subtopics`,
          subTopics: t.subTopics.map(s => {
             // Extract subId from full ID if missing
             const subId = s._subId || (s.id.startsWith(t.id + '-') ? s.id.substring(t.id.length + 1) : s.id.split('-').pop() || '');
             // Ensure Quiz Data Integrity
             const quizQuestions = s.quizQuestions?.map(q => ({
                 ...q,
                 correctAnswers: q.correctAnswers || (typeof q['correctAnswer'] === 'number' ? [q['correctAnswer']] : []),
                 multiSelect: q.multiSelect || false
             }));

             return { ...s, _subId: subId, _key: generateKey(), quizQuestions, uploadRequirements: s.uploadRequirements || [] };
          })
        };
    });
    setTopics(hydratedTopics);
    if (hydratedTopics.length > 0) setSelectedTopicId(hydratedTopics[0].id);
  }, [initialTopics]);

  const selectedTopic = useMemo(() => topics.find(t => t.id === selectedTopicId), [topics, selectedTopicId]);
  
  const topicIdConflict = useMemo(() => {
     if (!selectedTopic) return null;
     const count = topics.filter(t => t.id === selectedTopic.id).length;
     return count > 1 ? "ID already in use." : null;
  }, [topics, selectedTopic]);

  const allTopicOptions = useMemo(() => topics.map(t => ({ id: t.id, title: t.title })), [topics]);

  // --- ACTIONS ---

  const handleUpdateTopic = (originalId: string, updated: Topic) => {
    setTopics(prev => prev.map(t => {
      if (t.id === originalId) {
        if (updated.id !== originalId) {
            const updatedSubTopics = updated.subTopics.map(sub => ({
                ...sub,
                id: `${updated.id}-${sub._subId}` 
            }));
            return { ...updated, subTopics: updatedSubTopics };
        }
        return updated;
      }
      return t;
    }));
    if (originalId === selectedTopicId && updated.id !== originalId) {
        setSelectedTopicId(updated.id);
    }
  };

  const handleTitleChange = (newTitle: string) => {
    if (!selectedTopic) return;
    // NOTE: Decoupled ID from title updates for stability
    handleUpdateTopic(selectedTopic.id, {
        ...selectedTopic,
        title: newTitle,
    });
  };

  const handleAddTopic = () => {
    const newTitle = "New Topic";
    const baseId = generateSlug(newTitle);
    const existingIds = topics.map(t => t.id);
    const newId = getUniqueId(baseId, existingIds);
    const newTopic: Topic = {
      id: newId,
      variableName: `t_${generateVarName(newTitle)}_${Date.now().toString().slice(-4)}`,
      subListVariableName: `topic_${generateVarName(newTitle)}_subtopics_${Date.now().toString().slice(-4)}`,
      title: newTitle,
      shortDescription: 'Short description',
      fullDescription: 'Full description',
      imageUrl: 'https://picsum.photos/1000/600',
      color: '#3b82f6',
      level: 1,
      teacherKey: 'ko',
      relatedTopics: [],
      subTopics: [],
      teacher: teachers['ko'], // Placeholder
      _key: generateKey()
    };
    setTopics([...topics, newTopic]);
    setSelectedTopicId(newId);
  };

  const handleDeleteTopic = (topicIdToDelete: string) => {
    if (!window.confirm(`Delete this topic?`)) return;
    const remainingTopics = topics.filter(t => t.id !== topicIdToDelete);
    setTopics(remainingTopics);
    if (selectedTopicId === topicIdToDelete) {
         setSelectedTopicId(remainingTopics.length > 0 ? remainingTopics[0].id : '');
    }
  };

  const handleAddModule = (topicId: string) => {
    const currentTopic = topics.find(t => t.id === topicId);
    if (!currentTopic) return;
    const baseSubId = 'new-module';
    const existingSubIds = currentTopic.subTopics.map(s => s._subId || '');
    const subId = getUniqueId(baseSubId, existingSubIds);
    const newModule: SubTopic = {
      id: `${topicId}-${subId}`,
      _subId: subId,
      type: 'VIDEO',
      title: 'New Module',
      description: 'Module description...',
      duration: '10:00',
      hasResources: true,
      comments: [],
      resources: { notesUrl: 'auto', sourceUrl: 'auto' },
      _key: generateKey()
    };
    setTopics(prev => prev.map(t => {
      if (t.id !== topicId) return t;
      return { ...t, subTopics: [...t.subTopics, newModule] };
    }));
  };

  const handleUpdateModule = (topicId: string, originalModuleId: string, updatedModule: SubTopic) => {
    setTopics(prev => prev.map(t => {
      if (t.id !== topicId) return t;
      return { ...t, subTopics: t.subTopics.map(m => m.id === originalModuleId ? updatedModule : m) };
    }));
  };

  const handleDeleteModule = (topicId: string, moduleIdToDelete: string) => {
    setTopics(prev => prev.map(t => {
      if (t.id !== topicId) return t;
      return { ...t, subTopics: t.subTopics.filter(m => m.id !== moduleIdToDelete) };
    }));
  };

  const handleApply = () => {
      // Convert builder topics back to standard topics
      const cleanedTopics = topics.map(t => {
          const tKey = t.teacherKey || 'ko';
          // Clean up internal builder keys
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { _key, teacherKey, variableName, subListVariableName, ...restTopic } = t; 
          
          return {
              ...restTopic,
              teacher: teachers[tKey], // Re-attach teacher object based on key
              subTopics: t.subTopics.map(s => {
                  // eslint-disable-next-line @typescript-eslint/no-unused-vars
                  const { _key: sk, _subId, hasResources, ...restSub } = s;
                  if (hasResources === false) {
                      restSub.resources = undefined;
                  }
                  return restSub;
              })
          } as Topic;
      });
      
      onApplyChanges(cleanedTopics);
      setConfirmationOpen(false);
      alert("Changes Applied to Main Application successfully!");
  };

  return (
    <div className="fixed inset-0 z-[100] bg-white text-slate-900 flex flex-col font-sans">
      <header className="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
              <h1 className="text-white font-bold text-lg flex items-center gap-2">
                  <Edit2 size={20} className="text-blue-500" />
                  Curriculum Builder <span className="text-xs bg-blue-600 px-2 py-0.5 rounded text-white ml-2">ADMIN</span>
              </h1>
          </div>
          <div className="flex items-center gap-3">
              <button onClick={() => setConfirmationOpen(true)} className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all">
                  <Save size={16} /> Apply Changes
              </button>
              <button onClick={onExit} className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-lg text-sm font-medium transition-all">
                  Exit Builder
              </button>
          </div>
      </header>

      {confirmationOpen && (
          <div className="absolute inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
                  <h3 className="text-xl font-bold text-slate-900 mb-2">Apply Changes?</h3>
                  <p className="text-slate-600 mb-6">Are you sure you want to apply the changes to the main Application? This will replace the existing data for this session.</p>
                  <div className="flex justify-end gap-3">
                      <button onClick={() => setConfirmationOpen(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg">Cancel</button>
                      <button onClick={handleApply} className="px-6 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-500">Yes, Apply Changes</button>
                  </div>
              </div>
          </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* SIDEBAR */}
        <aside className="w-64 bg-slate-50 border-r border-slate-200 flex flex-col">
            <div className="flex-1 overflow-y-auto py-2">
            {topics.map(topic => (
                <div key={topic._key || topic.id} className={`flex items-center group transition-colors hover:bg-white hover:shadow-sm ${selectedTopicId === topic.id ? 'bg-white border-r-4 border-blue-500 shadow-sm' : 'border-r-4 border-transparent'}`}>
                <div onClick={() => setSelectedTopicId(topic.id)} className={`flex-1 min-w-0 py-3 pl-4 pr-2 cursor-pointer ${selectedTopicId === topic.id ? 'text-blue-700 font-semibold' : 'text-slate-600'}`}>
                    <div className="truncate text-sm">{topic.title}</div>
                </div>
                <button onClick={(e) => { e.stopPropagation(); handleDeleteTopic(topic.id); }} className="p-2 mr-2 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 size={16} />
                </button>
                </div>
            ))}
            <button onClick={handleAddTopic} className="w-full px-4 py-3 text-left text-sm text-blue-600 hover:bg-blue-50 flex items-center gap-2 transition-colors border-t border-slate-100">
                <Plus size={16} /> Add Topic
            </button>
            </div>
            <div className="p-4 bg-slate-100 border-t border-slate-200">
                 <button onClick={() => alert("Downloading feature not implemented in this demo mode.")} className="w-full bg-white border border-slate-300 text-slate-600 py-2 px-4 rounded shadow-sm flex items-center justify-center gap-2 font-medium transition-all text-xs hover:bg-slate-50">
                     <Download size={14} /> Download Source File
                 </button>
            </div>
        </aside>

        {/* EDITOR MAIN */}
        <main className="flex-1 overflow-y-auto bg-slate-100/50 p-8">
            {selectedTopic ? (
                <div className="max-w-4xl mx-auto">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                           <h2 className="text-2xl font-bold text-slate-900 mb-1">{selectedTopic.title}</h2>
                           <div className="flex items-center gap-2 text-slate-400 text-sm font-mono">{selectedTopic.id} {topicIdConflict && <span className="text-red-500 text-xs ml-2">({topicIdConflict})</span>}</div>
                        </div>
                        <span className="px-3 py-1 bg-white border border-slate-200 rounded-full text-xs font-bold text-slate-500 shadow-sm">Level {selectedTopic.level}</span>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xs uppercase tracking-wide text-slate-500 font-bold">Configuration</h3>
                            <button onClick={() => setShowAdvanced(!showAdvanced)} className="text-xs flex items-center gap-1 text-slate-400 hover:text-blue-600"><Settings size={12} /> {showAdvanced ? 'Hide' : 'Show'} Advanced</button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <label className="block text-xs font-medium text-slate-500 mb-1">Title</label>
                                <input type="text" value={selectedTopic.title} onChange={e => handleTitleChange(e.target.value)} className="w-full p-2 border border-slate-200 rounded text-base font-medium focus:ring-2 focus:ring-blue-500 outline-none bg-white" />
                            </div>
                            {showAdvanced && (
                                <div className="col-span-2 grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded border border-slate-100">
                                    <div className="col-span-1">
                                        <label className="block text-xs font-medium text-slate-500 mb-1">ID</label>
                                        <input type="text" value={selectedTopic.id} onChange={e => handleUpdateTopic(selectedTopic.id, {...selectedTopic, id: e.target.value})} className="w-full p-2 border rounded text-xs font-mono bg-white" />
                                    </div>
                                    <div className="col-span-1">
                                        <label className="block text-xs font-medium text-slate-500 mb-1">Variable Name</label>
                                        <input type="text" value={selectedTopic.variableName} onChange={e => handleUpdateTopic(selectedTopic.id, {...selectedTopic, variableName: e.target.value})} className="w-full p-2 border rounded text-xs font-mono bg-white" />
                                    </div>
                                </div>
                            )}
                            <div className="col-span-2">
                                <label className="block text-xs font-medium text-slate-500 mb-1">Short Description</label>
                                <input type="text" value={selectedTopic.shortDescription} onChange={e => handleUpdateTopic(selectedTopic.id, {...selectedTopic, shortDescription: e.target.value})} className="w-full p-2 border border-slate-200 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white" />
                            </div>
                            <div className="col-span-1">
                                <label className="block text-xs font-medium text-slate-500 mb-1">Teacher</label>
                                <select value={selectedTopic.teacherKey} onChange={e => handleUpdateTopic(selectedTopic.id, {...selectedTopic, teacherKey: e.target.value})} className="w-full p-2 border border-slate-200 rounded text-sm bg-white">
                                    {Object.entries(teachers).map(([key, t]) => <option key={key} value={key}>{t.name}</option>)}
                                </select>
                            </div>
                            <div className="col-span-1">
                                <label className="block text-xs font-medium text-slate-500 mb-1">Level</label>
                                <select value={selectedTopic.level} onChange={e => handleUpdateTopic(selectedTopic.id, {...selectedTopic, level: parseInt(e.target.value) as any})} className="w-full p-2 border border-slate-200 rounded text-sm bg-white">
                                    {[1, 2, 3, 4, 5].map(lvl => <option key={lvl} value={lvl}>Level {lvl}</option>)}
                                </select>
                            </div>
                             <div className="col-span-2">
                                <label className="block text-xs font-medium text-slate-500 mb-1">Related Topics</label>
                                <div className="p-3 border border-slate-200 rounded max-h-40 overflow-y-auto bg-white">
                                    <div className="space-y-2">
                                        {allTopicOptions.filter(t => t.id !== selectedTopic.id).map(opt => (
                                            <label key={opt.id} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                                                <input type="checkbox" checked={selectedTopic.relatedTopics.includes(opt.id)} onChange={(e) => { const newRelated = e.target.checked ? [...selectedTopic.relatedTopics, opt.id] : selectedTopic.relatedTopics.filter(id => id !== opt.id); handleUpdateTopic(selectedTopic.id, {...selectedTopic, relatedTopics: newRelated}); }} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                                                <span>{opt.title}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mb-4 flex items-center justify-between">
                        <h3 className="text-lg font-bold text-slate-800">Learning Modules</h3>
                        <button onClick={() => handleAddModule(selectedTopic.id)} className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 font-medium transition-colors"><Plus size={16} /> Add Module</button>
                    </div>

                    <div className="space-y-4 pb-20">
                        {selectedTopic.subTopics.map((module) => (
                            <ModuleEditor 
                                key={module._key || module.id} 
                                topicId={selectedTopic.id}
                                module={module} 
                                existingSubIds={selectedTopic.subTopics.filter(m => m.id !== module.id).map(m => m._subId)}
                                onUpdate={(m) => handleUpdateModule(selectedTopic.id, module.id, m)}
                                onDelete={() => handleDeleteModule(selectedTopic.id, module.id)}
                            />
                        ))}
                    </div>
                </div>
            ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                    <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mb-4"><Edit2 size={32} className="text-slate-400" /></div>
                    <p>Select a topic to start editing</p>
                </div>
            )}
        </main>
      </div>
    </div>
  );
}
