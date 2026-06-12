// ===== PAGE TRANSITION =====
function navigateTo(pageId) {
  const current = document.querySelector('.page.active');
  const target  = document.getElementById(pageId);
  if (!target || current === target) return;

  if (current) {
    current.classList.add('fade-out');
    setTimeout(() => {
      current.classList.remove('active', 'fade-out');
      current.style.display = 'none';
      showPage(target);
    }, 300);
  } else {
    showPage(target);
  }
}

function showPage(target) {
  target.style.display = pageDisplay(target.id);
  requestAnimationFrame(() => {
    target.classList.add('active', 'fade-in');
    setTimeout(() => target.classList.remove('fade-in'), 400);
  });
}

function pageDisplay(id) {
  if (id === 'page-dashboard') return 'flex';
  if (id === 'page-onboarding') return 'flex';
  return 'flex';
}

// ===== TAB SWITCH =====
function switchTab(tab) {
  const loginForm    = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const loginTab     = document.getElementById('loginTab');
  const registerTab  = document.getElementById('registerTab');

  if (tab === 'login') {
    loginForm.classList.remove('hidden');
    registerForm.classList.add('hidden');
    loginTab.classList.add('active');
    registerTab.classList.remove('active');
  } else {
    registerForm.classList.remove('hidden');
    loginForm.classList.add('hidden');
    registerTab.classList.add('active');
    loginTab.classList.remove('active');
  }

  document.getElementById('loginError').textContent    = '';
  document.getElementById('registerError').textContent = '';
}

// ===== LOGIN =====
function handleLogin() {
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value;
  const errorEl  = document.getElementById('loginError');

  if (!username || !password) {
    errorEl.textContent = 'Please fill in all fields.';
    return;
  }

  if (!validateUser(username, password)) {
    errorEl.textContent = 'Invalid username or password.';
    return;
  }

  errorEl.textContent = '';
  setCurrentUser(username);

  const profile = getProfile(username);
  if (!profile) {
    navigateTo('page-onboarding');
  } else {
    navigateTo('page-dashboard');
    initDashboard();
  }
}

// ===== REGISTER =====
function handleRegister() {
  const username = document.getElementById('regUsername').value.trim();
  const password = document.getElementById('regPassword').value;
  const confirm  = document.getElementById('regConfirm').value;
  const errorEl  = document.getElementById('registerError');

  if (!username || !password || !confirm) {
    errorEl.textContent = 'Please fill in all fields.';
    return;
  }

  if (username.length < 3) {
    errorEl.textContent = 'Username must be at least 3 characters.';
    return;
  }

  if (password.length < 6) {
    errorEl.textContent = 'Password must be at least 6 characters.';
    return;
  }

  if (password !== confirm) {
    errorEl.textContent = 'Passwords do not match.';
    return;
  }

  if (userExists(username)) {
    errorEl.textContent = 'Username already taken.';
    return;
  }

  errorEl.textContent = '';
  createUser(username, password);
  setCurrentUser(username);
  navigateTo('page-onboarding');
}

// ===== LOGOUT =====
function handleLogout() {
  clearCurrentUser();
  location.reload();
}

// ===== INIT =====
window.addEventListener('DOMContentLoaded', () => {
  const user = getCurrentUser();
  if (user) {
    const profile = getProfile(user);
    if (profile) {
      navigateTo('page-dashboard');
      setTimeout(() => initDashboard(), 450);
    } else {
      navigateTo('page-onboarding');
    }
  }
});