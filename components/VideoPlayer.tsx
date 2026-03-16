import React, { useMemo } from 'react';
import { AlertCircle } from 'lucide-react';

interface VideoPlayerProps {
  title: string;
  videoUrl?: string;
  poster?: string;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ title, videoUrl }) => {
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
    <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden shadow-2xl border border-slate-800">
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
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center mb-4 border border-slate-800">
            <AlertCircle className="w-8 h-8 text-slate-600" />
          </div>
          <div className="font-mono text-sm font-bold text-slate-400 mb-2 tracking-widest uppercase">
            {hasError ? 'Video URL Missing' : 'Loading Video...'}
          </div>
          <div className="font-mono text-[10px] text-slate-600 bg-slate-950 px-3 py-1.5 rounded border border-slate-900 break-all max-w-md">
            {videoUrl || 'No URL provided'}
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;
