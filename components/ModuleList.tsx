
import React, { useState } from 'react';
import { Topic } from '../types';
import { ChevronDown, ChevronRight, CheckCircle2, Circle, Clock, ArrowRight } from 'lucide-react';

interface ModuleListProps {
  topics: Topic[];
  completedSubTopics: Set<string>;
  onSelectTopic: (topic: Topic, subTopicId?: string) => void;
}

const ModuleList: React.FC<ModuleListProps> = ({ topics, completedSubTopics, onSelectTopic }) => {
  // Sort topics by level to show hierarchy roughly
  const sortedTopics = [...topics].sort((a, b) => {
      if (a.level !== b.level) return a.level - b.level;
      return a.title.localeCompare(b.title);
  });

  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set(topics.map(t => t.id)));

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedTopics(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
    });
  };

  return (
    <div className="w-full h-full overflow-y-auto bg-slate-950 p-6 lg:p-12">
        <div className="max-w-4xl mx-auto space-y-8">
            <header className="mb-8">
                <h2 className="text-3xl font-bold text-white mb-2">My Curriculum Progress</h2>
                <p className="text-slate-400">Track your completion status across all modules in the Recurrent Program.</p>
            </header>

            <div className="space-y-4">
                {sortedTopics.map(topic => {
                    const completedCount = topic.subTopics.filter(st => completedSubTopics.has(st.id)).length;
                    const totalCount = topic.subTopics.length;
                    const progress = Math.round((completedCount / totalCount) * 100);
                    const isExpanded = expandedTopics.has(topic.id);
                    const isFullyComplete = completedCount === totalCount;

                    return (
                        <div key={topic.id} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-slate-700 transition-colors">
                            {/* Topic Header */}
                            <div 
                                className="p-6 cursor-pointer hover:bg-slate-800/50 transition-colors"
                                onClick={() => onSelectTopic(topic)}
                            >
                                <div className="flex items-start md:items-center justify-between gap-4 mb-4">
                                    <div className="flex items-center gap-4">
                                        <button 
                                            onClick={(e) => toggleExpand(topic.id, e)}
                                            className="p-1 rounded-md hover:bg-slate-700 text-slate-400"
                                        >
                                            {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                                        </button>
                                        
                                        <div className="w-12 h-12 rounded-lg shrink-0 overflow-hidden relative">
                                            <img src={topic.imageUrl} alt={topic.title} className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-black/20"></div>
                                        </div>

                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-xl font-bold text-white hover:text-blue-400 transition-colors">{topic.title}</h3>
                                                {isFullyComplete && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                                                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${
                                                    topic.level === 1 ? 'border-blue-500/30 text-blue-400 bg-blue-500/10' :
                                                    topic.level === 2 ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10' :
                                                    'border-purple-500/30 text-purple-400 bg-purple-500/10'
                                                }`}>
                                                    Level {topic.level}
                                                </span>
                                            </div>
                                            <p className="text-sm text-slate-400">{topic.shortDescription}</p>
                                        </div>
                                    </div>
                                    
                                    <div className="hidden md:block text-right">
                                        <button className="text-sm font-medium text-blue-400 hover:text-white flex items-center gap-1">
                                            Go to Module <ArrowRight className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                {/* Progress Bar */}
                                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden flex items-center">
                                    <div 
                                        className={`h-full transition-all duration-700 ${isFullyComplete ? 'bg-green-500' : 'bg-blue-600'}`} 
                                        style={{ width: `${progress}%` }}
                                    ></div>
                                </div>
                                <div className="flex justify-between mt-2 text-xs text-slate-500">
                                    <span>{progress}% Completed</span>
                                    <span>{completedCount}/{totalCount} Steps</span>
                                </div>
                            </div>

                            {/* Subtopics List (Accordion) */}
                            {isExpanded && (
                                <div className="border-t border-slate-800 bg-slate-950/50 p-4 space-y-1">
                                    {topic.subTopics.map((sub, idx) => {
                                        const isSubComplete = completedSubTopics.has(sub.id);
                                        return (
                                            <div 
                                                key={sub.id} 
                                                onClick={(e) => { e.stopPropagation(); onSelectTopic(topic, sub.id); }}
                                                className="flex items-center gap-4 p-3 rounded-lg hover:bg-slate-900 cursor-pointer transition-colors text-sm group"
                                            >
                                                 <div className={`shrink-0 ${isSubComplete ? 'text-green-500' : 'text-slate-600'}`}>
                                                    {isSubComplete ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                                                 </div>
                                                 <div className="w-8 text-center text-slate-500 font-mono text-xs group-hover:text-white">{idx + 1}</div>
                                                 <div className="flex-1">
                                                     <div className={`font-medium group-hover:text-blue-400 transition-colors ${isSubComplete ? 'text-slate-400 line-through' : 'text-slate-200'}`}>
                                                        {sub.title}
                                                     </div>
                                                 </div>
                                                 <div className="flex items-center gap-1 text-slate-600 text-xs">
                                                     <Clock className="w-3 h-3" /> {sub.duration}
                                                 </div>
                                            </div>
                                        );
                                    })}
                                    <div className="pt-4 flex justify-center">
                                        <button 
                                            onClick={() => onSelectTopic(topic)}
                                            className="text-sm text-slate-500 hover:text-white transition-colors"
                                        >
                                            View Full Module Details
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    </div>
  );
};

export default ModuleList;
