import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { socialService } from '../../services/socialService';
import { Plus, ExternalLink, Instagram, Tv } from 'lucide-react';

interface SocialWall {
    id: string;
    name?: string;
    hashtag: string;
    slug?: string;
    bookingId?: string;
}

const AdminSocialListPage: React.FC = () => {
    const [walls, setWalls] = useState<SocialWall[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [newWall, setNewWall] = useState({ name: '', hashtag: '', slug: '' });
    const navigate = useNavigate();

    useEffect(() => {
        fetchWalls();
    }, []);

    const fetchWalls = async () => {
        try {
            setLoading(true);
            const response = await socialService.listWalls();
            setWalls(response.data);
        } catch (error) {
            console.error('Failed to fetch walls', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await socialService.createWall(newWall);
            setIsCreating(false);
            setNewWall({ name: '', hashtag: '', slug: '' });
            fetchWalls();
        } catch (error) {
            alert('Erro ao criar mural');
        }
    };

    return (
        <div className="container mx-auto p-6 max-w-6xl">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Social Walls</h1>
                    <p className="text-gray-500 mt-1">Gerencie murais de Instagram independentes ou vinculados a eventos.</p>
                </div>
                <button 
                    onClick={() => setIsCreating(true)}
                    className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
                >
                    <Plus size={20} /> Novo Mural
                </button>
            </div>

            {isCreating && (
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg mb-8 border border-gray-200 dark:border-gray-700 animate-fade-in">
                    <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">Criar Novo Mural</h2>
                    <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                        <div>
                            <label className="block text-sm font-medium mb-1 dark:text-gray-300">Nome do Mural</label>
                            <input 
                                className="w-full p-2 border rounded-lg bg-gray-50 dark:bg-gray-900 dark:border-gray-700 dark:text-white"
                                placeholder="Ex: Casamento João"
                                value={newWall.name}
                                onChange={e => setNewWall({...newWall, name: e.target.value})}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1 dark:text-gray-300">Hashtag (sem #)</label>
                            <div className="relative">
                                <span className="absolute left-3 top-2 text-gray-400">#</span>
                                <input 
                                    className="w-full p-2 pl-7 border rounded-lg bg-gray-50 dark:bg-gray-900 dark:border-gray-700 dark:text-white"
                                    placeholder="festa2024"
                                    value={newWall.hashtag}
                                    onChange={e => setNewWall({...newWall, hashtag: e.target.value.replace('#', '')})}
                                    required
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1 dark:text-gray-300">Slug (URL Amigável) - Opcional</label>
                            <input 
                                className="w-full p-2 border rounded-lg bg-gray-50 dark:bg-gray-900 dark:border-gray-700 dark:text-white"
                                placeholder="casamento-joao"
                                value={newWall.slug}
                                onChange={e => setNewWall({...newWall, slug: e.target.value})}
                            />
                        </div>
                        <div className="flex gap-2">
                             <button type="button" onClick={() => setIsCreating(false)} className="px-4 py-2 text-gray-500 hover:text-gray-700">Cancelar</button>
                             <button type="submit" className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">Salvar</button>
                        </div>
                    </form>
                </div>
            )}

            {loading ? (
                <div className="text-center py-20 text-gray-500">Carregando...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {walls.map((wall) => (
                        <div key={wall.id} className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-100 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow">
                             <div className="p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">{wall.name || 'Sem Nome'}</h3>
                                        <div className="flex items-center gap-1 text-pink-600 font-medium text-sm mt-1">
                                            <Instagram size={14} /> #{wall.hashtag}
                                        </div>
                                    </div>
                                    {wall.bookingId ? (
                                        <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">Evento</span>
                                    ) : (
                                        <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full">Independente</span>
                                    )}
                                </div>

                                {wall.slug && (
                                     <div className="mb-4 bg-gray-50 dark:bg-gray-900 p-2 rounded text-xs text-gray-500 flex items-center justify-between">
                                        <span className="truncate">URL: /tv?slug={wall.slug}</span>
                                        <a href={`/tv?slug=${wall.slug}`} target="_blank" className="text-primary hover:underline" title="Abrir Mural em nova aba"><ExternalLink size={12}/></a>
                                     </div>
                                )}

                                <div className="flex gap-2 mt-4">
                                    <button 
                                        onClick={() => navigate(`/admin/social/${wall.id}`)}
                                        className="flex-1 bg-gray-900 dark:bg-gray-700 text-white py-2 rounded-lg text-sm font-medium hover:bg-black transition-colors"
                                    >
                                        Gerenciar
                                    </button>
                                     <button 
                                        onClick={() => window.open(`/tv?slug=${wall.slug || ''}&code=${wall.id.substring(0,4)}`, '_blank')}
                                        className="w-10 flex items-center justify-center border border-gray-200 dark:border-gray-600 rounded-lg text-gray-500 hover:text-primary hover:border-primary transition-colors"
                                        title="Abrir TV"
                                    >
                                        <Tv size={18} />
                                    </button>
                                </div>
                             </div>
                        </div>
                    ))}

                    {walls.length === 0 && (
                        <div className="col-span-full py-20 text-center bg-gray-50 dark:bg-gray-800/50 rounded-xl border-dashed border-2 border-gray-200 dark:border-gray-700">
                             <p className="text-gray-500 text-lg">Nenhum mural encontrado.</p>
                             <button onClick={() => setIsCreating(true)} className="text-primary font-medium mt-2 hover:underline">Criar o primeiro</button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default AdminSocialListPage;
