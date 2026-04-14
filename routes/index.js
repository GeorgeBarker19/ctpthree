require('dotenv').config();
const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

/* Load fresh site content each request */
function getSiteContent() {
  const contentPath = path.join(__dirname, '..', 'data', 'siteContent.json');
  try {
    return JSON.parse(fs.readFileSync(contentPath, 'utf-8'));
  } catch (e) {
    console.error('Failed to read siteContent.json:', e);
    return {};
  }
}

/* Multer (unchanged) */
const upload = multer({
  dest: path.join(process.cwd(), 'uploads'),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error('Only PDF or DOCX files are allowed.'));
    }
    cb(null, true);
  }
});

/* ---------- PAGE ROUTES ---------- */

router.get('/', (req, res) => {
  const all = getSiteContent();
  const pageData = all.home || {};
  res.render('pages/home', {
    page: 'page-home',
    title: pageData.seoTitle || 'Home — My Care Site',
    content: pageData
  });
});

router.get('/about', (req, res) => {
  const all = getSiteContent();
  const pageData = all.about || {};
  res.render('pages/about', {
    page: 'page-about',
    title: pageData.seoTitle || 'About — My Care Site',
    content: pageData
  });
});

router.get('/services', (req, res) => {
  const all = getSiteContent();
  const pageData = all.services || {};
  res.render('pages/services', {
    page: 'page-services',
    title: pageData.seoTitle || 'Services — My Care Site',
    content: pageData
  });
});

router.get('/careers', (req, res) => {
  const all = getSiteContent();
  const pageData = all.careers || {};
  res.render('pages/careers', {
    page: 'page-careers',
    title: pageData.seoTitle || 'Careers — My Care Site',
    content: pageData,
    message: null,
    error: null
  });
});

router.get('/contact', (req, res) => {
  const all = getSiteContent();
  const pageData = all.contact || {};
  res.render('pages/contact', {
    page: 'page-contact',
    title: pageData.seoTitle || 'Contact — My Care Site',
    content: pageData,
    message: null,
    error: null
  });
});

router.get('/privacy', (req, res) => {
  const all = getSiteContent();
  const pageData = all.privacy || {};
  res.render('pages/privacy', {
    page: 'page-privacy',
    title: pageData.seoTitle || 'Privacy Policy — My Care Site',
    content: pageData
  });
});

router.get('/cookie', (req, res) => {
  const all = getSiteContent();
  const pageData = all.cookie || {};
  res.render('pages/cookie', {
    page: 'page-cookie',
    title: pageData.seoTitle || 'Cookie Policy — My Care Site',
    content: pageData
  });
});

/* ---------- FORMS (unchanged except minor safety) ---------- */

router.post('/contact', async (req, res) => {
  const { name, email, message } = req.body || {};
  if (!name || !email || !message) {
    return res.json({ success: false, error: 'All fields are required.' });
  }
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT) || 587,
      secure: false,
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
      tls: { rejectUnauthorized: false }
    });

    await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      replyTo: email,
      to: process.env.EMAIL_TO,
      subject: 'New Contact Form Message',
      text: `Name: ${name}\nEmail: ${email}\nMessage:\n${message}`
    });

    res.json({ success: true, message: 'Message sent successfully!' });
  } catch (err) {
    console.error(err);
    res.json({ success: false, error: 'Error sending email.' });
  }
});

router.post('/careers',
  (req, res, next) => {
    upload.single('attachment')(req, res, (err) => {
      if (err) {
        let msg = 'Error uploading file.';
        if (err.code === 'LIMIT_FILE_SIZE') msg = 'File too large (max 5MB).';
        else if (err.message && err.message.includes('PDF or DOCX')) msg = err.message;
        return res.json({ success: false, error: msg });
      }
      next();
    });
  },
  async (req, res) => {
    const { name, email, message } = req.body || {};
    const file = req.file;
    if (!name || !email || !message || !file) {
      try { if (file) fs.unlinkSync(file.path); } catch (_) {}
      return res.json({ success: false, error: 'All fields and resume attachment are required.' });
    }

    try {
      const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: Number(process.env.EMAIL_PORT) || 587,
        secure: false,
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
        tls: { rejectUnauthorized: false }
      });

      await transporter.sendMail({
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        replyTo: email,
        to: process.env.EMAIL_TO,
        subject: 'New Career Application',
        text: `Name: ${name}\nEmail: ${email}\nMessage:\n${message}`,
        attachments: [{ filename: file.originalname, path: file.path }]
      });

      try { fs.unlinkSync(file.path); } catch (_) {}
      res.json({ success: true, message: 'Application sent successfully!' });
    } catch (err) {
      console.error(err);
      try { if (file) fs.unlinkSync(file.path); } catch (_) {}
      res.json({ success: false, error: 'Error sending application.' });
    }
  }
);

module.exports = router;
