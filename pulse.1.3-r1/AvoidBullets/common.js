var screen = {ws:0, we:640, hs:80, he:480};
var bulletSize = 4;

var debug = 4;

/*
서버와 클라이언트에서 모두 사용되기 위한 형태
서버는 node.js에서 require함수로 이 파일을 로드한다.
클라는 html에서 script에 이 파일을 추가함으로써 이 파일을 로드한다.

node.js에서는 require함수로 파일 로드 후 함수가 사용되기 위해서는 exports객체 안에 함수를 정의해야 한다.
하지만 클라이언트에서는 exports라는 객체가 없기 때문에(node.js전용이므로), 약간의 편법이 필요하다.

function의 인자로 exports를 받게 되는데,
최하단에 있는 코드를 보면 exports가 undefined라는 상태면 this['common']으로 exports를 대신해버린다.

때문에 클라에서는 export가 this['common']으로 대체되므로
this는 나 자신이고, 나 자신의 멤버로 common을 정의하여, 그 common안에 각 함수를 담는다는 의미가 된다.
이후 사용 시 "common.함수명" 형태로 사용하게 된다.
(javascript에서 this['common']의 문법은 this.common과 동일함.)
("this.common.함수명" 형태가 되지만, this는 나 자신이므로 뺄 수 있음.)

서버에서는 node.js에서 로드되면 exports가 정의되어 있으므로, exports를 그대로 쓰게 된다.
var common = require('./common.js'); 형태로 하면, 마찬가지로 "common.함수명" 형태로 사용하게 됨.

결국 클라, 서버 모두 "common.함수명" 형태로 사용할 수 있게 된다.
*/
(function(exports){ // 익명 즉시 실행 함수(Immediately-invoked function expression)

   // 지난시간(tick), 시작위치(startPos), 맵크기(mapSize), 이동방향(velocity)를 받아서, 현재 위치를 계산한다.
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

   // x, y 좌표를 각각 계산하여 리턴
   exports.GetPosition = function(tick_, startPos, vel){
      var pos = {x:startPos.x, y:startPos.y};
      pos.x = screen.ws + this.GetPositionEach(tick_, startPos.x, screen.we - screen.ws, vel.x );
      pos.y = screen.hs + this.GetPositionEach(tick_, startPos.y, screen.he - screen.hs, vel.y );
      return pos;
   };

   // 두 개의 좌표가 충돌했는지 검사
   exports.IsOnCollision = function(aPos, bPos){
      if( aPos.x - bulletSize > bPos.x || aPos.x + 4 < bPos.x)
         return false;
      if( aPos.y - bulletSize > bPos.y || aPos.y + 4 < bPos.y)
         return false;
      return true;
   };
}(typeof exports === 'undefined'? this['common']={}: exports));


   


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