const express = require('express');
const path = require('path');
const session = require('express-session');
const routes = require('./routes/index');
const adminRoutes = require('./routes/admin');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// ---- Content loader (fresh per request) ----
const CONTENT_PATH = path.join(__dirname, 'data', 'siteContent.json');
function getSiteContent() {
  try {
    return JSON.parse(fs.readFileSync(CONTENT_PATH, 'utf8'));
  } catch {
    return {};
  }
}

// Make siteContent available to ALL views/partials (e.g., footer.ejs)
app.use((req, res, next) => {
  res.locals.siteContent = getSiteContent();
  next();
});

// Session for admin login
app.use(session({
  secret: process.env.SESSION_SECRET || 'supersecretkey',
  resave: false,
  saveUninitialized: true
}));

// Body parsing (Express has this built-in)
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.json({ limit: '10mb' }));

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/', routes);
app.use('/admin', adminRoutes);

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
