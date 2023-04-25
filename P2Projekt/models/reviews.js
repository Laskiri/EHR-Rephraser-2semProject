const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const reviewSchema = new Schema({
    review_text: { type: String, required: true, maxLength: 100 }
});

// Export model
module.exports = mongoose.model("review", reviewSchema);