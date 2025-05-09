
import React from "react";
import { motion } from "framer-motion";

interface MessageNotificationBadgeProps {
  count?: number;
  waitTime?: number | null;
  hideWaitTime?: boolean; // Added option to hide wait time
}

const MessageNotificationBadge = ({
  count = 0,
  waitTime = null,
  hideWaitTime = true // Set to true by default to hide wait times
}: MessageNotificationBadgeProps) => {
  // Don't show anything if no unread messages and hiding wait time
  if (count === 0 && (!waitTime || waitTime === 0 || hideWaitTime)) {
    return null;
  }

  // Show unread count badge
  if (count > 0) {
    return (
      <motion.div
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        className="bg-hotel-600 text-white rounded-full h-5 min-w-5 px-1.5 flex items-center justify-center text-xs shadow-md"
      >
        {count}
      </motion.div>
    );
  }

  // Show wait time badge only if we're not hiding it and it exists
  if (waitTime && waitTime > 0 && !hideWaitTime) {
    const formattedTime = Math.round(waitTime);
    return (
      <motion.div
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        className="bg-amber-500 text-white rounded-full px-2 py-0.5 text-xs shadow-md"
      >
        {formattedTime} min
      </motion.div>
    );
  }

  return null;
};

export default MessageNotificationBadge;
