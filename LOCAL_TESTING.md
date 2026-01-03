# Local Testing Guide

This guide will help you test Fortress locally before deploying to `myfortress.shop`.

## ✅ Current Setup

Your configuration is set up for local testing:
- **Backend API**: `http://localhost:5254`
- **Frontend**: `http://localhost:3000`
- **Email Domain**: `@myfortress.shop` (updated in code ✅)
- **Database**: Local PostgreSQL

## 🧪 Testing Checklist

### 1. Start Backend API

```bash
cd Fortress.Api
dotnet run
```

**Verify:**
- API is running on `http://localhost:5254`
- Swagger UI accessible at `http://localhost:5254/swagger`
- No database connection errors

### 2. Start Frontend

```bash
cd fortress-frontend
npm run dev
```

**Verify:**
- Frontend is running on `http://localhost:3000`
- Can access login/register pages
- API calls work (check browser console)

### 3. Load Extension

1. Open Chrome/Edge → `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `fortress-extension` folder

**Verify:**
- Extension icon appears in toolbar
- Extension popup opens
- No errors in extension console

### 4. Test Full Flow

#### A. Registration
1. Go to `http://localhost:3000/register`
2. Register a new account
3. ✅ Verify: Registration succeeds
4. ✅ Verify: Extension detects login (icon turns colored)

#### B. Identity Generation (Signup Page)
1. Go to your signup page (or any page with email/password fields)
2. Click the F icon next to email field
3. ✅ Verify: Email alias is generated with `@myfortress.shop` domain
4. ✅ Verify: Fields are auto-filled
5. ✅ Verify: Identity appears in dashboard

#### C. Identity Filling (Login Page)
1. Go to your login page
2. Click the F icon
3. ✅ Verify: Existing identity is filled (not generated new one)
4. ✅ Verify: Correct email and password are filled

#### D. Dashboard
1. Go to `http://localhost:3000/dashboard`
2. ✅ Verify: All identities are listed
3. ✅ Verify: Can view decrypted passwords
4. ✅ Verify: Can delete identities

### 5. Test Email Domain

**Check generated emails:**
- Generated identities should have `@myfortress.shop` domain
- Example: `netflix.abc123@myfortress.shop`

**Note:** The email domain is just for display/testing. Actual email forwarding requires:
- Email service setup (like SendGrid, Mailgun, etc.)
- Webhook endpoint configuration
- DNS MX records for `myfortress.shop`

## 🔍 Debugging Tips

### Check Console Logs

**Frontend Console (F12):**
- Look for API errors
- Check network requests to `localhost:5254`

**Extension Console:**
- Right-click extension icon → "Inspect popup"
- Check for authentication errors
- Verify API calls are working

**Backend Logs:**
- Check terminal where `dotnet run` is running
- Look for request logs and errors

### Common Issues

1. **CORS Errors:**
   - Make sure backend CORS allows `http://localhost:3000`
   - Check `Program.cs` CORS configuration

2. **401 Unauthorized:**
   - Make sure you're logged in
   - Check JWT token in localStorage (F12 → Application → Local Storage)
   - Verify token is being sent in requests

3. **Extension Not Working:**
   - Reload extension after code changes
   - Check extension console for errors
   - Verify API URL in `background.js` and `popup.js`

4. **Fields Not Filling:**
   - Check browser console for errors
   - Verify fields are visible (not hidden)
   - Check if page context is detected correctly

## 📝 Testing Scenarios

### Scenario 1: New User Flow
1. Clear browser data (or use incognito)
2. Register new account
3. Generate identity on signup page
4. Navigate to login page
5. Fill existing identity
6. ✅ All should work smoothly

### Scenario 2: Multiple Services
1. Generate identities for different services (Netflix, Amazon, etc.)
2. ✅ Verify each has unique email alias
3. ✅ Verify all appear in dashboard
4. ✅ Verify can fill correct identity on each service's page

### Scenario 3: Error Handling
1. Try generating identity without being logged in
2. ✅ Should show login prompt
3. Try accessing dashboard without token
4. ✅ Should redirect to login

## 🚀 Ready for Production?

Before deploying, ensure:
- [ ] All local tests pass
- [ ] Email domain `@myfortress.shop` is working in generated identities
- [ ] No console errors
- [ ] Extension works on multiple websites
- [ ] Database migrations are up to date
- [ ] Production configuration files are ready

## 🔄 Next Steps After Local Testing

Once local testing is complete:
1. Review `DEPLOYMENT.md` for production setup
2. Set up production database
3. Configure production environment variables
4. Deploy backend API
5. Deploy frontend
6. Update extension for production URLs
7. Test on production domain

---

**Happy Testing! 🧪**
