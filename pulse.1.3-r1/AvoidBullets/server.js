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
var BulletInfo = {};
var BALL_NUM_MAX = 3;

var serverTick = 0;
var startTime = 0;

var bulletList = [];
var MAX_BULLET_TYPE = [10, 10, 10, 10]; // mine, enemy, base1, base2
var numOfBullet = 0;
var numOfBulletByType = [0, 0, 0, 0];

// rank
var bestScore = [];

app.use(express.static(__dirname + '/'));
app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

http.listen(port, function(){
  console.log('listening on *:'+port);
});

// 유저 접속 시 받는 패킷
io.on('connection', function(socket){
	UpdateUserConnection(socket, true);
	SendInit(io, socket);

	// 유저가 클릭 이벤트 발생 시 받는 패킷. x, y 좌표를 받아서 그에 맞는 동작을 수행.
	socket.on('click req', function(args){
		// 게임 레이어 클릭이면, 총알을 추가.
		if( IsGameLayer(args['posx'].toFixed(), args['posy'].toFixed()) ){
			if( args.uid >= 0 )
			{
				// user key와 bullet uid가 동일해야, 내 총알이므로 조작 가능.
				if( UserInfo[GetUserKey(socket)] == args.uid )
					MoveBullet(args);
			}
			else
			{
				AddBullet(common.BULLET_TYPE_MINE, args, socket);
			}
		}
		// clear 버튼을 클릭했으면, clear 수행.
		else if( IsButtonClear( args['posx'].toFixed(), args['posy'].toFixed()) ){
			//ClearBullets(io, socket);
		}
	});

	// 유저 접속 종료 시 처리
	socket.on('disconnect', function(){
		UpdateUserConnection(socket, false);
	});

	socket.on('new score', function(args){
		CheckBestScore(socket, args);
	});

	socket.on('check collision', function(args){
		console.log(args.ti + ' ' + bulletList[args.ti].reservedToRemove + ' ' + args.collisionTick);
		console.log(args.di + ' ' + bulletList[args.di].reservedToRemove + ' ' + args.collisionTick);
		if( bulletList[args.ti].reservedToRemove === false || bulletList[args.di].reservedToRemove === false ){
			var aPos = GetBulletPosition(args.ti, args.collisionTick);
			var bPos = GetBulletPosition(args.di, args.collisionTick);
			console.log('check collision : ' + aPos.x+' '+aPos.y+','+bPos.x+' '+bPos.y);
			if( common.IsOnCollision( aPos, bPos ) ){
				console.log('onCollision!!');
			}
		}
	});

	TickServerSync(io);
});

Tick();

var lastCheckedCollisionTick = 0;
// 서버 틱 계산
function Tick(){
	var date = new Date();
	startTime = date.getTime();

	console.log('* Server Started Time : ' + GetDate());

	/* // tick 도는 시간 검사용 로그
	var checkTickCount = 0;
	var checkTickTime = 0;
	var lastTick = 0;
	*/

	// setInterval은 특정 시간마다 특정 함수를 호출.
	// 아래 함수를 20ms마다 호출한다.
	setInterval(function(){
		var time = new Date();
		var t = time.getTime();
		serverTick = GetServerTick();
		
		while( lastCheckedCollisionTick < serverTick )
		{
			CheckCollision( lastCheckedCollisionTick );
			lastCheckedCollisionTick = 1*(lastCheckedCollisionTick + common.CHECK_COLLISION_TICK_TERM).toFixed(3);
		}
		
		/* // tick 도는 시간 검사용 로그
		++checkTickCount;
		checkTickTime += (serverTick - lastTick);
		lastTick = serverTick;
		if( checkTickTime > 5 )
		{
			console.log('avg : ' + (checkTickTime / checkTickCount) );
			checkTickTime = 0;
			checkTickCount = 0;
		}
		*/
	}, 10);

	// n초마다 BASE BULLET 생성
	setInterval(function(){CreateBaseBullet(common.BULLET_TYPE_BASE1)}, 500);
	setInterval(function(){CreateBaseBullet(common.BULLET_TYPE_BASE2)}, 1000);
}

// 유저 최초 접속 시 처리. 기본적으로 전체 총알 데이터와 서버tick정보를 보낸다.
function SendInit(io, socket, isClear){
	serverTick = GetServerTick();
	SendServerSync(io);

	var initData = {};
	initData.serverTick = serverTick;
	initData.collisionTick = lastCheckedCollisionTick;
	initData.bulletList = bulletList;
	if( isClear )	// clear버튼 누른거라면,
		io.emit('init', initData); // 전체 유저에게 보내기
	else			// 그게 아니면 최초 접속
		socket.emit('init', initData); // 접속한 유저에게만 보내기
	LogWithUserInfo(socket, 'send init. bullet size:' + bulletList.length);

	SendBestScore();
}

function SendCreatedYourBullet(socket, uid){
	var args = {uid: uid};
	socket.emit('created your bullet', args);
}

// 유저 정보를 포함한 콘솔 로그 출력용 함수. socket에서 유저IP 및 포트를 추출한다.
function LogWithUserInfo(socket, msg){
	var clientIp = socket.request.connection.remoteAddress;
  	var clientPort = socket.request.connection.remotePort;

  	console.log(
  				'['+GetDate()+'] '+ msg
  				+ ' ('
				+ 'IP: ' + clientIp
				+ ' Port: ' + clientPort
				+ ' SocketID: ' + socket.id
				+ ')'
				);
}

// 유저 정보를 제외한 콘솔 로그 출력용 함수.
function Log(msg){
	console.log('['+GetDate()+'] '+ msg);
}

// 유저 접속 또는 접속종료시 처리 함수. 로그를 남기고 클라 전체에 패킷을 보낸다.
function UpdateUserConnection(socket, isConnect){
	var msg;
	if( isConnect ){
		TotalUser += 1;
		AccUserCount += 1;
		msg = 'connected';
		//UserInfo[GetUserKey(socket)] = GetBallNum();
	}
	else{
		TotalUser -= 1;
		msg = 'disconnected';
	}

	LogWithUserInfo(socket, 'a user ' + msg + ' (total: '+TotalUser+', whole: ' + AccUserCount + ')');
	var data = {TotalUser: TotalUser, AccUserCount: AccUserCount};
	io.emit(msg, data);	
}

// 유저 IP 및 포트 조합을 유저 UNIQUE KEY로 사용한다.
// 하지만 동일한 PC에서 접속시 동일한 IP 및 포트로 접속이 되어서, 여기다가 SOCKET ID같은걸 더 붙여야 할 것 같다.
function GetUserKey(socket){
	var clientIp = socket.request.connection.remoteAddress;
  	var clientPort = socket.request.connection.remotePort;
	return clientIp+clientPort+socket.id;
}
// --------------- check
// 클릭 검사
function IsClicked(rect, posX, posY){
	if( posX < rect.ws || posX > rect.we )
		return false;

	if( posY < rect.hs || posY > rect.he )
		return false;

	return true;
}
// 게임 레이어 클릭 검사
function IsGameLayer(posX, posY){
	return IsClicked(screen, posX, posY);
}
// 클리어 버튼 클릭 검사
function IsButtonClear(posX, posY){
	return IsClicked(btn_clear, posX, posY);
}
// --------------- timer
// 현재 시간 스트링 리턴
function GetDate(){
	var date = new Date();
	var ms = date.getMilliseconds();
	return date.toFormat('YY/MM/DD HH24:MI:SS.'+ms);
}

// 현재 서버 틱 데이터 받기
function GetServerTick(){
	var time = new Date();
	var t = time.getTime();
	return (t - startTime)/1000;
}

// 서버 클라 TICK 싱크를 위해, 클라 전체로 서버 TICK 데이터 BROADCAST
function SendServerSync(io){
	var args = {};
	args['serverTick'] = serverTick;
	io.emit('serverSync', args);
}

// 500ms 마다 정기적으로 서버에서 클라로 tick을 보낸다.
function TickServerSync(io){
	setInterval(function(){
		SendServerSync(io);
	}, 500);
}
// --------------- timer end

// ---------- create bullet
// 총알 생성. 클릭 위치에 생성하고, 랜덤한 방향 및 속도를 정한다.
function AddBullet(BULLET_TYPE, args, socket){
	if( numOfBulletByType[BULLET_TYPE] >= MAX_BULLET_TYPE[BULLET_TYPE])
		return;

	var newIndex = CreateBullet();
	if( newIndex < 0 )
		return;

	args['posx'] = args['posx'].toFixed();
	args['posy'] = args['posy'].toFixed() - 80;
	if( BULLET_TYPE === common.BULLET_TYPE_MINE )
	{
		args['velx'] = 0;
		args['vely'] = 0;
	}
	else
	{
		args['velx'] = ((Math.random() * 300) - 150).toFixed();
		args['vely'] = ((Math.random() * 300) - 150).toFixed();
	}
	args['ballNum'] = BULLET_TYPE;
	args['startTick'] = GetServerTick();
	args['uid'] = newIndex;
	if( BULLET_TYPE == common.BULLET_TYPE_MINE )
	{
		Log('clicked pos:' + args['posx'] + ',' + args['posy']
				 + ' vel:' + args['velx'] + ',' + args['vely']
				 + ' tick:' + args['startTick']
				 + ' uid:' + args['uid']
				 );
	}
	if( newIndex >= bulletList.length )
		bulletList.push(args);
	else
		bulletList[newIndex] = args;
	++numOfBullet;
	++numOfBulletByType[BULLET_TYPE];
	SendServerSync(io);
	if( typeof socket !== 'undefined'){		
		UserInfo[GetUserKey(socket)] = newIndex;
		BulletInfo[newIndex] = GetUserKey(socket);
		SendCreatedYourBullet(socket, newIndex);
	}
	io.emit('click ack', args);
	console.log('add bullet uid:' + newIndex + ', startTick:' + args.startTick);
	return newIndex;
}

function CalcVelocity(myPos, toPos){
	return toPos - myPos;
}

function MoveBullet(args){
	if( args.uid < 0 )
		return;

	var bullet = bulletList[args.uid];
	var nowPos = GetBulletPosition(args.uid);
	bulletList[args.uid].posx = nowPos.x;
	bulletList[args.uid].posy = nowPos.y - 80;
	bulletList[args.uid].velx = CalcVelocity(nowPos.x, args.posx);
	bulletList[args.uid].vely = CalcVelocity(nowPos.y, args.posy);
	bulletList[args.uid].startTick = GetServerTick();

	io.emit('move bullet', bulletList[args.uid]);
}

// CREATE BASE BULLET
var CreateBaseBullet = function(type){
	var args = {};
	if( type === common.BULLET_TYPE_BASE1 )
		args = {posx: 5, posy: 85};
	else if( type === common.BULLET_TYPE_BASE2 )
		args = {posx: 635, posy: 85};

	AddBullet(type, args);
}

// 총알 제거 예약 0.3초 후.
function ReserveToRemoveBullet(index){
	if( IsExistBullet(index) === false )
		return;
	bulletList[index].reservedToRemove = true;
	bulletList[index].reservedTickToRemove = lastCheckedCollisionTick;
}

function IsReservedToRemove(index){
	if( IsExistBullet(index) === false )
		return;
	if( bulletList[index].reservedToRemove === true )
		return true;
	return false;
}

// 삭제 예약 시간이 되었다.
function IsTimeToRemove(index){
	if( IsReservedToRemove(index) === false )
		return false;
	var removeTick = GetServerTick();
	if( removeTick >= (bulletList[index].reservedTickToRemove + 1)*1 )
		return true;
	return false;
}

// 총알 제거. 
function RemoveBullet(index){
	if( IsExistBullet(index) === false )
		return;	

	var args = {};
	args.index = index;
	args.removedTick = bulletList[index].reservedTickToRemove;
	io.emit('remove bullet', args);

	bulletList[index]['uid'] = -1;
	--numOfBullet;
	--numOfBulletByType[bulletList[index]['ballNum']];

	if( bulletList[index]['uid'].ballNum == common.BULLET_TYPE_MINE )
	{
		Log('remove bullet index : ' + index);
		var userKey = BulletInfo[index];
		UserInfo[userKey] = -1;
	}
}

// 총알 모두 제거.
function ClearBullets(io, socket){
	bulletList = [];
	numOfBullet = 0;
	numOfBulletByType[common.BULLET_TYPE_MINE] = 0;
	numOfBulletByType[common.BULLET_TYPE_BASE1] = 0;	
	numOfBulletByType[common.BULLET_TYPE_BASE2] = 0;
	SendInit(io, socket, true);
	LogWithUserInfo(socket, 'clear bullets');
}

// 총알 index 생성. 중복되지 않는 uid 생성을 위함.
function CreateBullet(){
	if( numOfBullet >= common.MAX_BULLET )
		return -1;

	for(var i = 0; i < bulletList.length; ++i){
		if( bulletList[i].uid >= 0 )
			continue;
		// 삭제 5초 후 UID 다시 사용 가능.
		if( bulletList[i].reservedTickToRemove + 5 > GetServerTick() )
			continue;
		return i;
	}
	return bulletList.length;
}

// 총알 종류 랜덤으로 받기.
function GetBallNum(){
	var mathRan = Math.random();
	var mult = Math.random() * BALL_NUM_MAX;
	var ran = mult.toFixed(); // 반올림된다
	var ran2 = Math.floor(mult); // 그래서 내림
	console.log('get ball : ' + ran2);
	return ran2;
}

// 총알 index로, 현재 실존하는 총알인지 검사.
function IsExistBullet(index){
	if( index >= bulletList.length )
		return false;
	//console.log(index + ' ' + bulletList.length);
	if( bulletList[index].uid < 0 )
		return false;
	return true;
}

// 동일한 색깔의 총알인지 검사.
function IsSameBullet(indexA, indexB){
	if(IsExistBullet(indexA) === false)
		return false;
	if(IsExistBullet(indexB) === false)
		return false;
	if( bulletList[indexA].ballNum === common.BULLET_TYPE_MINE )
		return false;
	if( bulletList[indexB].ballNum === common.BULLET_TYPE_MINE )
		return false;
	return bulletList[indexA].ballNum === bulletList[indexB].ballNum;
}

// 현재 총알의 위치 계산
function GetBulletPosition(index, collisionTick){
	var startPos = {x: bulletList[index].posx, y: bulletList[index].posy };
	var vel = {x: bulletList[index].velx, y: bulletList[index].vely };
	if( typeof collisionTick === 'undefined' )
		collisionTick = serverTick;
	var tick = collisionTick - bulletList[index].startTick;
	return common.GetPosition(tick, startPos, vel);
}

// 총알 전체를 루프 돌면서 충돌한 총알이 있는지 검사.
// 이렇게 루프를 다 돌아버려도 되는건지 의문이다.
function CheckCollision(collisionTick){
	var log = false;
	var vec1 = [];
	for(var ti = 0; ti < bulletList.length - 1; ++ti){
		if( IsExistBullet(ti) === false )
			continue;
		
		// 충돌 검사 전에 삭제예약한 친구는 제외. 삭제 시간 되었으면 삭제도 하자.		
		if( IsReservedToRemove(ti) ){
			if( IsTimeToRemove(ti) ){
				RemoveBullet(ti);
			}
			continue;
		}

		vec1.push(ti);
		var vec2 = [];
		for(var di = ti + 1; di < bulletList.length; ++di){
			if( IsExistBullet(di) === false )
				continue;
			if( IsSameBullet(ti, di))
				continue;
			if( IsReservedToRemove(di) )
				continue;

			vec2.push(di);
			var aPos = GetBulletPosition(ti, collisionTick);
			var bPos = GetBulletPosition(di, collisionTick);
			if( common.IsOnCollision( aPos, bPos ) ){
				//RemoveBullet(ti);
				//RemoveBullet(di);
				ReserveToRemoveBullet(ti);
				ReserveToRemoveBullet(di);
				console.log('remove : ' + ti + ' ' + di + ' ct:' + collisionTick);
				log = true;
				//console.log('vec di : ' + vec2);
				break;
			}
		}
	}
	//if( log === true )
	//  console.log('vec ti : ' + vec1);
}

// rank
var MaxRankSize = 10;
function CheckBestScore(socket, args){
	// 1. user 인증

	// 2. 랭크 계산
	var bNewScore = false;
	var rankData = {nickname: socket.request.connection.remoteAddress, score: args.score};
	console.log('check score ' + rankData.score + ' ' + rankData.nickname);
	if( bestScore.length < MaxRankSize ){
		bestScore.push(rankData);
		bNewScore = true;
	}
	else{
		rankData.score *= 1;
		bestScore[MaxRankSize-1].score *= 1;
		if(rankData.score > bestScore[MaxRankSize-1].score)
		{
			bestScore.push(rankData);
			bNewScore = true;
		}
	}

	if( bNewScore ){
		bestScore.sort(function(a, b){return b.score-a.score});
		if( bestScore.length > MaxRankSize )
			bestScore.length = MaxRankSize;
		SendBestScore();
		Log('new score ' + rankData.score);
	}
}

// best score가 갱신 되면, 클라로 전달
function SendBestScore(){
	io.emit('new best score', bestScore);
}