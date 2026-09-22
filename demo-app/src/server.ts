import express from 'express';
import path from 'path';

const app = express();
const PORT = process.env.DEMO_PORT || 4000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// In-memory data store for demo CRUD
let items = [
  { id: '1', name: 'Standard Item Alpha', description: 'Default seeded item for QA test suite' },
  { id: '2', name: 'Standard Item Beta', description: 'Secondary seeded item for deletion testing' }
];

let feedbacks: any[] = [];

// Helper HTML layout wrapper
function renderPage(title: string, bodyContent: string, currentPath: string = '') {
  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} - Seeded QA Demo App</title>
    <style>
      :root {
        --primary: #4f46e5;
        --primary-hover: #4338ca;
        --bg: #0f172a;
        --card-bg: #1e293b;
        --text: #f8fafc;
        --text-muted: #94a3b8;
        --border: #334155;
        --danger: #ef4444;
        --success: #22c55e;
      }
      * { box-sizing: border-box; margin: 0; padding: 0; font-family: system-ui, -apple-system, sans-serif; }
      body { background: var(--bg); color: var(--text); padding: 20px; line-height: 1.5; }
      .navbar { display: flex; gap: 20px; padding: 15px 25px; background: var(--card-bg); border: 1px solid var(--border); border-radius: 8px; margin-bottom: 25px; align-items: center; }
      .navbar a { color: var(--text-muted); text-decoration: none; font-weight: 500; }
      .navbar a.active { color: var(--primary); font-weight: 700; }
      .container { max-width: 800px; margin: 0 auto; background: var(--card-bg); padding: 30px; border-radius: 12px; border: 1px solid var(--border); }
      h1, h2 { margin-bottom: 15px; color: #fff; }
      p { color: var(--text-muted); margin-bottom: 20px; }
      .form-group { margin-bottom: 18px; }
      label { display: block; margin-bottom: 6px; font-weight: 600; color: #cbd5e1; }
      input, select, textarea { width: 100%; padding: 10px 14px; border-radius: 6px; border: 1px solid var(--border); background: #0f172a; color: #fff; font-size: 14px; }
      input:focus, select:focus, textarea:focus { outline: 2px solid var(--primary); }
      .btn { padding: 10px 18px; background: var(--primary); color: #fff; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; display: inline-block; text-decoration: none; }
      .btn:hover { background: var(--primary-hover); }
      .btn-danger { background: var(--danger); }
      .btn-danger:hover { background: #dc2626; }
      .error-text { color: var(--danger); font-size: 13px; margin-top: 5px; display: block; }
      .alert { padding: 12px 16px; border-radius: 6px; margin-bottom: 20px; font-weight: 500; }
      .alert-danger { background: rgba(239,68,68,0.2); border: 1px solid var(--danger); color: #fca5a5; }
      .alert-success { background: rgba(34,197,94,0.2); border: 1px solid var(--success); color: #86efac; }
      .item-card { background: #0f172a; padding: 15px; border-radius: 8px; border: 1px solid var(--border); margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; }
      .modal-backdrop { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.7); align-items: center; justify-content: center; }
      .modal-backdrop.open { display: flex; }
      .modal { background: var(--card-bg); padding: 25px; border-radius: 12px; width: 450px; border: 1px solid var(--border); }
    </style>
  </head>
  <body>
    <nav class="navbar" role="navigation" aria-label="Main Navigation">
      <strong style="color: #fff; font-size: 18px; margin-right: auto;">QA Demo App</strong>
      <a href="/login" class="${currentPath === '/login' ? 'active' : ''}" data-testid="nav-login">Login</a>
      <a href="/dashboard" class="${currentPath === '/dashboard' ? 'active' : ''}" data-testid="nav-dashboard">Dashboard</a>
      <a href="/items" class="${currentPath === '/items' ? 'active' : ''}" data-testid="nav-items">CRUD Items</a>
      <a href="/feedback" class="${currentPath === '/feedback' ? 'active' : ''}" data-testid="nav-feedback">Feedback Form</a>
    </nav>
    <main class="container">
      ${bodyContent}
    </main>
  </body>
  </html>
  `;
}

// 1. Root -> redirect to login
app.get('/', (req, res) => {
  res.redirect('/login');
});

// 2. Auth Flow: Login
app.get('/login', (req, res) => {
  const errorMsg = req.query.error ? 'Invalid email or password' : '';
  const html = `
    <h1 data-testid="login-title">Account Login</h1>
    <p>Sign in to access your dashboard and manage items.</p>
    ${errorMsg ? `<div class="alert alert-danger" data-testid="login-error-alert" role="alert">${errorMsg}</div>` : ''}
    <form action="/api/login" method="POST" id="loginForm">
      <div class="form-group">
        <label for="email">Email Address</label>
        <input type="email" id="email" name="email" data-testid="email-input" aria-label="Email Address" required placeholder="user@demo.com" />
      </div>
      <div class="form-group">
        <label for="password">Password</label>
        <input type="password" id="password" name="password" data-testid="password-input" aria-label="Password" required placeholder="••••••••" />
      </div>
      <button type="submit" class="btn" data-testid="login-submit" role="button">Sign In</button>
    </form>
    <p style="margin-top: 20px;">
      Don't have an account? <a href="/register" data-testid="goto-register">Register here</a>
    </p>
  `;
  res.send(renderPage('Login', html, '/login'));
});

// Auth API: Login
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  if (email === 'user@demo.com' && password === 'password123') {
    res.redirect('/dashboard?user=' + encodeURIComponent('Demo User'));
  } else {
    res.redirect('/login?error=1');
  }
});

// 3. Auth Flow: Register
app.get('/register', (req, res) => {
  const html = `
    <h1 data-testid="register-title">Register Account</h1>
    <p>Create a demo account to get started.</p>
    <form action="/api/register" method="POST">
      <div class="form-group">
        <label for="reg-name">Full Name</label>
        <input type="text" id="reg-name" name="name" data-testid="reg-name" aria-label="Full Name" required placeholder="Jane Doe" />
      </div>
      <div class="form-group">
        <label for="reg-email">Email Address</label>
        <input type="email" id="reg-email" name="email" data-testid="reg-email" aria-label="Email Address" required placeholder="jane@demo.com" />
      </div>
      <div class="form-group">
        <label for="reg-password">Password</label>
        <input type="password" id="reg-password" name="password" data-testid="reg-password" aria-label="Password" required minlength="6" />
      </div>
      <button type="submit" class="btn" data-testid="reg-submit" role="button">Create Account</button>
    </form>
    <p style="margin-top: 20px;">
      Already have an account? <a href="/login" data-testid="goto-login">Login here</a>
    </p>
  `;
  res.send(renderPage('Register', html, '/register'));
});

// Auth API: Register
app.post('/api/register', (req, res) => {
  res.redirect('/dashboard?registered=true');
});

// 4. Dashboard Page
app.get('/dashboard', (req, res) => {
  const user = req.query.user || 'Demo User';
  const html = `
    <h1 data-testid="dashboard-heading">Welcome, ${user}!</h1>
    <p data-testid="dashboard-intro">You are successfully logged into the Autonomous QA Testing Demo App.</p>
    <div style="display: flex; gap: 15px; margin-top: 20px;">
      <a href="/items" class="btn" data-testid="goto-items-btn">Manage CRUD Items</a>
      <a href="/feedback" class="btn" data-testid="goto-feedback-btn">Validation Form</a>
      <a href="/login" class="btn btn-danger" data-testid="logout-btn">Log Out</a>
    </div>
  `;
  res.send(renderPage('Dashboard', html, '/dashboard'));
});

// 5. CRUD Flow Page: Items List
app.get('/items', (req, res) => {
  const errorMsg = req.query.error || '';
  let itemsListHtml = items.map(item => `
    <div class="item-card" data-testid="item-row" data-item-id="${item.id}">
      <div>
        <h3 data-testid="item-title">${item.name}</h3>
        <p style="margin: 0;" data-testid="item-desc">${item.description}</p>
      </div>
      <form action="/api/items/delete" method="POST" style="margin: 0;">
        <input type="hidden" name="id" value="${item.id}" />
        <button type="submit" class="btn btn-danger" data-testid="delete-item-btn" role="button">Delete</button>
      </form>
    </div>
  `).join('');

  if (items.length === 0) {
    itemsListHtml = '<p data-testid="no-items-msg">No items available. Click "Create New Item" to add one.</p>';
  }

  const html = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
      <h1 data-testid="items-heading">CRUD Items Store</h1>
      <button class="btn" id="openModalBtn" data-testid="open-create-modal" onclick="document.getElementById('createModal').classList.add('open')">Create New Item</button>
    </div>
    ${errorMsg ? `<div class="alert alert-danger" data-testid="crud-error-alert" role="alert">${errorMsg}</div>` : ''}
    <div id="itemsContainer">
      ${itemsListHtml}
    </div>

    <!-- Create Item Modal -->
    <div class="modal-backdrop" id="createModal" role="dialog" aria-labelledby="modal-title">
      <div class="modal">
        <h2 id="modal-title" data-testid="modal-title">Create New Item</h2>
        <form action="/api/items/create" method="POST">
          <div class="form-group">
            <label for="item-name">Item Name</label>
            <input type="text" id="item-name" name="name" data-testid="item-name-input" required aria-label="Item Name" placeholder="e.g. Widget Gamma" />
          </div>
          <div class="form-group">
            <label for="item-desc">Description</label>
            <textarea id="item-desc" name="description" data-testid="item-desc-input" required aria-label="Description" rows="3" placeholder="Enter details"></textarea>
          </div>
          <div style="display: flex; gap: 10px; justify-content: flex-end;">
            <button type="button" class="btn" style="background: #475569;" data-testid="cancel-item-btn" onclick="document.getElementById('createModal').classList.remove('open')">Cancel</button>
            <button type="submit" class="btn" data-testid="save-item-btn" role="button">Save Item</button>
          </div>
        </form>
      </div>
    </div>
  `;
  res.send(renderPage('CRUD Items', html, '/items'));
});

// CRUD API: Create Item
app.post('/api/items/create', (req, res) => {
  const { name, description } = req.body;
  // Seeded intentional bug case: If item name is "BUG_ITEM", simulate a 500 server error
  if (name === 'BUG_ITEM') {
    return res.status(500).send(renderPage('500 Error', `
      <h1 style="color: #ef4444;" data-testid="server-error-heading">Internal Server Error 500</h1>
      <p data-testid="error-message">Database crash while attempting to insert reserved BUG_ITEM keyword.</p>
      <a href="/items" class="btn" data-testid="back-to-items">Back to Items</a>
    `, '/items'));
  }

  const newItem = {
    id: String(Date.now()),
    name: name || 'Untitled Item',
    description: description || 'No description'
  };
  items.push(newItem);
  res.redirect('/items');
});

// CRUD API: Delete Item
app.post('/api/items/delete', (req, res) => {
  const { id } = req.body;
  items = items.filter(item => item.id !== id);
  res.redirect('/items');
});

// 6. Form with Validation Page
app.get('/feedback', (req, res) => {
  const submitted = req.query.success === 'true';
  const html = `
    <h1 data-testid="feedback-title">User Feedback & Support Form</h1>
    <p>Please submit your feedback or bug report below.</p>
    
    ${submitted ? `<div class="alert alert-success" data-testid="feedback-success" role="alert">Thank you! Your feedback has been received.</div>` : ''}

    <!-- Accessibility intentional flaw: missing alt on image & unlabelled element for Axe detection -->
    <img src="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40'><rect width='40' height='40' fill='%234f46e5'/></svg>" data-testid="unlabelled-banner-img" style="margin-bottom: 15px;" />

    <form action="/api/feedback" method="POST" id="feedbackForm" novalidate>
      <div class="form-group">
        <label for="fb-name">Your Full Name</label>
        <input type="text" id="fb-name" name="name" data-testid="feedback-name" aria-label="Your Full Name" placeholder="Alice Smith" />
      </div>
      <div class="form-group">
        <label for="fb-email">Email Address</label>
        <input type="email" id="fb-email" name="email" data-testid="feedback-email" aria-label="Email Address" placeholder="alice@example.com" />
        <span class="error-text" id="emailErr" data-testid="error-email" style="display:none;">Please enter a valid email address containing '@'</span>
      </div>
      <div class="form-group">
        <label for="fb-category">Topic Category</label>
        <select id="fb-category" name="category" data-testid="feedback-category" aria-label="Topic Category">
          <option value="bug">Bug Report</option>
          <option value="feature">Feature Request</option>
          <option value="general">General Inquiry</option>
        </select>
      </div>
      <div class="form-group">
        <label for="fb-comments">Comments / Details</label>
        <textarea id="fb-comments" name="comments" data-testid="feedback-comments" aria-label="Comments" rows="4" placeholder="Enter your detailed feedback..."></textarea>
        <span class="error-text" id="commentsErr" data-testid="error-comments" style="display:none;">Comments must be at least 10 characters long.</span>
      </div>
      <button type="submit" class="btn" data-testid="submit-feedback" role="button">Submit Feedback</button>
    </form>

    <script>
      document.getElementById('feedbackForm').addEventListener('submit', function(e) {
        let valid = true;
        const email = document.getElementById('fb-email').value;
        const comments = document.getElementById('fb-comments').value;
        const emailErr = document.getElementById('emailErr');
        const commentsErr = document.getElementById('commentsErr');

        if (!email || !email.includes('@')) {
          emailErr.style.display = 'block';
          valid = false;
        } else {
          emailErr.style.display = 'none';
        }

        if (!comments || comments.trim().length < 10) {
          commentsErr.style.display = 'block';
          valid = false;
        } else {
          commentsErr.style.display = 'none';
        }

        if (!valid) {
          e.preventDefault();
        }
      });
    </script>
  `;
  res.send(renderPage('Feedback Form', html, '/feedback'));
});

// Feedback API
app.post('/api/feedback', (req, res) => {
  const { name, email, category, comments } = req.body;
  if (!email || !email.includes('@') || !comments || comments.length < 10) {
    return res.redirect('/feedback?error=validation');
  }
  feedbacks.push({ name, email, category, comments, date: new Date() });
  res.redirect('/feedback?success=true');
});

app.listen(PORT, () => {
  console.log(`[Demo App] Running on http://localhost:${PORT}`);
});
