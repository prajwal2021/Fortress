# Deployment Guide for myfortress.shop

This guide will help you deploy Fortress to your domain `http://myfortress.shop/`.

## 📋 Prerequisites

1. **Domain**: `myfortress.shop` (you have this ✅)
2. **Hosting**: You'll need hosting for:
   - Backend API (ASP.NET Core)
   - Frontend (Next.js)
   - Database (PostgreSQL)

## 🔧 Configuration Updates

### 1. Backend API Configuration

The CORS settings have been updated to allow your domain. For production:

**Update `appsettings.Production.json`:**
- Update `Jwt.Issuer` and `Jwt.Audience` to your domain
- Update database connection string for production database
- Consider using environment variables for sensitive data

### 2. Frontend Configuration

Create a `.env.production` file in `fortress-frontend/`:

```env
NEXT_PUBLIC_API_URL=http://myfortress.shop/api
```

Or if you're using a subdomain for API:

```env
NEXT_PUBLIC_API_URL=http://api.myfortress.shop/api
```

### 3. Extension Configuration

The extension currently uses hardcoded localhost URLs. For production, you have two options:

**Option A: Environment-based URLs (Recommended)**
- Update extension to detect environment
- Use production URLs when not on localhost

**Option B: Separate production extension**
- Build a production version with production URLs

## 🚀 Deployment Steps

### Backend API Deployment

1. **Build the API:**
   ```bash
   cd Fortress.Api
   dotnet publish -c Release -o ./publish
   ```

2. **Deploy to your hosting:**
   - Upload the `publish` folder to your server
   - Set environment to `Production`
   - Configure database connection
   - Set up reverse proxy (nginx/Apache) if needed

3. **Update appsettings.Production.json** with production values

### Frontend Deployment

1. **Build the frontend:**
   ```bash
   cd fortress-frontend
   npm run build
   ```

2. **Deploy:**
   - Upload the `.next` folder and other necessary files
   - Or use a platform like Vercel (recommended for Next.js)

3. **Set environment variable:**
   - `NEXT_PUBLIC_API_URL=http://myfortress.shop/api`

### Extension Update

Update the extension files to use production URLs:

**popup.js:**
```javascript
const apiUrl = process.env.NODE_ENV === 'production' 
  ? 'http://myfortress.shop/api' 
  : 'http://localhost:5254/api';
const frontendUrl = process.env.NODE_ENV === 'production'
  ? 'http://myfortress.shop'
  : 'http://localhost:3000';
```

**background.js:**
```javascript
const API_URL = process.env.NODE_ENV === 'production'
  ? 'http://myfortress.shop/api'
  : 'http://localhost:5254/api';
```

## 🔒 Security Considerations

1. **HTTPS**: Consider setting up SSL/TLS (Let's Encrypt is free)
   - Update URLs to `https://myfortress.shop`
   - Update CORS to allow HTTPS

2. **JWT Key**: Use a strong, unique key in production (not the default)

3. **Database**: Use a secure, production-grade database

4. **Environment Variables**: Store sensitive data in environment variables, not in config files

## 📝 Next Steps

1. Choose your hosting provider
2. Set up your production database
3. Deploy backend API
4. Deploy frontend
5. Update and republish extension
6. Test everything end-to-end

## 🆘 Troubleshooting

- **CORS errors**: Make sure your domain is in the CORS allowed origins
- **JWT errors**: Ensure Issuer/Audience match your domain
- **Extension not working**: Check that extension URLs point to production

---

**Note**: The current configuration supports both localhost (development) and myfortress.shop (production). Make sure to test thoroughly before going live!
