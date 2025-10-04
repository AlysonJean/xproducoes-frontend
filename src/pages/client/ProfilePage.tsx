// Caminho: frontend/src/pages/client/ProfilePage.tsx

import { useState, useEffect, useRef, useId } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../../services/api';
import { 
  Button, 
  Card, 
  Alert, 
  Grid,
  Badge
} from '../../components/ui/StandardComponents';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Building2,
  Edit3,
  Camera,
  Save,
  X,
  Eye,
  EyeOff,
  Shield,
  Calendar,
  Star,
  Award,
  Activity,
  Settings,
  Bell,
  Lock,
  Globe
} from 'lucide-react';

import { ClientProfile, ProfileFormData } from '@/types/types';

import { isSafeWebsite, openWebsite } from '../../utils/url';

export const ProfilePage = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const baseId = useId();
  const nameId = `${baseId}-name`;
  const industryId = `${baseId}-industry`;
  const currentPasswordId = `${baseId}-current-password`;
  const newPasswordId = `${baseId}-new-password`;
  const confirmNewPasswordId = `${baseId}-confirm-new-password`;
  const languageId = `${baseId}-language`;
  const timezoneId = `${baseId}-timezone`;
  const currencyId = `${baseId}-currency`;

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
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  
  // Estados para alteração de senha
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Carregar dados do perfil
  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const [profileResponse, statsResponse] = await Promise.allSettled([
          apiFetch('/api/user/profile'),
          apiFetch('/api/user/stats')
        ]);

        if (profileResponse.status === 'fulfilled') {
          const profileData = profileResponse.value as any;
          
          let statsData = { totalBookings: 0, totalSpent: 0 };
          if (statsResponse.status === 'fulfilled') {
            statsData = (statsResponse.value as any)?.data || statsData;
          }

          // Determinar se o cliente é VIP (regra: >= 5 reservas)
          const computedIsVip = (statsData.totalBookings || 0) >= 5 || Boolean(profileData.isVip);

          const fullProfile: ClientProfile = {
            ...profileData,
            totalBookings: statsData.totalBookings,
            totalSpent: statsData.totalSpent,
            // averageRating mantido opcionalmente para compatibilidade
            memberSince: new Date(profileData.createdAt).toLocaleDateString('pt-PT', {
              month: 'long',
              year: 'numeric'
            }),
            isVip: computedIsVip,
          };

          // Se o backend ainda não marcou o cliente como VIP mas o critério local foi alcançado,
          // tentamos notificar o backend via endpoint opcional. Falhas são silenciosas.
          (async () => {
            try {
              if (!profileData.isVip && computedIsVip) {
                // ✅ Mostrar loading durante promoção VIP
                await apiFetch('/api/user/promote-vip', { method: 'POST' });
                setSuccess('Parabéns — você agora é cliente VIP!');
                setTimeout(() => setSuccess(null), 4000);
              }
            } catch (e) {
              // Endpoint pode não existir — não bloquear a experiência
              // Mas logar para debug
              console.warn('VIP promotion endpoint not available or failed', e);
            }
          })();

          setProfile(fullProfile);
          setFormData({
            name: fullProfile.name || '',
            email: fullProfile.email || '',
            phone: fullProfile.phone || '',
            bio: fullProfile.bio || '',
            location: fullProfile.location || '',
            website: fullProfile.website || '',
            companyName: fullProfile.companyName || '',
            jobTitle: fullProfile.jobTitle || '',
            industry: fullProfile.industry || ''
          });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar perfil');
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  // Atualizar avatar
  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar arquivo
    if (!file.type.startsWith('image/')) {
      setError('Por favor, selecione uma imagem válida.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('A imagem deve ter no máximo 5MB.');
      return;
    }

    try {
      setUploadingAvatar(true);
      setError(null);

      const formData = new FormData();
      formData.append('avatar', file);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
  const response = await fetch(`${API_BASE_URL}/user/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error('Erro ao fazer upload da foto');
      }

      const updatedProfile = await response.json();
      setProfile(prev => prev ? { ...prev, avatarUrl: updatedProfile.avatarUrl } : null);
      setSuccess('Foto atualizada com sucesso!');
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar foto');
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Salvar alterações do perfil
  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      setError(null);

  await apiFetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      setProfile(prev => prev ? { ...prev, ...formData } : null);
      setEditMode(false);
      setSuccess('Perfil atualizado com sucesso!');
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar perfil');
    } finally {
      setSaving(false);
    }
  };

  // Alterar senha
  const handleChangePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setError('A nova senha deve ter pelo menos 6 caracteres');
      return;
    }

    try {
      setSaving(true);
      setError(null);

  await apiFetch('/api/user/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword
        })
      });

      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setSuccess('Senha alterada com sucesso!');
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao alterar senha');
    } finally {
      setSaving(false);
    }
  };

  // Formatar moeda
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'BRL'
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
          <Alert variant="error" title="Erro">
            Não foi possível carregar o perfil.
          </Alert>
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
              onClick={() => navigate('/client/dashboard')}
            >
              Voltar ao Dashboard
            </Button>
          </div>
        </div>

        {/* Alertas */}
        {error && (
          <Alert variant="error" title="Erro" className="mb-6">
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert variant="success" title="Sucesso" className="mb-6">
            {success}
          </Alert>
        )}

        {/* Cover Photo & Profile Header */}
        <Card className="mb-8 overflow-hidden">
          {/* Cover Background */}
          <div className="h-32 bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20"></div>
          
          {/* Profile Info */}
          <div className="px-6 pb-6">
            <div className="flex flex-col sm:flex-row sm:items-end sm:space-x-6 -mt-16">
              {/* Avatar */}
              <div className="relative group">
                <div className="w-32 h-32 rounded-full border-4 border-white bg-white shadow-lg overflow-hidden">
                  {profile.avatarUrl ? (
                    (() => {
                      // Permitir apenas URLs HTTPS de domínios confiáveis (ex: Cloudinary, S3, domínio próprio)
                      const allowedDomains = [
                        /^https:\/\/res\.cloudinary\.com\//,
                        /^https:\/\/s3\.[^/]+\.amazonaws\.com\//,
                        /^https:\/\/cdn\.[^/]+\./, // cdn customizado
                        /^https:\/\/.*\.yourdomain\.com\//, // ajuste para seu domínio
                      ];
                      const isSafe = allowedDomains.some((re) => re.test(profile.avatarUrl || ''));
                      if (!isSafe) {
                        return (
                          <div className="w-full h-full bg-muted flex items-center justify-center">
                            <User className="h-12 w-12 text-muted-foreground" />
                          </div>
                        );
                      }
                      return (
                        <img
                          src={profile.avatarUrl}
                          alt={profile.name || 'Avatar'}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          referrerPolicy="no-referrer"
                          onError={(e) => { (e.target as HTMLImageElement).src = '/vite.svg'; }}
                        />
                      );
                    })()
                  ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center">
                      <User className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}
                  
                  {/* Upload overlay */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center cursor-pointer"
                       onClick={() => fileInputRef.current?.click()}>
                    <Camera className="h-6 w-6 text-white" />
                  </div>
                  
                  {uploadingAvatar && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                    </div>
                  )}
                </div>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                  aria-label="Upload foto de perfil"
                />
              </div>
              
              {/* Profile Info */}
              <div className="flex-1 mt-4 sm:mt-0">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <h2 className="text-2xl font-bold text-foreground">{profile.name}</h2>
                      {profile.verified && (
                        <Badge variant="success" size="sm">
                          <Shield className="h-3 w-3 mr-1" />
                          Verificado
                        </Badge>
                      )}
                      {profile.isVip && (
                        <Badge variant="primary" size="sm">
                          <Star className="h-3 w-3 mr-1 text-yellow-400" />
                          VIP
                        </Badge>
                      )}
                    </div>
                    
                    {profile.jobTitle && profile.companyName && (
                      <p className="text-muted-foreground mt-1">
                        {profile.jobTitle} na {profile.companyName}
                      </p>
                    )}
                    
                    {profile.location && (
                      <div className="flex items-center text-muted-foreground mt-1">
                        <MapPin className="h-4 w-4 mr-1" />
                        <span className="text-sm">{profile.location}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center text-muted-foreground mt-1">
                      <Calendar className="h-4 w-4 mr-1" />
                      <span className="text-sm">Membro desde {profile.memberSince}</span>
                    </div>
                  </div>
                  
                  <div className="mt-4 sm:mt-0">
                    <Button
                      variant={editMode ? "secondary" : "primary"}
                      leftIcon={editMode ? <X className="h-4 w-4" /> : <Edit3 className="h-4 w-4" />}
                      onClick={() => setEditMode(!editMode)}
                    >
                      {editMode ? 'Cancelar' : 'Editar Perfil'}
                    </Button>
                  </div>
                </div>
                
                {/* Stats */}
                <div className="flex items-center space-x-6 mt-4">
                  <div className="text-center">
                    <div className="text-xl font-bold text-foreground">{profile.totalBookings}</div>
                    <div className="text-sm text-muted-foreground">Reservas</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-foreground">{formatCurrency(profile.totalSpent)}</div>
                    <div className="text-sm text-muted-foreground">Total Gasto</div>
                  </div>
                  {/* Avaliação removida por solicitação - mantemos dados no backend para compatibilidade */}
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Tabs */}
        <div className="border-b border-border mb-8">
          <nav className="flex space-x-8">
            {[
              { id: 'profile', label: 'Informações Pessoais', icon: User },
              { id: 'security', label: 'Segurança', icon: Lock },
              { id: 'notifications', label: 'Notificações', icon: Bell },
              { id: 'preferences', label: 'Preferências', icon: Settings }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <Grid columns={{ sm: 1, lg: 3 }} gap={8}>
          
          {/* Main Content */}
          <div className="lg:col-span-2">
            
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <Card>
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-foreground">Informações Pessoais</h3>
                    {editMode && (
                      <Button
                        variant="primary"
                        size="sm"
                        leftIcon={<Save className="h-4 w-4" />}
                        onClick={handleSaveProfile}
                        disabled={saving}
                      >
                        {saving ? 'Salvando...' : 'Salvar'}
                      </Button>
                    )}
                  </div>
                  
                  <div className="space-y-6">
                    <Grid columns={{ sm: 1, md: 2 }} gap={4}>
                      {/* Nome */}
                      <div>
            <label htmlFor={nameId} className="block text-sm font-medium text-foreground mb-1">
                          Nome completo
                        </label>
                        {editMode ? (
                          <input
                            type="text"
              id={nameId}
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-3 py-2 border border-border rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                          />
                        ) : (
                          <p className="text-foreground py-2">{profile.name}</p>
                        )}
                      </div>
                      
                      {/* Email */}
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">
                          Email
                        </label>
                        <div className="flex items-center">
                          <Mail className="h-4 w-4 text-muted-foreground mr-2" />
                          <p className="text-foreground py-2">{profile.email}</p>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Para alterar o email, entre em contato com o suporte
                        </p>
                      </div>
                      
                      {/* Telefone */}
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">
                          Telefone
                        </label>
                        {editMode ? (
                          <input
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            className="w-full px-3 py-2 border border-border rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                            placeholder="+351 912 345 678"
                          />
                        ) : (
                          <div className="flex items-center">
                            <Phone className="h-4 w-4 text-muted-foreground mr-2" />
                            <p className="text-foreground py-2">{profile.phone || 'Não informado'}</p>
                          </div>
                        )}
                      </div>
                      
                      {/* Localização */}
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">
                          Localização
                        </label>
                        {editMode ? (
                          <input
                            type="text"
                            value={formData.location}
                            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                            className="w-full px-3 py-2 border border-border rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                            placeholder="Lisboa, Portugal"
                          />
                        ) : (
                          <div className="flex items-center">
                            <MapPin className="h-4 w-4 text-muted-foreground mr-2" />
                            <p className="text-foreground py-2">{profile.location || 'Não informado'}</p>
                          </div>
                        )}
                      </div>
                    </Grid>
                    
                    {/* Bio */}
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Sobre você
                      </label>
                      {editMode ? (
                        <textarea
                          value={formData.bio}
                          onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                          rows={4}
                          className="w-full px-3 py-2 border border-border rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                          placeholder="Conte um pouco sobre você..."
                        />
                      ) : (
                        <p className="text-foreground py-2">{profile.bio || 'Nenhuma descrição adicionada.'}</p>
                      )}
                    </div>
                    
                    {/* Informações Profissionais */}
                    <div className="border-t border-border pt-6">
                      <h4 className="text-md font-medium text-foreground mb-4">Informações Profissionais</h4>
                      
                      <Grid columns={{ sm: 1, md: 2 }} gap={4}>
                        {/* Empresa */}
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1">
                            Empresa
                          </label>
                          {editMode ? (
                            <input
                              type="text"
                              value={formData.companyName}
                              onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                              className="w-full px-3 py-2 border border-border rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                              placeholder="Nome da empresa"
                            />
                          ) : (
                            <div className="flex items-center">
                              <Building2 className="h-4 w-4 text-muted-foreground mr-2" />
                              <p className="text-foreground py-2">{profile.companyName || 'Não informado'}</p>
                            </div>
                          )}
                        </div>
                        
                        {/* Cargo */}
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1">
                            Cargo
                          </label>
                          {editMode ? (
                            <input
                              type="text"
                              value={formData.jobTitle}
                              onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                              className="w-full px-3 py-2 border border-border rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                              placeholder="Seu cargo"
                            />
                          ) : (
                            <p className="text-foreground py-2">{profile.jobTitle || 'Não informado'}</p>
                          )}
                        </div>
                        
                        {/* Setor */}
                        <div>
              <label htmlFor={industryId} className="block text-sm font-medium text-foreground mb-1">
                            Setor de atividade
                          </label>
                          {editMode ? (
                            <select
                id={industryId}
                              value={formData.industry}
                              onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                              className="w-full px-3 py-2 border border-border rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                            >
                              <option value="">Selecionar setor</option>
                              <option value="events">Eventos</option>
                              <option value="marketing">Marketing</option>
                              <option value="media">Mídia e Comunicação</option>
                              <option value="production">Produção Audiovisual</option>
                              <option value="technology">Tecnologia</option>
                              <option value="education">Educação</option>
                              <option value="corporate">Corporativo</option>
                              <option value="entertainment">Entretenimento</option>
                              <option value="other">Outro</option>
                            </select>
                          ) : (
                            <p className="text-foreground py-2">{profile.industry || 'Não informado'}</p>
                          )}
                        </div>
                        
                        {/* Website */}
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1">
                            Website
                          </label>
                          {editMode ? (
                            <input
                              type="url"
                              value={formData.website}
                              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                              className="w-full px-3 py-2 border border-border rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                              placeholder="https://www.exemplo.com"
                            />
                          ) : (
                            <div className="flex items-center">
                              <Globe className="h-4 w-4 text-muted-foreground mr-2" />
                              {profile.website ? (() => {
                                const safe = isSafeWebsite(profile.website);
                                if (!safe) {
                                  return <span className="text-foreground py-2">Website inválido</span>;
                                }

                                // Mostrar apenas host + caminho curto para evitar exposição longa
                                try {
                                  const u = new URL(profile.website || '');
                                  const display = `${u.hostname}${u.pathname && u.pathname !== '/' ? u.pathname.replace(/\/$/, '') : ''}`;
                                  const short = display.length > 60 ? display.slice(0, 57) + '...' : display;
                                  const safeHref = u.toString();
                                  return (
                                    <a
                                      href="#"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        openWebsite(safeHref);
                                      }}
                                      className="text-primary hover:underline py-2 break-words"
                                    >
                                      {short}
                                    </a>
                                  );
                                } catch (e) {
                                  return <span className="text-foreground py-2">Website inválido</span>;
                                }
                              })() : (
                                <p className="text-foreground py-2">Não informado</p>
                              )}
                            </div>
                          )}
                        </div>
                      </Grid>
                    </div>
                  </div>
                </div>
              </Card>
            )}
            
            {/* Security Tab */}
            {activeTab === 'security' && (
              <Card>
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-6">Segurança da Conta</h3>
                  
                  <div className="space-y-6">
                    {/* Alterar Senha */}
                    <div className="border border-border rounded-lg p-4">
                      <h4 className="font-medium text-foreground mb-4">Alterar Senha</h4>
                      
                      <div className="space-y-4">
                        <div>
              <label htmlFor={currentPasswordId} className="block text-sm font-medium text-foreground mb-1">
                            Senha atual
                          </label>
                          <div className="relative">
                            <input
                id={currentPasswordId}
                              type={showCurrentPassword ? "text" : "password"}
                              value={passwordForm.currentPassword}
                              onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                              className="w-full px-3 py-2 pr-10 border border-border rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                              autoComplete="current-password"
                            />
                            <button
                              type="button"
                              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                aria-label={showCurrentPassword ? 'Ocultar senha atual' : 'Mostrar senha atual'}
                            >
                              {showCurrentPassword ? (
                                <EyeOff className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <Eye className="h-4 w-4 text-muted-foreground" />
                              )}
                            </button>
                          </div>
                        </div>
                        
                        <div>
              <label htmlFor={newPasswordId} className="block text-sm font-medium text-foreground mb-1">
                            Nova senha
                          </label>
                          <div className="relative">
                            <input
                id={newPasswordId}
                              type={showNewPassword ? "text" : "password"}
                              value={passwordForm.newPassword}
                              onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                              className="w-full px-3 py-2 pr-10 border border-border rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                              placeholder="Mínimo 6 caracteres"
                              autoComplete="new-password"
                            />
                            <button
                              type="button"
                              onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                aria-label={showNewPassword ? 'Ocultar nova senha' : 'Mostrar nova senha'}
                            >
                              {showNewPassword ? (
                                <EyeOff className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <Eye className="h-4 w-4 text-muted-foreground" />
                              )}
                            </button>
                          </div>
                        </div>
                        
                        <div>
                          <label htmlFor={confirmNewPasswordId} className="block text-sm font-medium text-foreground mb-1">
                            Confirmar nova senha
                          </label>
                          <input
                            id={confirmNewPasswordId}
                            type="password"
                            value={passwordForm.confirmPassword}
                            onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                            className="w-full px-3 py-2 border border-border rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                            placeholder="Confirme a nova senha"
                            title="Confirme a nova senha"
                            autoComplete="new-password"
                          />
                        </div>
                        
                        <Button
                          variant="primary"
                          onClick={handleChangePassword}
                          disabled={saving || !passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword}
                        >
                          {saving ? 'Alterando...' : 'Alterar Senha'}
                        </Button>
                      </div>
                    </div>
                    
                    {/* Autenticação de Dois Fatores */}
                    <div className="border border-border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-foreground">Autenticação de Dois Fatores</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            Adicione uma camada extra de segurança à sua conta
                          </p>
                        </div>
                        <Button variant="outline" size="sm">
                          Configurar
                        </Button>
                      </div>
                    </div>
                    
                    {/* Sessões Ativas */}
                    <div className="border border-border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-foreground">Sessões Ativas</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            Gerencie os dispositivos conectados à sua conta
                          </p>
                        </div>
                        <Button variant="outline" size="sm">
                          Ver Sessões
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            )}
            
            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <Card>
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-6">Configurações de Notificação</h3>
                  
                  <div className="space-y-6">
                    {[
                      {
                        title: 'Notificações de Reserva',
                        description: 'Receba updates sobre suas reservas',
                        email: true,
                        push: true
                      },
                      {
                        title: 'Promoções e Ofertas',
                        description: 'Novidades sobre equipamentos e descontos',
                        email: false,
                        push: false
                      },
                      {
                        title: 'Lembretes de Evento',
                        description: 'Lembretes sobre eventos próximos',
                        email: true,
                        push: true
                      },
                      {
                        title: 'Newsletter',
                        description: 'Conteúdo e dicas sobre produção de eventos',
                        email: true,
                        push: false
                      }
                    ].map((notification, index) => (
                      <div key={index} className="border border-border rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-foreground">{notification.title}</h4>
                            <p className="text-sm text-muted-foreground mt-1">{notification.description}</p>
                          </div>
                          <div className="flex items-center space-x-4 ml-4">
                            <label className="flex items-center">
                              <input
                                id={`email-${index}`}
                                type="checkbox"
                                defaultChecked={notification.email}
                                className="rounded border-border text-primary focus:ring-primary"
                              />
                              <span className="ml-2 text-sm text-foreground">Email</span>
                            </label>
                            <label className="flex items-center">
                              <input
                                id={`push-${index}`}
                                type="checkbox"
                                defaultChecked={notification.push}
                                className="rounded border-border text-primary focus:ring-primary"
                              />
                              <span className="ml-2 text-sm text-foreground">Push</span>
                            </label>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    <Button variant="primary">
                      Salvar Preferências
                    </Button>
                  </div>
                </div>
              </Card>
            )}
            
            {/* Preferences Tab */}
            {activeTab === 'preferences' && (
              <Card>
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-6">Preferências Gerais</h3>
                  
                  <div className="space-y-6">
                    {/* Idioma */}
                    <div>
                      <label htmlFor={languageId} className="block text-sm font-medium text-foreground mb-2">
                        Idioma
                      </label>
                      <select id={languageId} className="w-full max-w-xs px-3 py-2 border border-border rounded-md focus:ring-2 focus:ring-primary focus:border-transparent">
                        <option value="pt">Português</option>
                        <option value="en">English</option>
                        <option value="es">Español</option>
                      </select>
                    </div>
                    
                    {/* Fuso Horário */}
                    <div>
                      <label htmlFor={timezoneId} className="block text-sm font-medium text-foreground mb-2">
                        Fuso Horário
                      </label>
                      <select id={timezoneId} className="w-full max-w-xs px-3 py-2 border border-border rounded-md focus:ring-2 focus:ring-primary focus:border-transparent">
                        <option value="Europe/Lisbon">Lisboa (UTC+0)</option>
                        <option value="Europe/Madrid">Madrid (UTC+1)</option>
                        <option value="Europe/London">Londres (UTC+0)</option>
                      </select>
                    </div>
                    
                    {/* Moeda */}
                    <div>
                      <label htmlFor={currencyId} className="block text-sm font-medium text-foreground mb-2">
                        Moeda
                      </label>
                      <select id={currencyId} className="w-full max-w-xs px-3 py-2 border border-border rounded-md focus:ring-2 focus:ring-primary focus:border-transparent">
                        <option value="BRL">Real Brasileiro (R$)</option>
                        <option value="USD">Dólar ($)</option>
                        <option value="GBP">Libra (£)</option>
                      </select>
                    </div>
                    
                    <Button variant="primary">
                      Salvar Preferências
                    </Button>
                  </div>
                </div>
              </Card>
            )}
          </div>
          
          {/* Sidebar */}
          <div className="space-y-6">
            
            {/* Activity Card */}
            <Card>
              <div className="p-6">
                <div className="flex items-center space-x-2 mb-4">
                  <Activity className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold text-foreground">Atividade Recente</h3>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 rounded-full bg-primary mt-2"></div>
                    <div className="flex-1">
                      <p className="text-sm text-foreground">Perfil atualizado</p>
                      <p className="text-xs text-muted-foreground">Há 2 horas</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 rounded-full bg-success mt-2"></div>
                    <div className="flex-1">
                      <p className="text-sm text-foreground">Nova reserva criada</p>
                      <p className="text-xs text-muted-foreground">Ontem</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 rounded-full bg-warning mt-2"></div>
                    <div className="flex-1">
                      <p className="text-sm text-foreground">Foto de perfil alterada</p>
                      <p className="text-xs text-muted-foreground">3 dias atrás</p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
            
            {/* Badges Card */}
            <Card>
              <div className="p-6">
                <div className="flex items-center space-x-2 mb-4">
                  <Award className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold text-foreground">Conquistas</h3>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center space-x-3 p-3 bg-muted/50 rounded-lg">
                    <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                      <Star className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">Cliente Premium</p>
                      <p className="text-xs text-muted-foreground">5+ reservas</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3 p-3 bg-muted/50 rounded-lg">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                      <Shield className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">Conta Verificada</p>
                      <p className="text-xs text-muted-foreground">Email confirmado</p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
            
            {/* Danger Zone */}
            <Card>
              <div className="p-6">
                <h3 className="font-semibold text-destructive mb-4">Zona de Perigo</h3>
                
                <div className="space-y-3">
                  <Button
                    variant="outline"
                    size="sm"
                    fullWidth
                    className="text-destructive border-destructive hover:bg-destructive hover:text-white"
                  >
                    Desativar Conta
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    fullWidth
                    className="text-destructive border-destructive hover:bg-destructive hover:text-white"
                  >
                    Excluir Conta
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </Grid>
      </div>
    </div>
  );
};
