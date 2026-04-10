"use client";

import { create } from "zustand";

export type PortfolioFundVerdict = "CONTINUE" | "WATCH" | "SWITCH" | "STOP";

export type PortfolioFund = {
  name: string;
  invested: number;
  value: number;
  xirr: number;
  verdict: PortfolioFundVerdict;
  reason: string;
};

type PortfolioState = {
  lastAnalysis:
    | {
        totalInvested: number;
        currentValue: number;
        xirr: number;
        funds: PortfolioFund[];
      }
    | null;
  setLastAnalysis: (data: PortfolioState["lastAnalysis"]) => void;
};

export const usePortfolioStore = create<PortfolioState>((set) => ({
  lastAnalysis: null,
  setLastAnalysis: (data) => set({ lastAnalysis: data }),
}));

