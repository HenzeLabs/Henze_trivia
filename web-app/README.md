# Henze Trivia Web App

Jackbox-style trivia game for phones. Deploy to Vercel in 2 minutes.

## Quick Deploy

```bash
cd web-app
npm install
npm run build
```

Then push to GitHub and connect to Vercel, or:

```bash
npx vercel --prod
```

## How It Works

1. Host opens the deployed URL
2. Players join on their phones via the same URL
3. Host starts the game
4. Players tap answers on their phones
5. Real-time scoring and results

## Add Your Questions

Edit `pages/api/socket.js` and replace the `questions` array with your generated trivia questions.

## Features

- ✅ Real-time multiplayer via Socket.IO
- ✅ Mobile-friendly interface
- ✅ Automatic scoring
- ✅ Host controls
- ✅ Works on any device with a browser

Perfect for parties, game nights, or roasting your friends with personalized trivia! 🎮