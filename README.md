# 🏥 H+ — Hospital Readmission Prediction

Predicts the probability that a patient will be **readmitted to a hospital within 30 days** of their previous discharge, using clinical, billing, diagnosis, and demographic data.

🔗 **Live App:** [hospital-readmission-project-1.onrender.com](https://hospital-readmission-project-1.onrender.com/)
📦 **Repo:** [agamjotsinghsachdeva5/Hospital-readmission-project](https://github.com/agamjotsinghsachdeva5/Hospital-readmission-project)

> ⏳ Hosted on Render's free tier — the app may take 30–60 seconds to spin up on first load.

---

## 📌 Table of Contents

- [Problem Statement](#-problem-statement)
- [Solution](#-solution)
- [Dataset](#-dataset)
- [Exploratory Data Analysis](#-exploratory-data-analysis)
- [Data Preprocessing Pipeline](#-data-preprocessing-pipeline)
- [Model Selection](#-model-selection)
- [Evaluation Metrics](#-evaluation-metrics)
- [Data Validation](#-data-validation)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
- [Project Structure](#-project-structure)
- [Future Improvements](#-future-improvements)
- [Author](#-author)

---

## ❗ Problem Statement

Hospitals frequently face a high volume of patient readmissions within short time windows, which creates several downstream issues:

1. **Quality signal** — frequent readmissions can indicate the initial treatment was insufficient, hurting the hospital's rating.
2. **Capacity strain** — beds and resources meant for new patients and emergencies get consumed by preventable readmissions.
3. **Financial impact** — high readmission rates lead to reduced funding from the government and insurance providers.

## ✅ Solution

**H+** predicts a patient's 30-day readmission probability *in advance*, enabling hospitals to:

- Identify high-risk patients early and intervene appropriately.
- Reduce avoidable readmissions.
- Improve hospital ratings through better outcomes.
- Protect and improve government/insurance funding eligibility.

## 📊 Dataset

Sourced from the [India Hospital Readmission Dataset (2015–2024)](https://www.kaggle.com/datasets/digutlaranjithkumar/india-hospital-readmission-dataset-20152024) on Kaggle — 5 relational tables covering ~120,000 patients across 33 hospitals.

| Table | Description | Key Fields |
|---|---|---|
| **ADMISSIONS** | Per-stay clinical stats + target variable | `admit_date`, `discharge_date`, `los_days`, `charlson_index`, `hba1c`, `creatinine`, `haemoglobin`, `systolic_bp`, `readmitted_30d`, `readmitted_7d` |
| **BILLING** | Cost of stay, subsidies, out-of-pocket spend | `total_cost_inr`, `govt_subsidy_inr`, `out_of_pocket_inr`, `cost_category` |
| **DIAGNOSES** | ICD-10 coded diagnoses per admission | `icd10_code`, `diag_desc`, `diag_rank`, `diag_category` |
| **HOSPITALS** | Facility-level attributes (33 hospitals) | `state`, `tier`, `beds`, `teaching` |
| **PATIENTS** | Demographic & financial profile | `age`, `gender`, `state`, `bpl_card`, `insurance_type`, `comorbidity_count`, `prev_admissions` |

## 🔍 Exploratory Data Analysis

- **Age:** mean 48, median 53 (range 0–95)
- **Gender split:** 51% Male, 48% Female, 1% Other
- **Below Poverty Line (BPL):** 36% of patients
- **Insurance:** Ayushman 30%, None 29%, Private 25%, ESI 16%
- ~90% of patients have **0–3 comorbidities**; ~95% have **0–3 prior admissions**
- **Diagnosis categories:** 11 total — Cardiovascular, Endocrine, Respiratory & Infectious make up ~50%
- **Cost split:** Pharmacy 30%, Procedure 28%, Room 25%, Lab 17% — total cost ranges from ₹639 to ₹66L (mean ≈ ₹93,000)
- **Length of stay:** mean 6.25 days
- Vitals (Hb, creatinine, HbA1c, Charlson Index) are mostly within normal clinical ranges, with a long tail of high-risk outliers

## ⚙️ Data Preprocessing Pipeline

**1. Missing Value Imputation**
- Median imputation → Age, Charlson Index, HbA1c, Creatinine, Haemoglobin, Systolic BP, Out-of-Pocket INR
- Constant imputation → Gender ("Unknown"), BPL Card (-1), Insurance Type ("Unknown")
- Most-frequent imputation → Cost Category
- Binary **missing-indicator** columns generated for all imputed features to preserve missingness signal

**2. Categorical Encoding**
- **One-Hot Encoding** → Gender, Insurance Type, Cost Category, Admit Type, Ward Type, Discharge Type (`handle_unknown='ignore'`)
- **Ordinal Encoding** → Hospital Tier (Tier 3 → 0, Tier 2 → 1, Tier 1 → 2)

**3. Multi-Label Binarization**
- Diagnosis Category (11 possible categories per patient) converted into independent binary flags

**4. Feature Scaling**
- `StandardScaler` applied across all **59 engineered features** (mean 0, std 1)

## 🧠 Model Selection

**Logistic Regression** was chosen over tree-based (Decision Tree, Random Forest), boosting (XGBoost, Gradient Boosting), and distance-based (KNN, SVM) algorithms — it delivered better generalization on this dataset at a fraction of the computational cost and complexity.

## 📈 Evaluation Metrics

| Metric | Score |
|---|---|
| Accuracy | **82.96%** |
| Precision | **33.93%** |
| Recall | **46.37%** |
| F1 Score | **39.19%** |

## 🛡 Data Validation

All incoming requests are validated with **Pydantic `BaseModel`** before ever reaching the preprocessing pipeline:

1. **Type validation** — Integer / Float / String / List / Enum enforcement
2. **Range validation** — e.g. Age `0–120`, Charlson Index `0–6`, HbA1c `3–15`, Systolic BP `80–225`
3. **Categorical validation** — Enums for Gender, Insurance Type, Admission/Ward/Discharge Type, Hospital Tier, Cost Category, Diagnosis Category
4. **Date validation** — `Admission Date` / `Discharge Date` must match `DD/MM/YYYY` via a custom `@field_validator`
5. **Derived features** — `Length of Stay` is **never accepted as input**; it's computed automatically as `Discharge Date − Admission Date`
6. **Clean handoff** — validated input is passed as a structured object into the preprocessing + prediction pipeline

Invalid requests are rejected immediately with clear validation errors — bad data never reaches the model.

## 🛠 Tech Stack

- **Language:** Python
- **ML:** Scikit-learn (Logistic Regression, preprocessing pipeline)
- **Validation:** Pydantic
- **Deployment:** Render
- _<!-- add your web framework here, e.g. Flask / FastAPI / Streamlit -->_

## 🚀 Getting Started

```bash
# Clone the repo
git clone https://github.com/agamjotsinghsachdeva5/Hospital-readmission-project.git
cd Hospital-readmission-project

# Create and activate a virtual environment
python -m venv venv
source venv/bin/activate      # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run the app
python app.py
```

_<!-- adjust the run command above to match your actual entry point -->_

## 📁 Project Structure

```
Hospital-readmission-project/
├── data/                  # Raw / processed datasets
├── notebooks/              # EDA & experimentation notebooks
├── src/                    # Preprocessing, training & inference code
├── models/                  # Serialized trained model artifacts
├── app.py                  # Application entry point
├── requirements.txt
└── README.md
```

_<!-- update this to reflect your actual folder layout -->_

## 🔮 Future Improvements

- Experiment with class-imbalance techniques (SMOTE, class weighting) to lift recall/precision
- Add SHAP-based explainability so clinicians can see *why* a patient is flagged high-risk
- Expand to 7-day readmission prediction (`readmitted_7d` already available in the dataset)
- Add authentication and role-based access for clinical staff

## 👤 Author

**Agamjot Singh Sachdeva**
GitHub: [@agamjotsinghsachdeva5](https://github.com/agamjotsinghsachdeva5)

---

⭐ If you found this project useful, consider giving it a star on GitHub!