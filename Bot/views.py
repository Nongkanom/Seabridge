import discord
import calendar
import re
from datetime import datetime, timedelta, timezone
from sqlalchemy import update
from database import AsyncSessionLocal, Task  

class TaskStatusView(discord.ui.View):
    def __init__(self, task_id: int):
        super().__init__(timeout=None)
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


class CalendarDropdownView(discord.ui.View):
    def __init__(self, members: str, task: str, year: int = None, month: int = None):
        super().__init__(timeout=180)
        self.members = members
        self.task = task
        tz_bkk = timezone(timedelta(hours=7))
        now_bkk = datetime.now(tz_bkk)
        self.current_year = year if year else now_bkk.year
        self.current_month = month if month else now_bkk.month
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
        
        await interaction.response.edit_message(content="✅ Task assigned successfully!", embed=embed, view=TaskStatusView(task_id))

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