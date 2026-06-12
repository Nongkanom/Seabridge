import discord
from discord import app_commands
import os
from flask import Flask
from threading import Thread
from database import engine, Base
from commands import setup_commands

class MyBot(discord.Client):
    def __init__(self):
        super().__init__(intents=discord.Intents.default())
        self.tree = app_commands.CommandTree(self)
        setup_commands(self.tree)

    async def on_ready(self):
        print(f'Logged in as {self.user}')
        
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        
        await self.tree.sync()
        print("🌍 Global Slash Commands synced successfully!")

bot = MyBot()

# ====================================================
# 🌐 Web Server Hook สำหรับ Render.com
# ====================================================
web_app = Flask('')

@web_app.route('/')
def home():
    return "🤖 Discord Bot Backend is alive and running safely on Render.com!"

def run_web():
    port = int(os.environ.get("PORT", 7860))
    web_app.run(host='0.0.0.0', port=port)

def keep_alive():
    t = Thread(target=run_web)
    t.start()

# ====================================================
# 🔥 Execution Trigger
# ====================================================
BOT_TOKEN = os.getenv("DISCORD_TOKEN")
if not BOT_TOKEN:
    raise ValueError("❌ DISCORD_TOKEN not found in environment variables.")

keep_alive()
bot.run(BOT_TOKEN)