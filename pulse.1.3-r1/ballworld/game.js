var socket = io();

pulse.ready(function() {

   var engine = new pulse.Engine( { gameWindow: 'game-window', size: { width: 640, height: 480 } } );

   var scene = new pulse.Scene();

   var layer = new pulse.Layer();
   layer.anchor = { x: 0, y: 0 };

   scene.addLayer(layer);
   engine.scenes.addScene(scene);

   engine.scenes.activateScene(scene);

   layer.events.bind('mousedown', function(args) {
      var position = [args.position.x, args.position.y];
      socket.emit('click req', position);
   });

   socket.on('click ack', function(args){
      var ball = new Ball();
      ball.position = { x: args[0], y: args[1] };
      layer.addNode(ball);
   });

   engine.go(30);

});

