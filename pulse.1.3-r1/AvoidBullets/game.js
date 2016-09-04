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
   // GameEngine -------------------------
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

   game_layer.events.bind('mousedown', function(args) {
      socket.emit('click req', { 
         posx: args.position.x
         , posy: args.position.y
      });
   });

   DrawNumOfBullet(game_layer);
   DrawButtonClear(game_layer);

   socket.on('connected', function(data){
      AddAndDrawUserCount(game_layer, data);
   });

   socket.on('init', function(initData){
      serverTick = initData.serverTick;
      var bulletList = initData.bulletList;
      ClearBullet(game_layer);
      for(var i = 0; i < bulletList.length; ++i)
         AddBullet(game_layer, bulletList[i]);
   });

   socket.on('disconnected', function(data){
      AddAndDrawUserCount(game_layer, data);
   });

   socket.on('click ack', function(args){
      AddBullet(game_layer, args);
   });

   socket.on('remove bullet', function(args){
      RemoveBullet(game_layer, args.index);
   });

   socket.on('serverSync', function(args){
      serverTick = args['serverTick'];
      DrawServerTick(game_layer);
   });

   gane_engine.go(30);
});

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

function ClearBullet(layer){
   for(var i = 0; i < MAX_BULLET; ++i)
      RemoveBullet(layer, i, true);
   numOfBullet = 0;
   DrawNumOfBullet(layer);
}

function RemoveBullet(layer, index, notDraw){
   if( notDraw !== true )
   {
      var node = layer.getNode('bullet' + index);
      var pos = node.GetPos();
      console.log('remove index:'+ index + ' tick:' + serverTick + ' pos:' + pos.x + ',' +pos.y);
      --numOfBullet;
      DrawNumOfBullet(layer);
   }
   layer.removeNode('bullet' + index);
}

function AddAndDrawUserCount(layer, UserCount){
   layer.removeNode('TotalUser');
   var label = new pulse.CanvasLabel({ text: 'User Now : ' + UserCount.TotalUser + ', Total : ' + UserCount.AccUserCount });
   label.position = { x: 120, y: 15 };
   label.name = 'TotalUser'
   layer.addNode(label);
}

function DrawServerTick(layer){
   layer.removeNode('serverTick');
   var label = new pulse.CanvasLabel({ text: 'Tick : ' + serverTick });
   label.position = { x: 120, y : 35 };
   label.name = 'serverTick';
   layer.addNode(label);
}

function DrawNumOfBullet(layer){
   layer.removeNode('NumOfBullet');
   var label = new pulse.CanvasLabel({ text: 'NumOfBullet : ' + numOfBullet + '/50' });
   label.position = { x: 120, y : 55 };
   label.name = 'NumOfBullet';
   layer.addNode(label);
}

function DrawButtonClear(layer){
   var label = new pulse.CanvasLabel({ text: 'Clear' });
   label.position = { x: 400, y : 35 };
   layer.addNode(label);
}