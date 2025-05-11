
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Paperclip, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { showGlobalAlert } from "@/hooks/use-alerts";

interface MediaUploaderProps {
  guestId: string;
  onUploadComplete: (mediaUrl: string, mediaType: 'image' | 'video') => void;
  disabled?: boolean;
  onFileSelect: (file: File | null) => void;
  selectedFile: File | null;
}

const MediaUploader = ({ 
  guestId, 
  onUploadComplete, 
  disabled = false, 
  onFileSelect,
  selectedFile
}: MediaUploaderProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Update the preview when a file is selected
  useEffect(() => {
    if (selectedFile) {
      // Generate preview for images
      if (selectedFile.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setPreviewUrl(e.target?.result as string);
        };
        reader.readAsDataURL(selectedFile);
      } else {
        // For videos, just set a placeholder
        setPreviewUrl('video');
      }
    } else {
      setPreviewUrl(null);
    }
  }, [selectedFile]);

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

    // Check file size (30MB limit) - INCREASED FROM 10MB to 30MB
    const MAX_SIZE = 30 * 1024 * 1024; // 30MB
    if (file.size > MAX_SIZE) {
      showGlobalAlert({
        title: "Archivo demasiado grande",
        description: "El tamaño máximo permitido es 30MB.",
        variant: "destructive",
        duration: 4000
      });
      return;
    }

    // Pass the selected file to parent component
    onFileSelect(file);
  };

  const handleCancelSelection = () => {
    setPreviewUrl(null);
    onFileSelect(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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
        </div>
      )}
    </>
  );
};

export default MediaUploader;
