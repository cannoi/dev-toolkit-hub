const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const http = require('http');
const https = require('https');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Database setup
const dbFile = path.join(__dirname, 'data', 'devtoolkit.db');
const fs = require('fs');
if (!fs.existsSync(path.join(__dirname, 'data'))) {
  fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
}

const db = new sqlite3.Database(dbFile, (err) => {
  if (err) {
    console.error('Error opening database', err.message);
  } else {
    db.run(`CREATE TABLE IF NOT EXISTS history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tool TEXT,
      content TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
  }
});

// Health endpoint
app.get('/health', (req, res) => {
  db.get("SELECT 1", (err) => {
    if (err) {
      res.status(500).json({ status: 'error', database: err.message });
    } else {
      res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date() });
    }
  });
});

// API History endpoints
app.get('/api/history', (req, res) => {
  const tool = req.query.tool;
  let query = 'SELECT * FROM history';
  let params = [];
  if (tool) {
    query += ' WHERE tool = ?';
    params.push(tool);
  }
  query += ' ORDER BY created_at DESC LIMIT 50';
  
  db.all(query, params, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json(rows);
    }
  });
});

app.post('/api/history', (req, res) => {
  const { tool, content } = req.body;
  if (!tool || !content) {
    return res.status(400).json({ error: 'Tool and content are required' });
  }
  db.run('INSERT INTO history (tool, content) VALUES (?, ?)', [tool, content], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json({ id: this.lastID, tool, content });
    }
  });
});

// API Proxy for testing endpoints
app.post('/api/proxy', (req, res) => {
  const { url, method = 'GET', headers = {}, body } = req.body;
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    const parsedUrl = new URL(url);
    const client = parsedUrl.protocol === 'https:' ? https : http;
    
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: method.toUpperCase(),
      headers: headers
    };

    const startTime = Date.now();
    const proxyReq = client.request(options, (proxyRes) => {
      let data = '';
      proxyRes.on('data', (chunk) => { data += chunk; });
      proxyRes.on('end', () => {
        const duration = Date.now() - startTime;
        res.json({
          status: proxyRes.statusCode,
          headers: proxyRes.headers,
          body: data,
          duration: duration
        });
      });
    });

    proxyReq.on('error', (e) => {
      res.status(502).json({ error: e.message });
    });

    if (body && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase())) {
      proxyReq.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    proxyReq.end();
  } catch (e) {
    res.status(400).json({ error: 'Invalid URL format' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`DevToolkit Hub running on port ${PORT}`);
});
