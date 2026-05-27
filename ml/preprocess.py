"""Preprocessing helpers: load dataset, extract features dataframe, split, scale."""
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from ml.feature_extraction import extract_features_from_url, FEATURE_COLUMNS


def load_dataset(path: str) -> pd.DataFrame:
    df = pd.read_csv(path)
    df = df.dropna(subset=['url', 'label'])
    df['label'] = df['label'].astype(int)
    return df


def build_feature_matrix(df: pd.DataFrame):
    features = []
    for u in df['url'].values:
        feats = extract_features_from_url(u)
        features.append([feats[col] for col in FEATURE_COLUMNS])
    X = pd.DataFrame(features, columns=FEATURE_COLUMNS)
    y = df['label'].values
    return X, y


def split_and_scale(X, y, test_size=0.2, random_state=42):
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=test_size, random_state=random_state, stratify=y
    )
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    return X_train_scaled, X_test_scaled, y_train, y_test, scaler
