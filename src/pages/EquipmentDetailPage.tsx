// src/pages/EquipmentDetailPage.tsx

import { useState, useEffect } from 'react';
import { useRevealOnView } from '../hooks/useRevealOnView';
import { useParams } from 'react-router-dom';
import { apiFetch } from '../services/api';
import { useCart } from '@/hooks/useCart';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import type { Equipment } from '../types/types';
import { formatPrice } from '../utils/formatPrice';

export const EquipmentDetailPage = () => {
  const { ref: titleRef } = useRevealOnView<HTMLHeadingElement>({ threshold: 0.2 });
  const { id } = useParams<{ id: string }>();
  const { addItem } = useCart();
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantityToAdd, setQuantityToAdd] = useState(1);
  const [addedMessage, setAddedMessage] = useState(false);

  useEffect(() => {
    if (!id) return;
    const fetchEquipment = async () => {
      try {
        setLoading(true);
        const data = await apiFetch(`/equipments/${id}`);
        setEquipment(data as Equipment);
        setError(null);
      } catch (err: unknown) {
        if (err && typeof err === 'object' && 'message' in err) {
          setError((err as { message: string }).message);
        } else {
          setError('Não foi possível carregar os detalhes do equipamento.');
        }
        // console.error(err); // Removido para evitar warning de lint
      } finally {
        setLoading(false);
      }
    };
    fetchEquipment();
  }, [id]);

  const handleAddToCart = () => {
    if (equipment) {
      addItem(equipment, 'equipment');
      setAddedMessage(true);
      setTimeout(() => setAddedMessage(false), 2000);
    }
  };

  if (loading) return <LoadingSpinner label="A carregar equipamento..." />;
  if (error)
    return (
      <div className="text-center text-destructive bg-destructive/10 p-4 rounded-md border border-destructive">
        {error}
      </div>
    );
  if (!equipment)
    return (
  <div className="text-center text-xl text-destructive">
        Equipamento não encontrado.
      </div>
    );

  return (
  <div className="bg-card p-6 md:p-8 rounded-lg shadow-2xl border border-border">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <img
            src={
              equipment.imageUrl ||
              `https://placehold.co/800x600/1f2937/ffffff?text=${equipment.name.replace(/\s/g, '+')}`
            }
            alt={`Imagem de ${equipment.name}`}
            className="w-full h-auto rounded-lg object-cover shadow-lg"
            onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
              e.currentTarget.src = `https://placehold.co/800x600/1f2937/ffffff?text=Imagem+Indisponível`;
            }}
          />
        </div>
        <div className="flex flex-col">
          <h1 ref={titleRef} className="text-4xl lg:text-5xl font-bold text-primary mb-4 heading-elegant">
            {equipment.name}
          </h1>
          <p className="text-muted-foreground text-lg mb-6 flex-grow">
            {equipment.description}
          </p>

        <div className="bg-muted/30 p-4 rounded-lg mb-6 border border-border">
            <div className="flex justify-between items-center">
        <span className="text-muted-foreground">Preço por hora</span>
        <span className="text-3xl font-extrabold text-foreground">
                {formatPrice(equipment.pricePerHour || 0)}
              </span>
            </div>
            <div className="flex justify-between items-center mt-2">
        <span className="text-muted-foreground">Status</span>
              <span className="text-xl font-semibold">
                {equipment.isAvailable ? 'Disponível' : 'Indisponível'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 mb-4">
            <label htmlFor="quantity" className="font-semibold">
              Quantidade:
            </label>
            <input
              type="number"
              id="quantity"
              min="1"
              max={10}
              value={quantityToAdd}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setQuantityToAdd(Number(e.target.value))
              }
              className="w-20 bg-muted/30 border border-border rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <button
            onClick={handleAddToCart}
            className="w-full bg-primary hover:bg-primary text-primary-foreground font-bold py-3 px-4 rounded-lg text-lg transition-transform transform hover:scale-105"
          >
            Adicionar ao Carrinho
          </button>
          {addedMessage && (
            <div className="text-center mt-4 text-success font-semibold">
              Item adicionado com sucesso!
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
