// Caminho: frontend/src/pages/client/ProfilePage.tsx

import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useNotifications } from '../../contexts/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../services/api';
import {
  Grid,
  Skeleton,
  buttonVariants
} from '../../components/ui/StandardComponents';
import { ClientPage, ClientPageError } from '../../components/client/ClientPage';
import { strongPasswordSchema } from '../../validators/userSchema';
import { ArrowLeft, Settings, User, Lock, Bell } from 'lucide-react';

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
import { logger } from '../../utils/logger';

type ProfileTab = 'profile' | 'security' | 'notifications' | 'preferences';

const PROFILE_TABS: { id: ProfileTab; label: string; icon: typeof User }[] = [
  { id: 'profile', label: 'Informações Pessoais', icon: User },
  { id: 'security', label: 'Segurança', icon: Lock },
  { id: 'notifications', label: 'Notificações', icon: Bell },
  { id: 'preferences', label: 'Preferências', icon: Settings },
];

export const ProfilePage = () => {
  const { addNotification } = useNotifications();
  const { user: authUser, setAuthenticatedUser } = useAuth();
  const tabRefs = useRef<Record<ProfileTab, HTMLButtonElement | null>>({
    profile: null,
    security: null,
    notifications: null,
    preferences: null,
  });

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
  const [activeTab, setActiveTab] = useState<ProfileTab>('profile');
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
    timezone: 'America/Sao_Paulo',
    currency: 'BRL',
    profileType: 'individual',
    defaultDeliveryMethod: 'delivery',
    autoInvoice: false
  });

  const loadProfile = useCallback(async () => {
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
      const preferences = data.preferences;
      if (preferences) {
        setNotificationPreferences(prev => preferences.notifications || prev);
        setGeneralPreferences(prev => preferences.general || prev);
      }
    } catch (error) {
      logger.error('Erro ao carregar perfil:', 'ProfilePage', error);
      addNotification({
        title: 'Perfil',
        message: 'Não foi possível carregar as informações do perfil.',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  }, [addNotification]);

  useEffect(() => {
    loadProfile();
      }, [loadProfile]);

  // Achado: as três gravações desta página chamavam rotas que não existem (PATCH /users/profile,
  // PATCH /users/profile/preferences, POST /users/profile/avatar) — nada era salvo. Agora tudo
  // passa por PUT /users/profile (que devolve o perfil completo) e a foto por POST /upload/avatar.
  const saveProfile = async (body: Record<string, unknown>) => {
    const updated = await apiFetch<ClientProfile>('/users/profile', { method: 'PUT', body: JSON.stringify(body) });
    // Nome e foto também aparecem no cabeçalho do site (vêm da sessão) — atualiza sem recarregar.
    if (authUser) setAuthenticatedUser({ ...authUser, name: updated.name, avatarUrl: updated.avatarUrl || undefined });
    return updated;
  };

  const handleSavePreferences = async () => {
    try {
      setSaving(true);
      const updatedProfile = await saveProfile({
        preferences: {
          notifications: notificationPreferences,
          general: generalPreferences
        }
      });
      setProfile(updatedProfile);

      addNotification({
        title: 'Sucesso',
        message: 'Preferências salvas com sucesso!',
        type: 'success'
      });
    } catch (error) {
      logger.error('Erro ao salvar preferências:', 'ProfilePage', error);
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
    // Limpa o campo para escolher o mesmo arquivo de novo depois de um erro.
    event.target.value = '';
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

      // /upload/avatar só envia a imagem e devolve a URL; gravar no perfil é um segundo passo.
      const { avatarUrl } = await apiFetch<{ avatarUrl: string }>('/upload/avatar', {
        method: 'POST',
        body: formDataUpload,
      });
      const updatedProfile = await saveProfile({ avatarUrl });

      setProfile(updatedProfile);
      addNotification({
        title: 'Sucesso',
        message: 'Foto de perfil atualizada!',
        type: 'success'
      });
    } catch (error) {
      logger.error('Erro ao fazer upload do avatar:', 'ProfilePage', error);
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
    // Mesma regra do servidor (nome com 3+ letras) — evita o "Dados de entrada inválidos" genérico.
    if (formData.name.trim().length < 3) {
      addNotification({ title: 'Aviso', message: 'O nome precisa ter pelo menos 3 letras.', type: 'warning' });
      return;
    }
    try {
      setSaving(true);
      // E-mail fica de fora: aparece só para leitura nesta tela.
      const { name, phone, bio, location, companyName, jobTitle, industry } = formData;
      const trimmedWebsite = formData.website.trim();
      const updatedProfile = await saveProfile({
        name, phone, bio, location, companyName, jobTitle, industry,
        // O servidor exige URL completa; "www.exemplo.com" vira "https://www.exemplo.com".
        website: trimmedWebsite && !/^https?:\/\//i.test(trimmedWebsite) ? `https://${trimmedWebsite}` : trimmedWebsite,
      });

      setProfile(updatedProfile);
      setFormData(prev => ({ ...prev, website: updatedProfile.website || '' }));
      setEditMode(false);
      addNotification({
        title: 'Sucesso',
        message: 'Perfil atualizado com sucesso!',
        type: 'success'
      });
    } catch (error) {
      logger.error('Erro ao salvar perfil:', 'ProfilePage', error);
      addNotification({
        title: 'Erro',
        message: error instanceof Error && error.message ? error.message : 'Ocorreu um erro ao salvar as alterações.',
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

    // Mesma regra de senha forte do cadastro, do convite e da redefinição (antes: 6+ caracteres).
    const passwordCheck = strongPasswordSchema.safeParse(passwordForm.newPassword);
    if (!passwordCheck.success) {
      addNotification({
        title: 'Aviso',
        message: passwordCheck.error.issues[0]?.message || 'A nova senha não atende aos requisitos.',
        type: 'warning'
      });
      return;
    }

    try {
      setSaving(true);
      // Achado: chamava POST /users/profile/password, rota que não existe no backend (404 — a troca
      // de senha nunca funcionou). A rota real é POST /users/change-password, com o mesmo corpo.
      await apiFetch('/users/change-password', {
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
      logger.error('Erro ao alterar senha:', 'ProfilePage', error);
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

  const pageHeader = {
    title: 'Meu Perfil',
    description: 'Gerencie suas informações pessoais e configurações',
    actions: (
      <Link to="/cliente/painel" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Voltar ao painel
      </Link>
    ),
  };

  // Setas ←/→ (e Home/End) movem entre as abas, como no padrão WAI-ARIA de abas.
  const handleTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = PROFILE_TABS.length - 1;
    const nextIndex =
      event.key === 'ArrowRight' ? (index === last ? 0 : index + 1)
      : event.key === 'ArrowLeft' ? (index === 0 ? last : index - 1)
      : event.key === 'Home' ? 0
      : event.key === 'End' ? last
      : null;
    if (nextIndex === null) return;
    event.preventDefault();
    const next = PROFILE_TABS[nextIndex].id;
    setActiveTab(next);
    tabRefs.current[next]?.focus();
  };

  if (loading) {
    return (
      <ClientPage width="6xl" {...pageHeader}>
        {/* Skeleton padrão (antes: divs com animate-pulse feitas à mão) */}
        <div className="space-y-8" role="status" aria-label="Carregando perfil">
          <Skeleton className="h-64 w-full rounded-lg" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Skeleton className="h-96 rounded-lg lg:col-span-2" />
            <Skeleton className="h-96 rounded-lg" />
          </div>
        </div>
      </ClientPage>
    );
  }

  if (!profile) {
    return (
      <ClientPage width="6xl" {...pageHeader}>
        <ClientPageError message="Não foi possível carregar o perfil." onRetry={loadProfile} />
      </ClientPage>
    );
  }

  return (
    <ClientPage width="6xl" {...pageHeader}>
        <ProfileHeader
          profile={profile}
          editMode={editMode}
          setEditMode={setEditMode}
          uploadingAvatar={uploadingAvatar}
          handleAvatarChange={handleAvatarChange}
          formatCurrency={formatCurrency}
        />

        {/* Tabs (role tablist/tab/tabpanel + aria-selected: antes eram botões soltos sem estado anunciado) */}
        <div className="border-b border-border mb-8 overflow-x-auto">
          <div className="flex gap-6 sm:gap-8 min-w-max" role="tablist" aria-label="Seções do perfil">
            {PROFILE_TABS.map((tab, index) => {
              const selected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  ref={(el) => { tabRefs.current[tab.id] = el; }}
                  type="button"
                  role="tab"
                  id={`profile-tab-${tab.id}`}
                  aria-selected={selected}
                  aria-controls="profile-tabpanel"
                  tabIndex={selected ? 0 : -1}
                  onClick={() => setActiveTab(tab.id)}
                  onKeyDown={(e) => handleTabKeyDown(e, index)}
                  className={`flex min-h-[44px] items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    selected
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                  }`}
                >
                  <tab.icon className="h-4 w-4" aria-hidden="true" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content & Sidebar */}
        <Grid columns={{ sm: 1, lg: 3 }} gap={8}>
          <div
            className="lg:col-span-2"
            role="tabpanel"
            id="profile-tabpanel"
            aria-labelledby={`profile-tab-${activeTab}`}
          >
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
              />
            )}
          </div>
          
          <ProfileSidebar />
        </Grid>
    </ClientPage>
  );
};
