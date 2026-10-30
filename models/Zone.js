const mongoose = require('mongoose');

const zoneSchema = new mongoose.Schema({
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  radius: { type: Number, required: true }, // Size of the circle in meters
  baselinePlaces: [{ type: String }] // An array to hold Google place_id strings
});

module.exports = mongoose.model('Zone', zoneSchema);