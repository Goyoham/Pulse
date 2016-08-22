require('date-utils'); // npm install date-utils

var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var port = 3001;

var screen = {ws:0, we:640, hs:81, he:480};
var btn_clear = {ws:350, we:450, hs:15, he:55};
var TotalUser = 0;
var UserInfo = {};
var BALL_NUM_MAX = 3;

var serverTick = 0;
var startTime = 0;

var bulletList = [];
var MAX_BULLET = 50;

app.use(express.static(__dirname + '/'));
app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

http.listen(port, function(){
  console.log('listening on *:'+port);
});

io.on('connection', function(socket){
	UpdateUserConnection(socket, true);
	SendInit(io, socket);

	socket.on('click req', function(args){
		if( IsGameLayer(args['posx'].toFixed(), args['posy'].toFixed()) ){
			args['posx'] = args['posx'].toFixed();
			args['posy'] = args['posy'].toFixed() - 80;
			args['velx'] = ((Math.random() * 300) - 150).toFixed();
			args['vely'] = ((Math.random() * 300) - 150).toFixed();
			args['ballNum'] = UserInfo[GetUserKey(socket)];
			args['startTick'] = GetServerTick();
			bulletList.push(args);
			LogWithUserInfo(socket, 'clicked pos:' + args['posx'] + ',' + args['posy']
										 + ' vel:' + args['velx'] + ',' + args['vely']
										 + ' tick:' + args['startTick']
										 );
			if( bulletList.length < MAX_BULLET )
			{
				SendServerSync(io);
				io.emit('click ack', args);
			}
		}
		else if( IsButtonClear( args['posx'].toFixed(), args['posy'].toFixed()) ){
			bulletList = [];
			SendInit(io, socket, true);
		}
	});

	socket.on('disconnect', function(){
		UpdateUserConnection(socket, false);
	});

	TickServerSync(io);
});

Tick();

function SendInit(io, socket, isClear){
	serverTick = GetServerTick();
	SendServerSync(io);

	var initData = { serverTick: serverTick, bulletList: bulletList };
	if( isClear )
		io.emit('init', initData); // 전체 유저에게 보내기
	else
		socket.emit('init', initData); // 접속한 유저에게만 보내기
	LogWithUserInfo(socket, 'send init. bullet size:' + bulletList.length);
}

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
// --------------- check
function IsClicked(rect, posX, posY){
	if( posX < rect.ws || posX > rect.we )
		return false;

	if( posY < rect.hs || posY > rect.he )
		return false;

	return true;
}
function IsGameLayer(posX, posY){
	return IsClicked(screen, posX, posY);
}
function IsButtonClear(posX, posY){
	return IsClicked(btn_clear, posX, posY);
}
// --------------- timer
function GetDate(){
	var date = new Date();
	var ms = date.getMilliseconds();
	return date.toFormat('YY/MM/DD HH24:MI:SS.'+ms);
}

function GetServerTick(){
	var time = new Date();
	var t = time.getTime();
	return (t - startTime)/1000;
}

function SendServerSync(io){
	var args = {};
	args['serverTick'] = serverTick;
	io.emit('serverSync', args);
}

var TickTerm = 500;
function Tick(){
	var date = new Date();
	startTime = date.getTime();

	console.log('* Server Started Time : ' + GetDate());

	setInterval(function(){
		var time = new Date();
		var t = time.getTime();
		serverTick = GetServerTick();
		//console.log('tick : ' + serverTick);
	}, TickTerm);
}

function TickServerSync(io){
	setInterval(function(){
		SendServerSync(io);
	}, TickTerm);
}
// --------------- timer end

// ---------- create ball
function GetBallNum(){
	var mathRan = Math.random();
	var mult = Math.random() * BALL_NUM_MAX;
	var ran = mult.toFixed(); // 반올림된다
	var ran2 = Math.floor(mult); // 그래서 내림
	console.log('get ball : ' + ran2);
	return ran2;
}