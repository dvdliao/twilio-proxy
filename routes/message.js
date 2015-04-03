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

// function to check if element value exists in array
function elementExists(array, element, value) {
	return array.some(function(el) {
		return el[element] == value;
	}); 
}

// returns the object where element equals value
function getObjectFromArray(array, element, value) {
	var result  = array.filter(function(o){return o[element] == value;} );

	return result? result[0] : null; // or undefined
}

// helper function to append a send message response to twilio response
function sendMessage(resp, userName, message, from, to, prependUsername) {
	prependUsername = typeof prependUsername !== 'undefined' ? prependUsername : true;

	if (prependUsername)
		resp.message(userName + ': ' + message, { from: from, to: to});
	else
		resp.message(message, { from: from, to: to});
}

function createMessage(msg, from, to) {
	client.sms.messages.create({
	    to: to,
	    from: from,
	    body: msg
	}, function(error, message) {
	    // The HTTP request to Twilio will run asynchronously. This callback
	    // function will be called when a response is received from Twilio
	    // The "error" variable will contain error information, if any.
	    // If the request was successful, this value will be "falsy"
	    if (!error) {
	        // sent
	    } else {
	        console.log('There was an error creating a message.');
	    }
	});
}

// string prototype function to have startswith
if (!String.prototype.startsWith) {
  String.prototype.startsWith = function(searchString, position) {
    position = position || 0;
    return this.lastIndexOf(searchString, position) === position;
  };
}

router.post('/', function(req, res, next) {
	var options = { url: 'https://quiet-springs-2100.herokuapp.com/message' };
	//request did not come from twilio
	if (!twilio.validateExpressRequest(req, TWILIO_AUTH_TOKEN, options)) {
		res.status(401).json({error: "true", message: "Invalid request."});
		return console.error("Invalid request.");
	}

	//console.log(req.body);

	var resp = new twilio.TwimlResponse();

	// see if this twilio number group is in the database
	groups.findOne({"_id": req.body.To}, function(err, group) {
		if (err) { // db error
			res.status(503).send(err);
			return console.error(err);
		}
		if (!group) { // number is not in database -- will need to update to a twilio response
			//res.status(400).json({error: "true", message: "unable to find from number."});
			console.log("unable to find from number.");
		} else {
			var messageContents = req.body.Body;

			// commands
			if (messageContents.startsWith("JOIN")){
				// user wants to join group
				// get args arr split on space
				var args = messageContents.split(' ');
				// invalid form
				if (args.length < 3 || args.length > 3){
					sendMessage(resp, null, "Invalid use of 'JOIN' command. Usage: JOIN <Your firstname> <Your lastname>", group._id, req.body.From, false);
				} else {
					var newUser = {name:{first: args[1], last: args[2]}, number: req.body.From};

					console.log(newUser);
					if (elementExists(group.users, 'number', req.body.From)){
						sendMessage(resp, null, "You are already apart of this group.", group._id, req.body.From, false);
					} else {
						groups.update({_id: group._id}, {$addToSet: {users: newUser}}, function(err){
							// since this is async we cannot reply to the message as this query may finish sometime later, we need to create a new message and send it not as a response.
					        if(err){
					            console.log(err);
					            createMessage("There was an error adding you to the group. Try again later.", group._id, req.body.From);
					        }else{
					            createMessage("You have joined the group. You can now send messages to this group and should be receiving messages from others in the group shortly.", group._id, req.body.From);
					        }
						});
					}
				}
			} else if (messageContents == "LEAVE") {
				groups.update({_id: group._id}, {$pull: {users: {number: req.body.From}}}, function(err){
					// since this is async we cannot reply to the message as this query may finish sometime later, we need to create a new message and send it not as a response.
			        if(!err){ 
			            //console.log("Successfully left group");
			            createMessage("You have left this group.", group._id, req.body.From);
			        }
				});

			} else if (messageContents == "COMMANDS") {
				sendMessage(resp, null, "Available commands: JOIN, LEAVE, COMMANDS.", group._id, req.body.From, false);

			} else if (elementExists(group.users, 'number', req.body.From)) { // check if sender's number is in group
				var senderUser = getObjectFromArray(group.users, 'number', req.body.From);

				forEach(group.users, function(user, index, arr) {
					//console.log("Name: " + user.name.first + ' ' + user.name.last);

					if (user.number != req.body.From) {
						sendMessage(resp, senderUser.name.first, messageContents, group._id, user.number);
					}

				}); // end foreach

			} else { 
				console.log("Number is not apart of this group."); 
			}
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