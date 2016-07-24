pulse.ready(function() {

   var engine = new pulse.Engine( { gameWindow: 'game-window', size: { width: 640, height: 480 } } );

   var scene = new pulse.Scene();

   var layer = new pulse.Layer();
   layer.anchor = { x: 0, y: 0 };

   scene.addLayer(layer);
   engine.scenes.addScene(scene);

   engine.scenes.activateScene(scene);

   layer.events.bind('mousedown', function(args) {
      var ball = new Ball();
      ball.position = { x: args.position.x, y: args.position.y };
      layer.addNode(ball);
   });

   engine.go(30);

});