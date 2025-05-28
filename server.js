const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const path = require('path');
const axios = require('axios');
const rateLimit = require('express-rate-limit');

// Load environment variables FIRST
require('dotenv').config();

// Debug environment variables
console.log('Environment variables loaded:', {
  hasDatabaseUrl: !!process.env.DATABASE_URL,
  nodeEnv: process.env.NODE_ENV
});

// Now load configs that depend on environment variables
const dbConfig = require('./config/database');
const openrouterConfig = require('./config/openrouter');
const appConfig = require('./config/app');

const app = express();
app.set('trust proxy', 1);

//generate new API_KEY for every call
const proKey = openrouterConfig.proKey;
async function generateApiKey() {
    try {
        const response = await axios.post(
            'https://openrouter.ai/api/v1/keys',
            {
                name: `auto-key-${Date.now()}`,
                limit: 0.0 // $1 credit limit
            },
            {
                headers: {
                    'Authorization': `Bearer ${proKey}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        //console.log('Generated API Key:', response.data.data);
        //console.log('New new key:', response.data.key);
        return response.data.key;
        
    } catch (error) {
        console.error('Error generating API key:', error.response?.data || error.message);
        return null;
    }
}

let tempAPI_Key = generateApiKey();
console.log('Init temp API_KEY:', tempAPI_Key);

// PostgreSQL connection with proper SSL handling for Render
const poolConfig = {
  connectionString: dbConfig.connectionString
};

// Only add SSL config if we have a DATABASE_URL (production)
if (process.env.DATABASE_URL) {
  poolConfig.ssl = {
    rejectUnauthorized: false
  };
}

const pool = new Pool(poolConfig);

// Test database connection
pool.connect((err, client, release) => {
  if (err) {
    console.error('Error connecting to the database:', err.stack);
  } else {
    console.log('Successfully connected to PostgreSQL database');
    release();
  }
});

// Create tables if they don't exist
const createTables = async () => {
  try {
    // Users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Queries table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS queries (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        query_text TEXT NOT NULL,
        gemini_response TEXT,
        llama_response TEXT,
        deepseek_response TEXT,
        comparison_result TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Session table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "user_sessions" (
        "sid" varchar NOT NULL COLLATE "default",
        "sess" json NOT NULL,
        "expire" timestamp(6) NOT NULL
      )
    `);
    
    // Add primary key constraint if it doesn't exist
    await pool.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'session_pkey') THEN
          ALTER TABLE "user_sessions" ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid");
        END IF;
      END $$;
    `);
    
    // Create index if it doesn't exist
    await pool.query(`
      CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "user_sessions" ("expire");
    `);

    console.log('Database tables created/verified successfully');
  } catch (error) {
    console.error('Error creating tables:', error);
  }
};

// Initialize tables
createTables();

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layout');

// Middleware
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
  store: new pgSession({
    pool: pool,
    tableName: 'user_sessions',
    createTableIfMissing: true
  }),
  secret: process.env.SESSION_SECRET || 'thereisreallysomethingaboutAI2025',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    //secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
    //httpOnly: true
    secure: true, 
    proxy: true,
    sameSite: "none"
  }
}));

// Middleware to check authentication
const requireAuth = (req, res, next) => {
  if (!req.session.userId) {
    return res.redirect('/login');
  }
  next();
};

// Middleware to pass user info and app config to views
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.appTitle = appConfig.title;
  next();
});

// Rate limiter for API queries
const queryLimiter = rateLimit({
  windowMs: appConfig.rateLimit.windowMs,
  max: appConfig.rateLimit.maxRequests,
  message: `Too many requests. Please wait ${appConfig.rateLimit.windowMs / 1000} seconds before making another query.`,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  keyGenerator: (req) => {
    // Use session ID if logged in, otherwise use IP
    return req.session?.userId || req.ip;
  },
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: `Too many requests. Please wait ${appConfig.rateLimit.windowMs / 1000} seconds before making another query.`,
      retryAfter: Math.round(appConfig.rateLimit.windowMs / 1000)
    });
  }
});

// Routes
app.get('/', async (req, res) => {
  try {
    let queries = [];
    console.log('Landing page:', req.session.user);
    if (req.session.userId) {
      const result = await pool.query(
        'SELECT * FROM queries WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10',
        [req.session.userId]
      );
      queries = result.rows;
    }
    res.render('index', { queries, isAuthenticated: !!req.session.userId });
  } catch (error) {
    console.error(error);
    res.render('index', { queries: [], isAuthenticated: !!req.session.userId });
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
    
    console.log('User logged in and ID is:', user.id);
    req.session.userId = user.id;
    req.session.user = {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name
    };
    console.log('Created session:', req.session.user);
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

app.post('/query', queryLimiter, async (req, res) => {
  const { query } = req.body;
  const enhancePrompt = 'Explain in simple, clear language as if you are teaching someone with no prior knowledge. Break the explanation into sections with headings. Use analogies and examples to make complex ideas easy to understand. Format it like a web article with short paragraphs and bullet points. ';
  let new_query = enhancePrompt + query;
  
  try {
    // Check if API key exists
    if (!tempAPI_Key) {
      console.error('OpenRouter API key is missing!');
      return res.status(500).json({ 
        success: false, 
        error: 'API configuration error. Please check your OpenRouter API key.' 
      });
    }

    // Call OpenRouter API for each model
    const models = ['gemini', 'llama', 'deepseek'];
    const responses = {};
    
    for (const model of models) {
      console.log(`Calling ${model} model...`);
      tempAPI_Key = await generateApiKey();
      console.log('Gen new API_KEY:', tempAPI_Key);

      const response = await axios.post(
        openrouterConfig.baseURL,
        {
          model: openrouterConfig.models[model],
          messages: [{ role: 'user', content: new_query }]
        },
        {
          headers: {
            'Authorization': `Bearer ${tempAPI_Key}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': openrouterConfig.headers['HTTP-Referer'],
            'X-Title': openrouterConfig.headers['X-Title']
          }
        }
      );
      
      responses[model] = response.data.choices[0].message.content;
    }
    
    // Compare responses using Gemma    
    const comparisonPrompt = `Compare these three AI responses and highlight the key differences:
    
    Gemini: ${responses.gemini}
    
    Llama: ${responses.llama}
    
    Deepseek: ${responses.deepseek}
    
    Please provide a semantic comparison highlighting the main differences in approach, content, and style. The result should be for a general audience. Make it engaging, informative, and easy to read. Use headings, subheadings, short paragraphs, and bullet points. The tone should be friendly and professional, suitable for a website. End with a call-to-action inviting readers to share the article.`;
    
    console.log('Calling Gemma for comparison...');
    tempAPI_Key = await generateApiKey();

    const comparisonResponse = await axios.post(
      openrouterConfig.baseURL,
      {
        model: openrouterConfig.models.gemma,
        messages: [{ role: 'user', content: comparisonPrompt }]
      },
      {
        headers: {
          'Authorization': `Bearer ${tempAPI_Key}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': openrouterConfig.headers['HTTP-Referer'],
          'X-Title': openrouterConfig.headers['X-Title']
        }
      }
    );
    
    const comparison = comparisonResponse.data.choices[0].message.content;
    
    // Save to database only if user is logged in
    if (req.session.userId) {
      await pool.query(
        'INSERT INTO queries (user_id, query_text, gemini_response, llama_response, deepseek_response, comparison_result) VALUES ($1, $2, $3, $4, $5, $6)',
        [req.session.userId, query, responses.gemini, responses.llama, responses.deepseek, comparison]
      );
    }
    console.log('Sending results back to browser:');
    res.json({
      success: true,
      responses,
      comparison
    });
    console.log('done');
  } catch (error) {
    console.error('API Error:', error.response?.data || error.message);
    console.error('Full error:', error.response?.status, error.response?.statusText);
    
    // More detailed error handling
    if (error.response?.status === 401) {
      return res.status(401).json({ 
        success: false, 
        error: 'Authentication failed. Please check your OpenRouter API key in the .env file.' 
      });
    }
    
    if (error.response?.status === 429) {
      return res.status(429).json({ 
        success: false, 
        error: 'OpenRouter API rate limit exceeded. Please try again later.' 
      });
    }
    
    if (error.response?.status === 400) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid request. The model name might be incorrect or the request format is invalid.' 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      error: 'An error occurred while processing your request.' 
    });
  }
});

app.get('/query/:id', async (req, res) => {
  // Check if user is authenticated
  console.log('Retrieving past queries ', req.session.userId);
  if (!req.session.userId) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }
  
  const queryId = req.params.id;
  
  try {
    const result = await pool.query(
      'SELECT * FROM queries WHERE id = $1 AND user_id = $2',
      [queryId, req.session.userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Query not found' });
    }
    
    res.json({
      success: true,
      query: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching query:', error);
    res.status(500).json({ success: false, error: 'An error occurred' });
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