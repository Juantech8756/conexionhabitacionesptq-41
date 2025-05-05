
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Hotel, QrCode } from "lucide-react";

const QrCodeDisplay = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-2">
            <Hotel className="h-8 w-8 text-hotel-600 mr-2" />
            <CardTitle className="text-2xl font-bold">
              Hotel Connect
            </CardTitle>
          </div>
          <CardDescription>
            Escanee este código QR para comunicarse con recepción
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center p-6">
          <div className="border-2 border-dashed border-gray-300 p-8 rounded-lg bg-white">
            <QrCode className="w-48 h-48 mx-auto text-hotel-600" />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col items-center">
          <p className="text-sm text-gray-500 text-center mb-4">
            Escanee con la cámara de su teléfono para acceder al portal de comunicación
          </p>
          <Button className="bg-hotel-600 hover:bg-hotel-700">
            Abrir Portal Web
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default QrCodeDisplay;
