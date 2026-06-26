# 🌊 Seabridge Suite

An elegant, modern full-stack ecosystem containing a web-based management dashboard and a fully integrated Discord bot. Both applications synchronize seamlessly in real time via a shared **Supabase PostgreSQL** database.

---

## ✨ Features

- **Real-time Sync:** View and modify tasks that are created and updated instantly by your Discord bot commands.
- **Discord API Integration:** Automatically fetches real-time avatars and global names of assigned members using their Discord IDs.
- **Advanced Management Table:**
  - Filter tasks by status (**To Do**, **In Progress**, **Done**).
  - Search by task name or filter specifically by assignee name.
  - Bulk delete multiple tasks simultaneously.
- **Central Backlog:** Separate staging area for raw ideas and quick tasks collected straight from Discord commands.

---

## 🛠️ Tech Stack

### Web Dashboard
- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS
- **Icons:** Lucide React
- **Deployment:** Vercel

### Discord Bot
- **Runtime:** Node.js
- **Library:** Discord.js

### Shared Infrastructure
- **Database:** Supabase (PostgreSQL) via `node-postgres (pg)`

---

## 📁 Project Structure

This repository is structured as a monorepo containing both applications:

- **Bot/**: Node.js Discord Bot application codebase.
- **Web/**: Next.js full-stack web application codebase.
  - **app/**: Main Next.js application folder.
    - **actions/**: Next.js Server Actions handling DB queries & Discord API.
    - **components/**: Modular UI components (Header, Table, Overview).
    - **data/**: Database pool initialization and configuration.

---

## 🚀 Getting Started

Follow these steps to set up and run both applications locally on your machine.

### 1. Clone the Repository
Run the following command in your terminal:

    git clone https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
    cd YOUR_REPO_NAME

### 2. Web Dashboard Setup
Navigate to the Web folder, install dependencies, and configure environment variables.

    cd Web
    npm install

Create a `.env.local` file inside the `Web/` directory:

    DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[REF_ID].supabase.co:5432/postgres
    DISCORD_TOKEN=your_discord_bot_token_here

Start the development server:

    npm run dev

The web dashboard will be live at http://localhost:3000.

### 3. Discord Bot Setup
Open a new terminal window, navigate to the Bot folder, and install its dependencies.

    cd ../Bot
    pip install -r requirements.txt

Create a `.env` file inside the `Bot/` directory:

    DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[REF_ID].supabase.co:5432/postgres
    DISCORD_TOKEN=your_discord_bot_token_here

Start the Discord bot application:

    python main.py

---

## 🔒 Production Deployment

### Web Dashboard (Vercel)
1. Import your GitHub repository into Vercel.
2. Set the **Root Directory** option to `Web`.
3. Configure your Environment Variables (`DATABASE_URL`, `DISCORD_TOKEN`) in the Vercel dashboard.
4. Click **Deploy**.

### Discord Bot
The bot application can be deployed to any Node.js environment (e.g., Hugging Face Spaces, Render, Railway, VPS). Ensure you configure the equivalent `.env` variables on your hosting provider platform.