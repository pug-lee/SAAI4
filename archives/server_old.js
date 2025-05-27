const express = require('express');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const path = require('path');
const axios = require('axios');
const dbConfig = require('../config/database');
const openrouterConfig = require('../config/openrouter');

const app = express();
const pool = new Pool({ connectionString: dbConfig.connectionString, ssl: dbConfig.ssl });

// Middleware
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
  store: new pgSession({
    pool: pool,
    tableName: 'user_sessions'
  }),
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
  }
}));

// Middleware to check authentication
const requireAuth = (req, res, next) => {
  if (!req.session.userId) {
    return res.redirect('/login');
  }
  next();
};

// Middleware to pass user info to views
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});

// Routes
app.get('/', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM queries WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10',
      [req.session.userId]
    );
    res.render('index', { queries: result.rows });
  } catch (error) {
    console.error(error);
    res.render('index', { queries: [] });
  }
});

app.get('/signup', (req, res) => {
  res.render('signup', { error: null });
});

app.post('/signup', async (req, res) => {
  const { email, password, firstName, lastName } = req.body;
  
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (email, password, first_name, last_name) VALUES ($1, $2, $3, $4) RETURNING *',
      [email, hashedPassword, firstName, lastName]
    );
    
    req.session.userId = result.rows[0].id;
    req.session.user = {
      id: result.rows[0].id,
      email: result.rows[0].email,
      firstName: result.rows[0].first_name,
      lastName: result.rows[0].last_name
    };
    
    res.redirect('/');
  } catch (error) {
    console.error(error);
    res.render('signup', { error: 'Email already exists' });
  }
});

app.get('/login', (req, res) => {
  res.render('login', { error: null });
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    
    if (result.rows.length === 0) {
      return res.render('login', { error: 'Invalid email or password' });
    }
    
    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password);
    
    if (!validPassword) {
      return res.render('login', { error: 'Invalid email or password' });
    }
    
    req.session.userId = user.id;
    req.session.user = {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name
    };
    
    res.redirect('/');
  } catch (error) {
    console.error(error);
    res.render('login', { error: 'An error occurred' });
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

app.get('/profile', requireAuth, (req, res) => {
  res.render('profile', { success: null, error: null });
});

app.post('/profile', requireAuth, async (req, res) => {
  const { firstName, lastName, email, currentPassword, newPassword } = req.body;
  
  try {
    // Verify current password
    const userResult = await pool.query('SELECT password FROM users WHERE id = $1', [req.session.userId]);
    const validPassword = await bcrypt.compare(currentPassword, userResult.rows[0].password);
    
    if (!validPassword) {
      return res.render('profile', { success: null, error: 'Current password is incorrect' });
    }
    
    // Update user info
    let query = 'UPDATE users SET first_name = $1, last_name = $2, email = $3';
    let params = [firstName, lastName, email];
    
    if (newPassword) {
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      query += ', password = $4 WHERE id = $5';
      params.push(hashedPassword, req.session.userId);
    } else {
      query += ' WHERE id = $4';
      params.push(req.session.userId);
    }
    
    await pool.query(query, params);
    
    req.session.user = {
      ...req.session.user,
      firstName,
      lastName,
      email
    };
    
    res.render('profile', { success: 'Profile updated successfully', error: null });
  } catch (error) {
    console.error(error);
    res.render('profile', { success: null, error: 'An error occurred' });
  }
});

app.post('/query', requireAuth, async (req, res) => {
  const { query } = req.body;
  
  try {
    // Call OpenRouter API for each model
    const models = ['gemini', 'llama', 'deepseek'];
    const responses = {};
    
    for (const model of models) {
      const response = await axios.post(
        openrouterConfig.baseURL,
        {
          model: openrouterConfig.models[model],
          messages: [{ role: 'user', content: query }]
        },
        {
          headers: {
            'Authorization': `Bearer ${openrouterConfig.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      responses[model] = response.data.choices[0].message.content;
    }
    
    // Compare responses using Llama
    const comparisonPrompt = `Compare these three AI responses and highlight the key differences:
    
    Gemini: ${responses.gemini}
    
    Llama: ${responses.llama}
    
    Deepseek: ${responses.deepseek}
    
    Please provide a semantic comparison highlighting the main differences in approach, content, and style.`;
    
    const comparisonResponse = await axios.post(
      openrouterConfig.baseURL,
      {
        model: openrouterConfig.models.llama,
        messages: [{ role: 'user', content: comparisonPrompt }]
      },
      {
        headers: {
          'Authorization': `Bearer ${openrouterConfig.apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    const comparison = comparisonResponse.data.choices[0].message.content;
    
    // Save to database
    await pool.query(
      'INSERT INTO queries (user_id, query_text, gemini_response, llama_response, deepseek_response, comparison_result) VALUES ($1, $2, $3, $4, $5, $6)',
      [req.session.userId, query, responses.gemini, responses.llama, responses.deepseek, comparison]
    );
    
    res.json({
      success: true,
      responses,
      comparison
    });
  } catch (error) {
    console.error(error);
    res.json({ success: false, error: 'An error occurred' });
  }
});

app.get('/instructions', (req, res) => {
  res.render('instructions');
});

app.get('/about', (req, res) => {
  res.render('about');
});

app.get('/roadmap', (req, res) => {
  res.render('roadmap');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});