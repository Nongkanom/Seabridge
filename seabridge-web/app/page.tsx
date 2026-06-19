"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Trash2, RefreshCw } from "lucide-react";

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
  const [assigneeQuery, setAssigneeQuery] = useState(""); // <-- เพิ่มสเตตัสใหม่ค้นหาคนทำ
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedTaskIds, setSelectedTaskIds] = useState<number[]>([]);

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

  // --- ACTIONS LOGIC ---
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

  const handleDeleteSelected = async () => {
    if (confirm(`Are you sure you want to delete ${selectedTaskIds.length} selected task(s) from the database?`)) {
      const res = await deleteTasks(selectedTaskIds);
      if (res.success) {
        setSelectedTaskIds([]);
        fetchAllData();
      }
    }
  };

  const handleChangeStatus = async (id: number, newStatus: string) => {
    const res = await updateTaskStatus(id, newStatus);
    if (res.success) {
      fetchAllData();
    }
  };

  const handleDeleteBacklog = async (id: number) => {
    if (confirm("Are you sure you want to delete this backlog item?")) {
      const res = await deleteBacklog(id);
      if (res.success) {
        fetchAllData();
      }
    }
  };

  // --- CALCULATIONS (เพิ่ม Logic ค้นหาชื่อคนทำ) ---
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const matchesSearch = task.task_name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "All" || task.status === statusFilter;
      
      // ตรวจสอบว่ามีชื่อสมาชิกคนใดคนหนึ่งในอาเรย์ ตรงกับคำค้นหาไหม
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
    <div className="min-h-screen bg-slate-900 text-slate-100 antialiased font-sans">
      <Header currentTab={currentTab} setCurrentTab={setCurrentTab} />

      <main className="p-8 max-w-7xl mx-auto space-y-6">
        
        {loading && (
          <div className="flex items-center justify-center py-10 gap-2 text-indigo-400">
            <RefreshCw className="h-5 w-5 animate-spin" />
            <span>Fetching real-time data from Supabase...</span>
          </div>
        )}

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
              assigneeQuery={assigneeQuery}       // <-- ส่งไปหน้าบ้าน
              setAssigneeQuery={setAssigneeQuery} // <-- ส่งไปหน้าบ้าน
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              handleToggleSelectAll={handleToggleSelectAll}
              handleToggleSelectRow={handleToggleSelectRow}
              handleDeleteSelected={handleDeleteSelected}
              handleChangeStatus={handleChangeStatus}
            />
          </>
        ) : !loading && (
          /* BACKLOG VIEW */
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-100">🗄️ Central Backlog Items</h2>
                <p className="text-xs text-slate-500 mt-1">All raw ideas and pending tasks collected from Discord bot commands.</p>
              </div>
              <button onClick={fetchAllData} className="p-2 bg-slate-900 border border-slate-800 rounded-lg hover:bg-slate-800 text-slate-300">
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
            
            <div className="divide-y divide-slate-800 border border-slate-800 rounded-xl overflow-hidden">
              {backlogs.length > 0 ? (
                backlogs.map((item) => (
                  <div key={item.id} className="p-4 bg-slate-900/20 hover:bg-slate-900/40 flex items-center justify-between gap-4 transition">
                    <div className="space-y-1">
                      <p className="text-sm text-slate-200 font-medium">{item.message}</p>
                      <span className="block text-xs font-mono text-slate-500">ID: {item.id} | Saved at {item.created_at}</span>
                    </div>
                    <button 
                      onClick={() => handleDeleteBacklog(item.id)}
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
    </div>
  );
}