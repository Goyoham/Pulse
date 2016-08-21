var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var port = 3001;

var TotalUser = 0;
var UserInfo = {};
var BALL_NUM_MAX = 3;

app.use(express.static(__dirname + '/'));
app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

http.listen(port, function(){
  console.log('listening on *:'+port);
});

io.on('connection', function(socket){
	UpdateUserConnection(socket, true);

	socket.on('click req', function(args){
		LogWithUserInfo(socket, 'clicked ' + args['posx'].toFixed() + ' ' + args['posy'].toFixed());
		args['velox'] = (Math.random() * 300) - 150;
		args['veloy'] = (Math.random() * 300) - 150;
		args['ballNum'] = UserInfo[GetUserKey(socket)];
		io.emit('click ack', args);
	});

	socket.on('disconnect', function(){
		UpdateUserConnection(socket, false);
	});
});

function LogWithUserInfo(socket, msg){
	var clientIp = socket.request.connection.remoteAddress;
  	var clientPort = socket.request.connection.remotePort;

  	console.log(msg
  				+ ' ('
				+ 'IP: ' + clientIp
				+ ' Port: ' + clientPort
				+ ')'
				);
}

function UpdateUserConnection(socket, isConnect){
	var msg;
	if( isConnect ){
		TotalUser += 1;
		msg = 'connected';
		UserInfo[GetUserKey(socket)] = GetBallNum();
	}
	else{
		TotalUser -= 1;
		msg = 'disconnected';
	}
  	var clientIp = socket.request.connection.remoteAddress;
  	var clientPort = socket.request.connection.remotePort;

	LogWithUserInfo(socket, 'a user ' + msg + ' (total: '+TotalUser+')');
	io.emit(msg, TotalUser);	
}

function GetUserKey(socket){
	var clientIp = socket.request.connection.remoteAddress;
  	var clientPort = socket.request.connection.remotePort;
	return clientIp+clientPort;
}

// ---------- create ball
function GetBallNum(){
	var mathRan = Math.random();
	var mult = Math.random() * BALL_NUM_MAX;
	var ran = mult.toFixed(); // 반올림된다
	var ran2 = Math.floor(mult); // 그래서 내림
	console.log('get ball : ' + mathRan + ' ' + mult + ' ' + ran + ' ' + ran2);
	return ran2;
}