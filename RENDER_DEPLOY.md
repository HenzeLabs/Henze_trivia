# 🚀 Render Deployment Guide

## Quick Deploy

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Ready for Render deployment"
   git push origin main
   ```

2. **Create Render Service**
   - Go to [render.com](https://render.com)
   - Click "New +" → "Web Service"
   - Connect your GitHub repo
   - Render will auto-detect `render.yaml`

3. **Done!** Your app will be live at `https://your-app.onrender.com`

---

## Manual Configuration (if render.yaml doesn't work)

### Build Settings
- **Build Command**: `cd web-app && npm install && npm run build`
- **Start Command**: `cd web-app && npm start`
- **Environment**: Node

### Environment Variables
Set these in Render dashboard:
- `NODE_ENV` = `production`
- `PORT` = `3000` (Render sets this automatically)

---

## What's Already Fixed

✅ **Port Binding** - Server binds to `0.0.0.0` in production  
✅ **Database Seeding** - Auto-seeds on first deploy  
✅ **Build Process** - Next.js builds correctly  
✅ **Socket.IO** - Configured for production  
✅ **Health Check** - `/healthz` endpoint available  

---

## Testing Your Deployment

After deployment:

1. **Check Health**: Visit `https://your-app.onrender.com/healthz`
2. **Open Player View**: `https://your-app.onrender.com`
3. **Open TV View**: `https://your-app.onrender.com/tv`

---

## Common Issues & Fixes

### "Application failed to respond"
- Check Render logs for errors
- Verify build completed successfully
- Ensure `npm start` runs without errors

### "No questions loaded"
- Database auto-seeds on first start
- Check logs for "Database seeded successfully"

### WebSocket connection fails
- Render's free tier supports WebSockets
- Check browser console for connection errors
- Verify Socket.IO client connects to correct URL

---

## Free Tier Limitations

⚠️ **Render Free Tier**:
- Spins down after 15 minutes of inactivity
- Takes ~30 seconds to wake up
- 750 hours/month free

💡 **Tip**: Keep the app awake by pinging `/healthz` every 10 minutes

---

## Logs & Debugging

View logs in Render dashboard:
- Build logs show compilation
- Runtime logs show server activity
- Look for "Server started" message

---

## Need Help?

Check these files:
- `web-app/server.js` - Main server
- `web-app/package.json` - Scripts
- `render.yaml` - Deployment config
