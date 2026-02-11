import React, { useState, useEffect } from 'react';
import { Edit2, Plus, X } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Card } from '../../../components/ui/Card';
import { settingsApi, Department } from '../../../lib/api/settings';

export const DepartmentsTab: React.FC = () => {
    const [departments, setDepartments] = useState<Department[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<Department | null>(null);
    const [formData, setFormData] = useState({ name: '', code: '', display_order: 0 });

    const fetchDepartments = async () => {
        try {
            setLoading(true);
            const data = await settingsApi.getDepartments();
            setDepartments(data);
        } catch (error) {
            console.error('Error fetching departments:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDepartments();
    }, []);

    const handleOpenModal = (item?: Department) => {
        if (item) {
            setEditingItem(item);
            setFormData({
                name: item.name,
                code: item.code || '',
                display_order: item.display_order || 0
            });
        } else {
            setEditingItem(null);
            setFormData({ name: '', code: '', display_order: departments.length * 10 });
        }
        setIsModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingItem) {
                await settingsApi.updateDepartment(editingItem.id, formData);
            } else {
                await settingsApi.createDepartment(formData);
            }
            setIsModalOpen(false);
            fetchDepartments();
        } catch (error) {
            console.error('Error saving department:', error);
            alert('Error al guardar departamento');
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <Button onClick={() => handleOpenModal()}>
                    <Plus className="mr-2 h-4 w-4" /> Nuevo Departamento
                </Button>
            </div>

            <Card className="rounded-md border">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="h-10 px-4 text-left font-medium text-gray-500">Orden</th>
                            <th className="h-10 px-4 text-left font-medium text-gray-500">Nombre</th>
                            <th className="h-10 px-4 text-left font-medium text-gray-500">Código</th>
                            <th className="h-10 px-4 text-right font-medium text-gray-500">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={4} className="p-4 text-center">Cargando...</td></tr>
                        ) : departments.length === 0 ? (
                            <tr><td colSpan={4} className="p-4 text-center text-gray-500">No hay departamentos registrados</td></tr>
                        ) : (
                            departments.map(item => (
                                <tr key={item.id} className="border-b last:border-0 hover:bg-gray-50">
                                    <td className="p-4 text-gray-500 w-20">{item.display_order}</td>
                                    <td className="p-4 font-medium">{item.name}</td>
                                    <td className="p-4 font-mono text-xs text-gray-500">{item.code}</td>
                                    <td className="p-4 text-right">
                                        <Button variant="ghost" size="icon" onClick={() => handleOpenModal(item)}>
                                            <Edit2 className="h-4 w-4" />
                                        </Button>
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
                            <h3 className="font-semibold">{editingItem ? 'Editar Departamento' : 'Nuevo Departamento'}</h3>
                            <Button variant="ghost" size="icon" onClick={() => setIsModalOpen(false)}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                        <form onSubmit={handleSave} className="p-4 space-y-4">
                            <div className="flex gap-4">
                                <div className="w-1/3">
                                    <label className="text-sm font-medium mb-1 block">Orden</label>
                                    <Input
                                        type="number"
                                        value={formData.display_order}
                                        onChange={e => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                                    />
                                </div>
                                <div className="flex-1">
                                    <label className="text-sm font-medium mb-1 block">Código</label>
                                    <Input
                                        value={formData.code}
                                        onChange={e => setFormData({ ...formData, code: e.target.value })}
                                        placeholder="MKT"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-1 block">Nombre</label>
                                <Input
                                    required
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Marketing"
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
