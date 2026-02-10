import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNotifications } from '@/contexts/NotificationContext';
import { apiFetch } from '@/services/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/StandardComponents';
import { Phone, User, Globe, MapPin } from 'lucide-react';
import { BrandLoader } from '@/components/ui/BrandLoader';

const profileSchema = z.object({
  phone: z.string().min(10, 'Telefone inválido'),
  location: z.string().min(3, 'Localização é obrigatória'),
  companyName: z.string().optional(),
  website: z.string().url('URL inválida').optional().or(z.literal('')),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export const CompleteProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { addNotification } = useNotifications();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      phone: '',
      location: '',
      companyName: '',
      website: '',
    }
  });

  const onSubmit = async (data: ProfileFormData) => {
    setLoading(true);
    try {
      await apiFetch('/user/profile', {
        method: 'PUT',
        body: JSON.stringify(data),
      });

      addNotification({
        type: 'success',
        title: 'Perfil Atualizado',
        message: 'Obrigado! Seu perfil foi completado com sucesso.'
      });

      navigate('/cliente/painel');
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Erro ao salvar',
        message: error instanceof Error ? error.message : 'Não foi possível salvar seus dados.'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground">Quase lá! 🚀</h1>
          <p className="text-muted-foreground mt-2">
            Complete seu cadastro para ter acesso total à plataforma.
          </p>
        </div>

        <Card className="p-8 shadow-xl border-primary/10">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Phone className="w-4 h-4 text-primary" /> Telefone / WhatsApp
              </label>
              <Input
                {...register('phone')}
                placeholder="(00) 00000-0000"
                error={errors.phone?.message}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" /> Localização (Cidade/Estado)
              </label>
              <Input
                {...register('location')}
                placeholder="Ex: Belo Horizonte, MG"
                error={errors.location?.message}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <User className="w-4 h-4 text-primary" /> Empresa (Opcional)
              </label>
              <Input
                {...register('companyName')}
                placeholder="Nome da sua empresa ou marca"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Globe className="w-4 h-4 text-primary" /> Website / Redes Sociais (Opcional)
              </label>
              <Input
                {...register('website')}
                placeholder="https://seu-site.com.br"
                error={errors.website?.message}
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full py-6 text-lg"
              disabled={loading}
            >
              {loading ? <BrandLoader size={24} /> : 'Concluir Cadastro'}
            </Button>
            
            <p className="text-center text-xs text-muted-foreground mt-4">
              Ao continuar, você concorda com nossos termos de uso e privacidade.
            </p>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default CompleteProfilePage;
