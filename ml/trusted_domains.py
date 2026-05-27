import re

TRUSTED_DOMAINS = {
    'google.com',
    'github.com',
    'geeksforgeeks.org',
    'microsoft.com',
    'wikipedia.org',
    'amazon.com',
    'openai.com',
    'stackoverflow.com',
    'youtube.com',
    'medium.com',
    'mozilla.org',
    'apple.com',
    'linkedin.com',
    'python.org'
}

SAFE_TLDS = {'org', 'edu', 'gov', 'mil', 'int'}

MULTI_SEGMENT_PUBLIC_SUFFIXES = {
    'co.uk', 'gov.uk', 'ac.uk', 'co.jp', 'com.au', 'edu.au', 'gov.au'
}

def normalize_hostname(hostname: str) -> str:
    if not hostname:
        return ''
    return hostname.strip().lower().rstrip('.')


def extract_root_domain(hostname: str) -> str:
    hostname = normalize_hostname(hostname)
    if not hostname:
        return ''

    parts = hostname.split('.')
    if len(parts) <= 2:
        return hostname

    candidate = '.'.join(parts[-2:])
    public_suffix = '.'.join(parts[-3:])
    if public_suffix in MULTI_SEGMENT_PUBLIC_SUFFIXES:
        return public_suffix
    return candidate


def is_trusted_domain(hostname: str) -> bool:
    root = extract_root_domain(hostname)
    return root in TRUSTED_DOMAINS


def is_safe_tld(hostname: str) -> bool:
    hostname = normalize_hostname(hostname)
    if '.' not in hostname:
        return False
    tld = hostname.split('.')[-1]
    return tld in SAFE_TLDS


def is_valid_tld(hostname: str) -> bool:
    hostname = normalize_hostname(hostname)
    if '.' not in hostname:
        return False
    tld = hostname.split('.')[-1]
    return bool(re.fullmatch(r'[a-z]{2,}', tld))
