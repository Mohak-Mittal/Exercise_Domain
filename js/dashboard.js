// ===== INIT DASHBOARD =====
function initDashboard() {
  const user    = getCurrentUser();
  const profile = getProfile(user);
  const plan    = getPlan(user);

  if (!user || !profile || !plan) return;

  setGreeting(profile.name);
  setDate();
  loadStreakBadge(user);
  loadTodayTasks(user, plan);
  loadStreakSection(user);
  loadProgressSection(user, profile);
  loadProfileSection(profile, plan);
}

// ===== GREETING =====
function setGreeting(name) {
  const hour = new Date().getHours();
  let greet  = 'Good morning';
  if (hour >= 12 && hour < 17) greet = 'Good afternoon';
  if (hour >= 17) greet = 'Good evening';
  document.getElementById('dash-greeting').textContent = `${greet}, ${name}! 💪`;
}

// ===== DATE =====
function setDate() {
  const d = new Date();
  document.getElementById('dash-date').textContent = d.toLocaleDateString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
}

// ===== STREAK BADGE =====
function loadStreakBadge(user) {
  const streak = getStreak(user);
  document.getElementById('topbar-streak').textContent = `${streak.current} day streak`;
}

// ===== TODAY'S TASKS =====
function loadTodayTasks(user, plan) {
  const streak      = getStreak(user);
  const dayIndex    = streak.total % 7;
  const todayPlan   = plan.days[dayIndex];
  const taskList    = document.getElementById('taskList');
  const completeBtn = document.getElementById('completeBtn');
  const dayLabel    = document.getElementById('today-day-label');

  dayLabel.textContent = `Day ${streak.total + 1} — ${todayPlan.name}`;

  const weekNum    = Math.floor(streak.total / 7);
  const multiplier = 1 + (weekNum * 0.1);

  let taskState = getTaskState(user);
  if (!taskState) {
    taskState = todayPlan.exercises.map((ex, i) => ({
      id:     i,
      name:   ex.name,
      emoji:  ex.emoji || '💪',
      sets:   Math.round(ex.sets * multiplier),
      reps:   ex.reps,
      rest:   ex.rest,
      detail: ex.detail,
      done:   false
    }));
    saveTaskState(user, taskState);
  }

  // ===== EXERCISE SECTION =====
  let html = `<div class="today-columns">
  <div class="today-left">
  <div class="today-section-label">🏋️ Exercises</div>`;
  taskState.forEach((task, i) => {
    html += `
      <div class="task-item ${task.done ? 'done' : ''}" onclick="toggleTask('${user}', ${i})">
        <div class="task-emoji">${task.emoji}</div>
        <div class="task-checkbox">${task.done ? '✓' : ''}</div>
        <div class="task-info">
          <div class="task-name">${task.name}</div>
          <div class="task-detail">${task.sets} sets × ${task.reps} — Rest: ${task.rest}</div>
          <div class="task-tip">${task.detail}</div>
        </div>
      </div>
    `;
  });
  html += `</div><div class="today-right">`;
  // ===== MEAL SECTION =====
  if (todayPlan.meals) {
    const meals = todayPlan.meals;
    const mealEmojis  = { breakfast: '🌅', lunch: '☀️', dinner: '🌙', snack: '🍎' };
    const mealColors  = { breakfast: 'var(--gold)', lunch: 'var(--red-light)', dinner: '#818CF8', snack: 'var(--success)' };

    html += `<div class="today-section-label" style="margin-top:28px;">🥗 Today's Meals</div>`;
    html += `<div class="meals-grid">`;
    Object.entries(meals).forEach(([type, meal]) => {
      html += `
        <div class="meal-card">
          <div class="meal-header">
            <span class="meal-emoji">${mealEmojis[type] || '🍽️'}</span>
            <span class="meal-type" style="color:${mealColors[type] || 'var(--gold)'}">${capitalize(type)}</span>
          </div>
          <div class="meal-name">${meal.name}</div>
          <div class="meal-detail">${meal.detail}</div>
          <div class="meal-macros">
            <span class="macro"><span class="macro-val">${meal.calories}</span> kcal</span>
            <span class="macro"><span class="macro-val">${meal.protein}g</span> protein</span>
          </div>
        </div>
      `;
    });
    html += `</div></div>`;
  }

  taskList.innerHTML = html;
  updateRing(taskState);

  const alreadyDone = getLastDone(user) === getTodayKey();
  const allDone     = taskState.every(t => t.done);

  if (allDone && !alreadyDone) {
    completeBtn.classList.remove('hidden');
  } else {
    completeBtn.classList.add('hidden');
  }
}

// ===== TOGGLE TASK =====
function toggleTask(user, index) {
  const alreadyDone = getLastDone(user) === getTodayKey();
  if (alreadyDone) return;

  const state = getTaskState(user);
  if (!state) return;

  state[index].done = !state[index].done;
  saveTaskState(user, state);

  const plan = getPlan(user);
  loadTodayTasks(user, plan);
}

// ===== UPDATE RING =====
function updateRing(taskState) {
  const total   = taskState.length;
  const done    = taskState.filter(t => t.done).length;
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);
  const circumf = 364.4;
  const offset  = circumf - (circumf * percent / 100);

  document.getElementById('ring-percent').textContent = `${percent}%`;
  document.getElementById('ringFill').style.strokeDashoffset = offset;
}

// ===== COMPLETE DAY =====
function completeDay() {
  const user   = getCurrentUser();
  const streak = getStreak(user);
  const today  = getTodayKey();
  const last   = getLastDone(user);

  const yesterday     = getYesterdayKey();
  const isConsecutive = (last === yesterday || last === null || streak.current === 0);

  if (isConsecutive) {
    streak.current += 1;
  } else {
    streak.current = 1;
  }

  streak.total += 1;
  streak.best   = Math.max(streak.best, streak.current);
  if (!streak.history) streak.history = [];
  streak.history.push(today);

  saveStreak(user, streak);
  setLastDone(user, today);

  document.getElementById('completeBtn').classList.add('hidden');
  loadStreakBadge(user);
  loadStreakSection(user);

  showToast(`🔥 Day complete! Streak: ${streak.current} days`);
}

function getYesterdayKey() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;
}

// ===== STREAK SECTION =====
function loadStreakSection(user) {
  const streak = getStreak(user);
  document.getElementById('streak-current').textContent = streak.current;
  document.getElementById('streak-best').textContent    = streak.best;
  document.getElementById('streak-total').textContent   = streak.total;

  // ===== CALENDAR =====
  const calendar = document.getElementById('streakCalendar');
  calendar.innerHTML = '';
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key     = `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;
    const isDone  = streak.history && streak.history.includes(key);
    const isToday = i === 0;
    const el      = document.createElement('div');
    el.className  = `cal-day ${isDone ? 'completed' : ''} ${isToday ? 'today' : ''}`;
    el.textContent = d.getDate();
    calendar.appendChild(el);
  }

  // ===== ACHIEVEMENTS =====
  const achievements = [
    { streak: 1,   icon: '🌱', title: 'First Step',       desc: 'Complete your first day'          },
    { streak: 3,   icon: '🔥', title: 'On Fire',          desc: '3 days in a row'                  },
    { streak: 7,   icon: '⚡', title: 'One Week Warrior', desc: 'Full week completed'              },
    { streak: 10,  icon: '💪', title: 'Iron Will',        desc: '10 day streak achieved'           },
    { streak: 14,  icon: '🏅', title: 'Two Week Beast',   desc: '14 consecutive days'              },
    { streak: 21,  icon: '🧠', title: 'Habit Formed',     desc: '21 days = habit formed'           },
    { streak: 30,  icon: '🏆', title: 'Month Crusher',    desc: 'Full month of consistency'        },
    { streak: 45,  icon: '💎', title: 'Diamond Grinder',  desc: '45 days of pure dedication'       },
    { streak: 60,  icon: '🚀', title: 'Rocket Mode',      desc: "60 days you're unstoppable"       },
    { streak: 75,  icon: '👑', title: 'Royalty',          desc: '75 days of elite performance'     },
    { streak: 90,  icon: '🌟', title: '90 Day Legend',    desc: 'Three months of greatness'        },
    { streak: 100, icon: '💯', title: 'Century Club',     desc: '100 day milestone unlocked'       },
    { streak: 120, icon: '🔱', title: 'Poseidon',         desc: '120 days of relentless grind'     },
    { streak: 150, icon: '⚔️', title: 'Spartan',          desc: '150 days warrior mentality'       },
    { streak: 180, icon: '🌊', title: 'Half Year Hero',   desc: 'Six months of pure discipline'    },
    { streak: 200, icon: '🛡️', title: 'Ironclad',         desc: '200 days unbroken'                },
    { streak: 250, icon: '🌙', title: 'Dark Knight',      desc: '250 days in the shadows grinding' },
    { streak: 300, icon: '☀️', title: 'Solar Flare',      desc: '300 days burning bright'          },
    { streak: 365, icon: '🎖️', title: 'Full Year God',    desc: 'An entire year of consistency'    },
    { streak: 500, icon: '🌌', title: 'Transcendent',     desc: '500 days you are legendary'       },
  ];

  const achGrid = document.getElementById('achievementGrid');
  if (!achGrid) return;

  achGrid.innerHTML = achievements.map(a => {
    const unlocked = streak.best >= a.streak;
    return `
      <div class="achievement-card ${unlocked ? 'unlocked' : 'locked'}">
        <div class="ach-icon">${unlocked ? a.icon : '🔒'}</div>
        <div class="ach-info">
          <div class="ach-title">${a.title}</div>
          <div class="ach-desc">${unlocked ? a.desc : 'Reach ' + a.streak + ' day streak'}</div>
        </div>
        ${unlocked ? '<div class="ach-badge">✓</div>' : ''}
      </div>
    `;
  }).join('');
}

// ===== PROGRESS SECTION =====
function loadProgressSection(user, profile) {
  document.getElementById('prog-start').textContent   = profile.startWeight;
  document.getElementById('prog-current').textContent = profile.currentWeight;
  document.getElementById('prog-target').textContent  = profile.targetWeight;

  const start   = parseFloat(profile.startWeight);
  const current = parseFloat(profile.currentWeight);
  const target  = parseFloat(profile.targetWeight);

  let percent = 0;

  if (target > start) {
    // Goal is to GAIN weight
    const totalToGain = target - start;
    const gained      = current - start;
    percent = totalToGain <= 0 ? 0 : Math.max(0, Math.min(100, Math.round((gained / totalToGain) * 100)));
  } else if (target < start) {
    // Goal is to LOSE weight
    const totalToLose = start - target;
    const lost        = start - current;
    percent = totalToLose <= 0 ? 0 : Math.max(0, Math.min(100, Math.round((lost / totalToLose) * 100)));
  } else {
    percent = 100;
  }

  document.getElementById('prog-percent').textContent    = `${percent}%`;
  document.getElementById('progressBarFill').style.width = `${percent}%`;
  document.getElementById('pb-start-label').textContent  = `${start}kg`;
  document.getElementById('pb-target-label').textContent = `${target}kg`;
}

// ===== UPDATE WEIGHT =====
function updateWeight() {
  const user      = getCurrentUser();
  const input     = document.getElementById('newWeight');
  const successEl = document.getElementById('weightSuccess');
  const val       = parseFloat(input.value);

  if (!val || val < 30 || val > 300) {
    successEl.style.color = 'var(--danger)';
    successEl.textContent = 'Please enter a valid weight.';
    return;
  }

  updateCurrentWeight(user, val);
  input.value = '';

  const profile = getProfile(user);
  successEl.style.color = 'var(--success)';
  successEl.textContent  = `Weight updated to ${val}kg!`;
  loadProgressSection(user, profile);

  setTimeout(() => successEl.textContent = '', 3000);
}

// ===== PROFILE SECTION =====
function loadProfileSection(profile, plan) {
  const grid = document.getElementById('profileGrid');
  const fields = [
    { label: 'Name',           val: profile.name },
    { label: 'Age',            val: profile.age + ' years' },
    { label: 'Gender',         val: capitalize(profile.gender) },
    { label: 'Height',         val: profile.height + ' cm' },
    { label: 'Start Weight',   val: profile.startWeight + ' kg' },
    { label: 'Target Weight',  val: profile.targetWeight + ' kg' },
    { label: 'Activity Level', val: capitalize(profile.activity) },
    { label: 'Goal',           val: formatGoal(profile.goal) },
    { label: 'Daily Time',     val: profile.time + ' minutes' },
    { label: 'Equipment',      val: capitalize(profile.equipment) },
    { label: 'Injuries',       val: profile.injuries || 'None' },
    { label: 'Member Since',   val: profile.startDate },
  ];

  grid.innerHTML = fields.map(f => `
    <div class="profile-item">
      <div class="profile-item-label">${f.label}</div>
      <div class="profile-item-val">${f.val}</div>
    </div>
  `).join('');

  const planBox = document.getElementById('planBox');
  planBox.innerHTML = `
    <p style="color:var(--gold); margin-bottom:16px; font-weight:600; font-size:0.95rem;">
      ${plan.summary}
    </p>
    ${plan.days.map(d => `
      <div style="margin-bottom:20px;">
        <div style="font-weight:700; color:var(--white); margin-bottom:8px; font-size:0.95rem;">
          Day ${d.day} — ${d.name}
        </div>
        ${d.exercises.map(e => `
          <div style="padding:8px 0; border-bottom:1px solid var(--black-border); font-size:0.85rem; display:flex; align-items:center; gap:10px;">
            <span style="font-size:1.2rem;">${e.emoji || '💪'}</span>
            <div>
              <span style="color:var(--white); font-weight:500;">${e.name}</span>
              <span style="color:var(--gray); margin-left:8px;">${e.sets} sets × ${e.reps} — ${e.rest}</span>
            </div>
          </div>
        `).join('')}
        ${d.meals ? `
          <div style="margin-top:10px; padding:10px; background:var(--black); border-radius:var(--radius-sm); font-size:0.82rem;">
            <span style="color:var(--gold); font-weight:600;">Meals: </span>
            <span style="color:var(--gray);">
              🌅 ${d.meals.breakfast.name} &nbsp;|&nbsp;
              ☀️ ${d.meals.lunch.name} &nbsp;|&nbsp;
              🌙 ${d.meals.dinner.name} &nbsp;|&nbsp;
              🍎 ${d.meals.snack.name}
            </span>
          </div>
        ` : ''}
      </div>
    `).join('')}
    <p style="color:var(--gray); margin-top:16px; font-style:italic; font-size:0.85rem;">
      📈 ${plan.progressionNote}
    </p>
  `;
}

// ===== NAV SECTIONS =====
function showSection(name, el) {
  document.querySelectorAll('.dash-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById(`section-${name}`).classList.add('active');
  if (el) el.classList.add('active');
}

// ===== TOAST =====
function showToast(msg) {
  const toast = document.createElement('div');
  toast.textContent = msg;
  toast.style.cssText = `
    position: fixed;
    bottom: 32px;
    left: 50%;
    transform: translateX(-50%);
    background: var(--black-light);
    border: 1px solid var(--gold);
    color: var(--gold);
    padding: 14px 28px;
    border-radius: 50px;
    font-size: 0.9rem;
    font-weight: 600;
    font-family: var(--font-body);
    z-index: 9999;
    box-shadow: 0 4px 24px rgba(212,175,55,0.2);
    animation: fadeIn 0.3s ease;
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// ===== HELPERS =====
function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatGoal(goal) {
  const map = {
    weight_loss:  'Weight Loss',
    muscle_gain:  'Muscle Gain',
    endurance:    'Build Endurance',
    general:      'General Fitness'
  };
  return map[goal] || goal;
}