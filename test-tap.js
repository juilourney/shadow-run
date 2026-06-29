const puppeteer = require('puppeteer');
const http = require('http');
const serveStatic = require('serve-static');
const finalhandler = require('finalhandler');
const serve = serveStatic('.', { 'index': ['index.html'] });
const server = http.createServer((req, res) => serve(req, res, finalhandler(req, res)));

server.listen(3020, async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('LOG:', msg.text()));
  
  await page.goto('http://localhost:3020');
  await new Promise(r => setTimeout(r, 200));
  
  await page.type('#name-input', 'Test');
  await page.click('#enter-btn');
  await new Promise(r => setTimeout(r, 200));
  
  await page.click('#card-flip-area');
  await new Promise(r => setTimeout(r, 2000));
  
  await page.click('#card-confirm-btn');
  await new Promise(r => setTimeout(r, 200));
  
  await page.click('#role-flip-area');
  await new Promise(r => setTimeout(r, 2000));
  
  // Try tapping the button using standard click
  await page.click('#role-confirm-btn');
  await new Promise(r => setTimeout(r, 200));
  
  const activeScreen = await page.evaluate(() => {
    const el = document.querySelector('.screen.active');
    return el ? el.id : null;
  });
  console.log('Active screen:', activeScreen);
  
  await browser.close();
  server.close();
});
