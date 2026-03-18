
import React, { useState, useMemo, useEffect } from 'react';
import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Download, Plus, Trash2, Edit2, GripVertical, ChevronRight, Video, Upload, HelpCircle, UploadCloud, RefreshCw, Copy, AlertCircle, Info, Settings, Save, CheckSquare, Square, X, Users, GraduationCap, Layers, UserPlus, Key, Eye, Shield, BarChart3, Search, Lock as LockIcon, Sparkles, CheckCircle2, Clock, History, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { Topic, SubTopic, Teacher, SubTopicType, QuizQuestion, User, LandingConfig } from '../types';
import { MEDIA_ROOT, getPlaceholderPath } from '../constants';
const MODULE_TYPES: SubTopicType[] = ['VIDEO', 'EXERCISE_UPLOAD', 'EXERCISE_QUIZ'];

// --- UTILITIES ---
const generateSlug = (text: string): string => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_')     
    .replace(/[^\w_]+/g, '')  
    .replace(/__+/g, '_')     
    .replace(/^_+/, '')       
    .replace(/_+$/, '');      
};

const generateKey = () => Math.random().toString(36).substr(2, 9);

const getUniqueId = (base: string, existingIds: string[]) => {
    if (!existingIds.includes(base)) return base;
    
    let counter = 2;
    while (existingIds.includes(`${base}_${counter}`)) {
        counter++;
    }
    return `${base}_${counter}`;
};

const getGeneratedPath = (topicId: string, subId: string | undefined, type: 'video' | 'image' | 'thumb' | 'pdf' | 'zip') => {
  return getPlaceholderPath(type);
};

const getTopicThumbPath = (topicId: string) => getPlaceholderPath('thumb');

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

  const subIdConflict = existingSubIds.filter(id => id === module._subId).length > 1;

  const handleTitleChange = (newTitle: string) => {
    const updates: Partial<SubTopic> = { title: newTitle };
    if (!module._isManualId) {
      const slug = generateSlug(newTitle);
      const otherIds = existingSubIds.filter(id => id !== module._subId) as string[];
      const uniqueSubId = getUniqueId(slug || 'module', otherIds);
      updates._subId = uniqueSubId;
      updates.id = `${topicId}-${uniqueSubId}`;
    }
    onUpdate({ ...module, ...updates });
  };

  const handleIdChange = (newId: string) => {
    const slug = generateSlug(newId);
    onUpdate({ ...module, _subId: slug, id: `${topicId}-${slug}` });
  };

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
                    <div className="col-span-12 md:col-span-8">
                        <label className="block text-xs font-medium text-slate-500 mb-1">Title</label>
                        <input type="text" value={module.title} onChange={e => handleTitleChange(e.target.value)} className="w-full p-2 text-sm border border-slate-200 rounded focus:border-blue-400 outline-none bg-white font-medium" />
                    </div>
                    <div className="col-span-12 md:col-span-4">
                        <label className="block text-xs font-medium text-slate-500 mb-1">Type</label>
                        <select value={module.type} onChange={e => onUpdate({...module, type: e.target.value as SubTopicType})} className="w-full p-2 text-sm border border-slate-200 rounded focus:border-blue-400 outline-none bg-white">
                            {MODULE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>

                    <div className="col-span-12">
                        <div className="flex items-center justify-between mb-1">
                            <label className="block text-xs font-medium text-slate-500">Module ID</label>
                            <label className="flex items-center gap-1.5 text-[10px] text-slate-400 cursor-pointer select-none">
                                <input 
                                    type="checkbox" 
                                    checked={!!module._isManualId} 
                                    onChange={e => onUpdate({ ...module, _isManualId: e.target.checked })}
                                    className="w-3 h-3 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                />
                                Manual Edit
                            </label>
                        </div>
                        <input 
                            type="text" 
                            value={module._subId || ''} 
                            onChange={e => handleIdChange(e.target.value)}
                            disabled={!module._isManualId}
                            className={`w-full p-2 text-xs font-mono border rounded outline-none transition-colors ${module._isManualId ? 'bg-white border-blue-200 text-blue-700' : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'}`} 
                        />
                        {subIdConflict && <p className="text-[10px] text-red-500 mt-1 flex items-center gap-1"><AlertCircle size={10} /> This ID is already used by another module in this topic.</p>}
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
                             <div>
                                 <label className="block text-xs font-medium text-slate-500 mb-1">Embed Link (Vimeo/YouTube)</label>
                                 <input 
                                     type="text" 
                                     value={module.videoUrl || ''} 
                                     onChange={e => onUpdate({ ...module, videoUrl: e.target.value })} 
                                     placeholder="https://player.vimeo.com/video/..."
                                     className="w-full p-2 text-sm border border-slate-200 rounded focus:border-blue-400 outline-none bg-white font-mono text-slate-600" 
                                 />
                             </div>
                             
                             <div>
                                 <label className="block text-xs font-medium text-slate-500 mb-1">Poster Image URL (Thumbnail)</label>
                                 <input 
                                     type="text" 
                                     value={module.posterUrl || ''} 
                                     onChange={e => onUpdate({ ...module, posterUrl: e.target.value })} 
                                     placeholder={getGeneratedPath(topicId, module._subId, 'thumb')}
                                     className="w-full p-2 text-sm border border-slate-200 rounded focus:border-blue-400 outline-none bg-white font-mono text-slate-600" 
                                 />
                             </div>
                             
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

// --- SORTABLE TOPIC ITEM ---
interface SortableTopicItemProps {
    topic: Topic;
    isSelected: boolean;
    onSelect: () => void;
    onDelete: () => void;
}

const SortableTopicItem = ({ topic, isSelected, onSelect, onDelete }: SortableTopicItemProps) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: topic.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : 1,
        paddingLeft: `${(topic.level - 1) * 12}px`
    };

    return (
        <div 
            ref={setNodeRef} 
            style={style}
            className={`flex items-center group transition-colors hover:bg-white hover:shadow-sm ${isSelected ? 'bg-white border-r-4 border-blue-500 shadow-sm' : 'border-r-4 border-transparent'} ${isDragging ? 'opacity-50 shadow-lg' : ''}`}
        >
            <div 
                {...attributes} 
                {...listeners} 
                className="pl-3 text-slate-300 cursor-grab active:cursor-grabbing hover:text-slate-500 flex items-center gap-1"
            >
                <GripVertical size={14} />
                {topic.level > 1 && (
                    <div className="flex items-center">
                        {[...Array(topic.level - 1)].map((_, i) => (
                            <div key={i} className="w-2 h-px bg-slate-200" />
                        ))}
                    </div>
                )}
            </div>
            <div onClick={onSelect} className={`flex-1 min-w-0 py-3 pl-2 pr-2 cursor-pointer ${isSelected ? 'text-blue-700 font-semibold' : 'text-slate-600'}`}>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono bg-slate-100 text-slate-400 px-1 rounded">L{topic.level}</span>
                    <div className="truncate text-sm">{topic.title}</div>
                </div>
            </div>
            <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-2 mr-2 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                <Trash2 size={16} />
            </button>
        </div>
    );
};

// --- MAIN ADMIN BUILDER COMPONENT ---

interface AdminBuilderProps {
  initialTopics: Topic[];
  initialTeachers: Teacher[];
  initialUsers: User[];
  initialLandingConfig: LandingConfig;
  onApplyChanges: (newTopics: Topic[], newTeachers: Teacher[], newUsers: User[], newLandingConfig: LandingConfig) => Promise<void>;
  onExit: () => void;
}

export default function AdminBuilder({ initialTopics, initialTeachers, initialUsers, initialLandingConfig, onApplyChanges, onExit }: AdminBuilderProps) {
  const [activeTab, setActiveTab] = useState<'CURRICULUM' | 'TEACHERS' | 'USERS' | 'USER_INTERFACE'>('CURRICULUM');
  
  // States
  const [topics, setTopics] = useState<Topic[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [landingConfig, setLandingConfig] = useState<LandingConfig>(initialLandingConfig);

  // Selection States
  const [selectedTopicId, setSelectedTopicId] = useState<string>('');
  const [editingTeacherId, setEditingTeacherId] = useState<string | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setTopics((items) => {
        const oldIndex = items.findIndex((t) => t.id === active.id);
        const newIndex = items.findIndex((t) => t.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  // Initialize
  useEffect(() => {
    if (isSaving) return; // Don't overwrite local state while saving
    
    setTeachers(initialTeachers);
    setUsers(initialUsers);
    setLandingConfig(initialLandingConfig);

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
        videoUrl: getGeneratedPath(topicId, subId, 'video'),
        posterUrl: getGeneratedPath(topicId, subId, 'thumb'),
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
      const email = `student${users.length + 1}@university.edu`;
      // Use a stable temporary ID to prevent focus loss when email changes
      const tempId = `pending_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const newUser: User = {
          id: tempId, 
          email: email,
          name: "New Student",
          avatar: `https://ui-avatars.com/api/?name=Student&background=random`,
          role: 'student',
          status: 'pending',
          allowedTopics: topics.map(t => t.id),
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

  const handleUpdateUser = (oldId: string, updated: User) => {
      setUsers(prev => prev.map(u => {
          if (u.id === oldId) {
              return updated;
          }
          return u;
      }));
      if (editingUserId === oldId) {
          setEditingUserId(updated.id);
      }
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
      handleUpdateUser(user.id, { ...user, allowedTopics: newAllowed });
  };


  // --- APPLY ALL ---
  const handleApply = async () => {
      setIsSaving(true);
      try {
          // Helper to remove undefined values recursively
          const cleanObject = (obj: any): any => {
              if (Array.isArray(obj)) {
                  return obj.map(cleanObject);
              } else if (obj !== null && typeof obj === 'object') {
                  return Object.entries(obj).reduce((acc, [key, value]) => {
                      if (value !== undefined) {
                          acc[key] = cleanObject(value);
                      }
                      return acc;
                  }, {} as any);
              }
              return obj;
          };

          // Reconstitute topics with teacher objects
          const finalTopics = topics.map((t, index) => {
              const { _key, teacherKey, variableName, subListVariableName, ...rest } = t;
              const assignedTeacher = teachers.find(tch => tch.id === teacherKey) || teachers[0];
              
              const topicData = {
                  ...rest,
                  teacher: assignedTeacher,
                  order: index,
                  subTopics: t.subTopics.map(s => {
                      const { _key: sk, _subId, hasResources, ...sRest } = s;
                      // Ensure resources is not undefined
                      if (hasResources === false) {
                          sRest.resources = null;
                      }
                      return sRest;
                  })
              };

              return cleanObject(topicData) as Topic;
          });

          // Ensure pending users have their email as their ID for Firestore
          const finalUsers = users.map(u => {
              if (u.status === 'pending') {
                  return { ...u, id: u.email };
              }
              return u;
          });

          await onApplyChanges(finalTopics, teachers, finalUsers, landingConfig);
          setConfirmationOpen(false);
          alert("Changes applied successfully!");
      } catch (error) {
          console.error("Failed to apply changes:", error);
          alert("Failed to apply changes. Please try again.");
      } finally {
          setIsSaving(false);
      }
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
                  <button 
                    onClick={() => setActiveTab('USER_INTERFACE')}
                    className={`px-3 py-1.5 rounded text-xs font-bold transition-colors ${activeTab === 'USER_INTERFACE' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}
                  >
                      User Interface
                  </button>
              </div>
          </div>
          <div className="flex items-center gap-3">
              <button 
                onClick={() => setConfirmationOpen(true)} 
                disabled={isSaving}
                className="bg-green-600 hover:bg-green-500 disabled:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-green-900/20"
              >
                  {isSaving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
                  {isSaving ? 'Saving...' : 'Apply Changes'}
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
                      <button onClick={() => setConfirmationOpen(false)} disabled={isSaving} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg disabled:opacity-50">Cancel</button>
                      <button onClick={handleApply} disabled={isSaving} className="px-6 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-500 disabled:bg-slate-700 flex items-center gap-2">
                          {isSaving && <RefreshCw size={16} className="animate-spin" />}
                          {isSaving ? 'Applying...' : 'Yes, Apply'}
                      </button>
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
                            <DndContext 
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                onDragEnd={handleDragEnd}
                            >
                                <SortableContext 
                                    items={topics.map(t => t.id)}
                                    strategy={verticalListSortingStrategy}
                                >
                                    {topics.map(topic => (
                                        <SortableTopicItem 
                                            key={topic.id}
                                            topic={topic}
                                            isSelected={selectedTopicId === topic.id}
                                            onSelect={() => setSelectedTopicId(topic.id)}
                                            onDelete={() => handleDeleteTopic(topic.id)}
                                        />
                                    ))}
                                </SortableContext>
                            </DndContext>
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
                                        <input 
                                            className="w-full p-2 border rounded text-base font-bold text-slate-800 bg-white" 
                                            value={selectedTopic.title} 
                                            onChange={e => {
                                                const newTitle = e.target.value;
                                                const updates: any = { title: newTitle };
                                                if (!selectedTopic['_isManualId']) {
                                                    const slug = generateSlug(newTitle);
                                                    const otherIds = topics.filter(t => t.id !== selectedTopic.id).map(t => t.id);
                                                    updates.id = getUniqueId(slug || 'topic', otherIds);
                                                }
                                                handleUpdateTopic(selectedTopicId, {...selectedTopic, ...updates});
                                            }} 
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <div className="flex items-center justify-between mb-1">
                                            <label className="block text-xs font-medium text-slate-500">Topic ID</label>
                                            <label className="flex items-center gap-1.5 text-[10px] text-slate-400 cursor-pointer select-none">
                                                <input 
                                                    type="checkbox" 
                                                    checked={!!selectedTopic['_isManualId']} 
                                                    onChange={e => handleUpdateTopic(selectedTopicId, {...selectedTopic, _isManualId: e.target.checked})}
                                                    className="w-3 h-3 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                                />
                                                Manual Edit
                                            </label>
                                        </div>
                                        <input 
                                            type="text" 
                                            value={selectedTopic.id} 
                                            disabled={!selectedTopic['_isManualId']}
                                            onChange={e => {
                                                const newId = generateSlug(e.target.value);
                                                handleUpdateTopic(selectedTopicId, {...selectedTopic, id: newId});
                                            }}
                                            className={`w-full p-2 text-xs font-mono border rounded outline-none transition-colors ${selectedTopic['_isManualId'] ? 'bg-white border-blue-200 text-blue-700' : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'}`} 
                                        />
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
                                            {[1,2,3,4,5,6,7,8,9,10].map(l => <option key={l} value={l}>Level {l}</option>)}
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

          {/* USER INTERFACE TAB */}
          {activeTab === 'USER_INTERFACE' && (
              <div className="h-full overflow-y-auto p-8 bg-slate-50">
                  <div className="max-w-3xl mx-auto space-y-8">
                      <div>
                          <h2 className="text-2xl font-bold text-slate-900">User Interface Configuration</h2>
                          <p className="text-slate-500 text-sm">Manage the visual identity and content of your platform.</p>
                      </div>

                      {/* SECTION 1: LANDING PAGE */}
                      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                          <div className="bg-slate-50 px-6 py-3 border-b border-slate-200">
                              <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">1. Landing Page (Login)</h3>
                          </div>
                          <div className="p-6 space-y-6">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  <div className="space-y-2">
                                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Main Title</label>
                                      <input 
                                          type="text" 
                                          value={landingConfig.title} 
                                          onChange={e => setLandingConfig({...landingConfig, title: e.target.value})}
                                          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                          placeholder="e.g. Digital Built Environment"
                                      />
                                  </div>
                                  <div className="space-y-2">
                                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Subtitle</label>
                                      <input 
                                          type="text" 
                                          value={landingConfig.subtitle} 
                                          onChange={e => setLandingConfig({...landingConfig, subtitle: e.target.value})}
                                          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                          placeholder="e.g. Recurrent Program"
                                      />
                                  </div>
                              </div>

                              <div className="space-y-2">
                                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tag / Badge Text</label>
                                  <input 
                                      type="text" 
                                      value={landingConfig.tag} 
                                      onChange={e => setLandingConfig({...landingConfig, tag: e.target.value})}
                                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                      placeholder="e.g. Semester 2025"
                                  />
                              </div>

                              <div className="space-y-2">
                                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Hero Image URL</label>
                                  <div className="flex gap-4">
                                      <div className="flex-1">
                                          <input 
                                              type="text" 
                                              value={landingConfig.heroImage} 
                                              onChange={e => setLandingConfig({...landingConfig, heroImage: e.target.value})}
                                              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                              placeholder="https://images.unsplash.com/..."
                                          />
                                      </div>
                                      <div className="w-24 h-12 rounded-lg border border-slate-200 overflow-hidden bg-slate-100 shrink-0">
                                          <img src={landingConfig.heroImage} alt="Preview" className="w-full h-full object-cover" />
                                      </div>
                                  </div>
                              </div>

                              <div className="space-y-2">
                                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Inspirational Quote</label>
                                  <textarea 
                                      value={landingConfig.quote} 
                                      onChange={e => setLandingConfig({...landingConfig, quote: e.target.value})}
                                      rows={2}
                                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
                                      placeholder="Enter a quote..."
                                  />
                              </div>
                          </div>
                      </div>

                      {/* SECTION 2: WELCOME OVERLAY */}
                      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                          <div className="bg-slate-50 px-6 py-3 border-b border-slate-200">
                              <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">2. Welcome Overlay</h3>
                          </div>
                          <div className="p-6 space-y-6">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  <div className="space-y-2">
                                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Overlay Title</label>
                                      <input 
                                          type="text" 
                                          value={landingConfig.welcomeTitle || ''} 
                                          onChange={e => setLandingConfig({...landingConfig, welcomeTitle: e.target.value})}
                                          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                          placeholder="e.g. Welcome to the Program"
                                      />
                                  </div>
                                  <div className="space-y-2">
                                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Overlay Subtitle</label>
                                      <input 
                                          type="text" 
                                          value={landingConfig.welcomeSubtitle || ''} 
                                          onChange={e => setLandingConfig({...landingConfig, welcomeSubtitle: e.target.value})}
                                          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                          placeholder="e.g. Let's start your journey"
                                      />
                                  </div>
                              </div>

                              <div className="space-y-2">
                                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Description</label>
                                  <textarea 
                                      value={landingConfig.welcomeDescription || landingConfig.description} 
                                      onChange={e => setLandingConfig({...landingConfig, welcomeDescription: e.target.value})}
                                      rows={4}
                                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
                                      placeholder="Describe the program..."
                                  />
                              </div>

                              <div className="space-y-2">
                                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Button Text</label>
                                  <input 
                                      type="text" 
                                      value={landingConfig.welcomeButtonText || ''} 
                                      onChange={e => setLandingConfig({...landingConfig, welcomeButtonText: e.target.value})}
                                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                      placeholder="e.g. Enter Curriculum Map"
                                  />
                              </div>
                          </div>
                      </div>

                      {/* SECTION 3: KNOWLEDGE GRAPH INTERFACE */}
                      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                          <div className="bg-slate-50 px-6 py-3 border-b border-slate-200">
                              <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">3. Knowledge Graph Interface</h3>
                          </div>
                          <div className="p-6 space-y-6">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  <div className="space-y-2">
                                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Graph Title</label>
                                      <input 
                                          type="text" 
                                          value={landingConfig.graphTitle || ''} 
                                          onChange={e => setLandingConfig({...landingConfig, graphTitle: e.target.value})}
                                          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                          placeholder="e.g. CURRICULUM_MAP_V2.3"
                                      />
                                  </div>
                                  <div className="space-y-2">
                                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Graph Subtitle</label>
                                      <input 
                                          type="text" 
                                          value={landingConfig.graphSubtitle || ''} 
                                          onChange={e => setLandingConfig({...landingConfig, graphSubtitle: e.target.value})}
                                          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                          placeholder="e.g. INTERACTIVE_LEARNING_PATH"
                                      />
                                  </div>
                              </div>

                              <div className="space-y-2">
                                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">App Logo URL (Top Left)</label>
                                  <div className="flex gap-4">
                                      <div className="flex-1">
                                          <input 
                                              type="text" 
                                              value={landingConfig.appLogoUrl || ''} 
                                              onChange={e => setLandingConfig({...landingConfig, appLogoUrl: e.target.value})}
                                              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                              placeholder="https://..."
                                          />
                                      </div>
                                      {landingConfig.appLogoUrl && (
                                          <div className="w-12 h-12 rounded-lg border border-slate-200 overflow-hidden bg-slate-900 shrink-0 p-1">
                                              <img src={landingConfig.appLogoUrl} alt="Logo Preview" className="w-full h-full object-contain" />
                                          </div>
                                      )}
                                  </div>
                              </div>
                          </div>
                      </div>

                      <div className="p-6 bg-blue-50 border border-blue-100 rounded-2xl">
                          <div className="flex gap-4">
                              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                                  <Sparkles className="text-blue-600 w-5 h-5" />
                              </div>
                              <div>
                                  <h4 className="text-sm font-bold text-blue-900 mb-1">Live Preview</h4>
                                  <p className="text-xs text-blue-700 leading-relaxed">
                                      Changes made here will be reflected across the entire platform's user interface.
                                  </p>
                              </div>
                          </div>
                      </div>
                  </div>
              </div>
          )}

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
                                                          <input className="w-full p-2 border rounded text-sm bg-white" value={user.name} onChange={e => handleUpdateUser(user.id, {...user, name: e.target.value})} />
                                                      </div>
                                                      <div>
                                                          <label className="text-xs font-medium text-slate-500">Role</label>
                                                          <select className="w-full p-2 border rounded text-sm bg-white" value={user.role} onChange={e => handleUpdateUser(user.id, {...user, role: e.target.value as any})}>
                                                              <option value="student">Student</option>
                                                              <option value="admin">Admin</option>
                                                          </select>
                                                      </div>
                                                      <div>
                                                          <label className="text-xs font-medium text-slate-500">Email (Login)</label>
                                                          <input className="w-full p-2 border rounded text-sm bg-white" value={user.email} onChange={e => handleUpdateUser(user.id, {...user, email: e.target.value})} />
                                                      </div>
                                                      <div className="flex items-end">
                                                          <div className="text-[10px] text-slate-400 italic bg-slate-50 p-2 rounded border border-slate-100 w-full">
                                                              {user.status === 'pending' ? 'User has not activated their account yet.' : 'User is active and linked to Firebase Auth.'}
                                                          </div>
                                                      </div>
                                                  </div>
                                                  
                                                  <div className="mt-8 pt-4 border-t border-slate-100">
                                                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Learning Progress</h4>
                                                      <div className="grid grid-cols-3 gap-4 text-center mb-6">
                                                          <div className="bg-slate-50 p-3 rounded border border-slate-100">
                                                              <div className="text-xl font-bold text-blue-600">{(user.completedSubTopics || []).length}</div>
                                                              <div className="text-[10px] text-slate-500 uppercase">Completed</div>
                                                          </div>
                                                          <div className="bg-slate-50 p-3 rounded border border-slate-100">
                                                              <div className="text-xl font-bold text-green-600">{(user.quizAttempts || []).length}</div>
                                                              <div className="text-[10px] text-slate-500 uppercase">Quizzes Taken</div>
                                                          </div>
                                                          <div className="bg-slate-50 p-3 rounded border border-slate-100">
                                                              <div className="text-xl font-bold text-slate-700">
                                                                  {Math.round(((user.completedSubTopics || []).length / (topics.reduce((acc, t) => acc + t.subTopics.length, 0) || 1)) * 100)}%
                                                              </div>
                                                              <div className="text-[10px] text-slate-500 uppercase">Progress</div>
                                                          </div>
                                                      </div>

                                                      <div className="space-y-6">
                                                          {/* Module Completion History */}
                                                          <div>
                                                              <h5 className="text-[10px] font-bold text-slate-400 uppercase mb-2 flex items-center gap-1">
                                                                  <Clock size={12} /> Module Completion History
                                                              </h5>
                                                              <div className="bg-slate-50 rounded-lg border border-slate-100 p-3 max-h-48 overflow-y-auto space-y-2">
                                                                  {(user.completedSubTopics || []).length > 0 ? (
                                                                      [...(user.completedSubTopics || [])].sort((a,b) => (b.completedAt || '').localeCompare(a.completedAt || '')).map(record => {
                                                                          const subTopic = topics.flatMap(t => t.subTopics).find(st => st.id === record.id);
                                                                          return (
                                                                              <div key={record.id} className="flex justify-between items-center text-[11px] border-b border-slate-200 pb-1 last:border-0 last:pb-0">
                                                                                  <span className="text-slate-700 font-medium truncate max-w-[150px]">{subTopic?.title || 'Unknown Module'}</span>
                                                                                  <span className="text-slate-400">{record.completedAt ? new Date(record.completedAt).toLocaleString() : 'N/A'}</span>
                                                                              </div>
                                                                          );
                                                                      })
                                                                  ) : (
                                                                      <div className="text-center py-4 text-slate-400 text-[10px] italic">No modules completed yet</div>
                                                                  )}
                                                              </div>
                                                          </div>

                                                          {/* Quiz Performance Details */}
                                                          <div>
                                                              <h5 className="text-[10px] font-bold text-slate-400 uppercase mb-2 flex items-center gap-1">
                                                                  <History size={12} /> Quiz Performance Details
                                                              </h5>
                                                              <div className="bg-slate-50 rounded-lg border border-slate-100 p-3 max-h-64 overflow-y-auto space-y-3">
                                                                  {(user.quizAttempts || []).length > 0 ? (
                                                                      [...(user.quizAttempts || [])].sort((a,b) => (b.timestamp || '').localeCompare(a.timestamp || '')).map((attempt, idx) => {
                                                                          const subTopic = topics.flatMap(t => t.subTopics).find(st => st.id === attempt.subTopicId);
                                                                          return (
                                                                              <div key={idx} className="bg-white p-2 rounded border border-slate-200 shadow-sm">
                                                                                  <div className="flex justify-between items-start mb-1">
                                                                                      <div className="text-[11px] font-bold text-slate-800 truncate max-w-[140px]">{subTopic?.title || 'Unknown Quiz'}</div>
                                                                                      <div className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${attempt.passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                                                          {attempt.passed ? 'PASSED' : 'FAILED'}
                                                                                      </div>
                                                                                  </div>
                                                                                  <div className="flex justify-between text-[10px] text-slate-500 mb-2">
                                                                                      <span>Score: {attempt.score}/{attempt.total}</span>
                                                                                      <span>Time: {attempt.timeTaken}s</span>
                                                                                      <span>{attempt.timestamp}</span>
                                                                                  </div>
                                                                                  {attempt.wrongAnswers && attempt.wrongAnswers.length > 0 && (
                                                                                      <div className="mt-1 pt-1 border-t border-slate-100">
                                                                                          <div className="text-[9px] font-bold text-red-500 uppercase mb-1">Wrong Answers:</div>
                                                                                          <ul className="list-disc list-inside text-[9px] text-slate-600 space-y-0.5">
                                                                                              {attempt.wrongAnswers.map((q, i) => (
                                                                                                  <li key={i} className="truncate">{q}</li>
                                                                                              ))}
                                                                                          </ul>
                                                                                      </div>
                                                                                  )}
                                                                              </div>
                                                                          );
                                                                      })
                                                                  ) : (
                                                                      <div className="text-center py-4 text-slate-400 text-[10px] italic">No quiz attempts recorded</div>
                                                                  )}
                                                              </div>
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
                                                  <div className="text-sm font-bold text-slate-700">
                                                      {Math.round(((user.completedSubTopics || []).length / (topics.reduce((acc, t) => acc + t.subTopics.length, 0) || 1)) * 100)}%
                                                  </div>
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
