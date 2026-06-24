require("dotenv").config();

const app = require("./src/app");
const dbconnect = require("./src/config/db");

dbconnect();

export default app;