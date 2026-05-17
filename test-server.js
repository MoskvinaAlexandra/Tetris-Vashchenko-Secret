import http from 'http';

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/',
  method: 'GET'
};

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log(`BODY LENGTH: ${data.length} bytes`);
    console.log(`FIRST 200 CHARS: ${data.substring(0, 200)}`);
  });
});

req.on('error', (e) => {
  console.error(`ERROR: ${e.message}`);
});

req.end();
