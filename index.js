require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
const cron = require('node-cron');
const Zone = require('./models/Zone');

const app = express();
app.use(express.json()); // Allows the server to read JSON bodies

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("Successfully connected to MongoDB!"))
  .catch(err => console.error("Error connecting to database:", err));

// Create Circle Endpoint
app.post('/api/zones', async (req, res) => {
  try {
    const { latitude, longitude, radius } = req.body;
    const googleUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude},${longitude}&radius=${radius}&type=restaurant&key=${process.env.GOOGLE_API_KEY}`;
    console.log(process.env.GOOGLE_API_KEY);

    const response = await axios.get(googleUrl);
    console.log("Google API Response:", response.data);
    const placeIds = response.data.results.map(place => place.place_id);

    const newZone = new Zone({ latitude, longitude, radius, baselinePlaces: placeIds });
    await newZone.save();
    
    res.status(201).json({ message: "Monitoring zone established!", zone: newZone });
  } catch (error) {
    console.error("Error creating zone:", error);
    res.status(500).json({ error: "Failed to create monitoring zone" });
  }
});

// Scheduled Cron Job (Runs daily at 3 AM)
cron.schedule('0 3 * * *', async () => {
  console.log("Running daily restaurant check...");
  try {
    const zones = await Zone.find();
    for (const zone of zones) {
      const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${zone.latitude},${zone.longitude}&radius=${zone.radius}&type=restaurant&key=${process.env.GOOGLE_API_KEY}`;
      const response = await axios.get(url);
      const latestPlaceIds = response.data.results.map(p => p.place_id);
      
      const newPlaces = latestPlaceIds.filter(id => !zone.baselinePlaces.includes(id));
      
      if (newPlaces.length > 0) {
        console.log(`Found new places:`, newPlaces);
        zone.baselinePlaces.push(...newPlaces);
        await zone.save();
      }
    }
  } catch (error) {
    console.error("Error during scheduled check:", error);
  }
});

// Start the Server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});