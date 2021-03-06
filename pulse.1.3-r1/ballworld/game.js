var socket = io();

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
      var ball = new Ball({ballNum: args['ballNum']});
      //ball.position = { x: args[0], y: args[1] };
      ball.position = { x: args['posx'], y: args['posy'] };
      ball.velocity = { x: args['velox'], y:  args['veloy'] };
      game_layer.addNode(ball);
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