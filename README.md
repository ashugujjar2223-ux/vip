# VIPCall — Production Deployment Guide

This guide outlines the steps to securely deploy the **VIPCall** web application to cloud platforms like **Render**, **Railway**, or a custom **VPS**.

---

## 1. Production Technology Stack
- **Backend**: Node.js & Express.
- **Database**: MongoDB (managed cluster).
- **Session Manager**: MongoDB-backed persistent session store (`connect-mongo`).
- **Security**: Strict Content Security Policy, Helmet protection, and HTTPS-enforced session cookies.

---

## 2. Setting up MongoDB Atlas (Free Database)
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and sign up for a free account.
2. Create a new project, and deploy a **Shared Cluster (M0 Free Tier)** in your preferred region.
3. Under **Database Access**, create a database user (e.g. `vipcall_user`) and generate a strong password.
4. Under **Network Access**, click **Add IP Address** and choose **Allow Access From Anywhere** (`0.0.0.0/0`) so that server hosting platforms (like Render) can connect to it.
5. Go to your cluster dashboard, click **Connect** -> **Drivers**, and copy the connection string. Replace `<password>` with your database user password.

---

## 3. Environment Variables configuration
When deploying to cloud platforms, configure the following **Environment Variables** in your app settings dashboard:

| Variable | Description | Example / Value |
| :--- | :--- | :--- |
| `NODE_ENV` | Production environment flag | `production` |
| `MONGODB_URI` | MongoDB Atlas Connection string | `mongodb+srv://user:pass@cluster.mongodb.net/vipcall` |
| `SESSION_SECRET` | Strong random key to encrypt cookies | *Use a long random string of characters* |
| `ADMIN_USERNAME` | Custom administrator username | `admin` (or custom) |
| `ADMIN_PASSWORD` | Custom administrator password | *Use a secure strong password* |
| `PORT` | Web port (usually auto-bound by host) | *Auto-assigned by Render/Railway* |

---

## 4. Deploying to Render
1. Sign up on [Render](https://render.com/) and connect your GitHub/GitLab account.
2. Click **New +** and select **Web Service**.
3. Link your VIPCall repository.
4. Configure the service settings:
   - **Name**: `vipcall`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. Click **Advanced**, then add the environment variables listed in Section 3 above.
6. Click **Deploy Web Service**. Render will build the dependencies, configure the SSL/HTTPS certificate, and host the app live.

---

## 5. Deploying to Railway
1. Sign up on [Railway](https://railway.app/).
2. Create a **New Project** -> **Deploy from GitHub repo**.
3. Select your VIPCall repository.
4. Click **Variables** in your Railway service dashboard, and add the environment variables listed in Section 3.
5. Railway will automatically run the start command (`npm start`) and deploy the service.

---

## 6. Seeding Behavior
On the first launch with a blank database, the app automatically seeds three default listings (Royal Enfield Bullet, SLR Camera, Banarasi Silk Saree) and initializes the admin account credentials. Subsequent restarts will **never** clear or overwrite user listings since `deleteMany` is disabled in production.
