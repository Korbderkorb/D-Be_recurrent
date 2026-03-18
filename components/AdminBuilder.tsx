
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
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
import { Download, Plus, Trash2, Edit2, GripVertical, ChevronRight, Video, Upload, HelpCircle, UploadCloud, RefreshCw, Copy, AlertCircle, Info, Settings, Save, CheckSquare, Square, X, Users, GraduationCap, Layers, UserPlus, Key, Eye, Shield, BarChart3, Search, Lock as LockIcon, Sparkles, CheckCircle2, Clock, History, XCircle, ChevronDown, ChevronUp, FileText, Printer, FileCode } from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  Radar,
  LineChart,
  Line,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
  ZAxis,
  Cell,
  Label,
  LabelList
} from 'recharts';
import { Topic, SubTopic, Teacher, SubTopicType, QuizQuestion, User, LandingConfig, QuizAttempt, Tag } from '../types';
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
                <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
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
                {copied && <span className="text-xs text-green-400 font-medium animate-pulse">Copied!</span>}
            </div>
            <div 
                onClick={handleCopy}
                className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded p-2 cursor-pointer transition-colors group"
                title="Click to copy path"
            >
                <code className="text-xs font-mono text-slate-300 break-all flex-1">{path}</code>
                <Copy size={12} className="text-slate-600 group-hover:text-blue-400" />
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
    <div className={`bg-slate-900 border rounded-lg transition-all ${expanded ? 'shadow-md border-blue-500/50 ring-1 ring-blue-500/20' : 'border-slate-800 hover:border-slate-700'}`}>
        <div 
            className="flex items-center p-4 cursor-pointer"
            onClick={() => setExpanded(!expanded)}
        >
            <div className="mr-3 text-slate-600 cursor-grab active:cursor-grabbing"><GripVertical size={16} /></div>
            <div className="mr-3 p-2 bg-slate-800 rounded-md border border-slate-700">{
                module.type === 'VIDEO' ? <Video size={18} className="text-blue-400" /> :
                module.type === 'EXERCISE_UPLOAD' ? <Upload size={18} className="text-purple-400" /> :
                <HelpCircle size={18} className="text-orange-400" />
            }</div>
            <div className="flex-1">
                <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-200 text-sm">{module.title || 'Untitled Module'}</span>
                    <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${subIdConflict ? 'bg-red-900/30 text-red-400' : 'bg-slate-800 text-slate-500'}`}>
                        {module._subId || 'no-id'}
                    </span>
                    {subIdConflict && <AlertCircle size={14} className="text-red-500" />}
                </div>
                <div className="text-xs text-slate-500 mt-0.5 truncate">{module.description || 'No description'}</div>
            </div>
            <div className="text-xs font-mono text-slate-500 mr-4">{module.duration}</div>
            <div className={`transform transition-transform text-slate-500 ${expanded ? 'rotate-90' : ''}`}><ChevronRight size={18} /></div>
        </div>

        {expanded && (
            <div className="p-4 border-t border-slate-800 bg-slate-900/50">
                <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-12 md:col-span-8">
                        <label className="block text-xs font-medium text-slate-500 mb-1">Title</label>
                        <input type="text" value={module.title} onChange={e => handleTitleChange(e.target.value)} className="w-full p-2 text-sm border border-slate-700 rounded focus:border-blue-500 outline-none bg-slate-800 text-white font-medium" />
                    </div>
                    <div className="col-span-12 md:col-span-4">
                        <label className="block text-xs font-medium text-slate-500 mb-1">Type</label>
                        <select value={module.type} onChange={e => onUpdate({...module, type: e.target.value as SubTopicType})} className="w-full p-2 text-sm border border-slate-700 rounded focus:border-blue-500 outline-none bg-slate-800 text-white">
                            {MODULE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>

                    <div className="col-span-12">
                        <div className="flex items-center justify-between mb-1">
                            <label className="block text-xs font-medium text-slate-500">Module ID</label>
                            <label className="flex items-center gap-1.5 text-[10px] text-slate-500 cursor-pointer select-none">
                                <input 
                                    type="checkbox" 
                                    checked={!!module._isManualId} 
                                    onChange={e => onUpdate({ ...module, _isManualId: e.target.checked })}
                                    className="w-3 h-3 rounded border-slate-600 bg-slate-700 text-blue-600 focus:ring-blue-500"
                                />
                                Manual Edit
                            </label>
                        </div>
                        <input 
                            type="text" 
                            value={module._subId || ''} 
                            onChange={e => handleIdChange(e.target.value)}
                            disabled={!module._isManualId}
                            className={`w-full p-2 text-xs font-mono border rounded outline-none transition-colors ${module._isManualId ? 'bg-slate-800 border-blue-500/50 text-blue-400' : 'bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed'}`} 
                        />
                        {subIdConflict && <p className="text-[10px] text-red-500 mt-1 flex items-center gap-1"><AlertCircle size={10} /> This ID is already used by another module in this topic.</p>}
                    </div>
                    <div className="col-span-8">
                         <label className="block text-xs font-medium text-slate-500 mb-1">Description</label>
                         <input type="text" value={module.description} onChange={e => onUpdate({...module, description: e.target.value})} className="w-full p-2 text-sm border border-slate-700 rounded focus:border-blue-500 outline-none bg-slate-800 text-white" />
                    </div>
                     <div className="col-span-4">
                        <label className="block text-xs font-medium text-slate-500 mb-1">Duration</label>
                         <input type="text" value={module.duration} onChange={e => onUpdate({...module, duration: e.target.value})} placeholder="MM:SS" className="w-full p-2 text-sm border border-slate-700 rounded focus:border-blue-500 outline-none bg-slate-800 text-white" />
                    </div>
                    
                    {/* VIDEO SPECIFIC */}
                    {module.type === 'VIDEO' && (
                         <div className="col-span-12 space-y-3 pb-2 border-b border-slate-800 mb-2">
                             <div>
                                 <label className="block text-xs font-medium text-slate-500 mb-1">Embed Link (Vimeo/YouTube)</label>
                                 <input 
                                     type="text" 
                                     value={module.videoUrl || ''} 
                                     onChange={e => onUpdate({ ...module, videoUrl: e.target.value })} 
                                     placeholder="https://player.vimeo.com/video/..."
                                     className="w-full p-2 text-sm border border-slate-700 rounded focus:border-blue-500 outline-none bg-slate-800 font-mono text-slate-400" 
                                 />
                             </div>
                             
                             <div>
                                 <label className="block text-xs font-medium text-slate-500 mb-1">Poster Image URL (Thumbnail)</label>
                                 <input 
                                     type="text" 
                                     value={module.posterUrl || ''} 
                                     onChange={e => onUpdate({ ...module, posterUrl: e.target.value })} 
                                     placeholder={getGeneratedPath(topicId, module._subId, 'thumb')}
                                     className="w-full p-2 text-sm border border-slate-700 rounded focus:border-blue-500 outline-none bg-slate-800 font-mono text-slate-400" 
                                 />
                             </div>
                             
                             <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-300 select-none font-bold mt-2">
                                <input 
                                    type="checkbox" 
                                    checked={module.hasResources !== false} 
                                    onChange={e => onUpdate({...module, hasResources: e.target.checked})} 
                                    className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-blue-600 focus:ring-blue-500" 
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
                                            className="w-full p-2 text-sm border border-slate-700 rounded focus:border-blue-500 outline-none bg-slate-800 font-mono text-slate-400" 
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
                                            className="w-full p-2 text-sm border border-slate-700 rounded focus:border-blue-500 outline-none bg-slate-800 font-mono text-slate-400" 
                                         />
                                     </div>
                                 </div>
                             )}
                         </div>
                    )}

                    {/* UPLOAD EXERCISE SPECIFIC */}
                    {module.type === 'EXERCISE_UPLOAD' && (
                        <div className="col-span-12 bg-slate-800 p-3 rounded border border-slate-700">
                             <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Upload Requirements</label>
                             <div className="space-y-2 mb-3">
                                 {(module.uploadRequirements || []).map((req, idx) => (
                                     <div key={idx} className="flex items-center gap-2">
                                         <span className="text-sm font-medium text-slate-300 bg-slate-800 border border-slate-700 px-2 py-1 rounded flex-1">{req}</span>
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
                                    className="flex-1 p-1.5 text-sm border border-slate-700 rounded focus:ring-1 focus:ring-blue-400 outline-none bg-slate-800 text-white"
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
                        <div className="col-span-12 mt-2 pt-4 border-t border-slate-800">
                            <div className="flex justify-between items-center mb-2">
                                <label className="block text-xs font-bold text-slate-400 uppercase">Quiz Questions</label>
                                <button onClick={() => { const newQ: QuizQuestion = { id: `q${Date.now()}`, question: 'New Question?', options: ['Option 1', 'Option 2'], correctAnswers: [0], multiSelect: false }; onUpdate({...module, quizQuestions: [...(module.quizQuestions || []), newQ]}); }} className="text-xs text-blue-600 hover:text-blue-500 font-medium">+ Add Question</button>
                            </div>
                            <div className="space-y-4">
                                {module.quizQuestions?.map((q, qIdx) => (
                                    <div key={q.id} className="p-4 bg-slate-800 border border-slate-700 rounded shadow-sm">
                                        <div className="flex gap-2 mb-3">
                                            <span className="text-xs font-mono text-slate-400 pt-2">Q{qIdx+1}</span>
                                            <input className="flex-1 p-1.5 text-sm border-b border-slate-700 focus:border-blue-400 outline-none bg-slate-900 text-white font-medium" value={q.question} onChange={(e) => { const newQs = [...(module.quizQuestions || [])]; newQs[qIdx] = { ...q, question: e.target.value }; onUpdate({...module, quizQuestions: newQs}); }} placeholder="Enter question..." />
                                            <button onClick={() => { const newQs = (module.quizQuestions || []).filter((_, i) => i !== qIdx); onUpdate({...module, quizQuestions: newQs}); }} className="text-slate-400 hover:text-red-400"><Trash2 size={14}/></button>
                                        </div>
                                        
                                        <div className="mb-3 ml-6 flex gap-4">
                                            <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
                                                <input 
                                                    type="checkbox" 
                                                    checked={q.multiSelect} 
                                                    onChange={(e) => {
                                                        const newQs = [...(module.quizQuestions || [])];
                                                        const newCorrect = e.target.checked ? q.correctAnswers : [q.correctAnswers[0] || 0];
                                                        newQs[qIdx] = { ...q, multiSelect: e.target.checked, correctAnswers: newCorrect };
                                                        onUpdate({...module, quizQuestions: newQs});
                                                    }}
                                                    className="w-3.5 h-3.5 rounded border-slate-600 bg-slate-700 text-blue-600 focus:ring-blue-500" 
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
                                                                : (isCorrect ? <div className="w-4 h-4 rounded-full border-4 border-green-500" /> : <div className="w-4 h-4 rounded-full border border-slate-600" />)
                                                            }
                                                        </div>
                                                        <input 
                                                            className="flex-1 text-xs p-1.5 bg-slate-900 border border-slate-700 focus:border-blue-400 rounded outline-none transition-colors text-white" 
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
                     <button onClick={() => { if (window.confirm("Are you sure?")) onDelete(); }} className="px-3 py-1.5 text-xs text-red-600 hover:bg-red-900/20 rounded border border-transparent hover:border-red-900/30 transition-colors">Delete Module</button>
                </div>
                {showAdvancedSettings && (
                        <div className="mt-4 bg-slate-800 p-3 rounded border border-slate-700">
                            <label className="block text-xs font-medium text-slate-500 mb-1">Sub-ID (Manual Override)</label>
                             <div className="flex gap-2">
                                <input type="text" value={module._subId || ''} onChange={e => { const val = generateSlug(e.target.value); const rootId = module.id.split('-').slice(0, -1).join('-'); onUpdate({...module, _subId: val, id: rootId ? `${rootId}-${val}` : module.id}); }} className={`flex-1 p-2 text-sm border rounded focus:ring-2 outline-none font-mono text-slate-300 bg-slate-900 ${subIdConflict ? 'border-red-300 ring-red-200' : 'border-slate-700 focus:ring-blue-400'}`} />
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
            className={`flex items-center group transition-colors hover:bg-slate-800 hover:shadow-sm ${isSelected ? 'bg-slate-800 border-r-4 border-blue-500 shadow-sm' : 'border-r-4 border-transparent'} ${isDragging ? 'opacity-50 shadow-lg' : ''}`}
        >
            <div 
                {...attributes} 
                {...listeners} 
                className="pl-3 text-slate-600 cursor-grab active:cursor-grabbing hover:text-slate-400 flex items-center gap-1"
            >
                <GripVertical size={14} />
                {topic.level > 1 && (
                    <div className="flex items-center">
                        {[...Array(topic.level - 1)].map((_, i) => (
                            <div key={i} className="w-2 h-px bg-slate-700" />
                        ))}
                    </div>
                )}
            </div>
            <div onClick={onSelect} className={`flex-1 min-w-0 py-3 pl-2 pr-2 cursor-pointer ${isSelected ? 'text-blue-400 font-semibold' : 'text-slate-300 group-hover:text-white'}`}>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono bg-slate-800 text-slate-500 px-1 rounded">L{topic.level}</span>
                    <div className="truncate text-sm">{topic.title}</div>
                </div>
            </div>
            <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-2 mr-2 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
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
  initialTags: Tag[];
  initialLandingConfig: LandingConfig;
  onApplyChanges: (newTopics: Topic[], newTeachers: Teacher[], newUsers: User[], newLandingConfig: LandingConfig, newTags: Tag[]) => Promise<void>;
  onExit: () => void;
}

// --- User Performance View Component ---
function AnalyticsView({ users, topics, tags, landingConfig }: { users: User[], topics: Topic[], tags: Tag[], landingConfig: LandingConfig }) {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [exportFormat, setExportFormat] = useState<'text' | 'csv' | 'print'>('print');
  const [isPrinting, setIsPrinting] = useState(false);
  const [selectedUserForPrint, setSelectedUserForPrint] = useState<User | null>(null);
  const [selectedQuizForDetails, setSelectedQuizForDetails] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const handleDownloadPDF = async () => {
    if (!printRef.current) return;
    
    // Show loading state if needed
    const btn = document.getElementById('download-btn');
    const originalText = btn?.innerText || 'Export as PDF';
    if (btn) {
      btn.innerText = 'Generating PDF...';
      btn.style.opacity = '0.7';
    }

    try {
      // Ensure we capture the full height of the container
      const element = printRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: element.offsetWidth,
        height: element.scrollHeight,
        windowWidth: element.offsetWidth,
        windowHeight: element.scrollHeight,
        x: 0,
        y: 0,
        scrollX: 0,
        scrollY: 0
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const imgProps = pdf.getImageProperties(imgData);
      const imgWidth = pdfWidth;
      const imgHeight = (imgProps.height * imgWidth) / imgProps.width;
      
      let position = 0;
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      
      let remainingHeight = imgHeight - pdfHeight;
      while (remainingHeight > 0) {
        position -= pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        remainingHeight -= pdfHeight;
      }
      
      pdf.save(`Evaluation_Report_${selectedUserForPrint ? selectedUserForPrint.name : 'Group'}_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('PDF Generation Error:', error);
      // Fallback
      window.print();
    } finally {
      if (btn) {
        btn.innerText = originalText;
        btn.style.opacity = '1';
      }
    }
  };

  const downloadDataAsCSV = (data: any[], filename: string) => {
    if (!data || data.length === 0) return;
    
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => {
        const val = row[header];
        return typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : val;
      }).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${new Date().getTime()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadChartAsSVG = (elementId: string, filename: string) => {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    const svgElement = element.querySelector('svg');
    if (!svgElement) return;

    // Clone the SVG to modify it for export
    const clonedSvg = svgElement.cloneNode(true) as SVGElement;
    
    // Get dimensions from the original SVG
    const bbox = svgElement.getBoundingClientRect();
    const width = bbox.width || 700;
    const height = bbox.height || 300;
    
    // Use the original viewBox if it exists, otherwise use dimensions
    const originalViewBox = svgElement.getAttribute('viewBox');
    let [vx, vy, vw, vh] = originalViewBox 
      ? originalViewBox.split(' ').map(Number) 
      : [0, 0, width, height];

    const padding = 20;
    
    // Expand the viewBox to include padding
    const newViewBox = `${vx - padding} ${vy - padding} ${vw + padding * 2} ${vh + padding * 2}`;
    clonedSvg.setAttribute('viewBox', newViewBox);
    
    // Set explicit width/height for the exported file to maintain aspect ratio
    clonedSvg.setAttribute('width', (vw + padding * 2).toString());
    clonedSvg.setAttribute('height', (vh + padding * 2).toString());
    
    // Add a white background rect
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', (vx - padding).toString());
    rect.setAttribute('y', (vy - padding).toString());
    rect.setAttribute('width', (vw + padding * 2).toString());
    rect.setAttribute('height', (vh + padding * 2).toString());
    rect.setAttribute('fill', '#ffffff');
    clonedSvg.insertBefore(rect, clonedSvg.firstChild);

    // Inline styles for all elements
    const inlineStyles = (source: Element, target: Element) => {
      const computedStyle = window.getComputedStyle(source);
      const stylesToCopy = ['fill', 'stroke', 'stroke-width', 'font-size', 'font-family', 'font-weight', 'opacity', 'visibility', 'display'];
      
      stylesToCopy.forEach(prop => {
        const val = computedStyle.getPropertyValue(prop);
        if (val) target.setAttribute(prop, val);
      });

      // Special handling for text
      if (source.tagName.toLowerCase() === 'text') {
        target.setAttribute('fill', computedStyle.getPropertyValue('fill') || '#000000');
      }

      for (let i = 0; i < source.children.length; i++) {
        if (target.children[i]) {
          inlineStyles(source.children[i], target.children[i]);
        }
      }
    };
    
    inlineStyles(svgElement, clonedSvg);

    const serializer = new XMLSerializer();
    let source = serializer.serializeToString(clonedSvg);
    
    if (!source.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)) {
      source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
    }
    if (!source.match(/^<svg[^>]+xmlns\:xlink="http\:\/\/www\.w3\.org\/1999\/xlink"/)) {
      source = source.replace(/^<svg/, '<svg xmlns:xlink="http://www.w3.org/1999/xlink"');
    }

    const url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(source);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}_${new Date().getTime()}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadTableAsSVG = async (elementId: string, filename: string) => {
    const element = document.getElementById(elementId);
    if (!element) return;

    try {
      const canvas = await html2canvas(element, {
        backgroundColor: '#ffffff',
        scale: 2, // Higher quality
        logging: false,
        useCORS: true
      });

      const imgData = canvas.toDataURL('image/png');
      const width = canvas.width / 2;
      const height = canvas.height / 2;

      const svgSource = `
        <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
          <rect width="100%" height="100%" fill="#ffffff" />
          <image xlink:href="${imgData}" width="${width}" height="${height}" />
        </svg>
      `.trim();

      const url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgSource);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${filename}_${new Date().getTime()}.svg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error generating table SVG:', error);
    }
  };

  const [graphType, setGraphType] = useState<'bar' | 'line' | 'area'>('bar');
  const [graphMetric, setGraphMetric] = useState<'progress' | 'avgScore' | 'both'>('both');
  const [timelineMetric, setTimelineMetric] = useState<'progress' | 'avgScore'>('progress');

  // Use defined tag colors
  const tagColors = useMemo(() => {
    const colors: Record<string, string> = {};
    tags.forEach(t => {
      colors[t.name] = t.color;
    });
    return colors;
  }, [tags]);

  const allTags = tags.map(t => t.name);
  
  const getTagColor = (userTags: string[]) => {
    if (!userTags || userTags.length === 0) return '#94a3b8';
    return tagColors[userTags[0]] || '#3b82f6';
  };

  const filteredUsers = users.filter(u => 
    u.role !== 'admin' && 
    (selectedTags.length === 0 || selectedTags.some(tag => (u.tags || []).includes(tag)))
  );

  const selectedUser = users.find(u => u.id === selectedUserId);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const getPerformanceData = (user: User) => {
    const totalSubTopics = topics.reduce((acc, t) => acc + t.subTopics.length, 0) || 1;
    const completed = (user.completedSubTopics || []).length;
    const quizAttempts = user.quizAttempts || [];
    
    const avgScore = quizAttempts.length > 0 
      ? Math.round(quizAttempts.reduce((acc, a) => acc + (a.score / a.total), 0) / quizAttempts.length * 100)
      : 0;

    // Consistency: Unique days active relative to a 7-day window
    const uniqueDays = new Set((user.completedSubTopics || []).map(c => c.completedAt?.split('T')[0])).size;
    const consistency = Math.min(100, (uniqueDays / 7) * 100);

    // Engagement: Quizzes taken relative to total available modules
    const engagement = Math.min(100, (quizAttempts.length / totalSubTopics) * 100);

    // Speed: Avg time taken relative to 120s baseline
    const avgTime = quizAttempts.length > 0 
      ? quizAttempts.reduce((acc, a) => acc + a.timeTaken, 0) / quizAttempts.length
      : 0;
    const speed = avgTime > 0 ? Math.max(0, 100 - (avgTime / 240) * 100) : 0;

    return {
      id: user.id,
      name: user.name,
      progress: Math.round((completed / totalSubTopics) * 100),
      avgScore,
      quizzes: quizAttempts.length,
      completed,
      consistency,
      engagement,
      speed,
      color: user.profileColor || getTagColor(user.tags || [])
    };
  };

  const groupPerformance = filteredUsers.map(u => getPerformanceData(u));
  
  const avgGroupProgress = groupPerformance.length > 0
    ? Math.round(groupPerformance.reduce((acc, p) => acc + p.progress, 0) / groupPerformance.length)
    : 0;

  const avgGroupScore = groupPerformance.length > 0
    ? Math.round(groupPerformance.reduce((acc, p) => acc + p.avgScore, 0) / groupPerformance.length)
    : 0;

  // Quiz Performance Overview calculation
  const quizPerformanceOverview = useMemo(() => {
    const quizStats: Record<string, { 
      title: string, 
      totalScore: number, 
      attempts: number, 
      timestamp: number,
      questionStats: Record<string, { correct: number, total: number, question: string, options: string[] }>
    }> = {};

    filteredUsers.forEach(u => {
      (u.quizAttempts || []).forEach(a => {
        const subTopic = topics.flatMap(t => t.subTopics).find(st => st.id === a.subTopicId);
        if (!subTopic || !subTopic.quizQuestions) return;

        if (!quizStats[a.subTopicId]) {
          quizStats[a.subTopicId] = {
            title: subTopic.title,
            totalScore: 0,
            attempts: 0,
            timestamp: new Date(a.timestamp).getTime(),
            questionStats: {}
          };
          subTopic.quizQuestions.forEach(q => {
            quizStats[a.subTopicId].questionStats[q.id] = { 
              correct: 0, 
              total: 0, 
              question: q.question,
              options: q.options
            };
          });
        }

        quizStats[a.subTopicId].totalScore += (a.score / a.total);
        quizStats[a.subTopicId].attempts += 1;
        
        subTopic.quizQuestions.forEach(q => {
          const stats = quizStats[a.subTopicId].questionStats[q.id];
          if (stats) {
            stats.total += 1;
            const isWrong = a.wrongAnswers?.some(wa => wa === q.id || wa === q.question);
            if (!isWrong) {
              stats.correct += 1;
            }
          }
        });
      });
    });

    return Object.entries(quizStats).map(([id, stats]) => ({
      id,
      name: stats.title,
      avgScore: Math.round((stats.totalScore / stats.attempts) * 100),
      attempts: stats.attempts,
      timestamp: stats.timestamp,
      questions: Object.entries(stats.questionStats).map(([qId, qStats], index) => ({
        id: qId,
        label: `Question ${index + 1}`,
        question: qStats.question,
        options: qStats.options,
        correctPercentage: Math.round((qStats.correct / qStats.total) * 100)
      }))
    })).sort((a, b) => a.timestamp - b.timestamp);
  }, [filteredUsers, topics]);

  // Timeline Data Processing
  const getTimelineData = (targetUsers: User[]) => {
    const totalSubTopics = topics.reduce((acc, t) => acc + t.subTopics.length, 0) || 1;
    
    return targetUsers.map(user => {
      const events: any[] = [];
      
      // Add module completions
      (user.completedSubTopics || []).forEach(c => {
        if (c.completedAt) {
          events.push({
            timestamp: new Date(c.completedAt).getTime(),
            type: 'module',
            dateStr: c.completedAt
          });
        }
      });

      // Add quiz attempts
      (user.quizAttempts || []).forEach(a => {
        if (a.timestamp) {
          events.push({
            timestamp: new Date(a.timestamp).getTime(),
            type: 'quiz',
            passed: a.passed,
            score: a.score,
            total: a.total,
            dateStr: a.timestamp
          });
        }
      });

      // Sort events by time
      events.sort((a, b) => a.timestamp - b.timestamp);

      let completedCount = 0;
      let totalScoreSum = 0;
      let quizCount = 0;

      const dataPoints = events.map(e => {
        if (e.type === 'module') completedCount++;
        if (e.type === 'quiz') {
          totalScoreSum += (e.score / e.total);
          quizCount++;
        }

        return {
          ...e,
          progress: Math.round((completedCount / totalSubTopics) * 100),
          avgScore: quizCount > 0 ? Math.round((totalScoreSum / quizCount) * 100) : 0,
          userName: user.name,
          color: user.profileColor || getTagColor(user.tags || [])
        };
      });

      return {
        userId: user.id,
        userName: user.name,
        color: user.profileColor || getTagColor(user.tags || []),
        dataPoints
      };
    });
  };

  const timelineData = getTimelineData(filteredUsers);

  const groupTimelineData = useMemo(() => {
    if (filteredUsers.length === 0) return [];
    
    // Aggregate all data points from all users
    const allPoints: any[] = [];
    timelineData.forEach(userTimeline => {
      allPoints.push(...userTimeline.dataPoints);
    });
    
    if (allPoints.length === 0) return [];
    
    // Sort by timestamp
    allPoints.sort((a, b) => a.timestamp - b.timestamp);
    
    // Create daily averages for the group
    const dailyData: Record<string, { sumProgress: number, sumScore: number, count: number, timestamp: number }> = {};
    
    allPoints.forEach(p => {
      const date = new Date(p.timestamp).toLocaleDateString();
      if (!dailyData[date]) {
        dailyData[date] = { sumProgress: 0, sumScore: 0, count: 0, timestamp: p.timestamp };
      }
      dailyData[date].sumProgress += p.progress;
      dailyData[date].sumScore += p.avgScore;
      dailyData[date].count += 1;
    });
    
    return Object.values(dailyData).map(d => ({
      timestamp: d.timestamp,
      progress: Math.round(d.sumProgress / d.count),
      avgScore: Math.round(d.sumScore / d.count)
    })).sort((a, b) => a.timestamp - b.timestamp);
  }, [timelineData, filteredUsers.length]);

  // Custom Tooltip for Timeline
  const CustomTimelineTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      // Find the specific point being hovered
      // Recharts usually passes all points at the same X. 
      // We want to show the one that is closest to the mouse or just the first one if it's a line
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900 text-white p-3 rounded-lg shadow-xl border border-slate-700 text-xs">
          <div className="font-bold mb-1 text-blue-400">{data.userName}</div>
          <div className="text-slate-400 mb-2">{new Date(data.timestamp).toLocaleString()}</div>
          <div className="space-y-1">
            <div className="flex justify-between gap-4">
              <span>Progress:</span>
              <span className="font-bold">{data.progress}%</span>
            </div>
            <div className="flex justify-between gap-4">
              <span>Avg Score:</span>
              <span className="font-bold">{data.avgScore}%</span>
            </div>
            {data.type === 'quiz' && (
              <div className={`font-bold mt-1 ${data.passed ? 'text-emerald-400' : 'text-red-400'}`}>
                Quiz: {data.score}/{data.total} ({data.passed ? 'PASSED' : 'FAILED'})
              </div>
            )}
            {data.type === 'module' && (
              <div className="text-white font-bold mt-1 italic">Module Completed</div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  // Empirical Insights Logic
  const getEmpiricalInsights = () => {
    if (filteredUsers.length === 0) return { ease: "No data available.", difficulty: "No data available." };

    const allAttempts = filteredUsers.flatMap(u => u.quizAttempts || []);
    if (allAttempts.length === 0) return { ease: "No quiz data yet.", difficulty: "No quiz data yet." };

    // Find modules with highest and lowest average scores
    const moduleStats: Record<string, { total: number, count: number }> = {};
    allAttempts.forEach(a => {
      if (!moduleStats[a.subTopicId]) moduleStats[a.subTopicId] = { total: 0, count: 0 };
      moduleStats[a.subTopicId].total += (a.score / a.total);
      moduleStats[a.subTopicId].count += 1;
    });

    const moduleAverages = Object.entries(moduleStats).map(([id, stats]) => ({
      id,
      avg: (stats.total / stats.count) * 100,
      count: stats.count
    })).sort((a, b) => b.avg - a.avg);

    const bestModule = moduleAverages[0];
    const worstModule = moduleAverages[moduleAverages.length - 1];

    const bestTitle = topics.flatMap(t => t.subTopics).find(st => st.id === bestModule.id)?.title || "Unknown Module";
    const worstTitle = topics.flatMap(t => t.subTopics).find(st => st.id === worstModule.id)?.title || "Unknown Module";

    return {
      ease: `Students excel in "${bestTitle}" with an empirical average score of ${Math.round(bestModule.avg)}% across ${bestModule.count} attempts.`,
      difficulty: `Students struggle with "${worstTitle}" showing a lower average score of ${Math.round(worstModule.avg)}% (${worstModule.count} attempts recorded).`
    };
  };

  const insights = getEmpiricalInsights();

  const handleExport = () => {
    if (exportFormat === 'print') {
      setIsPrinting(true);
      return;
    }
    
    let content = "";
    if (exportFormat === 'text') {
      content = `USER PERFORMANCE EVALUATION SHEET\n`;
      content += `Generated on: ${new Date().toLocaleString()}\n`;
      content += `Tags Filtered: ${selectedTags.length > 0 ? selectedTags.join(', ') : 'All Students'}\n`;
      content += `Group Avg Progress: ${avgGroupProgress}%\n`;
      content += `Group Avg Score: ${avgGroupScore}%\n`;
      content += `--------------------------------------------------\n\n`;
      
      filteredUsers.forEach(u => {
        const data = getPerformanceData(u);
        content += `STUDENT: ${u.name} (${u.email})\n`;
        content += `Tags: ${(u.tags || []).join(', ') || 'None'}\n`;
        content += `Overall Progress: ${data.progress}%\n`;
        content += `Average Quiz Score: ${data.avgScore}%\n`;
        content += `Consistency: ${Math.round(data.consistency)}%\n`;
        content += `Engagement: ${Math.round(data.engagement)}%\n`;
        content += `Speed: ${Math.round(data.speed)}%\n`;
        content += `Modules Completed: ${data.completed}\n`;
        content += `Quizzes Taken: ${data.quizzes}\n\n`;
        
        content += `MODULE COMPLETION HISTORY:\n`;
        if ((u.completedSubTopics || []).length > 0) {
          u.completedSubTopics?.forEach(record => {
            const subTopic = topics.flatMap(t => t.subTopics).find(st => st.id === record.id);
            content += `- [${record.completedAt ? new Date(record.completedAt).toLocaleString() : 'N/A'}] ${subTopic?.title || 'Unknown Module'}\n`;
          });
        } else {
          content += `(No modules completed yet)\n`;
        }
        content += `\n`;

        content += `QUIZ ACTIVITY LOG:\n`;
        if ((u.quizAttempts || []).length > 0) {
          u.quizAttempts?.forEach(a => {
            const subTopic = topics.flatMap(t => t.subTopics).find(st => st.id === a.subTopicId);
            content += `- [${a.timestamp}] ${subTopic?.title || 'Quiz'}: ${a.score}/${a.total} (${a.passed ? 'PASSED' : 'FAILED'})\n`;
            if (a.wrongAnswers && a.wrongAnswers.length > 0) {
              content += `  Incorrect Questions: ${a.wrongAnswers.join(', ')}\n`;
            }
          });
        } else {
          content += `(No quiz attempts recorded)\n`;
        }
        
        content += `--------------------------------------------------\n\n`;
      });
    } else {
      // CSV Export
      content = "Type,StudentName,StudentEmail,Tags,Progress,AvgScore,Consistency,Engagement,Speed,ModulesCompleted,QuizzesTaken,EventDate,EventTitle,EventResult,WrongAnswers\n";
      
      // Group Summary Row
      content += `SUMMARY,Group Average,N/A,"${selectedTags.join(';')}",${avgGroupProgress},${avgGroupScore},N/A,N/A,N/A,N/A,N/A,${new Date().toISOString()},N/A,N/A,N/A\n`;

      filteredUsers.forEach(u => {
        const data = getPerformanceData(u);
        // User Summary Row
        content += `USER,"${u.name}","${u.email}","${(u.tags || []).join(';')}",${data.progress},${data.avgScore},${data.consistency},${data.engagement},${data.speed},${data.completed},${data.quizzes},N/A,N/A,N/A,N/A\n`;
        
        // Module Completion Rows
        (u.completedSubTopics || []).forEach(record => {
          const subTopic = topics.flatMap(t => t.subTopics).find(st => st.id === record.id);
          content += `MODULE_COMPLETION,"${u.name}","${u.email}",N/A,N/A,N/A,N/A,N/A,N/A,N/A,N/A,"${record.completedAt || 'N/A'}","${(subTopic?.title || 'Unknown').replace(/"/g, '""')}",COMPLETED,N/A\n`;
        });

        // Quiz Attempt Rows
        (u.quizAttempts || []).forEach(a => {
          const subTopic = topics.flatMap(t => t.subTopics).find(st => st.id === a.subTopicId);
          const wrongAnswersStr = (a.wrongAnswers || []).join(';').replace(/"/g, '""');
          content += `QUIZ_ATTEMPT,"${u.name}","${u.email}",N/A,N/A,N/A,N/A,N/A,N/A,N/A,N/A,"${a.timestamp}","${(subTopic?.title || 'Quiz').replace(/"/g, '""')}","${a.score}/${a.total} (${a.passed ? 'PASSED' : 'FAILED'})","${wrongAnswersStr}"\n`;
        });
      });
    }

    const blob = new Blob([content], { type: exportFormat === 'text' ? 'text/plain' : 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `performance_export_${new Date().getTime()}.${exportFormat === 'text' ? 'txt' : 'csv'}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleIndividualExport = (user: User, format: 'text' | 'csv' | 'print') => {
    if (format === 'print') {
      setSelectedUserForPrint(user);
      setIsPrinting(true);
      return;
    }
    
    const data = getPerformanceData(user);
    let content = "";
    
    if (format === 'text') {
      content = `INDIVIDUAL EVALUATION SHEET: ${user.name}\n`;
      content += `Email: ${user.email}\n`;
      content += `Generated on: ${new Date().toLocaleString()}\n`;
      content += `--------------------------------------------------\n\n`;
      content += `METRICS:\n`;
      content += `- Progress: ${data.progress}% (Formula: Completed Modules / Total Modules)\n`;
      content += `- Accuracy: ${data.avgScore}% (Formula: Total Correct / Total Questions across all attempts)\n`;
      content += `- Consistency: ${Math.round(data.consistency)}% (Formula: Unique Active Days in last 7 days / 7)\n`;
      content += `- Engagement: ${Math.round(data.engagement)}% (Formula: Total Quiz Attempts / Total Modules)\n`;
      content += `- Speed: ${Math.round(data.speed)}% (Formula: 100 - (Avg Time per Quiz / 240s) * 100)\n\n`;
      
      content += `ACTIVITY LOG:\n`;
      (user.quizAttempts || []).forEach(a => {
        const subTopic = topics.flatMap(t => t.subTopics).find(st => st.id === a.subTopicId);
        content += `[${a.timestamp}] ${subTopic?.title || 'Quiz'}: ${a.score}/${a.total} (${a.passed ? 'PASSED' : 'FAILED'})\n`;
        if (a.wrongAnswers && a.wrongAnswers.length > 0) {
          content += `  Wrong Answers: ${a.wrongAnswers.join(', ')}\n`;
        }
      });
    } else {
      content = "Timestamp,Module,Score,Total,Passed,WrongAnswers\n";
      (user.quizAttempts || []).forEach(a => {
        const subTopic = topics.flatMap(t => t.subTopics).find(st => st.id === a.subTopicId);
        content += `"${a.timestamp}","${subTopic?.title || 'Quiz'}",${a.score},${a.total},${a.passed},"${(a.wrongAnswers || []).join(';')}"\n`;
      });
    }

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `evaluation_${user.name.replace(/\s+/g, '_')}_${new Date().getTime()}.${format === 'text' ? 'txt' : 'csv'}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const MetricInfo = ({ title, description }: { title: string, description: string }) => (
    <div className="group relative inline-block ml-1">
      <Info size={12} className="text-slate-400 cursor-help" />
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-800 text-white text-[10px] rounded shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
        <div className="font-bold mb-1">{title}</div>
        {description}
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20 print:p-0 print:m-0 print:bg-white">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          .bg-slate-50 { background-color: white !important; }
          .shadow-sm, .shadow-xl, .shadow-2xl { box-shadow: none !important; }
          .border { border: 1px solid #e2e8f0 !important; }
          body { color: black !important; }
          .print-break-inside-avoid { break-inside: avoid; }
        }
        .print-only { display: none; }
      `}</style>

      <div className="flex justify-between items-end no-print">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">User Performance Analytics</h2>
          <p className="text-slate-400 mt-1">Comprehensive overview of student progress and evaluation.</p>
          <p className="text-[10px] text-slate-500 mt-1 italic">
            * Group Average is based on the currently filtered set of students. If no tags are selected, it represents all accounts.
          </p>
        </div>
        <div className="flex gap-3">
          <select 
            className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm font-medium text-slate-300 shadow-sm outline-none focus:border-blue-500"
            value={exportFormat}
            onChange={(e) => setExportFormat(e.target.value as any)}
          >
            <option value="print">Print Full Report (Optimized)</option>
            <option value="text">Export as Text (.txt)</option>
            <option value="csv">Export as CSV (.csv)</option>
          </select>
          <button 
            onClick={handleExport}
            className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-xl shadow-blue-900/20 transition-all active:scale-95"
          >
            <Download size={18} /> {exportFormat === 'print' ? 'Generate Print View' : 'Export Evaluation'}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-sm no-print">
        <div className="flex items-center gap-3 mb-4">
          <Search size={18} className="text-slate-500" />
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Filter by Tags</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {allTags.length > 0 ? allTags.map(tag => (
            <button
              key={tag}
              onClick={() => toggleTag(tag)}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all border ${
                selectedTags.includes(tag) 
                ? 'shadow-md shadow-blue-900/20 text-white' 
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
              }`}
              style={{ 
                backgroundColor: selectedTags.includes(tag) ? (tagColors[tag] || '#3b82f6') : undefined,
                borderColor: selectedTags.includes(tag) ? (tagColors[tag] || '#3b82f6') : undefined
              }}
            >
              {tag}
            </button>
          )) : (
            <p className="text-xs text-slate-500 italic">No tags defined yet. Add tags in the User List tab.</p>
          )}
          {selectedTags.length > 0 && (
            <button 
              onClick={() => setSelectedTags([])}
              className="px-4 py-2 rounded-full text-xs font-bold text-red-400 hover:bg-red-900/20 transition-colors"
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className={`grid grid-cols-1 lg:grid-cols-3 gap-8 ${isPrinting ? 'no-print' : ''}`}>
        {/* Left: Group Overview */}
        <div className="lg:col-span-2 space-y-8">
          <div className="grid grid-cols-2 gap-6 print-break-inside-avoid">
            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-sm">
              <div className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">Avg. Group Progress</div>
              <div className="text-4xl font-bold text-white">{avgGroupProgress}%</div>
              <div className="mt-4 h-2 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${avgGroupProgress}%` }}></div>
              </div>
            </div>
            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-sm">
              <div className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">Avg. Quiz Score</div>
              <div className="text-4xl font-bold text-white">{avgGroupScore}%</div>
              <div className="mt-4 h-2 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${avgGroupScore}%` }}></div>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 p-8 rounded-2xl border border-slate-800 shadow-sm print-break-inside-avoid">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Performance Comparison</h3>
                  <div className="flex gap-1 no-print">
                    <button 
                      onClick={() => downloadDataAsCSV(groupPerformance, 'group_performance')}
                      className="p-1.5 text-slate-500 hover:text-blue-400 hover:bg-slate-800 rounded-lg transition-all"
                      title="Export Graph Data as CSV"
                    >
                      <Download size={14} />
                    </button>
                    <button 
                      onClick={() => downloadChartAsSVG('group-performance-chart', 'group_performance')}
                      className="p-1.5 text-slate-500 hover:text-blue-400 hover:bg-slate-800 rounded-lg transition-all"
                      title="Export Graph as SVG"
                    >
                      <FileCode size={14} />
                    </button>
                  </div>
              </div>
              <div className="flex gap-2 no-print">
                <select 
                  className="text-[10px] font-bold bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-300 outline-none focus:border-blue-500"
                  value={graphType}
                  onChange={(e) => setGraphType(e.target.value as any)}
                >
                  <option value="bar">Bar Chart</option>
                  <option value="line">Line Chart</option>
                  <option value="area">Area Chart</option>
                </select>
                <select 
                  className="text-[10px] font-bold bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-300 outline-none focus:border-blue-500"
                  value={graphMetric}
                  onChange={(e) => setGraphMetric(e.target.value as any)}
                >
                  <option value="progress">Progress %</option>
                  <option value="avgScore">Avg Score %</option>
                  <option value="both">Overlay Both %</option>
                </select>
              </div>
            </div>
            
            {groupPerformance.length > 0 ? (
              <div className="h-[350px]" id="group-performance-chart">
                <ResponsiveContainer width="100%" height="100%">
                  {graphType === 'bar' ? (
                    <BarChart data={groupPerformance}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', color: '#fff' }}
                        itemStyle={{ fontSize: '12px', color: '#fff' }}
                        labelStyle={{ color: '#fff' }}
                      />
                      {graphMetric !== 'both' && <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }} />}
                      {(graphMetric === 'progress' || graphMetric === 'both') && (
                        <Bar dataKey="progress" name="Progress %" radius={[4, 4, 0, 0]}>
                          {groupPerformance.map((entry, index) => (
                            <Cell 
                              key={`cell-p-${index}`} 
                              fill={entry.color} 
                              fillOpacity={selectedUserId ? (selectedUserId === entry.id ? 1 : 0.2) : (graphMetric === 'both' ? 0.9 : 1)} 
                            />
                          ))}
                          {graphMetric === 'both' && (
                            <LabelList 
                              dataKey="progress" 
                              content={(props: any) => {
                                const { x, y, width, height } = props;
                                if (height < 60) return null;
                                return (
                                  <text 
                                    x={x + width / 2} 
                                    y={y + height / 2} 
                                    fill="#fff" 
                                    textAnchor="middle" 
                                    dominantBaseline="middle" 
                                    transform={`rotate(-90, ${x + width / 2}, ${y + height / 2})`}
                                    fontSize={9}
                                    fontWeight="bold"
                                    style={{ pointerEvents: 'none' }}
                                  >
                                    Progress %
                                  </text>
                                );
                              }} 
                            />
                          )}
                        </Bar>
                      )}
                      {(graphMetric === 'avgScore' || graphMetric === 'both') && (
                        <Bar dataKey="avgScore" name="Avg Score %" radius={[4, 4, 0, 0]}>
                          {groupPerformance.map((entry, index) => (
                            <Cell 
                              key={`cell-s-${index}`} 
                              fill={entry.color} 
                              fillOpacity={selectedUserId ? (selectedUserId === entry.id ? 1 : 0.2) : (graphMetric === 'both' ? 0.5 : 1)}
                            />
                          ))}
                          {graphMetric === 'both' && (
                            <LabelList 
                              dataKey="avgScore" 
                              content={(props: any) => {
                                const { x, y, width, height } = props;
                                if (height < 60) return null;
                                return (
                                  <text 
                                    x={x + width / 2} 
                                    y={y + height / 2} 
                                    fill="#fff" 
                                    textAnchor="middle" 
                                    dominantBaseline="middle" 
                                    transform={`rotate(-90, ${x + width / 2}, ${y + height / 2})`}
                                    fontSize={9}
                                    fontWeight="bold"
                                    style={{ pointerEvents: 'none' }}
                                  >
                                    Avg Score %
                                  </text>
                                );
                              }} 
                            />
                          )}
                        </Bar>
                      )}
                    </BarChart>
                  ) : graphType === 'line' ? (
                    <LineChart data={groupPerformance}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', color: '#fff' }}
                        itemStyle={{ fontSize: '12px', color: '#fff' }}
                        labelStyle={{ color: '#fff' }}
                      />
                      <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }} />
                      {(graphMetric === 'progress' || graphMetric === 'both') && (
                        <Line 
                          type="monotone" 
                          dataKey="progress" 
                          name="Progress %" 
                          stroke="#3b82f6" 
                          strokeWidth={3} 
                          strokeOpacity={selectedUserId ? 0.2 : 1}
                          dot={{ r: 4, fill: '#3b82f6' }} 
                        />
                      )}
                      {(graphMetric === 'avgScore' || graphMetric === 'both') && (
                        <Line 
                          type="monotone" 
                          dataKey="avgScore" 
                          name="Avg Score %" 
                          stroke="#10b981" 
                          strokeWidth={3} 
                          strokeOpacity={selectedUserId ? 0.2 : 1}
                          dot={{ r: 4, fill: '#10b981' }} 
                        />
                      )}
                    </LineChart>
                  ) : (
                    <AreaChart data={groupPerformance}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', color: '#fff' }}
                        itemStyle={{ fontSize: '12px' }}
                      />
                      <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }} />
                      {(graphMetric === 'progress' || graphMetric === 'both') && (
                        <Area 
                          type="monotone" 
                          dataKey="progress" 
                          name="Progress %" 
                          stroke="#3b82f6" 
                          fill="#3b82f6" 
                          fillOpacity={selectedUserId ? 0.05 : 0.1} 
                          strokeOpacity={selectedUserId ? 0.2 : 1}
                        />
                      )}
                      {(graphMetric === 'avgScore' || graphMetric === 'both') && (
                        <Area 
                          type="monotone" 
                          dataKey="avgScore" 
                          name="Avg Score %" 
                          stroke="#10b981" 
                          fill="#10b981" 
                          fillOpacity={selectedUserId ? 0.05 : 0.1} 
                          strokeOpacity={selectedUserId ? 0.2 : 1}
                        />
                      )}
                    </AreaChart>
                  )}
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[350px] flex items-center justify-center text-slate-500 italic text-sm">
                No user data available for the selected filters.
              </div>
            )}
          </div>

          <div className="bg-slate-900 p-8 rounded-2xl border border-slate-800 shadow-sm print-break-inside-avoid">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Learning Timeline</h3>
                <div className="flex gap-1 no-print">
                  <button 
                    onClick={() => downloadDataAsCSV(timelineData[0]?.dataPoints || [], 'group_timeline')}
                    className="p-1.5 text-slate-500 hover:text-blue-400 hover:bg-slate-800 rounded-lg transition-all no-print"
                    title="Export Graph Data as CSV"
                  >
                    <Download size={14} />
                  </button>
                    <button 
                      onClick={() => downloadChartAsSVG('group-timeline-chart', 'group_timeline')}
                      className="p-1.5 text-slate-500 hover:text-blue-400 hover:bg-slate-800 rounded-lg transition-all no-print"
                      title="Export Graph as SVG"
                    >
                      <FileCode size={14} />
                    </button>
                  </div>
              </div>
              <div className="flex gap-2 no-print">
                <select 
                  className="text-[10px] font-bold bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-300 outline-none focus:border-blue-500"
                  value={timelineMetric}
                  onChange={(e) => setTimelineMetric(e.target.value as any)}
                >
                  <option value="progress">Progress Timeline</option>
                  <option value="avgScore">Avg Score Timeline</option>
                </select>
              </div>
            </div>
            
            {timelineData.length > 0 ? (
              <div className="h-[350px]" id="group-timeline-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                    <XAxis 
                      type="number" 
                      dataKey="timestamp" 
                      domain={['auto', 'auto']} 
                      tickFormatter={(t) => new Date(t).toLocaleDateString()}
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fill: '#64748b' }}
                    />
                    <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                    <Tooltip 
                      content={<CustomTimelineTooltip />} 
                      shared={false}
                      trigger="hover"
                    />
                    <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }} />
                    {timelineData.map(userTimeline => (
                      <Line 
                        key={userTimeline.userId}
                        data={userTimeline.dataPoints}
                        type="linear"
                        dataKey={timelineMetric}
                        name={userTimeline.userName}
                        stroke={userTimeline.color}
                        strokeWidth={selectedUserId === userTimeline.userId ? 4 : 2}
                        strokeOpacity={selectedUserId ? (selectedUserId === userTimeline.userId ? 1 : 0.1) : 1}
                        activeDot={{ r: 6 }}
                        dot={(props: any) => {
                          const { cx, cy, payload } = props;
                          const opacity = selectedUserId ? (selectedUserId === userTimeline.userId ? 1 : 0.1) : 1;
                          if (payload.type === 'module') {
                            return <circle cx={cx} cy={cy} r={4} fill="#0f172a" stroke={userTimeline.color} strokeWidth={1} strokeOpacity={opacity} fillOpacity={opacity} />;
                          }
                          if (payload.type === 'quiz') {
                            return <circle cx={cx} cy={cy} r={4} fill={payload.passed ? '#10b981' : '#ef4444'} fillOpacity={opacity} />;
                          }
                          return null;
                        }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[350px] flex items-center justify-center text-slate-500 italic text-sm">
                No timeline data available for the selected filters.
              </div>
            )}
          </div>

          {/* Quiz Performance Overview Graph */}
          <div className="bg-slate-900 p-8 rounded-2xl border border-slate-800 shadow-sm print-break-inside-avoid">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Quiz Performance Overview</h3>
                <div className="flex gap-1 no-print">
                  <button 
                    onClick={() => {
                      const csvData = quizPerformanceOverview.map(q => ({
                        Quiz: q.name,
                        AvgScore: `${q.avgScore}%`,
                        Attempts: q.attempts,
                        Date: new Date(q.timestamp).toLocaleDateString()
                      }));
                      downloadDataAsCSV(csvData, 'quiz_performance');
                    }}
                    className="p-1.5 text-slate-500 hover:text-blue-400 hover:bg-slate-800 rounded-lg transition-all no-print"
                    title="Export Graph Data as CSV"
                  >
                    <Download size={14} />
                  </button>
                    <button 
                      onClick={() => downloadChartAsSVG('quiz-performance-chart', 'quiz_performance')}
                      className="p-1.5 text-slate-500 hover:text-blue-400 hover:bg-slate-800 rounded-lg transition-all no-print"
                      title="Export Graph as SVG"
                    >
                      <FileCode size={14} />
                    </button>
                  </div>
              </div>
              <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest italic">
                Click columns for question-level breakdown
              </div>
            </div>
            
            {quizPerformanceOverview.length > 0 ? (
              <div className="h-[350px]" id="quiz-performance-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={quizPerformanceOverview}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fill: '#64748b' }} 
                      label={{ value: 'Quizzes (Chronological)', position: 'insideBottom', offset: -5, fontSize: 10, fill: '#475569', fontWeight: 'bold' }}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fill: '#64748b' }}
                      label={{ value: 'Average Score %', angle: -90, position: 'insideLeft', fontSize: 10, fill: '#475569', fontWeight: 'bold' }}
                    />
                    <Tooltip 
                      cursor={{ fill: '#1e293b' }}
                      contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', color: '#fff' }}
                      itemStyle={{ fontSize: '12px', color: '#fff' }}
                      labelStyle={{ color: '#fff' }}
                      formatter={(value: any) => [`${value}%`, 'Avg Score']}
                    />
                    <Bar 
                      dataKey="avgScore" 
                      fill="#3b82f6" 
                      radius={[4, 4, 0, 0]} 
                      cursor="pointer"
                      onClick={(data: any) => {
                        if (data && data.id) {
                          setSelectedQuizForDetails(data.id);
                        } else if (data && data.activePayload && data.activePayload.length > 0) {
                          setSelectedQuizForDetails(data.activePayload[0].payload.id);
                        }
                      }}
                    >
                      <LabelList 
                        dataKey="avgScore" 
                        position="top" 
                        style={{ fontSize: 10, fontWeight: 'bold', fill: '#3b82f6' }}
                        formatter={(val: any) => `${val}%`}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[350px] flex items-center justify-center text-slate-500 italic text-sm">
                No quiz performance data available for the selected filters.
              </div>
            )}
          </div>

          <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-sm overflow-hidden print-break-inside-avoid">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Student List ({filteredUsers.length})</h3>
                <button 
                  onClick={() => {
                    const csvData = filteredUsers.map(u => {
                      const data = getPerformanceData(u);
                      return {
                        Name: u.name,
                        Email: u.email,
                        Tags: (u.tags || []).join(', '),
                        Progress: `${data.progress}%`,
                        AvgScore: `${data.avgScore}%`
                      };
                    });
                    downloadDataAsCSV(csvData, 'student_list');
                  }}
                  className="p-1.5 text-slate-500 hover:text-blue-400 hover:bg-slate-800 rounded-lg transition-all no-print"
                  title="Export Table as CSV"
                >
                  <Download size={14} />
                </button>
                <button 
                  onClick={() => downloadTableAsSVG('main-student-table', 'student_list')}
                  className="p-1.5 text-slate-500 hover:text-blue-400 hover:bg-slate-800 rounded-lg transition-all no-print"
                  title="Export Table as SVG"
                >
                  <FileCode size={14} />
                </button>
              </div>
              {selectedUserId && (
                <button 
                  onClick={() => setSelectedUserId(null)}
                  className="text-xs font-bold text-red-400 hover:bg-red-900/20 px-2 py-1 rounded transition-colors no-print"
                >
                  Clear Selection
                </button>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left" id="main-student-table">
                <thead>
                  <tr className="bg-slate-950 text-[10px] uppercase font-bold text-slate-500 tracking-widest">
                    <th className="px-6 py-4">Student</th>
                    <th className="px-6 py-4">Tags</th>
                    <th className="px-6 py-4">Progress</th>
                    <th className="px-6 py-4">Avg Score</th>
                    <th className="px-6 py-4 no-print">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filteredUsers.map(u => {
                    const data = getPerformanceData(u);
                    return (
                      <tr key={u.id} className={`hover:bg-slate-800/50 transition-colors cursor-pointer ${selectedUserId === u.id ? 'bg-blue-900/20' : ''}`} onClick={() => setSelectedUserId(u.id)}>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm"
                              style={{ backgroundColor: u.profileColor || getTagColor(u.tags || []) }}
                            >
                              {u.name[0]}
                            </div>
                            <div>
                              <div className="text-sm font-bold text-white">{u.name}</div>
                              <div className="text-[10px] text-slate-500">{u.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {(u.tags || []).map(t => (
                              <span key={t} className="px-1.5 py-0.5 text-white rounded text-[9px] font-bold" style={{ backgroundColor: tagColors[t] || '#94a3b8' }}>{t}</span>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                              <div className="h-full bg-blue-500" style={{ width: `${data.progress}%` }}></div>
                            </div>
                            <span className="text-xs font-bold text-slate-300">{data.progress}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-xs font-bold ${data.avgScore >= 80 ? 'text-emerald-400' : data.avgScore >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
                            {data.avgScore}%
                          </span>
                        </td>
                        <td className="px-6 py-4 no-print">
                          <button className="text-blue-400 hover:text-blue-300 text-xs font-bold">Details</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right: Individual/Group Evaluation */}
        <div className={`space-y-8 ${isPrinting ? 'no-print' : ''}`}>
          <div className="bg-slate-900 text-white p-8 rounded-3xl shadow-2xl shadow-slate-950/50 relative overflow-hidden print-break-inside-avoid border border-slate-800">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Sparkles size={120} />
            </div>
            <h3 className="text-xl font-bold mb-2 relative z-10">Empirical Insights</h3>
            <p className="text-slate-500 text-sm mb-6 relative z-10">Based on real-time performance data.</p>
            
            <div className="space-y-4 relative z-10">
              <div className="bg-white/5 border border-white/10 p-4 rounded-xl">
                <div className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1">Areas of Ease</div>
                <div className="text-sm font-medium leading-relaxed text-slate-200">
                  {insights.ease}
                </div>
              </div>
              <div className="bg-white/5 border border-white/10 p-4 rounded-xl">
                <div className="text-[10px] font-bold text-amber-400 uppercase tracking-widest mb-1">Areas of Difficulty</div>
                <div className="text-sm font-medium leading-relaxed text-slate-200">
                  {insights.difficulty}
                </div>
              </div>
            </div>
          </div>

          {selectedUser ? (
            <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-sm overflow-hidden sticky top-8 print-break-inside-avoid">
              <div className="p-6 border-b border-slate-800 bg-slate-950/50 flex justify-between items-center">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Student Evaluation</h3>
                <div className="flex gap-2 no-print">
                  <button onClick={() => handleIndividualExport(selectedUser, 'text')} className="p-1.5 text-slate-500 hover:text-blue-400 transition-colors no-print" title="Download Text Evaluation"><FileText size={16}/></button>
                  <button onClick={() => handleIndividualExport(selectedUser, 'csv')} className="p-1.5 text-slate-500 hover:text-emerald-400 transition-colors no-print" title="Download CSV Evaluation"><Download size={16}/></button>
                  <button onClick={() => handleIndividualExport(selectedUser, 'print')} className="p-1.5 text-slate-500 hover:text-blue-400 transition-colors no-print" title="Print Student Report"><Printer size={16}/></button>
                  <button onClick={() => setSelectedUserId(null)} className="p-1.5 text-slate-500 hover:text-red-400 transition-colors no-print"><X size={18}/></button>
                </div>
              </div>
              <div className="p-8 space-y-8">
                <div className="text-center">
                  <div 
                    className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4 text-white shadow-lg"
                    style={{ backgroundColor: selectedUser.profileColor || getTagColor(selectedUser.tags || []) }}
                  >
                    {selectedUser.name[0]}
                  </div>
                  <h4 className="text-xl font-bold text-white">{selectedUser.name}</h4>
                  <p className="text-slate-500 text-sm">{selectedUser.email}</p>
                  <div className="flex flex-wrap justify-center gap-1 mt-3">
                    {(selectedUser.tags || []).map(t => (
                      <span key={t} className="px-2 py-0.5 text-white rounded text-[10px] font-bold border border-transparent" style={{ backgroundColor: tagColors[t] || '#3b82f6' }}>{t}</span>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800">
                    <div className="text-[10px] font-bold text-slate-500 uppercase mb-1 flex items-center">
                      Progress <MetricInfo title="Progress" description="Formula: (Completed Modules / Total Modules) * 100. Represents the percentage of the curriculum finished." />
                    </div>
                    <div className="text-2xl font-bold text-white">{getPerformanceData(selectedUser).progress}%</div>
                  </div>
                  <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800">
                    <div className="text-[10px] font-bold text-slate-500 uppercase mb-1 flex items-center">
                      Accuracy <MetricInfo title="Accuracy" description="Formula: (Total Correct Answers / Total Questions) * 100 across all quiz attempts. Measures technical precision." />
                    </div>
                    <div className="text-2xl font-bold text-white">{getPerformanceData(selectedUser).avgScore}%</div>
                  </div>
                </div>

                {/* Individual Timeline */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Learning Timeline</h5>
                    <div className="flex gap-1 no-print">
                      <button 
                        onClick={() => downloadDataAsCSV(getTimelineData([selectedUser])[0].dataPoints, `${selectedUser.name}_timeline`)}
                        className="p-1 text-slate-500 hover:text-blue-400 hover:bg-slate-800 rounded transition-all no-print"
                        title="Export Graph Data as CSV"
                      >
                        <Download size={12} />
                      </button>
                      <button 
                        onClick={() => downloadChartAsSVG('individual-timeline-chart', `${selectedUser.name}_timeline`)}
                        className="p-1 text-slate-500 hover:text-blue-400 hover:bg-slate-800 rounded transition-all no-print"
                        title="Export Graph as SVG"
                      >
                        <FileCode size={12} />
                      </button>
                    </div>
                  </div>
                  <div className="h-[150px] w-full bg-slate-950/50 rounded-xl p-2 border border-slate-800" id="individual-timeline-chart">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={getTimelineData([selectedUser])[0].dataPoints}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                        <XAxis 
                          type="number" 
                          dataKey="timestamp" 
                          domain={['auto', 'auto']} 
                          tickFormatter={(t) => new Date(t).toLocaleDateString()}
                          tick={{ fontSize: 8, fill: '#64748b' }}
                          minTickGap={20}
                        />
                        <YAxis domain={[0, 100]} hide={true} />
                        <Tooltip 
                          labelFormatter={(t) => new Date(t).toLocaleString()}
                          contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', color: '#fff' }}
                          itemStyle={{ fontSize: '10px', color: '#fff' }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="progress" 
                          stroke="#3b82f6" 
                          strokeWidth={2} 
                          dot={(props: any) => {
                            const { cx, cy, payload } = props;
                            if (payload.type === 'module') return <circle cx={cx} cy={cy} r={3} fill="#0f172a" stroke="#3b82f6" strokeWidth={1} />;
                            if (payload.type === 'quiz') return <circle cx={cx} cy={cy} r={3} fill={payload.passed ? '#10b981' : '#ef4444'} />;
                            return null;
                          }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex justify-center gap-4 text-[9px] text-slate-500 font-bold uppercase">
                    <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full border border-blue-400 bg-slate-900"></div> Module</div>
                    <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Passed</div>
                    <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500"></div> Failed</div>
                  </div>
                </div>

                {(selectedUser.quizAttempts || []).length > 0 ? (
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Skill Radar (vs Group Avg)</h5>
                      <div className="flex gap-1 no-print">
                        <button 
                          onClick={() => {
                            const radarData = [
                              { subject: 'Progress', A: getPerformanceData(selectedUser).progress, B: avgGroupProgress, fullMark: 100 },
                              { subject: 'Accuracy', A: getPerformanceData(selectedUser).avgScore, B: avgGroupScore, fullMark: 100 },
                              { subject: 'Engagement', A: Math.round(getPerformanceData(selectedUser).engagement), B: Math.min(100, (groupPerformance.reduce((acc, p) => acc + p.quizzes, 0) / (groupPerformance.length || 1)) * 10), fullMark: 100 },
                              { subject: 'Consistency', A: Math.round(getPerformanceData(selectedUser).consistency), B: 80, fullMark: 100 },
                              { subject: 'Speed', A: Math.round(getPerformanceData(selectedUser).speed), B: 75, fullMark: 100 },
                            ];
                            downloadDataAsCSV(radarData, `${selectedUser.name}_radar`);
                          }}
                          className="p-1 text-slate-500 hover:text-blue-400 hover:bg-slate-800 rounded transition-all no-print"
                          title="Export Graph Data as CSV"
                        >
                          <Download size={12} />
                        </button>
                        <button 
                          onClick={() => downloadChartAsSVG('individual-radar-chart', `${selectedUser.name}_radar`)}
                          className="p-1 text-slate-500 hover:text-blue-400 hover:bg-slate-800 rounded transition-all no-print"
                          title="Export Graph as SVG"
                        >
                          <FileCode size={12} />
                        </button>
                      </div>
                    </div>
                    <div className="h-[200px] w-full" id="individual-radar-chart">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={[
                          { subject: 'Progress', A: getPerformanceData(selectedUser).progress, B: avgGroupProgress, fullMark: 100 },
                          { subject: 'Accuracy', A: getPerformanceData(selectedUser).avgScore, B: avgGroupScore, fullMark: 100 },
                          { subject: 'Engagement', A: Math.round(getPerformanceData(selectedUser).engagement), B: Math.min(100, (groupPerformance.reduce((acc, p) => acc + p.quizzes, 0) / (groupPerformance.length || 1)) * 10), fullMark: 100 },
                          { subject: 'Consistency', A: Math.round(getPerformanceData(selectedUser).consistency), B: 80, fullMark: 100 },
                          { subject: 'Speed', A: Math.round(getPerformanceData(selectedUser).speed), B: 75, fullMark: 100 },
                        ]}>
                          <PolarGrid stroke="#1e293b" />
                          <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: '#64748b' }} />
                          <Radar name={selectedUser.name} dataKey="A" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
                          <Radar name="Group Avg" dataKey="B" stroke="#64748b" fill="#64748b" fillOpacity={0.3} />
                          <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', color: '#64748b' }} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                ) : (
                  <div className="h-[200px] flex flex-col items-center justify-center bg-slate-950/50 rounded-xl border border-dashed border-slate-800">
                    <BarChart3 size={24} className="text-slate-700 mb-2" />
                    <p className="text-[10px] text-slate-500 italic">No quiz data to generate radar chart.</p>
                  </div>
                )}

                <div className="space-y-4">
                  <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Performance Metrics</h5>
                  <div className="grid grid-cols-1 gap-2">
                    <div className="flex justify-between items-center p-2 bg-slate-950/50 rounded border border-slate-800">
                      <span className="text-[10px] font-medium text-slate-400 flex items-center">
                        Consistency <MetricInfo title="Consistency" description="Formula: (Unique Active Days in last 7 days / 7) * 100. Measures regularity of engagement." />
                      </span>
                      <span className="text-xs font-bold text-slate-300">{Math.round(getPerformanceData(selectedUser).consistency)}%</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-slate-950/50 rounded border border-slate-800">
                      <span className="text-[10px] font-medium text-slate-400 flex items-center">
                        Engagement <MetricInfo title="Engagement" description="Formula: (Total Quiz Attempts / Total Curriculum Modules) * 100. Measures depth of interaction." />
                      </span>
                      <span className="text-xs font-bold text-slate-300">{Math.round(getPerformanceData(selectedUser).engagement)}%</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-slate-950/50 rounded border border-slate-800">
                      <span className="text-[10px] font-medium text-slate-400 flex items-center">
                        Speed <MetricInfo title="Speed" description="Formula: 100 - (Avg Time per Quiz / 240 seconds) * 100. Measures efficiency in technical tasks." />
                      </span>
                      <span className="text-xs font-bold text-slate-300">{Math.round(getPerformanceData(selectedUser).speed)}%</span>
                    </div>
                  </div>
                </div>

                {/* Module Completion History */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">
                      <Clock size={12} /> Module Completion History
                    </h5>
                    <button 
                      onClick={() => {
                        const historyData = (selectedUser.completedSubTopics || []).map(record => {
                          const subTopic = topics.flatMap(t => t.subTopics).find(st => st.id === record.id);
                          return {
                            Module: subTopic?.title || 'Unknown',
                            CompletedAt: record.completedAt || 'N/A'
                          };
                        });
                        downloadDataAsCSV(historyData, `${selectedUser.name}_history`);
                      }}
                      className="p-1 text-slate-500 hover:text-blue-400 hover:bg-slate-800 rounded transition-all no-print"
                      title="Export Table as CSV"
                    >
                      <Download size={12} />
                    </button>
                  </div>
                  <div className="bg-slate-950/50 rounded-xl border border-slate-800 p-4 max-h-48 overflow-y-auto space-y-2">
                    {(selectedUser.completedSubTopics || []).length > 0 ? (
                      [...(selectedUser.completedSubTopics || [])]
                        .sort((a, b) => (b.completedAt || '').localeCompare(a.completedAt || ''))
                        .map(record => {
                          const subTopic = topics.flatMap(t => t.subTopics).find(st => st.id === record.id);
                          return (
                            <div key={record.id} className="flex justify-between items-center text-[11px] border-b border-slate-800 pb-2 last:border-0 last:pb-0">
                              <span className="text-slate-300 font-medium truncate max-w-[180px]">{subTopic?.title || 'Unknown Module'}</span>
                              <span className="text-slate-500 font-mono">{record.completedAt ? new Date(record.completedAt).toLocaleDateString() : 'N/A'}</span>
                            </div>
                          );
                        })
                    ) : (
                      <div className="text-center py-6 text-slate-500 text-[10px] italic">No modules completed yet</div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Detailed Activity Log</h5>
                    <button 
                      onClick={() => {
                        const logData = (selectedUser.quizAttempts || []).map(a => {
                          const subTopic = topics.flatMap(t => t.subTopics).find(st => st.id === a.subTopicId);
                          return {
                            Module: subTopic?.title || 'Quiz',
                            Status: a.passed ? 'PASSED' : 'FAILED',
                            Score: a.score,
                            Total: a.total,
                            TimeTaken: `${a.timeTaken}s`,
                            Timestamp: a.timestamp,
                            WrongAnswers: (a.wrongAnswers || []).join('; ')
                          };
                        });
                        downloadDataAsCSV(logData, `${selectedUser.name}_activity_log`);
                      }}
                      className="p-1 text-slate-500 hover:text-blue-400 hover:bg-slate-800 rounded transition-all no-print"
                      title="Export Table as CSV"
                    >
                      <Download size={12} />
                    </button>
                  </div>
                  <div className="space-y-3">
                    {(selectedUser.quizAttempts || []).map((a, i) => {
                      const subTopic = topics.flatMap(t => t.subTopics).find(st => st.id === a.subTopicId);
                      return (
                        <div key={i} className="p-3 bg-slate-950/50 rounded-lg border border-slate-800">
                          <div className="flex items-center justify-between mb-2">
                            <div className="text-xs font-bold text-slate-300 truncate">{subTopic?.title || 'Quiz'}</div>
                            <div className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${a.passed ? 'bg-emerald-900/30 text-emerald-400' : 'bg-red-900/30 text-red-400'}`}>
                              {a.passed ? 'PASSED' : 'FAILED'}
                            </div>
                          </div>
                          <div className="flex justify-between text-[10px] text-slate-500 mb-2">
                            <span>Score: {a.score}/{a.total}</span>
                            <span>Time: {a.timeTaken}s</span>
                            <span>{a.timestamp}</span>
                          </div>
                          {a.wrongAnswers && a.wrongAnswers.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-slate-800">
                              <div className="text-[9px] font-bold text-red-400 uppercase mb-1">Wrong Answers:</div>
                              <ul className="list-disc list-inside text-[9px] text-slate-400 space-y-1">
                                {a.wrongAnswers.map((q, idx) => (
                                  <li key={idx} className="leading-tight">{q}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {(selectedUser.quizAttempts || []).length === 0 && (
                      <p className="text-xs text-slate-500 italic text-center py-4">No activity recorded for this student.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900 rounded-2xl border border-dashed border-slate-800 p-12 text-center flex flex-col items-center justify-center h-[600px] no-print">
              <div className="w-16 h-16 bg-slate-950 rounded-full flex items-center justify-center text-slate-700 mb-4">
                <Users size={32} />
              </div>
              <h4 className="text-white font-bold">Select a student to show analytics</h4>
              <p className="text-slate-500 text-sm max-w-[200px] mt-2">Select a student from the list to view their detailed performance evaluation.</p>
            </div>
          )}
        </div>
      </div>

      {/* --- PRINT REPORT VIEW --- */}
      {isPrinting && (
        <div className="fixed inset-0 z-[99999]">
          <style>{`
            @media print {
              @page { size: A4; margin: 0; }
              body { background: white !important; color: black !important; }
              .no-print { display: none !important; }
              .print-container { 
                width: 210mm !important; 
                margin: 0 !important; 
                padding: 20mm !important;
                box-shadow: none !important;
                border: none !important;
              }
              .print-break-inside-avoid { break-inside: avoid; page-break-inside: avoid; }
              .print-break-after-always { break-after: page; page-break-after: always; }
            }
            .print-container {
              background: white;
              width: 210mm;
              min-height: 297mm;
              padding: 20mm;
              box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
              position: relative;
            }
            .print-card { border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin-bottom: 24px; }
            .print-header { border-bottom: 2px solid #1e293b; padding-bottom: 16px; margin-bottom: 32px; }
            .print-table { width: 100%; border-collapse: collapse; }
            .print-table th { text-align: left; font-size: 10px; text-transform: uppercase; color: #64748b; padding: 12px; border-bottom: 1px solid #e2e8f0; background: #f8fafc; }
            .print-table td { padding: 12px; border-bottom: 1px solid #f1f5f9; font-size: 12px; }
          `}</style>
          
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm no-print" 
            onClick={() => {
              setIsPrinting(false);
              setSelectedUserForPrint(null);
            }}
          />

          {/* Sticky Controls */}
          <div className="fixed top-6 right-6 flex gap-3 no-print z-[100001]">
            <button 
              id="download-btn"
              onClick={handleDownloadPDF}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-xl transition-all active:scale-95"
            >
              <Download size={18} /> Export as PDF
            </button>
            <button 
              onClick={() => {
                setIsPrinting(false);
                setSelectedUserForPrint(null);
              }}
              className="bg-white/10 hover:bg-white/20 backdrop-blur-md text-white p-2.5 rounded-xl border border-white/20 transition-all active:scale-95"
              title="Close Preview"
            >
              <X size={24} />
            </button>
          </div>

          {/* Scrollable Report Content */}
          <div className="absolute inset-0 overflow-y-auto p-4 md:p-12 flex justify-center pointer-events-none">
            <div className="pointer-events-auto">
              <div className="print-container" ref={printRef}>
                <div className="print-header flex justify-between items-end">
              <div>
                <h1 className="text-4xl font-bold tracking-tight" style={{ fontFamily: 'monospace', fontSize: '32px', lineHeight: '39px', fontStyle: 'normal' }}>
                  {selectedUserForPrint ? `Individual Evaluation: ${selectedUserForPrint.name}` : 'User Performance Evaluation Report'}
                </h1>
                <p className="text-slate-500 mt-2">
                  {selectedUserForPrint ? `Email: ${selectedUserForPrint.email}` : (selectedTags.length > 0 ? `Tags Filtered: ${selectedTags.join(', ')}` : '')}
                </p>
                <p className="text-slate-400 text-xs mt-1 italic">Generated on: {new Date().toLocaleString()}</p>
              </div>
              <div className="text-right">
                {landingConfig.appLogoUrl ? (
                  <img src={landingConfig.appLogoUrl} alt="Logo" className="h-12 w-auto ml-auto mb-2 object-contain" />
                ) : (
                  <div className="text-2xl font-black text-blue-600 tracking-tighter">Knowledge Graph</div>
                )}
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Admin Builder Analytics</div>
              </div>
            </div>

            {!selectedUserForPrint && (
              <>
                <div className="grid grid-cols-2 gap-8 mb-4">
                  <div className="print-card text-center mb-0">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Avg. Group Progress</div>
                    <div className="text-5xl font-bold text-blue-600">{avgGroupProgress}%</div>
                  </div>
                  <div className="print-card text-center mb-0">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Avg. Quiz Score</div>
                    <div className="text-5xl font-bold text-emerald-600">{avgGroupScore}%</div>
                  </div>
                </div>

                <div className="mb-12 flex justify-center gap-8 text-[10px] text-slate-400 italic">
                  <span>* Progress: (Completed Modules / Total Modules) * 100</span>
                  <span>* Accuracy: (Total Correct Answers / Total Questions) * 100</span>
                </div>

                <div className="print-card print-break-inside-avoid">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                      <BarChart3 size={20} className="text-blue-500" /> Performance Comparison
                    </h2>
                    <div className="flex gap-1 no-print">
                      <button 
                        onClick={() => downloadDataAsCSV(groupPerformance, 'group_performance')}
                        className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all no-print"
                        title="Export Graph Data as CSV"
                      >
                        <Download size={14} />
                      </button>
                      <button 
                        onClick={() => downloadChartAsSVG('print-group-performance-chart', 'group_performance')}
                        className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all no-print"
                        title="Export Graph as SVG"
                      >
                        <FileCode size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="h-[300px] w-full" id="print-group-performance-chart">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={groupPerformance}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                        <Bar dataKey="progress" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Progress %" />
                        <Bar dataKey="avgScore" fill="#10b981" radius={[4, 4, 0, 0]} name="Avg Score %" />
                        <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '20px' }} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="print-card print-break-inside-avoid">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                      <BarChart3 size={20} className="text-indigo-500" /> Quiz Performance Overview
                    </h2>
                    <div className="flex gap-1 no-print">
                      <button 
                        onClick={() => {
                          const csvData = quizPerformanceOverview.map(q => ({
                            Quiz: q.name,
                            AvgScore: `${q.avgScore}%`,
                            Attempts: q.attempts,
                            Date: new Date(q.timestamp).toLocaleDateString()
                          }));
                          downloadDataAsCSV(csvData, 'quiz_performance');
                        }}
                        className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all no-print"
                        title="Export Graph Data as CSV"
                      >
                        <Download size={14} />
                      </button>
                      <button 
                        onClick={() => downloadChartAsSVG('print-quiz-performance-chart', 'quiz_performance')}
                        className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all no-print"
                        title="Export Graph as SVG"
                      >
                        <FileCode size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="h-[300px] w-full" id="print-quiz-performance-chart">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={quizPerformanceOverview}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis 
                          dataKey="name" 
                          tick={{ fontSize: 10 }} 
                          label={{ value: 'Quizzes (Chronological)', position: 'insideBottom', offset: -5, fontSize: 10, fill: '#94a3b8', fontWeight: 'bold' }}
                        />
                        <YAxis 
                          domain={[0, 100]} 
                          tick={{ fontSize: 10 }}
                          label={{ value: 'Average Score %', angle: -90, position: 'insideLeft', fontSize: 10, fill: '#94a3b8', fontWeight: 'bold' }}
                        />
                        <Bar dataKey="avgScore" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                          <LabelList 
                            dataKey="avgScore" 
                            position="top" 
                            style={{ fontSize: 10, fontWeight: 'bold', fill: '#3b82f6' }}
                            formatter={(val: any) => `${val}%`}
                          />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="print-card print-break-inside-avoid">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                      <History size={20} className="text-blue-500" /> Learning Timeline (Group)
                    </h2>
                    <div className="flex gap-1 no-print">
                      <button 
                        onClick={() => downloadDataAsCSV(groupTimelineData, 'group_timeline')}
                        className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all no-print"
                        title="Export Graph Data as CSV"
                      >
                        <Download size={14} />
                      </button>
                      <button 
                        onClick={() => downloadChartAsSVG('print-group-timeline-chart', 'group_timeline')}
                        className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all no-print"
                        title="Export Graph as SVG"
                      >
                        <FileCode size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="h-[300px] w-full" id="print-group-timeline-chart">
                    <LineChart width={700} height={300} data={groupTimelineData} margin={{ bottom: 20, left: 10, right: 30, top: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        type="number"
                        dataKey="timestamp" 
                        domain={['dataMin', 'dataMax']}
                        tickFormatter={(t) => new Date(t).toLocaleDateString()} 
                        tick={{ fontSize: 8 }}
                        minTickGap={30}
                      >
                        <Label value="Learning Period" offset={-10} position="insideBottom" fontSize={10} fill="#94a3b8" />
                      </XAxis>
                      <YAxis domain={[0, 100]} tick={{ fontSize: 10 }}>
                        <Label value="Progress %" angle={-90} position="insideLeft" fontSize={10} fill="#94a3b8" />
                      </YAxis>
                      <Line type="monotone" dataKey="progress" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6' }} activeDot={{ r: 6 }} name="Group Progress" />
                    </LineChart>
                  </div>
                </div>

                <div className="print-card print-break-inside-avoid">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold mb-0">Student Performance List</h2>
                    <div className="flex gap-1 no-print">
                      <button 
                        onClick={() => {
                          const csvData = filteredUsers.map(u => {
                            const data = getPerformanceData(u);
                            return {
                              Name: u.name,
                              Email: u.email,
                              Tags: (u.tags || []).join(', '),
                              Progress: `${data.progress}%`,
                              AvgScore: `${data.avgScore}%`
                            };
                          });
                          downloadDataAsCSV(csvData, 'student_list');
                        }}
                        className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all no-print"
                        title="Export Table as CSV"
                      >
                        <Download size={14} />
                      </button>
                      <button 
                        onClick={() => downloadTableAsSVG('student-performance-table', 'student_list')}
                        className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all no-print"
                        title="Export Table as SVG"
                      >
                        <FileCode size={14} />
                      </button>
                    </div>
                  </div>
                  <table className="print-table" id="student-performance-table">
                    <thead>
                      <tr>
                        <th>Student</th>
                        <th>Tags</th>
                        <th>Progress</th>
                        <th>Avg Score</th>
                        <th>Quizzes</th>
                        <th>Consistency</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map(u => {
                        const data = getPerformanceData(u);
                        return (
                          <tr key={u.id}>
                            <td>
                              <div className="font-bold">{u.name}</div>
                              <div className="text-[10px] text-slate-400">{u.email}</div>
                            </td>
                            <td>
                              <div className="flex flex-wrap gap-1">
                                {(u.tags || []).map(t => (
                                  <span key={t} className="px-2 py-0.5 rounded-full text-[8px] font-bold text-white" style={{ backgroundColor: tagColors[t] || '#94a3b8' }}>{t}</span>
                                ))}
                              </div>
                            </td>
                            <td className="font-bold">{data.progress}%</td>
                            <td className="font-bold">{data.avgScore}%</td>
                            <td>{data.quizzes}</td>
                            <td>{Math.round(data.consistency)}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {selectedUserForPrint && (
              <div className="space-y-12">
                <div>
                  <div className="grid grid-cols-3 gap-8 mb-4">
                    <div className="print-card text-center mb-0" style={{ width: '185.844px' }}>
                      <div className="text-xs font-bold text-slate-400 uppercase mb-1">Progress</div>
                      <div className="text-4xl font-bold text-blue-600">{getPerformanceData(selectedUserForPrint).progress}%</div>
                    </div>
                    <div className="print-card text-center mb-0">
                      <div className="text-xs font-bold text-slate-400 uppercase mb-1">Accuracy</div>
                      <div className="text-4xl font-bold text-emerald-600">{getPerformanceData(selectedUserForPrint).avgScore}%</div>
                    </div>
                    <div className="print-card text-center mb-0">
                      <div className="text-xs font-bold text-slate-400 uppercase mb-1">Engagement</div>
                      <div className="text-4xl font-bold text-amber-600">{Math.round(getPerformanceData(selectedUserForPrint).engagement)}%</div>
                    </div>
                  </div>
                  <div className="flex justify-center gap-8 text-[10px] text-slate-400 italic">
                    <span style={{ marginLeft: '0px', marginTop: '-30px', marginBottom: '30px' }}>* Progress: (Completed Modules / Total Modules) * 100</span>
                    <span style={{ marginLeft: '0px', marginTop: '-30px', marginBottom: '30px' }}>* Accuracy: (Total Correct Answers / Total Questions) * 100</span>
                    <span style={{ marginTop: '-30px', marginBottom: '30px' }}>* Engagement: (Total Quiz Attempts / Total Modules) * 100</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-8">
                  <div className="print-card print-break-inside-avoid">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-lg font-bold">Learning Timeline</h3>
                      <div className="flex gap-1 no-print">
                        <button 
                          onClick={() => downloadDataAsCSV(getTimelineData([selectedUserForPrint])[0].dataPoints, `${selectedUserForPrint.name}_timeline`)}
                          className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all no-print"
                          title="Export Graph Data as CSV"
                        >
                          <Download size={14} />
                        </button>
                        <button 
                          onClick={() => downloadChartAsSVG('print-individual-timeline-chart', `${selectedUserForPrint.name}_timeline`)}
                          className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all no-print"
                          title="Export Graph as SVG"
                        >
                          <FileCode size={14} />
                        </button>
                      </div>
                    </div>
                    <div className="h-[250px] w-full" id="print-individual-timeline-chart">
                      <LineChart 
                        width={350} 
                        height={250} 
                        data={getTimelineData([selectedUserForPrint])[0].dataPoints} 
                        margin={{ bottom: 20, left: 10, right: 30, top: 10 }}
                        style={{ paddingRight: '50px', paddingLeft: '0px', marginLeft: '-29px' }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis 
                          type="number"
                          dataKey="timestamp" 
                          domain={['dataMin', 'dataMax']}
                          tickFormatter={(t) => new Date(t).toLocaleDateString()} 
                          tick={{ fontSize: 8 }}
                          minTickGap={30}
                        >
                          <Label value="Date" offset={-10} position="insideBottom" fontSize={10} fill="#94a3b8" />
                        </XAxis>
                        <YAxis domain={[0, 100]} tick={{ fontSize: 10 }}>
                          <Label value="Progress %" angle={-90} position="insideLeft" fontSize={10} fill="#94a3b8" />
                        </YAxis>
                        <Line type="monotone" dataKey="progress" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6' }} activeDot={{ r: 6 }} />
                      </LineChart>
                    </div>
                  </div>
                  <div className="print-card print-break-inside-avoid">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-lg font-bold">Skill Radar</h3>
                      <div className="flex gap-1 no-print">
                        <button 
                          onClick={() => downloadDataAsCSV([
                            { subject: 'Progress', A: getPerformanceData(selectedUserForPrint).progress, B: avgGroupProgress, fullMark: 100 },
                            { subject: 'Accuracy', A: getPerformanceData(selectedUserForPrint).avgScore, B: avgGroupScore, fullMark: 100 },
                            { subject: 'Engagement', A: Math.round(getPerformanceData(selectedUserForPrint).engagement), B: 50, fullMark: 100 },
                            { subject: 'Consistency', A: Math.round(getPerformanceData(selectedUserForPrint).consistency), B: 80, fullMark: 100 },
                            { subject: 'Speed', A: Math.round(getPerformanceData(selectedUserForPrint).speed), B: 75, fullMark: 100 },
                          ], `${selectedUserForPrint.name}_skills`)}
                          className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all no-print"
                          title="Export Graph Data as CSV"
                        >
                          <Download size={14} />
                        </button>
                        <button 
                          onClick={() => downloadChartAsSVG('print-individual-skill-radar', `${selectedUserForPrint.name}_skills`)}
                          className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all no-print"
                          title="Export Graph as SVG"
                        >
                          <FileCode size={14} />
                        </button>
                      </div>
                    </div>
                    <div className="h-[250px] w-full" id="print-individual-skill-radar">
                      <RadarChart 
                        width={350} 
                        height={250} 
                        cx="50%" 
                        cy="50%" 
                        outerRadius="80%" 
                        style={{ marginLeft: '-55px', marginRight: '0px', marginTop: '-16px', paddingLeft: '0px' }}
                        data={[
                        { subject: 'Progress', A: getPerformanceData(selectedUserForPrint).progress, B: avgGroupProgress, fullMark: 100 },
                        { subject: 'Accuracy', A: getPerformanceData(selectedUserForPrint).avgScore, B: avgGroupScore, fullMark: 100 },
                        { subject: 'Engagement', A: Math.round(getPerformanceData(selectedUserForPrint).engagement), B: 50, fullMark: 100 },
                        { subject: 'Consistency', A: Math.round(getPerformanceData(selectedUserForPrint).consistency), B: 80, fullMark: 100 },
                        { subject: 'Speed', A: Math.round(getPerformanceData(selectedUserForPrint).speed), B: 75, fullMark: 100 },
                      ]}>
                        <PolarGrid stroke="#e2e8f0" />
                        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                        <Radar name={selectedUserForPrint.name} dataKey="A" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
                        <Legend wrapperStyle={{ fontSize: '10px', marginLeft: '-12px', marginRight: '80px', paddingLeft: '1px' }} />
                      </RadarChart>
                    </div>
                  </div>
                </div>

                  <div className="print-card print-break-inside-avoid">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-lg font-bold mb-0 flex items-center gap-2">
                        <Clock size={20} className="text-blue-500" /> Module Completion History
                      </h3>
                      <div className="flex gap-1 no-print">
                        <button 
                          onClick={() => {
                            const csvData = (selectedUserForPrint.completedSubTopics || []).map(record => {
                              const subTopic = topics.flatMap(t => t.subTopics).find(st => st.id === record.id);
                              return {
                                Module: subTopic?.title || 'Unknown',
                                Date: record.completedAt || 'N/A',
                                Status: 'COMPLETED'
                              };
                            });
                            downloadDataAsCSV(csvData, `${selectedUserForPrint.name}_module_history`);
                          }}
                          className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all no-print"
                          title="Export Table as CSV"
                        >
                          <Download size={14} />
                        </button>
                        <button 
                          onClick={() => downloadTableAsSVG('module-history-table', `${selectedUserForPrint.name}_module_history`)}
                          className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all no-print"
                          title="Export Table as SVG"
                        >
                          <FileCode size={14} />
                        </button>
                      </div>
                    </div>
                    <table className="print-table" id="module-history-table">
                      <thead>
                        <tr>
                          <th>Module Title</th>
                          <th>Completion Date</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(selectedUserForPrint.completedSubTopics || []).map(record => {
                          const subTopic = topics.flatMap(t => t.subTopics).find(st => st.id === record.id);
                          return (
                            <tr key={record.id}>
                              <td className="font-medium">{subTopic?.title || 'Unknown Module'}</td>
                              <td>{record.completedAt ? new Date(record.completedAt).toLocaleString() : 'N/A'}</td>
                              <td><span className="text-emerald-600 font-bold">COMPLETED</span></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="print-card print-break-inside-avoid">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-lg font-bold mb-0">Quiz Activity Log</h3>
                      <div className="flex gap-1 no-print">
                        <button 
                          onClick={() => {
                            const csvData = (selectedUserForPrint.quizAttempts || []).map(a => {
                              const subTopic = topics.flatMap(t => t.subTopics).find(st => st.id === a.subTopicId);
                              return {
                                Quiz: subTopic?.title || 'Quiz',
                                Score: a.score,
                                Total: a.total,
                                Date: a.timestamp,
                                Result: a.passed ? 'PASSED' : 'FAILED',
                                WrongAnswers: (a.wrongAnswers || []).join('; ')
                              };
                            });
                            downloadDataAsCSV(csvData, `${selectedUserForPrint.name}_quiz_log`);
                          }}
                          className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all no-print"
                          title="Export Table as CSV"
                        >
                          <Download size={14} />
                        </button>
                        <button 
                          onClick={() => downloadTableAsSVG('quiz-log-table', `${selectedUserForPrint.name}_quiz_log`)}
                          className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all no-print"
                          title="Export Table as SVG"
                        >
                          <FileCode size={14} />
                        </button>
                      </div>
                    </div>
                    <table className="print-table" id="quiz-log-table">
                    <thead>
                      <tr>
                        <th>Quiz</th>
                        <th>Score</th>
                        <th>Date</th>
                        <th>Result</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedUserForPrint.quizAttempts || []).map((a, idx) => {
                        const subTopic = topics.flatMap(t => t.subTopics).find(st => st.id === a.subTopicId);
                        return (
                          <tr key={idx}>
                            <td className="font-medium">
                              {subTopic?.title || 'Quiz'}
                              {a.wrongAnswers && a.wrongAnswers.length > 0 && (
                                <div className="mt-2 p-2 bg-red-50 rounded border border-red-100">
                                  <div className="text-[9px] font-bold text-red-600 uppercase mb-1">Incorrect Questions:</div>
                                  <ul className="list-disc list-inside text-[9px] text-slate-600 space-y-0.5">
                                    {a.wrongAnswers.map((q, qIdx) => (
                                      <li key={qIdx}>{q}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </td>
                            <td className="font-bold">{a.score}/{a.total}</td>
                            <td>{a.timestamp}</td>
                            <td>
                              <span className={a.passed ? 'text-emerald-600 font-bold' : 'text-red-600 font-bold'}>
                                {a.passed ? 'PASSED' : 'FAILED'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="mt-12 pt-12 border-t border-slate-200 text-center text-slate-400 text-[10px] uppercase tracking-widest">
              End of Report - Confidential Student Data
            </div>
          </div>
        </div>
      </div>
    </div>
  )}

      {/* Quiz Details Modal */}
      {selectedQuizForDetails && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 no-print">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-900 rounded-3xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col border border-slate-800"
          >
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
              <div>
                <h3 className="text-xl font-bold text-white">
                  {quizPerformanceOverview.find(q => q.id === selectedQuizForDetails)?.name}
                </h3>
                <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest font-bold">Question-Level Performance Breakdown</p>
              </div>
              <button 
                onClick={() => setSelectedQuizForDetails(null)}
                className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-500 hover:text-slate-300"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6 bg-slate-900">
              {quizPerformanceOverview.find(q => q.id === selectedQuizForDetails)?.questions.map((q, idx) => (
                <div key={q.id} className="group relative">
                  <div className="flex justify-between items-end mb-2">
                    <div className="text-sm font-bold text-slate-300">{q.label}</div>
                    <div className="text-xs font-black text-slate-500">{q.correctPercentage}% Correct</div>
                  </div>
                  <div className="h-3 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${q.correctPercentage}%` }}
                      className={`h-full rounded-full ${q.correctPercentage >= 80 ? 'bg-emerald-500' : q.correctPercentage >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                    />
                  </div>
                  
                  {/* Tooltip on hover */}
                  <div className="absolute bottom-full left-0 mb-2 w-full p-3 bg-slate-950 text-white text-xs rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 border border-slate-800">
                    <div className="font-bold mb-2 text-blue-400">{q.question}</div>
                    <div className="space-y-1">
                      {q.options.map((opt, i) => (
                        <div key={i} className="flex gap-2">
                          <span className="text-slate-600">{i + 1}.</span>
                          <span>{opt}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="p-6 bg-slate-900/50 border-t border-slate-800 text-center">
              <button 
                onClick={() => setSelectedQuizForDetails(null)}
                className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-500 transition-all active:scale-95"
              >
                Close Breakdown
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function TagManagementView({ tags, setTags }: { tags: Tag[], setTags: React.Dispatch<React.SetStateAction<Tag[]>> }) {
  const [newTagName, setNewTagName] = useState('');
  const [newTagDesc, setNewTagDesc] = useState('');
  const [newTagColor, setNewTagColor] = useState('#3b82f6');

  const handleAddTag = () => {
    if (!newTagName.trim()) return;
    const newTag: Tag = {
      id: Math.random().toString(36).substr(2, 9),
      name: newTagName.trim(),
      description: newTagDesc.trim(),
      color: newTagColor
    };
    setTags([...tags, newTag]);
    setNewTagName('');
    setNewTagDesc('');
    setNewTagColor('#3b82f6');
  };

  const handleDeleteTag = (id: string) => {
    setTags(tags.filter(t => t.id !== id));
  };

  return (
    <div className="h-full bg-slate-950 p-8 overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-bold text-white">Tag Management</h2>
            <p className="text-slate-400">Create and manage user groups using tags.</p>
          </div>
        </div>

        <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-sm p-6 mb-8">
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4">Create New Tag</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Tag Name</label>
              <input 
                type="text" 
                value={newTagName}
                onChange={e => setNewTagName(e.target.value)}
                className="w-full p-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:border-blue-500 outline-none"
                placeholder="e.g. Fukuoka"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Description</label>
              <input 
                type="text" 
                value={newTagDesc}
                onChange={e => setNewTagDesc(e.target.value)}
                className="w-full p-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:border-blue-500 outline-none"
                placeholder="e.g. Students from Fukuoka"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Color</label>
              <div className="flex gap-2">
                <input 
                  type="color" 
                  value={newTagColor}
                  onChange={e => setNewTagColor(e.target.value)}
                  className="h-9 w-12 p-1 bg-slate-800 border border-slate-700 rounded-lg cursor-pointer"
                />
                <button 
                  onClick={handleAddTag}
                  className="flex-1 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-500 transition-colors active:scale-95"
                >
                  Add Tag
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tags.map(tag => (
            <div key={tag.id} className="bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-sm flex items-center justify-between group hover:border-slate-700 transition-all">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: tag.color }}></div>
                <div>
                  <div className="text-sm font-bold text-white">{tag.name}</div>
                  <div className="text-xs text-slate-500">{tag.description}</div>
                </div>
              </div>
              <button 
                onClick={() => handleDeleteTag(tag.id)}
                className="p-2 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          {tags.length === 0 && (
            <div className="col-span-full py-12 text-center bg-slate-900/50 border border-dashed border-slate-800 rounded-2xl">
              <Sparkles size={32} className="text-slate-700 mx-auto mb-3" />
              <p className="text-slate-500">No tags created yet. Start by adding one above.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminBuilder({ initialTopics, initialTeachers, initialUsers, initialTags, initialLandingConfig, onApplyChanges, onExit }: AdminBuilderProps) {
  const [activeTab, setActiveTab] = useState<'ANALYTICS' | 'CURRICULUM' | 'TEACHERS' | 'USERS_LIST' | 'TAGS' | 'USER_INTERFACE'>('ANALYTICS');
  const [showUsersDropdown, setShowUsersDropdown] = useState(false);
  
  // States
  const [topics, setTopics] = useState<Topic[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
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
    setTags(initialTags);
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
      
      // Assign a random color
      const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];

      const newUser: User = {
          id: tempId, 
          email: email,
          name: "New Student",
          avatar: `https://ui-avatars.com/api/?name=Student&background=random`,
          role: 'student',
          status: 'pending',
          profileColor: randomColor,
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

          await onApplyChanges(finalTopics, teachers, finalUsers, landingConfig, tags);
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
    <div className="fixed inset-0 z-[100] bg-slate-950 text-slate-200 flex flex-col font-sans">
      <header className="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-4">
              <h1 className="text-white font-bold text-lg flex items-center gap-2">
                  <Edit2 size={20} className="text-blue-500" />
                  Curriculum Builder <span className="text-xs bg-blue-600 px-2 py-0.5 rounded text-white ml-2">ADMIN</span>
              </h1>
              <div className="h-6 w-px bg-slate-700 mx-2" />
              <div className="flex bg-slate-800 p-1 rounded-lg">
                  <button 
                    onClick={() => setActiveTab('ANALYTICS')}
                    className={`px-3 py-1.5 rounded text-xs font-bold transition-colors ${activeTab === 'ANALYTICS' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}
                  >
                      Analytics
                  </button>
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
                  <div className="relative">
                      <button 
                        onClick={() => setShowUsersDropdown(!showUsersDropdown)}
                        className={`px-3 py-1.5 rounded text-xs font-bold transition-colors flex items-center gap-1 ${activeTab === 'USERS_LIST' || activeTab === 'TAGS' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}
                      >
                          Users <ChevronDown size={14} className={`transition-transform ${showUsersDropdown ? 'rotate-180' : ''}`} />
                      </button>
                      {showUsersDropdown && (
                          <div className="absolute top-full left-0 mt-1 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-[110] overflow-hidden">
                              <button 
                                onClick={() => { setActiveTab('USERS_LIST'); setShowUsersDropdown(false); }}
                                className={`w-full text-left px-4 py-2.5 text-xs font-bold transition-colors hover:bg-slate-700 ${activeTab === 'USERS_LIST' ? 'text-blue-400' : 'text-slate-300'}`}
                              >
                                  Add/Edit Users
                              </button>
                              <button 
                                onClick={() => { setActiveTab('TAGS'); setShowUsersDropdown(false); }}
                                className={`w-full text-left px-4 py-2.5 text-xs font-bold transition-colors hover:bg-slate-700 ${activeTab === 'TAGS' ? 'text-blue-400' : 'text-slate-300'}`}
                              >
                                  Add/Edit Tags
                              </button>
                          </div>
                      )}
                  </div>
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
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95">
                  <h3 className="text-xl font-bold text-white mb-2">Apply Changes?</h3>
                  <p className="text-slate-400 mb-6">This will update the live application state for all tabs (Curriculum, Teachers, Users).</p>
                  <div className="flex justify-end gap-3">
                      <button onClick={() => setConfirmationOpen(false)} disabled={isSaving} className="px-4 py-2 text-slate-500 hover:bg-slate-800 rounded-lg disabled:opacity-50">Cancel</button>
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
                  <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0">
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
                            <button onClick={handleAddTopic} className="w-full px-4 py-3 text-left text-sm text-blue-400 hover:bg-blue-500/10 flex items-center gap-2 transition-colors border-t border-slate-800">
                                <Plus size={16} /> Add Topic
                            </button>
                        </div>
                  </aside>
                  <main className="flex-1 overflow-y-auto bg-slate-950 p-8">
                     {selectedTopic ? (
                         <div className="max-w-4xl mx-auto space-y-6">
                            {/* Topic Header Editor */}
                            <div className="bg-slate-900 rounded-xl shadow-sm border border-slate-800 p-6">
                                <h3 className="text-xs uppercase tracking-wide text-slate-500 font-bold mb-4">Topic Settings</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2">
                                        <label className="block text-xs font-medium text-slate-500 mb-1">Title</label>
                                        <input 
                                            className="w-full p-2 border border-slate-700 rounded text-base font-bold text-white bg-slate-800 focus:border-blue-500 outline-none" 
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
                                            className={`w-full p-2 text-xs font-mono border rounded outline-none transition-colors ${selectedTopic['_isManualId'] ? 'bg-slate-800 border-blue-500/50 text-blue-400' : 'bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed'}`} 
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 mb-1">Teacher</label>
                                        <select 
                                            className="w-full p-2 border border-slate-700 rounded text-sm bg-slate-800 text-white outline-none focus:border-blue-500"
                                            value={selectedTopic.teacherKey}
                                            onChange={e => handleUpdateTopic(selectedTopicId, {...selectedTopic, teacherKey: e.target.value})}
                                        >
                                            {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 mb-1">Level</label>
                                        <select 
                                            className="w-full p-2 border border-slate-700 rounded text-sm bg-slate-800 text-white outline-none focus:border-blue-500"
                                            value={selectedTopic.level}
                                            onChange={e => handleUpdateTopic(selectedTopicId, {...selectedTopic, level: parseInt(e.target.value) as any})}
                                        >
                                            {[1,2,3,4,5,6,7,8,9,10].map(l => <option key={l} value={l}>Level {l}</option>)}
                                        </select>
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-xs font-medium text-slate-500 mb-1">Description</label>
                                        <textarea className="w-full p-2 border border-slate-700 rounded text-sm h-20 bg-slate-800 text-white outline-none focus:border-blue-500" value={selectedTopic.shortDescription} onChange={e => handleUpdateTopic(selectedTopicId, {...selectedTopic, shortDescription: e.target.value})} />
                                    </div>
                                    
                                    {/* Prerequisites Selector */}
                                    <div className="col-span-2 mt-4 pt-4 border-t border-slate-800">
                                        <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Prerequisites (Graph Connections)</h4>
                                        <div className="bg-slate-800 p-3 rounded border border-slate-700 max-h-40 overflow-y-auto grid grid-cols-2 gap-2">
                                            {topics.filter(t => t.id !== selectedTopic.id).map(t => (
                                                <label key={t.id} className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer hover:bg-slate-700 p-1 rounded transition-colors">
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
                                                        className="rounded border-slate-600 bg-slate-700 text-blue-600 focus:ring-blue-500"
                                                    />
                                                    <span className="truncate">{t.title}</span>
                                                    <span className="text-xs text-slate-500 ml-auto">Lvl {t.level}</span>
                                                </label>
                                            ))}
                                            {topics.length <= 1 && <span className="text-xs text-slate-500 italic col-span-2">No other topics available to connect.</span>}
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
                                                className="w-full p-2 border border-slate-700 rounded text-sm bg-slate-800 font-mono text-slate-300 outline-none focus:border-blue-500" 
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
                                    <h3 className="text-lg font-bold text-white">Modules ({selectedTopic.subTopics.length})</h3>
                                    <button onClick={() => handleAddModule(selectedTopicId)} className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-500/10 text-blue-400 rounded-lg hover:bg-blue-500/20 font-medium border border-blue-500/20"><Plus size={16}/> Add Module</button>
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
              <div className="h-full bg-slate-950 p-8 overflow-y-auto">
                  <div className="max-w-5xl mx-auto">
                      <div className="flex justify-between items-center mb-8">
                          <div>
                              <h2 className="text-2xl font-bold text-white">Instructor Management</h2>
                              <p className="text-slate-400">Manage teacher profiles and assignments.</p>
                          </div>
                          <button onClick={handleAddTeacher} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-lg shadow-blue-900/20">
                              <Plus size={16} /> Add Instructor
                          </button>
                      </div>
                      
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {teachers.map(teacher => (
                              <div key={teacher.id} className="bg-slate-900 rounded-xl shadow-sm border border-slate-800 overflow-hidden group">
                                  {editingTeacherId === teacher.id ? (
                                      <div className="p-6 space-y-4">
                                          <div className="flex justify-between items-center mb-2">
                                              <span className="text-xs font-bold text-blue-400 uppercase">Editing Profile</span>
                                              <button onClick={() => setEditingTeacherId(null)} className="text-slate-500 hover:text-slate-300"><X size={16}/></button>
                                          </div>
                                          <div className="grid grid-cols-2 gap-4">
                                              <div className="col-span-2">
                                                  <label className="text-xs font-medium text-slate-400">Full Name</label>
                                                  <input className="w-full p-2 border border-slate-700 rounded bg-slate-800 text-white" value={teacher.name} onChange={e => handleUpdateTeacher({...teacher, name: e.target.value})} />
                                              </div>
                                              <div>
                                                  <label className="text-xs font-medium text-slate-400">Role</label>
                                                  <input className="w-full p-2 border border-slate-700 rounded bg-slate-800 text-white" value={teacher.role} onChange={e => handleUpdateTeacher({...teacher, role: e.target.value})} />
                                              </div>
                                              <div>
                                                  <label className="text-xs font-medium text-slate-400">Email</label>
                                                  <input className="w-full p-2 border border-slate-700 rounded bg-slate-800 text-white" value={teacher.email} onChange={e => handleUpdateTeacher({...teacher, email: e.target.value})} />
                                              </div>
                                              <div className="col-span-2">
                                                  <label className="text-xs font-medium text-slate-400">Avatar URL</label>
                                                  <input className="w-full p-2 border border-slate-700 rounded bg-slate-800 text-white" value={teacher.avatar} onChange={e => handleUpdateTeacher({...teacher, avatar: e.target.value})} />
                                              </div>
                                              <div className="col-span-2">
                                                  <label className="text-xs font-medium text-slate-400">Bio (Short Description)</label>
                                                  <textarea className="w-full p-2 border border-slate-700 rounded text-sm h-20 bg-slate-800 text-white" value={teacher.bio || ''} onChange={e => handleUpdateTeacher({...teacher, bio: e.target.value})} placeholder="Short biography..." />
                                              </div>
                                          </div>
                                          <div className="flex justify-end pt-2">
                                              <button onClick={() => handleDeleteTeacher(teacher.id)} className="text-red-500 text-xs hover:underline flex items-center gap-1"><Trash2 size={12}/> Remove Instructor</button>
                                          </div>
                                      </div>
                                  ) : (
                                      <div className="p-6 flex items-start gap-4">
                                          <img src={teacher.avatar} alt={teacher.name} className="w-16 h-16 rounded-full object-cover border-2 border-slate-800" />
                                          <div className="flex-1">
                                              <h3 className="font-bold text-white">{teacher.name}</h3>
                                              <p className="text-blue-400 text-sm font-medium">{teacher.role}</p>
                                              <p className="text-slate-500 text-sm mb-3">{teacher.email}</p>
                                              <p className="text-slate-400 text-sm leading-relaxed mb-4">{teacher.bio || 'No biography added.'}</p>
                                              
                                              <div className="flex items-center gap-2 mt-auto">
                                                  <button onClick={() => setEditingTeacherId(teacher.id)} className="text-xs bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded font-medium text-slate-300 transition-colors">Edit Profile</button>
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
              <div className="h-full overflow-y-auto p-8 bg-slate-950">
                  <div className="max-w-3xl mx-auto space-y-8">
                      <div>
                          <h2 className="text-2xl font-bold text-white">User Interface Configuration</h2>
                          <p className="text-slate-400 text-sm">Manage the visual identity and content of your platform.</p>
                      </div>

                      {/* SECTION 1: LANDING PAGE */}
                      <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-sm overflow-hidden">
                          <div className="bg-slate-800/50 px-6 py-3 border-b border-slate-800">
                              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">1. Landing Page (Login)</h3>
                          </div>
                          <div className="p-6 space-y-6">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  <div className="space-y-2">
                                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Main Title</label>
                                      <input 
                                          type="text" 
                                          value={landingConfig.title} 
                                          onChange={e => setLandingConfig({...landingConfig, title: e.target.value})}
                                          className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-white"
                                          placeholder="e.g. Digital Built Environment"
                                      />
                                  </div>
                                  <div className="space-y-2">
                                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Subtitle</label>
                                      <input 
                                          type="text" 
                                          value={landingConfig.subtitle} 
                                          onChange={e => setLandingConfig({...landingConfig, subtitle: e.target.value})}
                                          className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-white"
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
                                      className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-white"
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
                                              className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-white"
                                              placeholder="https://images.unsplash.com/..."
                                          />
                                      </div>
                                      <div className="w-24 h-12 rounded-lg border border-slate-700 overflow-hidden bg-slate-800 shrink-0">
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
                                      className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none text-white"
                                      placeholder="Enter a quote..."
                                  />
                              </div>
                          </div>
                      </div>

                      {/* SECTION 2: WELCOME OVERLAY */}
                      <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-sm overflow-hidden">
                          <div className="bg-slate-800/50 px-6 py-3 border-b border-slate-800">
                              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">2. Welcome Overlay</h3>
                          </div>
                          <div className="p-6 space-y-6">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  <div className="space-y-2">
                                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Overlay Title</label>
                                      <input 
                                          type="text" 
                                          value={landingConfig.welcomeTitle || ''} 
                                          onChange={e => setLandingConfig({...landingConfig, welcomeTitle: e.target.value})}
                                          className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-white"
                                          placeholder="e.g. Welcome to the Program"
                                      />
                                  </div>
                                  <div className="space-y-2">
                                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Overlay Subtitle</label>
                                      <input 
                                          type="text" 
                                          value={landingConfig.welcomeSubtitle || ''} 
                                          onChange={e => setLandingConfig({...landingConfig, welcomeSubtitle: e.target.value})}
                                          className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-white"
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
                                      className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none text-white"
                                      placeholder="Describe the program..."
                                  />
                              </div>

                              <div className="space-y-2">
                                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Button Text</label>
                                  <input 
                                      type="text" 
                                      value={landingConfig.welcomeButtonText || ''} 
                                      onChange={e => setLandingConfig({...landingConfig, welcomeButtonText: e.target.value})}
                                      className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-white"
                                      placeholder="e.g. Enter Curriculum Map"
                                  />
                              </div>
                          </div>
                      </div>

                      {/* SECTION 3: KNOWLEDGE GRAPH INTERFACE */}
                      <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-sm overflow-hidden">
                          <div className="bg-slate-800/50 px-6 py-3 border-b border-slate-800">
                              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">3. Knowledge Graph Interface</h3>
                          </div>
                          <div className="p-6 space-y-6">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  <div className="space-y-2">
                                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Graph Title</label>
                                      <input 
                                          type="text" 
                                          value={landingConfig.graphTitle || ''} 
                                          onChange={e => setLandingConfig({...landingConfig, graphTitle: e.target.value})}
                                          className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-white"
                                          placeholder="e.g. CURRICULUM_MAP_V2.3"
                                      />
                                  </div>
                                  <div className="space-y-2">
                                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Graph Subtitle</label>
                                      <input 
                                          type="text" 
                                          value={landingConfig.graphSubtitle || ''} 
                                          onChange={e => setLandingConfig({...landingConfig, graphSubtitle: e.target.value})}
                                          className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-white"
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
                                              className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-white"
                                              placeholder="https://..."
                                          />
                                      </div>
                                      {landingConfig.appLogoUrl && (
                                          <div className="w-12 h-12 rounded-lg border border-slate-700 overflow-hidden bg-slate-900 shrink-0 p-1">
                                              <img src={landingConfig.appLogoUrl} alt="Logo Preview" className="w-full h-full object-contain" />
                                          </div>
                                      )}
                                  </div>
                              </div>
                          </div>
                      </div>

                      <div className="p-6 bg-blue-500/10 border border-blue-500/20 rounded-2xl">
                          <div className="flex gap-4">
                              <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center shrink-0">
                                  <Sparkles className="text-blue-400 w-5 h-5" />
                              </div>
                              <div>
                                  <h4 className="text-sm font-bold text-blue-100 mb-1">Live Preview</h4>
                                  <p className="text-xs text-blue-300 leading-relaxed">
                                      Changes made here will be reflected across the entire platform's user interface.
                                  </p>
                              </div>
                          </div>
                      </div>
                  </div>
              </div>
          )}

          {activeTab === 'USERS_LIST' && (
              <div className="h-full bg-slate-950 p-8 overflow-y-auto">
                  <div className="max-w-6xl mx-auto">
                      <div className="flex justify-between items-center mb-8">
                          <div>
                              <h2 className="text-2xl font-bold text-white">User Access Control</h2>
                              <p className="text-slate-400">Create credentials and assign personalized curriculums.</p>
                          </div>
                          <button onClick={handleAddUser} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-lg shadow-blue-900/20">
                              <UserPlus size={16} /> Create User
                          </button>
                      </div>

                      <div className="space-y-6">
                          {users.map(user => (
                              <div key={user.id} className="bg-slate-900 rounded-xl shadow-sm border border-slate-800 overflow-hidden">
                                  {editingUserId === user.id ? (
                                      <div className="p-6">
                                          <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4">
                                              <h3 className="font-bold text-white flex items-center gap-2"><Settings size={18} className="text-blue-400"/> Editing User: {user.email}</h3>
                                              <div className="flex gap-2">
                                                  <button onClick={() => setEditingUserId(null)} className="px-3 py-1.5 text-sm bg-slate-800 hover:bg-slate-700 rounded text-slate-300">Done</button>
                                                  <button onClick={() => handleDeleteUser(user.id)} className="px-3 py-1.5 text-sm bg-red-900/20 hover:bg-red-900/30 text-red-400 rounded">Delete</button>
                                              </div>
                                          </div>
                                          
                                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                              <div className="space-y-4">
                                                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Credentials</h4>
                                                  <div className="grid grid-cols-2 gap-4">
                                                      <div>
                                                          <label className="text-xs font-medium text-slate-500">Name</label>
                                                          <input className="w-full p-2 border border-slate-700 rounded text-sm bg-slate-800 text-white outline-none focus:border-blue-500" value={user.name} onChange={e => handleUpdateUser(user.id, {...user, name: e.target.value})} />
                                                      </div>
                                                      <div>
                                                          <label className="text-xs font-medium text-slate-500">Role</label>
                                                          <select className="w-full p-2 border border-slate-700 rounded text-sm bg-slate-800 text-white outline-none focus:border-blue-500" value={user.role} onChange={e => handleUpdateUser(user.id, {...user, role: e.target.value as any})}>
                                                              <option value="student">Student</option>
                                                              <option value="admin">Admin</option>
                                                          </select>
                                                      </div>
                                                      <div>
                                                          <label className="text-xs font-medium text-slate-500">Email (Login)</label>
                                                          <input className="w-full p-2 border border-slate-700 rounded text-sm bg-slate-800 text-white outline-none focus:border-blue-500" value={user.email} onChange={e => handleUpdateUser(user.id, {...user, email: e.target.value})} />
                                                      </div>
                                                      <div>
                                                          <label className="text-xs font-medium text-slate-500">Tags</label>
                                                          <div className="space-y-2">
                                                              <div className="flex flex-wrap gap-1 mb-2">
                                                                  {(user.tags || []).map(tag => (
                                                                      <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 text-[10px] font-bold border border-blue-500/20">
                                                                          {tag}
                                                                          <button 
                                                                            onClick={() => handleUpdateUser(user.id, {...user, tags: (user.tags || []).filter(t => t !== tag)})}
                                                                            className="hover:text-red-400"
                                                                          >
                                                                              <X size={10} />
                                                                          </button>
                                                                      </span>
                                                                  ))}
                                                                  {(user.tags || []).length === 0 && <span className="text-[10px] text-slate-500 italic">No tags assigned</span>}
                                                              </div>
                                                              <select 
                                                                className="w-full p-2 border border-slate-700 rounded text-sm bg-slate-800 text-white outline-none focus:border-blue-500"
                                                                value=""
                                                                onChange={e => {
                                                                    const newTag = e.target.value;
                                                                    if (newTag && !(user.tags || []).includes(newTag)) {
                                                                        handleUpdateUser(user.id, {...user, tags: [...(user.tags || []), newTag]});
                                                                    }
                                                                }}
                                                              >
                                                                  <option value="" disabled>Add a tag...</option>
                                                                  {tags.map(t => (
                                                                      <option key={t.id} value={t.name} disabled={(user.tags || []).includes(t.name)}>
                                                                          {t.name}
                                                                      </option>
                                                                  ))}
                                                              </select>
                                                          </div>
                                                      </div>
                                                      <div>
                                                          <label className="text-xs font-medium text-slate-500">Profile Color</label>
                                                          <div className="flex gap-2 items-center">
                                                              <input 
                                                                  type="color" 
                                                                  className="w-8 h-8 p-0 border-0 bg-transparent cursor-pointer" 
                                                                  value={user.profileColor || '#3b82f6'} 
                                                                  onChange={e => handleUpdateUser(user.id, {...user, profileColor: e.target.value})} 
                                                              />
                                                              <input 
                                                                  type="text" 
                                                                  className="flex-1 p-2 border border-slate-700 rounded text-xs font-mono bg-slate-800 text-white outline-none focus:border-blue-500" 
                                                                  value={user.profileColor || '#3b82f6'} 
                                                                  onChange={e => handleUpdateUser(user.id, {...user, profileColor: e.target.value})} 
                                                              />
                                                          </div>
                                                      </div>
                                                      <div className="flex items-end">
                                                          <div className="text-[10px] text-slate-500 italic bg-slate-800/50 p-2 rounded border border-slate-800 w-full">
                                                              {user.status === 'pending' ? 'User has not activated their account yet.' : 'User is active and linked to Firebase Auth.'}
                                                          </div>
                                                      </div>
                                                  </div>
                                                  
                                                  <div className="mt-8 pt-4 border-t border-slate-800">
                                                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Learning Progress</h4>
                                                      <div className="grid grid-cols-3 gap-4 text-center mb-6">
                                                          <div className="bg-slate-800/50 p-3 rounded border border-slate-800">
                                                              <div className="text-xl font-bold text-blue-400">{(user.completedSubTopics || []).length}</div>
                                                              <div className="text-[10px] text-slate-500 uppercase">Completed</div>
                                                          </div>
                                                          <div className="bg-slate-800/50 p-3 rounded border border-slate-800">
                                                              <div className="text-xl font-bold text-green-400">{(user.quizAttempts || []).length}</div>
                                                              <div className="text-[10px] text-slate-500 uppercase">Quizzes Taken</div>
                                                          </div>
                                                          <div className="bg-slate-800/50 p-3 rounded border border-slate-800">
                                                              <div className="text-xl font-bold text-slate-300">
                                                                  {Math.round(((user.completedSubTopics || []).length / (topics.reduce((acc, t) => acc + t.subTopics.length, 0) || 1)) * 100)}%
                                                              </div>
                                                              <div className="text-[10px] text-slate-500 uppercase">Progress</div>
                                                          </div>
                                                      </div>

                                                      <div className="space-y-6">
                                                          {/* Module Completion History */}
                                                          <div>
                                                              <h5 className="text-[10px] font-bold text-slate-500 uppercase mb-2 flex items-center gap-1">
                                                                  <Clock size={12} /> Module Completion History
                                                              </h5>
                                                              <div className="bg-slate-800/50 rounded-lg border border-slate-800 p-3 max-h-48 overflow-y-auto space-y-2">
                                                                  {(user.completedSubTopics || []).length > 0 ? (
                                                                      [...(user.completedSubTopics || [])].sort((a,b) => (b.completedAt || '').localeCompare(a.completedAt || '')).map(record => {
                                                                          const subTopic = topics.flatMap(t => t.subTopics).find(st => st.id === record.id);
                                                                          return (
                                                                              <div key={record.id} className="flex justify-between items-center text-[11px] border-b border-slate-800 pb-1 last:border-0 last:pb-0">
                                                                                  <span className="text-slate-300 font-medium truncate max-w-[150px]">{subTopic?.title || 'Unknown Module'}</span>
                                                                                  <span className="text-slate-500">{record.completedAt ? new Date(record.completedAt).toLocaleString() : 'N/A'}</span>
                                                                              </div>
                                                                          );
                                                                      })
                                                                  ) : (
                                                                      <div className="text-center py-4 text-slate-500 text-[10px] italic">No modules completed yet</div>
                                                                  )}
                                                              </div>
                                                          </div>

                                                          {/* Quiz Performance Details */}
                                                          <div>
                                                              <h5 className="text-[10px] font-bold text-slate-500 uppercase mb-2 flex items-center gap-1">
                                                                  <History size={12} /> Quiz Performance Details
                                                              </h5>
                                                              <div className="bg-slate-800/50 rounded-lg border border-slate-800 p-3 max-h-64 overflow-y-auto space-y-3">
                                                                  {(user.quizAttempts || []).length > 0 ? (
                                                                      [...(user.quizAttempts || [])].sort((a,b) => (b.timestamp || '').localeCompare(a.timestamp || '')).map((attempt, idx) => {
                                                                          const subTopic = topics.flatMap(t => t.subTopics).find(st => st.id === attempt.subTopicId);
                                                                          return (
                                                                              <div key={idx} className="bg-slate-800 p-2 rounded border border-slate-700 shadow-sm">
                                                                                  <div className="flex justify-between items-start mb-1">
                                                                                      <div className="text-[11px] font-bold text-slate-200 truncate max-w-[140px]">{subTopic?.title || 'Unknown Quiz'}</div>
                                                                                      <div className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${attempt.passed ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
                                                                                          {attempt.passed ? 'PASSED' : 'FAILED'}
                                                                                      </div>
                                                                                  </div>
                                                                                  <div className="flex justify-between text-[10px] text-slate-500 mb-2">
                                                                                      <span>Score: {attempt.score}/{attempt.total}</span>
                                                                                      <span>Time: {attempt.timeTaken}s</span>
                                                                                      <span>{attempt.timestamp}</span>
                                                                                  </div>
                                                                                  {attempt.wrongAnswers && attempt.wrongAnswers.length > 0 && (
                                                                                      <div className="mt-1 pt-1 border-t border-slate-700">
                                                                                          <div className="text-[9px] font-bold text-red-500 uppercase mb-1">Wrong Answers:</div>
                                                                                          <ul className="list-disc list-inside text-[9px] text-slate-400 space-y-0.5">
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
                                                                      <div className="text-center py-4 text-slate-500 text-[10px] italic">No quiz attempts recorded</div>
                                                                  )}
                                                              </div>
                                                          </div>
                                                      </div>
                                                  </div>
                                              </div>

                                              <div className="bg-slate-800/50 p-5 rounded-xl border border-slate-800">
                                                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2"><LockIcon size={14}/> Assigned Curriculum Modules</h4>
                                                  <p className="text-xs text-slate-500 mb-4">Uncheck modules to lock them for this user. They will appear greyed out in their graph.</p>
                                                  
                                                  <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                                                      {topics.map(t => {
                                                          const isAllowed = user.allowedTopics ? user.allowedTopics.includes(t.id) : true; // Default true if undefined
                                                          return (
                                                              <div key={t.id} onClick={() => handleToggleUserTopic(user, t.id)} className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${isAllowed ? 'bg-slate-800 border-green-500/30 shadow-sm' : 'bg-slate-900 border-transparent opacity-40'}`}>
                                                                  <div className={`w-5 h-5 rounded flex items-center justify-center border mr-3 ${isAllowed ? 'bg-green-500 border-green-600 text-white' : 'bg-slate-800 border-slate-700'}`}>
                                                                      {isAllowed && <CheckSquare size={14} />}
                                                                  </div>
                                                                  <div className="flex-1">
                                                                      <div className={`text-sm font-bold ${isAllowed ? 'text-white' : 'text-slate-500'}`}>{t.title}</div>
                                                                      <div className="text-xs text-slate-500">Level {t.level} • {t.subTopics.length} Modules</div>
                                                                  </div>
                                                              </div>
                                                          );
                                                      })}
                                                  </div>
                                              </div>
                                          </div>
                                      </div>
                                  ) : (
                                      <div className="p-4 flex items-center justify-between hover:bg-slate-800/50 transition-colors">
                                          <div className="flex items-center gap-4">
                                              <div 
                                                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold overflow-hidden shadow-sm"
                                                style={{ backgroundColor: user.profileColor || '#475569' }}
                                              >
                                                  {user.avatar ? <img src={user.avatar} className="w-full h-full object-cover"/> : user.name[0]}
                                              </div>
                                              <div>
                                                  <h3 className="font-bold text-slate-200">{user.name}</h3>
                                                  <div className="flex items-center gap-2 text-xs text-slate-500">
                                                      <span className="font-mono">{user.email}</span>
                                                      <span className={`px-1.5 py-0.5 rounded uppercase font-bold text-[10px] ${user.role === 'admin' ? 'bg-purple-900/30 text-purple-400' : 'bg-blue-900/30 text-blue-400'}`}>{user.role || 'student'}</span>
                                                  </div>
                                              </div>
                                          </div>
                                          <div className="flex items-center gap-6">
                                              <div className="text-right hidden sm:block">
                                                  <div className="text-xs text-slate-500 uppercase font-bold">Progress</div>
                                                  <div className="text-sm font-bold text-slate-300">
                                                      {Math.round(((user.completedSubTopics || []).length / (topics.reduce((acc, t) => acc + t.subTopics.length, 0) || 1)) * 100)}%
                                                  </div>
                                              </div>
                                              <div className="text-right hidden sm:block">
                                                  <div className="text-xs text-slate-500 uppercase font-bold">Access</div>
                                                  <div className="text-sm font-bold text-slate-300">{(user.allowedTopics || []).length} / {topics.length} Topics</div>
                                              </div>
                                              <button onClick={() => setEditingUserId(user.id)} className="bg-slate-800 border border-slate-700 hover:border-blue-500 text-slate-400 hover:text-blue-400 p-2 rounded-lg transition-colors">
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

          {activeTab === 'ANALYTICS' && (
              <div className="h-full bg-slate-950 overflow-y-auto">
                  <div className="p-8">
                      <AnalyticsView 
                          users={users} 
                          topics={topics} 
                          tags={tags}
                          landingConfig={landingConfig}
                      />
                  </div>
              </div>
          )}

          {activeTab === 'TAGS' && (
              <div className="h-full bg-slate-950 overflow-y-auto">
                  <div className="p-8">
                      <TagManagementView 
                          tags={tags}
                          setTags={setTags}
                      />
                  </div>
              </div>
          )}
      </div>
    </div>
  );
}
