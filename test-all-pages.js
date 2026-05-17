import http from 'http';

const pages = [
  { path: '/', name: 'Главная' },
  { path: '/login.html', name: 'Вход' },
  { path: '/register.html', name: 'Регистрация' },
  { path: '/game.html', name: 'Игра' },
  { path: '/profile.html', name: 'Профиль' },
  { path: '/leaderboard.html', name: 'Лидеры' }
];

const scripts = [
  '/js/login.js',
  '/js/register.js',
  '/js/profile.js',
  '/js/leaderboard.js',
  '/js/utils/themeManager.js'
];

function testResource(path) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:3000${path}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const hasExportDefault = data.includes('export default');
        const hasUnsafeGetElementById = /document\.getElementById\([^)]+\)\.addEventListener/.test(data);
        
        resolve({
          path,
          status: res.statusCode,
          hasExportDefault,
          hasUnsafeGetElementById,
          ok: res.statusCode === 200 && !hasExportDefault
        });
      });
    });
    
    req.on('error', () => resolve({ path, status: 'ERROR', ok: false }));
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Тестирование страниц и скриптов...\n');
  
  console.log('📄 Страницы:');
  for (const page of pages) {
    const result = await testResource(page.path);
    const icon = result.ok ? '✅' : '❌';
    console.log(`${icon} ${page.name} (${page.path}) - ${result.status}`);
  }
  
  console.log('\n📜 Скрипты:');
  for (const script of scripts) {
    const result = await testResource(script);
    const icon = result.ok ? '✅' : '❌';
    let issues = [];
    if (result.hasExportDefault) issues.push('export default');
    if (result.hasUnsafeGetElementById) issues.push('unsafe getElementById');
    const issueText = issues.length > 0 ? ` [${issues.join(', ')}]` : '';
    console.log(`${icon} ${script} - ${result.status}${issueText}`);
  }
  
  console.log('\n✨ Тестирование завершено!');
}

runTests();
