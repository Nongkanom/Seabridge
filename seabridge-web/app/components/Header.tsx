import React from "react";
import { LayoutDashboard, Database } from "lucide-react";

interface HeaderProps {
  currentTab: "Dashboard" | "Backlog";
  setCurrentTab: (tab: "Dashboard" | "Backlog") => void;
}

export default function Header({ currentTab, setCurrentTab }: HeaderProps) {
  return (
    <header className="border-b border-slate-800 bg-slate-950 px-6 py-4 flex items-center justify-between shadow-md">
      <div className="flex items-center space-x-3">
        <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/20">
          S
        </div>
        <span className="text-xl font-bold tracking-wider bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
          SEABRIDGE 
        </span>
      </div>
      
      <nav className="flex space-x-2 bg-slate-900 p-1 rounded-xl border border-slate-800">
        <button
          onClick={() => setCurrentTab("Dashboard")}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
            currentTab === "Dashboard"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
          }`}
        >
          <LayoutDashboard className="h-4 w-4" />
          <span>Dashboard</span>
        </button>
        <button
          onClick={() => setCurrentTab("Backlog")}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
            currentTab === "Backlog"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
          }`}
        >
          <Database className="h-4 w-4" />
          <span>Backlog</span>
        </button>
      </nav>
    </header>
  );
}