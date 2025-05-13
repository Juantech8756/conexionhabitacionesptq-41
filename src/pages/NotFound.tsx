import { useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  const [isLoaded, setIsLoaded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Log error for tracking purposes
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
    
    // Set animation state
    setIsLoaded(true);
    
    // Check for mobile devices
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-hotel-50 to-white animate-gradient-flow">
      <div className={`text-center bg-white p-8 rounded-xl shadow-lg border border-hotel-100 ${isLoaded ? 'animate-pop-in' : 'opacity-0'} ${isMobile ? 'mx-4 p-6' : ''}`}>
        <h1 className={`${isMobile ? 'text-3xl' : 'text-4xl'} font-bold mb-4 text-hotel-800`}>404</h1>
        <p className={`${isMobile ? 'text-lg' : 'text-xl'} text-gray-600 mb-6`}>Oops! Página no encontrada</p>
        <a 
          href="/" 
          className={`inline-flex items-center justify-center px-5 py-2 bg-hotel-700 text-white rounded-full hover:bg-hotel-800 transition-all ${isLoaded ? 'animate-gentle-reveal delay-300' : 'opacity-0'} advanced-button ${isMobile ? 'text-sm mobile-friendly-button' : ''}`}
        >
          <ArrowLeft className={`mr-2 ${isMobile ? 'h-4 w-4' : 'h-5 w-5'}`} />
          Volver al inicio
        </a>
      </div>
    </div>
  );
};

export default NotFound;
