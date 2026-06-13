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

function setGreeting(name) {
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  document.getElementById('dash-greeting').textContent = `${greet}, ${name}! 💪`;
}

function setDate() {
  document.getElementById('dash-date').textContent = new Date().toLocaleDateString('en-IN', {
    weekday:'long', year:'numeric', month:'long', day:'numeric'
  });
}

function loadStreakBadge(user) {
  const s = getStreak(user);
  document.getElementById('topbar-streak').textContent = `${s.current} day streak`;
}

function loadTodayTasks(user, plan) {
  const streak    = getStreak(user);
  const dayIndex  = streak.total % 7;
  const todayPlan = plan.days[dayIndex];

  document.getElementById('today-day-label').textContent = `Day ${streak.total + 1} — ${todayPlan.name}`;

  const weekNum    = Math.floor(streak.total / 7);
  const multiplier = 1 + (weekNum * 0.1);

  let taskState = getTaskState(user);
  if (!taskState) {
    taskState = todayPlan.exercises.map((ex, i) => ({
      id:i, name:ex.name, emoji:ex.emoji||'💪',
      sets:Math.round(ex.sets * multiplier),
      reps:ex.reps, rest:ex.rest, detail:ex.detail, done:false
    }));
    saveTaskState(user, taskState);
  }

  const taskList = document.getElementById('taskList');
  const mealList = document.getElementById('mealList');
  const completeBtn = document.getElementById('completeBtn');

  taskList.innerHTML = taskState.map((task, i) => `
    <div class="task-item ${task.done?'done':''}" onclick="toggleTask('${user}',${i})">
      <div class="task-emoji">${task.emoji}</div>
      <div class="task-checkbox">${task.done?'✓':''}</div>
      <div class="task-info">
        <div class="task-name">${task.name}</div>
        <div class="task-detail">${task.sets} sets × ${task.reps} — ${task.rest}</div>
        <div class="task-tip">${task.detail}</div>
      </div>
    </div>
  `).join('');

  if (todayPlan.meals) {
    const mealEmojis = {breakfast:'🌅',lunch:'☀️',dinner:'🌙',snack:'🍎'};
    const mealColors = {breakfast:'var(--gold)',lunch:'var(--red-light)',dinner:'#818CF8',snack:'var(--success)'};
    mealList.innerHTML = Object.entries(todayPlan.meals).map(([type,meal]) => `
      <div class="meal-card">
        <div class="meal-header">
          <span class="meal-emoji">${mealEmojis[type]||'🍽️'}</span>
          <span class="meal-type" style="color:${mealColors[type]||'var(--gold)'}">${capitalize(type)}</span>
        </div>
        <div class="meal-name">${meal.name}</div>
        <div class="meal-detail">${meal.detail}</div>
        <div class="meal-macros">
          <span class="macro"><span class="macro-val">${meal.calories}</span> kcal</span>
          <span class="macro"><span class="macro-val">${meal.protein}g</span> protein</span>
        </div>
      </div>
    `).join('');
  }

  updateRing(taskState);
  const alreadyDone = getLastDone(user) === getTodayKey();
  const allDone = taskState.every(t => t.done);
  if (allDone && !alreadyDone) completeBtn.classList.remove('hidden');
  else completeBtn.classList.add('hidden');
}

function toggleTask(user, index) {
  if (getLastDone(user) === getTodayKey()) return;
  const state = getTaskState(user);
  if (!state) return;
  state[index].done = !state[index].done;
  saveTaskState(user, state);
  loadTodayTasks(user, getPlan(user));
}

function updateRing(taskState) {
  const total   = taskState.length;
  const done    = taskState.filter(t => t.done).length;
  const percent = total === 0 ? 0 : Math.round((done/total)*100);
  const circumf = 251.2;
  const offset  = circumf - (circumf * percent / 100);
  document.getElementById('ring-percent').textContent = `${percent}%`;
  document.getElementById('ringFill').style.strokeDashoffset = offset;
}

function completeDay() {
  const user    = getCurrentUser();
  const streak  = getStreak(user);
  const today   = getTodayKey();
  const last    = getLastDone(user);
  const yesterday = getYesterdayKey();
  const isConsecutive = (last === yesterday || last === null || streak.current === 0);
  streak.current = isConsecutive ? streak.current + 1 : 1;
  streak.total  += 1;
  streak.best    = Math.max(streak.best, streak.current);
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

function loadStreakSection(user) {
  const streak = getStreak(user);
  document.getElementById('streak-current').textContent = streak.current;
  document.getElementById('streak-best').textContent    = streak.best;
  document.getElementById('streak-total').textContent   = streak.total;

  // CALENDAR
  const calendar = document.getElementById('streakCalendar');
  calendar.innerHTML = '';
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key     = `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;
    const isDone  = streak.history && streak.history.includes(key);
    const isToday = i === 0;
    const el      = document.createElement('div');
    el.className  = `cal-day ${isDone?'completed':''} ${isToday?'today':''}`;
    el.textContent = d.getDate();
    calendar.appendChild(el);
  }

  // ACHIEVEMENTS
  const achievements = [
    {streak:1,   icon:'🌱', title:'First Step',       desc:'Complete your first day'       },
    {streak:3,   icon:'🔥', title:'On Fire',          desc:'3 days in a row'               },
    {streak:7,   icon:'⚡', title:'Week Warrior',     desc:'Full week completed'           },
    {streak:10,  icon:'💪', title:'Iron Will',        desc:'10 day streak'                 },
    {streak:14,  icon:'🏅', title:'Two Week Beast',   desc:'14 consecutive days'           },
    {streak:21,  icon:'🧠', title:'Habit Formed',     desc:'21 days = new habit'           },
    {streak:30,  icon:'🏆', title:'Month Crusher',    desc:'Full month done'               },
    {streak:45,  icon:'💎', title:'Diamond Grinder',  desc:'45 days dedication'            },
    {streak:60,  icon:'🚀', title:'Rocket Mode',      desc:'60 days unstoppable'           },
    {streak:75,  icon:'👑', title:'Royalty',          desc:'75 days elite'                 },
    {streak:90,  icon:'🌟', title:'90 Day Legend',    desc:'Three months'                  },
    {streak:100, icon:'💯', title:'Century Club',     desc:'100 days done'                 },
    {streak:120, icon:'🔱', title:'Poseidon',         desc:'120 days grind'                },
    {streak:150, icon:'⚔️', title:'Spartan',          desc:'150 days warrior'              },
    {streak:180, icon:'🌊', title:'Half Year Hero',   desc:'Six months'                    },
    {streak:200, icon:'🛡️', title:'Ironclad',         desc:'200 days unbroken'             },
    {streak:250, icon:'🌙', title:'Dark Knight',      desc:'250 days grinding'             },
    {streak:300, icon:'☀️', title:'Solar Flare',      desc:'300 days bright'               },
    {streak:365, icon:'🎖️', title:'Full Year God',    desc:'Entire year'                   },
    {streak:500, icon:'🌌', title:'Transcendent',     desc:'500 days legendary'            },
  ];

  const achGrid = document.getElementById('achievementGrid');
  if (!achGrid) return;
  achGrid.innerHTML = achievements.map(a => {
    const unlocked = streak.best >= a.streak;
    return `
      <div class="achievement-card ${unlocked?'unlocked':'locked'}">
        <div class="ach-icon">${unlocked ? a.icon : '🔒'}</div>
        <div class="ach-info">
          <div class="ach-title">${a.title}</div>
          <div class="ach-desc">${unlocked ? a.desc : 'Reach '+a.streak+' day streak'}</div>
        </div>
        ${unlocked ? '<div class="ach-badge">✓</div>' : ''}
      </div>
    `;
  }).join('');

  // PARTICLES
  initStreakParticles(streak.current);
}

// ===== PARTICLE EFFECT =====
function initStreakParticles(streakCount) {
  const canvas = document.getElementById('streak-particles');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  canvas.width  = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;

  const count   = Math.min(20 + streakCount * 2, 80);
  const particles = [];

  for (let i = 0; i < count; i++) {
    particles.push({
      x:     Math.random() * canvas.width,
      y:     Math.random() * canvas.height,
      r:     Math.random() * 2 + 0.5,
      dx:    (Math.random() - 0.5) * 0.4,
      dy:    (Math.random() - 0.5) * 0.4,
      alpha: Math.random() * 0.5 + 0.1,
      color: Math.random() > 0.5 ? '212,175,55' : '192,57,43'
    });
  }

  let animId;
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${p.color},${p.alpha})`;
      ctx.fill();
      p.x += p.dx;
      p.y += p.dy;
      if (p.x < 0 || p.x > canvas.width)  p.dx *= -1;
      if (p.y < 0 || p.y > canvas.height) p.dy *= -1;
    });
    animId = requestAnimationFrame(draw);
  }

  if (window._streakParticleAnim) cancelAnimationFrame(window._streakParticleAnim);
  window._streakParticleAnim = animId;
  draw();
  window._streakParticleAnim = animId;
}

function loadProgressSection(user, profile) {
  document.getElementById('prog-start').textContent   = profile.startWeight;
  document.getElementById('prog-current').textContent = profile.currentWeight;
  document.getElementById('prog-target').textContent  = profile.targetWeight;

  const start   = parseFloat(profile.startWeight);
  const current = parseFloat(profile.currentWeight);
  const target  = parseFloat(profile.targetWeight);
  let percent   = 0;

  if (target > start) {
    const total = target - start;
    const gained = current - start;
    percent = total <= 0 ? 0 : Math.max(0, Math.min(100, Math.round((gained/total)*100)));
  } else if (target < start) {
    const total = start - target;
    const lost  = start - current;
    percent = total <= 0 ? 0 : Math.max(0, Math.min(100, Math.round((lost/total)*100)));
  } else {
    percent = 100;
  }

  document.getElementById('prog-percent').textContent    = `${percent}%`;
  document.getElementById('progressBarFill').style.width = `${percent}%`;
  document.getElementById('pb-start-label').textContent  = `${start}kg`;
  document.getElementById('pb-target-label').textContent = `${target}kg`;

  const log     = getWeightLog(user);
  const logList = document.getElementById('weightLogList');
  if (!log || log.length === 0) {
    logList.innerHTML = `<p style="color:var(--gray);font-size:0.82rem;padding:10px 0;">No entries yet. Update your weight above.</p>`;
  } else {
    logList.innerHTML = [...log].reverse().slice(0,10).map(e => `
      <div class="weight-log-item">
        <span class="weight-log-date">${e.date}</span>
        <span class="weight-log-val">${e.weight} kg</span>
      </div>
    `).join('');
  }
}

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
  successEl.style.color = 'var(--success)';
  successEl.textContent = `Weight updated to ${val}kg!`;
  loadProgressSection(user, getProfile(user));
  setTimeout(() => successEl.textContent = '', 3000);
}

function loadProfileSection(profile, plan) {
  const fields = [
    {label:'Name',          val:profile.name},
    {label:'Age',           val:profile.age+' years'},
    {label:'Gender',        val:capitalize(profile.gender)},
    {label:'Height',        val:profile.height+' cm'},
    {label:'Start Weight',  val:profile.startWeight+' kg'},
    {label:'Target Weight', val:profile.targetWeight+' kg'},
    {label:'Activity',      val:capitalize(profile.activity)},
    {label:'Goal',          val:formatGoal(profile.goal)},
    {label:'Daily Time',    val:profile.time+' min'},
    {label:'Equipment',     val:capitalize(profile.equipment)},
    {label:'Injuries',      val:profile.injuries||'None'},
    {label:'Since',         val:profile.startDate},
  ];

  document.getElementById('profileGrid').innerHTML = fields.map(f => `
    <div class="profile-item">
      <div class="profile-item-label">${f.label}</div>
      <div class="profile-item-val">${f.val}</div>
    </div>
  `).join('');

  document.getElementById('planBox').innerHTML = `
    <p style="color:var(--gold);margin-bottom:14px;font-weight:600;">${plan.summary}</p>
    ${plan.days.map(d => `
      <div style="margin-bottom:14px;">
        <div style="font-weight:700;color:var(--white);margin-bottom:6px;font-size:0.88rem;">Day ${d.day} — ${d.name}</div>
        ${d.exercises.map(e => `
          <div style="padding:5px 0;border-bottom:1px solid var(--black-border);font-size:0.78rem;display:flex;align-items:center;gap:8px;">
            <span>${e.emoji||'💪'}</span>
            <span style="color:var(--white);font-weight:500;">${e.name}</span>
            <span style="color:var(--gray);">${e.sets} sets × ${e.reps} — ${e.rest}</span>
          </div>
        `).join('')}
        ${d.meals ? `
          <div style="margin-top:6px;padding:7px 10px;background:var(--black);border-radius:var(--radius-sm);font-size:0.75rem;color:var(--gray);">
            🌅 ${d.meals.breakfast.name} | ☀️ ${d.meals.lunch.name} | 🌙 ${d.meals.dinner.name} | 🍎 ${d.meals.snack.name}
          </div>
        ` : ''}
      </div>
    `).join('')}
    <p style="color:var(--gray);margin-top:10px;font-style:italic;font-size:0.78rem;">📈 ${plan.progressionNote}</p>
  `;
}

function resetAccount() {
  if (!confirm('Are you sure? This will delete your plan and profile permanently.')) return;
  const user = getCurrentUser();
  ['ff_profile_','ff_plan_','ff_streak_','ff_last_done_','ff_weight_log_'].forEach(k => localStorage.removeItem(k+user));
  location.reload();
}

function showSection(name, el) {
  document.querySelectorAll('.dash-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('section-'+name).classList.add('active');
  if (el) el.classList.add('active');
  if (name === 'streak') {
    setTimeout(() => {
      const canvas = document.getElementById('streak-particles');
      if (canvas) {
        canvas.width  = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
        initStreakParticles(getStreak(getCurrentUser()).current);
      }
    }, 50);
  }
}

function showToast(msg) {
  const t = document.createElement('div');
  t.textContent = msg;
  t.style.cssText = `position:fixed;bottom:28px;left:50%;transform:translateX(-50%);background:var(--black-light);border:1px solid var(--gold);color:var(--gold);padding:12px 24px;border-radius:50px;font-size:0.88rem;font-weight:600;font-family:var(--font-body);z-index:9999;box-shadow:var(--shadow-gold);animation:fadeIn 0.3s ease;`;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

function capitalize(str) { return str ? str.charAt(0).toUpperCase()+str.slice(1) : ''; }
function formatGoal(g) {
  return {weight_loss:'Weight Loss',muscle_gain:'Muscle Gain',endurance:'Build Endurance',general:'General Fitness'}[g] || g;
}