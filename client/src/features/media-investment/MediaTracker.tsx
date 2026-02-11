import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { mediaApi, ClientInvestment } from '@/lib/api/media';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PeriodSelector } from '@/components/shared/PeriodSelector';
import { formatCurrency } from '@/lib/utils';
import { Save, AlertCircle, Plus } from 'lucide-react';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';

const REQUIRED_COLUMNS = [
    { code: 'BRAND', label: 'Branding' },
    { code: 'META', label: 'Facebook Ads' },
    { code: 'GOOGLE', label: 'Google Ads' },
    { code: 'LINKEDIN', label: 'LinkedIn' },
    { code: 'PINTEREST', label: 'Pinterest' },
    { code: 'SPOTIFY', label: 'Spotify' },
    { code: 'APPLE', label: 'Apple Ads' },
    { code: 'MICROSOFT', label: 'Microsoft Ads' },
];

function MediaTrackerContent() {
    const [date, setDate] = useState(new Date());
    const queryClient = useQueryClient();
    const year = date.getFullYear();
    const month = date.getMonth() + 1;

    // 1. All Hooks First (Rules of Hooks)

    // Fetch Platforms
    const { data: platforms = [] } = useQuery({
        queryKey: ['platforms'],
        queryFn: mediaApi.getPlatforms
    });

    // Fetch Investments
    const { data, isLoading, error } = useQuery({
        queryKey: ['media-investment', year, month],
        queryFn: () => mediaApi.getMonthlyInvestment(year, month),
    });

    const investments = data?.investments || [];

    // Map platforms to columns
    const platformColumns = useMemo(() => {
        return REQUIRED_COLUMNS.map(col => {
            const platform = platforms.find((p: any) => p.code === col.code);
            return {
                ...col,
                id: platform?.id
            };
        });
    }, [platforms]);

    // Mutations
    const savePlannedMutation = useMutation({
        mutationFn: mediaApi.updatePlannedInvestment,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['media-investment', year, month] });
        }
    });

    const savePlatformMutation = useMutation({
        mutationFn: mediaApi.updatePlatformInvestment,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['media-investment', year, month] });
        }
    });

    // 2. Conditional Returns (After all hooks)

    if (error) {
        return (
            <div className="p-8 text-center text-red-500">
                <AlertCircle className="mx-auto h-8 w-8 mb-2" />
                <h3 className="text-lg font-bold">Error al cargar datos</h3>
                <p>{(error as Error).message}</p>
                <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['media-investment'] })} className="mt-4">
                    Reintentar
                </Button>
            </div>
        );
    }

    // 3. Handlers and Render Logic

    const handlePlannedChange = (clientId: string, value: string) => {
        // Handle empty string as 0 to allow clearing inputs
        const finalValue = value.trim() === '' ? '0' : value;
        const amount = parseFloat(finalValue);

        if (isNaN(amount)) return;

        savePlannedMutation.mutate({
            client_id: clientId,
            fiscal_year: year,
            fiscal_month: month,
            amount
        });
    };

    const handlePlatformChange = (clientId: string, platformId: string, value: string) => {
        const finalValue = value.trim() === '' ? '0' : value;
        const amount = parseFloat(finalValue);

        if (isNaN(amount)) return;

        savePlatformMutation.mutate({
            client_id: clientId,
            fiscal_year: year,
            fiscal_month: month,
            platform_id: platformId,
            amount
        });
    };

    const totalPlanned = investments.reduce((sum, i) => sum + (i?.planned_investment || 0), 0);
    const totalActual = investments.reduce((sum, i) => sum + (i?.total_actual || 0), 0);
    // Logic: Planned - Actual = Remaining (Positive), Excess (Negative)
    const totalDiff = totalPlanned - totalActual;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Control de Inversión de Medios</h1>
                    <p className="text-muted-foreground mt-1">Gestión de presupuestos y gasto real por plataforma.</p>
                </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-6">
                    <p className="text-sm font-medium text-muted-foreground">Inversión Planificada (Total)</p>
                    <h3 className="text-2xl font-bold mt-2">{formatCurrency(totalPlanned)}</h3>
                </Card>
                <Card className="p-6">
                    <p className="text-sm font-medium text-muted-foreground">Total Real Ejecutado</p>
                    <h3 className="text-2xl font-bold mt-2 text-blue-600">{formatCurrency(totalActual)}</h3>
                </Card>
                <Card className="p-6">
                    <p className="text-sm font-medium text-muted-foreground">Remanente / Exceso Global</p>
                    <h3 className={`text-2xl font-bold mt-2 ${totalDiff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(totalDiff)}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                        {totalDiff >= 0 ? 'Disponible (Remanente)' : 'Exceso sobre presupuesto'}
                    </p>
                </Card>
            </div>

            {/* Filter Bar */}
            <div className="flex items-center justify-between gap-4 p-4 bg-card border rounded-lg">
                <div className="flex items-center gap-4 flex-1">
                    <PeriodSelector value={date} onChange={setDate} />
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="gap-2">
                        <Save size={16} />
                        Exportar
                    </Button>
                    <Link to="/clients">
                        <Button size="sm" className="gap-2">
                            <Plus size={16} />
                            Nuevo Cliente
                        </Button>
                    </Link>
                </div>
            </div>

            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="h-12 px-4 text-left font-medium text-gray-600 min-w-[200px] sticky left-0 bg-gray-50 z-10 border-r">Cliente</th>
                                <th className="h-12 px-2 text-center font-medium text-gray-800 w-32 bg-blue-50/50 border-r border-blue-100">
                                    Inv. Planificada
                                </th>
                                {platformColumns.map(col => (
                                    <th key={col.code} className="h-12 px-2 text-center font-medium text-gray-600 w-32 border-r last:border-0 hover:bg-gray-100 transition-colors">
                                        {col.label}
                                    </th>
                                ))}
                                <th className="h-12 px-2 text-center font-bold text-blue-700 w-32 bg-blue-50 border-l border-blue-200">Total Real</th>
                                <th className="h-12 px-2 text-center font-bold text-gray-700 w-32 bg-gray-100 border-l border-gray-200">Remanente/Exceso</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr><td colSpan={12} className="p-8 text-center text-muted-foreground">Cargando datos...</td></tr>
                            ) : investments.length === 0 ? (
                                <tr><td colSpan={12} className="p-8 text-center text-muted-foreground">No hay inversiones registradas para este periodo.</td></tr>
                            ) : (
                                investments.map((inv) => {
                                    if (!inv) return null;
                                    // Row logic: Planned - Actual = Remaining/Excess
                                    const diff = (inv.planned_investment || 0) - (inv.total_actual || 0);

                                    return (
                                        <tr key={inv.client_id} className="border-b hover:bg-gray-50/50">
                                            <td className="p-3 font-medium sticky left-0 bg-white z-10 border-r flex items-center h-full">
                                                {inv.client_name}
                                            </td>

                                            {/* Planned Investment (Editable) */}
                                            <td className="p-1 border-r border-blue-100 bg-blue-50/10">
                                                <Input
                                                    type="number"
                                                    defaultValue={inv.planned_investment || ''}
                                                    onBlur={(e) => handlePlannedChange(inv.client_id, e.target.value)}
                                                    className="h-8 text-right font-medium border-transparent hover:border-blue-200 focus:border-blue-500 bg-transparent text-gray-800"
                                                />
                                            </td>

                                            {/* Platform Columns (Editable) */}
                                            {platformColumns.map(col => {
                                                const platformData = inv.platforms?.find(p => p.platform_code === col.code);
                                                const amount = platformData?.actual_amount || 0;

                                                return (
                                                    <td key={col.code} className="p-1 border-r last:border-0 border-gray-100">
                                                        {col.id ? (
                                                            <Input
                                                                type="number"
                                                                defaultValue={amount === 0 ? '' : amount}
                                                                placeholder="-"
                                                                onBlur={(e) => handlePlatformChange(inv.client_id, col.id!, e.target.value)}
                                                                className="h-8 text-right text-gray-600 border-transparent hover:border-gray-300 focus:border-blue-500 bg-transparent focus:bg-white"
                                                            />
                                                        ) : (
                                                            <div className="h-8 flex items-center justify-center text-gray-300 text-xs bg-gray-50/50 cursor-not-allowed" title="Plataforma no configurada">
                                                                N/A
                                                            </div>
                                                        )}
                                                    </td>
                                                );
                                            })}

                                            {/* Total Real (Calculated) */}
                                            <td className="p-2 text-right font-bold text-blue-700 bg-blue-50 border-l border-blue-200">
                                                {formatCurrency(inv.total_actual || 0)}
                                            </td>

                                            {/* Remanente/Exceso */}
                                            {/* Logic: if diff >= 0 (Remaining), Green. If diff < 0 (Excess), Red. */}
                                            <td className={`p-2 text-right font-bold bg-gray-100 border-l border-gray-200 ${diff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                {formatCurrency(diff)}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                        <tfoot className="bg-gray-100 font-bold border-t-2 border-gray-200">
                            <tr>
                                <td className="p-3 sticky left-0 bg-gray-100 z-10 border-r">TOTALES</td>
                                <td className="p-3 text-right border-r border-blue-100 bg-blue-50/30">{formatCurrency(totalPlanned)}</td>
                                {platformColumns.map(col => {
                                    // Sum per column
                                    const colTotal = investments.reduce((sum, inv) => {
                                        const p = inv?.platforms?.find(pl => pl.platform_code === col.code);
                                        return sum + (p?.actual_amount || 0);
                                    }, 0);
                                    return (
                                        <td key={col.code} className="p-3 text-right border-r border-gray-200 text-gray-700">
                                            {formatCurrency(colTotal)}
                                        </td>
                                    );
                                })}
                                <td className="p-3 text-right text-blue-700 bg-blue-100 border-l border-blue-200">{formatCurrency(totalActual)}</td>
                                {/* Global Total Logic */}
                                <td className={`p-3 text-right bg-gray-200 border-l border-gray-300 ${totalDiff >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                                    {formatCurrency(totalDiff)}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </Card>
        </div>
    );
}

export default function MediaTracker() {
    return (
        <ErrorBoundary>
            <MediaTrackerContent />
        </ErrorBoundary>
    );
}
