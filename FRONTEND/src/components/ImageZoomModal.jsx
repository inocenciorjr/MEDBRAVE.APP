import React from 'react';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { ZoomIn } from 'lucide-react';

const ImageZoomModal = ({ src, alt, children }) => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <div className="relative inline-block cursor-pointer group">
          {children}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200 flex items-center justify-center">
            <ZoomIn className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
          </div>
        </div>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <div className="relative">
          <img 
            src={src} 
            alt={alt} 
            className="w-full h-auto max-h-[85vh] object-contain"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ImageZoomModal;

