const db = require("mongoose");
const userModel = require("../models/user.model");
const accountModel = require("../models/account.model");

const dbconnect = async () => {
  try {
    await db.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    // Seed system user and system account 0000000000
    try {
      let systemUser = await userModel.findOne({ email: "system@payme.sys" });
      if (!systemUser) {
        systemUser = await userModel.create({
          name: "System User",
          email: "system@payme.sys",
          password: "systempassword123",
          systemUser: true
        });
        console.log("System user seeded successfully.");
      }

      let systemAccount = await accountModel.findOne({ accountNumber: "0000000000" });
      if (!systemAccount) {
        await accountModel.create({
          user: systemUser._id,
          accountNumber: "0000000000",
          currency: "INR",
          status: "ACTIVE"
        });
        console.log("System account 0000000000 seeded successfully.");
      }
    } catch (seedError) {
      console.error("Failed to seed system user/account:", seedError);
    }

  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    process.exit(1);
  }
};

module.exports = dbconnect;