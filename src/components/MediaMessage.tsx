
import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { FileImage, FileVideo } from "lucide-react";

interface MediaMessageProps {
  mediaUrl: string;
  mediaType: 'image' | 'video';
  isGuest: boolean;
}

const MediaMessage = ({ mediaUrl, mediaType, isGuest }: MediaMessageProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [videoError, setVideoError] = useState(false);

  // Reset error state when mediaUrl changes
  useEffect(() => {
    setImageError(false);
    setVideoError(false);
    console.log(`MediaMessage rendering with URL: ${mediaUrl} and type: ${mediaType}`);
  }, [mediaUrl, mediaType]);

  const handleOpen = () => {
    setIsOpen(true);
  };

  // Style based on whether it's a guest or staff message
  const messageStyle = isGuest 
    ? "bg-white border border-gray-200 text-gray-800" 
    : "bg-gradient-to-r from-hotel-600 to-hotel-500 text-white";

  const imageLabelStyle = isGuest
    ? "bg-black bg-opacity-50 text-white"
    : "bg-white bg-opacity-50 text-black";

  return (
    <>
      {mediaType === 'image' ? (
        <div className="relative cursor-pointer" onClick={handleOpen}>
          {!imageError ? (
            <img
              src={mediaUrl}
              alt="Imagen enviada"
              className="max-w-full rounded max-h-40 object-contain"
              loading="lazy"
              onError={(e) => {
                console.error("Failed to load image:", mediaUrl, e);
                setImageError(true);
              }}
            />
          ) : (
            <div className={`bg-gray-100 rounded p-3 flex items-center justify-center min-h-[100px] min-w-[150px] ${messageStyle}`}>
              <FileImage className="h-10 w-10 text-gray-400 mr-2" />
              <span className="text-sm text-gray-500">Error al cargar imagen</span>
            </div>
          )}
          <div className={`absolute bottom-1 right-1 ${imageLabelStyle} text-xs px-2 py-1 rounded`}>
            Imagen
          </div>
        </div>
      ) : (
        <div className="cursor-pointer flex flex-col" onClick={handleOpen}>
          <div className="relative bg-black rounded overflow-hidden min-h-[100px] min-w-[150px]">
            {!videoError ? (
              <video
                src={mediaUrl}
                className="max-h-40 max-w-full"
                preload="metadata"
                onError={(e) => {
                  console.error("Failed to load video:", mediaUrl, e);
                  setVideoError(true);
                }}
              />
            ) : (
              <div className="flex items-center justify-center h-full w-full p-4">
                <FileVideo className="h-10 w-10 text-white opacity-70 mr-2" />
                <span className="text-white text-xs">Error al cargar video</span>
              </div>
            )}
            <div className="absolute inset-0 flex items-center justify-center">
              <FileVideo className="h-10 w-10 text-white opacity-70" />
            </div>
            <div className={`absolute bottom-1 right-1 ${imageLabelStyle} text-xs px-2 py-1 rounded`}>
              Video
            </div>
          </div>
        </div>
      )}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-xl max-h-[80vh] p-1 overflow-hidden">
          {mediaType === 'image' && !imageError ? (
            <img 
              src={mediaUrl} 
              alt="Imagen enviada" 
              className="max-w-full max-h-[calc(80vh-2rem)] object-contain"
              onError={() => setImageError(true)}
            />
          ) : mediaType === 'video' && !videoError ? (
            <video 
              src={mediaUrl} 
              controls 
              className="max-w-full max-h-[calc(80vh-2rem)]"
              autoPlay
              onError={() => setVideoError(true)}
            />
          ) : (
            <div className="p-8 text-center flex flex-col items-center">
              {mediaType === 'image' ? (
                <>
                  <FileImage className="h-12 w-12 text-gray-400 mb-2" />
                  <p>Error al cargar la imagen</p>
                  <p className="text-sm text-gray-500 mt-2 break-all">{mediaUrl}</p>
                </>
              ) : (
                <>
                  <FileVideo className="h-12 w-12 text-gray-400 mb-2" />
                  <p>Error al cargar el video</p>
                  <p className="text-sm text-gray-500 mt-2 break-all">{mediaUrl}</p>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default MediaMessage;
