"""Train phishing detection models and save best model and scaler."""
import os
import sys
import joblib
import argparse
import numpy as np
import pandas as pd

# Ensure project root is in sys.path when running script directly as `python ml\train_model.py`
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.tree import DecisionTreeClassifier
from sklearn.metrics import accuracy_score, classification_report

try:
    from xgboost import XGBClassifier
except ImportError:
    XGBClassifier = None

from ml.preprocess import load_dataset, build_feature_matrix, split_and_scale


def train(dataset_path: str, out_dir: str = 'model'):
    os.makedirs(out_dir, exist_ok=True)
    print('Loading dataset...')
    df = load_dataset(dataset_path)
    X, y = build_feature_matrix(df)
    print('Extracted features shape:', X.shape)
    X_train, X_test, y_train, y_test, scaler = split_and_scale(X, y)

    models = {
        'logistic': LogisticRegression(max_iter=1000),
        'decision_tree': DecisionTreeClassifier(random_state=42),
        'random_forest': RandomForestClassifier(n_estimators=150, random_state=42)
    }
    if XGBClassifier is not None:
        models['xgboost'] = XGBClassifier(use_label_encoder=False, eval_metric='logloss', random_state=42)

    results = {}
    for name, m in models.items():
        print('Training', name)
        m.fit(X_train, y_train)
        preds = m.predict(X_test)
        acc = accuracy_score(y_test, preds)
        results[name] = (m, acc)
        print(f'{name} accuracy: {acc:.4f}')

    # choose best model
    best_name = max(results.items(), key=lambda x: x[1][1])[0]
    best_model, best_acc = results[best_name]
    print('Best model:', best_name, 'accuracy=', best_acc)

    # save model and scaler
    model_path = os.path.join(out_dir, 'phishing_model.pkl')
    scaler_path = os.path.join(out_dir, 'scaler.pkl')
    joblib.dump(best_model, model_path)
    joblib.dump(scaler, scaler_path)
    print('Saved model to', model_path)
    print('Saved scaler to', scaler_path)

    # Print classification report for best model
    preds = best_model.predict(X_test)
    print('\nClassification report for best model:')
    print(classification_report(y_test, preds))


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--data', default='dataset/phishing_dataset.csv')
    parser.add_argument('--out', default='model')
    args = parser.parse_args()
    train(args.data, args.out)
