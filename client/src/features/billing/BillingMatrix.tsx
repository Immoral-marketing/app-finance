import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api/admin';
import { MatrixGrid } from './MatrixGrid';
import { PeriodSelector } from '@/components/shared/PeriodSelector';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Download, RefreshCw, Save } from 'lucide-react';


export default function BillingMatrix() {
    const [date, setDate] = useState(new Date());
    const queryClient = useQueryClient();

    const year = date.getFullYear();
    const month = date.getMonth() + 1;

    // Fetch billing data (MATRIX VIEW)
    const { data: matrixData, isLoading, isError } = useQuery({
        queryKey: ['billing-matrix', year, month],
        queryFn: () => adminApi.getMatrix(year, month),
    });

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Billing Matrix {year}</h1>
                    <p className="text-muted-foreground mt-1">Spreadsheet view for monthly billing management.</p>
                </div>
                <div className="flex items-center gap-4">
                    <Button variant="outline" className="gap-2">
                        <Download size={16} />
                        Export CSV
                    </Button>
                    <Button className="gap-2">
                        <Save size={16} />
                        Save Changes
                    </Button>
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-card p-4 rounded-lg border">
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <PeriodSelector value={date} onChange={setDate} />
                    <div className="h-8 w-px bg-border hidden md:block" />
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">Status:</span>
                        <span className="flex items-center gap-1 text-sm text-green-600 bg-green-50 px-2 py-1 rounded-full">
                            <span className="h-2 w-2 rounded-full bg-green-500" />
                            Open
                        </span>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ['billing-matrix'] })}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh
                    </Button>
                </div>
            </div>

            <Card className="overflow-hidden border-none shadow-none bg-transparent">
                <div className="p-0">
                    {isLoading ? (
                        <div className="p-12 text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                            <p className="text-muted-foreground">Loading matrix data...</p>
                        </div>
                    ) : isError ? (
                        <div className="p-8 text-center text-red-500 bg-red-50 rounded-lg border border-red-100">
                            Error loading billing data. Please check connection.
                        </div>
                    ) : matrixData ? (
                        <MatrixGrid
                            data={matrixData}
                            year={year}
                            month={month}
                        />
                    ) : null}
                </div>
            </Card>
        </div>
    );
}
