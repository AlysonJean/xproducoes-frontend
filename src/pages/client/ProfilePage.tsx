// Caminho: frontend/src/pages/client/ProfilePage.tsx

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../../contexts/NotificationContext';
import { apiFetch } from '../../services/api';
import { 
  Button, 
  Grid
} from '../../components/ui/StandardComponents';
import { Settings, User, Lock, Bell } from 'lucide-react';

import { 
  ClientProfile, 
  ProfileFormData, 
  ProfilePasswordForm, 
  ProfileNotificationPreferences, 
  ProfileGeneralPreferences 
} from '@/types/types';

import { isSafeWebsite, openWebsite } from '../../utils/url';

// Sub-componentes
import { ProfileHeader } from './profile/ProfileHeader';
import { PersonalInfoTab } from './profile/PersonalInfoTab';
import { SecurityTab } from './profile/SecurityTab';
import { NotificationsTab } from './profile/NotificationsTab';
import { PreferencesTab } from './profile/PreferencesTab';
import { ProfileSidebar } from './profile/ProfileSidebar';

export const ProfilePage = () => {
  const navigate = useNavigate();
  const { addNotification } = useNotifications();

  // Estados
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [formData, setFormData] = useState<ProfileFormData>({
    name: '',
    email: '',
    phone: '',
    bio: '',
    location: '',
    website: '',
    companyName: '',
    jobTitle: '',
    industry: ''
  });
  
  const [editMode, setEditMode] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'notifications' | 'preferences'>('profile');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  
  // Estados para alteração de senha
  const [passwordForm, setPasswordForm] = useState<ProfilePasswordForm>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Estados para Preferências de Produção
  const [notificationPreferences, setNotificationPreferences] = useState<ProfileNotificationPreferences>({
    bookingUpdatesEmail: true,
    bookingUpdatesPush: true,
    logisticsUpdatesEmail: true,
    logisticsUpdatesPush: true,
    technicalUpdatesEmail: true,
    inventoryAlertsEmail: false,
    inventoryAlertsPush: true,
    remindersEmail: true,
    remindersPush: true,
    promotionsEmail: false,
    promotionsPush: false
  });

  const [generalPreferences, setGeneralPreferences] = useState<ProfileGeneralPreferences>({
    language: 'pt',
    timezone: 'Europe/Lisbon',
    currency: 'BRL',
    profileType: 'individual',
    defaultDeliveryMethod: 'delivery',
    autoInvoice: false
  });

  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const data = await apiFetch<ClientProfile>('/users/profile');
      setProfile(data);
      
      // Inicializar formulário
      setFormData({
        name: data.name || '',
        email: data.email || '',
        phone: data.phone || '',
        bio: data.bio || '',
        location: data.location || '',
        website: data.website || '',
        companyName: data.companyName || '',
        jobTitle: data.jobTitle || '',
        industry: data.industry || ''
      });

      // Se o backend retornar preferências, inicializar aqui
      if (data.preferences) {
        setNotificationPreferences(data.preferences.notifications || notificationPreferences);
        setGeneralPreferences(data.preferences.general || generalPreferences);
      }
    } catch (error) {
      console.error('Erro ao carregar perfil:', error);
      addNotification({ 
        title: 'Perfil',
        message: 'Não foi possível carregar as informações do perfil.', 
        type: 'error' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSavePreferences = async () => {
    try {
      setSaving(true);
      await apiFetch('/users/profile/preferences', {
        method: 'PATCH',
        body: JSON.stringify({
          notifications: notificationPreferences,
          general: generalPreferences
        })
      });
      
      addNotification({
        title: 'Sucesso',
        message: 'Preferências salvas com sucesso!',
        type: 'success'
      });
    } catch (error) {
      console.error('Erro ao salvar preferências:', error);
      addNotification({
        title: 'Erro',
        message: 'Erro ao salvar preferências.',
        type: 'error'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tamanho (max 5MB) e tipo
    if (file.size > 5 * 1024 * 1024) {
      addNotification({
        title: 'Aviso',
        message: 'A imagem deve ter no máximo 5MB.',
        type: 'warning'
      });
      return;
    }

    try {
      setUploadingAvatar(true);
      
      const formDataUpload = new FormData();
      formDataUpload.append('avatar', file);

      const response = await apiFetch<{ avatarUrl: string }>('/users/profile/avatar', {
        method: 'POST',
        body: formDataUpload,
        // Override default content-type for multipart
        headers: {} 
      });

      setProfile(prev => prev ? { ...prev, avatarUrl: response.avatarUrl } : null);
      addNotification({
        title: 'Sucesso',
        message: 'Foto de perfil atualizada!',
        type: 'success'
      });
    } catch (error) {
      console.error('Erro ao fazer upload do avatar:', error);
      addNotification({
        title: 'Erro',
        message: 'Erro ao atualizar foto de perfil.',
        type: 'error'
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      const updatedProfile = await apiFetch<ClientProfile>('/users/profile', {
        method: 'PATCH',
        body: JSON.stringify(formData)
      });
      
      setProfile(updatedProfile);
      setEditMode(false);
      addNotification({
        title: 'Sucesso',
        message: 'Perfil atualizado com sucesso!',
        type: 'success'
      });
    } catch (error) {
      console.error('Erro ao salvar perfil:', error);
      addNotification({
        title: 'Erro',
        message: 'Ocorreu um erro ao salvar as alterações.',
        type: 'error'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      addNotification({
        title: 'Aviso',
        message: 'As senhas não coincidem.',
        type: 'warning'
      });
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      addNotification({
        title: 'Aviso',
        message: 'A nova senha deve ter pelo menos 6 caracteres.',
        type: 'warning'
      });
      return;
    }

    try {
      setSaving(true);
      await apiFetch('/users/profile/password', {
        method: 'POST',
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword
        })
      });

      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      
      addNotification({
        title: 'Sucesso',
        message: 'Senha alterada com sucesso!',
        type: 'success'
      });
    } catch (error) {
      console.error('Erro ao alterar senha:', error);
      addNotification({
        title: 'Erro',
        message: 'Erro ao alterar senha. Verifique sua senha atual.',
        type: 'error'
      });
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: generalPreferences.currency || 'BRL'
    }).format(value);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-8">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="h-64 bg-muted rounded-lg"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="h-96 bg-muted rounded-lg"></div>
              <div className="lg:col-span-2 h-96 bg-muted rounded-lg"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="p-4 bg-destructive/10 text-destructive rounded-md border border-destructive">
            <h3 className="font-bold">Erro</h3>
            <p>Não foi possível carregar o perfil.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Meu Perfil</h1>
            <p className="text-muted-foreground mt-1">
              Gerencie suas informações pessoais e configurações
            </p>
          </div>
          <div className="mt-4 sm:mt-0">
            <Button
              variant="outline"
              leftIcon={<Settings className="h-4 w-4" />}
              onClick={() => navigate('/cliente/painel')}
            >
              Voltar ao Dashboard
            </Button>
          </div>
        </div>

        <ProfileHeader 
          profile={profile}
          editMode={editMode}
          setEditMode={setEditMode}
          uploadingAvatar={uploadingAvatar}
          handleAvatarChange={handleAvatarChange}
          formatCurrency={formatCurrency}
        />

        {/* Tabs */}
        <div className="border-b border-border mb-8 overflow-x-auto">
          <nav className="flex space-x-8 min-w-max">
            {(['profile', 'security', 'notifications', 'preferences'] as const).map((id) => {
              const tabMap = {
                profile: { label: 'Informações Pessoais', icon: User },
                security: { label: 'Segurança', icon: Lock },
                notifications: { label: 'Notificações', icon: Bell },
                preferences: { label: 'Preferências', icon: Settings }
              };
              const tab = tabMap[id];
              return (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                    activeTab === id
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content & Sidebar */}
        <Grid columns={{ sm: 1, lg: 3 }} gap={8}>
          <div className="lg:col-span-2">
            {activeTab === 'profile' && (
              <PersonalInfoTab 
                profile={profile}
                formData={formData}
                setFormData={setFormData}
                editMode={editMode}
                saving={saving}
                handleSaveProfile={handleSaveProfile}
                isSafeWebsite={isSafeWebsite}
                openWebsite={openWebsite}
              />
            )}
            
            {activeTab === 'security' && (
              <SecurityTab 
                passwordForm={passwordForm}
                setPasswordForm={setPasswordForm}
                saving={saving}
                handleChangePassword={handleChangePassword}
              />
            )}
            
            {activeTab === 'notifications' && (
              <NotificationsTab 
                notificationPreferences={notificationPreferences}
                setNotificationPreferences={setNotificationPreferences}
                saving={saving}
                handleSavePreferences={handleSavePreferences}
              />
            )}
            
            {activeTab === 'preferences' && (
              <PreferencesTab 
                generalPreferences={generalPreferences}
                setGeneralPreferences={setGeneralPreferences}
                saving={saving}
                handleSavePreferences={handleSavePreferences}
                googleCalendarEmail={profile?.googleCalendarEmail}
              />
            )}
          </div>
          
          <ProfileSidebar />
        </Grid>
      </div>
    </div>
  );
};
