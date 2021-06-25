DROP DATABASE IF EXISTS isuumo;
CREATE DATABASE isuumo;

DROP TABLE IF EXISTS isuumo.estate;
DROP TABLE IF EXISTS isuumo.chair;

CREATE TABLE isuumo.estate
(
    id          INTEGER             NOT NULL PRIMARY KEY,
    name        VARCHAR(64)         NOT NULL,
    description VARCHAR(4096)       NOT NULL,
    thumbnail   VARCHAR(128)        NOT NULL,
    address     VARCHAR(128)        NOT NULL,
    latitude    DOUBLE PRECISION    NOT NULL,
    longitude   DOUBLE PRECISION    NOT NULL,
    rent        INTEGER             NOT NULL,
    door_height INTEGER             NOT NULL,
    door_width  INTEGER             NOT NULL,
    features    VARCHAR(64)         NOT NULL,
    popularity  INTEGER             NOT NULL,
    r_popularity INTEGER            AS (-popularity),
    INDEX idx_ren_pop (`rent`, `popularity`),
    INDEX idx_rent (`rent`),
    INDEX idx_r_popularity (`r_popularity`),
    INDEX idx_wid_hei (`door_width`, `door_height`),
    INDEX idx_door_height (`door_height`),
    INDEX idx_wid_ren (`door_width`, `rent`)
);

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
