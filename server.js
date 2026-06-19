// YouTube Uploader — Step 1: prove OAuth + a private test upload.
// Single-channel personal tool. Holds the refresh token in memory,
// seeded from YT_REFRESH_TOKEN so authorization survives restarts once set.

import express from "express";
import multer from "multer";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { google } from "googleapis";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = process.env.PORT || 3000;
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;

// Render sets RENDER_EXTERNAL_URL automatically. BASE_URL lets you override.
const BASE_URL = (
  process.env.BASE_URL ||
  process.env.RENDER_EXTERNAL_URL ||
  `http://localhost:${PORT}`
).replace(/\/$/, "");
const REDIRECT_URI = `${BASE_URL}/oauth2callback`;

// Only scope needed to upload. The insert response itself reports privacy
// status, so no extra read scope is required to confirm the gate.
const SCOPES = ["https://www.googleapis.com/auth/youtube.upload"];

let refreshToken = process.env.YT_REFRESH_TOKEN || null;

function oauthClient() {
  return new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}

const app = express();
const upload = multer({
  dest: os.tmpdir(),
  limits: { fileSize: 1024 * 1024 * 1024 }, // 1 GB cap (keep the test clip small)
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/api/status", (req, res) => {
  res.json({
    configured: Boolean(CLIENT_ID && CLIENT_SECRET),
    authorized: Boolean(refreshToken),
    redirectUri: REDIRECT_URI,
  });
});

app.get("/auth", (req, res) => {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    return res
      .status(500)
      .send("Missing CLIENT_ID / CLIENT_SECRET. Set them in Render → Environment.");
  }
  const url = oauthClient().generateAuthUrl({
    access_type: "offline",
    prompt: "consent", // forces a refresh_token back every time
    scope: SCOPES,
  });
  res.redirect(url);
});

app.get("/oauth2callback", async (req, res) => {
  const code = req.query.code;
  if (!code) return res.status(400).send("Missing authorization code.");
  try {
    const { tokens } = await oauthClient().getToken(code);
    if (tokens.refresh_token) refreshToken = tokens.refresh_token;
    const token = refreshToken
      ? escapeHtml(refreshToken)
      : "(no refresh token returned — revoke this app at myaccount.google.com/permissions and re-authorize)";
    res.send(`<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Authorized</title>
<style>
  :root { --accent:#2f80ff; }
  body { font:16px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; color:#1d1d1f; background:#f5f5f7; margin:0; padding:32px 20px; }
  .card { max-width:640px; margin:0 auto; background:#fff; border-radius:18px; padding:28px; box-shadow:0 1px 3px rgba(0,0,0,.08); }
  h1 { font-size:22px; margin:0 0 6px; }
  p { color:#444; }
  code { display:block; word-break:break-all; background:#f0f0f3; border-radius:10px; padding:14px; margin:14px 0; font:13px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace; }
  a.btn { display:inline-block; background:var(--accent); color:#fff; text-decoration:none; padding:11px 18px; border-radius:11px; font-weight:600; }
  button { font:inherit; border:0; background:#e8e8ed; border-radius:9px; padding:8px 14px; cursor:pointer; }
  .muted { font-size:13px; color:#86868b; }
</style></head>
<body><div class="card">
  <h1>✅ Authorized</h1>
  <p>You can go back and upload a test video now. To make this permanent (so you never click Authorize again):</p>
  <p class="muted">1. Copy the refresh token below. 2. In Render → your service → <b>Environment</b>, add <b>YT_REFRESH_TOKEN</b> with this value. 3. Save (Render redeploys). Keep it secret — it grants upload access to your channel.</p>
  <code id="tok">${token}</code>
  <button onclick="navigator.clipboard.writeText(document.getElementById('tok').textContent).then(()=>{this.textContent='Copied'})">Copy token</button>
  &nbsp;<a class="btn" href="/">Back to uploader</a>
</div></body></html>`);
  } catch (err) {
    res.status(500).send("OAuth error: " + escapeHtml(err?.message || String(err)));
  }
});

app.post("/api/upload", upload.single("video"), async (req, res) => {
  if (!refreshToken) {
    return res.status(401).json({ error: "Not authorized yet — click Authorize first." });
  }
  if (!req.file) return res.status(400).json({ error: "No file received." });

  const tmpPath = req.file.path;
  try {
    const auth = oauthClient();
    auth.setCredentials({ refresh_token: refreshToken });
    const youtube = google.youtube({ version: "v3", auth });

    const title = (req.body.title || "API test upload").slice(0, 100);
    const description =
      req.body.description || "Test upload via the YouTube Data API.";

    const result = await youtube.videos.insert({
      part: ["snippet", "status"],
      requestBody: {
        snippet: { title, description, categoryId: "1" }, // 1 = Film & Animation
        status: { privacyStatus: "private", selfDeclaredMadeForKids: false },
      },
      media: { body: fs.createReadStream(tmpPath) },
    });

    const v = result.data;
    res.json({
      id: v.id,
      privacyStatus: v.status?.privacyStatus,
      uploadStatus: v.status?.uploadStatus,
      watchUrl: `https://youtu.be/${v.id}`,
      studioUrl: `https://studio.youtube.com/video/${v.id}/edit`,
    });
  } catch (err) {
    const reason = err?.errors?.[0]?.reason;
    const msg = err?.response?.data?.error?.message || err?.message || String(err);
    res.status(500).json({ error: reason ? `${reason}: ${msg}` : msg });
  } finally {
    fs.unlink(tmpPath, () => {});
  }
});

app.listen(PORT, () => {
  console.log(`YouTube uploader (test) listening on ${BASE_URL}`);
  console.log(`Redirect URI to register in Google Cloud: ${REDIRECT_URI}`);
});
