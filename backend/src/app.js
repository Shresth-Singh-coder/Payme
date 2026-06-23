const express = require('express');
const cookieParser = require("cookie-parser");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());
app.use(cookieParser());

//Routes
const authRoutes = require("../src/routes/auth.routes");
const accountRouter = require("../src/routes/account.routes")
const transactionRoutes = require("../src/routes/transaction.routes")


app.get("/", (req,res) => {
    res.json({
        message: "Welcome to Payme API"
    })
})

app.use("/api/auth", authRoutes);
app.use("/api/accounts", accountRouter);
app.use("/api/transactions", transactionRoutes);

module.exports = app;