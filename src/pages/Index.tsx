
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Hotel, MessageCircle, Users, QrCode } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="container mx-auto px-4 py-12">
        <header className="text-center mb-16">
          <div className="flex items-center justify-center mb-4">
            <Hotel className="h-12 w-12 text-hotel-600 mr-3" />
            <h1 className="text-4xl font-bold text-gray-900">
              Hotel Connect Hub
            </h1>
          </div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Sistema de comunicación entre huéspedes y recepción mediante una aplicación web
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-6 flex flex-col items-center text-center">
            <div className="bg-blue-100 p-3 rounded-full mb-4">
              <QrCode className="h-8 w-8 text-hotel-600" />
            </div>
            <h2 className="text-xl font-semibold mb-3">Portal del Huésped</h2>
            <p className="text-gray-600 mb-6">
              Acceda al portal de comunicación para huéspedes. Escanee el código QR o ingrese directamente.
            </p>
            <Link to="/guest" className="mt-auto">
              <Button className="w-full bg-hotel-600 hover:bg-hotel-700">
                Acceso Huésped
              </Button>
            </Link>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6 flex flex-col items-center text-center">
            <div className="bg-blue-100 p-3 rounded-full mb-4">
              <MessageCircle className="h-8 w-8 text-hotel-600" />
            </div>
            <h2 className="text-xl font-semibold mb-3">Código QR</h2>
            <p className="text-gray-600 mb-6">
              Visualice el código QR para imprimir y colocar en cada habitación del hotel.
            </p>
            <Link to="/qr-code" className="mt-auto">
              <Button className="w-full bg-hotel-600 hover:bg-hotel-700">
                Ver Código QR
              </Button>
            </Link>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6 flex flex-col items-center text-center">
            <div className="bg-blue-100 p-3 rounded-full mb-4">
              <Users className="h-8 w-8 text-hotel-600" />
            </div>
            <h2 className="text-xl font-semibold mb-3">Recepción</h2>
            <p className="text-gray-600 mb-6">
              Acceso al panel de administración para el personal de recepción del hotel.
            </p>
            <Link to="/reception" className="mt-auto">
              <Button className="w-full bg-hotel-600 hover:bg-hotel-700">
                Acceso Recepción
              </Button>
            </Link>
          </div>
        </div>

        <div className="mt-16 text-center max-w-3xl mx-auto">
          <h2 className="text-2xl font-semibold mb-4">¿Cómo funciona?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div>
              <div className="bg-hotel-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
                <span className="text-hotel-700 font-bold text-xl">1</span>
              </div>
              <p className="text-gray-700">
                El huésped escanea el código QR ubicado en su habitación
              </p>
            </div>
            <div>
              <div className="bg-hotel-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
                <span className="text-hotel-700 font-bold text-xl">2</span>
              </div>
              <p className="text-gray-700">
                Ingresa su nombre y número de habitación
              </p>
            </div>
            <div>
              <div className="bg-hotel-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
                <span className="text-hotel-700 font-bold text-xl">3</span>
              </div>
              <p className="text-gray-700">
                Envía mensajes, notas de voz o realiza llamadas a recepción
              </p>
            </div>
          </div>
          <p className="text-gray-600 italic">
            Una solución moderna para mejorar la experiencia del huésped sin necesidad de instalar aplicaciones
          </p>
        </div>
      </div>
      <footer className="bg-gray-800 text-white py-6 mt-12">
        <div className="container mx-auto px-4 text-center">
          <p>© 2025 Hotel Connect Hub. Todos los derechos reservados.</p>
          <p className="text-sm text-gray-400 mt-2">
            Una aplicación de comunicación para hoteles
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
