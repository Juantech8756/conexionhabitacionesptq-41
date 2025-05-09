
import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Hotel, ArrowLeft, Download, QrCode, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { motion } from "framer-motion";

// Define the base domain to use for QR codes
const BASE_DOMAIN = "https://quimbayasconect.parquetematicoquimbayas.com";

const QrCodeDisplay = () => {
  const [roomData, setRoomData] = useState<{id: string; room_number: string; type: string | null} | null>(null);
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  
  // Build QR URL using the new BASE_DOMAIN instead of the current origin
  const qrUrl = roomId 
    ? `${BASE_DOMAIN}/guest?room=${roomId}` 
    : `${BASE_DOMAIN}/guest`;

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

    try {
      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        throw new Error("Could not get canvas context");
      }
      
      const img = new Image();
      
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        try {
          const pngFile = canvas.toDataURL("image/png");
          const downloadLink = document.createElement("a");
          downloadLink.download = `qr-cabaña-${roomData?.room_number || "guest"}.png`;
          downloadLink.href = pngFile;
          downloadLink.click();
        } catch (e) {
          console.error("Error generating PNG:", e);
          toast({
            title: "Error",
            description: "No se pudo generar el archivo PNG",
            variant: "destructive",
          });
        }
      };
      
      // Fix for encoding SVG with special characters
      const encodedData = encodeURIComponent(svgData)
        .replace(/'/g, '%27')
        .replace(/"/g, '%22');
        
      img.src = `data:image/svg+xml;charset=utf-8,${encodedData}`;
      
    } catch (error) {
      console.error("Error downloading QR code:", error);
      toast({
        title: "Error",
        description: "No se pudo descargar el código QR",
        variant: "destructive",
      });
    }
  };

  const goBack = () => {
    navigate(-1);
  };

  const openQrDestination = () => {
    // Open the QR URL using our new domain URL
    console.log("Opening URL:", qrUrl);
    window.open(qrUrl, '_blank');
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
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md mx-auto py-8"
      >
        <Card className="shadow-lg">
          <CardHeader className="text-center bg-gradient-to-r from-hotel-700 to-hotel-600 text-white rounded-t-lg">
            <div className="flex items-center justify-center mb-2">
              <Hotel className="h-10 w-10 text-white mr-2" />
              <CardTitle className="text-2xl font-bold">
                Parque Temático Quimbaya
              </CardTitle>
            </div>
            <CardDescription className="text-white/90 text-lg">
              {roomId && roomData ? (
                <>
                  <span className="font-bold text-2xl block mt-2 mb-1">
                    Cabaña {roomData.room_number}
                  </span>
                  {roomData.type && (
                    <span className="bg-white/20 px-3 py-1 rounded-full text-sm">
                      {getRoomTypeText(roomData.type)}
                    </span>
                  )}
                </>
              ) : (
                "Escanee este código QR para comunicarse con recepción"
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center p-8 bg-white">
            <div className="border-8 border-hotel-100 p-3 rounded-lg bg-white shadow-inner relative">
              <div className="absolute inset-0 flex items-center justify-center opacity-10">
                <Hotel className="w-32 h-32 text-hotel-300" />
              </div>
              <QRCodeSVG
                id="qr-code"
                value={qrUrl}
                size={220}
                bgColor={"#ffffff"}
                fgColor={"#000000"}
                level={"H"}
                includeMargin={true}
                className="mx-auto"
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col items-center gap-3 bg-gray-50 rounded-b-lg p-6">
            <div className="text-center text-sm text-gray-600 mb-4 max-w-xs">
              <p className="mb-2">
                <span className="font-medium">Instrucciones:</span> Escanee este código con la cámara de su teléfono para conectarse directamente con recepción desde su cabaña.
              </p>
              <p className="text-xs italic">
                El código QR lo conectará automáticamente con su habitación sin necesidad de seleccionarla manualmente.
              </p>
              <p className="text-xs text-blue-600 mt-2 font-medium">
                URL: {qrUrl}
              </p>
            </div>
            <div className="flex gap-3 flex-wrap justify-center">
              <Button variant="outline" onClick={goBack} className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Volver
              </Button>
              <Button className="bg-hotel-600 hover:bg-hotel-700 flex items-center gap-2" onClick={handleDownload}>
                <Download className="h-4 w-4" />
                Descargar QR
              </Button>
              <Button 
                variant="secondary" 
                onClick={openQrDestination} 
                className="flex items-center gap-2 bg-green-100 hover:bg-green-200 text-green-700 hover:text-green-800"
              >
                <ExternalLink className="h-4 w-4" />
                Probar Enlace
              </Button>
            </div>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
};

export default QrCodeDisplay;
