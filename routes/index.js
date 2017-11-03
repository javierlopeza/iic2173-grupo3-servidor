let express = require('express')
let router = express.Router()
let mailer = require('../config/mailer')

/* GET home page. */
router.get('/', function(req, res, next) {
  res.send('Arquitran API - Grupo 3 (2017-2)')
})

module.exports = router
