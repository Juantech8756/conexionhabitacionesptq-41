import React, { useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AudioMessagePlayer from "@/components/AudioMessagePlayer";
import MediaMessage from "@/components/MediaMessage";
import { Message, Guest } from "@/types/dashboard";

interface MessageListProps {
  messages: Message[];
  selectedGuest: Guest;
  isMobile: boolean;
  onRefresh?: () => void;
}

const MessageList: React.FC<MessageListProps> = ({ 
  messages, 
  selectedGuest,
  isMobile, 
  onRefresh 
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const processedMessageIds = useRef(new Set<string>());
  
  // Format time for messages
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es', {
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  // Auto-scroll al final cuando llegan nuevos mensajes
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]);

  // Set up automatic refresh interval
  useEffect(() => {
    if (!onRefresh) return;
    
    // Set up a silent refresh every 500ms (half a second) for more immediate updates
    const refreshInterval = setInterval(() => {
      onRefresh();
    }, 500);
    
    return () => clearInterval(refreshInterval);
  }, [onRefresh]);

  // Deduplicate messages to prevent rendering duplicates
  const deduplicatedMessages = React.useMemo(() => {
    const uniqueMessages: Message[] = [];
    const seenIds = new Set<string>();
    
    messages.forEach(message => {
      // Only add the message if we haven't seen its ID before
      if (!seenIds.has(message.id)) {
        uniqueMessages.push(message);
        seenIds.add(message.id);
      }
    });
    
    return uniqueMessages;
  }, [messages]);

  // Group messages by date
  const messagesByDate = React.useMemo(() => {
    const grouped: { [date: string]: Message[] } = {};
    
    deduplicatedMessages.forEach(message => {
      const date = new Date(message.created_at).toLocaleDateString('es');
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(message);
    });
    
    return grouped;
  }, [deduplicatedMessages]);

  // Get date display text
  const getDateDisplay = (dateStr: string) => {
    const today = new Date().toLocaleDateString('es');
    const yesterday = new Date(Date.now() - 86400000).toLocaleDateString('es');
    
    if (dateStr === today) return "Hoy";
    if (dateStr === yesterday) return "Ayer";
    return dateStr;
  };

  if (deduplicatedMessages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full p-8 text-center text-muted-foreground">
        <p>No hay mensajes con {selectedGuest.name} (Cabaña {selectedGuest.room_number})</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full overflow-y-auto px-3 py-2 message-list-container bg-white">
      <div className="max-w-2xl mx-auto space-y-4 pb-2">
        {Object.entries(messagesByDate).map(([date, dateMessages]) => (
          <div key={date} className="space-y-2">
            <div className="flex justify-center my-3">
              <div className="px-3 py-1 text-xs font-medium rounded-full bg-primary/10 text-primary">
                {getDateDisplay(date)}
              </div>
            </div>
            
            <AnimatePresence initial={false}>
              {dateMessages.map(msg => (
                <motion.div 
                  key={msg.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.15 }}
                  className={`flex ${msg.is_guest ? 'justify-start' : 'justify-end'} mb-2`}
                >
                  <div className={`max-w-[85%] rounded-lg shadow-sm ${
                    msg.is_guest 
                      ? 'bg-white border border-border text-card-foreground mr-auto rounded-tl-none' 
                      : 'bg-primary text-primary-foreground ml-auto rounded-tr-none'
                  } p-2.5`}
                  >
                    {msg.is_audio ? (
                      <AudioMessagePlayer 
                        audioUrl={msg.audio_url || ''} 
                        isGuest={!msg.is_guest}
                        isDark={!msg.is_guest}
                      />
                    ) : msg.is_media ? (
                      <MediaMessage 
                        mediaUrl={msg.media_url || ''} 
                        mediaType={msg.media_type || 'image'} 
                        isGuest={msg.is_guest} 
                      />
                    ) : (
                      <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{msg.content}</p>
                    )}
                    
                    <div className="mt-1 text-[10px] opacity-70 text-right flex items-center justify-end gap-1">
                      {formatTime(msg.created_at)}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ))}
        
        <div ref={messagesEndRef} className="h-10 mb-4 bg-white" />
      </div>
    </div>
  );
};

export default MessageList;
