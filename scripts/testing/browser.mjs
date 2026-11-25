import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

// Browser plugin not available. One resource-limited Playwright Chromium instance.
const root = process.cwd();
const output = process.env.PHU_QUY_QA_DIR || '/tmp/phu-quy-qa';
const quality = process.env.PHU_QUY_QA_QUALITY || 'low';
await mkdir(output, { recursive: true });
const memory = async () => Number((await readFile('/proc/meminfo', 'utf8')).match(/MemAvailable:\s+(\d+)/)[1]) * 1024;
assert(await memory() > 180 * 1024 * 1024, 'Insufficient available memory for a safe browser run');
const localLibraries = path.join(root, '.tools/browser-libs/usr/lib/x86_64-linux-gnu');
process.env.LD_LIBRARY_PATH = [localLibraries, process.env.LD_LIBRARY_PATH].filter(Boolean).join(':');
const browser = await chromium.launch({
  headless: true,
  env: { ...process.env },
  args: ['--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--renderer-process-limit=1', '--disable-background-networking', '--js-flags=--max-old-space-size=128'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const captureSession = await page.context().newCDPSession(page);
page.setDefaultTimeout(15000);
const errors = [], warnings = [], failedRequests = [], checks = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', event => { if (event.type() === 'error') errors.push(event.text()); if (event.type() === 'warning') warnings.push(event.text()); });
page.on('response', response => { if (response.status() >= 400) failedRequests.push({ status: response.status(), url: response.url() }); });
const state = () => page.evaluate(() => window.__PHU_QUY__.getState().game);
const inspect = () => page.evaluate(() => window.__PHU_QUY_VIEW__.inspect());
const project = point => page.evaluate(p => window.__PHU_QUY_VIEW__.project(p), point);
// Use real pointer input, followed by explicit state assertions in each flow.
// This avoids Playwright's extra two-frame actionability/navigation round trips
// stalling behind SwiftShader compositing on the memory-constrained QA host.
async function tap(locator) {
  await locator.waitFor({ state: 'visible' });
  const box = await locator.boundingBox();
  assert(box && box.width > 0 && box.height > 0, 'Control has no visible hit area');
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
}
const screenshots = [];
const screenshot = async name => {
  if (process.argv.includes('--no-screenshots')) return;
  let timer;
  try {
    const result = await Promise.race([
      captureSession.send('Page.captureScreenshot', { format: 'png', fromSurface: false }),
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(`View capture timed out: ${name}`)), 15000); }),
    ]);
    await writeFile(path.join(output, name + '.png'), Buffer.from(result.data, 'base64'));
  } finally { clearTimeout(timer); }
  screenshots.push(name + '.png');
};
const step = (name, evidence) => { checks.push({ name, passed: true, evidence }); console.log(JSON.stringify(checks.at(-1))); };
let failure;
try {
  await page.addInitScript(quality => localStorage.setItem('phu-quy-v1:settings', JSON.stringify({ quality, volume: .2, audio: false, shadows: false, autosave: false, reducedMotion: true })), quality);
  await page.goto('http://127.0.0.1:4173', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Begin your island' }).waitFor();
  await page.waitForFunction(() => window.__PHU_QUY_VIEW__?.inspect().assets === 17, null, { timeout: 45000 });
  assert.match(await page.title(), /PHU QUY ISLAND/);
  assert.equal(await page.locator('vite-error-overlay').count(), 0);
  await screenshot('01-menu');
  step('Page identity, meaningful menu and 17 locally loaded models', { title: await page.title(), ...(await inspect()) });
  await tap(page.getByRole('button', { name: 'Begin your island' }));
  await page.getByLabel('Name your community').fill('Phú Quý QA');
  await tap(page.getByRole('button', { name: 'Set foot on the island' }));
  await tap(page.getByRole('button', { name: 'Pause simulation', exact: true }));
  await page.getByText('A community,', { exact: false }).waitFor();
  await screenshot('02-island-desktop');
  const initial = await state();
  assert.equal(initial.buildings.length, 30); assert.equal(initial.metrics.housing, 288);
  step('New real island creates an existing connected community', { buildings: initial.buildings.length, residents: initial.population, housing: initial.metrics.housing });

  if (!process.argv.includes('--smoke')) {
    const cameraBefore = (await inspect()).camera;
    await page.locator('canvas').focus(); await page.keyboard.down('w');
    try { await page.waitForFunction(before => JSON.stringify(window.__PHU_QUY_VIEW__.inspect().camera) !== JSON.stringify(before), cameraBefore); }
    finally { await page.keyboard.up('w'); }
    assert.notDeepEqual((await inspect()).camera, cameraBefore);
    await tap(page.getByRole('button', { name: 'Overview (H)', exact: true }));
    await page.waitForTimeout(300);
    const zoomBefore = (await inspect()).camera;
    await page.mouse.move(850, 430); await page.mouse.wheel(0, -250);
    await page.waitForFunction(before => JSON.stringify(window.__PHU_QUY_VIEW__.inspect().camera) !== JSON.stringify(before), zoomBefore);
    assert.notDeepEqual((await inspect()).camera, zoomBefore);
    await tap(page.getByRole('button', { name: 'Overview (H)', exact: true }));
    await page.waitForTimeout(400);
    step('Camera keyboard pan, mouse zoom and overview respond', await inspect());

    async function findSite(kind = 'house') {
      return page.evaluate(async kind => {
        const { placementError } = await import('/src/simulation/simulation.ts');
        const g = window.__PHU_QUY__.getState().game;
        for (const r of g.roads) for (const n of r.points) for (const d of [{x:10,z:0},{x:-10,z:0},{x:0,z:10},{x:0,z:-10}]) {
          const p = {x:n.x+d.x,z:n.z+d.z};
          const screen = window.__PHU_QUY_VIEW__.project(p);
          if (screen.x>390&&screen.x<1250&&screen.y>150&&screen.y<620&&!placementError(g,kind,p)) return p;
        }
        throw new Error('No visible valid building site');
      }, kind);
    }
    await tap(page.getByRole('button', { name: 'Build', exact: true }));
    await tap(page.getByRole('button', { name: /^Coastal home/ }));
    await page.keyboard.press('r');
    assert.equal(await page.evaluate(() => window.__PHU_QUY__.getState().rotation), Math.PI / 2);
    const p = await findSite(), screenPoint = await project(p), beforeBuild = await state();
    await page.mouse.click(screenPoint.x, screenPoint.y);
    await page.waitForFunction(n => window.__PHU_QUY__.getState().game.buildings.length === n + 1, beforeBuild.buildings.length);
    const built = await state(), newBuilding = built.buildings.at(-1);
    assert.equal(built.funds, beforeBuild.funds - 1800); assert.equal(newBuilding.rotation, Math.PI / 2);
    await screenshot('03-construction');
    step('Actual pointer construction, rotation, collision rules and cost', { position:p, building:newBuilding.id, funds:built.funds });
    // Same occupied cell cannot be built a second time.
    await page.mouse.click(screenPoint.x, screenPoint.y);
    assert.equal((await state()).buildings.length, built.buildings.length);
    await tap(page.getByRole('button', { name: 'Inspect addresses', exact: true }));
    await page.mouse.click(screenPoint.x, screenPoint.y);
    await page.getByRole('button', { name: 'Relocate', exact: true }).waitFor();
    await tap(page.getByRole('button', { name: 'Relocate', exact: true }));
    const destination = await findSite(), destinationScreen = await project(destination);
    await page.mouse.click(destinationScreen.x, destinationScreen.y);
    const moved = await state();
    assert.equal(moved.buildings.find(b => b.id === newBuilding.id).x, destination.x);
    assert.equal(moved.funds, built.funds - 270);
    await page.mouse.click(destinationScreen.x, destinationScreen.y);
    await tap(page.getByRole('button', { name: 'Remove', exact: true }));
    const removed = await state();
    assert(!removed.buildings.some(b => b.id === newBuilding.id)); assert.equal(removed.funds, moved.funds + 450);
    step('Inspection, relocation and demolition preserve ID and settle costs', { building:newBuilding.id, relocatedTo:destination, funds:removed.funds });

    await tap(page.getByRole('button', { name: 'Roads', exact: true }));
    await page.getByLabel('Curved alignment', { exact: false }).check();
    const alignment = await page.evaluate(async () => {
      const { roadPath } = await import('/src/simulation/network.ts');
      const { addRoad } = await import('/src/simulation/simulation.ts');
      const g=window.__PHU_QUY__.getState().game;
      for (const r of g.roads) for(const a of r.points) for(const delta of [{x:40,z:20},{x:-40,z:20},{x:20,z:40},{x:20,z:-40}]) {
        const b={x:a.x+delta.x,z:a.z+delta.z},points=roadPath(a,b,true),result=addRoad(g,points,'street');
        const visible=[a,b].every(p=>{const s=window.__PHU_QUY_VIEW__.project(p);return s.x>390&&s.x<1200&&s.y>160&&s.y<610});
        if(!result.error&&visible) return {a,b,points};
      }
      throw new Error('No visible valid road alignment');
    });
    const roadBefore = await state(), roadA=await project(alignment.a), roadB=await project(alignment.b);
    await page.mouse.click(roadA.x,roadA.y); await page.mouse.move(roadB.x,roadB.y); await page.mouse.click(roadB.x,roadB.y);
    await page.waitForFunction(n => window.__PHU_QUY__.getState().game.roads.length === n + 1, roadBefore.roads.length);
    const roadAfter=await state(); assert.deepEqual(roadAfter.roads.at(-1).points,alignment.points);
    assert.equal(roadAfter.funds,roadBefore.funds-alignment.points.length*80);
    step('Two pointer endpoints create a paid curved road in the live network', { points:alignment.points.length, roads:roadAfter.roads.length });

    await tap(page.getByRole('button', { name: 'Zones', exact: true }));
    const zoneSite=await findSite(), zoneScreen=await project(zoneSite), zonesBefore=(await state()).zones.length;
    await page.mouse.move(zoneScreen.x,zoneScreen.y);await page.mouse.down();await page.mouse.move(zoneScreen.x+1,zoneScreen.y+1);await page.mouse.up();
    assert.equal((await state()).zones.length,zonesBefore+1);
    const dayBefore=(await state()).day,popBefore=(await state()).population;
    await tap(page.getByRole('button',{name:'4× simulation speed',exact:true}));
    await page.waitForFunction(day=>window.__PHU_QUY__.getState().game.day>day,dayBefore,{timeout:15000});
    await tap(page.getByRole('button',{name:'Pause simulation',exact:true}));
    assert((await state()).population>popBefore);
    step('Zoning and live simulation change population at the next midnight', { zones:(await state()).zones.length,population:(await state()).population,day:(await state()).day });

    for(const panel of ['Economy','Population','Transport','Environment','Services']) {
      await tap(page.getByRole('button',{name:panel,exact:true}));
      await page.locator('.management-panel h2').waitFor();
      assert((await page.locator('.management-panel').innerText()).length>150);
    }
    await tap(page.getByRole('button',{name:'Economy',exact:true}));
    const taxInput=page.getByRole('slider',{name:'Resident tax rate'});await taxInput.focus();await taxInput.press('End');
    assert.equal((await state()).taxRate,20);
    await screenshot('04-economy');
    await tap(page.getByRole('button',{name:'Close panel',exact:true}));
    await tap(page.getByRole('button',{name:'Save island',exact:true}));
    assert(await page.evaluate(()=>!!localStorage.getItem('phu-quy-v1:island-1')));
    await tap(page.getByRole('button',{name:'Main menu',exact:true}));
    await tap(page.getByRole('button',{name:'Save & load',exact:true}));
    await tap(page.locator('.save-list>div').nth(1).getByRole('button',{name:'Save',exact:true}));
    const saved=await state();
    const downloadPromise=page.waitForEvent('download');await tap(page.getByRole('button',{name:'Export JSON',exact:true}));
    await (await downloadPromise).saveAs(path.join(output,'island-backup.json'));
    await page.getByLabel('Import JSON backup').setInputFiles({name:'damaged.json',mimeType:'application/json',buffer:Buffer.from('{damaged')});
    await page.getByText('The save file is not valid JSON.',{exact:false}).waitFor();
    assert.equal((await state()).funds,saved.funds);
    await screenshot('05-save-recovery');
    step('All management panels, tax control, two save slots, export and safe invalid import', { taxRate:saved.taxRate, savedBuildings:saved.buildings.length });

    await page.reload({waitUntil:'domcontentloaded'});
    await tap(page.getByRole('button',{name:/^Continue island/}));
    await tap(page.getByRole('button',{name:'Pause simulation',exact:true}));
    assert.equal((await state()).name,'Phú Quý QA'); assert.deepEqual((await state()).buildings,saved.buildings);assert.equal((await state()).taxRate,20);
    step('Reload and Continue restore real browser persistence', { name:(await state()).name, buildings:(await state()).buildings.length });
    await tap(page.getByRole('button',{name:'Main menu',exact:true}));
    await tap(page.getByRole('button',{name:'Settings',exact:true}));
    await page.getByRole('combobox',{name:'Graphics quality'}).selectOption('low');
    await page.getByLabel('Ocean ambience',{exact:false}).check();
    await page.getByLabel('Ocean ambience',{exact:false}).uncheck();
    assert.equal((await state()).settings.quality,'low'); assert.equal((await state()).settings.audio,false);
    await tap(page.getByRole('button',{name:'Close dialog',exact:true}));
    await page.setViewportSize({width:390,height:844});await page.waitForTimeout(600);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth),false);
    await tap(page.getByRole('button',{name:'Population',exact:true}));
    await screenshot('06-compact');
    assert(await page.locator('.management-panel').isVisible());
    step('Graphics/audio controls and compact 390×844 panel fit without document overflow', await inspect());
    await page.setViewportSize({width:1440,height:900});
    await tap(page.getByRole('button',{name:'Close panel',exact:true}));
    await page.waitForTimeout(1700); await screenshot('07-final-desktop');
    const diagnostics=await page.locator('.diagnostics').innerText();
    step('Measured software-rendered diagnostics', { diagnostics, ...(await inspect()) });
  }
  assert.deepEqual(errors, [], 'Browser console/page errors');
  assert.deepEqual(failedRequests, [], 'Failed HTTP requests');
  step('Console health and local asset requests', { errors, failedRequests, warnings });
} catch(error) {
  failure=error;
  await screenshot('failure').catch(()=>{});
  console.error(error.stack || error);
} finally {
  const report={url:'http://127.0.0.1:4173',browser:'Playwright Chromium / SwiftShader',fallbackReason:'Browser plugin not available',viewport:{width:1440,height:900},quality,reducedMotion:true,screenshotsEnabled:!process.argv.includes('--no-screenshots'),screenshots,checks,errors,warnings,failedRequests,failure:failure?.message||null};
  await writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2));
  await browser.close();
}
if(failure)process.exitCode=1;
