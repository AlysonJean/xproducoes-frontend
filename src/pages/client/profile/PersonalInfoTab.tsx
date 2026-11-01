import React from 'react';
import { Mail, Phone, MapPin, Building2, Globe, Save } from 'lucide-react';
import { Card, Grid, Input, Textarea, Select, Button } from '../../../components/ui/StandardComponents';
import { ClientProfile, ProfileFormData } from '../../../types/types';

interface PersonalInfoTabProps {
  profile: ClientProfile;
  formData: ProfileFormData;
  setFormData: (data: ProfileFormData) => void;
  editMode: boolean;
  saving: boolean;
  handleSaveProfile: () => void;
  isSafeWebsite: (url: string) => boolean;
  openWebsite: (url: string) => void;
}

export const PersonalInfoTab: React.FC<PersonalInfoTabProps> = ({
  profile,
  formData,
  setFormData,
  editMode,
  saving,
  handleSaveProfile,
  isSafeWebsite,
  openWebsite
}) => {
  return (
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
              isLoading={saving}
            >
              Salvar
            </Button>
          )}
        </div>
        
        <div className="space-y-6">
          <Grid columns={{ sm: 1, md: 2 }} gap={4}>
            {/* Nome */}
            <Input
              label="Nome completo"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              readOnly={!editMode}
              className={!editMode ? 'bg-transparent border-none px-0' : ''}
            />
            
            {/* E-mail (somente leitura: texto, não um <label> solto sem campo) */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">E-mail</p>
              <div className="flex min-w-0 items-center gap-2 py-2">
                <Mail className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <span className="text-foreground break-all">{profile.email}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Para alterar o e-mail, entre em contato com o suporte
              </p>
            </div>
            
            {/* Telefone */}
            <Input
              label="Telefone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              leftIcon={<Phone className="h-4 w-4" />}
              placeholder="(31) 99999-9999"
              autoComplete="tel"
              readOnly={!editMode}
              className={!editMode ? 'bg-transparent border-none px-0' : ''}
              helperText={!editMode && !profile.phone ? 'Não informado' : ''}
            />
            
            {/* Localização */}
            <Input
              label="Localização"
              value={formData.location}
              maxLength={100}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              leftIcon={<MapPin className="h-4 w-4" />}
              placeholder="Belo Horizonte, MG"
              readOnly={!editMode}
              className={!editMode ? 'bg-transparent border-none px-0' : ''}
              helperText={!editMode && !profile.location ? 'Não informado' : ''}
            />
          </Grid>
          
          {/* Bio */}
          <Textarea
            label="Sobre você"
            value={formData.bio}
            maxLength={500}
            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
            placeholder="Conte um pouco sobre você..."
            readOnly={!editMode}
            className={!editMode ? 'bg-transparent border-none px-0 min-h-0 resize-none' : ''}
            rows={editMode ? 4 : 2}
          />
          
          {/* Informações Profissionais */}
          <div className="border-t border-border pt-6">
            <h4 className="text-base font-medium text-foreground mb-4">Informações Profissionais</h4>
            
            <Grid columns={{ sm: 1, md: 2 }} gap={4}>
              {/* Empresa */}
              <Input
                label="Empresa"
                value={formData.companyName}
                maxLength={120}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                leftIcon={<Building2 className="h-4 w-4" />}
                placeholder="Nome da empresa"
                readOnly={!editMode}
                className={!editMode ? 'bg-transparent border-none px-0' : ''}
              />
              
              {/* Cargo */}
              <Input
                label="Cargo"
                value={formData.jobTitle}
                maxLength={120}
                onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                placeholder="Seu cargo"
                readOnly={!editMode}
                className={!editMode ? 'bg-transparent border-none px-0' : ''}
              />
              
              {/* Setor */}
            <Select
              label="Setor de atividade"
              value={formData.industry}
              onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
              disabled={!editMode}
              className={!editMode ? 'bg-transparent border-none px-0 appearance-none pointer-events-none' : ''}
                options={[
                  { value: '', label: 'Selecionar setor' },
                  { value: 'events', label: 'Eventos' },
                  { value: 'marketing', label: 'Marketing' },
                  { value: 'media', label: 'Mídia e Comunicação' },
                  { value: 'production', label: 'Produção Audiovisual' },
                  { value: 'technology', label: 'Tecnologia' },
                  { value: 'education', label: 'Educação' },
                  { value: 'corporate', label: 'Corporativo' },
                  { value: 'entertainment', label: 'Entretenimento' },
                  { value: 'other', label: 'Outro' },
                ]}
              />
              
              {/* Site */}
              {editMode ? (
                <Input
                  label="Site"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  placeholder="https://www.exemplo.com"
                  inputMode="url"
                  autoComplete="url"
                  leftIcon={<Globe className="h-4 w-4" />}
                />
              ) : (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">Site</p>
                  <div className="flex min-w-0 items-center py-2 h-12">
                    <Globe className="h-4 w-4 shrink-0 text-muted-foreground mr-2" aria-hidden="true" />
                    {profile.website ? (() => {
                      const safe = isSafeWebsite(profile.website);
                      if (!safe) return <span className="text-foreground">Site inválido</span>;
                      try {
                        const u = new URL(profile.website || '');
                        const display = `${u.hostname}${u.pathname && u.pathname !== '/' ? u.pathname.replace(/\/$/, '') : ''}`;
                        const short = display.length > 40 ? display.slice(0, 37) + '...' : display;
                        return (
                          // <button> (antes <a href="#">): ação, não navegação para "#".
                          <button
                            type="button"
                            onClick={() => openWebsite(u.toString())}
                            className="min-w-0 truncate rounded-sm text-left text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            {short}
                          </button>
                        );
                      } catch { return <span className="text-foreground">Site inválido</span>; }
                    })() : <span className="text-muted-foreground italic">Não informado</span>}
                  </div>
                </div>
              )}
            </Grid>
          </div>
        </div>
      </div>
    </Card>
  );
};
