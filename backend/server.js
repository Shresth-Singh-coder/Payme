require("dotenv").config();

const app = require("./src/app");
const dbconnect = require("./src/config/db");

dbconnect();

app.listen(3000, () => {
    console.log("Server is running on port 3000");
});