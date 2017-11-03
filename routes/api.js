const http = require('http');
var request = require('request');
var mongoose = require('mongoose');
var passport = require('passport');
var config = require('../config/database');
require('../config/passport')(passport);
var express = require('express');
var jwt = require('jsonwebtoken');
var router = express.Router();
var User = require("../models/user");
var Product = require("../models/product");
const cache = require('../config/cache');
const mailer = require ('../config/mailer');

const LEGACY_API = 'http://arqss17.ing.puc.cl:3000';
const MAILER_API = 'https://arqss6.ing.puc.cl'

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
		// save the user in mongoDB
		newUser.save(function (err) {
			if (err) {
				return res.json({ success: false, msg: 'Username already exists.' });
			}

			// POST token to email-bot
			var options = {
				url: `${MAILER_API}/token`,
				method: 'POST',
				form: {
					mail: newUser.username,
					token: 'JWT ' + jwt.sign(newUser, config.secret, { expiresIn: '1y' })
				}
			};
			request(options, function (error, response, body) {
				if (!error && response.statusCode == 200) {
					return res.json({ success: true, msg: 'Successful created new user.' });
				}
				else {
					return res.status(500).send({ success: false, msg: 'User saved, but mailer error.' });
				}
			});

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
					var token = jwt.sign(user, config.secret, { expiresIn: '20m' });
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
CACHE GET /product/:id
---------------
HEADERS:
"Authorization" : "JWT dad7asciha7..."
--------------- */
router.get('/product/:id', passport.authenticate('jwt', { session: false }), function (req, res, next) {

	if (/^\d+$/.test(req.params.id) == false) {
		return res.status(400).send({ success: false, msg: 'Bad request.' });
	}

	var token = getToken(req.headers);
	if (token) {

		// Get product from cache
		cache.get("product:" + req.params.id, (err, product) => {
			if (err) throw err;

			if (product !== null) {
				// Return product if it is in the cache
				return res.json(JSON.parse(product))
			} else {
				// If product is not on cache, call legacy API
				next();
			}
		})

	} else {
		return res.status(403).send({ success: false, msg: 'Unauthorized.' });
	}
})

/* ------------
GET /product/:id
---------------
HEADERS:
"Authorization" : "JWT dad7asciha7..."
--------------- */
router.get('/product/:id', function (req, res) {
	// Check if 'id' is valid

	// GET product from legacy api
	http.get(`${LEGACY_API}/productos/${req.params.id}`, (resp) => {
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
					// Write product to cache
					cache.setex("product:" + product.id, 3600, JSON.stringify(product));
					return res.json(product);
				});
			}).on("error", (err) => {
				return res.status(400).send({ success: false, msg: 'Bad request.' });
			});
		});
	}).on("error", (err) => {
		return res.status(400).send({ success: false, msg: 'Bad request.' });
	});
});


/* ------------
CACHE GET /products
---------------
HEADERS:
"Authorization" : "JWT dad7asciha7..."
--------------- */
router.get('/products', passport.authenticate('jwt', { session: false }), function (req, res, next) {

	var token = getToken(req.headers);
	if (token) {
		query_page = req.query.page ? req.query.page : 1
		// Get products from cache
		cache.get('products:' + query_page, (err, products) => {
			if (err) throw err;

			if (products !== null) {        
				// Return product if it is in the cache
				return res.json(JSON.parse(products))
			} else {
        // If product is not on cache, call legacy API      
				next();
			}
		})

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
				// Write products to cache
				query_page = req.query.page ? req.query.page : 1
        cache.setex("products:" + query_page, 3600, JSON.stringify(JSON.parse(data)));        
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
CACHE GET /categories
---------------
HEADERS:
"Authorization" : "JWT dad7asciha7..."
--------------- */
router.get('/categories', passport.authenticate('jwt', { session: false }), function (req, res, next) {
	var token = getToken(req.headers);
	if (token) {
		query_page = req.query.page ? req.query.page : 1
		// Get products from cache
		cache.get('categories:' + query_page, (err, categories) => {
			if (err) throw err;

			if (categories !== null) {
				// Return product if it is in the cache
				return res.json(JSON.parse(categories))
			} else {
				// If product is not on cache, call legacy API
				next();
			}
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
				// Write categories to cache
				query_page = req.query.page ? req.query.page : 1
				cache.setex("categories:" + query_page, 3600, JSON.stringify(JSON.parse(data)));
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
POST /transaction
---------------
body = {
  product_id: 101,
  address: "742 Evergreen Terrace",
}
---------------
HEADERS:
"Authorization" : "JWT dad7asciha7..."
--------------- */
router.post('/transaction', passport.authenticate('jwt', { session: false }), function (req, res) {
	// Check body params
	if (req.body.product_id == null || req.body.address == null) {
		return res.status(400).send({ success: false, msg: 'Bad request.' });
	}
	// Validate product_id regex
	if (/^\d+$/.test(req.body.product_id) == false) {
		return res.status(400).send({ success: false, msg: 'Bad request.' });
	}

	var token = getToken(req.headers);
	if (token) {
		// TODO (?): check if product exists

		// Check if transaction exists
		let username = getUsernameFromToken(token);
		cache.get(`transaction:${username}/${req.body.product_id}`, (err, transaction) => {
			if (err) throw err;

			if (transaction) {
				// Unauthorized: already bought the product today
				return res.status(403).send({ success: false, msg: 'Can not buy the same product twice in a day.' });
			} else {
				// TODO: make request to legacy API before writing transaction into cache
				// Write transaction into cache for 24 hours (as "transaction:<email>/<product_id>")
				cache.setex(`transaction:${username}/${req.body.product_id}`, 86400, true);
				return res.send({ success: true });
			}
		});
	} else {
		return res.status(403).send({ success: false, msg: 'Unauthorized.' });
	}
});


/* -----------
POST /token
--------------
body = {
  username: "arquitran@uc.cl",
  password: "123123"
}
---------------
HEADERS:
"Authorization" : "JWT dad7asciha7..."
--------------*/
router.post('/token', passport.authenticate('jwt', { session: false }), function (req, res) {
	var token = getToken(req.headers);
	if (token) {

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

// Get username from JWT
getUsernameFromToken = function (token) {
	var decoded = jwt.verify(token, config.secret);
	return decoded._doc.username;
}

module.exports = router;
