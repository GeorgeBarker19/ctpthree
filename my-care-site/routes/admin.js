const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const bcrypt = require('bcryptjs');

const CONTENT_PATH = path.join(__dirname, '../data/siteContent.json');
const ADMIN_STORE = path.join(__dirname, '../data/admin.json');
const UPLOAD_DIR  = path.join(__dirname, '../public/uploads');
const DOCS_DIR    = path.join(__dirname, '../public/docs');

[UPLOAD_DIR, DOCS_DIR].forEach(dir => { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); });

// bootstrap admin
function ensureAdminJSON() {
  if (!fs.existsSync(ADMIN_STORE)) {
    const fromEnv = process.env.ADMIN_PASSWORD || 'admin123';
    const passwordHash = bcrypt.hashSync(fromEnv, 10);
    fs.writeFileSync(ADMIN_STORE, JSON.stringify({ passwordHash }, null, 2));
  }
}
ensureAdminJSON();

function readAdminStore() { return JSON.parse(fs.readFileSync(ADMIN_STORE, 'utf-8')); }

const imageStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => cb(null, Date.now() + '-' + Math.round(Math.random()*1e6) + path.extname(file.originalname))
});
const docStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, DOCS_DIR),
  filename: (_req, file, cb) => cb(null, Date.now() + '-' + Math.round(Math.random()*1e6) + path.extname(file.originalname))
});

const uploadImage = multer({
  storage: imageStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = ['image/jpeg','image/png','image/webp','image/jpg'].includes(file.mimetype);
    cb(ok ? null : new Error('Only JPG, PNG, or WEBP images allowed.'), ok);
  }
});
const uploadDoc = multer({
  storage: docStorage,
  limits: { fileSize: 12 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ].includes(file.mimetype);
    cb(ok ? null : new Error('Only PDF or DOC/DOCX allowed.'), ok);
  }
});

// AJAX-friendly guard (returns JSON for fetch requests)
function ensureAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) return next();

  const wantsJson =
    req.xhr ||
    req.headers['x-requested-with'] === 'XMLHttpRequest' ||
    (req.headers.accept && req.headers.accept.includes('application/json'));

  if (wantsJson) {
    return res.status(401).json({ success: false, error: 'Not authenticated' });
  }
  return res.redirect('/admin');
}

// -------- helpers --------
function readContent() {
  if (!fs.existsSync(CONTENT_PATH)) return {};
  return JSON.parse(fs.readFileSync(CONTENT_PATH, 'utf-8'));
}
function writeContent(obj) {
  fs.writeFileSync(CONTENT_PATH, JSON.stringify(obj, null, 2), 'utf-8');
}
function mapToArray(maybe) {
  if (!maybe) return [];
  if (Array.isArray(maybe)) return maybe;
  if (typeof maybe === 'object') return Object.keys(maybe).sort((a,b)=>Number(a)-Number(b)).map(k => maybe[k]);
  return [];
}
function merge(target, patch) {
  if (!patch) return target || {};
  return { ...(target || {}), ...patch };
}
// deep merge for nested objects (preserves subkeys unless explicitly replaced)
function deepMerge(target, source) {
  if (Array.isArray(source)) return source.slice();
  if (source && typeof source === 'object') {
    const out = { ...(target || {}) };
    for (const [k, v] of Object.entries(source)) {
      out[k] = deepMerge(out[k], v);
    }
    return out;
  }
  return source;
}

// -------- auth routes --------
router.get('/', (req, res) => res.render('admin/login', { error: null }));

router.post('/login', (req, res) => {
  const { password } = req.body;
  try {
    const { passwordHash } = readAdminStore();
    if (bcrypt.compareSync(password || '', passwordHash)) {
      req.session.isAdmin = true;
      return res.redirect('/admin/dashboard');
    }
    res.render('admin/login', { error: 'Incorrect password.' });
  } catch (e) {
    console.error('Login error:', e);
    res.render('admin/login', { error: 'Login unavailable.' });
  }
});

router.get('/logout', ensureAdmin, (req, res) => {
  req.session.destroy(() => res.redirect('/admin'));
});

router.post('/change-password', ensureAdmin, (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;
  try {
    if (!newPassword || newPassword !== confirmPassword) {
      req.session.savedMessage = '❌ New passwords do not match.';
      return res.redirect('/admin/dashboard');
    }
    const store = readAdminStore();
    if (!bcrypt.compareSync(currentPassword || '', store.passwordHash)) {
      req.session.savedMessage = '❌ Current password is incorrect.';
      return res.redirect('/admin/dashboard');
    }
    store.passwordHash = bcrypt.hashSync(newPassword, 10);
    fs.writeFileSync(ADMIN_STORE, JSON.stringify(store, null, 2));
    req.session.savedMessage = '🔒 Password updated successfully.';
    res.redirect('/admin/dashboard');
  } catch (e) {
    console.error('Change password error:', e);
    res.status(500).send('Error changing password.');
  }
});

// -------- dashboard --------
router.get('/dashboard', ensureAdmin, (req, res) => {
  try {
    const siteContent = readContent();
    const savedMessage = req.session.savedMessage || null;
    req.session.savedMessage = null;
    res.render('admin/dashboard', { content: siteContent, savedMessage });
  } catch (err) {
    console.error('Error loading dashboard:', err);
    res.status(500).send('Error loading dashboard.');
  }
});

// -------- uploads (always JSON responses) --------
router.post('/upload-image', ensureAdmin, (req, res) => {
  uploadImage.single('file')(req, res, (err) => {
    if (err) return res.status(400).json({ success: false, error: err.message || 'Upload failed' });
    if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded.' });
    return res.json({ success: true, path: '/uploads/' + req.file.filename });
  });
});

router.post('/upload-doc', ensureAdmin, (req, res) => {
  uploadDoc.single('file')(req, res, (err) => {
    if (err) return res.status(400).json({ success: false, error: err.message || 'Upload failed' });
    if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded.' });
    return res.json({ success: true, path: '/docs/' + req.file.filename });
  });
});

// -------- update content --------
router.post('/update-content', ensureAdmin, (req, res) => {
  try {
    const body = req.body;
    const current = readContent();

    // HOME
    if (body.home) {
      const nextHome = merge(current.home, body.home);
      if (body.home.sections) {
        nextHome.sections = mapToArray(body.home.sections).map(sec => ({
          title: sec.title || '',
          text: sec.text || '',
          image: sec.image || '',
          buttonText: sec.buttonText || '',
          buttonLink: sec.buttonLink || '',
          fontSize: sec.fontSize || 'normal'
        }));
      }
      current.home = nextHome;
    }

    // ABOUT
    if (body.about) {
      let nextAbout = deepMerge(current.about || {}, body.about);

      if (body.about.mission) {
        nextAbout.mission = deepMerge(current.about?.mission || {}, {
          title: body.about.mission.title,
          body: body.about.mission.body,
          bodyHtml: body.about.mission.bodyHtml,
          cta: body.about.mission.cta ? {
            text: body.about.mission.cta.text,
            href: body.about.mission.cta.href
          } : nextAbout.mission?.cta,
          image: body.about.mission.image ? {
            src: body.about.mission.image.src,
            alt: body.about.mission.image.alt
          } : nextAbout.mission?.image
        });
      }

      if (body.about.staff) {
        nextAbout.staff = deepMerge(current.about?.staff || {}, {
          title: body.about.staff.title,
          body: body.about.staff.body,
          bodyHtml: body.about.staff.bodyHtml,
          cta: body.about.staff.cta ? {
            text: body.about.staff.cta.text,
            href: body.about.staff.cta.href
          } : nextAbout.staff?.cta,
          image: body.about.staff.image ? {
            src: body.about.staff.image.src,
            alt: body.about.staff.image.alt
          } : nextAbout.staff?.image
        });
      }

      if (body.about.sideImage) {
        nextAbout.sideImage = merge(current.about?.sideImage, body.about.sideImage);
      }

      if (body.about.gallery) {
        nextAbout.gallery = mapToArray(body.about.gallery).map(g => ({
          src: g.src || '',
          alt: g.alt || '',
          caption: g.caption || ''
        }));
      }

      current.about = nextAbout;
    }

    // SERVICES
    if (body.services) {
      const nextServices = merge(current.services, body.services);
      if (body.services.gallery) {
        nextServices.gallery = mapToArray(body.services.gallery).map(svc => ({
          title: svc.title || '',
          teaser: svc.teaser || '',
          description: svc.description || '',
          image: svc.image || '',
          alt: svc.alt || '',
          pdf: svc.pdf || ''
        }));
      }
      current.services = nextServices;
    }

    // CONTACT & CAREERS
    ['contact', 'careers'].forEach(page => {
      if (body[page]) current[page] = merge(current[page], body[page]);
    });

    // FOOTER
    if (body.footer) {
      let nextFooter = deepMerge(current.footer || {}, body.footer);

      if (body.footer.brand) {
        nextFooter.brand = deepMerge(current.footer?.brand || {}, {
          name: body.footer.brand.name,
          logo: body.footer.brand.logo ? {
            src: body.footer.brand.logo.src,
            alt: body.footer.brand.logo.alt
          } : (nextFooter.brand?.logo)
        });
      }

      if (body.footer.contact) {
        nextFooter.contact = deepMerge(current.footer?.contact || {}, {
          address: body.footer.contact.address,
          phone: body.footer.contact.phone,
          email: body.footer.contact.email
        });
      }

      if (body.footer.cookie) {
        nextFooter.cookie = deepMerge(current.footer?.cookie || {}, {
          text: body.footer.cookie.text,
          acceptLabel: body.footer.cookie.acceptLabel
        });
      }

      if (body.footer.legalText !== undefined) {
        nextFooter.legalText = body.footer.legalText;
      }
      if (body.footer.aboutText !== undefined) {
        nextFooter.aboutText = body.footer.aboutText;
      }

      current.footer = nextFooter;
    }

    writeContent(current);
    req.session.savedMessage = '✅ Changes saved successfully!';
    res.redirect('/admin/dashboard');
  } catch (err) {
    console.error('Error updating content:', err);
    res.status(500).send('Error saving updates.');
  }
});

// -------- clear unused --------
router.post('/clear-unused', ensureAdmin, (req, res) => {
  try {
    const siteContent = readContent();

    const usedUploads = new Set();
    const usedDocs = new Set();
    const collect = (p) => {
      if (!p || typeof p !== 'string') return;
      if (p.startsWith('/uploads/')) usedUploads.add(path.basename(p));
      if (p.startsWith('/docs/')) usedDocs.add(path.basename(p));
    };

    // Home
    siteContent.home?.sections?.forEach(s => collect(s.image));

    // About
    collect(siteContent.about?.sideImage?.src);
    collect(siteContent.about?.mission?.image?.src);
    collect(siteContent.about?.staff?.image?.src);
    siteContent.about?.gallery?.forEach(g => collect(g.src));

    // Services
    siteContent.services?.gallery?.forEach(svc => { collect(svc.image); collect(svc.pdf); });

    // Footer (logo)
    collect(siteContent.footer?.brand?.logo?.src);

    let deleted = 0;
    if (fs.existsSync(UPLOAD_DIR)) {
      fs.readdirSync(UPLOAD_DIR).forEach(file => {
        if (!usedUploads.has(file)) { fs.unlinkSync(path.join(UPLOAD_DIR, file)); deleted++; }
      });
    }
    if (fs.existsSync(DOCS_DIR)) {
      fs.readdirSync(DOCS_DIR).forEach(file => {
        if (!usedDocs.has(file)) { fs.unlinkSync(path.join(DOCS_DIR, file)); deleted++; }
      });
    }

    req.session.savedMessage = `🧹 Removed ${deleted} unused file(s).`;
    res.redirect('/admin/dashboard');
  } catch (err) {
    console.error('Error cleaning uploads:', err);
    res.status(500).send('Error cleaning unused uploads.');
  }
});

module.exports = router;
