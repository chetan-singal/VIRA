-- =====================================================================
-- VIRA — V1__init.sql  (Phase 1: full Revision-2 schema, SRS §22)
--
-- Replaces the Phase 0 placeholder. Requires MySQL 8.0.16+ (CHECK
-- constraints are enforced from that version onward).
--
-- This migration creates structure and DEFAULT rows only (SRS §18.3):
--   cash_in_hand     1 row,  balance = 0
--   number_sequence  4 rows, next_value = 1
--   app_setting      5 rows, default values
--   shop_profile     NO row — written once by the first-run setup screen
--
-- Table order follows the build order so every FK points at a table
-- that already exists.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Item master and pricing (SRS §22.1 – §22.3)
-- ---------------------------------------------------------------------

CREATE TABLE part_category (
    id   BIGINT       NOT NULL AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uq_part_category_name UNIQUE (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE bike (
    id   BIGINT       NOT NULL AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uq_bike_name UNIQUE (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- MRP + discount vs net rate being required depends on item_type, so all
-- three pricing columns stay nullable here; PricingService enforces it (Phase 2).
CREATE TABLE item (
    id                       BIGINT        NOT NULL AUTO_INCREMENT,
    name                     VARCHAR(150)  NOT NULL,
    unit                     VARCHAR(30)   NOT NULL,
    part_category_id         BIGINT        NULL,
    item_type                ENUM('MRP','NET_RATE') NOT NULL,
    mrp                      DECIMAL(10,2) NULL,
    default_discount_percent DECIMAL(5,2)  NULL,
    default_net_rate         DECIMAL(10,2) NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_item_part_category
        FOREIGN KEY (part_category_id) REFERENCES part_category (id)
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE item_bike (
    item_id BIGINT NOT NULL,
    bike_id BIGINT NOT NULL,
    PRIMARY KEY (item_id, bike_id),
    CONSTRAINT fk_item_bike_item
        FOREIGN KEY (item_id) REFERENCES item (id) ON DELETE CASCADE,
    CONSTRAINT fk_item_bike_bike
        FOREIGN KEY (bike_id) REFERENCES bike (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- 2. Party (SRS §22.4)
--    current_balance is maintained by LedgerService (Phase 3); the app
--    sets it equal to opening_balance at insert. May be negative.
-- ---------------------------------------------------------------------

CREATE TABLE party (
    id              BIGINT        NOT NULL AUTO_INCREMENT,
    name            VARCHAR(150)  NOT NULL,
    phone           VARCHAR(20)   NULL,
    address         VARCHAR(255)  NULL,
    city            VARCHAR(100)  NULL,
    state           VARCHAR(100)  NULL,
    remarks         VARCHAR(500)  NULL,
    opening_balance DECIMAL(12,2) NOT NULL DEFAULT 0,
    current_balance DECIMAL(12,2) NOT NULL DEFAULT 0,
    is_deleted      BOOLEAN       NOT NULL DEFAULT FALSE,
    deleted_at      DATETIME      NULL,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Exactly one of discount_percent / net_rate is populated, matching the
-- item's type. Phase 2 validation checks it against the item too; the
-- CHECK is a second line of defence, not a replacement.
CREATE TABLE party_item_rate (
    id               BIGINT        NOT NULL AUTO_INCREMENT,
    party_id         BIGINT        NOT NULL,
    item_id          BIGINT        NOT NULL,
    discount_percent DECIMAL(5,2)  NULL,
    net_rate         DECIMAL(10,2) NULL,
    updated_at       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT uq_party_item_rate UNIQUE (party_id, item_id),
    CONSTRAINT ck_party_item_rate_one_value
        CHECK ((discount_percent IS NULL) <> (net_rate IS NULL)),
    CONSTRAINT fk_party_item_rate_party
        FOREIGN KEY (party_id) REFERENCES party (id) ON DELETE CASCADE,
    CONSTRAINT fk_party_item_rate_item
        FOREIGN KEY (item_id) REFERENCES item (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE cash_item_rate (
    id               BIGINT        NOT NULL AUTO_INCREMENT,
    item_id          BIGINT        NOT NULL,
    discount_percent DECIMAL(5,2)  NULL,
    net_rate         DECIMAL(10,2) NULL,
    updated_at       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT uq_cash_item_rate_item UNIQUE (item_id),
    CONSTRAINT ck_cash_item_rate_one_value
        CHECK ((discount_percent IS NULL) <> (net_rate IS NULL)),
    CONSTRAINT fk_cash_item_rate_item
        FOREIGN KEY (item_id) REFERENCES item (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- 3. Supplier (SRS §22.7) — carries no balance
-- ---------------------------------------------------------------------

CREATE TABLE supplier (
    id         BIGINT       NOT NULL AUTO_INCREMENT,
    name       VARCHAR(150) NOT NULL,
    phone      VARCHAR(20)  NULL,
    city       VARCHAR(100) NULL,
    is_deleted BOOLEAN      NOT NULL DEFAULT FALSE,
    deleted_at DATETIME     NULL,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- 4. Bill and bill lines (SRS §22.5)
--    party_id is nullable: Cash Bills have no party, and the FK is a
--    defensive SET NULL (§22.12). Display relies on party_name_snapshot.
-- ---------------------------------------------------------------------

CREATE TABLE bill (
    id                  BIGINT        NOT NULL AUTO_INCREMENT,
    bill_no             VARCHAR(30)   NOT NULL,
    bill_type           ENUM('CASH','PARTY') NOT NULL,
    party_id            BIGINT        NULL,
    party_name_snapshot VARCHAR(150)  NULL,
    bill_date           DATE          NOT NULL,
    net_amount          DECIMAL(12,2) NOT NULL,
    round_off           DECIMAL(6,2)  NOT NULL DEFAULT 0,
    grand_total         DECIMAL(12,2) NOT NULL,
    previous_balance    DECIMAL(12,2) NULL,
    is_edited           BOOLEAN       NOT NULL DEFAULT FALSE,
    last_edited_at      DATETIME      NULL,
    is_deleted          BOOLEAN       NOT NULL DEFAULT FALSE,
    deleted_at          DATETIME      NULL,
    PRIMARY KEY (id),
        CONSTRAINT uq_bill_no UNIQUE (bill_no),
    CONSTRAINT fk_bill_party
        FOREIGN KEY (party_id) REFERENCES party (id) ON DELETE SET NULL,
    INDEX idx_bill_date (bill_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Fully self-contained snapshot: every *_snapshot column is frozen at save
-- time, so the line still displays after its Item is permanently deleted.
CREATE TABLE bill_item (
    id                        BIGINT        NOT NULL AUTO_INCREMENT,
    bill_id                   BIGINT        NOT NULL,
    item_id                   BIGINT        NULL,
    item_name_snapshot        VARCHAR(150)  NOT NULL,
    item_type_snapshot        ENUM('MRP','NET_RATE') NOT NULL,
    unit_snapshot             VARCHAR(30)   NOT NULL,
    mrp_snapshot              DECIMAL(10,2) NULL,
    discount_percent_snapshot DECIMAL(5,2)  NULL,
    rate_snapshot             DECIMAL(10,2) NOT NULL,
    qty                       INT           NOT NULL,
    amount                    DECIMAL(12,2) NOT NULL,
    line_no                   INT           NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT ck_bill_item_qty CHECK (qty >= 1),
    CONSTRAINT fk_bill_item_bill
        FOREIGN KEY (bill_id) REFERENCES bill (id) ON DELETE CASCADE,
    CONSTRAINT fk_bill_item_item
        FOREIGN KEY (item_id) REFERENCES item (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- 5. Payment voucher and supplier payment (SRS §22.6, §22.7)
-- ---------------------------------------------------------------------

CREATE TABLE payment_voucher (
    id                  BIGINT        NOT NULL AUTO_INCREMENT,
    voucher_no          VARCHAR(30)   NOT NULL,
    party_id            BIGINT        NULL,
    party_name_snapshot VARCHAR(150)  NOT NULL,
    payment_date        DATE          NOT NULL,
    amount              DECIMAL(12,2) NOT NULL,
    payment_mode        ENUM('CASH','ONLINE') NOT NULL,
    reference_no        VARCHAR(50)   NULL,
    remarks             VARCHAR(500)  NULL,
    is_edited           BOOLEAN       NOT NULL DEFAULT FALSE,
    last_edited_at      DATETIME      NULL,
    is_deleted          BOOLEAN       NOT NULL DEFAULT FALSE,
    deleted_at          DATETIME      NULL,
    PRIMARY KEY (id),
    CONSTRAINT uq_payment_voucher_no UNIQUE (voucher_no),
    CONSTRAINT fk_payment_voucher_party
        FOREIGN KEY (party_id) REFERENCES party (id) ON DELETE SET NULL,
    INDEX idx_payment_voucher_date (payment_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE supplier_payment (
    id                     BIGINT        NOT NULL AUTO_INCREMENT,
    payment_no             VARCHAR(30)   NOT NULL,
    supplier_id            BIGINT        NULL,
    supplier_name_snapshot VARCHAR(150)  NOT NULL,
    payment_date           DATE          NOT NULL,
    amount                 DECIMAL(12,2) NOT NULL,
    payment_mode           ENUM('CASH','ONLINE') NOT NULL,
    reference_no           VARCHAR(50)   NULL,
    remarks                VARCHAR(500)  NULL,
    is_edited              BOOLEAN       NOT NULL DEFAULT FALSE,
    last_edited_at         DATETIME      NULL,
    is_deleted             BOOLEAN       NOT NULL DEFAULT FALSE,
    deleted_at             DATETIME      NULL,
    PRIMARY KEY (id),
    CONSTRAINT uq_supplier_payment_no UNIQUE (payment_no),
    CONSTRAINT fk_supplier_payment_supplier
        FOREIGN KEY (supplier_id) REFERENCES supplier (id) ON DELETE SET NULL,
    INDEX idx_supplier_payment_date (payment_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- 6. System tables (SRS §22.8 – §22.11)
-- ---------------------------------------------------------------------

-- Single row (id fixed at 1). Created EMPTY: the row is written once by
-- the first-run setup screen, so shop_name has no default.
CREATE TABLE shop_profile (
    id                        BIGINT       NOT NULL,
    shop_name                 VARCHAR(150)  NOT NULL,
    address                   VARCHAR(255)  NULL,
    phone                     VARCHAR(20)   NULL,
    alternate_phone           VARCHAR(20)   NULL,
    email                     VARCHAR(150)  NULL,
    city                      VARCHAR(100)  NULL,
    state                     VARCHAR(100)  NULL,
    pin_code                  VARCHAR(10)   NULL,
    notes                     VARCHAR(500)  NULL,
    logo_path                 VARCHAR(255)  NULL,
    cash_bill_prefix          VARCHAR(20)   NULL,
    party_bill_prefix         VARCHAR(20)   NULL,
    voucher_prefix            VARCHAR(20)   NULL,
    supplier_payment_prefix   VARCHAR(20)   NULL,
    starting_bill_number      INT           NULL,
    print_show_shop_name      BOOLEAN       NOT NULL DEFAULT TRUE,
    print_show_address        BOOLEAN       NOT NULL DEFAULT TRUE,
    print_show_phone          BOOLEAN       NOT NULL DEFAULT TRUE,
    print_show_logo           BOOLEAN       NOT NULL DEFAULT TRUE,
    print_show_thankyou       BOOLEAN       NOT NULL DEFAULT TRUE,
    print_terms_conditions    VARCHAR(1000) NULL,
    print_show_mrp            BOOLEAN       NOT NULL DEFAULT TRUE,
    opening_cash_in_hand      DECIMAL(12,2) NULL,
    opening_cash_in_hand_date DATE          NULL,
    PRIMARY KEY (id),
    CONSTRAINT ck_shop_profile_single_row CHECK (id = 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Single row (id fixed at 1). May go negative (SRS §15.2).
CREATE TABLE cash_in_hand (
    id               BIGINT        NOT NULL,
    balance         DECIMAL(12,2) NOT NULL DEFAULT 0,
    last_updated_at DATETIME      NULL,
    PRIMARY KEY (id),
    CONSTRAINT ck_cash_in_hand_single_row CHECK (id = 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE number_sequence (
    sequence_name VARCHAR(30) NOT NULL,
    next_value    INT         NOT NULL DEFAULT 1,
    PRIMARY KEY (sequence_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE app_setting (
    setting_key   VARCHAR(50)  NOT NULL,
    setting_value VARCHAR(255) NULL,
    PRIMARY KEY (setting_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- 7. Default seed rows (never shop-specific values — SRS §18.3)
-- ---------------------------------------------------------------------

INSERT INTO cash_in_hand (id, balance) VALUES (1, 0);

INSERT INTO number_sequence (sequence_name, next_value) VALUES
    ('BILL',             1),
    ('VOUCHER',          1),
    ('SUPPLIER_PAYMENT', 1);
-- The SRS (§22.11) requires these five rows to exist with default values
-- but does not say what the defaults are. These are placeholders to be
-- revisited when the Settings screen is built.
INSERT INTO app_setting (setting_key, setting_value) VALUES
    ('default_bill_type',   'CASH'),
    ('default_focus_field', 'item_search'),
    ('default_printer',     ''),
    ('date_format',         'DD-MM-YYYY'),
    ('theme',               'light');
