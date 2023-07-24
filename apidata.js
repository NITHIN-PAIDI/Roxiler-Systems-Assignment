const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const axios = require("axios");
const app = express();
const PORT = 3000;

app.use(express.json());
const db = new sqlite3.Database("products.db");
//statistics
//API 1
app.get("/statistics", (req, res) => {
  const { month } = req.query;
  console.log(month);

  // Get the total sale amount of the selected month
  const totalSaleAmountQuery = `
    SELECT SUM(price) AS totalSaleAmount
    FROM productDetails
    WHERE strftime('%m', dateOfSale) = ?
  `;

  // Get the total number of sold items of the selected month
  const totalSoldItemsQuery = `
    SELECT COUNT(*) AS totalSoldItems
    FROM productDetails
    WHERE strftime('%m', dateOfSale) = ? AND sold = 1
  `;

  // Get the total number of not sold items of the selected month
  const totalNotSoldItemsQuery = `
    SELECT COUNT(*) AS totalNotSoldItems
    FROM productDetails
    WHERE strftime('%m', dateOfSale) = ? AND sold = 0
  `;

  db.serialize(() => {
    db.get(totalSaleAmountQuery, [month], (err, row) => {
      if (err) {
        console.error("Error fetching total sale amount:", err.message);
        res.status(500).json({ error: "Internal Server Error" });
        return;
      }

      const totalSaleAmount = row.totalSaleAmount || 0;

      db.get(totalSoldItemsQuery, [month], (err, row) => {
        if (err) {
          console.error("Error fetching total sold items:", err.message);
          res.status(500).json({ error: "Internal Server Error" });
          return;
        }

        const totalSoldItems = row.totalSoldItems || 0;

        db.get(totalNotSoldItemsQuery, [month], (err, row) => {
          if (err) {
            console.error("Error fetching total not sold items:", err.message);
            res.status(500).json({ error: "Internal Server Error" });
            return;
          }

          const totalNotSoldItems = row.totalNotSoldItems;

          const statistics = {
            totalSaleAmount,
            totalSoldItems,
            totalNotSoldItems,
          };

          res.json(statistics);
        });
      });
    });
  });
});

// API for bar chart
app.get("/bar-chart", (req, res) => {
  const { month } = req.query;

  // price ranges
  const priceRanges = [
    { min: 0, max: 100 },
    { min: 101, max: 200 },
    { min: 201, max: 300 },
    { min: 301, max: 400 },
    { min: 401, max: 500 },
    { min: 501, max: 600 },
    { min: 601, max: 700 },
    { min: 701, max: 800 },
    { min: 801, max: 900 },
    { min: 901, max: Infinity }, // The last range for prices above 900
  ];

  // Initialize an object to store the count for each range
  const barChartData = priceRanges.map(() => ({ priceRange: "", count: 0 }));

  // Get the counts for each price range
  const countItemsQuery = `
    SELECT price
    FROM productDetails
    WHERE strftime('%m', dateOfSale) = ?
  `;

  db.all(countItemsQuery, [month], (err, rows) => {
    if (err) {
      console.error("Error fetching items:", err.message);
      res.status(500).json({ error: "Internal Server Error" });
      return;
    }

    // Count the items falling into each price range
    rows.forEach((row) => {
      const price = row.price;
      for (let i = 0; i < priceRanges.length; i++) {
        if (price >= priceRanges[i].min && price <= priceRanges[i].max) {
          barChartData[i].count++;
          break;
        }
      }
    });

    // Update the price range labels
    for (let i = 0; i < priceRanges.length; i++) {
      const { min, max } = priceRanges[i];
      if (max === Infinity) {
        barChartData[i].priceRange = `${min}-above`;
      } else {
        barChartData[i].priceRange = `${min}-${max}`;
      }
    }

    res.json(barChartData);
  });
});

// pie chart
// API pie chart
app.get("/pie-chart", async (req, res) => {
  const { month } = req.query;

  //sql Query to find unique categories
  const pieChartDataQuery = `
    SELECT category, COUNT(*) AS itemCount
    FROM productDetails
    WHERE strftime('%m', dateOfSale) = ?
    GROUP BY category
  `;

  await db.all(pieChartDataQuery, [month], (err, rows) => {
    if (err) {
      console.error("Error fetching pie chart data:", err.message);
      res.status(500).json({ error: "Internal Server Error" });
      return;
    }
    console.log(rows);

    const pieChartData = rows.map((row) => ({
      category: row.category,
      itemCount: row.itemCount,
    }));

    res.json(pieChartData);
  });
});

//Combined data

// Define the URLs of the three APIs
const statisticsAPI = "http://localhost:3000/statistics";
const barChartAPI = "http://localhost:3000/bar-chart";
const pieChartAPI = "http://localhost:3000/pie-chart";

// API endpoint to fetch and combine data from all three APIs
app.get("/combined-data", async (req, res) => {
  try {
    const { month } = req.query;

    // Create three asynchronous requests to fetch data from the three APIs
    const [
      statisticsResponse,
      barChartResponse,
      pieChartResponse,
    ] = await Promise.all([
      axios.get(statisticsAPI, { params: { month } }),
      axios.get(barChartAPI, { params: { month } }),
      axios.get(pieChartAPI, { params: { month } }),
    ]);

    // Combine the data from the three APIs into a single JSON response
    const combinedData = {
      statistics: statisticsResponse.data,
      barChart: barChartResponse.data,
      pieChart: pieChartResponse.data,
    };

    res.json(combinedData);
  } catch (error) {
    console.error("Error fetching combined data:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

module.exports = app;
