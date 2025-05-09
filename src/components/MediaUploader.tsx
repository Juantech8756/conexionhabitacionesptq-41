import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Paperclip, X, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { showGlobalAlert } from "@/hooks/use-alerts";

interface MediaUploaderProps {
  guestId: string;
  onUploadComplete: (mediaUrl: string, mediaType: 'image' | 'video') => void;
  disabled?: boolean;
}

const MediaUploader = ({ guestId, onUploadComplete, disabled = false }: MediaUploaderProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
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
      showGlobalAlert({
        title: "Tipo de archivo no soportado",
        description: "Solo se permiten archivos de imagen y video.",
        variant: "destructive",
        duration: 4000
      });
      return;
    }

    // Check file size (10MB limit)
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_SIZE) {
      showGlobalAlert({
        title: "Archivo demasiado grande",
        description: "El tamaño máximo permitido es 10MB.",
        variant: "destructive",
        duration: 4000
      });
      return;
    }

    // Generate preview for images
    if (fileType === 'image') {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      // For videos, just set a placeholder
      setPreviewUrl('video');
    }
    
    setSelectedFile(file);
  };

  const handleCancelSelection = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    
    setIsUploading(true);
    showGlobalAlert({
      title: "Subiendo archivo",
      description: "Por favor espere mientras se sube el archivo...",
      duration: 2000
    });

    try {
      console.log("Starting file upload for guest ID:", guestId);
      
      // Determine file type
      const fileType = selectedFile.type.startsWith('image/') ? 'image' : 'video';
      
      // Create folder structure: media/{guestId}/{fileType}s/
      const fileName = `${Date.now()}_${selectedFile.name.replace(/\s+/g, '_')}`;
      const filePath = `media/${guestId}/${fileType}s/${fileName}`;

      console.log("Uploading to path:", filePath);
      
      // Make sure the bucket exists
      try {
        const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
        
        if (bucketsError) {
          console.error("Error listing buckets:", bucketsError);
        } else {
          const chatMediaBucket = buckets?.find(b => b.name === 'chat_media');
          
          if (!chatMediaBucket) {
            console.log("Creating chat_media bucket...");
            await supabase.storage.createBucket('chat_media', {
              public: true,
              fileSizeLimit: 10485760, // 10MB
              allowedMimeTypes: ['image/*', 'video/*']
            });
          }
        }
      } catch (bucketError) {
        console.error("Error checking/creating bucket:", bucketError);
        // Continue anyway, as the bucket might exist but not be visible to the user
      }
      
      // Upload to Supabase Storage
      const { data, error } = await supabase
        .storage
        .from('chat_media')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error("Upload error:", error);
        throw error;
      }

      console.log("Upload successful:", data);

      // Get public URL for the uploaded file
      const { data: publicUrlData } = supabase
        .storage
        .from('chat_media')
        .getPublicUrl(filePath);

      console.log("Got public URL:", publicUrlData.publicUrl);

      // Pass the URL back to the parent component
      onUploadComplete(publicUrlData.publicUrl, fileType as 'image' | 'video');

      showGlobalAlert({
        title: "Archivo subido",
        description: "El archivo se ha subido correctamente.",
        duration: 4000
      });

      // Reset state
      setSelectedFile(null);
      setPreviewUrl(null);

    } catch (error) {
      console.error("Error uploading file:", error);
      showGlobalAlert({
        title: "Error al subir archivo",
        description: "No se pudo subir el archivo. Intente de nuevo.",
        variant: "destructive",
        duration: 4000
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
      
      {!selectedFile ? (
        <Button
          type="button"
          size="icon"
          variant="outline"
          onClick={handleButtonClick}
          className="flex-shrink-0"
          disabled={disabled || isUploading}
          title="Seleccionar imagen o video"
        >
          <Paperclip className="h-4 w-4" />
        </Button>
      ) : (
        <div className="flex items-center gap-1">
          {previewUrl && previewUrl !== 'video' ? (
            <div className="relative h-8 w-8 rounded overflow-hidden border border-gray-300">
              <img 
                src={previewUrl} 
                alt="Preview" 
                className="h-full w-full object-cover"
              />
            </div>
          ) : (
            <div className="bg-gray-100 text-xs rounded p-1 border border-gray-300">
              Video seleccionado
            </div>
          )}
          
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={handleCancelSelection}
            className="h-8 w-8 p-0"
            disabled={isUploading}
          >
            <X className="h-4 w-4" />
          </Button>
          
          <Button
            type="button"
            size="sm"
            onClick={handleUpload}
            className="h-8 flex-shrink-0 bg-gradient-to-r from-hotel-600 to-hotel-500 hover:from-hotel-700 hover:to-hotel-600"
            disabled={isUploading}
          >
            {isUploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Enviar"
            )}
          </Button>
        </div>
      )}
    </>
  );
};

export default MediaUploader;
