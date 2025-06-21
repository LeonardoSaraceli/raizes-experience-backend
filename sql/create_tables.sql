BEGIN;

CREATE TABLE IF NOT EXISTS users (
    id                      SERIAL PRIMARY KEY,
    email                   TEXT NOT NULL UNIQUE,
    password                TEXT NOT NULL,         
    created_at              TIMESTAMPTZ DEFAULT NOW(),
    updated_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bookings (
    id                      SERIAL PRIMARY KEY,
    duration                INTERVAL NOT NULL,
    start_datetime          TIMESTAMPTZ NOT NULL,
    shopify_product_title   TEXT NOT NULL,
    shopify_product_id      TEXT NOT NULL,
    is_activated            BOOLEAN DEFAULT TRUE,              
    created_at              TIMESTAMPTZ DEFAULT NOW(),
    updated_at              TIMESTAMPTZ DEFAULT NOW()
);

COMMIT;