import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  User,
  Lock,
  CreditCard,
  Shield,
  Save,
  Camera,
  Upload,
  Trash2,
  X,
  Plus,
  Info,
} from 'lucide-react';
import { CollaboratorLayout } from '../../components/collaborator/CollaboratorLayout';
import { CollaboratorLoading, CollaboratorError } from '../../components/collaborator/CollaboratorStates';
import { CollaboratorTabs, CollaboratorTabPanel } from '../../components/collaborator/CollaboratorTabs';
import { ToggleSwitch } from '../../components/collaborator/ToggleSwitch';
import { SimpleCard } from '../../components/ui/Cards';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Textarea';
import { Badge } from '../../components/ui/Badge';
import { collaboratorProfileAPI, authAPI } from '../../services/api';

import { ProfileSettings, SecuritySettings, PaymentSettings } from '@/types/types';

import { useNotifications } from '@/contexts/NotificationContext';
import { logger } from '../../utils/logger';
import { strongPasswordSchema } from '../../validators/userSchema';
import { PASSWORD_HINT } from '../../components/layouts/AuthLayout';

type SettingsTab = 'profile' | 'security' | 'privacy' | 'payment';

const BREADCRUMBS = [
  { name: 'Colaborador', href: '/colaborador/painel' },
  { name: 'Configurações' },
];

const TABS = [
  { id: 'profile' as const, label: 'Perfil', icon: User },
  { id: 'security' as const, label: 'Segurança', icon: Lock },
  { id: 'privacy' as const, label: 'Privacidade', icon: Shield },
  { id: 'payment' as const, label: 'Pagamento', icon: CreditCard },
];

const PAYMENT_METHOD_OPTIONS = [
  { value: 'pix', label: 'PIX' },
  { value: 'bank_transfer', label: 'Transferência bancária' },
  { value: 'both', label: 'Ambos' },
];

const ACCOUNT_TYPE_OPTIONS = [
  { value: 'corrente', label: 'Conta corrente' },
  { value: 'poupanca', label: 'Poupança' },
];

// Listas do colaborador que a aba Perfil não edita, mas que precisam ir junto no PUT
// /collaborators/me/profile — o backend grava [] em toda lista que não for enviada.
interface PreservedLists {
  languages: string[];
  equipment: string[];
  certifications: string[];
}

const CollaboratorSettingsPage: React.FC = () => {
  const { addNotification } = useNotifications();
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [profileSettings, setProfileSettings] = useState<ProfileSettings | null>(null);
  const [originalName, setOriginalName] = useState('');
  const [preservedLists, setPreservedLists] = useState<PreservedLists>({ languages: [], equipment: [], certifications: [] });
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    twoFactorEnabled: false,
    loginNotifications: true
  });
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings | null>(null);
  const [newSpecialty, setNewSpecialty] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const loadSettings = React.useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(false);
      // Achado (revisão da auditoria): privacidade/pagamento eram lidos de `user.profileSettings` da
      // rota de perfil — que não traz esse campo. A tela mostrava sempre os padrões e, ao salvar,
      // gravava os padrões vazios por cima da chave PIX e dos dados bancários. A rota própria
      // (GET /collaborators/me/settings) devolve o que está salvo; se ela falhar, a tela mostra erro
      // em vez de padrões que seriam gravados por cima.
      const [response, settingsResponse] = await Promise.all([
        collaboratorProfileAPI.getMyProfile(),
        collaboratorProfileAPI.getSettings(),
      ]);
      const data = response?.data?.data ?? response?.data; // Tenta extrair data.data, ou usa data direto

      if (data) {
        const name = data.user?.name || data.name || '';
        setOriginalName(name);
        setProfileSettings({
            name,
            email: data.user?.email || data.email || '',
            phone: data.phone || '',
            bio: data.user?.bio || '',
            specialties: data.specialties || [],
            profileImage: data.user?.avatarUrl || '',
            location: data.user?.location || '',
            website: data.user?.website || ''
        });
        setPreservedLists({
          languages: data.languages || [],
          equipment: data.equipment || [],
          certifications: data.certifications || [],
        });

        // Configurações salvas em User.profileSettings (JSON) — vindas da rota de settings — ou padrões
        const userSettings = (settingsResponse?.data ?? {}) as {
          security?: { twoFactorEnabled?: boolean; loginNotifications?: boolean };
          payment?: Partial<PaymentSettings>;
        };

        setSecuritySettings((prev) => ({
          ...prev,
          twoFactorEnabled: userSettings.security?.twoFactorEnabled ?? false,
          loginNotifications: userSettings.security?.loginNotifications ?? true
        }));

        setPaymentSettings({
            pixKey: userSettings.payment?.pixKey || '',
            bankAccount: userSettings.payment?.bankAccount || {
                bank: '', agency: '', account: '', accountType: 'corrente'
            },
            preferredMethod: userSettings.payment?.preferredMethod || 'pix'
        });
      }
    } catch (error) {
      logger.error('Erro ao carregar configurações:', 'CollaboratorSettingsPage', error);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleSave = async () => {
    try {
      if (activeTab === 'security') {
        // Validação antes de chamar a API (antes, a confirmação nem era conferida).
        const { currentPassword, newPassword, confirmPassword } = securitySettings;
        if (!newPassword) {
          setPasswordError('Digite a nova senha.');
          return;
        }
        if (!currentPassword) {
          setPasswordError('Digite sua senha atual.');
          return;
        }
        // Mesma regra forte das outras telas e do servidor (antes: 6 caracteres, e a API passou
        // a recusar senha fraca na troca).
        const passwordCheck = strongPasswordSchema.safeParse(newPassword);
        if (!passwordCheck.success) {
          setPasswordError(passwordCheck.error.issues[0]?.message ?? PASSWORD_HINT);
          return;
        }
        if (newPassword !== confirmPassword) {
          setPasswordError('A confirmação não confere com a nova senha.');
          return;
        }
        setPasswordError(null);
      }

      setSaving(true);

      if (activeTab === 'profile') {
        // Achado (auditoria): esta aba editava nome, e-mail, biografia, localização e site, mas só
        // telefone e especialidades eram enviados — o resto era descartado com "salvo com sucesso".
        // Agora: nome vai para PUT /auth/profile (único endpoint que grava o nome); telefone e
        // especialidades para PUT /collaborators/me/profile; os demais campos ficam só leitura.
        if (profileSettings && profileSettings.name.trim() && profileSettings.name.trim() !== originalName) {
          await authAPI.updateProfile({ name: profileSettings.name.trim() });
          setOriginalName(profileSettings.name.trim());
        }
        await collaboratorProfileAPI.updateProfile({
          phone: profileSettings?.phone,
          specialties: profileSettings?.specialties,
          ...preservedLists,
        });
      } else if (activeTab === 'security') {
        await authAPI.changePassword(securitySettings.currentPassword, securitySettings.newPassword);
        setSecuritySettings((prev) => ({ ...prev, currentPassword: '', newPassword: '', confirmPassword: '' }));
      } else {
        // Só a seção de pagamento (a aba Privacidade não grava nada; ver D4 abaixo).
        await collaboratorProfileAPI.updateSettings({ payment: paymentSettings });
      }

      // D17 (aprovada em 02/11/2026): a troca de senha encerra as outras sessões; esta segue aberta.
      addNotification({
        type: 'success',
        title: 'Sucesso',
        message: activeTab === 'security'
          ? 'Senha alterada. Por segurança, saímos das suas outras sessões.'
          : 'Alterações salvas com sucesso!'
      });
    } catch (error) {
      logger.error('Erro ao salvar:', 'CollaboratorSettingsPage', error);
      addNotification({
        type: 'error',
        title: 'Erro',
        message: 'Erro ao salvar alterações'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = '';
      if (file) {
          try {
              const formData = new FormData();
              formData.append('avatar', file);
              await collaboratorProfileAPI.uploadAvatar(formData);
              loadSettings(); // Recarrega para mostrar nova foto
          } catch (error) {
              logger.error('Erro upload:', 'CollaboratorSettingsPage', error);
              addNotification({
                type: 'error',
                title: 'Erro',
                message: 'Erro ao atualizar foto'
              });
          }
      }
  };

  const handleRemovePhoto = async () => {
      try {
          await authAPI.updateProfile({ avatarUrl: null });
          setProfileSettings((prev) => (prev ? { ...prev, profileImage: '' } : prev));
          addNotification({ type: 'success', title: 'Sucesso', message: 'Foto removida.' });
      } catch (error) {
          logger.error('Erro ao remover foto:', 'CollaboratorSettingsPage', error);
          addNotification({ type: 'error', title: 'Erro', message: 'Erro ao remover foto' });
      }
  };

  const addSpecialty = () => {
    if (!profileSettings) return;
    const value = newSpecialty.trim();
    if (value && !profileSettings.specialties.includes(value)) {
      setProfileSettings({ ...profileSettings, specialties: [...profileSettings.specialties, value] });
    }
    setNewSpecialty('');
  };

  const saveButton = (label: string) => (
    <div className="flex justify-end">
      <Button size="sm" onClick={handleSave} isLoading={saving} leftIcon={<Save className="h-4 w-4" />}>
        {label}
      </Button>
    </div>
  );

  const renderContent = () => {
    if (loading) return <CollaboratorLoading label="Carregando configurações…" />;
    if (loadError) {
      return <CollaboratorError message="Não conseguimos carregar suas configurações." onRetry={loadSettings} />;
    }

    return (
      <div className="space-y-6">
        <p className="text-muted-foreground">Gerencie sua conta e preferências.</p>

        <CollaboratorTabs
          tabs={TABS}
          active={activeTab}
          onChange={setActiveTab}
          ariaLabel="Seções das configurações"
          idBase="config"
        />

        {/* Aba Perfil */}
        {activeTab === 'profile' && profileSettings && (
          <CollaboratorTabPanel idBase="config" id="profile" className="space-y-6">
            <SimpleCard title="Informações pessoais">
              <div className="space-y-6">
                {/* Foto */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
                  <div className="relative self-start shrink-0">
                    {profileSettings.profileImage ? (
                      <img
                        src={profileSettings.profileImage}
                        alt="Foto do perfil"
                        className="w-20 h-20 rounded-full object-cover border border-border"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center" aria-hidden="true">
                        <span className="text-2xl font-semibold text-muted-foreground">
                          {(profileSettings.name || '?').charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <Button
                      size="icon"
                      className="absolute -bottom-1 -right-1 h-11 w-11 rounded-full"
                      onClick={() => avatarInputRef.current?.click()}
                      aria-label="Alterar foto do perfil"
                    >
                      <Camera className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-foreground mb-1">Foto do perfil</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      Escolha uma foto profissional para seu perfil
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => avatarInputRef.current?.click()}
                        leftIcon={<Upload className="h-4 w-4" />}
                      >
                        Alterar foto
                      </Button>
                      {profileSettings.profileImage && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={handleRemovePhoto}
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                          leftIcon={<Trash2 className="h-4 w-4" />}
                        >
                          Remover
                        </Button>
                      )}
                      <input
                        ref={avatarInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="sr-only"
                        tabIndex={-1}
                        aria-hidden="true"
                      />
                    </div>
                  </div>
                </div>

                {/* Dados básicos */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Input
                    size="sm"
                    label="Nome completo"
                    value={profileSettings.name}
                    onChange={(e) => setProfileSettings({ ...profileSettings, name: e.target.value })}
                    placeholder="Digite seu nome completo"
                  />

                  <Input
                    size="sm"
                    type="email"
                    label="E-mail"
                    value={profileSettings.email}
                    disabled
                    readOnly
                    description="Para alterar o e-mail, fale com a produção."
                  />

                  <Input
                    size="sm"
                    type="tel"
                    label="Telefone"
                    value={profileSettings.phone}
                    onChange={(e) => setProfileSettings({ ...profileSettings, phone: e.target.value })}
                    placeholder="(11) 98765-4321"
                  />

                  <Input
                    size="sm"
                    label="Localização"
                    value={profileSettings.location}
                    disabled
                    readOnly
                    placeholder="Não informada"
                  />
                </div>

                <Textarea
                  label="Biografia"
                  value={profileSettings.bio}
                  disabled
                  readOnly
                  rows={4}
                  placeholder="Não informada"
                />

                <Input
                  size="sm"
                  type="url"
                  label="Site"
                  value={profileSettings.website}
                  disabled
                  readOnly
                  placeholder="Não informado"
                />

                <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <Info className="h-4 w-4 shrink-0" aria-hidden="true" />
                  Localização, biografia e site ainda não podem ser alterados por aqui.
                  <Badge variant="ghost" size="sm">Em breve</Badge>
                </p>

                {/* Especialidades */}
                <div>
                  <p className="text-sm font-medium text-foreground mb-2" id="specialties-label">Especialidades</p>
                  {profileSettings.specialties.length > 0 ? (
                    <ul className="flex flex-wrap gap-2 mb-3" aria-labelledby="specialties-label">
                      {profileSettings.specialties.map((specialty, index) => (
                        <li
                          key={`${specialty}-${index}`}
                          className="inline-flex items-center gap-1 pl-3 pr-1 py-1 bg-primary/10 text-primary rounded-full text-sm"
                        >
                          {specialty}
                          <button
                            type="button"
                            onClick={() => setProfileSettings({
                              ...profileSettings,
                              specialties: profileSettings.specialties.filter((_, i) => i !== index)
                            })}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-full hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            aria-label={`Remover especialidade: ${specialty}`}
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground mb-3">Nenhuma especialidade cadastrada.</p>
                  )}
                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <Input
                        size="sm"
                        aria-label="Nova especialidade"
                        placeholder="Adicionar especialidade..."
                        value={newSpecialty}
                        onChange={(e) => setNewSpecialty(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addSpecialty();
                          }
                        }}
                      />
                    </div>
                    <Button size="sm" variant="outline" onClick={addSpecialty} disabled={!newSpecialty.trim()} leftIcon={<Plus className="h-4 w-4" />}>
                      Adicionar
                    </Button>
                  </div>
                </div>
              </div>
            </SimpleCard>
            {saveButton('Salvar perfil')}
          </CollaboratorTabPanel>
        )}

        {/* Aba Segurança */}
        {activeTab === 'security' && (
          <CollaboratorTabPanel idBase="config" id="security" className="space-y-6">
            <SimpleCard title="Alterar senha">
              <div className="space-y-4">
                <Input
                  size="sm"
                  type="password"
                  showPasswordToggle
                  label="Senha atual"
                  autoComplete="current-password"
                  value={securitySettings.currentPassword}
                  onChange={(e) => setSecuritySettings({ ...securitySettings, currentPassword: e.target.value })}
                  placeholder="Digite sua senha atual"
                />
                <Input
                  size="sm"
                  type="password"
                  showPasswordToggle
                  label="Nova senha"
                  autoComplete="new-password"
                  value={securitySettings.newPassword}
                  onChange={(e) => setSecuritySettings({ ...securitySettings, newPassword: e.target.value })}
                  placeholder="Mínimo de 8 caracteres"
                  description={PASSWORD_HINT}
                />
                <Input
                  size="sm"
                  type="password"
                  label="Confirmar nova senha"
                  autoComplete="new-password"
                  value={securitySettings.confirmPassword}
                  onChange={(e) => setSecuritySettings({ ...securitySettings, confirmPassword: e.target.value })}
                  placeholder="Repita a nova senha"
                  error={passwordError ?? undefined}
                />
              </div>
            </SimpleCard>

            {/* Achado (auditoria): "Ativar 2FA — camada extra de segurança" e "Notificações de login"
                só gravavam uma preferência; a plataforma não tem 2FA nem envia alerta de login. */}
            <SimpleCard
              title="Segurança adicional"
              headerRight={<Badge variant="ghost">Em breve</Badge>}
            >
              <div className="space-y-2">
                <ToggleSwitch
                  label="Autenticação de dois fatores"
                  description="Ainda não disponível na plataforma."
                  checked={false}
                  disabled
                  onChange={() => undefined}
                />
                <ToggleSwitch
                  label="Alertas de login"
                  description="Ainda não disponível na plataforma."
                  checked={false}
                  disabled
                  onChange={() => undefined}
                />
              </div>
            </SimpleCard>
            {saveButton('Alterar senha')}
          </CollaboratorTabPanel>
        )}

        {/* Aba Privacidade. D4 (aprovada em 02/11/2026): as chaves "Mostrar e-mail", "Mostrar telefone"
            etc. não faziam nada (nenhuma tela as lia). Agora o texto diz quem vê o quê, que é o que o
            servidor de fato aplica. */}
        {activeTab === 'privacy' && (
          <CollaboratorTabPanel idBase="config" id="privacy" className="space-y-6">
            <SimpleCard title="Quem vê seus dados">
              <ul className="list-disc space-y-3 pl-5 text-sm text-foreground">
                <li>A administração da X Produções vê seu cadastro completo: nome, contato, função, valor combinado e seus eventos.</li>
                <li>Os colegas escalados no mesmo evento veem só seu nome, foto, função, horário e situação na escala. Seu telefone e seu e-mail não aparecem para eles.</li>
                <li>Clientes não veem seus dados.</li>
                {/* D20 (aprovada em 02/11/2026): o chat do evento é só da equipe; o cliente só volta a ele com a
                    chave do chat da reserva ligada (VITE_CLIENT_BOOKING_CHAT_ENABLED). */}
                <li>
                  {import.meta.env.VITE_CLIENT_BOOKING_CHAT_ENABLED === 'true'
                    ? 'No chat do evento, o cliente da reserva também lê e escreve.'
                    : 'O chat do evento é só da equipe: os colegas escalados e a administração. O cliente não lê nem escreve nele.'}
                </li>
                <li>No Roteiro, você vê o que precisa para trabalhar: endereço, horários, contato do local, rider, tarefas e o seu cachê. Dados e valores do cliente não aparecem.</li>
              </ul>
            </SimpleCard>
            {/* D8c (aprovada em 02/11/2026), parte 2: baixar os dados e excluir a conta ficam na página LGPD, a mesma
                do cliente (a exclusão fica adiada enquanto houver escala ativa num evento futuro ou pagamento pendente). */}
            <SimpleCard title="Seus dados (LGPD)">
              <p className="text-sm text-foreground">
                Para baixar uma cópia dos seus dados ou excluir a sua conta, use a{' '}
                <Link to="/lgpd" className="font-semibold text-primary underline-offset-4 hover:underline">
                  página LGPD
                </Link>
                .
              </p>
            </SimpleCard>
          </CollaboratorTabPanel>
        )}

        {/* Aba Pagamento */}
        {activeTab === 'payment' && paymentSettings && (
          <CollaboratorTabPanel idBase="config" id="payment" className="space-y-6">
            <SimpleCard title="Configurações de pagamento">
              <div className="space-y-6">
                <Select
                  size="sm"
                  label="Método preferido"
                  options={PAYMENT_METHOD_OPTIONS}
                  value={paymentSettings.preferredMethod}
                  onChange={(e) => setPaymentSettings({
                    ...paymentSettings,
                    preferredMethod: e.target.value as 'pix' | 'bank_transfer' | 'both'
                  })}
                />

                <Input
                  size="sm"
                  label="Chave PIX"
                  value={paymentSettings.pixKey}
                  onChange={(e) => setPaymentSettings({ ...paymentSettings, pixKey: e.target.value })}
                  placeholder="E-mail, CPF, telefone ou chave aleatória"
                />

                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-foreground">Dados bancários</h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      size="sm"
                      label="Banco"
                      value={paymentSettings.bankAccount.bank}
                      onChange={(e) => setPaymentSettings({
                        ...paymentSettings,
                        bankAccount: { ...paymentSettings.bankAccount, bank: e.target.value }
                      })}
                      placeholder="Nome do banco"
                    />
                    <Input
                      size="sm"
                      label="Agência"
                      value={paymentSettings.bankAccount.agency}
                      onChange={(e) => setPaymentSettings({
                        ...paymentSettings,
                        bankAccount: { ...paymentSettings.bankAccount, agency: e.target.value }
                      })}
                      placeholder="Número da agência"
                    />
                    <Input
                      size="sm"
                      label="Conta"
                      value={paymentSettings.bankAccount.account}
                      onChange={(e) => setPaymentSettings({
                        ...paymentSettings,
                        bankAccount: { ...paymentSettings.bankAccount, account: e.target.value }
                      })}
                      placeholder="Número da conta"
                    />
                    <Select
                      size="sm"
                      label="Tipo de conta"
                      options={ACCOUNT_TYPE_OPTIONS}
                      value={paymentSettings.bankAccount.accountType}
                      onChange={(e) => setPaymentSettings({
                        ...paymentSettings,
                        bankAccount: { ...paymentSettings.bankAccount, accountType: e.target.value as 'corrente' | 'poupanca' }
                      })}
                    />
                  </div>
                </div>
              </div>
            </SimpleCard>
            {saveButton('Salvar pagamento')}
          </CollaboratorTabPanel>
        )}
      </div>
    );
  };

  return (
    <CollaboratorLayout title="Configurações" breadcrumbs={BREADCRUMBS}>
      {renderContent()}
    </CollaboratorLayout>
  );
};

export default CollaboratorSettingsPage;
