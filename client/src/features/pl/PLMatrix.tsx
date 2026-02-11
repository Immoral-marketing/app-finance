import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api/admin';
import { Button } from '@/components/ui/Button';
import { Download } from 'lucide-react';
import { toast } from 'sonner';

const TABS = ['Real', 'Presupuesto', 'Comparación'] as const;
type TabType = typeof TABS[number];

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

// Revenue structure matching the user's Excel exactly
const REVENUE_STRUCTURE = [
    { dept: 'Immedia', services: ['Paid General', 'Paid imfilms', 'Setup inicial'] },
    { dept: 'Imcontent', services: ['Branding', 'Diseño', 'Contenido con IA', 'RRSS', 'Estrategia Digital', 'Influencers'] },
    { dept: 'Immoralia', services: ['Setup inicial IA', 'Automation', 'Consultoría'] },
    { dept: 'Imloyal', services: ['Web dev', 'CRM', 'Comisiones'] },
    { dept: 'Imseo', services: ['SEO', 'Comisiones'] },
    { dept: 'Immoral', services: ['Otros servicios', 'Otras comisiones'] },
    { dept: 'Imcontent', services: ['Budget Nutfruit'] },
    { dept: 'Imsales', services: ['Captación'] },
];

// Expense structure matching the images
const EXPENSE_STRUCTURE = {
    personalItems: [
        { dept: 'Immedia', items: ['Alba', 'Andrés', 'Leidy'] },
        { dept: 'Imcontent', items: ['Flor', 'Bruno', 'Grego', 'Silvia', 'Angie'] },
        { dept: 'Immoralia', items: ['David', 'Manel'] }, // Removed Jorge Orts (Point 4)
        { dept: 'Immoral', items: ['Daniel', 'Mery', 'Yure', 'Marco', 'Externos puntuales'] },
        { dept: 'Immedia', items: ['Externos'] },
        { dept: 'Imcontent', items: ['Externos'] },
        { dept: 'Immoralia', items: ['Externos'] },
        { dept: 'Imsales', items: ['Jorge Orts'] }, // Added Jorge Orts (Point 4)
    ],
    comisionesItems: [
        { dept: 'Imfilms', items: ['The connector'] },
        { dept: 'Imcontent', items: ['Marc'] },
        { dept: 'Imseo', items: ['Christian'] },
        { dept: 'Imfashion', items: ['Gemelos'] },
        { dept: 'Imsales', items: ['Jorge'] },
        { dept: 'Imfilms', items: ['Olga'] },
    ],
    marketingItems: [
        { dept: 'Imfilms', items: ['Marketing'] },
        { dept: 'Imcontent', items: ['Marketing'] },
        { dept: 'Immedia', items: ['Marketing'] },
        { dept: 'Immoralia', items: ['Marketing'] },
        { dept: 'Imsales', items: ['Marketing'] },
        { dept: 'Immoral', items: ['Marketing'] },
        { dept: 'Imfashion', items: ['Marketing'] },
    ],
    formacionItems: [
        { dept: 'Imcontent', items: ['Formación'] },
        { dept: 'Immedia', items: ['Formación'] },
        { dept: 'Immoralia', items: ['Formación'] },
        { dept: 'Imsales', items: ['Formación'] },
        { dept: 'Immoral', items: ['Formación'] },
        { dept: 'Imfashion', items: ['Formación'] },
    ],
    softwareItems: [
        { dept: 'Immoral', items: ['Software'] },
        { dept: 'Immedia', items: ['Software'] },
        { dept: 'Imcontent', items: ['Software'] },
        { dept: 'Immoralia', items: ['Software'] },
        { dept: 'Imsales', items: ['Software'] },
    ],
    gastosOpItems: [
        { dept: 'Immoral', items: ['Alquiler', 'Asesoría', 'Suministros', 'Viajes y reuniones', 'Coche de empresa', 'Otras compras', 'Financiamiento (Línea de crédito)'] },
    ],
    adspentItems: [
        { dept: 'Immedia', items: ['Adspent'] },
        { dept: 'Imcontent', items: ['Adspent Nutfruit', 'Influencers'] },
    ]
};

export default function PLMatrix() {
    const [year, setYear] = useState(new Date().getFullYear());
    const [activeTab, setActiveTab] = useState<TabType>('Real');
    const [cellValues, setCellValues] = useState<Record<string, number>>({});
    const queryClient = useQueryClient();

    const typeParam = activeTab === 'Presupuesto' ? 'budget' : 'real';

    const { data: matrixData, isLoading } = useQuery({
        queryKey: ['pl-matrix', year, typeParam],
        queryFn: () => adminApi.getPLMatrix(year, typeParam),
        enabled: activeTab !== 'Comparación',
        refetchOnWindowFocus: true, // Auto-refresh when switching tabs (Point 1)
        staleTime: 0
    });

    // Clear cellValues when switching tabs
    useEffect(() => {
        setCellValues({});
    }, [typeParam]);

    // Populate cellValues from API data when it loads
    useEffect(() => {
        if (!matrixData?.sections) return;

        const newValues: Record<string, number> = {};

        // Process revenue section
        const revenueSection = matrixData.sections.find((s: any) => s.code === 'REVENUE');
        if (revenueSection?.rows) {
            revenueSection.rows.forEach((row: any) => {
                if (row.values && row.dept && row.name) {
                    row.values.forEach((val: number, monthIdx: number) => {
                        const key = `revenue-${row.dept}-${row.name}-${monthIdx}-${typeParam}`;
                        newValues[key] = val || 0;
                    });
                }
            });
        }

        // Process expense section
        const expenseSection = matrixData.sections.find((s: any) => s.code === 'EXPENSES');
        if (expenseSection?.rows) {
            expenseSection.rows.forEach((row: any) => {
                if (row.values && row.name) { // Ensure dept exists if we rely on it, but for expenses we might have generalized ones?
                    // NOTE: Backend now sends 'dept' for expenses.
                    // If dept is missing, it defaults to undefined in key, which matches 'undefined' in getCellKey?
                    // getCellKey arguments: (section, dept, item, monthIdx).
                    // If PL structure uses specific depts, we must match them.

                    if (Array.isArray(row.values)) {
                        row.values.forEach((val: number, monthIdx: number) => {
                            // Map expense category names to our structure
                            // USE DEPT IN KEY
                            const dept = row.dept || 'General';

                            // Use sanitized dept variable
                            const key = `expense-${dept}-${row.name}-${monthIdx}-${typeParam}`;
                            newValues[key] = val || 0;
                        });
                    }
                }
            });
        }

        setCellValues(prev => ({ ...prev, ...newValues }));
    }, [matrixData, typeParam]);

    const saveMutation = useMutation({
        mutationFn: adminApi.savePLMatrixCell,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pl-matrix'] });
            toast.success('Guardado');
        },
        onError: () => {
            toast.error('Error al guardar');
        }
    });

    const getCellKey = (section: string, dept: string, item: string, monthIdx: number) => {
        // Backend and useEffect process everything as 'revenue' or 'expenses' (mapped to 'expense' prefix)
        // detailed sections like 'marketing' are just for display grouping.
        const normalizedSection = section === 'revenue' ? 'revenue' : 'expense';
        return `${normalizedSection}-${dept}-${item}-${monthIdx}-${typeParam}`;
    };

    const getCellValue = (section: string, dept: string, item: string, monthIdx: number): number => {
        return cellValues[getCellKey(section, dept, item, monthIdx)] || 0;
    };

    const handleCellChange = (section: string, dept: string, item: string, monthIdx: number, value: string) => {
        const key = getCellKey(section, dept, item, monthIdx);
        setCellValues(prev => ({ ...prev, [key]: Number(value) || 0 }));
    };

    const formatCurrency = (val: number) => {
        // Round to 2 decimals to avoid floating point errors like 235.559999995
        return Math.round(val * 100) / 100;
    };

    const calculateRowTotal = (section: string, dept: string, item: string): number => {
        let total = 0;
        for (let i = 0; i < 12; i++) {
            total += getCellValue(section, dept, item, i);
        }
        return formatCurrency(total);
    };

    // Calculate section totals
    const calculateSectionTotal = (section: string, structure: { dept: string; items?: string[]; services?: string[] }[]): number[] => {
        const totals = Array(12).fill(0);
        structure.forEach(group => {
            const items = group.items || group.services || [];
            items.forEach(item => {
                for (let i = 0; i < 12; i++) {
                    totals[i] += getCellValue(section, group.dept, item, i);
                }
            });
        });
        return totals.map(t => formatCurrency(t));
    };

    const renderEditableCell = (section: string, dept: string, item: string, monthIdx: number) => {
        const value = getCellValue(section, dept, item, monthIdx);
        return (
            <td key={monthIdx} className="border border-gray-200 p-0">
                <input
                    type="number"
                    value={value || ''}
                    onChange={(e) => handleCellChange(section, dept, item, monthIdx, e.target.value)}
                    onBlur={(e) => {
                        const payload = {
                            year,
                            month: monthIdx + 1,
                            dept,
                            item,
                            // Backend expects 'revenue' or 'expense'. 
                            // 'section' here might be 'marketing', 'software', etc.
                            section: section === 'revenue' ? 'revenue' : 'expense',
                            value: Number(e.target.value),
                            type: typeParam as 'budget' | 'real'
                        };
                        console.log('Sending Save Payload:', payload);
                        saveMutation.mutate(payload);
                    }}
                    className="w-full h-full px-1 py-1 text-right text-xs bg-transparent border-0 focus:outline-none focus:bg-yellow-50"
                    style={{ minWidth: '50px' }}
                />
            </td>
        );
    };

    // Render revenue rows with rowSpan for departments
    const renderRevenueRows = () => {
        const rows: React.ReactNode[] = [];

        REVENUE_STRUCTURE.forEach((group, groupIdx) => {
            group.services.forEach((service, serviceIdx) => {
                rows.push(
                    <tr key={`rev-${groupIdx}-${serviceIdx}`} className="hover:bg-gray-50">
                        {serviceIdx === 0 ? (
                            <td
                                rowSpan={group.services.length}
                                className="border border-gray-200 px-2 py-1 text-xs font-medium text-gray-700 bg-gray-50 align-middle text-center"
                            >
                                {group.dept}
                            </td>
                        ) : null}
                        <td className="border border-gray-200 px-2 py-1 text-xs text-gray-900">
                            {service}
                        </td>
                        {MONTHS.map((_, monthIdx) => renderEditableCell('revenue', group.dept, service, monthIdx))}
                        <td className="border border-gray-200 px-1 py-1 text-right text-xs font-medium bg-gray-50">
                            {calculateRowTotal('revenue', group.dept, service) || 0}
                        </td>
                    </tr>
                );
            });
        });

        return rows;
    };

    // Render expense category with items
    const renderExpenseCategory = (
        categoryName: string,
        items: { dept: string; items: string[] }[],
        sectionKey: string,
        bgColor: string = 'bg-orange-50'
    ) => {
        const rows: React.ReactNode[] = [];
        const categoryTotals = calculateSectionTotal(sectionKey, items);
        const categoryAnnual = categoryTotals.reduce((a, b) => a + b, 0);

        // Category header row
        rows.push(
            <tr key={`cat-${sectionKey}`} className={bgColor}>
                <td className="border border-orange-200 px-2 py-1.5 text-xs font-semibold text-orange-800"></td>
                <td className="border border-orange-200 px-2 py-1.5 text-xs font-semibold text-orange-800">
                    {categoryName}
                </td>
                {categoryTotals.map((val, i) => (
                    <td key={i} className="border border-orange-200 px-1 py-1.5 text-right text-xs font-medium text-orange-700">
                        {val || 0}
                    </td>
                ))}
                <td className="border border-orange-200 px-1 py-1.5 text-right text-xs font-semibold text-orange-800">
                    {categoryAnnual || 0}
                </td>
            </tr>
        );

        // Item rows with rowSpan for departments
        items.forEach((group, groupIdx) => {
            group.items.forEach((item, itemIdx) => {
                rows.push(
                    <tr key={`${sectionKey}-${groupIdx}-${itemIdx}`} className="hover:bg-gray-50">
                        {itemIdx === 0 ? (
                            <td
                                rowSpan={group.items.length}
                                className="border border-gray-200 px-2 py-1 text-xs font-medium text-gray-700 bg-gray-50 align-middle text-center"
                            >
                                {group.dept}
                            </td>
                        ) : null}
                        <td className="border border-gray-200 px-2 py-1 text-xs text-gray-900">
                            {item}
                        </td>
                        {MONTHS.map((_, monthIdx) => renderEditableCell(sectionKey, group.dept, item, monthIdx))}
                        <td className="border border-gray-200 px-1 py-1 text-right text-xs font-medium bg-gray-50">
                            {calculateRowTotal(sectionKey, group.dept, item) || 0}
                        </td>
                    </tr>
                );
            });
        });

        // Empty spacer row
        rows.push(
            <tr key={`spacer-${sectionKey}`}>
                <td colSpan={15} className="border border-gray-100 py-1 bg-white"></td>
            </tr>
        );

        return rows;
    };

    const ingresosTotals = calculateSectionTotal('revenue', REVENUE_STRUCTURE);
    const ingresosAnual = ingresosTotals.reduce((a, b) => a + b, 0);

    // Calculate all expense totals
    const gastosTotals = Array(12).fill(0);
    ['personal', 'comisiones', 'marketing', 'formacion', 'software', 'adspent', 'gastosOp'].forEach(key => {
        const items = EXPENSE_STRUCTURE[`${key}Items` as keyof typeof EXPENSE_STRUCTURE];
        const totals = calculateSectionTotal(key, items);
        totals.forEach((v, i) => gastosTotals[i] += v);
    });
    const gastosAnual = gastosTotals.reduce((a, b) => a + b, 0);

    const ebitdaTotals = ingresosTotals.map((v, i) => v - gastosTotals[i]);
    const ebitdaAnual = ingresosAnual - gastosAnual;

    return (
        <div className="space-y-4 -mx-6 -mt-6">
            {/* Header Bar */}
            <div className="bg-white border-b px-6 py-3 flex items-center justify-between sticky top-0 z-20">
                <div className="flex items-center gap-4">
                    <h1 className="text-lg font-bold text-gray-900">
                        {activeTab === 'Real' ? 'P&L REAL' : 'PRESUPUESTO'} {year}
                    </h1>
                    <div className="flex items-center gap-0.5 bg-gray-100 rounded-lg p-0.5">
                        {TABS.map(tab => (
                            <Button
                                key={tab}
                                variant={activeTab === tab ? 'default' : 'ghost'}
                                size="sm"
                                onClick={() => setActiveTab(tab)}
                                className="text-xs h-7 px-3"
                            >
                                {tab}
                            </Button>
                        ))}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setYear(year - 1)}>
                        ← {year - 1}
                    </Button>
                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setYear(year + 1)}>
                        {year + 1} →
                    </Button>
                    <Button size="sm" className="gap-1 ml-2 h-7 text-xs">
                        <Download size={12} />
                        Exportar
                    </Button>
                </div>
            </div>

            {/* Spreadsheet Container */}
            <div className="overflow-x-auto px-2">
                <table className="w-full border-collapse text-xs" style={{ minWidth: '1200px' }}>
                    {/* Header Row - Months */}
                    <thead>
                        <tr className="bg-white">
                            <th className="border border-gray-300 px-2 py-2 text-left font-medium" style={{ width: '100px' }}></th>
                            <th className="border border-gray-300 px-2 py-2 text-left font-medium" style={{ width: '160px' }}></th>
                            {MONTHS.map((month, i) => (
                                <th key={i} className="border border-gray-300 px-1 py-2 text-center font-medium text-xs" style={{ width: '70px', minWidth: '70px' }}>
                                    {month}
                                </th>
                            ))}
                            <th className="border border-gray-300 px-1 py-2 text-center font-semibold text-xs bg-gray-100" style={{ width: '80px', minWidth: '80px' }}>
                                Anual
                            </th>
                        </tr>
                    </thead>

                    <tbody>
                        {/* INGRESOS DE EXPLOTACIÓN */}
                        <tr className="bg-purple-100">
                            <td colSpan={2} className="border border-purple-300 px-2 py-1.5 font-bold text-purple-900 text-xs">
                                INGRESOS DE EXPLOTACIÓN
                            </td>
                            {ingresosTotals.map((val, i) => (
                                <td key={i} className="border border-purple-300 px-1 py-1.5 text-right font-semibold text-purple-800">
                                    {val || 0}
                                </td>
                            ))}
                            <td className="border border-purple-300 px-1 py-1.5 text-right font-bold text-purple-900">
                                {ingresosAnual || 0}
                            </td>
                        </tr>

                        {renderRevenueRows()}

                        {/* Spacer */}
                        <tr><td colSpan={15} className="py-2 bg-white border-0"></td></tr>

                        {/* GASTOS DE EXPLOTACIÓN */}
                        <tr className="bg-orange-100">
                            <td colSpan={2} className="border border-orange-300 px-2 py-1.5 font-bold text-orange-900 text-xs">
                                GASTOS DE EXPLOTACIÓN
                            </td>
                            {gastosTotals.map((val, i) => (
                                <td key={i} className="border border-orange-300 px-1 py-1.5 text-right font-semibold text-orange-800">
                                    {val || 0}
                                </td>
                            ))}
                            <td className="border border-orange-300 px-1 py-1.5 text-right font-bold text-orange-900">
                                {gastosAnual || 0}
                            </td>
                        </tr>

                        {renderExpenseCategory('Gastos de personal', EXPENSE_STRUCTURE.personalItems, 'personal')}
                        {renderExpenseCategory('Comisiones', EXPENSE_STRUCTURE.comisionesItems, 'comisiones')}
                        {renderExpenseCategory('Marketing', EXPENSE_STRUCTURE.marketingItems, 'marketing')}
                        {renderExpenseCategory('Formación', EXPENSE_STRUCTURE.formacionItems, 'formacion')}
                        {renderExpenseCategory('Software', EXPENSE_STRUCTURE.softwareItems, 'software')}
                        {renderExpenseCategory('Adspent', EXPENSE_STRUCTURE.adspentItems, 'adspent')}
                        {renderExpenseCategory('Gastos Operativos', EXPENSE_STRUCTURE.gastosOpItems, 'gastosOp')}

                        {/* EBITDA */}
                        <tr className="bg-blue-100">
                            <td colSpan={2} className="border border-blue-300 px-2 py-2 font-bold text-blue-900 text-sm">
                                EBITDA
                            </td>
                            {ebitdaTotals.map((val, i) => (
                                <td key={i} className="border border-blue-300 px-1 py-2 text-right font-bold text-blue-800">
                                    {val}
                                </td>
                            ))}
                            <td className="border border-blue-300 px-1 py-2 text-right font-bold text-blue-900 text-sm">
                                {ebitdaAnual}
                            </td>
                        </tr>

                        {/* RESULTADO */}
                        <tr className="bg-green-100">
                            <td colSpan={2} className="border border-green-400 px-2 py-2 font-bold text-green-900 text-sm">
                                RESULTADO
                            </td>
                            {ebitdaTotals.map((val, i) => (
                                <td key={i} className="border border-green-400 px-1 py-2 text-right font-bold text-green-800">
                                    {val}
                                </td>
                            ))}
                            <td className="border border-green-400 px-1 py-2 text-right font-bold text-green-900 text-sm">
                                {ebitdaAnual}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {isLoading && (
                <div className="fixed inset-0 bg-white/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-lg p-4">Cargando...</div>
                </div>
            )}
        </div>
    );
}
