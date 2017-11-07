var express = require('express');
var request = require('request');
var Product = require("../models/product");
var distance = require("../models/worddistance");
var mongoose = require('mongoose');

var iterations = 1
var our_token = "6a540a40-d321-4574-a13e-498c38c44bd8"


function sleep(ms){
    return new Promise(resolve=>{
        setTimeout(resolve,ms)
    })
}

function loadProducts(from, callback){
  var results = [];
  for (var counter = from; counter < from + iterations; counter++){

    request({
        url: 'http://arqss16.ing.puc.cl/products/?application_token=6a540a40-d321-4574-a13e-498c38c44bd8&page='+ counter, 
        //'http://arqss16.ing.puc.cl:3000/products?application_token=' + our_token + '&page='+ counter, 
        json: true
      }
      , function(err, res, json) {
      if (err) {
        console.log(err);
      }
      products = json.products;
      if (json){
        for (var i = products.length - 1; i >= 0; i--) {
          product = products[i]
          console.log("A product");
          console.log(product.fields.price);
          var newProduct = new Product({
            id: product.pk,
            category: product.fields.category,
            name: product.fields.name,
            length: product.fields.name.length,
            price: product.fields.price,
          });
          newProduct.save();
          

        }
        results.push(products.length);
        if (results.length == iterations){
          console.log(results);
          if (results.includes(0)){
            callback(false);
          } else {
            callback(true);
          }
        }
      } else {
        callback(false);
      }
    });
  }
}

async function load(){
  loadMore = true;
  for (var counter = 1; loadMore == true; counter += iterations){
    loadProducts(counter, function(result){
      loadMore = result;
    });
    await sleep(100);
  }
};

module.exports.load = load;

module.exports.find = function(producto, callback){
  var result = [];
  Product.find({
    name: new RegExp(producto, 'i')
  })
  .exec(function (err, products) {
    for (var i = 0; i < products.length; i++){
      product = products[i];
      result.push(product);
    }
  }).then(function(){
    Product.find({
      length: producto.length
    })
    .exec(function (err, products) {

      for (var i = 0; i < products.length; i++){
        product = products[i];
        if (distance.simpleDistance(product.name, producto) == 1){
          result.push(product);
        }
      }
    })
    .then(function(){
      callback(result);
    });
  });
}

load();
var minutes = 10, the_interval = minutes * 60 * 1000;
setInterval(function() {
  load();
}, the_interval);


