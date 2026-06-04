import discord
from discord import app_commands
from datetime import datetime
import calendar
import re
import os
from dotenv import load_dotenv

# เครื่องมือสำหรับคุม PostgreSQL แบบ Async ระดับสากล
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy.orm import declarative_base, Mapped, mapped_column
from sqlalchemy import String, Integer, Text, select, update

# โหลดค่าคอนฟิกจากไฟล์ .env
load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise ValueError("❌ ไม่พบ DATABASE_URL ในไฟล์ .env กรุณาตรวจสอบสิทธิ์การตั้งค่า")

# ----------------------------------------------------
#  DATABASE SETUP (SQLAlchemy ORM Model)
# ----------------------------------------------------
Base = declarative_base()

class Task(Base):
    __tablename__ = "tasks"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(Text)
    assigned_to: Mapped[str] = mapped_column(Text)
    task_name: Mapped[str] = mapped_column(Text)
    due_date: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(50))

class Backlog(Base):
    __tablename__ = "backlogs"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    message: Mapped[str] = mapped_column(Text)
    created_at: Mapped[str] = mapped_column(Text)

# สร้าง Engine เชื่อมต่อไปยังคลาวด์ Supabase
engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = async_sessionmaker(bind=engine, expire_on_commit=False)


# ====================================================
#  SECTION: Interactive Buttons for Task Status
# ====================================================
class TaskStatusView(discord.ui.View):
    def __init__(self, task_id: int):
        super().__init__(timeout=None)  # คุมปุ่มให้ทำงานข้ามวันข้ามคืนได้บน VPS
        self.task_id = task_id

    @discord.ui.button(label="📌 To Do", style=discord.ButtonStyle.secondary, custom_id="btn_todo")
    async def to_do(self, interaction: discord.Interaction, button: discord.ui.Button):
        await self.update_status(interaction, "To Do")

    @discord.ui.button(label="⏳ In Progress", style=discord.ButtonStyle.blurple, custom_id="btn_progress")
    async def in_progress(self, interaction: discord.Interaction, button: discord.ui.Button):
        await self.update_status(interaction, "In Progress")

    @discord.ui.button(label="✅ Done", style=discord.ButtonStyle.success, custom_id="btn_done")
    async def done(self, interaction: discord.Interaction, button: discord.ui.Button):
        await self.update_status(interaction, "Done")

    async def update_status(self, interaction: discord.Interaction, new_status: str):
        # ทำการอัปเดตสถานะงานใน Supabase แบบ Async
        async with AsyncSessionLocal() as session:
            async with session.begin():
                stmt = update(Task).where(Task.id == self.task_id).values(status=new_status)
                await session.execute(stmt)

        embed = interaction.message.embeds[0]
        status_updated = False
        for i, field in enumerate(embed.fields):
            if field.name == "📊 Current Status":
                embed.set_field_at(i, name="📊 Current Status", value=f"`{new_status}`", inline=False)
                status_updated = True
                break
        
        if not status_updated:
            embed.add_field(name="📊 Current Status", value=f"`{new_status}`", inline=False)

        await interaction.response.edit_message(embed=embed, view=self)
        await interaction.followup.send(f"🔄 Task ID {self.task_id} updated to `{new_status}`", ephemeral=True)


# ====================================================
#  SECTION: Discord Interactive Calendar (Dropdown Version)
# ====================================================
class CalendarDropdownView(discord.ui.View):
    def __init__(self, members: str, task: str, year: int = None, month: int = None):
        super().__init__(timeout=180)
        self.members = members
        self.task = task
        self.current_year = year if year else datetime.utcnow().year
        self.current_month = month if month else datetime.utcnow().month
        self.build_calendar()

    def build_calendar(self):
        self.clear_items()
        
        month_name = calendar.month_name[self.current_month]
        self.add_item(discord.ui.Button(label=f"📅 {month_name} {self.current_year}", style=discord.ButtonStyle.secondary, disabled=True, row=0))
        
        prev_btn = discord.ui.Button(label="◀️ Prev Month", style=discord.ButtonStyle.primary, row=0)
        prev_btn.callback = self.prev_month
        self.add_item(prev_btn)
        
        next_btn = discord.ui.Button(label="Next Month ▶️", style=discord.ButtonStyle.primary, row=0)
        next_btn.callback = self.next_month
        self.add_item(next_btn)

        _, num_days = calendar.monthrange(self.current_year, self.current_month)
        
        options = []
        for day in range(1, num_days + 1):
            date_str = f"{day:02d}/{self.current_month:02d}/{self.current_year}"
            weekday_num = calendar.weekday(self.current_year, self.current_month, day)
            days_abbr = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
            
            options.append(discord.SelectOption(
                label=f"Day {day} ({days_abbr[weekday_num]})",
                value=date_str,
                description=f"Due Date: {date_str}"
            ))

        if len(options) <= 25:
            select = discord.ui.Select(placeholder="👇 Select a due date...", options=options, row=1)
            select.callback = self.select_date_callback
            self.add_item(select)
        else:
            select1 = discord.ui.Select(placeholder="📅 Days 1 - 15 ...", options=options[:15], row=1)
            select1.callback = self.select_date_callback
            self.add_item(select1)
            
            select2 = discord.ui.Select(placeholder="📅 Days 16+ ...", options=options[15:], row=2)
            select2.callback = self.select_date_callback
            self.add_item(select2)

    async def select_date_callback(self, interaction: discord.Interaction):
        selected_date = interaction.data['values'][0]
        
        user_ids = re.findall(r'<@!?(\d+)>', self.members)
        user_ids_str = ",".join(user_ids)
        mentions_str = " ".join([f"<@{uid}>" for uid in user_ids])

        # บันทึกลงฐานข้อมูล Supabase ก้อนกลาง
        async with AsyncSessionLocal() as session:
            async with session.begin():
                new_task = Task(
                    user_id=user_ids_str,
                    assigned_to=self.members,
                    task_name=self.task,
                    due_date=selected_date,
                    status="To Do"
                )
                session.add(new_task)
            await session.refresh(new_task)
            task_id = new_task.id

        embed = discord.Embed(title=f"📋 New Task Assigned! (ID: {task_id})", color=discord.Color.green())
        embed.add_field(name="👤 Assignees", value=mentions_str, inline=False)
        embed.add_field(name="📝 Task Description", value=self.task, inline=False)
        embed.add_field(name="📅 Due Date", value=f"`{selected_date}`", inline=False)
        embed.add_field(name="📊 Current Status", value="`To Do`", inline=False)
        
        await interaction.response.edit_message(content="✅ Task assigned and due date selected successfully!", embed=embed, view=TaskStatusView(task_id))

    async def prev_month(self, interaction: discord.Interaction):
        self.current_month -= 1
        if self.current_month < 1:
            self.current_month = 12
            self.current_year -= 1
        self.build_calendar()
        await interaction.response.edit_message(view=self)

    async def next_month(self, interaction: discord.Interaction):
        self.current_month += 1
        if self.current_month > 12:
            self.current_month = 1
            self.current_year += 1
        self.build_calendar()
        await interaction.response.edit_message(view=self)


# ====================================================
#  SECTION: Main Bot Structure & Initialization
# ====================================================
class MyBot(discord.Client):
    def __init__(self):
        super().__init__(intents=discord.Intents.default())
        self.tree = app_commands.CommandTree(self)

    async def on_ready(self):
        print(f'Logged in as {self.user}')
        
        # สั่งเช็คและสร้างโครงสร้างตารางบนตึกระฟ้าของ Supabase โดยอัตโนมัติหากยังไม่มี
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        
        await self.tree.sync()
        print("🌍 Global Slash Commands synced successfully!")

bot = MyBot()


def get_mentions_string(user_ids_str: str, raw_assigned_to: str) -> str:
    if user_ids_str:
        mentions_list = [f"<@{uid.strip()}>" for uid in user_ids_str.split(",") if uid.strip()]
        return " ".join(mentions_list)
    return raw_assigned_to


# ====================================================
#  SECTION: Slash Commands
# ====================================================

# 1. Assign a Task (/assign)
@bot.tree.command(name="assign", description="Assign a task to multiple members and select a date from a dropdown menu")
async def assign(interaction: discord.Interaction, members: str, task: str):
    user_ids = re.findall(r'<@!?(\d+)>', members)
    if not user_ids:
        await interaction.response.send_message("❌ No member mentions found! Please tag at least one member (e.g. `@user1`)", ephemeral=True)
        return

    await interaction.response.send_message(
        content="📅 **Please select a due date for this task:**", 
        view=CalendarDropdownView(members=members, task=task), 
        ephemeral=False
    )


# 2. View Tasks by Status (/task_show)
@bot.tree.command(name="task_show", description="View all tasks filtered by a specific status")
@app_commands.choices(status=[
    app_commands.Choice(name="📌 To Do", value="To Do"),
    app_commands.Choice(name="⏳ In Progress", value="In Progress"),
    app_commands.Choice(name="✅ Done", value="Done")
])
async def task_show(interaction: discord.Interaction, status: app_commands.Choice[str]):
    selected_status = status.value

    async with AsyncSessionLocal() as session:
        result = await session.execute(select(Task).where(Task.status == selected_status))
        tasks = result.scalars().all()

    if not tasks:
        await interaction.response.send_message(f"📭 No tasks found with status `{selected_status}`.")
        return

    embed = discord.Embed(
        title=f"📋 Tasks with Status: {selected_status}", 
        color=discord.Color.gold() if selected_status == "In Progress" else (discord.Color.green() if selected_status == "Done" else discord.Color.light_gray())
    )

    for task in tasks:
        user_mention = get_mentions_string(task.user_id, task.assigned_to)
        embed.add_field(
            name=f"🆔 ID: {task.id} | 📌 {task.task_name}",
            value=f"👤 **Assignees:** {user_mention}\n📅 **Due Date:** `{task.due_date}`\n" + "─"*30,
            inline=False
        )

    await interaction.response.send_message(embed=embed)


# 3. View Personal Tasks (/my_tasks)
@bot.tree.command(name="my_tasks", description="View and manage your assigned tasks (Only you can see this)")
async def my_tasks(interaction: discord.Interaction):
    user_id = str(interaction.user.id)

    async with AsyncSessionLocal() as session:
        # ใช้ .contains() ของ SQLAlchemy แทนคำสั่ง LIKE เปอร์เซ็นต์เดิม
        result = await session.execute(
            select(Task).where(Task.user_id.contains(user_id), Task.status != 'Done')
        )
        tasks = result.scalars().all()

    if not tasks:
        await interaction.response.send_message("🎉 Congratulations! You have no pending tasks.", ephemeral=True)
        return

    await interaction.response.send_message(f"🔍 Fetching pending tasks for <@{user_id}>...", ephemeral=True)

    for task in tasks:
        user_mention = get_mentions_string(task.user_id, task.assigned_to)

        embed = discord.Embed(title=f"📋 Your Task (ID: {task.id})", color=discord.Color.blue())
        embed.add_field(name="👤 Assignees", value=user_mention, inline=False)
        embed.add_field(name="📝 Description", value=task.task_name, inline=False)
        embed.add_field(name="📅 Due Date", value=f"`{task.due_date}`", inline=False)
        embed.add_field(name="📊 Current Status", value=f"`{task.status}`", inline=False)

        await interaction.followup.send(embed=embed, view=TaskStatusView(task.id), ephemeral=True)


# 4. View Tasks of Any Specific User (/task_user)
@bot.tree.command(name="task_user", description="View all pending tasks assigned to a specific team member")
async def task_user(interaction: discord.Interaction, member: discord.Member):
    target_user_id = str(member.id)

    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(Task).where(Task.user_id.contains(target_user_id), Task.status != 'Done')
        )
        tasks = result.scalars().all()

    if not tasks:
        await interaction.response.send_message(f"🎉 **{member.display_name}** has no pending tasks!", ephemeral=False)
        return

    embed = discord.Embed(title=f"📋 Pending Tasks for {member.display_name}", color=discord.Color.teal())

    for task in tasks:
        all_assignees = get_mentions_string(task.user_id, task.assigned_to)
        embed.add_field(
            name=f"🆔 ID: {task.id} | 📌 {task.task_name}",
            value=f"👤 **Assignees:** {all_assignees}\n📅 **Due Date:** `{task.due_date}`\n📊 **Status:** `{task.status}`\n" + "─"*30,
            inline=False
        )

    await interaction.response.send_message(embed=embed)


# 5. Add to Backlog (/backlog_add)
@bot.tree.command(name="backlog_add", description="Add an idea or item to the backlog")
async def backlog_add(interaction: discord.Interaction, message: str):
    now = datetime.utcnow().strftime("%d/%m/%Y %H:%M")
    
    async with AsyncSessionLocal() as session:
        async with session.begin():
            new_backlog = Backlog(message=message, created_at=now)
            session.add(new_backlog)

    await interaction.response.send_message(f"📥 Successfully saved to Backlog: `{message}`")


# 6. View Backlog (/backlog_show)
@bot.tree.command(name="backlog_show", description="Display all items currently in the backlog")
async def backlog_show(interaction: discord.Interaction):
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(Backlog))
        rows = result.scalars().all()

    if not rows:
        await interaction.response.send_message("📭 The backlog is currently empty.")
        return

    embed = discord.Embed(title="🗄️ Backlog Items", color=discord.Color.blue())
    for item in rows:
        embed.add_field(name=f"ID: {item.id} ({item.created_at})", value=item.message, inline=False)
    
    await interaction.response.send_message(embed=embed)


# ====================================================
# 🔥 รันระบบดึงความปลอดภัยจากตัวแปรแวดล้อม (Environment Variable)
# ====================================================
BOT_TOKEN = os.getenv("DISCORD_TOKEN")
if not BOT_TOKEN:
    raise ValueError("❌ ไม่พบ DISCORD_TOKEN ในไฟล์ .env")

bot.run(BOT_TOKEN)