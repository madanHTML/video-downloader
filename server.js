import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(bodyParser.json());

const PORT = process.env.PORT || 5000;
const DOWNLOADS = path.join(__dirname, 'downloads');

if (!fs.existsSync(DOWNLOADS)) fs.mkdirSync(DOWNLOADS, { recursive: true });

app.get('/health', (_req, res) => res.json({ ok: true }));

app.post('/download', (req, res) => {
  const { url, quality } = req.body;
  if (!url) return res.status(400).json({ success: false, error: 'No URL provided' });

  const q = Number(quality) || 1080;
  const height = Math.min(q, 4320);

  const out = path.join(DOWNLOADS, '%(title)s.%(ext)s');
  const cmd = `yt-dlp -f "bestvideo[height<=${height}]+bestaudio/best" --merge-output-format mp4 -o "${out}" ${url}`;

  console.log('Running:', cmd);
  const child = exec(cmd, { maxBuffer: 1024 * 1024 * 50 }, (error, stdout, stderr) => {
    if (error) {
      console.error('yt-dlp error:', stderr || error.message);
      return res.status(500).json({ success: false, error: stderr || error.message });
    }
    console.log('yt-dlp finished');
    res.json({ success: true, message: `Download started (<= ${height}p). Saved in backend/downloads/` });
  });

  child.stdout && child.stdout.on('data', d => console.log(d.toString()));
  child.stderr && child.stderr.on('data', d => console.error(d.toString()));
});

const buildPath = path.join(__dirname, '..', 'frontend', 'build');
if (fs.existsSync(buildPath)) {
  app.use(express.static(buildPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(buildPath, 'index.html'));
  });
} else {
  app.get('/', (_req, res) => {
    res.send('<h2>Backend running. Frontend build not found. Build frontend and place in frontend/build/ to serve UI.</h2><p>Use /download POST API to start downloads.</p>');
  });
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
