DROP DATABASE IF EXISTS isuumo;
CREATE DATABASE isuumo;

DROP TABLE IF EXISTS isuumo.estate;

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
    r_popularity INTEGER            AS (-popularity) NOT NULL,
    pos         POINT               AS (POINT(latitude, longitude)) STORED NOT NULL,
    INDEX idx_ren_pop (`rent`, `popularity`),
    INDEX idx_rent (`rent`),
    INDEX idx_r_popularity (`r_popularity`),
    INDEX idx_wid_hei (`door_width`, `door_height`),
    INDEX idx_door_height (`door_height`),
    INDEX idx_wid_ren (`door_width`, `rent`),
    INDEX idx_hei_ren (`door_height`, `rent`),
    SPATIAL INDEX idx_pos (`pos`)
);
