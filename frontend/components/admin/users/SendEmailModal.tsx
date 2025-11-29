'use client';

import React, { useState } from 'react';
import { AdminModal } from '../ui/AdminModal';
import { AdminButton } from '../ui/AdminButton';
import { AdminInput } from '../ui/AdminInput';
import type { User } from '@/types/admin/user';
import { useToast } from '@/lib/contexts/ToastContext';

interface SendEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onConfirm: (userId: string, subject: string, message: string) => Promise<void>;
}

const EMAIL_TEMPLATES = [
  {
    id: 'welcome',
    name: 'Boas-vindas',
    subject: 'Bem-vindo(a) à plataforma!',
    message: 'Olá {{name}},\n\nSeja bem-vindo(a) à nossa plataforma! Estamos felizes em tê-lo(a) conosco.\n\nQualquer dúvida, estamos à disposição.\n\nAtenciosamente,\nEquipe de Suporte',
  },
  {
    id: 'warning',
    name: 'Aviso',
    subject: 'Aviso importante sobre sua conta',
    message: 'Olá {{name}},\n\nEntramos em contato para informar sobre um aviso relacionado à sua conta.\n\n[Descreva o motivo do aviso aqui]\n\nPor favor, tome as medidas necessárias.\n\nAtenciosamente,\nEquipe de Suporte',
  },
  {
    id: 'support',
    name: 'Suporte',
    subject: 'Resposta do suporte',
    message: 'Olá {{name}},\n\nRecebemos sua solicitação e estamos respondendo.\n\n[Sua resposta aqui]\n\nSe precisar de mais ajuda, não hesite em nos contatar.\n\nAtenciosamente,\nEquipe de Suporte',
  },
  {
    id: 'custom',
    name: 'Personalizado',
    subject: '',
    message: '',
  },
];

export function SendEmailModal({
  isOpen,
  onClose,
  user,
  onConfirm,
}: SendEmailModalProps) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('custom');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = EMAIL_TEMPLATES.find(t => t.id === templateId);
    if (template) {
      setSubject(template.subject);
      setMessage(template.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) return;

    if (!subject.trim()) {
      toast.error('O assunto é obrigatório');
      return;
    }

    if (!message.trim()) {
      toast.error('A mensagem é obrigatória');
      return;
    }

    if (message.trim().length < 20) {
      toast.error('A mensagem deve ter pelo menos 20 caracteres');
      return;
    }

    setLoading(true);
    try {
      const processedMessage = message.replace(/\{\{name\}\}/g, user.display_name);
      await onConfirm(user.id, subject.trim(), processedMessage);
      
      toast.success('Email enviado com sucesso!');
      handleClose();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao enviar email');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedTemplate('custom');
    setSubject('');
    setMessage('');
    setShowPreview(false);
    onClose();
  };

  const getPreviewMessage = () => {
    return message.replace(/\{\{name\}\}/g, user?.display_name || '[Nome]');
  };

  if (!user) return null;

  return (
    <AdminModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Enviar Email para Usuário"
      subtitle={`Destinatário: ${user.display_name} (${user.email})`}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Recipient Info */}
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-2xl">
              mail
            </span>
            <div className="flex-1">
              <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                Destinatário
              </h4>
              <div className="space-y-1 text-sm text-blue-800 dark:text-blue-200">
                <p><strong>Nome:</strong> {user.display_name}</p>
                <p><strong>Email:</strong> {user.email}</p>
                <p><strong>ID:</strong> <code className="bg-blue-100 dark:bg-blue-900/50 px-2 py-1 rounded text-xs">{user.id}</code></p>
              </div>
            </div>
          </div>
        </div>

        {/* Template Selection */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary">
            Modelo de Email
          </label>
          
          <div className="grid grid-cols-2 gap-2">
            {EMAIL_TEMPLATES.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => handleTemplateChange(template.id)}
                className={`p-3 rounded-xl border-2 text-left transition-all ${
                  selectedTemplate === template.id
                    ? 'border-primary bg-primary/5 dark:bg-primary/10'
                    : 'border-border-light dark:border-border-dark hover:border-primary/50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`material-symbols-outlined text-xl ${
                    selectedTemplate === template.id ? 'text-primary' : 'text-text-light-secondary dark:text-text-dark-secondary'
                  }`}>
                    {template.id === 'welcome' ? 'waving_hand' : 
                     template.id === 'warning' ? 'warning' :
                     template.id === 'support' ? 'support_agent' : 'edit'}
                  </span>
                  <span className={`font-medium ${
                    selectedTemplate === template.id 
                      ? 'text-primary' 
                      : 'text-text-light-primary dark:text-text-dark-primary'
                  }`}>
                    {template.name}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Subject */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary">
            Assunto *
          </label>
          <AdminInput
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Digite o assunto do email..."
            icon="subject"
            required
          />
        </div>

        {/* Message */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary">
              Mensagem *
            </label>
            <button
              type="button"
              onClick={() => setShowPreview(!showPreview)}
              className="text-sm text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-sm">
                {showPreview ? 'edit' : 'visibility'}
              </span>
              {showPreview ? 'Editar' : 'Visualizar'}
            </button>
          </div>

          {showPreview ? (
            <div className="p-4 bg-background-light dark:bg-background-dark rounded-xl border border-border-light dark:border-border-dark min-h-[200px]">
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <p className="whitespace-pre-wrap text-text-light-primary dark:text-text-dark-primary">
                  {getPreviewMessage()}
                </p>
              </div>
            </div>
          ) : (
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Digite a mensagem do email... Use {{name}} para inserir o nome do usuário."
              rows={8}
              className="w-full px-4 py-3 rounded-xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark text-text-light-primary dark:text-text-dark-primary placeholder:text-text-light-secondary/50 dark:placeholder:text-text-dark-secondary/50 focus:ring-2 focus:ring-primary focus:border-primary resize-none font-mono text-sm"
              required
            />
          )}

          <div className="flex justify-between items-center text-xs">
            <div className="flex items-center gap-4">
              <span className="text-text-light-secondary dark:text-text-dark-secondary">
                Mínimo 20 caracteres
              </span>
              <span className="text-text-light-secondary dark:text-text-dark-secondary">
                Use <code className="bg-surface-light dark:bg-surface-dark px-2 py-1 rounded">{'{{name}}'}</code> para o nome
              </span>
            </div>
            <span className={message.length < 20 ? 'text-orange-600 dark:text-orange-400' : 'text-green-600 dark:text-green-400'}>
              {message.length} caracteres
            </span>
          </div>
        </div>

        {/* Info */}
        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl">
          <div className="flex items-start gap-2">
            <span className="material-symbols-outlined text-yellow-600 dark:text-yellow-400 text-xl">
              info
            </span>
            <div className="text-sm text-yellow-700 dark:text-yellow-300">
              <p className="font-semibold mb-1">Informações importantes:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>O email será enviado imediatamente</li>
                <li>O usuário receberá no email cadastrado: <strong>{user.email}</strong></li>
                <li>Esta ação será registrada nos logs de auditoria</li>
                <li>Certifique-se de revisar o conteúdo antes de enviar</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-border-light dark:border-border-dark">
          <AdminButton
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={loading}
          >
            Cancelar
          </AdminButton>
          <AdminButton
            type="submit"
            loading={loading}
            icon="send"
          >
            Enviar Email
          </AdminButton>
        </div>
      </form>
    </AdminModal>
  );
}
