const http = require('http');

const PORT = process.env.PORT || 8080;

function runTest() {
  console.log(`Testing health endpoint on port ${PORT}...`);
  
  const req = http.get(`http://127.0.0.1:${PORT}/health`, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      try {
        const json = JSON.parse(data);
        if (res.statusCode === 200 && json.status === 'ok') {
          console.log('TEST PASSED: /health is operational');
          process.exit(0);
        } else {
          console.error('TEST FAILED: Invalid health response', data);
          process.exit(1);
        }
      } catch (e) {
        console.error('TEST FAILED: Could not parse response', data);
        process.exit(1);
      }
    });
  });

  req.on('error', (err) => {
    console.error('TEST FAILED: Server not reachable', err.message);
    process.exit(1);
  });
}

setTimeout(runTest, 1000);
