import React, { useRef } from 'react';
import { Camera, Shield, Star, MapPin, Calendar, Edit3, X, User } from 'lucide-react';
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

  return (
    <Card className="mb-8 overflow-hidden">
      {/* Cover Background */}
      <div className="h-32 bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20"></div>
      
      {/* Profile Info */}
      <div className="px-6 pb-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:space-x-6 -mt-16">
          {/* Avatar container */}
          <div className="relative group">
            <div className="w-32 h-32 rounded-full border-4 border-white bg-white shadow-lg overflow-hidden">
              {profile.avatarUrl && isSafeAvatar(profile.avatarUrl) ? (
                <img
                  src={profile.avatarUrl}
                  alt={profile.name || 'Avatar'}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  onError={(e) => { (e.target as HTMLImageElement).src = '/vite.svg'; }}
                />
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center">
                  <User className="h-12 w-12 text-muted-foreground" />
                </div>
              )}
              
              {/* Upload overlay */}
              <div 
                className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
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
          
          {/* Profile Info Text */}
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
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};
