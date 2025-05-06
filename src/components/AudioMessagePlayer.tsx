
import { useState, useRef, useEffect } from "react";
import { Play, Pause, Volume2 } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { motion } from "framer-motion";
import { Progress } from "@/components/ui/progress";

interface AudioMessagePlayerProps {
  audioUrl: string;
  isGuest?: boolean;
  isDark?: boolean;
}

const AudioMessagePlayer = ({ audioUrl, isGuest = false, isDark = false }: AudioMessagePlayerProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  // Set up audio element and event listeners
  useEffect(() => {
    const audioElement = audioRef.current;
    if (!audioElement) return;

    const setAudioData = () => {
      setDuration(audioElement.duration);
      setIsLoaded(true);
    };

    const setAudioTime = () => setCurrentTime(audioElement.currentTime);
    
    const resetPlayer = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    // Audio event listeners
    audioElement.addEventListener('loadeddata', setAudioData);
    audioElement.addEventListener('timeupdate', setAudioTime);
    audioElement.addEventListener('ended', resetPlayer);

    return () => {
      audioElement.removeEventListener('loadeddata', setAudioData);
      audioElement.removeEventListener('timeupdate', setAudioTime);
      audioElement.removeEventListener('ended', resetPlayer);
    };
  }, []);

  // Toggle play/pause
  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play();
      setIsPlaying(true);
    }
  };

  // Calculate progress percentage
  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Format time display (mm:ss)
  const formatTime = (time: number) => {
    if (isNaN(time)) return "";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  // Handle manual seeking
  const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || !audioRef.current) return;
    
    const progressBar = progressBarRef.current;
    const boundingRect = progressBar.getBoundingClientRect();
    const clickPositionX = e.clientX - boundingRect.left;
    const progressBarWidth = boundingRect.width;
    const percentage = clickPositionX / progressBarWidth;
    
    audioRef.current.currentTime = percentage * duration;
  };

  // Dynamic background color based on props
  const bgColorClass = isDark 
    ? "bg-gradient-to-r from-hotel-700 to-hotel-600" 
    : isGuest 
      ? "bg-gradient-to-r from-hotel-600 to-hotel-500" 
      : "bg-white border border-gray-200";

  // Dynamic text color based on props
  const textColorClass = isDark || isGuest ? "text-white" : "text-gray-700";
  
  return (
    <div className={`rounded-lg shadow-sm overflow-hidden ${bgColorClass} ${isMobile ? 'p-3' : 'p-4'}`}>
      {/* Hidden audio element */}
      <audio ref={audioRef} src={audioUrl} preload="metadata" />
      
      <div className="flex items-center gap-3">
        {/* Play/Pause button */}
        <motion.button 
          onClick={togglePlayPause}
          whileTap={{ scale: 0.95 }}
          className={`flex-shrink-0 rounded-full ${isDark || isGuest ? 'bg-white/20 hover:bg-white/30' : 'bg-hotel-100 hover:bg-hotel-200'} p-2.5 transition-colors`}
          aria-label={isPlaying ? "Pausar" : "Reproducir"}
        >
          {isPlaying ? (
            <Pause className={`h-4 w-4 ${textColorClass}`} />
          ) : (
            <Play className={`h-4 w-4 ${textColorClass}`} />
          )}
        </motion.button>

        {/* Wave visualization */}
        <div className="flex-grow flex items-end justify-center h-10 gap-1.5">
          {Array.from({ length: 9 }).map((_, i) => (
            <motion.div
              key={i}
              className={`w-1 rounded-full ${isDark || isGuest ? 'bg-white/70' : 'bg-hotel-400/70'}`}
              animate={{
                height: isPlaying 
                  ? [
                      `${20 + Math.sin((i + 1) * 0.8) * 15}%`, 
                      `${45 + Math.sin((i + 3) * 0.4) * 25}%`,
                      `${30 + Math.sin((i + 2) * 0.6) * 20}%`
                    ]
                  : `${30 + Math.sin(i * 0.7) * 10}%`
              }}
              transition={{
                duration: 2.5,
                repeat: Infinity,
                repeatType: "mirror",
                ease: "easeInOut",
                delay: i * 0.1
              }}
            />
          ))}
        </div>
        
        {/* Time display */}
        <div className={`text-xs font-medium ${textColorClass} min-w-[38px] text-right`}>
          {formatTime(currentTime)}
        </div>
      </div>
      
      {/* Progress bar */}
      <div className="mt-3 w-full">
        <Progress 
          value={progressPercentage} 
          max={100}
          className={`h-1.5 cursor-pointer ${isDark || isGuest ? 'bg-white/20' : 'bg-gray-200'}`}
          onClick={handleProgressBarClick}
          ref={progressBarRef}
        />
      </div>
      
      {/* Audio info */}
      <div className={`flex items-center justify-center mt-2 text-xs ${textColorClass} opacity-70`}>
        <Volume2 className="h-3 w-3 mr-1.5" />
        <span>{isLoaded ? "Mensaje de voz" : "Cargando..."}</span>
      </div>
    </div>
  );
};

export default AudioMessagePlayer;
