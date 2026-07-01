# Production Security & Deployment Manual

This manual provides comprehensive, step-by-step instructions to configure, secure, and deploy **WavelyCut** across modern cloud ecosystems (**Vercel + Supabase**) and bare-metal environments (**Ubuntu/Debian Home Server without Docker**).

---

## 📖 Table of Contents
1. [Adding Environment Variables (`.env`) in Vercel](#1-adding-environment-variables-env-in-vercel)
2. [Home Server Deployment Guide (No Docker, Raw Linux Stack)](#2-home-server-deployment-guide-no-docker-raw-linux-stack)
3. [Enhancing Application Data Security (Supabase + Vercel)](#3-enhancing-application-data-security-supabase--vercel)
4. [Database Backup & Maintenance Procedures](#4-database-backup--maintenance-procedures)

---

## 1. Adding Environment Variables (`.env`) in Vercel

Since we removed the hardcoded `SUPABASE_SERVICE_ROLE_KEY` and project URL from the source code, you must inject them dynamically into Vercel during build and runtime.

### Option A: Via the Vercel Web Dashboard (Recommended)

1. **Navigate to your Project:**
   - Log in to [Vercel](https://vercel.com).
   - Click on your deployed project (e.g., `garments-cutting-erp`).
2. **Open Environment Settings:**
   - Click on the **Settings** tab in the top navigation bar.
   - Select **Environment Variables** from the left sidebar.
3. **Add the Keys:**
   - Input the following variables one by one. Ensure you select all environments (**Production**, **Preview**, and **Development**):

| Key | Value Example / Description | Exposure |
| :--- | :--- | :---: |
| `SUPABASE_URL` | `https://qkcbxpafpykmktisyioy.supabase.co` | Server-side only |
| `SUPABASE_SERVICE_ROLE_KEY` | *Your secret service_role JWT key* | **Strictly Secret** |
| `NODE_ENV` | `production` | System |
| `PORT` | `3000` | Optional |

4. **Redeploy the Application:**
   - For changes to take effect, navigate to the **Deployments** tab.
   - Click on your latest deployment, click the **three dots icon**, and select **Redeploy** (ensure you check "Redeploy with existing cache" or "Force redeploy" to read the new environment values).

### Option B: Via the Vercel Command Line Interface (CLI)

If you manage your deployments via terminal, execute the following commands in the root of your project:

```bash
# Add Supabase URL
vercel env add SUPABASE_URL production "https://qkcbxpafpykmktisyioy.supabase.co"

# Add Supabase Service Role Key (Keep private)
vercel env add SUPABASE_SERVICE_ROLE_KEY production "your_actual_service_role_key"

# Deploy changes
vercel --prod
```

---

## 2. Home Server Deployment Guide (No Docker, Raw Linux Stack)

This section guides you through deploying WavelyCut on a bare-metal or virtualized home server (e.g., Ubuntu Server 22.04 LTS / 24.04 LTS or Debian) using **Nginx** as a reverse proxy, **PM2** as a process manager, and a local **PostgreSQL** database.

### 🗺️ Archival Architecture Topology (Bare-Metal)
```
[Client Web Browser]
       │
       ▼ (HTTPS / Port 443)
 ┌───────────┐
 │   Nginx   │ (SSL Termination & Asset Proxy)
 └─────┬─────┘
       │
       ▼ (HTTP / Localhost Port 3000)
 ┌───────────┐
 │ PM2 Host  │ ---> [Express Serverless (server.ts)]
 └─────┬─────┘
       │
       ▼ (Local Port 5432)
 ┌───────────┐
 │PostgreSQL │ (Active Physical Tables & Audit Logs)
 └───────────┘
```

### Step 1: Install OS-Level Prerequisites
Update your packages and install Node.js, PostgreSQL, Nginx, and essential utilities:

```bash
sudo apt update && sudo apt upgrade -y

# Install Node.js v20 (LTS) via NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installations
node -v
npm -v

# Install Git, Nginx, PostgreSQL, and certbot for SSL
sudo apt install -y git nginx postgresql postgresql-contrib certbot python3-certbot-nginx
```

### Step 2: Establish Your Local PostgreSQL Database
1. **Log in to the PostgreSQL prompt:**
   ```bash
   sudo -i -u postgres psql
   ```
2. **Create the ERP Database, User, and Grant Privileges:**
   ```sql
   -- Create Database
   CREATE DATABASE garments_cutting_erp;

   -- Create a dedicated ERP application user (Replace 'your_secure_password' with a strong password)
   CREATE USER erp_app_user WITH ENCRYPTED PASSWORD 'your_secure_password';

   -- Grant privileges
   GRANT ALL PRIVILEGES ON DATABASE garments_cutting_erp TO erp_app_user;
   
   -- Exit database console
   \q
   ```
3. **Seed Database Schema and Roles:**
   Log back to your server user, navigate to the repo root folder, and run schemas directly against the database:
   ```bash
   # Connect to database using postgres superuser to run schemas
   sudo -u postgres psql -d garments_cutting_erp -f src/db/schema.sql
   sudo -u postgres psql -d garments_cutting_erp -f src/db/rls.sql
   ```

### Step 3: Configure Project Environment File
1. Clone the repository into your preferred folder on the home server (e.g., `/var/www/garments-cutting-erp`):
   ```bash
   sudo mkdir -p /var/www
   sudo chown -R $USER:$USER /var/www
   cd /var/www
   git clone <your-github-repo-url> garments-cutting-erp
   cd garments-cutting-erp
   ```
2. Create a production `.env` file:
   ```bash
   nano .env
   ```
3. Paste the following values into `.env` (adjusting database passwords and API paths as needed):
   ```env
   # Database connection string directly to local postgres instance
   DATABASE_URL=postgresql://erp_app_user:your_secure_password@localhost:5432/garments_cutting_erp
   
   # Supabase Configuration (If you still want to route authentication and logs via Supabase)
   SUPABASE_URL=https://qkcbxpafpykmktisyioy.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
   
   # Server Port & State
   PORT=3000
   NODE_ENV=production
   ```

### Step 4: Install Dependencies & Build
Install standard npm dependencies and build the static frontend code assets:

```bash
# Install package dependencies
npm install

# Build static react assets and bundle server code
npm run build
```

### Step 5: Setup Process Manager (PM2) to Keep App Running
We use **PM2** to run the server in the background and ensure it automatically restarts on crash or system boot.

```bash
# Install PM2 globally
sudo npm install -y -g pm2

# Start the compiled Node.js backend using PM2
pm2 start dist/server.cjs --name "wavelycut-erp"

# Configure PM2 to restart on system boot
pm2 startup
# (This will output a command starting with 'sudo env PATH...'. Copy and run that exact command in your terminal)

# Save current PM2 process list
pm2 save
```

### Step 6: Set Up Nginx Reverse Proxy with SSL
1. Disable the default Nginx placeholder site:
   ```bash
   sudo rm /etc/nginx/sites-enabled/default
   ```
2. Create a new Nginx configuration file for your domain (e.g., `erp.yourdomain.com` or local network name):
   ```bash
   sudo nano /etc/nginx/sites-available/wavelycut
   ```
3. Paste the following highly secure proxy configuration block:
   ```nginx
   server {
       listen 80;
       server_name erp.yourdomain.com; # Replace with your dynamic DNS or domain

       # Proxy to PM2 node process on local port 3000
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }

       # Custom large file configuration (Optional for logs/exports)
       client_max_body_size 10M;
   }
   ```
4. Enable the configuration and restart Nginx:
   ```bash
   sudo ln -s /etc/nginx/sites-available/wavelycut /etc/nginx/sites-enabled/
   sudo nginx -t # Test configuration files syntax
   sudo systemctl restart nginx
   ```
5. **Secure with Free HTTPS (SSL):**
   Run Certbot to fetch and configure SSL certificates automatically:
   ```bash
   sudo certbot --nginx -d erp.yourdomain.com
   # Select '2' to redirect all HTTP traffic automatically to HTTPS
   ```

---

## 3. Enhancing Application Data Security (Supabase + Vercel)

Deploying to cloud hosting like Vercel and Supabase introduces specific security vectors. Implement these five measures to protect operational data and restrict database access:

### 🛡️ Core Security Posture Guidelines

```
                        ┌────────────────────────┐
                        │   Vercel Edge Gateway  │
                        └───────────┬────────────┘
                                    │
                                    │ (CORS Rules & Origin Headers)
                                    ▼
                        ┌────────────────────────┐
                        │     Express Engine     │ (Role Validation, Audit Trails)
                        └───────────┬────────────┘
                                    │
                                    │ (Private Server-Side Handshake)
                                    ▼
                        ┌────────────────────────┐
                        │      Supabase DB       │ (Encrypted Schema & SSL Enforced)
                        └────────────────────────┘
```

### 1. Guarding the Service Role Key (`SUPABASE_SERVICE_ROLE_KEY`)
The `service_role` key bypasses all Row Level Security (RLS) policies completely. 
- **The Threat:** If this key is exposed in client-side code (inside React file files such as `.tsx`), any malicious visitor can delete the entire database.
- **The Fix:** 
  1. We have successfully scrubbed the hardcoded key from `/server.ts` and moved it into system environment variables (`process.env.SUPABASE_SERVICE_ROLE_KEY`).
  2. **Never** prefix server-side database secrets with `VITE_` in your `.env` or Vercel configurations. Vite exposes any variable starting with `VITE_` directly to client browsers during static build.

### 2. Tighten Express CORS Policy (Vercel Origin Filtering)
To prevent cross-site scripting (XSS) or external scripts from executing commands against your Express endpoints:
Configure Cors in `server.ts` to only permit traffic originating from your verified Vercel production domains.

In `/server.ts` we should ensure:
```ts
import cors from "cors";

const allowedOrigins = [
  "https://your-production-app.vercel.app", // Your Vercel URL
  "https://erp.yourdomain.com",              // Your Custom Domain
  "http://localhost:3000"                    // Local testing
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow server-to-server or curl requests (origin is undefined)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true
}));
```

### 3. Enforce Strict Row Level Security (RLS) on Supabase
If clients can directly connect to Supabase endpoints:
- Make sure to keep the public `anon` key restricted.
- Open the **Supabase Dashboard** -> **Database** -> **Tables** and check that Row Level Security (RLS) is **enabled** for every table.
- Verify our trigger systems: Ensure changes to `auth.users` populate the profiles metadata using PostgreSQL triggers automatically, restricting random accounts from assigning themselves the `admin` role.

### 4. Setup IP Whitelisting for Database Connections
If you are hosting PostgreSQL on your own home server or using Supabase:
- Navigate to **Supabase Settings** -> **Database** -> **Network Restrictions**.
- Enable **IP Whitelisting** so the PostgreSQL database accepts connections **exclusively** from Vercel's IP ranges or your home server IP. This prevents brute-force login attacks on port `5432` from the public internet.

---

## 4. Database Backup & Maintenance Procedures

To prevent catastrophic loss from physical server crashes on your home server, establish a cron backup script:

### Automated Daily PostgreSQL Backups (Linux Server)
1. Create a script file in your user home folder:
   ```bash
   mkdir -p ~/backups
   nano ~/backup_db.sh
   ```
2. Paste this lightweight backup script:
   ```bash
   #!/bin/bash
   BACKUP_DIR="/home/$USER/backups"
   DB_NAME="garments_cutting_erp"
   DATE=$(date +%Y-%m-%d_%H%M%S)
   FILE_NAME="$BACKUP_DIR/db_backup_${DB_NAME}_${DATE}.sql.gz"

   echo "Starting database backup of $DB_NAME..."
   pg_dump -h localhost -U erp_app_user -d $DB_NAME | gzip > $FILE_NAME
   echo "Backup successfully written to $FILE_NAME"

   # Keep only last 14 days of backups
   find $BACKUP_DIR -name "*.sql.gz" -mtime +14 -exec rm {} \;
   ```
3. Set execution permissions and configure a cron job to run it automatically at 2:00 AM every night:
   ```bash
   chmod +x ~/backup_db.sh
   
   # Open user crontab
   crontab -e
   ```
4. Add the following cron line:
   ```cron
   0 2 * * * /bin/bash /home/yourusername/backup_db.sh > /dev/null 2>&1
   ```

---
*Manual compiled in June 2026. Keep backup locations encrypted and rotate secrets every 90 days.*
