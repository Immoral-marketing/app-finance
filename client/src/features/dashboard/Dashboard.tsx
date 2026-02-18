import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Navigate } from 'react-router-dom';
import { adminApi } from '@/lib/api/admin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { formatCurrency } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import {
    Wallet,
    TrendingUp,
    TrendingDown,
    Settings2
} from 'lucide-react';

// Widget Types
type WidgetType = 'kpis' | 'departments';

// Map department_code from profile to route slug
const DEPT_ROUTE_MAP: Record<string, string> = {
    immedia: 'immedia',
    imcontent: 'imcontent',
    immoralia: 'immoralia',
    IMMED: 'immedia',
    IMCONT: 'imcontent',
    IMMOR: 'immoralia',
};

// ========== P&L STRUCTURE (same as DepartmentPL — single source of truth) ==========
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

// Department display config
const DEPT_CONFIGS: Record<string, {
    label: string;
    deptNames: string[];
    expenseCategories: { label: string; key: string }[];
}> = {
    Immedia: {
        label: 'Immedia',
        deptNames: ['Immedia'],
        expenseCategories: [
            { label: 'Personal', key: 'personal' },
            { label: 'Comisiones', key: 'comisiones' },
            { label: 'Marketing', key: 'marketing' },
            { label: 'Formación', key: 'formacion' },
            { label: 'Software', key: 'software' },
            { label: 'Adspent', key: 'adspent' },
        ],
    },
    Imcontent: {
        label: 'Imcontent',
        deptNames: ['Imcontent'],
        expenseCategories: [
            { label: 'Personal', key: 'personal' },
            { label: 'Comisiones', key: 'comisiones' },
            { label: 'Marketing', key: 'marketing' },
            { label: 'Formación', key: 'formacion' },
            { label: 'Software', key: 'software' },
            { label: 'Adspent / Influencers', key: 'adspent' },
        ],
    },
    Immoralia: {
        label: 'Immoralia',
        deptNames: ['Immoralia'],
        expenseCategories: [
            { label: 'Personal', key: 'personal' },
            { label: 'Comisiones', key: 'comisiones' },
            { label: 'Marketing', key: 'marketing' },
            { label: 'Formación', key: 'formacion' },
            { label: 'Software', key: 'software' },
        ],
    },
    Immoral: {
        label: 'Immoral',
        deptNames: ['Immoral'],
        expenseCategories: [
            { label: 'Personal', key: 'personal' },
            { label: 'Marketing', key: 'marketing' },
            { label: 'Formación', key: 'formacion' },
            { label: 'Software', key: 'software' },
            { label: 'Gastos Operativos', key: 'gastosOp' },
        ],
    },
    Imseo: {
        label: 'Imseo',
        deptNames: ['Imseo'],
        expenseCategories: [
            { label: 'Comisiones', key: 'comisiones' },
            { label: 'Marketing', key: 'marketing' },
            { label: 'Formación', key: 'formacion' },
            { label: 'Software', key: 'software' },
        ],
    },
    Imloyal: {
        label: 'Imloyal',
        deptNames: ['Imloyal'],
        expenseCategories: [
            { label: 'Personal', key: 'personal' },
            { label: 'Comisiones', key: 'comisiones' },
            { label: 'Marketing', key: 'marketing' },
            { label: 'Software', key: 'software' },
        ],
    },
    Imsales: {
        label: 'Imsales',
        deptNames: ['Imsales'],
        expenseCategories: [
            { label: 'Personal', key: 'personal' },
            { label: 'Comisiones', key: 'comisiones' },
            { label: 'Marketing', key: 'marketing' },
            { label: 'Formación', key: 'formacion' },
            { label: 'Software', key: 'software' },
        ],
    },
    Imfilms: {
        label: 'Imfilms',
        deptNames: ['Imfilms'],
        expenseCategories: [
            { label: 'Comisiones', key: 'comisiones' },
            { label: 'Marketing', key: 'marketing' },
        ],
    },
    Imfashion: {
        label: 'Imfashion',
        deptNames: ['Imfashion'],
        expenseCategories: [
            { label: 'Comisiones', key: 'comisiones' },
            { label: 'Marketing', key: 'marketing' },
            { label: 'Formación', key: 'formacion' },
        ],
    },
};

// Map expense structure keys
const EXPENSE_KEY_MAP: Record<string, { dept: string; items: string[] }[]> = {
    personal: EXPENSE_STRUCTURE.personalItems,
    comisiones: EXPENSE_STRUCTURE.comisionesItems,
    marketing: EXPENSE_STRUCTURE.marketingItems,
    formacion: EXPENSE_STRUCTURE.formacionItems,
    software: EXPENSE_STRUCTURE.softwareItems,
    gastosOp: EXPENSE_STRUCTURE.gastosOpItems,
    adspent: EXPENSE_STRUCTURE.adspentItems,
};

const MAIN_DEPTS = ['Immedia', 'Imcontent', 'Immoralia'];
const VERTICAL_DEPTS = ['Imloyal', 'Imseo', 'Immoral', 'Imsales', 'Imfilms', 'Imfashion'];

export default function Dashboard() {
    const { isDeptHead, profile } = useAuth();

    // Redirect dept_head to their own department dashboard
    if (isDeptHead() && profile?.department_code) {
        const slug = DEPT_ROUTE_MAP[profile.department_code] || profile.department_code.toLowerCase();
        return <Navigate to={`/departamentos/${slug}`} replace />;
    }
    const [year] = useState(new Date().getFullYear());
    const [visibleWidgets, setVisibleWidgets] = useState<Record<WidgetType, boolean>>({
        kpis: true,
        departments: true,
    });
    const [isConfiguring, setIsConfiguring] = useState(false);
    const [deptFilter, setDeptFilter] = useState<'all' | 'main' | 'verticals'>('main');

    // Load configs from local storage
    useEffect(() => {
        const saved = localStorage.getItem('dashboard_config');
        if (saved) {
            try {
                setVisibleWidgets(JSON.parse(saved));
            } catch (e) {
                console.error("Failed to parse dashboard config", e);
            }
        }
    }, []);

    const toggleWidget = (widget: WidgetType) => {
        const newConfig = { ...visibleWidgets, [widget]: !visibleWidgets[widget] };
        setVisibleWidgets(newConfig);
        localStorage.setItem('dashboard_config', JSON.stringify(newConfig));
    };

    // Fetch PL matrix (REAL) to compute department cards FROM SAME SOURCE as DepartmentPL
    const { data: plRealData, isLoading: isLoadingPL } = useQuery({
        queryKey: ['pl-matrix', year, 'real'],
        queryFn: () => adminApi.getPLMatrix(year, 'real'),
    });

    // Build lookup from PL matrix rows — SAME format as DepartmentPL
    const plValues = useMemo(() => {
        const vals: Record<string, number> = {};
        if (plRealData?.sections) {
            const revenueSection = plRealData.sections.find((s: any) => s.code === 'REVENUE');
            revenueSection?.rows?.forEach((row: any) => {
                if (row.values && row.dept && row.name) {
                    row.values.forEach((val: number, monthIdx: number) => {
                        vals[`revenue-${row.dept}-${row.name}-${monthIdx}`] = val || 0;
                    });
                }
            });
            const expenseSection = plRealData.sections.find((s: any) => s.code === 'EXPENSES');
            expenseSection?.rows?.forEach((row: any) => {
                if (row.values && row.name && Array.isArray(row.values)) {
                    row.values.forEach((val: number, monthIdx: number) => {
                        vals[`expense-${row.dept || 'General'}-${row.name}-${monthIdx}`] = val || 0;
                    });
                }
            });
        }
        return vals;
    }, [plRealData]);

    // Helper: get value from PL lookup (normalizes section key like DepartmentPL)
    const getVal = (section: string, dept: string, item: string, month: number): number => {
        const normalizedSection = section === 'revenue' ? 'revenue' : 'expense';
        return plValues[`${normalizedSection}-${dept}-${item}-${month}`] || 0;
    };

    // Compute department performance from PL matrix
    const deptPerformance = useMemo(() => {
        if (!plRealData?.sections) return [];

        // Total general revenue per month (for Group %)
        const totalGenRevenue = Array(12).fill(0);
        REVENUE_STRUCTURE.forEach(g => {
            g.services.forEach(s => {
                for (let m = 0; m < 12; m++) {
                    totalGenRevenue[m] += getVal('revenue', g.dept, s, m);
                }
            });
        });
        const totalGenRevenueAnnual = totalGenRevenue.reduce((a, b) => a + b, 0);

        // Immoral gastosOp total per month
        const gastosGenMonthly = Array(12).fill(0);
        EXPENSE_STRUCTURE.gastosOpItems.forEach(g => {
            g.items.forEach(item => {
                for (let m = 0; m < 12; m++) {
                    gastosGenMonthly[m] += getVal('gastosOp', g.dept, item, m);
                }
            });
        });

        return Object.entries(DEPT_CONFIGS).map(([deptKey, config]) => {
            // Revenue
            let income = 0;
            REVENUE_STRUCTURE.filter(g => config.deptNames.includes(g.dept))
                .forEach(g => {
                    g.services.forEach(s => {
                        for (let m = 0; m < 12; m++) {
                            income += getVal('revenue', g.dept, s, m);
                        }
                    });
                });

            // Expenses per category
            const breakdown: Record<string, number> = {};
            let totalExpenses = 0;
            config.expenseCategories.forEach(cat => {
                const items = EXPENSE_KEY_MAP[cat.key] || [];
                let catTotal = 0;
                items.filter(g => config.deptNames.includes(g.dept))
                    .forEach(g => {
                        g.items.forEach(item => {
                            for (let m = 0; m < 12; m++) {
                                catTotal += getVal(cat.key, g.dept, item, m);
                            }
                        });
                    });
                breakdown[cat.key] = catTotal;
                totalExpenses += catTotal;
            });

            // Group % = dept revenue per month / total general revenue per month
            let groupCostAnnual = 0;
            const deptRevMonthly = Array(12).fill(0);
            REVENUE_STRUCTURE.filter(g => config.deptNames.includes(g.dept))
                .forEach(g => {
                    g.services.forEach(s => {
                        for (let m = 0; m < 12; m++) {
                            deptRevMonthly[m] += getVal('revenue', g.dept, s, m);
                        }
                    });
                });

            for (let m = 0; m < 12; m++) {
                const pct = totalGenRevenue[m] > 0 ? deptRevMonthly[m] / totalGenRevenue[m] : 0;
                groupCostAnnual += gastosGenMonthly[m] * pct;
            }

            // Group % annual (billing share)
            const groupPctAnnual = totalGenRevenueAnnual > 0
                ? (income / totalGenRevenueAnnual) * 100
                : 0;

            // Don't add Group cost for Immoral itself (it IS the source of gastosOp)
            const isImmoral = deptKey === 'Immoral';
            const finalGroupCost = isImmoral ? 0 : groupCostAnnual;

            const totalWithGroup = totalExpenses + finalGroupCost;
            const margin = income - totalWithGroup;
            const marginPct = income > 0 ? (margin / income) * 100 : 0;

            return {
                name: config.label,
                key: deptKey,
                income: Math.round(income * 100) / 100,
                expenses: Math.round(totalWithGroup * 100) / 100,
                margin: Math.round(margin * 100) / 100,
                marginPct,
                groupPctAnnual: Math.round(groupPctAnnual * 10) / 10,
                groupCost: Math.round(finalGroupCost * 100) / 100,
                breakdown,
                categories: config.expenseCategories,
            };
        });
    }, [plValues, plRealData]);

    // Compute KPIs from PL matrix too (for total billing, expenses)
    const plKpis = useMemo(() => {
        // Sum all depts except exclude duplicates
        const mainAndVerticals = [...MAIN_DEPTS, ...VERTICAL_DEPTS];
        let totalBilling = 0;
        let totalExpenses = 0;
        deptPerformance.forEach(d => {
            if (mainAndVerticals.includes(d.name)) {
                totalBilling += d.income;
                totalExpenses += d.expenses;
            }
        });
        return {
            totalBilling: Math.round(totalBilling * 100) / 100,
            totalExpenses: Math.round(totalExpenses * 100) / 100,
            netMargin: Math.round((totalBilling - totalExpenses) * 100) / 100,
            marginPercentage: totalBilling > 0 ? ((totalBilling - totalExpenses) / totalBilling) * 100 : 0,
        };
    }, [deptPerformance]);

    const isLoading = isLoadingPL;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8" >
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                    <p className="text-muted-foreground mt-1">Overview for Fiscal Year {year}</p>
                </div>
                <Button
                    variant={isConfiguring ? "secondary" : "outline"}
                    onClick={() => setIsConfiguring(!isConfiguring)}
                    className="gap-2"
                >
                    <Settings2 size={16} />
                    {isConfiguring ? 'Done' : 'Customize'}
                </Button>
            </div>

            {isConfiguring && (
                <Card className="bg-muted/50 border-dashed">
                    <CardContent className="p-4 flex flex-wrap gap-4 items-center">
                        <span className="text-sm font-medium">Toggle Widgets:</span>
                        <div className="flex gap-4">
                            <label className="flex items-center gap-2 text-sm cursor-pointer hover:text-primary">
                                <input
                                    type="checkbox"
                                    checked={visibleWidgets.kpis}
                                    onChange={() => toggleWidget('kpis')}
                                    className="rounded border-gray-300"
                                /> General KPIs
                            </label>
                            <label className="flex items-center gap-2 text-sm cursor-pointer hover:text-primary">
                                <input
                                    type="checkbox"
                                    checked={visibleWidgets.departments}
                                    onChange={() => toggleWidget('departments')}
                                    className="rounded border-gray-300"
                                /> Departments
                            </label>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* KPI Cards — from PL matrix */}
            {
                visibleWidgets.kpis && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <Card className="bg-white border-l-4 border-l-primary shadow-sm hover:shadow-md transition-shadow">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between space-y-0 pb-2">
                                    <p className="text-sm font-medium text-muted-foreground">Total Billing (YTD)</p>
                                    <Wallet className="h-4 w-4 text-primary" />
                                </div>
                                <div className="flex flex-col mt-2">
                                    <h2 className="text-3xl font-bold">{formatCurrency(plKpis.totalBilling)}</h2>
                                    <p className="text-xs text-muted-foreground mt-1">Gross Revenue</p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-white border-l-4 border-l-red-500 shadow-sm hover:shadow-md transition-shadow">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between space-y-0 pb-2">
                                    <p className="text-sm font-medium text-muted-foreground">Total Expenses (YTD)</p>
                                    <TrendingDown className="h-4 w-4 text-red-500" />
                                </div>
                                <div className="flex flex-col mt-2">
                                    <h2 className="text-3xl font-bold">{formatCurrency(plKpis.totalExpenses)}</h2>
                                    <p className="text-xs text-muted-foreground mt-1">Operational Costs</p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-white border-l-4 border-l-green-500 shadow-sm hover:shadow-md transition-shadow">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between space-y-0 pb-2">
                                    <p className="text-sm font-medium text-muted-foreground">Net Margin (YTD)</p>
                                    <TrendingUp className="h-4 w-4 text-green-500" />
                                </div>
                                <div className="flex flex-col mt-2">
                                    <h2 className={`text-3xl font-bold ${plKpis.netMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {formatCurrency(plKpis.netMargin)}
                                    </h2>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {plKpis.marginPercentage.toFixed(1)}% margin
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                    </div>
                )
            }

            {/* Department Profitability — from PL matrix */}
            {
                visibleWidgets.departments && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-3 duration-700">
                        <div className="flex justify-end gap-2">
                            <Button
                                variant={deptFilter === 'main' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setDeptFilter('main')}
                            >
                                Principales
                            </Button>
                            <Button
                                variant={deptFilter === 'verticals' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setDeptFilter('verticals')}
                            >
                                Verticales
                            </Button>
                            <Button
                                variant={deptFilter === 'all' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setDeptFilter('all')}
                            >
                                Todos
                            </Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {deptPerformance
                                .filter(dept => {
                                    if (deptFilter === 'all') return true;
                                    if (deptFilter === 'main') return MAIN_DEPTS.includes(dept.name);
                                    if (deptFilter === 'verticals') return VERTICAL_DEPTS.includes(dept.name);
                                    return true;
                                })
                                .sort((a, b) => b.income - a.income)
                                .map(dept => (
                                    <Card key={dept.key} className="hover:shadow-md transition-shadow">
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-base font-bold flex justify-between items-center">
                                                {dept.name}
                                                <span className={`text-sm font-normal px-2 py-1 rounded-full ${dept.margin >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                    {dept.marginPct.toFixed(1)}% margen
                                                </span>
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="space-y-4">
                                                {/* Facturación */}
                                                <div className="flex justify-between items-center border-b pb-2">
                                                    <span className="text-sm font-medium text-gray-500">Facturación</span>
                                                    <span className="text-lg font-bold text-gray-900">{formatCurrency(dept.income)}</span>
                                                </div>

                                                {/* Expenses Breakdown */}
                                                <div className="space-y-1 text-sm">
                                                    {dept.categories.map(cat => {
                                                        const val = dept.breakdown[cat.key] || 0;
                                                        return (
                                                            <div key={cat.label} className="flex justify-between text-muted-foreground">
                                                                <span>{cat.label}</span>
                                                                <span>{val > 0 ? formatCurrency(val) : '—'}</span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>

                                                {/* Group % */}
                                                {dept.key !== 'Immoral' && (
                                                    <div className="flex justify-between text-sm text-indigo-600 border-t pt-2">
                                                        <span className="font-medium">Group % <span className="text-indigo-400 font-normal">({dept.groupPctAnnual}%)</span></span>
                                                        <span className="font-medium">{dept.groupCost > 0 ? formatCurrency(dept.groupCost) : '—'}</span>
                                                    </div>
                                                )}

                                                {/* Resultado */}
                                                <div className="pt-2 border-t">
                                                    <div className="flex justify-between items-center">
                                                        <span className="font-bold text-gray-900">Resultado</span>
                                                        <span className={`text-xl font-bold ${dept.margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                            {formatCurrency(dept.margin)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            {deptPerformance.length === 0 && (
                                <Card className="col-span-3 p-6 text-center text-muted-foreground border-dashed">
                                    No department data available.
                                </Card>
                            )}
                        </div>
                    </div>
                )
            }

        </div >
    );
}
