/* eslint-disable quote-props */
var ReconnectingWebSocket = require('reconnecting-websocket');
var sharedb = require('sharedb/lib/client');
var richText = require('rich-text');
var Quill = require('quill');

sharedb.types.register(richText.type);

function getDocumentIdFromURL() {
  var searchParams = new URLSearchParams(window.location.search);
  return searchParams.get('docId');
}

function createNewDocument(callback) {
  // You can customize the URL for creating a new document on the server
  console.log("Entered");
  fetch('/create-new-document')
    .then(function(response) {
      return response.json();
    })
    .then(function(data) {
      //console.log('New document created with ID:', data.docId);
      callback(data.docId);
    })
    .catch(function(error) {
      //console.error('Error creating a new document:', error);
    });
}
function setupDocument(docId) {
  // Open WebSocket connection to ShareDB server
  var socket = new ReconnectingWebSocket('ws://' + window.location.host, [], {
  // ShareDB handles dropped messages, and buffering them while the socket
  // is closed has undefined behavior
    maxEnqueuedMessages: 0
  });
  var connection = new sharedb.Connection(socket);

  // For testing reconnection
  window.disconnect = function() {
    connection.close();
  };
  window.connect = function() {
    var socket = new ReconnectingWebSocket('wss://' + window.location.host, [], {
    // ShareDB handles dropped messages, and buffering them while the socket
    // is closed has undefined behavior
      maxEnqueuedMessages: 0
    });
    connection.bindToSocket(socket);
  };

  var toolbarOptions = [
    ['bold', 'italic', 'underline', 'strike'], ['blockquote', 'code-block'],
    [{'header': 1}, {'header': 2}],
    [{'list': 'ordered'}, {'list': 'bullet'}],
    [{'script': 'sub'}, {'script': 'super'}],
    [{'indent': '-1'}, {'indent': '+1'}],
    [{'direction': 'rtl'}],
    [{'size': ['small', false, 'large', 'huge']}],
    [{'header': [1, 2, 3, 4, 5, 6, false]}],
    [{'color': []}, {'background': []}],
    [{'align': []}],
    ['clean']
  ];

  // Create local Doc instance mapped to 'examples' collection document with id 'richtext'
  var doc = connection.get('documents', docId);

  // event-handler
  doc.subscribe(function(err) {
    if (err) {
      console.log(err);
      return;
    }
    var quill= new Quill('#editor', {
      modules: {
        history: {
          delay: 2000,
          maxStack: 500,
          userOnly: true
        },
        toolbar: toolbarOptions
      },
      delay: 2300,
      theme: 'snow'
    });


    quill.setContents(doc.data);


    quill.on('text-change', function(delta, oldDelta, source) {
      if (source !== 'user') return;
      // sends the opeartion
      doc.submitOp(delta, {source: quill});
    });

    // when opeartion are recieved
    doc.on('op', function(op, source) {
      if (source === quill) return;
      quill.updateContents(op);
      console.log(op);
    });
  });
}

// var docId = getDocumentIdFromURL();
// if (docId) {
//   setupDocument(docId);
// } else {
//   createNewDocument(function(newDocId) {
//     setupDocument(newDocId);
//   });
// }

var docId = getDocumentIdFromURL();

if (docId) {
  // If the document ID is present in the URL, set up the document
  setupDocument(docId);
  console.log("1");
} else {
  console.log("2");
  // If the document ID is not present in the URL, create a new document
  createNewDocument(function(newDocId) {
    // Redirect to the new URL with the document ID as a query parameter
    var newUrl = window.location.origin + '/?docId=' + newDocId;
    window.location.href = newUrl;
  });
  
}
