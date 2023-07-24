const express = require("express");
const axios = require("axios");
const sqlite3 = require("sqlite3").verbose();
const bodyParser = require("body-parser");
const app = express();
const PORT = 3000;
app.use(express.json());

// Function to fetch data from the third-party API
async function fetchDataFromAPI() {
  try {
    const url = "https://s3.amazonaws.com/roxiler.com/product_transaction.json";
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error("Error fetching data from API:", error.message);
    throw error;
  }
}
let db = null;
// Function to initialize the database with seed data
async function initializeDatabase(data) {
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database("products.db");

    // Define your own efficient table structure here
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS productDetails (
        id INTEGER PRIMARY KEY,
        tittle TEXT,
        price REAL,
        description TEXT,
        category TEXT,
        sold BOOLEAN,
        dateOfSale DATETIME
      );
    `;

    db.run(createTableQuery, (err) => {
      if (err) {
        console.error("Error creating table:", err.message);
        reject(err);
        return;
      }

      // Insert seed data into the table
      const insertQuery =
        "INSERT INTO productDetails (id, tittle, price, description,category, sold, dateOfSale) VALUES (?, ?, ?, ?, ?, ?, ?)";
      const values = data.map((item) => [
        item.id,
        item.title,
        item.price,
        item.description,
        item.category,
        item.sold,
        item.dateOfSale,
      ]);

      db.serialize(() => {
        db.run("BEGIN TRANSACTION");
        const stmt = db.prepare(insertQuery);
        values.forEach((value) => {
          stmt.run(value, (err) => {
            if (err) {
              console.error("Error inserting data:", err.message);
            }
          });
        });
        stmt.finalize();
        db.run("COMMIT", (err) => {
          if (err) {
            console.error("Error committing transaction:", err.message);
            reject(err);
          } else {
            console.log("Database initialized with seed data!");
            resolve();
          }
        });
      });

      db.close();
    });
  });
}

// Define the API endpoint
app.get("/initialize_database", async (req, res) => {
  try {
    const data = await fetchDataFromAPI();
    await initializeDatabase(data);
    res.json({ message: "Database initialized successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to initialize database with seed data." });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
