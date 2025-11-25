/**
 * Configuration for Hardworq Scraper
 */

import path from 'path';

export interface HardworqConfig {
  urls: {
    base: string;
    login: string;
    home: string;
    questoes: string;
    banco: string;
  };
  selectors: {
    login: {
      emailInput: string;
      passwordInput: string;
      submitButton: string;
    };
    navigation: {
      questoesButton: string;
      bancoButton: string;
      abrirProvaButton: string;
    };
    provas: {
      selectContainer: string;
      selectInput: string;
      optionItem: string;
    };
    questoes: {
      dropdownContainer: string;
      questionButton: string;
    };
  };
  browser: {
    headless: boolean;
    timeout: number;
    userAgent: string;
    viewport: { width: number; height: number };
  };
  delays: {
    afterLogin: number;
    afterNavigation: number;
    betweenQuestions: number;
    consoleLogWait: number;
  };
  output: {
    questionsDir: string;
    logsDir: string;
  };
}

export const HARDWORQ_CONFIG: HardworqConfig = {
  urls: {
    base: 'https://app.hardworq.com.br',
    login: 'https://app.hardworq.com.br/signin',
    home: 'https://app.hardworq.com.br/hardworq',
    questoes: 'https://app.hardworq.com.br/hardworq/home-questoes',
    banco: 'https://app.hardworq.com.br/hardworq/home-questoes/banco-questoes',
  },
  selectors: {
    login: {
      emailInput: 'input[type="email"][placeholder="E-mail"]',
      passwordInput: 'input[type="password"][placeholder="Senha"]',
      submitButton: 'button[form="login-form"]',
    },
    navigation: {
      questoesButton: 'button:has-text("Acessar")', // Dentro do card QUESTÕES
      bancoButton: 'button:has-text("Acessar")', // Dentro do card Banco de questões
      abrirProvaButton: 'button:has-text("Abrir prova")',
    },
    provas: {
      selectContainer: '.basic-single',
      selectInput: '#react-select-12-input',
      optionItem: '[id^="react-select-12-option"]', // Options do React Select
    },
    questoes: {
      dropdownContainer: '.group.shadow',
      questionButton: 'button', // Botões com números dentro do grid
    },
  },
  browser: {
    headless: true, // ✅ Headless mode (browser invisível)
    timeout: 60000,
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: {
      width: 1920,
      height: 1080, // Back to normal size
    },
  },
  delays: {
    afterLogin: 3000,
    afterNavigation: 2000,
    betweenQuestions: 800, // Tempo para console.log acontecer
    consoleLogWait: 500,
  },
  output: {
    questionsDir: path.join(process.cwd(), 'output', 'hardworq', 'questions'),
    logsDir: path.join(process.cwd(), 'output', 'hardworq', 'logs'),
  },
};
