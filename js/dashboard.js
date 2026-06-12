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
  document.getElementById('topbar-streak').textContent =
    `${streak.current} day streak`;
}

// ===== TODAY'S TASKS =====
function loadTodayTasks(user, plan) {
  const streak      = getStreak(user);
  const dayIndex    = (streak.total % 7);
  const todayPlan   = plan.days[dayIndex];
  const taskList    = document.getElementById('taskList');
  const completeBtn = document.getElementById('completeBtn');
  const dayLabel    = document.getElementById('today-day-label');

  dayLabel.textContent = `Day ${streak.total + 1} — ${todayPlan.name}`;

  // Progressive difficulty multiplier
  const weekNum     = Math.floor(streak.total / 7);
  const multiplier  = 1 + (weekNum * 0.1);

  // Load or init task state
  let taskState = getTaskState(user);
  if (!taskState) {
    taskState = todayPlan.exercises.map((ex, i) => ({
      id:   i,
      name: ex.name,
      sets: Math.round(ex.sets * multiplier),
      reps: ex.reps,
      rest: ex.rest,
      detail: ex.detail,
      done: false
    }));
    saveTaskState(user, taskState);
  }

  taskList.innerHTML = '';
  taskState.forEach((task, i) => {
    const el = document.createElement('div');
    el.className = `task-item ${task.done ? 'done' : ''}`;
    el.onclick   = () => toggleTask(user, i, taskState, plan);
    el.innerHTML = `
      <div class="task-checkbox">${task.done ? '✓' : ''}</div>
      <div class="task-info">
        <div class="task-name">${task.name}</div>
        <div class="task-detail">${task.sets} sets × ${task.reps} reps — Rest: ${task.rest}</div>
      </div>
    `;
    taskList.appendChild(el);
  });

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
function toggleTask(user, index, taskState, plan) {
  const alreadyDone = getLastDone(user) === getTodayKey();
  if (alreadyDone) return;

  taskState[index].done = !taskState[index].done;
  saveTaskState(user, taskState);
  loadTodayTasks(user, plan);
}

// ===== UPDATE RING =====
function updateRing(taskState) {
  const total    = taskState.length;
  const done     = taskState.filter(t => t.done).length;
  const percent  = total === 0 ? 0 : Math.round((done / total) * 100);
  const circumf  = 364.4;
  const offset   = circumf - (circumf * percent / 100);

  document.getElementById('ring-percent').textContent = `${percent}%`;
  document.getElementById('ringFill').style.strokeDashoffset = offset;
}

// ===== COMPLETE DAY =====
function completeDay() {
  const user   = getCurrentUser();
  const streak = getStreak(user);
  const today  = getTodayKey();
  const last   = getLastDone(user);

  // Check if yesterday was done for streak continuity
  const yesterday = getYesterdayKey();
  const isConsecutive = last === yesterday || last === null;

  if (isConsecutive) {
    streak.current += 1;
  } else {
    streak.current = 1;
  }

  streak.total += 1;
  streak.best   = Math.max(streak.best, streak.current);
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

  const calendar = document.getElementById('streakCalendar');
  calendar.innerHTML = '';

  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key     = `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;
    const isDone  = streak.history.includes(key);
    const isToday = i === 0;
    const el      = document.createElement('div');
    el.className  = `cal-day ${isDone ? 'completed' : ''} ${isToday ? 'today' : ''}`;
    el.textContent = d.getDate();
    calendar.appendChild(el);
  }
}

// ===== PROGRESS SECTION =====
function loadProgressSection(user, profile) {
  document.getElementById('prog-start').textContent   = profile.startWeight;
  document.getElementById('prog-current').textContent = profile.currentWeight;
  document.getElementById('prog-target').textContent  = profile.targetWeight;

  const totalToLose = profile.startWeight - profile.targetWeight;
  const lost        = profile.startWeight - profile.currentWeight;
  const percent     = totalToLose <= 0 ? 100 : Math.max(0, Math.min(100, Math.round((lost / totalToLose) * 100)));

  document.getElementById('prog-percent').textContent      = `${percent}%`;
  document.getElementById('progressBarFill').style.width   = `${percent}%`;
  document.getElementById('pb-start-label').textContent    = `${profile.startWeight}kg`;
  document.getElementById('pb-target-label').textContent   = `${profile.targetWeight}kg`;
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
    { label: 'Name',            val: profile.name },
    { label: 'Age',             val: profile.age + ' years' },
    { label: 'Gender',          val: capitalize(profile.gender) },
    { label: 'Height',          val: profile.height + ' cm' },
    { label: 'Start Weight',    val: profile.startWeight + ' kg' },
    { label: 'Target Weight',   val: profile.targetWeight + ' kg' },
    { label: 'Activity Level',  val: capitalize(profile.activity) },
    { label: 'Goal',            val: formatGoal(profile.goal) },
    { label: 'Daily Time',      val: profile.time + ' minutes' },
    { label: 'Equipment',       val: capitalize(profile.equipment) },
    { label: 'Injuries',        val: profile.injuries || 'None' },
    { label: 'Member Since',    val: profile.startDate },
  ];

  grid.innerHTML = fields.map(f => `
    <div class="profile-item">
      <div class="profile-item-label">${f.label}</div>
      <div class="profile-item-val">${f.val}</div>
    </div>
  `).join('');

  const planBox = document.getElementById('planBox');
  planBox.innerHTML = `
    <p style="color:var(--gold); margin-bottom:12px; font-weight:600;">${plan.summary}</p>
    ${plan.days.map(d => `
      <div style="margin-bottom:16px;">
        <div style="font-weight:700; color:var(--white); margin-bottom:6px;">
          Day ${d.day} — ${d.name}
        </div>
        ${d.exercises.map(e => `
          <div style="padding: 6px 0; border-bottom: 1px solid var(--black-border); font-size:0.85rem;">
            <span style="color:var(--white); font-weight:500;">${e.name}</span>
            <span style="color:var(--gray); margin-left:8px;">${e.sets} sets × ${e.reps} — ${e.rest}</span>
          </div>
        `).join('')}
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
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
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