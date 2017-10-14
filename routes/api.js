const http = require('http');
var mongoose = require('mongoose');
var passport = require('passport');
var config = require('../config/database');
require('../config/passport')(passport);
var express = require('express');
var jwt = require('jsonwebtoken');
var router = express.Router();
var User = require("../models/user");
var Product = require("../models/product");

const LEGACY_API = 'http://arqss17.ing.puc.cl:3000';

/* ------------
POST /signup
---------------
body = {
  username: "arquitran@uc.cl",
  password: "123123"
}
--------------- */
router.post('/signup', function (req, res) {
	if (!req.body.username || !req.body.password) {
		res.json({ success: false, msg: 'Please pass username and password.' });
	} else {
		var newUser = new User({
			username: req.body.username,
			password: req.body.password
		});
		// save the user
		newUser.save(function (err) {
			if (err) {
				return res.json({ success: false, msg: 'Username already exists.' });
			}
			res.json({ success: true, msg: 'Successful created new user.' });
		});
	}
});

/* ------------
POST /signin
---------------
body = {
  username: "arquitran@uc.cl",
  password: "123123"
}
--------------- */
router.post('/signin', function (req, res) {
	User.findOne({
		username: req.body.username
	}, function (err, user) {
		if (err) throw err;

		if (!user) {
			res.status(401).send({ success: false, msg: 'Authentication failed. User not found.' });
		} else {
			// check if password matches
			user.comparePassword(req.body.password, function (err, isMatch) {
				if (isMatch && !err) {
					// if user is found and password is right create a token
					var token = jwt.sign(user, config.secret);
					// return the information including token as JSON
					res.json({ success: true, token: 'JWT ' + token });
				} else {
					res.status(401).send({ success: false, msg: 'Authentication failed. Wrong password.' });
				}
			});
		}
	});
});

/* ------------
POST /product
---------------
body = {
  id: 101,
  category: 15,
  name: "Paracetamol"
}
---------------
HEADERS:
"Authorization" : "JWT dad7asciha7..."
--------------- */
router.post('/product', passport.authenticate('jwt', { session: false }), function (req, res) {
	var token = getToken(req.headers);
	if (token) {
		var newProduct = new Product({
			id: req.body.id,
			category: req.body.category,
			name: req.body.name
		});

		newProduct.save(function (err) {
			if (err) {
				return res.json({ success: false, msg: 'Save product failed.' });
			}
			res.json({ success: true, msg: 'Successful created new product.' });
		});
	} else {
		return res.status(403).send({ success: false, msg: 'Unauthorized.' });
	}
});

/* ------------
GET /product/:id
---------------
HEADERS:
"Authorization" : "JWT dad7asciha7..."
--------------- */
router.get('/product/:id', passport.authenticate('jwt', { session: false }), function (req, res) {
	// Check if 'id' is valid
	if (/^\d+$/.test(req.param('id')) == false) {
		return res.status(400).send({ success: false, msg: 'Bad request.' });
	}
	var token = getToken(req.headers);
	if (token) {
		// GET product from legacy api
		http.get(`${LEGACY_API}/productos/${req.param('id')}`, (resp) => {
			let product = '';
			resp.on('data', (chunk) => { product += chunk; });
			resp.on('end', () => {
				product = JSON.parse(product);
				if (!Object.keys(product).length) {
					return res.status(400).send({ success: false, msg: 'Product not found.' });
				}
				// GET product category from legacy api
				http.get(`${LEGACY_API}/categorias/${product.category}`, (resp) => {
					let category = '';
					resp.on('data', (chunk) => { category += chunk; });
					resp.on('end', () => {
						category = JSON.parse(category);
						product.category = category;
						product.success = true;
						// Success!
						return res.json(product);
					});
				}).on("error", (err) => {
					return res.status(400).send({ success: false, msg: 'Bad request.' });
				});
			});
		}).on("error", (err) => {
			return res.status(400).send({ success: false, msg: 'Bad request.' });
		});
	} else {
		return res.status(403).send({ success: false, msg: 'Unauthorized.' });
	}
});

/* ------------
GET /products
---------------
HEADERS:
"Authorization" : "JWT dad7asciha7..."
--------------- */
router.get('/products', passport.authenticate('jwt', { session: false }), function (req, res) {

	var token = getToken(req.headers);
	if (token) {
		http.get(`${LEGACY_API}/productos?page=${req.query.page}`, (resp) => {
			let data = '';
			// A chunk of data has been received.
			resp.on('data', (chunk) => { data += chunk; });
			// The whole response has been received. Print out the result.
			resp.on('end', () => {
				return res.json(JSON.parse(data));
			});
		}).on("error", (err) => {
			return res.status(400).send({ success: false, msg: 'Bad request.' });
		});
	} else {
		return res.status(403).send({ success: false, msg: 'Unauthorized.' });
	}
});

/* ------------
GET /categories
---------------
HEADERS:
"Authorization" : "JWT dad7asciha7..."
--------------- */
router.get('/categories', passport.authenticate('jwt', { session: false }), function (req, res) {

	var token = getToken(req.headers);
	if (token) {
		http.get(`${LEGACY_API}/categorias?page=${req.query.page}`, (resp) => {
			let data = '';
			// A chunk of data has been received.
			resp.on('data', (chunk) => { data += chunk; });
			// The whole response has been received. Print out the result.
			resp.on('end', () => {
				return res.json(JSON.parse(data));
			});
		}).on("error", (err) => {
			return res.status(400).send({ success: false, msg: 'Bad request.' });
		});
	} else {
		return res.status(403).send({ success: false, msg: 'Unauthorized.' });
	}
});

// Parse authorization token from request headers
getToken = function (headers) {
	if (headers && headers.authorization) {
		var parted = headers.authorization.split(' ');
		if (parted.length === 2) {
			return parted[1];
		} else {
			return null;
		}
	} else {
		return null;
	}
};

module.exports = router;
