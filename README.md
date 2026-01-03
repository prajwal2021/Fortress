# Fortress - Privacy Gateway & Password Manager

A privacy-focused password manager with email aliasing capabilities, featuring a .NET backend API, Next.js frontend, and Chrome extension.

## 🏗️ Project Structure

- **Fortress.Api** - ASP.NET Core 9.0 REST API (Backend)
- **fortress-frontend** - Next.js 15 frontend application
- **fortress-extension** - Chrome/Edge browser extension
- **Fortress.Domain** - Domain entities
- **Fortress.Infrastructure** - Data access layer
- **Fortress.Application** - Application layer

## 📋 Prerequisites

Before running the project, ensure you have:

1. **.NET 9.0 SDK** - [Download](https://dotnet.microsoft.com/download/dotnet/9.0)
2. **Node.js 18+** and **npm** - [Download](https://nodejs.org/)
3. **PostgreSQL** - [Download](https://www.postgresql.org/download/)
4. **Chrome/Edge Browser** - For the extension

## 🚀 Setup Instructions

### Step 1: Database Setup

1. **Install and start PostgreSQL**
   ```bash
   # On macOS (using Homebrew)
   brew install postgresql
   brew services start postgresql
   
   # On Linux
   sudo apt-get install postgresql postgresql-contrib
   sudo systemctl start postgresql
   
   # On Windows
   # Download and install from postgresql.org
   ```

2. **Create the database**
   ```bash
   # Connect to PostgreSQL
   psql -U postgres
   
   # Create database
   CREATE DATABASE Fortress_Stage;
   
   # Create user (if needed, adjust credentials in appsettings.json)
   CREATE USER praj WITH PASSWORD 'qwer9980';
   GRANT ALL PRIVILEGES ON DATABASE Fortress_Stage TO praj;
   ```

3. **Update connection string** (if needed)
   - Edit `Fortress.Api/appsettings.json`
   - Update the `DefaultConnection` string with your PostgreSQL credentials:
   ```json
   "ConnectionStrings": {
     "DefaultConnection": "Host=localhost;Database=Fortress_Stage;Username=YOUR_USER;Password=YOUR_PASSWORD"
   }
   ```

### Step 2: Backend API Setup

1. **Navigate to the API directory**
   ```bash
   cd Fortress.Api
   ```

2. **Restore dependencies**
   ```bash
   dotnet restore
   ```

3. **Run database migrations**
   ```bash
   dotnet ef database update
   ```
   (If this fails, you may need to install EF Core tools: `dotnet tool install --global dotnet-ef`)

4. **Run the API**
   ```bash
   dotnet run
   ```
   
   The API will start on:
   - **HTTP**: `http://localhost:5254`
   - **HTTPS**: `https://localhost:7118` (if configured)
   
   You can verify it's running by visiting:
   - Swagger UI: `http://localhost:5254/swagger`

### Step 3: Frontend Setup

1. **Navigate to the frontend directory**
   ```bash
   cd fortress-frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run the development server**
   ```bash
   npm run dev
   ```
   
   The frontend will start on:
   - **http://localhost:3000**

4. **Open in browser**
   - Navigate to `http://localhost:3000`
   - Register a new account or login

### Step 4: Browser Extension Setup

1. **Open Chrome/Edge Extensions page**
   - Go to `chrome://extensions/` (Chrome) or `edge://extensions/` (Edge)
   - Enable **Developer mode** (toggle in top-right)

2. **Load the extension**
   - Click **Load unpacked**
   - Navigate to and select the `fortress-extension` folder
   - The extension should appear in your extensions list

3. **Verify extension is loaded**
   - You should see the Fortress icon in your browser toolbar
   - If you're logged in, the icon will be colored; if not, it will be grey

4. **Login through extension**
   - Click the extension icon
   - If not logged in, click "Go to Dashboard" to open the frontend
   - Login/Register on the frontend
   - The extension will automatically detect your login

## 🎯 Running the Complete Project

To run the entire project, you need **2-3 terminal windows/tabs**:

### Terminal 1: Backend API
```bash
cd Fortress.Api
dotnet run
```
**Expected output:** API running on `http://localhost:5254`

### Terminal 2: Frontend
```bash
cd fortress-frontend
npm run dev
```
**Expected output:** Frontend running on `http://localhost:3000`

### Terminal 3: (Optional) Database monitoring
```bash
# Monitor PostgreSQL if needed
psql -U praj -d Fortress_Stage
```

## 🧪 Local Testing

For detailed local testing instructions, see [LOCAL_TESTING.md](./LOCAL_TESTING.md)

**Quick Test:**
1. Start backend and frontend (see above)
2. Load extension in Chrome (`chrome://extensions/` → Load unpacked)
3. Register a new account at `http://localhost:3000/register`
4. Visit any website with login form
5. Click the F icon to generate/fill credentials
6. Check dashboard at `http://localhost:3000/dashboard`

**Note:** Generated email aliases will use `@myfortress.shop` domain (updated for production readiness)

## ✅ Verification Checklist

After starting all services, verify:

- [ ] **Backend API** is running on `http://localhost:5254`
  - Check: Visit `http://localhost:5254/swagger`
  
- [ ] **Frontend** is running on `http://localhost:3000`
  - Check: Visit `http://localhost:3000`
  
- [ ] **Database** is accessible
  - Check: API should start without database connection errors
  
- [ ] **Extension** is loaded
  - Check: Extension icon appears in browser toolbar
  - Check: Click icon to see popup

## 🔧 Troubleshooting

### API won't start
- **Database connection error**: Verify PostgreSQL is running and credentials in `appsettings.json` are correct
- **Port already in use**: Change port in `launchSettings.json` or kill the process using port 5254

### Frontend won't start
- **Port 3000 in use**: Change port: `npm run dev -- -p 3001`
- **Dependencies missing**: Run `npm install` again

### Extension not working
- **CORS errors**: Make sure API is running and CORS is configured (should be fixed in latest code)
- **Auth token missing**: Login through the frontend first, then the extension will detect it
- **API calls failing**: Check browser console (F12) for errors, verify API is running

### Database migration issues
- **EF Core tools not installed**: Run `dotnet tool install --global dotnet-ef`
- **Migration not found**: Run `dotnet ef migrations add InitialMigration` first, then `dotnet ef database update`

## 📝 Default Configuration

- **API URL**: `http://localhost:5254`
- **Frontend URL**: `http://localhost:3000`
- **Database**: PostgreSQL on `localhost:5432`
- **Database Name**: `Fortress_Stage`

## 🎨 Features

- ✅ User registration and authentication (JWT)
- ✅ Password generation and encryption (AES-GCM)
- ✅ Email alias generation
- ✅ Browser extension with auto-fill
- ✅ One-click identity generation on any website
- ✅ Secure credential storage

## 📚 API Documentation

Once the API is running, visit `http://localhost:5254/swagger` for interactive API documentation.

## 🔐 Security Notes

- Passwords are hashed using Argon2id
- Stored credentials are encrypted with AES-GCM
- JWT tokens are used for authentication
- CORS is configured for development

---

**Happy coding! 🚀**


