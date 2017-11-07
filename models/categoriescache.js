var express = require('express');
var request = require('request');
var Category = require("../models/category");
var mongoose = require('mongoose');

var iterations = 1
var token = "6a540a40-d321-4574-a13e-498c38c44bd8"

function sleep(ms){
    return new Promise(resolve=>{
        setTimeout(resolve,ms)
    })
}

function loadCategories(from, callback){
  var results = [];
  for (var counter = from; counter < from + iterations; counter++){

    request({
        url: `http://arqss16.ing.puc.cl/categories/?application_token=${token}&page=${counter}`,
        json: true
      }, function(err, res, json) {
      if (err) {
        console.log(err);
      }
      categories = json.categories;
      if (json){
        for (var i = categories.length - 1; i >= 0; i--) {
          category = categories[i]
          var newCategory = new Category({
            id: category.pk,
            group: category.fields.group,
            context: category.fields.context,
            area: category.fields.area
          });
          newCategory.save();
          console.log(newCategory);
        }
        results.push(categories.length);
        if (results.length == iterations){
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
  for (var counter = 0; loadMore == true; counter += iterations){
    loadCategories(counter, function(result){
      loadMore = result;
    });
    await sleep(100);
  }
};

module.exports.load = load;

load();
var minutes = 10, the_interval = minutes * 60 * 1000;
setInterval(function() {
  load();
}, the_interval);


