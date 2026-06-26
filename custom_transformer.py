from sklearn.base import BaseEstimator, TransformerMixin
from sklearn.preprocessing import MultiLabelBinarizer
import numpy as np

class MultiLabelBinarizerTransformer(BaseEstimator, TransformerMixin):
    def __init__(self, classes=None):
        self.classes = classes
        self.mlb = MultiLabelBinarizer(classes=classes)

    def fit(self, X, y=None):
        X_list = [eval(x) if isinstance(x, str) else x for x in X.ravel()]
        self.mlb.fit(X_list)
        return self

    def transform(self, X):
        X_list = [eval(x) if isinstance(x, str) else x for x in X.ravel()]
        return self.mlb.transform(X_list)

    def get_feature_names_out(self, input_features=None):
        return self.mlb.classes_
