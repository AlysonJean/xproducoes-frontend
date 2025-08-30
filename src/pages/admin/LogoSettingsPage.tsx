// src/pages/admin/LogoSettingsPage.tsx

import React, { useState } from 'react';
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
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
    setStatusMessage(null);
    setIsSaving(true);
    try {
      if (newLogoFile) {
        const formData = new FormData();
        formData.append('logo', newLogoFile);
        const response = await apiFetch('/logo', { method: 'POST', body: formData });
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
      setStatusMessage('Logo e nome atualizados com sucesso!');
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      const msg = (err?.message as string) || 'Erro ao salvar logo.';
      setStatusMessage(`Erro ao salvar logo: ${msg}`);
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
              <img src={previewUrl} alt="Preview do Logo" className="h-12 w-auto" />
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
            accept="image/png, image/svg+xml, image/jpeg"
            onChange={handleFileChange}
            className="w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border file:border-border file:bg-card file:text-foreground hover:file:bg-muted"
          />
        </div>

        <Button onClick={handleSave} disabled={isSaving || (!newLogoFile && nameInput.trim() === companyName)} variant="primary">
          {isSaving ? 'Salvando...' : 'Salvar Alterações'}
        </Button>
      </div>
    </AdminLayout>
  );
};
