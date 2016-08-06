var BallNum = [
   'imgs/ball1.png'
   , 'imgs/ball2.png'
   , 'imgs/ball3.png'
   , 'imgs/ball4.png'
   , 'imgs/ball5.png'
   , 'imgs/ball6.png'
   , 'imgs/ball7.png'
   , 'imgs/ball8.png'
   , 'imgs/ball9.png'
];

var Ball = pulse.Sprite.extend({
   init: function(args) {

      args = args || {};
      args.src = BallNum[args['ballNum']];

      //this.velocity = { x: (Math.random() * 300) - 150, y: (Math.random() * 300) - 150 };

      this._super(args);
   },
   update: function(elapsedMS) {
      var newX = this.position.x + this.velocity.x * (elapsedMS / 1000);
      var newY = this.position.y + this.velocity.y * (elapsedMS / 1000);

      if(newX - (this.size.width / 2) <= 0) {
         newX = this.size.width / 2;
         this.velocity.x *= -1;
      }

      if(newY - (this.size.height / 2) <= 80) {
         newY = 80 + this.size.height / 2;
         this.velocity.y *= -1;
      }

      if(newX + (this.size.width / 2) >= 640) {
         newX = 640 - this.size.width / 2;
         this.velocity.x *= -1;
      }

      if(newY + (this.size.height / 2) >= 480) {
         newY = 480 - this.size.height / 2;
         this.velocity.y *= -1;
      }

      this.position.x = newX;
      this.position.y = newY;

      this._super(elapsedMS);
   }
});