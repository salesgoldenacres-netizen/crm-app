// src/shared/components/renderers/VirtualizationErrorBoundary.tsx
import { Component, ErrorInfo, ReactNode } from "react";
import DataTableRenderer from "./DataTableRenderer";
import { DataTableProps } from "../DataTable";

interface Props<T> extends DataTableProps<T> {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class VirtualizationErrorBoundary<T> extends Component<Props<T>, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[VirtualizationErrorBoundary] fallback active:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { children: _children, ...tableProps } = this.props;
      return <DataTableRenderer {...tableProps} />;
    }

    return this.props.children;
  }
}
