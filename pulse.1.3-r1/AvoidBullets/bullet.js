var screen = {ws:0, we:640, hs:81, he:480};

var BallNum = [
   'imgs/bullet.png'
   , 'imgs/ship_mine.png'
   , 'imgs/ship_other.png'
];

var Bullet = pulse.Sprite.extend({
   init: function(args) {

      args = args || {};
      var ballNum = args['ballNum'];
      if( ballNum >= BallNum.length || ballNum < 0 )
         args.src = BallNum[0];
      else
         args.src = BallNum[args['ballNum']];
      
      this._super(args);
   },
   update: function(elapsedMS) {
      /*
      var newX = this.position.x + this.velocity.x * (elapsedMS / 1000);
      var newY = this.position.y + this.velocity.y * (elapsedMS / 1000);

      if(newX - (this.size.width / 2) <= screen.ws) {
         newX = screen.ws + this.size.width / 2;
         this.velocity.x *= -1;
      }

      if(newY - (this.size.height / 2) <= screen.hs) {
         newY = screen.hs + this.size.height / 2;
         this.velocity.y *= -1;
      }

      if(newX + (this.size.width / 2) >= screen.we) {
         newX = screen.we - this.size.width / 2;
         this.velocity.x *= -1;
      }

      if(newY + (this.size.height / 2) >= screen.he) {
         newY = screen.he - this.size.height / 2;
         this.velocity.y *= -1;
      }

      this.position.x = newX;
      this.position.y = newY;
      */

      /*
     
      if( serverTick > this.lastServerTick ){
         var diff = serverTick - this.lastServerTick;
         this.sumElapsedMS -= diff; 
         this.lastServerTick = serverTick;  
      }
      */
      this.sumElapsedMS += (elapsedMS / 1000);
      var tick = this.sumElapsedMS;
      //if( debug > 0 )
      //   console.log( 'sumEms:'+this.sumElapsedMS + ' ' + ' ems:'+elapsedMS+' tick:'+tick );
      this.sync( tick );
      //if( debug > 0 )
      //   console.log( 'sumEms:'+this.sumElapsedMS + ' ' + ' ems:'+elapsedMS+' tick:'+tick );

      this._super(elapsedMS);
   }
});

var debug = 4;

function GetPosition(tick_, startPos_, mapSize_, velocity_){
   var velAbs = Math.abs(velocity_);
   var velType = velocity_ >= 0 ? 1 : -1;
   var mapSize = mapSize_ - 1;
   var startPos = (velType > 0 ? startPos_ : mapSize - startPos_) * 1;

   var moved = Math.floor(velAbs * tick_);
   var movedWithStartPos = (startPos + moved);
   var mod = ( (movedWithStartPos - 1) % mapSize ) + 1;
   var turn = Math.floor( (movedWithStartPos - 1) / mapSize );
   var nowVelType = (turn % 2 === 0) ? 1 : -1;
   var nowPos = nowVelType === 1 ? mod : mapSize - mod;
   nowPos = velType > 0 ? nowPos : mapSize - nowPos;
   
   if( debug > 0 ){
      /*
      console.log('<< debug:'+debug);
      console.log(tick_ + ' ' + startPos_ + ' ' + mapSize_ + ' ' + velocity_);
      console.log(velAbs + ' ' + velType + ' ' + mapSize + ' ' + startPos);
      console.log(moved + ' ' + movedWithStartPos + ' ' + mod + ' ' + turn + ' ' + nowVelType + ' ' + nowPos);
      */
      debug -= 1;
   }
   
   return nowPos;
}

Bullet.prototype.Run = function(){
   this.sumElapsedMS = serverTick - this.startTick;
   /*
   console.log( 'serverTick:'+serverTick );
   console.log( 'startTick:'+this.startTick );
   console.log( 'sumElapsedMS:'+this.sumElapsedMS );
   */
}

Bullet.prototype.sync = function(tick_){
   if( tick_ === this.lastSyncTick )
      return;
   this.position.x = screen.ws + GetPosition(tick_, this.startPos.x, screen.we - screen.ws, this.velocity.x );
   this.position.y = screen.hs + GetPosition(tick_, this.startPos.y, screen.he - screen.hs, this.velocity.y );
   this.lastSyncTick = tick_;
}
Bullet.prototype.startTick = 0;
Bullet.prototype.lastSyncTick = 0;
Bullet.prototype.lastServerTick = 0;
Bullet.prototype.startPos = { x : 0, y : 0 }
Bullet.prototype.startVel = { x : 0, y : 0 }
Bullet.prototype.sumElapsedMS = 0;