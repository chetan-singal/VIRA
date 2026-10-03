CREATE DATABASE IF NOT EXISTS vira;
USE vira;

CREATE TABLE IF NOT EXISTS shop_profile (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    shop_name VARCHAR(150) NOT NULL,
    address VARCHAR(255),
    phone VARCHAR(20),
    alternate_phone VARCHAR(20),
    email VARCHAR(150),
    city VARCHAR(100),
    state VARCHAR(100),
    pin_code VARCHAR(10),
    notes TEXT,
    logo_path VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS parties (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    party_name VARCHAR(150) NOT NULL,
    phone VARCHAR(20),
    address VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS suppliers (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    supplier_name VARCHAR(150) NOT NULL,
    phone VARCHAR(20),
    city VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS items (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    item_name VARCHAR(200) NOT NULL,
    unit VARCHAR(30) NOT NULL,
    part_category VARCHAR(100),
    item_type ENUM('MRP','NET_RATE') NOT NULL,
    mrp DECIMAL(12,2),
    default_discount DECIMAL(5,2),
    default_net_rate DECIMAL(12,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bills (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    bill_no VARCHAR(50) NOT NULL UNIQUE,
    bill_date DATETIME NOT NULL,
    bill_type ENUM('CASH','PARTY') NOT NULL,
    party_id BIGINT NULL,
    total_amount DECIMAL(12,2) NOT NULL,
    round_off DECIMAL(12,2) NOT NULL DEFAULT 0,
    grand_total DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (party_id) REFERENCES parties(id)
);

CREATE TABLE IF NOT EXISTS bill_items (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    bill_id BIGINT NOT NULL,
    item_id BIGINT NOT NULL,
    item_name_snapshot VARCHAR(200) NOT NULL,
    unit_snapshot VARCHAR(30) NOT NULL,
    mrp_snapshot DECIMAL(12,2),
    discount_snapshot DECIMAL(5,2),
    rate_snapshot DECIMAL(12,2) NOT NULL,
    quantity DECIMAL(12,3) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    FOREIGN KEY (bill_id) REFERENCES bills(id),
    FOREIGN KEY (item_id) REFERENCES items(id)
);

CREATE TABLE IF NOT EXISTS payment_vouchers (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    voucher_no VARCHAR(50) NOT NULL UNIQUE,
    voucher_date DATETIME NOT NULL,
    party_id BIGINT NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    payment_mode ENUM('CASH','ONLINE') NOT NULL,
    reference_no VARCHAR(100),
    remarks TEXT,
    FOREIGN KEY (party_id) REFERENCES parties(id)
);

CREATE TABLE IF NOT EXISTS supplier_payments (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    supplier_id BIGINT NOT NULL,
    payment_date DATETIME NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    payment_mode ENUM('CASH','ONLINE') NOT NULL,
    reference_no VARCHAR(100),
    remarks TEXT,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
);

CREATE TABLE IF NOT EXISTS party_item_rates (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    party_id BIGINT NOT NULL,
    item_id BIGINT NOT NULL,
    discount DECIMAL(5,2),
    net_rate DECIMAL(12,2),
    UNIQUE (party_id, item_id),
    FOREIGN KEY (party_id) REFERENCES parties(id),
    FOREIGN KEY (item_id) REFERENCES items(id)
);

CREATE TABLE IF NOT EXISTS cash_item_rates (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    item_id BIGINT NOT NULL,
    discount DECIMAL(5,2),
    net_rate DECIMAL(12,2),
    UNIQUE (item_id),
    FOREIGN KEY (item_id) REFERENCES items(id)
);
