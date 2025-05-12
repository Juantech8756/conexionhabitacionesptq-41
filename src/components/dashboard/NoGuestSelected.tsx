
import React from "react";
import { MessageCircle } from "lucide-react";

const NoGuestSelected: React.FC = () => {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center p-6 max-w-md">
        <MessageCircle className="h-12 w-12 mx-auto text-gray-400 mb-4" />
        <h3 className="text-xl font-semibold text-gray-700 mb-2">Seleccione un huésped</h3>
        <p className="text-gray-500">
          Seleccione un huésped de la lista para ver y responder a sus mensajes.
        </p>
      </div>
    </div>
  );
};

export default NoGuestSelected;
