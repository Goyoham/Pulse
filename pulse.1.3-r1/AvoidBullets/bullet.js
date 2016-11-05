// 각 총알의 이미지
var BallNum = [
   'imgs/ship_mine.png'           // MY BULLET
   , 'imgs/ship_other_player.png' // OTHER PLAYER BULLET
   , 'imgs/base_bullet1.png'      // BASE BULLET
   , 'imgs/base_bullet2.png'      // BLUE BULLET
];

// 총알 클래스의 정의. pulse엔진의 Sprite를 상속받는다.
var Bullet = pulse.Sprite.extend({

   // 총알 최초 생성시 args데이터로부터 총알 종류가 정해짐.
   init: function(args) {

      args = args || {};
      var ballNum = args['ballNum'];
      if( ballNum >= BallNum.length || ballNum < 0 )
         args.src = BallNum[0];
      else
         args.src = BallNum[args['ballNum']];
      
      this._super(args);
   },

   // update가 호출되면서 현재 총알의 위치를 새로 그려줌. (pulse엔진)
   // elapsedMS는 이 객체가 생성된 후 부터 흐른 시간(ms)
   update: function(elapsedMS) {      

      this.sumElapsedMS += (elapsedMS / 1000); // ms단위를 초단위로 변환하여 더한다.
      var tick = this.sumElapsedMS; // 이것이 tick이다!!
      //if( debug > 0 )
      //   console.log( 'sumEms:'+this.sumElapsedMS + ' ' + ' ems:'+elapsedMS+' tick:'+tick );
      this.sync( tick ); // sync함수는 아래 정의되어 있다.
      //if( debug > 0 )
      //   console.log( 'sumEms:'+this.sumElapsedMS + ' ' + ' ems:'+elapsedMS+' tick:'+tick );

      this._super(elapsedMS); // pulse엔진에서 기본적으로 이걸 호출하고 있더라. base class로 넘겨주면 처리하는게 있나보다.
   }
});

// Bullet 클래스의 멤버함수 Run() 정의.
// 총알이 생성된 이후로 지나간 시간 곱하기 속력으로 총 이동한 거리를 계산하여 위치를 그려주기 위한 최초 이동거리 계산.
// serverTick은 글로벌 변수다.
// this의 startTick은 이 총알이 생성된 tick이다.
// 이 두 값의 차가, 내가 총알이 생성된 이후로 지나간 시간을 의미함. 그것이 sumElapsedMS다.
// (최초 한번만 호출하는 함수인데 init함수에서 하면 되는 거 아님?.. 그러게)
Bullet.prototype.Run = function(){
   this.sumElapsedMS = serverTick - this.startTick;
   /*
   console.log( 'serverTick:'+serverTick );
   console.log( 'startTick:'+this.startTick );
   console.log( 'sumElapsedMS:'+this.sumElapsedMS );
   */
}

// Bullet 클래스의 멤버함수 sync() 정의.
// 공의 현재 위치를 재계산한다.
Bullet.prototype.sync = function(tick_){
   if( tick_ === this.lastSyncTick ) // 이거 안 해도 될 것 같긴한데.. 30ms단위로 호출되는 함수라서 같은 값이 들어올리가..
      return;
   //this.position.x = screen.ws + GetPosition(tick_, this.startPos.x, screen.we - screen.ws, this.velocity.x );
   //this.position.y = screen.hs + GetPosition(tick_, this.startPos.y, screen.he - screen.hs, this.velocity.y );
   this.position = common.GetPosition(tick_, this.startPos, this.velocity);
   this.lastSyncTick = tick_;
}

// Bullet 클래스의 멤버함수 GetPos() 정의.
// 현재 위치 좌표를 리턴함.
// 이 함수 왜 있냐면.. 로그 남기려고..
Bullet.prototype.GetPos = function(){
   return common.GetPosition(this.lastSyncTick, this.startPos, this.velocity);
}

// 총알의 현재tick. serverTick과 동기화 되어야 함.
Bullet.prototype.GetTotalTick = function(){
   return this.startTick + this.sumElapsedMS;
}

// 틱 동기화
Bullet.prototype.SyncServerTick = function(){
   var diff = Math.abs( this.GetTotalTick() - serverTick );
   if( diff < 0.2 ) // 오차가 0.2초 이내면 무시
      return;
   this.Run();
}

// 아래는 Bullet 클래스의 멤버변수 선언 및 초기화.
Bullet.prototype.startTick = 0;              // 생성 시간 tick
Bullet.prototype.lastSyncTick = 0;           // 마지막 싱크 된 tick
Bullet.prototype.startPos = { x : 0, y : 0 } // 생성된 위치
Bullet.prototype.startVel = { x : 0, y : 0 } // 생성시 방향
Bullet.prototype.sumElapsedMS = 0;           // 생성 후 지난 시간 tick