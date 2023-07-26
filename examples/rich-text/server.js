var http = require('http');
var express = require('express');
var ShareDB = require('sharedb');
var richText = require('rich-text');
var WebSocket = require('ws');
var WebSocketJSONStream = require('@teamwork/websocket-json-stream');
var ShareDBMongo = require('sharedb-mongo');
var uuid = require('uuid');
// var mime = require('mime');
const config = require('./config');
ShareDB.types.register(richText.type);


var backend = new ShareDB({
  db: new ShareDBMongo(config.mongodbUrl)
});
createDoc(startServer);

// Create initial document then fire callback
function createDoc(callback) {
  var connection = backend.connect();
  var docId = uuid.v4();
  var doc = connection.get('documents', docId);
  doc.fetch(function(err) {
    if (err) throw err;
    if (doc.type === null) {
      doc.create([{insert: 'Hi!'}], 'rich-text', function() {
        callback(docId);
      });
      return;
    }
    callback(docId);
  });
  console.log('YEs');
}

function startServer() {
  // Create a web server to serve files and listen to WebSocket connections
  var app = express();
  app.use(express.static('static'));
  app.use(express.static('node_modules/quill/dist'));

  // Set the correct Content-Type header for JavaScript files
  // app.get('*.js', function (req, res, next) {
  //   res.setHeader('Content-Type', mime.getType('js'));
  //   next();
  // });
  // Route to handle create-new-document request
  app.get('/create-new-document', function(req, res) {
    // Generate a new document ID using uuid
    var newDocId = uuid.v4();

    // Create the document in the database (using ShareDB)
    var connection = backend.connect();
    var doc = connection.get('documents', newDocId);
    doc.create([{insert: 'Hi!'}], 'rich-text', function(err) {
      if (err) {
        console.error('Error creating a new document:', err);
        res.status(500).json({error: 'Error creating a new document'});
      } else {
        // Return the new document ID as a JSON response
        res.json({docId: newDocId});
      }
    });
  });
  var server = http.createServer(app);


  

  // Connect any incoming WebSocket connection to ShareDB
  var wss = new WebSocket.Server({server: server});
  wss.on('connection', function(ws) {
    var stream = new WebSocketJSONStream(ws);
    backend.listen(stream);
  });

  const port = process.env.PORT || 8080;
server.listen(port, () => {
  console.log(`Listening on port ${port}`);
});

}
