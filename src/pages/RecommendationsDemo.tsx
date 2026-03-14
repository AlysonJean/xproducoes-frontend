/* eslint-disable @typescript-eslint/no-explicit-any */
// Caminho: frontend/src/pages/RecommendationsDemo.tsx

import { useState } from 'react';
import { useNotifications } from '../contexts/NotificationContext';
import { RecommendationSection, RecommendationItem } from '../components/ui/RecommendationSection';
import { Card } from '../components/ui/StandardComponents';
import { Sparkles } from 'lucide-react';

// Mock data para demonstração
const mockRecommendations: RecommendationItem[] = [
    {
        id: '1',
        name: 'Câmera Sony A7 III',
        description: 'Câmera profissional full-frame de 24.2MP com sensor BSI',
        imageUrl: 'https://placehold.co/400x300/3b82f6/ffffff?text=Camera+Sony',
        price: 500,
        rating: 4.8,
        reviewCount: 124,
        isPopular: true,
        isNew: false,
        isFavorite: false,
        category: 'Câmeras',
        type: 'equipment',
        discount: 0
    },
    {
        id: '2',
        name: 'Lente Canon 24-70mm f/2.8',
        description: 'Lente zoom profissional com abertura constante',
        imageUrl: 'https://placehold.co/400x300/10b981/ffffff?text=Lente+Canon',
        price: 250,
        rating: 4.9,
        reviewCount: 89,
        isPopular: true,
        isNew: false,
        isFavorite: true,
        category: 'Lentes',
        type: 'equipment',
        discount: 15
    },
    {
        id: '3',
        name: 'Tripé Manfrotto 055',
        description: 'Tripé profissional em alumínio com cabeça ball head',
        imageUrl: 'https://placehold.co/400x300/f59e0b/ffffff?text=Tripe',
        price: 80,
        rating: 4.7,
        reviewCount: 156,
        isPopular: false,
        isNew: true,
        isFavorite: false,
        category: 'Acessórios',
        type: 'equipment',
        discount: 0
    },
    {
        id: '4',
        name: 'Kit Iluminação LED 3 Pontos',
        description: 'Set completo de iluminação profissional LED com tripés',
        imageUrl: 'https://placehold.co/400x300/8b5cf6/ffffff?text=Iluminacao',
        price: 350,
        rating: 4.6,
        reviewCount: 67,
        isPopular: false,
        isNew: true,
        isFavorite: false,
        category: 'Iluminação',
        type: 'kit',
        discount: 20
    },
    {
        id: '5',
        name: 'Microfone Rode NTG5',
        description: 'Microfone shotgun super-cardióide de alta qualidade',
        imageUrl: 'https://placehold.co/400x300/ec4899/ffffff?text=Microfone',
        price: 180,
        rating: 4.8,
        reviewCount: 92,
        isPopular: true,
        isNew: false,
        isFavorite: true,
        category: 'Áudio',
        type: 'equipment',
        discount: 0
    },
    {
        id: '6',
        name: 'Monitor Atomos Ninja V',
        description: 'Monitor e gravador externo 5" 4K HDR com touchscreen',
        imageUrl: 'https://placehold.co/400x300/06b6d4/ffffff?text=Monitor',
        price: 420,
        rating: 4.9,
        reviewCount: 143,
        isPopular: true,
        isNew: false,
        isFavorite: false,
        category: 'Monitores',
        type: 'equipment',
        discount: 10
    },
    {
        id: '7',
        name: 'Gimbal DJI Ronin-S',
        description: 'Estabilizador de 3 eixos para câmeras DSLR e mirrorless',
        imageUrl: 'https://placehold.co/400x300/14b8a6/ffffff?text=Gimbal',
        price: 300,
        rating: 4.7,
        reviewCount: 178,
        isPopular: true,
        isNew: true,
        isFavorite: false,
        category: 'Estabilizadores',
        type: 'equipment',
        discount: 0
    },
    {
        id: '8',
        name: 'Kit Completo Produção',
        description: 'Kit completo com câmera, lentes, iluminação e áudio',
        imageUrl: 'https://placehold.co/400x300/f97316/ffffff?text=Kit+Completo',
        price: 1200,
        rating: 5.0,
        reviewCount: 45,
        isPopular: true,
        isNew: true,
        isFavorite: true,
        category: 'Kits',
        type: 'kit',
        discount: 25
    }
];

export const RecommendationsDemo = () => {
    const { addNotification } = useNotifications();
    const [selectedType, setSelectedType] = useState<string>('personalized');

    const recommendationTypes = [
        { value: 'personalized', label: 'Personalizadas', emoji: '✨' },
        { value: 'similar', label: 'Similares', emoji: '📦' },
        { value: 'frequently-bought', label: 'Frequentemente Juntos', emoji: '👥' },
        { value: 'trending', label: 'Tendências', emoji: '📈' },
        { value: 'new', label: 'Novidades', emoji: '⚡' },
        { value: 'seasonal', label: 'Sazonais', emoji: '🏆' }
    ];

    return (
        <div className="min-h-screen bg-background">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

                {/* Header */}
                <div className="text-center mb-12">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
                        <Sparkles className="h-8 w-8 text-primary" />
                    </div>
                    <h1 className="text-4xl font-bold text-foreground mb-4">
                        Sistema de Recomendações
                    </h1>
                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                        Demonstração interativa do sistema de recomendações inteligentes do PrepareC
                    </p>
                </div>

                {/* Type Selector */}
                <Card className="p-6 mb-8">
                    <h2 className="text-lg font-semibold text-foreground mb-4">
                        Escolha o tipo de recomendação:
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                        {recommendationTypes.map((type) => (
                            <button
                                key={type.value}
                                onClick={() => setSelectedType(type.value)}
                                className={`p-4 rounded-lg border-2 transition-all duration-200 ${selectedType === type.value
                                        ? 'border-primary bg-primary/10 shadow-lg scale-105'
                                        : 'border-border hover:border-primary/50'
                                    }`}
                            >
                                <div className="text-3xl mb-2">{type.emoji}</div>
                                <div className="text-sm font-medium text-foreground">
                                    {type.label}
                                </div>
                            </button>
                        ))}
                    </div>
                </Card>

                {/* Info Card */}
                <Card className="p-6 mb-8 bg-muted/30">
                    <h3 className="font-semibold text-foreground mb-2">
                        ℹ️ Sobre este tipo de recomendação:
                    </h3>
                    <p className="text-muted-foreground">
                        {selectedType === 'personalized' &&
                            'Recomendações baseadas no histórico e preferências do usuário. Usa análise de reservas anteriores, favoritos e comportamento de navegação.'}
                        {selectedType === 'similar' &&
                            'Produtos similares ao que o usuário está visualizando. Baseado em categoria, preço e características técnicas.'}
                        {selectedType === 'frequently-bought' &&
                            'Itens que outros clientes frequentemente reservam juntos. Análise de padrões de co-ocorrência em reservas.'}
                        {selectedType === 'trending' &&
                            'Os produtos mais populares no momento. Baseado em número de visualizações e reservas recentes.'}
                        {selectedType === 'new' &&
                            'Produtos recém-adicionados ao catálogo. Perfeito para manter clientes atualizados com novidades.'}
                        {selectedType === 'seasonal' &&
                            'Produtos relevantes para a época do ano atual. Considera sazonalidade e tendências temporais.'}
                    </p>
                </Card>

                {/* Recommendation Section */}
                <RecommendationSection
                                        type={selectedType as any}
                    items={mockRecommendations}
                    maxItems={4}
                    showNavigation={true}
                    viewAllText="Ver Todos os Produtos"
                    columns={{ sm: 1, md: 2, lg: 4 }}
                    onItemClick={(item) => {
                        addNotification({
                            type: 'info',
                            title: 'Item Clicado',
                            message: `Você clicou em: ${item.name}`
                        });
                    }}
                    onViewAll={() => {
                        addNotification({
                            type: 'info',
                            title: 'Navegação',
                            message: 'Navegando para página de produtos...'
                        });
                    }}
                />

                {/* Features Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
                    <Card className="p-6 text-center">
                        <div className="text-4xl mb-3">🎯</div>
                        <h3 className="font-semibold text-foreground mb-2">Personalização</h3>
                        <p className="text-sm text-muted-foreground">
                            Recomendações únicas para cada usuário baseadas em comportamento
                        </p>
                    </Card>

                    <Card className="p-6 text-center">
                        <div className="text-4xl mb-3">⚡</div>
                        <h3 className="font-semibold text-foreground mb-2">Performance</h3>
                        <p className="text-sm text-muted-foreground">
                            Carregamento assíncrono e skeleton screens para UX fluida
                        </p>
                    </Card>

                    <Card className="p-6 text-center">
                        <div className="text-4xl mb-3">📊</div>
                        <h3 className="font-semibold text-foreground mb-2">Analytics</h3>
                        <p className="text-sm text-muted-foreground">
                            Tracking completo de cliques, conversões e engajamento
                        </p>
                    </Card>
                </div>

                {/* Code Example */}
                <Card className="p-6 mt-12">
                    <h3 className="font-semibold text-foreground mb-4">
                        💻 Exemplo de Código
                    </h3>
                    <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                        <code>{`import { RecommendationSection } from '@/components/ui/RecommendationSection';
import { useRecommendations } from '@/hooks/useRecommendations';

const { recommendations, loading } = useRecommendations({
  type: '${selectedType}',
  limit: 4
});

<RecommendationSection
  type="${selectedType}"
  items={recommendations}
  maxItems={4}
  loading={loading}
  viewAllLink="/equipamentos"
  columns={{ sm: 1, md: 2, lg: 4 }}
/>`}</code>
                    </pre>
                </Card>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-12">
                    <div className="text-center">
                        <div className="text-3xl font-bold text-primary mb-1">6</div>
                        <div className="text-sm text-muted-foreground">Tipos de Recomendações</div>
                    </div>
                    <div className="text-center">
                        <div className="text-3xl font-bold text-success mb-1">+40%</div>
                        <div className="text-sm text-muted-foreground">Aumento em Conversão</div>
                    </div>
                    <div className="text-center">
                        <div className="text-3xl font-bold text-warning mb-1">+2.5x</div>
                        <div className="text-sm text-muted-foreground">Mais Engajamento</div>
                    </div>
                    <div className="text-center">
                        <div className="text-3xl font-bold text-info mb-1">+65%</div>
                        <div className="text-sm text-muted-foreground">Descoberta de Produtos</div>
                    </div>
                </div>

            </div>
        </div>
    );
};
