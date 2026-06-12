import discord
from discord import app_commands
import re
from datetime import datetime, timedelta, timezone
from sqlalchemy import select
from database import AsyncSessionLocal, Task, Backlog
from views import CalendarDropdownView, TaskStatusView

def get_mentions_string(user_ids_str: str, raw_assigned_to: str) -> str:
    if user_ids_str:
        mentions_list = [f"<@{uid.strip()}>" for uid in user_ids_str.split(",") if uid.strip()]
        return " ".join(mentions_list)
    return raw_assigned_to

def setup_commands(tree: app_commands.CommandTree):

    # 1. /assign
    @tree.command(name="assign", description="Assign a task to multiple members and select a date")
    async def assign(interaction: discord.Interaction, members: str, task: str):
        user_ids = re.findall(r'<@!?(\d+)>', members)
        if not user_ids:
            await interaction.response.send_message("❌ No member mentions found!", ephemeral=True)
            return
        await interaction.response.send_message(
            content="📅 **Please select a due date for this task:**", 
            view=CalendarDropdownView(members=members, task=task), 
            ephemeral=False
        )

    # 2. /task_show
    @tree.command(name="task_show", description="View all tasks filtered by a specific status")
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

        embed = discord.Embed(title=f"📋 Tasks with Status: {selected_status}", color=discord.Color.blue())
        for task in tasks:
            user_mention = get_mentions_string(task.user_id, task.assigned_to)
            embed.add_field(
                name=f"🆔 ID: {task.id} | 📌 {task.task_name}",
                value=f"👤 **Assignees:** {user_mention}\n📅 **Due Date:** `{task.due_date}`\n" + "─"*30,
                inline=False
            )
        await interaction.response.send_message(embed=embed)

    # 3. /my_tasks
    @tree.command(name="my_tasks", description="View and manage your assigned tasks")
    async def my_tasks(interaction: discord.Interaction):
        user_id = str(interaction.user.id)
        async with AsyncSessionLocal() as session:
            result = await session.execute(select(Task).where(Task.user_id.contains(user_id), Task.status != 'Done'))
            tasks = result.scalars().all()

        if not tasks:
            await interaction.response.send_message("🎉 You have no pending tasks.", ephemeral=True)
            return

        await interaction.response.send_message(f"🔍 Fetching tasks...", ephemeral=True)
        for task in tasks:
            user_mention = get_mentions_string(task.user_id, task.assigned_to)
            embed = discord.Embed(title=f"📋 Your Task (ID: {task.id})", color=discord.Color.blue())
            embed.add_field(name="👤 Assignees", value=user_mention, inline=False)
            embed.add_field(name="📝 Description", value=task.task_name, inline=False)
            embed.add_field(name="📅 Due Date", value=f"`{task.due_date}`", inline=False)
            embed.add_field(name="📊 Current Status", value=f"`{task.status}`", inline=False)
            await interaction.followup.send(embed=embed, view=TaskStatusView(task.id), ephemeral=True)

    # 4. /task_user
    @tree.command(name="task_user", description="View all pending tasks assigned to a specific member")
    async def task_user(interaction: discord.Interaction, member: discord.Member):
        target_user_id = str(member.id)
        async with AsyncSessionLocal() as session:
            result = await session.execute(select(Task).where(Task.user_id.contains(target_user_id), Task.status != 'Done'))
            tasks = result.scalars().all()

        if not tasks:
            await interaction.response.send_message(f"🎉 **{member.display_name}** has no pending tasks!")
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

    # 5. /backlog_add
    @tree.command(name="backlog_add", description="Add an item to the backlog")
    async def backlog_add(interaction: discord.Interaction, message: str):
        tz_bkk = timezone(timedelta(hours=7))
        now_bkk = datetime.now(tz_bkk).strftime("%d/%m/%Y %H:%M")
        async with AsyncSessionLocal() as session:
            async with session.begin():
                session.add(Backlog(message=message, created_at=now_bkk))
        await interaction.response.send_message(f"📥 Saved to Backlog: `{message}`")

    # 6. /backlog_show
    @tree.command(name="backlog_show", description="Display all items in the backlog")
    async def backlog_show(interaction: discord.Interaction):
        async with AsyncSessionLocal() as session:
            result = await session.execute(select(Backlog))
            rows = result.scalars().all()

        if not rows:
            await interaction.response.send_message("📭 The backlog is empty.")
            return

        embed = discord.Embed(title="🗄️ Backlog Items", color=discord.Color.blue())
        for item in rows:
            embed.add_field(name=f"ID: {item.id} ({item.created_at})", value=item.message, inline=False)
        await interaction.response.send_message(embed=embed)