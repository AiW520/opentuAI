const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium, expect } = require('@playwright/test');
const XLSX = require('xlsx');
const JSZip = require('jszip');

const root = path.resolve(__dirname, '..');
const esbuild = require(require.resolve('esbuild', {
  paths: [path.dirname(require.resolve('vite'))],
}));
const baseUrl = process.env.DESKTOP_QA_URL || 'http://127.0.0.1:7341/';
const output = path.join(root, 'outputs/desktop-web-parity');

async function main() {
  await fs.mkdir(output, { recursive: true });
  const bundle = await esbuild.build({
    stdin: {
      contents: `export { embedImagesInXlsx, readImageBytes } from './packages/drawnix/src/utils/xlsx-image-export';
        export { readXlsxEmbeddedImages } from './packages/drawnix/src/utils/xlsx-embedded-images';`,
      resolveDir: root,
      loader: 'ts',
    },
    bundle: true,
    write: false,
    format: 'iife',
    globalName: 'parityQA',
    platform: 'browser',
  });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const errors = [];
  const checks = [];
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    page.on('pageerror', (error) => errors.push(error.message));
    await page.route('**/parity-qa.js', (route) => route.fulfill({
      contentType: 'text/javascript', body: bundle.outputFiles[0].text,
    }));
    await page.goto(baseUrl);
    await expect(page.locator('[data-testid="ai-input-bar"]')).toBeVisible();
    await expect(page.locator('meta[name="app-version"]')).toHaveAttribute('content', '1.2.13');
    await page.addScriptTag({ url: new URL('parity-qa.js', baseUrl).href });
    const fixture = await page.evaluate(async () => {
      const images = [];
      const saved = window.createImageBitmap;
      window.createImageBitmap = undefined;
      try {
        for (const [width, height, color] of [[200, 400, '#df375b'], [400, 200, '#168c7c']]) {
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = color;
          ctx.fillRect(0, 0, width, height);
          const image = await parityQA.readImageBytes(canvas.toDataURL());
          if (image.width !== width || image.height !== height) throw new Error('Wrong image dimensions');
          images.push({ ...image, bytes: Array.from(image.bytes) });
        }
      } finally {
        window.createImageBitmap = saved;
      }
      return images;
    });
    checks.push('Real PNG dimensions: 200x400 and 400x200 with createImageBitmap disabled');
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ['提示词', '数量', '参考图1', '参考图2'],
      ['QA portrait and landscape', 1, '', ''],
      [],
      ['QA after blank row', 2, '', ''],
    ]), 'Tasks');
    const fixtureBytes = await page.evaluate(async ({ bytes, images }) => {
      const buffer = await parityQA.embedImagesInXlsx(new Uint8Array(bytes).buffer, [
        { ...images[0], bytes: new Uint8Array(images[0].bytes), row: 1, column: 2, name: 'portrait' },
        { ...images[1], bytes: new Uint8Array(images[1].bytes), row: 1, column: 3, name: 'landscape' },
        { ...images[0], bytes: new Uint8Array(images[0].bytes), row: 3, column: 2, name: 'after-blank' },
      ]);
      return Array.from(new Uint8Array(buffer));
    }, { bytes: Array.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })), images: fixture });
    await fs.writeFile(path.join(output, 'import-fixture.xlsx'), Buffer.from(fixtureBytes));

    for (const viewport of [{ width: 1440, height: 1000 }, { width: 1024, height: 768 }]) {
      await page.setViewportSize(viewport);
      await page.locator('[data-track="ai_input_click_history"]').click();
      const panel = page.locator('.prompt-history-popover__panel-wrapper');
      await expect(panel).toBeVisible();
      await expect(panel.locator('.prompt-list-panel')).toHaveCSS('opacity', '1');
      const rect = await panel.boundingBox();
      assert(rect.x >= 0 && rect.y >= 0 && rect.x + rect.width <= viewport.width + 1 && rect.y + rect.height <= viewport.height + 1);
      await page.screenshot({ path: path.join(output, `prompt-${viewport.width}.png`) });
      await page.keyboard.press('Escape');
      await expect(panel).not.toBeVisible();
    }
    checks.push('Prompt popover stays in viewport and Escape closes it at 1440 and 1024 px');
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.locator('[data-testid="toolbar-toolbox"]').click();
    await page.getByText('批量出图工具', { exact: true }).click();
    const batch = page.locator('.batch-image-generation');
    await expect(batch).toBeVisible();
    const saveDownload = async (trigger, filename) => {
      const pending = page.waitForEvent('download');
      await trigger.click();
      const download = await pending;
      assert.equal(await download.failure(), null);
      const target = path.join(output, filename);
      await download.saveAs(target);
      return fs.readFile(target);
    };
    const template = await saveDownload(batch.locator('[data-track="batch_download_template_click"]'), 'template.xlsx');
    const templateBook = XLSX.read(template);
    assert(templateBook.SheetNames.length > 0);
    assert(Object.values(templateBook.Sheets[templateBook.SheetNames[0]]).some((cell) => cell?.v === '参考图1'));
    checks.push('Production template download has reference image columns');
    await batch.locator('input[type=file][accept=".xlsx,.xls,.csv"]').setInputFiles({
      name: 'qa.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: Buffer.from(fixtureBytes),
    });
    await expect(batch.locator('tbody tr')).toHaveCount(7);
    await expect(batch.locator('tbody tr').nth(5)).toContainText('QA portrait and landscape');
    await expect(batch.locator('tbody tr').nth(6)).toContainText('QA after blank row');
    const sizes = await batch.locator('tbody tr').nth(5).locator('img').evaluateAll((images) => images.map((img) => [img.naturalWidth, img.naturalHeight]));
    assert.deepEqual(sizes, [[200, 400], [400, 200]]);
    checks.push('XLSX import keeps column order and maps images after a blank row');
    const exported = await saveDownload(batch.locator('[data-track="batch_export_excel_click"][data-track-params*="all"]'), 'export-all.xlsx');
    const zip = await JSZip.loadAsync(exported);
    const media = Object.keys(zip.files).filter((name) => name.startsWith('xl/media/') && !zip.files[name].dir);
    assert.equal(media.length, 3);
    const drawing = await zip.file('xl/drawings/drawing1.xml').async('text');
    assert(drawing.includes('<xdr:row>6</xdr:row>') || drawing.includes('<row>6</row>'));
    const roundtrip = await page.evaluate(async (bytes) => {
      const rows = await parityQA.readXlsxEmbeddedImages(new Uint8Array(bytes).buffer, '批量出图数据', new Set([2]));
      return [...rows].map(([row, images]) => ({ row, count: images.length }));
    }, Array.from(exported));
    assert.deepEqual(roundtrip.sort((a, b) => a.row - b.row), [{ row: 6, count: 2 }, { row: 7, count: 1 }]);
    checks.push('Production export embeds all three images, then parser re-imports the same row mappings');
    await batch.locator('tbody tr').nth(5).locator('input[type=checkbox]').check({ force: true });
    const selected = await saveDownload(batch.locator('[data-track="batch_export_excel_click"][data-track-params*="selected"]'), 'export-selected.xlsx');
    const selectedBook = XLSX.read(selected);
    const selectedRows = XLSX.utils.sheet_to_json(selectedBook.Sheets[selectedBook.SheetNames[0]]);
    assert.equal(selectedRows.length, 1);
    assert.equal(selectedRows[0]['提示词'], 'QA portrait and landscape');
    assert.equal(Object.keys((await JSZip.loadAsync(selected)).files).filter((name) => /^xl\/media\/[^/]+$/.test(name)).length, 2);
    await expect(batch.locator('[data-track="batch_insert_selected_images_click"]')).toHaveAttribute('disabled', '');
    checks.push('Selected export contains exactly one row/two images; insertion disabled without completed results');
    await page.screenshot({ path: path.join(output, 'batch-import-export.png') });

    // Seed already completed tasks to exercise insertion without billed requests.
    await page.evaluate(async (images) => {
      const write = (dbName, storeName, values) => new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction(storeName, 'readwrite');
          values.forEach((value) => tx.objectStore(storeName).put(value));
          tx.oncomplete = () => { db.close(); resolve(); };
          tx.onerror = () => reject(tx.error);
        };
      });
      const now = Date.now();
      const ids = ['qa-portrait', 'qa-landscape'];
      await write('aitu-app', 'tasks', images.map((image, index) => ({
        id: ids[index], type: 'image', status: 'completed', createdAt: now + index, updatedAt: now,
        params: { prompt: `QA completed ${index}`, model: 'gpt-image-2', autoInsertToCanvas: false },
        result: {
          url: `data:image/png;base64,${btoa(String.fromCharCode(...image.bytes))}`,
          width: image.width, height: image.height, format: 'png', size: image.bytes.length,
        },
      })));
      await write('aitu-storage', 'data', [{
        key: 'batch-image-generation-cache', updatedAt: now,
        value: { tasks: [{ id: 1, prompt: 'QA completed results', params: {}, images: [], count: 2, taskIds: ids }], taskIdCounter: 2 },
      }]);
    }, fixture);
    await page.reload();
    await expect(page.locator('[data-testid="ai-input-bar"]')).toBeVisible();
    if (!(await batch.isVisible())) {
      await page.locator('[data-testid="toolbar-toolbox"]').click();
      await page.getByText('批量出图工具', { exact: true }).click();
    }
    await expect(batch.locator('tbody tr')).toHaveCount(1);
    await expect(batch.locator('.batch-selection-strip')).toContainText('2 张已完成');
    const initialCount = await page.evaluate(() => window.__drawnixBoard.children.length);
    await batch.locator('tbody tr').first().locator('input[type=checkbox]').check({ force: true });
    const insert = batch.locator('[data-track="batch_insert_selected_images_click"]');
    await expect(insert).not.toHaveAttribute('disabled');
    await insert.click();
    await expect.poll(() => page.evaluate(() => window.__drawnixBoard.children.length)).toBe(initialCount + 2);
    const inserted = await page.evaluate(() => window.__drawnixBoard.children.slice(-2).map((element) => ({
      prompt: element.prompt, generationTaskId: element.generationTaskId,
      points: element.points,
    })));
    assert.deepEqual(new Set(inserted.map((element) => element.generationTaskId)), new Set(['qa-portrait', 'qa-landscape']));
    checks.push('Production manual insertion adds both completed results to the active canvas with task metadata');
    await page.screenshot({ path: path.join(output, 'manual-insertion.png') });
    await page.locator('.winbox .wb-close').click();
    await expect(batch).not.toBeVisible();
    const imageElement = page.locator('.board-host-svg img').first();
    await expect(imageElement).toBeVisible();
    await imageElement.click({ position: { x: 20, y: 20 } });
    await expect(page.locator('[data-testid="ai-input-settings"]')).toBeVisible();
    await page.locator('[data-testid="ai-input-settings"]').click();
    const settingsPanel = page.locator('.ai-input-bar__settings-panel');
    await expect(settingsPanel).toBeVisible();
    await expect(page.locator('.ai-input-bar__settings-popup')).toHaveCSS('opacity', '1');
    const followSwitch = settingsPanel.getByLabel('任务栏跟随', { exact: true });
    const centerSwitch = settingsPanel.getByLabel('点击目标后自动居中', { exact: true });
    await expect(followSwitch).toBeVisible();
    await expect(centerSwitch).toBeVisible();
    await expect(settingsPanel.getByRole('button', { name: '本次只作参考图', exact: true })).toBeVisible();
    const reopenSettings = async () => {
      if (!(await settingsPanel.isVisible())) {
        await page.locator('[data-testid="ai-input-settings"]').click();
      }
      await expect(settingsPanel).toBeVisible();
      await expect(page.locator('.ai-input-bar__settings-popup')).toHaveCSS('opacity', '1');
    };
    const centerChecked = await centerSwitch.evaluate((node) => node.classList.contains('t-is-checked'));
    await centerSwitch.click();
    await reopenSettings();
    if (centerChecked) await expect(centerSwitch).not.toHaveClass(/t-is-checked/);
    else await expect(centerSwitch).toHaveClass(/t-is-checked/);
    await centerSwitch.click();
    await reopenSettings();
    if (centerChecked) await expect(centerSwitch).toHaveClass(/t-is-checked/);
    else await expect(centerSwitch).not.toHaveClass(/t-is-checked/);
    await followSwitch.click();
    await reopenSettings();
    await expect(followSwitch).not.toHaveClass(/t-is-checked/);
    await expect(settingsPanel.getByRole('button', { name: '本次只作参考图', exact: true })).not.toBeVisible();
    await followSwitch.click();
    await reopenSettings();
    await expect(followSwitch).toHaveClass(/t-is-checked/);
    await expect(settingsPanel.getByRole('button', { name: '本次只作参考图', exact: true })).toBeVisible();
    checks.push('Clicked canvas image exposes reference-only controls; follow and center-target switches are visible and toggle');
    await page.screenshot({ path: path.join(output, 'target-controls.png') });
    assert.deepEqual(errors, []);
    const report = { url: baseUrl, version: '1.2.13', checks, pageErrors: errors, nativePackageTested: false };
    await fs.writeFile(path.join(output, 'result.json'), JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await browser.close();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
