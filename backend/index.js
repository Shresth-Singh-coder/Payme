require("dotenv").config();

const app = require("./src/app");
const dbconnect = require("./src/config/db");

console.log("enter");
dbconnect();
console.log("exit");

app.listen(3000, () => {
    console.log("Server listenning on port 3000!");
})