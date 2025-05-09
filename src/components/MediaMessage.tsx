
import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { FileImage, FileVideo, ZoomIn, ZoomOut, Download, X } from "lucide-react";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MediaMessageProps {
  mediaUrl: string;
  mediaType: 'image' | 'video';
  isGuest: boolean;
}

const MediaMessage = ({ mediaUrl, mediaType, isGuest }: MediaMessageProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);

  // Reset error state and zoom level when mediaUrl changes
  useEffect(() => {
    setImageError(false);
    setVideoError(false);
    setZoomLevel(1);
    console.log(`MediaMessage rendering with URL: ${mediaUrl} and type: ${mediaType} for ${isGuest ? 'guest' : 'staff'}`);
  }, [mediaUrl, mediaType, isGuest]);

  const handleOpen = () => {
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
    // Reset zoom when closing
    setZoomLevel(1);
  };

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.25, 0.5));
  };

  const handleDownload = () => {
    // Create an anchor and trigger download
    const link = document.createElement('a');
    link.href = mediaUrl;
    link.download = mediaUrl.split('/').pop() || 'download';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    console.error("Failed to load image:", mediaUrl, e);
    setImageError(true);
  };

  const handleVideoError = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    console.error("Failed to load video:", mediaUrl, e);
    setVideoError(true);
  };

  // Style based on whether it's a guest or staff message
  const messageStyle = isGuest 
    ? "bg-gradient-to-r from-hotel-600 to-hotel-500 text-white" 
    : "bg-white border border-gray-200 text-gray-800";

  const imageLabelStyle = isGuest
    ? "bg-white bg-opacity-50 text-black"
    : "bg-black bg-opacity-50 text-white";

  return (
    <>
      {mediaType === 'image' ? (
        <div className="relative cursor-pointer rounded-lg overflow-hidden" onClick={handleOpen}>
          {!imageError ? (
            <div className="bg-gray-100">
              <AspectRatio ratio={16/9} className="w-full max-w-[280px]">
                <img
                  src={mediaUrl}
                  alt="Imagen enviada"
                  className="w-full h-full object-cover rounded"
                  loading="lazy"
                  onError={handleImageError}
                />
              </AspectRatio>
            </div>
          ) : (
            <div className={`bg-gray-100 rounded p-3 flex items-center justify-center min-h-[100px] min-w-[150px] max-w-[280px] ${messageStyle}`}>
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
          <div className="relative bg-black rounded overflow-hidden min-h-[100px] min-w-[150px] max-w-[280px]">
            {!videoError ? (
              <video
                src={mediaUrl}
                className="max-h-40 max-w-full object-cover"
                preload="metadata"
                onError={handleVideoError}
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

      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-5xl max-h-[90vh] p-1 overflow-hidden bg-gray-900/95 border-gray-800">
          <div className="absolute top-2 right-2 z-50 flex gap-2">
            {mediaType === 'image' && !imageError && (
              <>
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="bg-black/40 border-gray-700 text-white hover:bg-black/60 hover:text-white"
                  onClick={handleZoomOut}
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="bg-black/40 border-gray-700 text-white hover:bg-black/60 hover:text-white"
                  onClick={handleZoomIn}
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </>
            )}
            <Button 
              variant="outline" 
              size="icon" 
              className="bg-black/40 border-gray-700 text-white hover:bg-black/60 hover:text-white"
              onClick={handleDownload}
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              size="icon" 
              className="bg-black/40 border-gray-700 text-white hover:bg-black/60 hover:text-white"
              onClick={handleClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          {mediaType === 'image' && !imageError ? (
            <div className="relative w-full h-full flex items-center justify-center p-4">
              <div 
                className="overflow-auto max-w-full max-h-[calc(90vh-2rem)] transition-transform duration-200"
                style={{ maxWidth: '100%', maxHeight: '100%' }}
              >
                <img 
                  src={mediaUrl} 
                  alt="Imagen enviada" 
                  className={`transition-transform duration-200 ease-out`}
                  style={{
                    transform: `scale(${zoomLevel})`,
                    transformOrigin: 'center center',
                  }}
                  onError={handleImageError}
                />
              </div>
            </div>
          ) : mediaType === 'video' && !videoError ? (
            <div className="w-full h-full flex items-center justify-center">
              <video 
                src={mediaUrl} 
                controls 
                className="max-w-full max-h-[calc(90vh-2rem)]"
                autoPlay
                onError={handleVideoError}
              />
            </div>
          ) : (
            <div className="p-8 text-center flex flex-col items-center text-white">
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
