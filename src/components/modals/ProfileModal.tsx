// src/components/modals/ProfileModal.tsx

import React, { useState } from 'react';
import { FormModal } from './FormModal';
import { ProfileModalProps, ProfileData } from '../../types/types';
import {
  Input,
  Select,
  Textarea
} from '../ui/StandardComponents';

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
  initialData,
  // userType = 'client', // Removido pois não é usado
  title = 'Editar Perfil',
  ...props
}) => {
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>('');
  const [showPasswordChange] = useState(false);

  // Definir handleAvatarChange antes do JSX para evitar erro de uso antes da declaração
  // Função handleAvatarChange definida apenas uma vez no topo

  const handleSubmit = (data: unknown) => {
    if (typeof data !== 'object' || data === null) return;
    const d = data as Record<string, unknown>;
    const profileData: ProfileData = {
      name: d.name,
      email: d.email,
      phone: d.phone,
      bio: d.bio || '',
      company: d.company || '',
      website: d.website || '',
      avatar: avatarFile || undefined,
      address: {
        street: d.street || '',
        city: d.city || '',
        postalCode: d.postalCode || '',
        country: d.country || 'Portugal',
      },
      preferences: {
        notifications: !!d.notifications,
        newsletter: !!d.newsletter,
        smsNotifications: !!d.smsNotifications,
      },
    };

    if (showPasswordChange && d.currentPassword && d.newPassword) {
      profileData.changePassword = {
        currentPassword: d.currentPassword,
        newPassword: d.newPassword,
        confirmPassword: d.confirmPassword,
      };
    }

    if (onSubmit) onSubmit(profileData);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const countries = [
    'Portugal',
    'Brasil',
    'Espanha',
    'França',
    'Alemanha',
    'Reino Unido',
    'Outros',
  ];

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      title={title}
      isLoading={isLoading}
      submitText="Salvar Alterações"
      size="xl"
      {...props}
    >
      <div className="space-y-6">
        {/* Avatar Section */}
        <div className="flex items-center space-x-4">
          <div className="relative">
            <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center overflow-hidden">
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="Avatar preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <svg
                  className="w-8 h-8 text-tertiary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              )}
            </div>
            <Input
              type="file"
              label="Selecionar avatar"
              name="avatar"
              accept="image/*"
              onChange={handleAvatarChange}
              className="mt-2"
            />
          </div>
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Email *"
              type="email"
              name="email"
              required
              defaultValue={typeof initialData?.email === 'string' ? initialData.email : ''}
              placeholder="Digite seu email"
            />
            <Input
              label="Telefone *"
              type="tel"
              name="phone"
              required
              defaultValue={typeof initialData?.phone === 'string' ? initialData.phone : ''}
              placeholder="Digite seu telefone"
            />
            <Input
              label="Empresa"
              type="text"
              name="company"
              defaultValue={typeof initialData?.company === 'string' ? initialData.company : ''}
              placeholder="Empresa"
            />
            <Input
              label="Website"
              type="url"
              name="website"
              defaultValue={typeof initialData?.website === 'string' ? initialData.website : ''}
              placeholder="https://www.meusite.com"
            />
            <Textarea
              label="Bio"
              name="bio"
              rows={3}
              defaultValue={typeof initialData?.bio === 'string' ? initialData.bio : ''}
              placeholder="Conte um pouco sobre você..."
            />
          </div>
        </div>
        {/* Address Information */}
        <div className="space-y-4">
          <h4 className="text-md font-medium text-foreground border-b pb-2">Endereço</h4>
          <Input
            label="Rua / Morada"
            type="text"
            name="street"
            defaultValue={
              initialData?.address &&
              typeof initialData.address === 'object' &&
              'street' in initialData.address &&
              typeof initialData.address.street === 'string'
                ? initialData.address.street
                : ''
            }
            placeholder="Rua / Morada"
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Cidade"
              type="text"
              name="city"
              defaultValue={
                initialData?.address &&
                typeof initialData.address === 'object' &&
                'city' in initialData.address &&
                typeof initialData.address.city === 'string'
                  ? initialData.address.city
                  : ''
              }
              placeholder="Cidade"
            />
            <Input
              label="Código Postal"
              type="text"
              name="postalCode"
              defaultValue={
                initialData?.address &&
                typeof initialData.address === 'object' &&
                'postalCode' in initialData.address &&
                typeof initialData.address.postalCode === 'string'
                  ? initialData.address.postalCode
                  : ''
              }
              placeholder="Código Postal"
            />
            <Select
              label="País"
              name="country"
              options={countries.map(country => ({ value: country, label: country }))}
              defaultValue={
                initialData?.address &&
                typeof initialData.address === 'object' &&
                'country' in initialData.address &&
                typeof initialData.address.country === 'string'
                  ? initialData.address.country
                  : 'Portugal'
              }
            />
          </div>
        </div>
        {/* Preferences */}
        <div className="space-y-4">
          <h4 className="text-md font-medium text-foreground border-b pb-2">Preferências</h4>
          <div className="space-y-3">
            <Input
              type="checkbox"
              label="Receber notificações por email"
              name="notifications"
              value="true"
              defaultChecked={Boolean(
                initialData?.preferences &&
                  typeof initialData.preferences === 'object' &&
                  'notifications' in initialData.preferences &&
                  typeof initialData.preferences.notifications === 'boolean'
                  ? initialData.preferences.notifications
                  : false
              )}
            />
            <Input
              type="checkbox"
              label="Receber newsletter"
              name="newsletter"
              value="true"
              defaultChecked={Boolean(
                initialData?.preferences &&
                  typeof initialData.preferences === 'object' &&
                  'newsletter' in initialData.preferences &&
                  typeof initialData.preferences.newsletter === 'boolean'
                  ? initialData.preferences.newsletter
                  : false
              )}
            />
            <Input
              type="checkbox"
              label="Receber notificações por SMS"
              name="smsNotifications"
              value="true"
              defaultChecked={Boolean(
                initialData?.preferences &&
                  typeof initialData.preferences === 'object' &&
                  'smsNotifications' in initialData.preferences &&
                  typeof initialData.preferences.smsNotifications === 'boolean'
                  ? initialData.preferences.smsNotifications
                  : false
              )}
            />
          </div>
          {showPasswordChange && (
            <div className="space-y-3 p-4 bg-surface border border-border rounded-lg">
              <Input
                label="Senha Atual *"
                type="password"
                name="currentPassword"
                required={showPasswordChange}
                placeholder="Senha Atual"
              />
              <Input
                label="Nova Senha *"
                type="password"
                name="newPassword"
                required={showPasswordChange}
                placeholder="Nova Senha"
              />
              <Input
                label="Confirmar Nova Senha *"
                type="password"
                name="confirmPassword"
                required={showPasswordChange}
                placeholder="Confirmar Nova Senha"
              />
            </div>
          )}
        </div>
      </div>
    </FormModal>
  );
};
