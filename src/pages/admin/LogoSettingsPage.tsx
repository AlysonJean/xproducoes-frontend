// src/pages/admin/LogoSettingsPage.tsx

import React, { useState } from 'react';
import { ThemedLogo } from '@/components/ui/ThemedLogo';
import { useSettings } from '../../contexts/SettingsContext';
import { apiFetch } from '../../services/api';
import AdminLayout from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export const LogoSettingsPage = () => {
  const { logoUrl, setLogoUrl, companyName, setCompanyName } = useSettings();
  const [newLogoFile, setNewLogoFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(logoUrl ?? null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState<string>(companyName);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaveTime, setLastSaveTime] = useState<number>(0);

  // Rate limiting: mínimo 3 segundos entre uploads
  const MIN_SAVE_INTERVAL = 3000;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      console.log('File selected:', {
        name: file.name,
        type: file.type,
        size: file.size,
        lastModified: file.lastModified
      });
      
      // Validação melhorada para incluir SVGs
      const isValidImage = file.type.startsWith('image/') || 
                          file.name.toLowerCase().endsWith('.svg') ||
                          file.type === 'text/xml' ||
                          file.type === 'application/xml';
      
      if (!isValidImage) {
        setStatusMessage('Erro: Por favor, selecione um arquivo de imagem válido (PNG, JPEG, SVG).');
        return;
      }
      
      // Limite de tamanho (5MB)
      if (file.size > 5 * 1024 * 1024) {
        setStatusMessage('Erro: O arquivo deve ter no máximo 5MB.');
        return;
      }
      
      // Revoga o preview anterior, se era blob
      setNewLogoFile(file);
      setPreviewUrl((prev) => {
        if (prev && prev.startsWith('blob:')) {
          try { URL.revokeObjectURL(prev); } catch {}
        }
        return URL.createObjectURL(file);
      });
    }
  };

  const handleSave = async () => {
    if (!newLogoFile && nameInput.trim() === companyName) return;
    
    // Rate limiting: previne múltiplos uploads em sequência
    const now = Date.now();
    if (now - lastSaveTime < MIN_SAVE_INTERVAL) {
      setStatusMessage(`⏱️ Aguarde ${Math.ceil((MIN_SAVE_INTERVAL - (now - lastSaveTime)) / 1000)}s antes de salvar novamente.`);
      return;
    }
    
    setStatusMessage(null);
    setIsSaving(true);
    try {
      if (newLogoFile) {
        console.log('Uploading file:', {
          name: newLogoFile.name,
          type: newLogoFile.type,
          size: newLogoFile.size
        });
        
        const formData = new FormData();
        formData.append('logo', newLogoFile);
        
  console.log('Sending request to /logo...');
  const response = await apiFetch('/logo', { method: 'POST', body: formData });
        console.log('Response received:', response);
        
        if ((response as any).logoUrl) {
          setLogoUrl((response as any).logoUrl);
          setPreviewUrl((prev) => {
            if (prev && prev.startsWith('blob:')) {
              try { URL.revokeObjectURL(prev); } catch {}
            }
            return (response as any).logoUrl as string;
          });
        }
      }
      if (nameInput.trim() && nameInput.trim() !== companyName) {
        setCompanyName(nameInput.trim());
      }
      setLastSaveTime(Date.now());
      setStatusMessage('Logo e nome atualizados com sucesso!');
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      console.error('Upload error:', err);
      
      // Tratamento específico para rate limiting
      if (err?.message?.includes('429') || err?.message?.includes('Too Many Requests')) {
        setStatusMessage('⚠️ Muitas requisições. Aguarde alguns segundos e tente novamente.');
      } else {
        const msg = (err?.message as string) || 'Erro ao salvar logo.';
        setStatusMessage(`Erro ao salvar logo: ${msg}`);
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AdminLayout title="Gestão de Logo" breadcrumbs={[{ name: 'Admin' }, { name: 'Sistema e logo' }]}> 
      <div className="max-w-2xl">
        {statusMessage && (
          <div className="mb-4 p-3 rounded-md border text-sm bg-card text-foreground">
            {statusMessage}
          </div>
        )}

        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2 text-foreground">Logo Atual</h2>
          <div className="p-4 bg-muted rounded-lg flex justify-center items-center h-24">
            {previewUrl ? (
              <ThemedLogo src={previewUrl} className="h-12 w-auto" title="Preview do Logo" />
            ) : (
              <p className="text-muted-foreground">Nenhum logo definido.</p>
            )}
          </div>
        </div>

        <div className="mb-6">
          <label htmlFor="company-name" className="block text-sm text-muted-foreground mb-2">
            Nome da Empresa
          </label>
          <Input
            id="company-name"
            type="text"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            placeholder="Digite o nome da empresa"
          />
        </div>

        <div className="mb-6">
          <label htmlFor="logo-upload" className="block text-sm text-muted-foreground mb-2">
            Carregar novo logo (PNG, SVG, JPEG)
          </label>
          <input
            id="logo-upload"
            type="file"
            accept="image/*,.svg"
            onChange={handleFileChange}
            className="w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border file:border-border file:bg-card file:text-foreground hover:file:bg-muted"
          />
          <p className="mt-2 text-xs text-muted-foreground">
            Para alternância automática de cor, use SVG com <code>fill="currentColor"</code> ou sem atributo <code>fill</code>.<br/>
            O preview já mostra como ficará no tema atual. Suporte completo para PNG, JPEG e SVG.
          </p>
        </div>

        <Button onClick={handleSave} disabled={isSaving || (!newLogoFile && nameInput.trim() === companyName)} variant="primary">
          {isSaving ? 'Salvando...' : 'Salvar Alterações'}
        </Button>
      </div>
    </AdminLayout>
  );
};
