# ✅ Production Deployment Checklist

## Pre-Deployment

- [x] Server binds to `0.0.0.0` in production (server.js line 31)
- [x] Database auto-creates directory if missing (database.js line 10-12)
- [x] Database auto-seeds if empty (server.js line 40-45)
- [x] Health check endpoint exists (`/healthz`)
- [x] Socket.IO configured for production
- [x] Build script in package.json (`npm run build`)
- [x] Start script in package.json (`npm start`)
- [x] render.yaml configuration file created
- [x] .gitignore excludes sensitive files
- [x] Error handling in place
- [x] Graceful shutdown handlers (SIGTERM, SIGINT)

## Deployment Steps

1. **Commit all changes**
   ```bash
   git add .
   git commit -m "Production ready"
   git push origin main
   ```

2. **Deploy to Render**
   - Option A: Use `render.yaml` (automatic)
   - Option B: Manual setup via dashboard

3. **Verify deployment**
   - Check build logs
   - Visit `/healthz` endpoint
   - Test player and TV views
   - Verify WebSocket connection

## Post-Deployment Testing

### Basic Functionality
- [ ] Homepage loads
- [ ] TV page loads (`/tv`)
- [ ] Players can join
- [ ] Host can start game
- [ ] Questions display correctly
- [ ] Answers submit successfully
- [ ] Scores update in real-time
- [ ] Game completes successfully

### WebSocket Tests
- [ ] Socket connects on page load
- [ ] Real-time updates work
- [ ] Reconnection works after disconnect
- [ ] Multiple players can connect simultaneously

### Database Tests
- [ ] Questions load from database
- [ ] Game results are recorded
- [ ] No database errors in logs

## Known Working Configuration

```yaml
# render.yaml
services:
  - type: web
    name: henze-trivia
    env: node
    region: oregon
    plan: free
    buildCommand: cd web-app && npm install && npm run build
    startCommand: cd web-app && npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 3000
```

## Environment Variables (Optional)

These are set automatically, but you can override:
- `NODE_ENV` - Set to `production` by Render
- `PORT` - Set by Render (usually 10000)
- `ENFORCE_HTTPS` - Set to `false` (Render handles HTTPS)

## Monitoring

### Check Logs
```bash
# In Render dashboard, view logs for:
- "Server started" message
- "Database initialized" message
- "Loaded X questions" message
- Any error messages
```

### Health Check
```bash
curl https://your-app.onrender.com/healthz
# Should return: {"status":"ok","timestamp":...}
```

## Troubleshooting

### Build Fails
- Check Node version (should be 18+)
- Verify `package.json` has all dependencies
- Check build logs for specific errors

### Server Won't Start
- Verify `npm start` command is correct
- Check for port binding errors
- Ensure database directory can be created

### WebSocket Issues
- Render supports WebSockets on free tier
- Check browser console for connection errors
- Verify Socket.IO client version matches server

### Database Issues
- Database auto-creates on first run
- Check logs for "Database initialized" message
- Verify seed data loads successfully

## Performance Tips

### Free Tier Optimization
- App spins down after 15 min inactivity
- First request after spin-down takes ~30s
- Consider upgrading for always-on service

### Keep Alive (Optional)
Use a service like UptimeRobot to ping `/healthz` every 10 minutes

## Success Indicators

✅ Build completes without errors  
✅ Server starts and binds to port  
✅ Database initializes successfully  
✅ Questions load from database  
✅ Health check returns 200 OK  
✅ WebSocket connections work  
✅ Players can join and play  

## Support

If issues persist:
1. Check Render logs for errors
2. Test locally with `npm run build && npm start`
3. Verify all files are committed to Git
4. Review `RENDER_DEPLOY.md` for detailed guide
