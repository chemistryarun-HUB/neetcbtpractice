# NEETCBT — Setup Guide

## 1. Create Supabase Project

1. Go to https://supabase.com → New Project
2. Copy **Project URL** and **anon public key** from Settings → API

## 2. Configure Environment Variables

Edit `.env` in the project root:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

## 3. Run Database Schema

In Supabase → SQL Editor, paste and run the entire contents of `supabase_schema.sql`.

## 4. Enable Google OAuth (for Faculty login)

In Supabase → Authentication → Providers → Google:
- Enable Google provider
- Add Client ID and Secret from Google Cloud Console
- Set redirect URL: `https://your-project.supabase.co/auth/v1/callback`

In Supabase → Authentication → URL Configuration:
- Site URL: `https://your-vercel-app.vercel.app`
- Redirect URLs: add `https://your-vercel-app.vercel.app/faculty/dashboard`

## 5. Local Development

```bash
npm install
npm run dev
# Open http://localhost:5173
```

## 6. Deploy to Vercel

```bash
npm install -g vercel
vercel
```

Set environment variables in Vercel dashboard:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## 7. Login Credentials

| Role    | How to login                      | Credentials                        |
|---------|-----------------------------------|------------------------------------|
| Admin   | /student/login?admin=1 (Admin btn)| admin@neetcbt.in / Admin@2025       |
| Faculty | Google OAuth                      | Any Gmail (needs profile setup)    |
| Student | Roll Number + Password            | Added by Faculty via Excel import  |

## 8. Excel Import Format (Students)

Columns required (exact names):
- Class
- Student Name
- Roll No
- Password
- Phone no of student
- Phone no of father
- Phone no of mother

## 9. Excel Upload Format (Questions)

Columns required:
- QID, Subject, Unit, Chapter, Level, Question
- Option1, Option2, Option3, Option4
- Correct Answer, Difficulty, Tag, Source

Level numbers map to:
- 1 = Transition Elements Intro
- 2 = General Trends in Properties
- 3 = Oxides and Oxoanions
- 4 = KMnO4
- 5 = K2Cr2O7
- 6 = Lanthanoids
- 7 = Actinoids
- 8 = Miscellaneous
- 9 = Complete Chapter Test

## 10. How Unlock Logic Works

Each level allows up to 3 unlock attempts:
- Attempt 1: score ≥ 60% → next level unlocks
- Attempt 2: score ≥ 50% → next level unlocks
- Attempt 3: score ≥ 40% → next level unlocks

Students can always click "Practice More" even after unlocking.
