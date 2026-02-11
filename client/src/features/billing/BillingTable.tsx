import * as React from "react"
import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    useReactTable,
    getSortedRowModel,
    SortingState,
} from "@tanstack/react-table"
import { BillingRecord } from "@/lib/api/admin"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { formatCurrency, formatPercentage } from "@/lib/utils"
import { DEPARTMENTS, DEPARTMENT_COLORS } from "@/lib/constants"
import { ArrowUpDown } from "lucide-react"

interface BillingTableProps {
    data: BillingRecord[]
    onUpdate: (id: string, data: Partial<BillingRecord>) => void
}

export function BillingTable({ data, onUpdate }: BillingTableProps) {
    const [sorting, setSorting] = React.useState<SortingState>([])

    const columns: ColumnDef<BillingRecord>[] = [
        {
            accessorKey: "client_name",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        Client
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
        },
        {
            accessorKey: "total_ad_investment",
            header: "Investment",
            cell: ({ row }) => formatCurrency(row.getValue("total_ad_investment")),
        },
        {
            accessorKey: "fee_paid",
            header: "Fee Paid",
            cell: ({ row, getValue }) => {
                const initialValue = getValue() as number
                const [value, setValue] = React.useState(initialValue)
                const [isEditing, setIsEditing] = React.useState(false)

                const onBlur = () => {
                    setIsEditing(false)
                    if (value !== initialValue) {
                        onUpdate(row.original.id, { fee_paid: Number(value) })
                    }
                }

                if (isEditing) {
                    return (
                        <Input
                            value={value}
                            type="number"
                            onChange={(e) => setValue(Number(e.target.value))}
                            onBlur={onBlur}
                            autoFocus
                            className="w-24 h-8"
                        />
                    )
                }

                return (
                    <div
                        className="cursor-pointer hover:bg-muted/50 p-1 rounded"
                        onDoubleClick={() => setIsEditing(true)}
                    >
                        {formatCurrency(initialValue)}
                    </div>
                )
            },
        },
        // Dynamic columns for departments would go here to match Excel structure
        // For now, we show total per department group 
        {
            accessorKey: "imcontent_total",
            header: "Imcontent",
            cell: ({ row }) => (
                <div className={`p-1 rounded ${DEPARTMENT_COLORS.IMCONT.light} ${DEPARTMENT_COLORS.IMCONT.text}`}>
                    {formatCurrency(row.getValue("imcontent_total"))}
                </div>
            )
        },
        {
            accessorKey: "immoralia_total",
            header: "Immoralia",
            cell: ({ row }) => (
                <div className={`p-1 rounded ${DEPARTMENT_COLORS.IMMOR.light} ${DEPARTMENT_COLORS.IMMOR.text}`}>
                    {formatCurrency(row.getValue("immoralia_total"))}
                </div>
            )
        },
        {
            accessorKey: "grand_total",
            header: "Total Revenue",
            cell: ({ row }) => (
                <span className="font-bold">{formatCurrency(row.getValue("grand_total"))}</span>
            ),
        },
    ]

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        onSortingChange: setSorting,
        getSortedRowModel: getSortedRowModel(),
        state: {
            sorting,
        },
    })

    return (
        <div className="rounded-md border">
            <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b">
                    {table.getHeaderGroups().map((headerGroup) => (
                        <tr key={headerGroup.id}>
                            {headerGroup.headers.map((header) => {
                                return (
                                    <th key={header.id} className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">
                                        {header.isPlaceholder
                                            ? null
                                            : flexRender(
                                                header.column.columnDef.header,
                                                header.getContext()
                                            )}
                                    </th>
                                )
                            })}
                        </tr>
                    ))}
                </thead>
                <tbody>
                    {table.getRowModel().rows?.length ? (
                        table.getRowModel().rows.map((row) => (
                            <tr
                                key={row.id}
                                data-state={row.getIsSelected() && "selected"}
                                className="border-b transition-colors hover:bg-muted/50"
                            >
                                {row.getVisibleCells().map((cell) => (
                                    <td key={cell.id} className="p-4 align-middle">
                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                    </td>
                                ))}
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan={columns.length} className="h-24 text-center">
                                No results.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    )
}
