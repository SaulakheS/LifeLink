# LifeLink — Cloud Deployment Guide (100% Free)

This guide walks you through deploying **LifeLink** so that anyone on the internet can access the website link and interact with all features (Donors, Hospitals, Real-Time SOS alerts via WebSockets, and Certificate verification).

---

## 🏗 System Architecture

```
[ Frontend (React SPA) ]
  Deployed on: Vercel or Render Static Site (Free)
  URL: https://lifelink-app.vercel.app
          │
          │ HTTP API Requests & WebSockets
          ▼
[ Backend (Node.js + Express + Socket.IO) ]
  Deployed on: Render Web Service (Free)
  URL: https://lifelink-api.onrender.com
          │
          │ SQL Queries (PostGIS enabled)
          ▼
[ Cloud Database (PostgreSQL + PostGIS) ]
  Hosted on: Supabase or Neon (Free)
```

---

## Step 1: Create a Free Cloud Database with PostGIS

LifeLink requires PostgreSQL with the **PostGIS** extension for geospatial calculations (finding nearby donors by GPS coordinates).

### Recommended: Supabase (Free & Instant)
1. Go to [https://supabase.com](https://supabase.com) and sign up (Free).
2. Click **New Project** and choose a project name (e.g., `lifelink-db`) and database password.
3. In the left sidebar, click **SQL Editor**.
4. Click **New Query**, copy the entire contents of [`backend/schema.sql`](backend/schema.sql), paste it into the editor, and click **Run**.
   - This enables PostGIS and creates all 5 tables (`hospitals`, `donors`, `emergency_requests`, `request_responses`, `donation_certificates`) with indexes.
5. Go to **Project Settings** (gear icon) ➔ **Database**.
6. Under **Connection string**, select **URI** (or Transaction pooler mode) and copy the connection string.
   - Format: `postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres`
   - Replace `[YOUR-PASSWORD]` with the password you created in step 2.

*(Alternative: You can also use [Neon.tech](https://neon.tech), which supports PostGIS for free).*

---

## Step 2: Deploy the Backend on Render

Render hosts Node.js apps and supports WebSockets (Socket.IO) on its free tier.

1. Go to [https://render.com](https://render.com) and sign in with your GitHub account.
2. Click **New +** (top right) ➔ **Web Service**.
3. Select your repository: `SaulakheS/LifeLink`.
4. Fill in the service configuration:
   - **Name**: `lifelink-backend` (or your preferred name)
   - **Region**: Choose closest to you (e.g., Singapore, Frankfurt, Oregon, Ohio)
   - **Root Directory**: `backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free`
5. Scroll down to **Environment Variables** and add:
   | Key | Value |
   | :--- | :--- |
   | `DATABASE_URL` | Your Supabase / Neon connection string from Step 1 |
   | `JWT_SECRET` | Any long random secret key (e.g. `lifelink_secret_jwt_2026_super_secure`) |
   | `CLIENT_ORIGIN` | `*` *(Change this to your frontend URL after Step 3)* |
   | `NODE_ENV` | `production` |
6. Click **Create Web Service**.
7. Wait 2–3 minutes for deployment. Once ready, Render will give you a public URL:
   - Example: `https://lifelink-backend.onrender.com`
8. Verify it works by opening `https://lifelink-backend.onrender.com` in your browser. You should see:
   ```
   LifeLink Backend Running 🚀
   ```

---

## Step 3: Deploy the Frontend on Vercel

Vercel provides free global hosting with automatic HTTPS and instant builds.

1. Go to [https://vercel.com](https://vercel.com) and sign in with GitHub.
2. Click **Add New...** ➔ **Project**.
3. Find and import `SaulakheS/LifeLink`.
4. In the project setup page:
   - **Framework Preset**: `Create React App`
   - **Root Directory**: Click **Edit** and select `frontend`
5. Expand the **Environment Variables** section and add:
   | Key | Value |
   | :--- | :--- |
   | `REACT_APP_API_URL` | Your backend URL from Step 2 (e.g. `https://lifelink-backend.onrender.com`) |
   *(Important: Do NOT include a trailing slash `/` at the end)*
6. Click **Deploy**.
7. In ~1 minute, Vercel will give you your live public website link:
   - Example: `https://lifelink-alpha.vercel.app`

---

## Step 4: Link Frontend & Backend Security

Now that your frontend has a live public URL:

1. Return to your **Render Dashboard** ➔ Click on `lifelink-backend` ➔ **Environment**.
2. Update `CLIENT_ORIGIN` to your exact frontend domain:
   - Example: `https://lifelink-alpha.vercel.app`
3. Click **Save Changes** (Render will automatically redeploy with the new settings).

---

## Step 5: Test Your Live LifeLink Application

1. Open your live frontend URL in your browser.
2. **Register a Hospital**:
   - Go to Hospital Register, enter hospital name, email, password.
   - Use the map to select hospital location (or click Use Current Location).
   - Log into Hospital Dashboard.
3. **Open an Incognito / Second Browser Window**:
   - Open your live frontend URL.
   - Register as a **Donor** with matching blood group (e.g. `A+`) and a nearby location.
   - Log into Donor Dashboard.
4. **Trigger Emergency SOS**:
   - In the Hospital window, select blood group `A+` and trigger an SOS.
   - In the Donor window, watch the live SOS notification appear instantly via WebSockets with sound alert!
   - Accept the SOS, and see the hospital dashboard update in real time with the donor's acceptance.
   - Generate a donation certificate from the hospital dashboard and verify it via public link/QR!

---

## 🛠 Local Database Setup Command (Optional)

If you have your `DATABASE_URL` and want to initialize the tables from your terminal instead of the Supabase SQL editor:
```bash
cd backend
npm run init-db
```
This reads `backend/schema.sql` and creates all tables, extensions, and spatial indexes automatically.
