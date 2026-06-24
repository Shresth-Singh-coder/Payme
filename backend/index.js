require("dotenv").config();

const app = require("./src/app");
const dbconnect = require("./src/config/db");

dbconnect();

// Export the Express app for Vercel Serverless Functions
module.exports = app;

// Start local server if run directly
if (require.main === module) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Server listening on port ${PORT}!`);
    });
}