# Aegis - Academic Performance Predictor & Analytics Dashboard

Aegis is a premium, real-time analytics dashboard designed to visualize student data and predict academic outcomes. Utilizing a Multiple Linear Regression model calibrated to realistic parameters, Aegis enables educators and students to simulate how academic behaviors, lifestyle factors, and environmental support impact final grades.

---

## 🚀 Key Features

- **Real-Time Grade Prediction**: Instantly recalculate final grades based on changes to sliders for study hours, attendance rate, previous grades, sleep hours, screen time, and more.
- **Dual-Prediction Logic**:
  - **Exact Match**: If parameters match a student profile in the database exactly, Aegis pulls the actual recorded final grade.
  - **Regression Estimate**: Otherwise, it falls back to a Multiple Linear Regression model to forecast the grade.
- **Actionable Study Insights**: Dynamic recommendations that flag academic risks (e.g., low sleep, high screen time, or poor attendance) and provide numeric forecasts of potential improvements.
- **What-If Scenario Analyzer**: Pin a baseline profile (Scenario A) and compare it side-by-side with active slider adjustments (Scenario B) to isolate performance differences.
- **Visual Analytics**: Interactive, responsive charts powered by Chart.js showcasing relative feature influence (regression weights) and dataset performance distribution.
- **Data Explorer**: Search, sort, and navigate through student records. Instantly import any student's profile into the simulator with a single click.

---

## 📊 Regression Model Specifications

The simulation model calculates the student's score out of 100 based on the following formula:

$$\text{Predicted Score} = \text{Intercept} + \sum (\text{Feature} \times \text{Coefficient})$$

### Model Parameters

| Parameter / Feature | Range | Coefficient | Direction / Interpretation |
| :--- | :--- | :--- | :--- |
| **Intercept** | — | `-1.0` | Base adjustment factor |
| **Study Hours (Weekly)** | `8` - `30` | `+0.75` | Each hour of study adds 0.75 points |
| **Attendance Rate (%)** | `70` - `100` | `+0.25` | Each attendance percentage point adds 0.25 points |
| **Previous Grade (%)** | `60` - `90` | `+0.45` | Reflects baseline academic foundations |
| **Extracurricular Activities** | `0` - `3` | `+1.20` | Engaging in activities adds up to 3.6 points |
| **Parental Support (Level)** | `Low` (0) - `High` (2) | `+2.00` | Support tier adds up to 4.0 points |
| **Online Classes Taken** | `No` (0) / `Yes` (1) | `+1.50` | Completing online courses adds 1.5 points |
| **Sleep Hours (Daily)** | `4` - `10` | `+1.00` | Positive cognitive impact of healthy sleep habits |
| **Screen Time (Daily)** | `0` - `5` | `-0.80` | Negative impact of digital distraction and screen fatigue |
| **Gender** | `Male` (0) / `Female` (1) | `0.00` | No observed impact on predictions |

---

## 📁 Project Directory Structure

```
├── index.html                           # Dashboard HTML structure
├── styles.css                           # Core styling & glassmorphism system
├── app.js                               # Core controller & simulation engine
├── dataset.js                           # Clean student records (exported to window)
├── student_performance_updated_1000.csv # Source student performance database
└── convert_csv.ps1                      # PowerShell ETL script to parse/clean CSV to JS
```

---

## 🛠️ Data Pipeline & Setup

To refresh the dataset displayed in the dashboard explorer:

1. Place your updated student records inside `student_performance_updated_1000.csv`.
2. Open PowerShell and run the ETL script:
   ```powershell
   powershell -ExecutionPolicy Bypass -File .\convert_csv.ps1
   ```
3. The script will automatically clean invalid/missing cells, filter out outlier records (e.g., sleep outside `[2, 12]` hours, screen time outside `[0, 24]` hours), and output the clean JSON format directly into `dataset.js`.

---

## 💻 Running the Dashboard Locally

Since Aegis is built with vanilla HTML5, CSS3, and JavaScript, it does not require complex frameworks or package installation.

Simply run a local development server in the project directory:
```bash
# Using Python
python -m http.server 8000
```
Then navigate to `http://localhost:8000` in your web browser.
