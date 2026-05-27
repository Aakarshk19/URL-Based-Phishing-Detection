# Deployment Notes

Example `Procfile` for Render/Railway:

```
web: gunicorn app:app
```

Ensure `requirements.txt` is present. For Heroku/Render, add `runtime.txt` if you need a specific Python version.
