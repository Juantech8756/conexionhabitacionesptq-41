
import { useState, useRef, useEffect } from "react";
import { Play, Pause, AudioWaveform } from "lucide-react";
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

  // Format time display (mm:ss)
  const formatTime = (time: number) => {
    if (isNaN(time)) return "";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  // Enhanced background with subtle gradient
  const bgColorClass = isDark 
    ? "bg-gradient-to-r from-hotel-700 to-hotel-600" 
    : isGuest 
      ? "bg-gradient-to-r from-hotel-600 to-hotel-500" 
      : "bg-white";

  // Dynamic text color based on props
  const textColorClass = isDark || isGuest ? "text-white" : "text-gray-700";
  
  // Use a hairline border with proper opacity
  const borderClass = isDark || isGuest 
    ? "" 
    : "border-hair border-gray-200/30";
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`rounded-lg shadow-sm overflow-hidden ${bgColorClass} ${borderClass} ${isMobile ? 'p-2.5' : 'p-3.5'}`}
    >
      {/* Hidden audio element */}
      <audio ref={audioRef} src={audioUrl} preload="metadata" />
      
      <div className="flex items-center gap-2.5">
        {/* Play/Pause button with animation */}
        <motion.button 
          onClick={togglePlayPause}
          whileTap={{ scale: 0.92 }}
          className={`flex-shrink-0 rounded-full ${isDark || isGuest ? 'bg-white/20 hover:bg-white/30' : 'bg-hotel-100 hover:bg-hotel-200'} p-2 transition-all duration-200`}
          aria-label={isPlaying ? "Pausar" : "Reproducir"}
        >
          {isPlaying ? (
            <Pause className={`h-4 w-4 ${textColorClass}`} />
          ) : (
            <Play className={`h-4 w-4 ${textColorClass}`} />
          )}
        </motion.button>

        {/* Enhanced wave visualization */}
        <div className="flex-grow relative h-10 mx-1">
          <div className="absolute inset-0 flex items-center justify-center">
            {Array.from({ length: 12 }).map((_, i) => {
              // Create different wave patterns based on position
              const isEven = i % 2 === 0;
              const amplitude = isEven ? 20 : 30;
              const speed = 1.8 + (i % 3) * 0.4;
              const delay = i * 0.1;
              
              return (
                <motion.div
                  key={i}
                  className={`mx-0.5 rounded-full ${isDark || isGuest ? 'bg-white/70' : 'bg-hotel-400/70'}`}
                  style={{
                    width: i % 3 === 0 ? '2px' : '1px',
                  }}
                  animate={{
                    height: isPlaying 
                      ? [
                        `${20 + amplitude}%`,
                        `${50 - amplitude}%`,
                        `${35 + amplitude / 2}%`,
                      ]
                      : `${15 + (i % 5) * 6}%`
                  }}
                  transition={{
                    duration: speed,
                    repeat: Infinity,
                    repeatType: "reverse",
                    ease: "easeInOut",
                    delay: delay
                  }}
                />
              );
            })}
          </div>
          
          {/* Animated floating particles - adds dynamic feeling */}
          {isPlaying && Array.from({ length: 4 }).map((_, i) => (
            <motion.div
              key={`particle-${i}`}
              className={`absolute rounded-full ${isDark || isGuest ? 'bg-white/30' : 'bg-hotel-300/30'}`}
              style={{
                width: 2 + (i % 2),
                height: 2 + (i % 2),
                left: `${15 + (i * 18)}%`,
              }}
              animate={{
                y: [0, -12, 0],
                opacity: [0, 0.8, 0],
              }}
              transition={{
                duration: 1.5 + i * 0.5,
                repeat: Infinity,
                delay: i * 0.3,
                ease: "easeInOut",
              }}
            />
          ))}
          
          {/* Playback progress indicator */}
          <motion.div 
            className={`absolute bottom-0 left-0 h-1 ${isDark || isGuest ? 'bg-white/40' : 'bg-hotel-500/40'} rounded-full`}
            initial={{ width: '0%' }}
            animate={{ width: `${(currentTime / duration) * 100}%` }}
            transition={{ duration: 0.1 }}
          />
        </div>
        
        {/* Time display with animation */}
        <motion.div 
          animate={{ opacity: isLoaded ? 1 : 0.5 }}
          className={`text-xs font-medium ${textColorClass} min-w-[36px] text-right`}
        >
          {formatTime(currentTime)}
        </motion.div>
      </div>
      
      {/* Audio info with subtle fade-in */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.8 }}
        transition={{ delay: 0.3 }}
        className={`flex items-center justify-center mt-2 text-xs ${textColorClass}`}
      >
        <AudioWaveform className="h-3 w-3 mr-1.5" />
        <span>{isLoaded ? "Mensaje de voz" : "Cargando..."}</span>
      </motion.div>
    </motion.div>
  );
};

export default AudioMessagePlayer;
