const nodemailer = require('nodemailer');
const sender = process.env.GMAIL_ACCOUNT;
const password = process.env.GMAIL_PASSWORD;
const FORM_URL = 'https://goo.gl/forms/B1O3iRPyssOGvvgg2';

var transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: sender,
    pass: password
  }
})

exports.sendFormEmail = function(username) {
  var mailOptions = {
    from: sender,
    to: username,
    subject: 'Encuesta de seguimiento de compra',
    text: "text",
    html: buildFormHTML(username)
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

function buildFormHTML(username) { 
  let content = `
  <h1> Estimado ${username}, gracias por preferir a Arquitrán SPA</h1>
  <p>Te invitamos a responder la siguiente encuesta para que nos entregues feedback de tu compra en Arquitrán.</p>
  <h2>${FORM_URL}</h2>
  `;
  return content;
}

exports.sendEmail = function (receiver, name, subject, data) {

  var mailOptions = {
    from: sender,
    to: receiver,
    subject: subject,
    text: "text",
    html: buildHTML(data, name)
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

function buildHTML(data, name) {
    if (!data) {
        return "<h1>Data Not Found</h1>"
    }
    console.log(data);
    console.log(name);    
    let intro = `
    <h1> Estimado ${name}, gracias por preferir a Arquitrán SPA</h1>
    <p>El total pagado por los productos aceptados es <b>$${data.total_accepted}</b></p>
    `;
    
    let intro1 = `<p>Se aceptó la compra de los siguientes productos:</p>`;

    let headers = `
    <tr>
        <th>ID</th>
        <th>Nombre</th>
        <th>Precio unitario</th>
        <th>Cantidad</th>
        <th>Subtotal</th>
        <th>Detalle</th>
    </tr>`;
    
    let tableBodyAccepted = data.accepted
    .map((p) => `
    <tr>
        <td>${p.product_id}</td>
        <td>${p.name}</td>
        <td>$${p.price}</td>
        <td>${p.quantity}</td>
        <td>$${p.quantity * p.price}</td>
        <td>Aprobado</td>
    </tr>`)
    .reduce((prev, current) => prev + current, '');

    let intro2 = `<p>Se rechazó la compra de los siguientes productos:</p>`

    let tableBodyRejected = data.rejected
    .map((p) => `
    <tr>
        <td>${p.product_id}</td>
        <td>${p.name ? p.name : "N/A"}</td>
        <td>${p.price ? "$" + p.price : "N/A"}</td>
        <td>${p.quantity}</td>
        <td>${p.price ? "$" + (p.quantity * p.price) : "N/A"}</td>
        <td>${p.rejected_reason}</td>        
    </tr>`)
    .reduce((prev, current) => prev + current, '');

    let tableAccepted = `<table>${headers}${tableBodyAccepted}</table>`;
    let tableRejected = `<table>${headers}${tableBodyRejected}</table>`;
    
    if (!data.accepted.length) {
        intro1 = '';        
        tableAccepted = '';
    }
    if (!data.rejected.length) {
        intro2 = '';        
        tableRejected = '';
    }
    
    return intro + intro1 + tableAccepted + intro2 + tableRejected;
}