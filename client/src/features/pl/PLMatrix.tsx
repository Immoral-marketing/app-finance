import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api/admin';
import { Button } from '@/components/ui/Button';
import { Download } from 'lucide-react';
import { toast } from 'sonner';

const TABS = ['Real', 'Presupuesto', 'Comparación'] as const;
type TabType = typeof TABS[number];
type StructureGroup = { dept: string; items?: string[]; services?: string[] };

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
    'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const MONTHS_FULL = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
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
        { dept: 'Immoralia', items: ['David', 'Manel'] },
        { dept: 'Immoral', items: ['Daniel', 'Mery', 'Yure', 'Marco', 'Externos puntuales'] },
        { dept: 'Immedia', items: ['Externos'] },
        { dept: 'Imcontent', items: ['Externos'] },
        { dept: 'Immoralia', items: ['Externos'] },
        { dept: 'Imsales', items: ['Jorge Orts'] },
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

// ─── Helper: parse API data into a flat key→value map ────────────────────────
function parseMatrixData(matrixData: any, typeParam: 'real' | 'budget'): Record<string, number> {
    const values: Record<string, number> = {};
    if (!matrixData?.sections) return values;

    const revenueSection = matrixData.sections.find((s: any) => s.code === 'REVENUE');
    if (revenueSection?.rows) {
        revenueSection.rows.forEach((row: any) => {
            if (row.values && row.dept && row.name) {
                row.values.forEach((val: number, monthIdx: number) => {
                    const key = `revenue-${row.dept}-${row.name}-${monthIdx}-${typeParam}`;
                    values[key] = val || 0;
                });
            }
        });
    }

    const expenseSection = matrixData.sections.find((s: any) => s.code === 'EXPENSES');
    if (expenseSection?.rows) {
        expenseSection.rows.forEach((row: any) => {
            if (row.values && Array.isArray(row.values)) {
                const dept = row.dept || 'General';
                row.values.forEach((val: number, monthIdx: number) => {
                    const key = `expense-${dept}-${row.name}-${monthIdx}-${typeParam}`;
                    values[key] = val || 0;
                });
            }
        });
    }

    return values;
}

export default function PLMatrix() {
    const [year, setYear] = useState(new Date().getFullYear());
    const [activeTab, setActiveTab] = useState<TabType>('Real');
    const [cellValues, setCellValues] = useState<Record<string, number>>({});
    const queryClient = useQueryClient();

    const typeParam = activeTab === 'Presupuesto' ? 'budget' : 'real';

    // ── Query for Real/Presupuesto tabs ──────────────────────────────────────
    const { data: matrixData, isLoading } = useQuery({
        queryKey: ['pl-matrix', year, typeParam],
        queryFn: () => adminApi.getPLMatrix(year, typeParam),
        enabled: activeTab !== 'Comparación',
        refetchOnWindowFocus: true,
        staleTime: 0
    });

    // ── Queries for Comparación tab (both real + budget) ─────────────────────
    const { data: realData, isLoading: loadingReal } = useQuery({
        queryKey: ['pl-matrix', year, 'real'],
        queryFn: () => adminApi.getPLMatrix(year, 'real'),
        enabled: activeTab === 'Comparación',
        staleTime: 0,
    });

    const { data: budgetData, isLoading: loadingBudget } = useQuery({
        queryKey: ['pl-matrix', year, 'budget'],
        queryFn: () => adminApi.getPLMatrix(year, 'budget'),
        enabled: activeTab === 'Comparación',
        staleTime: 0,
    });

    // ── Populate cellValues from API data ────────────────────────────────────
    useEffect(() => {
        setCellValues({});
    }, [typeParam]);

    useEffect(() => {
        if (!matrixData?.sections) return;
        const newValues = parseMatrixData(matrixData, typeParam as 'real' | 'budget');
        setCellValues(prev => ({ ...prev, ...newValues }));
    }, [matrixData, typeParam]);

    // ── Comparison values (derived from both queries) ─────────────────────────
    const realValues = realData ? parseMatrixData(realData, 'real') : {};
    const budgetValues = budgetData ? parseMatrixData(budgetData, 'budget') : {};

    // ── Mutations ────────────────────────────────────────────────────────────
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

    // ── Cell helpers ─────────────────────────────────────────────────────────
    const getCellKey = (section: string, dept: string, item: string, monthIdx: number) => {
        const normalizedSection = section === 'revenue' ? 'revenue' : 'expense';
        return `${normalizedSection}-${dept}-${item}-${monthIdx}-${typeParam}`;
    };

    const getCellValue = (section: string, dept: string, item: string, monthIdx: number): number => {
        return cellValues[getCellKey(section, dept, item, monthIdx)] || 0;
    };

    const getCompareValue = (
        valuesMap: Record<string, number>,
        type: 'real' | 'budget',
        section: string,
        dept: string,
        item: string,
        monthIdx: number
    ): number => {
        const normalizedSection = section === 'revenue' ? 'revenue' : 'expense';
        const key = `${normalizedSection}-${dept}-${item}-${monthIdx}-${type}`;
        return valuesMap[key] || 0;
    };

    const handleCellChange = (section: string, dept: string, item: string, monthIdx: number, value: string) => {
        const key = getCellKey(section, dept, item, monthIdx);
        setCellValues(prev => ({ ...prev, [key]: Number(value) || 0 }));
    };

    const fmt = (val: number) => Math.round(val * 100) / 100;

    const calculateRowTotal = (section: string, dept: string, item: string): number => {
        let total = 0;
        for (let i = 0; i < 12; i++) total += getCellValue(section, dept, item, i);
        return fmt(total);
    };

    const calculateSectionTotal = (section: string, structure: { dept: string; items?: string[]; services?: string[] }[]): number[] => {
        const totals = Array(12).fill(0);
        structure.forEach(group => {
            const items = group.items || group.services || [];
            items.forEach(item => {
                for (let i = 0; i < 12; i++) totals[i] += getCellValue(section, group.dept, item, i);
            });
        });
        return totals.map(t => fmt(t));
    };

    // ── Comparison section totals ─────────────────────────────────────────────
    const calcCompareSectionTotal = (
        valuesMap: Record<string, number>,
        type: 'real' | 'budget',
        section: string,
        structure: StructureGroup[]
    ): number[] => {
        const totals = Array(12).fill(0);
        structure.forEach(group => {
            const items = group.items || group.services || [];
            items.forEach(item => {
                for (let i = 0; i < 12; i++) {
                    totals[i] += getCompareValue(valuesMap, type, section, group.dept, item, i);
                }
            });
        });
        return totals.map(t => fmt(t));
    };

    // ── Editable cell ─────────────────────────────────────────────────────────
    const renderEditableCell = (section: string, dept: string, item: string, monthIdx: number) => {
        const value = getCellValue(section, dept, item, monthIdx);
        return (
            <td key={monthIdx} className="border border-gray-200 p-0">
                <input
                    type="number"
                    value={value || ''}
                    onChange={(e) => handleCellChange(section, dept, item, monthIdx, e.target.value)}
                    onBlur={(e) => {
                        saveMutation.mutate({
                            year,
                            month: monthIdx + 1,
                            dept,
                            item,
                            section: section === 'revenue' ? 'revenue' : 'expense',
                            value: Number(e.target.value),
                            type: typeParam as 'budget' | 'real'
                        });
                    }}
                    className="w-full h-full px-1 py-1 text-right text-xs bg-transparent border-0 focus:outline-none focus:bg-yellow-50"
                    style={{ minWidth: '50px' }}
                />
            </td>
        );
    };

    // ── Revenue rows ──────────────────────────────────────────────────────────
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
                        <td className="border border-gray-200 px-2 py-1 text-xs text-gray-900">{service}</td>
                        {MONTHS_FULL.map((_, monthIdx) => renderEditableCell('revenue', group.dept, service, monthIdx))}
                        <td className="border border-gray-200 px-1 py-1 text-right text-xs font-medium bg-gray-50">
                            {calculateRowTotal('revenue', group.dept, service) || 0}
                        </td>
                    </tr>
                );
            });
        });
        return rows;
    };

    // ── Expense category ──────────────────────────────────────────────────────
    const renderExpenseCategory = (
        categoryName: string,
        items: { dept: string; items: string[] }[],
        sectionKey: string,
        bgColor: string = 'bg-orange-50'
    ) => {
        const rows: React.ReactNode[] = [];
        const categoryTotals = calculateSectionTotal(sectionKey, items);
        const categoryAnnual = categoryTotals.reduce((a, b) => a + b, 0);

        rows.push(
            <tr key={`cat-${sectionKey}`} className={bgColor}>
                <td className="border border-orange-200 px-2 py-1.5 text-xs font-semibold text-orange-800"></td>
                <td className="border border-orange-200 px-2 py-1.5 text-xs font-semibold text-orange-800">{categoryName}</td>
                {categoryTotals.map((val, i) => (
                    <td key={i} className="border border-orange-200 px-1 py-1.5 text-right text-xs font-medium text-orange-700">{val || 0}</td>
                ))}
                <td className="border border-orange-200 px-1 py-1.5 text-right text-xs font-semibold text-orange-800">{categoryAnnual || 0}</td>
            </tr>
        );

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
                        <td className="border border-gray-200 px-2 py-1 text-xs text-gray-900">{item}</td>
                        {MONTHS_FULL.map((_, monthIdx) => renderEditableCell(sectionKey, group.dept, item, monthIdx))}
                        <td className="border border-gray-200 px-1 py-1 text-right text-xs font-medium bg-gray-50">
                            {calculateRowTotal(sectionKey, group.dept, item) || 0}
                        </td>
                    </tr>
                );
            });
        });

        rows.push(
            <tr key={`spacer-${sectionKey}`}>
                <td colSpan={15} className="border border-gray-100 py-1 bg-white"></td>
            </tr>
        );

        return rows;
    };

    // ── Comparison table ──────────────────────────────────────────────────────
    const renderComparisonSection = (
        label: string,
        sectionKey: string,
        structure: StructureGroup[],
        headerColor: string,
        rowBgColor: string
    ) => {
        const rows: React.ReactNode[] = [];
        const isExpense = sectionKey !== 'revenue';

        // Color logic:
        //   Income  → green if real >= budget (met goal), red if real < budget
        //   Expense → green if real <= budget (saved money), red if real > budget (over)
        const diffColor = (diff: number) => {
            if (isExpense) return diff <= 0 ? 'text-green-700' : 'text-red-600';
            return diff >= 0 ? 'text-green-700' : 'text-red-600';
        };

        const realTotals = calcCompareSectionTotal(realValues, 'real', sectionKey, structure);
        const budgetTotals = calcCompareSectionTotal(budgetValues, 'budget', sectionKey, structure);
        const realAnnual = realTotals.reduce((a, b) => a + b, 0);
        const budgetAnnual = budgetTotals.reduce((a, b) => a + b, 0);
        const diffAnnual = fmt(realAnnual - budgetAnnual);
        const pctAnnual = budgetAnnual !== 0 ? fmt(((realAnnual - budgetAnnual) / Math.abs(budgetAnnual)) * 100) : null;

        rows.push(
            <tr key={`cmp-hdr-${sectionKey}`} className={headerColor}>
                <td colSpan={2} className="border border-gray-300 px-2 py-1.5 font-bold text-xs">{label}</td>
                {MONTHS.map((_, i) => {
                    const r = realTotals[i];
                    const b = budgetTotals[i];
                    const diff = fmt(r - b);
                    const pct = b !== 0 ? fmt(((r - b) / Math.abs(b)) * 100) : null;
                    return (
                        <td key={i} className="border border-gray-300 px-1 py-1.5 text-right text-xs font-semibold">
                            <div className="text-blue-900 font-bold">{r || 0}</div>
                            <div className="text-gray-500 font-normal">{b || 0}</div>
                            <div className={diffColor(diff)}>
                                {diff >= 0 ? '+' : ''}{diff}
                                {pct !== null && <span className="ml-1 text-[10px]">({pct >= 0 ? '+' : ''}{pct}%)</span>}
                            </div>
                        </td>
                    );
                })}
                <td className="border border-gray-300 px-1 py-1.5 text-right text-xs font-bold">
                    <div className="text-blue-900">{fmt(realAnnual)}</div>
                    <div className="text-gray-500 font-normal">{fmt(budgetAnnual)}</div>
                    <div className={diffColor(diffAnnual)}>
                        {diffAnnual >= 0 ? '+' : ''}{diffAnnual}
                        {pctAnnual !== null && <span className="ml-1 text-[10px]">({pctAnnual >= 0 ? '+' : ''}{pctAnnual}%)</span>}
                    </div>
                </td>
            </tr>
        );

        structure.forEach((group, groupIdx) => {
            const items = group.items || group.services || [];
            items.forEach((item, itemIdx) => {
                rows.push(
                    <tr key={`cmp-${sectionKey}-${groupIdx}-${itemIdx}`} className={`hover:bg-gray-50 ${rowBgColor}`}>
                        {itemIdx === 0 ? (
                            <td rowSpan={items.length} className="border border-gray-200 px-2 py-1 text-xs font-medium text-gray-600 bg-gray-50 align-middle text-center">
                                {group.dept}
                            </td>
                        ) : null}
                        <td className="border border-gray-200 px-2 py-1 text-xs text-gray-800">{item}</td>
                        {MONTHS.map((_, monthIdx) => {
                            const r = getCompareValue(realValues, 'real', sectionKey, group.dept, item, monthIdx);
                            const b = getCompareValue(budgetValues, 'budget', sectionKey, group.dept, item, monthIdx);
                            const diff = fmt(r - b);
                            const pct = b !== 0 ? fmt(((r - b) / Math.abs(b)) * 100) : null;
                            return (
                                <td key={monthIdx} className="border border-gray-200 px-1 py-0.5 text-right text-xs">
                                    <div className="text-blue-900 font-semibold">{r || 0}</div>
                                    <div className="text-gray-400">{b || 0}</div>
                                    {(r !== 0 || b !== 0) && (
                                        <div className={diffColor(diff)}>
                                            {diff >= 0 ? '+' : ''}{diff}
                                            {pct !== null && <span className="text-[9px] ml-0.5">({pct >= 0 ? '+' : ''}{pct}%)</span>}
                                        </div>
                                    )}
                                </td>
                            );
                        })}
                        {(() => {
                            const rAnn = Array.from({ length: 12 }, (_, i) =>
                                getCompareValue(realValues, 'real', sectionKey, group.dept, item, i)
                            ).reduce((a, b) => a + b, 0);
                            const bAnn = Array.from({ length: 12 }, (_, i) =>
                                getCompareValue(budgetValues, 'budget', sectionKey, group.dept, item, i)
                            ).reduce((a, b) => a + b, 0);
                            const dAnn = fmt(rAnn - bAnn);
                            const pAnn = bAnn !== 0 ? fmt(((rAnn - bAnn) / Math.abs(bAnn)) * 100) : null;
                            return (
                                <td className="border border-gray-200 px-1 py-0.5 text-right text-xs font-medium bg-gray-50">
                                    <div className="text-blue-900 font-semibold">{fmt(rAnn)}</div>
                                    <div className="text-gray-400">{fmt(bAnn)}</div>
                                    {(rAnn !== 0 || bAnn !== 0) && (
                                        <div className={diffColor(dAnn)}>
                                            {dAnn >= 0 ? '+' : ''}{dAnn}
                                            {pAnn !== null && <span className="text-[9px] ml-0.5">({pAnn >= 0 ? '+' : ''}{pAnn}%)</span>}
                                        </div>
                                    )}
                                </td>
                            );
                        })()}
                    </tr>
                );
            });
        });

        rows.push(
            <tr key={`cmp-spacer-${sectionKey}`}>
                <td colSpan={15} className="border border-gray-100 py-1 bg-white"></td>
            </tr>
        );

        return rows;
    };

    // ── Totals ────────────────────────────────────────────────────────────────
    const ingresosTotals = calculateSectionTotal('revenue', REVENUE_STRUCTURE);
    const ingresosAnual = ingresosTotals.reduce((a, b) => a + b, 0);

    const gastosTotals = Array(12).fill(0);
    ['personal', 'comisiones', 'marketing', 'formacion', 'software', 'adspent', 'gastosOp'].forEach(key => {
        const items = EXPENSE_STRUCTURE[`${key}Items` as keyof typeof EXPENSE_STRUCTURE];
        const totals = calculateSectionTotal(key, items);
        totals.forEach((v, i) => gastosTotals[i] += v);
    });
    const gastosAnual = gastosTotals.reduce((a, b) => a + b, 0);

    const ebitdaTotals = ingresosTotals.map((v, i) => v - gastosTotals[i]);
    const ebitdaAnual = ingresosAnual - gastosAnual;

    // ── Comparison EBITDA ─────────────────────────────────────────────────────
    const calcAllExpenses = (valuesMap: Record<string, number>, type: 'real' | 'budget') => {
        const totals = Array(12).fill(0);
        ['personal', 'comisiones', 'marketing', 'formacion', 'software', 'adspent', 'gastosOp'].forEach(key => {
            const items = EXPENSE_STRUCTURE[`${key}Items` as keyof typeof EXPENSE_STRUCTURE];
            items.forEach((group: any) => {
                const its = group.items || group.services || [];
                its.forEach((item: string) => {
                    for (let i = 0; i < 12; i++) {
                        totals[i] += getCompareValue(valuesMap, type, key, group.dept, item, i);
                    }
                });
            });
        });
        return totals.map(t => fmt(t));
    };

    const realRevTotals = calcCompareSectionTotal(realValues, 'real', 'revenue', REVENUE_STRUCTURE);
    const budgetRevTotals = calcCompareSectionTotal(budgetValues, 'budget', 'revenue', REVENUE_STRUCTURE);
    const realExpTotals = calcAllExpenses(realValues, 'real');
    const budgetExpTotals = calcAllExpenses(budgetValues, 'budget');
    const realEbitda = realRevTotals.map((v, i) => fmt(v - realExpTotals[i]));
    const budgetEbitda = budgetRevTotals.map((v, i) => fmt(v - budgetExpTotals[i]));

    // ── Alerts panel ──────────────────────────────────────────────────────────
    const EXPENSE_KEYS = ['personal', 'comisiones', 'marketing', 'formacion', 'software', 'adspent', 'gastosOp'] as const;
    const EXPENSE_LABELS: Record<string, string> = {
        personal: 'Personal', comisiones: 'Comisiones', marketing: 'Marketing',
        formacion: 'Formación', software: 'Software', adspent: 'Adspent', gastosOp: 'Gastos Op.',
    };
    const alertMonthIdx = new Date().getMonth();

    const revRealMonth = realRevTotals[alertMonthIdx] || 0;
    const revBudgetMonth = budgetRevTotals[alertMonthIdx] || 0;
    const revDiffMonth = fmt(revRealMonth - revBudgetMonth);
    const revPctMonth = revBudgetMonth !== 0 ? fmt(((revRealMonth - revBudgetMonth) / Math.abs(revBudgetMonth)) * 100) : null;
    const revRealAnnual = realRevTotals.reduce((a, b) => a + b, 0);
    const revBudgetAnnual = budgetRevTotals.reduce((a, b) => a + b, 0);
    const revDiffAnnual = fmt(revRealAnnual - revBudgetAnnual);
    const revPctAnnual = revBudgetAnnual !== 0 ? fmt(((revRealAnnual - revBudgetAnnual) / Math.abs(revBudgetAnnual)) * 100) : null;

    const expenseAlerts = EXPENSE_KEYS.map(key => {
        const items = EXPENSE_STRUCTURE[`${key}Items` as keyof typeof EXPENSE_STRUCTURE];
        const rT = calcCompareSectionTotal(realValues, 'real', key, items as StructureGroup[]);
        const bT = calcCompareSectionTotal(budgetValues, 'budget', key, items as StructureGroup[]);
        return {
            label: EXPENSE_LABELS[key],
            diffM: fmt((rT[alertMonthIdx] || 0) - (bT[alertMonthIdx] || 0)),
            diffA: fmt(rT.reduce((a, b) => a + b, 0) - bT.reduce((a, b) => a + b, 0)),
        };
    });
    const overBudgetMonth = expenseAlerts.filter(e => e.diffM > 0);
    const overBudgetAnnual = expenseAlerts.filter(e => e.diffA > 0);

    const isLoadingComparison = loadingReal || loadingBudget;

    return (
        <div className="space-y-4 -mx-6 -mt-6">
            {/* Header Bar */}
            <div className="bg-white border-b px-6 py-3 flex items-center justify-between sticky top-0 z-20">
                <div className="flex items-center gap-4">
                    <h1 className="text-lg font-bold text-gray-900">
                        {activeTab === 'Real' ? 'P&L REAL' : activeTab === 'Presupuesto' ? 'PRESUPUESTO' : 'COMPARACIÓN REAL vs PRESUPUESTO'} {year}
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
                    {activeTab === 'Comparación' && (
                        <div className="flex items-center gap-3 text-xs text-gray-500 ml-2">
                            <span className="flex items-center gap-1"><span className="w-3 h-3 inline-block bg-gray-800 rounded-sm"></span> Real</span>
                            <span className="flex items-center gap-1"><span className="w-3 h-3 inline-block bg-gray-400 rounded-sm"></span> Presupuesto</span>
                            <span className="flex items-center gap-1"><span className="w-3 h-3 inline-block bg-green-500 rounded-sm"></span> Diferencia</span>
                        </div>
                    )}
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

            {/* ── COMPARACIÓN TAB ─────────────────────────────────────────────── */}
            {activeTab === 'Comparación' && (
                <div className="space-y-3 px-2">
                    {isLoadingComparison ? (
                        <div className="flex items-center justify-center py-20 text-gray-500">Cargando datos...</div>
                    ) : (
                        <>
                            {/* ── PANEL DE ALERTAS ──────────────────────────────────────── */}
                            <div className="grid grid-cols-2 gap-3">
                                {/* Mes actual */}
                                <div className="bg-white border rounded-xl p-4 shadow-sm">
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 className="font-semibold text-sm text-gray-700">📅 {MONTHS_FULL[alertMonthIdx]} — Resumen</h3>
                                        <span className="text-xs text-gray-400">Mes actual</span>
                                    </div>
                                    {/* Facturación */}
                                    <div className={`flex items-center justify-between rounded-lg px-3 py-2 mb-2 ${revDiffMonth >= 0 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                                        <div>
                                            <p className="text-xs font-semibold text-gray-700">Facturación</p>
                                            <p className="text-xs text-gray-500">Real: <span className="text-blue-900 font-bold">{Math.round(revRealMonth).toLocaleString('es-ES')}</span> · Meta: {Math.round(revBudgetMonth).toLocaleString('es-ES')}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className={`text-sm font-bold ${revDiffMonth >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                                                {revDiffMonth >= 0 ? '✓ Meta alcanzada' : '✗ Bajo meta'}
                                            </p>
                                            <p className={`text-xs ${revDiffMonth >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                                {revDiffMonth >= 0 ? '+' : ''}{Math.round(revDiffMonth).toLocaleString('es-ES')}
                                                {revPctMonth !== null && ` (${revPctMonth >= 0 ? '+' : ''}${revPctMonth}%)`}
                                            </p>
                                        </div>
                                    </div>
                                    {/* Gastos sobre presupuesto este mes */}
                                    {overBudgetMonth.length === 0 ? (
                                        <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-xs text-green-700 font-medium">
                                            ✓ Todos los gastos dentro del presupuesto
                                        </div>
                                    ) : (
                                        <div className="space-y-1">
                                            <p className="text-xs font-semibold text-red-700 mb-1">⚠ Gastos sobre presupuesto:</p>
                                            {overBudgetMonth.map(e => (
                                                <div key={e.label} className="flex items-center justify-between bg-red-50 border border-red-200 rounded-lg px-3 py-1.5">
                                                    <span className="text-xs font-medium text-gray-700">{e.label}</span>
                                                    <span className="text-xs font-bold text-red-600">+{Math.round(e.diffM).toLocaleString('es-ES')}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Anual */}
                                <div className="bg-white border rounded-xl p-4 shadow-sm">
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 className="font-semibold text-sm text-gray-700">📊 {year} — Resumen Anual</h3>
                                        <span className="text-xs text-gray-400">Acumulado</span>
                                    </div>
                                    {/* Facturación anual */}
                                    <div className={`flex items-center justify-between rounded-lg px-3 py-2 mb-2 ${revDiffAnnual >= 0 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                                        <div>
                                            <p className="text-xs font-semibold text-gray-700">Facturación</p>
                                            <p className="text-xs text-gray-500">Real: <span className="text-blue-900 font-bold">{Math.round(revRealAnnual).toLocaleString('es-ES')}</span> · Meta: {Math.round(revBudgetAnnual).toLocaleString('es-ES')}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className={`text-sm font-bold ${revDiffAnnual >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                                                {revDiffAnnual >= 0 ? '✓ Meta alcanzada' : '✗ Bajo meta'}
                                            </p>
                                            <p className={`text-xs ${revDiffAnnual >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                                {revDiffAnnual >= 0 ? '+' : ''}{Math.round(revDiffAnnual).toLocaleString('es-ES')}
                                                {revPctAnnual !== null && ` (${revPctAnnual >= 0 ? '+' : ''}${revPctAnnual}%)`}
                                            </p>
                                        </div>
                                    </div>
                                    {/* Gastos sobre presupuesto anual */}
                                    {overBudgetAnnual.length === 0 ? (
                                        <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-xs text-green-700 font-medium">
                                            ✓ Todos los gastos dentro del presupuesto anual
                                        </div>
                                    ) : (
                                        <div className="space-y-1">
                                            <p className="text-xs font-semibold text-red-700 mb-1">⚠ Gastos sobre presupuesto anual:</p>
                                            {overBudgetAnnual.map(e => (
                                                <div key={e.label} className="flex items-center justify-between bg-red-50 border border-red-200 rounded-lg px-3 py-1.5">
                                                    <span className="text-xs font-medium text-gray-700">{e.label}</span>
                                                    <span className="text-xs font-bold text-red-600">+{Math.round(e.diffA).toLocaleString('es-ES')}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* ── TABLA DE COMPARACIÓN ─────────────────────────────────── */}
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse text-xs" style={{ minWidth: '1200px' }}>
                                    <thead>
                                        <tr className="bg-white">
                                            <th className="border border-gray-300 px-2 py-2 text-left font-medium" style={{ width: '100px' }}></th>
                                            <th className="border border-gray-300 px-2 py-2 text-left font-medium" style={{ width: '160px' }}></th>
                                            {MONTHS.map((month, i) => (
                                                <th key={i} className="border border-gray-300 px-1 py-2 text-center font-medium text-xs" style={{ width: '80px', minWidth: '80px' }}>
                                                    {month}
                                                </th>
                                            ))}
                                            <th className="border border-gray-300 px-1 py-2 text-center font-semibold text-xs bg-gray-100" style={{ width: '90px', minWidth: '90px' }}>
                                                Anual
                                            </th>
                                        </tr>
                                        {/* Legend sub-row */}
                                        <tr className="bg-gray-50 text-[10px] text-gray-500">
                                            <td colSpan={2} className="border border-gray-200 px-2 py-1">Departamento / Concepto</td>
                                            {MONTHS.map((_, i) => (
                                                <td key={i} className="border border-gray-200 px-1 py-1 text-right">
                                                    <div>Real</div>
                                                    <div>Presup.</div>
                                                    <div>Dif.</div>
                                                </td>
                                            ))}
                                            <td className="border border-gray-200 px-1 py-1 text-right">
                                                <div>Real</div>
                                                <div>Presup.</div>
                                                <div>Dif.</div>
                                            </td>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {/* INGRESOS */}
                                        {renderComparisonSection(
                                            'INGRESOS DE EXPLOTACIÓN',
                                            'revenue',
                                            REVENUE_STRUCTURE,
                                            'bg-purple-100 text-purple-900',
                                            ''
                                        )}

                                        {/* GASTOS */}
                                        {renderComparisonSection('Gastos de personal', 'personal', EXPENSE_STRUCTURE.personalItems, 'bg-orange-100 text-orange-900', '')}
                                        {renderComparisonSection('Comisiones', 'comisiones', EXPENSE_STRUCTURE.comisionesItems, 'bg-orange-50 text-orange-800', '')}
                                        {renderComparisonSection('Marketing', 'marketing', EXPENSE_STRUCTURE.marketingItems, 'bg-orange-50 text-orange-800', '')}
                                        {renderComparisonSection('Formación', 'formacion', EXPENSE_STRUCTURE.formacionItems, 'bg-orange-50 text-orange-800', '')}
                                        {renderComparisonSection('Software', 'software', EXPENSE_STRUCTURE.softwareItems, 'bg-orange-50 text-orange-800', '')}
                                        {renderComparisonSection('Adspent', 'adspent', EXPENSE_STRUCTURE.adspentItems, 'bg-orange-50 text-orange-800', '')}
                                        {renderComparisonSection('Gastos Operativos', 'gastosOp', EXPENSE_STRUCTURE.gastosOpItems, 'bg-orange-50 text-orange-800', '')}

                                        {/* EBITDA comparison */}
                                        <tr className="bg-blue-100">
                                            <td colSpan={2} className="border border-blue-300 px-2 py-2 font-bold text-blue-900 text-sm">EBITDA</td>
                                            {realEbitda.map((r, i) => {
                                                const b = budgetEbitda[i];
                                                const diff = fmt(r - b);
                                                const pct = b !== 0 ? fmt(((r - b) / Math.abs(b)) * 100) : null;
                                                return (
                                                    <td key={i} className="border border-blue-300 px-1 py-2 text-right font-bold text-blue-800">
                                                        <div>{r}</div>
                                                        <div className="text-blue-400 font-normal">{b}</div>
                                                        <div className={diff >= 0 ? 'text-green-700' : 'text-red-600'}>
                                                            {diff >= 0 ? '+' : ''}{diff}
                                                            {pct !== null && <span className="text-[10px] ml-1">({pct >= 0 ? '+' : ''}{pct}%)</span>}
                                                        </div>
                                                    </td>
                                                );
                                            })}
                                            {(() => {
                                                const rAnn = fmt(realEbitda.reduce((a, b) => a + b, 0));
                                                const bAnn = fmt(budgetEbitda.reduce((a, b) => a + b, 0));
                                                const dAnn = fmt(rAnn - bAnn);
                                                const pAnn = bAnn !== 0 ? fmt(((rAnn - bAnn) / Math.abs(bAnn)) * 100) : null;
                                                return (
                                                    <td className="border border-blue-300 px-1 py-2 text-right font-bold text-blue-900 text-sm">
                                                        <div>{rAnn}</div>
                                                        <div className="text-blue-400 font-normal">{bAnn}</div>
                                                        <div className={dAnn >= 0 ? 'text-green-700' : 'text-red-600'}>
                                                            {dAnn >= 0 ? '+' : ''}{dAnn}
                                                            {pAnn !== null && <span className="text-[10px] ml-1">({pAnn >= 0 ? '+' : ''}{pAnn}%)</span>}
                                                        </div>
                                                    </td>
                                                );
                                            })()}
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* ── REAL / PRESUPUESTO TABS ──────────────────────────────────────── */}
            {activeTab !== 'Comparación' && (
                <div className="overflow-x-auto px-2">
                    <table className="w-full border-collapse text-xs" style={{ minWidth: '1200px' }}>
                        <thead>
                            <tr className="bg-white">
                                <th className="border border-gray-300 px-2 py-2 text-left font-medium" style={{ width: '100px' }}></th>
                                <th className="border border-gray-300 px-2 py-2 text-left font-medium" style={{ width: '160px' }}></th>
                                {MONTHS_FULL.map((month, i) => (
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
                                <td colSpan={2} className="border border-blue-300 px-2 py-2 font-bold text-blue-900 text-sm">EBITDA</td>
                                {ebitdaTotals.map((val, i) => (
                                    <td key={i} className="border border-blue-300 px-1 py-2 text-right font-bold text-blue-800">{val}</td>
                                ))}
                                <td className="border border-blue-300 px-1 py-2 text-right font-bold text-blue-900 text-sm">{ebitdaAnual}</td>
                            </tr>

                            {/* RESULTADO */}
                            <tr className="bg-green-100">
                                <td colSpan={2} className="border border-green-400 px-2 py-2 font-bold text-green-900 text-sm">RESULTADO</td>
                                {ebitdaTotals.map((val, i) => (
                                    <td key={i} className="border border-green-400 px-1 py-2 text-right font-bold text-green-800">{val}</td>
                                ))}
                                <td className="border border-green-400 px-1 py-2 text-right font-bold text-green-900 text-sm">{ebitdaAnual}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            )}

            {(isLoading || isLoadingComparison) && (
                <div className="fixed inset-0 bg-white/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-lg p-4">Cargando...</div>
                </div>
            )}
        </div>
    );
}
