
import { Topic, SubTopic, Teacher } from './types';

// --- CONFIGURATION ---
const MEDIA_ROOT = '/media';

// Helper to generate paths based on convention
const getPath = (topicId: string, subTopicId: string, type: 'video' | 'image' | 'thumb' | 'pdf' | 'zip') => {
  const extMap = {
    video: 'mp4',
    image: 'jpg',
    thumb: 'jpg',
    pdf: 'pdf',
    zip: 'zip'
  };
  const fileNameMap = {
    video: 'video',
    image: 'image',
    thumb: 'thumb',
    pdf: 'lecture-notes',
    zip: 'source-files'
  };
  return `${MEDIA_ROOT}/${topicId}/${subTopicId}/${fileNameMap[type]}.${extMap[type]}`;
};

// Helper to build a standard video module with standard resources
// FIX: Prefixed subId with topicId to ensure uniqueness across modules
const createVideoModule = (
  topicId: string,
  subId: string,
  title: string,
  desc: string,
  duration: string,
  hasResources: boolean = true
): SubTopic => ({
  id: `${topicId}-${subId}`, // Unique ID Pattern: topic-subtopic
  type: 'VIDEO',
  title: title,
  description: desc,
  duration: duration,
  videoUrl: getPath(topicId, subId, 'video'),
  posterUrl: getPath(topicId, subId, 'thumb'),
  comments: [],
  resources: hasResources ? {
    notesUrl: getPath(topicId, subId, 'pdf'),
    sourceUrl: getPath(topicId, subId, 'zip')
  } : undefined
});

// Teachers
export const teachers: Record<string, Teacher> = {
  ko: {
    name: "Koichiro Aitani",
    role: "Professor for Urban planning and design",
    email: "aitani.koichiro.195@m.kyushu-u.ac.jp",
    avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=200&auto=format&fit=crop"
  },
  kazu: {
    name: "Kazuki Nakaike",
    role: "Assistant Professor",
    email: "nakaike.kazuki.192@m.kyushu-u.ac.jp",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=200&auto=format&fit=crop"
  },
  korbinian: {
    name: "Korbinian Enzinger",
    role: "Associate Professor",
    email: "enzinger.korbinian.135@m.kyushu-u.ac.jp",
    avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=200&auto=format&fit=crop"
  },
  takuro: {
    name: "Takuro Ogawa",
    role: "Associate Professor",
    email: "ogawa.takuro.326@m.kyushu-u.ac.jp",
    avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=200&auto=format&fit=crop"
  }
};

// --- 1. 3D MODELING ---
const t1 = '3d-modeling';
const topic1_subtopics: SubTopic[] = [
  createVideoModule(t1, 'intro', "Introduction to 3D Space", "Coordinate systems (XYZ) and viewport navigation.", "05:30"),
  createVideoModule(t1, 'install', "Installation & Environment", "Setting up Rhino 8 interface layouts.", "12:15"),
  {
    ...createVideoModule(t1, 'nurbs-basics', "NURBS vs Mesh", "Mathematical differences between geometry types.", "15:45"),
    comments: [
       { 
           id: 'c_init_1', 
           user: 'Alice M.', 
           avatar: 'https://ui-avatars.com/api/?name=Alice', 
           text: 'The explanation of degree 3 curves was very helpful.', 
           timestamp: '2 days ago',
           reactions: { '👍': 1 }, 
           replies: [] 
       }
    ]
  },
  createVideoModule(t1, 'ui-deep-dive', "Interface Deep Dive", "Command line and layer management.", "20:00"),
  {
    id: `${t1}-final-exercise`, // Fixed ID
    type: 'EXERCISE_UPLOAD',
    title: "Final Exercise: The Pavilion",
    description: "Create a parametric pavilion structure using the tools learned. Upload .3dm file.",
    duration: "120:00",
    exerciseImage: getPath(t1, 'final-exercise', 'image'),
    comments: [],
    resources: {
      notesUrl: getPath(t1, 'final-exercise', 'pdf')
    }
  }
];

// --- 2. ENERGY SIMULATION ---
const t_sim = 'energy-simulation';
const topic_sim_subtopics: SubTopic[] = [
  createVideoModule(t_sim, 'climate-analysis', "Climate Data Analysis", "Importing and visualizing .epw weather files.", "18:00"),
  createVideoModule(t_sim, 'thermal-mass', "Thermal Mass & Comfort", "Simulating heat retention in concrete structures.", "22:30", false),
  {
    id: `${t_sim}-sim-quiz`, // Fixed ID
    type: 'EXERCISE_QUIZ',
    title: "Quiz: Environmental Physics",
    description: "Test your knowledge on solar gain and thermal bridges.",
    duration: "10:00",
    comments: [],
    quizQuestions: [
      { id: 'q1', question: "What does the 'R-value' measure?", options: ["Light transmission", "Thermal resistance", "Sound dampening", "Structural load"], correctAnswers: [1], multiSelect: false },
      { id: 'q2', question: "Which file format contains weather data?", options: [".dwg", ".epw", ".3dm", ".pdf"], correctAnswers: [1], multiSelect: false }
    ]
  }
];

// --- 3. ARTIFICIAL INTELLIGENCE ---
const t_ai = 'ai';
const topic_ai_subtopics: SubTopic[] = [
  createVideoModule(t_ai, 'intro-ml', "Intro to Machine Learning", "Neural networks explained for architects.", "14:00"),
  createVideoModule(t_ai, 'diffusion', "Diffusion Models", "Using Stable Diffusion for texture generation.", "25:00"),
  {
    id: `${t_ai}-ai-upload`, // Fixed ID
    type: 'EXERCISE_UPLOAD',
    title: "Style Transfer Task",
    description: "Apply a specific architectural style to a massing model using AI. Upload the result.",
    duration: "45:00",
    exerciseImage: getPath(t_ai, 'ai-upload', 'image'),
    comments: []
  }
];

// --- 4. ROBOTIC FABRICATION ---
const t_rob = 'robotic-fabrication';
const topic_rob_subtopics: SubTopic[] = [
  createVideoModule(t_rob, 'safety', "Industrial Safety Protocols", "Emergency stops and workspace zones.", "08:00"),
  createVideoModule(t_rob, 'kinematics', "6-Axis Kinematics", "Understanding joint movements and singularities.", "30:00"),
  {
    id: `${t_rob}-rob-quiz`, // Fixed ID
    type: 'EXERCISE_QUIZ',
    title: "Quiz: Robot Safety",
    description: "Mandatory safety certification quiz.",
    duration: "15:00",
    comments: [],
    quizQuestions: [
      { id: 'q1', question: "What is the T1 mode max speed?", options: ["250 mm/s", "1000 mm/s", "2 m/s", "No limit"], correctAnswers: [0], multiSelect: false },
      { id: 'q2', question: "Where is the deadman switch located?", options: ["On the robot base", "On the teach pendant", "On the wall", "There isn't one"], correctAnswers: [1], multiSelect: false }
    ]
  }
];

// --- 5. DIGITAL SURVEYING ---
const t2 = 'digital-surveying';
const topic2_subtopics: SubTopic[] = [
  createVideoModule(t2, 'intro', "Reality Capture Basics", "Hardware stack for surveying.", "10:00"),
  createVideoModule(t2, 'photogrammetry', "Photogrammetry Workflow", "Photo-to-mesh processing pipeline.", "25:00"),
  {
    id: `${t2}-knowledge-check`, // Fixed ID
    type: 'EXERCISE_QUIZ',
    title: "Knowledge Check: Reality Capture",
    description: "Test understanding of photogrammetry vs LiDAR.",
    duration: "15:00",
    comments: [],
    quizQuestions: [
      { id: 'q1', question: "Difference between Photogrammetry and LiDAR?", options: ["Laser vs Images", "Images vs Laser", "Same", "Indoor only"], correctAnswers: [1], multiSelect: false },
      { id: 'q2', question: "Raw point cloud format?", options: [".JPG", ".STL", ".E57", ".MP4"], correctAnswers: [2], multiSelect: false }
    ]
  }
];

// --- 6. 3D PRINTING ---
const t_print = '3d-printing';
const topic_print_subtopics: SubTopic[] = [
  createVideoModule(t_print, 'fdm-basics', "FDM Slicing", "Layer height and infill settings.", "20:00"),
  createVideoModule(t_print, 'clay-printing', "Clay Extrusion", "Preparing viscosity for LDM printing.", "25:00"),
  {
    id: `${t_print}-print-upload`, // Fixed ID
    type: 'EXERCISE_UPLOAD',
    title: "Slicing Exercise",
    description: "Slice the provided model for a 0.8mm nozzle and upload G-Code.",
    duration: "40:00",
    exerciseImage: getPath(t_print, 'print-upload', 'image'),
    comments: []
  }
];

// --- 7. ROBOTIC MILLING ---
const t_mill = 'robotic-milling';
const topic_mill_subtopics: SubTopic[] = [
  createVideoModule(t_mill, 'toolpath-strategy', "Subtractive Toolpaths", "Roughing vs Finishing strategies.", "28:00"),
  createVideoModule(t_mill, 'feeds-speeds', "Feeds & Speeds", "Calculating chip load for timber.", "15:00")
];

// --- 8. PHOTOGRAMMETRY (Deep Dive) ---
const t_photo = 'photogrammetry';
const topic_photo_subtopics: SubTopic[] = [
  createVideoModule(t_photo, 'lighting', "Lighting for Scanning", "Avoiding shadows and reflections.", "12:00"),
  createVideoModule(t_photo, 'agisoft', "Metashape Tutorial", "Processing cloud data in Agisoft.", "45:00")
];

// --- 9. LASER SCANNING ---
const t_laser = 'laser-scanning';
const topic_laser_subtopics: SubTopic[] = [
  createVideoModule(t_laser, 'registration', "Point Cloud Registration", "Stitching multiple scans together.", "35:00"),
  createVideoModule(t_laser, 'cleanup', "Cloud Cleanup", "Removing noise and pedestrians.", "20:00")
];

// --- 10. HAND HELD SCANNING ---
const t_hand = 'hand-held-scanning';
const topic_hand_subtopics: SubTopic[] = [
  createVideoModule(t_hand, 'slam-basics', "SLAM Explained", "Simultaneous Localization and Mapping logic.", "15:00"),
  createVideoModule(t_hand, 'loop-closure', "Loop Closure", "Ensuring drift correction in large scans.", "18:00")
];

// --- 11. ROBOTIC MILLING PT 2 ---
const t_mill2 = 'robotic-milling-2';
const topic_mill2_subtopics: SubTopic[] = [
  createVideoModule(t_mill2, 'adaptive-milling', "Adaptive Toolpaths", "Using sensor feedback to adjust depth.", "40:00"),
  {
    id: `${t_mill2}-final-mill-upload`, // Fixed ID
    type: 'EXERCISE_UPLOAD',
    title: "Complex Surface Project",
    description: "Design a texture based on the scanned data and generate toolpaths.",
    duration: "180:00",
    exerciseImage: getPath(t_mill2, 'final-mill-upload', 'image'),
    comments: []
  }
];

export const TOPICS: Topic[] = [
  {
    id: t1,
    title: '3D Modeling',
    shortDescription: 'Fundamentals of NURBS geometry, coordinate systems, and digital drafting techniques.',
    fullDescription: 'The core of the digital built environment. Master NURBS and Mesh modeling techniques.',
    imageUrl: 'https://images.unsplash.com/photo-1617791160505-6f00504e3caf?q=80&w=1000&auto=format&fit=crop',
    color: '#3b82f6',
    level: 1,
    subTopics: topic1_subtopics,
    relatedTopics: ['energy-simulation', 'digital-surveying', 'ai', 'robotic-fabrication'],
    teacher: teachers.korbinian
  },
  {
    id: t2,
    title: 'Digital Surveying',
    shortDescription: 'Techniques for capturing physical reality using LiDAR, Photogrammetry, and SLAM.',
    fullDescription: 'Creating digital twins of physical spaces.',
    imageUrl: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=1000&auto=format&fit=crop',
    color: '#f59e0b',
    level: 2,
    subTopics: topic2_subtopics,
    relatedTopics: ['photogrammetry', 'laser-scanning', 'hand-held-scanning'],
    teacher: teachers.takuro
  },
  {
    id: t_sim,
    title: 'Energy Simulation',
    shortDescription: 'Environmental analysis including solar gain, thermal mass, and airflow optimization.',
    fullDescription: 'Simulate environmental factors to optimize energy efficiency.',
    imageUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1000&auto=format&fit=crop',
    color: '#10b981',
    level: 2,
    subTopics: topic_sim_subtopics,
    relatedTopics: [],
    teacher: teachers.kazu
  },
  {
    id: t_ai,
    title: 'Artificial Intelligence',
    shortDescription: 'Machine Learning applications in architecture, from Style Transfer to Generative Design.',
    fullDescription: 'Leveraging Machine Learning for design generation.',
    imageUrl: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?q=80&w=1000&auto=format&fit=crop',
    color: '#ef4444',
    level: 2,
    subTopics: topic_ai_subtopics,
    relatedTopics: ['robotic-milling-2'],
    teacher: teachers.korbinian
  },
  {
    id: t_rob,
    title: 'Robotic Fabrication',
    shortDescription: 'Industrial robotics workflows, safety protocols, and 6-axis kinematics programming.',
    fullDescription: 'Programming industrial robotic arms for construction.',
    imageUrl: 'https://images.unsplash.com/photo-1531746790731-6c087fecd65a?q=80&w=1000&auto=format&fit=crop',
    color: '#8b5cf6',
    level: 2,
    subTopics: topic_rob_subtopics,
    relatedTopics: ['3d-printing', 'robotic-milling'],
    teacher: teachers.korbinian
  },
  {
    id: t_print,
    title: '3D Printing',
    shortDescription: 'Additive manufacturing strategies for FDM polymers and LDM clay extrusion.',
    fullDescription: 'From slicing to printing: FDM, SLA and clay printing.',
    imageUrl: 'https://images.unsplash.com/photo-1631541909061-71e349d1f203?q=80&w=1000&auto=format&fit=crop',
    color: '#ec4899',
    level: 3,
    subTopics: topic_print_subtopics,
    relatedTopics: [],
    teacher: teachers.korbinian
  },
  {
    id: t_mill,
    title: 'Robotic Milling',
    shortDescription: 'Subtractive manufacturing using robotic end-effectors for timber and foam.',
    fullDescription: 'Carving complex geometries using robotic end-effectors.',
    imageUrl: 'https://images.unsplash.com/photo-1620336655052-b68d975392fb?q=80&w=1000&auto=format&fit=crop',
    color: '#d946ef',
    level: 3,
    subTopics: topic_mill_subtopics,
    relatedTopics: ['robotic-milling-2'],
    teacher: teachers.korbinian
  },
  {
    id: t_photo,
    title: 'Photogrammetry',
    shortDescription: 'Advanced workflows for generating 3D assets from photographic datasets.',
    fullDescription: 'Reconstructing 3D models from 2D image sets.',
    imageUrl: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?q=80&w=1000&auto=format&fit=crop',
    color: '#f97316',
    level: 3,
    subTopics: topic_photo_subtopics,
    relatedTopics: ['robotic-milling-2'],
    teacher: teachers.takuro
  },
  {
    id: t_laser,
    title: 'Laser Scanning',
    shortDescription: 'High-precision terrestrial LiDAR scanning, point cloud registration, and cleanup.',
    fullDescription: 'High fidelity point clouds using terrestrial laser scanners.',
    imageUrl: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?q=80&w=1000&auto=format&fit=crop',
    color: '#f97316',
    level: 3,
    subTopics: topic_laser_subtopics,
    relatedTopics: [],
    teacher: teachers.takuro
  },
  {
    id: t_hand,
    title: 'Hand Held Scanning',
    shortDescription: 'Mobile SLAM mapping techniques for rapid on-site data acquisition.',
    fullDescription: 'Rapid data acquisition using portable SLAM devices.',
    imageUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=1000&auto=format&fit=crop',
    color: '#f97316',
    level: 3,
    subTopics: topic_hand_subtopics,
    relatedTopics: [],
    teacher: teachers.takuro
  },
  {
    id: t_mill2,
    title: 'Robotic Milling Pt.2',
    shortDescription: 'Advanced adaptive milling combining sensor feedback with complex toolpaths.',
    fullDescription: 'Advanced adaptive milling using scanned data for feedback loops.',
    imageUrl: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?q=80&w=1000&auto=format&fit=crop',
    color: '#d946ef',
    level: 4,
    subTopics: topic_mill2_subtopics,
    relatedTopics: [],
    teacher: teachers.korbinian
  }
];