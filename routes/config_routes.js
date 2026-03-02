/* routes/config_routes.js */
const authR = require("./auth.routes");
const categoryR = require("./category.routes");
const productR = require("./product.routes");
const orderR = require("./order.routes");
const promotionR = require("./promotion.routes");
const metricsR = require("./metrics.routes");
const filesR = require("./files.routes");

exports.routesInit = (app) => {
  app.use("/api/auth", authR);
  app.use("/api/categories", categoryR);
  app.use("/api/products", productR);
  app.use("/api/orders", orderR);
  app.use("/api/promotions", promotionR);
  app.use("/api/metrics", metricsR);
  app.use("/api/files", filesR);
};