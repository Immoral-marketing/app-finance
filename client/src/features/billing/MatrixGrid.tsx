import { useState, useEffect, useRef } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api/admin';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { MoreHorizontal, Trash2, Copy, MessageSquare, X, Check, CheckCircle2 } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';

interface CommentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (val: string, assignedTo: string[]) => void;
    onStatusChange?: (status: 'done' | 'deleted') => void;
    initialValue: string;
    initialAssignedTo: string[];
    title: string;
    users: any[];
    hasNote?: boolean; // true si ya existe una nota guardada
}

const CommentModal = ({ isOpen, onClose, onSave, onStatusChange, initialValue, initialAssignedTo, title, users, hasNote }: CommentModalProps) => {
    const [value, setValue] = useState(initialValue);
    const [assigned, setAssigned] = useState<string[]>(initialAssignedTo || []);

    useEffect(() => {
        setValue(initialValue);
        setAssigned(initialAssignedTo || []);
    }, [initialValue, initialAssignedTo, isOpen]);

    const toggleUser = (userId: string) => {
        setAssigned(prev =>
            prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
        );
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-lg shadow-xl w-[450px] p-4 animate-in fade-in zoom-in duration-200 flex flex-col gap-4">
                <div className="flex justify-between items-center">
                    <h3 className="font-bold text-lg">{title}</h3>
                    <button className="p-1 hover:bg-gray-100 rounded" onClick={onClose}><X className="h-4 w-4" /></button>
                </div>

                <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-gray-700">Comentario</label>
                    <textarea
                        className="w-full h-24 p-2 border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        placeholder="Escriba una nota..."
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        autoFocus
                    />
                </div>

                <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-gray-700">Asignar a:</label>
                    <div className="border rounded-md p-2 max-h-[150px] overflow-y-auto space-y-1">
                        {users.map(user => (
                            <div
                                key={user.id}
                                className={`flex items-center gap-2 p-1.5 rounded cursor-pointer hover:bg-gray-100 ${assigned.includes(user.id) ? 'bg-blue-50' : ''}`}
                                onClick={() => toggleUser(user.id)}
                            >
                                <div className={`w-4 h-4 rounded border flex items-center justify-center ${assigned.includes(user.id) ? 'bg-blue-500 border-blue-500' : 'border-gray-300'}`}>
                                    {assigned.includes(user.id) && <Check className="h-3 w-3 text-white" />}
                                </div>
                                <span className="text-sm">{user.display_name || user.email}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Acciones de estado — solo si la nota ya existe */}
                {hasNote && onStatusChange && (
                    <div className="flex gap-2 pt-1 border-t">
                        <button
                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm text-green-700 border border-green-300 rounded-md hover:bg-green-50 transition-colors"
                            onClick={() => { onStatusChange('done'); onClose(); }}
                        >
                            <CheckCircle2 className="h-4 w-4" />
                            Realizado
                        </button>
                        <button
                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm text-red-700 border border-red-300 rounded-md hover:bg-red-50 transition-colors"
                            onClick={() => { onStatusChange('deleted'); onClose(); }}
                        >
                            <Trash2 className="h-4 w-4" />
                            Eliminar
                        </button>
                    </div>
                )}

                <div className="flex justify-end gap-2 mt-1">
                    <button className="px-3 py-1.5 text-sm border rounded-md hover:bg-gray-50" onClick={onClose}>Cancelar</button>
                    <button className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700" onClick={() => onSave(value, assigned)}>Guardar</button>
                </div>
            </div>
        </div>
    );
};

interface MatrixGridProps {
    data: {
        columns: any[];
        rows: any[];
    };
    year: number;
    month: number;
}

interface ContextMenuState {
    x: number;
    y: number;
    rowIndex: number;
    field: string;
    serviceId?: string;
    clientName: string;
}

interface HoverState {
    rowIndex: number;
    field: string;
    serviceId?: string;
    x: number;
    y: number;
}

export const MatrixGrid = ({ data, year, month }: MatrixGridProps) => {
    const [localRows, setLocalRows] = useState(data.rows);
    const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
    const [editingComment, setEditingComment] = useState<{
        isOpen: boolean,
        rowIndex: number,
        field: string,
        serviceId?: string,
        initialValue: string,
        initialAssignedTo: string[]
    } | null>(null);

    const [hoveredCell, setHoveredCell] = useState<HoverState | null>(null);
    const hoverTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

    const { data: usersData } = useQuery({
        queryKey: ['users'],
        queryFn: adminApi.getUsers
    });
    const users = usersData?.users || [];

    // Close context menu on click elsewhere
    useEffect(() => {
        const handleClick = () => setContextMenu(null);
        document.addEventListener('click', handleClick);
        return () => document.removeEventListener('click', handleClick);
    }, []);

    useEffect(() => {
        setLocalRows(data.rows);
    }, [data.rows]);

    const saveMutation = useMutation({
        mutationFn: adminApi.saveMatrixCell,
        onError: () => {
            toast.error("Error al guardar");
        }
    });

    const handleCellChange = (rowIndex: number, field: string, value: any, serviceId?: string) => {
        const newRows = [...localRows];
        const row = newRows[rowIndex];

        if (serviceId) {
            row.services[serviceId] = Number(value);
        } else if (field === 'vencimiento') {
            row.vencimiento = value;
        } else if (field === 'vertical') {
            row.vertical = value;
        } else {
            // Metadata update
            if (field === 'investment') row.metadata.investment = Number(value);
            if (field === 'fee_pct') row.metadata.fee_pct = Number(value);
            if (field === 'platform_count') row.metadata.platform_count = Number(value);

            // Client-Side Recalc with Fee Config
            if (['investment', 'fee_pct', 'platform_count'].includes(field)) {
                const inv = Number(row.metadata.investment || 0);
                const count = Number(row.metadata.platform_count || 1);
                const config = row.fee_config || {
                    fee_type: 'fixed', fixed_pct: 10,
                    platform_cost_first: 700, platform_cost_additional: 300
                };

                let pct = Number(row.metadata.fee_pct || 0);
                if (field !== 'fee_pct' && config.fee_type === 'variable' && config.variable_ranges) {
                    const range = config.variable_ranges.find((r: any) =>
                        inv >= (r.min || 0) && (r.max === null || inv <= r.max)
                    );
                    pct = range ? Number(range.pct) : Number(config.fixed_pct || 10);
                    row.metadata.fee_pct = pct;
                } else if (field !== 'fee_pct' && config.fee_type === 'fixed') {
                    pct = Number(config.fixed_pct || 10);
                    if (!row.is_manual_override) row.metadata.fee_pct = pct;
                }

                const platformCost = config.platform_cost_first +
                    (Math.max(0, count - 1) * config.platform_cost_additional);

                row.metadata.fee_paid = (inv * (pct / 100)) + platformCost;
            }
        }
        setLocalRows(newRows);
    };

    const handleBlur = (client_id: string, field: string, value: any, serviceId?: string) => {
        // Buscar el comentario existente para no perderlo al guardar el valor numérico
        const row = localRows.find((r: any) => r.client_id === client_id);
        let existingComment: string | undefined;
        let existingAssignedTo: string[] | undefined;

        if (row) {
            const info = normalizeComment(getCommentInfo(row, field, serviceId));
            if (info.comment || info.assigned_to.length > 0) {
                existingComment = info.comment;
                existingAssignedTo = info.assigned_to;
            }
        }

        saveMutation.mutate({
            year,
            month,
            client_id,
            field,
            value,
            service_id: serviceId,
            // Solo mandar comment/assigned si existen, para no sobrescribir con undefined
            ...(existingComment !== undefined ? { comment: existingComment } : {}),
            ...(existingAssignedTo !== undefined ? { assigned_to: existingAssignedTo } : {})
        });
    };

    const handleContextMenu = (e: React.MouseEvent, rowIndex: number, field: string, serviceId?: string) => {
        e.preventDefault();
        const row = localRows[rowIndex];
        setContextMenu({
            x: e.clientX,
            y: e.clientY,
            rowIndex,
            field,
            serviceId,
            clientName: row.client_name
        });
    };

    const getCommentInfo = (row: any, field: string, serviceId?: string) => {
        if (!row.comments) return null;
        if (serviceId) return row.comments.services?.[serviceId]; // Might returned string (simple) or object (rich)
        return row.comments.metadata?.[field]; // Returns object { comment, assigned_to } or just string?
    };

    // Normalize comment info
    const normalizeComment = (info: any) => {
        if (!info) return { comment: '', assigned_to: [] };
        if (typeof info === 'string') return { comment: info, assigned_to: [] };
        return { comment: info.comment || '', assigned_to: info.assigned_to || [] };
    };

    const handleSaveComment = (val: string, assignedTo: string[]) => {
        if (!editingComment) return;
        const { rowIndex, field, serviceId } = editingComment;
        const row = localRows[rowIndex];

        // Optimistic update
        const newRows = [...localRows];
        const targetRow = newRows[rowIndex];

        if (!targetRow.comments) targetRow.comments = { metadata: {}, services: {} };

        const newMeta = { comment: val, assigned_to: assignedTo };

        if (!val && assignedTo.length === 0) {
            // Delete
            if (serviceId) delete targetRow.comments.services[serviceId];
            else delete targetRow.comments.metadata[field];
        } else {
            // Update
            if (serviceId) targetRow.comments.services[serviceId] = newMeta;
            else targetRow.comments.metadata[field] = newMeta;
        }

        setLocalRows(newRows);
        setEditingComment(null);

        // API Call
        saveMutation.mutate({
            year,
            month,
            client_id: row.client_id,
            field: field,
            value: serviceId ? (row.services[serviceId] || 0) : (field === 'investment' ? row.metadata.investment : row.metadata.fee_pct),
            service_id: serviceId,
            comment: val,
            assigned_to: assignedTo
        });
    };




    const handleMouseEnter = (e: React.MouseEvent, rowIndex: number, field: string, serviceId?: string) => {
        const row = localRows[rowIndex];
        const info = getCommentInfo(row, field, serviceId);
        if (!info) return;

        const rect = (e.target as HTMLElement).getBoundingClientRect();

        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = setTimeout(() => {
            setHoveredCell({
                rowIndex, field, serviceId,
                x: rect.right + 10,
                y: rect.top
            });
        }, 500); // 500ms delay
    };

    const handleMouseLeave = () => {
        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
        setHoveredCell(null);
    };

    const renderCell = (rIndex: number, field: string, value: any, serviceId?: string, className?: string, placeholder?: string) => {
        const row = localRows[rIndex];
        const rawInfo = getCommentInfo(row, field, serviceId);
        const { comment, assigned_to } = normalizeComment(rawInfo);
        const hasComment = !!comment || assigned_to.length > 0;

        return (
            <div
                className="relative w-full h-full"
                onContextMenu={(e) => handleContextMenu(e, rIndex, field, serviceId)}
                onMouseEnter={(e) => handleMouseEnter(e, rIndex, field, serviceId)}
                onMouseLeave={handleMouseLeave}
            >
                <Input
                    className={className || "h-full w-full border-none rounded-none text-right bg-transparent focus:ring-0 focus:bg-blue-50/50 text-xs"}
                    value={value}
                    placeholder={placeholder || "-"}
                    onChange={(e) => handleCellChange(rIndex, field, e.target.value, serviceId)}
                    onBlur={(e) => handleBlur(row.client_id, field, e.target.value, serviceId)}
                />
                {hasComment && (
                    <div className="absolute top-0 right-0 w-0 h-0 border-t-[6px] border-l-[6px] border-t-red-500 border-l-transparent pointer-events-none" />
                )}
            </div>
        );
    };

    // --- COLUMN MAPPING HELPER ---
    const getSvc = (code: string) => data.columns.find(c => c.code === code);
    const immediaSvcs = [getSvc('PAID_MEDIA_STRATEGY'), getSvc('PAID_MEDIA_SETUP')].filter(Boolean);
    const imcontentSvcs = [getSvc('BRANDING'), getSvc('CONTENT_DESIGN'), getSvc('AI_CONTENT'), getSvc('SOCIAL_MEDIA_MGMT'), getSvc('DIGITAL_STRATEGY'), getSvc('INFLUENCER_UGC')].filter(Boolean);
    const immoraliaSvcs = [getSvc('IMMORALIA_SETUP'), getSvc('AGENCY_AUTO'), getSvc('CONSULTING_AUTO')].filter(Boolean);
    const immoralSvcs = [getSvc('SEO'), getSvc('WEB_DEV'), getSvc('MKT_AUTO_EMAIL')].filter(Boolean);

    const calculateRowTotal = (row: any) => {
        let sum = 0;
        Object.keys(row.services).forEach(svcId => {
            sum += Number(row.services[svcId] || 0);
        });
        return sum;
    };

    const calculateTotals = () => {
        const totals: any = { investment: 0, fee_paid: 0, services: {}, grand_grand: 0 };
        localRows.forEach(row => {
            totals.investment += Number(row.metadata.investment || 0);
            totals.fee_paid += Number(row.metadata.fee_paid || 0);
            const rowTotal = calculateRowTotal(row);
            totals.grand_grand += rowTotal;
            Object.keys(row.services).forEach(svcId => {
                totals.services[svcId] = (totals.services[svcId] || 0) + Number(row.services[svcId] || 0);
            });
        });
        return totals;
    };
    const totals = calculateTotals();

    const handleRowAction = (action: string, client_id: string) => {
        if (action === 'delete') toast.error(`Delete functionality pending API for ${client_id}`);
        else if (action === 'duplicate') toast.success(`Duplicate functionality pending API for ${client_id}`);
    };

    return (
        <div className="relative w-full h-full overflow-auto max-h-[80vh] border rounded-lg shadow-sm bg-white">
            <table className="w-full text-sm text-left border-collapse">
                <thead className="sticky top-0 z-40 bg-white shadow-sm">
                    {/* Headers same as before but compressed for brevity in this replace */}
                    <tr className="border-b bg-muted/20">
                        <th className="p-2 border-r min-w-[350px] sticky left-0 bg-white z-50 font-bold text-center" rowSpan={2} colSpan={3}>Cliente</th>
                        <th className="p-2 border-r text-center font-bold text-blue-700 bg-blue-50 group cursor-pointer hover:bg-blue-100" colSpan={4 + immediaSvcs.length}>Immedia</th>
                        <th className="p-2 border-r text-center font-bold text-indigo-700 bg-indigo-50 group cursor-pointer hover:bg-indigo-100" colSpan={imcontentSvcs.length}>Imcontent</th>
                        <th className="p-2 border-r text-center font-bold text-orange-700 bg-orange-50 group cursor-pointer hover:bg-orange-100" colSpan={immoraliaSvcs.length}>Immoralia</th>
                        <th className="p-2 border-r text-center font-bold text-purple-700 bg-purple-50 group cursor-pointer hover:bg-purple-100" colSpan={immoralSvcs.length}>Immoral</th>
                        <th className="p-2 text-center min-w-[100px] font-bold bg-slate-100" rowSpan={2}>TOTAL</th>
                    </tr>
                    <tr className="border-b bg-gray-50 text-xs text-center">
                        <th className="p-2 border-r min-w-[100px]">Inversión</th>
                        <th className="p-2 border-r min-w-[70px]">% Fee</th>
                        <th className="p-2 border-r min-w-[50px]">Nº Plat</th>
                        <th className="p-2 border-r min-w-[100px]">Fee Mínimo</th>
                        {[...immediaSvcs, ...imcontentSvcs, ...immoraliaSvcs, ...immoralSvcs].map((c: any) => (
                            <th key={c.id} className="p-2 border-r min-w-[120px] font-medium text-muted-foreground whitespace-normal h-16 align-bottom pb-2">{c.name}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {localRows.map((row, rIndex) => (
                        <tr key={row.client_id} className="border-b hover:bg-slate-50 transition-colors group">
                            {/* Columns same as before... */}
                            <td className="p-0 border-r sticky left-0 bg-white group-hover:bg-slate-50 z-30 w-[60px] flex items-center justify-between">
                                {renderCell(rIndex, 'vencimiento', row.vencimiento, undefined, "h-full w-[35px] border-none rounded-none text-center bg-transparent focus:ring-0 focus:bg-slate-100 px-0 text-xs")}
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" className="h-full w-[20px] p-0 rounded-none hover:bg-slate-200">
                                            <MoreHorizontal className="h-3 w-3 text-slate-400" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                        <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={() => handleRowAction('duplicate', row.client_id)}><Copy className="mr-2 h-4 w-4" /> Duplicar Fila</DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleRowAction('delete', row.client_id)} className="text-red-600"><Trash2 className="mr-2 h-4 w-4" /> Eliminar Fila</DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </td>
                            <td className="p-0 border-r sticky left-[60px] bg-white group-hover:bg-slate-50 z-30 w-[80px]">
                                {renderCell(rIndex, 'vertical', row.vertical, undefined, "h-full w-full border-none rounded-none text-center bg-transparent focus:ring-0 focus:bg-slate-100 px-1 text-xs font-bold text-blue-600")}
                            </td>
                            <td className="p-2 border-r sticky left-[140px] bg-white group-hover:bg-slate-50 z-30 min-w-[200px] font-medium truncate">{row.client_name}</td>

                            <td className="p-0 border-r">{renderCell(rIndex, 'investment', row.metadata.investment)}</td>
                            <td className="p-0 border-r min-w-[70px]">{renderCell(rIndex, 'fee_pct', row.metadata.fee_pct, undefined, "h-full w-full border-none rounded-none text-right bg-transparent focus:ring-0 focus:bg-blue-50/50 px-2")}</td>
                            <td className="p-0 border-r min-w-[50px]">{renderCell(rIndex, 'platform_count', row.metadata.platform_count ?? 1, undefined, "h-full w-full border-none rounded-none text-right bg-transparent focus:ring-0 focus:bg-blue-50/50 px-2")}</td>
                            <td className="p-2 border-r font-bold text-muted-foreground text-xs text-right bg-blue-50/30 min-w-[100px]">-</td>

                            {[...immediaSvcs, ...imcontentSvcs, ...immoraliaSvcs, ...immoralSvcs].map((col: any, i) => (
                                <td key={col.id} className="p-0 border-r">
                                    {renderCell(rIndex, 'service_amount', row.services[col.id] || '', col.id, `h-full w-full border-none rounded-none text-right bg-transparent focus:ring-0 text-xs px-2 ${i < immediaSvcs.length ? 'focus:bg-blue-50/50' : i < (immediaSvcs.length + imcontentSvcs.length) ? 'focus:bg-indigo-50/50' : i < (immediaSvcs.length + imcontentSvcs.length + immoraliaSvcs.length) ? 'focus:bg-orange-50/50' : 'focus:bg-purple-50/50'}`)}
                                </td>
                            ))}

                            <td className="p-2 text-right font-bold bg-slate-100 sticky right-0 min-w-[100px]">
                                {formatCurrency(calculateRowTotal(row))}
                            </td>
                        </tr>
                    ))}
                </tbody>
                {/* Footer same ... */}
                <tfoot className="sticky bottom-0 z-40 bg-slate-900 text-white font-bold shadow-lg">
                    <tr>
                        <td className="p-3 border-r sticky left-0 bg-slate-900 z-50 text-right" colSpan={3}>TOTALES</td>
                        <td className="p-2 border-r text-right bg-slate-800">{formatCurrency(totals.investment)}</td>
                        <td className="p-2 border-r bg-slate-800"></td>
                        <td className="p-2 border-r bg-slate-800"></td>
                        <td className="p-2 border-r text-right bg-slate-800 text-muted-foreground">-</td>
                        {[...immediaSvcs, ...imcontentSvcs, ...immoraliaSvcs, ...immoralSvcs].map((c: any) => (
                            <td key={c.id} className="p-2 border-r text-right text-xs">{totals.services[c.id] ? formatCurrency(totals.services[c.id]) : '-'}</td>
                        ))}
                        <td className="p-2 text-right bg-slate-950 sticky right-0 text-white font-bold">{formatCurrency(totals.grand_grand)}</td>
                    </tr>
                </tfoot>
            </table>

            {/* Context Menu */}
            {contextMenu && (
                <div className="fixed z-[100] bg-white border rounded shadow-lg py-1 w-40" style={{ top: contextMenu.y, left: contextMenu.x }}>
                    <div className="px-3 py-1 bg-slate-100 text-xs font-bold border-b mb-1 truncate">{contextMenu.clientName}</div>
                    <button
                        className="w-full text-left px-4 py-2 text-sm hover:bg-slate-100 flex items-center gap-2"
                        onClick={() => {
                            const row = localRows[contextMenu.rowIndex];
                            const curr = normalizeComment(getCommentInfo(row, contextMenu.field, contextMenu.serviceId));
                            setEditingComment({
                                isOpen: true,
                                rowIndex: contextMenu.rowIndex,
                                field: contextMenu.field,
                                serviceId: contextMenu.serviceId,
                                initialValue: curr.comment,
                                initialAssignedTo: curr.assigned_to
                            });
                            setContextMenu(null);
                        }}
                    >
                        <MessageSquare className="h-4 w-4" />
                        {getCommentInfo(localRows[contextMenu.rowIndex], contextMenu.field, contextMenu.serviceId) ? "Editar Nota" : "Insertar Nota"}
                    </button>
                </div>
            )}

            {/* Hover Popover */}
            {hoveredCell && (() => {
                const row = localRows[hoveredCell.rowIndex];
                const info = normalizeComment(getCommentInfo(row, hoveredCell.field, hoveredCell.serviceId));
                if (!info.comment && info.assigned_to.length === 0) return null;

                const assignedUsers = users.filter(u => info.assigned_to.includes(u.id));

                return (
                    <div
                        className="fixed z-[100] bg-white border rounded-lg shadow-xl p-3 w-[250px] animate-in fade-in zoom-in duration-200"
                        style={{ top: hoveredCell.y, left: hoveredCell.x }}
                    >
                        {info.comment && <div className="text-sm text-gray-800 mb-2 whitespace-pre-wrap">{info.comment}</div>}

                        {assignedUsers.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2 border-t pt-2">
                                <span className="text-xs text-gray-500 w-full mb-1">Asignado a:</span>
                                {assignedUsers.map(u => (
                                    <div key={u.id} className="flex items-center gap-1 bg-blue-50 px-1.5 py-0.5 rounded-full border border-blue-100">
                                        <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center text-[8px] text-white font-bold">
                                            {(u.display_name || u.email).substring(0, 2).toUpperCase()}
                                        </div>
                                        <span className="text-[10px] text-blue-700 truncate max-w-[80px]">{u.display_name || u.email}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                );
            })()}

            {/* Comment Editor */}
            {editingComment && (() => {
                const row = localRows[editingComment.rowIndex];
                const existingInfo = normalizeComment(getCommentInfo(row, editingComment.field, editingComment.serviceId));
                const hasNote = !!(existingInfo.comment || existingInfo.assigned_to.length > 0);
                return (
                    <CommentModal
                        isOpen={editingComment.isOpen}
                        onClose={() => setEditingComment(null)}
                        onSave={handleSaveComment}
                        onStatusChange={() => {
                            // Para billing, eliminar/realizado = limpiar la nota localmente y guardar vacío
                            handleSaveComment('', []);
                        }}
                        initialValue={editingComment.initialValue}
                        initialAssignedTo={editingComment.initialAssignedTo}
                        title={editingComment.serviceId ? "Nota de Servicio" : "Nota de Celda"}
                        users={users}
                        hasNote={hasNote}
                    />
                );
            })()}
        </div>
    );
};
