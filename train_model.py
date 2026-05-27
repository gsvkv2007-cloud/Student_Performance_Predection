import numpy as np
import pandas as pd
import json
import os
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, r2_score

def generate_student_data(num_students=1000, seed=42):
    np.random.seed(seed)
    
    first_names = [
        "Koushik", "prashanth", "venkatesh", "Elijah", "James", "Benjamin", "Lucas", "William", "Henry", "Alexander",
        "Mason", "Michael", "Ethan", "Daniel", "Jacob", "Logan", "Jackson", "Levi", "Sebastian", "Jack",
        "Olivia", "Emma", "Charlotte", "Amelia", "Sophia", "Isabella", "Ava", "Mia", "Evelyn", "Harper"
    ]
    last_names = [
        "Gurajala", "karedla", "Amudalapalli", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez",
        "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin",
        "Lee", "Perez", "Thompson", "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson"
    ]
    
    data = []
    for i in range(num_students):
        student_id = f"STU{1000 + i}"
        name = f"{np.random.choice(first_names)} {np.random.choice(last_names)}"
        
        # Behaviors
        study_hours = round(np.random.uniform(2.0, 25.0), 1)
        attendance = round(np.random.uniform(60.0, 100.0), 1)
        sleep_hours = round(np.random.uniform(4.5, 9.5), 1)
        screen_time = round(np.random.uniform(5.0, 35.0), 1)
        
        # Categorical features
        parental_involvement = np.random.choice(["Low", "Medium", "High"], p=[0.2, 0.5, 0.3])
        tutoring = np.random.choice(["No", "Yes"], p=[0.7, 0.3])
        extracurricular = np.random.choice(["No", "Yes"], p=[0.5, 0.5])
        
        # Academic & psychological
        stress_level = int(np.random.randint(1, 11))
        pre_test_score = round(np.random.uniform(40.0, 100.0), 1)
        
        # Calculate final score based on a realistic linear formula plus noise
        # Base score is around 15.
        parental_val = {"Low": 0, "Medium": 2, "High": 4}[parental_involvement]
        tutoring_val = {"No": 0, "Yes": 3.5}[tutoring]
        extra_val = {"No": 0, "Yes": 1.0}[extracurricular]
        
        noise = np.random.normal(0, 2.2)
        
        final_score = (
            14.5 +
            0.82 * study_hours +
            0.24 * attendance +
            1.15 * sleep_hours -
            0.12 * screen_time +
            parental_val +
            tutoring_val +
            extra_val -
            0.45 * stress_level +
            0.38 * pre_test_score +
            noise
        )
        
        final_score = round(float(np.clip(final_score, 0.0, 100.0)), 1)
        
        data.append({
            "StudentID": student_id,
            "Name": name,
            "StudyHours": study_hours,
            "Attendance": attendance,
            "SleepHours": sleep_hours,
            "ScreenTime": screen_time,
            "ParentalInvolvement": parental_involvement,
            "Tutoring": tutoring,
            "Extracurricular": extracurricular,
            "StressLevel": stress_level,
            "PreTestScore": pre_test_score,
            "FinalScore": final_score
        })
        
    return pd.DataFrame(data)

def main():
    print("Generating student performance dataset...")
    df = generate_student_data(1000)
    
    # Save raw CSV
    csv_path = "student_data.csv"
    df.to_csv(csv_path, index=False)
    print(f"Dataset generated and saved to {csv_path} ({len(df)} records)")
    
    # Prepare features for regression
    # Map categoricals to numeric
    df_model = df.copy()
    parental_map = {"Low": 0, "Medium": 1, "High": 2}
    yes_no_map = {"No": 0, "Yes": 1}
    
    df_model["ParentalInvolvement"] = df_model["ParentalInvolvement"].map(parental_map)
    df_model["Tutoring"] = df_model["Tutoring"].map(yes_no_map)
    df_model["Extracurricular"] = df_model["Extracurricular"].map(yes_no_map)
    
    feature_cols = [
        "StudyHours", "Attendance", "SleepHours", "ScreenTime", 
        "ParentalInvolvement", "Tutoring", "Extracurricular", 
        "StressLevel", "PreTestScore"
    ]
    
    X = df_model[feature_cols]
    y = df_model["FinalScore"]
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    # Train Linear Regression model
    print("Training Linear Regression model...")
    model = LinearRegression()
    model.fit(X_train, y_train)
    
    # Evaluate
    y_pred = model.predict(X_test)
    mae = mean_absolute_error(y_test, y_pred)
    r2 = r2_score(y_test, y_pred)
    
    print("\n--- Model Evaluation Results ---")
    print(f"Mean Absolute Error (MAE): {mae:.3f} points")
    print(f"R-squared Score (R2): {r2:.3f}")
    print("--------------------------------\n")
    
    # Extract coefficients
    coefficients = {}
    for col, coef in zip(feature_cols, model.coef_):
        coefficients[col] = round(float(coef), 4)
        
    model_export = {
        "intercept": round(float(model.intercept_), 4),
        "coefficients": coefficients,
        "metrics": {
            "r2_score": round(float(r2), 4),
            "mae": round(float(mae), 4),
            "sample_size": len(df)
        }
    }
    
    # Save to JSON
    json_path = "model_coefficients.json"
    with open(json_path, "w") as f:
        json.dump(model_export, f, indent=2)
        
    print(f"Model coefficients exported successfully to {json_path}")
    print("\nFeature Weights (Coefficients):")
    for feature, weight in coefficients.items():
        print(f" - {feature:20}: {weight:+.4f}")
    print(f" - Intercept           : {model_export['intercept']:+.4f}")

if __name__ == "__main__":
    main()
