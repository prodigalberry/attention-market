# AttentionEx — Deployment Guide
## Live Attention Market · Viewer-Pegged Synthetic Asset

---

## ✅ What's in this folder

```
attention-market/
├── public/
│   └── index.html        ← The HTML shell
├── src/
│   ├── index.js          ← React entry point
│   └── App.js            ← The full trading dashboard
├── package.json          ← Project config & dependencies
├── vercel.json           ← Vercel deployment config
└── .gitignore            ← Files to exclude from Git
```

---

## 🚀 Deploy to Vercel (Step-by-Step)

### STEP 1 — Install Node.js (if you don't have it)
1. Go to https://nodejs.org
2. Download the **LTS version** (big green button)
3. Install it — just click Next through the installer
4. To verify: open Terminal (Mac) or Command Prompt (Windows) and type:
   ```
   node --version
   ```
   You should see something like `v20.x.x`

---

### STEP 2 — Create a GitHub account (if you don't have one)
1. Go to https://github.com
2. Click **Sign up** — it's free
3. Verify your email

---

### STEP 3 — Upload this project to GitHub
1. Go to https://github.com/new
2. Name your repo: `attention-market`
3. Leave it **Public**
4. Click **Create repository**
5. On the next page, click **"uploading an existing file"**
6. Drag and drop ALL the files from this folder into the browser
   (make sure to include the `src/` and `public/` folders)
7. Click **Commit changes**

---

### STEP 4 — Deploy on Vercel
1. Go to https://vercel.com
2. Click **Sign Up** → choose **Continue with GitHub**
3. Authorize Vercel to access your GitHub
4. Click **"Add New Project"**
5. Find `attention-market` in the list → click **Import**
6. Vercel will auto-detect it as a React app
7. Leave all settings as default
8. Click **Deploy** 🚀

---

### STEP 5 — You're live!
After ~60 seconds, Vercel gives you a URL like:
```
https://attention-market-yourname.vercel.app
```

Share it with anyone. It works on mobile too.

---

## 🔄 How to update the app later

1. Edit `src/App.js` on GitHub (click the file → pencil icon)
2. Commit the change
3. Vercel automatically redeploys — your URL updates in ~30 seconds

---

## 🛠️ Run it locally (optional)

If you want to test changes on your own computer before deploying:

```bash
# 1. Open Terminal in this folder
cd attention-market

# 2. Install dependencies (only needed once)
npm install

# 3. Start the local dev server
npm start

# 4. Opens at http://localhost:3000
```

---

## ❓ Troubleshooting

| Problem | Fix |
|---|---|
| "node is not recognized" | Restart Terminal after installing Node.js |
| Build fails on Vercel | Check that all files were uploaded including `src/` folder |
| Blank white screen | Open browser console (F12) and share the error |
| App looks broken on mobile | It's designed for desktop — works best at 1200px+ width |

---

## 📌 Notes

- This is a **frontend simulation** — no real money, no real blockchain calls
- To connect real Solana/Twitch APIs, see the architecture document
- The bonding curve, oracle EWMA, and FSM are all running live in the browser

---

*Built with React · Deployed on Vercel · Architecture: AttentionEx v1.0*
