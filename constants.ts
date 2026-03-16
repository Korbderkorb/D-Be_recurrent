
import { Teacher } from './types';

// --- CONFIGURATION ---
export const MEDIA_ROOT = '/media';

// Default paths for placeholders
export const getPlaceholderPath = (type: 'video' | 'image' | 'thumb' | 'pdf' | 'zip') => {
  switch (type) {
    case 'video': return 'https://vimeo.com/000000000';
    case 'thumb':
    case 'image': return 'https://picsum.photos/1200/800';
    default: return 'https://example.com/file.pdf';
  }
};
