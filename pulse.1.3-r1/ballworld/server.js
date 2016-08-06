var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var TotalUser = 0;
var UserInfo = {};
var UsingBall = [];
var BALL_NUM_MAX = 9;

app.use(express.static(__dirname + '/'));
app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

http.listen(3000, function(){
  console.log('listening on *:3000');
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
		ReturnBallNum( UserInfo[GetUserKey(socket)] );
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
	for(var i = 0; i < BALL_NUM_MAX; ++i){
		if( UsingBall[i] == true )
		{
			console.log('finding'+i+' '+UsingBall[i] );
			continue;
		}

		UsingBall[i] = true;
		console.log('get ball : ' + i);
		return i;
	}

	var ran = (Math.random() * BALL_NUM_MAX).toFixed() + 1;
	console.log('get ball : ' + ran);
	return ran;
}

function ReturnBallNum(num){
	UsingBall[num] = false;
	console.log('return ball : ' + num);
}