import { useState } from "react";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { FileImage, FileVideo } from "lucide-react";

interface MediaItem {
  type: 'image' | 'video';
  url: string;
}

interface MediaGalleryProps {
  media: MediaItem[];
  onSelect: (item: MediaItem) => void;
}

const MediaGallery = ({ media, onSelect }: MediaGalleryProps) => {
  const [loadErrors, setLoadErrors] = useState<Record<string, boolean>>({});

  const handleImageError = (url: string) => {
    setLoadErrors(prev => ({
      ...prev,
      [url]: true
    }));
  };

  // If there's only one media item, render a simple view
  if (media.length === 1) {
    const item = media[0];
    return (
      <div 
        onClick={() => onSelect(item)}
        className="cursor-pointer hover:opacity-90 transition-opacity duration-200"
      >
        {item.type === 'image' ? (
          !loadErrors[item.url] ? (
            <AspectRatio ratio={16/9} className="w-full max-w-[280px]">
              <img
                src={item.url}
                alt="Media content"
                className="w-full h-full object-cover rounded-lg"
                loading="lazy"
                onError={() => handleImageError(item.url)}
              />
            </AspectRatio>
          ) : (
            <div className="bg-gray-100 rounded-lg p-3 flex items-center justify-center min-h-[160px] min-w-[160px]">
              <FileImage className="h-10 w-10 text-gray-400" />
            </div>
          )
        ) : (
          <div className="relative bg-black rounded-lg overflow-hidden">
            <AspectRatio ratio={16/9} className="w-full max-w-[280px]">
              <div className="absolute inset-0 flex items-center justify-center">
                <FileVideo className="h-10 w-10 text-white opacity-70" />
              </div>
              <video
                src={item.url}
                className="w-full h-full object-cover"
                preload="metadata"
              />
            </AspectRatio>
          </div>
        )}
      </div>
    );
  }

  // Otherwise, render a carousel
  return (
    <Carousel className="w-full max-w-[320px]">
      <CarouselContent>
        {media.map((item, index) => (
          <CarouselItem key={index}>
            <div 
              className="cursor-pointer p-1"
              onClick={() => onSelect(item)}
            >
              {item.type === 'image' ? (
                !loadErrors[item.url] ? (
                  <AspectRatio ratio={16/9} className="w-full">
                    <img
                      src={item.url}
                      alt={`Media item ${index + 1}`}
                      className="w-full h-full object-cover rounded-lg"
                      loading="lazy"
                      onError={() => handleImageError(item.url)}
                    />
                  </AspectRatio>
                ) : (
                  <div className="bg-gray-100 rounded-lg p-3 flex items-center justify-center h-full">
                    <FileImage className="h-10 w-10 text-gray-400" />
                  </div>
                )
              ) : (
                <div className="relative bg-black rounded-lg overflow-hidden">
                  <AspectRatio ratio={16/9}>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <FileVideo className="h-10 w-10 text-white opacity-70" />
                    </div>
                    <video
                      src={item.url}
                      className="w-full h-full object-cover"
                      preload="metadata"
                    />
                  </AspectRatio>
                </div>
              )}
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious className="left-1 bg-black/50 text-white border-none hover:bg-black/70" />
      <CarouselNext className="right-1 bg-black/50 text-white border-none hover:bg-black/70" />
    </Carousel>
  );
};

export default MediaGallery;
