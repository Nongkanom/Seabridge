"use client";

import React from "react";
import { Search, Trash2, Filter, ChevronDown, User } from "lucide-react";

interface DiscordUser {
  name: string;
  avatar: string;
}

interface TaskItem {
  id: number;
  task_name: string;
  assigned_to: DiscordUser[];
  due_date: string;
  status: string;
}

interface TaskTableProps {
  filteredTasks: TaskItem[];
  selectedTaskIds: number[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  assigneeQuery: string;               // <-- เพิ่มเข้ามาใหม่
  setAssigneeQuery: (query: string) => void; // <-- เพิ่มเข้ามาใหม่
  statusFilter: string;
  setStatusFilter: (filter: string) => void;
  handleToggleSelectAll: () => void;
  handleToggleSelectRow: (id: number) => void;
  handleDeleteSelected: () => void;
  handleChangeStatus: (id: number, status: string) => void;
}

export default function TaskTable({
  filteredTasks,
  selectedTaskIds,
  searchQuery,
  setSearchQuery,
  assigneeQuery,     // <-- นำมาใช้
  setAssigneeQuery, // <-- นำมาใช้
  statusFilter,
  setStatusFilter,
  handleToggleSelectAll,
  handleToggleSelectRow,
  handleDeleteSelected,
  handleChangeStatus,
}: TaskTableProps) {
  return (
    <div className="space-y-4">
      {/* SEARCH / FILTER / ACTION CONTROLS */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-col xl:flex-row gap-4 items-center justify-between shadow-sm">
        
        {/* ช่องค้นหาฝั่งซ้าย (ชื่อ Task และ ชื่อคนทำ) */}
        <div className="flex flex-col md:flex-row gap-4 w-full xl:w-auto flex-1">
          {/* 1. ค้นหาชื่อ Task */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search task name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none transition-all placeholder:text-slate-500"
            />
          </div>

          {/* 2. ช่องค้นหาชื่อคนทำ (Assigned To) เพิ่มใหม่ */}
          <div className="relative w-full md:w-64">
            <User className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search assignee..."
              value={assigneeQuery}
              onChange={(e) => setAssigneeQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none transition-all placeholder:text-slate-500"
            />
          </div>
        </div>

        {/* ปุ่ม Action และ Filter ฝั่งขวา */}
        <div className="flex items-center justify-end w-full xl:w-auto gap-3">
          <button
            disabled={selectedTaskIds.length === 0}
            onClick={handleDeleteSelected}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition duration-200 ${
              selectedTaskIds.length > 0
                ? "bg-rose-600/20 border border-rose-500 text-rose-400 hover:bg-rose-600/30 active:scale-95 cursor-pointer"
                : "bg-slate-900/50 border border-slate-800 text-slate-600 cursor-not-allowed"
            }`}
          >
            <Trash2 className="h-4 w-4" />
            <span>Delete ({selectedTaskIds.length})</span>
          </button>

          <div className="relative flex items-center bg-slate-900 border border-slate-800 rounded-xl px-3 py-1">
            <Filter className="h-4 w-4 text-slate-500 mr-2" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent border-none text-sm outline-none pr-6 py-1.5 cursor-pointer text-slate-300 appearance-none font-medium"
            >
              <option value="All" className="bg-slate-950">Status: All</option>
              <option value="To Do" className="bg-slate-950">Status: To Do</option>
              <option value="In Progress" className="bg-slate-950">Status: In Progress</option>
              <option value="Done" className="bg-slate-950">Status: Done</option>
            </select>
            <ChevronDown className="h-4 w-4 text-slate-500 absolute right-3 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* TABLE SECTION */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/50 border-b border-slate-800 text-slate-400 font-semibold text-xs tracking-wider uppercase">
                <th className="p-4 w-12 text-center">
                  <input
                    type="checkbox"
                    checked={filteredTasks.length > 0 && selectedTaskIds.length === filteredTasks.length}
                    onChange={handleToggleSelectAll}
                    className="rounded border-slate-700 text-indigo-600 bg-slate-900 focus:ring-0 focus:ring-offset-0 cursor-pointer h-4 w-4"
                  />
                </th>
                <th className="p-4 w-16 text-center">ID</th>
                <th className="p-4">Task Name</th>
                <th className="p-4">Assigned To</th>
                <th className="p-4">Due Date</th>
                <th className="p-4 w-48">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-sm">
              {filteredTasks.length > 0 ? (
                filteredTasks.map((task) => (
                  <tr 
                    key={task.id} 
                    className={`hover:bg-slate-900/30 transition-colors ${
                      selectedTaskIds.includes(task.id) ? "bg-indigo-600/5 hover:bg-indigo-600/10" : ""
                    }`}
                  >
                    <td className="p-4 text-center">
                      <input
                        type="checkbox"
                        checked={selectedTaskIds.includes(task.id)}
                        onChange={() => handleToggleSelectRow(task.id)}
                        className="rounded border-slate-700 text-indigo-600 bg-slate-900 focus:ring-0 focus:ring-offset-0 cursor-pointer h-4 w-4"
                      />
                    </td>
                    <td className="p-4 text-center font-mono text-slate-500">#{task.id}</td>
                    <td className="p-4 font-medium text-slate-200">{task.task_name}</td>
                    <td className="p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        {task.assigned_to.map((user, idx) => (
                          <div key={idx} className="inline-flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-full pl-1 pr-2.5 py-0.5 text-xs text-slate-300">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img 
                              src={user.avatar} 
                              alt={user.name} 
                              className="h-5 w-5 rounded-full object-cover border border-slate-700" 
                            />
                            <span>{user.name}</span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="p-4 text-slate-400 font-mono text-xs">{task.due_date}</td>
                    <td className="p-4">
                      <div className="relative inline-flex items-center w-full">
                        <select
                          value={task.status}
                          onChange={(e) => handleChangeStatus(task.id, e.target.value)}
                          className={`w-full appearance-none pl-3 pr-8 py-1.5 rounded-xl text-xs font-semibold cursor-pointer border outline-none transition-all ${
                            task.status === "Done"
                              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                              : task.status === "In Progress"
                              ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                              : "bg-slate-800 border-slate-700 text-slate-300"
                          }`}
                        >
                          <option value="To Do" className="bg-slate-950 text-slate-300">📌 To Do</option>
                          <option value="In Progress" className="bg-slate-950 text-slate-300">⏳ In Progress</option>
                          <option value="Done" className="bg-slate-950 text-slate-300">✅ Done</option>
                        </select>
                        <ChevronDown className="h-3 w-3 absolute right-2.5 pointer-events-none opacity-70" />
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500 font-medium">
                    📭 No tasks found matching your search criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}