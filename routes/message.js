var express = require('express');
var router = express.Router();
var twilio = require('twilio');
var mongoose   = require('mongoose');
var forEach = require('async-foreach').forEach;

var uristring = process.env.MONGOLAB_URI;
var TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
var TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;

var client = new twilio.RestClient(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

mongoose.connect(uristring, function (err, res) {
	if (err) {
		console.log ('ERROR connecting to: ' + uristring + '. ' + err);
	} else {
		console.log ('Succeeded, connected to Mongodb');
	}
});

var userSchema = new mongoose.Schema({
    name: {
		first: { type: String, required: true, trim: true},
		last: { type: String, required: true, trim: true}
  	},
  	number: String
});
var groupSchema = new mongoose.Schema({
  _id: String,
  users: [userSchema]
});
var groups = mongoose.model('groups', groupSchema);

// var test = new group ({
// 	_id:"+2424445555",
//   users:[{name: { first: 'John', last: '  Doe   ' },
//   number: "+1234443333"}]
// });

// test.save(function (err) {if (err) console.log ('Error on save!')});

function elementExists(array, element, value) {
	return array.some(function(el) {
		return el[element] == value;
	}); 
}

function getObjectFromArray(array, element, value) {
	var result  = array.filter(function(o){return o[element] == value;} );

	return result? result[0] : null; // or undefined
}

function sendMessage(resp, userName, message, from, to) {
	resp.message(userName+ ': ' + message, { from: from, to: to});
}

router.post('/', function(req, res, next) {
	var options = { url: 'https://quiet-springs-2100.herokuapp.com/message' };
	// request did not come from twilio
	if (!twilio.validateExpressRequest(req, TWILIO_AUTH_TOKEN, options)) {
		res.status(401).json({error: "true", message: "Invalid request."});
		return console.error("Invalid request.");
	}

	console.log(req.body);

	groups.findOne({"_id": req.body.To}, function(err, group) {
		if (err) {
			res.status(503).send(err);
			return console.error(err);
		}
		if (!group) {
			res.status(400).json({error: "true", message: "unable to find from number."});
			return console.error("unable to find from number.");
		}
		console.log(group);

		// check if sender's number is in group
		if (elementExists(group.users, 'number', req.body.From)) {
			var senderUser = getObjectFromArray(group.users, 'number', req.body.From);

			console.log(senderUser);
			console.log("elementfound");

			var resp = new twilio.TwimlResponse();

			forEach(group.users, function(user, index, arr) {
				console.log("Name: " + user.name.first + ' ' + user.name.last);

				if (user.number != req.body.From) {
					/*resp.message(senderUser.name.first + ': ' + req.body.Body, {
					    from: group._id,
					    to: user.number
					});*/

					sendMessage(resp, senderUser.name.first, req.body.Body, group._id, user.number);
					/*client.sms.messages.create({
					    to: user.number,
					    from: group._id,
					    body:senderUser.name.first + ': ' + req.body.Body
					}, function(error, message) {
					    // The HTTP request to Twilio will run asynchronously. This callback
					    // function will be called when a response is received from Twilio
					    // The "error" variable will contain error information, if any.
					    // If the request was successful, this value will be "falsy"
					    if (!error) {
					        // The second argument to the callback will contain the information
					        // sent back by Twilio for the request. In this case, it is the
					        // information about the text messsage you just sent:
					        console.log('Success! message info:');
					        console.log(message);
					    } else {
					        console.log('Oops! There was an error.');
					    }
					});*/
				}


			}); // end foreach

		} else { 
			console.log("Number is not apart of this group."); 

			var resp = new twilio.TwimlResponse();
		}

		// render response
		res.type('text/xml');
	    res.send(resp.toString());
		
	});

	/*resp.message('TwiML test on Node', {
	    from: req.body.To,
	    to: req.body.From
	});*/

});

module.exports = router;