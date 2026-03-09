import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { 
  Card, 
  Button, 
  Input, 
  Select, 
  Badge,
  Textarea
} from '@/components/ui/StandardComponents';
import { 
  Plus, 
  Trash2, 
  Search, 
  Calculator, 
  Package, 
  Settings,
  Send,
  Zap,
  ArrowRight
} from 'lucide-react';
import type { Client, Equipment, Kit, Service } from '@/types/types';

interface ProposalItem {
  id: string;
  type: 'KIT' | 'EQUIPMENT' | 'SERVICE' | 'CUSTOM';
  sourceId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  totalPrice: number;
  imageUrl?: string;
}
import { apiFetch } from '@/services/api';
import { useNotifications } from '@/contexts/NotificationContext';
import { BrandLoader } from '@/components/ui/BrandLoader';
import { formatPrice } from '@/utils/formatPrice';

export const AdminQuickProposalPage = () => {
  const navigate = useNavigate();
  const { addNotification } = useNotifications();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form State
  const [clientType, setClientType] = useState<'registered' | 'manual'>('manual');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientEmail] = useState('');
  const [clientContact, setClientContact] = useState('');
  const [eventTitle, setEventTitle] = useState('');
  const [location, setLocation] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventEndDate, setEventEndDate] = useState('');
  const [notes, setNotes] = useState('');

  // Items State
  const [items, setItems] = useState<ProposalItem[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [kits, setKits] = useState<Kit[]>([]);
  const [services, setServices] = useState<Service[]>([]);

  // Catalog Search
  const [searchType, setSearchType] = useState<'EQUIPMENT' | 'KIT' | 'SERVICE'>('EQUIPMENT');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [clientsRes, equipsRes, kitsRes, servicesRes] = await Promise.all([
          apiFetch<Client[]>('/admin/clients'),
          apiFetch<Equipment[]>('/equipments'),
          apiFetch<Kit[]>('/kits'),
          apiFetch<Service[]>('/services')
        ]);
        
        setClients(Array.isArray(clientsRes) ? clientsRes : (clientsRes as unknown as { data: Client[] }).data || []);
        setEquipments(equipsRes || []);
        setKits(kitsRes || []);
        setServices(servicesRes || []);
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => sum + item.totalPrice, 0);
  }, [items]);

  const addItemToProposal = (type: ProposalItem['type'], item: Equipment | Kit | Service) => {
    const newItem: ProposalItem = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      sourceId: item.id,
      description: item.name,
      quantity: 1,
      unitPrice: Number((item as Equipment).dailyPrice || (item as Kit | Service).price || 0),
      discount: 0,
      totalPrice: Number((item as Equipment).dailyPrice || (item as Kit | Service).price || 0),
      imageUrl: item.imageUrl
    };
    setItems(prev => [...prev, newItem]);
    addNotification({ type: 'success', title: 'Item adicionado', message: item.name });
  };

  const addCustomItem = () => {
    const newItem: ProposalItem = {
      id: Math.random().toString(36).substr(2, 9),
      type: 'CUSTOM',
      description: 'Novo Serviço/Item',
      quantity: 1,
      unitPrice: 0,
      discount: 0,
      totalPrice: 0
    };
    setItems(prev => [...prev, newItem]);
  };

  const updateItem = (id: string, field: keyof ProposalItem, value: string | number) => {
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      const updated = { ...item, [field]: value };
      updated.totalPrice = (updated.unitPrice * updated.quantity) - updated.discount;
      return updated;
    }));
  };

  const removeItem = (id: string) => {
    setItems(items.filter(i => i.id !== id));
  };

  const handleSave = async (status: 'DRAFT' | 'PENDING') => {
    if (items.length === 0) {
      addNotification({ type: 'error', title: 'Vazio', message: 'Adicione pelo menos um item.' });
      return;
    }

    try {
      setSaving(true);
      const payload = {
        clientType,
        clientId: clientType === 'registered' ? selectedClientId : undefined,
        clientName,
        clientEmail,
        clientContact,
        eventTitle,
        location,
        eventDate: eventDate || new Date().toISOString(),
        eventEndDate: eventEndDate || new Date().toISOString(),
        notes,
        totalPrice: subtotal,
        status,
        items: items.map(i => ({
          description: i.description,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          discount: i.discount,
          totalPrice: i.totalPrice,
          itemType: i.type,
          equipmentId: i.type === 'EQUIPMENT' ? i.sourceId : undefined,
          serviceId: i.type === 'SERVICE' ? i.sourceId : undefined,
          kitId: i.type === 'KIT' ? i.sourceId : undefined
        }))
      };

      const response = await apiFetch<any>('/bookings', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      addNotification({ type: 'success', title: 'Sucesso', message: 'Orçamento criado!' });
      navigate(`/admin/reservas/${response.id || response.data?.id}`);
    } catch (error: any) {
      addNotification({ type: 'error', title: 'Erro', message: error.message || 'Falha ao salvar.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <BrandLoader fullScreen size="xl" label="Carregando catálogo X Produções..." />;

  return (
    <AdminLayout title="Gerador de Proposta Rápida" breadcrumbs={[{ name: 'Admin', href: '/admin/painel' }, { name: 'Novo Orçamento' }]}>
      <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20">
              <Zap className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Nova Proposta Comercial</h1>
              <p className="text-muted-foreground">Crie orçamentos formais e flexíveis em segundos.</p>
            </div>
          </div>
          <div className="flex gap-2">
             <Button variant="outline" onClick={() => navigate(-1)}>Cancelar</Button>
             <Button onClick={() => handleSave('PENDING')} isLoading={saving} className="gap-2 shadow-lg shadow-primary/20">
                <Send className="h-4 w-4" /> Gerar Link de Proposta
             </Button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Form Area */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Client Card */}
            <Card className="p-6 border-2">
               <div className="flex items-center gap-2 mb-6 text-primary font-bold uppercase text-[10px] tracking-widest">
                 <Package className="h-4 w-4" /> Dados do Cliente
               </div>
               
               <div className="space-y-4">
                  <Select 
                    label="Origem do Cliente"
                    value={clientType}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setClientType(e.target.value as any)}
                    options={[
                      { value: 'manual', label: 'Manual (Conversa do WhatsApp)' },
                      { value: 'registered', label: 'Base de Clientes Cadastrados' }
                    ]}
                  />

                  {clientType === 'registered' ? (
                    <Select 
                      label="Selecionar Cliente"
                      value={selectedClientId}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedClientId(e.target.value)}
                      options={clients.map(c => ({ value: c.id, label: c.user?.name || c.name }))}
                    />
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input label="Nome Completo" value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Ex: João Silva" />
                      <Input label="WhatsApp / Celular" value={clientContact} onChange={e => setClientContact(e.target.value)} placeholder="(00) 00000-0000" />
                    </div>
                  )}
               </div>
            </Card>

            {/* Items Card */}
            <Card className="p-6 border-2 border-primary/10 overflow-hidden">
               <div className="flex items-center justify-between mb-6">
                 <div className="flex items-center gap-2 text-primary font-bold uppercase text-[10px] tracking-widest">
                   <Calculator className="h-4 w-4" /> Composição do Orçamento
                 </div>
                 <Button variant="outline" size="sm" onClick={addCustomItem} className="h-8 text-[10px] font-black uppercase tracking-widest gap-2">
                   <Plus className="h-3 w-3" /> Item Personalizado
                 </Button>
               </div>

               <div className="space-y-4">
                 {items.length === 0 ? (
                   <div className="py-12 text-center border-2 border-dashed rounded-2xl border-border bg-muted/20">
                      <p className="text-muted-foreground text-sm">Nenhum item adicionado ainda.</p>
                      <p className="text-xs text-muted-foreground/60">Use o catálogo ao lado para começar.</p>
                   </div>
                 ) : (
                   <div className="space-y-3">
                     {items.map((item) => (
                       <div key={item.id} className="group relative flex flex-col md:flex-row gap-4 p-4 rounded-xl border border-border bg-card hover:border-primary/30 transition-all hover:shadow-md">
                         <div className="flex-grow space-y-2">
                           <Input 
                             className="h-8 font-bold text-sm bg-transparent border-none p-0 focus:ring-0" 
                             value={item.description} 
                             onChange={e => updateItem(item.id, 'description', e.target.value)}
                           />
                           <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-[9px] uppercase tracking-tighter">
                                {item.type}
                              </Badge>
                           </div>
                         </div>

                         <div className="grid grid-cols-3 md:flex items-center gap-3">
                           <div className="space-y-1">
                             <label className="text-[10px] font-black text-muted-foreground uppercase">Qtd</label>
                             <input 
                               type="number" 
                               aria-label="Quantidade"
                               className="w-12 h-8 bg-muted/30 border-none rounded-lg text-sm text-center font-bold"
                               value={item.quantity} 
                               onChange={e => updateItem(item.id, 'quantity', Number(e.target.value))}
                             />
                           </div>
                           <div className="space-y-1">
                             <label className="text-[10px] font-black text-muted-foreground uppercase">Preço Unit.</label>
                             <Input 
                               type="number" 
                               className="w-24 h-8 text-sm" 
                               prefix="R$"
                               value={item.unitPrice} 
                               onChange={e => updateItem(item.id, 'unitPrice', Number(e.target.value))}
                             />
                           </div>
                           <div className="pt-5">
                             <Button variant="ghost" size="icon" onClick={() => removeItem(item.id)} className="text-destructive/50 hover:text-destructive hover:bg-destructive/5 h-8 w-8">
                               <Trash2 className="h-4 w-4" />
                             </Button>
                           </div>
                         </div>
                       </div>
                     ))}
                   </div>
                 )}
               </div>

               <div className="mt-8 pt-6 border-t space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground font-medium uppercase tracking-widest text-[10px]">Subtotal Estimado</span>
                    <span className="font-mono font-bold text-lg">{formatPrice(subtotal)}</span>
                  </div>
               </div>
            </Card>

            <Card className="p-6">
               <div className="flex items-center gap-2 mb-6 text-primary font-bold uppercase text-[10px] tracking-widest">
                 <Settings className="h-4 w-4" /> Detalhes Logísticos
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <Input label="Título do Evento" value={eventTitle} onChange={e => setEventTitle(e.target.value)} placeholder="Ex: Casamento João & Maria" />
                 <Input label="Local / Salão" value={location} onChange={e => setLocation(e.target.value)} placeholder="Ex: Espaço VIP" />
                 <Input label="Início Previsto" type="datetime-local" value={eventDate} onChange={e => setEventDate(e.target.value)} />
                 <Input label="Término Previsto" type="datetime-local" value={eventEndDate} onChange={e => setEventEndDate(e.target.value)} />
               </div>
               <div className="mt-4">
                 <Textarea label="Observações Internas (Não aparecem na proposta)" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Ex: Cliente chorou desconto, negociar frete se fechar hoje." />
               </div>
            </Card>
          </div>

          {/* Catalog Sidebar */}
          <div className="space-y-6">
             <Card className="p-4 border-primary/20 bg-primary/5 sticky top-24">
                <div className="flex items-center gap-2 mb-4 text-primary font-black uppercase text-[11px] tracking-widest">
                  <Search className="h-4 w-4" /> Adicionar do Catálogo
                </div>

                <div className="flex gap-1 p-1 bg-muted/30 rounded-xl mb-4">
                   {(['EQUIPMENT', 'KIT', 'SERVICE'] as const).map(type => (
                     <button
                       key={type}
                       onClick={() => setSearchType(type)}
                       className={`flex-1 py-2 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${
                         searchType === type ? 'bg-white shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'
                       }`}
                     >
                       {type === 'EQUIPMENT' ? 'Equips' : type === 'KIT' ? 'Kits' : 'Serviços'}
                     </button>
                   ))}
                </div>

                <Input 
                  placeholder="Pesquisar..." 
                  className="bg-white border-none h-10 mb-4" 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />

                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                  {(searchType === 'EQUIPMENT' ? equipments : searchType === 'KIT' ? kits : services)
                    .map((item: any) => (
                      <div key={item.id} className="group p-3 rounded-xl border border-border bg-white hover:border-primary/40 transition-all cursor-pointer shadow-sm hover:shadow-md" onClick={() => addItemToProposal(searchType, item)}>
                        <div className="flex justify-between items-start gap-2">
                           <div className="min-w-0">
                             <p className="font-bold text-xs truncate group-hover:text-primary transition-colors">{item.name}</p>
                             <p className="text-[10px] text-muted-foreground font-mono">
                               {formatPrice(Number((item as any).dailyPrice || (item as any).pricePerHour || (item as any).price || 0))}
                             </p>
                           </div>
                           <div className="h-6 w-6 rounded-lg bg-primary/5 group-hover:bg-primary group-hover:text-white flex items-center justify-center transition-all">
                              <ArrowRight className="h-3 w-3" />
                           </div>
                        </div>
                      </div>
                    ))}
                </div>
             </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminQuickProposalPage;
