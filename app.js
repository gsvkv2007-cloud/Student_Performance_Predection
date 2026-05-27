/* ==========================================================================
   Aegis Core Application JavaScript Controller
   ========================================================================== */

// Default Model Coefficients (in case model_coefficients.json is not yet generated or CORS limits it)
const DEFAULT_MODEL = {
  "intercept": 14.50,
  "coefficients": {
    "StudyHours": 0.8200,
    "Attendance": 0.2400,
    "SleepHours": 1.1500,
    "ScreenTime": -0.1200,
    "ParentalInvolvement": 2.0000,
    "Tutoring": 3.5000,
    "Extracurricular": 1.0000,
    "StressLevel": -0.4500,
    "PreTestScore": 0.3800
  },
  "metrics": {
    "r2_score": 0.913,
    "mae": 1.74,
    "sample_size": 1000
  }
};

// Application State
let activeModel = { ...DEFAULT_MODEL };
let benchmarkScenario = null;
let currentSortColumn = 'StudentID';
let currentSortDirection = 'asc';

// Presets Definition
const PRESETS = {
  achiever: {
    StudyHours: 22.0,
    Attendance: 98,
    SleepHours: 8.0,
    ScreenTime: 8,
    ParentalInvolvement: "High",
    Tutoring: true,
    Extracurricular: true,
    StressLevel: 3,
    PreTestScore: 90
  },
  average: {
    StudyHours: 12.0,
    Attendance: 88,
    SleepHours: 7.0,
    ScreenTime: 18,
    ParentalInvolvement: "Medium",
    Tutoring: false,
    Extracurricular: true,
    StressLevel: 5,
    PreTestScore: 72
  },
  atrisk: {
    StudyHours: 4.0,
    Attendance: 65,
    SleepHours: 5.0,
    ScreenTime: 32,
    ParentalInvolvement: "Low",
    Tutoring: false,
    Extracurricular: false,
    StressLevel: 8,
    PreTestScore: 48
  }
};

// Chart.js instances
let coefficientsChartInstance = null;
let distributionChartInstance = null;

// Initialize on DOM load
document.addEventListener("DOMContentLoaded", () => {
  initModel();
  setupEventListeners();
  setupTabs();
  initCharts();
  populateExplorerTable();
  runPrediction();
});

// Try to fetch custom trained model coefficients, else use fallback defaults
async function initModel() {
  try {
    const response = await fetch("model_coefficients.json");
    if (response.ok) {
      const data = await response.json();
      activeModel = data;
      document.getElementById("model-r2").textContent = `R² = ${activeModel.metrics.r2_score.toFixed(3)}`;
      console.log("Loaded custom model coefficients successfully:", activeModel);
      
      // Re-init chart and prediction with new weights
      if (coefficientsChartInstance) {
        updateCoefficientsChart();
      }
    }
  } catch (e) {
    console.warn("Could not fetch model_coefficients.json (likely due to file:// CORS restrictions). Using default baseline model weights.", e);
  }
}

// Attach listeners to DOM inputs
function setupEventListeners() {
  const form = document.getElementById("predictor-form");
  const inputs = form.querySelectorAll("input, select");
  
  // Real-time calculation on input
  inputs.forEach(input => {
    input.addEventListener("input", (e) => {
      updateSliderDisplay(e.target);
      runPrediction();
    });
    
    // Select dropdown uses change
    if (input.tagName === 'SELECT') {
      input.addEventListener("change", () => runPrediction());
    }
  });

  // Preset Buttons
  const presetButtons = document.querySelectorAll(".preset-btn");
  presetButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      presetButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      loadPreset(btn.dataset.preset);
    });
  });

  // Reset Button
  document.getElementById("btn-reset-fields").addEventListener("click", () => {
    form.reset();
    // Uncheck checkboxes manual reset because standard reset doesn't always trigger visual toggle updates
    document.getElementById("tutoring").checked = false;
    document.getElementById("extracurricular").checked = false;
    
    // Reset displays
    form.querySelectorAll("input[type='range']").forEach(input => {
      updateSliderDisplay(input);
    });
    
    presetButtons.forEach(b => b.classList.remove("active"));
    runPrediction();
  });

  // What-If Actions
  document.getElementById("btn-pin-scenario").addEventListener("click", pinScenario);
  document.getElementById("btn-clear-scenario").addEventListener("click", clearScenario);

  // Search input in Explorer
  document.getElementById("explorer-search").addEventListener("input", filterExplorerTable);

  // Sortable headers in Explorer
  const headers = document.querySelectorAll("#student-table th[data-sort]");
  headers.forEach(h => {
    h.addEventListener("click", () => {
      const col = h.dataset.sort;
      if (currentSortColumn === col) {
        currentSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
      } else {
        currentSortColumn = col;
        currentSortDirection = 'asc';
      }
      
      // Update sorted arrows
      headers.forEach(hdr => {
        const indicator = hdr.querySelector(".sort-indicator");
        indicator.className = "sort-indicator";
        if (hdr.dataset.sort === currentSortColumn) {
          indicator.classList.add(currentSortDirection);
        }
      });
      
      sortAndRepopulateTable();
    });
  });
}

// Update slider numeric indicator bubble
function updateSliderDisplay(input) {
  const displayId = `${input.id}-val`;
  const display = document.getElementById(displayId);
  if (!display) return;
  
  if (input.id === 'study-hours' || input.id === 'sleep-hours' || input.id === 'screen-time') {
    display.textContent = `${parseFloat(input.value).toFixed(1)}h`;
  } else if (input.id === 'attendance' || input.id === 'pretest-score') {
    display.textContent = `${input.value}%`;
  } else {
    display.textContent = input.value;
  }
}

// Setup tabs click logic
function setupTabs() {
  const tabs = document.querySelectorAll(".tab-btn");
  const panes = document.querySelectorAll(".tab-pane");
  
  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      tabs.forEach(t => t.classList.remove("active"));
      panes.forEach(p => p.classList.remove("active"));
      
      tab.classList.add("active");
      const targetPane = document.getElementById(tab.dataset.tab);
      if (targetPane) targetPane.classList.add("active");
    });
  });
}

// Get current state values from inputs
function getCurrentFeatures() {
  const parentalSelect = document.getElementById("parental-involvement");
  const parentalVal = parentalSelect.value;
  const parentalNumeric = {"Low": 0, "Medium": 1, "High": 2}[parentalVal];
  
  return {
    StudyHours: parseFloat(document.getElementById("study-hours").value),
    Attendance: parseFloat(document.getElementById("attendance").value),
    SleepHours: parseFloat(document.getElementById("sleep-hours").value),
    ScreenTime: parseFloat(document.getElementById("screen-time").value),
    ParentalInvolvement: parentalVal,
    ParentalInvolvementNumeric: parentalNumeric,
    Tutoring: document.getElementById("tutoring").checked,
    TutoringNumeric: document.getElementById("tutoring").checked ? 1 : 0,
    Extracurricular: document.getElementById("extracurricular").checked,
    ExtracurricularNumeric: document.getElementById("extracurricular").checked ? 1 : 0,
    StressLevel: parseInt(document.getElementById("stress-level").value),
    PreTestScore: parseFloat(document.getElementById("pretest-score").value)
  };
}

// Load a preset profile config
function loadPreset(key) {
  const profile = PRESETS[key];
  if (!profile) return;
  
  document.getElementById("study-hours").value = profile.StudyHours;
  document.getElementById("attendance").value = profile.Attendance;
  document.getElementById("sleep-hours").value = profile.SleepHours;
  document.getElementById("screen-time").value = profile.ScreenTime;
  document.getElementById("parental-involvement").value = profile.ParentalInvolvement;
  document.getElementById("tutoring").checked = profile.Tutoring;
  document.getElementById("extracurricular").checked = profile.Extracurricular;
  document.getElementById("stress-level").value = profile.StressLevel;
  document.getElementById("pre-test-score") ? document.getElementById("pre-test-score").value = profile.PreTestScore : document.getElementById("pretest-score").value = profile.PreTestScore;

  // Update visual text counters
  const form = document.getElementById("predictor-form");
  form.querySelectorAll("input[type='range']").forEach(input => {
    updateSliderDisplay(input);
  });
  
  runPrediction();
}

// Core regression evaluation
function calculateScore(features) {
  const coefs = activeModel.coefficients;
  let score = activeModel.intercept;
  
  score += features.StudyHours * coefs.StudyHours;
  score += features.Attendance * coefs.Attendance;
  score += features.SleepHours * coefs.SleepHours;
  score += features.ScreenTime * coefs.ScreenTime;
  score += features.ParentalInvolvementNumeric * coefs.ParentalInvolvement;
  score += features.TutoringNumeric * coefs.Tutoring;
  score += features.ExtracurricularNumeric * coefs.Extracurricular;
  score += features.StressLevel * coefs.StressLevel;
  score += features.PreTestScore * coefs.PreTestScore;
  
  return Math.max(0, Math.min(100, score));
}

// Map numerical score to grade & risk status
function evaluatePerformanceMetrics(score) {
  let grade = "F";
  let gradeColor = "var(--status-high-risk)";
  let glowColor = "var(--status-high-glow)";
  
  if (score >= 90) {
    grade = "A";
    gradeColor = "var(--status-low-risk)";
    glowColor = "var(--status-low-glow)";
  } else if (score >= 80) {
    grade = "B";
    gradeColor = "var(--accent-cyan)";
    glowColor = "var(--accent-cyan-glow)";
  } else if (score >= 70) {
    grade = "C";
    gradeColor = "var(--status-med-risk)";
    glowColor = "var(--status-med-glow)";
  } else if (score >= 60) {
    grade = "D";
    gradeColor = "#eab308"; // yellow
    glowColor = "rgba(234, 179, 8, 0.3)";
  }
  
  let riskText = "Low Risk";
  let riskClass = "low-risk";
  if (score < 60) {
    riskText = "High Risk";
    riskClass = "high-risk";
  } else if (score < 75) {
    riskText = "Medium Risk";
    riskClass = "med-risk";
  }
  
  return { grade, gradeColor, glowColor, riskText, riskClass };
}

// Run prediction model and update DOM elements
function runPrediction() {
  const features = getCurrentFeatures();
  const rawScore = calculateScore(features);
  const formattedScore = rawScore.toFixed(1);
  
  const evaluation = evaluatePerformanceMetrics(rawScore);
  
  // Update Grade Circle Indicator
  const gradeBadge = document.getElementById("grade-badge");
  gradeBadge.textContent = evaluation.grade;
  gradeBadge.style.borderColor = evaluation.gradeColor;
  gradeBadge.style.boxShadow = `0 0 25px ${evaluation.glowColor}`;
  
  // Update Score Text
  document.getElementById("predicted-score-pct").textContent = `${formattedScore}%`;
  
  // Update Risk Badge
  const riskBadge = document.getElementById("risk-badge");
  riskBadge.className = `risk-badge ${evaluation.riskClass}`;
  document.getElementById("risk-text").textContent = evaluation.riskText;
  
  // Generate recommendations
  generateRecommendations(features, rawScore);
  
  // Update What-If Scenario B details
  updateScenarioBDetails(features, rawScore, evaluation.grade);
  
  // Update Path to target grade
  updatePathToA(features, rawScore, evaluation.grade);
}

// Actionable recommendation engine logic
function generateRecommendations(features, score) {
  const container = document.getElementById("insights-list");
  container.innerHTML = ""; // Clear
  
  const recommendations = [];
  
  // Critical warnings
  if (features.Attendance < 75) {
    recommendations.push({
      type: "critical",
      title: "Severe Attendance Deficit",
      desc: `Your current attendance is ${features.Attendance}%. Attendance rate under 75% is the largest risk factor in academic failure. Prioritize attending lectures. Raising it to 90% is estimated to improve your final grade by ~3.6%.`,
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="btn-icon-svg"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`
    });
  }
  
  if (features.StudyHours < 6) {
    recommendations.push({
      type: "critical",
      title: "Critically Low Study Time",
      desc: `Studying only ${features.StudyHours} hours per week is insufficient. Increasing your weekly study time to 12 hours can lift your score by ~${((12 - features.StudyHours) * activeModel.coefficients.StudyHours).toFixed(1)}%.`,
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="btn-icon-svg"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>`
    });
  }
  
  // Important warnings
  if (features.SleepHours < 6) {
    recommendations.push({
      type: "warning",
      title: "Inadequate Rest (Sleep Hours)",
      desc: `Sleep hours average ${features.SleepHours}h. Rest deprivation leads to cognitive decline and high stress. Aim for 7-8 hours. Each extra hour is linked to a ~1.15% performance increase.`,
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="btn-icon-svg"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`
    });
  }
  
  if (features.ScreenTime > 25) {
    recommendations.push({
      type: "warning",
      title: "Excessive Screen / Leisure Time",
      desc: `You average ${features.ScreenTime}h of weekly leisure screen time. Cutting this down by 10 hours and shifting half of it to study will improve your score by ~2.3% overall.`,
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="btn-icon-svg"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>`
    });
  }
  
  if (!features.Tutoring && score < 78) {
    recommendations.push({
      type: "warning",
      title: "No Structured Academic Support",
      desc: "Enrolling in a structured tutoring program provides a significant performance boost (+3.5% score increase according to our regression model).",
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="btn-icon-svg"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>`
    });
  }
  
  if (features.StressLevel > 7) {
    recommendations.push({
      type: "warning",
      title: "Elevated Psychological Stress",
      desc: `Your stress rating is ${features.StressLevel}/10. High stress triggers performance drops (-0.45% per level). Reach out to wellness counselors and optimize study schedules to lower tension.`,
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="btn-icon-svg"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`
    });
  }

  // Positive recommendations
  if (features.StudyHours >= 15 && features.Attendance >= 90 && features.SleepHours >= 7) {
    recommendations.push({
      type: "positive",
      title: "Strong Academic Foundations",
      desc: "Excellent study routines, healthy sleep, and high class attendance form a solid foundation. Keep maintaining this balance to guarantee low-risk status.",
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="btn-icon-svg"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`
    });
  }
  
  if (features.ParentalInvolvement === 'High') {
    recommendations.push({
      type: "positive",
      title: "High Parental Support",
      desc: "High level of support provides emotional and academic stability, giving a 4% overall score advantage over low-involvement peers.",
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="btn-icon-svg"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`
    });
  }

  if (recommendations.length === 0) {
    container.innerHTML = `
      <div class="empty-state-card" style="text-align:center; padding: 2rem; color: var(--text-muted); font-style:italic;">
        All variables are balanced. No negative feedback or urgent recommendations detected.
      </div>
    `;
  } else {
    recommendations.forEach(rec => {
      const card = document.createElement("div");
      card.className = `insight-item ${rec.type}`;
      card.innerHTML = `
        <div class="insight-icon-box">${rec.icon}</div>
        <div class="insight-details">
          <span class="insight-title">${rec.title}</span>
          <span class="insight-desc">${rec.desc}</span>
        </div>
      `;
      container.appendChild(card);
    });
  }
}

// Predict requirements to step up to the next grade
function updatePathToA(features, score, currentGrade) {
  const labelEl = document.getElementById("path-label");
  const descEl = document.getElementById("path-desc");
  const iconBox = document.querySelector(".path-icon-container");
  
  if (currentGrade === 'A') {
    labelEl.textContent = "Peak Performance";
    descEl.textContent = "Maintain your current habits to keep your Grade A status.";
    iconBox.style.color = "var(--status-low-risk)";
    iconBox.style.backgroundColor = "rgba(16, 185, 129, 0.1)";
    return;
  }
  
  iconBox.style.color = "var(--accent-cyan)";
  iconBox.style.backgroundColor = "rgba(6, 182, 212, 0.1)";
  
  let targetScore = 90; // Default target is A
  let targetGrade = "A";
  if (currentGrade === 'F') { targetScore = 60; targetGrade = "D"; }
  else if (currentGrade === 'D') { targetScore = 70; targetGrade = "C"; }
  else if (currentGrade === 'C') { targetScore = 80; targetGrade = "B"; }
  
  labelEl.textContent = `Path to Grade ${targetGrade}`;
  
  const scoreDiff = targetScore - score;
  const coefs = activeModel.coefficients;
  
  // Recommend adjustments based on feature coefficients
  let recommendations = [];
  let remainingDiff = scoreDiff;
  
  // 1. Check Study Hours (up to max 25h)
  const maxStudyHours = 25;
  if (features.StudyHours < maxStudyHours && remainingDiff > 0) {
    const studyRoom = maxStudyHours - features.StudyHours;
    const studyAddNeeded = Math.min(studyRoom, remainingDiff / coefs.StudyHours);
    if (studyAddNeeded >= 0.5) {
      recommendations.push(`+${studyAddNeeded.toFixed(1)}h study`);
      remainingDiff -= studyAddNeeded * coefs.StudyHours;
    }
  }
  
  // 2. Check Attendance (up to max 100%)
  const maxAttendance = 100;
  if (features.Attendance < maxAttendance && remainingDiff > 0) {
    const attRoom = maxAttendance - features.Attendance;
    const attAddNeeded = Math.min(attRoom, remainingDiff / coefs.Attendance);
    if (attAddNeeded >= 1) {
      recommendations.push(`+${Math.ceil(attAddNeeded)}% attendance`);
      remainingDiff -= attAddNeeded * coefs.Attendance;
    }
  }
  
  // 3. Check Tutoring (if false, toggling adds 3.5%)
  if (!features.Tutoring && remainingDiff > 0) {
    recommendations.push(`enroll in Tutoring`);
    remainingDiff -= coefs.Tutoring;
  }
  
  // 4. Check Sleep Hours (up to max 8.5h)
  const optSleep = 8.5;
  if (features.SleepHours < optSleep && remainingDiff > 0) {
    const sleepRoom = optSleep - features.SleepHours;
    const sleepAddNeeded = Math.min(sleepRoom, remainingDiff / coefs.SleepHours);
    if (sleepAddNeeded >= 0.5) {
      recommendations.push(`+${sleepAddNeeded.toFixed(1)}h sleep`);
      remainingDiff -= sleepAddNeeded * coefs.SleepHours;
    }
  }
  
  // 5. Check Stress Level (can reduce down to 2)
  if (features.StressLevel > 2 && remainingDiff > 0) {
    const stressRoom = features.StressLevel - 2;
    const stressReduceNeeded = Math.min(stressRoom, remainingDiff / Math.abs(coefs.StressLevel));
    if (stressReduceNeeded >= 1) {
      recommendations.push(`-${Math.ceil(stressReduceNeeded)} stress level`);
      remainingDiff -= stressReduceNeeded * Math.abs(coefs.StressLevel);
    }
  }
  
  if (recommendations.length > 0) {
    descEl.textContent = `Need +${scoreDiff.toFixed(1)}% points. Suggested: ${recommendations.join(", ")}.`;
  } else {
    descEl.textContent = `Need +${scoreDiff.toFixed(1)}% points. Raise study/attendance or pre-test benchmark scores.`;
  }
}

// What-If: Capture Benchmark State
function pinScenario() {
  const features = getCurrentFeatures();
  const score = calculateScore(features);
  const evaluation = evaluatePerformanceMetrics(score);
  
  benchmarkScenario = {
    features,
    score,
    grade: evaluation.grade
  };
  
  // Enable buttons
  document.getElementById("btn-clear-scenario").removeAttribute("disabled");
  
  // Render Scenario A Card
  const card = document.getElementById("scenario-a-card");
  card.classList.add("active");
  
  const nameEl = card.querySelector(".scenario-name");
  nameEl.textContent = "Pinned Scenario A";
  
  const scoreEl = card.querySelector(".scenario-score-display");
  scoreEl.textContent = `${score.toFixed(1)}% (Grade ${evaluation.grade})`;
  
  const listEl = card.querySelector(".scenario-details-list");
  listEl.innerHTML = renderScenarioDetailsHTML(features);
  
  // Show delta element
  document.getElementById("whatif-delta-card").style.display = "flex";
  
  // Re-predict to update scenario B and delta calculations
  runPrediction();
}

// What-If: Clear Benchmark State
function clearScenario() {
  benchmarkScenario = null;
  document.getElementById("btn-clear-scenario").setAttribute("disabled", "true");
  
  const card = document.getElementById("scenario-a-card");
  card.classList.remove("active");
  
  const nameEl = card.querySelector(".scenario-name");
  nameEl.textContent = "Not Set";
  
  const scoreEl = card.querySelector(".scenario-score-display");
  scoreEl.textContent = "-";
  
  const listEl = card.querySelector(".scenario-details-list");
  listEl.innerHTML = `<li class="empty-state">Save a benchmark state to compare side-by-side.</li>`;
  
  // Hide delta element
  document.getElementById("whatif-delta-card").style.display = "none";
}

// Fill Scenario Details list items
function renderScenarioDetailsHTML(feats) {
  return `
    <li><span class="metric-name">Weekly Study</span><span class="metric-val">${feats.StudyHours.toFixed(1)}h</span></li>
    <li><span class="metric-name">Attendance</span><span class="metric-val">${feats.Attendance}%</span></li>
    <li><span class="metric-name">Daily Sleep</span><span class="metric-val">${feats.SleepHours.toFixed(1)}h</span></li>
    <li><span class="metric-name">Screen Time</span><span class="metric-val">${feats.ScreenTime}h</span></li>
    <li><span class="metric-name">Parental Support</span><span class="metric-val">${feats.ParentalInvolvement}</span></li>
    <li><span class="metric-name">Tutoring</span><span class="metric-val">${feats.Tutoring ? "Yes" : "No"}</span></li>
    <li><span class="metric-name">Extracurriculars</span><span class="metric-val">${feats.Extracurricular ? "Yes" : "No"}</span></li>
    <li><span class="metric-name">Stress Rating</span><span class="metric-val">${feats.StressLevel}/10</span></li>
    <li><span class="metric-name">Pre-Test Grade</span><span class="metric-val">${feats.PreTestScore}%</span></li>
  `;
}

// Updates Scenario B details and diff outputs
function updateScenarioBDetails(features, score, grade) {
  const detailList = document.getElementById("scenario-b-details");
  detailList.innerHTML = renderScenarioDetailsHTML(features);
  
  document.getElementById("scenario-b-score").textContent = `${score.toFixed(1)}% (Grade ${grade})`;
  
  // Update Delta if Benchmark set
  if (benchmarkScenario) {
    const delta = score - benchmarkScenario.score;
    const deltaEl = document.getElementById("whatif-delta-val");
    const descEl = document.getElementById("whatif-delta-desc");
    
    const direction = delta >= 0 ? "+" : "";
    deltaEl.textContent = `${direction}${delta.toFixed(1)}%`;
    
    if (delta >= 0) {
      deltaEl.className = "delta-value positive";
      descEl.textContent = "Scenario B (current inputs) is outperforming Scenario A (benchmark) due to improvement in student lifestyle or study metrics.";
    } else {
      deltaEl.className = "delta-value negative";
      descEl.textContent = "Scenario B is performing worse than Scenario A. Check which features (e.g. reduced study time, sleep deficit, or high stress) are dragging the performance down.";
    }
  }
}

/* ==========================================================================
   Chart.js Initialization & Management
   ========================================================================== */

function initCharts() {
  // 1. Horizontal Bar Chart for weights
  const ctxCoef = document.getElementById("coefficientsChart").getContext("2d");
  
  // Prepare data
  const dataLabels = [];
  const dataValues = [];
  const barColors = [];
  
  Object.entries(activeModel.coefficients).forEach(([feature, weight]) => {
    // Human readable labels
    const labelMapping = {
      StudyHours: "Study Hours (weekly)",
      Attendance: "Attendance (%)",
      SleepHours: "Daily Sleep (hrs)",
      ScreenTime: "Screen Time (weekly)",
      ParentalInvolvement: "Parental Support (level)",
      Tutoring: "Tutoring (Yes)",
      Extracurricular: "Extracurriculars (Yes)",
      StressLevel: "Stress Level (1-10)",
      PreTestScore: "Pre-Test Score (%)"
    };
    dataLabels.push(labelMapping[feature] || feature);
    dataValues.push(weight);
    
    // Green for positive coefficients, Red/Orange for negative
    barColors.push(weight >= 0 ? 'rgba(16, 185, 129, 0.7)' : 'rgba(244, 63, 94, 0.7)');
  });

  coefficientsChartInstance = new Chart(ctxCoef, {
    type: 'bar',
    data: {
      labels: dataLabels,
      datasets: [{
        label: 'Weight Impact Points',
        data: dataValues,
        backgroundColor: barColors,
        borderColor: barColors.map(c => c.replace('0.7', '1.0')),
        borderWidth: 1,
        borderRadius: 4
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function(context) {
              const val = context.raw;
              const sign = val >= 0 ? "+" : "";
              return `Weight: ${sign}${val.toFixed(3)} pts`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: { color: '#94a3b8' }
        },
        y: {
          grid: { display: false },
          ticks: { color: '#f8fafc' }
        }
      }
    }
  });

  // 2. Grade distribution bar chart of mock database
  const ctxDist = document.getElementById("distributionChart").getContext("2d");
  
  // Calculate distribution of grades in window.mockStudentDataset
  const gradeCounts = { A: 0, B: 0, C: 0, D: 0, F: 0 };
  window.mockStudentDataset.forEach(student => {
    gradeCounts[student.Grade]++;
  });

  distributionChartInstance = new Chart(ctxDist, {
    type: 'bar',
    data: {
      labels: ['Grade A', 'Grade B', 'Grade C', 'Grade D', 'Grade F'],
      datasets: [{
        data: [gradeCounts.A, gradeCounts.B, gradeCounts.C, gradeCounts.D, gradeCounts.F],
        backgroundColor: [
          'rgba(16, 185, 129, 0.65)',
          'rgba(6, 182, 212, 0.65)',
          'rgba(245, 158, 11, 0.65)',
          'rgba(234, 179, 8, 0.65)',
          'rgba(244, 63, 94, 0.65)'
        ],
        borderColor: [
          '#10b981', '#06b6d4', '#f59e0b', '#eab308', '#f43f5e'
        ],
        borderWidth: 1.5,
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: '#f8fafc' }
        },
        y: {
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: { 
            color: '#94a3b8',
            stepSize: 1
          }
        }
      }
    }
  });
}

function updateCoefficientsChart() {
  const dataValues = [];
  const barColors = [];
  
  Object.entries(activeModel.coefficients).forEach(([feature, weight]) => {
    dataValues.push(weight);
    barColors.push(weight >= 0 ? 'rgba(16, 185, 129, 0.7)' : 'rgba(244, 63, 94, 0.7)');
  });
  
  coefficientsChartInstance.data.datasets[0].data = dataValues;
  coefficientsChartInstance.data.datasets[0].backgroundColor = barColors;
  coefficientsChartInstance.data.datasets[0].borderColor = barColors.map(c => c.replace('0.7', '1.0'));
  coefficientsChartInstance.update();
}

/* ==========================================================================
   Data Explorer Table Population, Sorting, Searching
   ========================================================================== */

function populateExplorerTable(data = window.mockStudentDataset) {
  const tbody = document.getElementById("student-table-body");
  tbody.innerHTML = ""; // Clear
  
  document.getElementById("total-records-count").textContent = window.mockStudentDataset.length;
  document.getElementById("displayed-records-count").textContent = data.length;
  
  if (data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 2rem; color:var(--text-muted);">No student matches found for this query.</td></tr>`;
    return;
  }
  
  data.forEach(student => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${student.StudentID}</td>
      <td style="font-weight: 600; color: var(--text-primary);">${student.Name}</td>
      <td>${student.StudyHours.toFixed(1)}h/wk</td>
      <td>${student.Attendance.toFixed(1)}%</td>
      <td>${student.SleepHours.toFixed(1)}h/d</td>
      <td>${student.PreTestScore.toFixed(1)}%</td>
      <td style="font-weight: 700; color: var(--text-primary);">
        ${student.FinalScore.toFixed(1)}% 
        <span class="table-grade-badge ${student.Grade.toLowerCase()}">${student.Grade}</span>
      </td>
      <td>
        <button class="btn-table-action" onclick="loadStudentProfile('${student.StudentID}')">Load Profile</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// Expose profile loader globally to attach to button click
window.loadStudentProfile = function(studentId) {
  const student = window.mockStudentDataset.find(s => s.StudentID === studentId);
  if (!student) return;
  
  document.getElementById("study-hours").value = student.StudyHours;
  document.getElementById("attendance").value = student.Attendance;
  document.getElementById("sleep-hours").value = student.SleepHours;
  document.getElementById("screen-time").value = student.ScreenTime;
  document.getElementById("parental-involvement").value = student.ParentalInvolvement;
  document.getElementById("tutoring").checked = student.Tutoring === 'Yes';
  document.getElementById("extracurricular").checked = student.Extracurricular === 'Yes';
  document.getElementById("stress-level").value = student.StressLevel;
  document.getElementById("pretest-score").value = student.PreTestScore;
  
  // Reset presets buttons active state
  document.querySelectorAll(".preset-btn").forEach(btn => btn.classList.remove("active"));
  
  // Trigger counters and calculations
  const form = document.getElementById("predictor-form");
  form.querySelectorAll("input[type='range']").forEach(input => {
    updateSliderDisplay(input);
  });
  
  runPrediction();
  
  // Optional UI scroll feedback or tabs focus
  // Let's make it focus the parameters header scroll
  document.querySelector(".control-panel").scrollIntoView({ behavior: 'smooth' });
};

// Search filter implementation
function filterExplorerTable() {
  const query = document.getElementById("explorer-search").value.toLowerCase().trim();
  
  const filtered = window.mockStudentDataset.filter(student => {
    return student.Name.toLowerCase().includes(query) || 
           student.StudentID.toLowerCase().includes(query);
  });
  
  populateExplorerTable(filtered);
}

// Table sort logic
function sortAndRepopulateTable() {
  const query = document.getElementById("explorer-search").value.toLowerCase().trim();
  let baseData = [...window.mockStudentDataset];
  
  if (query) {
    baseData = baseData.filter(student => {
      return student.Name.toLowerCase().includes(query) || 
             student.StudentID.toLowerCase().includes(query);
    });
  }
  
  baseData.sort((a, b) => {
    let valA = a[currentSortColumn];
    let valB = b[currentSortColumn];
    
    // Sort strings
    if (typeof valA === 'string') {
      return currentSortDirection === 'asc' 
        ? valA.localeCompare(valB) 
        : valB.localeCompare(valA);
    }
    
    // Sort numbers
    return currentSortDirection === 'asc' 
      ? valA - valB 
      : valB - valA;
  });
  
  populateExplorerTable(baseData);
}
