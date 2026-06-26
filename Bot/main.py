import os
from threading import Thread
from flask import Flask
import discord
from discord import app_commands
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
        
        if not self.keep_db_alive.is_running():
            self.keep_db_alive.start()

    @tasks.loop(hours=24)
    async def keep_db_alive(self):
        try:
            async with engine.connect() as conn:
                # ส่งคำสั่งเล็กๆ เพื่อเช็คสิทธิ์การเชื่อมต่อ
                await conn.execute("SELECT 1")
                print("💓 Database heartbeat pinged successfully to Supabase.")
        except Exception as e:
            print(f"⚠️ Failed to ping database: {e}")

bot = MyBot()

# ====================================================
# 🌐 Web Server Hook (Keep-Alive Service)
# ====================================================
web_app = Flask('')

@web_app.route('/')
def home():
    return "🤖 Discord Bot Backend is active and running successfully!"

def run_web():
    # Fetch environment port or fallback to default standard port
    port = int(os.environ.get("PORT", 7860))
    web_app.run(host='0.0.0.0', port=port)

def keep_alive():
    server_thread = Thread(target=run_web)
    server_thread.daemon = True  
    server_thread.start()

# ====================================================
# 🔥 Execution Trigger
# ====================================================
if __name__ == "__main__":
    BOT_TOKEN = os.getenv("DISCORD_TOKEN")
    if not BOT_TOKEN:
        raise ValueError("❌ DISCORD_TOKEN not found in environment variables.")

    # Start the keep-alive server hook before initializing the bot
    keep_alive()
    bot.run(BOT_TOKEN)