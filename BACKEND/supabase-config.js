// Supabase Configuration
const supabaseConfig = {
  // Project Information
  projectRef: 'yqlfgazngdymiprsrwvf',
  projectName: 'Medbrave',
  region: 'South America (São Paulo)',
  
  // API Configuration
  url: process.env.SUPABASE_URL || 'https://yqlfgazngdymiprsrwvf.supabase.co',
  anonKey: process.env.SUPABASE_ANON_KEY,
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  
  // Database Configuration
  database: {
    host: process.env.DB_HOST || 'aws-0-sa-east-1.pooler.supabase.com',
    port: process.env.DB_PORT || 6543,
    name: process.env.DB_NAME || 'postgres',
    user: process.env.DB_USER || 'postgres.yqlfgazngdymiprsrwvf',
    password: process.env.DB_PASSWORD,
    url: process.env.DATABASE_URL
  },
  
  // Local Development
  local: {
    apiPort: 54321,
    dbPort: 54322,
    shadowDbPort: 54320
  }
};

module.exports = supabaseConfig;