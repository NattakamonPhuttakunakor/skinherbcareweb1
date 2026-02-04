document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname || '';
    if (path.endsWith('/login.html') || path.endsWith('/register.html')) {
        return;
    }
    const token = localStorage.getItem('token');
    const userRaw = localStorage.getItem('user');
    const user = userRaw ? JSON.parse(userRaw) : null;

    const style = document.createElement('style');
    style.textContent = `
        .profile-fab {
            position: fixed;
            top: 16px;
            right: 16px;
            width: 44px;
            height: 44px;
            border-radius: 50%;
            background: rgba(255,255,255,0.85);
            box-shadow: 0 6px 16px rgba(0,0,0,0.15);
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            z-index: 999;
            border: 1px solid rgba(0,0,0,0.06);
        }
        .profile-fab {
            overflow: hidden;
        }
        .profile-fab img {
            width: 100%;
            height: 100%;
            border-radius: 50%;
            object-fit: cover;
            display: none;
        }
        .profile-icon {
            position: relative;
            overflow: hidden;
        }
        .profile-icon img {
            width: 100%;
            height: 100%;
            border-radius: 50%;
            object-fit: cover;
            position: absolute;
            inset: 0;
            display: none;
        }
        .profile-icon svg {
            display: block;
        }
        .profile-icon.has-image svg {
            display: none;
        }
        .profile-icon img.profile-icon-img {
            width: 100%;
            height: 100%;
            border-radius: 50%;
            object-fit: cover;
            display: none;
        }
        .profile-icon .profile-icon-fallback {
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .profile-fab span { font-size: 20px; }
        .profile-drawer {
            position: fixed;
            top: 0;
            right: -320px;
            width: 320px;
            height: 100%;
            background: rgba(255,255,255,0.95);
            box-shadow: -8px 0 24px rgba(0,0,0,0.1);
            transition: right 0.25s ease;
            z-index: 1000;
            padding: 20px;
            backdrop-filter: blur(8px);
        }
        .profile-drawer.open { right: 0; }
        .profile-backdrop {
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.2);
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.2s ease;
            z-index: 900;
        }
        .profile-backdrop.show { opacity: 1; pointer-events: auto; }
        .profile-drawer-avatar {
            width: 72px;
            height: 72px;
            border-radius: 50%;
            object-fit: cover;
            border: 2px solid #a7f3d0;
            background: #ecfdf5;
        }
        .profile-drawer-btn {
            width: 100%;
            border: none;
            border-radius: 10px;
            padding: 10px 12px;
            font-weight: 600;
            cursor: pointer;
        }
        .profile-drawer-btn.primary { background: #34d399; color: #064e3b; }
        .profile-drawer-btn.ghost { background: #e5e7eb; color: #374151; }
    `;
    document.head.appendChild(style);

    const hasAdminSidebar = document.querySelector('.admin-sidebar-img') || document.querySelector('.admin-sidebar-name');

    const hasProfileIcon = document.querySelector('.profile-icon');
    let fab = null;
    if (!hasProfileIcon && !hasAdminSidebar) {
        fab = document.createElement('button');
        fab.className = 'profile-fab';
        fab.setAttribute('aria-label', 'Profile');
        fab.innerHTML = '<img id="profile-fab-img" alt="Profile"><span id="profile-fab-fallback">👤</span>';
        document.body.appendChild(fab);
    }

    const backdrop = document.createElement('div');
    backdrop.className = 'profile-backdrop';
    if (!hasAdminSidebar) {
        document.body.appendChild(backdrop);
    }

    const drawer = document.createElement('aside');
    drawer.className = 'profile-drawer';
    drawer.setAttribute('aria-hidden', 'true');
    drawer.innerHTML = `
        <div class="flex items-center justify-between mb-4">
            <h3 style="font-weight:700;color:#0f3d2e;">โปรไฟล์ผู้ใช้</h3>
            <button id="profile-close" class="profile-drawer-btn ghost" style="width:auto;padding:6px 10px;">ปิด</button>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-start;gap:6px;">
            <img id="profile-drawer-img" class="profile-drawer-avatar" src="" alt="Profile" style="display:none;">
            <div id="profile-drawer-fallback" class="profile-drawer-avatar" style="display:flex;align-items:center;justify-content:center;font-size:28px;color:#10b981;">👤</div>
            <div id="profile-drawer-name" style="font-weight:700;color:#0f3d2e;">ผู้ใช้งาน</div>
            <div id="profile-drawer-email" style="font-size:0.9rem;color:#6b7280;">-</div>
        </div>
        <div style="margin-top:16px;display:grid;gap:10px;">
            <label class="profile-drawer-btn ghost" for="profile-image-input" style="text-align:center;">เปลี่ยนรูปโปรไฟล์</label>
            <input id="profile-image-input" type="file" accept="image/*" style="display:none;">
            <button id="profile-logout" class="profile-drawer-btn primary">ออกจากระบบ</button>
        </div>
    `;
    if (!hasAdminSidebar) {
        document.body.appendChild(drawer);
    }

    const nameEl = drawer.querySelector('#profile-drawer-name');
    const emailEl = drawer.querySelector('#profile-drawer-email');
    const imgDrawer = drawer.querySelector('#profile-drawer-img');
    const fallbackDrawer = drawer.querySelector('#profile-drawer-fallback');
    const imgFab = fab ? fab.querySelector('#profile-fab-img') : null;
    const fallbackFab = fab ? fab.querySelector('#profile-fab-fallback') : null;
    const imageInput = drawer.querySelector('#profile-image-input');

    const fullName = user
        ? [user.firstName, user.lastName].filter(Boolean).join(' ') || user.name || user.username || 'ผู้ใช้งาน'
        : 'ผู้ใช้งาน';
    const email = user && user.email ? user.email : '-';
    const storageKey = email && email !== '-' ? `profileImage:${email}` : 'profileImage:guest';
    nameEl.textContent = fullName;
    emailEl.textContent = email;
    const sidebarNames = Array.from(document.querySelectorAll('.admin-sidebar-name'));
    sidebarNames.forEach((el) => { el.textContent = fullName; });

    const sidebarImgs = Array.from(document.querySelectorAll('.admin-sidebar-img'));

    const profileIconEls = Array.from(document.querySelectorAll('.profile-icon'));
    const ensureProfileIcon = (el) => {
        let img = el.querySelector('img.profile-icon-img');
        if (!img) {
            img = document.createElement('img');
            img.className = 'profile-icon-img';
            img.alt = 'Profile';
            el.appendChild(img);
        }
        let fb = el.querySelector('.profile-icon-fallback');
        if (!fb) {
            fb = document.createElement('span');
            fb.className = 'profile-icon-fallback';
            fb.textContent = el.textContent.trim() || '👤';
            el.appendChild(fb);
        }
        const svg = el.querySelector('svg');
        return { img, fb, svg };
    };

    const applyImage = (src) => {
        if (src) {
            imgDrawer.src = src;
            imgDrawer.style.display = 'block';
            fallbackDrawer.style.display = 'none';
            if (imgFab && fallbackFab) {
                imgFab.src = src;
                imgFab.style.display = 'block';
                fallbackFab.style.display = 'none';
            }
            profileIconEls.forEach((el) => {
                const { img, fb, svg } = ensureProfileIcon(el);
                img.src = src;
                img.style.display = 'block';
                fb.style.display = 'none';
                if (svg) svg.style.display = 'none';
            });
            sidebarImgs.forEach((img) => {
                img.src = src;
            });
        } else {
            imgDrawer.style.display = 'none';
            fallbackDrawer.style.display = 'flex';
            if (imgFab && fallbackFab) {
                imgFab.style.display = 'none';
                fallbackFab.style.display = 'inline';
            }
            profileIconEls.forEach((el) => {
                const { img, fb, svg } = ensureProfileIcon(el);
                img.style.display = 'none';
                fb.style.display = 'flex';
                if (svg) svg.style.display = '';
            });
        }
    };
    const legacyImage = localStorage.getItem('profileImage');
    if (!localStorage.getItem(storageKey) && legacyImage) {
        localStorage.setItem(storageKey, legacyImage);
    }
    applyImage(localStorage.getItem(storageKey));

    const openDrawer = () => {
        if (!token) {
            window.location.href = '/login.html';
            return;
        }
        drawer.classList.add('open');
        backdrop.classList.add('show');
        drawer.setAttribute('aria-hidden', 'false');
    };
    const closeDrawer = () => {
        drawer.classList.remove('open');
        backdrop.classList.remove('show');
        drawer.setAttribute('aria-hidden', 'true');
    };

    if (!hasAdminSidebar) {
        if (fab) fab.addEventListener('click', openDrawer);
        drawer.querySelector('#profile-close').addEventListener('click', closeDrawer);
        backdrop.addEventListener('click', closeDrawer);
    }

    if (!hasAdminSidebar) {
        drawer.querySelector('#profile-logout').addEventListener('click', () => {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            localStorage.removeItem('userRole');
            // keep per-user profile images
            window.location.href = '/login.html';
        });
    }

    imageInput.addEventListener('change', () => {
        const file = imageInput.files && imageInput.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const src = e.target.result;
            localStorage.setItem(storageKey, src);
            applyImage(src);
        };
        reader.readAsDataURL(file);
    });
});
