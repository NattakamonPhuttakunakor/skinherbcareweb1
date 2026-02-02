Deployment checklist — quick guide (Render)

1) Prepare environment variables (Render dashboard -> Service -> Environment)
   - For Node service (`skinherbcare-node`):
     - NODE_ENV = production
     - PYTHON_API_URL = https://<your-python-service>.onrender.com/predict
     - PYTHON_API_KEY = <secret-shared-key>
     - MONGODB_URI = <your-mongodb-connection-string>
   - For Python service (`skinherbcare-python`):
     - PYTHON_API_KEY = <same-secret-as-node>

2) Python service (AI)
   - Repo path: project root, Python app is at `src/app.py`.
   - Render start command (in render.yaml): `gunicorn src.app:app -b 0.0.0.0:$PORT` (gunicorn is already in `src/requirements.txt`).
   - Health endpoint: GET / returns JSON with `ai_ready` flag.

3) Node service (API + frontend)
   - Start command: `npm start` (already in `package.json` and points to `src/server.js`).
   - Health endpoint: GET /status returns Python reachability + missing envs info.

4) After deployment steps
   - Deploy Python service first. Copy the public URL and set it to `PYTHON_API_URL` for the Node service (include `/predict` suffix).
   - Deploy Node service and visit the frontend URL.
   - Test: Open `<node-service-url>/status` to confirm `python.reachable` is true and `missing_envs` is empty.

5) Troubleshooting tips
   - 401 Unauthorized from /predict: check `PYTHON_API_KEY` matches exactly on both services (no extra spaces).
   - 422 Unprocessable Content: frontend enforces at least 3 characters; Python returns 400 when `symptoms` missing.
   - If your Node service fails to start because of DB, ensure `MONGODB_URI` is set; Dev mode still allows start but production expects it.

6) Optional improvements after first deploy
   - Set up SSL / custom domain on Render.
   - Configure health checks and alerts in Render.
   - Move secrets to Render secrets and do not commit them to repo.

If you want, I can:
 - Prepare a ready-to-commit `render.yaml` (done) and an example `.env.sample` (I can add it),
 - Add a GitHub Action to automatically deploy to Render when pushing to `main`.

Tell me which next step you want me to take and I'll do it now.