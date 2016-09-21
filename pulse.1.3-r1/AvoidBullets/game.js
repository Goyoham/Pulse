var socket = io();

var serverTick = 0;
var numOfBullet = 0;
var MAX_BULLET = 50;

var SCREEN_WIDTH = screen.we; //640
var SCREEN_HEIGHT = screen.he;//480
var SCREEN_TERM_TOP = screen.hs - 1;//79
var SCREEN_GAME_WIDTH = SCREEN_WIDTH;//640
var SCREEN_GAME_HEIGHT = SCREEN_HEIGHT - SCREEN_TERM_TOP;//400

pulse.ready(function() {
   // GameEngine 기본 처리 시작 -------------------------
   var gane_engine = new pulse.Engine( { gameWindow: 'game-window', size: { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } } );
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
      socket.emit('click req', { 
         posx: args.position.x
         , posy: args.position.y
      });
   });

   // 최초로 텍스트 그려줌
   DrawNumOfBullet(game_layer);
   DrawButtonClear(game_layer);

   // 유저 접속시 패킷 받기
   socket.on('connected', function(data){
      AddAndDrawUserCount(game_layer, data);
   });

   // 유저 접속시 또는 새로고침시 전체 총알 위치 데이터 받기
   socket.on('init', function(initData){
      serverTick = initData.serverTick;
      var bulletList = initData.bulletList;
      ClearBullet(game_layer);
      for(var i = 0; i < bulletList.length; ++i)
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

   // 총알 지우기 패킷 받기
   socket.on('remove bullet', function(args){
      //ReserveBulletToRemove(args);
      RemoveBullet(game_layer, args.index);
   });

   // 서버 틱 패킷 받기
   socket.on('serverSync', function(args){
      serverTick = args['serverTick'];
      DrawServerTick(game_layer);
   });

   // 30ms 마다 다시 그린다.
   gane_engine.go(30);

   setInterval(function(){
      CheckRemoveBullets(game_layer);
   }, 30);
});

// 총알을 하나 추가한다.
function AddBullet(layer, args){
   if( args.uid < 0)
      return;

   var ball = new Bullet({ballNum: args['ballNum']});
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
      console.log('remove index:'+ index + ' tick:' + serverTick + ' pos:' + pos.x + ',' +pos.y);
      --numOfBullet;
      DrawNumOfBullet(layer);
   }
   layer.removeNode('bullet' + index);
};

// 총알 지우기 예약. 클라 서버 타이밍을 맞추기 위해.
var reservedBulletsToRemove = [];
function ReserveBulletToRemove(args){
   reservedBulletsToRemove.push(args);
}

var CheckRemoveBullets = function(layer){
   while(reservedBulletsToRemove.length > 0){
      var index = reservedBulletsToRemove[0].index;
      var removedTick = reservedBulletsToRemove[0].removedTick;
      var node = layer.getNode('bullet' + index);
      if( typeof node === 'undefined')
      {
         reservedBulletsToRemove.shift();
         continue;
      }
      var nowTick = node.GetTotalTick();
      if( nowTick >= removedTick )
      {
         RemoveBullet(layer, index);
      }
      else
      {
         break;
      }
   }
}

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
   var label = new pulse.CanvasLabel({ text: 'Tick : ' + serverTick });
   label.position = { x: 120, y : 35 };
   label.name = 'serverTick';
   layer.addNode(label);
}

// NumOfBullet 텍스트 그리기. 현재 총알 갯수를 나타냄.
function DrawNumOfBullet(layer){
   layer.removeNode('NumOfBullet');
   var label = new pulse.CanvasLabel({ text: 'NumOfBullet : ' + numOfBullet + '/50' });
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