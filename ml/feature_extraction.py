"""Feature extraction for URLs.
Provides `extract_features_from_url(url)` which returns a dict of features.
"""
import re
import math
from urllib.parse import urlparse

from ml.trusted_domains import (
    extract_root_domain,
    is_safe_tld,
    is_trusted_domain,
    is_valid_tld,
)

SUSPICIOUS_KEYWORDS = [
    'login', 'signin', 'bank', 'update', 'verify', 'account', 'secure',
    'ebayisapi', 'paypal', 'otp', 'password', 'confirm', 'billing', 'invoice'
]
SHORTENERS = ['bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'ow.ly', 'buff.ly', 'short.ly']
BRAND_TERMS = ['paypal', 'google', 'amazon', 'microsoft', 'apple', 'bank', 'login']
SUSPICIOUS_TLDS = ['zip', 'review', 'top', 'xyz', 'loan', 'country', 'gq', 'cf', 'tk']
FEATURE_COLUMNS = [
    'url_length', 'hostname_length', 'path_length', 'num_dots', 'num_subdomains',
    'query_param_count', 'url_depth', 'path_token_count', 'path_entropy',
    'has_https', 'has_ip', 'has_at', 'has_www', 'is_shortened', 'has_dash',
    'prefix_suffix', 'suspicious_tld', 'suspicious_words', 'brand_impersonation',
    'is_trusted_domain', 'is_safe_tld', 'valid_tld', 'redirection',
    'special_char_count', 'digit_ratio', 'special_char_ratio', 'reputation_score', 'trust_score'
]


def has_ip_address(host: str) -> int:
    if not host:
        return 0
    host = host.strip('[]')
    if re.fullmatch(r'\d+\.\d+\.\d+\.\d+', host):
        return 1
    if ':' in host and re.fullmatch(r'[0-9a-fA-F:]+', host):
        return 1
    return 0


def count_digits(s: str) -> int:
    return sum(c.isdigit() for c in s)


def entropy(s: str) -> float:
    if not s:
        return 0.0
    prob = [float(s.count(c)) / len(s) for c in set(s)]
    return -sum(p * math.log(p, 2) for p in prob if p > 0)


def count_query_params(query: str) -> int:
    if not query:
        return 0
    return len([p for p in query.split('&') if '=' in p])


def is_shortened_url(hostname: str) -> int:
    return 1 if any(hostname.endswith(short) for short in SHORTENERS) else 0


def count_path_tokens(path: str) -> int:
    return len(re.findall(r'[A-Za-z0-9]+', path))


def path_segments(path: str) -> list:
    return [segment for segment in path.split('/') if segment]


def is_suspicious_tld(hostname: str) -> int:
    if not hostname:
        return 0
    tld = hostname.split('.')[-1]
    return 1 if tld in SUSPICIOUS_TLDS else 0


def extract_features_from_url(url: str) -> dict:
    parsed = urlparse(url if '://' in url else 'http://' + url)
    hostname = (parsed.hostname or '').lower()
    path = parsed.path or ''
    query = parsed.query or ''
    full_path = path + ('?' + query if query else '')

    root_domain = extract_root_domain(hostname)
    url_length = len(url)
    hostname_length = len(hostname)
    path_length = len(path)
    num_dots = hostname.count('.')
    num_subdomains = max(0, num_dots - 1)
    query_param_count = count_query_params(query)
    path_tokens = count_path_tokens(path)
    url_depth = len(path_segments(path))
    has_https = 1 if parsed.scheme == 'https' else 0
    has_ip = has_ip_address(hostname)
    has_at = 1 if '@' in url else 0
    has_www = 1 if hostname.startswith('www.') else 0
    is_shortened = is_shortened_url(hostname)
    has_dash = 1 if '-' in hostname else 0
    prefix_suffix = 1 if '-' in hostname else 0
    suspicious_tld = is_suspicious_tld(hostname)
    suspicious_words = sum(1 for kw in SUSPICIOUS_KEYWORDS if kw in url.lower())
    brand_impersonation = 1 if any(term in hostname for term in BRAND_TERMS) and not is_trusted_domain(hostname) else 0
    valid_tld = 1 if is_valid_tld(hostname) else 0
    is_trusted_domain_flag = 1 if is_trusted_domain(hostname) else 0
    is_safe_tld_flag = 1 if is_safe_tld(hostname) else 0
    num_digits = count_digits(url)
    special_char_count = sum(1 for c in url if not c.isalnum() and c not in ':/.?&=#')
    digit_ratio = num_digits / url_length if url_length else 0
    special_char_ratio = special_char_count / url_length if url_length else 0
    path_entropy = round(entropy(full_path), 4)
    redirection = 1 if url.count('//') > 1 else 0

    length_penalty = max(0, min((url_length - 100) / 20, 15))
    depth_penalty = max(0, min((url_depth - 5) * 2, 12))

    reputation_score = min(100, int(
        has_ip * 30 + has_at * 25 + suspicious_words * 15 + brand_impersonation * 15 +
        is_shortened * 20 + suspicious_tld * 15 + redirection * 12 +
        min(special_char_ratio * 100, 20) + length_penalty + depth_penalty
    ))

    trust_score = max(0, min(100, int(
        50 + is_trusted_domain_flag * 30 + has_https * 10 + is_safe_tld_flag * 8 +
        valid_tld * 5 - has_ip * 30 - has_at * 20 - is_shortened * 25 - suspicious_words * 18 -
        suspicious_tld * 12 - brand_impersonation * 12 - redirection * 10 - min(special_char_ratio * 100, 20)
    )))

    return {
        'url': url,
        'root_domain': root_domain,
        'url_length': url_length,
        'hostname_length': hostname_length,
        'path_length': path_length,
        'num_dots': num_dots,
        'num_subdomains': num_subdomains,
        'query_param_count': query_param_count,
        'url_depth': url_depth,
        'path_token_count': path_tokens,
        'path_entropy': path_entropy,
        'has_https': has_https,
        'has_ip': has_ip,
        'has_at': has_at,
        'has_www': has_www,
        'is_shortened': is_shortened,
        'has_dash': has_dash,
        'prefix_suffix': prefix_suffix,
        'suspicious_tld': suspicious_tld,
        'suspicious_words': suspicious_words,
        'brand_impersonation': brand_impersonation,
        'is_trusted_domain': is_trusted_domain_flag,
        'is_safe_tld': is_safe_tld_flag,
        'valid_tld': valid_tld,
        'redirection': redirection,
        'special_char_count': special_char_count,
        'digit_ratio': round(digit_ratio, 4),
        'special_char_ratio': round(special_char_ratio, 4),
        'reputation_score': reputation_score,
        'trust_score': trust_score
    }


if __name__ == '__main__':
    print(extract_features_from_url('http://amaz0n-login-security.com'))
