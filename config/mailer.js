const nodemailer = require('nodemailer')
const sender = process.env.GMAIL_ACCOUNT
const password = process.env.GMAIL_PASSWORD

var transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: sender,
    pass: password
  }
})

exports.sendEmail = function (receiver, name, subject, data) {

  var mailOptions = {
    from: sender,
    to: receiver,
    subject: subject,
    text: "text",
    html: buildHTML(data)
  }

  return new Promise(function (resolve, reject) {
    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        console.log(error)
        reject(error)
      } else {
        console.log('Message sent: ' + info.response)
        resolve(info.response)
      }
    })
  })
}

function buildHTML(data) {
  // TODO
  return "<h1>Hello World</h1>"
}