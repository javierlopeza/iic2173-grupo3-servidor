var express = require('express');
var request = require('request');
var Product = require("../models/product");
var mongoose = require('mongoose');


module.exports.load = function(){
  request({url: 'http://arqss17.ing.puc.cl:3000/products', json: true}, function(err, res, json) {
    if (err) {
      throw err;
    }
    for (var i = json.length - 1; i >= 0; i--) {
      json[i]["length"] = json[i].name.length;
      delete json[i]["price"]
      console.log(json[i]);
      var newProduct = new Product({
        id: json[i].id,
        category: json[i].category,
        name: json[i].name,
        length: json[i].name.length
      });
      newProduct.save();
    }
  });
};
