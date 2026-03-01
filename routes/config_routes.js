/* routes/config_routes.js */
const authR = require('./auth.routes');
const categoryR = require('./category.routes');
const productR = require('./product.routes');
const orderR = require('./order.routes');
const promotionR = require('./promotion.routes');
const metricsR = require('./metrics.routes');

exports.routesInit = (app) => {
  app.use("/auth", authR);
  app.use("/categories", categoryR);
  app.use("/products", productR);
  app.use("/orders", orderR);
  app.use("/promotions", promotionR);
  app.use("/metrics", metricsR);


};
