import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Edit,
  Star,
  MapPin,
  Settings,
  Award,
  Camera,
  Loader2,
  Info,
} from 'lucide-react';
import { CollaboratorLayout } from '../../components/collaborator/CollaboratorLayout';
import { CollaboratorLoading, CollaboratorError } from '../../components/collaborator/CollaboratorStates';
import { CollaboratorTabs, CollaboratorTabPanel } from '../../components/collaborator/CollaboratorTabs';
import { Button, buttonVariants } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { collaboratorProfileAPI } from '../../services/api';
import { useNotifications } from '@/contexts/NotificationContext';
import { GoogleCalendarIntegration } from '../../components/GoogleCalendarIntegration';
import { formatPrice } from '@/utils/formatPrice';
import { collaboratorRoleLabel } from '@/utils/collaboratorRoles';
import { logger } from '../../utils/logger';

interface CollaboratorProfileData {
  user?: {
    name?: string;
    location?: string;
    bio?: string;
    email?: string;
    website?: string;
    avatarUrl?: string;
    googleCalendarEmail?: string;
  };
  collaboratorRole?: string;
  averageRating?: number;
  totalEvents?: number;
  completedEvents?: number;
  totalEarnings?: number;
  // Decimal no banco: chega como texto ("45"); null quando a administração ainda não definiu.
  hourlyRate?: number | string | null;
  phone?: string;
  specialties?: string[];
  equipment?: string[];
  certifications?: string[];
  languages?: string[];
  experience?: string;
  workingRadius?: number;
}

// Só os campos que PUT /collaborators/me/profile realmente grava (collaboratorController.updateMyProfile
// + collaboratorUpdateSchema). Achado (auditoria): o formulário também editava biografia, localização,
// site e experiência — o backend descartava esses campos e a tela dizia "Perfil atualizado".
// Q2 (02/11/2026): o valor por hora é remuneração combinada, então só a administração define; o campo
// saiu daqui e aparece só para leitura.
interface CollaboratorFormData {
  phone: string;
  workingRadius: number | string;
  languages: string[];
  specialties: string[];
  equipment: string[];
  certifications: string[];
}

type ProfileTab = 'overview' | 'professional';

const BREADCRUMBS = [
  { name: 'Colaborador', href: '/colaborador/painel' },
  { name: 'Perfil' },
];

const TABS = [
  { id: 'overview' as const, label: 'Visão geral' },
  { id: 'professional' as const, label: 'Dados profissionais' },
];

const toFormData = (data: CollaboratorProfileData | null): CollaboratorFormData => ({
  phone: data?.phone || '',
  workingRadius: data?.workingRadius ?? '',
  languages: data?.languages || [],
  specialties: data?.specialties || [],
  equipment: data?.equipment || [],
  certifications: data?.certifications || [],
});

const splitList = (value: string) => value.split(',').map((item) => item.trim()).filter(Boolean);
type ListField = 'languages' | 'equipment' | 'certifications';

const ChipList: React.FC<{ items?: string[]; empty?: string }> = ({ items, empty = 'Não informado' }) =>
  items && items.length > 0 ? (
    <div className="flex flex-wrap gap-2 mt-1">
      {items.map((item, index) => (
        <Badge key={`${item}-${index}`} variant="ghost" size="lg">{item}</Badge>
      ))}
    </div>
  ) : (
    <p className="mt-1 text-sm text-muted-foreground">{empty}</p>
  );

const InfoRow: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="text-sm">
    <dt className="font-medium text-foreground">{label}</dt>
    <dd className="mt-0.5 text-muted-foreground break-words">{children}</dd>
  </div>
);

const CollaboratorProfilePage: React.FC = () => {
  const { addNotification } = useNotifications();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<CollaboratorProfileData | null>(null);
  const [activeTab, setActiveTab] = useState<ProfileTab>('overview');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form states
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState<CollaboratorFormData>(toFormData(null));
  // Texto digitado nos campos de lista. Antes o campo mostrava `lista.join(', ')` e cada tecla
  // reformatava: a vírgula/espaço recém-digitados sumiam e não dava para escrever o 2º item.
  const [listDraft, setListDraft] = useState<Partial<Record<ListField, string>>>({});
  const changeList = (field: ListField, text: string) => {
    setListDraft((d) => ({ ...d, [field]: text }));
    setFormData((f) => ({ ...f, [field]: splitList(text) }));
  };

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(false);
      const response = await collaboratorProfileAPI.getMyProfile();
      const data = (response?.data || null) as CollaboratorProfileData | null;
      setProfile(data);
      setFormData(toFormData(data));
      setListDraft({});
    } catch (error) {
      logger.error('Erro ao carregar perfil:', 'CollaboratorProfilePage', error);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      const workingRadius = Number(formData.workingRadius);
      await collaboratorProfileAPI.updateProfile({
        phone: formData.phone,
        // Vazio ou zero vai como "não alterar". O valor por hora não vai: só a administração define (Q2).
        workingRadius: workingRadius > 0 ? Math.round(workingRadius) : undefined,
        // Listas vão sempre: o backend grava [] quando a lista não é enviada.
        languages: formData.languages,
        specialties: formData.specialties,
        equipment: formData.equipment,
        certifications: formData.certifications,
      });
      await loadProfile();
      setEditMode(false);
      addNotification({
        type: 'success',
        title: 'Sucesso',
        message: 'Perfil atualizado com sucesso!'
      });
    } catch (error) {
      logger.error('Erro ao salvar perfil:', 'CollaboratorProfilePage', error);
      addNotification({
        type: 'error',
        title: 'Erro',
        message: 'Não foi possível salvar as alterações.'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setFormData(toFormData(profile));
    setListDraft({});
    setEditMode(false);
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) {
      setUploading(true);
      try {
        const data = new FormData();
        data.append('avatar', file);

        await collaboratorProfileAPI.uploadAvatar(data);
        await loadProfile(); // Recarrega o perfil para mostrar a nova foto
        addNotification({ type: 'success', title: 'Sucesso', message: 'Foto do perfil atualizada.' });
      } catch (error) {
        logger.error('Erro no upload:', 'CollaboratorProfilePage', error);
        addNotification({
          type: 'error',
          title: 'Erro',
          message: 'Erro ao atualizar avatar.'
        });
      } finally {
        setUploading(false);
      }
    }
  };

  const renderContent = () => {
    if (loading) return <CollaboratorLoading label="Carregando perfil…" />;

    if (loadError) {
      return <CollaboratorError message="Não conseguimos carregar seu perfil de colaborador." onRetry={loadProfile} />;
    }

    if (!profile || !profile.user) {
      return (
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-foreground mb-4">Perfil não encontrado</h2>
          <p className="text-muted-foreground mb-6">Não foi possível carregar seu perfil de colaborador.</p>
          <Link to="/colaborador/painel" className={buttonVariants({ size: 'sm' })}>Voltar ao painel</Link>
        </div>
      );
    }

    // averageRating é Decimal no banco e chega no JSON como string ("4.5") — `.toFixed` em string
    // quebrava a página inteira ao abrir o perfil.
    const rating = Number(profile.averageRating) || 0;
    const roundedRating = Math.round(rating);
    const name = profile.user.name || 'Nome não disponível';
    // Q2: valor definido pela administração; sem valor, a tela não mostra R$ 0,00 como se fosse zero.
    const hourlyRateText = profile.hourlyRate == null ? 'Ainda não definido' : formatPrice(profile.hourlyRate);

    return (
      <div className="space-y-6">
        {/* Cabeçalho do perfil */}
        <section className="bg-card rounded-xl shadow-sm border border-border p-4 sm:p-6" aria-label="Resumo do perfil">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
            <div className="relative self-center sm:self-start shrink-0">
              {profile.user.avatarUrl ? (
                <img
                  src={profile.user.avatarUrl}
                  alt={`Foto de ${name}`}
                  className="w-24 h-24 rounded-full object-cover border border-border"
                />
              ) : (
                <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center" aria-hidden="true">
                  <span className="text-3xl font-semibold text-muted-foreground">{name.charAt(0).toUpperCase()}</span>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="sr-only"
                tabIndex={-1}
                aria-hidden="true"
              />
              <Button
                size="icon"
                className="absolute -bottom-1 -right-1 rounded-full h-11 w-11"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                aria-label="Alterar foto do perfil"
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
              </Button>
            </div>

            <div className="flex-1 min-w-0 space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                {/* <h2>: o <h1> da página é o título do layout. */}
                <h2 className="text-2xl font-bold text-foreground break-words">{name}</h2>
                <div className="flex flex-wrap gap-2">
                  {editMode ? (
                    <>
                      <Button size="sm" onClick={handleSaveProfile} isLoading={saving}>Salvar</Button>
                      <Button size="sm" variant="ghost" onClick={handleCancelEdit} disabled={saving}>Cancelar</Button>
                    </>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => setEditMode(true)} leftIcon={<Edit className="w-4 h-4" />}>
                      Editar perfil
                    </Button>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <Badge variant="primary" size="lg">{collaboratorRoleLabel(profile.collaboratorRole)}</Badge>

                <div className="flex items-center gap-1" role="img" aria-label={`Avaliação ${rating.toFixed(1)} de 5`}>
                  {Array.from({ length: 5 }, (_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${i < roundedRating ? 'text-warning fill-current' : 'text-muted-foreground'}`}
                      aria-hidden="true"
                    />
                  ))}
                  <span className="text-sm text-muted-foreground ml-1">({rating.toFixed(1)})</span>
                </div>

                <div className="flex items-center text-sm text-muted-foreground">
                  <MapPin className="w-4 h-4 mr-1 shrink-0" aria-hidden="true" />
                  {profile.user.location || 'Localização não informada'}
                </div>
              </div>

              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <h3 className="sr-only">Estatísticas</h3>
                <dl className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: 'Eventos totais', value: String(profile.totalEvents ?? 0), tone: 'text-primary' },
                    { label: 'Concluídos', value: String(profile.completedEvents ?? 0), tone: 'text-success' },
                    { label: 'Total ganho', value: formatPrice(Number(profile.totalEarnings) || 0), tone: 'text-foreground' },
                    { label: 'Valor/hora', value: profile.hourlyRate == null ? '—' : `${formatPrice(profile.hourlyRate)}/h`, tone: 'text-foreground' },
                  ].map((stat) => (
                    <div key={stat.label} className="flex flex-col-reverse gap-1 text-center p-3 bg-card rounded-lg border border-border min-w-0">
                      <dt className="text-sm font-medium text-muted-foreground">{stat.label}</dt>
                      <dd className={`text-lg sm:text-2xl font-bold break-words ${stat.tone}`}>{stat.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          </div>
        </section>

        {/* Abas */}
        <section className="bg-card rounded-xl shadow-sm border border-border">
          <CollaboratorTabs
            tabs={TABS}
            active={activeTab}
            onChange={setActiveTab}
            ariaLabel="Seções do perfil"
            idBase="perfil"
            className="px-2 sm:px-4"
          />

          <div className="p-4 sm:p-6">
            {activeTab === 'overview' && (
              <CollaboratorTabPanel idBase="perfil" id="overview">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Informações pessoais */}
                  <div className="bg-muted/40 rounded-lg p-4 sm:p-6">
                    <h3 className="text-lg font-medium text-foreground mb-4 flex items-center">
                      <Settings className="w-5 h-5 mr-2" aria-hidden="true" /> Informações pessoais
                    </h3>

                    {editMode && (
                      <div className="mb-4">
                        <Input
                          size="sm"
                          label="Telefone"
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          placeholder="(11) 98765-4321"
                        />
                      </div>
                    )}

                    <dl className="space-y-3">
                      <InfoRow label="E-mail">{profile.user.email || 'Não informado'}</InfoRow>
                      {!editMode && <InfoRow label="Telefone">{profile.phone || 'Não informado'}</InfoRow>}
                      <InfoRow label="Localização">{profile.user.location || 'Não informada'}</InfoRow>
                      <InfoRow label="Site">
                        {profile.user.website ? (
                          <a href={profile.user.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                            {profile.user.website}
                          </a>
                        ) : (
                          'Não informado'
                        )}
                      </InfoRow>
                      <InfoRow label="Biografia">{profile.user.bio || 'Não informada'}</InfoRow>
                    </dl>

                    {editMode && (
                      <p className="mt-4 flex items-start gap-2 text-sm text-muted-foreground">
                        <Info className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
                        E-mail, localização, site e biografia ainda não podem ser alterados por aqui.
                      </p>
                    )}
                  </div>

                  {/* Especialidades e habilidades */}
                  <div className="bg-muted/40 rounded-lg p-4 sm:p-6">
                    <h3 className="text-lg font-medium text-foreground mb-4 flex items-center">
                      <Award className="w-5 h-5 mr-2" aria-hidden="true" /> Especialidades e habilidades
                    </h3>

                    <dl className="space-y-4 text-sm">
                      <div>
                        <dt className="font-medium text-foreground">Função</dt>
                        <dd className="mt-1"><Badge variant="primary">{collaboratorRoleLabel(profile.collaboratorRole)}</Badge></dd>
                      </div>
                      <div>
                        <dt className="font-medium text-foreground">Especialidades</dt>
                        <dd><ChipList items={profile.specialties} /></dd>
                      </div>
                      <div>
                        <dt className="font-medium text-foreground">Equipamentos</dt>
                        <dd><ChipList items={profile.equipment} /></dd>
                      </div>
                      <div>
                        <dt className="font-medium text-foreground">Certificações</dt>
                        <dd><ChipList items={profile.certifications} /></dd>
                      </div>
                      <div>
                        <dt className="font-medium text-foreground">Idiomas</dt>
                        <dd><ChipList items={profile.languages} /></dd>
                      </div>
                    </dl>
                  </div>
                </div>
              </CollaboratorTabPanel>
            )}

            {activeTab === 'professional' && (
              <CollaboratorTabPanel idBase="perfil" id="professional">
                <div className="space-y-6">
                  {!editMode && (
                    <div className="bg-card rounded-lg border border-border overflow-hidden">
                      <GoogleCalendarIntegration googleCalendarEmail={profile.user.googleCalendarEmail} />
                    </div>
                  )}

                  <div className="bg-muted/40 rounded-lg p-4 sm:p-6">
                    <h3 className="text-lg font-semibold text-foreground mb-6">Dados profissionais</h3>

                    {editMode ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <dl>
                            <InfoRow label="Valor por hora (definido pela administração)">{hourlyRateText}</InfoRow>
                          </dl>
                          <Input
                            size="sm"
                            type="number"
                            min={0}
                            label="Raio de atuação (km)"
                            value={formData.workingRadius}
                            onChange={(e) => setFormData({ ...formData, workingRadius: e.target.value })}
                            placeholder="50"
                          />
                        </div>

                        <Input
                          size="sm"
                          label="Idiomas (separados por vírgula)"
                          value={listDraft.languages ?? formData.languages.join(', ')}
                          onChange={(e) => changeList('languages', e.target.value)}
                          placeholder="Português, Inglês, Espanhol"
                        />

                        <Input
                          size="sm"
                          label="Equipamentos (separados por vírgula)"
                          value={listDraft.equipment ?? formData.equipment.join(', ')}
                          onChange={(e) => changeList('equipment', e.target.value)}
                          placeholder="Câmera DSLR, Microfone, Luz LED"
                        />

                        <Input
                          size="sm"
                          label="Certificações (separadas por vírgula)"
                          value={listDraft.certifications ?? formData.certifications.join(', ')}
                          onChange={(e) => changeList('certifications', e.target.value)}
                          placeholder="Curso de Fotografia, Técnico em Áudio"
                        />

                        <p className="flex items-start gap-2 text-sm text-muted-foreground">
                          <Info className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
                          O campo "Experiência" ainda não pode ser alterado por aqui. Especialidades ficam em Configurações.
                        </p>
                      </div>
                    ) : (
                      <dl className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <InfoRow label="Valor por hora (definido pela administração)">{hourlyRateText}</InfoRow>
                          <InfoRow label="Raio de atuação">{profile.workingRadius ? `${profile.workingRadius} km` : 'Não informado'}</InfoRow>
                        </div>
                        {profile.experience && <InfoRow label="Experiência">{profile.experience}</InfoRow>}
                        <div>
                          <dt className="text-sm font-medium text-foreground">Idiomas</dt>
                          <dd><ChipList items={profile.languages} /></dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-foreground">Equipamentos</dt>
                          <dd><ChipList items={profile.equipment} /></dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-foreground">Certificações</dt>
                          <dd><ChipList items={profile.certifications} /></dd>
                        </div>
                      </dl>
                    )}
                  </div>
                </div>
              </CollaboratorTabPanel>
            )}
          </div>
        </section>
      </div>
    );
  };

  return (
    <CollaboratorLayout title="Perfil do Colaborador" breadcrumbs={BREADCRUMBS}>
      {renderContent()}
    </CollaboratorLayout>
  );
};

export default CollaboratorProfilePage;
