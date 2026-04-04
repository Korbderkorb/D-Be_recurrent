
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
import { Download, Plus, Trash2, Edit2, GripVertical, ChevronRight, Video, Upload, HelpCircle, UploadCloud, RefreshCw, Copy, AlertCircle, Info, Settings, Save, CheckSquare, Square, X, Users, GraduationCap, Layers, UserPlus, Key, Eye, Shield, BarChart3, Search, Lock as LockIcon, Sparkles, CheckCircle2, Clock, History, XCircle, ChevronDown, ChevronUp, FileText, Printer, FileCode, FileUp, ExternalLink, Award, BellOff, AlertTriangle, MessageSquare, Send, Calendar, User as UserIcon } from 'lucide-react';
import { ref, getBlob, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';
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
import { Topic, SubTopic, Teacher, SubTopicType, QuizQuestion, User, LandingConfig, QuizAttempt, Tag, Notification as AppNotification, ExerciseSubmission } from '../types';
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

const PathDisplay = ({ label, path, description, theme = 'dark' }: { label: string, path: string, description?: string, theme?: 'light' | 'dark' }) => {
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
                className={`flex items-center gap-2 border rounded p-2 cursor-pointer transition-colors group ${theme === 'dark' ? 'bg-slate-900 hover:bg-slate-800 border-slate-800' : 'bg-slate-50 hover:bg-slate-100 border-slate-200'}`}
                title="Click to copy path"
            >
                <code className={`text-xs font-mono break-all flex-1 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>{path}</code>
                <Copy size={12} className={`transition-colors ${theme === 'dark' ? 'text-slate-600 group-hover:text-blue-400' : 'text-slate-400 group-hover:text-blue-600'}`} />
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
  theme?: 'light' | 'dark';
}

const ModuleEditor: React.FC<ModuleEditorProps> = ({ topicId, module, existingSubIds, onUpdate, onDelete, theme = 'dark' }) => {
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
    <div className={`border rounded-lg transition-all ${expanded ? 'shadow-md border-blue-500/50 ring-1 ring-blue-500/20' : (theme === 'dark' ? 'border-slate-800 hover:border-slate-700' : 'border-slate-200 hover:border-slate-300')} ${theme === 'dark' ? 'bg-slate-900' : 'bg-white'}`}>
        <div 
            className="flex items-center p-4 cursor-pointer"
            onClick={() => setExpanded(!expanded)}
        >
            <div className={`mr-3 cursor-grab active:cursor-grabbing ${theme === 'dark' ? 'text-slate-600' : 'text-slate-400'}`}><GripVertical size={16} /></div>
            <div className={`mr-3 p-2 rounded-md border ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'}`}>{
                module.type === 'VIDEO' ? <Video size={18} className="text-blue-400" /> :
                module.type === 'EXERCISE_UPLOAD' ? <Upload size={18} className="text-purple-400" /> :
                <HelpCircle size={18} className="text-orange-400" />
            }</div>
            <div className="flex-1">
                <div className="flex items-center gap-2">
                    <span className={`font-semibold text-sm ${theme === 'dark' ? 'text-slate-200' : 'text-slate-900'}`}>{module.title || 'Untitled Module'}</span>
                    <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${subIdConflict ? 'bg-red-900/30 text-red-400' : (theme === 'dark' ? 'bg-slate-800 text-slate-500' : 'bg-slate-100 text-slate-500')}`}>
                        {module._subId || 'no-id'}
                    </span>
                    {subIdConflict && <AlertCircle size={14} className="text-red-500" />}
                </div>
                <div className={`text-xs mt-0.5 truncate ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>{module.description || 'No description'}</div>
            </div>
            <div className={`text-xs font-mono mr-4 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>{module.duration}</div>
            <div className={`transform transition-transform ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'} ${expanded ? 'rotate-90' : ''}`}><ChevronRight size={18} /></div>
        </div>

        {expanded && (
            <div className={`p-4 border-t ${theme === 'dark' ? 'border-slate-800 bg-slate-900/50' : 'border-slate-200 bg-slate-50/50'}`}>
                <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-12 md:col-span-8">
                        <label className="block text-xs font-medium text-slate-500 mb-1">Title</label>
                        <input type="text" value={module.title} onChange={e => handleTitleChange(e.target.value)} className={`w-full p-2 text-sm border rounded focus:border-blue-500 outline-none font-medium ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`} />
                    </div>
                    <div className="col-span-12 md:col-span-4">
                        <label className="block text-xs font-medium text-slate-500 mb-1">Type</label>
                        <select value={module.type} onChange={e => onUpdate({...module, type: e.target.value as SubTopicType})} className={`w-full p-2 text-sm border rounded focus:border-blue-500 outline-none ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
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
                                    className={`w-3 h-3 rounded border-slate-600 focus:ring-blue-500 ${theme === 'dark' ? 'bg-slate-700 text-blue-600' : 'bg-white text-blue-600'}`}
                                />
                                Manual Edit
                            </label>
                        </div>
                        <input 
                            type="text" 
                            value={module._subId || ''} 
                            onChange={e => handleIdChange(e.target.value)}
                            disabled={!module._isManualId}
                            className={`w-full p-2 text-xs font-mono border rounded outline-none transition-colors ${module._isManualId ? (theme === 'dark' ? 'bg-slate-800 border-blue-500/50 text-blue-400' : 'bg-white border-blue-500 text-blue-600') : (theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed' : 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed')}`} 
                        />
                        {subIdConflict && <p className="text-[10px] text-red-500 mt-1 flex items-center gap-1"><AlertCircle size={10} /> This ID is already used by another module in this topic.</p>}
                    </div>
                    <div className="col-span-8">
                         <label className="block text-xs font-medium text-slate-500 mb-1">Description</label>
                         <input type="text" value={module.description} onChange={e => onUpdate({...module, description: e.target.value})} className={`w-full p-2 text-sm border rounded focus:border-blue-500 outline-none ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`} />
                    </div>
                     <div className="col-span-4">
                        <label className="block text-xs font-medium text-slate-500 mb-1">Duration</label>
                         <input type="text" value={module.duration} onChange={e => onUpdate({...module, duration: e.target.value})} placeholder="MM:SS" className={`w-full p-2 text-sm border rounded focus:border-blue-500 outline-none ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`} />
                    </div>
                    
                    {/* VIDEO SPECIFIC */}
                    {module.type === 'VIDEO' && (
                         <div className={`col-span-12 space-y-3 pb-2 border-b mb-2 ${theme === 'dark' ? 'border-slate-800' : 'border-slate-200'}`}>
                             <div>
                                 <label className="block text-xs font-medium text-slate-500 mb-1">Embed Link (Vimeo/YouTube)</label>
                                 <input 
                                     type="text" 
                                     value={module.videoUrl || ''} 
                                     onChange={e => onUpdate({ ...module, videoUrl: e.target.value })} 
                                     placeholder="https://player.vimeo.com/video/..."
                                     className={`w-full p-2 text-sm border rounded focus:border-blue-500 outline-none font-mono ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-white border-slate-200 text-slate-600'}`} 
                                 />
                             </div>
                             
                             <div>
                                 <label className="block text-xs font-medium text-slate-500 mb-1">Poster Image URL (Thumbnail)</label>
                                 <input 
                                     type="text" 
                                     value={module.posterUrl || ''} 
                                     onChange={e => onUpdate({ ...module, posterUrl: e.target.value })} 
                                     placeholder={getGeneratedPath(topicId, module._subId, 'thumb')}
                                     className={`w-full p-2 text-sm border rounded focus:border-blue-500 outline-none font-mono ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-white border-slate-200 text-slate-600'}`} 
                                 />
                             </div>
                             
                             <label className={`flex items-center gap-2 cursor-pointer text-sm select-none font-bold mt-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                                <input 
                                    type="checkbox" 
                                    checked={module.hasResources !== false} 
                                    onChange={e => onUpdate({...module, hasResources: e.target.checked})} 
                                    className={`w-4 h-4 rounded border-slate-600 focus:ring-blue-500 ${theme === 'dark' ? 'bg-slate-700 text-blue-600' : 'bg-white text-blue-600'}`} 
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
                                            className={`w-full p-2 text-sm border rounded focus:border-blue-500 outline-none font-mono ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-white border-slate-200 text-slate-600'}`} 
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
                                            className={`w-full p-2 text-sm border rounded focus:border-blue-500 outline-none font-mono ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-white border-slate-200 text-slate-600'}`} 
                                         />
                                     </div>
                                 </div>
                             )}
                         </div>
                    )}

                    {/* UPLOAD EXERCISE SPECIFIC */}
                    {module.type === 'EXERCISE_UPLOAD' && (
                        <div className={`col-span-12 p-4 rounded-xl border space-y-4 ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                             <div>
                                 <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Upload Requirements</label>
                                 <div className="space-y-2 mb-3">
                                     {(module.uploadRequirements || []).map((req, idx) => (
                                         <div key={idx} className="flex items-center gap-2">
                                             <span className={`text-sm font-medium px-3 py-1.5 rounded-lg flex-1 border ${theme === 'dark' ? 'text-slate-300 bg-slate-900 border-slate-700' : 'text-slate-700 bg-white border-slate-200'}`}>{req}</span>
                                             <button 
                                                onClick={() => onUpdate({ ...module, uploadRequirements: (module.uploadRequirements || []).filter((_, i) => i !== idx) })}
                                                className="text-slate-500 hover:text-red-500 transition-colors"
                                             >
                                                 <X size={16} />
                                             </button>
                                         </div>
                                     ))}
                                     {(module.uploadRequirements || []).length === 0 && (
                                         <div className="text-xs text-slate-500 italic">No specific requirements (Single file upload default).</div>
                                     )}
                                 </div>
                                 <div className="flex gap-2">
                                     <input 
                                        type="text" 
                                        value={newUploadReq}
                                        onChange={(e) => setNewUploadReq(e.target.value)}
                                        placeholder="E.g. Rhino Model, Render Image..."
                                        className={`flex-1 p-2 text-sm rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all border ${theme === 'dark' ? 'bg-slate-900 text-white border-slate-700' : 'bg-white text-slate-900 border-slate-200'}`}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && newUploadReq.trim()) {
                                                const current = module.uploadRequirements || [];
                                                if (module.exerciseConfig?.maxFiles && current.length >= module.exerciseConfig.maxFiles) {
                                                    alert(`Maximum of ${module.exerciseConfig.maxFiles} files allowed.`);
                                                    return;
                                                }
                                                onUpdate({ ...module, uploadRequirements: [...current, newUploadReq.trim()] });
                                                setNewUploadReq('');
                                            }
                                        }}
                                     />
                                     <button 
                                        onClick={() => {
                                            if (newUploadReq.trim()) {
                                                const current = module.uploadRequirements || [];
                                                if (module.exerciseConfig?.maxFiles && current.length >= module.exerciseConfig.maxFiles) {
                                                    alert(`Maximum of ${module.exerciseConfig.maxFiles} files allowed.`);
                                                    return;
                                                }
                                                onUpdate({ ...module, uploadRequirements: [...current, newUploadReq.trim()] });
                                                setNewUploadReq('');
                                            }
                                        }}
                                        className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-500 transition-colors shadow-lg shadow-blue-900/20"
                                     >
                                         Add
                                     </button>
                                 </div>
                             </div>

                             <div className={`pt-4 border-t ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}>
                                 <label className="block text-xs font-bold text-slate-500 uppercase mb-3">Upload Constraints</label>
                                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                     <div className="space-y-1.5">
                                         <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Allowed Extensions</label>
                                         <input 
                                            type="text" 
                                            value={module.exerciseConfig?.allowedFileTypes?.join(', ') || ''}
                                            onChange={(e) => {
                                                const types = e.target.value.split(',').map(t => t.trim()).filter(t => t.startsWith('.'));
                                                onUpdate({ 
                                                    ...module, 
                                                    exerciseConfig: { 
                                                        ...(module.exerciseConfig || { maxFiles: 1, maxFileSizeMB: 10 }), 
                                                        allowedFileTypes: types 
                                                    } 
                                                });
                                            }}
                                            placeholder=".pdf, .zip, .jpg"
                                            className={`w-full p-2 text-xs border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono ${theme === 'dark' ? 'bg-slate-900 text-white border-slate-700' : 'bg-white text-slate-900 border-slate-200'}`}
                                         />
                                         <p className="text-[9px] text-slate-500">Comma separated, include dot (e.g. .pdf, .zip)</p>
                                     </div>
                                     <div className="space-y-1.5">
                                         <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Max Files</label>
                                         <input 
                                            type="number" 
                                            min={1}
                                            max={10}
                                            value={module.exerciseConfig?.maxFiles || 1}
                                            onChange={(e) => onUpdate({ 
                                                ...module, 
                                                exerciseConfig: { 
                                                    ...(module.exerciseConfig || { allowedFileTypes: ['.pdf'], maxFileSizeMB: 10 }), 
                                                    maxFiles: parseInt(e.target.value) || 1 
                                                } 
                                            })}
                                            className={`w-full p-2 text-xs border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none ${theme === 'dark' ? 'bg-slate-900 text-white border-slate-700' : 'bg-white text-slate-900 border-slate-200'}`}
                                         />
                                     </div>
                                     <div className="space-y-1.5">
                                         <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Max Size (MB) / File</label>
                                         <input 
                                            type="number" 
                                            min={1}
                                            max={100}
                                            value={module.exerciseConfig?.maxFileSizeMB || 10}
                                            onChange={(e) => onUpdate({ 
                                                ...module, 
                                                exerciseConfig: { 
                                                    ...(module.exerciseConfig || { allowedFileTypes: ['.pdf'], maxFiles: 1 }), 
                                                    maxFileSizeMB: parseInt(e.target.value) || 10 
                                                } 
                                            })}
                                            className={`w-full p-2 text-xs border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none ${theme === 'dark' ? 'bg-slate-900 text-white border-slate-700' : 'bg-white text-slate-900 border-slate-200'}`}
                                         />
                                     </div>
                                 </div>
                             </div>
                        </div>
                    )}

                    {/* QUIZ SPECIFIC */}
                    {module.type === 'EXERCISE_QUIZ' && (
                        <div className={`col-span-12 mt-2 pt-4 border-t ${theme === 'dark' ? 'border-slate-800' : 'border-slate-200'}`}>
                            <div className="flex justify-between items-center mb-2">
                                <label className="block text-xs font-bold text-slate-400 uppercase">Quiz Questions</label>
                                <button onClick={() => { const newQ: QuizQuestion = { id: `q${Date.now()}`, question: 'New Question?', options: ['Option 1', 'Option 2'], correctAnswers: [0], multiSelect: false }; onUpdate({...module, quizQuestions: [...(module.quizQuestions || []), newQ]}); }} className="text-xs text-blue-600 hover:text-blue-500 font-medium">+ Add Question</button>
                            </div>
                            <div className="space-y-4">
                                {module.quizQuestions?.map((q, qIdx) => (
                                    <div key={q.id} className={`p-4 border rounded shadow-sm ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                                        <div className="flex gap-2 mb-3">
                                            <span className="text-xs font-mono text-slate-400 pt-2">Q{qIdx+1}</span>
                                            <input className={`flex-1 p-1.5 text-sm border-b focus:border-blue-400 outline-none font-medium ${theme === 'dark' ? 'bg-slate-900 text-white border-slate-700' : 'bg-white text-slate-900 border-slate-200'}`} value={q.question} onChange={(e) => { const newQs = [...(module.quizQuestions || [])]; newQs[qIdx] = { ...q, question: e.target.value }; onUpdate({...module, quizQuestions: newQs}); }} placeholder="Enter question..." />
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
                                                    className={`w-3.5 h-3.5 rounded border-slate-600 focus:ring-blue-500 ${theme === 'dark' ? 'bg-slate-700 text-blue-600' : 'bg-white text-blue-600'}`} 
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
                                                                : (isCorrect ? <div className="w-4 h-4 rounded-full border-4 border-green-500" /> : <div className={`w-4 h-4 rounded-full border ${theme === 'dark' ? 'border-slate-600' : 'border-slate-300'}`} />)
                                                            }
                                                        </div>
                                                        <input 
                                                            className={`flex-1 text-xs p-1.5 border focus:border-blue-400 rounded outline-none transition-colors ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`} 
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
                     <button onClick={() => { onDelete(); }} className="px-3 py-1.5 text-xs text-red-600 hover:bg-red-900/20 rounded border border-transparent hover:border-red-900/30 transition-colors">Delete Module</button>
                </div>
                {showAdvancedSettings && (
                        <div className={`mt-4 p-3 rounded border ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'}`}>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Sub-ID (Manual Override)</label>
                             <div className="flex gap-2">
                                <input type="text" value={module._subId || ''} onChange={e => { const val = generateSlug(e.target.value); const rootId = module.id.split('-').slice(0, -1).join('-'); onUpdate({...module, _subId: val, id: rootId ? `${rootId}-${val}` : module.id}); }} className={`flex-1 p-2 text-sm border rounded focus:ring-2 outline-none font-mono ${subIdConflict ? 'border-red-300 ring-red-200' : (theme === 'dark' ? 'bg-slate-900 border-slate-700 text-slate-300 focus:ring-blue-400' : 'bg-white border-slate-200 text-slate-700 focus:ring-blue-400')}`} />
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
    key?: any;
    topic: Topic;
    isSelected: boolean;
    onSelect: () => void;
    onDelete: () => void;
    theme: 'light' | 'dark';
}

const SortableTopicItem = ({ topic, isSelected, onSelect, onDelete, theme }: SortableTopicItemProps) => {
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
            className={`flex items-center group transition-colors hover:shadow-sm ${
              theme === 'dark' ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
            } ${
              isSelected 
                ? (theme === 'dark' ? 'bg-slate-800 border-r-4 border-blue-500 shadow-sm' : 'bg-blue-50 border-r-4 border-blue-500 shadow-sm') 
                : 'border-r-4 border-transparent'
            } ${isDragging ? 'opacity-50 shadow-lg' : ''}`}
        >
            <div 
                {...attributes} 
                {...listeners} 
                className={`pl-3 cursor-grab active:cursor-grabbing flex items-center gap-1 ${
                  theme === 'dark' ? 'text-slate-600 hover:text-slate-400' : 'text-slate-400 hover:text-slate-600'
                }`}
            >
                <GripVertical size={14} />
                {topic.level > 1 && (
                    <div className="flex items-center">
                        {[...Array(topic.level - 1)].map((_, i) => (
                            <div key={i} className={`w-2 h-px ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-300'}`} />
                        ))}
                    </div>
                )}
            </div>
            <div onClick={onSelect} className={`flex-1 min-w-0 py-3 pl-2 pr-2 cursor-pointer ${
              isSelected 
                ? 'text-blue-400 font-semibold' 
                : (theme === 'dark' ? 'text-slate-300 group-hover:text-white' : 'text-slate-600 group-hover:text-slate-900')
            }`}>
                <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-mono px-1 rounded ${theme === 'dark' ? 'bg-slate-800 text-slate-500' : 'bg-slate-200 text-slate-500'}`}>L{topic.level}</span>
                    <div className="truncate text-sm">{topic.title}</div>
                </div>
            </div>
            <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className={`p-2 mr-2 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity ${theme === 'dark' ? 'text-slate-600' : 'text-slate-400'}`}>
                <Trash2 size={14} />
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
  notifications: AppNotification[];
  submissions: ExerciseSubmission[];
  initialTab?: 'ANALYTICS' | 'CURRICULUM' | 'TEACHERS' | 'USERS_LIST' | 'TAGS' | 'USER_INTERFACE' | 'NOTIFICATIONS';
  onMarkNotificationRead: (notificationId: string) => Promise<void>;
  onDeleteNotification: (notificationId: string) => Promise<void>;
  onEvaluateSubmission: (submissionId: string, score: number, feedback: string) => Promise<void>;
  onRequestResubmission: (submissionId: string, feedback: string) => Promise<void>;
  onPostSubmissionComment?: (id: string, text: string, isSubmission?: boolean) => Promise<void>;
  onDeleteComment?: (id: string, commentId: string, isSubmission: boolean) => Promise<void>;
  onToggleNotificationCompleted?: (id: string, completed: boolean) => Promise<void>;
  onDeleteFile?: (fileUrl: string, submissionId: string, fileName: string) => Promise<void>;
  isAdmin?: boolean;
  onApplyChanges: (newTopics: Topic[], newTeachers: Teacher[], newUsers: User[], newLandingConfig: LandingConfig, newTags: Tag[]) => Promise<void>;
  onExit: () => void;
  theme: 'light' | 'dark';
}

// --- User Performance View Component ---
export function AnalyticsView({ users, topics, tags, landingConfig, notifications, submissions, onEvaluateSubmission, onRequestResubmission, onPostSubmissionComment, onDeleteComment, onDeleteFile, isAdmin = false, theme = 'dark' }: { 
  users: User[], 
  topics: Topic[], 
  tags: Tag[], 
  landingConfig: LandingConfig, 
  notifications: AppNotification[], 
  submissions: ExerciseSubmission[],
  onEvaluateSubmission: (submissionId: string, score: number, feedback: string) => Promise<void>,
  onRequestResubmission: (submissionId: string, feedback: string) => Promise<void>,
  onPostSubmissionComment?: (id: string, text: string, isSubmission?: boolean) => Promise<void>;
  onDeleteComment?: (id: string, commentId: string, isSubmission: boolean) => Promise<void>;
  onDeleteFile?: (fileUrl: string, submissionId: string, fileName: string) => Promise<void>;
  isAdmin?: boolean;
  theme?: 'light' | 'dark';
}) {
  const [analyticsTab, setAnalyticsTab] = useState<'STATS' | 'SUBMISSIONS'>('STATS');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [exportFormat, setExportFormat] = useState<'text' | 'csv' | 'print'>('print');
  const [isPrinting, setIsPrinting] = useState(false);
  const [selectedUserForPrint, setSelectedUserForPrint] = useState<User | null>(null);
  const [selectedQuizForDetails, setSelectedQuizForDetails] = useState<string | null>(null);
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
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
      questionStats: Record<string, { 
        correct: number, 
        total: number, 
        question: string, 
        options: string[],
        optionCounts: Record<number, number>,
        correctAnswers: number[]
      }>
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
              options: q.options,
              optionCounts: q.options.reduce((acc, _, idx) => ({ ...acc, [idx]: 0 }), {}),
              correctAnswers: q.correctAnswers || []
            };
          });
        }

        quizStats[a.subTopicId].totalScore += (a.score / a.total);
        quizStats[a.subTopicId].attempts += 1;
        
        subTopic.quizQuestions.forEach(q => {
          const stats = quizStats[a.subTopicId].questionStats[q.id];
          if (stats) {
            stats.total += 1;
            
            // Track specific option picks
            const selectedIndices = a.answers?.[q.id] || [];
            selectedIndices.forEach(idx => {
              if (stats.optionCounts[idx] !== undefined) {
                stats.optionCounts[idx] += 1;
              }
            });

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
        options: qStats.options.map((opt, optIdx) => ({
          text: opt,
          isCorrect: qStats.correctAnswers.includes(optIdx),
          pickPercentage: qStats.total > 0 ? Math.round((qStats.optionCounts[optIdx] / qStats.total) * 100) : 0
        })),
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
        <div className={`p-3 rounded-lg shadow-xl border text-xs ${theme === 'dark' ? 'bg-slate-900 text-white border-slate-700' : 'bg-white text-slate-900 border-slate-200'}`}>
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

  // Individual Student Export Logic
  const handleIndividualExport = (user: User, format: 'text' | 'csv' | 'print') => {
    if (format === 'print') {
      setSelectedUserForPrint(user);
      setIsPrinting(true);
      return;
    }
    
    const data = getPerformanceData(user);
    const userNotifications = notifications.filter(n => n.userId === user.id).sort((a, b) => b.timestamp.localeCompare(a.timestamp));
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
      
      content += `ACTIVITY LOG (QUIZZES):\n`;
      (user.quizAttempts || []).forEach(a => {
        const subTopic = topics.flatMap(t => t.subTopics).find(st => st.id === a.subTopicId);
        content += `[${a.timestamp}] ${subTopic?.title || 'Quiz'}: ${a.score}/${a.total} (${a.passed ? 'PASSED' : 'FAILED'})\n`;
        if (a.wrongAnswers && a.wrongAnswers.length > 0) {
          content += `  Wrong Answers: ${a.wrongAnswers.join(', ')}\n`;
        }
      });

      if (userNotifications.length > 0) {
        content += `\nEXERCISE SUBMISSIONS:\n`;
        userNotifications.forEach(n => {
          content += `[${n.timestamp}] ${n.subTopicTitle} (${n.topicTitle})\n`;
          if (n.evaluated) {
            content += `  Grade: ${n.grade}/100\n`;
            if (n.feedback) content += `  Feedback: "${n.feedback}"\n`;
          } else {
            content += `  Status: Pending Evaluation\n`;
          }
        });
      }
    } else {
      content = "Type,Timestamp,Module/Exercise,Score/Grade,Total/Max,Passed/Evaluated,Details\n";
      // Quizzes
      (user.quizAttempts || []).forEach(a => {
        const subTopic = topics.flatMap(t => t.subTopics).find(st => st.id === a.subTopicId);
        content += `"Quiz","${a.timestamp}","${subTopic?.title || 'Quiz'}",${a.score},${a.total},${a.passed},"${(a.wrongAnswers || []).join(';')}"\n`;
      });
      // Exercises
      userNotifications.forEach(n => {
        content += `"Exercise","${n.timestamp}","${n.subTopicTitle}",${n.evaluated ? n.grade : ''},100,${n.evaluated},"${n.feedback || ''}"\n`;
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
      <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 text-[10px] rounded shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 ${theme === 'dark' ? 'bg-slate-800 text-white' : 'bg-white text-slate-900 border border-slate-200'}`}>
        <div className="font-bold mb-1">{title}</div>
        {description}
      </div>
    </div>
  );

  return (
    <div className={`max-w-7xl mx-auto space-y-8 pb-20 print:p-0 print:m-0 print:bg-white ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
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

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 no-print">
        <div className="w-full sm:w-auto space-y-4">
          <div>
            <h2 className={`text-xl sm:text-3xl font-bold tracking-tight break-words ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>User Performance Analytics</h2>
            <p className="text-xs sm:text-slate-400 mt-1">Comprehensive overview of student progress and evaluation.</p>
            <p className="text-[9px] sm:text-[10px] text-slate-500 mt-1 italic max-w-2xl">
              * Group Average is based on the currently filtered set of students. If no tags are selected, it represents all accounts.
            </p>
          </div>

          {/* Tab Toggle */}
          <div className={`inline-flex p-1 rounded-xl border ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200 shadow-sm'}`}>
            <button
              onClick={() => setAnalyticsTab('STATS')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                analyticsTab === 'STATS'
                  ? theme === 'dark' ? 'bg-slate-800 text-blue-400 shadow-lg' : 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <BarChart3 size={14} />
              Statistics
            </button>
            <button
              onClick={() => setAnalyticsTab('SUBMISSIONS')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                analyticsTab === 'SUBMISSIONS'
                  ? theme === 'dark' ? 'bg-slate-800 text-blue-400 shadow-lg' : 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <FileText size={14} />
              Submissions
            </button>
          </div>
        </div>
        <div className="flex gap-2 w-full sm:w-auto overflow-x-auto no-scrollbar pb-1 sm:pb-0 shrink-0">
          <select 
            className={`rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-sm font-medium shadow-sm outline-none focus:border-blue-500 shrink-0 ${theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-700'}`}
            value={exportFormat}
            onChange={(e) => setExportFormat(e.target.value as any)}
          >
            <option value="print">Print Full Report</option>
            <option value="text">Export as Text</option>
            <option value="csv">Export as CSV</option>
          </select>
          <button 
            onClick={handleExport}
            className="bg-blue-600 hover:bg-blue-500 text-white px-3 sm:px-5 py-1.5 sm:py-2 rounded-lg text-[10px] sm:text-sm font-bold flex items-center gap-2 shadow-xl shadow-blue-900/20 transition-all active:scale-95 shrink-0"
          >
            <Download size={14} className="sm:w-[18px] sm:h-[18px]" /> {exportFormat === 'print' ? 'Report' : 'Export'}
          </button>
        </div>
      </div>

      {/* Main Content */}
      {analyticsTab === 'STATS' && (
        <>
          {/* Filters */}
          <div className={`p-4 sm:p-6 rounded-2xl no-print border ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
        <div className="flex items-center gap-3 mb-4">
          <Search size={16} className={theme === 'dark' ? 'text-slate-500' : 'text-slate-400'} />
          <h3 className={`text-xs sm:text-sm font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Filter by Tags</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {allTags.length > 0 ? allTags.map(tag => (
            <button
              key={tag}
              onClick={() => toggleTag(tag)}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all border ${
                selectedTags.includes(tag) 
                ? 'shadow-md shadow-blue-900/20 text-white' 
                : theme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700' : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
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
          <div className={`p-4 sm:p-6 rounded-2xl border ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'} print-break-inside-avoid`}>
            <div className={`text-[10px] sm:text-xs font-bold uppercase tracking-widest mb-1 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Avg. Group Progress</div>
            <div className={`text-2xl sm:text-4xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{avgGroupProgress}%</div>
            <div className={`mt-4 h-2 rounded-full overflow-hidden ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'}`}>
              <div className="h-full bg-blue-500 rounded-full" style={{ width: `${avgGroupProgress}%` }}></div>
            </div>
          </div>
          <div className={`p-4 sm:p-6 rounded-2xl border ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'} print-break-inside-avoid`}>
            <div className={`text-[10px] sm:text-xs font-bold uppercase tracking-widest mb-1 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Avg. Quiz Score</div>
            <div className={`text-2xl sm:text-4xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{avgGroupScore}%</div>
            <div className={`mt-4 h-2 rounded-full overflow-hidden ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'}`}>
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${avgGroupScore}%` }}></div>
            </div>
          </div>

          <div className={`p-4 sm:p-8 rounded-2xl print-break-inside-avoid overflow-hidden border ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div className="flex items-center gap-2">
                <h3 className={`text-xs sm:text-sm font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Performance Comparison</h3>
                  <div className="flex gap-1 no-print">
                    <button 
                      onClick={() => downloadDataAsCSV(groupPerformance, 'group_performance')}
                      className={`p-1.5 rounded-lg transition-all ${theme === 'dark' ? 'text-slate-500 hover:text-blue-400 hover:bg-slate-800' : 'text-slate-400 hover:text-blue-600 hover:bg-slate-100'}`}
                      title="Export Graph Data as CSV"
                    >
                      <Download size={12} className="sm:w-[14px] sm:h-[14px]" />
                    </button>
                    <button 
                      onClick={() => downloadChartAsSVG('group-performance-chart', 'group_performance')}
                      className={`p-1.5 rounded-lg transition-all ${theme === 'dark' ? 'text-slate-500 hover:text-blue-400 hover:bg-slate-800' : 'text-slate-400 hover:text-blue-600 hover:bg-slate-100'}`}
                      title="Export Graph as SVG"
                    >
                      <FileCode size={12} className="sm:w-[14px] sm:h-[14px]" />
                    </button>
                  </div>
              </div>
              <div className="flex gap-2 w-full sm:w-auto overflow-x-auto no-scrollbar pb-1 sm:pb-0">
                <select 
                  className={`text-[9px] sm:text-[10px] font-bold border rounded px-2 py-1 outline-none focus:border-blue-500 shrink-0 ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-700'}`}
                  value={graphType}
                  onChange={(e) => setGraphType(e.target.value as any)}
                >
                  <option value="bar">Bar Chart</option>
                  <option value="line">Line Chart</option>
                  <option value="area">Area Chart</option>
                </select>
                <select 
                  className={`text-[9px] sm:text-[10px] font-bold border rounded px-2 py-1 outline-none focus:border-blue-500 shrink-0 ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-700'}`}
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
              <div className="h-[250px] sm:h-[350px]" id="group-performance-chart">
                <ResponsiveContainer width="100%" height="100%">
                  {graphType === 'bar' ? (
                    <BarChart data={groupPerformance} margin={{ top: 10, right: 10, left: 0, bottom: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#1e293b' : '#e2e8f0'} />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 8, fill: theme === 'dark' ? '#64748b' : '#94a3b8' }} 
                        angle={-45}
                        textAnchor="end"
                        interval="preserveStartEnd"
                      />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 8, fill: theme === 'dark' ? '#64748b' : '#94a3b8' }} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: theme === 'dark' ? '#0f172a' : '#ffffff', border: `1px solid ${theme === 'dark' ? '#1e293b' : '#e2e8f0'}`, borderRadius: '12px', color: theme === 'dark' ? '#fff' : '#0f172a', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)' }}
                        itemStyle={{ fontSize: '10px', color: theme === 'dark' ? '#fff' : '#0f172a', padding: '2px 0' }}
                        labelStyle={{ color: '#94a3b8', fontWeight: 'bold', marginBottom: '4px', fontSize: '11px' }}
                        cursor={{ fill: theme === 'dark' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.03)', radius: 8 }}
                        wrapperStyle={{ outline: 'none' }}
                      />
                      {graphMetric !== 'both' && <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '10px' }} />}
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
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#1e293b' : '#e2e8f0'} />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: theme === 'dark' ? '#64748b' : '#94a3b8' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: theme === 'dark' ? '#64748b' : '#94a3b8' }} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: theme === 'dark' ? '#0f172a' : '#ffffff', border: `1px solid ${theme === 'dark' ? '#1e293b' : '#e2e8f0'}`, borderRadius: '12px', color: theme === 'dark' ? '#fff' : '#0f172a', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)' }}
                        itemStyle={{ fontSize: '12px', color: theme === 'dark' ? '#fff' : '#0f172a', padding: '2px 0' }}
                        labelStyle={{ color: '#94a3b8', fontWeight: 'bold', marginBottom: '4px' }}
                        wrapperStyle={{ outline: 'none' }}
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
                    <AreaChart data={groupPerformance} margin={{ top: 10, right: 10, left: 0, bottom: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#1e293b' : '#e2e8f0'} />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 8, fill: theme === 'dark' ? '#64748b' : '#94a3b8' }} 
                        angle={-45}
                        textAnchor="end"
                        interval="preserveStartEnd"
                      />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 8, fill: theme === 'dark' ? '#64748b' : '#94a3b8' }} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: theme === 'dark' ? '#0f172a' : '#ffffff', border: `1px solid ${theme === 'dark' ? '#1e293b' : '#e2e8f0'}`, borderRadius: '12px', color: theme === 'dark' ? '#fff' : '#0f172a', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)' }}
                        itemStyle={{ fontSize: '12px', color: theme === 'dark' ? '#fff' : '#0f172a', padding: '2px 0' }}
                        labelStyle={{ color: '#94a3b8', fontWeight: 'bold', marginBottom: '4px' }}
                        wrapperStyle={{ outline: 'none' }}
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

          <div className={`p-4 sm:p-8 rounded-2xl border shadow-sm print-break-inside-avoid overflow-hidden ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div className="flex items-center gap-2">
                <h3 className={`text-xs sm:text-sm font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Learning Timeline</h3>
                <div className="flex gap-1 no-print">
                  <button 
                    onClick={() => downloadDataAsCSV(timelineData[0]?.dataPoints || [], 'group_timeline')}
                    className={`p-1.5 rounded-lg transition-all no-print ${theme === 'dark' ? 'text-slate-500 hover:text-blue-400 hover:bg-slate-800' : 'text-slate-400 hover:text-blue-600 hover:bg-slate-100'}`}
                    title="Export Graph Data as CSV"
                  >
                    <Download size={12} className="sm:w-[14px] sm:h-[14px]" />
                  </button>
                    <button 
                      onClick={() => downloadChartAsSVG('group-timeline-chart', 'group_timeline')}
                      className={`p-1.5 rounded-lg transition-all no-print ${theme === 'dark' ? 'text-slate-500 hover:text-blue-400 hover:bg-slate-800' : 'text-slate-400 hover:text-blue-600 hover:bg-slate-100'}`}
                      title="Export Graph as SVG"
                    >
                      <FileCode size={12} className="sm:w-[14px] sm:h-[14px]" />
                    </button>
                  </div>
              </div>
              <div className="flex gap-2 w-full sm:w-auto overflow-x-auto no-scrollbar pb-1 sm:pb-0">
                <select 
                  className={`text-[9px] sm:text-[10px] font-bold border rounded px-2 py-1 outline-none focus:border-blue-500 shrink-0 ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-700'}`}
                  value={timelineMetric}
                  onChange={(e) => setTimelineMetric(e.target.value as any)}
                >
                  <option value="progress">Progress Timeline</option>
                  <option value="avgScore">Avg Score Timeline</option>
                </select>
              </div>
            </div>
            
            {timelineData.length > 0 ? (
              <div className="h-[250px] sm:h-[350px]" id="group-timeline-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart margin={{ top: 20, right: 10, left: -20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#1e293b' : '#e2e8f0'} />
                    <XAxis 
                      type="number" 
                      dataKey="timestamp" 
                      domain={['auto', 'auto']} 
                      tickFormatter={(t) => new Date(t).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' })}
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 8, fill: theme === 'dark' ? '#64748b' : '#94a3b8' }}
                      angle={-45}
                      textAnchor="end"
                      height={50}
                    />
                    <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 8, fill: theme === 'dark' ? '#64748b' : '#94a3b8' }} />
                    <Tooltip 
                      content={<CustomTimelineTooltip />} 
                      shared={false}
                      trigger="hover"
                      wrapperStyle={{ outline: 'none' }}
                      cursor={{ stroke: '#3b82f6', strokeWidth: 1, strokeDasharray: '4 4' }}
                    />
                    <Legend 
                      iconType="circle" 
                      wrapperStyle={{ paddingTop: '30px', fontSize: '10px', width: '100%' }} 
                      layout="horizontal" 
                      align="center" 
                      verticalAlign="bottom"
                    />
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
          <div className={`p-4 sm:p-8 rounded-2xl border shadow-sm print-break-inside-avoid overflow-hidden ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div className="flex items-center gap-2">
                <h3 className={`text-xs sm:text-sm font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Quiz Performance Overview</h3>
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
                    className={`p-1.5 rounded-lg transition-all no-print ${theme === 'dark' ? 'text-slate-500 hover:text-blue-400 hover:bg-slate-800' : 'text-slate-400 hover:text-blue-600 hover:bg-slate-100'}`}
                    title="Export Graph Data as CSV"
                  >
                    <Download size={12} className="sm:w-[14px] sm:h-[14px]" />
                  </button>
                    <button 
                      onClick={() => downloadChartAsSVG('quiz-performance-chart', 'quiz_performance')}
                      className={`p-1.5 rounded-lg transition-all no-print ${theme === 'dark' ? 'text-slate-500 hover:text-blue-400 hover:bg-slate-800' : 'text-slate-400 hover:text-blue-600 hover:bg-slate-100'}`}
                      title="Export Graph as SVG"
                    >
                      <FileCode size={12} className="sm:w-[14px] sm:h-[14px]" />
                    </button>
                  </div>
              </div>
              <div className="text-[9px] sm:text-[10px] text-slate-500 font-bold uppercase tracking-widest italic">
                Click columns for question-level breakdown
              </div>
            </div>
            
            {quizPerformanceOverview.length > 0 ? (
              <div className="h-[250px] sm:h-[350px]" id="quiz-performance-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={quizPerformanceOverview} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#1e293b' : '#e2e8f0'} />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 8, fill: theme === 'dark' ? '#64748b' : '#94a3b8' }} 
                      angle={-45}
                      textAnchor="end"
                      height={60}
                      interval={0}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 8, fill: theme === 'dark' ? '#64748b' : '#94a3b8' }}
                    />
                    <Tooltip 
                      cursor={{ fill: theme === 'dark' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.03)', radius: 8 }}
                      contentStyle={{ backgroundColor: theme === 'dark' ? '#0f172a' : '#ffffff', border: `1px solid ${theme === 'dark' ? '#1e293b' : '#e2e8f0'}`, borderRadius: '12px', color: theme === 'dark' ? '#fff' : '#0f172a', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)' }}
                      itemStyle={{ fontSize: '10px', color: theme === 'dark' ? '#fff' : '#0f172a', padding: '2px 0' }}
                      labelStyle={{ color: '#94a3b8', fontWeight: 'bold', marginBottom: '4px', fontSize: '11px' }}
                      formatter={(value: any) => [`${value}%`, 'Avg Score']}
                      wrapperStyle={{ outline: 'none' }}
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

        </div>

        {/* Right: Individual Evaluation */}
        <div className={`space-y-8 ${isPrinting ? 'no-print' : ''}`}>
          <div className={`rounded-2xl border shadow-sm overflow-hidden print-break-inside-avoid ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
            <div className={`p-6 border-b flex justify-between items-center ${theme === 'dark' ? 'border-slate-800' : 'border-slate-100'}`}>
              <div className="flex items-center gap-2">
                <h3 className={`text-sm font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Student List ({filteredUsers.length})</h3>
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
                  className={`p-1.5 rounded-lg transition-all no-print ${theme === 'dark' ? 'text-slate-500 hover:text-blue-400 hover:bg-slate-800' : 'text-slate-400 hover:text-blue-600 hover:bg-slate-100'}`}
                  title="Export Table as CSV"
                >
                  <Download size={14} />
                </button>
                <button 
                  onClick={() => downloadTableAsSVG('main-student-table', 'student_list')}
                  className={`p-1.5 rounded-lg transition-all no-print ${theme === 'dark' ? 'text-slate-500 hover:text-blue-400 hover:bg-slate-800' : 'text-slate-400 hover:text-blue-600 hover:bg-slate-100'}`}
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
                  <tr className={`text-[10px] uppercase font-bold tracking-widest ${theme === 'dark' ? 'bg-slate-950 text-slate-500' : 'bg-slate-50 text-slate-400'}`}>
                    <th className="px-6 py-4">Student</th>
                    <th className="px-6 py-4">Progress</th>
                    <th className="px-6 py-4">Avg Score</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${theme === 'dark' ? 'divide-slate-800' : 'divide-slate-100'}`}>
                  {filteredUsers.map(u => {
                    const data = getPerformanceData(u);
                    return (
                      <tr key={u.id} className={`transition-colors cursor-pointer ${selectedUserId === u.id ? (theme === 'dark' ? 'bg-blue-900/20' : 'bg-blue-50') : (theme === 'dark' ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50')}`} onClick={() => setSelectedUserId(u.id)}>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm shrink-0"
                              style={{ backgroundColor: u.profileColor || getTagColor(u.tags || []) }}
                            >
                              {u.name[0]}
                            </div>
                            <div className="min-w-0">
                              <div className={`text-sm font-bold truncate ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{u.name}</div>
                              <div className="text-[10px] text-slate-500 truncate">{u.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-xs font-bold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>{data.progress}%</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-xs font-bold ${data.avgScore >= 80 ? 'text-emerald-400' : data.avgScore >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
                            {data.avgScore}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>


          {selectedUser ? (
            <div className={`rounded-2xl border shadow-sm overflow-hidden sticky top-8 print-break-inside-avoid ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
              <div className={`p-6 border-b flex justify-between items-center ${theme === 'dark' ? 'border-slate-800 bg-slate-950/50' : 'border-slate-100 bg-slate-50/50'}`}>
                <h3 className={`text-sm font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Student Evaluation</h3>
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
                  <h4 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{selectedUser.name}</h4>
                  <p className="text-slate-500 text-sm">{selectedUser.email}</p>
                  <div className="flex flex-wrap justify-center gap-1 mt-3">
                    {(selectedUser.tags || []).map(t => (
                      <span key={t} className="px-2 py-0.5 text-white rounded text-[10px] font-bold border border-transparent" style={{ backgroundColor: tagColors[t] || '#3b82f6' }}>{t}</span>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50/50 border-slate-100'}`}>
                    <div className="text-[10px] font-bold text-slate-500 uppercase mb-1 flex items-center">
                      Progress <MetricInfo title="Progress" description="Formula: (Completed Modules / Total Modules) * 100. Represents the percentage of the curriculum finished." />
                    </div>
                    <div className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{getPerformanceData(selectedUser).progress}%</div>
                  </div>
                  <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-slate-950/50 border-slate-800' : 'bg-white border-slate-100'}`}>
                    <div className="text-[10px] font-bold text-slate-500 uppercase mb-1 flex items-center">
                      Accuracy <MetricInfo title="Accuracy" description="Formula: (Total Correct Answers / Total Questions) * 100 across all quiz attempts. Measures technical precision." />
                    </div>
                    <div className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{getPerformanceData(selectedUser).avgScore}%</div>
                  </div>
                </div>

                {/* Individual Timeline */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Learning Timeline</h5>
                    <div className="flex gap-1 no-print">
                      <button 
                        onClick={() => downloadDataAsCSV(getTimelineData([selectedUser])[0].dataPoints, `${selectedUser.name}_timeline`)}
                        className={`p-1 rounded transition-all no-print ${theme === 'dark' ? 'text-slate-500 hover:text-blue-400 hover:bg-slate-800' : 'text-slate-400 hover:text-blue-600 hover:bg-slate-100'}`}
                        title="Export Graph Data as CSV"
                      >
                        <Download size={12} />
                      </button>
                      <button 
                        onClick={() => downloadChartAsSVG('individual-timeline-chart', `${selectedUser.name}_timeline`)}
                        className={`p-1 rounded transition-all no-print ${theme === 'dark' ? 'text-slate-500 hover:text-blue-400 hover:bg-slate-800' : 'text-slate-400 hover:text-blue-600 hover:bg-slate-100'}`}
                        title="Export Graph as SVG"
                      >
                        <FileCode size={12} />
                      </button>
                    </div>
                  </div>
                  <div className={`h-[150px] w-full rounded-xl p-2 border ${theme === 'dark' ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-100'}`} id="individual-timeline-chart">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={getTimelineData([selectedUser])[0].dataPoints}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#1e293b' : '#e2e8f0'} />
                        <XAxis 
                          type="number" 
                          dataKey="timestamp" 
                          domain={['auto', 'auto']} 
                          tickFormatter={(t) => new Date(t).toLocaleDateString()}
                          tick={{ fontSize: 8, fill: theme === 'dark' ? '#64748b' : '#94a3b8' }}
                          minTickGap={20}
                        />
                        <YAxis domain={[0, 100]} hide={true} />
                      <Tooltip 
                        labelFormatter={(t) => new Date(t).toLocaleString()}
                        contentStyle={{ backgroundColor: theme === 'dark' ? '#0f172a' : '#ffffff', border: `1px solid ${theme === 'dark' ? '#1e293b' : '#e2e8f0'}`, borderRadius: '12px', color: theme === 'dark' ? '#fff' : '#0f172a', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)' }}
                        itemStyle={{ fontSize: '10px', color: theme === 'dark' ? '#fff' : '#0f172a' }}
                        wrapperStyle={{ outline: 'none' }}
                        cursor={{ stroke: '#3b82f6', strokeWidth: 1, strokeDasharray: '4 4' }}
                      />
                        <Line 
                          type="monotone" 
                          dataKey="progress" 
                          stroke="#3b82f6" 
                          strokeWidth={2} 
                          dot={(props: any) => {
                            const { cx, cy, payload } = props;
                            if (payload.type === 'module') return <circle cx={cx} cy={cy} r={3} fill={theme === 'dark' ? '#0f172a' : '#ffffff'} stroke="#3b82f6" strokeWidth={1} />;
                            if (payload.type === 'quiz') return <circle cx={cx} cy={cy} r={3} fill={payload.passed ? '#10b981' : '#ef4444'} />;
                            return null;
                          }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex justify-center gap-4 text-[9px] text-slate-500 font-bold uppercase">
                    <div className="flex items-center gap-1"><div className={`w-2 h-2 rounded-full border border-blue-400 ${theme === 'dark' ? 'bg-slate-900' : 'bg-white'}`}></div> Module</div>
                    <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Passed</div>
                    <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500"></div> Failed</div>
                  </div>
                </div>

                {selectedUser ? (
                  <div className="space-y-8">
                    <div className="flex justify-between items-center">
                      <h5 className={`text-[10px] font-bold uppercase tracking-widest ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Skill Radar (vs Group Avg)</h5>
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
                          className={`p-1 rounded transition-all no-print ${theme === 'dark' ? 'text-slate-500 hover:text-blue-400 hover:bg-slate-800' : 'text-slate-400 hover:text-blue-600 hover:bg-slate-100'}`}
                          title="Export Graph Data as CSV"
                        >
                          <Download size={12} />
                        </button>
                        <button 
                          onClick={() => downloadChartAsSVG('individual-radar-chart', `${selectedUser.name}_radar`)}
                          className={`p-1 rounded transition-all no-print ${theme === 'dark' ? 'text-slate-500 hover:text-blue-400 hover:bg-slate-800' : 'text-slate-400 hover:text-blue-600 hover:bg-slate-100'}`}
                          title="Export Graph as SVG"
                        >
                          <FileCode size={12} />
                        </button>
                      </div>
                    </div>
                    {(selectedUser.quizAttempts || []).length > 0 ? (
                      <div className="h-[200px] w-full" id="individual-radar-chart">
                        <ResponsiveContainer width="100%" height="100%">
                          <RadarChart cx="50%" cy="50%" outerRadius="65%" data={[
                            { subject: 'Progress', A: getPerformanceData(selectedUser).progress, B: avgGroupProgress, fullMark: 100 },
                            { subject: 'Accuracy', A: getPerformanceData(selectedUser).avgScore, B: avgGroupScore, fullMark: 100 },
                            { subject: 'Engagement', A: Math.round(getPerformanceData(selectedUser).engagement), B: Math.min(100, (groupPerformance.reduce((acc, p) => acc + p.quizzes, 0) / (groupPerformance.length || 1)) * 10), fullMark: 100 },
                            { subject: 'Consistency', A: Math.round(getPerformanceData(selectedUser).consistency), B: 80, fullMark: 100 },
                            { subject: 'Speed', A: Math.round(getPerformanceData(selectedUser).speed), B: 75, fullMark: 100 },
                          ]}>
                            <PolarGrid stroke={theme === 'dark' ? '#1e293b' : '#e2e8f0'} />
                            <PolarAngleAxis dataKey="subject" tick={{ fontSize: 8, fill: theme === 'dark' ? '#64748b' : '#94a3b8' }} />
                            <Tooltip 
                              contentStyle={{ backgroundColor: theme === 'dark' ? '#0f172a' : '#ffffff', border: `1px solid ${theme === 'dark' ? '#1e293b' : '#e2e8f0'}`, borderRadius: '12px', color: theme === 'dark' ? '#fff' : '#0f172a', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)' }}
                              itemStyle={{ fontSize: '10px', color: theme === 'dark' ? '#fff' : '#0f172a', padding: '2px 0' }}
                              labelStyle={{ color: theme === 'dark' ? '#94a3b8' : '#64748b', fontWeight: 'bold', marginBottom: '4px', fontSize: '11px' }}
                              wrapperStyle={{ outline: 'none' }}
                            />
                            <Radar name={selectedUser.name} dataKey="A" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
                            <Radar name="Group Avg" dataKey="B" stroke="#64748b" fill="#64748b" fillOpacity={0.3} />
                            <Legend iconType="circle" wrapperStyle={{ fontSize: '9px', color: theme === 'dark' ? '#64748b' : '#94a3b8', paddingTop: '10px' }} />
                          </RadarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className={`h-[200px] flex flex-col items-center justify-center rounded-xl border border-dashed ${theme === 'dark' ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                        <BarChart3 size={24} className={theme === 'dark' ? 'text-slate-700' : 'text-slate-300'} />
                        <p className="text-[10px] text-slate-500 italic">No quiz data to generate radar chart.</p>
                      </div>
                    )}
                  </div>
                ) : null}

                <div className="space-y-4">
                  <h5 className={`text-[10px] font-bold uppercase tracking-widest ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Performance Metrics</h5>
                  <div className="grid grid-cols-1 gap-2">
                    <div className={`flex justify-between items-center p-2 rounded border ${theme === 'dark' ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
                      <span className={`text-[10px] font-medium flex items-center ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                        Consistency <MetricInfo title="Consistency" description="Formula: (Unique Active Days in last 7 days / 7) * 100. Measures regularity of engagement." />
                      </span>
                      <span className={`text-xs font-bold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>{Math.round(getPerformanceData(selectedUser).consistency)}%</span>
                    </div>
                    <div className={`flex justify-between items-center p-2 rounded border ${theme === 'dark' ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
                      <span className={`text-[10px] font-medium flex items-center ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                        Engagement <MetricInfo title="Engagement" description="Formula: (Total Quiz Attempts / Total Curriculum Modules) * 100. Measures depth of interaction." />
                      </span>
                      <span className={`text-xs font-bold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>{Math.round(getPerformanceData(selectedUser).engagement)}%</span>
                    </div>
                    <div className={`flex justify-between items-center p-2 rounded border ${theme === 'dark' ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
                      <span className={`text-[10px] font-medium flex items-center ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                        Speed <MetricInfo title="Speed" description="Formula: 100 - (Avg Time per Quiz / 240 seconds) * 100. Measures efficiency in technical tasks." />
                      </span>
                      <span className={`text-xs font-bold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>{Math.round(getPerformanceData(selectedUser).speed)}%</span>
                    </div>
                  </div>
                </div>

                {/* Module Completion History */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h5 className={`text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
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
                      className={`p-1 rounded transition-all no-print ${theme === 'dark' ? 'text-slate-500 hover:text-blue-400 hover:bg-slate-800' : 'text-slate-400 hover:text-blue-600 hover:bg-slate-100'}`}
                      title="Export Table as CSV"
                    >
                      <Download size={12} />
                    </button>
                  </div>
                  <div className={`rounded-xl border p-4 max-h-48 overflow-y-auto space-y-2 ${theme === 'dark' ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
                    {(selectedUser.completedSubTopics || []).length > 0 ? (
                      [...(selectedUser.completedSubTopics || [])]
                        .sort((a, b) => (b.completedAt || '').localeCompare(a.completedAt || ''))
                        .map(record => {
                          const subTopic = topics.flatMap(t => t.subTopics).find(st => st.id === record.id);
                          return (
                            <div key={record.id} className={`flex justify-between items-center text-[11px] pb-2 last:border-0 last:pb-0 border-b ${theme === 'dark' ? 'border-slate-800' : 'border-slate-200'}`}>
                              <span className={`font-medium truncate max-w-[180px] ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>{subTopic?.title || 'Unknown Module'}</span>
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
                    <h5 className={`text-[10px] font-bold uppercase tracking-widest ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Detailed Activity Log</h5>
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
                      className={`p-1 rounded transition-all no-print ${theme === 'dark' ? 'text-slate-500 hover:text-blue-400 hover:bg-slate-800' : 'text-slate-400 hover:text-blue-600 hover:bg-slate-100'}`}
                      title="Export Table as CSV"
                    >
                      <Download size={12} />
                    </button>
                  </div>
                  
                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                    {/* Submissions Section */}
                    {notifications.filter(n => n.userId === selectedUser.id).length > 0 && (
                      <div className="space-y-2">
                        <div className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-2">Exercise Submissions</div>
                        {notifications
                          .filter(n => n.userId === selectedUser.id)
                          .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
                          .map(notif => (
                            <div key={notif.id} className={`border rounded-lg p-3 hover:border-blue-500/50 transition-colors ${theme === 'dark' ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <div className={`text-xs font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{notif.subTopicTitle}</div>
                                  <div className="text-[10px] text-slate-500">{notif.topicTitle}</div>
                                </div>
                                <div className="text-[10px] text-slate-500 font-mono">
                                  {new Date(notif.timestamp).toLocaleString()}
                                </div>
                              </div>
                              
                              {notif.evaluated && (
                                <div className={`mb-3 p-2 border rounded ${theme === 'dark' ? 'bg-emerald-500/5 border-emerald-500/10' : 'bg-emerald-50 border-emerald-100'}`}>
                                  <div className="flex justify-between items-center mb-1">
                                    <span className="text-[9px] font-bold text-emerald-400 uppercase">Evaluation Result</span>
                                    <span className="text-xs font-bold text-emerald-400">{notif.grade}/100</span>
                                  </div>
                                  {notif.feedback && (
                                    <p className={`text-[10px] italic ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>"{notif.feedback}"</p>
                                  )}
                                </div>
                              )}

                              {/* Submission Discussion */}
                              <div className={`mt-3 pt-3 border-t ${theme === 'dark' ? 'border-slate-800' : 'border-slate-200'}`}>
                                <div className="flex items-center gap-2 mb-2">
                                  <MessageSquare size={10} className="text-blue-400" />
                                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Internal Discussion</span>
                                </div>
                                <div className="space-y-2 max-h-[150px] overflow-y-auto mb-2 pr-1 custom-scrollbar">
                                  {notif.comments && notif.comments.length > 0 ? (
                                    notif.comments.map(comment => (
                                      <div key={comment.id} className={`group relative rounded p-2 border ${theme === 'dark' ? 'bg-slate-900/50 border-slate-800/50' : 'bg-white border-slate-100'}`}>
                                        <div className="flex justify-between items-start mb-1">
                                          <div className="flex items-center gap-1.5">
                                            <img src={comment.avatar || undefined} alt={comment.user} className="w-4 h-4 rounded" />
                                            <span className={`text-[9px] font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{comment.user}</span>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <span className="text-[8px] text-slate-600">{new Date(comment.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            {onDeleteComment && (
                                              <button 
                                                onClick={() => onDeleteComment(notif.submissionId, comment.id, true)}
                                                className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-400 transition-all"
                                              >
                                                <Trash2 size={10} />
                                              </button>
                                            )}
                                          </div>
                                        </div>
                                        <p className={`text-[10px] leading-relaxed ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>{comment.text}</p>
                                      </div>
                                    ))
                                  ) : (
                                    <p className="text-[9px] text-slate-600 italic">No comments yet.</p>
                                  )}
                                </div>
                                <div className="flex gap-2">
                                  <input 
                                    type="text"
                                    value={commentInputs[notif.submissionId] || ''}
                                    onChange={e => setCommentInputs(prev => ({ ...prev, [notif.submissionId]: e.target.value }))}
                                    onKeyDown={e => {
                                      if (e.key === 'Enter' && commentInputs[notif.submissionId]?.trim() && onPostSubmissionComment) {
                                        onPostSubmissionComment(notif.submissionId, commentInputs[notif.submissionId]);
                                        setCommentInputs(prev => ({ ...prev, [notif.submissionId]: '' }));
                                      }
                                    }}
                                    placeholder="Reply to student..."
                                    className={`flex-1 rounded px-2 py-1 text-[10px] outline-none focus:ring-1 focus:ring-blue-500 transition-all ${theme === 'dark' ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
                                  />
                                  <button 
                                    onClick={() => {
                                      if (commentInputs[notif.submissionId]?.trim() && onPostSubmissionComment) {
                                        onPostSubmissionComment(notif.submissionId, commentInputs[notif.submissionId]);
                                        setCommentInputs(prev => ({ ...prev, [notif.submissionId]: '' }));
                                      }
                                    }}
                                    disabled={!commentInputs[notif.submissionId]?.trim()}
                                    className={`w-6 h-6 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white rounded flex items-center justify-center transition-all`}
                                  >
                                    <Send size={10} />
                                  </button>
                                </div>
                              </div>

                              <div className="flex flex-wrap gap-2 mt-2">
                                {notif.files.map((file, fIdx) => (
                                  <a 
                                    key={fIdx}
                                    href={file.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] transition-colors border ${theme === 'dark' ? 'bg-slate-900 hover:bg-slate-800 text-blue-300 border-slate-800' : 'bg-white hover:bg-slate-50 text-blue-600 border-slate-200'}`}
                                  >
                                    <Download size={10} /> {file.name}
                                  </a>
                                ))}
                              </div>
                            </div>
                          ))
                        }
                      </div>
                    )}

                    {/* Quiz Attempts Section */}
                    {(selectedUser.quizAttempts || []).length > 0 && (
                      <div className="space-y-2 mt-4">
                        <div className="text-[10px] font-bold text-purple-400 uppercase tracking-widest mb-2">Quiz History</div>
                        {[...(selectedUser.quizAttempts || [])]
                          .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
                          .map((a, i) => {
                            const subTopic = topics.flatMap(t => t.subTopics).find(st => st.id === a.subTopicId);
                            return (
                              <div key={i} className={`p-3 rounded-lg border ${theme === 'dark' ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
                                <div className="flex items-center justify-between mb-2">
                                  <div className={`text-xs font-bold truncate ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>{subTopic?.title || 'Quiz'}</div>
                                  <div className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${a.passed ? 'bg-emerald-900/30 text-emerald-400' : 'bg-red-900/30 text-red-400'}`}>
                                    {a.passed ? 'PASSED' : 'FAILED'}
                                  </div>
                                </div>
                                <div className="flex justify-between text-[10px] text-slate-500">
                                  <span>Score: {a.score}/{a.total}</span>
                                  <span>{new Date(a.timestamp).toLocaleString()}</span>
                                </div>
                              </div>
                            );
                          })
                        }
                      </div>
                    )}

                    {!(selectedUser.quizAttempts || []).length && 
                     !notifications.filter(n => n.userId === selectedUser.id).length && (
                      <p className="text-xs text-slate-500 italic text-center py-4">No activity recorded for this student.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className={`rounded-2xl border border-dashed p-12 text-center flex flex-col items-center justify-center h-[600px] no-print ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${theme === 'dark' ? 'bg-slate-950 text-slate-700' : 'bg-slate-50 text-slate-300'}`}>
                <Users size={32} />
              </div>
              <h4 className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Select a student to show analytics</h4>
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
                  <img src={landingConfig.appLogoUrl || undefined} alt="Logo" className="h-12 w-auto ml-auto mb-2 object-contain" />
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
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                          itemStyle={{ fontSize: '12px', color: '#1e293b' }}
                          labelStyle={{ fontWeight: 'bold', color: '#64748b' }}
                          cursor={{ fill: 'rgba(0, 0, 0, 0.02)', radius: 8 }}
                          wrapperStyle={{ outline: 'none' }}
                        />
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
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                          itemStyle={{ fontSize: '12px', color: '#1e293b' }}
                          labelStyle={{ fontWeight: 'bold', color: '#64748b' }}
                          cursor={{ fill: 'rgba(0, 0, 0, 0.02)', radius: 8 }}
                          wrapperStyle={{ outline: 'none' }}
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
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                          itemStyle={{ fontSize: '12px', color: '#1e293b' }}
                          labelStyle={{ fontWeight: 'bold', color: '#64748b' }}
                          wrapperStyle={{ outline: 'none' }}
                        />
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

                  {notifications.filter(n => n.userId === selectedUserForPrint.id).length > 0 && (
                    <div className="print-card print-break-inside-avoid">
                      <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold mb-0 flex items-center gap-2 text-blue-600">
                          Exercise Submissions
                        </h3>
                      </div>
                      <table className="print-table">
                        <thead>
                          <tr>
                            <th>Module / Exercise</th>
                            <th>Date</th>
                            <th>Evaluation</th>
                          </tr>
                        </thead>
                        <tbody>
                          {notifications
                            .filter(n => n.userId === selectedUserForPrint.id)
                            .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
                            .map(notif => (
                              <tr key={notif.id}>
                                <td>
                                  <div className="font-medium">{notif.subTopicTitle}</div>
                                  <div className="text-[9px] text-slate-400">{notif.topicTitle}</div>
                                </td>
                                <td>{new Date(notif.timestamp).toLocaleString()}</td>
                                <td>
                                  {notif.evaluated ? (
                                    <div>
                                      <div className="font-bold text-emerald-600">{notif.grade}/100</div>
                                      {notif.feedback && <div className="text-[10px] text-slate-500 italic mt-1">"{notif.feedback}"</div>}
                                    </div>
                                  ) : (
                                    <span className="text-slate-400 italic">Pending Evaluation</span>
                                  )}
                                </td>
                              </tr>
                            ))
                          }
                        </tbody>
                      </table>
                    </div>
                  )}

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
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[9999] flex items-center justify-center p-4 no-print overflow-y-auto">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-slate-900 rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-slate-800 my-auto"
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
            
            <div className="p-6 overflow-y-auto space-y-4 bg-slate-900 custom-scrollbar">
              {quizPerformanceOverview.find(q => q.id === selectedQuizForDetails)?.questions.map((q, idx) => (
                <div key={q.id} className="bg-slate-950/50 p-5 rounded-2xl border border-slate-800 space-y-4 hover:border-slate-700 transition-colors">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{q.label}</div>
                      <h4 className="text-sm font-bold text-white leading-relaxed">{q.question}</h4>
                    </div>
                    <div className="text-right shrink-0">
                      <div className={`text-xl font-black ${q.correctPercentage >= 80 ? 'text-emerald-400' : q.correctPercentage >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
                        {q.correctPercentage}%
                      </div>
                      <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Correct</div>
                    </div>
                  </div>
                  
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700/50">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${q.correctPercentage}%` }}
                      className={`h-full rounded-full ${q.correctPercentage >= 80 ? 'bg-emerald-500' : q.correctPercentage >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                    {q.options.map((opt, i) => (
                      <div key={i} className={`flex justify-between items-center gap-2 text-[11px] p-2.5 rounded-xl border transition-all ${opt.isCorrect ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-100' : 'bg-slate-900/50 border-slate-800/50 text-slate-400'}`}>
                        <div className="flex gap-2">
                          <span className={`font-bold shrink-0 ${opt.isCorrect ? 'text-emerald-500' : 'text-slate-600'}`}>{i + 1}.</span>
                          <span className="leading-tight">{opt.text}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {opt.isCorrect && (
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                          )}
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${opt.isCorrect ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
                            {opt.pickPercentage}%
                          </span>
                        </div>
                      </div>
                    ))}
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

        </>
      )}

      {analyticsTab === 'SUBMISSIONS' && (
        <AdminSubmissionsList 
          submissions={submissions}
          onEvaluate={onEvaluateSubmission}
          onRequestResubmission={onRequestResubmission}
          onPostComment={onPostSubmissionComment}
          onDeleteComment={onDeleteComment}
          onDeleteFile={onDeleteFile}
          isAdmin={isAdmin}
          theme={theme}
        />
      )}
    </div>
  );
}

function TagManagementView({ tags, setTags, theme = 'dark' }: { tags: Tag[], setTags: React.Dispatch<React.SetStateAction<Tag[]>>, theme?: 'light' | 'dark' }) {
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
    <div className={`h-full p-8 overflow-y-auto ${theme === 'dark' ? 'bg-slate-950' : 'bg-slate-50'}`}>
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Tag Management</h2>
            <p className="text-slate-400">Create and manage user groups using tags.</p>
          </div>
        </div>

        <div className={`rounded-2xl border shadow-sm p-6 mb-8 ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <h3 className={`text-sm font-bold uppercase tracking-wider mb-4 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>Create New Tag</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Tag Name</label>
              <input 
                type="text" 
                value={newTagName}
                onChange={e => setNewTagName(e.target.value)}
                className={`w-full p-2 border rounded-lg text-sm focus:border-blue-500 outline-none ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
                placeholder="e.g. Fukuoka"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Description</label>
              <input 
                type="text" 
                value={newTagDesc}
                onChange={e => setNewTagDesc(e.target.value)}
                className={`w-full p-2 border rounded-lg text-sm focus:border-blue-500 outline-none ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
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
                  className={`h-9 w-12 p-1 border rounded-lg cursor-pointer ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}
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
            <div key={tag.id} className={`p-4 rounded-xl border shadow-sm flex items-center justify-between group transition-all ${theme === 'dark' ? 'bg-slate-900 border-slate-800 hover:border-slate-700' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: tag.color }}></div>
                <div>
                  <div className={`text-sm font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{tag.name}</div>
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
            <div className={`col-span-full py-12 text-center border border-dashed rounded-2xl ${theme === 'dark' ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
              <Sparkles size={32} className="text-slate-700 mx-auto mb-3" />
              <p className="text-slate-500">No tags created yet. Start by adding one above.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// --- NOTIFICATIONS VIEW ---
export interface NotificationsViewProps {
  notifications: AppNotification[];
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
  onEvaluate: (submissionId: string, score: number, feedback: string) => Promise<void>;
  onRequestResubmission?: (submissionId: string, feedback: string) => Promise<void>;
  onToggleCompleted?: (id: string, completed: boolean) => Promise<void>;
  onDeleteFile?: (fileUrl: string, submissionId: string, fileName: string) => Promise<void>;
  onPostSubmissionComment?: (id: string, text: string, isSubmission?: boolean) => Promise<void>;
  onNavigateToModule?: (topicId: string, subTopicId: string) => void;
  highlightedId?: string | null;
  isAdmin?: boolean;
  theme?: 'light' | 'dark';
}

export function NotificationsView({ 
  notifications, 
  onMarkRead, 
  onDelete,
  onEvaluate, 
  onRequestResubmission,
  onToggleCompleted, 
  onDeleteFile,
  onPostSubmissionComment,
  onNavigateToModule,
  highlightedId,
  isAdmin = false,
  theme = 'dark'
}: NotificationsViewProps) {
  const [evaluatingId, setEvaluatingId] = useState<string | null>(null);
  const [score, setScore] = useState<number>(0);
  const [feedback, setFeedback] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState<string | null>(null);
  const [isTogglingCompleted, setIsTogglingCompleted] = useState<string | null>(null);
  const [isDeletingNotification, setIsDeletingNotification] = useState<string | null>(null);
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [expandedReadIds, setExpandedReadIds] = useState<string[]>([]);
  const commentListRefs = useRef<Record<string, HTMLDivElement | null>>({});
  
  // Sorting states
  const [sortBy, setSortBy] = useState<'time' | 'user' | 'module'>('time');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const sortedNotifications = useMemo(() => {
    return [...notifications].sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'time') {
        const timeA = new Date(a.lastCommentTimestamp || a.timestamp).getTime();
        const timeB = new Date(b.lastCommentTimestamp || b.timestamp).getTime();
        comparison = timeA - timeB;
      } else if (sortBy === 'user') {
        comparison = a.userName.localeCompare(b.userName);
      } else if (sortBy === 'module') {
        comparison = a.subTopicTitle.localeCompare(b.subTopicTitle);
      }
      
      // If times are equal or we are sorting by something else, secondary sort by timestamp
      if (comparison === 0) {
          const tA = new Date(a.timestamp).getTime();
          const tB = new Date(b.timestamp).getTime();
          comparison = tA - tB;
      }

      return sortOrder === 'desc' ? -comparison : comparison;
    });
  }, [notifications, sortBy, sortOrder]);

  useEffect(() => {
    if (highlightedId && !expandedReadIds.includes(highlightedId)) {
      setExpandedReadIds(prev => [...prev, highlightedId]);
    }
  }, [highlightedId]);

  // Scroll to bottom when comments change
  useEffect(() => {
    notifications.forEach(notif => {
      if (expandedReadIds.includes(notif.id)) {
        const ref = commentListRefs.current[notif.id];
        if (ref) {
          ref.scrollTop = ref.scrollHeight;
        }
      }
    });
  }, [notifications, expandedReadIds]);

  const toggleExpandRead = (id: string) => {
    setExpandedReadIds(prev => {
      const isExpanding = !prev.includes(id);
      if (isExpanding) {
        // Mark as read only when expanding
        onMarkRead(id);
        return [...prev, id];
      } else {
        return prev.filter(i => i !== id);
      }
    });
  };

  const handleStartEvaluate = (notif: AppNotification) => {
    setEvaluatingId(notif.id);
    const existingGrade = typeof notif.grade === 'number' ? notif.grade : parseInt(notif.grade as string) || 0;
    setScore(existingGrade);
    setFeedback(notif.feedback || '');
  };

  const handleSubmitEvaluation = async (submissionId: string) => {
    if (score < 0 || score > 100) return;
    setIsSubmitting(true);
    try {
      await onEvaluate(submissionId, score, feedback);
      setEvaluatingId(null);
    } catch (error) {
      console.error("Evaluation failed:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownload = async (fileUrl: string, originalName: string, studentName: string, date: string, moduleName: string) => {
    setIsDownloading(fileUrl);
    try {
      const fileRef = ref(storage, fileUrl);
      const url = await getDownloadURL(fileRef);
      
      // Opening in a new tab is the fastest and most reliable method for all file sizes.
      // It bypasses client-side blob processing which can cause timeouts and memory issues.
      const newWindow = window.open(url, '_blank');
      
      // Fallback if popup is blocked
      if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
        const link = document.createElement('a');
        link.href = url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error: any) {
      console.error("Download failed:", error);
      // Final fallback to original URL
      window.open(fileUrl, '_blank');
    } finally {
      setIsDownloading(null);
    }
  };

  const handleDelete = async (fileUrl: string, submissionId: string | undefined, fileName: string) => {
    if (!onDeleteFile || !submissionId) return;
    if (!confirm(`Are you sure you want to delete "${fileName}" from storage? This cannot be undone.`)) return;
    
    setIsDeleting(fileUrl);
    try {
      await onDeleteFile(fileUrl, submissionId, fileName);
    } catch (error) {
      console.error("Delete failed:", error);
    } finally {
      setIsDeleting(null);
    }
  };

  const handleToggleCompleted = async (e: React.MouseEvent, id: string, completed: boolean) => {
    e.stopPropagation();
    if (!onToggleCompleted) return;
    setIsTogglingCompleted(id);
    try {
      await onToggleCompleted(id, !completed);
    } catch (error) {
      console.error("Failed to toggle completed:", error);
    } finally {
      setIsTogglingCompleted(null);
    }
  };

  const handleDeleteNotification = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!onDelete) return;
    setIsDeletingNotification(id);
    try {
      await onDelete(id);
    } catch (error) {
      console.error("Failed to delete notification:", error);
    } finally {
      setIsDeletingNotification(null);
    }
  };

  const getDaysLeft = (timestamp: string) => {
    const submissionDate = new Date(timestamp);
    const deadlineDate = new Date(submissionDate.getTime() + (28 * 24 * 60 * 60 * 1000)); // 4 weeks
    const now = new Date();
    const diffTime = deadlineDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const handleDownloadDiscussion = (notif: AppNotification) => {
    if (!notif.comments || notif.comments.length === 0) return;
    
    let content = `DISCUSSION: ${notif.subTopicTitle} (${notif.topicTitle})\n`;
    content += `Student: ${notif.userName}\n`;
    content += `Date: ${new Date(notif.timestamp).toLocaleString()}\n`;
    content += `--------------------------------------------------\n\n`;
    
    notif.comments.forEach(c => {
      content += `[${new Date(c.timestamp).toLocaleString()}] ${c.user}:\n`;
      content += `${c.text}\n\n`;
    });
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `discussion_${notif.userName.replace(/\s+/g, '_')}_${notif.subTopicTitle.replace(/\s+/g, '_')}_${new Date().getTime()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`h-full p-4 sm:p-8 overflow-y-auto ${theme === 'dark' ? 'bg-slate-950' : 'bg-slate-50'}`}>
      <div className="max-w-4xl mx-auto">
        <div className={`flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8 p-4 rounded-2xl border ${theme === 'dark' ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
            <div className="flex flex-col">
              <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 ml-1">Sort By</label>
              <div className="flex gap-1 overflow-x-auto no-scrollbar">
                <button 
                  onClick={() => setSortBy('time')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${sortBy === 'time' ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20' : theme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600' : 'bg-slate-100 border-slate-200 text-slate-600 hover:border-slate-300'}`}
                >
                  Time
                </button>
                <button 
                  onClick={() => setSortBy('user')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${sortBy === 'user' ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20' : theme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600' : 'bg-slate-100 border-slate-200 text-slate-600 hover:border-slate-300'}`}
                >
                  User
                </button>
                <button 
                  onClick={() => setSortBy('module')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${sortBy === 'module' ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20' : theme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600' : 'bg-slate-100 border-slate-200 text-slate-600 hover:border-slate-300'}`}
                >
                  Module
                </button>
              </div>
            </div>
            <div className="flex flex-col">
              <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 ml-1">Order</label>
              <button 
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className={`p-1.5 border rounded-lg transition-all ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white' : 'bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900'}`}
              >
                {sortOrder === 'desc' ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
              </button>
            </div>
          </div>
          <div className="flex gap-3">
            <div className={`px-4 py-2 rounded-xl border ${theme === 'dark' ? 'bg-slate-800/50 border-slate-700/50' : 'bg-slate-100 border-slate-200'}`}>
              <span className="text-[10px] text-slate-500 uppercase font-bold mr-2">Unread</span>
              <span className="text-blue-400 font-bold">{notifications.filter(n => !n.read).length}</span>
            </div>
            <div className={`px-4 py-2 rounded-xl border ${theme === 'dark' ? 'bg-slate-800/50 border-slate-700/50' : 'bg-slate-100 border-slate-200'}`}>
              <span className="text-[10px] text-slate-500 uppercase font-bold mr-2">Pending</span>
              <span className="text-orange-400 font-bold">{notifications.filter(n => (n.type === 'EXERCISE_SUBMISSION' || n.type === 'EXERCISE_RESUBMISSION') && !n.evaluated && !n.completed).length}</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {sortedNotifications.length > 0 ? (
            sortedNotifications.map(notif => {
              const daysLeft = getDaysLeft(notif.timestamp);
              const isUrgent = daysLeft <= 7 && !notif.evaluated;
              const isCompleted = notif.completed || false;
              
              if (isCompleted) {
                return (
                  <div 
                    key={notif.id} 
                    className={`rounded-xl border transition-all group ${theme === 'dark' ? 'bg-slate-900/40 border-slate-800/50 opacity-60 hover:opacity-100' : 'bg-white border-slate-200 opacity-60 hover:opacity-100 shadow-sm'}`}
                  >
                    <div className="px-6 py-3 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <button 
                          onClick={(e) => handleToggleCompleted(e, notif.id, isCompleted)}
                          disabled={isTogglingCompleted === notif.id}
                          className="text-emerald-500 hover:text-emerald-400 transition-colors shrink-0"
                        >
                          {isTogglingCompleted === notif.id ? <RefreshCw size={18} className="animate-spin" /> : <CheckSquare size={18} />}
                        </button>
                        <div className="flex items-center gap-2 truncate">
                          <span className={`font-bold text-sm truncate ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>{notif.userName}</span>
                          <span className="text-slate-600 text-[10px]">•</span>
                          <span className="text-slate-500 text-[10px] truncate">{notif.subTopicTitle}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        <span className="text-[10px] text-slate-600 font-mono">{new Date(notif.timestamp).toLocaleDateString()}</span>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={(e) => handleToggleCompleted(e, notif.id, isCompleted)}
                            className="text-[10px] font-bold text-emerald-500/50 uppercase tracking-widest hidden group-hover:block"
                          >
                            Restore
                          </button>
                          <button 
                            onClick={(e) => handleDeleteNotification(e, notif.id)}
                            disabled={isDeletingNotification === notif.id}
                            className="p-1 rounded-lg text-slate-500 hover:text-red-500 hover:bg-red-500/10 transition-all hidden group-hover:block"
                            title="Delete notification"
                          >
                            {isDeletingNotification === notif.id ? <RefreshCw size={12} className="animate-spin" /> : <Trash2 size={12} />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div 
                  key={notif.id} 
                  id={`notification-${notif.id}`}
                  className={`rounded-xl border transition-all duration-500 cursor-pointer ${
                    highlightedId === notif.id 
                      ? 'border-blue-500 ring-2 ring-blue-500/50 scale-[1.02] shadow-2xl shadow-blue-500/20 z-10' 
                      : (notif.read && !expandedReadIds.includes(notif.id))
                        ? theme === 'dark' ? 'bg-slate-900 border-slate-800 opacity-50 scale-[0.98] grayscale-[0.5]' : 'bg-white border-slate-200 opacity-50 scale-[0.98] grayscale-[0.5]'
                        : theme === 'dark' ? 'bg-slate-900 border-blue-500/30 shadow-lg shadow-blue-500/5' : 'bg-white border-blue-500/30 shadow-lg shadow-blue-500/5'
                  }`}
                  onClick={() => {
                    if (!expandedReadIds.includes(notif.id)) {
                      toggleExpandRead(notif.id);
                    }
                  }}
                >
                  <div className={`p-6 ${notif.read && !expandedReadIds.includes(notif.id) ? 'py-3' : ''}`}>
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={(e) => handleToggleCompleted(e, notif.id, isCompleted)}
                          disabled={isTogglingCompleted === notif.id}
                          className="text-slate-600 hover:text-emerald-500 transition-colors"
                        >
                          {isTogglingCompleted === notif.id ? <RefreshCw size={20} className="animate-spin" /> : <Square size={20} />}
                        </button>
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${notif.type === 'DEADLINE_WARNING' ? 'bg-red-500/20 text-red-400' : notif.type === 'SUBMISSION_COMMENT' ? 'bg-blue-500/20 text-blue-400' : notif.type === 'EXERCISE_RESUBMISSION' ? 'bg-orange-500/20 text-orange-400' : notif.evaluated ? 'bg-emerald-500/20 text-emerald-400' : theme === 'dark' ? 'bg-slate-800 text-slate-500' : 'bg-slate-100 text-slate-500'}`}>
                          {notif.type === 'DEADLINE_WARNING' ? <AlertTriangle size={20} /> : notif.type === 'SUBMISSION_COMMENT' ? <MessageSquare size={20} /> : notif.type === 'EXERCISE_RESUBMISSION' ? <RefreshCw size={20} className="animate-spin-slow" /> : notif.evaluated ? <CheckCircle2 size={20} /> : <FileUp size={20} />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{notif.userName}</h3>
                            {!notif.read && (
                                <span className="px-2 py-0.5 bg-emerald-500 text-white text-[10px] font-bold rounded uppercase tracking-wider shadow-[0_0_10px_rgba(16,185,129,0.3)]">New</span>
                            )}
                            {notif.hasNewComments && !notif.read && (
                                <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 text-[10px] font-bold rounded uppercase tracking-wider border border-blue-500/20 animate-pulse">New Comments</span>
                            )}
                            {notif.type === 'DEADLINE_WARNING' ? (
                              <span className="px-2 py-0.5 bg-red-500/10 text-red-400 text-[10px] font-bold rounded uppercase tracking-wider border border-red-500/20">Deadline Warning</span>
                            ) : notif.completed ? (
                              <div className="flex gap-2">
                                <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold rounded uppercase tracking-wider border border-emerald-500/20">Completed</span>
                              </div>
                            ) : (
                              <div className="flex gap-2">
                                {(notif.type === 'EXERCISE_SUBMISSION' || notif.type === 'EXERCISE_RESUBMISSION' || notif.type === 'SUBMISSION_COMMENT') && (
                                  <>
                                    {(notif.status === 'evaluated' || notif.evaluated) ? (
                                      <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold rounded uppercase tracking-wider border border-emerald-500/20">Evaluated</span>
                                    ) : notif.status === 'resubmission_requested' ? (
                                      <span className="px-2 py-0.5 bg-orange-500/10 text-orange-400 text-[10px] font-bold rounded uppercase tracking-wider border border-orange-500/20">Resubmission Requested</span>
                                    ) : (
                                      <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 text-[10px] font-bold rounded uppercase tracking-wider border border-blue-500/20">Pending</span>
                                    )}
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                          <p className="text-xs text-slate-500">
                            {notif.type === 'SUBMISSION_COMMENT' ? 'Commented on' : 'Uploaded to'} <span className={`font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>{notif.subTopicTitle}</span> in <span className={`font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>{notif.topicTitle}</span>
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex flex-col items-end gap-2">
                        <div className="flex items-center gap-2">
                          <div className="text-[10px] text-slate-500 font-mono">{new Date(notif.timestamp).toLocaleString()}</div>
                          <button 
                            onClick={(e) => handleDeleteNotification(e, notif.id)}
                            disabled={isDeletingNotification === notif.id}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-red-500 hover:bg-red-500/10 transition-all"
                            title="Delete notification"
                          >
                            {isDeletingNotification === notif.id ? <RefreshCw size={14} className="animate-spin" /> : <Trash2 size={14} />}
                          </button>
                        </div>
                        {notif.read && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleExpandRead(notif.id);
                            }}
                            className="flex items-center gap-1 text-[10px] font-bold text-blue-400 hover:text-blue-300 transition-colors uppercase tracking-widest"
                          >
                            {expandedReadIds.includes(notif.id) ? (
                              <><ChevronUp size={12} /> Collapse</>
                            ) : (
                              <><ChevronDown size={12} /> Expand Thread</>
                            )}
                          </button>
                        )}
                        {notif.type === 'EXERCISE_RESUBMISSION' && (
                          <div className="flex items-center gap-2 px-3 py-1 bg-orange-500/10 text-orange-400 rounded-full text-[10px] font-bold uppercase tracking-widest border border-orange-500/20">
                            <RefreshCw size={10} className="animate-spin-slow" /> Resubmission
                          </div>
                        )}
                        {(notif.type === 'EXERCISE_SUBMISSION' || notif.type === 'EXERCISE_RESUBMISSION') && !notif.evaluated && (
                          <div className={`text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 justify-end ${isUrgent ? 'text-red-400 animate-pulse' : 'text-slate-400'}`}>
                            <Clock size={10} /> {daysLeft > 0 ? `${daysLeft} days left` : 'Deadline passed'}
                          </div>
                        )}
                      </div>
                    </div>

                    {(!notif.read || expandedReadIds.includes(notif.id)) && (
                        <>
                    {/* Show Evaluation Details if evaluated */}
                    {notif.evaluated && (
                      <div className={`mb-4 p-4 border rounded-xl animate-in fade-in slide-in-from-top-2 ${theme === 'dark' ? 'bg-emerald-500/5 border-emerald-500/10' : 'bg-emerald-50 border-emerald-100'}`}>
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Evaluation Result</h4>
                          <span className="text-sm font-bold text-emerald-400">{notif.grade}/100</span>
                        </div>
                        {notif.feedback && (
                          <p className={`text-sm italic ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>"{notif.feedback}"</p>
                        )}
                      </div>
                    )}

                    {notif.files && notif.files.length > 0 && (
                      <div className={`rounded-lg p-4 border mb-4 ${theme === 'dark' ? 'bg-slate-950/50 border-slate-800/50' : 'bg-slate-50 border-slate-200'}`}>
                        <h4 className="text-[10px] font-bold text-slate-500 uppercase mb-3 tracking-widest">Attached Files</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {notif.files.map((file, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDownload(file.url, file.name, notif.userName, notif.timestamp, notif.subTopicTitle);
                                }}
                                className={`flex-1 flex items-center justify-between p-3 border rounded-lg transition-all group ${theme === 'dark' ? 'bg-slate-900 border-slate-800 hover:border-blue-500/50 hover:bg-slate-800' : 'bg-white border-slate-200 hover:border-blue-500/50 hover:bg-slate-50'}`}
                              >
                                <div className="flex items-center gap-3 truncate">
                                  <div className="p-2 bg-blue-500/10 rounded text-blue-400 group-hover:bg-blue-500/20 transition-colors">
                                    {isDownloading === file.url ? <RefreshCw size={16} className="animate-spin" /> : <Download size={16} />}
                                  </div>
                                  <span className={`text-sm truncate ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>{file.name}</span>
                                </div>
                                <ExternalLink size={14} className="text-slate-600 group-hover:text-blue-400" />
                              </button>
                              {onDeleteFile && isAdmin && (
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete(file.url, notif.submissionId, file.name);
                                  }}
                                  disabled={isDeleting === file.url}
                                  className="p-3 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg border border-red-500/20 transition-all disabled:opacity-50"
                                  title="Delete from Storage"
                                >
                                  {isDeleting === file.url ? <RefreshCw size={16} className="animate-spin" /> : <Trash2 size={16} />}
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Discussion Window */}
                    <div className={`mt-6 pt-6 border-t mb-6 ${theme === 'dark' ? 'border-slate-800' : 'border-slate-200'}`}>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <MessageSquare size={14} className="text-blue-400" />
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                            {notif.submissionId ? 'Submission Discussion' : 'General Comments'}
                          </span>
                          {isAdmin && notif.comments && notif.comments.length > 0 && (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownloadDiscussion(notif);
                              }}
                              className="ml-2 p-1 text-slate-500 hover:text-blue-400 transition-colors"
                              title="Download Discussion as Text"
                            >
                              <Download size={12} />
                            </button>
                          )}
                        </div>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onNavigateToModule && notif.topicId && notif.subTopicId) {
                                onNavigateToModule(notif.topicId, notif.subTopicId);
                            }
                          }}
                          className="flex items-center gap-1 text-[10px] font-bold text-blue-400 hover:text-blue-300 transition-colors uppercase tracking-widest"
                        >
                          <ExternalLink size={12} /> View in Module
                        </button>
                      </div>
                      <div 
                        ref={el => commentListRefs.current[notif.id] = el}
                        className="space-y-3 max-h-[300px] overflow-y-auto mb-4 pr-2 custom-scrollbar"
                      >
                        {notif.comments && notif.comments.length > 0 ? (
                          notif.comments.map(comment => (
                            <div key={comment.id} className={`group relative rounded-xl p-3 border ${theme === 'dark' ? 'bg-slate-800/30 border-slate-800/50' : 'bg-slate-50 border-slate-200'}`}>
                              <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-2">
                                  <img src={comment.avatar || undefined} alt={comment.user} className="w-5 h-5 rounded-lg" />
                                  <span className={`text-xs font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{comment.user}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="text-[10px] text-slate-600">{new Date(comment.timestamp).toLocaleString()}</span>
                                </div>
                              </div>
                              <p className={`text-xs leading-relaxed ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>{comment.text}</p>
                            </div>
                          ))
                        ) : (
                          <p className={`text-xs italic text-center py-4 ${theme === 'dark' ? 'text-slate-600' : 'text-slate-400'}`}>No comments yet. Start the conversation!</p>
                        )}
                      </div>
                      <div className="flex gap-3">
                        <input 
                          type="text"
                          value={commentInputs[notif.id] || ''}
                          onChange={e => setCommentInputs(prev => ({ ...prev, [notif.id]: e.target.value }))}
                          onClick={e => e.stopPropagation()}
                          onKeyDown={e => {
                            if (e.key === 'Enter' && commentInputs[notif.id]?.trim() && onPostSubmissionComment) {
                              e.stopPropagation();
                              const id = notif.submissionId || notif.subTopicId;
                              const isSubmission = !!notif.submissionId;
                              onPostSubmissionComment(id, commentInputs[notif.id], isSubmission);
                              setCommentInputs(prev => ({ ...prev, [notif.id]: '' }));
                            }
                          }}
                          placeholder="Type your message..."
                          className={`flex-1 border rounded-xl px-4 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500 transition-all ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
                        />
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            if (commentInputs[notif.id]?.trim() && onPostSubmissionComment) {
                              const id = notif.submissionId || notif.subTopicId;
                              const isSubmission = !!notif.submissionId;
                              onPostSubmissionComment(id, commentInputs[notif.id], isSubmission);
                              setCommentInputs(prev => ({ ...prev, [notif.id]: '' }));
                            }
                          }}
                          disabled={!commentInputs[notif.id]?.trim()}
                          className={`w-10 h-10 bg-blue-600 hover:bg-blue-500 text-white rounded-xl flex items-center justify-center transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 ${theme === 'dark' ? 'disabled:bg-slate-800' : 'disabled:bg-slate-200'}`}
                        >
                          <Send size={16} />
                        </button>
                      </div>
                    </div>

                    <div className="flex justify-end gap-3">
                      {(notif.type === 'EXERCISE_SUBMISSION' || notif.type === 'EXERCISE_RESUBMISSION') && isAdmin && (
                        evaluatingId === notif.id ? (
                          <div className={`w-full p-4 rounded-lg border animate-in fade-in slide-in-from-top-2 ${theme === 'dark' ? 'bg-slate-800/50 border-blue-500/20' : 'bg-slate-50 border-blue-500/20'}`}>
                            <div className="flex justify-between items-center mb-4">
                              <h4 className={`text-sm font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Evaluate Submission</h4>
                              <button onClick={() => setEvaluatingId(null)} className="text-slate-500 hover:text-white"><X size={16}/></button>
                            </div>
                            <div className="space-y-4">
                              <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Score (0-100)</label>
                                <input 
                                  type="number" 
                                  min="0" 
                                  max="100" 
                                  value={score}
                                  onChange={e => setScore(parseInt(e.target.value) || 0)}
                                  className={`w-full border rounded-lg p-2 outline-none focus:border-blue-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Feedback (Optional)</label>
                                <textarea 
                                  value={feedback}
                                  onChange={e => setFeedback(e.target.value)}
                                  rows={3}
                                  className={`w-full border rounded-lg p-2 outline-none focus:border-blue-500 resize-none ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
                                  placeholder="Great work! The implementation is clean..."
                                />
                              </div>
                              <div className="flex justify-end gap-2">
                                <button 
                                  onClick={() => setEvaluatingId(null)}
                                  className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white transition-colors"
                                >
                                  Cancel
                                </button>
                                <button 
                                  onClick={() => handleSubmitEvaluation(notif.submissionId)}
                                  disabled={isSubmitting}
                                  className="px-6 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-2"
                                >
                                  {isSubmitting ? 'Saving...' : 'Submit Evaluation'}
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartEvaluate(notif);
                            }}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold border transition-all ${notif.evaluated ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20'}`}
                          >
                            <Award size={14} /> {notif.evaluated ? 'Update Evaluation' : 'Evaluate Submission'}
                          </button>
                        )
                      )}
                    </div>
                    </>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className={`flex flex-col items-center justify-center py-20 rounded-2xl border border-dashed ${theme === 'dark' ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
              <BellOff size={48} className={`${theme === 'dark' ? 'text-slate-700' : 'text-slate-300'} mb-4`} />
              <p className={`${theme === 'dark' ? 'text-slate-500' : 'text-slate-600'} font-medium`}>No notifications yet.</p>
              <p className={`${theme === 'dark' ? 'text-slate-600' : 'text-slate-400'} text-sm`}>When students upload files, they will appear here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// --- Admin Submissions List Component ---
function AdminSubmissionsList({ 
  submissions, 
  onEvaluate, 
  onRequestResubmission,
  onPostComment, 
  onDeleteComment,
  onDeleteFile,
  isAdmin,
  theme 
}: { 
  submissions: ExerciseSubmission[], 
  onEvaluate: (id: string, score: number, feedback: string) => Promise<void>,
  onRequestResubmission: (id: string, feedback: string) => Promise<void>,
  onPostComment?: (id: string, text: string, isSubmission?: boolean) => Promise<void>,
  onDeleteComment?: (id: string, commentId: string, isSubmission: boolean) => Promise<void>,
  onDeleteFile?: (fileUrl: string, submissionId: string, fileName: string) => Promise<void>,
  isAdmin: boolean,
  theme: 'light' | 'dark' 
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isEvaluating, setIsEvaluating] = useState<string | null>(null);
  const [grade, setGrade] = useState<number>(0);
  const [feedback, setFeedback] = useState<string>("");
  const [commentText, setCommentText] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDownloading, setIsDownloading] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const sortedSubmissions = [...submissions].sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  const handleEvaluate = async (id: string) => {
    setIsSubmitting(true);
    try {
      await onEvaluate(id, grade, feedback);
      setIsEvaluating(null);
      setGrade(0);
      setFeedback("");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestResubmission = async (id: string) => {
    if (!window.confirm('Are you sure you want to request a resubmission? The student will be notified to re-upload their files.')) return;
    setIsSubmitting(true);
    try {
      await onRequestResubmission(id, feedback);
      setIsEvaluating(null);
      setGrade(0);
      setFeedback("");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownload = async (fileUrl: string, originalName: string, studentName: string, date: string, moduleName: string) => {
    setIsDownloading(fileUrl);
    try {
      const fileRef = ref(storage, fileUrl);
      const url = await getDownloadURL(fileRef);
      
      // Direct opening in a new tab for maximum speed and compatibility
      const newWindow = window.open(url, '_blank');
      if (!newWindow) {
        const link = document.createElement('a');
        link.href = url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error: any) {
      console.error("Download failed:", error);
      window.open(fileUrl, '_blank');
    } finally {
      setIsDownloading(null);
    }
  };

  return (
    <div className="space-y-4">
      {sortedSubmissions.length === 0 ? (
        <div className={`p-12 text-center rounded-3xl border border-dashed ${theme === 'dark' ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
          <FileText size={48} className={`mx-auto mb-4 ${theme === 'dark' ? 'text-slate-700' : 'text-slate-300'}`} />
          <p className={theme === 'dark' ? 'text-slate-500' : 'text-slate-600'}>No submissions found.</p>
        </div>
      ) : (
        sortedSubmissions.map((sub) => (
          <div 
            key={sub.id}
            className={`rounded-3xl border transition-all overflow-hidden ${theme === 'dark' ? 'bg-slate-900 border-slate-800 hover:border-slate-700' : 'bg-white border-slate-200 shadow-sm hover:shadow-md'}`}
          >
            <div 
              className="p-6 cursor-pointer"
              onClick={() => setExpandedId(expandedId === sub.id ? null : sub.id)}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${theme === 'dark' ? 'bg-slate-800 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                    <FileText size={24} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-lg">{sub.subTopicTitle}</h4>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        sub.status === 'reviewed' ? 'bg-emerald-500/10 text-emerald-400' :
                        sub.status === 'rejected' ? 'bg-red-500/10 text-red-400' :
                        'bg-blue-500/10 text-blue-400'
                      }`}>
                        {sub.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
                      <span className="flex items-center gap-1"><UserIcon size={14} /> {sub.userName}</span>
                      <span className="flex items-center gap-1"><Calendar size={14} /> {new Date(sub.timestamp).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {sub.status === 'reviewed' && (
                    <div className="text-right">
                      <div className="text-2xl font-black text-blue-500">{sub.grade}/100</div>
                      <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Grade</div>
                    </div>
                  )}
                  <ChevronDown 
                    size={20} 
                    className={`text-slate-500 transition-transform duration-300 ${expandedId === sub.id ? 'rotate-180' : ''}`} 
                  />
                </div>
              </div>
            </div>

            {expandedId === sub.id && (
              <div className={`p-6 border-t ${theme === 'dark' ? 'border-slate-800 bg-slate-950/30' : 'border-slate-100 bg-slate-50/50'}`}>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div>
                      <h5 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Submitted Files</h5>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {sub.files.map((file, idx) => (
                          <div key={idx} className="flex items-center gap-2 group/file">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownload(file.url, file.name, sub.userName, sub.timestamp, sub.subTopicTitle || 'module');
                              }}
                              className={`flex-1 flex items-center gap-3 p-3 rounded-xl border transition-all ${theme === 'dark' ? 'bg-slate-900 border-slate-800 hover:bg-slate-800' : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-sm'}`}
                            >
                              <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
                                {isDownloading === file.url ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />}
                              </div>
                              <div className="min-w-0 text-left">
                                <div className="text-xs font-bold truncate">{file.name}</div>
                                <div className="text-[10px] text-slate-500 uppercase">Download File</div>
                              </div>
                            </button>
                            {onDeleteFile && isAdmin && (
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (window.confirm('Are you sure you want to delete this file? This action cannot be undone.')) {
                                    onDeleteFile(file.url, sub.id, file.name);
                                  }
                                }}
                                className={`p-3 rounded-xl border transition-all ${theme === 'dark' ? 'bg-slate-900 border-slate-800 hover:bg-red-500/10 hover:border-red-500/30 text-slate-500 hover:text-red-500' : 'bg-white border-slate-200 hover:bg-red-50 hover:border-red-200 text-slate-400 hover:text-red-500'}`}
                                title="Delete file"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {sub.feedback && (
                      <div>
                        <h5 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Evaluation Feedback</h5>
                        <div className={`p-4 rounded-2xl border ${theme === 'dark' ? 'bg-slate-900/50 border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-700 shadow-sm'}`}>
                          {sub.feedback}
                        </div>
                      </div>
                    )}

                    {isAdmin && (
                      <div className="pt-4 flex flex-wrap gap-3">
                        <button 
                          onClick={() => {
                            setIsEvaluating(sub.id);
                            setGrade(sub.grade || 0);
                            setFeedback(sub.feedback || "");
                          }}
                          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${sub.status === 'reviewed' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20' : 'bg-blue-600 text-white shadow-lg shadow-blue-900/20 hover:bg-blue-500'}`}
                        >
                          <Award size={16} /> {sub.status === 'reviewed' ? 'Update Evaluation' : 'Evaluate Now'}
                        </button>
                        <button 
                          onClick={() => {
                            setIsEvaluating(sub.id);
                            setGrade(0);
                            setFeedback(sub.feedback || "");
                          }}
                          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold border transition-all ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                        >
                          <RefreshCw size={16} /> Request Resubmission
                        </button>
                      </div>
                    )}

                    {isEvaluating === sub.id && (
                      <div className={`p-6 rounded-3xl border animate-in fade-in slide-in-from-top-4 duration-300 ${theme === 'dark' ? 'bg-slate-900 border-blue-500/30' : 'bg-white border-blue-200 shadow-xl'}`}>
                        <div className="flex items-center justify-between mb-6">
                          <h4 className="font-bold flex items-center gap-2">
                            <Award className="text-blue-500" size={20} />
                            {grade > 0 ? 'Evaluate Submission' : 'Request Resubmission'}
                          </h4>
                          <button onClick={() => setIsEvaluating(null)} className="text-slate-500 hover:text-slate-300">
                            <X size={20} />
                          </button>
                        </div>
                        
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Grade (0-100)</label>
                            <input 
                              type="number" 
                              min="0" 
                              max="100"
                              value={grade}
                              onChange={(e) => setGrade(Number(e.target.value))}
                              className={`w-full p-3 rounded-xl border outline-none focus:border-blue-500 transition-all ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Feedback / Instructions</label>
                            <textarea 
                              rows={4}
                              value={feedback}
                              onChange={(e) => setFeedback(e.target.value)}
                              placeholder="Provide detailed feedback or instructions for resubmission..."
                              className={`w-full p-3 rounded-xl border outline-none focus:border-blue-500 transition-all resize-none ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}
                            />
                          </div>

                          <div className="flex gap-3 pt-2">
                            <button 
                              onClick={() => handleEvaluate(sub.id)}
                              disabled={isSubmitting}
                              className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-bold shadow-lg shadow-blue-900/20 transition-all active:scale-95 disabled:opacity-50"
                            >
                              {isSubmitting ? 'Processing...' : 'Submit Evaluation'}
                            </button>
                            <button 
                              onClick={() => handleRequestResubmission(sub.id)}
                              disabled={isSubmitting}
                              className={`flex-1 py-3 rounded-xl font-bold border transition-all active:scale-95 disabled:opacity-50 ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                            >
                              {isSubmitting ? 'Processing...' : 'Request Resubmission'}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-6">
                    <h5 className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                      <MessageSquare size={14} /> Discussion
                    </h5>
                    
                    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 no-scrollbar">
                      {(sub.comments || []).length === 0 ? (
                        <p className="text-sm text-slate-500 italic py-4">No comments yet. Start the conversation.</p>
                      ) : (
                        sub.comments.map((comment) => (
                          <div key={comment.id} className="group relative">
                            <div className={`flex gap-3 p-4 rounded-2xl ${theme === 'dark' ? 'bg-slate-900/50' : 'bg-white border border-slate-100 shadow-sm'}`}>
                              <img 
                                src={comment.avatar} 
                                alt={comment.user} 
                                className="w-8 h-8 rounded-full shrink-0"
                                referrerPolicy="no-referrer"
                              />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-2 mb-1">
                                  <span className="text-xs font-bold truncate">{comment.user}</span>
                                  <span className="text-[10px] text-slate-500 shrink-0">{new Date(comment.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                                <p className="text-sm text-slate-400 leading-relaxed break-words">{comment.text}</p>
                              </div>
                              {onDeleteComment && (
                                <button 
                                  onClick={() => onDeleteComment(sub.id, comment.id, true)}
                                  className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                                >
                                  <X size={12} />
                                </button>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="relative">
                      <textarea 
                        rows={2}
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder="Add a comment..."
                        className={`w-full p-4 pr-12 rounded-2xl border outline-none focus:border-blue-500 transition-all resize-none text-sm ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}
                      />
                      <button 
                        onClick={async () => {
                          if (!commentText.trim() || !onPostComment) return;
                          await onPostComment(sub.id, commentText, true);
                          setCommentText("");
                        }}
                        disabled={!commentText.trim()}
                        className="absolute right-3 bottom-3 p-2 rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-900/20 hover:bg-blue-500 transition-all active:scale-95 disabled:opacity-50"
                      >
                        <Send size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}

export default function AdminBuilder({ 
    initialTopics, 
    initialTeachers, 
    initialUsers, 
    initialTags, 
    initialLandingConfig, 
    notifications, 
    submissions,
    initialTab = 'ANALYTICS',
    onMarkNotificationRead,
    onDeleteNotification,
    onEvaluateSubmission,
    onRequestResubmission,
    onPostSubmissionComment,
    onDeleteComment,
    onToggleNotificationCompleted,
    onDeleteFile,
    onApplyChanges,
    onExit,
    isAdmin = false,
    theme
}: AdminBuilderProps) {
  const [activeTab, setActiveTab] = useState<'ANALYTICS' | 'CURRICULUM' | 'TEACHERS' | 'USERS_LIST' | 'TAGS' | 'USER_INTERFACE' | 'NOTIFICATIONS'>(initialTab);
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
        const teacherObj = initialTeachers.find(teacher => teacher.email === t.teacher?.email);
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
    <div className={`fixed inset-0 z-[100] flex flex-col font-sans overflow-hidden transition-colors duration-300 ${theme === 'dark' ? 'bg-slate-950 text-slate-200' : 'bg-slate-50 text-slate-800'}`}>
      <header className={`min-h-[4rem] border-b flex flex-col lg:flex-row items-center justify-between px-4 lg:px-6 py-3 lg:py-0 shrink-0 gap-4 z-50 relative transition-colors duration-300 ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center justify-between w-full lg:w-auto gap-4">
              <h1 className={`font-bold text-base sm:text-lg flex items-center gap-2 truncate ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  <Edit2 size={18} className="text-blue-500 shrink-0" />
                  <span className="truncate">Curriculum Builder</span>
                  <span className="text-[10px] bg-blue-600 px-1.5 py-0.5 rounded text-white shrink-0">ADMIN</span>
              </h1>
              <div className="flex lg:hidden items-center gap-2">
                  <button 
                    onClick={() => setConfirmationOpen(true)} 
                    disabled={isSaving}
                    className="bg-green-600 hover:bg-green-500 disabled:bg-slate-700 text-white p-2 rounded-lg transition-all shadow-lg shadow-green-900/20"
                  >
                      {isSaving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
                  </button>
                  <button onClick={onExit} className={`p-2 rounded-lg transition-all ${theme === 'dark' ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-200 hover:bg-slate-300 text-slate-600'}`}>
                      <X size={16} />
                  </button>
              </div>
          </div>

          <div className="flex items-center gap-2 w-full lg:w-auto pb-1 lg:pb-0">
              <div className={`flex p-1 rounded-lg shrink-0 transition-colors ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-200'}`}>
                  <button 
                    onClick={() => setActiveTab('NOTIFICATIONS')}
                    className={`px-3 py-1.5 rounded text-[10px] sm:text-xs font-bold transition-colors relative whitespace-nowrap ${activeTab === 'NOTIFICATIONS' ? (theme === 'dark' ? 'bg-slate-700 text-white' : 'bg-white text-slate-900 shadow-sm') : (theme === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900')}`}
                  >
                      Notifications
                      {notifications.filter(n => !n.read).length > 0 && (
                        <span className={`absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] flex items-center justify-center rounded-full border ${theme === 'dark' ? 'border-slate-900' : 'border-white'}`}>
                          {notifications.filter(n => !n.read).length}
                        </span>
                      )}
                  </button>
                  <button 
                    onClick={() => setActiveTab('ANALYTICS')}
                    className={`px-3 py-1.5 rounded text-[10px] sm:text-xs font-bold transition-colors whitespace-nowrap ${activeTab === 'ANALYTICS' ? (theme === 'dark' ? 'bg-slate-700 text-white' : 'bg-white text-slate-900 shadow-sm') : (theme === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900')}`}
                  >
                      Analytics
                  </button>
                  <button 
                    onClick={() => setActiveTab('CURRICULUM')}
                    className={`px-3 py-1.5 rounded text-[10px] sm:text-xs font-bold transition-colors whitespace-nowrap ${activeTab === 'CURRICULUM' ? (theme === 'dark' ? 'bg-slate-700 text-white' : 'bg-white text-slate-900 shadow-sm') : (theme === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900')}`}
                  >
                      Curriculum
                  </button>
                  <button 
                    onClick={() => setActiveTab('TEACHERS')}
                    className={`px-3 py-1.5 rounded text-[10px] sm:text-xs font-bold transition-colors whitespace-nowrap ${activeTab === 'TEACHERS' ? (theme === 'dark' ? 'bg-slate-700 text-white' : 'bg-white text-slate-900 shadow-sm') : (theme === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900')}`}
                  >
                      Teachers
                  </button>
                  <div className="relative">
                      <button 
                        onClick={() => setShowUsersDropdown(!showUsersDropdown)}
                        className={`px-3 py-1.5 rounded text-[10px] sm:text-xs font-bold transition-colors flex items-center gap-1 whitespace-nowrap ${activeTab === 'USERS_LIST' || activeTab === 'TAGS' ? (theme === 'dark' ? 'bg-slate-700 text-white' : 'bg-white text-slate-900 shadow-sm') : (theme === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900')}`}
                      >
                          Users <ChevronDown size={14} className={`transition-transform ${showUsersDropdown ? 'rotate-180' : ''}`} />
                      </button>
                      {showUsersDropdown && (
                          <div className={`absolute top-full left-0 mt-1 w-40 border rounded-lg shadow-xl z-[110] overflow-hidden ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                              <button 
                                onClick={() => { setActiveTab('USERS_LIST'); setShowUsersDropdown(false); }}
                                className={`w-full text-left px-3 py-2 text-[10px] sm:text-xs font-bold transition-colors ${activeTab === 'USERS_LIST' ? 'text-blue-400' : (theme === 'dark' ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-600 hover:bg-slate-100')}`}
                              >
                                  Add/Edit Users
                              </button>
                              <button 
                                onClick={() => { setActiveTab('TAGS'); setShowUsersDropdown(false); }}
                                className={`w-full text-left px-3 py-2 text-[10px] sm:text-xs font-bold transition-colors ${activeTab === 'TAGS' ? 'text-blue-400' : (theme === 'dark' ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-600 hover:bg-slate-100')}`}
                              >
                                  Add/Edit Tags
                              </button>
                          </div>
                      )}
                  </div>
                  <button 
                    onClick={() => setActiveTab('USER_INTERFACE')}
                    className={`px-3 py-1.5 rounded text-[10px] sm:text-xs font-bold transition-colors whitespace-nowrap ${activeTab === 'USER_INTERFACE' ? (theme === 'dark' ? 'bg-slate-700 text-white' : 'bg-white text-slate-900 shadow-sm') : (theme === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900')}`}
                  >
                      UI
                  </button>
              </div>
          </div>

          <div className="hidden lg:flex items-center gap-3">
              <button 
                onClick={() => setConfirmationOpen(true)} 
                disabled={isSaving}
                className="bg-green-600 hover:bg-green-500 disabled:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-green-900/20"
              >
                  {isSaving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
                  {isSaving ? 'Saving...' : 'Apply Changes'}
              </button>
              <button onClick={onExit} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${theme === 'dark' ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-200 hover:bg-slate-300 text-slate-600'}`}>
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
                  <aside className={`w-64 border-r flex flex-col shrink-0 transition-colors duration-300 ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
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
                                            theme={theme}
                                        />
                                    ))}
                                </SortableContext>
                            </DndContext>
                            <button onClick={handleAddTopic} className={`w-full px-4 py-3 text-left text-sm text-blue-400 hover:bg-blue-500/10 flex items-center gap-2 transition-colors border-t ${theme === 'dark' ? 'border-slate-800' : 'border-slate-200'}`}>
                                <Plus size={16} /> Add Topic
                            </button>
                        </div>
                  </aside>
                  <main className={`flex-1 overflow-y-auto p-8 transition-colors duration-300 ${theme === 'dark' ? 'bg-slate-950' : 'bg-slate-50'}`}>
                     {selectedTopic ? (
                         <div className="max-w-4xl mx-auto space-y-6">
                            {/* Topic Header Editor */}
                            <div className={`rounded-xl shadow-sm border p-6 transition-colors duration-300 ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                                <h3 className={`text-xs uppercase tracking-wide font-bold mb-4 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Topic Settings</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2">
                                        <label className={`block text-xs font-medium mb-1 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Title</label>
                                        <input 
                                            className={`w-full p-2 border rounded text-base font-bold outline-none transition-colors ${theme === 'dark' ? 'border-slate-700 text-white bg-slate-800 focus:border-blue-500' : 'border-slate-200 text-slate-900 bg-white focus:border-blue-500'}`} 
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
                                            <label className={`block text-xs font-medium ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Topic ID</label>
                                            <label className={`flex items-center gap-1.5 text-[10px] cursor-pointer select-none ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                                                <input 
                                                    type="checkbox" 
                                                    checked={!!selectedTopic['_isManualId']} 
                                                    onChange={e => handleUpdateTopic(selectedTopicId, {...selectedTopic, _isManualId: e.target.checked})}
                                                    className={`w-3 h-3 rounded border-slate-300 text-blue-600 focus:ring-blue-500 ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'}`}
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
                                            className={`w-full p-2 text-xs font-mono border rounded outline-none transition-colors ${selectedTopic['_isManualId'] ? (theme === 'dark' ? 'bg-slate-800 border-blue-500/50 text-blue-400' : 'bg-blue-50 border-blue-500/50 text-blue-600') : (theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed' : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed')}`} 
                                        />
                                    </div>
                                    <div>
                                        <label className={`block text-xs font-medium mb-1 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Teacher</label>
                                        <select 
                                            className={`w-full p-2 border rounded text-sm outline-none focus:border-blue-500 transition-all ${theme === 'dark' ? 'border-slate-700 bg-slate-800 text-white' : 'border-slate-200 bg-white text-slate-900'}`}
                                            value={selectedTopic.teacherKey}
                                            onChange={e => handleUpdateTopic(selectedTopicId, {...selectedTopic, teacherKey: e.target.value})}
                                        >
                                            {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className={`block text-xs font-medium mb-1 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Level</label>
                                        <select 
                                            className={`w-full p-2 border rounded text-sm outline-none focus:border-blue-500 transition-all ${theme === 'dark' ? 'border-slate-700 bg-slate-800 text-white' : 'border-slate-200 bg-white text-slate-900'}`}
                                            value={selectedTopic.level}
                                            onChange={e => handleUpdateTopic(selectedTopicId, {...selectedTopic, level: parseInt(e.target.value) as any})}
                                        >
                                            {[1,2,3,4,5,6,7,8,9,10].map(l => <option key={l} value={l}>Level {l}</option>)}
                                        </select>
                                    </div>
                                    <div className="col-span-2">
                                        <label className={`block text-xs font-medium mb-1 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Description</label>
                                        <textarea className={`w-full p-2 border rounded text-sm h-20 outline-none focus:border-blue-500 transition-all ${theme === 'dark' ? 'border-slate-700 bg-slate-800 text-white' : 'border-slate-200 bg-white text-slate-900'}`} value={selectedTopic.shortDescription} onChange={e => handleUpdateTopic(selectedTopicId, {...selectedTopic, shortDescription: e.target.value})} />
                                    </div>
                                    
                                    {/* Prerequisites Selector */}
                                    <div className={`col-span-2 mt-4 pt-4 border-t ${theme === 'dark' ? 'border-slate-800' : 'border-slate-100'}`}>
                                        <h4 className={`text-xs font-bold uppercase mb-2 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Prerequisites (Graph Connections)</h4>
                                        <div className={`p-3 rounded border max-h-40 overflow-y-auto grid grid-cols-2 gap-2 ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                                            {topics.filter(t => t.id !== selectedTopic.id).map(t => (
                                                <label key={t.id} className={`flex items-center gap-2 text-sm cursor-pointer p-1 rounded transition-colors ${theme === 'dark' ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-600 hover:bg-slate-100'}`}>
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
                                                        className={`rounded border-slate-600 text-blue-600 focus:ring-blue-500 ${theme === 'dark' ? 'bg-slate-700' : 'bg-white border-slate-300'}`}
                                                    />
                                                    <span className="truncate">{t.title}</span>
                                                    <span className={`text-xs ml-auto ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Lvl {t.level}</span>
                                                </label>
                                            ))}
                                            {topics.length <= 1 && <span className={`text-xs italic col-span-2 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>No other topics available to connect.</span>}
                                        </div>
                                    </div>

                                    {/* Thumbnail Path Helper */}
                                    <div className="col-span-2 mt-4">
                                        <PathDisplay 
                                            label="Topic Thumbnail Path" 
                                            path={getTopicThumbPath(selectedTopic.id)} 
                                            description="Save the topic cover image here. Use this path when configuring the Image URL." 
                                            theme={theme}
                                        />
                                        <div className="mt-2">
                                            <label className={`block text-xs font-medium mb-1 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Image URL</label>
                                            <input 
                                                className={`w-full p-2 border rounded text-sm font-mono outline-none focus:border-blue-500 transition-all ${theme === 'dark' ? 'border-slate-700 bg-slate-800 text-slate-300' : 'border-slate-200 bg-white text-slate-600'}`} 
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
                                    <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Modules ({selectedTopic.subTopics.length})</h3>
                                    <button 
                                        onClick={() => handleAddModule(selectedTopicId)} 
                                        className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg font-medium border transition-colors ${theme === 'dark' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20' : 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100'}`}
                                    >
                                        <Plus size={16}/> Add Module
                                    </button>
                                </div>
                                {selectedTopic.subTopics.map(mod => (
                                    <ModuleEditor 
                                        key={mod._key || mod.id}
                                        topicId={selectedTopicId}
                                        module={mod}
                                        theme={theme}
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
              <div className={`h-full p-8 overflow-y-auto ${theme === 'dark' ? 'bg-slate-950' : 'bg-slate-50'}`}>
                  <div className="max-w-5xl mx-auto">
                      <div className="flex justify-between items-center mb-8">
                          <div>
                              <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Instructor Management</h2>
                              <p className="text-slate-400">Manage teacher profiles and assignments.</p>
                          </div>
                          <button onClick={handleAddTeacher} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-lg shadow-blue-900/20">
                              <Plus size={16} /> Add Instructor
                          </button>
                      </div>
                      
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {teachers.map(teacher => (
                              <div key={teacher.id} className={`rounded-xl shadow-sm overflow-hidden group border ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                                  {editingTeacherId === teacher.id ? (
                                      <div className="p-6 space-y-4">
                                          <div className="flex justify-between items-center mb-2">
                                              <span className="text-xs font-bold text-blue-400 uppercase">Editing Profile</span>
                                              <button onClick={() => setEditingTeacherId(null)} className={`hover:text-blue-400 transition-colors ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}><X size={16}/></button>
                                          </div>
                                          <div className="grid grid-cols-2 gap-4">
                                              <div className="col-span-2">
                                                  <label className="text-xs font-medium text-slate-400">Full Name</label>
                                                  <input className={`w-full p-2 border rounded outline-none focus:border-blue-500 transition-all ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`} value={teacher.name} onChange={e => handleUpdateTeacher({...teacher, name: e.target.value})} />
                                              </div>
                                              <div>
                                                  <label className="text-xs font-medium text-slate-400">Role</label>
                                                  <input className={`w-full p-2 border rounded outline-none focus:border-blue-500 transition-all ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`} value={teacher.role} onChange={e => handleUpdateTeacher({...teacher, role: e.target.value})} />
                                              </div>
                                              <div>
                                                  <label className="text-xs font-medium text-slate-400">Email</label>
                                                  <input className={`w-full p-2 border rounded outline-none focus:border-blue-500 transition-all ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`} value={teacher.email} onChange={e => handleUpdateTeacher({...teacher, email: e.target.value})} />
                                              </div>
                                              <div className="col-span-2">
                                                  <label className="text-xs font-medium text-slate-400">Avatar URL</label>
                                                  <input className={`w-full p-2 border rounded outline-none focus:border-blue-500 transition-all ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`} value={teacher.avatar} onChange={e => handleUpdateTeacher({...teacher, avatar: e.target.value})} />
                                              </div>
                                              <div className="col-span-2">
                                                  <label className="text-xs font-medium text-slate-400">Bio (Short Description)</label>
                                                  <textarea className={`w-full p-2 border rounded text-sm h-20 outline-none focus:border-blue-500 transition-all ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`} value={teacher.bio || ''} onChange={e => handleUpdateTeacher({...teacher, bio: e.target.value})} placeholder="Short biography..." />
                                              </div>
                                          </div>
                                          <div className="flex justify-end pt-2">
                                              <button onClick={() => handleDeleteTeacher(teacher.id)} className="text-red-500 text-xs hover:underline flex items-center gap-1"><Trash2 size={12}/> Remove Instructor</button>
                                          </div>
                                      </div>
                                  ) : (
                                      <div className="p-6 flex items-start gap-4">
                                          <img src={teacher.avatar || undefined} alt={teacher.name} className={`w-16 h-16 rounded-full object-cover border-2 ${theme === 'dark' ? 'border-slate-800' : 'border-slate-100'}`} />
                                          <div className="flex-1">
                                              <h3 className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{teacher.name}</h3>
                                              <p className="text-blue-400 text-sm font-medium">{teacher.role}</p>
                                              <p className="text-slate-500 text-sm mb-3">{teacher.email}</p>
                                              <p className={`text-sm leading-relaxed mb-4 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>{teacher.bio || 'No biography added.'}</p>
                                              
                                              <div className="flex items-center gap-2 mt-auto">
                                                  <button onClick={() => setEditingTeacherId(teacher.id)} className={`text-xs px-3 py-1.5 rounded font-medium transition-colors ${theme === 'dark' ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}>Edit Profile</button>
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
              <div className={`h-full overflow-y-auto p-8 ${theme === 'dark' ? 'bg-slate-950' : 'bg-slate-50'}`}>
                  <div className="max-w-3xl mx-auto space-y-8">
                      <div>
                          <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>User Interface Configuration</h2>
                          <p className="text-slate-400 text-sm">Manage the visual identity and content of your platform.</p>
                      </div>

                      {/* SECTION 1: LANDING PAGE */}
                      <div className={`rounded-2xl shadow-sm overflow-hidden border ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                          <div className={`px-6 py-3 border-b ${theme === 'dark' ? 'bg-slate-800/50 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
                              <h3 className={`text-sm font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>1. Landing Page (Login)</h3>
                          </div>
                          <div className="p-6 space-y-6">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  <div className="space-y-2">
                                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Main Title</label>
                                      <input 
                                          type="text" 
                                          value={landingConfig.title} 
                                          onChange={e => setLandingConfig({...landingConfig, title: e.target.value})}
                                          className={`w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
                                          placeholder="e.g. Digital Built Environment"
                                      />
                                  </div>
                                  <div className="space-y-2">
                                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Subtitle</label>
                                      <input 
                                          type="text" 
                                          value={landingConfig.subtitle} 
                                          onChange={e => setLandingConfig({...landingConfig, subtitle: e.target.value})}
                                          className={`w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
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
                                      className={`w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
                                      placeholder="e.g. Semester 2025"
                                  />
                              </div>

                              <div className="space-y-2">
                                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Platform Description</label>
                                  <textarea 
                                      value={landingConfig.description} 
                                      onChange={e => setLandingConfig({...landingConfig, description: e.target.value})}
                                      rows={3}
                                      className={`w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
                                      placeholder="Enter platform description..."
                                  />
                              </div>

                              <div className="space-y-4">
                                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Hero Image URL</label>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <div className="space-y-2">
                                          <span className="text-[10px] text-slate-400 uppercase font-bold">Light Mode</span>
                                          <div className="flex gap-2">
                                              <input 
                                                  type="text" 
                                                  value={landingConfig.heroImageLight || ''} 
                                                  onChange={e => setLandingConfig({...landingConfig, heroImageLight: e.target.value})}
                                                  className={`flex-1 p-2 border rounded-lg text-sm ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
                                                  placeholder="Light mode image..."
                                              />
                                              <div className={`w-10 h-10 rounded border overflow-hidden shrink-0 ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'}`}>
                                                  <img src={landingConfig.heroImageLight || undefined} alt="L" className="w-full h-full object-cover" />
                                              </div>
                                          </div>
                                      </div>
                                      <div className="space-y-2">
                                          <span className="text-[10px] text-slate-400 uppercase font-bold">Dark Mode</span>
                                          <div className="flex gap-2">
                                              <input 
                                                  type="text" 
                                                  value={landingConfig.heroImageDark || ''} 
                                                  onChange={e => setLandingConfig({...landingConfig, heroImageDark: e.target.value})}
                                                  className={`flex-1 p-2 border rounded-lg text-sm ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
                                                  placeholder="Dark mode image..."
                                              />
                                              <div className={`w-10 h-10 rounded border overflow-hidden shrink-0 ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'}`}>
                                                  <img src={landingConfig.heroImageDark || undefined} alt="D" className="w-full h-full object-cover" />
                                              </div>
                                          </div>
                                      </div>
                                  </div>
                                  <div className="space-y-2">
                                      <span className="text-[10px] text-slate-400 uppercase font-bold">Default Fallback</span>
                                      <input 
                                          type="text" 
                                          value={landingConfig.heroImage} 
                                          onChange={e => setLandingConfig({...landingConfig, heroImage: e.target.value})}
                                          className={`w-full p-2 border rounded-lg text-sm ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
                                          placeholder="Default image..."
                                      />
                                  </div>
                              </div>

                              <div className="space-y-2">
                                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Inspirational Quote</label>
                                  <textarea 
                                      value={landingConfig.quote} 
                                      onChange={e => setLandingConfig({...landingConfig, quote: e.target.value})}
                                      rows={2}
                                      className={`w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
                                      placeholder="Enter a quote..."
                                  />
                              </div>

                              <div className={`border-t pt-6 space-y-6 ${theme === 'dark' ? 'border-slate-800' : 'border-slate-200'}`}>
                                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Login Page Customization</h4>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                      <div className="space-y-2">
                                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Login Title</label>
                                          <input 
                                              type="text" 
                                              value={landingConfig.loginTitle || ''} 
                                              onChange={e => setLandingConfig({...landingConfig, loginTitle: e.target.value})}
                                              className={`w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
                                              placeholder="e.g. Welcome back"
                                          />
                                      </div>
                                      <div className="space-y-2">
                                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Login Subtitle</label>
                                          <input 
                                              type="text" 
                                              value={landingConfig.loginSubtitle || ''} 
                                              onChange={e => setLandingConfig({...landingConfig, loginSubtitle: e.target.value})}
                                              className={`w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
                                              placeholder="e.g. Sign in to access your module tutorials."
                                          />
                                      </div>
                                  </div>

                                  <div className="space-y-4">
                                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Login Background Image URL</label>
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                          <div className="space-y-2">
                                              <span className="text-[10px] text-slate-400 uppercase font-bold">Light Mode</span>
                                              <div className="flex gap-2">
                                                  <input 
                                                      type="text" 
                                                      value={landingConfig.loginImageUrlLight || ''} 
                                                      onChange={e => setLandingConfig({...landingConfig, loginImageUrlLight: e.target.value})}
                                                      className={`flex-1 p-2 border rounded-lg text-sm ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
                                                      placeholder="Light mode login image..."
                                                  />
                                                  <div className={`w-10 h-10 rounded border overflow-hidden shrink-0 ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'}`}>
                                                      <img src={landingConfig.loginImageUrlLight || undefined} alt="L" className="w-full h-full object-cover" />
                                                  </div>
                                              </div>
                                          </div>
                                          <div className="space-y-2">
                                              <span className="text-[10px] text-slate-400 uppercase font-bold">Dark Mode</span>
                                              <div className="flex gap-2">
                                                  <input 
                                                      type="text" 
                                                      value={landingConfig.loginImageUrlDark || ''} 
                                                      onChange={e => setLandingConfig({...landingConfig, loginImageUrlDark: e.target.value})}
                                                      className={`flex-1 p-2 border rounded-lg text-sm ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
                                                      placeholder="Dark mode login image..."
                                                  />
                                                  <div className={`w-10 h-10 rounded border overflow-hidden shrink-0 ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'}`}>
                                                      <img src={landingConfig.loginImageUrlDark || undefined} alt="D" className="w-full h-full object-cover" />
                                                  </div>
                                              </div>
                                          </div>
                                      </div>
                                      <div className="space-y-2">
                                          <span className="text-[10px] text-slate-400 uppercase font-bold">Default Fallback</span>
                                          <input 
                                              type="text" 
                                              value={landingConfig.loginImageUrl || ''} 
                                              onChange={e => setLandingConfig({...landingConfig, loginImageUrl: e.target.value})}
                                              className={`w-full p-2 border rounded-lg text-sm ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
                                              placeholder="Default login image..."
                                          />
                                      </div>
                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                      <div className="space-y-2">
                                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">First Time Login Title</label>
                                          <input 
                                              type="text" 
                                              value={landingConfig.firstTimeLoginTitle || ''} 
                                              onChange={e => setLandingConfig({...landingConfig, firstTimeLoginTitle: e.target.value})}
                                              className={`w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
                                              placeholder="e.g. First Time Login"
                                          />
                                      </div>
                                      <div className="space-y-2">
                                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">First Time Login Subtitle</label>
                                          <input 
                                              type="text" 
                                              value={landingConfig.firstTimeLoginSubtitle || ''} 
                                              onChange={e => setLandingConfig({...landingConfig, firstTimeLoginSubtitle: e.target.value})}
                                              className={`w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
                                              placeholder="e.g. Enter your invited email to set up your password."
                                          />
                                      </div>
                                  </div>
                              </div>
                          </div>
                      </div>

                      {/* SECTION 2: WELCOME OVERLAY */}
                      <div className={`rounded-2xl border shadow-sm overflow-hidden ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                          <div className={`px-6 py-3 border-b ${theme === 'dark' ? 'bg-slate-800/50 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                              <h3 className={`text-sm font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>2. Welcome Overlay</h3>
                          </div>
                          <div className="p-6 space-y-6">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  <div className="space-y-2">
                                      <label className={`text-xs font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Overlay Title</label>
                                      <input 
                                          type="text" 
                                          value={landingConfig.welcomeTitle || ''} 
                                          onChange={e => setLandingConfig({...landingConfig, welcomeTitle: e.target.value})}
                                          className={`w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
                                          placeholder="e.g. Welcome to the Program"
                                      />
                                  </div>
                                  <div className="space-y-2">
                                      <label className={`text-xs font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Overlay Subtitle</label>
                                      <input 
                                          type="text" 
                                          value={landingConfig.welcomeSubtitle || ''} 
                                          onChange={e => setLandingConfig({...landingConfig, welcomeSubtitle: e.target.value})}
                                          className={`w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
                                          placeholder="e.g. Let's start your journey"
                                      />
                                  </div>
                              </div>

                              <div className="space-y-2">
                                  <label className={`text-xs font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Description</label>
                                  <textarea 
                                      value={landingConfig.welcomeDescription || landingConfig.description} 
                                      onChange={e => setLandingConfig({...landingConfig, welcomeDescription: e.target.value})}
                                      rows={4}
                                      className={`w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
                                      placeholder="Describe the program..."
                                  />
                              </div>

                              <div className="space-y-2">
                                  <label className={`text-xs font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Button Text</label>
                                  <input 
                                      type="text" 
                                      value={landingConfig.welcomeButtonText || ''} 
                                      onChange={e => setLandingConfig({...landingConfig, welcomeButtonText: e.target.value})}
                                      className={`w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
                                      placeholder="e.g. Enter Curriculum Map"
                                  />
                              </div>
                          </div>
                      </div>

                      {/* SECTION 3: KNOWLEDGE GRAPH INTERFACE */}
                      <div className={`rounded-2xl border shadow-sm overflow-hidden ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                          <div className={`px-6 py-3 border-b ${theme === 'dark' ? 'bg-slate-800/50 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                              <h3 className={`text-sm font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>3. Knowledge Graph Interface</h3>
                          </div>
                          <div className="p-6 space-y-6">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  <div className="space-y-2">
                                      <label className={`text-xs font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Graph Title</label>
                                      <input 
                                          type="text" 
                                          value={landingConfig.graphTitle || ''} 
                                          onChange={e => setLandingConfig({...landingConfig, graphTitle: e.target.value})}
                                          className={`w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
                                          placeholder="e.g. CURRICULUM_MAP_V2.3"
                                      />
                                  </div>
                                  <div className="space-y-2">
                                      <label className={`text-xs font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Graph Subtitle</label>
                                      <input 
                                          type="text" 
                                          value={landingConfig.graphSubtitle || ''} 
                                          onChange={e => setLandingConfig({...landingConfig, graphSubtitle: e.target.value})}
                                          className={`w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
                                          placeholder="e.g. INTERACTIVE_LEARNING_PATH"
                                      />
                                  </div>
                              </div>

                              <div className="space-y-4">
                                  <label className={`text-xs font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>App Logo URL (Top Left)</label>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <div className="space-y-2">
                                          <span className={`text-[10px] uppercase font-bold ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Light Mode</span>
                                          <div className="flex gap-2">
                                              <input 
                                                  type="text" 
                                                  value={landingConfig.appLogoUrlLight || ''} 
                                                  onChange={e => setLandingConfig({...landingConfig, appLogoUrlLight: e.target.value})}
                                                  className={`flex-1 p-2 border rounded-lg text-sm transition-all ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
                                                  placeholder="Light mode logo..."
                                              />
                                              <div className={`w-10 h-10 rounded border overflow-hidden shrink-0 p-1 ${theme === 'dark' ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-slate-50'}`}>
                                                  <img src={landingConfig.appLogoUrlLight || undefined} alt="L" className="w-full h-full object-contain" />
                                              </div>
                                          </div>
                                      </div>
                                      <div className="space-y-2">
                                          <span className={`text-[10px] uppercase font-bold ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Dark Mode</span>
                                          <div className="flex gap-2">
                                              <input 
                                                  type="text" 
                                                  value={landingConfig.appLogoUrlDark || ''} 
                                                  onChange={e => setLandingConfig({...landingConfig, appLogoUrlDark: e.target.value})}
                                                  className={`flex-1 p-2 border rounded-lg text-sm transition-all ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
                                                  placeholder="Dark mode logo..."
                                              />
                                              <div className={`w-10 h-10 rounded border overflow-hidden shrink-0 p-1 ${theme === 'dark' ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-slate-50'}`}>
                                                  <img src={landingConfig.appLogoUrlDark || undefined} alt="D" className="w-full h-full object-contain" />
                                              </div>
                                          </div>
                                      </div>
                                  </div>
                                  <div className="space-y-2">
                                      <span className={`text-[10px] uppercase font-bold ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Default Fallback</span>
                                      <input 
                                          type="text" 
                                          value={landingConfig.appLogoUrl || ''} 
                                          onChange={e => setLandingConfig({...landingConfig, appLogoUrl: e.target.value})}
                                          className={`w-full p-2 border rounded-lg text-sm transition-all ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
                                          placeholder="Default logo..."
                                      />
                                  </div>
                              </div>
                          </div>
                      </div>

                      {/* SECTION 4: BROWSER METADATA */}
                      <div className={`rounded-2xl border shadow-sm overflow-hidden ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                          <div className={`px-6 py-3 border-b ${theme === 'dark' ? 'bg-slate-800/50 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                              <h3 className={`text-sm font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>4. Browser Metadata</h3>
                          </div>
                          <div className="p-6 space-y-6">
                              <div className="space-y-2">
                                  <label className={`text-xs font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Browser Tab Title</label>
                                  <input 
                                      type="text" 
                                      value={landingConfig.browserTitle || ''} 
                                      onChange={e => setLandingConfig({...landingConfig, browserTitle: e.target.value})}
                                      className={`w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
                                      placeholder="e.g. Digital Built Environment | Learning Platform"
                                  />
                                  <p className={`text-[10px] font-mono ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>This text appears in the browser tab.</p>
                              </div>                              <div className="space-y-4">
                                  <label className={`text-xs font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Favicon URL (.ico, .png, .svg)</label>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <div className="space-y-2">
                                          <span className={`text-[10px] uppercase font-bold ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Light Mode</span>
                                          <div className="flex gap-2">
                                              <input 
                                                  type="text" 
                                                  value={landingConfig.faviconUrlLight || ''} 
                                                  onChange={e => setLandingConfig({...landingConfig, faviconUrlLight: e.target.value})}
                                                  className={`flex-1 p-2 border rounded-lg text-sm transition-all ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
                                                  placeholder="Light mode favicon..."
                                              />
                                              <div className={`w-10 h-10 rounded border overflow-hidden shrink-0 p-1 flex items-center justify-center ${theme === 'dark' ? 'border-slate-700 bg-white' : 'border-slate-200 bg-slate-50'}`}>
                                                  <img src={landingConfig.faviconUrlLight || undefined} alt="L" className="w-full h-full object-contain" />
                                              </div>
                                          </div>
                                      </div>
                                      <div className="space-y-2">
                                          <span className={`text-[10px] uppercase font-bold ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Dark Mode</span>
                                          <div className="flex gap-2">
                                              <input 
                                                  type="text" 
                                                  value={landingConfig.faviconUrlDark || ''} 
                                                  onChange={e => setLandingConfig({...landingConfig, faviconUrlDark: e.target.value})}
                                                  className={`flex-1 p-2 border rounded-lg text-sm transition-all ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
                                                  placeholder="Dark mode favicon..."
                                              />
                                              <div className={`w-10 h-10 rounded border overflow-hidden shrink-0 p-1 flex items-center justify-center ${theme === 'dark' ? 'border-slate-700 bg-white' : 'border-slate-200 bg-slate-50'}`}>
                                                  <img src={landingConfig.faviconUrlDark || undefined} alt="D" className="w-full h-full object-contain" />
                                              </div>
                                          </div>
                                      </div>
                                  </div>
                                  <div className="space-y-2">
                                      <span className={`text-[10px] uppercase font-bold ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Default Fallback</span>
                                      <input 
                                          type="text" 
                                          value={landingConfig.faviconUrl || ''} 
                                          onChange={e => setLandingConfig({...landingConfig, faviconUrl: e.target.value})}
                                          className={`w-full p-2 border rounded-lg text-sm transition-all ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
                                          placeholder="Default favicon..."
                                      />
                                  </div>
                                  <p className={`text-[10px] font-mono ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>The small icon displayed next to the title in the browser tab.</p>
                              </div>
                          </div>
                      </div>

                      {/* SECTION 5: INTERFACE SETTINGS */}
                      <div className={`rounded-2xl border shadow-sm overflow-hidden ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                          <div className={`px-6 py-3 border-b ${theme === 'dark' ? 'bg-slate-800/50 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                              <h3 className={`text-sm font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>5. Interface Settings</h3>
                          </div>
                          <div className="p-6 space-y-6">
                              <div className={`flex items-center justify-between p-4 rounded-xl border ${theme === 'dark' ? 'bg-slate-800/50 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                                  <div>
                                      <h4 className={`text-sm font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Show Teachers Tab</h4>
                                      <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Enable or disable the "Teachers" tab for students.</p>
                                  </div>
                                  <button 
                                      onClick={() => setLandingConfig({...landingConfig, showTeachersTab: landingConfig.showTeachersTab === false ? true : false})}
                                      className={`w-12 h-6 rounded-full transition-all relative ${landingConfig.showTeachersTab !== false ? 'bg-blue-600' : 'bg-slate-700'}`}
                                  >
                                      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${landingConfig.showTeachersTab !== false ? 'left-7' : 'left-1'}`} />
                                  </button>
                              </div>

                              <div className={`flex items-center justify-between p-4 rounded-xl border ${theme === 'dark' ? 'bg-slate-800/50 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                                  <div>
                                      <h4 className={`text-sm font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Show Student Analytics</h4>
                                      <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Allow students to see their personal progress tab.</p>
                                  </div>
                                  <button 
                                      onClick={() => setLandingConfig({...landingConfig, showStudentAnalytics: !landingConfig.showStudentAnalytics})}
                                      className={`w-12 h-6 rounded-full transition-all relative ${landingConfig.showStudentAnalytics ? 'bg-blue-600' : 'bg-slate-700'}`}
                                  >
                                      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${landingConfig.showStudentAnalytics ? 'left-7' : 'left-1'}`} />
                                  </button>
                              </div>

                              {landingConfig.showStudentAnalytics && (
                                  <div className={`pl-6 space-y-4 border-l-2 ml-4 ${theme === 'dark' ? 'border-slate-800' : 'border-slate-200'}`}>
                                      <div className={`flex items-center justify-between p-3 rounded-lg ${theme === 'dark' ? 'bg-slate-800/30' : 'bg-slate-50'}`}>
                                          <div className={`text-xs font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>Radar Chart (Performance)</div>
                                          <button 
                                              onClick={() => setLandingConfig({...landingConfig, showStudentRadar: landingConfig.showStudentRadar === false ? true : false})}
                                              className={`w-10 h-5 rounded-full transition-all relative ${landingConfig.showStudentRadar !== false ? 'bg-blue-500/50' : 'bg-slate-700'}`}
                                          >
                                              <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${landingConfig.showStudentRadar !== false ? 'left-6' : 'left-1'}`} />
                                          </button>
                                      </div>
                                      <div className={`flex items-center justify-between p-3 rounded-lg ${theme === 'dark' ? 'bg-slate-800/30' : 'bg-slate-50'}`}>
                                          <div className={`text-xs font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>Bar Chart (Module Progress)</div>
                                          <button 
                                              onClick={() => setLandingConfig({...landingConfig, showStudentBar: landingConfig.showStudentBar === false ? true : false})}
                                              className={`w-10 h-5 rounded-full transition-all relative ${landingConfig.showStudentBar !== false ? 'bg-blue-500/50' : 'bg-slate-700'}`}
                                          >
                                              <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${landingConfig.showStudentBar !== false ? 'left-6' : 'left-1'}`} />
                                          </button>
                                      </div>
                                      <div className={`flex items-center justify-between p-3 rounded-lg ${theme === 'dark' ? 'bg-slate-800/30' : 'bg-slate-50'}`}>
                                          <div className={`text-xs font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>Line Chart (Timeline)</div>
                                          <button 
                                              onClick={() => setLandingConfig({...landingConfig, showStudentLine: landingConfig.showStudentLine === false ? true : false})}
                                              className={`w-10 h-5 rounded-full transition-all relative ${landingConfig.showStudentLine !== false ? 'bg-blue-500/50' : 'bg-slate-700'}`}
                                          >
                                              <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${landingConfig.showStudentLine !== false ? 'left-6' : 'left-1'}`} />
                                          </button>
                                      </div>
                                      <div className={`flex items-center justify-between p-3 rounded-lg ${theme === 'dark' ? 'bg-slate-800/30' : 'bg-slate-50'}`}>
                                          <div className={`text-xs font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>Scatter Plot (Quiz Performance)</div>
                                          <button 
                                              onClick={() => setLandingConfig({...landingConfig, showStudentScatter: landingConfig.showStudentScatter === false ? true : false})}
                                              className={`w-10 h-5 rounded-full transition-all relative ${landingConfig.showStudentScatter !== false ? 'bg-blue-500/50' : 'bg-slate-700'}`}
                                          >
                                              <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${landingConfig.showStudentScatter !== false ? 'left-6' : 'left-1'}`} />
                                          </button>
                                      </div>
                                      <div className={`flex items-center justify-between p-3 rounded-lg ${theme === 'dark' ? 'bg-slate-800/30' : 'bg-slate-50'}`}>
                                          <div className={`text-xs font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>Show Submissions Tab</div>
                                          <button 
                                              onClick={() => setLandingConfig({...landingConfig, showStudentSubmissions: landingConfig.showStudentSubmissions === false ? true : false})}
                                              className={`w-10 h-5 rounded-full transition-all relative ${landingConfig.showStudentSubmissions !== false ? 'bg-blue-500/50' : 'bg-slate-700'}`}
                                          >
                                              <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${landingConfig.showStudentSubmissions !== false ? 'left-6' : 'left-1'}`} />
                                          </button>
                                      </div>
                                      <div className={`flex items-center justify-between p-3 rounded-lg ${theme === 'dark' ? 'bg-slate-800/30' : 'bg-slate-50'}`}>
                                          <div className={`text-xs font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>Show Submissions Tab</div>
                                          <button 
                                              onClick={() => setLandingConfig({...landingConfig, showStudentSubmissions: landingConfig.showStudentSubmissions === false ? true : false})}
                                              className={`w-10 h-5 rounded-full transition-all relative ${landingConfig.showStudentSubmissions !== false ? 'bg-blue-500/50' : 'bg-slate-700'}`}
                                          >
                                              <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${landingConfig.showStudentSubmissions !== false ? 'left-6' : 'left-1'}`} />
                                          </button>
                                      </div>
                                  </div>
                              )}
                          </div>
                      </div>

                      <div className={`p-6 border rounded-2xl ${theme === 'dark' ? 'bg-blue-500/10 border-blue-500/20' : 'bg-blue-50 border-blue-100'}`}>
                          <div className="flex gap-4">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${theme === 'dark' ? 'bg-blue-500/20' : 'bg-blue-100'}`}>
                                  <Sparkles className="text-blue-400 w-5 h-5" />
                              </div>
                              <div>
                                  <h4 className={`text-sm font-bold mb-1 ${theme === 'dark' ? 'text-blue-100' : 'text-blue-900'}`}>Live Preview</h4>
                                  <p className={`text-xs leading-relaxed ${theme === 'dark' ? 'text-blue-300' : 'text-blue-700'}`}>
                                      Changes made here will be reflected across the entire platform's user interface.
                                  </p>
                              </div>
                          </div>
                      </div>
                  </div>
              </div>
          )}

          {activeTab === 'USERS_LIST' && (
              <div className={`h-full p-8 overflow-y-auto ${theme === 'dark' ? 'bg-slate-950' : 'bg-slate-50'}`}>
                  <div className="max-w-6xl mx-auto">
                      <div className="flex justify-between items-center mb-8">
                          <div>
                              <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>User Access Control</h2>
                              <p className="text-slate-400">Create credentials and assign personalized curriculums.</p>
                          </div>
                          <button onClick={handleAddUser} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-lg shadow-blue-900/20">
                              <UserPlus size={16} /> Create User
                          </button>
                      </div>

                      <div className="space-y-6">
                          {users.map(user => (
                              <div key={user.id} className={`rounded-xl shadow-sm overflow-hidden border ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                                  {editingUserId === user.id ? (
                                      <div className="p-6">
                                          <div className={`flex justify-between items-center mb-6 border-b pb-4 ${theme === 'dark' ? 'border-slate-800' : 'border-slate-200'}`}>
                                              <h3 className={`font-bold flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}><Settings size={18} className="text-blue-400"/> Editing User: {user.email}</h3>
                                              <div className="flex gap-2">
                                                  <button onClick={() => setEditingUserId(null)} className={`px-3 py-1.5 text-sm rounded transition-colors ${theme === 'dark' ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}>Done</button>
                                                  <button onClick={() => handleDeleteUser(user.id)} className="px-3 py-1.5 text-sm bg-red-900/20 hover:bg-red-900/30 text-red-400 rounded">Delete</button>
                                              </div>
                                          </div>
                                          
                                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                              <div className="space-y-4">
                                                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Credentials</h4>
                                                  <div className="grid grid-cols-2 gap-4">
                                                      <div>
                                                          <label className="text-xs font-medium text-slate-500">Name</label>
                                                          <input className={`w-full p-2 border rounded text-sm outline-none focus:border-blue-500 transition-all ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`} value={user.name} onChange={e => handleUpdateUser(user.id, {...user, name: e.target.value})} />
                                                      </div>
                                                      <div>
                                                          <label className="text-xs font-medium text-slate-500">Role</label>
                                                          <select className={`w-full p-2 border rounded text-sm outline-none focus:border-blue-500 transition-all ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`} value={user.role} onChange={e => handleUpdateUser(user.id, {...user, role: e.target.value as any})}>
                                                              <option value="student">Student</option>
                                                              <option value="admin">Admin</option>
                                                          </select>
                                                      </div>
                                                      <div>
                                                          <label className="text-xs font-medium text-slate-500">Email (Login)</label>
                                                          <input className={`w-full p-2 border rounded text-sm outline-none focus:border-blue-500 transition-all ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`} value={user.email} onChange={e => handleUpdateUser(user.id, {...user, email: e.target.value})} />
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
                                                                className={`w-full p-2 border rounded text-sm outline-none focus:border-blue-500 transition-all ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
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
                                                                  className={`flex-1 p-2 border rounded text-xs font-mono outline-none focus:border-blue-500 transition-all ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`} 
                                                                  value={user.profileColor || '#3b82f6'} 
                                                                  onChange={e => handleUpdateUser(user.id, {...user, profileColor: e.target.value})} 
                                                              />
                                                          </div>
                                                      </div>
                                                      <div className="flex items-end">
                                                          <div className={`text-[10px] italic p-2 rounded border w-full ${theme === 'dark' ? 'text-slate-500 bg-slate-800/50 border-slate-800' : 'text-slate-400 bg-slate-50 border-slate-200'}`}>
                                                              {user.status === 'pending' ? 'User has not activated their account yet.' : 'User is active and linked to Firebase Auth.'}
                                                          </div>
                                                      </div>
                                                  </div>
                                                  
                                                  <div className={`mt-8 pt-4 border-t ${theme === 'dark' ? 'border-slate-800' : 'border-slate-200'}`}>
                                                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Learning Progress</h4>
                                                      <div className="grid grid-cols-3 gap-4 text-center mb-6">
                                                          <div className={`p-3 rounded border ${theme === 'dark' ? 'bg-slate-800/50 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                                                              <div className="text-xl font-bold text-blue-400">{(user.completedSubTopics || []).length}</div>
                                                              <div className="text-[10px] text-slate-500 uppercase">Completed</div>
                                                          </div>
                                                          <div className={`p-3 rounded border ${theme === 'dark' ? 'bg-slate-800/50 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                                                              <div className="text-xl font-bold text-green-400">{(user.quizAttempts || []).length}</div>
                                                              <div className="text-[10px] text-slate-500 uppercase">Quizzes Taken</div>
                                                          </div>
                                                          <div className={`p-3 rounded border ${theme === 'dark' ? 'bg-slate-800/50 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                                                              <div className={`text-xl font-bold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
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
                                                              <div className={`rounded-lg border p-3 max-h-48 overflow-y-auto space-y-2 ${theme === 'dark' ? 'bg-slate-800/50 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                                                                  {(user.completedSubTopics || []).length > 0 ? (
                                                                      [...(user.completedSubTopics || [])].sort((a,b) => (b.completedAt || '').localeCompare(a.completedAt || '')).map(record => {
                                                                          const subTopic = topics.flatMap(t => t.subTopics).find(st => st.id === record.id);
                                                                          return (
                                                                              <div key={record.id} className={`flex justify-between items-center text-[11px] border-b pb-1 last:border-0 last:pb-0 ${theme === 'dark' ? 'border-slate-800' : 'border-slate-200'}`}>
                                                                                  <span className={`font-medium truncate max-w-[150px] ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>{subTopic?.title || 'Unknown Module'}</span>
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
                                                              <div className={`rounded-lg border p-3 max-h-64 overflow-y-auto space-y-3 ${theme === 'dark' ? 'bg-slate-800/50 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                                                                  {(user.quizAttempts || []).length > 0 ? (
                                                                      [...(user.quizAttempts || [])].sort((a,b) => (b.timestamp || '').localeCompare(a.timestamp || '')).map((attempt, idx) => {
                                                                          const subTopic = topics.flatMap(t => t.subTopics).find(st => st.id === attempt.subTopicId);
                                                                          return (
                                                                              <div key={idx} className={`p-2 rounded border shadow-sm ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                                                                                  <div className="flex justify-between items-start mb-1">
                                                                                      <div className={`text-11px font-bold truncate max-w-[140px] ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>{subTopic?.title || 'Unknown Quiz'}</div>
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
                                                                                      <div className={`mt-1 pt-1 border-t ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}>
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

                                              <div className={`p-5 rounded-xl border ${theme === 'dark' ? 'bg-slate-800/50 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
                                                  <h4 className={`text-xs font-bold uppercase tracking-wider mb-4 flex items-center gap-2 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}><LockIcon size={14}/> Assigned Curriculum Modules</h4>
                                                  <p className="text-xs text-slate-500 mb-4">Uncheck modules to lock them for this user. They will appear greyed out in their graph.</p>
                                                  
                                                  <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                                                      {topics.map(t => {
                                                          const isAllowed = user.allowedTopics ? user.allowedTopics.includes(t.id) : true; // Default true if undefined
                                                          return (
                                                              <div key={t.id} onClick={() => handleToggleUserTopic(user, t.id)} className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${isAllowed ? (theme === 'dark' ? 'bg-slate-800 border-green-500/30 shadow-sm' : 'bg-green-50 border-green-200 shadow-sm') : (theme === 'dark' ? 'bg-slate-900 border-transparent opacity-40' : 'bg-slate-100 border-transparent opacity-40')}`}>
                                                                  <div className={`w-5 h-5 rounded flex items-center justify-center border mr-3 ${isAllowed ? 'bg-green-500 border-green-600 text-white' : (theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300')}`}>
                                                                      {isAllowed && <CheckSquare size={14} />}
                                                                  </div>
                                                                  <div className="flex-1">
                                                                      <div className={`text-sm font-bold ${isAllowed ? (theme === 'dark' ? 'text-white' : 'text-slate-900') : 'text-slate-500'}`}>{t.title}</div>
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
                                      <div className={`p-4 flex items-center justify-between transition-colors ${theme === 'dark' ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'}`}>
                                          <div className="flex items-center gap-4">
                                              <div 
                                                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold overflow-hidden shadow-sm"
                                                style={{ backgroundColor: user.profileColor || '#475569' }}
                                              >
                                                  {user.avatar ? <img src={user.avatar || undefined} className="w-full h-full object-cover"/> : user.name[0]}
                                              </div>
                                              <div>
                                                  <h3 className={`font-bold ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>{user.name}</h3>
                                                  <div className="flex items-center gap-2 text-xs text-slate-500">
                                                      <span className="font-mono">{user.email}</span>
                                                      <span className={`px-1.5 py-0.5 rounded uppercase font-bold text-[10px] ${user.role === 'admin' ? 'bg-purple-900/30 text-purple-400' : 'bg-blue-900/30 text-blue-400'}`}>{user.role || 'student'}</span>
                                                  </div>
                                              </div>
                                          </div>
                                          <div className="flex items-center gap-6">
                                              <div className="text-right hidden sm:block">
                                                  <div className="text-xs text-slate-500 uppercase font-bold">Progress</div>
                                                  <div className={`text-sm font-bold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                                                      {Math.round(((user.completedSubTopics || []).length / (topics.reduce((acc, t) => acc + t.subTopics.length, 0) || 1)) * 100)}%
                                                  </div>
                                              </div>
                                              <div className="text-right hidden sm:block">
                                                  <div className="text-xs text-slate-500 uppercase font-bold">Access</div>
                                                  <div className={`text-sm font-bold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>{(user.allowedTopics || []).length} / {topics.length} Topics</div>
                                              </div>
                                              <button onClick={() => setEditingUserId(user.id)} className={`border hover:border-blue-500 text-slate-400 hover:text-blue-400 p-2 rounded-lg transition-colors ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`}>
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

          {activeTab === 'NOTIFICATIONS' && (
            <NotificationsView 
              notifications={notifications}
              onMarkRead={onMarkNotificationRead}
              onDelete={onDeleteNotification}
              onEvaluate={onEvaluateSubmission}
              onRequestResubmission={onRequestResubmission}
              onToggleCompleted={onToggleNotificationCompleted}
              onDeleteFile={onDeleteFile}
              onPostSubmissionComment={onPostSubmissionComment}
              theme={theme}
            />
          )}

          {activeTab === 'ANALYTICS' && (
              <div className={`h-full overflow-y-auto transition-colors duration-300 ${theme === 'dark' ? 'bg-slate-950' : 'bg-slate-50'}`}>
                  <div className="p-4 sm:p-8">
                      <AnalyticsView 
                          users={users} 
                          topics={topics} 
                          tags={tags}
                          landingConfig={landingConfig}
                          notifications={notifications}
                          submissions={submissions}
                          onEvaluateSubmission={onEvaluateSubmission}
                          onRequestResubmission={onRequestResubmission}
                          onPostSubmissionComment={onPostSubmissionComment}
                          onDeleteComment={onDeleteComment}
                          onDeleteFile={onDeleteFile}
                          isAdmin={isAdmin}
                          theme={theme}
                      />
                  </div>
              </div>
          )}

          {activeTab === 'TAGS' && (
              <div className={`h-full overflow-y-auto transition-colors duration-300 ${theme === 'dark' ? 'bg-slate-950' : 'bg-slate-50'}`}>
                  <div className="p-8">
                      <TagManagementView 
                          tags={tags}
                          setTags={setTags}
                          theme={theme}
                      />
                  </div>
              </div>
          )}
      </div>
    </div>
  );
}
