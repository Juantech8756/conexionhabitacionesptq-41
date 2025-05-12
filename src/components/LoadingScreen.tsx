
import { motion } from "framer-motion";

const LoadingScreen = () => {
  return (
    <div className="h-screen flex items-center justify-center bg-gray-50">
      <motion.div 
        initial={{ opacity: 0, scale: 0.8 }} 
        animate={{ opacity: 1, scale: 1 }} 
        transition={{ duration: 0.5, type: "spring" }} 
        className="flex flex-col items-center"
      >
        <div className="w-16 h-16 mb-4 rounded-full border-4 border-hotel-600 border-t-transparent animate-spin" />
        <p className="text-hotel-700 font-medium">Cargando...</p>
      </motion.div>
    </div>
  );
};

export default LoadingScreen;
