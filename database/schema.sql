CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS queries (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  query_text TEXT NOT NULL,
  gemini_response TEXT,
  llama_response TEXT,
  deepseek_response TEXT,
  comparison_result TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
