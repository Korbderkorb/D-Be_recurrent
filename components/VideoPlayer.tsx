import React, { useState, useRef } from 'react';
import ReactPlayer from 'react-player';
import { Play, Pause, Volume2, VolumeX, Maximize2, AlertCircle } from 'lucide-react';

interface VideoPlayerProps {
  title: string;
  videoUrl?: string;
  poster?: string;
}

const Player = ReactPlayer as any;

const VideoPlayer: React.FC<VideoPlayerProps> = ({ title, videoUrl, poster }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [played, setPlayed] = useState(0);
  const [duration, setDuration] = useState(0);
  
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const togglePlay = () => {
    if (hasError) return;
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
  };

  const toggleMute = () => {
      if (isMuted) {
          setVolume(0.8);
          setIsMuted(false);
      } else {
          setVolume(0);
          setIsMuted(true);
      }
  };

  const formatTime = (seconds: number) => {
    const date = new Date(seconds * 1000);
    const hh = date.getUTCHours();
    const mm = date.getUTCMinutes();
    const ss = date.getUTCSeconds().toString().padStart(2, '0');
    if (hh) {
      return `${hh}:${mm.toString().padStart(2, '0')}:${ss}`;
    }
    return `${mm}:${ss}`;
  };

  const handleProgress = (state: any) => {
    setPlayed(state.played);
  };

  const handleDuration = (dur: number) => {
    setDuration(dur);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    playerRef.current?.seekTo(percentage);
  };

  return (
    <div ref={containerRef} className="relative w-full aspect-video bg-black rounded-xl overflow-hidden shadow-2xl group border border-slate-800">
      
      {!hasError && videoUrl && (
          <Player
            ref={playerRef}
            url={videoUrl}
            playing={isPlaying}
            volume={volume}
            muted={isMuted}
            width="100%"
            height="100%"
            style={{ position: 'absolute', top: 0, left: 0 }}
            onError={handleError}
            onProgress={handleProgress}
            onDuration={handleDuration}
            onEnded={() => setIsPlaying(false)}
          />
      )}

      {/* Error State UI - Technical Look */}
      {hasError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 border border-slate-800/50 p-8 text-center z-30">
            <div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center mb-4 border border-slate-800">
                <AlertCircle className="w-8 h-8 text-slate-600" />
            </div>
            <div className="font-mono text-sm font-bold text-slate-400 mb-2 tracking-widest uppercase">Video Source Not Found</div>
            <div className="font-mono text-[10px] text-slate-600 bg-slate-950 px-3 py-1.5 rounded border border-slate-900 break-all max-w-md">
                {videoUrl || 'Unknown Path'}
            </div>
        </div>
      )}

      {!hasError && !isPlaying && played === 0 && (
        <img 
            src={poster || "https://picsum.photos/1200/800"} 
            alt={title} 
            className="absolute inset-0 w-full h-full object-cover opacity-80 hover:opacity-60 transition-opacity duration-300 z-10"
        />
      )}

      {!isPlaying && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center z-20 cursor-pointer" onClick={togglePlay}>
          <div className="w-20 h-20 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center hover:scale-110 transition-transform group/play">
            <Play className="w-8 h-8 text-white ml-1 fill-white opacity-90 group-hover/play:opacity-100" />
          </div>
        </div>
      )}

      {!hasError && (
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end z-40">
            <div 
              className="w-full h-1 bg-slate-700 rounded-full mb-4 cursor-pointer relative group/progress"
              onClick={handleSeek}
            >
                <div 
                  className="absolute top-0 left-0 h-full bg-blue-500 rounded-full"
                  style={{ width: `${played * 100}%` }}
                ></div>
                <div 
                  className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover/progress:opacity-100 shadow transition-opacity"
                  style={{ left: `${played * 100}%` }}
                ></div>
            </div>

            <div className="flex items-center justify-between text-white">
            <div className="flex items-center gap-4">
                <button onClick={togglePlay} className="hover:text-blue-400 transition-colors">
                {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
                </button>
                <div className="text-xs font-mono text-slate-300">
                  {formatTime(played * duration)} / {formatTime(duration)}
                </div>
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
