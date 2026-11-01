import React, { useRef, useState } from 'react';
import { Camera, Shield, Star, MapPin, Calendar, Edit3, X, User, Loader2 } from 'lucide-react';
import { Button, Badge, Card } from '../../../components/ui/StandardComponents';
import { ClientProfile } from '../../../types/types';

interface ProfileHeaderProps {
  profile: ClientProfile;
  editMode: boolean;
  setEditMode: (mode: boolean) => void;
  uploadingAvatar: boolean;
  handleAvatarChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  formatCurrency: (value: number) => string;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  profile,
  editMode,
  setEditMode,
  uploadingAvatar,
  handleAvatarChange,
  formatCurrency
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isSafeAvatar = (url: string) => {
    if (!url) return false;
    const allowedDomains = [
      /^https:\/\/res\.cloudinary\.com\//,
      /^https:\/\/s3\.[^/]+\.amazonaws\.com\//,
      /^https:\/\/cdn\.[^/]+\./,
      /^https:\/\/lh3\.googleusercontent\.com\//,
      /^https:\/\/graph\.facebook\.com\//,
      /^https:\/\/platform-lookaside\.fbsbx\.com\//,
    ];
    return allowedDomains.some((re) => re.test(url));
  };

  // URL que falhou ao carregar (guardar a URL, não um booleano, faz uma foto nova voltar a aparecer).
  const [failedAvatarUrl, setFailedAvatarUrl] = useState<string | null>(null);
  const setAvatarFailed = (failed: boolean) => setFailedAvatarUrl(failed ? profile.avatarUrl ?? null : null);
  const showAvatar = Boolean(
    profile.avatarUrl && isSafeAvatar(profile.avatarUrl) && failedAvatarUrl !== profile.avatarUrl
  );

  return (
    <Card className="mb-8 overflow-hidden">
      {/* Cover Background */}
      <div className="h-32 bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20"></div>
      
      {/* Profile Info */}
      <div className="px-6 pb-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:space-x-6 -mt-16">
          {/* Avatar container */}
          <div className="relative w-32 shrink-0">
            {/* Anel no token do card (antes: border-white bg-white — anel branco no tema escuro) */}
            <div className="relative w-32 h-32 rounded-full border-4 border-card bg-card shadow-lg overflow-hidden">
              {showAvatar ? (
                <img
                  src={profile.avatarUrl}
                  alt={profile.name || 'Avatar'}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  // Antes trocava pela logo do Vite (/vite.svg); agora cai no ícone padrão.
                  onError={() => setAvatarFailed(true)}
                />
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center">
                  <User className="h-12 w-12 text-muted-foreground" aria-hidden="true" />
                </div>
              )}

              {uploadingAvatar && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center" role="status">
                  <Loader2 className="h-6 w-6 animate-spin text-white" aria-hidden="true" />
                  <span className="sr-only">Enviando foto…</span>
                </div>
              )}
            </div>

            {/* Achado: o upload era uma <div onClick> que só aparecia no hover — sem teclado e invisível
                no toque. Agora é um botão sempre visível, com nome acessível. */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
              aria-label="Alterar foto de perfil"
              title="Alterar foto de perfil"
              className="absolute bottom-0 right-0 flex h-11 w-11 items-center justify-center rounded-full border-4 border-card bg-primary text-primary-foreground shadow-md transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50"
            >
              <Camera className="h-4 w-4" aria-hidden="true" />
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              tabIndex={-1}
              onChange={handleAvatarChange}
              aria-label="Enviar foto de perfil"
            />
          </div>

          {/* Profile Info Text */}
          <div className="flex-1 min-w-0 mt-4 sm:mt-0">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-2xl font-bold text-foreground break-words">{profile.name}</h2>
                  {profile.verified && (
                    <Badge variant="success" size="sm">
                      <Shield className="h-3 w-3 mr-1" aria-hidden="true" />
                      Verificado
                    </Badge>
                  )}
                  {profile.isVip && (
                    <Badge variant="primary" size="sm">
                      <Star className="h-3 w-3 mr-1 text-warning" aria-hidden="true" />
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
              
              <div className="shrink-0">
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
            <div className="flex flex-wrap items-center gap-6 mt-4">
              <div className="text-center">
                <div className="text-xl font-bold text-foreground">{profile.totalBookings}</div>
                <div className="text-sm text-muted-foreground">Reservas</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-foreground">{formatCurrency(profile.totalSpent)}</div>
                <div className="text-sm text-muted-foreground">Total Gasto</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};
