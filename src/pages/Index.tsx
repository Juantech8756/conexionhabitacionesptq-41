import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Hotel, MessageCircle, Users, QrCode } from "lucide-react";
import { useEffect, useState } from "react";

const Index = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Activar animaciones después de que el componente se monte
    setIsLoaded(true);
    
    // Detectar si es dispositivo móvil
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-hotel-50 to-white animate-gradient-flow overflow-hidden">
      <div className={`container mx-auto px-4 ${isMobile ? 'py-6' : 'py-12'}`}>
        <header className={`text-center ${isMobile ? 'mb-8' : 'mb-16'} ${isLoaded ? 'animate-gentle-reveal' : 'opacity-0'}`}>
          <div className="flex items-center justify-center mb-4">
            <Hotel className={`${isMobile ? 'h-10 w-10' : 'h-12 w-12'} text-hotel-800 mr-3 animated-icon`} />
            <h1 className={`${isMobile ? 'text-3xl' : 'text-4xl'} font-bold text-gray-900`}>
              Parque Temático Quimbaya
            </h1>
          </div>
          <p className={`${isMobile ? 'text-base' : 'text-xl'} text-gray-700 max-w-2xl mx-auto`}>
            Sistema de comunicación entre huéspedes y recepción mediante una aplicación web
          </p>
        </header>

        <div className={`grid ${isMobile ? 'grid-cols-1 gap-4' : 'grid-cols-1 md:grid-cols-3 gap-8'} max-w-6xl mx-auto`}>
          {[
            {
              icon: <QrCode className={`${isMobile ? 'h-6 w-6' : 'h-8 w-8'} text-hotel-700 animated-icon`} />,
              title: "Portal del Huésped",
              description: "Acceda al portal de comunicación para huéspedes. Escanee el código QR o ingrese directamente.",
              link: "/guest",
              button: "Acceso Huésped",
              delay: "delay-100"
            },
            {
              icon: <MessageCircle className={`${isMobile ? 'h-6 w-6' : 'h-8 w-8'} text-hotel-700 animated-icon`} />,
              title: "Códigos QR",
              description: "Gestione los códigos QR para cada cabaña. Genere, visualice y descargue para imprimir.",
              link: "/qr-code",
              button: "Gestionar Códigos",
              delay: "delay-200"
            },
            {
              icon: <Users className={`${isMobile ? 'h-6 w-6' : 'h-8 w-8'} text-hotel-700 animated-icon`} />,
              title: "Recepción",
              description: "Acceso al panel de administración para el personal de recepción del parque.",
              link: "/reception",
              button: "Acceso Recepción",
              delay: "delay-300"
            }
          ].map((card, index) => (
            <div 
              key={index}
              className={`bg-white rounded-lg shadow-lg ${isMobile ? 'p-4 main-card-mobile' : 'p-6'} flex flex-col items-center text-center border border-hotel-100 animated-card hover-lift touch-feedback ${isLoaded ? `animate-pop-in ${card.delay}` : 'opacity-0'}`}
            >
              <div className={`bg-hotel-100 ${isMobile ? 'p-2.5' : 'p-3'} rounded-full mb-4 animate-soft-pulse`}>
                {card.icon}
              </div>
              <h2 className="text-xl font-semibold mb-3 text-hotel-900">{card.title}</h2>
              <p className={`text-gray-600 ${isMobile ? 'mb-4 text-sm' : 'mb-6'}`}>
                {card.description}
              </p>
              <Link to={card.link} className="mt-auto w-full">
                <Button className={`w-full bg-hotel-700 hover:bg-hotel-800 advanced-button ripple-effect ${isMobile ? 'py-2 card-button-mobile mobile-friendly-button' : ''}`}>
                  {card.button}
                </Button>
              </Link>
            </div>
          ))}
        </div>

        <div className={`${isMobile ? 'mt-8' : 'mt-16'} text-center max-w-3xl mx-auto ${isLoaded ? 'animate-gentle-reveal delay-400' : 'opacity-0'}`}>
          <h2 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-semibold mb-4 text-hotel-900`}>¿Cómo funciona?</h2>
          <div className={`grid ${isMobile ? 'grid-cols-1 gap-4' : 'grid-cols-1 md:grid-cols-3 gap-8'} mb-8`}>
            {[
              {
                step: "1",
                text: "El huésped escanea el código QR ubicado en su cabaña",
                delay: "delay-100"
              },
              {
                step: "2",
                text: "Ingresa su nombre y se registra (la cabaña ya está preseleccionada)",
                delay: "delay-200"
              },
              {
                step: "3",
                text: "Envía mensajes, notas de voz o realiza llamadas a recepción",
                delay: "delay-300"
              }
            ].map((step, index) => (
              <div 
                key={index}
                className={`${isLoaded ? `animate-slide-in-bottom ${step.delay}` : 'opacity-0'} ${isMobile ? 'py-2' : ''}`}
              >
                <div className={`bg-hotel-100 rounded-full ${isMobile ? 'w-10 h-10' : 'w-12 h-12'} flex items-center justify-center mx-auto mb-4 ${isMobile ? 'shadow-sm' : 'animate-float-shadow'}`}>
                  <span className="text-hotel-800 font-bold text-xl">{step.step}</span>
                </div>
                <p className={`text-gray-700 ${isMobile ? 'text-sm' : ''}`}>
                  {step.text}
                </p>
              </div>
            ))}
          </div>
          <p className={`text-gray-600 italic ${isMobile ? 'text-sm' : ''} ${isLoaded ? 'animate-gentle-reveal delay-400' : 'opacity-0'}`}>
            Una solución moderna para mejorar la experiencia del huésped sin necesidad de instalar aplicaciones
          </p>
        </div>
      </div>
      <footer className={`bg-hotel-900 text-white ${isMobile ? 'py-4 mt-8 footer-mobile' : 'py-6 mt-12'} ${isLoaded ? 'animate-slide-in-bottom delay-500' : 'opacity-0'}`}>
        <div className="container mx-auto px-4 text-center">
          <p>© 2025 Parque Temático Quimbaya. Todos los derechos reservados.</p>
          <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-hotel-300 mt-2`}>
            Una aplicación de comunicación para parques temáticos
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
