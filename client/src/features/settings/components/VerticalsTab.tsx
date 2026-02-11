import React, { useState, useEffect } from 'react';
import { Edit2, Trash2, Plus, X } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Card } from '../../../components/ui/Card';
import { settingsApi, Vertical } from '../../../lib/api/settings';

export const VerticalsTab: React.FC = () => {
    const [verticals, setVerticals] = useState<Vertical[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<Vertical | null>(null);
    const [formData, setFormData] = useState({ name: '', code: '' });

    const fetchVerticals = async () => {
        try {
            setLoading(true);
            const data = await settingsApi.getVerticals();
            setVerticals(data);
        } catch (error) {
            console.error('Error fetching verticals:', error);
            // Optionally show toast error
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchVerticals();
    }, []);

    const handleOpenModal = (item?: Vertical) => {
        if (item) {
            setEditingItem(item);
            setFormData({ name: item.name, code: item.code || '' });
        } else {
            setEditingItem(null);
            setFormData({ name: '', code: '' });
        }
        setIsModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingItem) {
                await settingsApi.updateVertical(editingItem.id, formData);
            } else {
                await settingsApi.createVertical(formData);
            }
            setIsModalOpen(false);
            fetchVerticals();
        } catch (error) {
            console.error('Error saving vertical:', error);
            alert('Error al guardar vertical');
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!window.confirm(`¿Estás seguro de que quieres eliminar la vertical "${name}"?`)) return;

        try {
            await settingsApi.deleteVertical(id);
            fetchVerticals();
        } catch (error) {
            console.error('Error deleting vertical:', error);
            alert('Error al eliminar vertical. Puede que esté asignada a un cliente.');
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <Button onClick={() => handleOpenModal()}>
                    <Plus className="mr-2 h-4 w-4" /> Nueva Vertical
                </Button>
            </div>

            <Card className="rounded-md border">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="h-10 px-4 text-left font-medium text-gray-500">Nombre</th>
                            <th className="h-10 px-4 text-left font-medium text-gray-500">Código</th>
                            <th className="h-10 px-4 text-right font-medium text-gray-500">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={3} className="p-4 text-center">Cargando...</td></tr>
                        ) : verticals.length === 0 ? (
                            <tr><td colSpan={3} className="p-4 text-center text-gray-500">No hay verticales registradas</td></tr>
                        ) : (
                            verticals.map(item => (
                                <tr key={item.id} className="border-b last:border-0 hover:bg-gray-50">
                                    <td className="p-4 font-medium">{item.name}</td>
                                    <td className="p-4 font-mono text-xs text-gray-500">{item.code}</td>
                                    <td className="p-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="ghost" size="icon" onClick={() => handleOpenModal(item)}>
                                                <Edit2 className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id, item.name)}>
                                                <Trash2 className="h-4 w-4 text-red-500" />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </Card>

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
                        <div className="flex items-center justify-between p-4 border-b">
                            <h3 className="font-semibold">{editingItem ? 'Editar Vertical' : 'Nueva Vertical'}</h3>
                            <Button variant="ghost" size="icon" onClick={() => setIsModalOpen(false)}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                        <form onSubmit={handleSave} className="p-4 space-y-4">
                            <div>
                                <label className="text-sm font-medium mb-1 block">Nombre</label>
                                <Input
                                    required
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Ej: Finance"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-1 block">Código</label>
                                <Input
                                    value={formData.code}
                                    onChange={e => setFormData({ ...formData, code: e.target.value })}
                                    placeholder="Ej: FIN (Opcional)"
                                />
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                                <Button type="submit">Guardar</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
