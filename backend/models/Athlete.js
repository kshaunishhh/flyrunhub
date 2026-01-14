const mongoose = require("mongoose");

const AthleteSchema = new mongoose.Schema({
  athleteId: {
    type: Number,
    required: true,
    unique: true,
  },
  username: String,
  firstname: String,
  lastname: String,

  accessToken: {
    type: String,
    required: true,
  },
  refreshToken: {
    type: String,
    required: true,
  },
  tokenExpiresAt: {
    type: Number,
    required: true,
  },

  joinedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Athlete", AthleteSchema);