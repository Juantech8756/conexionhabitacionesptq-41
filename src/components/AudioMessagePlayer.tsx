
import { useState, useRef, useEffect } from "react";
import { Play, Pause, Volume2 } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { motion } from "framer-motion";

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
    if (isNaN(time)) return "00:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
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

  // Wavy animation bars
  const waveBars = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  
  return (
    <div className={`rounded-lg shadow-sm overflow-hidden ${bgColorClass} ${isMobile ? 'p-2' : 'p-3'}`}>
      {/* Hidden audio element */}
      <audio ref={audioRef} src={audioUrl} preload="metadata" />
      
      <div className="flex items-center gap-2">
        {/* Play/Pause button */}
        <motion.button 
          onClick={togglePlayPause}
          whileTap={{ scale: 0.95 }}
          className={`flex-shrink-0 rounded-full ${isDark || isGuest ? 'bg-white/20 hover:bg-white/30' : 'bg-hotel-100 hover:bg-hotel-200'} p-2 transition-colors`}
          aria-label={isPlaying ? "Pausar" : "Reproducir"}
        >
          {isPlaying ? (
            <Pause className={`h-4 w-4 ${textColorClass}`} />
          ) : (
            <Play className={`h-4 w-4 ${textColorClass}`} />
          )}
        </motion.button>

        {/* Wave animation */}
        <div className={`flex items-center gap-[2px] h-8 ${isMobile ? 'w-20' : 'w-24'}`}>
          {waveBars.map((i) => (
            <motion.div
              key={i}
              className={`w-[3px] rounded-full ${isDark || isGuest ? 'bg-white/60' : 'bg-hotel-400/60'}`}
              animate={isPlaying ? {
                height: [
                  `${Math.random() * 30 + 10}%`,
                  `${Math.random() * 90 + 30}%`,
                  `${Math.random() * 40 + 20}%`,
                ],
              } : { height: "40%" }}
              transition={{
                duration: 0.8,
                repeat: isPlaying ? Infinity : 0,
                repeatType: "reverse",
                delay: i * 0.08,
              }}
            />
          ))}
        </div>
        
        {/* Time display */}
        <div className={`text-xs min-w-16 ${textColorClass}`}>
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>
      </div>
      
      {/* Progress bar */}
      <div 
        ref={progressBarRef}
        onClick={handleProgressBarClick}
        className={`mt-2 w-full h-1.5 ${isDark || isGuest ? 'bg-white/20' : 'bg-gray-200'} rounded-full cursor-pointer relative overflow-hidden`}
      >
        <motion.div 
          className={`absolute top-0 left-0 h-full ${isDark || isGuest ? 'bg-white/90' : 'bg-hotel-400'} rounded-full`}
          style={{ width: `${progressPercentage}%` }}
          animate={isPlaying ? { opacity: [0.7, 1, 0.7] } : { opacity: 1 }}
          transition={{ duration: 1, repeat: isPlaying ? Infinity : 0 }}
        />
      </div>
      
      {/* Audio info */}
      <div className={`flex items-center mt-2 text-xs ${textColorClass}`}>
        <Volume2 className="h-3 w-3 mr-1" />
        <span>{isLoaded ? "Mensaje de voz" : "Cargando audio..."}</span>
      </div>
    </div>
  );
};

export default AudioMessagePlayer;
