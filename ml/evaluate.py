"""Evaluation utilities for trained model."""
import joblib
import numpy as np
import matplotlib.pyplot as plt
from sklearn.metrics import confusion_matrix, ConfusionMatrixDisplay


def plot_confusion_matrix(model_path: str, X_test, y_test, out_path='confusion.png'):
    model = joblib.load(model_path)
    preds = model.predict(X_test)
    cm = confusion_matrix(y_test, preds)
    disp = ConfusionMatrixDisplay(confusion_matrix=cm)
    disp.plot()
    plt.savefig(out_path)
    print('Saved confusion matrix to', out_path)
