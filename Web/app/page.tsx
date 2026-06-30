"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Trash2, RefreshCw, AlertTriangle } from "lucide-react";

import Header from "./components/Header";
import Overview from "./components/Overview";
import TaskTable from "./components/TaskTable";

import { getTasks, getBacklogs, updateTaskStatus, deleteTasks, deleteBacklog } from "./actions/taskActions";

export default function SeabridgeSuite() {
  const [currentTab, setCurrentTab] = useState<"Dashboard" | "Backlog">("Dashboard");
  const [tasks, setTasks] = useState<any[]>([]);
  const [backlogs, setBacklogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [assigneeQuery, setAssigneeQuery] = useState(""); 
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedTaskIds, setSelectedTaskIds] = useState<number[]>([]);

  // --- MODAL STATES ---
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    type: "tasks" | "backlog" | null;
    targetId?: number;
  }>({
    isOpen: false,
    type: null,
  });

  // --- DATA FETCHING ---
  const fetchAllData = async () => {
    setLoading(true);
    const fetchedTasks = await getTasks();
    const fetchedBacklogs = await getBacklogs();
    setTasks(fetchedTasks);
    setBacklogs(fetchedBacklogs);
    setLoading(false);
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // --- TABLE INTERACTION LOGIC ---
  const handleToggleSelectAll = () => {
    if (selectedTaskIds.length === filteredTasks.length) {
      setSelectedTaskIds([]);
    } else {
      setSelectedTaskIds(filteredTasks.map(t => t.id));
    }
  };

  const handleToggleSelectRow = (id: number) => {
    setSelectedTaskIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleChangeStatus = async (id: number, newStatus: string) => {
    const res = await updateTaskStatus(id, newStatus);
    if (res.success) {
      fetchAllData();
    }
  };

  // --- MODAL TRIGGER HANDLERS ---
  const triggerDeleteTasks = () => {
    if (selectedTaskIds.length === 0) return;
    setDeleteModal({ isOpen: true, type: "tasks" });
  };

  const triggerDeleteBacklog = (id: number) => {
    setDeleteModal({ isOpen: true, type: "backlog", targetId: id });
  };

  const closeDeleteModal = () => {
    setDeleteModal({ isOpen: false, type: null });
  };

  // --- CONFIRMED DELETION EXECUTION ---
  const handleConfirmDelete = async () => {
    if (deleteModal.type === "tasks") {
      const res = await deleteTasks(selectedTaskIds);
      if (res.success) {
        setSelectedTaskIds([]);
        fetchAllData();
      }
    } else if (deleteModal.type === "backlog" && deleteModal.targetId !== undefined) {
      const res = await deleteBacklog(deleteModal.targetId);
      if (res.success) {
        fetchAllData();
      }
    }
    closeDeleteModal();
  };

  // --- MEMOIZED FILTERS & STATS ---
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const matchesSearch = task.task_name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "All" || task.status === statusFilter;
      
      const matchesAssignee = assigneeQuery === "" || task.assigned_to.some((user: any) => 
        user.name.toLowerCase().includes(assigneeQuery.toLowerCase())
      );

      return matchesSearch && matchesStatus && matchesAssignee;
    });
  }, [tasks, searchQuery, assigneeQuery, statusFilter]);

  const stats = useMemo(() => {
    return {
      total: tasks.length,
      inProgress: tasks.filter(t => t.status === "In Progress").length,
      done: tasks.filter(t => t.status === "Done").length,
    };
  }, [tasks]);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 antialiased font-sans relative">
      <Header currentTab={currentTab} setCurrentTab={setCurrentTab} />

      <main className="p-8 max-w-7xl mx-auto space-y-6">
        
        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-10 gap-2 text-indigo-400">
            <RefreshCw className="h-5 w-5 animate-spin" />
            <span>Fetching real-time data from Supabase...</span>
          </div>
        )}

        {/* Dashboard Main View */}
        {!loading && currentTab === "Dashboard" ? (
          <>
            <div onClick={fetchAllData}>
              <Overview stats={stats} />
            </div>
            
            <TaskTable
              filteredTasks={filteredTasks}
              selectedTaskIds={selectedTaskIds}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              assigneeQuery={assigneeQuery}       
              setAssigneeQuery={setAssigneeQuery} 
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              handleToggleSelectAll={handleToggleSelectAll}
              handleToggleSelectRow={handleToggleSelectRow}
              handleDeleteSelected={triggerDeleteTasks} 
              handleChangeStatus={handleChangeStatus}
            />
          </>
        ) : !loading && (
          
          /* Central Backlog View */
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-100">🗄️ Central Backlog Items</h2>
                <p className="text-xs text-slate-500 mt-1">All raw ideas and pending tasks collected from Discord bot commands.</p>
              </div>
              <button 
                type="button"
                onClick={fetchAllData} 
                className="p-2 bg-slate-900 border border-slate-800 rounded-lg hover:bg-slate-800 text-slate-300 transition"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
            
            {/* Backlog Item List */}
            <div className="divide-y divide-slate-800 border border-slate-800 rounded-xl overflow-hidden">
              {backlogs.length > 0 ? (
                backlogs.map((item) => (
                  <div key={item.id} className="p-4 bg-slate-900/20 hover:bg-slate-900/40 flex items-center justify-between gap-4 transition">
                    <div className="space-y-1">
                      <p className="text-sm text-slate-200 font-medium">{item.message}</p>
                      <span className="block text-xs font-mono text-slate-500">ID: {item.id} | Saved at {item.created_at}</span>
                    </div>
                    <button 
                      type="button"
                      onClick={() => triggerDeleteBacklog(item.id)} // Changed to open modal
                      className="p-2 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-slate-500">📭 No pending items left in the backlog.</div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* --- CONFIRMATION MODAL POPUP --- */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop Blur Layer */}
          <div 
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
            onClick={closeDeleteModal}
          />
          
          {/* Modal Box */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 relative z-10 shadow-xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 shrink-0">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-slate-100">Confirm Deletion</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  {deleteModal.type === "tasks" 
                    ? `Are you sure you want to permanently delete ${selectedTaskIds.length} selected task(s) from the database? This action cannot be undone.`
                    : "Are you sure you want to permanently delete this item from the central backlog? This action cannot be undone."
                  }
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={closeDeleteModal}
                className="px-4 py-2 rounded-xl text-sm font-medium bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl text-sm font-medium bg-rose-600 hover:bg-rose-500 text-white transition active:scale-95"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}