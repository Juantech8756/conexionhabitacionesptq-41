
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

  // Dynamic background color based on props
  const bgColorClass = isDark 
    ? "bg-gradient-to-r from-hotel-700 to-hotel-600" 
    : isGuest 
      ? "bg-gradient-to-r from-hotel-600 to-hotel-500" 
      : "bg-white";

  // Dynamic text color based on props
  const textColorClass = isDark || isGuest ? "text-white" : "text-gray-700";
  
  // Use an even thinner border (0.25px) with lower opacity
  const borderClass = isDark || isGuest 
    ? "" 
    : "border-[0.25px] border-gray-200/30";
  
  return (
    <div className={`rounded-lg shadow-sm overflow-hidden ${bgColorClass} ${borderClass} ${isMobile ? 'p-3' : 'p-4'}`}>
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

        {/* New wave visualization */}
        <div className="flex-grow relative h-12 mx-1">
          <div className="absolute inset-0 flex items-center justify-center">
            {Array.from({ length: 12 }).map((_, i) => {
              // Create different wave patterns based on position
              const isEven = i % 2 === 0;
              const amplitude = isEven ? 20 : 30;
              const speed = 2 + (i % 3) * 0.5;
              const delay = i * 0.15;
              
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
          
          {/* Floating particles - adds dynamic feeling */}
          {isPlaying && Array.from({ length: 5 }).map((_, i) => (
            <motion.div
              key={`particle-${i}`}
              className={`absolute rounded-full ${isDark || isGuest ? 'bg-white/30' : 'bg-hotel-300/30'}`}
              style={{
                width: 3 + (i % 3),
                height: 3 + (i % 3),
                left: `${15 + (i * 15)}%`,
              }}
              animate={{
                y: [0, -15, 0],
                opacity: [0, 1, 0],
              }}
              transition={{
                duration: 2 + i,
                repeat: Infinity,
                delay: i * 0.5,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>
        
        {/* Time display */}
        <div className={`text-xs font-medium ${textColorClass} min-w-[38px] text-right`}>
          {formatTime(currentTime)}
        </div>
      </div>
      
      {/* Audio info */}
      <div className={`flex items-center justify-center mt-3 text-xs ${textColorClass} opacity-70`}>
        <AudioWaveform className="h-3 w-3 mr-1.5" />
        <span>{isLoaded ? "Mensaje de voz" : "Cargando..."}</span>
      </div>
    </div>
  );
};

export default AudioMessagePlayer;
