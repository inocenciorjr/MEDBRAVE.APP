-- Migration: Sistema de Gestão Financeira de Mentorados
-- Criado em: 2024-12-01
-- Descrição: Tabelas para gestão financeira, lembretes de cobrança e expiração automática

-- Tabela de informações financeiras do mentorado
CREATE TABLE IF NOT EXISTS mentee_financial_info (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  mentorshipId TEXT NOT NULL,
  menteeId TEXT NOT NULL,
  mentorId TEXT NOT NULL,
  
  -- Informações de pagamento
  paymentType TEXT NOT NULL DEFAULT 'pix',
  paymentModality TEXT NOT NULL DEFAULT 'cash',
  totalAmount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  installments INTEGER NOT NULL DEFAULT 1,
  installmentAmount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  
  -- Frequência de cobrança
  billingFrequency TEXT NOT NULL DEFAULT 'monthly',
  customFrequencyDays INTEGER,
  
  -- Datas importantes
  startDate TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expirationDate TIMESTAMPTZ NOT NULL,
  nextBillingDate TIMESTAMPTZ,
  lastPaymentDate TIMESTAMPTZ,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'active',
  
  -- Notas
  notes TEXT,
  
  createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updatedAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT valid_payment_type CHECK (paymentType IN ('pix', 'credit_card', 'debit_card', 'bank_transfer', 'cash', 'other')),
  CONSTRAINT valid_payment_modality CHECK (paymentModality IN ('cash', 'installment')),
  CONSTRAINT valid_billing_frequency CHECK (billingFrequency IN ('monthly', 'quarterly', 'semiannual', 'annual', 'custom')),
  CONSTRAINT valid_mentee_status CHECK (status IN ('active', 'suspended', 'expired', 'cancelled', 'pending'))
);


-- Tabela de lembretes de cobrança
CREATE TABLE IF NOT EXISTS billing_reminders (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  menteeFinancialInfoId TEXT NOT NULL,
  mentorshipId TEXT NOT NULL,
  menteeId TEXT NOT NULL,
  mentorId TEXT NOT NULL,
  
  -- Informações do lembrete
  dueDate TIMESTAMPTZ NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  installmentNumber INTEGER,
  totalInstallments INTEGER,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending',
  
  -- Datas de ação
  sentAt TIMESTAMPTZ,
  paidAt TIMESTAMPTZ,
  confirmedBy TEXT,
  
  -- Notas
  notes TEXT,
  
  createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updatedAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT valid_reminder_status CHECK (status IN ('pending', 'sent', 'paid', 'overdue', 'cancelled'))
);

-- Tabela de histórico de pagamentos
CREATE TABLE IF NOT EXISTS payment_history (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  menteeFinancialInfoId TEXT NOT NULL,
  mentorshipId TEXT NOT NULL,
  menteeId TEXT NOT NULL,
  mentorId TEXT NOT NULL,
  
  -- Informações do pagamento
  amount DECIMAL(10, 2) NOT NULL,
  paymentType TEXT NOT NULL,
  installmentNumber INTEGER,
  
  -- Datas
  paymentDate TIMESTAMPTZ NOT NULL,
  confirmedAt TIMESTAMPTZ NOT NULL,
  confirmedBy TEXT NOT NULL,
  
  -- Referência ao lembrete
  reminderId TEXT,
  
  -- Notas
  notes TEXT,
  
  createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_mentee_financial_mentor ON mentee_financial_info(mentorId);
CREATE INDEX IF NOT EXISTS idx_mentee_financial_mentee ON mentee_financial_info(menteeId);
CREATE INDEX IF NOT EXISTS idx_mentee_financial_status ON mentee_financial_info(status);
CREATE INDEX IF NOT EXISTS idx_mentee_financial_expiration ON mentee_financial_info(expirationDate);
CREATE INDEX IF NOT EXISTS idx_mentee_financial_mentorship ON mentee_financial_info(mentorshipId);

CREATE INDEX IF NOT EXISTS idx_billing_reminders_mentor ON billing_reminders(mentorId);
CREATE INDEX IF NOT EXISTS idx_billing_reminders_mentee ON billing_reminders(menteeId);
CREATE INDEX IF NOT EXISTS idx_billing_reminders_status ON billing_reminders(status);
CREATE INDEX IF NOT EXISTS idx_billing_reminders_due_date ON billing_reminders(dueDate);

CREATE INDEX IF NOT EXISTS idx_payment_history_mentor ON payment_history(mentorId);
CREATE INDEX IF NOT EXISTS idx_payment_history_mentee ON payment_history(menteeId);

-- RLS (Row Level Security)
ALTER TABLE mentee_financial_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_history ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para mentee_financial_info
DROP POLICY IF EXISTS "Mentors can view their mentees financial info" ON mentee_financial_info;
CREATE POLICY "Mentors can view their mentees financial info"
  ON mentee_financial_info FOR SELECT
  USING (auth.uid()::text = mentorId);

DROP POLICY IF EXISTS "Mentors can insert financial info" ON mentee_financial_info;
CREATE POLICY "Mentors can insert financial info"
  ON mentee_financial_info FOR INSERT
  WITH CHECK (auth.uid()::text = mentorId);

DROP POLICY IF EXISTS "Mentors can update financial info" ON mentee_financial_info;
CREATE POLICY "Mentors can update financial info"
  ON mentee_financial_info FOR UPDATE
  USING (auth.uid()::text = mentorId);

-- Políticas RLS para billing_reminders
DROP POLICY IF EXISTS "Mentors can manage reminders" ON billing_reminders;
CREATE POLICY "Mentors can manage reminders"
  ON billing_reminders FOR ALL
  USING (auth.uid()::text = mentorId);

-- Políticas RLS para payment_history
DROP POLICY IF EXISTS "Mentors can view payment history" ON payment_history;
CREATE POLICY "Mentors can view payment history"
  ON payment_history FOR SELECT
  USING (auth.uid()::text = mentorId);

DROP POLICY IF EXISTS "Mentors can insert payment history" ON payment_history;
CREATE POLICY "Mentors can insert payment history"
  ON payment_history FOR INSERT
  WITH CHECK (auth.uid()::text = mentorId);
