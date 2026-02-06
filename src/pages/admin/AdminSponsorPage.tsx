import { useState, useEffect, useCallback } from 'react';
import { useNotifications } from '@/contexts/NotificationContext';
import { apiFetch } from '../../services/api';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { Button } from '../../components/ui/Button';
import { SimpleCard } from '../../components/ui/Cards';
import { Modal } from '../../components/ui/StandardComponents';
import { Plus, Trash2, Upload } from 'lucide-react';

interface SponsorLogo {
    id: string;
    name: string;
    imageUrl: string;
}

export const AdminSponsorPage = () => {
    const { addNotification } = useNotifications();
    const [sponsors, setSponsors] = useState<SponsorLogo[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [uploading, setUploading] = useState(false);
    
    // Form state
    const [newName, setNewName] = useState('');
    const [newFile, setNewFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    // Use callback to stabilize function reference for useEffect
    const fetchSponsors = useCallback(async () => {
        try {
            const data = await apiFetch<SponsorLogo[]>('/admin/sponsors');
            setSponsors(data || []);
        } catch (err) { // Renamed from error to err to avoid conflict if any, though unused
            console.error(err);
            addNotification({ type: 'error', title: 'Erro', message: 'Falha ao carregar parceiros' });
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

            const token = localStorage.getItem('token');
            const response = await fetch(`${import.meta.env.VITE_API_URL}/admin/sponsors`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            if (!response.ok) throw new Error('Upload failed');

            addNotification({ type: 'success', title: 'Sucesso', message: 'Logo adicionada com sucesso' });
            setIsModalOpen(false);
            setNewName('');
            setNewFile(null);
            setPreviewUrl(null);
            fetchSponsors();
        } catch (err) {
            console.error(err);
            addNotification({ type: 'error', title: 'Erro', message: 'Erro ao fazer upload' });
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja remover este parceiro?')) return;
        try {
            await apiFetch(`/admin/sponsors/${id}`, { method: 'DELETE' });
            setSponsors(prev => prev.filter(s => s.id !== id));
            addNotification({ type: 'success', title: 'Removido', message: 'Parceiro removido.' });
        } catch {
            addNotification({ type: 'error', title: 'Erro', message: 'Falha ao remover' });
        }
    };

    return (
        <AdminLayout title="Galeria de Parceiros" breadcrumbs={[{ name: 'Admin' }, { name: 'Parceiros' }]}>
            <div className="mb-6 flex justify-between items-center">
                <p className="text-muted-foreground">Gerencie as logos de patrocinadores para exibir nos Murais.</p>
                <Button onClick={() => setIsModalOpen(true)} className="gap-2">
                    <Plus size={18} /> Adicionar Parceiro
                </Button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {sponsors.map(sponsor => (
                    <SimpleCard key={sponsor.id} className="p-4 flex flex-col items-center gap-3 relative group">
                        <div className="h-32 w-full flex items-center justify-center bg-muted/20 rounded-md p-2">
                             <img src={sponsor.imageUrl} alt={sponsor.name} className="max-h-full max-w-full object-contain" />
                        </div>
                        <p className="text-sm font-medium truncate w-full text-center">{sponsor.name}</p>
                        
                        <Button 
                            variant="danger" 
                            size="sm" 
                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleDelete(sponsor.id)}
                            aria-label={`Remover ${sponsor.name}`}
                        >
                            <Trash2 size={14} />
                        </Button>
                    </SimpleCard>
                ))}
            </div>

            {sponsors.length === 0 && (
                <div className="text-center py-20 text-muted-foreground bg-muted/10 rounded-lg border border-dashed">
                    Nenhum parceiro cadastrado. Adicione logos para usar nos seus murais.
                </div>
            )}

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Adicionar Patrocinador">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="sponsor-name" className="block text-sm font-medium mb-1">Nome do Parceiro</label>
                        <input 
                            id="sponsor-name"
                            type="text" 
                            className="w-full p-2 border rounded-md bg-transparent"
                            value={newName}
                            onChange={e => setNewName(e.target.value)}
                            required
                            placeholder="Ex: Coca-Cola"
                        />
                    </div>
                    
                    <div>
                        <label htmlFor="logo-upload" className="block text-sm font-medium mb-1">Logotipo (PNG/JPG)</label>
                        <div className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-muted/10 transition"
                             onClick={() => document.getElementById('logo-upload')?.click()}>
                            {previewUrl ? (
                                <img src={previewUrl} className="h-32 mx-auto object-contain" alt="Preview da logo" />
                            ) : (
                                <div className="text-muted-foreground flex flex-col items-center">
                                    <Upload className="mb-2" />
                                    <span>Clique para selecionar imagem</span>
                                </div>
                            )}
                            <input 
                                id="logo-upload"
                                type="file" 
                                accept="image/*" 
                                className="hidden" 
                                onChange={handleFileChange}
                                title="Upload de logo"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                        <Button type="submit" disabled={uploading}>
                            {uploading ? 'Enviando...' : 'Salvar'}
                        </Button>
                    </div>
                </form>
            </Modal>
        </AdminLayout>
    );
};

export default AdminSponsorPage;
