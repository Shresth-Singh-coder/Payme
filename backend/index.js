require("dotenv").config();

const app = require("./src/app");
const dbconnect = require("./src/config/db");

console.log("enter");
dbconnect();
console.log("exit");

export default app;