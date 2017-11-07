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
require('dotenv').config();
var encryptor = require('simple-encryptor')(process.env.ENCRYPT_SECRET);
var productsCache = require('../models/productscache');

const LEGACY_API = 'http://arqss17.ing.puc.cl:3000';
const NEW_LEGACY_API = 'http://arqss16.ing.puc.cl';
const MAILER_API = 'https://arqss6.ing.puc.cl';

const APPLICATION_TOKEN = '6a540a40-d321-4574-a13e-498c38c44bd8';
const GROUP_ID = 'G3';

const MAX_PER_DAY = 2;

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
(not used)
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
			name: req.body.name,
			length: req.body.name.length
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
GET /product?name="parche"
---------------
HEADERS:
"Authorization" : "JWT dad7asciha7..."
--------------- */
router.get('/product/', passport.authenticate('jwt', { session: false }), function (req, res, next) {
	// Validate name param
	if (!req.query.name) return res.status(400).send({ success: false, msg: 'Bad request.' });

	// Authenticate
	var token = getToken(req.headers);
	if (token){
		// Find products by name
		productsCache.find(req.query.name, function(products) {
			return res.json(products);
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
router.get('/product/:id', function (req, res) {
	// Check if 'id' is valid
	if (!/^[0-9]+$/.test(req.param('id'))) return res.status(400).send({ success: false, msg: 'Bad request.' });
	const product_id = req.param('id');

	// Find product in cached database
	Product.find({'id':product_id}, {'_id':0, '__v':0})
	.exec((err, data) => {
		if (data.length) {
			let product = data[0];
			return res.json(product);
		} else {
			return res.status(400).send({ success: false, msg: 'No existe un producto con ese id.' });
		}
	});
});

/* ------------
GET /products
---------------
HEADERS:
"Authorization" : "JWT dad7asciha7..."
--------------- */
router.get('/products', passport.authenticate('jwt', { session: false }), function (req, res) {
	// Validate page param
	if (!req.query.page) req.query.page = 1;
	if (!/^[0-9]+$/.test(req.query.page)) return res.status(400).send({ success: false, msg: 'Bad request.' });
	if (req.query.page == 0) req.query.page = 1;
	let page_num = req.query.page ? req.query.page : 1;

	// Authenticate
	var token = getToken(req.headers);
	if (token) {
		// Get products paginated
		const page_size = 10;
		const skips = page_size * (page_num - 1);
		Product.find({}, {'_id':0, '__v':0})
		.skip(skips)
		.limit(page_size)
		.exec((err, products) => {
			res.json(products);
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
	if (!req.query.page) req.query.page = 1;
	if (!/^[0-9]+$/.test(req.query.page)) return res.status(400).send({ success: false, msg: 'Bad request.' });
	let fixed_page = req.query.page ? req.query.page - 1 : 0;
	if (fixed_page < 0) return res.status(400).send({ success: false, msg: 'Bad request.' });

	var token = getToken(req.headers);
	if (token) {
		http.get(`${NEW_LEGACY_API}/categories/?application_token=${APPLICATION_TOKEN}&page=${fixed_page}`, (resp) => {
			let data = '';
			// A chunk of data has been received.
			resp.on('data', (chunk) => { data += chunk; });
			// The whole response has been received. Print out the result.
			resp.on('end', () => {
				let categories = JSON.parse(data).categories;
				categories = categories.map((category) => { 
					return {
						id: category.pk,
						context: category.fields.context,
						area: category.fields.area,
						group: category.fields.group
					};
				})
				// Write categories to cache
				query_page = req.query.page ? req.query.page : 1
				cache.setex("categories:" + query_page, 3600, JSON.stringify(categories));
				return res.json(categories);
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
	"address": "742 Evergreen Terrace",
	"cart": [
		{
			"product_id": 123,
			"quantity": 10,
			"price": 1000,
			"name": "Parche"
		},
		{
			"product_id": 33,
			"quantity": 2,
			"price": 1500,
			"name": "Desodorante"
		}
	]
}
---------------
HEADERS:
"Authorization" : "JWT dad7asciha7..."
--------------- */
router.post('/transaction', passport.authenticate('jwt', { session: false }), function (req, res) {
	// Check body params
	if (!req.body.address || !req.body.cart) {
		return res.status(400).send({ success: false, msg: 'Bad request.' });
	}
	if (!req.body.cart.length || !req.body.address.length) {
		return res.status(400).send({ success: false, msg: 'Bad request.' });
	}

	// Get token
	var token = getToken(req.headers);
	if (!token) return res.status(403).send({ success: false, msg: 'Unauthorized.' });
	// Get username from token
	let username = getUsernameFromToken(token);

	// Check the number of times the user bought each product today
	const txs_keys = req.body.cart.map(product => `transaction:${username}/${product.product_id}`);
	const registerPromises = [];
	const accepted_cart = [];
	const rejected_cart = [];
	cache.mget(txs_keys, (err, reply) => {
		if (err) throw err;
		// Iterate over products
		for (let i = 0; i < reply.length; i++) {
			let count = parseInt(reply[i]);
			let product = req.body.cart[i];

			// Check if product hasn't been purchased today
			if (isNaN(count)) {
				product.count = 1;
				registerPromises.push(registerOrder(product, username));
				continue;
			}
			// Product has been purchased today
			if (count < MAX_PER_DAY) {
				product.count = count + 1;
				registerPromises.push(registerOrder(product, username));
				continue;
			}
			else {
				// Reject purchase
				product.rejected_reason = "No puedes comprar el mismo producto 3 veces en un día.";	
				rejected_cart.push(product);
				continue;			
			}
		}
	
		Promise.all(registerPromises).then((values) => {
			values.forEach((value) => {
				let product = value.product;		
				if (value.status.transaction_status_code === 'EXEC') {
					let tx_key = `transaction:${username}/${product.product_id}`;
					if (product.count == 1) {
						// Write transaction into cache for 24 hours (86400 seconds)
						cache.setex(tx_key, 86400, 1);
					}
					else if (product.count <= MAX_PER_DAY) {
						// Re-write transaction into cache for TTL seconds, with count + 1						
						cache.ttl(tx_key, (err, ttl) => {
							cache.setex(tx_key, ttl, product.count);
						});
					}
					accepted_cart.push(product);
				}
				else {
					product.rejected_reason = "Información del producto es inválida.";	
					rejected_cart.push(product)
				}
			});
			// Write transaction to user history
			User.findOne({ username: username }, (err, user) => {
				if (err) throw err;
				if (!user) {
					res.status(401).send({ success: false, msg: 'Authentication failed. User not found.' });
				} else {
					// Calculate total price from accepted products
					let accepted_total_price = accepted_cart.map(product => product.price * product.quantity).reduce((a, b) => a + b, 0);
					// Get current user history and push new cart into it
					let transactions = encryptor.decrypt(user.transactions);
					transactions.push({"address": req.body.address, "accepted": accepted_cart, "rejected": rejected_cart, "date": Date.now(), "total_accepted": accepted_total_price});
					// Encrypt transactions array and save it again
					user.transactions = encryptor.encrypt(transactions);
					user.save((err) => {
						if (err) throw err;
					});
				}
			}).then(() => {
				return res.send({ success: true, rejected: rejected_cart, accepted: accepted_cart });
			});
		}, (err) => {
			console.log(err);
		});
	});
});

// Register order with Orders API
registerOrder = function (product, username) {
	return new Promise((resolve, reject) => {
		let body = {
			json: {
				application_token: APPLICATION_TOKEN,
				product: `${product.product_id}`,
				id: GROUP_ID,
				amount: `${product.quantity}`,
				user_id: `${username}`
			}
		};
		request.post(`${NEW_LEGACY_API}/transactions/`, body, (error, response, body) => {
			if (error) reject(response);
			body.product = product;
			resolve(body);
		});
	});
}


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

/* ------------
GET /history
---------------
HEADERS:
"Authorization" : "JWT dad7asciha7..."
--------------- */
router.get('/history', passport.authenticate('jwt', { session: false }), function (req, res) {
	// Pagination (default 1)
	if (!req.query.page) req.query.page = 1;

	// Get token
	var token = getToken(req.headers);
	if (!token) return res.status(403).send({ success: false, msg: 'Unauthorized.' });
	// Get username from token
	let username = getUsernameFromToken(token);

	User.findOne({ username: username }, (err, user) => {
		if (err) throw err;
		if (!user) {
			res.status(401).send({ success: false, msg: 'Authentication failed. User not found.' });
		} else {
			let transactions = encryptor.decrypt(user.transactions).reverse();
			transactions = paginate(transactions, 10, req.query.page);
			res.json(transactions);
		}
	});
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

// Paginate array
paginate = function (array, page_size, page_number) {
	--page_number;
	return array.slice(page_number * page_size, (page_number + 1) * page_size);
  }

module.exports = router;
