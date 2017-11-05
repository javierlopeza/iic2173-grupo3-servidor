var mongoose = require('mongoose');
var request = require('request');

var Schema = mongoose.Schema;

var ProductSchema = new Schema({
  id: {
    type: Number,
    unique: true,
    required: true
  },
  category: {
    type: Number,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  length: {
    type: Number,
    required: false
  }
});

module.exports = mongoose.model('Product', ProductSchema);
