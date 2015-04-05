# Twilio Proxy

[https://quiet-springs-2100.herokuapp.com/](https://quiet-springs-2100.herokuapp.com/)

This app uses a number from Twilio as a proxy for group sms messaging. Users can join/leave these groups. Any message sent to the Twilio number will be forwarded to everyone else in the group. The app will also prepend the user's firstname followed by the message: `<User Firstname>: <message>`

## Requirements
 - A Twilio Account (non trial) with at least 1 number and in the Twilio settings have the number pointing to your app's endpoint: Your_Host/message
 - Node.js host (the example app is on Heroku)
 - MongoDB

## Setup
Development: create a `.env` file containing the following environmental variables:
	
    MONGOLAB_URI=<mongodb connect string>
	PORT=<Port to run webserver>
	TWILIO_ACCOUNT_SID=<Twilio account>
    TWILIO_AUTH_TOKEN=<Twilio auth>

When deploying on Heroku, set the environmental variables either on from the command line or web admin.

In `routes/message.js`:
Change the options url to your web apps url route.

## MongoDB Schema 
In the `groups` collection we have documents in this fashion:

    {
	    "_id":"<string> Twilio phone number +11234567890",
	    "users":[
		    {
			    "_id":<mongo object id>,
			    "number":"<string> a user's phone number +12123456789",
			    "name":{
					"first":"<user first name>",
					"last":"<user last name>"
				}
			}
		]
    }
   
## Usage
### Commands
Commands are case sensitive
 - `JOIN <Firstname> <Lastname>` - Joins group by adding a object to the users array in the DB, user will get a SMS message of join status
 - `LEAVE` - Finds this user's phone number in the users array and pulls it, user will get a SMS message if leaving was successful
 - `COMMANDS` - Sends a SMS message back to users with these commands.

Every other message, if the incoming phone number is in the group, we will forward the message to everyone else in the group except the sender and prepend the user's first name before the message.
If user is not in the group, the SMS message is ignored.

## Notes
There is a validation check to see if request came from Twilio and only in this case will the app return a valid TwiML response, all other requests will receive a response in JSON.