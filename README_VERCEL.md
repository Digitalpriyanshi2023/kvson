# Vercel Deployment Instructions

This project is configured to run on Vercel using the Python Runtime.

## Steps to Deploy

1. **Install Vercel CLI**: `npm i -g vercel`
2. **Login**: `vercel login`
3. **Deploy**: `vercel`

## Environment Variables

You MUST set the following environment variable in your Vercel Dashboard:

- `GEMINI_API_KEY`: Your Google Gemini API Key.

## Database Note

Currently, the project uses **SQLite**. On Vercel, the filesystem is ephemeral and read-only (except for `/tmp`).
- Data saved will **NOT** persist after the serverless function spins down.
- For production, it is highly recommended to migrate to a hosted database like **Supabase** or **PostgreSQL**.

## Project Structure for Vercel

- `vercel.json`: Configuration for routing and runtime.
- `api/index.py`: Entry point for the serverless function.
- `requirements.txt`: Python dependencies.
