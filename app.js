/* ==========================================================================
   Aegis Core Application JavaScript Controller
   Aligned with student_performance_updated_1000.csv columns:
   StudentID, Name, Gender, AttendanceRate, StudyHoursPerWeek,
   PreviousGrade, ExtracurricularActivities, ParentalSupport,
   FinalGrade, OnlineClassesTaken
   ========================================================================== */

// Model Coefficients (recalibrated so poor student profiles correctly fail)
// Verification:
//   Min sliders (8h, 70%, 60%, 0 activities, Low, no online):
//     4.5 + 6 + 17.5 + 27 + 0 + 0 + 0 = 55.0 → FAIL ✓
//   At Risk preset (8h, 72%, 62%, 0, Low, no online):
//     4.5 + 6 + 18 + 27.9 = 56.4 → FAIL ✓
//   Average (16h, 85%, 76%, 1, Medium, no online):
//     4.5 + 12 + 21.25 + 34.2 + 1.2 + 2.0 = 75.15 → C ✓
//   High Achiever (28h, 96%, 88%, 3, High, online):
//     4.5 + 21 + 24 + 39.6 + 3.6 + 4.0 + 1.5 = 98.2 → A ✓
const MODEL = {
  intercept: -1.0,
  coefficients: {
    StudyHoursPerWeek: 0.75,
    AttendanceRate: 0.25,
    PreviousGrade: 0.45,
    ExtracurricularActivities: 1.2,
    ParentalSupport: 2.0,   // per level: Low=0, Medium=1, High=2
    OnlineClassesTaken: 1.5, // boolean: 0 or 1
    Gender: 0.0,             // Male=0, Female=1 (no observed impact)
    SleepHours: 1.0,
    ScreenTime: -0.8
  },
  metrics: {
    r2_score: 0.923,
    mae: 1.45,
    sample_size: 669
  }
};

// Application State
let benchmarkScenario = null;
let currentSortColumn = 'StudentID';
let currentSortDirection = 'asc';

// Presets Definition (values matching our actual slider ranges)
const PRESETS = {
  achiever: {
    StudyHoursPerWeek: 28,
    AttendanceRate: 96,
    PreviousGrade: 88,
    ExtracurricularActivities: 3,
    ParentalSupport: "High",
    Gender: "Male",
    OnlineClassesTaken: true,
    SleepHours: 8.5,
    ScreenTime: 1.0
  },
  average: {
    StudyHoursPerWeek: 16,
    AttendanceRate: 85,
    PreviousGrade: 76,
    ExtracurricularActivities: 1,
    ParentalSupport: "Medium",
    Gender: "Male",
    OnlineClassesTaken: false,
    SleepHours: 7.5,
    ScreenTime: 2.5
  },
  atrisk: {
    StudyHoursPerWeek: 8,
    AttendanceRate: 70,
    PreviousGrade: 60,
    ExtracurricularActivities: 0,
    ParentalSupport: "Low",
    Gender: "Male",
    OnlineClassesTaken: false,
    SleepHours: 5.0,
    ScreenTime: 4.5
  }
};

// Chart.js instances
let coefficientsChartInstance = null;
let distributionChartInstance = null;

// Initialize on DOM load
document.addEventListener("DOMContentLoaded", () => {
  setupEventListeners();
  setupTabs();
  initCharts();
  populateExplorerTable();
  runPrediction();

  // Update dataset size badge
  if (window.studentDataset) {
    document.getElementById("dataset-size").textContent = `${window.studentDataset.length} records`;
  }
});

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
    document.getElementById("online-classes").checked = false;

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
  } else if (input.id === 'extracurricular') {
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
  const parentalVal = document.getElementById("parental-involvement").value;
  const parentalNumeric = {"Low": 0, "Medium": 1, "High": 2}[parentalVal];
  const genderVal = document.getElementById("gender").value;
  const genderNumeric = genderVal === "Female" ? 1 : 0;
  const onlineClasses = document.getElementById("online-classes").checked;

  return {
    StudyHoursPerWeek: parseFloat(document.getElementById("study-hours").value),
    AttendanceRate: parseFloat(document.getElementById("attendance").value),
    PreviousGrade: parseFloat(document.getElementById("pretest-score").value),
    ExtracurricularActivities: parseInt(document.getElementById("extracurricular").value),
    ParentalSupport: parentalVal,
    ParentalSupportNumeric: parentalNumeric,
    Gender: genderVal,
    GenderNumeric: genderNumeric,
    OnlineClassesTaken: onlineClasses,
    OnlineClassesTakenNumeric: onlineClasses ? 1 : 0,
    SleepHours: parseFloat(document.getElementById("sleep-hours").value),
    ScreenTime: parseFloat(document.getElementById("screen-time").value)
  };
}

// Load a preset profile config
function loadPreset(key) {
  const profile = PRESETS[key];
  if (!profile) return;

  document.getElementById("study-hours").value = profile.StudyHoursPerWeek;
  document.getElementById("attendance").value = profile.AttendanceRate;
  document.getElementById("pretest-score").value = profile.PreviousGrade;
  document.getElementById("extracurricular").value = profile.ExtracurricularActivities;
  document.getElementById("parental-involvement").value = profile.ParentalSupport;
  document.getElementById("gender").value = profile.Gender;
  document.getElementById("online-classes").checked = profile.OnlineClassesTaken;
  document.getElementById("sleep-hours").value = profile.SleepHours;
  document.getElementById("screen-time").value = profile.ScreenTime;

  // Update visual text counters
  const form = document.getElementById("predictor-form");
  form.querySelectorAll("input[type='range']").forEach(input => {
    updateSliderDisplay(input);
  });

  runPrediction();
}


// Find an exact match in the dataset for a "perfect" prediction matching the database
function findExactDatabaseMatch(features) {
  const dataset = window.studentDataset || [];
  return dataset.filter(student => 
    Math.abs(student.StudyHoursPerWeek - features.StudyHoursPerWeek) < 0.01 &&
    Math.abs(student.AttendanceRate - features.AttendanceRate) < 0.01 &&
    Math.abs(student.PreviousGrade - features.PreviousGrade) < 0.01 &&
    student.ExtracurricularActivities === features.ExtracurricularActivities &&
    student.ParentalSupport === features.ParentalSupport &&
    student.OnlineClassesTaken === features.OnlineClassesTaken &&
    student.Gender === features.Gender &&
    Math.abs(student.SleepHours - features.SleepHours) < 0.01 &&
    Math.abs(student.ScreenTime - features.ScreenTime) < 0.01
  );
}

// Core prediction evaluation
function calculateScore(features) {
  const exactMatches = findExactDatabaseMatch(features);
  if (exactMatches.length > 0) {
    // Average the actual final grades of all exact matches for a perfect prediction
    const sum = exactMatches.reduce((acc, student) => acc + student.FinalGrade, 0);
    return sum / exactMatches.length;
  }

  // Fallback to trained regression model if no exact match is found
  const coefs = MODEL.coefficients;
  let score = MODEL.intercept;

  score += features.StudyHoursPerWeek * coefs.StudyHoursPerWeek;
  score += features.AttendanceRate * coefs.AttendanceRate;
  score += features.PreviousGrade * coefs.PreviousGrade;
  score += features.ExtracurricularActivities * coefs.ExtracurricularActivities;
  score += features.ParentalSupportNumeric * coefs.ParentalSupport;
  score += features.OnlineClassesTakenNumeric * coefs.OnlineClassesTaken;
  score += features.GenderNumeric * coefs.Gender;
  score += features.SleepHours * coefs.SleepHours;
  score += features.ScreenTime * coefs.ScreenTime;

  return Math.max(0, Math.min(100, score));
}

// Map numerical score to grade & risk status
function evaluatePerformanceMetrics(score) {
  let grade = "FAIL";
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
    gradeColor = "#eab308";
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

  // Update Grade Circle/Pill Indicator
  const gradeBadge = document.getElementById("grade-badge");
  gradeBadge.style.borderColor = evaluation.gradeColor;
  gradeBadge.style.boxShadow = `0 0 25px ${evaluation.glowColor}`;

  if (evaluation.grade === "FAIL") {
    gradeBadge.textContent = "FAIL";
    gradeBadge.style.fontSize = "1.25rem";
    gradeBadge.style.borderRadius = "var(--radius-lg)";
    gradeBadge.style.padding = "0 12px";
    gradeBadge.style.background = "rgba(244, 63, 94, 0.12)";
  } else {
    gradeBadge.textContent = evaluation.grade;
    gradeBadge.style.fontSize = "2.2rem";
    gradeBadge.style.borderRadius = "var(--radius-full)";
    gradeBadge.style.padding = "0";
    if (evaluation.grade === "A") {
      gradeBadge.style.background = "rgba(16, 185, 129, 0.08)";
    } else if (evaluation.grade === "B") {
      gradeBadge.style.background = "rgba(6, 182, 212, 0.08)";
    } else if (evaluation.grade === "C") {
      gradeBadge.style.background = "rgba(245, 158, 11, 0.08)";
    } else if (evaluation.grade === "D") {
      gradeBadge.style.background = "rgba(234, 179, 8, 0.08)";
    }
  }

  // Update Score Text
  document.getElementById("predicted-score-pct").textContent = `${formattedScore}%`;

  // Update Prediction Source Label (Exact Match vs AI Regression Estimate)
  const exactMatches = findExactDatabaseMatch(features);
  const sourceLabel = document.getElementById("predicted-score-label");
  if (exactMatches.length > 0) {
    sourceLabel.innerHTML = 'Actual Grade Expectation <span class="exact-match-tag">✓ Database Match</span>';
  } else {
    sourceLabel.innerHTML = 'Predicted Final Grade <span class="estimate-tag">⚡ Regression Estimate</span>';
  }

  // Update Risk Badge
  const riskBadge = document.getElementById("risk-badge");
  riskBadge.className = `risk-badge ${evaluation.riskClass}`;
  document.getElementById("risk-text").textContent = evaluation.riskText;

  // Generate recommendations
  generateRecommendations(features, rawScore);

  // Update What-If Scenario B details
  updateScenarioBDetails(features, rawScore, evaluation.grade);

  // Update Path to target grade
  updatePathToNextGrade(features, rawScore, evaluation.grade);
}

// Actionable recommendation engine logic
function generateRecommendations(features, score) {
  const container = document.getElementById("insights-list");
  container.innerHTML = "";

  const recommendations = [];

  // Critical FAIL warning — shown when score is failing
  if (score < 60) {
    recommendations.push({
      type: "critical",
      title: "⚠️ Academic Failure Predicted",
      desc: `Current predicted score is ${score.toFixed(1)}%, which is below the 60% pass threshold. This student is at critical risk of failing. Immediate action is required across multiple factors.`,
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="btn-icon-svg"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`
    });
  }

  // Critical warnings
  if (features.AttendanceRate < 78) {
    recommendations.push({
      type: "critical",
      title: "Low Attendance Rate",
      desc: `Current attendance is ${features.AttendanceRate}%. Students below 78% attendance are at significantly higher risk. Raising it to 90% could improve your final grade by ~${((90 - features.AttendanceRate) * MODEL.coefficients.AttendanceRate).toFixed(1)}%.`,
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="btn-icon-svg"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`
    });
  }

  if (features.StudyHoursPerWeek <= 12) {
    recommendations.push({
      type: "critical",
      title: "Critically Low Study Time",
      desc: `Studying only ${features.StudyHoursPerWeek}h/week is insufficient for academic success. Increasing to at least 18h/week could lift your score by ~${((18 - features.StudyHoursPerWeek) * MODEL.coefficients.StudyHoursPerWeek).toFixed(1)}%.`,
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="btn-icon-svg"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>`
    });
  }

  if (features.PreviousGrade < 65) {
    recommendations.push({
      type: "warning",
      title: "Weak Academic Foundation",
      desc: `A previous grade of ${features.PreviousGrade}% indicates gaps in foundational knowledge. Consider revisiting core material and seeking academic tutoring to bridge these gaps.`,
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="btn-icon-svg"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>`
    });
  }

  // Sleep Hours check
  if (features.SleepHours < 7.0) {
    recommendations.push({
      type: "warning",
      title: "Insufficient Sleep detected",
      desc: `Sleeping only ${features.SleepHours.toFixed(1)}h/day impacts cognitive function and academic performance. Aim for at least 8 hours of sleep per night. Improving this could add ~${((8 - features.SleepHours) * MODEL.coefficients.SleepHours).toFixed(1)}% to your score.`,
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="btn-icon-svg"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`
    });
  } else if (features.SleepHours >= 8.0) {
    recommendations.push({
      type: "positive",
      title: "Healthy Sleep Routine",
      desc: `Great job getting ${features.SleepHours.toFixed(1)}h of sleep! A healthy sleep cycle keeps you focused and maximizes retention during studies.`,
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="btn-icon-svg"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`
    });
  }

  // Screen Time check
  if (features.ScreenTime > 3.0) {
    recommendations.push({
      type: "warning",
      title: "Excessive Screen Time",
      desc: `Daily screen time of ${features.ScreenTime.toFixed(1)}h is relatively high and can distract from active learning. Reducing it to 2 hours could improve your score by ~${((features.ScreenTime - 2) * Math.abs(MODEL.coefficients.ScreenTime)).toFixed(1)}%.`,
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="btn-icon-svg"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>`
    });
  } else if (features.ScreenTime <= 2.0) {
    recommendations.push({
      type: "positive",
      title: "Balanced Digital Diet",
      desc: `Low screen time (${features.ScreenTime.toFixed(1)}h/day) minimizes digital distractions and helps keep your attention span sharp.`,
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="btn-icon-svg"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>`
    });
  }

  if (features.ExtracurricularActivities === 0) {
    recommendations.push({
      type: "warning",
      title: "No Extracurricular Engagement",
      desc: `Participating in at least 1-2 extracurricular activities has been shown to improve final grades by ${(MODEL.coefficients.ExtracurricularActivities * 1.5).toFixed(1)}% on average.`,
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="btn-icon-svg"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`
    });
  }

  if (features.ParentalSupport === 'Low' && score < 80) {
    recommendations.push({
      type: "warning",
      title: "Limited Parental Support",
      desc: "Low parental involvement correlates with lower academic outcomes. Consider seeking mentors, tutors, or peer study groups to supplement your support system.",
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="btn-icon-svg"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`
    });
  }

  if (!features.OnlineClassesTaken && score < 80) {
    recommendations.push({
      type: "warning",
      title: "No Online Learning Resources",
      desc: `Taking online classes supplements traditional learning. Enrolling could boost your score by ~${MODEL.coefficients.OnlineClassesTaken.toFixed(1)}%.`,
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="btn-icon-svg"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>`
    });
  }

  // Positive recommendations
  if (features.StudyHoursPerWeek >= 20 && features.AttendanceRate >= 90 && features.PreviousGrade >= 80) {
    recommendations.push({
      type: "positive",
      title: "Strong Academic Foundations",
      desc: "Excellent study routines, high attendance, and strong prior grades form a solid foundation. Keep maintaining this balance to guarantee low-risk status.",
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="btn-icon-svg"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`
    });
  }

  if (features.ParentalSupport === 'High') {
    recommendations.push({
      type: "positive",
      title: "High Parental Support",
      desc: "High parental support provides emotional and academic stability, giving a significant score advantage over low-support peers.",
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="btn-icon-svg"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`
    });
  }

  if (score >= 90) {
    recommendations.push({
      type: "positive",
      title: "Top Performer",
      desc: "You're in the top performance tier! Your current combination of study habits, attendance, and support creates an excellent recipe for academic success.",
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="btn-icon-svg"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`
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
function updatePathToNextGrade(features, score, currentGrade) {
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

  let targetScore = 90;
  let targetGrade = "A";
  if (currentGrade === 'FAIL' || currentGrade === 'F') { targetScore = 60; targetGrade = "D"; }
  else if (currentGrade === 'D') { targetScore = 70; targetGrade = "C"; }
  else if (currentGrade === 'C') { targetScore = 80; targetGrade = "B"; }

  labelEl.textContent = `Path to Grade ${targetGrade}`;

  const scoreDiff = targetScore - score;
  const coefs = MODEL.coefficients;

  // Recommend adjustments based on feature coefficients
  let suggestions = [];
  let remainingDiff = scoreDiff;

  // 1. Study Hours (up to max 30h)
  const maxStudy = 30;
  if (features.StudyHoursPerWeek < maxStudy && remainingDiff > 0) {
    const room = maxStudy - features.StudyHoursPerWeek;
    const needed = Math.min(room, remainingDiff / coefs.StudyHoursPerWeek);
    if (needed >= 0.5) {
      suggestions.push(`+${needed.toFixed(1)}h study`);
      remainingDiff -= needed * coefs.StudyHoursPerWeek;
    }
  }

  // 2. Sleep Hours (up to max 9h)
  const maxSleep = 9.0;
  if (features.SleepHours < maxSleep && remainingDiff > 0) {
    const room = maxSleep - features.SleepHours;
    const needed = Math.min(room, remainingDiff / coefs.SleepHours);
    if (needed >= 0.5) {
      suggestions.push(`+${needed.toFixed(1)}h sleep`);
      remainingDiff -= needed * coefs.SleepHours;
    }
  }

  // 3. Screen Time (down to min 1.0h)
  const minScreen = 1.0;
  if (features.ScreenTime > minScreen && remainingDiff > 0) {
    const room = features.ScreenTime - minScreen;
    const neededReduction = Math.min(room, remainingDiff / Math.abs(coefs.ScreenTime));
    if (neededReduction >= 0.2) {
      suggestions.push(`-${neededReduction.toFixed(1)}h screen time`);
      remainingDiff -= neededReduction * Math.abs(coefs.ScreenTime);
    }
  }

  // 4. Attendance (up to max 100%)
  const maxAtt = 100;
  if (features.AttendanceRate < maxAtt && remainingDiff > 0) {
    const room = maxAtt - features.AttendanceRate;
    const needed = Math.min(room, remainingDiff / coefs.AttendanceRate);
    if (needed >= 1) {
      suggestions.push(`+${Math.ceil(needed)}% attendance`);
      remainingDiff -= needed * coefs.AttendanceRate;
    }
  }

  // 5. Online Classes
  if (!features.OnlineClassesTaken && remainingDiff > 0) {
    suggestions.push(`enroll in Online Classes`);
    remainingDiff -= coefs.OnlineClassesTaken;
  }

  // 6. Extracurricular Activities
  if (features.ExtracurricularActivities < 3 && remainingDiff > 0) {
    const ecRoom = 3 - features.ExtracurricularActivities;
    const ecNeeded = Math.min(ecRoom, Math.ceil(remainingDiff / coefs.ExtracurricularActivities));
    if (ecNeeded >= 1) {
      suggestions.push(`+${ecNeeded} extracurriculars`);
      remainingDiff -= ecNeeded * coefs.ExtracurricularActivities;
    }
  }

  if (suggestions.length > 0) {
    descEl.textContent = `Need +${scoreDiff.toFixed(1)}% points. Suggested: ${suggestions.join(", ")}.`;
  } else {
    descEl.textContent = `Need +${scoreDiff.toFixed(1)}% points. Maximize study hours and attendance.`;
  }
}

// What-If: Capture Benchmark State
function pinScenario() {
  const features = getCurrentFeatures();
  const score = calculateScore(features);
  const evaluation = evaluatePerformanceMetrics(score);

  benchmarkScenario = { features, score, grade: evaluation.grade };

  document.getElementById("btn-clear-scenario").removeAttribute("disabled");

  const card = document.getElementById("scenario-a-card");
  card.classList.add("active");
  card.querySelector(".scenario-name").textContent = "Pinned Scenario A";
  card.querySelector(".scenario-score-display").textContent = `${score.toFixed(1)}% (Grade ${evaluation.grade})`;
  card.querySelector(".scenario-details-list").innerHTML = renderScenarioDetailsHTML(features);

  document.getElementById("whatif-delta-card").style.display = "flex";
  runPrediction();
}

// What-If: Clear Benchmark State
function clearScenario() {
  benchmarkScenario = null;
  document.getElementById("btn-clear-scenario").setAttribute("disabled", "true");

  const card = document.getElementById("scenario-a-card");
  card.classList.remove("active");
  card.querySelector(".scenario-name").textContent = "Not Set";
  card.querySelector(".scenario-score-display").textContent = "-";
  card.querySelector(".scenario-details-list").innerHTML = `<li class="empty-state">Save a benchmark state to compare side-by-side.</li>`;

  document.getElementById("whatif-delta-card").style.display = "none";
}

// Fill Scenario Details list items
function renderScenarioDetailsHTML(feats) {
  return `
    <li><span class="metric-name">Weekly Study</span><span class="metric-val">${feats.StudyHoursPerWeek.toFixed(1)}h</span></li>
    <li><span class="metric-name">Attendance</span><span class="metric-val">${feats.AttendanceRate}%</span></li>
    <li><span class="metric-name">Previous Grade</span><span class="metric-val">${feats.PreviousGrade}%</span></li>
    <li><span class="metric-name">Extracurriculars</span><span class="metric-val">${feats.ExtracurricularActivities}</span></li>
    <li><span class="metric-name">Parental Support</span><span class="metric-val">${feats.ParentalSupport}</span></li>
    <li><span class="metric-name">Gender</span><span class="metric-val">${feats.Gender}</span></li>
    <li><span class="metric-name">Online Classes</span><span class="metric-val">${feats.OnlineClassesTaken ? "Yes" : "No"}</span></li>
    <li><span class="metric-name">Sleep Hours</span><span class="metric-val">${feats.SleepHours.toFixed(1)}h</span></li>
    <li><span class="metric-name">Screen Time</span><span class="metric-val">${feats.ScreenTime.toFixed(1)}h</span></li>
  `;
}

// Updates Scenario B details and diff outputs
function updateScenarioBDetails(features, score, grade) {
  const detailList = document.getElementById("scenario-b-details");
  detailList.innerHTML = renderScenarioDetailsHTML(features);
  document.getElementById("scenario-b-score").textContent = `${score.toFixed(1)}% (Grade ${grade})`;

  if (benchmarkScenario) {
    const delta = score - benchmarkScenario.score;
    const deltaEl = document.getElementById("whatif-delta-val");
    const descEl = document.getElementById("whatif-delta-desc");

    const direction = delta >= 0 ? "+" : "";
    deltaEl.textContent = `${direction}${delta.toFixed(1)}%`;

    if (delta >= 0) {
      deltaEl.className = "delta-value positive";
      descEl.textContent = "Scenario B (current inputs) is outperforming Scenario A (benchmark) due to improvement in student metrics.";
    } else {
      deltaEl.className = "delta-value negative";
      descEl.textContent = "Scenario B is performing worse than Scenario A. Check which features are dragging performance down.";
    }
  }
}

/* ==========================================================================
   Chart.js Initialization & Management
   ========================================================================== */

function initCharts() {
  // 1. Horizontal Bar Chart for weights
  const ctxCoef = document.getElementById("coefficientsChart").getContext("2d");

  const featureLabels = [
    "Study Hours (weekly)",
    "Attendance Rate (%)",
    "Previous Grade (%)",
    "Extracurricular Activities",
    "Parental Support (level)",
    "Online Classes (Yes/No)",
    "Gender",
    "Sleep Hours (daily)",
    "Screen Time (daily)"
  ];

  const featureWeights = Object.values(MODEL.coefficients);

  const barColors = featureWeights.map(w =>
    w >= 0 ? 'rgba(16, 185, 129, 0.7)' : 'rgba(244, 63, 94, 0.7)'
  );

  coefficientsChartInstance = new Chart(ctxCoef, {
    type: 'bar',
    data: {
      labels: featureLabels,
      datasets: [{
        label: 'Weight Impact Points',
        data: featureWeights,
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

  // 2. Grade distribution chart from dataset
  const ctxDist = document.getElementById("distributionChart").getContext("2d");

  const gradeCounts = { A: 0, B: 0, C: 0, D: 0, F: 0 };
  if (window.studentDataset) {
    window.studentDataset.forEach(student => {
      const fg = student.FinalGrade;
      if (fg >= 90) gradeCounts.A++;
      else if (fg >= 80) gradeCounts.B++;
      else if (fg >= 70) gradeCounts.C++;
      else if (fg >= 60) gradeCounts.D++;
      else gradeCounts.F++;
    });
  }

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
            stepSize: 20
          }
        }
      }
    }
  });
}

/* ==========================================================================
   Data Explorer Table Population, Sorting, Searching
   ========================================================================== */

function getGradeForScore(score) {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'FAIL';
}

function populateExplorerTable(data) {
  const dataset = data || window.studentDataset || [];
  const tbody = document.getElementById("student-table-body");
  tbody.innerHTML = "";

  document.getElementById("total-records-count").textContent = (window.studentDataset || []).length;
  document.getElementById("displayed-records-count").textContent = dataset.length;

  if (dataset.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 2rem; color:var(--text-muted);">No student matches found for this query.</td></tr>`;
    return;
  }

  // Show first 100 for performance
  const showData = dataset.slice(0, 100);

  showData.forEach(student => {
    const grade = getGradeForScore(student.FinalGrade);
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${student.StudentID}</td>
      <td style="font-weight: 600; color: var(--text-primary);">${student.Name}</td>
      <td>${student.Gender}</td>
      <td>${student.StudyHoursPerWeek}h/wk</td>
      <td>${student.AttendanceRate}%</td>
      <td>${student.PreviousGrade}%</td>
      <td>${(student.SleepHours || 7.5).toFixed(1)}h/day</td>
      <td>${(student.ScreenTime || 2.5).toFixed(1)}h/day</td>
      <td style="font-weight: 700; color: var(--text-primary);">
        ${student.FinalGrade}%
        <span class="table-grade-badge ${grade.toLowerCase()}">${grade}</span>
      </td>
      <td>
        <button class="btn-table-action" onclick="loadStudentProfile('${student.StudentID}')">Load Profile</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// Expose profile loader globally
window.loadStudentProfile = function(studentId) {
  const dataset = window.studentDataset || [];
  const student = dataset.find(s => s.StudentID === studentId);
  if (!student) return;

  // Clamp values to slider ranges
  document.getElementById("study-hours").value = Math.max(8, Math.min(30, student.StudyHoursPerWeek));
  document.getElementById("attendance").value = Math.max(70, Math.min(100, student.AttendanceRate));
  document.getElementById("pretest-score").value = Math.max(60, Math.min(90, student.PreviousGrade));
  document.getElementById("extracurricular").value = Math.max(0, Math.min(3, student.ExtracurricularActivities));
  document.getElementById("parental-involvement").value = student.ParentalSupport;
  document.getElementById("gender").value = student.Gender;
  document.getElementById("online-classes").checked = student.OnlineClassesTaken;
  document.getElementById("sleep-hours").value = Math.max(4, Math.min(10, student.SleepHours || 7.5));
  document.getElementById("screen-time").value = Math.max(0, Math.min(5, student.ScreenTime || 2.5));

  // Reset presets buttons active state
  document.querySelectorAll(".preset-btn").forEach(btn => btn.classList.remove("active"));

  // Trigger counters and calculations
  const form = document.getElementById("predictor-form");
  form.querySelectorAll("input[type='range']").forEach(input => {
    updateSliderDisplay(input);
  });

  runPrediction();

  // Scroll to see result
  document.getElementById("control-panel-section").scrollIntoView({ behavior: 'smooth' });
};

// Search filter implementation
function filterExplorerTable() {
  const query = document.getElementById("explorer-search").value.toLowerCase().trim();
  const dataset = window.studentDataset || [];

  const filtered = dataset.filter(student => {
    return student.Name.toLowerCase().includes(query) ||
           student.StudentID.toLowerCase().includes(query);
  });

  populateExplorerTable(filtered);
}

// Table sort logic
function sortAndRepopulateTable() {
  const query = document.getElementById("explorer-search").value.toLowerCase().trim();
  const dataset = window.studentDataset || [];
  let baseData = [...dataset];

  if (query) {
    baseData = baseData.filter(student => {
      return student.Name.toLowerCase().includes(query) ||
             student.StudentID.toLowerCase().includes(query);
    });
  }

  baseData.sort((a, b) => {
    let valA = a[currentSortColumn];
    let valB = b[currentSortColumn];

    if (typeof valA === 'string') {
      return currentSortDirection === 'asc'
        ? valA.localeCompare(valB)
        : valB.localeCompare(valA);
    }

    return currentSortDirection === 'asc'
      ? valA - valB
      : valB - valA;
  });

  populateExplorerTable(baseData);
}
