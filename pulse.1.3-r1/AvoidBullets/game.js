var socket = io();

var serverTick = 0;

pulse.ready(function() {
   // GameEngine -------------------------
   var gane_engine = new pulse.Engine( { gameWindow: 'game-window', size: { width: 640, height: 480 } } );
   var game_scene = new pulse.Scene();
   var game_layer = new pulse.Layer();
   game_layer.anchor = { x: 0, y: 0 };

   var background = new pulse.Sprite( {
      src: 'imgs/block.png',
      physics: {
         basicShape : 'box',
         isStatic : true
      },
      size : { width: 640, height: 400 }
   });
   background.position = { x: 640/2, y: 400/2+80 };
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

   socket.on('connected', function(TotalUser){
      AddAndDrawUserCount(game_layer, TotalUser);
   });

   socket.on('disconnected', function(TotalUser){
      AddAndDrawUserCount(game_layer, TotalUser);
   });

   socket.on('click ack', function(args){
      var ball = new Bullet({ballNum: args['ballNum']});
      ball.position = { x: args['posx'], y: args['posy'] };
      ball.startPos = { x: args['posx'], y: args['posy'] };
      ball.velocity = { x: args['velx'], y:  args['vely'] };
      ball.startVel = { x: args['velx'], y:  args['vely'] };
      ball.startTick = args['startTick'];
      ball.lastSyncTick = args['startTick'];
      game_layer.addNode(ball);
   });

   socket.on('serverSync', function(args){
      serverTick = args['serverTick'];
      DrawServerTick(game_layer);
   });

   gane_engine.go(30);
});

function AddAndDrawUserCount(layer, TotalUser){
   layer.removeNode('TotalUser');
   var label = new pulse.CanvasLabel({ text: 'TotalUser : ' + TotalUser });
   label.position = { x: 70, y: 15 };
   label.name = 'TotalUser'
   layer.addNode(label);
}

function DrawServerTick(layer){
   layer.removeNode('serverTick');
   var label = new pulse.CanvasLabel({ text: 'tick : ' + serverTick });
   label.position = { x: 70, y : 35 };
   label.name = 'serverTick';
   layer.addNode(label);
}