var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.use(express.static(__dirname + '/'));
app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

http.listen(3000, function(){
  console.log('listening on *:3000');
});

io.on('connection', function(socket){
	console.log('a user connected');

	socket.on('click req', function(args){
		console.log('clicked ' + args[0] + ' ' + args[1]);
		io.emit('click ack', args);
	});

	socket.on('disconnect', function(){
		console.log('a user disconnected');
	});
});