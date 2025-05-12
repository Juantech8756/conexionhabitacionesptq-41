
import React, { useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ScrollArea } from "@/components/ui/scroll-area";
import AudioMessagePlayer from "@/components/AudioMessagePlayer";
import MediaMessage from "@/components/MediaMessage";
import { Message } from "@/types/dashboard";

interface MessageListProps {
  messages: Message[];
  isMobile: boolean;
  onRefreshRequest?: () => void;
}

const MessageList: React.FC<MessageListProps> = ({ messages, isMobile, onRefreshRequest }) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
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

  // Set up automatic refresh interval
  useEffect(() => {
    if (!onRefreshRequest) return;
    
    // Set up a silent refresh every 500ms (half a second) for more immediate updates
    const refreshInterval = setInterval(() => {
      onRefreshRequest();
    }, 500);
    
    return () => clearInterval(refreshInterval);
  }, [onRefreshRequest]);

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

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [deduplicatedMessages.length]);

  return (
    <ScrollArea className={`${isMobile ? "overflow-auto p-2" : "p-3"} flex-grow pb-16`} ref={scrollContainerRef}>
      <div className={isMobile ? "space-y-3" : "space-y-3 mx-auto"} style={{ maxWidth: isMobile ? "100%" : "90%" }}>
        <AnimatePresence initial={false}>
          {deduplicatedMessages.map(msg => (
            <motion.div 
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={`flex ${msg.is_guest ? 'justify-start' : 'justify-end'}`}
            >
              <div className={`${isMobile 
                ? `rounded-lg ${msg.is_guest ? 'chat-bubble-guest' : 'chat-bubble-staff'} mx-2 my-1 px-3 py-2` 
                : `max-w-[80%] p-3 rounded-lg ${
                    msg.is_guest 
                      ? 'bg-white border border-gray-200 text-gray-800' 
                      : 'bg-gradient-to-r from-hotel-600 to-hotel-500 text-white'
                  }`}`}
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
                  <p className="text-sm break-words">{msg.content}</p>
                )}
                
                {!isMobile && (
                  <div className="mt-1 text-xs opacity-70 text-right">
                    {formatTime(msg.created_at)}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        
        <div ref={messagesEndRef} className="h-16" />
      </div>
    </ScrollArea>
  );
};

export default MessageList;
