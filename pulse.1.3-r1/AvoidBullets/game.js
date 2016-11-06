var socket = io();

var serverTick = 0;
var numOfBullet = 0;
var MAX_BULLET = 50;

var MyBulletUID = -1;

var SCREEN_WIDTH = screen.we; //640
var SCREEN_HEIGHT = screen.he;//480
var SCREEN_TERM_TOP = screen.hs - 1;//79
var SCREEN_GAME_WIDTH = SCREEN_WIDTH;//640
var SCREEN_GAME_HEIGHT = SCREEN_HEIGHT - SCREEN_TERM_TOP;//400

var MOUSE_EVENT_DOWN = false;
var MOUSE_EVENT_INTERVAL = true;

var myScore = 0;
var myBestScore = 0;
var serverBestScores = [];

pulse.ready(function() {
   if( window.innerWidth < SCREEN_WIDTH
      && window.innerHeight > window.innerWidth){
       alert("가로모드로 플레이 하세요!");
   }

   // GameEngine 기본 처리 시작 -------------------------
   var gane_engine = new pulse.Engine( { gameWindow: 'game-window', size: { width: SCREEN_WIDTH, height: SCREEN_HEIGHT+500 } } );
   var game_scene = new pulse.Scene();
   var game_layer = new pulse.Layer();
   game_layer.anchor = { x: 0, y: 0 };

   var background = new pulse.Sprite( {
      src: 'imgs/block.png',
      physics: {
         basicShape : 'box',
         isStatic : true
      },
      size : { width: SCREEN_WIDTH, height: SCREEN_GAME_HEIGHT }
   });
   background.position = { x: SCREEN_WIDTH/2, y: SCREEN_GAME_HEIGHT/2+SCREEN_TERM_TOP };
   game_layer.addNode(background);

   game_scene.addLayer(game_layer);
   gane_engine.scenes.addScene(game_scene);

   gane_engine.scenes.activateScene(game_scene);
   // GameEngine 기본 처리 끝 -------------------------

   // 마우스 클릭 시 서버로 req 전송
   game_layer.events.bind('mousedown', function(args) {
      MOUSE_EVENT_DOWN = true;
      SendMouseEvent(args, 50);
   });

   game_layer.events.bind('mouseup', function(args) {
      MOUSE_EVENT_DOWN = false;
      MOUSE_EVENT_INTERVAL = true;
   });

   game_layer.events.bind('mousemove', function(args) {
      if( MOUSE_EVENT_DOWN === false )
         return;
      //console.log(args);
      SendMouseEvent(args, 100);
   });

   // 최초로 텍스트 그려줌
   DrawNumOfBullet(game_layer);
   //DrawButtonClear(game_layer);
   DrawServerBestScore(game_layer);

   // 유저 접속시 패킷 받기
   socket.on('connected', function(data){
      AddAndDrawUserCount(game_layer, data);
   });

   // 유저 접속시 또는 새로고침시 전체 총알 위치 데이터 받기
   socket.on('init', function(initData){
      serverTick = initData.serverTick;
      var bulletList = initData.bulletList;
      ClearBullet(game_layer);
      var length = bulletList.length;
      for(var i = 0; i < length; ++i)
         AddBullet(game_layer, bulletList[i]);
   });

   // 유저 접속 종료시 패킷 받기
   socket.on('disconnected', function(data){
      AddAndDrawUserCount(game_layer, data);
   });

   // 클릭으로 총알 생성시 ack 받기
   socket.on('click ack', function(args){
      AddBullet(game_layer, args);
   });

   socket.on('created your bullet', function(args){
      SetMyBulletUID(args.uid);
      ResetMyScore();
   });

   // 클릭으로 내 총알 이동
   socket.on('move bullet', function(args){
      console.log('move bullet ' + args.uid);
      ChangeBulletVelocity(game_layer, args);
   });   

   // 총알 지우기 패킷 받기
   socket.on('remove bullet', function(args){
      RemoveBullet(game_layer, args.index);
   });

   // 서버 틱 패킷 받기
   socket.on('serverSync', function(args){
      serverTick = args['serverTick'];
      DrawServerTick(game_layer);
      SyncBulletsPosition(game_layer);
   });

   // best score 받기
   socket.on('new best score', function(newBestScore){
      serverBestScores = newBestScore;
      DrawServerBestScore(game_layer);
   });

   // 30ms 마다 다시 그린다.
   gane_engine.go(30);

   setInterval(function(){
      CheckMyScore(30);
      DrawMyScore(game_layer);
   }, 30);
});

function SendMouseEvent(args, interval){
   if( MOUSE_EVENT_INTERVAL === false )
      return;

   socket.emit('click req', { 
      posx: args.position.x
      , posy: args.position.y
      , uid: MyBulletUID
   });

   MOUSE_EVENT_INTERVAL = false;
   setTimeout(function(){
      MOUSE_EVENT_INTERVAL = true;
   }, interval);
}

// 랭크를 위한 내 기록 서버로 전달
function SendMyScore(){
   var args = { uid: MyBulletUID, score: GetMyScore() };
   console.log('send my score : ' + args.score);
   socket.emit('new score', args);
}

// 내 총알 UID SET
function SetMyBulletUID(uid){
   MyBulletUID = uid;
   console.log('my bullet uid : ' + MyBulletUID);
}

function IsMyBulletAlive(){
   if( MyBulletUID >= 0)
      return true;
   return false;
}

// 총알을 하나 추가한다.
function AddBullet(layer, args){
   if( args.uid < 0)
      return;

   var bullNum = args['ballNum'];
   if( bullNum === common.BULLET_TYPE_MINE 
      && MyBulletUID !== args['uid'] )
   {
      bullNum = common.BULLET_TYPE_ENEMY;
   }

   var ball = new Bullet({ballNum: bullNum});
      ball.position = { x: args['posx'], y: args['posy'] };
      ball.startPos = { x: args['posx'], y: args['posy'] };
      ball.velocity = { x: args['velx'], y:  args['vely'] };
      ball.startVel = { x: args['velx'], y:  args['vely'] };
      ball.startTick = args['startTick'];
      ball.lastSyncTick = args['startTick'];
      ball.name = 'bullet' + args['uid'];
      ball.Run();
      layer.addNode(ball);
      ++numOfBullet;
      DrawNumOfBullet(layer);
}

function ChangeBulletVelocity(layer, args){
   var node = layer.getNode('bullet' + args.uid);
   if( typeof node === 'undefined' )
   {
      console.log('cannot find bullet' + args.uid);
      return;
   }

   node.position = { x: args['posx'], y: args['posy'] };
   node.startPos = { x: args['posx'], y: args['posy'] };
   node.velocity = { x: args['velx'], y:  args['vely'] };
   node.startVel = { x: args['velx'], y:  args['vely'] };
   node.startTick = args['startTick'];
   node.lastSyncTick = args['startTick'];
   node.sumElapsedMS = 0;
}

// 총알 tick 오차 싱크
function SyncBulletsPosition(layer){
   for(var index = 0; index < numOfBullet; ++index){
      var node = layer.getNode('bullet' + index);
      if( typeof node === 'undefined' )
         continue;
      node.SyncServerTick();
   }
}   

// 총알을 모두 지운다.
function ClearBullet(layer){
   for(var i = 0; i < MAX_BULLET; ++i)
      RemoveBullet(layer, i, true);
   numOfBullet = 0;
   DrawNumOfBullet(layer);
}

// 총알을 지운다. index로 지울 총알을 정함.
var RemoveBullet = function(layer, index, notDraw){
   if( notDraw !== true )
   {
      var node = layer.getNode('bullet' + index);
      var pos = node.GetPos();
      //console.log('remove index:'+ index + ' tick:' + serverTick + ' pos:' + pos.x + ',' +pos.y);
      --numOfBullet;
      DrawNumOfBullet(layer);
   }
   layer.removeNode('bullet' + index);

   if( index === MyBulletUID )
   {
      SendMyScore(); // send to server
      CheckMyBestScore(); // alert
      SetMyBulletUID(-1);
   }
};

// 스코어 계산 begin ------------------
function ResetMyScore(){
   myScore = 0;
}
function SumMyScore(sum){
   myScore += sum;
}
function GetMyScore(){
   return (myScore / 1000).toFixed(3);
}
function GetMyBestScore(){
 return (myBestScore / 1000).toFixed(3);  
}

// 내 스코어 계산
function CheckMyScore(tick){
   if( IsMyBulletAlive() === false )
      return;
   SumMyScore(tick);
}
function CheckMyBestScore(){
   var newBest = false;
   if( myScore > myBestScore ){
      myBestScore = myScore;
      newBest = true;
   }

   // 죽었을 시 팝업
   var str = newBest ? 'New Best!!' : '';
   str += ' Score : ';
   alert(str + GetMyScore() + ' seconds');
}
// 스코어 계산 end ------------------

// 유저 수 텍스트 그리기. "User Now:"는 동접. "Total:"은 누적 유닉.
function AddAndDrawUserCount(layer, UserCount){
   layer.removeNode('TotalUser');
   var label = new pulse.CanvasLabel({ text: 'User Now : ' + UserCount.TotalUser + ', Total : ' + UserCount.AccUserCount });
   label.position = { x: 120, y: 15 };
   label.name = 'TotalUser'
   layer.addNode(label);
}

// Tick 텍스트 그리기. 서버에서 받은 클라 틱을 나타냄.
function DrawServerTick(layer){
   layer.removeNode('serverTick');
   var label = new pulse.CanvasLabel({ text: 'Tick : ' + serverTick.toFixed() });
   label.position = { x: 120, y : 35 };
   label.name = 'serverTick';
   layer.addNode(label);
}

// NumOfBullet 텍스트 그리기. 현재 총알 갯수를 나타냄.
function DrawNumOfBullet(layer){
   layer.removeNode('NumOfBullet');
   var label = new pulse.CanvasLabel({ text: 'NumOfBullet : ' + numOfBullet + '/60' });
   label.position = { x: 120, y : 55 };
   label.name = 'NumOfBullet';
   layer.addNode(label);
}

// clear 텍스트 그리기. 버튼을 누르면 공을 모두 제거 (클릭시 서버에서 좌표 체크)
function DrawButtonClear(layer){
   var label = new pulse.CanvasLabel({ text: 'Clear' });
   label.position = { x: 400, y : 35 };
   layer.addNode(label);
}

// my beat score.
function DrawMyScore(layer){
   layer.removeNode('MyScore');
   var label = new pulse.CanvasLabel({ text: 'MyScore : ' + GetMyScore() + '  /  MyBestScore : ' + GetMyBestScore() });
   label.position = { x: 320, y : 500 };
   label.name = 'MyScore';
   layer.addNode(label);
}

// server best score
function DrawServerBestScoreTop(layer, i, data){
   layer.removeNode('ServerBestScore' + i);
   if( typeof data.score === 'undefined')
   {
      var newData = {nickname: '', score: 0};
      data = newData;
   }
   var label = new pulse.CanvasLabel({ text: 
      '<TOP ' + (i+1) + '> : ' 
      + (data.score*=1).toFixed(3) 
      + ' ('+data.date+')'
      + ' ('+data.nickname+')' 
   });
   label.position = { x: 320, y : (560 + (i*20)) };
   label.name = 'ServerBestScore' + i;
   layer.addNode(label);
}

function DrawServerBestScore(layer){
   layer.removeNode('ServerBestScore');
   var label = new pulse.CanvasLabel({ text: '<Server Best Score Top 10>'});
   label.position = { x: 320, y : 540 };
   label.name = 'ServerBestScore';
   layer.addNode(label);

   for(var i = 0; i < 10; ++i){
      var length = serverBestScores.length;
      var data = i >= length ? 0 : serverBestScores[i];
      DrawServerBestScoreTop(layer, i, data);
   }
}