if (process.env.NODE_ENV != 'production')
    require('dotenv').load();
var express    = require('express');        // call express
var app        = express();                 // define our app using express
var bodyParser = require('body-parser');
var favicon = require('serve-favicon');
var compression = require('compression');
var multer = require('multer'); 

var message = require('./routes/message');

app.use(compression());
app.use(favicon(__dirname + '/public/favicon.ico'));

// configure app to use bodyParser()
// this will let us get the data from a POST
app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded
app.use(multer()); // for parsing multipart/form-data

var port = process.env.PORT;        // set our port

// api routes
var router = express.Router();              // get an instance of the express Router

// main route
router.get('/', function(req, res) {
    res.json({ status: 200 });   
});

// more routes for our API will happen here
app.use('/message', message);


// all  other routes that are not defined
router.route('*')
	.all(function(req, res) {
        res.json({status: "not found"});
    });

// register router
app.use('/', router);

// start server
app.listen(port);
console.log('express server started on port: ' + port);