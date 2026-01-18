# 🚀 Setup Instructions for Render Deployment

## Required Environment Variables on Render

To make the website work properly on Render, you need to set these environment variables:

### 1. **Database Connection** (Already Set ✅)
- `MONGO_URI`: Your MongoDB Atlas connection string

### 2. **Authentication** (Critical ⚠️)
- `JWT_SECRET`: Any long random string for securing login tokens
  - Example: `my_secret_key_12345_change_this_in_production`

### 3. **AI Processing** (Critical for Image Analysis ⚠️)
- `GEMINI_API_KEY`: Your Google Gemini API key
  - Get it from: https://aistudio.google.com/app/apikey
  - Required for disease/herb image analysis features

## Steps to Add Environment Variables on Render

1. Go to https://dashboard.render.com/
2. Select your **skinherbcareweb1** project
3. Click **Environment** in the left sidebar
4. Click **Add Environment Variable** button
5. Fill in each variable:
   - **Name**: (e.g., JWT_SECRET)
   - **Value**: (e.g., your_actual_key_here)
6. Click **Save**
7. **Important**: Service will redeploy automatically ✅

## Checklist Before Full Launch

- [ ] JWT_SECRET is set
- [ ] GEMINI_API_KEY is set
- [ ] MONGO_URI is set
- [ ] Service redeployed successfully
- [ ] Test registration page (should work without errors)
- [ ] Test image upload (disease/herb analysis)
- [ ] Test symptom analysis (should show herbs)

## Features That Depend on Each Variable

| Variable | Feature |
|----------|---------|
| MONGO_URI | Database, user accounts, disease/herb data |
| JWT_SECRET | User registration, login, authentication |
| GEMINI_API_KEY | Disease detection, herb identification from images |

## Troubleshooting

**Error: "API Key not found"**
- Make sure GEMINI_API_KEY is set on Render
- Check that it's not a placeholder value

**Error: "Route not found"**
- Endpoints should now work after the latest deployment
- Clear browser cache if needed

**Error: "secretOrPrivateKey must have a value"**
- JWT_SECRET is missing or empty on Render
- Set it to any non-empty string

---

## Get Your API Keys

### Google Gemini API Key
1. Go to https://aistudio.google.com/app/apikey
2. Click "Create API Key"
3. Copy the key
4. Add to Render environment variables as `GEMINI_API_KEY`

---

**Questions?** Check the error messages in the browser console (F12 → Console tab)
