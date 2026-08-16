/**
 * Wedding Photo Upload Portal — Google Apps Script backend
 * Receives file uploads from upload.html on d0529.github.io and saves
 * each file to Google Drive, organised as:
 *   {ROOT_FOLDER_NAME}/{Guest name}/{timestamp}_{original filename}
 *
 * ── SETUP ────────────────────────────────────────────────────────────
 * 1. Go to https://script.google.com and click "New project"
 * 2. Delete the default `function myFunction()` stub
 * 3. Paste this entire file into the editor
 * 4. Click the disk / save icon (name the project e.g. "Wedding Uploads")
 * 5. Click "Deploy" → "New deployment"
 *      • Icon (gear) → select type: "Web app"
 *      • Description: "Wedding photo uploads"
 *      • Execute as: Me (your account)
 *      • Who has access: Anyone
 *    Click Deploy. On first deploy you'll be asked to authorise access
 *    to your Drive — approve it (this is what lets the script write to
 *    your Drive on behalf of guests).
 * 6. Copy the "Web app URL" it gives you (looks like
 *    https://script.google.com/macros/s/AKfy…/exec)
 * 7. Open upload.html in the repo, find the line
 *      const APPS_SCRIPT_URL = 'PASTE_YOUR_APPS_SCRIPT_URL_HERE';
 *    and replace the placeholder with your deployed URL. Commit + push.
 *
 * ── UPDATING THE SCRIPT LATER ────────────────────────────────────────
 * When you change this code, click Deploy → "Manage deployments" →
 * pencil / edit → Version: "New version" → Deploy. The URL stays the same.
 *
 * ── TEST ─────────────────────────────────────────────────────────────
 * Open the Web app URL directly in a browser: you should see a small
 * JSON response like {"ok":true,"service":"…"}. That means the endpoint
 * is live.
 */

const ROOT_FOLDER_NAME = 'Wedding Photos — Dylan & Milana';

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse({ ok: false, error: 'no-payload' });
    }
    const p = JSON.parse(e.postData.contents);

    if (!p.guestName || typeof p.guestName !== 'string') {
      return jsonResponse({ ok: false, error: 'no-name' });
    }
    if (!p.dataBase64 || !p.fileName) {
      return jsonResponse({ ok: false, error: 'no-file' });
    }

    const guestName = sanitize(p.guestName, 50);
    const originalName = sanitize(p.fileName, 100);
    const mimeType = String(p.mimeType || 'application/octet-stream');

    const bytes = Utilities.base64Decode(p.dataBase64);
    const blob = Utilities.newBlob(bytes, mimeType, originalName);

    // Timestamp prefix so same-named uploads don't collide.
    const ts = new Date().toISOString().replace(/[:.]/g, '-').replace('Z', '');
    blob.setName(ts + '_' + originalName);

    const root = getOrCreateFolder(DriveApp.getRootFolder(), ROOT_FOLDER_NAME);
    const guestFolder = getOrCreateFolder(root, guestName);

    const file = guestFolder.createFile(blob);

    return jsonResponse({
      ok: true,
      id: file.getId(),
      name: file.getName(),
      folder: guestName,
    });
  } catch (err) {
    return jsonResponse({ ok: false, error: String(err && err.message || err) });
  }
}

function doGet() {
  // Health-check. Visiting the deployed URL in a browser returns this.
  return jsonResponse({
    ok: true,
    service: 'Wedding photo upload portal',
    status: 'ready',
  });
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function getOrCreateFolder(parent, name) {
  const it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}

function sanitize(s, maxLen) {
  return String(s)
    .trim()
    .replace(/[\\\/:*?"<>|\x00-\x1f]/g, '')
    .replace(/\s+/g, ' ')
    .slice(0, maxLen) || 'Unnamed';
}
