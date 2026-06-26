// app/actions/taskActions.ts
"use server";

import { pool } from "../data/db";
import { revalidatePath } from "next/cache";

// ฟังก์ชันพิเศษ: วิ่งไปเคาะประตูถาม Discord API ว่า ID นี้ชื่ออะไร รูปไหน
async function fetchDiscordUser(userId: string) {
  const token = process.env.DISCORD_TOKEN; // ดึงโทเค็นบอทมาใช้สิทธิ์ดึงข้อมูล
  if (!token) {
    return { name: userId, avatar: "https://cdn.discordapp.com/embed/avatars/0.png" };
  }

  try {
    const res = await fetch(`https://discord.com/api/v10/users/${userId}`, {
      headers: { Authorization: `Bot ${token}` },
      next: { revalidate: 3600 } // ให้จำข้อมูลไว้ 1 ชั่วโมง จะได้ไม่ต้องยิงบ่อยจนโดน Discord บล็อก (Rate limit)
    });

    if (!res.ok) throw new Error("Fetch failed");
    
    const data = await res.json();
    
    // คำนวณหาลิงก์รูปภาพโปรไฟล์จริง
    const avatarUrl = data.avatar 
      ? `https://cdn.discordapp.com/avatars/${data.id}/${data.avatar}.png`
      : `https://cdn.discordapp.com/embed/avatars/${parseInt(data.discriminator) % 5}.png`;

    return {
      name: data.global_name || data.username, // ใช้ชื่อเล่นในดิสคอร์ด ถ้าไม่มีให้ใช้ Username
      avatar: avatarUrl
    };
  } catch (error) {
    // ถ้าดึงไม่สำเร็จ (เช่น ไอดีผิด หรือเน็ตหลุด) ให้ส่งค่าเริ่มต้นกลับไป
    return { name: `User (${userId})`, avatar: "https://cdn.discordapp.com/embed/avatars/0.png" };
  }
}

// ดึงข้อมูล Tasks ทั้งหมด
export async function getTasks() {
  const client = await pool.connect();
  try {
    const res = await client.query("SELECT * FROM tasks ORDER BY id DESC");
    
    // แกะและแปลงข้อมูลทีละแถว
    const formattedTasks = await Promise.all(res.rows.map(async (row) => {
      let rawAssignees: string[] = [];

      // 🔍 ดักจับ: ตัวบอทของคุณบันทึกข้อมูลมาแบบไหน? 
      if (row.assigned_to.includes("<@")) {
        // กรณีบันทึกมาเป็นข้อความเมนชั่นดื้อๆ เช่น <@123456>, <@78910>
        const matches = row.assigned_to.match(/\d+/g);
        if (matches) rawAssignees = matches;
      } else {
        // กรณีบันทึกมาเป็นไอดีคั่นด้วยจุลภาคปกติ เช่น 123456, 78910
        rawAssignees = row.assigned_to.split(",").map((s: string) => s.trim()).filter(Boolean);
      }

      // นำไอดีทั้งหมดไปวิ่งหาชื่อและรูปโปรไฟล์จริงจาก Discord API พร้อมกัน
      const assignees = await Promise.all(
        rawAssignees.map(id => fetchDiscordUser(id))
      );

      // หากในฐานข้อมูลไม่มีไอดีใครอยู่เลย ให้ใส่ค่าว่างไว้
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

// --- ฟังก์ชันอื่นๆ คงเดิมไว้ด้านล่าง ---
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