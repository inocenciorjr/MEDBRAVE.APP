'use client';

import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useToast } from '@/lib/contexts/ToastContext';
import { io, Socket } from 'socket.io-client';
import Checkbox from '@/components/ui/Checkbox';
import Dropdown from '@/components/ui/Dropdown';
import { ImageCropModal } from './ImageCropModal';

interface ImportAnkiModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

interface FileAnalysis {
    fileName: string;
    collectionName: string;
    fileSize: number;
    totalDecks?: number;
    totalCards?: number;
    collectionExists?: boolean;
    existingDecks?: any[];
    existingCollectionName?: string;
    existingCollectionId?: string;
    tempFileName?: string;
    // ✅ NOVAS PROPRIEDADES
    similarCollections?: Array<{
        id: string;
        name: string;
        overlapPercentage: string;
        overlapCount: number;
        totalDecks: number;
    }>;
    action?: 'create' | 'update' | 'merge' | 'add' | 'ask_user';
    recomendacao?: string;
    estruturaInfo?: {
        hash: string;
        mainPrefixes: string[];
        totalPrefixes: number;
        nomeColetaoSugerido: string;
    };
}

interface CoverImageData {
    file: File;
    preview: string;
}

interface ImportStep {
    id: string;
    label: string;
    status: 'pending' | 'active' | 'completed' | 'error';
}

export function ImportAnkiModal({ isOpen, onClose, onSuccess }: ImportAnkiModalProps) {
    const toast = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const coverImageInputRef = useRef<HTMLInputElement>(null);
    const progressSectionRef = useRef<HTMLDivElement>(null);
    const modalContentRef = useRef<HTMLDivElement>(null);
    const duplicateModeSectionRef = useRef<HTMLDivElement>(null);
    const importResultSectionRef = useRef<HTMLDivElement>(null);

    const [isAnimating, setIsAnimating] = useState(false);
    const [shouldRender, setShouldRender] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [fileAnalysis, setFileAnalysis] = useState<FileAnalysis | null>(null);
    const [coverImage, setCoverImage] = useState<CoverImageData | null>(null);
    const [tempImageForCrop, setTempImageForCrop] = useState<string | null>(null);
    const [showCropModal, setShowCropModal] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [importProgress, setImportProgress] = useState(0);
    const [importMessage, setImportMessage] = useState('');
    const [currentStep, setCurrentStep] = useState('');
    const [duplicateMode, setDuplicateMode] = useState<'ignore' | 'overwrite'>('ignore');
    const [importResult, setImportResult] = useState<any>(null);
    // ✅ NOVOS ESTADOS
    const [collectionNameEditable, setCollectionNameEditable] = useState('');
    const [selectedExistingCollection, setSelectedExistingCollection] = useState<string>('');
    const [importMode, setImportMode] = useState<'new' | 'existing'>('new');
    const [importSteps, setImportSteps] = useState<ImportStep[]>([
        { id: 'upload', label: 'Upload do arquivo', status: 'pending' },
        { id: 'parse', label: 'Analisando estrutura', status: 'pending' },
        { id: 'media', label: 'Processando mídias', status: 'pending' },
        { id: 'save', label: 'Salvando flashcards', status: 'pending' },
    ]);
    const socketRef = useRef<Socket | null>(null);
    const [showHelpModal, setShowHelpModal] = useState(false);
    const [isHelpAnimating, setIsHelpAnimating] = useState(false);
    const [shouldRenderHelp, setShouldRenderHelp] = useState(false);

    useEffect(() => {
        if (showHelpModal) {
            setShouldRenderHelp(true);
            setTimeout(() => setIsHelpAnimating(true), 10);
        } else {
            setIsHelpAnimating(false);
            const timer = setTimeout(() => {
                setShouldRenderHelp(false);
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [showHelpModal]);

    useEffect(() => {
        if (isOpen) {
            setShouldRender(true);
            document.body.style.overflow = 'hidden';
            setTimeout(() => setIsAnimating(true), 10);
        } else {
            setIsAnimating(false);

            // ✅ Limpar arquivo de preview se modal for fechado sem importar
            const cleanupPreviewFile = async () => {
                if (fileAnalysis?.tempFileName && !importResult && !isImporting) {
                    try {
                        const { supabase } = await import('@/config/supabase');
                        const { data: { session } } = await supabase.auth.getSession();

                        if (session) {
                            await fetch('/api/flashcards/cancel-preview', {
                                method: 'POST',
                                headers: {
                                    'Authorization': `Bearer ${session.access_token}`,
                                    'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({
                                    fileName: fileAnalysis.tempFileName
                                }),
                            });
                        }
                    } catch (error) {
                        console.error('[ImportAnki] Erro ao limpar preview:', error);
                    }
                }
            };

            cleanupPreviewFile();

            const timer = setTimeout(() => {
                setShouldRender(false);
                document.body.style.overflow = 'unset';
                setSelectedFile(null);
                setFileAnalysis(null);
                setCoverImage(null);
                setImportResult(null);
                setImportProgress(0);
                setImportMessage('');
                setCurrentStep('');
                setDuplicateMode('ignore');
                setImportSteps([
                    { id: 'upload', label: 'Upload do arquivo', status: 'pending' },
                    { id: 'parse', label: 'Analisando estrutura', status: 'pending' },
                    { id: 'media', label: 'Processando mídias', status: 'pending' },
                    { id: 'save', label: 'Salvando flashcards', status: 'pending' },
                ]);
            }, 300);
            return () => clearTimeout(timer);
        }

        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, fileAnalysis, importResult, isImporting]);

    const updateStepStatus = (stepId: string, status: ImportStep['status']) => {
        setImportSteps(prev => prev.map(step =>
            step.id === stepId ? { ...step, status } : step
        ));
    };

    const handleFileSelect = async (file: File) => {
        if (!file.name.endsWith('.apkg')) {
            toast.error('Por favor, selecione um arquivo .apkg válido');
            return;
        }

        setSelectedFile(file);
        setImportMessage('Analisando arquivo...');
        setIsImporting(true);

        try {
            const { supabase } = await import('@/config/supabase');
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) {
                toast.error('Você precisa estar autenticado');
                setIsImporting(false);
                return;
            }

            const formData = new FormData();
            formData.append('apkgFile', file);

            const response = await fetch('/api/flashcards/preview-apkg', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                },
                body: formData,
            });

            if (!response.ok) {
                throw new Error('Erro ao analisar arquivo');
            }

            const previewData = await response.json();

            const suggestedName = previewData.estruturaInfo?.nomeColetaoSugerido ||
                previewData.collectionName ||
                file.name.replace('.apkg', '').trim();

            setFileAnalysis({
                fileName: file.name,
                collectionName: suggestedName,
                fileSize: file.size,
                totalDecks: previewData.metadata?.totalDecks || 0,
                totalCards: previewData.metadata?.totalCards || 0,
                collectionExists: previewData.collectionExists || false,
                existingDecks: previewData.existingDecks || [],
                existingCollectionName: previewData.existingCollectionName,
                existingCollectionId: previewData.existingCollectionId,
                tempFileName: previewData.tempFileName,
                similarCollections: previewData.similarCollections || [],
                action: previewData.action || 'create',
                recomendacao: previewData.recomendacao,
                estruturaInfo: previewData.estruturaInfo,
            });

            // ✅ Inicializar nome editável
            setCollectionNameEditable(suggestedName);

            // ✅ Definir modo baseado na ação
            if (previewData.action === 'ask_user' && previewData.similarCollections?.length > 0) {
                setImportMode('existing');
                setSelectedExistingCollection(previewData.similarCollections[0].id);
            } else if (previewData.collectionExists) {
                setImportMode('existing');
            } else {
                setImportMode('new');
            }

            setImportMessage('');
            setIsImporting(false);

            // Scroll para mostrar as opções relevantes
            setTimeout(() => {
                if (modalContentRef.current) {
                    // Se há coleção existente ou similares, scroll para o final para mostrar opções
                    if (previewData.collectionExists || (previewData.similarCollections && previewData.similarCollections.length > 0)) {
                        modalContentRef.current.scrollTop = modalContentRef.current.scrollHeight;
                    } else {
                        // Caso contrário, scroll para o topo
                        modalContentRef.current.scrollTop = 0;
                    }
                }
            }, 100);
        } catch (error) {
            console.error('Erro ao fazer preview:', error);
            setFileAnalysis({
                fileName: file.name,
                collectionName: file.name.replace('.apkg', '').trim(),
                fileSize: file.size,
            });
            setImportMessage('');
            setIsImporting(false);
        }
    };

    const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            handleFileSelect(file);
        }
    };

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

        const reader = new FileReader();
        reader.onloadend = () => {
            setTempImageForCrop(reader.result as string);
            setShowCropModal(true);
        };
        reader.readAsDataURL(file);
    };

    const handleCropComplete = (croppedBlob: Blob) => {
        const croppedFile = new File([croppedBlob], 'cover.png', { type: 'image/png' });
        const preview = URL.createObjectURL(croppedBlob);

        setCoverImage({
            file: croppedFile,
            preview: preview,
        });
        setShowCropModal(false);
        setTempImageForCrop(null);
    };

    const connectWebSocket = async (userId: string) => {
        // Usar a URL do backend a partir da variável de ambiente
        const isDev = process.env.NODE_ENV === 'development';
        const backendUrl = isDev 
          ? 'http://localhost:5000' 
          : (process.env.NEXT_PUBLIC_BACKEND_URL || 'https://medbraveapp-production.up.railway.app');

        const socket = io(backendUrl, {
            path: '/socket.io',
            transports: ['polling', 'websocket'],
            withCredentials: true,
        });

        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('[WebSocket] Conectado');
            socket.emit('join-import', userId);
        });

        socket.on('import-progress', (data: any) => {
            console.log('[WebSocket] Progresso:', data);
            setImportProgress(data.progress);
            setImportMessage(data.message);
            setCurrentStep(data.step);

            // Atualizar status das etapas baseado no progresso
            if (data.progress < 25) {
                updateStepStatus('upload', 'active');
            } else if (data.progress < 50) {
                updateStepStatus('upload', 'completed');
                updateStepStatus('parse', 'active');
            } else if (data.progress < 75) {
                updateStepStatus('parse', 'completed');
                updateStepStatus('media', 'active');
            } else if (data.progress < 100) {
                updateStepStatus('media', 'completed');
                updateStepStatus('save', 'active');
            }
        });

        socket.on('import-complete', (result: any) => {
            console.log('[WebSocket] Importação completa:', result);
            setImportProgress(100);
            setImportMessage('Importação concluída!');
            setImportResult(result);
            setIsImporting(false);

            // Marcar todas as etapas como concluídas
            setImportSteps(prev => prev.map(step => ({ ...step, status: 'completed' as const })));

            const stats = result.resultado?.stats;
            const savedDecks = result.resultado?.savedDecks || [];

            toast.success(
                `${savedDecks.length} deck(s) e ${stats?.total_cards || 0} flashcard(s) importados com sucesso!`
            );

            // Scroll para o resultado após conclusão
            setTimeout(() => {
                if (importResultSectionRef.current) {
                    importResultSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }, 500);
        });

        socket.on('import-error', (data: any) => {
            console.error('[WebSocket] Erro:', data);
            toast.error(`Erro: ${data.error}`);
            setIsImporting(false);

            // Marcar etapa atual como erro
            const activeStep = importSteps.find(s => s.status === 'active');
            if (activeStep) {
                updateStepStatus(activeStep.id, 'error');
            }

            if (socketRef.current) {
                socketRef.current.disconnect();
            }
        });
    };

    const handleImport = async () => {
        if (!selectedFile || !fileAnalysis) return;

        setIsImporting(true);
        setImportProgress(0);
        setImportMessage('Iniciando importação...');
        updateStepStatus('upload', 'active');

        // Scroll para a seção de progresso
        setTimeout(() => {
            if (progressSectionRef.current && modalContentRef.current) {
                progressSectionRef.current.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        }, 100);

        try {
            const { supabase } = await import('@/config/supabase');
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) {
                toast.error('Você precisa estar autenticado');
                setIsImporting(false);
                return;
            }

            await connectWebSocket(session.user.id);

            const formData = new FormData();

            // ✅ Se temos tempFileName, enviar ele ao invés do arquivo novamente
            if (fileAnalysis.tempFileName) {
                formData.append('tempFileName', fileAnalysis.tempFileName);
            } else {
                formData.append('apkgFile', selectedFile);
            }

            // ✅ Usar nome editável ou ID da coleção existente
            const collectionNameToUse = importMode === 'new'
                ? collectionNameEditable
                : selectedExistingCollection;

            formData.append('collectionName', collectionNameToUse);
            formData.append('duplicateHandling', duplicateMode);
            formData.append('importMode', importMode);

            if (coverImage) {
                formData.append('coverImage', coverImage.file);
            }

            const response = await fetch('/api/flashcards/import', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                },
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Erro ao importar');
            }

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Erro ao importar';
            toast.error(errorMessage);
            setIsImporting(false);
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
        }
    };

    useEffect(() => {
        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
        };
    }, []);

    if (!shouldRender) return null;

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
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <h2 className="text-xl font-bold text-text-light-primary dark:text-text-dark-primary">
                                    Importar Arquivo Anki
                                </h2>
                                <button
                                    onClick={() => setShowHelpModal(true)}
                                    className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
                                    aria-label="Como funciona a organização de coleções"
                                >
                                    <span className="material-symbols-outlined text-base">help</span>
                                </button>
                            </div>
                            <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mt-1">
                                Importe seus flashcards do formato .apkg
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
                    <div ref={modalContentRef} className="flex-1 overflow-y-auto p-6 space-y-6">
                        {/* Info Banner */}
                        <div className="bg-primary/5 dark:bg-primary/10 rounded-xl p-4 border-2 border-primary/20 
                                      shadow-lg hover:shadow-xl dark:shadow-dark-lg dark:hover:shadow-dark-xl 
                                      transition-all duration-300 hover:scale-[1.01]">
                            <div className="flex gap-3">
                                <div className="flex-shrink-0 w-10 h-10 bg-primary/10 dark:bg-primary/20 rounded-lg 
                                              flex items-center justify-center shadow-md">
                                    <span className="material-symbols-outlined text-primary text-xl">
                                        info
                                    </span>
                                </div>
                                <div className="flex-1 space-y-2 text-sm">
                                    <p className="font-semibold text-primary">Sobre a importação:</p>
                                    <ul className="space-y-1.5 text-xs text-text-light-secondary dark:text-text-dark-secondary">
                                        <li className="flex items-start gap-2">
                                            <span className="text-primary mt-0.5">•</span>
                                            <span>Arquivos .apkg do Anki são suportados</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-primary mt-0.5">•</span>
                                            <span>O processamento pode levar alguns minutos</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-primary mt-0.5">•</span>
                                            <span>Mídias (imagens, áudios) serão importadas automaticamente</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-primary mt-0.5">•</span>
                                            <span>A estrutura hierárquica dos decks será preservada</span>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        {/* File Selection */}
                        {!selectedFile ? (
                            <div className="space-y-3">
                                <h3 className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary pl-1">
                                    Selecionar Arquivo
                                </h3>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".apkg"
                                    onChange={handleFileInputChange}
                                    className="hidden"
                                />
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isImporting}
                                    className="w-full p-8 border-2 border-dashed border-border-light dark:border-border-dark 
                                             rounded-xl hover:border-primary hover:bg-primary/5 dark:hover:bg-primary/10
                                             transition-all duration-300 group disabled:opacity-50 disabled:cursor-not-allowed
                                             shadow-lg hover:shadow-xl dark:shadow-dark-lg dark:hover:shadow-dark-xl
                                             hover:scale-[1.02]"
                                >
                                    <div className="flex flex-col items-center gap-4">
                                        <div className="relative">
                                            <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-xl 
                                                          group-hover:blur-2xl transition-all duration-300" />
                                            <div className="relative p-4 bg-gradient-to-br from-primary/10 to-primary/5 
                                                          dark:from-primary/20 dark:to-primary/10 rounded-2xl 
                                                          group-hover:scale-110 transition-all duration-300 shadow-lg">
                                                <span className="material-symbols-outlined text-primary text-5xl">
                                                    upload_file
                                                </span>
                                            </div>
                                        </div>
                                        <div className="text-center space-y-2">
                                            <p className="font-semibold text-sm text-text-light-primary dark:text-text-dark-primary 
                                                        group-hover:text-primary transition-colors">
                                                Clique para selecionar arquivo .apkg
                                            </p>
                                            <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
                                                Máximo 1GB
                                            </p>
                                        </div>
                                    </div>
                                </button>
                            </div>
                        ) : isImporting && !fileAnalysis ? (
                            <div className="space-y-4">
                                <div className="flex items-center justify-center gap-4 p-8 bg-background-light dark:bg-background-dark 
                                              rounded-xl shadow-lg dark:shadow-dark-lg border border-border-light dark:border-border-dark">
                                    <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
                                    <div>
                                        <p className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary">
                                            Processando arquivo...
                                        </p>
                                        <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary mt-1">
                                            Analisando estrutura do arquivo .apkg
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <>
                                {/* Selected File Card */}
                                <div className="space-y-3">
                                    <h3 className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary pl-1">
                                        Arquivo Selecionado
                                    </h3>
                                    <div className="p-5 bg-gradient-to-br from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/20 
                                                  rounded-xl border-2 border-primary/30
                                                  shadow-lg hover:shadow-xl dark:shadow-dark-lg dark:hover:shadow-dark-xl
                                                  transition-all duration-300 hover:scale-[1.01] group">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                                <div className="flex-shrink-0">
                                                    <svg className="w-12 h-12 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                            d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                                    </svg>
                                                </div>
                                                <div className="flex-1 min-w-0 relative group/filename">
                                                    <p className="font-bold text-base text-text-light-primary dark:text-text-dark-primary truncate">
                                                        {fileAnalysis?.fileName}
                                                    </p>
                                                    <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary mt-1">
                                                        {fileAnalysis ? (fileAnalysis.fileSize / 1024 / 1024).toFixed(2) : '0'} MB
                                                    </p>

                                                    {/* Tooltip personalizado */}
                                                    <span className="absolute bottom-full left-0 mb-2 px-3 py-1.5 
                                                                   bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 
                                                                   text-xs font-semibold rounded-lg 
                                                                   opacity-0 group-hover/filename:opacity-100 transition-opacity duration-200 
                                                                   pointer-events-none z-[9999] shadow-xl border-2 border-slate-700 dark:border-slate-300
                                                                   max-w-xs break-words whitespace-normal">
                                                        {fileAnalysis?.fileName}
                                                        <span className="absolute top-full left-4 transform -mt-[2px]
                                                                     w-0 h-0 border-l-[6px] border-l-transparent 
                                                                     border-r-[6px] border-r-transparent 
                                                                     border-t-[6px] border-t-slate-900 dark:border-t-slate-100"></span>
                                                    </span>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    setSelectedFile(null);
                                                    setFileAnalysis(null);
                                                }}
                                                className="flex-shrink-0 p-2.5 hover:bg-red-500/10 dark:hover:bg-red-500/20 
                                                         rounded-xl transition-all duration-200 hover:scale-110 group/btn
                                                         border-2 border-transparent hover:border-red-500/30"
                                            >
                                                <span className="material-symbols-outlined text-text-light-secondary 
                                                               dark:text-text-dark-secondary group-hover/btn:text-red-500 
                                                               transition-colors text-xl">
                                                    close
                                                </span>
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Collection Info Card */}
                                <div className="space-y-3">
                                    <h3 className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary pl-1">
                                        Informações da Coleção
                                    </h3>

                                    <div className="p-5 bg-gradient-to-br from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/20 
                                                  rounded-xl border-2 border-primary/30 space-y-4
                                                  shadow-lg hover:shadow-xl dark:shadow-dark-lg dark:hover:shadow-dark-xl
                                                  transition-all duration-300 hover:scale-[1.01]">

                                        {/* ✅ MODO DE IMPORTAÇÃO */}
                                        {fileAnalysis?.similarCollections && fileAnalysis.similarCollections.length > 0 && (
                                            <div className="space-y-3 pb-4 border-b-2 border-primary/20">
                                                <p className="text-xs font-medium text-primary uppercase tracking-wider">Modo de Importação</p>
                                                <div className="space-y-2">
                                                    <label className="flex items-start gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all
                                                                    hover:border-primary/50 hover:bg-primary/5 dark:hover:bg-primary/10
                                                                    ${importMode === 'new' ? 'border-primary bg-primary/5 dark:bg-primary/10' : 'border-border-light dark:border-border-dark'}">
                                                        <input
                                                            type="radio"
                                                            name="importMode"
                                                            checked={importMode === 'new'}
                                                            onChange={() => setImportMode('new')}
                                                            className="mt-0.5"
                                                        />
                                                        <div className="flex-1">
                                                            <p className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary">
                                                                Criar nova coleção
                                                            </p>
                                                            <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary mt-1">
                                                                Importar como uma coleção separada
                                                            </p>
                                                        </div>
                                                    </label>
                                                    <label className="flex items-start gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all
                                                                    hover:border-primary/50 hover:bg-primary/5 dark:hover:bg-primary/10
                                                                    ${importMode === 'existing' ? 'border-primary bg-primary/5 dark:bg-primary/10' : 'border-border-light dark:border-border-dark'}">
                                                        <input
                                                            type="radio"
                                                            name="importMode"
                                                            checked={importMode === 'existing'}
                                                            onChange={() => setImportMode('existing')}
                                                            className="mt-0.5"
                                                        />
                                                        <div className="flex-1">
                                                            <p className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary">
                                                                Adicionar à coleção existente
                                                            </p>
                                                            <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary mt-1">
                                                                Mesclar com uma coleção que você já possui
                                                            </p>
                                                        </div>
                                                    </label>
                                                </div>
                                            </div>
                                        )}

                                        {/* ✅ DROPDOWN DE COLEÇÕES SIMILARES */}
                                        {importMode === 'existing' && fileAnalysis?.similarCollections && fileAnalysis.similarCollections.length > 0 && (
                                            <div className="space-y-2">
                                                <Dropdown
                                                    label="Selecionar Coleção"
                                                    options={fileAnalysis.similarCollections.map(col => ({
                                                        value: col.id,
                                                        label: `${col.name} (${col.overlapPercentage}% similar - ${col.totalDecks} decks)`
                                                    }))}
                                                    value={selectedExistingCollection}
                                                    onChange={setSelectedExistingCollection}
                                                    fullWidth
                                                    helperText={`${fileAnalysis.similarCollections.length} coleção(ões) similar(es) encontrada(s)`}
                                                />
                                            </div>
                                        )}

                                        {/* ✅ NOME DA COLEÇÃO EDITÁVEL */}
                                        {importMode === 'new' && (
                                            <div className="space-y-2">
                                                <label className="block text-xs font-medium text-primary uppercase tracking-wider">
                                                    Nome da Coleção
                                                </label>
                                                <input
                                                    type="text"
                                                    value={collectionNameEditable}
                                                    onChange={(e) => setCollectionNameEditable(e.target.value)}
                                                    className="w-full px-4 py-3 rounded-xl border-2 border-border-light dark:border-border-dark
                                                             bg-surface-light dark:bg-surface-dark
                                                             text-text-light-primary dark:text-text-dark-primary
                                                             focus:border-primary focus:ring-4 focus:ring-primary/20
                                                             transition-all duration-200 font-semibold
                                                             hover:border-primary/50 shadow-sm hover:shadow-md"
                                                    placeholder="Digite o nome da coleção"
                                                />
                                                <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary pl-1">
                                                    Sugestão: {fileAnalysis?.collectionName}
                                                </p>
                                            </div>
                                        )}
                                        {fileAnalysis?.totalDecks !== undefined && (
                                            <div className="flex gap-6 pt-3 border-t-2 border-primary/20">
                                                <div className="flex-1">
                                                    <p className="text-xs font-medium text-text-light-secondary dark:text-text-dark-secondary mb-1">
                                                        Decks
                                                    </p>
                                                    <div className="flex items-center gap-2">
                                                        <span className="material-symbols-outlined text-primary text-xl">
                                                            style
                                                        </span>
                                                        <p className="font-bold text-2xl text-text-light-primary dark:text-text-dark-primary">
                                                            {fileAnalysis.totalDecks}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-xs font-medium text-text-light-secondary dark:text-text-dark-secondary mb-1">
                                                        Cards
                                                    </p>
                                                    <div className="flex items-center gap-2">
                                                        <span className="material-symbols-outlined text-primary text-xl">
                                                            playing_cards
                                                        </span>
                                                        <p className="font-bold text-2xl text-text-light-primary dark:text-text-dark-primary">
                                                            {fileAnalysis.totalCards}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        {fileAnalysis?.collectionExists && fileAnalysis?.existingCollectionName && (
                                            <div className="pt-3 border-t-2 border-primary/20">
                                                <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 
                                                              rounded-lg border border-yellow-200 dark:border-yellow-800">
                                                    <span className="material-symbols-outlined text-yellow-600 dark:text-yellow-400 text-lg flex-shrink-0">
                                                        warning
                                                    </span>
                                                    <div className="flex-1">
                                                        <p className="text-xs text-yellow-700 dark:text-yellow-300 font-semibold mb-1">
                                                            Coleção existente identificada
                                                        </p>
                                                        <p className="text-xs text-yellow-700 dark:text-yellow-300">
                                                            <strong>{fileAnalysis.existingCollectionName}</strong>
                                                        </p>
                                                        <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                                                            {fileAnalysis.existingDecks?.length || 0} deck(s) encontrado(s) nesta coleção
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Cover Image - Apenas para novas coleções */}
                                {importMode === 'new' && (
                                    <div className="space-y-3">
                                        <h3 className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary pl-1">
                                            Imagem de Capa (Opcional)
                                        </h3>
                                        {!coverImage ? (
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
                                                          transition-all duration-300 bg-background-light dark:bg-background-dark">
                                                    <img
                                                        src={coverImage.preview}
                                                        alt="Preview da capa"
                                                        className="w-full h-full object-contain"
                                                    />
                                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 
                                                              transition-opacity duration-300 flex items-center justify-center gap-2">
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
                                                            onClick={() => setCoverImage(null)}
                                                            className="p-3 bg-red-500 hover:bg-red-600 text-white rounded-xl 
                                                                 font-medium transition-all duration-200 shadow-lg hover:shadow-xl
                                                                 hover:scale-110 flex items-center gap-2"
                                                        >
                                                            <span className="material-symbols-outlined">delete</span>
                                                            <span>Remover</span>
                                                        </button>
                                                    </div>
                                                </div>
                                                <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary mt-2 pl-1">
                                                    {coverImage.file.name} ({(coverImage.file.size / 1024).toFixed(0)} KB)
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Duplicate Handling Mode */}
                                {fileAnalysis?.collectionExists && (
                                    <div ref={duplicateModeSectionRef} className="space-y-3">
                                        <h3 className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary pl-1">
                                            Modo de Importação
                                        </h3>
                                        <div className="space-y-3">
                                            <label className="flex items-start gap-4 p-4 border-2 border-border-light dark:border-border-dark 
                                                            rounded-xl cursor-pointer transition-all duration-300
                                                            hover:border-primary/50 hover:bg-primary/5 dark:hover:bg-primary/10
                                                            shadow-lg hover:shadow-xl dark:shadow-dark-lg dark:hover:shadow-dark-xl
                                                            hover:scale-[1.01] group
                                                            ${duplicateMode === 'ignore' ? 'border-primary bg-primary/5 dark:bg-primary/10' : ''}">
                                                <Checkbox
                                                    checked={duplicateMode === 'ignore'}
                                                    onChange={() => setDuplicateMode('ignore')}
                                                />
                                                <div className="flex-1">
                                                    <p className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary 
                                                                group-hover:text-primary transition-colors">
                                                        Ignorar duplicatas
                                                    </p>
                                                    <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary mt-1.5">
                                                        Adiciona apenas decks novos, mantém os existentes intactos
                                                    </p>
                                                </div>
                                            </label>
                                            <label className="flex items-start gap-4 p-4 border-2 border-border-light dark:border-border-dark 
                                                            rounded-xl cursor-pointer transition-all duration-300
                                                            hover:border-primary/50 hover:bg-primary/5 dark:hover:bg-primary/10
                                                            shadow-lg hover:shadow-xl dark:shadow-dark-lg dark:hover:shadow-dark-xl
                                                            hover:scale-[1.01] group
                                                            ${duplicateMode === 'overwrite' ? 'border-primary bg-primary/5 dark:bg-primary/10' : ''}">
                                                <Checkbox
                                                    checked={duplicateMode === 'overwrite'}
                                                    onChange={() => setDuplicateMode('overwrite')}
                                                />
                                                <div className="flex-1">
                                                    <p className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary 
                                                                group-hover:text-primary transition-colors">
                                                        Sobrescrever existentes
                                                    </p>
                                                    <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary mt-1.5">
                                                        Substitui decks existentes com a nova versão
                                                    </p>
                                                </div>
                                            </label>
                                        </div>
                                    </div>
                                )}

                                {/* Import Steps Progress */}
                                {isImporting && (
                                    <div ref={progressSectionRef} className="space-y-3">
                                        <h3 className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary pl-1">
                                            Progresso da Importação
                                        </h3>
                                        <div className="p-5 bg-background-light dark:bg-background-dark rounded-xl 
                                                      border-2 border-border-light dark:border-border-dark
                                                      shadow-lg dark:shadow-dark-lg space-y-3">
                                            {importSteps.map((step, index) => (
                                                <div key={step.id} className="flex items-center gap-4 group">
                                                    <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center 
                                                                   shadow-md transition-all duration-300
                                                                   ${step.status === 'completed'
                                                            ? 'bg-green-500 scale-110'
                                                            : step.status === 'active'
                                                                ? 'bg-primary animate-pulse scale-110'
                                                                : step.status === 'error'
                                                                    ? 'bg-red-500'
                                                                    : 'bg-gray-300 dark:bg-gray-700'
                                                        }`}>
                                                        {step.status === 'completed' ? (
                                                            <span className="material-symbols-outlined text-white text-xl">
                                                                check
                                                            </span>
                                                        ) : step.status === 'active' ? (
                                                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                        ) : step.status === 'error' ? (
                                                            <span className="material-symbols-outlined text-white text-xl">
                                                                close
                                                            </span>
                                                        ) : (
                                                            <span className="text-white font-bold">{index + 1}</span>
                                                        )}
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className={`text-sm font-semibold transition-colors
                                                                     ${step.status === 'completed'
                                                                ? 'text-green-600 dark:text-green-400'
                                                                : step.status === 'active'
                                                                    ? 'text-primary'
                                                                    : step.status === 'error'
                                                                        ? 'text-red-600 dark:text-red-400'
                                                                        : 'text-text-light-secondary dark:text-text-dark-secondary'
                                                            }`}>
                                                            {step.label}
                                                        </p>
                                                        {step.status === 'active' && currentStep && (
                                                            <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary mt-1">
                                                                {currentStep}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Import Summary */}
                                {importResult && (
                                    <div ref={importResultSectionRef} className="space-y-4 p-6 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 
                                                  rounded-xl border-2 border-green-300 dark:border-green-700
                                                  shadow-xl hover:shadow-2xl dark:shadow-dark-xl dark:hover:shadow-dark-2xl
                                                  transition-all duration-300 hover:scale-[1.01]">
                                        <div className="flex items-center gap-3">
                                            <div className="flex-shrink-0 w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center 
                                                          shadow-lg animate-bounce">
                                                <span className="material-symbols-outlined text-white text-2xl">
                                                    check_circle
                                                </span>
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-bold text-green-800 dark:text-green-200">
                                                    Importação Concluída!
                                                </h3>
                                                <p className="text-sm text-green-700 dark:text-green-300">
                                                    Seus flashcards foram importados com sucesso
                                                </p>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            {/* Collection Info */}
                                            <div className="pb-3 border-b-2 border-green-300 dark:border-green-700">
                                                <p className="text-xs font-medium text-green-700 dark:text-green-300 uppercase tracking-wider mb-2">
                                                    Coleção
                                                </p>
                                                <p className="text-base font-bold text-green-900 dark:text-green-100 break-words">
                                                    {importResult.resultado?.colecao || 'Coleção Importada'}
                                                </p>
                                            </div>

                                            {/* Import Stats */}
                                            <div className="space-y-3">
                                                <p className="text-xs font-bold text-green-700 dark:text-green-300 uppercase tracking-wider">
                                                    Nesta importação:
                                                </p>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="p-3 bg-white/50 dark:bg-black/20 rounded-lg">
                                                        <p className="text-xs text-green-700 dark:text-green-300 mb-1">Decks</p>
                                                        <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                                                            {importResult.resultado?.stats?.newDecks || 0}
                                                        </p>
                                                    </div>
                                                    <div className="p-3 bg-white/50 dark:bg-black/20 rounded-lg">
                                                        <p className="text-xs text-green-700 dark:text-green-300 mb-1">Cards</p>
                                                        <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                                                            {importResult.resultado?.stats?.newCards || 0}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Ignored Stats */}
                                            {importResult.resultado?.collectionStats?.ignoredDecks > 0 && (
                                                <div className="pt-3 border-t-2 border-yellow-300 dark:border-yellow-700">
                                                    <p className="text-xs font-bold text-yellow-700 dark:text-yellow-300 uppercase tracking-wider mb-3">
                                                        Ignorados (já existiam):
                                                    </p>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div className="p-3 bg-yellow-500/20 rounded-lg">
                                                            <p className="text-xs text-yellow-700 dark:text-yellow-300 mb-1">Decks</p>
                                                            <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">
                                                                {importResult.resultado.collectionStats.ignoredDecks}
                                                            </p>
                                                        </div>
                                                        <div className="p-3 bg-yellow-500/20 rounded-lg">
                                                            <p className="text-xs text-yellow-700 dark:text-yellow-300 mb-1">Cards</p>
                                                            <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">
                                                                {(() => {
                                                                    const existingDecks = importResult.resultado?.analiseDeduplicacao?.existingDecks || [];
                                                                    return existingDecks.reduce((sum: number, deck: any) => sum + (deck.flashcard_count || 0), 0);
                                                                })()}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Collection Total Stats */}
                                            {importResult.resultado?.collectionStats && (
                                                <div className="pt-3 border-t-2 border-green-300 dark:border-green-700">
                                                    <p className="text-xs font-bold text-green-700 dark:text-green-300 uppercase tracking-wider mb-3">
                                                        Total na coleção:
                                                    </p>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div className="p-3 bg-green-500/20 rounded-lg">
                                                            <p className="text-xs text-green-700 dark:text-green-300 mb-1">Total Decks</p>
                                                            <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                                                                {importResult.resultado.collectionStats.totalDecks}
                                                            </p>
                                                        </div>
                                                        <div className="p-3 bg-green-500/20 rounded-lg">
                                                            <p className="text-xs text-green-700 dark:text-green-300 mb-1">Total Cards</p>
                                                            <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                                                                {importResult.resultado.collectionStats.totalCards}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <button
                                            onClick={() => {
                                                if (onSuccess) onSuccess();
                                                onClose();
                                                if (socketRef.current) {
                                                    socketRef.current.disconnect();
                                                }
                                            }}
                                            className="w-full mt-3 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl 
                                                     font-semibold transition-all duration-200 shadow-lg hover:shadow-xl
                                                     hover:scale-105 flex items-center justify-center gap-2"
                                        >
                                            <span className="material-symbols-outlined">check</span>
                                            <span>Fechar e Atualizar</span>
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-6 border-t-2 border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark">
                        {/* Progress Bar */}
                        {isImporting && !importResult && (
                            <div className="mb-5 space-y-4">
                                {/* Message */}
                                <div className="flex items-center gap-4">
                                    <div className="flex-shrink-0 w-10 h-10 border-3 border-primary border-t-transparent 
                                                  rounded-full animate-spin" />
                                    <div className="flex-1">
                                        <p className="text-sm font-bold text-text-light-primary dark:text-text-dark-primary">
                                            {importMessage}
                                        </p>
                                        <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary mt-1">
                                            {importProgress}% concluído
                                        </p>
                                    </div>
                                    <div className="flex-shrink-0">
                                        <div className="text-3xl font-bold text-primary">
                                            {importProgress}%
                                        </div>
                                    </div>
                                </div>

                                {/* Progress Bar */}
                                <div className="relative w-full h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden 
                                              shadow-inner">
                                    <div
                                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-primary/80 
                                                 rounded-full transition-all duration-500 ease-out shadow-lg"
                                        style={{ width: `${importProgress}%` }}
                                    >
                                        <div className="absolute inset-0 bg-white/20 animate-pulse" />
                                    </div>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="h-1 w-full bg-gradient-to-r from-transparent via-white/30 to-transparent 
                                                      animate-shimmer" />
                                    </div>
                                </div>
                            </div>
                        )}

                        {!importResult && (
                            <div className="flex gap-3">
                                <button
                                    onClick={onClose}
                                    disabled={isImporting}
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
                                    onClick={handleImport}
                                    disabled={!selectedFile || isImporting}
                                    className="flex-1 px-6 py-3 bg-primary text-white rounded-xl font-semibold 
                                             hover:bg-primary/90 transition-all duration-200 
                                             shadow-xl hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed 
                                             flex items-center justify-center gap-2 hover:scale-105
                                             disabled:hover:scale-100"
                                >
                                    {isImporting ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            <span>Importando...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span className="material-symbols-outlined">upload</span>
                                            <span>Importar Coleção</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Help Modal */}
            {shouldRenderHelp && typeof window !== 'undefined' && createPortal(
                <>
                    {/* Overlay */}
                    <div
                        className={`fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${isHelpAnimating ? 'opacity-100' : 'opacity-0'
                            }`}
                        style={{ zIndex: 99999 }}
                        onClick={() => setShowHelpModal(false)}
                    />

                    {/* Modal */}
                    <div
                        className={`fixed right-0 top-0 h-full w-full md:w-[600px] bg-surface-light dark:bg-surface-dark 
                                   shadow-2xl dark:shadow-dark-2xl transform transition-transform duration-300 ease-out ${isHelpAnimating ? 'translate-x-0' : 'translate-x-full'
                            }`}
                        style={{ zIndex: 100000 }}
                    >
                        <div className="flex flex-col h-full">
                            {/* Header */}
                            <div className="flex items-center justify-between p-6 border-b border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark">
                                <div>
                                    <h2 className="text-xl font-bold text-text-light-primary dark:text-text-dark-primary">
                                        Como organizar suas coleções no MedBRAVE
                                    </h2>
                                    <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mt-1">
                                        Entenda como o sistema identifica e organiza suas coleções
                                    </p>
                                </div>
                                <button
                                    onClick={() => setShowHelpModal(false)}
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
                            <div className="flex-1 overflow-y-auto p-6 space-y-4 text-text-light-secondary dark:text-text-dark-secondary">
                                <p>
                                    O MedBRAVE utiliza um sistema inteligente para identificar e organizar suas coleções de flashcards.
                                    Entenda como funciona e como aproveitar ao máximo essa funcionalidade.
                                </p>

                                <div className="bg-background-light dark:bg-background-dark rounded-lg p-4 space-y-4">
                                    <div>
                                        <p className="font-semibold text-text-light-primary dark:text-text-dark-primary mb-2">
                                            Como o sistema identifica coleções
                                        </p>
                                        <p className="text-sm">
                                            O MedBRAVE analisa a <strong>estrutura hierárquica dos seus decks</strong> para identificar
                                            coleções. Quando você importa um arquivo .apkg, o sistema examina o <strong>prefixo principal</strong>
                                            (a parte antes do primeiro "::") de cada deck e cria uma "impressão digital" única dessa estrutura.
                                            Por exemplo, em "Flashcards Revalida 2024.1::Cirurgia::Trauma", o prefixo principal é
                                            "Flashcards Revalida 2024.1".
                                        </p>
                                    </div>

                                    <div>
                                        <p className="font-semibold text-text-light-primary dark:text-text-dark-primary mb-2">
                                            Por que isso é importante?
                                        </p>
                                        <p className="text-sm">
                                            Essa abordagem permite que você <strong>renomeie suas coleções</strong> no MedBRAVE sem
                                            perder a capacidade do sistema de identificá-las em futuras importações. Mesmo que você
                                            mude o nome de "Coleção Médica 2024" para "Residência R1", o sistema ainda reconhecerá
                                            que é a mesma coleção pela estrutura dos decks.
                                        </p>
                                    </div>
                                </div>

                                <div className="bg-primary/10 dark:bg-primary/20 rounded-lg p-4 space-y-3">
                                    <p className="font-semibold text-text-light-primary dark:text-text-dark-primary">
                                        Melhores práticas no Anki
                                    </p>
                                    <p className="text-sm">
                                        Para garantir que o MedBRAVE identifique corretamente suas coleções, siga estas recomendações
                                        ao organizar seus decks no Anki antes de exportar:
                                    </p>

                                    <div className="space-y-3 text-sm">
                                        <div className="flex items-start gap-2">
                                            <span className="text-primary mt-0.5 font-bold">1.</span>
                                            <div>
                                                <p className="font-medium text-text-light-primary dark:text-text-dark-primary">
                                                    Use uma estrutura hierárquica consistente com prefixo principal
                                                </p>
                                                <p className="mt-1">
                                                    Organize seus decks com um <strong>prefixo principal único</strong> seguido
                                                    de subpastas. Por exemplo: "Flashcards Revalida 2024.1::Cirurgia::Trauma",
                                                    "Flashcards Revalida 2024.1::Clínica::Cardiologia". O prefixo principal
                                                    (antes do primeiro "::") é o que identifica sua coleção.
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-start gap-2">
                                            <span className="text-primary mt-0.5 font-bold">2.</span>
                                            <div>
                                                <p className="font-medium text-text-light-primary dark:text-text-dark-primary">
                                                    Mantenha os prefixos principais
                                                </p>
                                                <p className="mt-1">
                                                    Se você já importou uma coleção e quer atualizá-la, mantenha os mesmos
                                                    prefixos principais dos decks no Anki. Adicionar novos decks é ok, mas
                                                    renomear os prefixos principais pode fazer o sistema não reconhecer a coleção.
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-start gap-2">
                                            <span className="text-primary mt-0.5 font-bold">3.</span>
                                            <div>
                                                <p className="font-medium text-text-light-primary dark:text-text-dark-primary">
                                                    Agrupe coleções relacionadas
                                                </p>
                                                <p className="mt-1">
                                                    Se você tem vários decks relacionados (por exemplo, todos os decks de uma
                                                    preparação para residência), mantenha-os dentro da mesma estrutura de pastas
                                                    no Anki antes de exportar. Isso permite que o MedBRAVE os importe como uma
                                                    única coleção organizada.
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-start gap-2">
                                            <span className="text-primary mt-0.5 font-bold">4.</span>
                                            <div>
                                                <p className="font-medium text-text-light-primary dark:text-text-dark-primary">
                                                    Nomenclatura dos campos dos flashcards
                                                </p>
                                                <p className="mt-1">
                                                    Para melhor compatibilidade, utilize <strong>Frente/Verso</strong> ou <strong>Front/Back</strong> como
                                                    nomes dos campos dos seus flashcards no Anki. O sistema também suporta automaticamente
                                                    flashcards de múltipla escolha: se detectar campos como <strong>Question</strong>, <strong>Q.1</strong>,
                                                    <strong>Q.2</strong>, etc., irá agrupar automaticamente a pergunta e alternativas na frente e a
                                                    resposta (Sources) no verso.
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-start gap-2">
                                            <span className="text-primary mt-0.5 font-bold">5.</span>
                                            <div>
                                                <p className="font-medium text-text-light-primary dark:text-text-dark-primary">
                                                    Evite caracteres especiais nos nomes
                                                </p>
                                                <p className="mt-1">
                                                    Use apenas letras, números, espaços e os separadores "::" na hierarquia.
                                                    Evite caracteres especiais como #, @, %, &, etc., pois podem causar
                                                    problemas na importação.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-background-light dark:bg-background-dark rounded-lg p-4 space-y-3">
                                    <p className="font-semibold text-text-light-primary dark:text-text-dark-primary">
                                        Exemplo prático: Como nomear seus decks
                                    </p>
                                    <div className="text-sm space-y-3">
                                        <div>
                                            <p className="font-medium text-green-600 dark:text-green-400 mb-2">
                                                Estrutura CORRETA (recomendada):
                                            </p>
                                            <div className="bg-surface-light dark:bg-surface-dark p-3 rounded font-mono text-xs space-y-1">
                                                <div className="text-primary font-bold">Flashcards Revalida 2024.1</div>
                                                <div className="ml-4">Flashcards Revalida 2024.1::Cirurgia::Trauma</div>
                                                <div className="ml-4">Flashcards Revalida 2024.1::Cirurgia::Abdome Agudo</div>
                                                <div className="ml-4">Flashcards Revalida 2024.1::Clínica::Cardiologia</div>
                                                <div className="ml-4">Flashcards Revalida 2024.1::Pediatria::Neonatologia</div>
                                            </div>
                                            <p className="mt-2 text-xs">
                                                <strong>Prefixo principal:</strong> "Flashcards Revalida 2024.1" -
                                                Este é o identificador único da sua coleção.
                                            </p>
                                        </div>

                                        <div>
                                            <p className="font-medium text-red-600 dark:text-red-400 mb-2">
                                                Estrutura INCORRETA (não recomendada):
                                            </p>
                                            <div className="bg-surface-light dark:bg-surface-dark p-3 rounded font-mono text-xs space-y-1 opacity-60">
                                                <div>Cirurgia::Trauma</div>
                                                <div>Cirurgia::Abdome Agudo</div>
                                                <div>Clínica::Cardiologia</div>
                                                <div>Pediatria::Neonatologia</div>
                                            </div>
                                            <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                                                Sem um prefixo principal único, o sistema terá dificuldade em identificar
                                                sua coleção em futuras importações.
                                            </p>
                                        </div>

                                        <div className="bg-primary/10 dark:bg-primary/20 p-3 rounded-lg">
                                            <p className="text-xs">
                                                <strong>Dica:</strong> Quando você adicionar novos decks como
                                                "Flashcards Revalida 2024.1::Cirurgia::Vascular" e reimportar, o sistema
                                                reconhecerá automaticamente que pertence à mesma coleção pelo prefixo
                                                "Flashcards Revalida 2024.1" e oferecerá a opção de atualizar.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 border-2 border-yellow-200 dark:border-yellow-800">
                                    <div className="flex gap-3">
                                        <span className="material-symbols-outlined text-yellow-600 dark:text-yellow-400 text-xl flex-shrink-0">
                                            warning
                                        </span>
                                        <div className="space-y-2 text-sm">
                                            <p className="font-semibold text-yellow-800 dark:text-yellow-200">
                                                Importante: O sistema não é 100% preciso
                                            </p>
                                            <p className="text-yellow-700 dark:text-yellow-300">
                                                Embora o sistema seja bastante eficaz, ele pode não identificar corretamente
                                                coleções em alguns casos específicos, como quando há mudanças significativas
                                                na estrutura dos decks ou quando os prefixos são muito genéricos. Sempre
                                                revise as sugestões do sistema antes de confirmar a importação.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-background-light dark:bg-background-dark rounded-lg p-4">
                                    <p className="font-semibold text-text-light-primary dark:text-text-dark-primary mb-2">
                                        Dúvidas frequentes
                                    </p>
                                    <div className="space-y-3 text-sm">
                                        <div>
                                            <p className="font-medium text-text-light-primary dark:text-text-dark-primary">
                                                Posso renomear minha coleção no MedBRAVE?
                                            </p>
                                            <p className="mt-1">
                                                Sim! O nome da coleção no MedBRAVE é independente da identificação. Você pode
                                                renomeá-la à vontade que o sistema continuará reconhecendo-a pela estrutura dos decks.
                                            </p>
                                        </div>
                                        <div>
                                            <p className="font-medium text-text-light-primary dark:text-text-dark-primary">
                                                O que acontece se eu adicionar novos decks?
                                            </p>
                                            <p className="mt-1">
                                                Ao reimportar com novos decks, o sistema detectará a coleção existente e oferecerá
                                                a opção de adicionar apenas os novos decks ou sobrescrever tudo.
                                            </p>
                                        </div>
                                        <div>
                                            <p className="font-medium text-text-light-primary dark:text-text-dark-primary">
                                                E se eu mudar completamente a estrutura?
                                            </p>
                                            <p className="mt-1">
                                                Se você reorganizar significativamente os prefixos principais dos decks, o sistema
                                                pode não reconhecer como a mesma coleção e sugerirá criar uma nova. Nesse caso,
                                                você pode escolher manualmente mesclar com a coleção existente.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="p-6 border-t border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark">
                                <button
                                    onClick={() => setShowHelpModal(false)}
                                    className="w-full px-4 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-violet-800 
                                             transition-all duration-200 hover:scale-[1.02] shadow-lg hover:shadow-xl"
                                >
                                    Entendi
                                </button>
                            </div>
                        </div>
                    </div>
                </>,
                document.body
            )}

            {/* Image Crop Modal */}
            {tempImageForCrop && (
                <ImageCropModal
                    isOpen={showCropModal}
                    imageUrl={tempImageForCrop}
                    onCropComplete={handleCropComplete}
                    onClose={() => {
                        setShowCropModal(false);
                        setTempImageForCrop(null);
                    }}
                />
            )}
        </>
    );
}


