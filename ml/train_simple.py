"""Simple pure-Python logistic regression trainer to avoid external dependencies.
Saves model and scaler using pickle to `model/`.
"""
import csv
import math
import os
import sys
import pickle

# Ensure package imports work when running directly.
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from ml.feature_extraction import extract_features_from_url, FEATURE_COLUMNS


class SimpleScaler:
    def __init__(self):
        self.mean = None
        self.std = None

    def fit(self, X):
        n = len(X)
        m = len(X[0])
        self.mean = [0.0]*m
        for row in X:
            for j,v in enumerate(row):
                self.mean[j] += v
        self.mean = [v/n for v in self.mean]
        self.std = [0.0]*m
        for row in X:
            for j,v in enumerate(row):
                self.std[j] += (v - self.mean[j])**2
        self.std = [math.sqrt(v/(n if n>1 else 1)) or 1.0 for v in self.std]

    def transform(self, X):
        return [[(v - self.mean[j])/self.std[j] for j,v in enumerate(row)] for row in X]


class SimpleLogistic:
    def __init__(self):
        self.w = None  # includes bias as last weight

    @staticmethod
    def _sigmoid(x):
        return 1.0 / (1.0 + math.exp(-x))

    def fit(self, X, y, lr=0.1, epochs=2000):
        n = len(X)
        m = len(X[0])
        self.w = [0.0]*(m+1)
        for epoch in range(epochs):
            grad = [0.0]*(m+1)
            loss = 0.0
            for i in range(n):
                xi = X[i]
                linear = sum(self.w[j]*xi[j] for j in range(m)) + self.w[m]
                pred = self._sigmoid(linear)
                err = pred - y[i]
                loss += - (y[i]*math.log(pred+1e-12) + (1-y[i])*math.log(1-pred+1e-12))
                for j in range(m):
                    grad[j] += err * xi[j]
                grad[m] += err
            # update
            for j in range(m+1):
                self.w[j] -= lr * grad[j] / n
            if epoch % 500 == 0:
                pass

    def predict_proba(self, X):
        single = False
        if not hasattr(X[0], '__iter__'):
            X = [X]
            single = True
        res = []
        m = len(X[0])
        for xi in X:
            linear = sum(self.w[j]*xi[j] for j in range(m)) + self.w[m]
            p = self._sigmoid(linear)
            res.append([1-p, p])
        return res[0] if single else res


def load_csv(path):
    X = []
    y = []
    with open(path, newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            url = row.get('url')
            lab = int(row.get('label') or 0)
            feats = extract_features_from_url(url)
            X.append([feats[col] for col in FEATURE_COLUMNS])
            y.append(lab)
    return X, y


def train(data_path='dataset/phishing_dataset.csv', out_dir='model'):
    os.makedirs(out_dir, exist_ok=True)
    X, y = load_csv(data_path)
    scaler = SimpleScaler()
    scaler.fit(X)
    Xs = scaler.transform(X)

    model = SimpleLogistic()
    model.fit(Xs, y, lr=0.5, epochs=2000)

    # save
    with open(os.path.join(out_dir, 'phishing_model.pkl'), 'wb') as f:
        pickle.dump(model, f)
    with open(os.path.join(out_dir, 'scaler.pkl'), 'wb') as f:
        pickle.dump(scaler, f)
    print('Saved simple model and scaler to', out_dir)


if __name__ == '__main__':
    train()
