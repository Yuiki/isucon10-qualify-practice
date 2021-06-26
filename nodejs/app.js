"use strict";

const fastify = require("fastify");
const mysql = require("mysql");
const path = require("path");
const cp = require("child_process");
const util = require("util");
const os = require("os");
const parse = require("csv-parse/lib/sync");
const camelcaseKeys = require("camelcase-keys");
const promisify = util.promisify;
const exec = promisify(cp.exec);
const chairSearchCondition = require("../fixture/chair_condition.json");
const estateSearchCondition = require("../fixture/estate_condition.json");

const PORT = process.env.PORT ?? 1323;
const LIMIT = 20;
const NAZOTTE_LIMIT = 50;
const dbinfo = {
  host: process.env.MYSQL_HOST ?? "127.0.0.1",
  port: process.env.MYSQL_PORT ?? 3306,
  user: process.env.MYSQL_USER ?? "isucon",
  password: process.env.MYSQL_PASS ?? "isucon",
  database: process.env.MYSQL_DBNAME ?? "isuumo",
  connectionLimit: 10,
};

const app = fastify();

app.register(require("fastify-multipart"));

const db = mysql.createPool(dbinfo);

app.addHook("onRequest", (req, res, done) => {
  const ua = req.headers["user-agent"];
  const bots = [
    /ISUCONbot(-Mobile)?/,
    /ISUCONbot-Image\//,
    /Mediapartners-ISUCON/,
    /ISUCONCoffee/,
    /ISUCONFeedSeeker(Beta)?/,
    /crawler \(https:\/\/isucon\.invalid\/(support\/faq\/|help\/jp\/)/,
    /isubot/,
    /Isupider/,
    /Isupider(-image)?\+/,
    /(bot|crawler|spider)(?:[-_ .\/;@()]|$)/i,
  ];
  if (bots.some((bot) => ua.match(bot))) {
    res.status(503).send();
  } else {
    done();
  }
});

app.addHook("onRequest", (req, res, done) => {
  if (req.headers["content-length"] === "0") {
    req.headers["content-type"] = "empty";
  }
  done();
});

app.addContentTypeParser("empty", function (req, done) {
  let data = "";
  req.on("data", (chunk) => (data += chunk));
  req.on("end", () => {
    done(data);
  });
});

app.post("/initialize", async (req, res) => {
  cachedLowPricedEstates = undefined;
  cachedLowPricedChairs = undefined;
  try {
    const dbdir = path.resolve("..", "mysql", "db");
    const dbfiles = [
      "0_Schema.sql",
      "1_DummyEstateData.sql",
      "2_DummyChairData.sql",
    ];
    const execfiles = dbfiles.map((file) => path.join(dbdir, file));
    for (const execfile of execfiles) {
      await exec(
        `mysql -h ${dbinfo.host} -u ${dbinfo.user} -p${dbinfo.password} -P ${dbinfo.port} ${dbinfo.database} < ${execfile}`
      );
    }
    res.send({
      language: "nodejs",
    });
  } catch (e) {
    console.log(e);
  }
});

let cachedLowPricedEstates;

app.get("/api/estate/low_priced", async (req, res) => {
  if (cachedLowPricedEstates) {
    res.send({ estates: cachedLowPricedEstates });
    return;
  }
  const getConnection = promisify(db.getConnection.bind(db));
  const connection = await getConnection();
  const query = promisify(connection.query.bind(connection));
  try {
    const es = await query(
      "SELECT * FROM estate ORDER BY rent ASC, id ASC LIMIT ?",
      [LIMIT]
    );
    cachedLowPricedEstates = es.map((estate) => camelcaseKeys(estate));
    res.send({ estates: cachedLowPricedEstates });
  } catch (e) {
  } finally {
    await connection.release();
  }
});

let cachedLowPricedChairs;

app.get("/api/chair/low_priced", async (req, res) => {
  if (cachedLowPricedChairs) {
    res.send({ chairs: cachedLowPricedChairs });
    return;
  }
  const getConnection = promisify(db.getConnection.bind(db));
  const connection = await getConnection();
  const query = promisify(connection.query.bind(connection));
  try {
    const cs = await query(
      "SELECT * FROM chair WHERE stock > 0 ORDER BY price ASC, id ASC LIMIT ?",
      [LIMIT]
    );
    cachedLowPricedChairs = cs.map((chair) => camelcaseKeys(chair));
    res.send({ chairs: cachedLowPricedChairs });
  } catch (e) {
  } finally {
    await connection.release();
  }
});

app.get("/api/chair/search", async (req, res) => {
  const searchQueries = [];
  const queryParams = [];
  const {
    priceRangeId,
    heightRangeId,
    widthRangeId,
    depthRangeId,
    kind,
    color,
    features,
    page,
    perPage,
  } = req.query;

  if (!!priceRangeId) {
    const chairPrice = chairSearchCondition["price"].ranges[priceRangeId];
    if (chairPrice == null) {
      res.status(400).send("priceRangeID invalid");
      return;
    }

    if (chairPrice.min !== -1) {
      searchQueries.push("price >= ? ");
      queryParams.push(chairPrice.min);
    }

    if (chairPrice.max !== -1) {
      searchQueries.push("price < ? ");
      queryParams.push(chairPrice.max);
    }
  }

  if (!!heightRangeId) {
    const chairHeight = chairSearchCondition["height"].ranges[heightRangeId];
    if (chairHeight == null) {
      res.status(400).send("heightRangeId invalid");
      return;
    }

    if (chairHeight.min !== -1) {
      searchQueries.push("height >= ? ");
      queryParams.push(chairHeight.min);
    }

    if (chairHeight.max !== -1) {
      searchQueries.push("height < ? ");
      queryParams.push(chairHeight.max);
    }
  }

  if (!!widthRangeId) {
    const chairWidth = chairSearchCondition["width"].ranges[widthRangeId];
    if (chairWidth == null) {
      res.status(400).send("widthRangeId invalid");
      return;
    }

    if (chairWidth.min !== -1) {
      searchQueries.push("width >= ? ");
      queryParams.push(chairWidth.min);
    }

    if (chairWidth.max !== -1) {
      searchQueries.push("width < ? ");
      queryParams.push(chairWidth.max);
    }
  }

  if (!!depthRangeId) {
    const chairDepth = chairSearchCondition["depth"].ranges[depthRangeId];
    if (chairDepth == null) {
      res.status(400).send("depthRangeId invalid");
      return;
    }

    if (chairDepth.min !== -1) {
      searchQueries.push("depth >= ? ");
      queryParams.push(chairDepth.min);
    }

    if (chairDepth.max !== -1) {
      searchQueries.push("depth < ? ");
      queryParams.push(chairDepth.max);
    }
  }

  if (!!kind) {
    searchQueries.push("kind = ? ");
    queryParams.push(kind);
  }

  if (!!color) {
    searchQueries.push("color = ? ");
    queryParams.push(color);
  }

  if (!!features) {
    const featureConditions = features.split(",");
    for (const featureCondition of featureConditions) {
      searchQueries.push("features LIKE CONCAT('%', ?, '%')");
      queryParams.push(featureCondition);
    }
  }

  if (searchQueries.length === 0) {
    res.status(400).send("Search condition not found");
    return;
  }

  searchQueries.push("stock > 0");

  if (!page || page != +page) {
    res.status(400).send(`page condition invalid ${page}`);
    return;
  }

  if (!perPage || perPage != +perPage) {
    res.status(400).send("perPage condition invalid");
    return;
  }

  const pageNum = parseInt(page, 10);
  const perPageNum = parseInt(perPage, 10);

  const sqlprefix =
    "SELECT `id`, `name`, `description`, `thumbnail`, `price`, `height`, `width`, `depth`, `color`, `features`, `kind`, `popularity`, `stock` FROM chair WHERE ";
  const searchCondition = searchQueries.join(" AND ");
  const limitOffset = " ORDER BY r_popularity ASC, id ASC LIMIT ? OFFSET ?";
  const countprefix = "SELECT COUNT(*) as count FROM chair WHERE ";

  const getConnection = promisify(db.getConnection.bind(db));
  const connection = await getConnection();
  const query = promisify(connection.query.bind(connection));
  try {
    const [{ count }] = await query(
      `${countprefix}${searchCondition}`,
      queryParams
    );
    queryParams.push(perPageNum, perPageNum * pageNum);
    const chairs = await query(
      `${sqlprefix}${searchCondition}${limitOffset}`,
      queryParams
    );
    res.send({
      count,
      chairs: camelcaseKeys(chairs),
    });
  } catch (e) {
  } finally {
    await connection.release();
  }
});

app.get("/api/chair/search/condition", (req, res) => {
  res.send(chairSearchCondition);
});

app.get("/api/chair/:id", async (req, res) => {
  const getConnection = promisify(db.getConnection.bind(db));
  const connection = await getConnection();
  const query = promisify(connection.query.bind(connection));
  try {
    const id = req.params.id;
    const [chair] = await query("SELECT * FROM chair WHERE id = ?", [id]);
    if (chair == null || chair.stock <= 0) {
      res.status(404).send("Not Found");
      return;
    }
    res.send(camelcaseKeys(chair));
  } catch (e) {
  } finally {
    await connection.release();
  }
});

app.post("/api/chair/buy/:id", async (req, res) => {
  const getConnection = promisify(db.getConnection.bind(db));
  const connection = await getConnection();
  const beginTransaction = promisify(
    connection.beginTransaction.bind(connection)
  );
  const query = promisify(connection.query.bind(connection));
  const commit = promisify(connection.commit.bind(connection));
  const rollback = promisify(connection.rollback.bind(connection));
  try {
    const id = req.params.id;
    await beginTransaction();
    const [chair] = await query(
      "SELECT * FROM chair WHERE id = ? AND stock > 0 FOR UPDATE",
      [id]
    );
    if (chair == null) {
      res.status(404).send("Not Found");
      await rollback();
      return;
    }
    if (chair.stock <= 1) {
      cachedLowPricedChairs = undefined;
    }
    await query("UPDATE chair SET stock = ? WHERE id = ?", [
      chair.stock - 1,
      id,
    ]);
    await commit();
    res.send({ ok: true });
  } catch (e) {
    await rollback();
  } finally {
    await connection.release();
  }
});

const cachedSearchEstates = new Map();

app.get("/api/estate/search", async (req, res) => {
  const searchQueries = [];
  const queryParams = [];
  const {
    doorHeightRangeId,
    doorWidthRangeId,
    rentRangeId,
    features,
    page,
    perPage,
  } = req.query;

  const key = `${doorHeightRangeId ?? ""},${doorWidthRangeId ?? ""},${
    rentRangeId ?? ""
  },${features ?? ""},${page ?? ""},${perPage ?? ""}`;
  const cached = cachedSearchEstates.get(key);
  if (cached) {
    res.send(cached);
    return;
  }

  if (!!doorHeightRangeId) {
    const doorHeight =
      estateSearchCondition["doorHeight"].ranges[doorHeightRangeId];
    if (doorHeight == null) {
      res.status(400).send("doorHeightRangeId invalid");
      return;
    }

    if (doorHeight.min !== -1) {
      searchQueries.push("door_height >= ? ");
      queryParams.push(doorHeight.min);
    }

    if (doorHeight.max !== -1) {
      searchQueries.push("door_height < ? ");
      queryParams.push(doorHeight.max);
    }
  }

  if (!!doorWidthRangeId) {
    const doorWidth =
      estateSearchCondition["doorWidth"].ranges[doorWidthRangeId];
    if (doorWidth == null) {
      res.status(400).send("doorWidthRangeId invalid");
      return;
    }

    if (doorWidth.min !== -1) {
      searchQueries.push("door_width >= ? ");
      queryParams.push(doorWidth.min);
    }

    if (doorWidth.max !== -1) {
      searchQueries.push("door_width < ? ");
      queryParams.push(doorWidth.max);
    }
  }

  if (!!rentRangeId) {
    const rent = estateSearchCondition["rent"].ranges[rentRangeId];
    if (rent == null) {
      res.status(400).send("rentRangeId invalid");
      return;
    }

    if (rent.min !== -1) {
      searchQueries.push("rent >= ? ");
      queryParams.push(rent.min);
    }

    if (rent.max !== -1) {
      searchQueries.push("rent < ? ");
      queryParams.push(rent.max);
    }
  }

  if (!!features) {
    const featureConditions = features.split(",");
    for (const featureCondition of featureConditions) {
      searchQueries.push("features LIKE CONCAT('%', ?, '%')");
      queryParams.push(featureCondition);
    }
  }

  if (searchQueries.length === 0) {
    res.status(400).send("Search condition not found");
    return;
  }

  if (!page || page != +page) {
    res.status(400).send(`page condition invalid ${page}`);
    return;
  }

  if (!perPage || perPage != +perPage) {
    res.status(400).send("perPage condition invalid");
    return;
  }

  const pageNum = parseInt(page, 10);
  const perPageNum = parseInt(perPage, 10);

  const sqlprefix =
    "SELECT `id`, `name`, `description`, `thumbnail`, `address`, `latitude`, `longitude`, `rent`, `door_height`, `door_width`, `features`, `popularity` FROM estate WHERE ";
  const searchCondition = searchQueries.join(" AND ");
  const limitOffset = " ORDER BY r_popularity ASC, id ASC LIMIT ? OFFSET ?";
  const countprefix = "SELECT COUNT(*) as count FROM estate WHERE ";

  const getConnection = promisify(db.getConnection.bind(db));
  const connection = await getConnection();
  const query = promisify(connection.query.bind(connection));
  try {
    const [{ count }] = await query(
      `${countprefix}${searchCondition}`,
      queryParams
    );
    queryParams.push(perPageNum, perPageNum * pageNum);
    const estates = await query(
      `${sqlprefix}${searchCondition}${limitOffset}`,
      queryParams
    );
    const value = {
      count,
      estates: camelcaseKeys(estates),
    };
    cachedSearchEstates.set(key, value);
    res.send(value);
  } catch (e) {
  } finally {
    await connection.release();
  }
});

app.get("/api/estate/search/condition", (req, res) => {
  res.send(estateSearchCondition);
});

const cachedEstates = new Map();

app.post("/api/estate/req_doc/:id", async (req, res) => {
  const id = req.params.id;
  const cached = cachedEstates.get(id);
  if (cached) {
    res.send({ ok: true });
    return;
  }

  const getConnection = promisify(db.getConnection.bind(db));
  const connection = await getConnection();
  const query = promisify(connection.query.bind(connection));
  try {
    const id = req.params.id;
    const [estate] = await query("SELECT * FROM estate WHERE id = ?", [id]);
    if (estate == null) {
      res.status(404).send("Not Found");
      return;
    }
    res.send({ ok: true });
  } catch (e) {
  } finally {
    await connection.release();
  }
});

app.post("/api/estate/nazotte", async (req, res) => {
  const coordinates = req.body.coordinates;
  const longitudes = coordinates.map((c) => c.longitude);
  const latitudes = coordinates.map((c) => c.latitude);
  const boundingbox = {
    topleft: {
      longitude: Math.min(...longitudes),
      latitude: Math.min(...latitudes),
    },
    bottomright: {
      longitude: Math.max(...longitudes),
      latitude: Math.max(...latitudes),
    },
  };

  const getConnection = promisify(db.getConnection.bind(db));
  const connection = await getConnection();
  const query = promisify(connection.query.bind(connection));
  try {
    const coordinatesToText = util.format(
      "'POLYGON((%s))'",
      coordinates
        .map((coordinate) =>
          util.format("%f %f", coordinate.latitude, coordinate.longitude)
        )
        .join(",")
    );

    const estatesInPolygon = await query(
      util.format(
        "SELECT `id`, `name`, `description`, `thumbnail`, `address`, `latitude`, `longitude`, `rent`, `door_height`, `door_width`, `features`, `popularity` FROM estate WHERE ST_Contains(ST_PolygonFromText(%s), pos) ORDER BY r_popularity ASC, id ASC",
        coordinatesToText
      ),
      [
        boundingbox.bottomright.latitude,
        boundingbox.topleft.latitude,
        boundingbox.bottomright.longitude,
        boundingbox.topleft.longitude,
      ]
    );

    const results = {
      estates: [],
    };
    let i = 0;
    for (const estate of estatesInPolygon) {
      if (i >= NAZOTTE_LIMIT) {
        break;
      }
      results.estates.push(camelcaseKeys(estate));
      i++;
    }
    results.count = results.estates.length;
    res.send(results);
  } catch (e) {
  } finally {
    await connection.release();
  }
});

app.get("/api/estate/:id", async (req, res) => {
  const id = req.params.id;
  const cached = cachedEstates.get(id);
  if (cached) {
    res.send(cached);
    return;
  }

  const getConnection = promisify(db.getConnection.bind(db));
  const connection = await getConnection();
  const query = promisify(connection.query.bind(connection));
  try {
    const [estate] = await query("SELECT * FROM estate WHERE id = ?", [id]);
    if (estate == null) {
      res.status(404).send("Not Found");
      return;
    }

    const value = camelcaseKeys(estate);
    cachedEstates.set(id, value);
    res.send(value);
  } catch (e) {
  } finally {
    await connection.release();
  }
});

app.get("/api/recommended_estate/:id", async (req, res) => {
  const id = req.params.id;
  const getConnection = promisify(db.getConnection.bind(db));
  const connection = await getConnection();
  const query = promisify(connection.query.bind(connection));
  try {
    const [chair] = await query(
      "SELECT `id`, `name`, `description`, `thumbnail`, `price`, `height`, `width`, `depth`, `color`, `features`, `kind`, `popularity`, `stock` FROM chair WHERE id = ?",
      [id]
    );
    const w = chair.width;
    const h = chair.height;
    const d = chair.depth;
    const es = await query(
      "SELECT * FROM estate where (door_width >= ? AND door_height>= ?) OR (door_width >= ? AND door_height>= ?) OR (door_width >= ? AND door_height>=?) OR (door_width >= ? AND door_height>=?) OR (door_width >= ? AND door_height>=?) OR (door_width >= ? AND door_height>=?) ORDER BY r_popularity ASC, id ASC LIMIT ?",
      [w, h, w, d, h, w, h, d, d, w, d, h, LIMIT]
    );
    const estates = es.map((estate) => camelcaseKeys(estate));
    res.send({ estates });
  } catch (e) {
  } finally {
    await connection.release();
  }
});

app.post("/api/chair", async (req, res) => {
  const getConnection = promisify(db.getConnection.bind(db));
  const connection = await getConnection();
  const beginTransaction = promisify(
    connection.beginTransaction.bind(connection)
  );
  const query = promisify(connection.query.bind(connection));
  const commit = promisify(connection.commit.bind(connection));
  const rollback = promisify(connection.rollback.bind(connection));
  try {
    await beginTransaction();
    const data = await req.file();
    const buf = await data.toBuffer();
    const csv = parse(buf, { skip_empty_line: true });
    for (var i = 0; i < csv.length; i++) {
      const items = csv[i];
      await query(
        "INSERT INTO chair(id, name, description, thumbnail, price, height, width, depth, color, features, kind, popularity, stock) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)",
        items
      );
    }
    cachedLowPricedChairs = undefined;
    await commit();
    res.status(201);
    res.send({ ok: true });
  } catch (e) {
    await rollback();
  } finally {
    await connection.release();
  }
});

app.post("/api/estate", async (req, res) => {
  const getConnection = promisify(db.getConnection.bind(db));
  const connection = await getConnection();
  const beginTransaction = promisify(
    connection.beginTransaction.bind(connection)
  );
  const query = promisify(connection.query.bind(connection));
  const commit = promisify(connection.commit.bind(connection));
  const rollback = promisify(connection.rollback.bind(connection));
  try {
    await beginTransaction();
    const data = await req.file();
    const buf = await data.toBuffer();
    const csv = parse(buf, { skip_empty_line: true });
    for (var i = 0; i < csv.length; i++) {
      const items = csv[i];
      await query(
        "INSERT INTO estate(id, name, description, thumbnail, address, latitude, longitude, rent, door_height, door_width, features, popularity) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)",
        items
      );
    }
    cachedLowPricedEstates = undefined;
    cachedSearchEstates.clear();
    cachedEstates.clear();
    await commit();
    res.status(201);
    res.send({ ok: true });
  } catch (e) {
    await rollback();
  } finally {
    await connection.release();
  }
});

app.listen(PORT, () => {
  console.log(`Listening ${PORT}`);
});
