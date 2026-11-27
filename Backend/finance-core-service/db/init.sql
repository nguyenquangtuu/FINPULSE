SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

CREATE DATABASE IF NOT EXISTS finance_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE finance_db;

CREATE TABLE IF NOT EXISTS wallets (
    wallet_id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    name VARCHAR(100) NOT NULL,
    wallet_type ENUM('CASH', 'BANK', 'E_WALLET', 'SAVINGS', 'OTHER') NOT NULL DEFAULT 'CASH',
    balance DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    initial_balance DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(10) NOT NULL DEFAULT 'VND',
    icon VARCHAR(50) NULL,
    color VARCHAR(20) NULL,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    status ENUM('ACTIVE', 'ARCHIVED') NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_wallet_user (user_id),
    INDEX idx_wallet_status (user_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS recurring_rules (
    recurring_id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    category_id CHAR(36) NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    type ENUM('INCOME', 'EXPENSE') NOT NULL,
    note VARCHAR(255) NULL,
    frequency ENUM('DAILY', 'WEEKLY', 'MONTHLY') NOT NULL,
    next_run_date DATE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_recurring_user (user_id),
    INDEX idx_recurring_due (is_active, next_run_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS transactions (
    transaction_id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    category_id CHAR(36) NULL,
    wallet_id CHAR(36) NULL,
    to_wallet_id CHAR(36) NULL,
    attachment_id CHAR(36) NULL,
    amount DECIMAL(15, 2) NOT NULL,
    type ENUM('INCOME', 'EXPENSE', 'TRANSFER') NOT NULL,
    transaction_date DATETIME NOT NULL,
    note TEXT NULL,
    is_recurring BOOLEAN NOT NULL DEFAULT FALSE,
    recurring_id CHAR(36) NULL,
    status ENUM('COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'COMPLETED',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT chk_transaction_amount CHECK (amount > 0),
    INDEX idx_trans_user (user_id),
    INDEX idx_trans_date (user_id, transaction_date),
    INDEX idx_trans_category (user_id, category_id),
    INDEX idx_trans_wallet (user_id, wallet_id),
    INDEX idx_trans_type (user_id, type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS budgets (
    budget_id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    category_id CHAR(36) NULL,
    amount_limit DECIMAL(15, 2) NOT NULL,
    period ENUM('WEEK', 'MONTH', 'YEAR') NOT NULL DEFAULT 'MONTH',
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    alert_threshold_80 BOOLEAN NOT NULL DEFAULT FALSE,
    alert_threshold_90 BOOLEAN NOT NULL DEFAULT FALSE,
    alert_threshold_100 BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT chk_budget_limit CHECK (amount_limit > 0),
    INDEX idx_budget_user (user_id),
    INDEX idx_budget_active (user_id, start_date, end_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dữ liệu mẫu (Seed Data)
INSERT IGNORE INTO budgets (budget_id, user_id, category_id, amount_limit, period, start_date, end_date)
VALUES 
    ('30000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', '20000000-0000-0000-0000-000000000001', 3000000.00, 'MONTH', '2026-11-01', '2026-11-30'),
    ('30000000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', NULL, 10000000.00, 'MONTH', '2026-11-01', '2026-11-30');

INSERT IGNORE INTO transactions (transaction_id, user_id, category_id, amount, type, transaction_date, note)
VALUES 
    ('40000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', '10000000-0000-0000-0000-000000000001', 15000000.00, 'INCOME', '2026-11-05 08:30:00', 'Lương tháng 11/2026'),
    ('40000000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', '20000000-0000-0000-0000-000000000001', 2500000.00, 'EXPENSE', '2026-11-10 12:15:00', 'Ăn uống và liên hoan gia đình');
