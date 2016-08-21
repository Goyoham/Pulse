require('date-utils'); // npm install date-utils

var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var port = 3001;

var TotalUser = 0;
var UserInfo = {};
var BALL_NUM_MAX = 3;

var serverTick = 0;
var startTime = 0;

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
		args['posx'] = args['posx'].toFixed();
		args['posy'] = args['posy'].toFixed() - 80;
		args['velx'] = ((Math.random() * 300) - 150).toFixed();
		args['vely'] = ((Math.random() * 300) - 150).toFixed();
		args['ballNum'] = UserInfo[GetUserKey(socket)];
		args['startTick'] = serverTick;
		LogWithUserInfo(socket, 'clicked pos:' + args['posx'] + ',' + args['posy']
									 + ' vel:' + args['velx'] + ',' + args['vely'] );						
		io.emit('click ack', args);
	});

	socket.on('disconnect', function(){
		UpdateUserConnection(socket, false);
	});

	SendServerSync(socket);
});

Tick();

function LogWithUserInfo(socket, msg){
	var clientIp = socket.request.connection.remoteAddress;
  	var clientPort = socket.request.connection.remotePort;

  	console.log(
  				'['+GetDate()+'] '+ msg
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

// --------------- timer
function GetDate(){
	var date = new Date();
	var ms = date.getMilliseconds();
	return date.toFormat('YY/MM/DD HH24:MI:SS.'+ms);
}
function Tick(){
	var date = new Date();
	startTime = date.getTime();

	console.log('* Server Started Time : ' + GetDate());

	setInterval(function(){
		var time = new Date();
		var t = time.getTime();
		serverTick = Math.floor((t - startTime)/1000);
		//console.log('tick : ' + serverTick);
	}, 1000);
}
// --------------- timer end

function SendServerSync(socket){
	setInterval(function(){
		var args = {};
		args['serverTick'] = serverTick;
		io.emit('serverSync', args);
	}, 1000);
}

// ---------- create ball
function GetBallNum(){
	var mathRan = Math.random();
	var mult = Math.random() * BALL_NUM_MAX;
	var ran = mult.toFixed(); // 반올림된다
	var ran2 = Math.floor(mult); // 그래서 내림
	console.log('get ball : ' + ran2);
	return ran2;
}