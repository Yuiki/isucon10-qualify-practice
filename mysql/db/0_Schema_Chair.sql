DROP DATABASE IF EXISTS isuumo;
CREATE DATABASE isuumo;

DROP TABLE IF EXISTS isuumo.chair;

CREATE TABLE isuumo.chair
(
    id          INTEGER         NOT NULL PRIMARY KEY,
    name        VARCHAR(64)     NOT NULL,
    description VARCHAR(4096)   NOT NULL,
    thumbnail   VARCHAR(128)    NOT NULL,
    price       INTEGER         NOT NULL,
    height      INTEGER         NOT NULL,
    width       INTEGER         NOT NULL,
    depth       INTEGER         NOT NULL,
    color       VARCHAR(64)     NOT NULL,
    features    VARCHAR(64)     NOT NULL,
    kind        VARCHAR(64)     NOT NULL,
    popularity  INTEGER         NOT NULL,
    r_popularity INTEGER        AS (-popularity),
    stock       INTEGER         NOT NULL,
    INDEX idx_price (`price`),
    INDEX idx_pri_sto (`price`, `stock`),
    INDEX idx_r_popularity (`r_popularity`),
    INDEX idx_kin_sto (`kind`, `stock`),
    INDEX idx_col_sto (`color`, `stock`),
    INDEX idx_hei_sto (`height`, `stock`),
    INDEX idx_wid_sto (`width`, `stock`)
);
