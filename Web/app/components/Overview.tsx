"use client";

import { RefreshCw, AlertCircle, Clock, CheckCircle } from "lucide-react";

interface OverviewProps {
  stats: { total: number; inProgress: number; done: number };
}

export default function Overview({ stats }: OverviewProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between bg-slate-950 border border-slate-800 rounded-2xl p-6 shadow-sm gap-4">
      <div>
        <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          Task Management Overview
        </h2>
        <div className="flex flex-wrap items-center gap-4 mt-3 text-sm">
          <span className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg text-slate-300">
            <AlertCircle className="h-4 w-4 text-indigo-400" />
            Total Tasks: <strong className="text-indigo-400 text-base">{stats.total}</strong>
          </span>
          <span className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg text-slate-300">
            <Clock className="h-4 w-4 text-amber-400 animate-pulse" />
            In Progress: <strong className="text-amber-400 text-base">{stats.inProgress}</strong>
          </span>
          <span className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg text-slate-300">
            <CheckCircle className="h-4 w-4 text-emerald-400" />
            Completed: <strong className="text-emerald-400 text-base">{stats.done}</strong>
          </span>
        </div>
      </div>
      <button className="flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 px-4 py-2.5 rounded-xl text-sm font-medium transition duration-200 text-slate-300 active:scale-95">
        <RefreshCw className="h-4 w-4" />
        <span>Refresh Data</span>
      </button>
    </div>
  );
}