import joblib
import numpy as np
import pandas as pd
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, field_validator, Field
from typing import List, Optional
from enum import Enum
from datetime import datetime

BASE_DIR = Path(__file__).resolve().parent
pipe = joblib.load(BASE_DIR / "pipeline.pkl")
class GenderEnum(str, Enum):
    M="M"
    F="F"
    Other="Other"

class InsuranceEnum(str, Enum):
    ESI="ESI"
    Private="Private"
    Ayushman="Ayushman"
    NONE="NONE"

class AdmitEnum(str, Enum):
    Emergency="Emergency"
    Elective="Elective"
    OPD="OPD"

class WardEnum(str, Enum):
    ICU="ICU"
    HDU="HDU"
    NICU="NICU"
    General="General"

class DischargeEnum(str, Enum):
    Expired="Expired"
    Recovered="Recovered"
    LAMA="LAMA"
    Referred="Referred"

class TierEnum(str, Enum):
    tier1="tier1"
    tier2="tier2"
    tier3="tier3"

class CostEnum(str, Enum):
    Pharmacy="Pharmacy"
    Room="Room"
    Procedure="Procedure"
    Lab="Lab"

class DiagEnum(str, Enum):
    Cardiovascular = "Cardiovascular"
    Endocrine = "Endocrine"
    Respiratory = "Respiratory"
    Infectious = "Infectious"
    Gastrointestinal = "Gastrointestinal"
    Neoplasm = "Neoplasm"
    Injury = "Injury"
    Neurological = "Neurological"
    Genitourinary = "Genitourinary"
    Obstetric = "Obstetric"
    Perinatal = "Perinatal"

class InputModel(BaseModel):

    age : int =Field(default=None,ge=0,le=120,description="Age of the Patient in years.",examples=[12,45,90])
    gender : GenderEnum|None =Field(default=None,description="Gender of the patient. M for male, F for female and Other for others.",examples=["M","F","Other"])
    bpl_card : int|None =Field(default=None,ge=0,le=1,description="If patient has below poverty line card than 1 else 0.",examples=[0,1])
    insurance_type: InsuranceEnum|None=Field(default=None,description="Type of insurance owned by the patient.",examples=["ESI"])
    comorbidity_count: int=Field(...,ge=0,le=10,description="Number of comorbidities of the patient.",examples=[1,2,3])
    prev_admissions: int=Field(...,ge=0,le=10,description="Number of times the patient has admitted previously.",examples=[3,6])
    admit_date: str=Field(...,description="Date of admission of the patient in dd/mm/yyyy format.",examples=["02/10/2025"])
    discharge_date: str=Field(...,description="Date of discharge of the patient in dd/mm/yyyy format.",examples=["15/07/2026"])
    admit_type: AdmitEnum=Field(...,description="Type of admission.", examples=["OPD"])
    ward_type: WardEnum=Field(...,description="Type of ward in which patient is admitted.",examples= ["ICU"])
    discharge_type: DischargeEnum=Field(...,description="Discharge type of the patient.",examples= ["Recovered"])
    num_procedures: int=Field(...,ge=0,le=20,description="Number of procedures of treatment of the patient",examples=[1,2])
    charlson_index: int=Field(...,ge=0,le=6,description="Charlson Index of the disease of the patient",examples=[0,2,5])
    hba1c: float=Field(...,ge=3,le=15,description="hba1c of the patient",examples=[9.25,5.7])
    creatinine: float=Field(...,ge=0.35,le=16,description="creatinine of the patient",examples=[1.01,11.65])
    haemoglobin: float=Field(...,ge=3,le=19,description="haemoglobin of the patient",examples=[6.87,10.71])
    systolic_bp: float=Field(...,ge=80,le=225,description="systolic_bp of the patient",examples=[135,200])
    tier: TierEnum=Field(...,description="Tier of the hospital where the patient is admitted.",examples=["tier1","tier2","tier3"])
    beds: int=Field(...,ge=40,le=2500,description="Number of beds available in the hospital",examples=[198,1280])
    teaching: int=Field(...,ge=0,le=1,description="Does the hospital provide the facility of teaching to students.",examples=[0,1])
    total_cost_inr: float|None=Field(default=None,ge=0,le=20000000,description="Total expenses of the hospital in INR.",examples=[56890,1234000])
    govt_subsidy_inr: Optional[float]=Field(default=None,ge=0,le=20000000,description="Total subsidy provided by the government or insurance company in INR.",examples=[5680,340000])
    cost_category: CostEnum|None=Field(default=None,description="Major reason of the expenses in the hospital.",examples=["Lab","Room"])
    diag_category: List[DiagEnum]

    @field_validator("admit_date")
    @classmethod
    def admit_date_validator(cls,v):
        try:
            datetime.strptime(v,"%d/%m/%Y")
        except ValueError :
            raise ValueError ("Admit date must be in dd/mm/yyyy format")
        return v

    @field_validator("discharge_date")
    @classmethod
    def discharge_date_validator(cls,v):
        try:
            datetime.strptime(v,"%d/%m/%Y")
        except ValueError :
            raise ValueError ("Discharge date must be in dd/mm/yyyy format")
        return v       


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)

app.mount(
    "/images",
    StaticFiles(directory=BASE_DIR / "images"),
    name="images"
)

@app.get("/", include_in_schema=False)
def frontend():
    return FileResponse(BASE_DIR / "index.html")

@app.get("/health")
def health_check():
    return {
        "status": "running"
    }

@app.get("/styles.css", include_in_schema=False)
def frontend_styles():
    return FileResponse(BASE_DIR / "styles.css", media_type="text/css")

@app.get("/app.js", include_in_schema=False)
def frontend_script():
    return FileResponse(
        BASE_DIR / "app.js",
        media_type="application/javascript"
    )

@app.post("/input")
def input(input_data: InputModel):
    
    try:
        adm = datetime.strptime(input_data.admit_date, "%d/%m/%Y")
        dis = datetime.strptime(input_data.discharge_date, "%d/%m/%Y")
        los_days = max((dis - adm).days, 0)
    except Exception:
        los_days = 0

    if input_data.total_cost_inr is None or input_data.govt_subsidy_inr is None:
        out_of_pocket = 0.0
    elif input_data.total_cost_inr < input_data.govt_subsidy_inr:
        out_of_pocket = 0.0
    else:
        out_of_pocket = input_data.total_cost_inr - input_data.govt_subsidy_inr

    return {
        "age":input_data.age,
        "gender":input_data.gender,
        "bpl_card":input_data.bpl_card,
        "insurance_type":input_data.insurance_type,
        "comorbidity_count":input_data.comorbidity_count,
        "prev_admissions":input_data.prev_admissions,
        "los_days": los_days,
        "admit_type":input_data.admit_type,
        "ward_type":input_data.ward_type,
        "discharge_type":input_data.discharge_type,
        "num_procedures":input_data.num_procedures,
        "charlson_index":input_data.charlson_index,
        "hba1c":input_data.hba1c,
        "creatinine":input_data.creatinine,
        "haemoglobin":input_data.haemoglobin,
        "systolic_bp":input_data.systolic_bp,
        "tier":input_data.tier,
        "beds":input_data.beds,
        "teaching":input_data.teaching,
        "out_of_pocket_inr": out_of_pocket,
        "cost_category":input_data.cost_category,
        "diag_category":input_data.diag_category
        
    }

@app.post("/predict")
def predict(input_data: InputModel):
   
    input_response = input(input_data)   

    df = pd.DataFrame([input_response]).replace({None: np.nan})

    prediction = pipe.predict(df)[0]

    return {"prediction": "Patient will be readmitted." if int(prediction)==1 else "Patient will not be readmitted." }
