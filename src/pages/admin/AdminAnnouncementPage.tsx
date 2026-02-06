import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { socialService, SocialAnnouncement } from '../../services/socialService';
import { Button } from '../../components/ui/Button';
import { SimpleCard } from '../../components/ui/Cards';
import { Plus, Trash, Edit, X, Megaphone } from 'lucide-react';

const AdminAnnouncementPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [announcements, setAnnouncements] = useState<SocialAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SocialAnnouncement | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<SocialAnnouncement>>({
    title: '',
    message: '',
    type: 'TEXT',
    duration: 10,
    frequency: 10,
    isActive: true
  });

  const fetchAnnouncements = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const response = await socialService.getAnnouncements(id);
      setAnnouncements(Array.isArray(response) ? response : response.data || []);
    } catch (error) {
      console.error('Failed to fetch announcements', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  const handleOpenModal = (item?: SocialAnnouncement) => {
    if (item) {
      setEditingItem(item);
      setFormData(item);
    } else {
      setEditingItem(null);
      setFormData({
        title: '',
        message: '',
        type: 'TEXT',
        duration: 10,
        frequency: 10,
        isActive: true
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    try {
      if (editingItem) {
        await socialService.updateAnnouncement(editingItem.id, formData);
      } else {
        await socialService.createAnnouncement(id, formData);
      }
      fetchAnnouncements();
      handleCloseModal();
    } catch (error) {
      alert('Erro ao salvar anúncio');
    }
  };

  const handleDelete = async (announcementId: string) => {
    if (!confirm('Tem certeza que deseja excluir este anúncio?')) return;
    try {
      await socialService.deleteAnnouncement(announcementId);
      setAnnouncements(prev => prev.filter(a => a.id !== announcementId));
    } catch {
      alert('Erro ao excluir anúncio');
    }
  };

  const toggleActive = async (item: SocialAnnouncement) => {
    try {
      await socialService.updateAnnouncement(item.id, { isActive: !item.isActive });
      setAnnouncements(prev => prev.map(a => a.id === item.id ? { ...a, isActive: !a.isActive } : a));
    } catch {
       // console.error(error);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-500 to-violet-500 bg-clip-text text-transparent flex items-center gap-2">
                <Megaphone /> Anúncios do Telão
            </h1>
            <p className="text-muted-foreground">Insira mensagens importantes entre as fotos do mural.</p>
        </div>
        <Button onClick={() => handleOpenModal()}>
            <Plus className="mr-2 h-4 w-4" /> Novo Anúncio
        </Button>
      </div>

      <SimpleCard className="overflow-hidden">
        {loading ? (
             <div className="p-8 text-center text-gray-500">Carregando...</div>
        ) : announcements.length === 0 ? (
             <div className="p-12 text-center text-gray-500 flex flex-col items-center gap-2">
                <Megaphone size={48} className="text-gray-300" />
                <p>Nenhum anúncio criado.</p>
                <Button variant="outline" onClick={() => handleOpenModal()}>Criar o primeiro</Button>
             </div>
        ) : (
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-muted/50 border-b">
                        <tr>
                            <th className="p-4 text-left font-medium">Título</th>
                            <th className="p-4 text-left font-medium">Mensagem</th>
                            <th className="p-4 text-left font-medium">Frequência</th>
                            <th className="p-4 text-left font-medium">Duração</th>
                            <th className="p-4 text-center font-medium">Status</th>
                            <th className="p-4 text-right font-medium">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {announcements.map((item) => (
                            <tr key={item.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                                <td className="p-4 font-medium">{item.title}</td>
                                <td className="p-4 text-gray-500 max-w-xs truncate">{item.message}</td>
                                <td className="p-4">A cada {item.frequency} slides</td>
                                <td className="p-4">{item.duration}s</td>
                                <td className="p-4 text-center">
                                    <button 
                                        onClick={() => toggleActive(item)}
                                        className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                                            item.isActive 
                                            ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                        }`}
                                    >
                                        {item.isActive ? 'Ativo' : 'Inativo'}
                                    </button>
                                </td>
                                <td className="p-4 text-right flex justify-end gap-2">
                                    <Button size="sm" variant="ghost" onClick={() => handleOpenModal(item)}>
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(item.id)}>
                                        <Trash className="h-4 w-4" />
                                    </Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}
      </SimpleCard>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="p-6 border-b flex justify-between items-center">
                    <h2 className="text-xl font-bold">{editingItem ? 'Editar Anúncio' : 'Novo Anúncio'}</h2>
                    <button onClick={handleCloseModal} className="text-gray-500 hover:text-gray-700" title="Fechar"><X size={20} /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Título</label>
                        <input 
                            required
                            className="w-full p-2 border rounded-md dark:bg-zinc-800 dark:border-zinc-700" 
                            value={formData.title}
                            onChange={e => setFormData({...formData, title: e.target.value})}
                            placeholder="Ex: Hora da Valsa"
                            title="Título do Anúncio"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Mensagem</label>
                        <textarea 
                            required
                            className="w-full p-2 border rounded-md dark:bg-zinc-800 dark:border-zinc-700 min-h-[100px]" 
                            value={formData.message}
                            onChange={e => setFormData({...formData, message: e.target.value})}
                            placeholder="A mensagem que aparecerá no telão..."
                            title="Mensagem do Anúncio"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Frequência (Slides)</label>
                            <input 
                                type="number"
                                min={1}
                                className="w-full p-2 border rounded-md dark:bg-zinc-800 dark:border-zinc-700" 
                                value={formData.frequency}
                                onChange={e => setFormData({...formData, frequency: Number(e.target.value)})}
                                placeholder="10"
                                title="Frequência de exibição"
                            />
                            <p className="text-xs text-gray-500 mt-1">Aparece a cada N fotos.</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Duração (Segundos)</label>
                            <input 
                                type="number"
                                min={3}
                                className="w-full p-2 border rounded-md dark:bg-zinc-800 dark:border-zinc-700" 
                                value={formData.duration}
                                onChange={e => setFormData({...formData, duration: Number(e.target.value)})}
                                placeholder="10"
                                title="Duração em segundos"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                        <Button type="button" variant="ghost" onClick={handleCloseModal}>Cancelar</Button>
                        <Button type="submit">{editingItem ? 'Salvar Alterações' : 'Criar Anúncio'}</Button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};

export default AdminAnnouncementPage;
