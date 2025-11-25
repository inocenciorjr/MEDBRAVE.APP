'use client';

import { useState, useRef, useEffect } from 'react';
import ReactCrop, { Crop, PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

interface ImageCropModalProps {
    isOpen: boolean;
    imageUrl: string;
    onCropComplete: (croppedBlob: Blob) => void;
    onClose: () => void;
}

export function ImageCropModal({ isOpen, imageUrl, onCropComplete, onClose }: ImageCropModalProps) {
    const [isAnimating, setIsAnimating] = useState(false);
    const [shouldRender, setShouldRender] = useState(false);
    const imgRef = useRef<HTMLImageElement>(null);
    const [crop, setCrop] = useState<Crop>({
        unit: '%',
        width: 90,
        height: 90,
        x: 5,
        y: 5
    });
    const [completedCrop, setCompletedCrop] = useState<PixelCrop>();

    useEffect(() => {
        if (isOpen) {
            setShouldRender(true);
            document.body.style.overflow = 'hidden';
            setTimeout(() => setIsAnimating(true), 10);
        } else {
            setIsAnimating(false);
            const timer = setTimeout(() => {
                setShouldRender(false);
                document.body.style.overflow = 'unset';
            }, 300);
            return () => clearTimeout(timer);
        }

        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    const getCroppedImg = async (): Promise<Blob | null> => {
        const image = imgRef.current;
        const crop = completedCrop;

        if (!image || !crop) {
            return null;
        }

        const canvas = document.createElement('canvas');
        
        // Tamanho final da imagem (quadrado 400x400)
        const outputSize = 400;
        canvas.width = outputSize;
        canvas.height = outputSize;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
            return null;
        }

        // Calcular escala entre imagem exibida e imagem natural
        const scaleX = image.naturalWidth / image.width;
        const scaleY = image.naturalHeight / image.height;

        // Converter coordenadas do crop (relativas à imagem exibida) para coordenadas da imagem natural
        const cropX = crop.x * scaleX;
        const cropY = crop.y * scaleY;
        const cropWidth = crop.width * scaleX;
        const cropHeight = crop.height * scaleY;

        console.log('[Crop] Imagem exibida:', { width: image.width, height: image.height });
        console.log('[Crop] Imagem natural:', { width: image.naturalWidth, height: image.naturalHeight });
        console.log('[Crop] Escala:', { scaleX, scaleY });
        console.log('[Crop] Crop na tela:', { x: crop.x, y: crop.y, width: crop.width, height: crop.height });
        console.log('[Crop] Crop na imagem natural:', { cropX, cropY, cropWidth, cropHeight });

        // Desenhar imagem cortada e redimensionada
        // drawImage(image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight)
        ctx.drawImage(
            image,
            cropX,  // Posição X na imagem NATURAL
            cropY,  // Posição Y na imagem NATURAL
            cropWidth,  // Largura do crop na imagem NATURAL
            cropHeight, // Altura do crop na imagem NATURAL
            0,  // Posição X no canvas (sempre 0)
            0,  // Posição Y no canvas (sempre 0)
            outputSize,  // Largura final no canvas
            outputSize   // Altura final no canvas
        );

        return new Promise((resolve) => {
            canvas.toBlob((blob) => {
                resolve(blob);
            }, 'image/png');
        });
    };

    const handleCrop = async () => {
        const croppedBlob = await getCroppedImg();
        if (croppedBlob) {
            onCropComplete(croppedBlob);
        }
    };

    const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
        const { width, height, naturalWidth, naturalHeight } = e.currentTarget;
        
        console.log('[ImageCropModal] Imagem carregada:');
        console.log('[ImageCropModal] - Dimensões exibidas:', { width, height });
        console.log('[ImageCropModal] - Dimensões naturais:', { naturalWidth, naturalHeight });
        
        // Centralizar crop inicial
        const size = Math.min(width, height) * 0.9;
        const x = (width - size) / 2;
        const y = (height - size) / 2;
        
        console.log('[ImageCropModal] - Crop inicial:', { x, y, size });
        
        const initialCrop = {
            unit: 'px' as const,
            width: size,
            height: size,
            x: x,
            y: y
        };
        
        setCrop(initialCrop);
        
        // Definir completedCrop imediatamente para habilitar o botão
        setCompletedCrop({
            unit: 'px',
            x: x,
            y: y,
            width: size,
            height: size
        });
    };

    if (!shouldRender) return null;

    return (
        <>
            {/* Overlay */}
            <div
                className={`fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] transition-opacity duration-300 ${
                    isAnimating ? 'opacity-100' : 'opacity-0'
                }`}
                onClick={onClose}
            />

            {/* Modal */}
            <div
                className={`fixed inset-0 z-[10000] flex items-center justify-center p-4 pointer-events-none`}
            >
                <div
                    className={`bg-surface-light dark:bg-surface-dark rounded-xl shadow-2xl dark:shadow-dark-2xl max-w-2xl w-full pointer-events-auto transform transition-all duration-300 ${
                        isAnimating ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
                    }`}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-border-light dark:border-border-dark">
                        <div>
                            <h2 className="text-xl font-bold text-text-light-primary dark:text-text-dark-primary">
                                Ajustar Imagem
                            </h2>
                            <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mt-1">
                                Arraste para selecionar a área desejada
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2.5 hover:bg-background-light dark:hover:bg-background-dark rounded-xl transition-all duration-200 hover:scale-110 group"
                        >
                            <span className="material-symbols-outlined text-text-light-secondary dark:text-text-dark-secondary group-hover:text-primary transition-colors">
                                close
                            </span>
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6">
                        {/* Crop Area */}
                        <div className="relative w-full bg-background-light dark:bg-background-dark rounded-xl overflow-hidden border-2 border-border-light dark:border-border-dark max-h-[500px] flex items-center justify-center">
                            <ReactCrop
                                crop={crop}
                                onChange={(c) => setCrop(c)}
                                onComplete={(c) => setCompletedCrop(c)}
                                aspect={1}
                                circularCrop={false}
                            >
                                <img
                                    ref={imgRef}
                                    src={imageUrl}
                                    alt="Crop preview"
                                    onLoad={onImageLoad}
                                    style={{ maxHeight: '500px', width: 'auto', height: 'auto' }}
                                    className="max-w-full"
                                />
                            </ReactCrop>
                        </div>

                        {/* Info */}
                        <div className="mt-4 p-3 bg-primary/5 dark:bg-primary/10 rounded-lg border border-primary/20">
                            <div className="flex items-start gap-2">
                                <span className="material-symbols-outlined text-primary text-lg flex-shrink-0 mt-0.5">
                                    info
                                </span>
                                <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
                                    A imagem será redimensionada para 400x400 pixels (formato quadrado) mantendo a qualidade.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-6 border-t border-border-light dark:border-border-dark flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 px-6 py-3 border-2 border-border-light dark:border-border-dark rounded-xl font-semibold text-text-light-primary dark:text-text-dark-primary hover:bg-surface-light dark:hover:bg-surface-dark transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleCrop}
                            className="flex-1 px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-all duration-200 shadow-xl hover:shadow-2xl flex items-center justify-center gap-2 hover:scale-105"
                        >
                            <span className="material-symbols-outlined">check</span>
                            <span>Aplicar</span>
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
