# Student Performance Prediction & Simulation Dashboard

An interactive Machine Learning and Web Visualization application designed to predict and analyze student performance (final academic scores and grade tiers) based on a variety of academic, behavioral, and lifestyle features.

This project showcases a complete end-to-end data pipeline: synthetic dataset generation, training a linear regression model in Python, exporting model weights, and building a premium, highly interactive client-side web application for real-time predictions and simulations.

---

## 🚀 Key Features

1. **Real-Time Grade Predictor**: Adjust sliders (study hours, attendance, sleep, stress, etc.) and observe predicted percentage grades, letter grades (A-F), and risk statuses updating instantly with glassmorphic visualizations.
2. **What-If Comparator**: Compare two student scenarios side-by-side to understand how modifying specific parameters (like increasing sleep or tutoring) affects their predicted outcomes.
3. **Personalized Recommendation Engine**: Dynamically analyzes the student's metrics and generates custom, actionable tips (e.g., advising sleep increases, study adjustments, or tutoring recommendations).
4. **Interactive Chart Analytics**: Beautiful charts powered by Chart.js visualizing the feature impact weight distributions and student score distributions.
5. **Interactive Data Explorer**: A searchable, sortable table populated with realistic student records, allowing you to load any profile into the prediction engine with a single click.
6. **Fully Client-Side Inference**: The web app runs completely in the browser using the exported weights of the trained scikit-learn model, removing the need for a live server backend.

---

## 📂 Project Structure

```
anti project/
├── index.html             # Structure of the web application
├── styles.css             # Elegant glassmorphism styles and micro-animations
├── app.js                 # Frontend prediction runner, charts, and recommendations
├── dataset.js             # Seed database containing mock student records
├── train_model.py         # Python dataset generator and model trainer
├── requirements.txt       # Python package dependencies
└── README.md              # Project documentation
```

---

## 🛠️ Getting Started

### 1. Launch the Web Interface (Out of the Box)
The web application is preconfigured with default model coefficients matching a fully trained student performance model. You can launch it immediately!
- Simply double-click **`index.html`** or serve it using a local server (e.g., Live Server in VS Code, or `python -m http.server 8000`).

### 2. Train a Custom Model (Optional)
If you want to generate a new dataset and train a custom Linear Regression model:

1. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Run the training pipeline**:
   ```bash
   python train_model.py
   ```
   This script will:
   - Generate a dataset containing 1,000 synthetic student records with realistic variance.
   - Save the dataset as `student_data.csv`.
   - Train a Scikit-Learn `LinearRegression` model.
   - Print model evaluation statistics (Mean Absolute Error, $R^2$).
   - Output model weights to `model_coefficients.json`.

---

## 📊 Feature Reference

| Feature | Range / Options | Description | Impact |
| :--- | :--- | :--- | :--- |
| **Study Hours** | `0 - 30` hours/week | Time spent studying outside class | Highly Positive (+0.8% per hr) |
| **Attendance Rate** | `0 - 100` % | Percentage of lectures attended | Positive (+0.25% per %) |
| **Sleep Hours** | `4 - 10` hours/night | Average nightly sleep | Positive (+1.2% per hr) |
| **Screen Time** | `0 - 40` hours/week | Social media, video games, etc. | Negative (-0.15% per hr) |
| **Parental Support**| `Low`, `Medium`, `High` | Degree of parental involvement | Positive (+2.0% per level) |
| **Tutoring** | `Yes`, `No` | Enrollment in extra academic tutoring | Highly Positive (+3.5% for Yes) |
| **Extracurriculars**| `Yes`, `No` | Participation in school clubs/sports | Slightly Positive (+1.0% for Yes) |
| **Stress Level** | `1 - 10` scale | Level of student-reported stress | Negative (-0.5% per level) |
| **Pre-Test Score** | `0 - 100` % | Score on past benchmark evaluations | Positive (+0.4% per %) |
