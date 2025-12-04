import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize2, SkipBack, SkipForward, AlertCircle } from 'lucide-react';

interface VideoPlayerProps {
  title: string;
  videoUrl?: string;
  poster?: string;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ title, videoUrl, poster }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [hasError, setHasError] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsPlaying(false);
    setHasError(false);
    if(videoRef.current) {
        videoRef.current.load();
    }
  }, [videoUrl]);

  const togglePlay = () => {
    if (hasError) return;
    
    if (videoRef.current) {
        if (isPlaying) {
            videoRef.current.pause();
        } else {
            const playPromise = videoRef.current.play();
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    console.warn("Autoplay prevented or file missing:", error);
                });
            }
        }
    }
    setIsPlaying(!isPlaying);
  };

  const handleError = () => {
      setHasError(true);
      setIsPlaying(false);
  };

  const toggleFullscreen = () => {
      if (!document.fullscreenElement) {
          containerRef.current?.requestFullscreen();
      } else {
          document.exitFullscreen();
      }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      setVolume(val);
      setIsMuted(val === 0);
      if (videoRef.current) videoRef.current.volume = val;
  };

  const toggleMute = () => {
      if (isMuted) {
          setVolume(0.8);
          if (videoRef.current) videoRef.current.volume = 0.8;
          setIsMuted(false);
      } else {
          setVolume(0);
          if (videoRef.current) videoRef.current.volume = 0;
          setIsMuted(true);
      }
  };

  return (
    <div ref={containerRef} className="relative w-full aspect-video bg-black rounded-xl overflow-hidden shadow-2xl group border border-slate-800">
      
      {!hasError && videoUrl && (
          <video 
            ref={videoRef}
            src={videoUrl}
            poster={poster}
            className="w-full h-full object-cover"
            onError={handleError}
            onEnded={() => setIsPlaying(false)}
          />
      )}

      {/* Error State UI - Technical Look */}
      {hasError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 border border-slate-800/50 p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center mb-4 border border-slate-800">
                <AlertCircle className="w-8 h-8 text-slate-600" />
            </div>
            <div className="font-mono text-sm font-bold text-slate-400 mb-2 tracking-widest uppercase">Video Source Not Found</div>
            <div className="font-mono text-[10px] text-slate-600 bg-slate-950 px-3 py-1.5 rounded border border-slate-900 break-all max-w-md">
                {videoUrl || 'Unknown Path'}
            </div>
        </div>
      )}

      {!hasError && !isPlaying && (
        <img 
            src={poster || "https://picsum.photos/1200/800"} 
            alt={title} 
            className="absolute inset-0 w-full h-full object-cover opacity-80 hover:opacity-60 transition-opacity duration-300"
        />
      )}

      {!isPlaying && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center z-10 cursor-pointer" onClick={togglePlay}>
          <div className="w-20 h-20 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center hover:scale-110 transition-transform group/play">
            <Play className="w-8 h-8 text-white ml-1 fill-white opacity-90 group-hover/play:opacity-100" />
          </div>
        </div>
      )}

      {!hasError && (
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end z-20">
            <div className="w-full h-1 bg-slate-700 rounded-full mb-4 cursor-pointer relative group/progress">
                <div className="absolute top-0 left-0 h-full w-1/3 bg-blue-500 rounded-full"></div>
                <div className="absolute top-1/2 -translate-y-1/2 left-1/3 w-3 h-3 bg-white rounded-full opacity-0 group-hover/progress:opacity-100 shadow transition-opacity"></div>
            </div>

            <div className="flex items-center justify-between text-white">
            <div className="flex items-center gap-4">
                <button onClick={togglePlay} className="hover:text-blue-400 transition-colors">
                {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
                </button>
                <div className="text-xs font-mono text-slate-300">00:00 / --:--</div>
            </div>

            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 group/vol">
                    <button onClick={toggleMute} className="hover:text-blue-400">
                        {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                    </button>
                    <input 
                        type="range" 
                        min="0" max="1" step="0.1" 
                        value={isMuted ? 0 : volume}
                        onChange={handleVolumeChange}
                        className="w-20 h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full"
                    />
                </div>
                <button onClick={toggleFullscreen} className="hover:text-blue-400">
                    <Maximize2 className="w-5 h-5" />
                </button>
            </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;