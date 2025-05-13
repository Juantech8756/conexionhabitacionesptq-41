import React from "react";
import { Users, ArrowLeft } from "lucide-react";

const NoGuestSelected = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center text-muted-foreground">
      <div className="rounded-full bg-muted p-6 mb-6">
        <Users className="h-10 w-10" />
      </div>
      
      <h3 className="text-xl font-medium mb-2">
        Ninguna conversación seleccionada
      </h3>
      
      <p className="max-w-md">
        Selecciona un huésped de la lista para ver y responder sus mensajes
      </p>
      
      <div className="mt-6 flex items-center text-sm">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Selecciona un huésped para comenzar
      </div>
    </div>
  );
};

export default NoGuestSelected;
