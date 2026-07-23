# Deployment Guide

This guide explains how to deploy the frontend to Cloudflare Pages and backend to Railway.

## Frontend (Cloudflare Pages)

The frontend uses Angular. To deploy to Cloudflare Pages for production:

1. **Build the Application**
   Navigate to the frontend directory and run the production build:
   ```bash
   cd frontend
   npm run build:prod
   ```
   This ensures the application is built using `src/environments/environment.prod.ts`, which points to the production Railway backend (`https://loans-cat-server-production.up.railway.app/api`).

2. **Deploy to Cloudflare Pages**
   Ensure you are logged into Wrangler (`npx wrangler login`). Then, deploy the built files:
   ```bash
   npx wrangler pages deploy dist/frontend/browser --project-name loans-cat --branch main
   ```
   *Note: If your output directory is different, adjust `dist/frontend/browser` accordingly.*

## Backend (Render)
 
The backend is hosted on Render (URL: `https://plataforma-prestamos-g2nw.onrender.com`).
- To deploy, configure your Render Web Service with:
  - **Root Directory:** `backend`
  - **Build Command:** `npm install && npx prisma generate && npm run build`
  - **Start Command:** `npm run start`
- If you connect the repository using Render's **Git Provider** integration, deployments will happen automatically whenever you push to the `main` branch.
- If connected via the public Git URL, deployments must be triggered manually from the Render dashboard.

### Adding Collectors (Cobradores)

Currently, users who log in are treated as Prestamistas (Lenders). To add a Collector (Cobrador) to a Prestamista:
- The system supports creating an invitation link from the Prestamista dashboard.
- The Prestamista can generate a link in the format: `https://loans-cat.pages.dev/?prestamistaId=YOUR_ID&rol=COBRADOR`.
- When a user logs in via Google using that link, they will be registered as a Cobrador under that Prestamista.
