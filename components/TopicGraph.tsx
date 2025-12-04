
import React, { useEffect, useRef, useMemo, useState } from 'react';
import * as d3 from 'd3';
import { Topic } from '../types';
import { Check } from 'lucide-react';

interface TopicGraphProps {
  topics: Topic[];
  onSelectTopic: (topic: Topic) => void;
  completedSubTopics: Set<string>;
}

// Layout Constants
const NODE_WIDTH = 240;
const NODE_HEIGHT = 160;
const LEVEL_SPACING = 500; 
const NODE_SPACING = 280;  
const CONNECTOR_OFFSET = 15; 

const TopicGraph: React.FC<TopicGraphProps> = ({ topics, onSelectTopic, completedSubTopics }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [coords, setCoords] = useState({ x: 0, y: 0, z: 0 });
  const transformRef = useRef<d3.ZoomTransform>(d3.zoomIdentity);
  const [hiddenTeacherEmails, setHiddenTeacherEmails] = useState<Set<string>>(new Set());

  // Derive unique teachers from topics
  const uniqueTeachers = useMemo(() => {
    const map = new Map();
    topics.forEach(t => {
        if(!map.has(t.teacher.email)) map.set(t.teacher.email, t.teacher);
    });
    return Array.from(map.values());
  }, [topics]);

  const toggleTeacher = (email: string) => {
    setHiddenTeacherEmails(prev => {
        const next = new Set(prev);
        if (next.has(email)) next.delete(email);
        else next.add(email);
        return next;
    });
  };

  // Helper to calculate progress stats for a single topic
  const getProgressStats = useMemo(() => (topic: Topic) => {
    if (topic.subTopics.length === 0) return { completed: 0, total: 0, percent: 0 };
    const completed = topic.subTopics.filter(st => completedSubTopics.has(st.id)).length;
    const total = topic.subTopics.length;
    return {
        completed,
        total,
        percent: (completed / total) * 100
    };
  }, [completedSubTopics]);

  // Overall Stats for the Overlay
  const overallStats = useMemo(() => {
    let completed = 0;
    let total = 0;
    topics.forEach(t => {
        t.subTopics.forEach(st => {
            total++;
            if (completedSubTopics.has(st.id)) completed++;
        });
    });
    return { 
        completed, 
        total, 
        percent: total > 0 ? Math.round((completed/total)*100) : 0 
    };
  }, [topics, completedSubTopics]);

  const isComplete = useMemo(() => (topic: Topic) => {
    const stats = getProgressStats(topic);
    return stats.total > 0 && stats.percent === 100;
  }, [getProgressStats]);

  useEffect(() => {
    if (!topics.length || !svgRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    // --- 1. Layout Engine (Multi-Pass Barycentric Sweep) ---
    
    const levels: Record<number, Topic[]> = {};
    let maxLevel = 0;
    topics.forEach(t => {
        if (!levels[t.level]) levels[t.level] = [];
        levels[t.level].push(t);
        if (t.level > maxLevel) maxLevel = t.level;
    });

    const nodePositions: Map<string, { x: number, y: number }> = new Map();

    const applySpacing = (sortedNodes: Topic[], startX: number) => {
        const count = sortedNodes.length;
        const totalHeight = count * NODE_SPACING;
        const startY = (height / 2) - (totalHeight / 2) + (NODE_SPACING / 2);
        
        sortedNodes.forEach((node, i) => {
            nodePositions.set(node.id, {
                x: startX,
                y: startY + (i * NODE_SPACING)
            });
        });
    };

    // Initial Positions
    for (let lvl = 1; lvl <= maxLevel; lvl++) {
        const nodes = levels[lvl] || [];
        // Initial sort by relationship or index to keep some stability
        applySpacing(nodes, 100 + (lvl - 1) * LEVEL_SPACING);
    }

    // Iterative Refinement (10 Passes) to minimize global crossings
    for (let i = 0; i < 10; i++) {
        // Forward Pass (Align with parents)
        for (let lvl = 2; lvl <= maxLevel; lvl++) {
            const currentNodes = levels[lvl] || [];
            const nodesWithWeight = currentNodes.map(node => {
                const parents = topics.filter(p => p.relatedTopics.includes(node.id) && p.level < lvl);
                let weight = nodePositions.get(node.id)?.y || 0;
                if (parents.length > 0) {
                    const sumY = parents.reduce((sum, p) => sum + (nodePositions.get(p.id)?.y || 0), 0);
                    weight = sumY / parents.length;
                }
                return { node, weight };
            });
            nodesWithWeight.sort((a, b) => a.weight - b.weight);
            applySpacing(nodesWithWeight.map(n => n.node), 100 + (lvl - 1) * LEVEL_SPACING);
        }

        // Backward Pass (Align with children)
        for (let lvl = maxLevel - 1; lvl >= 1; lvl--) {
            const currentNodes = levels[lvl] || [];
            const nodesWithWeight = currentNodes.map(node => {
                const children = topics.filter(t => node.relatedTopics.includes(t.id) && t.level > lvl);
                let weight = nodePositions.get(node.id)?.y || 0;
                if (children.length > 0) {
                    const sumY = children.reduce((sum, c) => sum + (nodePositions.get(c.id)?.y || 0), 0);
                    weight = sumY / children.length;
                }
                return { node, weight };
            });
            nodesWithWeight.sort((a, b) => a.weight - b.weight);
            applySpacing(nodesWithWeight.map(n => n.node), 100 + (lvl - 1) * LEVEL_SPACING);
        }
    }

    // --- 2. Edge Routing & Port Sorting ---
    
    // 2a. Create intermediate node objects
    const nodes = topics.map(t => {
        const pos = nodePositions.get(t.id) || { x: 0, y: 0 };
        const stats = getProgressStats(t);
        return {
            ...t,
            x: pos.x,
            y: pos.y,
            stats,
            complete: stats.percent === 100
        };
    });

    // 2b. Generate all links first
    interface LinkData {
        source: typeof nodes[0];
        target: typeof nodes[0];
        active: boolean;
        sourceIndex?: number;
        sourceTotal?: number;
        targetIndex?: number;
        targetTotal?: number;
    }

    const allLinks: LinkData[] = [];
    nodes.forEach(source => {
        source.relatedTopics.forEach(targetId => {
            const target = nodes.find(n => n.id === targetId);
            if (target && source.level < target.level) {
                allLinks.push({
                    source,
                    target,
                    active: source.complete
                });
            }
        });
    });

    // 2c. Sort Ports to minimize local crossings
    // For each node, sort its OUTGOING links based on the Y position of the TARGET
    nodes.forEach(node => {
        const outgoing = allLinks.filter(l => l.source.id === node.id);
        outgoing.sort((a, b) => a.target.y - b.target.y);
        outgoing.forEach((link, i) => {
            link.sourceIndex = i;
            link.sourceTotal = outgoing.length;
        });
    });

    // For each node, sort its INCOMING links based on the Y position of the SOURCE
    nodes.forEach(node => {
        const incoming = allLinks.filter(l => l.target.id === node.id);
        incoming.sort((a, b) => a.source.y - b.source.y);
        incoming.forEach((link, i) => {
            link.targetIndex = i;
            link.targetTotal = incoming.length;
        });
    });

    // --- 3. D3 Rendering ---
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const zoomGroup = svg.append("g");
    
    const zoom = d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.1, 4])
        .on("zoom", (event) => {
            zoomGroup.attr("transform", event.transform);
            transformRef.current = event.transform; 
        });

    // Initial Zoom Fit Logic (Only if first render or zoom is identity)
    const isZoomIdentity = transformRef.current.k === 1 && transformRef.current.x === 0 && transformRef.current.y === 0;

    const minX = d3.min(nodes, d => d.x) || 0;
    const maxX = d3.max(nodes, d => d.x + NODE_WIDTH) || 0;
    const minY = d3.min(nodes, d => d.y) || 0;
    const maxY = d3.max(nodes, d => d.y + NODE_HEIGHT) || 0;

    const graphWidth = maxX - minX;
    const graphHeight = maxY - minY;
    
    const padding = 100;
    const availableWidth = width - (padding * 2);
    const availableHeight = height - (padding * 2);
    
    let scale = Math.min(
        availableWidth / graphWidth,
        availableHeight / graphHeight
    );
    if (scale > 1) scale = 1;
    if (scale < 0.1) scale = 0.1;

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    
    const tx = (width / 2) - (scale * centerX);
    const ty = (height / 2) - (scale * centerY);

    const initialTransform = d3.zoomIdentity.translate(tx, ty).scale(scale);

    svg.call(zoom);
    
    // Apply transform: use current if available to maintain zoom across filter changes, else use initial fit
    if (!isZoomIdentity) {
        svg.call(zoom.transform, transformRef.current);
    } else {
        svg.call(zoom.transform, initialTransform);
    }

    // Defs
    const defs = svg.append("defs");
    const patternSize = 30; 
    const pattern = defs.append("pattern")
        .attr("id", "cross-pattern")
        .attr("width", patternSize)
        .attr("height", patternSize)
        .attr("patternUnits", "userSpaceOnUse");
    
    pattern.append("path")
        .attr("d", `M 3 0 L -3 0 M 0 3 L 0 -3`)
        .attr("transform", `translate(${patternSize/2}, ${patternSize/2})`)
        .attr("stroke", "#475569")
        .attr("stroke-width", 1)
        .attr("opacity", 0.4);

    nodes.forEach(node => {
        defs.append("pattern")
            .attr("id", `img-${node.id}`)
            .attr("patternUnits", "objectBoundingBox")
            .attr("width", 1)
            .attr("height", 1)
            .append("image")
            .attr("xlink:href", node.imageUrl)
            .attr("width", NODE_WIDTH)
            .attr("height", NODE_HEIGHT - 40)
            .attr("preserveAspectRatio", "xMidYMid slice");
    });

    zoomGroup.append("rect")
        .attr("x", -50000)
        .attr("y", -50000)
        .attr("width", 100000)
        .attr("height", 100000)
        .attr("fill", "url(#cross-pattern)");

    // Links
    const linkSelection = zoomGroup.selectAll(".link")
        .data(allLinks)
        .enter()
        .append("path")
        .attr("class", "link transition-all duration-300")
        .attr("d", d => {
            const sIdx = d.sourceIndex || 0;
            const sTot = d.sourceTotal || 1;
            const tIdx = d.targetIndex || 0;
            const tTot = d.targetTotal || 1;

            const sOffset = (sIdx - (sTot - 1) / 2) * CONNECTOR_OFFSET;
            const tOffset = (tIdx - (tTot - 1) / 2) * CONNECTOR_OFFSET;

            const sx = d.source.x + NODE_WIDTH;
            const sy = d.source.y + (NODE_HEIGHT / 2) + sOffset; 
            const tx = d.target.x;
            const ty = d.target.y + (NODE_HEIGHT / 2) + tOffset; 
            
            const gapWidth = LEVEL_SPACING - NODE_WIDTH;
            const turnX = d.source.x + NODE_WIDTH + (gapWidth / 2) + (sOffset * 1.5);
            
            return `M ${sx} ${sy} L ${turnX} ${sy} L ${turnX} ${ty} L ${tx} ${ty}`;
        })
        .attr("fill", "none")
        .attr("stroke", d => d.active ? "#4ade80" : "#64748b")
        .attr("stroke-width", d => d.active ? 4 : 2)
        .attr("stroke-dasharray", d => d.active ? "0" : "6,6")
        // Grey out link if either source or target is hidden
        .attr("opacity", d => {
            const sourceHidden = hiddenTeacherEmails.has(d.source.teacher.email);
            const targetHidden = hiddenTeacherEmails.has(d.target.teacher.email);
            if (sourceHidden || targetHidden) return 0.1;
            return d.active ? 1.0 : 0.5;
        });

    // Connectors - Source
    zoomGroup.selectAll(".connector-source")
        .data(allLinks)
        .enter()
        .append("path")
        .attr("class", "connector-source transition-all duration-300")
        .attr("d", d => {
            const sIdx = d.sourceIndex || 0;
            const sTot = d.sourceTotal || 1;
            const sOffset = (sIdx - (sTot - 1) / 2) * CONNECTOR_OFFSET;
            const x = d.source.x + NODE_WIDTH;
            const y = d.source.y + (NODE_HEIGHT / 2) + sOffset;
            return `M ${x} ${y-4} A 4 4 0 0 1 ${x} ${y+4}`; 
        })
        .attr("fill", "#0f172a")
        .attr("stroke", d => d.active ? "#4ade80" : "#64748b")
        .attr("stroke-width", 2)
        .attr("opacity", d => {
            const sourceHidden = hiddenTeacherEmails.has(d.source.teacher.email);
            if (sourceHidden) return 0.1;
            return 1;
        });

    // Connectors - Target
    zoomGroup.selectAll(".connector-target")
        .data(allLinks)
        .enter()
        .append("path")
        .attr("class", "connector-target transition-all duration-300")
        .attr("d", d => {
            const tIdx = d.targetIndex || 0;
            const tTot = d.targetTotal || 1;
            const tOffset = (tIdx - (tTot - 1) / 2) * CONNECTOR_OFFSET;
            const x = d.target.x;
            const y = d.target.y + (NODE_HEIGHT / 2) + tOffset;
            return `M ${x} ${y-4} A 4 4 0 0 0 ${x} ${y+4}`;
        })
        .attr("fill", "#0f172a")
        .attr("stroke", d => d.active ? "#4ade80" : "#64748b")
        .attr("stroke-width", 2)
        .attr("opacity", d => {
            const targetHidden = hiddenTeacherEmails.has(d.target.teacher.email);
            if (targetHidden) return 0.1;
            return 1;
        });

    // Nodes
    const nodeGroups = zoomGroup.selectAll(".node")
        .data(nodes)
        .enter()
        .append("g")
        .attr("class", "node group") 
        .attr("transform", d => `translate(${d.x}, ${d.y})`)
        .attr("cursor", "pointer")
        // Grey out node if hidden
        .attr("opacity", d => hiddenTeacherEmails.has(d.teacher.email) ? 0.2 : 1)
        .style("filter", d => hiddenTeacherEmails.has(d.teacher.email) ? "grayscale(100%)" : "none")
        .on("click", (e, d) => {
            if (!hiddenTeacherEmails.has(d.teacher.email)) {
                onSelectTopic(d);
            }
        });

    nodeGroups.append("rect")
        .attr("width", NODE_WIDTH)
        .attr("height", NODE_HEIGHT)
        .attr("rx", 0)
        .attr("fill", "#000")
        .attr("fill-opacity", 0.5)
        .attr("transform", "translate(4, 4)");

    nodeGroups.append("rect")
        .attr("class", "node-body")
        .attr("width", NODE_WIDTH)
        .attr("height", NODE_HEIGHT)
        .attr("rx", 0)
        .attr("fill", "#1e293b") 
        .attr("stroke", d => d.complete ? "#22c55e" : (d.level === 1 ? "#3b82f6" : "#334155"))
        .attr("stroke-width", d => d.complete || d.level === 1 ? 2 : 1);

    nodeGroups.append("rect")
        .attr("x", 1)
        .attr("y", 1)
        .attr("width", NODE_WIDTH - 2)
        .attr("height", NODE_HEIGHT - 42)
        .attr("fill", d => `url(#img-${d.id})`)
        .attr("opacity", d => d.complete ? 0.9 : 0.6); 

    const hoverGroup = nodeGroups.append("g")
        .attr("class", "hover-overlay") 
        .attr("opacity", 0); 

    hoverGroup.append("rect")
        .attr("x", 1)
        .attr("y", 1)
        .attr("width", NODE_WIDTH - 2)
        .attr("height", NODE_HEIGHT - 42)
        .attr("fill", "rgba(15, 23, 42, 0.95)");

    hoverGroup.append("foreignObject")
        .attr("x", 10)
        .attr("y", 10)
        .attr("width", NODE_WIDTH - 20)
        .attr("height", NODE_HEIGHT - 60)
        .append("xhtml:div")
        .style("font-family", "ui-monospace, monospace")
        .style("font-size", "10px")
        .style("color", "#cbd5e1") 
        .style("overflow", "hidden")
        .html(d => d.shortDescription);

    // --- Interaction Logic ---
    nodeGroups
        .on("mouseenter", function(event, d) {
            if (hiddenTeacherEmails.has(d.teacher.email)) return;

            const hoveredId = d.id;

            // 1. Highlight Hovered Node - Corners ONLY
            d3.select(this).select(".hover-overlay")
                .transition().duration(200)
                .attr("opacity", 1);
            
            d3.select(this).selectAll(".corner-marker")
                .transition().duration(200)
                .attr("opacity", 1);
            
            d3.select(this).select(".node-body")
                .transition().duration(200)
                .attr("stroke-width", 0);

            // 2. Highlight Connected Links (Brighter & Animated)
            const connectedLinks = zoomGroup.selectAll(".link")
                .filter((l: any) => l.source.id === hoveredId || l.target.id === hoveredId);
            
            connectedLinks
                .classed("animate-dash", true) 
                .attr("stroke", "#4ade80") 
                .attr("stroke-width", 3)
                .attr("opacity", 1);

            // 3. Highlight Connectors connected to this node
            zoomGroup.selectAll(".connector-source")
                .filter((l: any) => l.source.id === hoveredId)
                .transition().duration(200)
                .attr("fill", "#cbd5e1") 
                .attr("stroke", "#fff");

            zoomGroup.selectAll(".connector-target")
                .filter((l: any) => l.target.id === hoveredId)
                .transition().duration(200)
                .attr("fill", "#cbd5e1") 
                .attr("stroke", "#fff");

            // 4. Highlight Neighbor Nodes
            const neighborIds = new Set();
            allLinks.forEach(l => {
                if (l.source.id === hoveredId) neighborIds.add(l.target.id);
                if (l.target.id === hoveredId) neighborIds.add(l.source.id);
            });

            zoomGroup.selectAll(".node")
                .filter((n: any) => neighborIds.has(n.id) && !hiddenTeacherEmails.has(n.teacher.email))
                .select(".node-body")
                .transition().duration(200)
                .attr("stroke", "#fff")
                .attr("stroke-width", 2)
                .attr("stroke-opacity", 0.5); 
        })
        .on("mouseleave", function(event, d) {
            if (hiddenTeacherEmails.has(d.teacher.email)) return;

            d3.select(this).select(".hover-overlay")
                .transition().duration(200)
                .attr("opacity", 0);
            
            d3.select(this).selectAll(".corner-marker")
                .transition().duration(200)
                .attr("opacity", 0);
            
            d3.select(this).select(".node-body")
                .transition().duration(200)
                .attr("stroke", d.complete ? "#22c55e" : (d.level === 1 ? "#3b82f6" : "#334155"))
                .attr("stroke-width", d.complete || d.level === 1 ? 2 : 1)
                .attr("stroke-opacity", 1);

            zoomGroup.selectAll(".link")
                .classed("animate-dash", false)
                .attr("stroke", (l: any) => l.active ? "#4ade80" : "#64748b")
                .attr("stroke-width", (l: any) => l.active ? 4 : 2)
                .attr("opacity", (l: any) => {
                     const sourceHidden = hiddenTeacherEmails.has(l.source.teacher.email);
                     const targetHidden = hiddenTeacherEmails.has(l.target.teacher.email);
                     if (sourceHidden || targetHidden) return 0.1;
                     return l.active ? 1.0 : 0.5;
                });
            
            zoomGroup.selectAll(".connector-source")
                .transition().duration(200)
                .attr("fill", "#0f172a")
                .attr("stroke", (l: any) => l.active ? "#4ade80" : "#64748b");

            zoomGroup.selectAll(".connector-target")
                .transition().duration(200)
                .attr("fill", "#0f172a")
                .attr("stroke", (l: any) => l.active ? "#4ade80" : "#64748b");

            zoomGroup.selectAll(".node")
                .filter((n: any) => !hiddenTeacherEmails.has(n.teacher.email))
                .select(".node-body")
                .transition().duration(200)
                .attr("stroke", (n: any) => n.complete ? "#22c55e" : (n.level === 1 ? "#3b82f6" : "#334155"))
                .attr("stroke-width", (n: any) => n.complete || n.level === 1 ? 2 : 1)
                .attr("stroke-opacity", 1);
        });

    nodeGroups.append("rect")
        .attr("x", 1)
        .attr("y", NODE_HEIGHT - 40)
        .attr("width", NODE_WIDTH - 2)
        .attr("height", 39)
        .attr("fill", "#334155"); 

    nodeGroups.append("text")
        .text(d => d.title.length > 25 ? d.title.substring(0, 22) + '...' : d.title)
        .attr("x", 10)
        .attr("y", NODE_HEIGHT - 24)
        .attr("font-family", "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace")
        .attr("font-size", "11px")
        .attr("fill", "#f8fafc")
        .attr("font-weight", "bold");
    
    nodeGroups.append("rect")
        .attr("x", 1)
        .attr("y", NODE_HEIGHT - 6) 
        .attr("width", NODE_WIDTH - 2)
        .attr("height", 5)
        .attr("fill", "#475569");

    nodeGroups.append("rect")
        .attr("x", 1)
        .attr("y", NODE_HEIGHT - 6)
        .attr("width", d => ((NODE_WIDTH - 2) * d.stats.percent) / 100)
        .attr("height", 5)
        .attr("fill", "#22c55e"); 

    nodeGroups.append("text")
        .text(d => `${d.stats.completed}/${d.stats.total} Completed`)
        .attr("x", NODE_WIDTH - 10)
        .attr("y", NODE_HEIGHT - 24)
        .attr("text-anchor", "end")
        .attr("font-family", "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace")
        .attr("font-size", "9px")
        .attr("fill", d => d.complete ? "#22c55e" : "#cbd5e1");

    const corners = [
        "M 0 10 L 0 0 L 10 0",
        `M ${NODE_WIDTH-10} 0 L ${NODE_WIDTH} 0 L ${NODE_WIDTH} 10`,
        `M ${NODE_WIDTH} ${NODE_HEIGHT-10} L ${NODE_WIDTH} ${NODE_HEIGHT} L ${NODE_WIDTH-10} ${NODE_HEIGHT}`,
        `M 10 ${NODE_HEIGHT} L 0 ${NODE_HEIGHT} L 0 ${NODE_HEIGHT-10}` 
    ];
    
    corners.forEach(d => {
        nodeGroups.append("path")
            .attr("class", "corner-marker")
            .attr("d", d)
            .attr("fill", "none")
            .attr("stroke", "#fff")
            .attr("stroke-width", 2)
            .attr("opacity", 0); 
    });

  }, [topics, onSelectTopic, completedSubTopics, getProgressStats, isComplete, hiddenTeacherEmails]);

  const handleMouseMove = (e: React.MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const clientX = e.clientX - rect.left;
      const clientY = e.clientY - rect.top;
      const t = transformRef.current;
      const worldX = (clientX - t.x) / t.k;
      const worldY = (clientY - t.y) / t.k;
      setCoords({ x: worldX, y: worldY, z: 0 });
  };

  return (
    <div 
        ref={containerRef} 
        onMouseMove={handleMouseMove}
        className="w-full h-full relative overflow-hidden bg-slate-950 cursor-crosshair"
    >
      <div className="absolute top-12 left-8 z-10 pointer-events-none">
        <h2 className="text-xl font-mono font-bold text-slate-200 tracking-tight flex items-center gap-2">
           <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
           CURRICULUM_MAP_V2.3
        </h2>
        <p className="text-slate-500 text-xs font-mono mt-1">
            INTERACTIVE_LEARNING_PATH
        </p>
        
        {/* Added Progress Info Lines */}
        <div className="mt-4 pt-4 border-t border-slate-800/50 space-y-3">
             <div className="flex flex-col gap-1">
                 <span className="text-[10px] text-slate-500 font-mono uppercase">Modules Completed</span>
                 <span className="text-xl font-mono text-blue-400 font-medium">
                     {overallStats.completed} <span className="text-slate-600 text-sm">/ {overallStats.total}</span>
                 </span>
             </div>
             <div className="flex flex-col gap-1">
                 <span className="text-[10px] text-slate-500 font-mono uppercase">Global Progress</span>
                 <div className="flex items-center gap-3">
                      <span className="text-xl font-mono text-green-400 font-medium">{overallStats.percent}%</span>
                      <div className="w-24 h-1.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700/50">
                          <div className="h-full bg-green-500 transition-all duration-1000 ease-out" style={{ width: `${overallStats.percent}%` }} />
                      </div>
                 </div>
             </div>
        </div>

        {/* Teacher Toggle Legend */}
        <div className="mt-6 pt-4 border-t border-slate-800/50 pointer-events-auto">
            <span className="text-[10px] text-slate-500 font-mono uppercase block mb-2">Filter by Instructor</span>
            <div className="space-y-2">
                {uniqueTeachers.map(t => (
                    <div 
                        key={t.email} 
                        onClick={() => toggleTeacher(t.email)}
                        className={`flex items-center gap-2 cursor-pointer transition-opacity ${hiddenTeacherEmails.has(t.email) ? 'opacity-50' : 'opacity-100'}`}
                    >
                        <div className={`w-3 h-3 rounded-sm border flex items-center justify-center ${hiddenTeacherEmails.has(t.email) ? 'bg-transparent border-slate-600' : 'bg-blue-500 border-blue-500'}`}>
                           {!hiddenTeacherEmails.has(t.email) && <Check size={10} className="text-white" />}
                        </div>
                        <span className="text-xs text-slate-300 font-mono">{t.name}</span>
                    </div>
                ))}
            </div>
        </div>

      </div>
      
      <div className="absolute top-0 left-0 w-full h-8 border-b border-slate-800 bg-slate-950/80 backdrop-blur pointer-events-none"></div>
      <div className="absolute bottom-0 right-0 w-48 h-12 border-t border-l border-slate-800 bg-slate-950/90 backdrop-blur pointer-events-none flex items-center justify-center">
         <div className="font-mono text-xs text-blue-400">
            X:{coords.x.toFixed(1).padStart(7, ' ')} Y:{coords.y.toFixed(1).padStart(7, ' ')}
         </div>
      </div>

      <svg ref={svgRef} className="w-full h-full"></svg>
    </div>
  );
};

export default TopicGraph;
