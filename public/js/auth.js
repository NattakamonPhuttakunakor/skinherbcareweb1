const AUTH_JS_VERSION = '20260211r12';

function getAuthSnapshot() {
  const token = localStorage.getItem('token')
    || localStorage.getItem('userToken')
    || sessionStorage.getItem('token')
    || sessionStorage.getItem('userToken');
  const userRaw = localStorage.getItem('user') || sessionStorage.getItem('user');
  let user = null;
  try {
    user = userRaw ? JSON.parse(userRaw) : null;
  } catch (_) {
    user = null;
  }
  const role = String(
    user?.role
    || user?.userRole
    || localStorage.getItem('userRole')
    || sessionStorage.getItem('userRole')
    || 'user'
  ).toLowerCase();
  return { token, userRaw, user, role, isLoggedIn: Boolean(token || userRaw), isAdmin: Boolean(token) && role === 'admin' };
}

function logout() {
  const msg = 'ต้องการออกจากระบบหรือไม่?';
  if (!confirm(msg)) return;
  localStorage.removeItem('token');
  localStorage.removeItem('userToken');
  localStorage.removeItem('user');
  localStorage.removeItem('userRole');
  localStorage.removeItem('adminToken');
  sessionStorage.removeItem('token');
  sessionStorage.removeItem('userToken');
  sessionStorage.removeItem('user');
  sessionStorage.removeItem('userRole');
  window.location.href = '/index.html';
}

function applyAuthNavState() {
  const snap = getAuthSnapshot();
  const guestNav = document.getElementById('guest-nav');
  const adminNav = document.getElementById('admin-nav');

  const loginLinks = Array.from(document.querySelectorAll('a[href$="/login.html"], a[href="login.html"], a[href="/login"]'));
  const registerLinks = Array.from(document.querySelectorAll('a[href$="/register.html"], a[href="register.html"], a[href="/register"]'));

  loginLinks.forEach((el) => el.style.setProperty('display', snap.isLoggedIn ? 'none' : '', 'important'));
  registerLinks.forEach((el) => el.style.setProperty('display', snap.isLoggedIn ? 'none' : '', 'important'));

  if (guestNav) {
    guestNav.style.setProperty('display', snap.isAdmin ? 'none' : 'flex', 'important');
  }
  if (adminNav) {
    adminNav.style.setProperty('display', snap.isAdmin ? 'flex' : 'none', 'important');
  }

  const adminLinks = Array.from(document.querySelectorAll('a[href="/admin-dashboard.html"], a[href="admin-dashboard.html"]'));
  adminLinks.forEach((el) => el.style.setProperty('display', snap.isAdmin ? 'inline-flex' : 'none', 'important'));

  // Ensure regular user sees a logout action in guest nav on every page.
  const host = guestNav || loginLinks[0]?.parentElement;
  if (!host) return;

  let logoutBtn = host.querySelector('[data-auth-logout="true"]');
  if (snap.isLoggedIn && !snap.isAdmin) {
    if (!logoutBtn) {
      logoutBtn = document.createElement('button');
      logoutBtn.type = 'button';
      logoutBtn.textContent = 'Log Out';
      logoutBtn.setAttribute('data-auth-logout', 'true');
      logoutBtn.style.border = 'none';
      logoutBtn.style.background = 'none';
      logoutBtn.style.cursor = 'pointer';
      logoutBtn.style.fontWeight = '600';
      logoutBtn.style.padding = '6px 12px';
      logoutBtn.style.borderRadius = '8px';
      logoutBtn.style.color = '#064e3b';
      logoutBtn.addEventListener('click', logout);
      host.appendChild(logoutBtn);
    }
    logoutBtn.style.display = 'inline-flex';
  } else if (logoutBtn) {
    logoutBtn.remove();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.documentElement.setAttribute('data-auth-js', AUTH_JS_VERSION);
  applyAuthNavState();
});

window.addEventListener('pageshow', applyAuthNavState);
window.addEventListener('storage', applyAuthNavState);
setInterval(applyAuthNavState, 1000);

window.logout = logout;
