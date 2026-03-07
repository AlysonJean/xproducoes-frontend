/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react';
import { apiFetch } from '../../services/api';
import { Equipment, Category } from '../../types/types';
import { EquipmentCard } from './EquipmentCard';
import { transformEquipment } from '../../utils/transformEquipment';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

interface CategoryEquipmentRowProps {
  category: Category;
}

export const CategoryEquipmentRow = ({ category }: CategoryEquipmentRowProps) => {
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCategoryEquipments = async () => {
      try {
        // Fetch only ACTIVE items for this category
                const response: any = await apiFetch(`/equipments/search?categoryId=${category.id}&status=ACTIVE&limit=6`);
        
        let data: Equipment[] = [];
        if (Array.isArray(response)) {
          data = response;
        } else if (response && response.data && Array.isArray(response.data)) {
          data = response.data;
        }

        const transformed = data.map(transformEquipment);
        setEquipments(transformed);
      } catch (error) {
        console.warn(`Error fetching equipment for category ${category.name}:`, error);
      } finally {
        setLoading(false);
      }
    };

    fetchCategoryEquipments();
  }, [category.id, category.name]);

  if (loading) {
    return (
      <div className="py-8">
        <div className="h-8 w-48 bg-muted/30 rounded animate-pulse mb-4"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
           {[...Array(4)].map((_, i) => (
             <div key={i} className="h-[300px] bg-muted/20 rounded-lg animate-pulse"></div>
           ))}
        </div>
      </div>
    );
  }

  if (equipments.length === 0) return null;

  return (
    <div className="py-8 border-b border-border/40 last:border-0">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-bold heading-elegant flex items-center gap-2">
          {category.name}
          <span className="w-2 h-2 rounded-full bg-primary/40 inline-block ml-2"></span>
        </h3>
        <Link 
          to={`/equipamentos?categoryId=${category.id}`} 
          className="text-sm font-medium text-primary hover:text-primary/80 flex items-center gap-1 transition-colors group"
        >
          Ver todos
          <ChevronRight size={16} className="transform group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>

      <div className="relative group/scroll">
        {/* Horizontal Scroll Container */}
        <div className="flex overflow-x-auto pb-6 gap-6 snap-x snap-mandatory scrollbar-none hover:scrollbar-thin scrollbar-thumb-primary/10 scrollbar-track-transparent transition-all w-full">
          {equipments.map((equipment) => (
            <div 
              key={equipment.id} 
              className="min-w-[280px] w-[280px] md:min-w-[320px] md:w-[320px] snap-start flex-shrink-0 transition-transform duration-300 hover:scale-[1.01]"
            >
              <EquipmentCard equipment={equipment} />
            </div>
          ))}
          {/* Spacer for better scrolling on mobile */}
          <div className="min-w-[1px] w-[1px] flex-shrink-0" />
        </div>
        
        {/* Shadow/Gradient indicators for scroll */}
        <div className="absolute right-0 top-0 bottom-6 w-12 bg-gradient-to-l from-background to-transparent pointer-events-none opacity-0 group-hover/scroll:opacity-100 transition-opacity" />
      </div>
    </div>
  );
};
