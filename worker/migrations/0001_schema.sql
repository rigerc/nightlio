-- ============================================================
-- Waymark D1 Schema + Seed
-- Run with: wrangler d1 migrations apply waymark
-- ============================================================

-- Users
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    google_id TEXT UNIQUE NOT NULL,
    email TEXT NOT NULL,
    name TEXT NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Mood entries
CREATE TABLE IF NOT EXISTS mood_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    mood INTEGER NOT NULL CHECK (mood >= 1 AND mood <= 5),
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- Groups
CREATE TABLE IF NOT EXISTS groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    color TEXT DEFAULT NULL,
    icon TEXT DEFAULT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Group options (UNIQUE on group_id+name prevents duplicate seeding)
CREATE TABLE IF NOT EXISTS group_options (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    icon TEXT DEFAULT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (group_id) REFERENCES groups (id) ON DELETE CASCADE,
    UNIQUE(group_id, name)
);

-- Entry selections
CREATE TABLE IF NOT EXISTS entry_selections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entry_id INTEGER NOT NULL,
    option_id INTEGER NOT NULL,
    source TEXT DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (entry_id) REFERENCES mood_entries (id) ON DELETE CASCADE,
    FOREIGN KEY (option_id) REFERENCES group_options (id) ON DELETE CASCADE
);

-- Achievements
CREATE TABLE IF NOT EXISTS achievements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    achievement_type TEXT NOT NULL,
    earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    nft_minted BOOLEAN DEFAULT FALSE,
    nft_token_id INTEGER,
    nft_tx_hash TEXT,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    UNIQUE(user_id, achievement_type)
);

-- Goals
CREATE TABLE IF NOT EXISTS goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    frequency_per_week INTEGER NOT NULL CHECK (frequency_per_week >= 1 AND frequency_per_week <= 7),
    completed INTEGER NOT NULL DEFAULT 0,
    streak INTEGER NOT NULL DEFAULT 0,
    period_start TEXT,
    last_completed_date TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- Goal completions
CREATE TABLE IF NOT EXISTS goal_completions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    goal_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    FOREIGN KEY (goal_id) REFERENCES goals (id) ON DELETE CASCADE,
    UNIQUE(user_id, goal_id, date)
);

-- User preferences
CREATE TABLE IF NOT EXISTS user_preferences (
    user_id INTEGER PRIMARY KEY,
    mood_icons TEXT DEFAULT NULL,
    use_24_hour_time INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- User metrics (for Data Lover achievement)
CREATE TABLE IF NOT EXISTS user_metrics (
    user_id INTEGER PRIMARY KEY,
    stats_views INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- Fitness connections
CREATE TABLE IF NOT EXISTS fitness_connections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    provider TEXT NOT NULL,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    expires_at TEXT,
    last_synced_at TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    UNIQUE(user_id, provider)
);

-- Fitness data
CREATE TABLE IF NOT EXISTS fitness_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    source_provider TEXT NOT NULL,
    data_type TEXT NOT NULL,
    date TEXT NOT NULL,
    value REAL NOT NULL,
    metadata TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    UNIQUE(user_id, source_provider, data_type, date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_mood_entries_date ON mood_entries(date);
CREATE INDEX IF NOT EXISTS idx_goals_user ON goals(user_id);
CREATE INDEX IF NOT EXISTS idx_goal_completions_user_goal ON goal_completions(user_id, goal_id);
CREATE INDEX IF NOT EXISTS idx_goal_completions_date ON goal_completions(date);
CREATE INDEX IF NOT EXISTS idx_fitness_data_user_date ON fitness_data(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_fitness_connections_user ON fitness_connections(user_id);

-- ============================================================
-- Seed: Default Groups
-- ============================================================
INSERT OR IGNORE INTO groups (name, color, icon) VALUES
  ('Emotions',    '#ec4899', 'Heart'),
  ('Sleep',       '#6366f1', 'Moon'),
  ('Productivity','#f59e0b', 'Target'),
  ('Health',      '#10b981', 'Activity'),
  ('Social',      '#3b82f6', 'Users'),
  ('Romance',     '#f43f5e', 'Heart'),
  ('Sports',      '#84cc16', 'Dumbbell'),
  ('Mental',      '#8b5cf6', 'Brain'),
  ('Chores',      '#78716c', 'Home'),
  ('Hobbies',     '#06b6d4', 'Sparkles'),
  ('Food',        '#f97316', 'Utensils'),
  ('Bad Habits',  '#64748b', 'ZapOff');

-- ============================================================
-- Seed: Emotions options
-- ============================================================
INSERT OR IGNORE INTO group_options (group_id, name, icon) SELECT id, 'happy',    'Smile'      FROM groups WHERE name = 'Emotions';
INSERT OR IGNORE INTO group_options (group_id, name, icon) SELECT id, 'excited',  'Sparkles'   FROM groups WHERE name = 'Emotions';
INSERT OR IGNORE INTO group_options (group_id, name, icon) SELECT id, 'grateful', 'Heart'      FROM groups WHERE name = 'Emotions';
INSERT OR IGNORE INTO group_options (group_id, name, icon) SELECT id, 'content',  'Smile'      FROM groups WHERE name = 'Emotions';
INSERT OR IGNORE INTO group_options (group_id, name, icon) SELECT id, 'calm',     'Leaf'       FROM groups WHERE name = 'Emotions';
INSERT OR IGNORE INTO group_options (group_id, name, icon) SELECT id, 'hopeful',  'Sun'        FROM groups WHERE name = 'Emotions';
INSERT OR IGNORE INTO group_options (group_id, name, icon) SELECT id, 'proud',    'Trophy'     FROM groups WHERE name = 'Emotions';
INSERT OR IGNORE INTO group_options (group_id, name, icon) SELECT id, 'loved',    'Heart'      FROM groups WHERE name = 'Emotions';
INSERT OR IGNORE INTO group_options (group_id, name, icon) SELECT id, 'unsure',   'Meh'        FROM groups WHERE name = 'Emotions';
INSERT OR IGNORE INTO group_options (group_id, name, icon) SELECT id, 'bored',    'Meh'        FROM groups WHERE name = 'Emotions';
INSERT OR IGNORE INTO group_options (group_id, name, icon) SELECT id, 'lonely',   'CloudRain'  FROM groups WHERE name = 'Emotions';
INSERT OR IGNORE INTO group_options (group_id, name, icon) SELECT id, 'anxious',  'Wind'       FROM groups WHERE name = 'Emotions';
INSERT OR IGNORE INTO group_options (group_id, name, icon) SELECT id, 'irritated','ZapOff'     FROM groups WHERE name = 'Emotions';
INSERT OR IGNORE INTO group_options (group_id, name, icon) SELECT id, 'angry',    'Flame'      FROM groups WHERE name = 'Emotions';
INSERT OR IGNORE INTO group_options (group_id, name, icon) SELECT id, 'stressed', 'ZapOff'     FROM groups WHERE name = 'Emotions';
INSERT OR IGNORE INTO group_options (group_id, name, icon) SELECT id, 'sad',      'Frown'      FROM groups WHERE name = 'Emotions';

-- ============================================================
-- Seed: Sleep options
-- ============================================================
INSERT OR IGNORE INTO group_options (group_id, name, icon) SELECT id, 'well-rested','Moon'   FROM groups WHERE name = 'Sleep';
INSERT OR IGNORE INTO group_options (group_id, name, icon) SELECT id, 'refreshed',  'Sun'    FROM groups WHERE name = 'Sleep';
INSERT OR IGNORE INTO group_options (group_id, name, icon) SELECT id, 'napped',     'Cloud'  FROM groups WHERE name = 'Sleep';
INSERT OR IGNORE INTO group_options (group_id, name, icon) SELECT id, 'tired',      'ZapOff' FROM groups WHERE name = 'Sleep';
INSERT OR IGNORE INTO group_options (group_id, name, icon) SELECT id, 'groggy',     'Cloud'  FROM groups WHERE name = 'Sleep';
INSERT OR IGNORE INTO group_options (group_id, name, icon) SELECT id, 'exhausted',  'Frown'  FROM groups WHERE name = 'Sleep';
INSERT OR IGNORE INTO group_options (group_id, name, icon) SELECT id, 'restless',   'Wind'   FROM groups WHERE name = 'Sleep';

-- ============================================================
-- Seed: Productivity options
-- ============================================================
INSERT OR IGNORE INTO group_options (group_id, name, icon) SELECT id, 'focused',      'Target'      FROM groups WHERE name = 'Productivity';
INSERT OR IGNORE INTO group_options (group_id, name, icon) SELECT id, 'motivated',    'Zap'         FROM groups WHERE name = 'Productivity';
INSERT OR IGNORE INTO group_options (group_id, name, icon) SELECT id, 'accomplished', 'CircleCheck' FROM groups WHERE name = 'Productivity';
INSERT OR IGNORE INTO group_options (group_id, name, icon) SELECT id, 'productive',   'Briefcase'   FROM groups WHERE name = 'Productivity';
INSERT OR IGNORE INTO group_options (group_id, name, icon) SELECT id, 'creative',     'Lightbulb'   FROM groups WHERE name = 'Productivity';
INSERT OR IGNORE INTO group_options (group_id, name, icon) SELECT id, 'busy',         'Clock'       FROM groups WHERE name = 'Productivity';
INSERT OR IGNORE INTO group_options (group_id, name, icon) SELECT id, 'distracted',   'Phone'       FROM groups WHERE name = 'Productivity';
INSERT OR IGNORE INTO group_options (group_id, name, icon) SELECT id, 'scattered',    'Wind'        FROM groups WHERE name = 'Productivity';
INSERT OR IGNORE INTO group_options (group_id, name, icon) SELECT id, 'overwhelmed',  'CloudRain'   FROM groups WHERE name = 'Productivity';
INSERT OR IGNORE INTO group_options (group_id, name, icon) SELECT id, 'low-energy',   'ZapOff'      FROM groups WHERE name = 'Productivity';

-- ============================================================
-- Seed: Health options
-- ============================================================
INSERT OR IGNORE INTO group_options (group_id, name, icon) SELECT id, 'energetic', 'Zap'      FROM groups WHERE name = 'Health';
INSERT OR IGNORE INTO group_options (group_id, name, icon) SELECT id, 'active',    'Activity' FROM groups WHERE name = 'Health';
INSERT OR IGNORE INTO group_options (group_id, name, icon) SELECT id, 'healthy',   'Heart'    FROM groups WHERE name = 'Health';
INSERT OR IGNORE INTO group_options (group_id, name, icon) SELECT id, 'sick',      'Pill'     FROM groups WHERE name = 'Health';
INSERT OR IGNORE INTO group_options (group_id, name, icon) SELECT id, 'sore',      'Dumbbell' FROM groups WHERE name = 'Health';
INSERT OR IGNORE INTO group_options (group_id, name, icon) SELECT id, 'sluggish',  'ZapOff'   FROM groups WHERE name = 'Health';

-- ============================================================
-- Seed: Social options
-- ============================================================
INSERT OR IGNORE INTO group_options (group_id, name, icon) SELECT id, 'connected',      'Users'         FROM groups WHERE name = 'Social';
INSERT OR IGNORE INTO group_options (group_id, name, icon) SELECT id, 'social',         'MessageCircle' FROM groups WHERE name = 'Social';
INSERT OR IGNORE INTO group_options (group_id, name, icon) SELECT id, 'supported',      'ThumbsUp'      FROM groups WHERE name = 'Social';
INSERT OR IGNORE INTO group_options (group_id, name, icon) SELECT id, 'isolated',       'Cloud'         FROM groups WHERE name = 'Social';
INSERT OR IGNORE INTO group_options (group_id, name, icon) SELECT id, 'lonely',         'CloudRain'     FROM groups WHERE name = 'Social';
INSERT OR IGNORE INTO group_options (group_id, name, icon) SELECT id, 'missing someone','Heart'         FROM groups WHERE name = 'Social';

-- ============================================================
-- Seed: Romance options
-- ============================================================
INSERT OR IGNORE INTO group_options (group_id, name, icon) SELECT id, 'loved',       'Heart'    FROM groups WHERE name = 'Romance';
INSERT OR IGNORE INTO group_options (group_id, name, icon) SELECT id, 'affectionate','Heart'    FROM groups WHERE name = 'Romance';
INSERT OR IGNORE INTO group_options (group_id, name, icon) SELECT id, 'romantic',    'Sparkles' FROM groups WHERE name = 'Romance';
INSERT OR IGNORE INTO group_options (group_id, name, icon) SELECT id, 'intimate',    'Heart'    FROM groups WHERE name = 'Romance';
INSERT OR IGNORE INTO group_options (group_id, name, icon) SELECT id, 'distant',     'Cloud'    FROM groups WHERE name = 'Romance';
INSERT OR IGNORE INTO group_options (group_id, name, icon) SELECT id, 'heartbroken', 'Frown'    FROM groups WHERE name = 'Romance';
INSERT OR IGNORE INTO group_options (group_id, name, icon) SELECT id, 'longing',     'Moon'     FROM groups WHERE name = 'Romance';

-- ============================================================
-- Seed: Sports options
-- ============================================================
INSERT OR IGNORE INTO group_options (group_id, name, icon) SELECT id, 'worked out',     'Dumbbell'      FROM groups WHERE name = 'Sports';
INSERT OR IGNORE INTO group_options (group_id, name, icon) SELECT id, 'ran',            'Footprints'    FROM groups WHERE name = 'Sports';
INSERT OR IGNORE INTO group_options (group_id, name, icon) SELECT id, 'cycled',         'Bike'          FROM groups WHERE name = 'Sports';
INSERT OR IGNORE INTO group_options (group_id, name, icon) SELECT id, 'walked',         'Footprints'    FROM groups WHERE name = 'Sports';
INSERT OR IGNORE INTO group_options (group_id, name, icon) SELECT id, 'stretched',      'PersonStanding'FROM groups WHERE name = 'Sports';
INSERT OR IGNORE INTO group_options (group_id, name, icon) SELECT id, 'yoga',           'Leaf'          FROM groups WHERE name = 'Sports';
INSERT OR IGNORE INTO group_options (group_id, name, icon) SELECT id, 'skipped workout','ZapOff'        FROM groups WHERE name = 'Sports';
INSERT OR IGNORE INTO group_options (group_id, name, icon) SELECT id, 'sedentary',      'Tv'            FROM groups WHERE name = 'Sports';

-- ============================================================
-- Seed: Mental options
-- ============================================================
INSERT OR IGNORE INTO group_options (group_id, name, icon) SELECT id, 'meditated',      'Brain'         FROM groups WHERE name = 'Mental';
INSERT OR IGNORE INTO group_options (group_id, name, icon) SELECT id, 'journaled',      'Pencil'        FROM groups WHERE name = 'Mental';
INSERT OR IGNORE INTO group_options (group_id, name, icon) SELECT id, 'mindful',        'Leaf'          FROM groups WHERE name = 'Mental';
INSERT OR IGNORE INTO group_options (group_id, name, icon) SELECT id, 'therapy',        'MessageCircle' FROM groups WHERE name = 'Mental';
INSERT OR IGNORE INTO group_options (group_id, name, icon) SELECT id, 'scattered',      'Wind'          FROM groups WHERE name = 'Mental';
INSERT OR IGNORE INTO group_options (group_id, name, icon) SELECT id, 'racing thoughts','Wind'          FROM groups WHERE name = 'Mental';
INSERT OR IGNORE INTO group_options (group_id, name, icon) SELECT id, 'burned out',     'Flame'         FROM groups WHERE name = 'Mental';

-- ============================================================
-- Seed: Chores options
-- ============================================================
INSERT OR IGNORE INTO group_options (group_id, name, icon) SELECT id, 'cleaned',         'Sparkles'   FROM groups WHERE name = 'Chores';
INSERT OR IGNORE INTO group_options (group_id, name, icon) SELECT id, 'cooked',          'Utensils'   FROM groups WHERE name = 'Chores';
INSERT OR IGNORE INTO group_options (group_id, name, icon) SELECT id, 'groceries',       'ShoppingBag'FROM groups WHERE name = 'Chores';
INSERT OR IGNORE INTO group_options (group_id, name, icon) SELECT id, 'laundry',         'Cloud'      FROM groups WHERE name = 'Chores';
INSERT OR IGNORE INTO group_options (group_id, name, icon) SELECT id, 'tidied',          'Home'       FROM groups WHERE name = 'Chores';
INSERT OR IGNORE INTO group_options (group_id, name, icon) SELECT id, 'behind on chores','Clock'      FROM groups WHERE name = 'Chores';

-- ============================================================
-- Seed: Hobbies options
-- ============================================================
INSERT OR IGNORE INTO group_options (group_id, name, icon) SELECT id, 'read',                'BookOpen'   FROM groups WHERE name = 'Hobbies';
INSERT OR IGNORE INTO group_options (group_id, name, icon) SELECT id, 'gamed',               'Gamepad2'   FROM groups WHERE name = 'Hobbies';
INSERT OR IGNORE INTO group_options (group_id, name, icon) SELECT id, 'creative',            'Sparkles'   FROM groups WHERE name = 'Hobbies';
INSERT OR IGNORE INTO group_options (group_id, name, icon) SELECT id, 'music',               'Music'      FROM groups WHERE name = 'Hobbies';
INSERT OR IGNORE INTO group_options (group_id, name, icon) SELECT id, 'art',                 'Pencil'     FROM groups WHERE name = 'Hobbies';
INSERT OR IGNORE INTO group_options (group_id, name, icon) SELECT id, 'crafts',              'Sparkles'   FROM groups WHERE name = 'Hobbies';
INSERT OR IGNORE INTO group_options (group_id, name, icon) SELECT id, 'outdoor',             'TreePine'   FROM groups WHERE name = 'Hobbies';
INSERT OR IGNORE INTO group_options (group_id, name, icon) SELECT id, 'learned something new','Lightbulb' FROM groups WHERE name = 'Hobbies';

-- ============================================================
-- Seed: Food options
-- ============================================================
INSERT OR IGNORE INTO group_options (group_id, name, icon) SELECT id, 'ate well',       'Apple'    FROM groups WHERE name = 'Food';
INSERT OR IGNORE INTO group_options (group_id, name, icon) SELECT id, 'balanced meals', 'Apple'    FROM groups WHERE name = 'Food';
INSERT OR IGNORE INTO group_options (group_id, name, icon) SELECT id, 'cooked at home', 'Utensils' FROM groups WHERE name = 'Food';
INSERT OR IGNORE INTO group_options (group_id, name, icon) SELECT id, 'skipped meals',  'Clock'    FROM groups WHERE name = 'Food';
INSERT OR IGNORE INTO group_options (group_id, name, icon) SELECT id, 'junk food',      'Pizza'    FROM groups WHERE name = 'Food';
INSERT OR IGNORE INTO group_options (group_id, name, icon) SELECT id, 'overate',        'Utensils' FROM groups WHERE name = 'Food';
INSERT OR IGNORE INTO group_options (group_id, name, icon) SELECT id, 'alcohol',        'Coffee'   FROM groups WHERE name = 'Food';

-- ============================================================
-- Seed: Bad Habits options
-- ============================================================
INSERT OR IGNORE INTO group_options (group_id, name, icon) SELECT id, 'smoked',               'Wind'   FROM groups WHERE name = 'Bad Habits';
INSERT OR IGNORE INTO group_options (group_id, name, icon) SELECT id, 'drank too much',       'Coffee' FROM groups WHERE name = 'Bad Habits';
INSERT OR IGNORE INTO group_options (group_id, name, icon) SELECT id, 'late night screen time','Phone' FROM groups WHERE name = 'Bad Habits';
INSERT OR IGNORE INTO group_options (group_id, name, icon) SELECT id, 'skipped meds',         'Pill'   FROM groups WHERE name = 'Bad Habits';
INSERT OR IGNORE INTO group_options (group_id, name, icon) SELECT id, 'no exercise',          'ZapOff' FROM groups WHERE name = 'Bad Habits';
INSERT OR IGNORE INTO group_options (group_id, name, icon) SELECT id, 'too much caffeine',    'Coffee' FROM groups WHERE name = 'Bad Habits';
