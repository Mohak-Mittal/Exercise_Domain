// ===== CLOUDFLARE WORKER URL =====
const WORKER_URL = 'https://calm-butterfly-cfd1.mittalmohak0.workers.dev';

let currentStep = 1;

// ===== STEP NAVIGATION =====
function nextStep(step) {
  if (!validateStep(step)) return;

  const current = document.getElementById(`onboard-step-${step}`);
  const next    = document.getElementById(`onboard-step-${step + 1}`);
  const dot     = document.getElementById(`step-dot-${step}`);
  const nextDot = document.getElementById(`step-dot-${step + 1}`);

  current.classList.remove('active');
  dot.classList.remove('active');
  dot.classList.add('done');

  next.classList.add('active');
  nextDot.classList.add('active');

  currentStep = step + 1;
}

function prevStep(step) {
  const current = document.getElementById(`onboard-step-${step}`);
  const prev    = document.getElementById(`onboard-step-${step - 1}`);
  const dot     = document.getElementById(`step-dot-${step}`);
  const prevDot = document.getElementById(`step-dot-${step - 1}`);

  current.classList.remove('active');
  dot.classList.remove('active');

  prev.classList.add('active');
  prevDot.classList.remove('done');
  prevDot.classList.add('active');

  currentStep = step - 1;
}

// ===== VALIDATION =====
function validateStep(step) {
  const errorEl = document.getElementById(`step${step}Error`);
  errorEl.textContent = '';

  if (step === 1) {
    const name   = document.getElementById('ob-name').value.trim();
    const age    = document.getElementById('ob-age').value;
    const gender = document.getElementById('ob-gender').value;
    const height = document.getElementById('ob-height').value;
    if (!name || !age || !gender || !height) {
      errorEl.textContent = 'Please fill in all fields.';
      return false;
    }
    if (age < 10 || age > 80) {
      errorEl.textContent = 'Please enter a valid age.';
      return false;
    }
    if (height < 100 || height > 250) {
      errorEl.textContent = 'Please enter a valid height.';
      return false;
    }
  }

  if (step === 2) {
    const weight   = document.getElementById('ob-weight').value;
    const target   = document.getElementById('ob-target').value;
    const activity = document.getElementById('ob-activity').value;
    const goal     = document.getElementById('ob-goal').value;
    if (!weight || !target || !activity || !goal) {
      errorEl.textContent = 'Please fill in all fields.';
      return false;
    }
    if (weight < 30 || weight > 300) {
      errorEl.textContent = 'Please enter a valid weight.';
      return false;
    }
    if (target < 30 || target > 300) {
      errorEl.textContent = 'Please enter a valid target weight.';
      return false;
    }
  }

  return true;
}

// ===== GENERATE PLAN =====
async function generatePlan() {
  const errorEl      = document.getElementById('step3Error');
  const generatingEl = document.getElementById('generatingMsg');
  const generateBtn  = document.getElementById('generateBtn');

  const time      = document.getElementById('ob-time').value;
  const equipment = document.getElementById('ob-equipment').value;

  errorEl.textContent = '';

  if (!time || !equipment) {
    errorEl.textContent = 'Please fill in all fields.';
    return;
  }

  const profile = {
    name:          document.getElementById('ob-name').value.trim(),
    age:           parseInt(document.getElementById('ob-age').value),
    gender:        document.getElementById('ob-gender').value,
    height:        parseInt(document.getElementById('ob-height').value),
    startWeight:   parseFloat(document.getElementById('ob-weight').value),
    currentWeight: parseFloat(document.getElementById('ob-weight').value),
    targetWeight:  parseFloat(document.getElementById('ob-target').value),
    activity:      document.getElementById('ob-activity').value,
    goal:          document.getElementById('ob-goal').value,
    time:          parseInt(time),
    equipment:     document.getElementById('ob-equipment').value,
    injuries:      document.getElementById('ob-injuries').value.trim(),
    startDate:     getTodayKey(),
  };

  generatingEl.classList.remove('hidden');
  generateBtn.disabled = true;
  generateBtn.textContent = 'Generating...';

  try {
    const prompt = buildPrompt(profile);
    const plan   = await callGroq(prompt);
    const user   = getCurrentUser();

    saveProfile(user, profile);
    savePlan(user, plan);

    generatingEl.classList.add('hidden');
    navigateTo('page-dashboard');
    initDashboard();

  } catch (err) {
    generatingEl.classList.add('hidden');
    generateBtn.disabled = false;
    generateBtn.textContent = 'Generate My Plan ⚡';
    errorEl.textContent = 'Failed to generate plan. Check your connection and try again.';
    console.error(err);
  }
}

// ===== BUILD PROMPT =====
function buildPrompt(p) {
  return `You are a professional fitness and nutrition coach. Create a personalized weekly exercise and meal plan for this person:

Name: ${p.name}
Age: ${p.age}
Gender: ${p.gender}
Height: ${p.height}cm
Current Weight: ${p.startWeight}kg
Target Weight: ${p.targetWeight}kg
Activity Level: ${p.activity}
Fitness Goal: ${p.goal}
Available Time Per Day: ${p.time} minutes
Equipment: ${p.equipment}
Injuries/Limitations: ${p.injuries || 'None'}
Dietary Preference: Vegetarian only. All meals must be 100% vegetarian, no meat, no fish, no eggs.

Create a 7-day exercise and meal plan. Return ONLY this exact JSON structure, no extra text:

{
  "summary": "brief 2 sentence overview",
  "days": [
    {
      "day": 1,
      "name": "Day name e.g. Upper Body Strength",
      "exercises": [
        {
          "name": "Exercise name",
          "emoji": "relevant emoji for this exercise",
          "sets": 3,
          "reps": "12-15",
          "rest": "60 seconds",
          "detail": "brief form tip"
        }
      ],
      "meals": {
        "breakfast": { "name": "Meal name", "calories": 400, "protein": 25, "detail": "brief description" },
        "lunch":     { "name": "Meal name", "calories": 600, "protein": 35, "detail": "brief description" },
        "dinner":    { "name": "Meal name", "calories": 500, "protein": 30, "detail": "brief description" },
        "snack":     { "name": "Meal name", "calories": 200, "protein": 10, "detail": "brief description" }
      }
    }
  ],
  "progressionNote": "how it gets harder each week"
}`;
}

// ===== CALL GROQ VIA WORKER =====
async function callGroq(prompt) {
  const response = await fetch(WORKER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt })
  });

  if (!response.ok) throw new Error('Worker error: ' + response.status);

  const data = await response.json();
  let text = data.content || data.result || '';

  text = text.replace(/```json|```/g, '').trim();
  return JSON.parse(text);
}