require('date-utils'); // npm install date-utils

var common = require('./common.js');
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var port = 3000;

var screen = {ws:0, we:640, hs:81, he:480};
var btn_clear = {ws:350, we:450, hs:15, he:55};
var TotalUser = 0; // 현재 동접
var AccUserCount = 0; // 누적 접속자 수
var UserInfo = {};
var BALL_NUM_MAX = 3;

var serverTick = 0;
var startTime = 0;

var bulletList = [];
var MAX_BULLET = 50;
var numOfBullet = 0;

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
			AddBullet(io, socket, args);
			/*
			args['posx'] = args['posx'].toFixed();
			args['posy'] = args['posy'].toFixed() - 80;
			args['velx'] = ((Math.random() * 300) - 150).toFixed();
			args['vely'] = ((Math.random() * 300) - 150).toFixed();
			args['ballNum'] = UserInfo[GetUserKey(socket)];
			args['startTick'] = GetServerTick();
			args['uid'] = GetBulletUID();
			
			if( numOfBullet < MAX_BULLET )
			{
				LogWithUserInfo(socket, 'clicked pos:' + args['posx'] + ',' + args['posy']
										 + ' vel:' + args['velx'] + ',' + args['vely']
										 + ' tick:' + args['startTick']
										 + ' uid:' + args['uid']
										 );
				bulletList.push(args);
				++numOfBullet;
				SendServerSync(io);
				io.emit('click ack', args);
			}
			*/
		}
		else if( IsButtonClear( args['posx'].toFixed(), args['posy'].toFixed()) ){
			ClearBullets(io, socket);
			/*
			bulletList = [];
			numOfBullet = 0;
			SendInit(io, socket, true);
			*/
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

function Log(msg){
	console.log('['+GetDate()+'] '+ msg);
}

function UpdateUserConnection(socket, isConnect){
	var msg;
	if( isConnect ){
		TotalUser += 1;
		AccUserCount += 1;
		msg = 'connected';
		UserInfo[GetUserKey(socket)] = GetBallNum();
	}
	else{
		TotalUser -= 1;
		msg = 'disconnected';
	}
  	var clientIp = socket.request.connection.remoteAddress;
  	var clientPort = socket.request.connection.remotePort;

	LogWithUserInfo(socket, 'a user ' + msg + ' (total: '+TotalUser+', whole: ' + AccUserCount + ')');
	var data = {TotalUser: TotalUser, AccUserCount: AccUserCount};
	io.emit(msg, data);	
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

//var TickTerm = 500;
function Tick(){
	var date = new Date();
	startTime = date.getTime();

	console.log('* Server Started Time : ' + GetDate());

	setInterval(function(){
		var time = new Date();
		var t = time.getTime();
		serverTick = GetServerTick();
		//console.log('tick : ' + serverTick);
		CheckCollision();
	}, 30);
}

function TickServerSync(io){
	setInterval(function(){
		SendServerSync(io);
	}, 500);
}
// --------------- timer end

// ---------- create bullet
function AddBullet(io, socket, args){
	var newIndex = CreateBullet();
	if( newIndex < 0 )
		return;

	args['posx'] = args['posx'].toFixed();
	args['posy'] = args['posy'].toFixed() - 80;
	args['velx'] = ((Math.random() * 300) - 150).toFixed();
	args['vely'] = ((Math.random() * 300) - 150).toFixed();
	args['ballNum'] = UserInfo[GetUserKey(socket)];
	args['startTick'] = GetServerTick();
	args['uid'] = newIndex;
	LogWithUserInfo(socket, 'clicked pos:' + args['posx'] + ',' + args['posy']
							 + ' vel:' + args['velx'] + ',' + args['vely']
							 + ' tick:' + args['startTick']
							 + ' uid:' + args['uid']
							 );
	if( newIndex >= bulletList.length )
		bulletList.push(args);
	else
		bulletList[newIndex] = args;
	++numOfBullet;
	SendServerSync(io);
	io.emit('click ack', args);
}

function RemoveBullet(index){
	if( IsExistBullet(index) === false )
		return;
	bulletList[index]['uid'] = -1;
	--numOfBullet;
	args = {index: index};
	io.emit('remove bullet', args);
	Log('remove bullet index : ' + index);
}

function ClearBullets(io, socket){
	bulletList = [];
	numOfBullet = 0;
	SendInit(io, socket, true);
	LogWithUserInfo(socket, 'clear bullets');
}

function CreateBullet(){
	if( numOfBullet >= MAX_BULLET )
		return -1;

	for(var i = 0; i < bulletList.length; ++i){
		if( bulletList[i].uid < 0 )
			return i;
	}
	return bulletList.length;
}

function GetBallNum(){
	var mathRan = Math.random();
	var mult = Math.random() * BALL_NUM_MAX;
	var ran = mult.toFixed(); // 반올림된다
	var ran2 = Math.floor(mult); // 그래서 내림
	console.log('get ball : ' + ran2);
	return ran2;
}

function IsExistBullet(index){
	if( index >= bulletList.length )
		return false;
	//console.log(index + ' ' + bulletList.length);
	if( bulletList[index].uid < 0 )
		return false;
	return true;
}

function IsSameBullet(indexA, indexB){
	if(IsExistBullet(indexA) === false)
		return false;
	if(IsExistBullet(indexB) === false)
		return false;
	return bulletList[indexA].ballNum === bulletList[indexB].ballNum;
}

function GetBulletPosition(index){
	var startPos = {x: bulletList[index].posx, y: bulletList[index].posy };
	var vel = {x: bulletList[index].velx, y: bulletList[index].vely };
	var tick = serverTick - bulletList[index].startTick;
	return common.GetPosition(tick, startPos, vel);
}

function CheckCollision(){
	for(var ti = 0; ti < bulletList.length - 1; ++ti){
		if( IsExistBullet(ti) === false )
			continue;
		for(var di = ti + 1; di < bulletList.length; ++di){
			if( IsExistBullet(di) === false )
				continue;
			if( IsSameBullet(ti, di))
				continue;			

			var aPos = GetBulletPosition(ti);
			var bPos = GetBulletPosition(di);
			if( common.IsOnCollision( aPos, bPos ) ){
			//if( common.IsOnCollision( GetBulletPosition(ti), GetBulletPosition(di) ) ){
				console.log('on collision ' + serverTick + ' ' + aPos.x+','+aPos.y + ' ' + bPos.x+','+bPos.y);
				RemoveBullet(ti);
				RemoveBullet(di);
				break;
			}
		}
	}
}