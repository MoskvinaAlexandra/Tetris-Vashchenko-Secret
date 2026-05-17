import http from 'http';

function testPage(path) {
  return new Promise((resolve, reject) => {
    const req = http.get(`http://localhost:3000${path}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`\n=== Testing: ${path} ===`);
        console.log(`Status: ${res.statusCode}`);
        console.log(`Content-Length: ${data.length} bytes`);
        
        // Check for common issues
        if (data.includes('export default')) {
          console.log('❌ FOUND "export default" in response - this will cause errors!');
        } else {
          console.log('✓ No "export default" found');
        }
        
        if (data.includes('export class')) {
          console.log('⚠️  FOUND "export class" - check if loaded as module');
        }
        
        if (data.includes('export const')) {
          console.log('⚠️  FOUND "export const" - check if loaded as module');
        }
        
        resolve({ path, status: res.statusCode, size: data.length });
      });
    });
    
    req.on('error', (e) => {
      console.error(`Error testing ${path}:`, e.message);
      reject(e);
    });
    
    req.end();
  });
}

async function runTests() {
  console.log('Testing all pages and scripts...\n');
  
  const tests = [
    '/',
    '/game.html',
    '/profile.html',
    '/leaderboard.html',
    '/login.html',
    '/js/utils/themeManager.js',
    '/js/services/authService.js',
    '/js/utils/errorHandler.js',
    '/js/utils/authUI.js',
    '/js/settings.js'
  ];
  
  for (const path of tests) {
    try {
      await testPage(path);
    } catch (e) {
      console.error(`Failed to test ${path}`);
    }
  }
  
  console.log('\n=== Tests Complete ===');
}

runTests();
