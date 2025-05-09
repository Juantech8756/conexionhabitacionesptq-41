
import { motion } from "framer-motion";

interface MessageNotificationBadgeProps {
  count: number;
  waitTime?: number | null;
}

const MessageNotificationBadge = ({ count, waitTime }: MessageNotificationBadgeProps) => {
  if (count <= 0) return null;
  
  return (
    <div className="flex flex-col items-end">
      <motion.div 
        initial={{ scale: 0.8 }} 
        animate={{ scale: 1 }}
        transition={{ 
          type: "spring", 
          stiffness: 400, 
          damping: 15 
        }}
        className="bg-hotel-600 text-white rounded-full h-5 min-w-5 flex items-center justify-center text-xs shadow-md px-1"
      >
        {count}
      </motion.div>
      
      {waitTime && waitTime > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-xs text-amber-600 font-medium mt-1"
        >
          {waitTime} min
        </motion.div>
      )}
    </div>
  );
};

export default MessageNotificationBadge;
