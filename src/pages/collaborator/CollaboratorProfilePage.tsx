import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Edit,
  Star,
  MapPin,
  Settings,
  Award,
  Upload,
  Camera,
  Loader2
} from 'lucide-react';
import { CollaboratorLayout } from '../../components/collaborator/CollaboratorLayout';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { collaboratorProfileAPI } from '../../services/api';
import { BrandLoader } from '@/components/ui/BrandLoader';
import { useNotifications } from '@/contexts/NotificationContext';
import { GoogleCalendarIntegration } from '../../components/GoogleCalendarIntegration';

const CollaboratorProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { addNotification } = useNotifications();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [profile, setProfile] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'portfolio' | 'reviews' | 'settings'>('overview');
  const [uploading, setUploading] = useState(false);

  // Form states
  const [editMode, setEditMode] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const response = await collaboratorProfileAPI.getMyProfile();
      const data = response?.data || null;
      setProfile(data);

      // Initialize form data with safe defaults
      setFormData({
        phone: data?.phone || '',
        experience: data?.experience || '',
        hourlyRate: data?.hourlyRate ?? '',
        workingRadius: data?.workingRadius ?? '',
        languages: data?.languages || [],
        specialties: data?.specialties || [],
        equipment: data?.equipment || [],
        certifications: data?.certifications || [],
        bio: data?.user?.bio || '',
        location: data?.user?.location || '',
        website: data?.user?.website || ''
      });
    } catch (error) {
      console.error('Erro ao carregar perfil:', error);
      // manter UX leve: mostra alerta mínimo
      addNotification({
        type: 'error',
        title: 'Erro',
        message: 'Não foi possível carregar o perfil.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      await collaboratorProfileAPI.updateProfile(formData);
      await loadProfile();
      setEditMode(false);
      addNotification({
        type: 'success',
        title: 'Sucesso',
        message: 'Perfil atualizado com sucesso!'
      });
    } catch (error) {
      console.error('Erro ao salvar perfil:', error);
      addNotification({
        type: 'error',
        title: 'Erro',
        message: 'Não foi possível salvar as alterações.'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploading(true);
      try {
        const formData = new FormData();
        formData.append('avatar', file);
        
        await collaboratorProfileAPI.uploadAvatar(formData);
        await loadProfile(); // Recarrega o perfil para mostrar a nova foto
      } catch (error) {
        console.error('Erro no upload:', error);
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

  const renderStars = (rating: number = 0) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
      />
    ));
  };

  // Loading state
  if (loading) {
    return (
      <CollaboratorLayout
        title="Perfil do Colaborador"
        breadcrumbs={[{ name: 'Colaborador', href: '/colaborador' }, { name: 'Perfil' }]}
      >
        <div className="flex items-center justify-center min-h-96">
          <BrandLoader size={120} label="Carregando perfil..." />
        </div>
      </CollaboratorLayout>
    );
  }

  // If profile is missing
  if (!profile || !profile.user) {
    return (
      <CollaboratorLayout
        title="Perfil do Colaborador"
        breadcrumbs={[{ name: 'Colaborador', href: '/colaborador' }, { name: 'Perfil' }]}
      >
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Perfil não encontrado</h2>
          <p className="text-gray-600 mb-6">Não foi possível carregar seu perfil de colaborador.</p>
          <Button onClick={() => navigate('/painel')}>Voltar ao Painel</Button>
        </div>
      </CollaboratorLayout>
    );
  }

  // Main render
  return (
    <CollaboratorLayout
      title="Perfil do Colaborador"
      breadcrumbs={[{ name: 'Colaborador', href: '/colaborador' }, { name: 'Perfil' }]}
    >
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-start space-x-6">
          <div className="relative">
            <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center">
              <User className="w-12 h-12 text-gray-400" />
            </div>
            <label className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full cursor-pointer hover:bg-blue-700 transition-colors">
              <input type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
            </label>
          </div>

          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-3xl font-bold text-gray-900">{profile.user?.name || 'Nome não disponível'}</h1>
              <Button
                variant={editMode ? 'primary' : 'outline'}
                onClick={() => {
                  if (editMode) handleSaveProfile();
                  else setEditMode(true);
                }}
                disabled={saving}
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : editMode ? (
                  'Salvar'
                ) : (
                  <>
                    <Edit className="w-4 h-4 mr-2" />
                    Editar Perfil
                  </>
                )}
              </Button>
            </div>

            <div className="flex items-center space-x-4 mb-4">
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm capitalize">
                {String(profile.collaboratorRole || '').toLowerCase().replace('_', ' ')}
              </span>

              <div className="flex items-center space-x-1">
                {renderStars(Math.round(profile.averageRating || 0))}
                <span className="text-sm text-gray-600 ml-1">({(profile.averageRating ?? 0).toFixed(1)})</span>
              </div>

              <div className="flex items-center text-sm text-gray-600">
                <MapPin className="w-4 h-4 mr-1" />
                {profile.user?.location || 'Localização não informada'}
              </div>
            </div>

              <div className="bg-white rounded-lg p-6 border shadow-sm space-y-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4 text-center">Estatísticas</h3>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{profile.totalEvents ?? 0}</div>
                    <div className="text-sm font-medium text-gray-600 mt-1">Eventos Totais</div>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{profile.completedEvents ?? 0}</div>
                    <div className="text-sm font-medium text-gray-600 mt-1">Concluídos</div>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold text-indigo-600">R$ {(Number(profile.totalEarnings) || 0).toFixed(2)}</div>
                    <div className="text-sm font-medium text-gray-600 mt-1">Total Ganho</div>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">R$ {(Number(profile.hourlyRate) || 0).toFixed(2)}/h</div>
                    <div className="text-sm font-medium text-gray-600 mt-1">Valor/Hora</div>
                  </div>
                </div>
              </div>

            {profile.user?.bio && <p className="text-gray-700">{profile.user.bio}</p>}
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="bg-white rounded-lg shadow-sm border mt-6">
        <div className="border-b border-gray-200">
          <nav className="flex">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-6 py-3 text-sm font-medium border-b-2 ${
                activeTab === 'overview' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Visão Geral
            </button>
            <button
              onClick={() => setActiveTab('portfolio')}
              className={`px-6 py-3 text-sm font-medium border-b-2 ${
                activeTab === 'portfolio' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Portfólio
            </button>
            <button
              onClick={() => setActiveTab('reviews')}
              className={`px-6 py-3 text-sm font-medium border-b-2 ${
                activeTab === 'reviews' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Avaliações
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-6 py-3 text-sm font-medium border-b-2 ${
                activeTab === 'settings' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Configurações
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Informações Pessoais */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                    <Settings className="w-5 h-5 mr-2" /> Informações Pessoais
                  </h3>

                  {editMode ? (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Biografia</label>
                        <Textarea value={formData.bio || ''} onChange={(e) => setFormData({ ...formData, bio: e.target.value })} placeholder="Conte um pouco sobre você..." rows={3} />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Localização</label>
                        <Input value={formData.location || ''} onChange={(e) => setFormData({ ...formData, location: e.target.value })} placeholder="Cidade, Estado" />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                        <Input value={formData.website || ''} onChange={(e) => setFormData({ ...formData, website: e.target.value })} placeholder="https://seu-site.com" />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <span className="font-medium">Email:</span> {profile.user?.email}
                      </div>
                      <div>
                        <span className="font-medium">Telefone:</span> {profile.phone || 'Não informado'}
                      </div>
                      <div>
                        <span className="font-medium">Localização:</span> {profile.user?.location || 'Não informada'}
                      </div>
                      <div>
                        <span className="font-medium">Website:</span>{' '}
                        {profile.user?.website ? (
                          <a href={profile.user.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                            {profile.user.website}
                          </a>
                        ) : (
                          'Não informado'
                        )}

                        {profile.user?.bio && (
                          <div>
                            <span className="font-medium">Biografia:</span>
                            <p className="mt-1 text-gray-700">{profile.user.bio}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Especialidades e Habilidades */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                    <Award className="w-5 h-5 mr-2" /> Especialidades e Habilidades
                  </h3>

                  <div className="space-y-3">
                    <div>
                      <span className="font-medium">Função:</span>
                      <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm capitalize">{String(profile.collaboratorRole || '').toLowerCase().replace('_', ' ')}</span>
                    </div>

                    <div>
                      <span className="font-medium">Especialidades:</span>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {(profile.specialties || []).map((specialty: string, index: number) => (
                          <span key={index} className="px-2 py-1 bg-gray-200 text-gray-800 rounded text-sm">{specialty}</span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <span className="font-medium">Equipamentos:</span>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {(profile.equipment || []).map((item: string, index: number) => (
                          <span key={index} className="px-2 py-1 bg-gray-200 text-gray-800 rounded text-sm">{item}</span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <span className="font-medium">Certificações:</span>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {(profile.certifications || []).map((cert: string, index: number) => (
                          <span key={index} className="px-2 py-1 bg-gray-200 text-gray-800 rounded text-sm">{cert}</span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <span className="font-medium">Idiomas:</span>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {(profile.languages || []).map((lang: string, index: number) => (
                          <span key={index} className="px-2 py-1 bg-gray-200 text-gray-800 rounded text-sm">{lang}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'portfolio' && (
            <div className="text-center py-12">
              <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Portfólio em Desenvolvimento</h3>
              <p className="text-gray-600 mb-4">Esta funcionalidade estará disponível em breve.</p>
              <Button>
                <Upload className="w-4 h-4 mr-2" /> Adicionar Projeto
              </Button>
            </div>
          )}

          {activeTab === 'reviews' && (
            <div className="text-center py-12">
              <Star className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Avaliações em Desenvolvimento</h3>
              <p className="text-gray-600">Suas avaliações aparecerão aqui após concluir eventos.</p>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-6">Configurações Profissionais</h3>

              {/* Integrações */}
              {!editMode && profile && (
                 <div className="mb-8 bg-white rounded-lg shadow-sm overflow-hidden">
                    <GoogleCalendarIntegration googleCalendarEmail={profile.user?.googleCalendarEmail} />
                 </div>
              )}

              {editMode ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Valor por Hora (R$)</label>
                      <Input type="number" value={formData.hourlyRate || ''} onChange={(e) => setFormData({ ...formData, hourlyRate: parseFloat(e.target.value) || 0 })} placeholder="0.00" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Raio de Atuação (km)</label>
                      <Input type="number" value={formData.workingRadius || ''} onChange={(e) => setFormData({ ...formData, workingRadius: parseInt(e.target.value) || 0 })} placeholder="50" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Experiência</label>
                    <Textarea value={formData.experience || ''} onChange={(e) => setFormData({ ...formData, experience: e.target.value })} placeholder="Descreva sua experiência profissional..." rows={3} />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Idiomas (separados por vírgula)</label>
                    <Input value={formData.languages?.join(', ') || ''} onChange={(e) => setFormData({ ...formData, languages: e.target.value.split(',').map((lang: string) => lang.trim()).filter(Boolean) })} placeholder="Português, Inglês, Espanhol" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Equipamentos (separados por vírgula)</label>
                    <Input value={formData.equipment?.join(', ') || ''} onChange={(e) => setFormData({ ...formData, equipment: e.target.value.split(',').map((item: string) => item.trim()).filter(Boolean) })} placeholder="Câmera DSLR, Microfone, Luz LED" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Certificações (separadas por vírgula)</label>
                    <Input value={formData.certifications?.join(', ') || ''} onChange={(e) => setFormData({ ...formData, certifications: e.target.value.split(',').map((cert: string) => cert.trim()).filter(Boolean) })} placeholder="Curso de Fotografia, Técnico em Áudio" />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <span className="font-medium">Valor por Hora:</span> R$ {(profile.hourlyRate ?? 0).toFixed(2)}
                    </div>
                    <div>
                      <span className="font-medium">Raio de Atuação:</span> {profile.workingRadius ? `${profile.workingRadius} km` : 'Não informado'}
                    </div>
                  </div>

                  {profile.experience && (
                    <div>
                      <span className="font-medium">Experiência:</span>
                      <p className="mt-1 text-gray-700">{profile.experience}</p>
                    </div>
                  )}

                  {Array.isArray(profile.languages) && profile.languages.length > 0 && (
                    <div>
                      <span className="font-medium">Idiomas:</span>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {profile.languages.map((lang: string, index: number) => (
                          <span key={index} className="px-2 py-1 bg-gray-200 text-gray-800 rounded text-sm">{lang}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {Array.isArray(profile.equipment) && profile.equipment.length > 0 && (
                    <div>
                      <span className="font-medium">Equipamentos:</span>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {profile.equipment.map((item: string, index: number) => (
                          <span key={index} className="px-2 py-1 bg-gray-200 text-gray-800 rounded text-sm">{item}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {Array.isArray(profile.certifications) && profile.certifications.length > 0 && (
                    <div>
                      <span className="font-medium">Certificações:</span>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {profile.certifications.map((cert: string, index: number) => (
                          <span key={index} className="px-2 py-1 bg-gray-200 text-gray-800 rounded text-sm">{cert}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </CollaboratorLayout>
  );
};

export default CollaboratorProfilePage;