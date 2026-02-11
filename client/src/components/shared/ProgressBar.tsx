import React from 'react';
import { cn } from '@/lib/utils';

interface ProgressBarProps {
    value: number;
    max?: number;
    className?: string;
    showLabel?: boolean;
}

export function ProgressBar({ value, max = 100, className, showLabel = true }: ProgressBarProps) {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

    let colorClass = "bg-green-500";
    if (percentage < 30) colorClass = "bg-red-500";
    else if (percentage < 70) colorClass = "bg-yellow-500";

    return (
        <div className={cn("flex items-center gap-2", className)}>
            <div className="h-2 flex-1 bg-secondary rounded-full overflow-hidden">
                <div
                    className={cn("h-full transition-all duration-500 rounded-full", colorClass)}
                    style={{ width: `${percentage}%` }}
                />
            </div>
            {showLabel && (
                <span className="text-xs font-medium w-9 text-right">{Math.round(percentage)}%</span>
            )}
        </div>
    );
}
