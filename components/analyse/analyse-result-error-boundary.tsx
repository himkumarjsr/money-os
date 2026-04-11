"use client";

import Link from "next/link";
import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { error: Error | null };

export class AnalyseResultErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[AnalyseResultErrorBoundary]", error.message, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-10 text-center">
          <h2 className="text-lg font-semibold text-slate-900">Something went wrong</h2>
          <p className="mt-2 text-sm text-red-700">{this.state.error.message}</p>
          <Link
            href="/analyse"
            className="mt-6 inline-block rounded-xl bg-[#534AB7] px-5 py-2.5 text-sm font-semibold text-white no-underline"
          >
            Start again
          </Link>
        </div>
      );
    }
    return this.props.children;
  }
}
