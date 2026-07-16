import { useState, useEffect, useCallback, useMemo } from 'react';
import { couponService, Coupon } from '../../services/couponService';
import {
  Trash2,
  Edit2,
  Plus,
  Tag,
  Activity,
  Layers,
  Search,
  XCircle,
} from 'lucide-react';
import { BrandLoader } from '@/components/ui/BrandLoader';
import { useNotifications } from '../../contexts/NotificationContext';
import { AdminLayout } from '../../components/admin/AdminLayout';
import {
  Button,
  Card,
  Modal,
  ConfirmModal,
  Badge,
  Grid,
  Input,
} from '../../components/ui/StandardComponents';
import { CouponForm } from '../../components/forms/CouponForm';
import { formatPrice } from '../../utils/formatPrice';
import { logger } from '../../utils/logger';

function formatDiscount(coupon: Coupon): string {
  return coupon.discountType === 'PERCENTAGE'
    ? `${Number(coupon.discountValue)}%`
    : formatPrice(coupon.discountValue);
}

// Achado (auditoria de produto): não existia nenhum mecanismo de cupom/desconto por código —
// só um campo livre de desconto por item, preenchido manualmente pelo admin. Este é o painel
// de gestão para o novo modelo Coupon (ver couponService.ts no backend).
export const CouponManagementPage = () => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [idToDelete, setIdToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { addNotification } = useNotifications();

  const loadCoupons = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      const data = await couponService.getAll();
      setCoupons(data || []);
    } catch (error: unknown) {
      logger.error('Erro', 'CouponManagementPage', error);
      addNotification({
        type: 'error',
        title: 'Falha de Sincronização',
        message: 'Não foi possível carregar os cupons.',
      });
    } finally {
      if (showLoader) setLoading(false);
    }
  }, [addNotification]);

  useEffect(() => {
    loadCoupons();
  }, [loadCoupons]);

  const handleEdit = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setIsFormModalOpen(true);
  };

  const handleCreate = () => {
    setEditingCoupon(null);
    setIsFormModalOpen(true);
  };

  const handleSuccess = () => {
    setIsFormModalOpen(false);
    setEditingCoupon(null);
    loadCoupons();
  };

  const handleDeleteClick = (id: string) => {
    setIdToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!idToDelete) return;
    try {
      setIsDeleting(true);
      await couponService.remove(idToDelete);
      addNotification({ type: 'success', title: 'Removido', message: 'O cupom foi excluído.' });
      loadCoupons(false);
      setIsDeleteModalOpen(false);
    } catch (error) {
      logger.error('Erro', 'CouponManagementPage', error);
      addNotification({ type: 'error', title: 'Erro de Exclusão', message: 'Não foi possível remover o cupom.' });
    } finally {
      setIsDeleting(false);
      setIdToDelete(null);
    }
  };

  const filteredCoupons = useMemo(() => {
    return coupons.filter((c) =>
      c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.description || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [coupons, searchTerm]);

  const stats = useMemo(() => ({
    total: coupons.length,
    active: coupons.filter((c) => c.active).length,
    totalUses: coupons.reduce((sum, c) => sum + (c.usedCount || 0), 0),
  }), [coupons]);

  if (loading && coupons.length === 0) {
    return (
      <AdminLayout title="Cupons de Desconto" breadcrumbs={[{ name: 'Admin' }, { name: 'Cupons' }]}>
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <BrandLoader size={120} label="Carregando cupons..." />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title="Cupons de Desconto"
      breadcrumbs={[{ name: 'Admin' }, { name: 'Painel' }, { name: 'Cupons' }]}
    >
      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20 text-primary">
              <Tag className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground tracking-tight">Cupons de Desconto</h2>
              <p className="text-sm text-muted-foreground font-medium">Crie códigos promocionais para orçamentos e carrinhos.</p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleCreate} className="gap-2 shadow-lg shadow-primary/20">
              <Plus className="h-5 w-5" /> Novo Cupom
            </Button>
          </div>
        </div>

        <Grid columns={{ sm: 1, md: 3 }} gap={4}>
          <Card className="p-4 bg-primary/5 border-primary/10">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                <Layers className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none mb-1">Total de Cupons</p>
                <p className="text-xl font-black text-foreground">{stats.total}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-emerald-500/5 border-emerald-500/10">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20">
                <Activity className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none mb-1">Cupons Ativos</p>
                <p className="text-xl font-black text-foreground">{stats.active}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-blue-500/5 border-blue-500/10">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 border border-blue-500/20">
                <Tag className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none mb-1">Usos Totais</p>
                <p className="text-xl font-black text-foreground">{stats.totalUses}</p>
              </div>
            </div>
          </Card>
        </Grid>

        <Card className="p-4 bg-card/50 border-border">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por código ou descrição..."
                className="pl-11"
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

        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {filteredCoupons.map((coupon) => (
            <Card key={coupon.id} className="flex flex-col p-6 border-border hover:border-primary/50 transition-all shadow-sm hover:shadow-lg">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h3 className="font-black text-lg text-foreground tracking-tight font-mono">{coupon.code}</h3>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {coupon.description || 'Sem descrição'}
                  </p>
                </div>
                <Badge variant={coupon.active ? 'success' : 'ghost'}>
                  {coupon.active ? 'Ativo' : 'Inativo'}
                </Badge>
              </div>

              <div className="space-y-2 text-sm mb-6">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Desconto</span>
                  <span className="font-bold text-foreground">{formatDiscount(coupon)}</span>
                </div>
                {coupon.minOrderValue != null && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Pedido mínimo</span>
                    <span className="font-medium text-foreground">{formatPrice(coupon.minOrderValue)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Usos</span>
                  <span className="font-medium text-foreground tabular-nums">
                    {coupon.usedCount}{coupon.maxUses != null ? ` / ${coupon.maxUses}` : ''}
                  </span>
                </div>
                {coupon.validUntil && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Expira em</span>
                    <span className="font-medium text-foreground">
                      {new Date(coupon.validUntil).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex gap-2 mt-auto pt-4 border-t border-border/50">
                <Button
                  variant="primary"
                  className="flex-1 font-black uppercase text-[10px] tracking-widest h-10"
                  onClick={() => handleEdit(coupon)}
                >
                  <Edit2 size={14} className="mr-2" /> Editar
                </Button>
                <Button
                  variant="destructive"
                  size="icon"
                  className="h-10 w-10"
                  onClick={() => handleDeleteClick(coupon.id)}
                  title="Remover Cupom"
                >
                  <Trash2 size={18} />
                </Button>
              </div>
            </Card>
          ))}

          {filteredCoupons.length === 0 && !loading && (
            <div className="col-span-full py-32 text-center border-2 border-dashed border-border rounded-3xl bg-muted/20">
              <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-muted mb-6 text-muted-foreground/10 ring-8 ring-muted/5">
                <Tag className="h-10 w-10 text-muted-foreground/30" />
              </div>
              <h3 className="text-xl font-black text-foreground uppercase tracking-widest">Nenhum Cupom Encontrado</h3>
              <p className="text-muted-foreground text-sm max-w-sm mx-auto mt-2 font-medium">
                Crie seu primeiro cupom para começar a oferecer descontos.
              </p>
              <Button variant="outline" onClick={() => setSearchTerm('')} className="mt-8 font-black uppercase text-[10px] tracking-widest">
                Limpar Filtros
              </Button>
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        title={editingCoupon ? 'Editar Cupom' : 'Novo Cupom'}
        size="lg"
      >
        <CouponForm
          initialData={editingCoupon}
          onSuccess={handleSuccess}
          onCancel={() => setIsFormModalOpen(false)}
        />
      </Modal>

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Excluir Cupom?"
        message="Reservas que já usaram este cupom manterão o desconto aplicado, mas o código deixará de funcionar para novos pedidos."
        variant="danger"
        isLoading={isDeleting}
        confirmText="Confirmar Exclusão"
        cancelText="Manter Cupom"
      />
    </AdminLayout>
  );
};

export default CouponManagementPage;
