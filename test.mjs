import puppeteer from 'puppeteer';
(async () => {
  const browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox'] });
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERR:', err.message));
  
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
  console.log("clicking Pacientes");
  
  try {
    const tabs = await page.$$("button"); // The sidebar uses buttons
    for (const t of tabs) {
      const text = await t.evaluate(el => el.textContent);
      if (text && text.includes("Pacientes")) {
        await t.click();
        break;
      }
    }
    
    await new Promise(r => setTimeout(r, 1000));
    
    const patientBoxes = await page.$$(".bg-white.border.border-slate-200.p-5");
    if (patientBoxes.length > 0) {
      console.log("clicking first patient");
      await patientBoxes[0].click();
      await new Promise(r => setTimeout(r, 1000));
    }
  } catch (err) {
    console.log('Test interaction error:', err);
  }
  
  console.log("Done checking.");
  await browser.close();
})();
