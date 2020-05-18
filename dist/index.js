"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Imports dependencies and set up http server
const axios_1 = __importDefault(require("axios"));
const express_1 = __importDefault(require("express"));
const body_parser_1 = __importDefault(require("body-parser"));
const request_1 = __importDefault(require("request"));
const app = express_1.default().use(body_parser_1.default.json()); // creates express http server
app.use(body_parser_1.default.urlencoded({ extended: false }));
const taskman = axios_1.default.create({
    baseURL: 'https://larataskman.herokuapp.com/api',
});
const port = process.env.PORT || 1337;
// Default landing
app.get('/', (req, res) => {
    res.send('Hi, I am TaskMan! Nice to meet you! <3');
});
// Creates the endpoint for our webhook
app.post('/webhook', (req, res) => {
    const { body } = req;
    // Checks this is an event from a page subscription
    if (body.object === 'page') {
        // Iterates over each entry - there may be multiple if batched
        body.entry.forEach((entry) => {
            // Gets the message. entry.messaging is an array, but
            // will only ever contain one message, so we get index 0
            const webhook_event = entry.messaging[0];
            console.log(webhook_event);
            // Get the sender PSID
            const sender_psid = webhook_event.sender.id;
            console.log(`Sender PSID: ${sender_psid}`);
            // Check if the event is a message or postback and
            // pass the event to the appropriate handler function
            if (webhook_event.message) {
                handleMessage(sender_psid, webhook_event.message);
            }
            else if (webhook_event.postback) {
                handlePostback(sender_psid, webhook_event.postback);
            }
        });
        // Returns a '200 OK' response to all requests
        res.status(200).send('EVENT_RECEIVED');
    }
    else {
        // Returns a '404 Not Found' if event is not from a page subscription
        res.sendStatus(404);
    }
});
// Adds support for GET requests to our webhook
app.get('/webhook', (req, res) => {
    // Your verify token. Should be a random string.
    const VERIFY_TOKEN = 'taskman';
    // Parse the query params
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    // Checks if a token and mode is in the query string of the request
    if (mode && token) {
        // Checks the mode and token sent is correct
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            // Responds with the challenge token from the request
            console.log('WEBHOOK_VERIFIED');
            res.status(200).send(challenge);
        }
        else {
            // Responds with '403 Forbidden' if verify tokens do not match
            res.sendStatus(403);
        }
    }
});
// Handles messages events
function handleMessage(sender_psid, received_message) {
    return __awaiter(this, void 0, void 0, function* () {
        let response;
        // Check if the message contains text
        if (received_message.text) {
            if (received_message.text.toUpperCase() === 'TASKS') {
                response = yield showTasks();
                console.log('received response...');
                console.log(response);
            }
            else {
                // Create the payload for a basic text message
                response = {
                    text: `You sent the message: "${received_message.text}". Now send me an image!`,
                };
            }
        }
        else if (received_message.attachments) {
            // Gets the URL of the message attachment
            const attachment_url = received_message.attachments[0].payload.url;
            response = {
                attachment: {
                    type: 'template',
                    payload: {
                        template_type: 'generic',
                        elements: [
                            {
                                title: 'Is this the right picture?',
                                subtitle: 'Tap a button to answer.',
                                image_url: attachment_url,
                                buttons: [
                                    {
                                        type: 'postback',
                                        title: 'Yes!',
                                        payload: 'yes',
                                    },
                                    {
                                        type: 'postback',
                                        title: 'No!',
                                        payload: 'no',
                                    },
                                ],
                            },
                        ],
                    },
                },
            };
        }
        // Sends the response message
        callSendAPI(sender_psid, response);
    });
}
// Handles messaging_postbacks events
function handlePostback(sender_psid, received_postback) {
    let response;
    // Get the payload for the postback
    const { payload } = received_postback;
    // Set the response based on the postback payload
    if (payload === 'yes') {
        response = { text: 'Thanks!' };
    }
    else if (payload === 'no') {
        response = { text: 'Oops, try sending another image.' };
    }
    // Send the message to acknowledge the postback
    callSendAPI(sender_psid, response);
}
// Sends response messages via the Send API
function callSendAPI(sender_psid, response) {
    // Construct the message body
    const request_body = {
        recipient: {
            id: sender_psid,
        },
        message: response,
    };
    // Send the HTTP request to the Messenger Platform
    request_1.default({
        uri: 'https://graph.facebook.com/v2.6/me/messages',
        qs: { access_token: process.env.PAGE_ACCESS_TOKEN },
        method: 'POST',
        json: request_body,
    }, (err, res, body) => {
        if (!err) {
            console.log('message sent!');
        }
        else {
            console.error(`Unable to send message:${err}`);
        }
    });
}
function showTasks() {
    return __awaiter(this, void 0, void 0, function* () {
        const res = yield taskman.get('/task');
        const response = {
            attachment: {
                type: 'template',
                payload: {
                    template_type: 'generic',
                    elements: res.data,
                },
            },
        };
        return response;
    });
}
// Sets server port and logs message on success
app.listen(port, () => console.log(`webhook is listening @ ${port}`));
