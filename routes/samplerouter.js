var express = require("express");

var samplerouter = express.Router();

samplerouter.get('/test', (req,res) => {
	res.send('test working');
});

module.exports = samplerouter;
