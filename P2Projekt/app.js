require('dotenv').config()
var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const fetch = require('node-fetch');
const { stringify } = require('querystring')
const mongoose = require('mongoose');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/FAQ');
var captchaRouter = require('./routes/captcha');


var app = express();

app.use(express.json());

app.post('/gethomepage', async (req, res) => {
  if (!req.body.captcha)
    return res.json({ success: false, msg: 'Please select captcha' });

  // Secret key
  const secretKey = '6LdpvDEUAAAAAHszsgB_nnal29BIKDsxwAqEbZzU';

  // Verify URL
  const query = stringify({
    secret: secretKey,
    response: req.body.captcha,
    remoteip: req.connection.remoteAddress
  });
  const verifyURL = `https://google.com/recaptcha/api/siteverify?${query}`;

  // Make a request to verifyURL
  const body = await fetch(verifyURL).then(res => res.json());

  // If not successful
  if (body.success !== undefined && !body.success)
    return res.json({ success: false, msg: 'Failed captcha verification' });

  // If successful
  return res.json({ success: true, msg: '' });
});


// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', captchaRouter);
app.use('/Home', indexRouter);
app.use('/FAQ', usersRouter);

app.post('/gpt3_5/completion', async (req, res) => {
  const API_KEY = process.env.OPENAI_API_KEY
  console.log("Hello im in the handler")
  const record = req.body.record || "";
  console.log(record)
  let systemText = `You're a GPT-based bot designed to enhance the readability and comprehensibility of medical records. The bot takes unstructured medical records as input and produces a refined version that is easier to read and understand. The bot's primary goal is to make medical records more accessible and user-friendly, improving patient outcomes and facilitating communication between healthcare providers. Furthermore if the input medical record does not appear to actually be a medical record, then request user to provide a proper medical record. Also the response has to be in the same language as the medical record provided.`
  let promt = `Write a detailed explanation of the following medical record for uneducated people. This description must also explain medical methods, techniques, operations, or other treatment options and treatment  courses mentioned in the record. Medical Record: "${record}". The response has to be in the same language as the medical record and it must be written in the same format as the given medical record, and please explain the medical thermonology.`

  if (!API_KEY) {
    res.status(500).json({
      error: {
        message: "OpenAI API key not configured correctly"
      }
    });
    return;
  }

  if (record.trim().length === 0) {
    res.status(400).json({
      error: {
        message: "Please enter a valid health record"
      }
    })
    return;
  }

  try {
    const messages = [];

    // add the system message
    const systemMessage = {
      role: "system",
      content: systemText
    };
    if (systemText.length > 0) {
      messages.push(systemMessage);
    }

    // add the user message
    const inputMessage = {
      role: "user",
      content: promt
    };
    if (record.length > 0) {
      messages.push(inputMessage);
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + API_KEY,
      },
      body: JSON.stringify({
        "model": "gpt-3.5-turbo",
        "messages": messages,
        "temperature": 0
      })
    });
    const responseJSON = await response.json()

    res.status(200).json({ result: responseJSON });
  } catch (error) {
    // Consider adjusting the error handling logic for your use case
    if (error.response) {
      console.error(error.response.status, error.response.data);
      res.status(error.response.status).json(error.response.data);
    } else {
      console.error(`Error with OpenAI API request: ${error.message}`);
      res.status(500).json({
        error: {
          message: 'An error occurred during your request.',
        }
      });
    }
  }
})

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

// Set up mongoose connection
mongoose.set("strictQuery", false);
const mongoDB = process.env.MONGOOSE_KEY;

main().catch((err) => console.log(err));
async function main() {
  await mongoose.connect(mongoDB);
}


module.exports = app;