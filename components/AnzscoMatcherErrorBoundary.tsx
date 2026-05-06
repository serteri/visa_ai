"use client";

import type { ErrorInfo, ReactNode } from "react";
import { Component } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
};

export class AnzscoMatcherErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
  };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ANZSCO matcher crashed", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Card className="border-rose-200 bg-rose-50">
          <CardHeader>
            <CardTitle className="text-rose-800">AI ANZSCO Duty Matcher Unavailable</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-rose-700">
              Matcher module failed to render. Please refresh the page and try again.
            </p>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}
