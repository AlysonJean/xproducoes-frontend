import React, { useState, useEffect } from 'react';
import { 
  User, 
  Lock, 
  CreditCard, 
  Shield, 
  Save,
  Camera,
  Upload,
  Eye,
  EyeOff,
  Trash2,
} from 'lucide-react';
import { CollaboratorLayout } from '../../components/collaborator/CollaboratorLayout';
import { SimpleCard } from '../../components/ui/Cards';
import { collaboratorProfileAPI, authAPI } from '../../services/api';
import { BrandLoader } from '@/components/ui/BrandLoader';

import { ProfileSettings, SecuritySettings, PrivacySettings, PaymentSettings } from '@/types/types';

const CollaboratorSettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'privacy' | 'payment'>('profile');
  const [profileSettings, setProfileSettings] = useState<ProfileSettings | null>(null);
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    twoFactorEnabled: false,
    loginNotifications: true
  });
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings | null>(null);
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await collaboratorProfileAPI.getMyProfile();
      const data = response?.data?.data ?? response?.data; // Tenta extrair data.data, ou usa data direto

      if (data) {
        setProfileSettings({
            name: data.user?.name || data.name || '',
            email: data.user?.email || data.email || '',
            phone: data.phone || '',
            bio: data.user?.bio || '',
            specialties: data.specialties || [],
            profileImage: data.user?.avatarUrl || '',
            location: data.user?.location || '',
            website: data.user?.website || ''
        });

        // Configurações armazenadas em profileSettings (JSON) ou defaults
        const userSettings = data.user?.profileSettings || {};
        
        setPrivacySettings({
            profileVisibility: userSettings.privacy?.profileVisibility || 'public',
            showEmail: userSettings.privacy?.showEmail ?? false,
            showPhone: userSettings.privacy?.showPhone ?? true,
            allowReviews: userSettings.privacy?.allowReviews ?? true,
            allowMessages: userSettings.privacy?.allowMessages ?? true
        });

        setPaymentSettings({
            pixKey: userSettings.payment?.pixKey || '',
            bankAccount: userSettings.payment?.bankAccount || {
                bank: '', agency: '', account: '', accountType: 'corrente'
            },
            preferredMethod: userSettings.payment?.preferredMethod || 'pix'
        });
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
      // toast.error('Erro ao carregar configurações');
      alert('Erro ao carregar configurações.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      if (activeTab === 'profile') {
         await collaboratorProfileAPI.updateProfile({
             phone: profileSettings?.phone,
             specialties: profileSettings?.specialties,
             // Outros campos devem ser adicionados ao endpoint updateProfile se necessário
         });
         // Para bio/location que estão em user, talvez precise de outro endpoint ou updateProfile manipular User
      } else if (activeTab === 'security') {
         if (securitySettings.newPassword) {
             await authAPI.changePassword(securitySettings.currentPassword, securitySettings.newPassword);
         }
      } else {
         // Salvar privacy/payment em User.profileSettings
         // Assumindo endpoint genérico ou updateProfile manipulando user settings
         // Mock temporário para esta parte específica se o backend não suportar JSON update direto ainda
         await collaboratorProfileAPI.updateSettings({
             privacy: privacySettings,
             payment: paymentSettings
         });
      }

      alert('Alterações salvas com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('Erro ao salvar alterações');
    } finally {
      setSaving(false);
    }
  };

  // ... handleImageUpload (usar uploadAvatar) ...
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
          try {
              const formData = new FormData();
              formData.append('avatar', file);
              await collaboratorProfileAPI.uploadAvatar(formData);
              loadSettings(); // Recarrega para mostrar nova foto
          } catch (error) {
              console.error('Erro upload:', error);
              alert('Erro ao atualizar foto');
          }
      }
  };

  // ... (manter resto do render, tabs, inputs mapeados para states locais)


  const tabs = [
    { id: 'profile', label: 'Perfil', icon: User },
    { id: 'security', label: 'Segurança', icon: Lock },
    { id: 'privacy', label: 'Privacidade', icon: Shield },
    { id: 'payment', label: 'Pagamento', icon: CreditCard },
  ];

  if (loading) {
    return (
      <CollaboratorLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <BrandLoader size={120} label="Carregando configurações..." />
        </div>
      </CollaboratorLayout>
    );
  }

  return (
    <CollaboratorLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Configurações</h1>
            <p className="text-muted-foreground">
              Gerencie suas configurações de conta e preferências
            </p>
          </div>
          
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center space-x-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            <span>{saving ? 'Salvando...' : 'Salvar Alterações'}</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b">
          <nav className="flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <Icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Profile Tab */}
        {activeTab === 'profile' && profileSettings && (
          <div className="space-y-6">
            <SimpleCard title="Informações Pessoais">
              <div className="space-y-6">
                {/* Photo Upload */}
                <div className="flex items-center space-x-6">
                  <div className="relative">
                    <img
                      src={profileSettings.profileImage}
                      alt="Foto do perfil"
                      className="w-20 h-20 rounded-full object-cover"
                    />
                    <button
                      className="absolute bottom-0 right-0 p-1 bg-primary text-primary-foreground rounded-full hover:bg-primary/90"
                      aria-label="Alterar foto do perfil"
                    >
                      <Camera className="h-3 w-3" />
                    </button>
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="font-medium mb-1">Foto do Perfil</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      Escolha uma foto profissional para seu perfil
                    </p>
                    <div className="flex items-center space-x-3">
                      <label className="flex items-center space-x-2 px-3 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 cursor-pointer">
                        <Upload className="h-4 w-4" />
                        <span>Alterar Foto</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                      </label>
                      <button
                        className="flex items-center space-x-2 px-3 py-2 text-red-600 hover:bg-red-50 rounded-md"
                        aria-label="Remover foto do perfil"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span>Remover</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium mb-2">Nome Completo</label>
                    <input
                      type="text"
                      value={profileSettings.name}
                      onChange={(e) => setProfileSettings({
                        ...profileSettings,
                        name: e.target.value
                      })}
                      className="w-full px-3 py-2 border rounded-md"
                      placeholder="Digite seu nome completo"
                      aria-label="Nome completo"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">E-mail</label>
                    <input
                      type="email"
                      value={profileSettings.email}
                      onChange={(e) => setProfileSettings({
                        ...profileSettings,
                        email: e.target.value
                      })}
                      className="w-full px-3 py-2 border rounded-md"
                      placeholder="seu.email@exemplo.com"
                      aria-label="Endereço de e-mail"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Telefone</label>
                    <input
                      type="tel"
                      value={profileSettings.phone}
                      onChange={(e) => setProfileSettings({
                        ...profileSettings,
                        phone: e.target.value
                      })}
                      className="w-full px-3 py-2 border rounded-md"
                      placeholder="(11) 98765-4321"
                      aria-label="Número de telefone"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Localização</label>
                    <input
                      type="text"
                      value={profileSettings.location}
                      onChange={(e) => setProfileSettings({
                        ...profileSettings,
                        location: e.target.value
                      })}
                      className="w-full px-3 py-2 border rounded-md"
                      placeholder="Cidade, Estado"
                    />
                  </div>
                </div>

                {/* Bio */}
                <div>
                  <label className="block text-sm font-medium mb-2">Biografia</label>
                  <textarea
                    value={profileSettings.bio}
                    onChange={(e) => setProfileSettings({
                      ...profileSettings,
                      bio: e.target.value
                    })}
                    className="w-full px-3 py-2 border rounded-md"
                    rows={4}
                    placeholder="Descreva sua experiência e especialidades..."
                  />
                </div>

                {/* Website */}
                <div>
                  <label className="block text-sm font-medium mb-2">Website</label>
                  <input
                    type="url"
                    value={profileSettings.website}
                    onChange={(e) => setProfileSettings({
                      ...profileSettings,
                      website: e.target.value
                    })}
                    className="w-full px-3 py-2 border rounded-md"
                    placeholder="www.seusite.com.br"
                  />
                </div>

                {/* Specialties */}
                <div>
                  <label className="block text-sm font-medium mb-2">Especialidades</label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {profileSettings.specialties.map((specialty, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
                      >
                        {specialty}
                        <button
                          onClick={() => setProfileSettings({
                            ...profileSettings,
                            specialties: profileSettings.specialties.filter((_, i) => i !== index)
                          })}
                          className="ml-2 text-primary hover:text-primary/80"
                          aria-label={`Remover especialidade: ${specialty}`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      placeholder="Adicionar especialidade..."
                      className="flex-1 px-3 py-2 border rounded-md"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          const target = e.target as HTMLInputElement;
                          const value = target.value.trim();
                          if (value && !profileSettings.specialties.includes(value)) {
                            setProfileSettings({
                              ...profileSettings,
                              specialties: [...profileSettings.specialties, value]
                            });
                            target.value = '';
                          }
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
            </SimpleCard>
          </div>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && securitySettings && (
          <div className="space-y-6">
            <SimpleCard title="Alterar Senha">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Senha Atual</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={securitySettings.currentPassword}
                      onChange={(e) => setSecuritySettings({
                        ...securitySettings,
                        currentPassword: e.target.value
                      })}
                      className="w-full px-3 py-2 pr-10 border rounded-md"
                      placeholder="Digite sua senha atual"
                      aria-label="Senha atual"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      aria-label="Mostrar/ocultar senha"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Nova Senha</label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={securitySettings.newPassword}
                      onChange={(e) => setSecuritySettings({
                        ...securitySettings,
                        newPassword: e.target.value
                      })}
                      className="w-full px-3 py-2 pr-10 border rounded-md"
                      placeholder="Digite sua nova senha"
                      aria-label="Nova senha"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      aria-label="Mostrar/ocultar nova senha"
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Confirmar Nova Senha</label>
                  <input
                    type="password"
                    value={securitySettings.confirmPassword}
                    onChange={(e) => setSecuritySettings({
                      ...securitySettings,
                      confirmPassword: e.target.value
                    })}
                    className="w-full px-3 py-2 border rounded-md"
                    placeholder="Confirme sua nova senha"
                    aria-label="Confirmar nova senha"
                  />
                </div>
              </div>
            </SimpleCard>

            <SimpleCard title="Autenticação de Dois Fatores">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Ativar 2FA</h3>
                    <p className="text-sm text-muted-foreground">
                      Adicione uma camada extra de segurança à sua conta
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={securitySettings.twoFactorEnabled}
                      onChange={(e) => setSecuritySettings({
                        ...securitySettings,
                        twoFactorEnabled: e.target.checked
                      })}
                      className="sr-only peer"
                      aria-label="Ativar autenticação de dois fatores"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/25 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Notificações de Login</h3>
                    <p className="text-sm text-muted-foreground">
                      Receber alertas quando alguém acessar sua conta
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={securitySettings.loginNotifications}
                      onChange={(e) => setSecuritySettings({
                        ...securitySettings,
                        loginNotifications: e.target.checked
                      })}
                      className="sr-only peer"
                      aria-label="Ativar notificações de login"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/25 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
              </div>
            </SimpleCard>
          </div>
        )}

        {/* Privacy Tab */}
        {activeTab === 'privacy' && privacySettings && (
          <div className="space-y-6">
            <SimpleCard title="Visibilidade do Perfil">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Quem pode ver seu perfil?</label>
                  <select
                    value={privacySettings.profileVisibility}
                    onChange={(e) => setPrivacySettings({
                      ...privacySettings,
                      profileVisibility: e.target.value as 'public' | 'private' | 'clients_only'
                    })}
                    className="w-full px-3 py-2 border rounded-md"
                    aria-label="Visibilidade do perfil"
                  >
                    <option value="public">Público</option>
                    <option value="clients_only">Apenas Clientes</option>
                    <option value="private">Privado</option>
                  </select>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Mostrar E-mail</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={privacySettings.showEmail}
                        onChange={(e) => setPrivacySettings({
                          ...privacySettings,
                          showEmail: e.target.checked
                        })}
                        className="sr-only peer"
                        aria-label="Mostrar e-mail no perfil"
                      />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/25 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Mostrar Telefone</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={privacySettings.showPhone}
                        onChange={(e) => setPrivacySettings({
                          ...privacySettings,
                          showPhone: e.target.checked
                        })}
                        className="sr-only peer"
                        aria-label="Mostrar telefone no perfil"
                      />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/25 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Permitir Avaliações</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={privacySettings.allowReviews}
                        onChange={(e) => setPrivacySettings({
                          ...privacySettings,
                          allowReviews: e.target.checked
                        })}
                        className="sr-only peer"
                        aria-label="Permitir avaliações"
                      />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/25 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Permitir Mensagens</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={privacySettings.allowMessages}
                        onChange={(e) => setPrivacySettings({
                          ...privacySettings,
                          allowMessages: e.target.checked
                        })}
                        className="sr-only peer"
                        aria-label="Permitir mensagens"
                      />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/25 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>
                </div>
              </div>
            </SimpleCard>
          </div>
        )}

        {/* Payment Tab */}
        {activeTab === 'payment' && paymentSettings && (
          <div className="space-y-6">
            <SimpleCard title="Configurações de Pagamento">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Método Preferido</label>
                  <select
                    value={paymentSettings.preferredMethod}
                    onChange={(e) => setPaymentSettings({
                      ...paymentSettings,
                      preferredMethod: e.target.value as 'pix' | 'bank_transfer' | 'both'
                    })}
                    className="w-full px-3 py-2 border rounded-md"
                    aria-label="Método de pagamento preferido"
                  >
                    <option value="pix">PIX</option>
                    <option value="bank_transfer">Transferência Bancária</option>
                    <option value="both">Ambos</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Chave PIX</label>
                  <input
                    type="text"
                    value={paymentSettings.pixKey}
                    onChange={(e) => setPaymentSettings({
                      ...paymentSettings,
                      pixKey: e.target.value
                    })}
                    className="w-full px-3 py-2 border rounded-md"
                    placeholder="E-mail, CPF, Telefone ou Chave Aleatória"
                  />
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Dados Bancários</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Banco</label>
                      <input
                        type="text"
                        value={paymentSettings.bankAccount.bank}
                        onChange={(e) => setPaymentSettings({
                          ...paymentSettings,
                          bankAccount: {
                            ...paymentSettings.bankAccount,
                            bank: e.target.value
                          }
                        })}
                        className="w-full px-3 py-2 border rounded-md"
                        placeholder="Nome do banco"
                        aria-label="Nome do banco"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Agência</label>
                      <input
                        type="text"
                        value={paymentSettings.bankAccount.agency}
                        onChange={(e) => setPaymentSettings({
                          ...paymentSettings,
                          bankAccount: {
                            ...paymentSettings.bankAccount,
                            agency: e.target.value
                          }
                        })}
                        className="w-full px-3 py-2 border rounded-md"
                        placeholder="Número da agência"
                        aria-label="Número da agência bancária"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Conta</label>
                      <input
                        type="text"
                        value={paymentSettings.bankAccount.account}
                        onChange={(e) => setPaymentSettings({
                          ...paymentSettings,
                          bankAccount: {
                            ...paymentSettings.bankAccount,
                            account: e.target.value
                          }
                        })}
                        className="w-full px-3 py-2 border rounded-md"
                        placeholder="Número da conta"
                        aria-label="Número da conta bancária"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Tipo de Conta</label>
                      <select
                        value={paymentSettings.bankAccount.accountType}
                        onChange={(e) => setPaymentSettings({
                          ...paymentSettings,
                          bankAccount: {
                            ...paymentSettings.bankAccount,
                            accountType: e.target.value as 'corrente' | 'poupanca'
                          }
                        })}
                        className="w-full px-3 py-2 border rounded-md"
                        aria-label="Tipo de conta bancária"
                      >
                        <option value="corrente">Conta Corrente</option>
                        <option value="poupanca">Poupança</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </SimpleCard>
          </div>
        )}
      </div>
    </CollaboratorLayout>
  );
};

export default CollaboratorSettingsPage;