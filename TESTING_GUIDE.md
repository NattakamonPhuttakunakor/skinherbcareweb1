# 🧪 System Consistency Testing Guide

## Prerequisites
- Backend running on Render or locally
- MongoDB Atlas connected
- Admin account created

## ✅ Test Case 1: Admin Login & Navigation

### Step 1: Clear Browser Data
```
1. Open DevTools (F12)
2. Go to Application → Local Storage
3. Delete all entries for current domain
```

### Step 2: Create Admin Account
```bash
# In project root
node create-admin.js

# Default credentials will be:
# Email: admin@skinherbcare.com
# Password: admin123456
```

### Step 3: Test Login
1. Go to https://skinherbcareweb1.onrender.com/login.html (or localhost:5000/login.html)
2. Enter: `admin@skinherbcare.com`
3. Enter: `admin123456`
4. Click "Log In"

### Expected Behavior ✅
- Should redirect to `/admin-dashboard.html`
- Should see sidebar with:
  - Profile avatar: "Jureeporn zz" with "Admin" badge
  - Dashboard link highlighted in yellow (#FFC107)
  - Navigation items visible
- localStorage should contain:
  ```javascript
  {
    "token": "eyJhbGc...",
    "user": "{...user object...}",
    "userRole": "admin"  // ← NEW!
  }
  ```

---

## ✅ Test Case 2: Sidebar Consistency

### From Dashboard Page
1. Currently on `/admin-dashboard.html`
2. Sidebar shows "Dashboard" highlighted in yellow
3. Click "สมุนไพร" link

### Expected Behavior ✅
- Navigates to `/herb_list.html`
- **Sidebar persists** (doesn't disappear)
- "สมุนไพร" now highlighted in yellow
- Other nav items appear in gray

### Continue Testing
4. Click "โรคผิวหนัง" link
5. Navigates to `/disease_list.html`
6. **Sidebar persists**
7. "โรคผิวหนัง" now highlighted in yellow

8. Click "Dashboard" link
9. Back to `/admin-dashboard.html`
10. "Dashboard" highlighted in yellow again

### ✅ Result
Sidebar **never disappears** when navigating between admin pages.

---

## ✅ Test Case 3: Login State Detection on Home Page

### From Admin Dashboard
1. Currently at `/admin-dashboard.html`
2. Navbar shows: Home | 🌿 (no Login button visible)
3. Click "ไปหน้าเว็บไซต์" button

### Expected Behavior ✅
- Navigates to `/index.html`
- Navbar **automatically detects admin login**
- Navbar shows:
  ```
  Home | ⚙️ จัดการระบบ | Log Out | 👤
  ```
- **NOT** showing "Log In" and "Sign Up" buttons

### Verify in DevTools
```javascript
// Open Console and type:
localStorage.getItem('userRole')  // Should return: "admin"

// The navbar should have:
// - #guest-nav: display = none
// - #admin-nav: display = flex
```

### Test the "Manage System" Button
4. Click "⚙️ จัดการระบบ" button
5. Should navigate to `/admin-dashboard.html`
6. Should see sidebar again

---

## ✅ Test Case 4: Logout Flow

### From Index/Home Page
1. Currently at `/index.html`
2. Navbar shows "⚙️ จัดการระบบ" and "Log Out"
3. Click "Log Out" button

### Expected Behavior ✅
- Shows confirmation: "❓ ต้องการออกจากระบบหรือไม่?"
- Click "OK"
- All localStorage cleared:
  ```javascript
  localStorage.getItem('token')     // null
  localStorage.getItem('user')      // null
  localStorage.getItem('userRole')  // null ← KEY!
  ```
- Page reloads showing guest navbar:
  ```
  Home | Log In | Sign Up | 👤
  ```

### Continue Testing
4. Go to `/login.html`
5. Try logging in again
6. Should work normally

---

## ✅ Test Case 5: Regular User Login (Optional)

If you have a regular user account:

### Step 1: Register New User
1. Go to `/register.html`
2. Fill in details
3. Click "Sign Up"

### Step 2: Login as User
1. Go to `/login.html`
2. Use new user credentials
3. Click "Log In"

### Expected Behavior ✅
- Should redirect to `/user-dashboard.html` (not admin dashboard)
- localStorage should contain:
  ```javascript
  localStorage.getItem('userRole')  // "user" (not "admin")
  ```
- When visiting home page (`/index.html`):
  - Should show guest navbar: "Log In" and "Sign Up"
  - Should NOT show "⚙️ จัดการระบบ"

---

## ✅ Test Case 6: Mobile Responsive

### On Mobile Device/Browser Simulated
1. Open DevTools → Toggle Device Toolbar
2. Set to iPhone 12 Pro (390px width)
3. Login as admin
4. Test all navigation steps above

### Expected Behavior ✅
- Sidebar remains visible
- Navbar buttons properly sized
- All links clickable
- No layout breaking

---

## 🐛 Troubleshooting

### Issue: Sidebar disappears after navigation
**Solution:** 
- Clear browser cache: Ctrl+Shift+Delete
- Check console for JavaScript errors (F12)
- Verify all sidebar HTML code is identical in all 3 files

### Issue: Navbar still shows "Log In" after admin login
**Solution:**
- Check localStorage: `localStorage.getItem('userRole')`
- Should be `"admin"` (not `null`)
- If null, login.html didn't store it properly
- Reload index.html after login

### Issue: Logout doesn't work
**Solution:**
- Open DevTools → Console
- Check if `logout()` function exists: `typeof logout`
- Should return `"function"`
- Try logout again

### Issue: Can't access admin pages
**Solution:**
- Verify JWT token exists: `localStorage.getItem('token')`
- Should be non-empty string starting with `eyJ`
- Check if token is expired (API endpoint will return 401)
- Try logging in again

---

## 📊 Checklist for QA

- [ ] Admin login works
- [ ] Dashboard page loads with sidebar visible
- [ ] Can navigate Dashboard → Herbs → Diseases → Dashboard
- [ ] Sidebar persists on all admin pages
- [ ] Active nav link highlighted in yellow on each page
- [ ] Home page navbar shows "Manage System" when admin logged in
- [ ] Clicking "Manage System" returns to dashboard
- [ ] Logout clears all localStorage
- [ ] After logout, home navbar shows "Log In" and "Sign Up"
- [ ] Regular user login still works (redirects to user-dashboard)
- [ ] Mobile layout works properly
- [ ] No JavaScript errors in console

---

## 🔍 Browser DevTools Commands

```javascript
// Check login status
localStorage.getItem('userRole')

// Check if sidebar function exists
typeof logout

// Manually trigger navbar update
checkLoginStatus()

// Clear all data (for testing)
localStorage.clear()

// Check all stored data
Object.keys(localStorage).forEach(key => 
  console.log(key + ": " + localStorage.getItem(key))
)
```

---

## ✅ Sign-Off Checklist

When all tests pass:
- [ ] Take screenshots of admin pages
- [ ] Document any issues found
- [ ] Verify with user/stakeholder
- [ ] Update version number if applicable
- [ ] Create GitHub release/tag

---

**Last Updated:** 2025  
**Status:** Ready for Testing  
**Expected Time:** ~15-20 minutes for complete testing
