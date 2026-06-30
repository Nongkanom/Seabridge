"use server";

import { pool } from "../data/db";
import { revalidatePath } from "next/cache";

async function fetchDiscordUser(userId: string) {
  const token = process.env.DISCORD_TOKEN; 
  if (!token) {
    return { name: userId, avatar: "https://cdn.discordapp.com/embed/avatars/0.png" };
  }

  try {
    const res = await fetch(`https://discord.com/api/v10/users/${userId}`, {
      headers: { Authorization: `Bot ${token}` },
      next: { revalidate: 3600 } 
    });

    if (!res.ok) throw new Error("Fetch failed");
    
    const data = await res.json();
    
    const avatarUrl = data.avatar 
      ? `https://cdn.discordapp.com/avatars/${data.id}/${data.avatar}.png`
      : `https://cdn.discordapp.com/embed/avatars/${parseInt(data.discriminator) % 5}.png`;

    return {
      name: data.global_name || data.username, 
      avatar: avatarUrl
    };
  } catch (error) {
    return { name: `User (${userId})`, avatar: "https://cdn.discordapp.com/embed/avatars/0.png" };
  }
}

export async function getTasks() {
  const client = await pool.connect();
  try {
    const res = await client.query("SELECT * FROM tasks ORDER BY id DESC");
    
    const formattedTasks = await Promise.all(res.rows.map(async (row) => {
      let rawAssignees: string[] = [];

      if (row.assigned_to.includes("<@")) {
        const matches = row.assigned_to.match(/\d+/g);
        if (matches) rawAssignees = matches;
      } else {
        rawAssignees = row.assigned_to.split(",").map((s: string) => s.trim()).filter(Boolean);
      }

      const assignees = await Promise.all(
        rawAssignees.map(id => fetchDiscordUser(id))
      );

      const finalAssignees = assignees.length > 0 ? assignees : [{ name: row.assigned_to, avatar: "https://cdn.discordapp.com/embed/avatars/0.png" }];

      return {
        id: row.id,
        task_name: row.task_name,
        assigned_to: finalAssignees,
        due_date: row.due_date,
        status: row.status,
      };
    }));

    return formattedTasks;
  } catch (error) {
    console.error("❌ ดึงข้อมูลล้มれない:", error);
    return [];
  } finally {
    client.release();
  }
}

export async function getBacklogs() {
  const client = await pool.connect();
  try {
    const res = await client.query("SELECT * FROM backlogs ORDER BY id DESC");
    return res.rows;
  } catch (error) {
    return [];
  } finally { client.release(); }
}

export async function updateTaskStatus(id: number, newStatus: string) {
  const client = await pool.connect();
  try {
    await client.query("UPDATE tasks SET status = $1 WHERE id = $2", [newStatus, id]);
    revalidatePath("/");
    return { success: true };
  } catch (error) { return { success: false }; } finally { client.release(); }
}

export async function deleteTasks(ids: number[]) {
  const client = await pool.connect();
  try {
    await client.query("DELETE FROM tasks WHERE id = ANY($1)", [ids]);
    revalidatePath("/");
    return { success: true };
  } catch (error) { return { success: false }; } finally { client.release(); }
}

export async function deleteBacklog(id: number) {
  const client = await pool.connect();
  try {
    await client.query("DELETE FROM backlogs WHERE id = $1", [id]);
    revalidatePath("/");
    return { success: true };
  } catch (error) { return { success: false }; } finally { client.release(); }
}