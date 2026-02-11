import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="p-8 border rounded-lg bg-red-50 text-red-900 mx-auto max-w-2xl my-8">
                    <div className="flex items-center gap-3 mb-4">
                        <AlertCircle className="h-8 w-8 text-red-600" />
                        <h2 className="text-xl font-bold">Algo salió mal en este componente</h2>
                    </div>
                    <div className="bg-white p-4 rounded border border-red-200 overflow-auto text-sm font-mono mb-4">
                        {this.state.error?.toString()}
                        <br />
                        <br />
                        {this.state.error?.stack}
                    </div>
                    <Button
                        onClick={() => this.setState({ hasError: false, error: null })}
                        variant="outline"
                    >
                        Intentar de nuevo
                    </Button>
                </div>
            );
        }

        return this.props.children;
    }
}
