var express = require('express');
var request = require('request');
var Product = require("../models/product");
var mongoose = require('mongoose');

var iterations = 3

function sleep(ms){
    return new Promise(resolve=>{
        setTimeout(resolve,ms)
    })
}

function loadProducts(from, callback){
  var results = [];

  for (var counter = from; counter < from + iterations; counter++){
    request({url: 'http://arqss17.ing.puc.cl:3000/productos?page='+ counter, json: true}, function(err, res, json) {
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
      results.push(json.length);
      if (results.length == iterations){

        if (results.includes(0)){
          callback(false);
        } else {
          callback(true);
        }
      }
    });
  }
}

module.exports.load = async function(){
  loadMore = true;
  for (var counter = 1; loadMore == true; counter += iterations){
    loadProducts(counter, function(result){
      loadMore = result;
    });
    await sleep(20);
  }
};
