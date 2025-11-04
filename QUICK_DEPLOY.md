# ⚡ Quick Deploy Reference

## 🚀 Deploy Now

```bash
./deploy.sh
```

## 🧪 Test First

```bash
cd web-app && npm run test:production
```

## 📋 Render Setup

**Automatic**: Push to GitHub, Render detects `render.yaml`

**Manual**:
- Build: `cd web-app && npm install && npm run build`
- Start: `cd web-app && npm start`

## ✅ Verify Deployment

```bash
# Health check
curl https://your-app.onrender.com/healthz

# Should return: {"status":"ok","timestamp":...}
```

## 🎮 URLs

- **Players**: `https://your-app.onrender.com`
- **TV**: `https://your-app.onrender.com/tv`

## 🔍 Check Status

1. Render Dashboard → Logs
2. Look for:
   - "Server started"
   - "Database initialized"
   - "Loaded X questions"

## ⚠️ Common Issues

| Issue | Fix |
|-------|-----|
| Build fails | Check `package.json` dependencies |
| Server won't start | Check Render logs for errors |
| No questions | Database auto-seeds on first run |
| WebSocket fails | Already configured, check browser console |

## 📚 Full Docs

- `DEPLOYMENT_READY.md` - Complete guide
- `RENDER_DEPLOY.md` - Detailed instructions
- `PRODUCTION_CHECKLIST.md` - Step-by-step

## 💡 Pro Tips

- Free tier spins down after 15 min
- First request takes ~30s to wake
- Use UptimeRobot to keep alive
- Upgrade to $7/mo for always-on

---

**Ready?** Run `./deploy.sh` 🚀
