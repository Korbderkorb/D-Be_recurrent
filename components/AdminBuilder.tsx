
import React, { useState, useMemo, useEffect } from 'react';
import { Download, Plus, Trash2, Edit2, GripVertical, ChevronRight, Video, Upload, HelpCircle, UploadCloud, RefreshCw, Copy, AlertCircle, Info, Settings, Save, CheckSquare, Square, X, Users, GraduationCap, Layers, UserPlus, Key, Eye, Shield, BarChart3, Search, Lock as LockIcon } from 'lucide-react';
import { Topic, SubTopic, Teacher, SubTopicType, QuizQuestion, User } from '../types';

const MEDIA_ROOT = '/media';
const MODULE_TYPES: SubTopicType[] = ['VIDEO', 'EXERCISE_UPLOAD', 'EXERCISE_QUIZ'];

// --- UTILITIES ---
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

const getTopicThumbPath = (topicId: string) => `${MEDIA_ROOT}/${topicId}/topic-thumb.jpg`;

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
                className="flex items-center gap-2 bg-white hover:bg-slate-50 border border-slate-200 rounded p-2 cursor-pointer transition-colors group"
                title="Click to copy path"
            >
                <code className="text-xs font-mono text-slate-700 break-all flex-1">{path}</code>
                <Copy size={12} className="text-slate-400 group-hover:text-blue-600" />
            </div>
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

  return (
    <div className={`bg-white border rounded-lg transition-all ${expanded ? 'shadow-md border-blue-200 ring-1 ring-blue-100' : 'border-slate-200 hover:border-slate-300'}`}>
        <div 
            className="flex items-center p-4 cursor-pointer"
            onClick={() => setExpanded(!expanded)}
        >
            <div className="mr-3 text-slate-300 cursor-grab active:cursor-grabbing"><GripVertical size={16} /></div>
            <div className="mr-3 p-2 bg-slate-50 rounded-md border border-slate-100">{
                module.type === 'VIDEO' ? <Video size={18} className="text-blue-500" /> :
                module.type === 'EXERCISE_UPLOAD' ? <Upload size={18} className="text-purple-500" /> :
                <HelpCircle size={18} className="text-orange-500" />
            }</div>
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
                        <input type="text" value={module.title} onChange={e => onUpdate({ ...module, title: e.target.value })} className="w-full p-2 text-sm border border-slate-200 rounded focus:border-blue-400 outline-none bg-white font-medium" />
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
                    
                    {/* VIDEO SPECIFIC */}
                    {module.type === 'VIDEO' && (
                         <div className="col-span-12 space-y-3 pb-2 border-b border-slate-200 mb-2">
                             <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-700 select-none font-bold mt-2">
                                <input 
                                    type="checkbox" 
                                    checked={module.hasResources !== false} 
                                    onChange={e => onUpdate({...module, hasResources: e.target.checked})} 
                                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" 
                                /> 
                                Has Resources (Notes/Zip)
                             </label>
                             
                             {(module.hasResources !== false) && (
                                 <div className="grid grid-cols-2 gap-4 pl-6 animate-in slide-in-from-top-2 fade-in">
                                     <div>
                                         <label className="block text-xs font-medium text-slate-500 mb-1">Lecture Notes Link (PDF)</label>
                                         <input 
                                            type="text" 
                                            value={module.resources?.notesUrl || ''} 
                                            onChange={e => onUpdate({
                                                ...module, 
                                                resources: { ...module.resources, notesUrl: e.target.value }
                                            })} 
                                            placeholder={getGeneratedPath(topicId, module._subId, 'pdf')}
                                            className="w-full p-2 text-sm border border-slate-200 rounded focus:border-blue-400 outline-none bg-white font-mono text-slate-600" 
                                         />
                                     </div>
                                     <div>
                                         <label className="block text-xs font-medium text-slate-500 mb-1">Source Files Link (Zip)</label>
                                         <input 
                                            type="text" 
                                            value={module.resources?.sourceUrl || ''} 
                                            onChange={e => onUpdate({
                                                ...module, 
                                                resources: { ...module.resources, sourceUrl: e.target.value }
                                            })} 
                                            placeholder={getGeneratedPath(topicId, module._subId, 'zip')}
                                            className="w-full p-2 text-sm border border-slate-200 rounded focus:border-blue-400 outline-none bg-white font-mono text-slate-600" 
                                         />
                                     </div>
                                 </div>
                             )}
                         </div>
                    )}

                    {/* UPLOAD EXERCISE SPECIFIC */}
                    {module.type === 'EXERCISE_UPLOAD' && (
                        <div className="col-span-12 bg-white p-3 rounded border border-slate-200">
                             <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Upload Requirements</label>
                             <div className="space-y-2 mb-3">
                                 {(module.uploadRequirements || []).map((req, idx) => (
                                     <div key={idx} className="flex items-center gap-2">
                                         <span className="text-sm font-medium text-slate-700 bg-slate-50 border px-2 py-1 rounded flex-1">{req}</span>
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
                                    className="flex-1 p-1.5 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-blue-400 outline-none bg-white"
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
                                        
                                        <div className="mb-3 ml-6 flex gap-4">
                                            <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                                                <input 
                                                    type="checkbox" 
                                                    checked={q.multiSelect} 
                                                    onChange={(e) => {
                                                        const newQs = [...(module.quizQuestions || [])];
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
                                                            className="flex-1 text-xs p-1.5 bg-white border border-slate-200 focus:border-blue-400 rounded outline-none transition-colors" 
                                                            value={opt} 
                                                            onChange={(e) => { const newQs = [...(module.quizQuestions || [])]; const newOpts = [...q.options]; newOpts[oIdx] = e.target.value; newQs[qIdx] = { ...q, options: newOpts }; onUpdate({...module, quizQuestions: newQs}); }} 
                                                        />
                                                        <button 
                                                            onClick={() => {
                                                                const newQs = [...(module.quizQuestions || [])];
                                                                const newOpts = q.options.filter((_, i) => i !== oIdx);
                                                                // Adjust correct answer indices
                                                                const newCorrect = q.correctAnswers.filter(idx => idx !== oIdx).map(idx => idx > oIdx ? idx - 1 : idx);
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
                <div className="mt-6 flex justify-between gap-2">
                     <button onClick={() => setShowAdvancedSettings(!showAdvancedSettings)} className="text-xs flex items-center gap-1 text-slate-400 hover:text-blue-600 transition-colors">
                            <Settings size={12} /> {showAdvancedSettings ? 'Hide' : 'Show'} Advanced ID Settings
                    </button>
                     <button onClick={() => { if (window.confirm("Are you sure?")) onDelete(); }} className="px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded border border-transparent hover:border-red-100 transition-colors">Delete Module</button>
                </div>
                {showAdvancedSettings && (
                        <div className="mt-4 bg-white p-3 rounded border border-slate-200">
                            <label className="block text-xs font-medium text-slate-500 mb-1">Sub-ID (Manual Override)</label>
                             <div className="flex gap-2">
                                <input type="text" value={module._subId || ''} onChange={e => { const val = generateSlug(e.target.value); const rootId = module.id.split('-').slice(0, -1).join('-'); onUpdate({...module, _subId: val, id: rootId ? `${rootId}-${val}` : module.id}); }} className={`flex-1 p-2 text-sm border rounded focus:ring-2 outline-none font-mono text-slate-600 bg-white ${subIdConflict ? 'border-red-300 ring-red-200' : 'border-slate-200 focus:ring-blue-400'}`} />
                             </div>
                        </div>
                )}
            </div>
        )}
    </div>
  );
};

// --- MAIN ADMIN BUILDER COMPONENT ---

interface AdminBuilderProps {
  initialTopics: Topic[];
  initialTeachers: Teacher[];
  initialUsers: User[];
  onApplyChanges: (newTopics: Topic[], newTeachers: Teacher[], newUsers: User[]) => void;
  onExit: () => void;
}

export default function AdminBuilder({ initialTopics, initialTeachers, initialUsers, onApplyChanges, onExit }: AdminBuilderProps) {
  const [activeTab, setActiveTab] = useState<'CURRICULUM' | 'TEACHERS' | 'USERS'>('CURRICULUM');
  
  // States
  const [topics, setTopics] = useState<Topic[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  // Selection States
  const [selectedTopicId, setSelectedTopicId] = useState<string>('');
  const [editingTeacherId, setEditingTeacherId] = useState<string | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  const [confirmationOpen, setConfirmationOpen] = useState(false);

  // Initialize
  useEffect(() => {
    setTeachers(initialTeachers);
    setUsers(initialUsers);

    // Hydrate topics with IDs and keys for internal use
    const hydratedTopics = initialTopics.map(t => {
        // Teacher mapping strategy: find by email
        const teacherObj = initialTeachers.find(teacher => teacher.email === t.teacher.email);
        const teacherId = teacherObj ? teacherObj.id : 'unknown';

        return {
          ...t,
          _key: generateKey(),
          teacherKey: teacherId, // Map to teacher ID
          variableName: t.variableName || `t_${t.id.replace(/-/g, '_')}`,
          subListVariableName: t.subListVariableName || `topic_${t.id.replace(/-/g, '_')}_subtopics`,
          subTopics: t.subTopics.map(s => {
             const subId = s._subId || (s.id.startsWith(t.id + '-') ? s.id.substring(t.id.length + 1) : s.id.split('-').pop() || '');
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
  }, [initialTopics, initialTeachers, initialUsers]);

  // --- HANDLERS FOR CURRICULUM ---
  const selectedTopic = useMemo(() => topics.find(t => t.id === selectedTopicId), [topics, selectedTopicId]);
  
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

  const handleAddTopic = () => {
    const newTitle = "New Topic";
    const baseId = generateSlug(newTitle);
    const existingIds = topics.map(t => t.id);
    const newId = getUniqueId(baseId, existingIds);
    const newTopic: Topic = {
      id: newId,
      variableName: `t_${generateSlug(newTitle)}`,
      title: newTitle,
      shortDescription: 'Short description',
      fullDescription: 'Full description',
      imageUrl: 'https://picsum.photos/1000/600',
      color: '#3b82f6',
      level: 1,
      teacherKey: teachers[0]?.id || 'unknown',
      relatedTopics: [],
      subTopics: [],
      teacher: teachers[0],
      _key: generateKey()
    };
    setTopics([...topics, newTopic]);
    setSelectedTopicId(newId);
  };

  const handleDeleteTopic = (id: string) => {
    if (!window.confirm("Delete Topic?")) return;
    const remaining = topics.filter(t => t.id !== id);
    setTopics(remaining);
    if (selectedTopicId === id) setSelectedTopicId(remaining[0]?.id || '');
  };

  const handleAddModule = (topicId: string) => {
    const t = topics.find(t => t.id === topicId);
    if (!t) return;
    const subId = getUniqueId('new-module', t.subTopics.map(s => s._subId || ''));
    const newMod: SubTopic = {
        id: `${topicId}-${subId}`,
        _subId: subId,
        type: 'VIDEO',
        title: 'New Module',
        description: 'Desc',
        duration: '10:00',
        comments: [],
        hasResources: true,
        resources: { notesUrl: '', sourceUrl: '' },
        _key: generateKey()
    };
    handleUpdateTopic(topicId, { ...t, subTopics: [...t.subTopics, newMod] });
  };

  // --- HANDLERS FOR TEACHERS ---
  const handleAddTeacher = () => {
      const newTeacher: Teacher = {
          id: `t_${Date.now()}`,
          name: "New Instructor",
          role: "Assistant Professor",
          email: "instructor@university.edu",
          avatar: "https://ui-avatars.com/api/?name=New+Instructor&background=random",
          bio: "Short biography here."
      };
      setTeachers([...teachers, newTeacher]);
      setEditingTeacherId(newTeacher.id);
  };

  const handleUpdateTeacher = (updated: Teacher) => {
      setTeachers(prev => prev.map(t => t.id === updated.id ? updated : t));
  };

  const handleDeleteTeacher = (id: string) => {
      if(!window.confirm("Delete teacher? This may break topic associations.")) return;
      setTeachers(prev => prev.filter(t => t.id !== id));
      if (editingTeacherId === id) setEditingTeacherId(null);
  };

  // --- HANDLERS FOR USERS ---
  const handleAddUser = () => {
      const newUser: User = {
          id: `u_${Date.now()}`,
          email: `student${users.length+1}@university.edu`,
          password: 'password123',
          name: "New Student",
          avatar: `https://ui-avatars.com/api/?name=Student&background=random`,
          role: 'student',
          allowedTopics: topics.map(t => t.id), // Default all access?
          stats: {
              modulesCompleted: 0,
              totalModules: topics.reduce((acc, t) => acc + t.subTopics.length, 0),
              lastActive: 'Never',
              quizScores: []
          }
      };
      setUsers([...users, newUser]);
      setEditingUserId(newUser.id);
  };

  const handleUpdateUser = (updated: User) => {
      setUsers(prev => prev.map(u => u.id === updated.id ? updated : u));
  };

  const handleDeleteUser = (id: string) => {
      if(!window.confirm("Delete user account?")) return;
      setUsers(prev => prev.filter(u => u.id !== id));
      if (editingUserId === id) setEditingUserId(null);
  };

  const handleToggleUserTopic = (user: User, topicId: string) => {
      const currentAllowed = user.allowedTopics || [];
      let newAllowed;
      if (currentAllowed.includes(topicId)) {
          newAllowed = currentAllowed.filter(id => id !== topicId);
      } else {
          newAllowed = [...currentAllowed, topicId];
      }
      handleUpdateUser({ ...user, allowedTopics: newAllowed });
  };


  // --- APPLY ALL ---
  const handleApply = () => {
      // Reconstitute topics with teacher objects
      const finalTopics = topics.map(t => {
          const { _key, teacherKey, variableName, subListVariableName, ...rest } = t;
          const assignedTeacher = teachers.find(tch => tch.id === teacherKey) || teachers[0];
          
          return {
              ...rest,
              teacher: assignedTeacher,
              subTopics: t.subTopics.map(s => {
                  const { _key: sk, _subId, hasResources, ...sRest } = s;
                  if (hasResources === false) sRest.resources = undefined;
                  return sRest;
              })
          } as Topic;
      });

      onApplyChanges(finalTopics, teachers, users);
      setConfirmationOpen(false);
      alert("Changes applied successfully!");
  };

  return (
    <div className="fixed inset-0 z-[100] bg-white text-slate-900 flex flex-col font-sans">
      <header className="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-4">
              <h1 className="text-white font-bold text-lg flex items-center gap-2">
                  <Edit2 size={20} className="text-blue-500" />
                  Curriculum Builder <span className="text-xs bg-blue-600 px-2 py-0.5 rounded text-white ml-2">ADMIN</span>
              </h1>
              <div className="h-6 w-px bg-slate-700 mx-2" />
              <div className="flex bg-slate-800 p-1 rounded-lg">
                  <button 
                    onClick={() => setActiveTab('CURRICULUM')}
                    className={`px-3 py-1.5 rounded text-xs font-bold transition-colors ${activeTab === 'CURRICULUM' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}
                  >
                      Curriculum
                  </button>
                  <button 
                    onClick={() => setActiveTab('TEACHERS')}
                    className={`px-3 py-1.5 rounded text-xs font-bold transition-colors ${activeTab === 'TEACHERS' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}
                  >
                      Teachers
                  </button>
                  <button 
                    onClick={() => setActiveTab('USERS')}
                    className={`px-3 py-1.5 rounded text-xs font-bold transition-colors ${activeTab === 'USERS' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}
                  >
                      Users
                  </button>
              </div>
          </div>
          <div className="flex items-center gap-3">
              <button onClick={() => setConfirmationOpen(true)} className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-green-900/20">
                  <Save size={16} /> Apply Changes
              </button>
              <button onClick={onExit} className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-lg text-sm font-medium transition-all">
                  Exit
              </button>
          </div>
      </header>

      {confirmationOpen && (
          <div className="absolute inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95">
                  <h3 className="text-xl font-bold text-slate-900 mb-2">Apply Changes?</h3>
                  <p className="text-slate-600 mb-6">This will update the live application state for all tabs (Curriculum, Teachers, Users).</p>
                  <div className="flex justify-end gap-3">
                      <button onClick={() => setConfirmationOpen(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg">Cancel</button>
                      <button onClick={handleApply} className="px-6 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-500">Yes, Apply</button>
                  </div>
              </div>
          </div>
      )}

      {/* --- TAB CONTENT --- */}
      <div className="flex-1 overflow-hidden relative">
          
          {/* CURRICULUM TAB */}
          {activeTab === 'CURRICULUM' && (
              <div className="flex h-full">
                  <aside className="w-64 bg-slate-50 border-r border-slate-200 flex flex-col shrink-0">
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
                  </aside>
                  <main className="flex-1 overflow-y-auto bg-slate-100/50 p-8">
                     {selectedTopic ? (
                         <div className="max-w-4xl mx-auto space-y-6">
                            {/* Topic Header Editor */}
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                                <h3 className="text-xs uppercase tracking-wide text-slate-500 font-bold mb-4">Topic Settings</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2">
                                        <label className="block text-xs font-medium text-slate-500 mb-1">Title</label>
                                        <input className="w-full p-2 border rounded text-base font-bold text-slate-800 bg-white" value={selectedTopic.title} onChange={e => handleUpdateTopic(selectedTopicId, {...selectedTopic, title: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 mb-1">Teacher</label>
                                        <select 
                                            className="w-full p-2 border rounded text-sm bg-white"
                                            value={selectedTopic.teacherKey}
                                            onChange={e => handleUpdateTopic(selectedTopicId, {...selectedTopic, teacherKey: e.target.value})}
                                        >
                                            {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 mb-1">Level</label>
                                        <select 
                                            className="w-full p-2 border rounded text-sm bg-white"
                                            value={selectedTopic.level}
                                            onChange={e => handleUpdateTopic(selectedTopicId, {...selectedTopic, level: parseInt(e.target.value) as any})}
                                        >
                                            {[1,2,3,4,5].map(l => <option key={l} value={l}>Level {l}</option>)}
                                        </select>
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-xs font-medium text-slate-500 mb-1">Description</label>
                                        <textarea className="w-full p-2 border rounded text-sm h-20 bg-white" value={selectedTopic.shortDescription} onChange={e => handleUpdateTopic(selectedTopicId, {...selectedTopic, shortDescription: e.target.value})} />
                                    </div>
                                    
                                    {/* Prerequisites Selector */}
                                    <div className="col-span-2 mt-4 pt-4 border-t border-slate-100">
                                        <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Prerequisites (Graph Connections)</h4>
                                        <div className="bg-white p-3 rounded border border-slate-200 max-h-40 overflow-y-auto grid grid-cols-2 gap-2">
                                            {topics.filter(t => t.id !== selectedTopic.id).map(t => (
                                                <label key={t.id} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer hover:bg-slate-50 p-1 rounded transition-colors">
                                                    <input 
                                                        type="checkbox"
                                                        checked={selectedTopic.relatedTopics.includes(t.id)}
                                                        onChange={(e) => {
                                                            const current = selectedTopic.relatedTopics;
                                                            const updated = e.target.checked 
                                                                ? [...current, t.id]
                                                                : current.filter(id => id !== t.id);
                                                            handleUpdateTopic(selectedTopicId, { ...selectedTopic, relatedTopics: updated });
                                                        }}
                                                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                                    />
                                                    <span className="truncate">{t.title}</span>
                                                    <span className="text-xs text-slate-400 ml-auto">Lvl {t.level}</span>
                                                </label>
                                            ))}
                                            {topics.length <= 1 && <span className="text-xs text-slate-400 italic col-span-2">No other topics available to connect.</span>}
                                        </div>
                                    </div>

                                    {/* Thumbnail Path Helper */}
                                    <div className="col-span-2 mt-4">
                                        <PathDisplay 
                                            label="Topic Thumbnail Path" 
                                            path={getTopicThumbPath(selectedTopic.id)} 
                                            description="Save the topic cover image here. Use this path when configuring the Image URL." 
                                        />
                                        <div className="mt-2">
                                            <label className="block text-xs font-medium text-slate-500 mb-1">Image URL</label>
                                            <input 
                                                className="w-full p-2 border rounded text-sm bg-white font-mono text-slate-600" 
                                                value={selectedTopic.imageUrl} 
                                                onChange={e => handleUpdateTopic(selectedTopicId, {...selectedTopic, imageUrl: e.target.value})} 
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Module List */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-bold text-slate-800">Modules ({selectedTopic.subTopics.length})</h3>
                                    <button onClick={() => handleAddModule(selectedTopicId)} className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 font-medium"><Plus size={16}/> Add Module</button>
                                </div>
                                {selectedTopic.subTopics.map(mod => (
                                    <ModuleEditor 
                                        key={mod._key || mod.id}
                                        topicId={selectedTopicId}
                                        module={mod}
                                        existingSubIds={selectedTopic.subTopics.filter(m => m.id !== mod.id).map(m => m._subId)}
                                        onUpdate={(updated) => {
                                            const newSubTopics = selectedTopic.subTopics.map(m => m.id === mod.id ? updated : m);
                                            handleUpdateTopic(selectedTopicId, { ...selectedTopic, subTopics: newSubTopics });
                                        }}
                                        onDelete={() => {
                                            const newSubTopics = selectedTopic.subTopics.filter(m => m.id !== mod.id);
                                            handleUpdateTopic(selectedTopicId, { ...selectedTopic, subTopics: newSubTopics });
                                        }}
                                    />
                                ))}
                            </div>
                         </div>
                     ) : (
                         <div className="flex flex-col items-center justify-center h-full text-slate-400">
                             <Layers size={48} className="mb-4 opacity-20" />
                             <p>Select a topic to edit</p>
                         </div>
                     )}
                  </main>
              </div>
          )}

          {/* TEACHERS TAB */}
          {activeTab === 'TEACHERS' && (
              <div className="h-full bg-slate-100/50 p-8 overflow-y-auto">
                  <div className="max-w-5xl mx-auto">
                      <div className="flex justify-between items-center mb-8">
                          <div>
                              <h2 className="text-2xl font-bold text-slate-900">Instructor Management</h2>
                              <p className="text-slate-500">Manage teacher profiles and assignments.</p>
                          </div>
                          <button onClick={handleAddTeacher} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-lg shadow-blue-900/10">
                              <Plus size={16} /> Add Instructor
                          </button>
                      </div>
                      
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {teachers.map(teacher => (
                              <div key={teacher.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden group">
                                  {editingTeacherId === teacher.id ? (
                                      <div className="p-6 space-y-4">
                                          <div className="flex justify-between items-center mb-2">
                                              <span className="text-xs font-bold text-blue-600 uppercase">Editing Profile</span>
                                              <button onClick={() => setEditingTeacherId(null)} className="text-slate-400 hover:text-slate-600"><X size={16}/></button>
                                          </div>
                                          <div className="grid grid-cols-2 gap-4">
                                              <div className="col-span-2">
                                                  <label className="text-xs font-medium text-slate-500">Full Name</label>
                                                  <input className="w-full p-2 border rounded bg-white" value={teacher.name} onChange={e => handleUpdateTeacher({...teacher, name: e.target.value})} />
                                              </div>
                                              <div>
                                                  <label className="text-xs font-medium text-slate-500">Role</label>
                                                  <input className="w-full p-2 border rounded bg-white" value={teacher.role} onChange={e => handleUpdateTeacher({...teacher, role: e.target.value})} />
                                              </div>
                                              <div>
                                                  <label className="text-xs font-medium text-slate-500">Email</label>
                                                  <input className="w-full p-2 border rounded bg-white" value={teacher.email} onChange={e => handleUpdateTeacher({...teacher, email: e.target.value})} />
                                              </div>
                                              <div className="col-span-2">
                                                  <label className="text-xs font-medium text-slate-500">Avatar URL</label>
                                                  <input className="w-full p-2 border rounded bg-white" value={teacher.avatar} onChange={e => handleUpdateTeacher({...teacher, avatar: e.target.value})} />
                                              </div>
                                              <div className="col-span-2">
                                                  <label className="text-xs font-medium text-slate-500">Bio (Short Description)</label>
                                                  <textarea className="w-full p-2 border rounded text-sm h-20 bg-white" value={teacher.bio || ''} onChange={e => handleUpdateTeacher({...teacher, bio: e.target.value})} placeholder="Short biography..." />
                                              </div>
                                          </div>
                                          <div className="flex justify-end pt-2">
                                              <button onClick={() => handleDeleteTeacher(teacher.id)} className="text-red-500 text-xs hover:underline flex items-center gap-1"><Trash2 size={12}/> Remove Instructor</button>
                                          </div>
                                      </div>
                                  ) : (
                                      <div className="p-6 flex items-start gap-4">
                                          <img src={teacher.avatar} alt={teacher.name} className="w-16 h-16 rounded-full object-cover border-2 border-slate-100" />
                                          <div className="flex-1">
                                              <h3 className="font-bold text-slate-900">{teacher.name}</h3>
                                              <p className="text-blue-600 text-sm font-medium">{teacher.role}</p>
                                              <p className="text-slate-500 text-sm mb-3">{teacher.email}</p>
                                              <p className="text-slate-600 text-sm leading-relaxed mb-4">{teacher.bio || 'No biography added.'}</p>
                                              
                                              <div className="flex items-center gap-2 mt-auto">
                                                  <button onClick={() => setEditingTeacherId(teacher.id)} className="text-xs bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded font-medium text-slate-700 transition-colors">Edit Profile</button>
                                              </div>
                                          </div>
                                      </div>
                                  )}
                              </div>
                          ))}
                      </div>
                  </div>
              </div>
          )}

          {/* USERS TAB */}
          {activeTab === 'USERS' && (
              <div className="h-full bg-slate-100/50 p-8 overflow-y-auto">
                  <div className="max-w-6xl mx-auto">
                      <div className="flex justify-between items-center mb-8">
                          <div>
                              <h2 className="text-2xl font-bold text-slate-900">User Access Control</h2>
                              <p className="text-slate-500">Create credentials and assign personalized curriculums.</p>
                          </div>
                          <button onClick={handleAddUser} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-lg shadow-blue-900/10">
                              <UserPlus size={16} /> Create User
                          </button>
                      </div>

                      <div className="space-y-6">
                          {users.map(user => (
                              <div key={user.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                                  {editingUserId === user.id ? (
                                      <div className="p-6">
                                          <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                                              <h3 className="font-bold text-slate-900 flex items-center gap-2"><Settings size={18} className="text-blue-500"/> Editing User: {user.email}</h3>
                                              <div className="flex gap-2">
                                                  <button onClick={() => setEditingUserId(null)} className="px-3 py-1.5 text-sm bg-slate-100 hover:bg-slate-200 rounded text-slate-600">Done</button>
                                                  <button onClick={() => handleDeleteUser(user.id)} className="px-3 py-1.5 text-sm bg-red-50 hover:bg-red-100 text-red-600 rounded">Delete</button>
                                              </div>
                                          </div>
                                          
                                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                              <div className="space-y-4">
                                                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Credentials</h4>
                                                  <div className="grid grid-cols-2 gap-4">
                                                      <div>
                                                          <label className="text-xs font-medium text-slate-500">Name</label>
                                                          <input className="w-full p-2 border rounded text-sm bg-white" value={user.name} onChange={e => handleUpdateUser({...user, name: e.target.value})} />
                                                      </div>
                                                      <div>
                                                          <label className="text-xs font-medium text-slate-500">Role</label>
                                                          <select className="w-full p-2 border rounded text-sm bg-white" value={user.role} onChange={e => handleUpdateUser({...user, role: e.target.value as any})}>
                                                              <option value="student">Student</option>
                                                              <option value="admin">Admin</option>
                                                          </select>
                                                      </div>
                                                      <div>
                                                          <label className="text-xs font-medium text-slate-500">Email (Login)</label>
                                                          <input className="w-full p-2 border rounded text-sm bg-white" value={user.email} onChange={e => handleUpdateUser({...user, email: e.target.value})} />
                                                      </div>
                                                      <div>
                                                          <label className="text-xs font-medium text-slate-500">Password</label>
                                                          <input className="w-full p-2 border rounded text-sm font-mono bg-white" value={user.password} onChange={e => handleUpdateUser({...user, password: e.target.value})} />
                                                      </div>
                                                  </div>
                                                  
                                                  <div className="mt-8 pt-4 border-t border-slate-100">
                                                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">User Stats (Mock Data)</h4>
                                                      <div className="grid grid-cols-3 gap-4 text-center">
                                                          <div className="bg-slate-50 p-3 rounded border border-slate-100">
                                                              <div className="text-xl font-bold text-blue-600">{user.stats?.modulesCompleted || 0}</div>
                                                              <div className="text-[10px] text-slate-500 uppercase">Completed</div>
                                                          </div>
                                                          <div className="bg-slate-50 p-3 rounded border border-slate-100">
                                                              <div className="text-xl font-bold text-green-600">{user.stats?.quizScores?.length || 0}</div>
                                                              <div className="text-[10px] text-slate-500 uppercase">Quizzes Taken</div>
                                                          </div>
                                                          <div className="bg-slate-50 p-3 rounded border border-slate-100">
                                                              <div className="text-xl font-bold text-slate-700">{Math.round(((user.stats?.modulesCompleted || 0) / (user.stats?.totalModules || 1)) * 100)}%</div>
                                                              <div className="text-[10px] text-slate-500 uppercase">Progress</div>
                                                          </div>
                                                      </div>
                                                  </div>
                                              </div>

                                              <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                                                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2"><LockIcon size={14}/> Assigned Curriculum Modules</h4>
                                                  <p className="text-xs text-slate-500 mb-4">Uncheck modules to lock them for this user. They will appear greyed out in their graph.</p>
                                                  
                                                  <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                                                      {topics.map(t => {
                                                          const isAllowed = user.allowedTopics ? user.allowedTopics.includes(t.id) : true; // Default true if undefined
                                                          return (
                                                              <div key={t.id} onClick={() => handleToggleUserTopic(user, t.id)} className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${isAllowed ? 'bg-white border-green-200 shadow-sm' : 'bg-slate-100 border-transparent opacity-60'}`}>
                                                                  <div className={`w-5 h-5 rounded flex items-center justify-center border mr-3 ${isAllowed ? 'bg-green-500 border-green-600 text-white' : 'bg-white border-slate-300'}`}>
                                                                      {isAllowed && <CheckSquare size={14} />}
                                                                  </div>
                                                                  <div className="flex-1">
                                                                      <div className={`text-sm font-bold ${isAllowed ? 'text-slate-800' : 'text-slate-500'}`}>{t.title}</div>
                                                                      <div className="text-xs text-slate-400">Level {t.level} • {t.subTopics.length} Modules</div>
                                                                  </div>
                                                              </div>
                                                          );
                                                      })}
                                                  </div>
                                              </div>
                                          </div>
                                      </div>
                                  ) : (
                                      <div className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                          <div className="flex items-center gap-4">
                                              <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold overflow-hidden">
                                                  {user.avatar ? <img src={user.avatar} className="w-full h-full object-cover"/> : user.name[0]}
                                              </div>
                                              <div>
                                                  <h3 className="font-bold text-slate-700">{user.name}</h3>
                                                  <div className="flex items-center gap-2 text-xs text-slate-500">
                                                      <span className="font-mono">{user.email}</span>
                                                      <span className={`px-1.5 py-0.5 rounded uppercase font-bold text-[10px] ${user.role === 'admin' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>{user.role || 'student'}</span>
                                                  </div>
                                              </div>
                                          </div>
                                          <div className="flex items-center gap-6">
                                              <div className="text-right hidden sm:block">
                                                  <div className="text-xs text-slate-400 uppercase font-bold">Progress</div>
                                                  <div className="text-sm font-bold text-slate-700">{Math.round(((user.stats?.modulesCompleted || 0) / (user.stats?.totalModules || 1)) * 100)}%</div>
                                              </div>
                                              <div className="text-right hidden sm:block">
                                                  <div className="text-xs text-slate-400 uppercase font-bold">Access</div>
                                                  <div className="text-sm font-bold text-slate-700">{(user.allowedTopics || []).length} / {topics.length} Topics</div>
                                              </div>
                                              <button onClick={() => setEditingUserId(user.id)} className="bg-white border border-slate-200 hover:border-blue-300 text-slate-600 hover:text-blue-600 p-2 rounded-lg transition-colors">
                                                  <Edit2 size={16} />
                                              </button>
                                          </div>
                                      </div>
                                  )}
                              </div>
                          ))}
                      </div>
                  </div>
              </div>
          )}
      </div>
    </div>
  );
}
