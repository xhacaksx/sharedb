const express = require('express');
const http = require('http');
const ShareDB = require('sharedb');
const richText = require('rich-text');
const WebSocket = require('ws');
const WebSocketJSONStream = require('@teamwork/websocket-json-stream');
const ShareDBMongo = require('sharedb-mongo');
const uuid = require('uuid');
const mime = require('mime');

ShareDB.types.register(richText.type);

const backend = new ShareDB({
  db: new ShareDBMongo('mongodb+srv://akshat:akshat@collab-test.9cngcdw.mongodb.net/?retryWrites=true&w=majority')
});

function createDoc(callback) {
  const connection = backend.connect();
  const docId = uuid.v4();
  const doc = connection.get('documents', docId);
  doc.fetch(function (err) {
    if (err) throw err;
    if (doc.type === null) {
      doc.create([{ insert: 'Hi!' }], 'rich-text', function () {
        callback(docId);
      });
      return;
    }
    callback(docId);
  });
  console.log('Yes');
}

function startServer() {
  const app = express();
  app.use(express.static('static'));
  app.use(express.static('node_modules/quill/dist'));

  app.get('*.js', function (req, res, next) {
    res.setHeader('Content-Type', mime.getType('js'));
    next();
  });

  app.get('/create-new-document', function (req, res) {
    createDoc(function (newDocId) {
      res.redirect('/?docId=' + newDocId);
    });
  });

  const server = http.createServer(app);

  const wss = new WebSocket.Server({ server });
  wss.on('connection', function (ws) {
    const stream = new WebSocketJSONStream(ws);
    backend.listen(stream);
  });

  const port = process.env.PORT || 8080;
  server.listen(port, () => {
    console.log(`Listening on port ${port}`);
  });
}

startServer();
