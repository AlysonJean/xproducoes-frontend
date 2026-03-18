import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useAuth } from '@/contexts/AuthContext';
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
  ArrowRight,
  AlertCircle
} from 'lucide-react';
import type { Client, Equipment, Kit, Service } from '@/types/types';
import { apiFetch } from '@/services/api';
import { useNotifications } from '@/contexts/NotificationContext';
import { BrandLoader } from '@/components/ui/BrandLoader';
import { formatPrice } from '@/utils/formatPrice';
import { toNumber } from '@/utils/typeSafeFormatters';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

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

export const AdminQuickProposalPage = () => {
  const navigate = useNavigate();
  const { addNotification } = useNotifications();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false);

  // Form State - Cliente
  const [clientType, setClientType] = useState<'registered' | 'manual'>('manual');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientContact, setClientContact] = useState('');
  // Erros de campos (escopo global)
  const [fieldErrors] = useState<Record<string, string>>({});

  // Form State - Evento
  const [eventTitle, setEventTitle] = useState('');
  const [location, setLocation] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventEndDate, setEventEndDate] = useState('');
  const [notes, setNotes] = useState('');

  // Form State - Endereço (obrigatórios pelo backend)
  const [street, setStreet] = useState('');
  const [addressNumber, setAddressNumber] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');

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
        setLoading(true);
        const [clientsRes, equipsRes, kitsRes, servicesRes] = await Promise.all([
          apiFetch<Client[]>('/admin/clients'),
          apiFetch<Equipment[]>('/equipments'),
          apiFetch<Kit[]>('/kits'),
          apiFetch<Service[]>('/services')
        ]);
        setClients(Array.isArray(clientsRes) ? clientsRes : (clientsRes as unknown as { data: Client[] }).data || []);
        setEquipments(Array.isArray(equipsRes) ? equipsRes : (equipsRes as unknown as { data: Equipment[] }).data || []);
        setKits(Array.isArray(kitsRes) ? kitsRes : (kitsRes as unknown as { data: Kit[] }).data || []);
        setServices(Array.isArray(servicesRes) ? servicesRes : (servicesRes as unknown as { data: Service[] }).data || []);
      } catch (error: unknown) {
        const err = error as { message?: string } | null;
        addNotification({ type: 'error', title: 'Erro ao carregar catálogo', message: err?.message || 'Falha ao buscar dados. Recarregue a página.' });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [addNotification]);

  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => sum + toNumber(item.totalPrice), 0);
  }, [items]);

  const filteredCatalogItems = useMemo(() => {
    const source = searchType === 'EQUIPMENT' ? equipments : searchType === 'KIT' ? kits : services;
    if (!searchTerm.trim()) return source;
    const lower = searchTerm.toLowerCase();
    return source.filter((item: Equipment | Kit | Service) => item.name?.toLowerCase().includes(lower));
  }, [searchType, searchTerm, equipments, kits, services]);

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

  const validate = (): string | null => {
    if (items.length === 0) return 'Adicione pelo menos um item ao orçamento.';
    if (!eventDate) return 'Informe a data de início do evento.';
    if (!eventEndDate) return 'Informe a data de término do evento.';
    if (new Date(eventEndDate) <= new Date(eventDate)) return 'A data de término deve ser posterior à data de início.';
    if (!location.trim()) return 'Informe o local do evento.';
    if (!street.trim()) return 'Informe a rua do evento.';
    if (!addressNumber.trim()) return 'Informe o número do endereço.';
    if (!neighborhood.trim()) return 'Informe o bairro.';
    if (!city.trim()) return 'Informe a cidade.';
    if (!state.trim()) return 'Informe o estado (UF).';
    if (!zipCode.trim()) return 'Informe o CEP.';
    if (clientType === 'manual') {
      if (!clientName.trim()) return 'Informe o nome do cliente.';
      if (!clientContact.trim()) return 'Informe o contato (WhatsApp) do cliente.';
    } else if (clientType === 'registered' && !selectedClientId) {
      return 'Selecione um cliente cadastrado.';
    }
    // Garantir que há pelo menos um item de catálogo (schema exige kitId ou equipmentIds ou serviceIds)
    const hasCatalogItem = items.some(i => i.type !== 'CUSTOM' && i.sourceId);
    if (!hasCatalogItem) return 'Adicione pelo menos um equipamento, kit ou serviço do catálogo.';
    return null;
  };

  const handleSave = async (status: 'DRAFT' | 'PENDING') => {
    const validationError = validate();
    if (validationError) {
      addNotification({ type: 'error', title: 'Campo obrigatório', message: validationError });
      return;
    }

    try {
      setSaving(true);

      // Extrair IDs de cada tipo de item (como o backend espera)
      const equipmentIds = items.filter(i => i.type === 'EQUIPMENT' && i.sourceId).map(i => i.sourceId!);
      const serviceIds = items.filter(i => i.type === 'SERVICE' && i.sourceId).map(i => i.sourceId!);
      const kitIdItem = items.find(i => i.type === 'KIT' && i.sourceId);

      // Itens CUSTOM entram nas observações
      const customItemsText = items
        .filter(i => i.type === 'CUSTOM')
        .map(i => `• ${i.description} (R$ ${i.unitPrice} x ${i.quantity})`)
        .join('\n');
      const fullNotes = customItemsText ? `${notes}\n\nItens personalizados:\n${customItemsText}`.trim() : notes;

      const payload: Record<string, unknown> = {
        userId: user?.id,
        clientId: clientType === 'registered' ? selectedClientId : undefined,
        clientName: clientType === 'manual' ? clientName : undefined,
        clientContact: clientType === 'manual' ? clientContact : undefined,
        clientEmail: clientType === 'manual' ? clientEmail : undefined,
        eventTitle: eventTitle || 'Proposta Rápida',
        location,
        street,
        addressNumber,
        neighborhood,
        city,
        state,
        zipCode,
        eventDate: new Date(eventDate).toISOString(),
        eventEndDate: new Date(eventEndDate).toISOString(),
        notes: fullNotes,
        totalPrice: subtotal,
        status,
        ...(equipmentIds.length > 0 && { equipmentIds }),
        ...(serviceIds.length > 0 && { serviceIds }),
        ...(kitIdItem?.sourceId && { kitId: kitIdItem.sourceId }),
      };

      const response = await apiFetch<{ success: boolean; data: { id: string } }>('/bookings', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      const bookingId = response?.data?.id;
      if (!bookingId) throw new Error('Reserva criada mas ID não retornado.');

      addNotification({ type: 'success', title: 'Proposta gerada!', message: 'O link de proposta está disponível na página da reserva.' });
      navigate(`/admin/reservas/${bookingId}`);
    } catch (error: unknown) {
      const err = error as { message?: string } | null;
      const msg = err?.message || 'Falha ao salvar. Verifique os campos e tente novamente.';
      addNotification({ type: 'error', title: 'Erro ao gerar proposta', message: msg });
    } finally {
      setSaving(false);
    }
  };

  const formatDateTime = (value: string): string => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString('pt-BR');
  };

  const loadLogoAsDataUrl = async (): Promise<string | null> => {
    try {
      const response = await fetch('/xproducoes-logo.png');
      if (!response.ok) return null;
      const blob = await response.blob();
      return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Falha ao converter logo em base64'));
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  };

  const getClientDisplayName = (): string => {
    if (clientType === 'registered') {
      const found = clients.find((c) => c.id === selectedClientId);
      return found?.user?.name || found?.name || 'Cliente cadastrado';
    }
    return clientName || 'Cliente não informado';
  };

  const getClientPhone = (): string => {
    if (clientType === 'registered') {
      const found = clients.find((c) => c.id === selectedClientId);
      return found?.phone || found?.user?.phone || '';
    }
    return clientContact || '';
  };

  const getClientEmail = (): string => {
    if (clientType === 'registered') {
      const found = clients.find((c) => c.id === selectedClientId);
      return found?.email || found?.user?.email || '';
    }
    return clientEmail || '';
  };

  const getRegistrationUrl = (): string => {
    if (typeof window === 'undefined') return 'https://xproducoeseeventos.com.br/cadastro';
    return `${window.location.origin}/cadastro`;
  };

  const buildWhatsappInviteText = (): string => {
    const eventName = eventTitle || 'seu evento';
    const registrationUrl = getRegistrationUrl();
    const progressUrl = typeof window !== 'undefined' ? `${window.location.origin}/cliente/painel` : 'https://xproducoeseeventos.com.br/cliente/painel';
    return [
      `Olá! A proposta comercial do evento "${eventName}" está pronta.` ,
      `Total estimado: ${formatPrice(subtotal)}.`,
      'Acabei de gerar o PDF para envio neste atendimento.',
      `Para acompanhar o progresso da reserva em tempo real, acesse: ${progressUrl}`,
      `Se ainda não tiver cadastro, crie aqui: ${registrationUrl}`,
      'Assim que concluir, nossa equipe vincula sua proposta ao seu acesso.',
    ].join(' ');
  };

  const normalizeWhatsAppNumber = (raw: string): string | null => {
    const digits = raw.replace(/\D/g, '');
    if (!digits) return null;

    if (digits.startsWith('55') && digits.length >= 12) return digits;
    if (digits.length === 10 || digits.length === 11) return `55${digits}`;
    if (digits.length >= 12) return digits;

    return null;
  };

  const generateProposalPdf = async (): Promise<void> => {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const logoDataUrl = await loadLogoAsDataUrl();

    if (logoDataUrl) {
      doc.addImage(logoDataUrl, 'PNG', 14, 10, 42, 14);
    }

    doc.setFontSize(16);
    doc.text('Proposta Comercial', 14, 32);

    doc.setFontSize(10);
    doc.text(`Gerada em: ${new Date().toLocaleString('pt-BR')}`, 14, 38);
    doc.text(`Responsavel: ${user?.name || 'Equipe X Producoes'}`, 14, 43);

    doc.setFontSize(11);
    doc.text('Cliente', 14, 52);
    doc.setFontSize(10);
    doc.text(`Nome: ${getClientDisplayName()}`, 14, 57);
    doc.text(`WhatsApp: ${getClientPhone() || '-'}`, 14, 62);
    doc.text(`Email: ${getClientEmail() || '-'}`, 14, 67);

    doc.setFontSize(11);
    doc.text('Evento', 14, 77);
    doc.setFontSize(10);
    doc.text(`Titulo: ${eventTitle || 'Proposta Rapida'}`, 14, 82);
    doc.text(`Inicio: ${formatDateTime(eventDate)}`, 14, 87);
    doc.text(`Termino: ${formatDateTime(eventEndDate)}`, 14, 92);
    doc.text(`Local: ${location || '-'}`, 14, 97);

    const fullAddress = [street, addressNumber, neighborhood, city, state, zipCode]
      .filter(Boolean)
      .join(', ');
    const addressLines = doc.splitTextToSize(`Endereco: ${fullAddress || '-'}`, 180);
    doc.text(addressLines, 14, 102);

    autoTable(doc, {
      startY: 112,
      head: [['Item', 'Tipo', 'Qtd', 'Unitario', 'Desconto', 'Total']],
      body: items.map((item) => [
        item.description,
        item.type,
        String(item.quantity),
        formatPrice(item.unitPrice),
        formatPrice(item.discount),
        formatPrice(item.totalPrice),
      ]),
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [25, 118, 210] },
    });

    const tableEndY = (doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY || 120;
    doc.setFontSize(12);
    doc.text(`Total estimado: ${formatPrice(subtotal)}`, 14, tableEndY + 10);

    doc.setFontSize(10);
    const notesText = notes?.trim() ? notes.trim() : 'Sem observacoes internas.';
    const notesLines = doc.splitTextToSize(`Observacoes: ${notesText}`, 180);
    doc.text(notesLines, 14, tableEndY + 18);

    const inviteTitleY = tableEndY + 34;
    doc.setFontSize(11);
    doc.text('Mensagem sugerida para WhatsApp', 14, inviteTitleY);
    doc.setFontSize(10);
    const inviteLines = doc.splitTextToSize(buildWhatsappInviteText(), 180);
    doc.text(inviteLines, 14, inviteTitleY + 6);

    const filenameClient = getClientDisplayName().replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase();
    const fileName = `proposta-${filenameClient || 'cliente'}-${Date.now()}.pdf`;
    doc.save(fileName);
  };

  const handleDownloadPdf = async () => {
    const validationError = validate();
    if (validationError) {
      addNotification({ type: 'error', title: 'Campos pendentes', message: validationError });
      return;
    }

    try {
      setGeneratingPdf(true);
      await generateProposalPdf();

      addNotification({
        type: 'success',
        title: 'PDF pronto',
        message: 'Arquivo gerado com sucesso para envio via WhatsApp.',
      });
    } catch (error: unknown) {
      const err = error as { message?: string } | null;
      addNotification({
        type: 'error',
        title: 'Falha no PDF',
        message: err?.message || 'Nao foi possivel gerar o PDF da proposta.',
      });
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handleDownloadAndOpenWhatsApp = async () => {
    const validationError = validate();
    if (validationError) {
      addNotification({ type: 'error', title: 'Campos pendentes', message: validationError });
      return;
    }

    const normalizedPhone = normalizeWhatsAppNumber(getClientPhone());
    if (!normalizedPhone) {
      addNotification({
        type: 'error',
        title: 'WhatsApp inválido',
        message: 'Informe um telefone de cliente válido para abrir o WhatsApp automaticamente.',
      });
      return;
    }

    try {
      setSendingWhatsApp(true);
      await generateProposalPdf();

      const whatsappText = buildWhatsappInviteText();
      const waUrl = `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(whatsappText)}`;
      window.open(waUrl, '_blank', 'noopener,noreferrer');

      addNotification({
        type: 'success',
        title: 'WhatsApp aberto',
        message: 'PDF baixado. O WhatsApp foi aberto com mensagem pronta. Anexe o PDF na conversa para enviar.',
      });
    } catch (error: unknown) {
      const err = error as { message?: string } | null;
      addNotification({
        type: 'error',
        title: 'Falha no envio',
        message: err?.message || 'Nao foi possivel abrir o WhatsApp com a proposta.',
      });
    } finally {
      setSendingWhatsApp(false);
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
             <Button variant="outline" onClick={handleDownloadPdf} isLoading={generatingPdf} className="gap-2">
              Baixar PDF
             </Button>
             <Button variant="outline" onClick={handleDownloadAndOpenWhatsApp} isLoading={sendingWhatsApp} className="gap-2">
              PDF + WhatsApp
             </Button>
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
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setClientType(e.target.value as 'manual' | 'registered')}
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
                      options={[{ value: '', label: 'Selecione...' }, ...clients.map(c => ({ value: c.id, label: c.user?.name || c.name }))]}
                    />
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input label="Nome Completo *" value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Ex: João Silva" />
                      <Input label="WhatsApp / Celular *" value={clientContact} onChange={e => setClientContact(e.target.value)} placeholder="(00) 00000-0000" />
                      <Input label="E-mail" value={clientEmail} onChange={e => setClientEmail(e.target.value)} placeholder="Ex: joao@email.com" type="email" />
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
                 <Input label="Local / Salão *" value={location} onChange={e => setLocation(e.target.value)} placeholder="Ex: Espaço VIP" />
                 <Input label="Início Previsto *" type="datetime-local" value={eventDate} onChange={e => setEventDate(e.target.value)} />
                 <Input label="Término Previsto *" type="datetime-local" value={eventEndDate} onChange={e => setEventEndDate(e.target.value)} />
               </div>

               <div className="mt-4 rounded-xl border border-border bg-muted/30 p-4 space-y-3">
                 <div className="flex items-center gap-2 text-muted-foreground font-bold uppercase text-[10px] tracking-widest">
                   <AlertCircle className="h-3 w-3" /> Endereço do Evento (obrigatório)
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                   <Input label="CEP *" value={zipCode} onChange={e => setZipCode(e.target.value)} placeholder="00000-000" className="md:col-span-1" error={fieldErrors.zipCode} />
                   <Input label="Rua *" value={street} onChange={e => setStreet(e.target.value)} placeholder="Ex: Av. Brasil" className="md:col-span-2" error={fieldErrors.street} />
                 </div>
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                   <Input label="Número *" value={addressNumber} onChange={e => setAddressNumber(e.target.value)} placeholder="Ex: 123" error={fieldErrors.addressNumber} />
                   <Input label="Bairro *" value={neighborhood} onChange={e => setNeighborhood(e.target.value)} placeholder="Ex: Centro" error={fieldErrors.neighborhood} />
                   <Input label="Cidade *" value={city} onChange={e => setCity(e.target.value)} placeholder="Ex: Belo Horizonte" error={fieldErrors.city} />
                   <Input label="UF *" value={state} onChange={e => setState(e.target.value)} placeholder="Ex: MG" maxLength={2} error={fieldErrors.state} />
                 </div>
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
                         searchType === type ? 'bg-card shadow-sm text-primary dark:bg-card' : 'text-muted-foreground hover:text-foreground'
                       }`}
                     >
                       {type === 'EQUIPMENT' ? 'Equips' : type === 'KIT' ? 'Kits' : 'Serviços'}
                     </button>
                   ))}
                </div>

                <Input 
                  placeholder="Pesquisar..." 
                  className="bg-background border-none h-10 mb-4" 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />

                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                  {filteredCatalogItems.length === 0 && (
                    <p className="text-center text-xs text-muted-foreground py-6">Nenhum item encontrado.</p>
                  )}
                  {filteredCatalogItems.map((item: Equipment | Kit | Service) => (
                      <div key={item.id} className="group p-3 rounded-xl border border-border bg-card hover:border-primary/40 transition-all cursor-pointer hover:shadow-md" onClick={() => addItemToProposal(searchType, item)}>
                        <div className="flex justify-between items-start gap-2">
                           <div className="min-w-0">
                             <p className="font-bold text-xs truncate group-hover:text-primary transition-colors">{item.name}</p>
                             <p className="text-[10px] text-muted-foreground font-mono">
                               {formatPrice(Number(((item as Equipment).dailyPrice || (item as Kit | Service).price) || 0))}
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
