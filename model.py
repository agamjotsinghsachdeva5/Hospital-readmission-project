import joblib
import numpy as np

pipe = joblib.load("pipeline.pkl")
X_test, y_test = joblib.load("test_data.pkl")

y_pred = pipe.predict(X_test)
print(y_pred)