var mongoose = require('mongoose');
var request = require('request');

var Schema = mongoose.Schema;

var CategorySchema = new Schema({
  id: {
    type: Number,
    unique: true,
    required: true
  },
  group: {
    type: String,
    required: true
  },
  context: {
    type: String,
    required: true
  },
  area: {
    type: String,
    required: false
  }
});

module.exports = mongoose.model('Category', CategorySchema);
