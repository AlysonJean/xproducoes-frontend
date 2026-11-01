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
  Alert,
} from '../../components/ui/StandardComponents';
import { BrandLoader } from '../../components/ui/BrandLoader';
import { logger } from '../../utils/logger';
import {
  Plus,
  Trash2,
  Handshake,
  Search,
  XCircle,
  CloudUpload
} from 'lucide-react';

interface SponsorLogo {
    id: string;
    name: string;
    imageUrl: string;
}

const PAGE_TITLE = 'Patrocinadores';
const BREADCRUMBS = [
  { name: 'Admin', href: '/admin/painel' },
  { name: 'Mural social', href: '/admin/social' },
  { name: 'Patrocinadores' },
];

export const AdminSponsorPage = () => {
    const { addNotification } = useNotifications();
    const [sponsors, setSponsors] = useState<SponsorLogo[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
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
            setLoadError(null);
        } catch (err) {
            // Antes: só toast, e a tela dizia "Nenhum parceiro localizado".
            logger.error('Erro', 'AdminSponsorPage', err);
            setLoadError('Não foi possível carregar os patrocinadores.');
        } finally {
            setLoading(false);
        }
    }, []);

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

            addNotification({ type: 'success', title: 'Patrocinador cadastrado', message: 'O logotipo foi adicionado.' });
            setIsFormModalOpen(false);
            setNewName('');
            setNewFile(null);
            setPreviewUrl(null);
            fetchSponsors();
        } catch (err) {
            logger.error('Erro', 'AdminSponsorPage', err);
            addNotification({ type: 'error', title: 'Erro no envio', message: 'Não foi possível enviar a imagem.' });
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
            addNotification({ type: 'success', title: 'Patrocinador removido', message: 'O logotipo não aparece mais nos murais.' });
            setIsDeleteModalOpen(false);
        } catch {
            addNotification({ type: 'error', title: 'Erro ao remover', message: 'Não foi possível remover o patrocinador.' });
        } finally {
            setIsDeleting(false);
            setIdToDelete(null);
        }
    };

    const filteredSponsors = useMemo(() => {
        return sponsors.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [sponsors, searchTerm]);

    if (loading && sponsors.length === 0) {
        return (
            <AdminLayout title={PAGE_TITLE} breadcrumbs={BREADCRUMBS}>
                <div className="flex flex-col items-center justify-center min-h-[400px]">
                    <BrandLoader size={120} label="Carregando patrocinadores…" />
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout title={PAGE_TITLE} breadcrumbs={BREADCRUMBS}>
            <div className="space-y-6">
                {/* Cabeçalho. Achado (auditoria): os cards "Nível de Impacto: Consolidado" e
                    "Status da Rede: Estável" eram textos fixos — removidos; a contagem fica no selo. */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20">
                      <Handshake className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-xl font-bold text-foreground">Logos de patrocinadores</h2>
                        <Badge variant="primary">{sponsors.length} {sponsors.length === 1 ? 'cadastrado' : 'cadastrados'}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">Logotipos que podem ser exibidos nos murais sociais e no telão.</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={() => setIsFormModalOpen(true)} size="sm" leftIcon={<Plus className="h-4 w-4" />}>
                      Novo patrocinador
                    </Button>
                  </div>
                </div>

                {/* Busca */}
                <Card className="p-4 bg-card/50 border-border">
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Input
                        placeholder="Buscar por nome..."
                        aria-label="Buscar patrocinadores"
                        leftIcon={<Search className="h-4 w-4" />}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-12 w-12 shrink-0"
                      onClick={() => setSearchTerm('')}
                      title="Limpar busca"
                      aria-label="Limpar busca"
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>

                {loadError && (
                  <Alert
                    variant="error"
                    title="Erro ao carregar"
                    description={loadError}
                    action={<Button size="sm" variant="outline" onClick={fetchSponsors}>Tentar de novo</Button>}
                  />
                )}

                {/* Grade de logos */}
                {!(loadError && sponsors.length === 0) && (
                <>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                    {filteredSponsors.map(sponsor => (
                        // `relative`: o botão de excluir é absolute — sem um ancestral posicionado, os botões
                        // de todos os cards iam parar no mesmo canto da página.
                        <Card key={sponsor.id} className="relative p-0 overflow-hidden flex flex-col group border-border hover:border-primary/50 transition-all shadow-sm hover:shadow-md h-full">
                            <div className="p-4 flex flex-col items-center justify-between h-full bg-card group-hover:bg-muted/10 transition-colors">
                                <div className="h-24 w-full flex items-center justify-center p-2 rounded-xl bg-muted/30 border border-transparent group-hover:border-border transition-colors">
                                     <img src={sponsor.imageUrl} alt={sponsor.name} className="max-h-full max-w-full object-contain filter grayscale group-hover:grayscale-0 transition-all duration-300" />
                                </div>
                                <p className="mt-4 w-full text-center text-sm font-bold text-foreground truncate">{sponsor.name}</p>

                                <div className="absolute top-2 right-2 md:opacity-0 md:group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                                    <Button
                                        variant="destructive"
                                        size="icon"
                                        className="h-8 w-8 rounded-lg"
                                        onClick={() => handleDeleteClick(sponsor.id)}
                                        title={`Remover ${sponsor.name}`}
                                        aria-label={`Remover ${sponsor.name}`}
                                    >
                                        <Trash2 size={14} />
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>

                {filteredSponsors.length === 0 && !loading && (
                    <div className="py-24 text-center border-2 border-dashed border-border rounded-3xl bg-muted/20">
                        <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-muted mb-6 text-muted-foreground">
                            <Handshake className="h-10 w-10" />
                        </div>
                        <h3 className="text-xl font-bold text-foreground">Nenhum patrocinador encontrado</h3>
                        <p className="text-muted-foreground text-sm max-w-sm mx-auto mt-2">
                          {searchTerm ? 'Ajuste a busca.' : 'Cadastre o logotipo do primeiro patrocinador.'}
                        </p>
                        {searchTerm ? (
                          <Button variant="outline" size="sm" onClick={() => setSearchTerm('')} className="mt-6">Limpar busca</Button>
                        ) : (
                          <Button size="sm" onClick={() => setIsFormModalOpen(true)} className="mt-6">Novo patrocinador</Button>
                        )}
                    </div>
                )}
                </>
                )}
            </div>

            <Modal
              isOpen={isFormModalOpen}
              onClose={() => setIsFormModalOpen(false)}
              title="Novo patrocinador"
              size="md"
            >
                <form onSubmit={handleSubmit} className="space-y-6">
                    <Input
                        label="Nome do patrocinador"
                        type="text"
                        value={newName}
                        onChange={e => setNewName(e.target.value)}
                        required
                        placeholder="Nome da empresa"
                    />

                    <div className="space-y-2">
                        <span className="block text-sm font-medium text-foreground">Logotipo (PNG ou JPG)</span>
                        {/* Era um <div onClick> que abria um input escondido (display:none) — sem foco por teclado.
                            Agora o próprio <label> é a área clicável e o input fica só visualmente oculto. */}
                        <label
                            htmlFor="logo-upload"
                            className="border-2 border-dashed border-border rounded-2xl p-8 text-center cursor-pointer hover:bg-primary/5 hover:border-primary/50 focus-within:ring-2 focus-within:ring-ring transition-all flex flex-col items-center group"
                        >
                            {previewUrl ? (
                                <div className="relative w-full h-32 flex items-center justify-center">
                                    <img src={previewUrl} className="max-h-full max-w-full object-contain" alt="Prévia do logotipo" />
                                    <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                                        <CloudUpload className="text-primary h-8 w-8" />
                                    </div>
                                </div>
                            ) : (
                                <div className="text-muted-foreground flex flex-col items-center">
                                    <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center mb-3 group-hover:bg-primary/10 transition-colors">
                                        <CloudUpload className="h-6 w-6 group-hover:text-primary transition-colors" />
                                    </div>
                                    <span className="text-sm font-bold text-foreground">Clique para escolher a imagem</span>
                                    <span className="text-xs mt-1">PNG ou JPG, de preferência com fundo transparente</span>
                                </div>
                            )}
                            <input
                                id="logo-upload"
                                type="file"
                                accept="image/*"
                                className="sr-only"
                                aria-label="Logotipo do patrocinador"
                                onChange={handleFileChange}
                            />
                        </label>
                    </div>

                    <div className="flex justify-end gap-3 pt-6 border-t border-border">
                        <Button type="button" variant="outline" onClick={() => setIsFormModalOpen(false)}>Cancelar</Button>
                        <Button type="submit" isLoading={uploading}>
                            Cadastrar
                        </Button>
                    </div>
                </form>
            </Modal>

            <ConfirmModal
              isOpen={isDeleteModalOpen}
              onClose={() => setIsDeleteModalOpen(false)}
              onConfirm={confirmDelete}
              title="Remover patrocinador?"
              message="O logotipo deixará de aparecer nos murais e no telão. Esta ação não pode ser desfeita."
              variant="danger"
              isLoading={isDeleting}
              confirmText="Remover"
              cancelText="Cancelar"
            />
        </AdminLayout>
    );
};

export default AdminSponsorPage;
