'use client';

import { useEffect, useState, useRef } from 'react';
import { useToast } from '@/lib/contexts/ToastContext';
import { ImageCropModal } from './ImageCropModal';
import Checkbox from '@/components/ui/Checkbox';

interface EditCollectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    collectionId: string;
    collectionName: string;
    isImported: boolean; // Se foi importada via .apkg
    currentThumbnail?: string | null;
    isPublic?: boolean; // Se a coleção é pública
}

interface CoverImageData {
    file: File;
    preview: string;
}

export function EditCollectionModal({
    isOpen,
    onClose,
    onSuccess,
    collectionId,
    collectionName: initialName,
    isImported,
    currentThumbnail,
    isPublic: initialIsPublic = false
}: EditCollectionModalProps) {
    const toast = useToast();
    const coverImageInputRef = useRef<HTMLInputElement>(null);

    const [isAnimating, setIsAnimating] = useState(false);
    const [shouldRender, setShouldRender] = useState(false);
    const [collectionName, setCollectionName] = useState(initialName);
    const [coverImage, setCoverImage] = useState<CoverImageData | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    const [showCropModal, setShowCropModal] = useState(false);
    const [tempImageUrl, setTempImageUrl] = useState<string | null>(null);
    const [isPublic, setIsPublic] = useState(initialIsPublic);
    const [shouldRemoveThumbnail, setShouldRemoveThumbnail] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setShouldRender(true);
            document.body.style.overflow = 'hidden';
            setTimeout(() => setIsAnimating(true), 10);
            setCollectionName(initialName);
            setShouldRemoveThumbnail(false); // Reset ao abrir
        } else {
            setIsAnimating(false);
            const timer = setTimeout(() => {
                setShouldRender(false);
                document.body.style.overflow = 'unset';
                setCoverImage(null);
                setHasChanges(false);
                setShouldRemoveThumbnail(false);
            }, 300);
            return () => clearTimeout(timer);
        }

        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, initialName]);

    useEffect(() => {
        const nameChanged = collectionName !== initialName;
        const imageChanged = coverImage !== null;
        const thumbnailRemoved = shouldRemoveThumbnail;
        setHasChanges(nameChanged || imageChanged || thumbnailRemoved);
    }, [collectionName, coverImage, initialName, shouldRemoveThumbnail]);

    const handleCoverImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast.error('Por favor, selecione uma imagem válida');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            toast.error('A imagem deve ter no máximo 5MB');
            return;
        }

        // Abrir modal de crop
        const reader = new FileReader();
        reader.onloadend = () => {
            setTempImageUrl(reader.result as string);
            setShowCropModal(true);
        };
        reader.readAsDataURL(file);
    };

    const handleCropComplete = (croppedBlob: Blob) => {
        // Converter blob para file
        const croppedFile = new File([croppedBlob], 'cover-image.png', { type: 'image/png' });
        const preview = URL.createObjectURL(croppedBlob);

        setCoverImage({
            file: croppedFile,
            preview
        });

        setShowCropModal(false);
        setTempImageUrl(null);
    };

    const handleRemoveThumbnail = () => {
        // Apenas marca para remover quando salvar
        setShouldRemoveThumbnail(true);
        setCoverImage(null);
    };

    const handleSave = async () => {
        if (!hasChanges) {
            toast.info('Nenhuma alteração foi feita');
            return;
        }

        setIsSaving(true);

        try {
            const { supabase } = await import('@/config/supabase');
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) {
                toast.error('Você precisa estar autenticado');
                setIsSaving(false);
                return;
            }

            const formData = new FormData();
            formData.append('collectionId', collectionId);

            if (!isImported && collectionName !== initialName) {
                formData.append('collectionName', collectionName);
            }

            if (coverImage) {
                formData.append('coverImage', coverImage.file);
            }

            // Se deve remover thumbnail, chamar endpoint de remoção primeiro
            if (shouldRemoveThumbnail && !coverImage) {
                const removeResponse = await fetch('/api/flashcards/collections/remove-thumbnail', {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${session.access_token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ collectionId }),
                });

                if (!removeResponse.ok) {
                    console.error('Erro ao remover thumbnail');
                    // Continuar mesmo se falhar
                }
            }

            const response = await fetch('/api/flashcards/collections/update', {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                },
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Erro ao atualizar coleção');
            }

            // Atualizar status público se mudou
            if (isPublic !== initialIsPublic) {
                const publicStatusResponse = await fetch(`/api/flashcards/collections/${encodeURIComponent(collectionId)}/public-status`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${session.access_token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ isPublic }),
                });

                if (!publicStatusResponse.ok) {
                    console.error('Erro ao atualizar status público');
                    // Não falhar a operação toda por causa disso
                }
            }

            toast.success('Coleção atualizada com sucesso!');

            if (onSuccess) {
                onSuccess();
            }

            onClose();
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Erro ao atualizar coleção';
            console.error('Erro ao atualizar coleção:', error);
            toast.error(errorMessage);
        } finally {
            setIsSaving(false);
        }
    };

    if (!shouldRender) return null;

    const displayThumbnail = coverImage?.preview || (shouldRemoveThumbnail ? null : currentThumbnail);

    return (
        <>
            {/* Overlay */}
            <div
                className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] transition-opacity duration-300 ${isAnimating ? 'opacity-100' : 'opacity-0'
                    }`}
                onClick={onClose}
            />

            {/* Modal */}
            <div
                className={`fixed right-0 top-0 h-full w-full md:w-[500px] bg-surface-light dark:bg-surface-dark 
                           shadow-2xl dark:shadow-dark-2xl z-[10000] transform transition-transform duration-300 ease-out ${isAnimating ? 'translate-x-0' : 'translate-x-full'
                    }`}
            >
                <div className="flex flex-col h-full">
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark">
                        <div>
                            <h2 className="text-xl font-bold text-text-light-primary dark:text-text-dark-primary">
                                Editar Coleção
                            </h2>
                            <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mt-1">
                                Personalize sua coleção de flashcards
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2.5 hover:bg-surface-light dark:hover:bg-surface-dark rounded-xl 
                                     transition-all duration-200 hover:scale-110 group"
                        >
                            <span className="material-symbols-outlined text-text-light-secondary dark:text-text-dark-secondary 
                                           group-hover:text-primary transition-colors">
                                close
                            </span>
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        {/* Collection Name */}
                        <div className="space-y-3">
                            <label className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary pl-1">
                                Nome da Coleção
                            </label>
                            {isImported ? (
                                <div className="space-y-3">
                                    <div className="p-4 bg-background-light dark:bg-background-dark rounded-xl 
                                                  border-2 border-border-light dark:border-border-dark">
                                        <p className="font-semibold text-text-light-primary dark:text-text-dark-primary">
                                            {collectionName}
                                        </p>
                                    </div>
                                    <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 
                                                  rounded-lg border border-yellow-200 dark:border-yellow-800">
                                        <span className="material-symbols-outlined text-yellow-600 dark:text-yellow-400 text-lg flex-shrink-0">
                                            info
                                        </span>
                                        <p className="text-xs text-yellow-700 dark:text-yellow-300 font-medium">
                                            O nome de coleções importadas via .apkg não pode ser alterado
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <input
                                    type="text"
                                    value={collectionName}
                                    onChange={(e) => setCollectionName(e.target.value)}
                                    placeholder="Digite o nome da coleção"
                                    className="w-full px-4 py-3 bg-background-light dark:bg-background-dark 
                                             border-2 border-border-light dark:border-border-dark rounded-xl
                                             text-text-light-primary dark:text-text-dark-primary
                                             placeholder:text-text-light-secondary dark:placeholder:text-text-dark-secondary
                                             focus:border-primary focus:ring-2 focus:ring-primary/20
                                             transition-all duration-200 shadow-lg hover:shadow-xl
                                             dark:shadow-dark-lg dark:hover:shadow-dark-xl"
                                />
                            )}
                        </div>

                        {/* Cover Image */}
                        <div className="space-y-3">
                            <label className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary pl-1">
                                Imagem de Capa
                            </label>

                            {!displayThumbnail ? (
                                <>
                                    <input
                                        ref={coverImageInputRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={handleCoverImageSelect}
                                        className="hidden"
                                    />
                                    <button
                                        onClick={() => coverImageInputRef.current?.click()}
                                        className="w-full p-5 border-2 border-border-light dark:border-border-dark rounded-xl 
                                                 hover:border-primary hover:bg-primary/5 dark:hover:bg-primary/10
                                                 transition-all duration-300 group
                                                 shadow-lg hover:shadow-xl dark:shadow-dark-lg dark:hover:shadow-dark-xl
                                                 hover:scale-[1.01]"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="flex-shrink-0 w-12 h-12 bg-background-light dark:bg-background-dark 
                                                          rounded-xl flex items-center justify-center shadow-md
                                                          group-hover:bg-primary/10 dark:group-hover:bg-primary/20
                                                          group-hover:scale-110 transition-all duration-300">
                                                <span className="material-symbols-outlined text-text-light-secondary 
                                                               dark:text-text-dark-secondary group-hover:text-primary 
                                                               transition-colors text-2xl">
                                                    add_photo_alternate
                                                </span>
                                            </div>
                                            <div className="text-left flex-1">
                                                <p className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary 
                                                            group-hover:text-primary transition-colors">
                                                    Adicionar imagem de capa
                                                </p>
                                                <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary mt-1">
                                                    PNG, JPG ou WEBP (máx. 5MB)
                                                </p>
                                            </div>
                                        </div>
                                    </button>
                                </>
                            ) : (
                                <div className="relative group">
                                    <div className="relative aspect-square rounded-xl overflow-hidden 
                                                  border-2 border-border-light dark:border-border-dark
                                                  shadow-lg hover:shadow-xl dark:shadow-dark-lg dark:hover:shadow-dark-xl
                                                  transition-all duration-300 bg-surface-light dark:bg-surface-dark">
                                        <img
                                            src={displayThumbnail}
                                            alt="Preview da capa"
                                            className="w-full h-full object-contain"
                                        />
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 
                                                      transition-opacity duration-300 flex items-center justify-center gap-3">
                                            <button
                                                onClick={() => coverImageInputRef.current?.click()}
                                                className="p-3 bg-primary hover:bg-primary/90 text-white rounded-xl 
                                                         font-medium transition-all duration-200 shadow-lg hover:shadow-xl
                                                         hover:scale-110 flex items-center gap-2"
                                            >
                                                <span className="material-symbols-outlined">edit</span>
                                                <span>Alterar</span>
                                            </button>
                                            <button
                                                onClick={handleRemoveThumbnail}
                                                className="p-3 bg-red-500 hover:bg-red-600 text-white rounded-xl 
                                                         font-medium transition-all duration-200 shadow-lg hover:shadow-xl
                                                         hover:scale-110 flex items-center gap-2"
                                            >
                                                <span className="material-symbols-outlined">delete</span>
                                                <span>Remover</span>
                                            </button>
                                        </div>
                                    </div>
                                    {coverImage && (
                                        <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary mt-2 pl-1">
                                            {coverImage.file.name} ({(coverImage.file.size / 1024).toFixed(0)} KB)
                                        </p>
                                    )}
                                    <input
                                        ref={coverImageInputRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={handleCoverImageSelect}
                                        className="hidden"
                                    />
                                </div>
                            )}
                        </div>

                        {/* Public Toggle */}
                        <div
                            onClick={() => {
                                if (!isSaving) {
                                    setIsPublic(!isPublic);
                                    setHasChanges(true);
                                }
                            }}
                            className={`w-full p-5 rounded-xl border-2 transition-all duration-300 group cursor-pointer
                                      shadow-lg hover:shadow-xl dark:shadow-dark-lg dark:hover:shadow-dark-xl
                                      hover:scale-[1.01]
                                      ${isPublic
                                    ? 'bg-gradient-to-br from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/20 border-primary/30'
                                    : 'bg-surface-light dark:bg-surface-dark border-border-light dark:border-border-dark hover:border-primary/30'
                                }
                                      ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <div className="flex items-center gap-4">
                                <div className="flex-shrink-0">
                                    <Checkbox
                                        checked={isPublic}
                                        onChange={(e) => e.stopPropagation()}
                                        disabled={isSaving}
                                    />
                                </div>

                                <div className="flex-1 min-w-0">
                                    <h3 className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary mb-1">
                                        Tornar coleção pública
                                    </h3>
                                    <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
                                        Ao tornar pública, outros usuários poderão visualizar e importar esta coleção na aba Comunidade
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-6 border-t-2 border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark">
                        <div className="flex gap-3">
                            <button
                                onClick={onClose}
                                disabled={isSaving}
                                className="flex-1 px-6 py-3 border-2 border-border-light dark:border-border-dark rounded-xl 
                                         font-semibold text-text-light-primary dark:text-text-dark-primary 
                                         hover:bg-surface-light dark:hover:bg-surface-dark 
                                         transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed
                                         shadow-lg hover:shadow-xl dark:shadow-dark-lg dark:hover:shadow-dark-xl
                                         hover:scale-105"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={!hasChanges || isSaving}
                                className="flex-1 px-6 py-3 bg-primary text-white rounded-xl font-semibold 
                                         hover:bg-primary/90 transition-all duration-200 
                                         shadow-xl hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed 
                                         flex items-center justify-center gap-2 hover:scale-105
                                         disabled:hover:scale-100"
                            >
                                {isSaving ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        <span>Salvando...</span>
                                    </>
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined">save</span>
                                        <span>Salvar Alterações</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Image Crop Modal */}
            {tempImageUrl && (
                <ImageCropModal
                    isOpen={showCropModal}
                    imageUrl={tempImageUrl}
                    onCropComplete={handleCropComplete}
                    onClose={() => {
                        setShowCropModal(false);
                        setTempImageUrl(null);
                    }}
                />
            )}
        </>
    );
}
