
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Paperclip } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { showGlobalAlert } from "@/hooks/use-alerts";

interface MediaUploaderProps {
  guestId: string;
  onUploadComplete: (mediaUrl: string, mediaType: 'image' | 'video') => void;
  disabled?: boolean;
}

const MediaUploader = ({ guestId, onUploadComplete, disabled = false }: MediaUploaderProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleButtonClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file type
    const fileType = file.type.startsWith('image/') ? 'image' : 
                    file.type.startsWith('video/') ? 'video' : null;
    
    if (!fileType) {
      toast({
        title: "Tipo de archivo no soportado",
        description: "Solo se permiten archivos de imagen y video.",
        variant: "destructive"
      });
      return;
    }

    // Check file size (10MB limit)
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_SIZE) {
      toast({
        title: "Archivo demasiado grande",
        description: "El tamaño máximo permitido es 10MB.",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    showGlobalAlert({
      title: "Subiendo archivo",
      description: "Por favor espere mientras se sube el archivo...",
      duration: 2000
    });

    try {
      // Create folder structure: media/{guestId}/{fileType}s/
      const fileName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
      const filePath = `media/${guestId}/${fileType}s/${fileName}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase
        .storage
        .from('chat_media')
        .upload(filePath, file);

      if (error) throw error;

      // Get public URL for the uploaded file
      const { data: publicUrlData } = supabase
        .storage
        .from('chat_media')
        .getPublicUrl(filePath);

      // Pass the URL back to the parent component
      onUploadComplete(publicUrlData.publicUrl, fileType as 'image' | 'video');

      toast({
        title: "Archivo subido",
        description: "El archivo se ha subido correctamente.",
      });

    } catch (error) {
      console.error("Error uploading file:", error);
      toast({
        title: "Error al subir archivo",
        description: "No se pudo subir el archivo. Intente de nuevo.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*,video/*"
        className="hidden"
        disabled={disabled || isUploading}
      />
      <Button
        type="button"
        size="icon"
        variant="outline"
        onClick={handleButtonClick}
        className="flex-shrink-0"
        disabled={disabled || isUploading}
        title="Enviar imagen o video"
      >
        {isUploading ? (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-hotel-600" />
        ) : (
          <Paperclip className="h-4 w-4" />
        )}
      </Button>
    </>
  );
};

export default MediaUploader;
