// ===== STORAGE KEYS =====
const KEYS = {
  USERS:        'ff_users',
  CURRENT_USER: 'ff_current_user',
  PROFILE:      'ff_profile_',
  PLAN:         'ff_plan_',
  STREAK:       'ff_streak_',
  TASKS:        'ff_tasks_',
  WEIGHT_LOG:   'ff_weight_log_',
  LAST_DONE:    'ff_last_done_',
};

// ===== USER STORAGE =====
function getUsers() {
  return JSON.parse(localStorage.getItem(KEYS.USERS) || '{}');
}

function saveUsers(users) {
  localStorage.setItem(KEYS.USERS, JSON.stringify(users));
}

function userExists(username) {
  return !!getUsers()[username];
}

function createUser(username, password) {
  const users = getUsers();
  users[username] = { password, createdAt: Date.now() };
  saveUsers(users);
}

function validateUser(username, password) {
  const users = getUsers();
  return users[username] && users[username].password === password;
}

// ===== SESSION =====
function setCurrentUser(username) {
  localStorage.setItem(KEYS.CURRENT_USER, username);
}

function getCurrentUser() {
  return localStorage.getItem(KEYS.CURRENT_USER);
}

function clearCurrentUser() {
  localStorage.removeItem(KEYS.CURRENT_USER);
}

// ===== PROFILE =====
function saveProfile(username, profile) {
  localStorage.setItem(KEYS.PROFILE + username, JSON.stringify(profile));
}

function getProfile(username) {
  return JSON.parse(localStorage.getItem(KEYS.PROFILE + username) || 'null');
}

// ===== PLAN =====
function savePlan(username, plan) {
  localStorage.setItem(KEYS.PLAN + username, JSON.stringify(plan));
}

function getPlan(username) {
  return JSON.parse(localStorage.getItem(KEYS.PLAN + username) || 'null');
}

// ===== STREAK =====
function getStreak(username) {
  return JSON.parse(localStorage.getItem(KEYS.STREAK + username) || JSON.stringify({
    current: 0,
    best: 0,
    total: 0,
    history: []
  }));
}

function saveStreak(username, streak) {
  localStorage.setItem(KEYS.STREAK + username, JSON.stringify(streak));
}

// ===== TASKS =====
function getTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;
}

function getTaskState(username) {
  return JSON.parse(localStorage.getItem(KEYS.TASKS + username + '_' + getTodayKey()) || 'null');
}

function saveTaskState(username, state) {
  localStorage.setItem(KEYS.TASKS + username + '_' + getTodayKey(), JSON.stringify(state));
}

function getLastDone(username) {
  return localStorage.getItem(KEYS.LAST_DONE + username) || null;
}

function setLastDone(username, dateKey) {
  localStorage.setItem(KEYS.LAST_DONE + username, dateKey);
}

// ===== WEIGHT LOG =====
function getWeightLog(username) {
  return JSON.parse(localStorage.getItem(KEYS.WEIGHT_LOG + username) || '[]');
}

function saveWeightLog(username, log) {
  localStorage.setItem(KEYS.WEIGHT_LOG + username, JSON.stringify(log));
}

function updateCurrentWeight(username, newWeight) {
  const log = getWeightLog(username);
  log.push({ weight: newWeight, date: getTodayKey(), timestamp: Date.now() });
  saveWeightLog(username, log);
  const profile = getProfile(username);
  if (profile) {
    profile.currentWeight = newWeight;
    saveProfile(username, profile);
  }
}

function getCurrentWeight(username) {
  const profile = getProfile(username);
  return profile ? profile.currentWeight : null;
}