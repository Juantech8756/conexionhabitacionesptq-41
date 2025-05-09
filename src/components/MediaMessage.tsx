
import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { FileImage, FileVideo } from "lucide-react";

interface MediaMessageProps {
  mediaUrl: string;
  mediaType: 'image' | 'video';
  isGuest: boolean;
}

const MediaMessage = ({ mediaUrl, mediaType, isGuest }: MediaMessageProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleOpen = () => {
    setIsOpen(true);
  };

  console.log("Rendering media message:", { mediaUrl, mediaType });

  return (
    <>
      {mediaType === 'image' ? (
        <div className="relative cursor-pointer" onClick={handleOpen}>
          <img
            src={mediaUrl}
            alt="Imagen enviada"
            className="max-w-full rounded max-h-40 object-contain"
            loading="lazy"
            onError={(e) => {
              console.error("Failed to load image:", e);
              (e.target as HTMLImageElement).src = "/placeholder.svg";
              (e.target as HTMLImageElement).alt = "Error al cargar imagen";
            }}
          />
          <div className="absolute bottom-1 right-1 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
            Imagen
          </div>
        </div>
      ) : (
        <div className="cursor-pointer flex flex-col" onClick={handleOpen}>
          <div className="relative bg-black rounded overflow-hidden">
            <video
              src={mediaUrl}
              className="max-h-40 max-w-full"
              preload="metadata"
              onError={(e) => {
                console.error("Failed to load video:", e);
                const videoEl = e.target as HTMLVideoElement;
                const parentEl = videoEl.parentElement;
                if (parentEl) {
                  parentEl.innerHTML = '<div class="p-2 text-white text-xs">Error al cargar video</div>';
                }
              }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <FileVideo className="h-10 w-10 text-white opacity-70" />
            </div>
            <div className="absolute bottom-1 right-1 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
              Video
            </div>
          </div>
        </div>
      )}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-xl max-h-[80vh] p-1 overflow-hidden">
          {mediaType === 'image' ? (
            <img 
              src={mediaUrl} 
              alt="Imagen enviada" 
              className="max-w-full max-h-[calc(80vh-2rem)] object-contain"
              onError={(e) => {
                console.error("Failed to load fullsize image:", e);
                (e.target as HTMLImageElement).src = "/placeholder.svg";
              }}
            />
          ) : (
            <video 
              src={mediaUrl} 
              controls 
              className="max-w-full max-h-[calc(80vh-2rem)]"
              autoPlay
              onError={(e) => {
                console.error("Failed to load fullsize video:", e);
                const videoEl = e.target as HTMLVideoElement;
                const parentEl = videoEl.parentElement;
                if (parentEl) {
                  parentEl.innerHTML = '<div class="p-4 text-center">Error al cargar video</div>';
                }
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default MediaMessage;
