import React, { useMemo } from 'react';
import { AlertCircle } from 'lucide-react';

interface VideoPlayerProps {
  title: string;
  videoUrl?: string;
  poster?: string;
  theme?: 'light' | 'dark';
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ title, videoUrl, theme = 'dark' }) => {
  // Extract and normalize embed URL
  const embedUrl = useMemo(() => {
    if (!videoUrl) return '';
    let url = videoUrl.trim();
    
    // 1. Handle iframe snippets (extract src)
    if (url.includes('<iframe')) {
      const srcMatch = url.match(/src="([^"]+)"/);
      if (srcMatch && srcMatch[1]) {
        url = srcMatch[1];
        url = url.replace(/&amp;/g, '&');
      }
    }

    // 2. Normalize YouTube URLs
    // https://www.youtube.com/watch?v=dQw4w9WgXcQ
    // https://youtu.be/dQw4w9WgXcQ
    if (url.includes('youtube.com/watch?v=')) {
      const videoId = new URL(url).searchParams.get('v');
      if (videoId) url = `https://www.youtube.com/embed/${videoId}`;
    } else if (url.includes('youtu.be/')) {
      const videoId = url.split('youtu.be/')[1]?.split(/[?#]/)[0];
      if (videoId) url = `https://www.youtube.com/embed/${videoId}`;
    } else if (url.includes('youtube.com/embed/')) {
      // Already an embed URL, just ensure protocol
    }

    // 3. Normalize Vimeo URLs
    // https://vimeo.com/1173722623
    // https://player.vimeo.com/video/1173722623
    if (url.includes('vimeo.com/') && !url.includes('player.vimeo.com')) {
      const videoId = url.split('vimeo.com/')[1]?.split(/[?#]/)[0];
      if (videoId) url = `https://player.vimeo.com/video/${videoId}`;
    }

    // Ensure protocol
    if (url.startsWith('//')) {
      url = 'https:' + url;
    } else if (url && !url.startsWith('http')) {
      // If it's just an ID or something else, we might have issues, 
      // but we assume it's a valid URL or path
    }

    // Add standard parameters for better embedding
    if (url.includes('youtube.com/embed/')) {
      const separator = url.includes('?') ? '&' : '?';
      url += `${separator}rel=0&modestbranding=1`;
    } else if (url.includes('player.vimeo.com/video/')) {
      const separator = url.includes('?') ? '&' : '?';
      url += `${separator}badge=0&autopause=0&player_id=0&app_id=58479`;
    }

    console.log(`VideoPlayer [${title}] using Embed URL:`, url);
    return url;
  }, [videoUrl, title]);

  const hasError = !embedUrl;

  return (
    <div className={`relative w-full aspect-video rounded-xl overflow-hidden shadow-2xl border transition-colors duration-300 ${theme === 'dark' ? 'bg-black border-slate-800' : 'bg-slate-200 border-slate-300'}`}>
      {embedUrl ? (
        <iframe
          src={embedUrl}
          title={title}
          className="absolute inset-0 w-full h-full"
          frameBorder="0"
          allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      ) : (
        <div className={`absolute inset-0 flex flex-col items-center justify-center p-8 text-center transition-colors ${theme === 'dark' ? 'bg-black/90' : 'bg-slate-100/90'}`}>
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 border transition-colors ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <AlertCircle className={`w-8 h-8 ${theme === 'dark' ? 'text-slate-600' : 'text-slate-400'}`} />
          </div>
          <div className={`font-mono text-sm font-bold mb-2 tracking-widest uppercase transition-colors ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
            {hasError ? 'Video URL Missing' : 'Loading Video...'}
          </div>
          <div className={`font-mono text-[10px] px-3 py-1.5 rounded border break-all max-w-md transition-colors ${theme === 'dark' ? 'text-slate-600 bg-slate-950 border-slate-900' : 'text-slate-500 bg-white border-slate-200'}`}>
            {videoUrl || 'No URL provided'}
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;
