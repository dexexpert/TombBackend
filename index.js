const express = require('express');

const app = express();

const bodyParser = require('body-parser');
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended : false }));

app.get('/APY', (req, res, next) => {
	console.log("GETTING APY : ");
	res.send("apy is 10$");
})
app.get('/', function (req, res) {
  res.send('we are at the root route of our server');
})
const server = app.listen(8000, function () {
    let host = server.address().address
    let port = server.address().port
    // Starting the Server at the port 3000

    console.log(host.toString() + " : " + port);
})