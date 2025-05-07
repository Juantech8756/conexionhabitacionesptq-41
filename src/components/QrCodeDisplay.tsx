
import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Hotel, ArrowLeft, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

const QrCodeDisplay = () => {
  const [roomData, setRoomData] = useState<{id: string; room_number: string; type: string | null} | null>(null);
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  
  const appUrl = window.location.origin;
  const qrUrl = roomId ? `${appUrl}/guest?room=${roomId}` : `${appUrl}/guest`;

  useEffect(() => {
    const fetchRoomData = async () => {
      if (!roomId) return;
      
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('rooms')
          .select('id, room_number, type')
          .eq('id', roomId)
          .single();
        
        if (error) throw error;
        setRoomData(data);
      } catch (error) {
        console.error("Error fetching room data:", error);
        toast({
          title: "Error",
          description: "No se pudo cargar la información de la cabaña",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchRoomData();
  }, [roomId, toast]);

  const handleDownload = () => {
    const svg = document.getElementById("qr-code");
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      
      const pngFile = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.download = `qr-code-${roomData?.room_number || "guest"}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };
    
    img.src = `data:image/svg+xml;base64,${btoa(svgData)}`;
  };

  const goBack = () => {
    navigate(-1);
  };

  const getRoomTypeText = (type: string | null) => {
    if (!type) return "";
    switch (type.toLowerCase()) {
      case "family":
        return "Familiar";
      case "couple":
        return "Pareja";
      default:
        return type;
    }
  };

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
            {roomId && roomData ? (
              <>
                Código QR para la cabaña: <span className="font-semibold">{roomData.room_number}</span>
                {roomData.type && ` - ${getRoomTypeText(roomData.type)}`}
              </>
            ) : (
              "Escanee este código QR para comunicarse con recepción"
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center p-6">
          <div className="border-2 border-dashed border-gray-300 p-8 rounded-lg bg-white">
            <QRCodeSVG
              id="qr-code"
              value={qrUrl}
              size={192}
              bgColor={"#ffffff"}
              fgColor={"#000000"}
              level={"H"}
              className="mx-auto"
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col items-center gap-3">
          <p className="text-sm text-gray-500 text-center mb-4">
            Escanee con la cámara de su teléfono para acceder al portal de comunicación
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={goBack} className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Volver
            </Button>
            <Button className="bg-hotel-600 hover:bg-hotel-700 flex items-center gap-2" onClick={handleDownload}>
              <Download className="h-4 w-4" />
              Descargar QR
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default QrCodeDisplay;
