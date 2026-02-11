import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNotifications } from '@/contexts/NotificationContext';
import { apiFetch } from '../../services/api';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { 
  Button, 
  Card, 
  Modal, 
  ConfirmModal, 
  Input,
  Badge,
  Grid
} from '../../components/ui/StandardComponents';
import { BrandLoader } from '../../components/ui/BrandLoader';
import { 
  Plus, 
  Trash2, 
  Handshake, 
  TrendingUp, 
  Activity,
  Search,
  XCircle,
  MoreHorizontal,
  CloudUpload
} from 'lucide-react';

interface SponsorLogo {
    id: string;
    name: string;
    imageUrl: string;
}

export const AdminSponsorPage = () => {
    const { addNotification } = useNotifications();
    const [sponsors, setSponsors] = useState<SponsorLogo[]>([]);
    const [loading, setLoading] = useState(true);
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [idToDelete, setIdToDelete] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Form state
    const [newName, setNewName] = useState('');
    const [newFile, setNewFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    const fetchSponsors = useCallback(async () => {
        try {
            setLoading(true);
            const data = await apiFetch<SponsorLogo[]>('/admin/sponsors');
            setSponsors(data || []);
        } catch (err) {
            console.error(err);
            addNotification({ type: 'error', title: 'Falha Técnica', message: 'Erro ao sincronizar portfólio de patrocinadores.' });
        } finally {
            setLoading(false);
        }
    }, [addNotification]);

    useEffect(() => {
        fetchSponsors();
    }, [fetchSponsors]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setNewFile(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newFile || !newName) return;

        try {
            setUploading(true);
            const formData = new FormData();
            formData.append('name', newName);
            formData.append('logo', newFile);

            await apiFetch('/admin/sponsors', {
                method: 'POST',
                body: formData
            });

            addNotification({ type: 'success', title: 'Ativo Registrado', message: 'O patrocinador foi adicionado à galeria.' });
            setIsFormModalOpen(false);
            setNewName('');
            setNewFile(null);
            setPreviewUrl(null);
            fetchSponsors();
        } catch (err) {
            console.error(err);
            addNotification({ type: 'error', title: 'Erro de Upload', message: 'Não foi possível processar a imagem.' });
        } finally {
            setUploading(false);
        }
    };

    const handleDeleteClick = (id: string) => {
        setIdToDelete(id);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!idToDelete) return;
        try {
            setIsDeleting(true);
            await apiFetch(`/admin/sponsors/${idToDelete}`, { method: 'DELETE' });
            setSponsors(prev => prev.filter(s => s.id !== idToDelete));
            addNotification({ type: 'success', title: 'Registro Expurgado', message: 'Patrocinador removido do ecossistema.' });
            setIsDeleteModalOpen(false);
        } catch {
            addNotification({ type: 'error', title: 'Falha na Exclusão', message: 'Erro ao tentar remover o registro.' });
        } finally {
            setIsDeleting(false);
            setIdToDelete(null);
        }
    };

    const filteredSponsors = useMemo(() => {
        return sponsors.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [sponsors, searchTerm]);

    const stats = useMemo(() => ({
      total: sponsors.length,
      impact: 'Consolidado',
      activeStatus: 'Estável'
    }), [sponsors]);

    if (loading && sponsors.length === 0) {
        return (
            <AdminLayout title="Patrocinadores" breadcrumbs={[{ name: 'Admin' }, { name: 'Parceiros' }]}>
                <div className="flex flex-col items-center justify-center min-h-[400px]">
                    <BrandLoader size={120} label="Catalogando alianças estratégicas..." />
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout title="Patrocinadores" breadcrumbs={[{ name: 'Admin' }, { name: 'Parceiros' }]}>
            <div className="space-y-6">
                {/* Header Section */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20">
                      <Handshake className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-foreground">Gestão de Patrocínios</h2>
                      <p className="text-sm text-muted-foreground">Administre as identidades visuais de seus parceiros estratégicos.</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button onClick={() => setIsFormModalOpen(true)} className="gap-2 shadow-lg shadow-primary/20">
                      <Plus className="h-5 w-5" /> Adicionar Parceiro
                    </Button>
                  </div>
                </div>

                {/* Stats Grid */}
                <Grid columns={{ sm: 1, md: 3 }} gap={4}>
                  <Card className="p-4 bg-primary/5 border-primary/10">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                        <Handshake className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none mb-1">Portfólio de Alianças</p>
                        <p className="text-xl font-black text-foreground">{stats.total}</p>
                      </div>
                    </div>
                  </Card>
                  
                  <Card className="p-4 bg-emerald-500/5 border-emerald-500/10">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                        <TrendingUp className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none mb-1">Nível de Impacto</p>
                        <p className="text-xl font-black text-foreground">{stats.impact}</p>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-4 bg-blue-500/5 border-blue-500/10">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                        <Activity className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none mb-1">Status da Rede</p>
                        <p className="text-xl font-black text-foreground">{stats.activeStatus}</p>
                      </div>
                    </div>
                  </Card>
                </Grid>

                {/* Filters and Search */}
                <Card className="p-4 bg-card/50 border-border">
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar por nome do patrocinador ou parceiro..."
                        className="pl-10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="icon" onClick={() => setSearchTerm('')} title="Limpar Filtro">
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>

                {/* Sponsors Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                    {filteredSponsors.map(sponsor => (
                        <Card key={sponsor.id} className="p-0 overflow-hidden flex flex-col group border-border hover:border-primary/50 transition-all shadow-sm hover:shadow-md h-full">
                            <div className="p-4 flex flex-col items-center justify-between h-full bg-card group-hover:bg-muted/10 transition-colors">
                                <div className="h-24 w-full flex items-center justify-center p-2 rounded-xl bg-white/5 border border-transparent group-hover:border-border transition-colors">
                                     <img src={sponsor.imageUrl} alt={sponsor.name} className="max-h-full max-w-full object-contain filter grayscale group-hover:grayscale-0 transition-all duration-300" />
                                </div>
                                <div className="mt-4 w-full text-center">
                                    <p className="text-xs font-black text-foreground truncate uppercase tracking-tight">{sponsor.name}</p>
                                    <Badge variant="outline" className="text-[8px] font-black uppercase tracking-tighter mt-1 opacity-50">PATROCINADOR</Badge>
                                </div>
                                
                                <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button 
                                        variant="destructive" 
                                        size="icon" 
                                        className="h-7 w-7 rounded-lg"
                                        onClick={() => handleDeleteClick(sponsor.id)}
                                        title={`Remover ${sponsor.name}`}
                                    >
                                        <Trash2 size={12} />
                                    </Button>
                                    <Button variant="outline" size="icon" className="h-7 w-7 rounded-lg border-transparent">
                                       <MoreHorizontal size={12} className="text-muted-foreground" />
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>

                {filteredSponsors.length === 0 && !loading && (
                    <div className="py-24 text-center border-2 border-dashed border-border rounded-3xl bg-muted/20">
                        <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-muted mb-6 text-muted-foreground/20 ring-8 ring-muted/10">
                            <Handshake className="h-10 w-10" />
                        </div>
                        <h3 className="text-xl font-bold text-foreground">Nenhum parceiro localizado</h3>
                        <p className="text-muted-foreground text-sm max-w-sm mx-auto mt-2">Personalize sua busca ou expanda sua rede de patrocínios cadastrando novos logotipos.</p>
                        <Button onClick={() => setIsFormModalOpen(true)} className="mt-6">Adicionar Parceiro</Button>
                    </div>
                )}
            </div>

            {/* Form Modal */}
            <Modal 
              isOpen={isFormModalOpen} 
              onClose={() => setIsFormModalOpen(false)} 
              title="Cadastrar Nova Aliança"
              size="md"
            >
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-foreground mb-2">Nome Comercial</label>
                        <Input 
                            type="text" 
                            className="w-full"
                            value={newName}
                            onChange={e => setNewName(e.target.value)}
                            required
                            placeholder="Ex: Coca-Cola, Samsung, Heineken..."
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-bold text-foreground mb-2">Identidade Visual (Logotipo PNG/JPG)</label>
                        <div className="border-2 border-dashed border-border rounded-2xl p-8 text-center cursor-pointer hover:bg-primary/5 hover:border-primary/50 transition-all flex flex-col items-center group"
                             onClick={() => document.getElementById('logo-upload')?.click()}>
                            {previewUrl ? (
                                <div className="relative w-full h-32 flex items-center justify-center">
                                    <img src={previewUrl} className="max-h-full max-w-full object-contain" alt="Preview da logo" />
                                    <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                                        <CloudUpload className="text-primary h-8 w-8" />
                                    </div>
                                </div>
                            ) : (
                                <div className="text-muted-foreground flex flex-col items-center">
                                    <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center mb-3 group-hover:bg-primary/10 transition-colors">
                                        <CloudUpload className="h-6 w-6 group-hover:text-primary transition-colors" />
                                    </div>
                                    <span className="text-sm font-bold text-foreground">Clique ou arraste para subir a imagem</span>
                                    <span className="text-[10px] uppercase font-black tracking-widest mt-1 opacity-50">Arquivos Aceitos: .png, .jpg (Fundo Transparente preferencial)</span>
                                </div>
                            )}
                            <input 
                                id="logo-upload"
                                type="file" 
                                accept="image/*" 
                                className="hidden" 
                                title="Selecione o logotipo do patrocinador"
                                onChange={handleFileChange}
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-6 border-t border-border">
                        <Button type="button" variant="outline" onClick={() => setIsFormModalOpen(false)}>Cancelar</Button>
                        <Button type="submit" isLoading={uploading} className="shadow-lg shadow-primary/20">
                            Efetivar Cadastro
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Delete Confirmation Modal */}
            <ConfirmModal
              isOpen={isDeleteModalOpen}
              onClose={() => setIsDeleteModalOpen(false)}
              onConfirm={confirmDelete}
              title="Remover Patrocinador?"
              message="O logotipo deixará de ser exibido nos painéis sociais e murais do evento. Esta ação não poderá ser desfeita para este registro específico."
              variant="danger"
              isLoading={isDeleting}
              confirmText="Confirmar Remoção"
              cancelText="Manter Parceiro"
            />
        </AdminLayout>
    );
};

export default AdminSponsorPage;
