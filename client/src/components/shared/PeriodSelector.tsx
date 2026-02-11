import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { cn } from "@/lib/utils"
import {
    format,
    addMonths,
    subMonths,
    isSameMonth,
    isSameYear
} from "date-fns"
import { es } from "date-fns/locale"

interface PeriodSelectorProps {
    value: Date
    onChange: (date: Date) => void
    disabled?: boolean
    className?: string
}

export function PeriodSelector({
    value,
    onChange,
    disabled,
    className
}: PeriodSelectorProps) {

    const handlePrevious = () => {
        onChange(subMonths(value, 1))
    }

    const handleNext = () => {
        onChange(addMonths(value, 1))
    }

    const handleCurrentMonth = () => {
        onChange(new Date())
    }

    const isCurrentMonth = isSameMonth(value, new Date()) && isSameYear(value, new Date())

    return (
        <div className={cn("flex items-center gap-2", className)}>
            <div className="flex items-center rounded-md border bg-card shadow-sm">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={handlePrevious}
                    disabled={disabled}
                    className="h-9 w-9 rounded-r-none border-r"
                >
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex h-9 min-w-[140px] items-center justify-center px-4 text-sm font-medium">
                    {format(value, "MMMM yyyy", { locale: es }).replace(/^\w/, (c) => c.toUpperCase())}
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleNext}
                    disabled={disabled}
                    className="h-9 w-9 rounded-l-none border-l"
                >
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>

            {!isCurrentMonth && (
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCurrentMonth}
                >
                    Mes Actual
                </Button>
            )}
        </div>
    )
}
