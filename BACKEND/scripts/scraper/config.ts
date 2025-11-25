import path from 'path';

export interface BrowserConfig {
  headless: boolean;
  timeout: number;
  userAgent: string;
  viewport: { width: number; height: number };
}

export interface RetryConfig {
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

export interface DelaysConfig {
  minActionDelay: number;
  maxActionDelay: number;
  cloudflareWait: number;
}

export interface OutputConfig {
  questionsDir: string;
  imagesDir: string;
  logsDir: string;
}

export interface ScraperConfig {
  browser: BrowserConfig;
  retry: RetryConfig;
  delays: DelaysConfig;
  output: OutputConfig;
}

// Load environment variables with defaults
const getEnvBoolean = (key: string, defaultValue: boolean): boolean => {
  const value = process.env[key];
  if (value === undefined) return defaultValue;
  return value.toLowerCase() === 'true';
};

const getEnvNumber = (key: string, defaultValue: number): number => {
  const value = process.env[key];
  if (value === undefined) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
};

const getEnvString = (key: string, defaultValue: string): string => {
  return process.env[key] || defaultValue;
};

// Default configuration
export const SCRAPER_CONFIG: ScraperConfig = {
  browser: {
    headless: getEnvBoolean('SCRAPER_HEADLESS', true),
    timeout: getEnvNumber('SCRAPER_TIMEOUT', 60000),
    userAgent: getEnvString(
      'SCRAPER_USER_AGENT',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    ),
    viewport: {
      width: 1920,
      height: 1080,
    },
  },
  retry: {
    maxAttempts: getEnvNumber('SCRAPER_MAX_RETRIES', 3),
    initialDelay: getEnvNumber('SCRAPER_RETRY_DELAY', 2000),
    maxDelay: 10000,
    backoffMultiplier: 2,
  },
  delays: {
    minActionDelay: 1000,
    maxActionDelay: 2000,
    cloudflareWait: 10000,
  },
  output: {
    questionsDir: path.join(process.cwd(), 'output', 'scraped', 'questions'),
    imagesDir: path.join(process.cwd(), 'output', 'scraped', 'images'),
    logsDir: path.join(process.cwd(), 'output', 'scraped', 'logs'),
  },
};

// CSS Selectors for provaderesidencia.com.br
export const SELECTORS = {
  examTitle: '.exam-title, .prova-titulo, h1',
  examMetadata: '.exam-info, .prova-info, .metadata',
  questionContainer: '.question, .questao, .pergunta',
  questionStatement: '.question-text, .enunciado, .statement',
  alternativeContainer: '.alternative, .alternativa, .option',
  alternativeText: '.alt-text, .option-text',
  correctMarker: '.correct, .correta, [data-correct="true"], .is-correct',
  questionImage: '.question-image img, .questao img, img',
  questionNavigationGrid: '.questoes button, .question-nav button, [class*="question"] button',
  questionTitle: 'h2, h3, .question-title',
  nextButton: '.next-question, [class*="next"], button[class*="next"]',
};
