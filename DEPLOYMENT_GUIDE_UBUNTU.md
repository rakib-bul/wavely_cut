# Ubuntu Server Deployment Manual (Local PostgreSQL + Supabase Auth)

This manual provides a production-ready, step-by-step guide to deploying **Wavely Cut** (Garments Cutting Management ERP) on an **Ubuntu Server** (22.04 LTS or 24.04 LTS).

Based on your requirement—**using PostgreSQL directly on your Ubuntu server for the database and Supabase for user authentication**—you have two main architectural paths. This guide documents both in detail so you can choose the one that fits your infrastructure best.

---

## 🗺️ Architectural Paths Comparison

### Path 1: Self-Hosted Supabase Stack via Docker (Highly Recommended)
* **Concept:** Run the official Supabase open-source stack on your Ubuntu server. This includes a local PostgreSQL instance, the Supabase Auth (GoTrue) container, and the API gateway (PostgREST).
* **Why it is best:** Your codebase remains **100% unchanged**. Because the local PostgreSQL instance resides within the Supabase container network, all foreign key references (`public.profiles.id REFERENCES auth.users(id)`), database triggers, and `supabase.from(...)` database queries in your Express server work perfectly out of the box.

### Path 2: Hybrid Setup (Native Local PostgreSQL + Cloud Supabase Auth)
* **Concept:** Run PostgreSQL natively on your Ubuntu host (`apt install postgresql`), but keep using your hosted Supabase Cloud project (`supabase.com`) strictly for authentication.
* **Why someone chooses this:** If you want bare-metal control over PostgreSQL (without Docker abstraction), but do not want to manage an auth server.
* **The challenge & solution:** Because your local PostgreSQL database is physically separate from the Supabase Cloud database, you **cannot** establish physical foreign key references to Supabase's `auth.users(id)` table. You must modify your local schema to remove the `REFERENCES auth.users(id)` foreign key constraint while keeping the `UUID` datatype.

---

# 🚀 Path 1: Self-Hosted Supabase Stack via Docker (Recommended)

This setup launches PostgreSQL, Supabase Auth, and the REST API Gateway directly on your Ubuntu server.

```
[Web Browser / Client]
       │
       ▼ (HTTPS / Port 443)
┌──────────────┐
│  Nginx Host  │ (SSL Termination)
└──────┬───────┘
       │
       ├──────────────────────────────┐
       ▼ (HTTP / Port 3000)           ▼ (HTTP / Port 8000)
┌──────────────┐               ┌────────────────────────────────────────────────────────┐
│   Node/PM2   │               │                 Local Supabase Stack                   │
│ (Wavely ERP) │               │ ┌────────────┐   ┌───────────────┐   ┌───────────────┐  │
└──────┬───────┘               │ │  Kong API  │──>│ Supabase Auth │──>│ PostgreSQL DB │  │
       │                       │ │  Gateway   │   │   (GoTrue)    │   │ (Port 5432)   │  │
       ▼ (Queries local Kong)  │ └────────────┘   └───────────────┘   └───────────────┘  │
       └──────────────────────>│ (REST / Auth)                                           │
                               └────────────────────────────────────────────────────────┘
```

### Step 1: Install Docker & Docker Compose on Ubuntu
Log into your Ubuntu server via SSH and execute:

```bash
# Update local packages
sudo apt update && sudo apt upgrade -y

# Install essential dependencies
sudo apt install -y ca-certificates curl gnupg lsb-release git unzip wget

# Add Docker's official GPG key
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Set up the stable Docker repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine & Docker Compose
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Verify installation
docker --version
docker compose version
```

### Step 2: Clone & Configure Supabase Docker Stack
```bash
# Clone the official self-hosting repository
git clone --depth 1 https://github.com/supabase/supabase.git

# Move into the docker folder
cd supabase/docker

# Copy the example environment template
cp .env.example .env

# Generate secure random secrets (CRITICAL for production)
# You can generate strong 32-character keys with openssl:
openssl rand -hex 32
```
Open the `.env` file with Nano:
```bash
nano .env
```
Update the following configurations inside `supabase/docker/.env`:
* `POSTGRES_PASSWORD`: Set a highly secure password for your local PostgreSQL superuser.
* `JWT_SECRET`: Put a long, secure secret (used to sign auth tokens).
* `ANON_KEY`: Generate an anonymous client JWT key (or use the helper tools provided in Supabase docs to sign your own with the new `JWT_SECRET`).
* `SERVICE_ROLE_KEY`: Generate a service_role administrative JWT key.

Save and exit (`Ctrl + O`, `Enter`, `Ctrl + X`).

### Step 3: Start the Supabase Stack
```bash
# Start all Supabase services in the background
sudo docker compose up -d

# Verify that all containers are healthy
sudo docker compose ps
```
Your local PostgreSQL instance is now running on port `5432` of the server, and the Kong API Gateway is listening on port `8000`.

### Step 4: Import Database Schema
Apply the ERP tables, indexes, and initial seeds to your newly running local PostgreSQL database.

```bash
# Connect to the local Dockerized Postgres database and run the schema SQL file
# (Replace 'your_postgres_password' with the password set in Step 2)
docker compose exec -T db psql -U postgres -d postgres < /path/to/your/app/src/db/schema.sql
docker compose exec -T db psql -U postgres -d postgres < /path/to/your/app/src/db/rls.sql
```

---

# 🛠️ Path 2: Hybrid Setup (Native PostgreSQL + Cloud Supabase Auth)

This setup uses PostgreSQL installed directly on the Ubuntu system as a native service, but retains Supabase Cloud (`https://supabase.com`) to handle auth logic.

```
[Web Browser / Client]
       │
       ▼ (HTTPS / Port 443)
┌──────────────┐
│  Nginx Host  │ (SSL Termination)
└──────┬───────┘
       │
       ▼ (HTTP / Port 3000)
┌──────────────┐               ┌─────────────────┐
│   Node/PM2   │──────────────>│ Supabase Cloud  │ (Auth Sessions)
│ (Wavely ERP) │               └─────────────────┘
└──────┬───────┘
       │
       ▼ (Port 5432 - Native Connection)
┌──────────────────────────────┐
│  Native Local PostgreSQL DB  │ (Local Server Data)
└──────────────────────────────┘
```

### Step 1: Install PostgreSQL on Ubuntu
```bash
# Install PostgreSQL and contrib package
sudo apt update
sudo apt install -y postgresql postgresql-contrib

# Ensure PostgreSQL service starts automatically and is active
sudo systemctl enable postgresql
sudo systemctl start postgresql
sudo systemctl status postgresql
```

### Step 2: Establish the Database & User
```bash
# Enter the PostgreSQL prompt as the admin user
sudo -i -u postgres psql
```
Execute the following queries inside the PostgreSQL shell:
```sql
-- Create database
CREATE DATABASE garments_cutting_erp;

-- Create application database user
CREATE USER erp_app_user WITH ENCRYPTED PASSWORD 'your_highly_secure_db_password';

-- Grant access
GRANT ALL PRIVILEGES ON DATABASE garments_cutting_erp TO erp_app_user;

-- Exit the shell
\q
```

### Step 3: Apply the Modified Schema
Because your native local database is physically separate from the cloud-hosted Supabase Auth schema, **you must execute a schema file that does not contain a foreign key reference to `auth.users`**.

Create a modified version of the schema at `src/db/schema_native_local.sql`:

```sql
-- Disable the foreign key lookup on auth.users for the profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY, -- Removed "REFERENCES auth.users(id) ON DELETE CASCADE"
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('operator', 'supervisor', 'manager', 'admin')),
    department VARCHAR(100) NOT NULL DEFAULT 'Cutting',
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Note: The rest of the tables (machines, cutting_entries, audit_logs, buyers) 
-- remain identical and should reference public.profiles(id) normally.
```

Apply the schema to your local database:
```bash
sudo -u postgres psql -d garments_cutting_erp -f src/db/schema_native_local.sql
sudo -u postgres psql -d garments_cutting_erp -f src/db/rls.sql
```

---

# 📦 Deploying the Wavely Cut ERP Application

Regardless of whether you choose **Path 1** or **Path 2**, follow these steps to host and run the Express app on your Ubuntu server.

### Step 1: Install Node.js & Git
```bash
# Install Node.js v20 (LTS)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify versions
node -v
npm -v
```

### Step 2: Clone Repository & Build App
```bash
# Create directory for applications
sudo mkdir -p /var/www
sudo chown -R $USER:$USER /var/www
cd /var/www

# Clone your project code
git clone <your-repository-url> wavely-erp
cd wavely-erp

# Install dependencies
npm install

# Compile the React frontend and bundle the backend server
npm run build
```

### Step 3: Configure `.env` File
Create a production `.env` file in the root of `/var/www/wavely-erp`:
```bash
nano .env
```

#### If using Path 1 (Local Docker Supabase Stack):
```env
# Node Environment Config
NODE_ENV=production
PORT=3000

# Connect to local Dockerized Postgres service
DATABASE_URL=postgresql://postgres:your_postgres_password@localhost:5432/postgres

# Connect to local Dockerized Kong API Gateway
SUPABASE_URL=http://localhost:8000
SUPABASE_SERVICE_ROLE_KEY=your_local_service_role_key_from_step_2
```

#### If using Path 2 (Native Local DB + Supabase Cloud Auth):
```env
# Node Environment Config
NODE_ENV=production
PORT=3000

# Connect to native Ubuntu Postgres service
DATABASE_URL=postgresql://erp_app_user:your_highly_secure_db_password@localhost:5432/garments_cutting_erp

# Connect to Supabase Cloud Auth service
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_cloud_supabase_service_role_key
```

Save and exit.

### Step 4: Daemonize with PM2 Process Manager
PM2 ensures your Node.js server runs in the background and restarts if the server crashes or reboots.

```bash
# Install PM2 globally
sudo npm install -g pm2

# Start the compiled Express server
pm2 start dist/server.cjs --name "wavely-erp"

# Enable startup script to reload PM2 on system boot
pm2 startup
# (This outputs a systemctl command starting with 'sudo env PATH...'. Copy and run that exact command)

# Save current active list so it remembers to launch wavely-erp
pm2 save
```

### Step 5: Install and Configure Nginx Reverse Proxy
Deploy Nginx to serve the app securely on standard ports `80` and `443` with automatic SSL termination.

```bash
# Install Nginx
sudo apt install -y nginx

# Remove default site configuration
sudo rm /etc/nginx/sites-enabled/default

# Create your custom site file
sudo nano /etc/nginx/sites-available/wavely-erp
```

Paste the following server block:
```nginx
server {
    listen 80;
    server_name erp.yourdomain.com; # Replace with your Domain or Server IP

    # Route all traffic to the PM2 Node app running on port 3000
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

    # Custom static optimization or larger payload sizes (for Excel uploads)
    client_max_body_size 15M;
}
```

Enable the configuration and reload Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/wavely-erp /etc/nginx/sites-enabled/
sudo nginx -t # Validate syntax
sudo systemctl restart nginx
```

### Step 6: Secure Nginx with Free SSL Certificates (Certbot)
```bash
# Install Certbot and the Nginx plugin
sudo apt install -y certbot python3-certbot-nginx

# Obtain and install the SSL certificate
sudo certbot --nginx -d erp.yourdomain.com
```
*Follow the on-screen prompts to input your email address and accept terms. Select option `2` when prompted to automatically redirect all non-SSL (HTTP) requests to SSL (HTTPS).*

---

## 🔒 Security & Maintenance Protocols

### 1. Configure the Ubuntu Firewall (UFW)
Only expose ports explicitly necessary for secure operation. Keep PostgreSQL and PM2 internal ports inaccessible to the public web.

```bash
# Allow SSH
sudo ufw allow OpenSSH

# Allow Nginx (HTTP & HTTPS)
sudo ufw allow 'Nginx Full'

# Enable the firewall
sudo ufw enable

# Verify current rules
sudo ufw status
```

### 2. Automatic Backup Script for Local PostgreSQL
Setup a daily cron job to backup your database.

Create the backup script:
```bash
mkdir -p ~/backups
nano ~/backup_db.sh
```
Paste this shell script:
```bash
#!/bin/bash
BACKUP_DIR="/home/ubuntu/backups"
DB_NAME="garments_cutting_erp" # Change to 'postgres' if using Path 1
DATE=$(date +%Y-%m-%d_%H%M%S)

# Perform pg_dump
pg_dump -U postgres -h localhost -d $DB_NAME -F c -b -v -f "$BACKUP_DIR/${DB_NAME}_$DATE.backup"

# Keep only the last 30 days of backups
find $BACKUP_DIR -type f -name "*.backup" -mtime +30 -delete
```
Make the script executable:
```bash
chmod +x ~/backup_db.sh
```
Set up the daily cron job:
```bash
crontab -e
```
Add the following line to the end of the file to run the backup every night at 2:00 AM:
```text
0 2 * * * /home/ubuntu/backup_db.sh
```
