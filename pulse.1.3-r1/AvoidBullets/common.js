var screen = {ws:0, we:640, hs:80, he:480};
var bulletSize = 4;

var debug = 4;

(function(exports){
   exports.GetPositionEach = function(tick_, startPos_, mapSize_, velocity_){
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
   };

   exports.GetPosition = function(tick_, startPos, vel){
      var pos = {x:startPos.x, y:startPos.y};
      pos.x = screen.ws + this.GetPositionEach(tick_, startPos.x, screen.we - screen.ws, vel.x );
      pos.y = screen.hs + this.GetPositionEach(tick_, startPos.y, screen.he - screen.hs, vel.y );
      return pos;
   };

   exports.IsOnCollision = function(aPos, bPos){
      if( aPos.x - bulletSize > bPos.x || aPos.x + 4 < bPos.x)
         return false;
      if( aPos.y - bulletSize > bPos.y || aPos.y + 4 < bPos.y)
         return false;
      return true;
   };
})(typeof exports === 'undefined'? this['common']={}: exports);


   


/*
Bullet.prototype.sync = function(tick_){
   if( tick_ === this.lastSyncTick )
      return;
   //this.position.x = screen.ws + GetPosition(tick_, this.startPos.x, screen.we - screen.ws, this.velocity.x );
   //this.position.y = screen.hs + GetPosition(tick_, this.startPos.y, screen.he - screen.hs, this.velocity.y );
   this.position = GetPosition2(tick_, this.startPos, this.velocity);
   this.lastSyncTick = tick_;
}
*/