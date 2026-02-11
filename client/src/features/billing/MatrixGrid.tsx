import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { adminApi } from '@/lib/api/admin';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { MoreHorizontal, Trash2, Copy } from 'lucide-react';
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

interface MatrixGridProps {
    data: {
        columns: any[];
        rows: any[];
    };
    year: number;
    month: number;
}

export const MatrixGrid = ({ data, year, month }: MatrixGridProps) => {
    const [localRows, setLocalRows] = useState(data.rows);

    useEffect(() => {
        setLocalRows(data.rows);
    }, [data.rows]);

    const saveMutation = useMutation({
        mutationFn: adminApi.saveMatrixCell,
        onError: () => {
            toast.error("Failed to save change");
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

                // Fee % Logic
                let pct = Number(row.metadata.fee_pct || 0);
                if (field !== 'fee_pct' && config.fee_type === 'variable' && config.variable_ranges) {
                    const range = config.variable_ranges.find((r: any) =>
                        inv >= (r.min || 0) && (r.max === null || inv <= r.max)
                    );
                    pct = range ? Number(range.pct) : Number(config.fixed_pct || 10);
                    row.metadata.fee_pct = pct; // Auto-update PCT in UI
                } else if (field !== 'fee_pct' && config.fee_type === 'fixed') {
                    pct = Number(config.fixed_pct || 10);
                    // Only auto-update if not manual override... but for now simple
                    if (!row.is_manual_override) row.metadata.fee_pct = pct;
                }

                // Platform Cost Logic
                const platformCost = config.platform_cost_first +
                    (Math.max(0, count - 1) * config.platform_cost_additional);

                row.metadata.fee_paid = (inv * (pct / 100)) + platformCost;
            }
        }
        setLocalRows(newRows);
    };

    const handleBlur = (client_id: string, field: string, value: any, serviceId?: string) => {
        console.log("Saving", field, value);
        saveMutation.mutate({
            year,
            month,
            client_id,
            field,
            value,
            service_id: serviceId
        });
    };

    // --- COLUMN MAPPING HELPER ---
    // User requested strict order:
    // Immedia: Inv, %Fee, Fee Min, Paid Media Strat, Set-up
    // Imcontent: Branding, Content Design, AI, RRSS, Influencer
    // Immoralia: Setup, Agency Auto, Consulting
    // Immoral: SEO, Web Dev, Mkt Strat

    // We filter services by code to place them exactly
    const getSvc = (code: string) => data.columns.find(c => c.code === code);

    const immediaSvcs = [
        getSvc('PAID_MEDIA_STRATEGY'),
        getSvc('PAID_MEDIA_SETUP')
    ].filter(Boolean);

    const imcontentSvcs = [
        getSvc('BRANDING'),
        getSvc('CONTENT_DESIGN'),
        getSvc('AI_CONTENT'),
        getSvc('SOCIAL_MEDIA_MGMT'),
        getSvc('DIGITAL_STRATEGY'),
        getSvc('INFLUENCER_UGC')
    ].filter(Boolean);

    const immoraliaSvcs = [
        getSvc('IMMORALIA_SETUP'),
        getSvc('AGENCY_AUTO'),
        getSvc('CONSULTING_AUTO')
    ].filter(Boolean);

    const immoralSvcs = [
        getSvc('SEO'),
        getSvc('WEB_DEV'),
        getSvc('MKT_AUTO_EMAIL')
    ].filter(Boolean);

    // TOTALS CALCULATION
    const calculateRowTotal = (row: any) => {
        // ONLY sum services (NOT fee_paid)
        // From Paid Media Strategy (Immedia) to Email Marketing (Immoral)
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

            // Grand total per row
            const rowTotal = calculateRowTotal(row);
            totals.grand_grand += rowTotal;

            Object.keys(row.services).forEach(svcId => {
                totals.services[svcId] = (totals.services[svcId] || 0) + Number(row.services[svcId] || 0);
            });
        });
        return totals;
    };
    const totals = calculateTotals();

    // -- CRUD HANDLERS --
    const handleRowAction = (action: string, client_id: string) => {
        if (action === 'delete') {
            toast.error(`Delete functionality pending API for ${client_id}`);
        } else if (action === 'duplicate') {
            toast.success(`Duplicate functionality pending API for ${client_id}`);
        }
    };

    return (
        <div className="relative w-full h-full overflow-auto max-h-[80vh] border rounded-lg shadow-sm bg-white">
            <table className="w-full text-sm text-left border-collapse">
                <thead className="sticky top-0 z-40 bg-white shadow-sm">
                    {/* Top Header */}
                    <tr className="border-b bg-muted/20">
                        <th className="p-2 border-r min-w-[350px] sticky left-0 bg-white z-50 font-bold text-center" rowSpan={2} colSpan={3}>
                            Cliente
                        </th>

                        {/* Immedia (3 Fixed + Services) */}
                        <th className="p-2 border-r text-center font-bold text-blue-700 bg-blue-50 group cursor-pointer hover:bg-blue-100" colSpan={4 + immediaSvcs.length}>
                            Immedia
                        </th>

                        {/* Imcontent */}
                        <th className="p-2 border-r text-center font-bold text-indigo-700 bg-indigo-50 group cursor-pointer hover:bg-indigo-100" colSpan={imcontentSvcs.length}>
                            Imcontent
                        </th>

                        {/* Immoralia */}
                        <th className="p-2 border-r text-center font-bold text-orange-700 bg-orange-50 group cursor-pointer hover:bg-orange-100" colSpan={immoraliaSvcs.length}>
                            Immoralia
                        </th>

                        {/* Immoral */}
                        <th className="p-2 border-r text-center font-bold text-purple-700 bg-purple-50 group cursor-pointer hover:bg-purple-100" colSpan={immoralSvcs.length}>
                            Immoral
                        </th>

                        <th className="p-2 text-center min-w-[100px] font-bold bg-slate-100" rowSpan={2}>TOTAL</th>
                    </tr>

                    {/* Sub Header */}
                    < tr className="border-b bg-gray-50 text-xs" >
                        {/* Immedia Fixed */}
                        < th className="p-2 border-r min-w-[100px] text-center" > Inversión</th >
                        <th className="p-2 border-r min-w-[70px] text-center">% Fee</th>
                        <th className="p-2 border-r min-w-[50px] text-center">Nº Plat</th>
                        <th className="p-2 border-r min-w-[100px] text-center">Fee Mínimo</th>

                        {
                            immediaSvcs.map((c: any) => (
                                <th key={c.id} className="p-2 border-r min-w-[120px] font-medium text-muted-foreground whitespace-normal h-16 align-bottom pb-2 text-center">
                                    {c.name}
                                </th>
                            ))
                        }

                        {
                            imcontentSvcs.map((c: any) => (
                                <th key={c.id} className="p-2 border-r min-w-[120px] font-medium text-muted-foreground whitespace-normal h-16 align-bottom pb-2 text-center">
                                    {c.name}
                                </th>
                            ))
                        }

                        {
                            immoraliaSvcs.map((c: any) => (
                                <th key={c.id} className="p-2 border-r min-w-[120px] font-medium text-muted-foreground whitespace-normal h-16 align-bottom pb-2 text-center">
                                    {c.name}
                                </th>
                            ))
                        }

                        {
                            immoralSvcs.map((c: any) => (
                                <th key={c.id} className="p-2 border-r min-w-[120px] font-medium text-muted-foreground whitespace-normal h-16 align-bottom pb-2 text-center">
                                    {c.name}
                                </th>
                            ))
                        }
                    </tr >
                </thead >
                <tbody>
                    {localRows.map((row, rIndex) => (
                        <tr key={row.client_id} className="border-b hover:bg-slate-50 transition-colors group">
                            {/* Frozen Client Info */}
                            <td className="p-0 border-r sticky left-0 bg-white group-hover:bg-slate-50 z-30 w-[60px] flex items-center justify-between">
                                <Input
                                    className="h-full w-[35px] border-none rounded-none text-center bg-transparent focus:ring-0 focus:bg-slate-100 px-0 text-xs"
                                    value={row.vencimiento}
                                    onChange={(e) => handleCellChange(rIndex, 'vencimiento', e.target.value)}
                                    onBlur={(e) => handleBlur(row.client_id, 'vencimiento', e.target.value)}
                                    title="Día de Vencimiento"
                                />
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" className="h-full w-[20px] p-0 rounded-none hover:bg-slate-200">
                                            <MoreHorizontal className="h-3 w-3 text-slate-400" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                        <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={() => handleRowAction('duplicate', row.client_id)}>
                                            <Copy className="mr-2 h-4 w-4" /> Duplicar Fila
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleRowAction('delete', row.client_id)} className="text-red-600">
                                            <Trash2 className="mr-2 h-4 w-4" /> Eliminar Fila
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </td>
                            <td className="p-0 border-r sticky left-[60px] bg-white group-hover:bg-slate-50 z-30 w-[80px]">
                                <Input
                                    className="h-full w-full border-none rounded-none text-center bg-transparent focus:ring-0 focus:bg-slate-100 px-1 text-xs font-bold text-blue-600"
                                    value={row.vertical}
                                    onChange={(e) => handleCellChange(rIndex, 'vertical', e.target.value)}
                                    onBlur={(e) => handleBlur(row.client_id, 'vertical', e.target.value)}
                                    title="Vertical"
                                />
                            </td>
                            <td className="p-2 border-r sticky left-[140px] bg-white group-hover:bg-slate-50 z-30 min-w-[200px] font-medium truncate">
                                {row.client_name}
                            </td>

                            {/* --- IMMEDIA --- */}
                            <td className="p-0 border-r">
                                <Input
                                    className="h-full w-full border-none rounded-none text-right bg-transparent focus:ring-0 focus:bg-blue-50/50"
                                    value={row.metadata.investment}
                                    onChange={(e) => handleCellChange(rIndex, 'investment', e.target.value)}
                                    onBlur={(e) => handleBlur(row.client_id, 'investment', e.target.value)}
                                />
                            </td>
                            <td className="p-0 border-r min-w-[70px]">
                                <Input
                                    className="h-full w-full border-none rounded-none text-right bg-transparent focus:ring-0 focus:bg-blue-50/50 px-2"
                                    value={row.metadata.fee_pct}
                                    onChange={(e) => handleCellChange(rIndex, 'fee_pct', e.target.value)}
                                    onBlur={(e) => handleBlur(row.client_id, 'fee_pct', e.target.value)}
                                />
                            </td>
                            <td className="p-0 border-r min-w-[50px]">
                                <Input
                                    className="h-full w-full border-none rounded-none text-right bg-transparent focus:ring-0 focus:bg-blue-50/50 px-2"
                                    value={row.metadata.platform_count ?? 1}
                                    onChange={(e) => handleCellChange(rIndex, 'platform_count', e.target.value)}
                                    onBlur={(e) => handleBlur(row.client_id, 'platform_count', e.target.value)}
                                />
                            </td>
                            <td className="p-2 border-r font-bold text-muted-foreground text-xs text-right bg-blue-50/30 min-w-[100px]">
                                {/* Fee Mínimo - Empty for now, will be implemented later */}
                                -
                            </td>
                            {immediaSvcs.map((col: any) => (
                                <td key={col.id} className="p-0 border-r">
                                    <Input
                                        className="h-full w-full border-none rounded-none text-right bg-transparent focus:ring-0 focus:bg-blue-50/50 text-xs"
                                        value={row.services[col.id] || ''}
                                        placeholder="-"
                                        onChange={(e) => handleCellChange(rIndex, 'service_amount', e.target.value, col.id)}
                                        onBlur={(e) => handleBlur(row.client_id, 'service_amount', e.target.value, col.id)}
                                    />
                                </td>
                            ))}

                            {/* --- IMCONTENT --- */}
                            {imcontentSvcs.map((col: any) => (
                                <td key={col.id} className="p-0 border-r">
                                    <Input
                                        className="h-full w-full border-none rounded-none text-right bg-transparent focus:ring-0 focus:bg-indigo-50/50 text-xs"
                                        value={row.services[col.id] || ''}
                                        placeholder="-"
                                        onChange={(e) => handleCellChange(rIndex, 'service_amount', e.target.value, col.id)}
                                        onBlur={(e) => handleBlur(row.client_id, 'service_amount', e.target.value, col.id)}
                                    />
                                </td>
                            ))}

                            {/* --- IMMORALIA --- */}
                            {immoraliaSvcs.map((col: any) => (
                                <td key={col.id} className="p-0 border-r">
                                    <Input
                                        className="h-full w-full border-none rounded-none text-right bg-transparent focus:ring-0 focus:bg-orange-50/50 text-xs"
                                        value={row.services[col.id] || ''}
                                        placeholder="-"
                                        onChange={(e) => handleCellChange(rIndex, 'service_amount', e.target.value, col.id)}
                                        onBlur={(e) => handleBlur(row.client_id, 'service_amount', e.target.value, col.id)}
                                    />
                                </td>
                            ))}

                            {/* --- IMMORAL --- */}
                            {immoralSvcs.map((col: any) => (
                                <td key={col.id} className="p-0 border-r">
                                    <Input
                                        className="h-full w-full border-none rounded-none text-right bg-transparent focus:ring-0 focus:bg-purple-50/50 text-xs"
                                        value={row.services[col.id] || ''}
                                        placeholder="-"
                                        onChange={(e) => handleCellChange(rIndex, 'service_amount', e.target.value, col.id)}
                                        onBlur={(e) => handleBlur(row.client_id, 'service_amount', e.target.value, col.id)}
                                    />
                                </td>
                            ))}

                            {/* Total Row */}
                            <td className="p-2 text-right font-bold bg-slate-100 sticky right-0 min-w-[100px]">
                                {formatCurrency(calculateRowTotal(row))}
                            </td>
                        </tr>
                    ))}
                </tbody>
                <tfoot className="sticky bottom-0 z-40 bg-slate-900 text-white font-bold shadow-lg">
                    <tr>
                        <td className="p-3 border-r sticky left-0 bg-slate-900 z-50 text-right" colSpan={3}>
                            TOTALES
                        </td>
                        <td className="p-2 border-r text-right bg-slate-800">
                            {formatCurrency(totals.investment)}
                        </td>
                        <td className="p-2 border-r bg-slate-800"></td>
                        <td className="p-2 border-r bg-slate-800"></td>
                        <td className="p-2 border-r text-right bg-slate-800 text-muted-foreground">
                            {/* Fee Mínimo - Not implemented yet */}
                            -
                        </td>

                        {/* Services Totals */}
                        {immediaSvcs.map((c: any) => (
                            <td key={c.id} className="p-2 border-r text-right text-xs">
                                {totals.services[c.id] ? formatCurrency(totals.services[c.id]) : '-'}
                            </td>
                        ))}
                        {imcontentSvcs.map((c: any) => (
                            <td key={c.id} className="p-2 border-r text-right text-xs">
                                {totals.services[c.id] ? formatCurrency(totals.services[c.id]) : '-'}
                            </td>
                        ))}
                        {immoraliaSvcs.map((c: any) => (
                            <td key={c.id} className="p-2 border-r text-right text-xs">
                                {totals.services[c.id] ? formatCurrency(totals.services[c.id]) : '-'}
                            </td>
                        ))}
                        {immoralSvcs.map((c: any) => (
                            <td key={c.id} className="p-2 border-r text-right text-xs">
                                {totals.services[c.id] ? formatCurrency(totals.services[c.id]) : '-'}
                            </td>
                        ))}

                        <td className="p-2 text-right bg-slate-950 sticky right-0 text-white font-bold">
                            {formatCurrency(totals.grand_grand)}
                        </td>
                    </tr>
                </tfoot>
            </table >

            {/* Button removed */}
        </div >
    );
};
