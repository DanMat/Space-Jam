
  // some global variabled
    var maingame,
        scroller,
        frameCount = 0,
        score= 0,
        lives= 3;
 
    //initialise the game after page has loaded
    window.addEventListener('load', loadResources, false);
 
    //HUD helper functions
    function setScore(value) {
      score += value;
      maingame.hud.setValue("score","value",score);
    }
 
    function setLife(value) {
      lives += value;
      if (lives > 3)  { //reset lives to full
        lives = 3;
      }
 
      maingame.hud.setValue("lives","value",lives);
 
      if (lives < 1) {// player died, show ending screen
        maingame.endlevelIntroAnimation = function() {return true;};
        maingame.gameEndingIntroAnimation = function() {return true;};
        maingame.playerDied();
        maingame.gameIsCompleted(); // dead
      }
    }
 
    //initialize the main game
    function loadResources() {
      help.akihabaraInit({
        title: 'Spaceix',
        width: 640,
        height: 480,
        zoom: 1
      });
 
      gbox.addImage('font', 'images/font.png');
      gbox.addFont({ id: 'small', image: 'font', firstletter: ' ', tileh: 8, tilew: 8, tilerow: 255, gapx: 0, gapy: 0 });
 
      gbox.addImage('playerSprite', 'images/player.png');
      gbox.addTiles({
        id:      'playerTiles',
        image:   'playerSprite',
        tileh:   24,
        tilew:   38,
        tilerow: 6,
        gapx:    0,
        gapy:    0,
      });
 
      gbox.addImage('bulletImg', 'images/playerbullet.png');
      gbox.addTiles({
        id:      'bulletTile',
        image:   'bulletImg',
        tileh:   38,
        tilew:   37,
        tilerow: 6,
        gapx:    0,
        gapy:    0,
      });
 
      gbox.addImage('bulletImg2', 'images/enemybullet.png');
      gbox.addTiles({
        id:      'bulletTile2',
        image:   'bulletImg2',
        tileh:   38,
        tilew:   37,
        tilerow: 6,
        gapx:    0,
        gapy:    0,
      });
 
      gbox.addImage('enemySprite', 'images/enemy.png');
      gbox.addTiles({
        id:      'enemyTiles',
        image:   'enemySprite',
        tileh:   24,
        tilew:   38,
        tilerow: 6,
        gapx:    0,
        gapy:    0
      });
 
      gbox.addImage('logo', 'images/logo.png');
      gbox.addImage('backgroundImg1', 'images/background1.png');
	  gbox.addImage('backgroundImg2', 'images/background2.png');
	  gbox.addImage('backgroundImg3', 'images/background3.png');
	  gbox.addImage('backgroundImg4', 'images/background4.png');
	  gbox.addImage('backgroundImg5', 'images/background5.png');
      gbox.addImage('movingstars', 'images/movingstars.png');
 
      gbox.setCallback(main);
      gbox.loadAll();
    }
 
    function main() {
 
      //set the groups and rendering the order
      gbox.setGroups(['background', 'player', 'enemy', 'playerbullets', 'enemybullets', 'game']);
 
      maingame = gamecycle.createMaingame('game', 'game');
 
      maingame.gameMenu = function () {return true;}; // no menu
      maingame.gameIntroAnimation = function() {return true;}; //no game intro animation
 
      maingame.newLife = function () { //player is reborn
        setLife(4);
      };
 
      maingame.gameTitleIntroAnimation=function(reset) { //simple title animation
        if (reset) {
          toys.resetToy(this, 'rising');
        }
 
        gbox.blitFade(gbox.getBufferContext(),{ alpha: 1 });
 
        toys.logos.linear(this, 'rising', {
          image: 'logo',
          sx:    gbox.getScreenW()/2-gbox.getImage('logo').width/2,
          sy:    gbox.getScreenH(),
          x:     gbox.getScreenW()/2-gbox.getImage('logo').width/2,
          y:     20,
          speed: 1
        });
      };
 
      maingame.changeLevel=function(level) {
        if (level==null) {
          level=1;
        }
 
        maingame.level=level;
        maingame.hud.setValue("level","value",level);
 
        //15 times level enemies to kill...
        maingame.enemiesToKill = level*15;
 
        //...that speed up as they go, with a slight curve, until they go really fast
        if (level < 8) {
          maingame.enemiesSpeed = parseInt(5 + level, "10");
        } else if (level > 15) {
          maingame.enemiesSpeed = parseInt(12, "10");
        } else {
          maingame.enemiesSpeed = parseInt(5 + level*0.5, "10");
        }
 
      /*  this.newLife();---*/
        setLife(4);
      };
 
      maingame.newLife = function(up) {//do nothing
      }//---
 
      maingame.initializeGame = function() {
        //set the HUD widgets
        maingame.hud.setWidget("scorename",{widget:"label",font:"small",value:"score:",dx:530,dy:5,clear:true});
        maingame.hud.setWidget("score",{widget:"label",font:"small",value:0,dx:580,dy:5,clear:true});
 
        maingame.hud.setWidget("levelname",{widget:"label",font:"small",value:"level:",dx:530,dy:20,clear:true});
        maingame.hud.setWidget("level",{widget:"label",font:"small",value:1,dx:580,dy:20,clear:true});
 
        maingame.hud.setWidget("lives",{widget:"symbols",minvalue:0,value:3,maxshown:3,tileset:"playerTiles",tiles:[0],dx:10,dy:5,gapx:30,gapy:0}); // The number of ships remaining
 
        //add the background and the player
        addBackground();
        addPlayer();
      }//---
 
      //launch!
      gbox.go();
    }
 
    function addBackground() {
      //add the background object (also the main game loop)
      gbox.addObject({
        id: 'backgroundid',
        group: 'background',
        initialize: function () {
 
          //set up scrolling background
          scroller = toys.shmup.generateScroller("background", "scroller", {
            maxwidth: 1280,
            stage:  [{image:"movingstars"},{image:"movingstars"},{image:"movingstars"},{image:"movingstars"}], // why 4?
            speed: 1,
          });
 
          //set counters
          this.timeout = 1;
          this.shipcounter = 1;
		  this.background=1;
        },
        first: function () { //before drawing
          // Increment the global frame counter.
          frameCount++;
          //animate the scroller
          if(scroller.x == 640) {
            scroller.x = 0
          }
          scroller.x += 5;
 
          //check if next level
          if (maingame.enemiesToKill < 1) {
            maingame.changeLevel(maingame.level+1);
			this.background++;
			if(this.background>6){
			this.background=1
			}
          }
 
 
          //randomly generate enemies
          this.timeout -= 1;
          if (this.timeout < 1 ) {
            this.timeout = 40 - maingame.level*1.5;
            addEnemy(640, help.random(35, 400), this.shipcounter++);
          }
        },
        blit: function () { //drawing
          gbox.blitFade(gbox.getBufferContext(),{}); //clear screen
switch(this.background)
{
case 1:		 
gbox.blitAll(gbox.getBufferContext(), gbox.getImage('backgroundImg1'), { dx: 0, dy: 0, alpha: 1});
break;

case 2:		 
gbox.blitAll(gbox.getBufferContext(), gbox.getImage('backgroundImg2'), { dx: 0, dy: 0, alpha: 1});
break;

case 3:		 
gbox.blitAll(gbox.getBufferContext(), gbox.getImage('backgroundImg3'), { dx: 0, dy: 0, alpha: 1});
break;

case 4:		 
gbox.blitAll(gbox.getBufferContext(), gbox.getImage('backgroundImg4'), { dx: 0, dy: 0, alpha: 1});
break;

case 5:		 
gbox.blitAll(gbox.getBufferContext(), gbox.getImage('backgroundImg5'), { dx: 0, dy: 0, alpha: 1});
break;
}
		  
        },
     
      });
    }
 
    function addPlayer() {
      //player object
      gbox.addObject({
        id: 'playerid',
        group: 'player',
        tileset: 'playerTiles',
 
        initialize: function () {
          toys.shmup.initialize(this, {
            bounds:{x:0,y:35,w:gbox.getScreenW(),h:gbox.getScreenH()-58}, //dont go out of bounds
          });
          this.x = 30;
          this.y= 240;
          this.timeout = 1;
 
          this.anim = {speed: 1, frames: [0,1,2,3,4,5]};
        },
        first: function () { //before drawing
 
          if (!this.killed&&!maingame.gameIsHold()) { //only do stuff if the player is allowed to
            toys.shmup.controlKeys(this, { left: 'left', right: 'right', up: 'up', down: 'down' });
 
            //next three are all convenience functions for player control handling
            toys.shmup.handleAccellerations(this);
            toys.shmup.applyForces(this);
            toys.shmup.keepInBounds(this);
 
            //sprite animation
            if (frameCount%this.anim.speed == 0) {
              this.frame = help.decideFrame(frameCount, this.anim);
            }//---
 
            //make sure player doesn't hit the bottom
            if (this.y > gbox.getScreenH()-58) {
              this.hitByBullet();
            }
 
            this.timeout--;//---
            if (gbox.keyIsHit("a") && this.timeout < 1) { //only shoot a bullet every couple of frames
              this.fireBullet();
            }
          }
 
        },
        blit: function () { //drawing
          if (!this.killed) {
            gbox.blitTile(gbox.getBufferContext(), {
              tileset: this.tileset,
              tile: this.frame,
              dx: this.x,
              dy: this.y,
              fliph:  this.fliph,
              flixv: this.flipv,
              camera: this.camera,
              alpha: 1
            });
          }
        },
        //helper functions
     /*   kill:function() {
          if (!this.killed) { // If we're alive...
            this.killed=true;
            setLife(-1);
          }
        },*///---
        fireBullet:function() {
          this.timeout = 5; //set the timeout again//---
 
          toys.shmup.fireBullet("playerbullets",null, {
            collidegroup:"enemy",
            from:this,
            colh: gbox.getTiles('bulletTile').tileh,
            tileset:"bulletTile",
            tolerance: 6,
            approximation: 3,
            frames:{speed:1,frames:[0]},
            accx:8,accy:0});
        },
        hitByBullet: function(by) { //player got hit by a bullet
          setLife(-1);
          this.x = 30;
          this.y= 240;
          this.timeout = 1;
          //gbox.trashGroup("enemybullets"); //this causes an error?
          gbox.trashGroup("enemy");
          gbox.purgeGarbage();
        }
      });
    }
 
    //generative enemy function
    function addEnemy(xx, yy, id) {
      gbox.addObject({
        id: 'enemy_id' + id,
        group: 'enemy',
        tileset: 'enemyTiles',
        colh: gbox.getTiles('enemyTiles').tileh,
        speed: 2,
        health: 1,
        initialize: function () {
          toys.shmup.initialize(this, {});
 
          this.x = xx;
          this.y = yy;
 
          //slight variance enemyspeed dependant on level
          this.enemyspeed = help.random(maingame.enemiesSpeed - maingame.level, maingame.level*2);
 
          this.timeout = 1;
          this.anim = {speed: 1, frames: [0,1,2,3,4,5]};
        },
        first: function() {
          //move enemy
          this.x = this.x - this.enemyspeed;
		  player = gbox.getObject("player","playerid");
		
 
          if(this.x < 0) {
            this.kill();
          }
          //animation
 
          if (frameCount%this.anim.speed == 0) {
            this.frame = help.decideFrame(frameCount, this.anim);
          }
 
          //Shoot randomly
          this.timeout--;
          if (this.timeout < 1 && Math.random() < 0.1) {
            this.fireBullet();
            this.timeout = 20;
          }
        },
        blit: function() {
          gbox.blitTile(gbox.getBufferContext(), {
            tileset: this.tileset,
            tile: this.frame,
            dx: this.x,
            dy: this.y,
            fliph:  this.fliph,
            flixv: this.flipv,
            camera: this.camera,
            alpha: 1
          });
        },
        //helper functions
        fireBullet:function() {
          this.timeout = 5;//---
 
          //aiming
          player = gbox.getObject("player","playerid");
 
          horizontalSpace = this.x - player.x;
          verticalSpace = this.y - player.y;
 
          direction = 0;
          if (horizontalSpace > verticalSpace) { //only aim if closer vertically than horizontally
            horizontalSteps = horizontalSpace/this.enemyspeed;
            verticalSteps = verticalSpace;
 
            direction = verticalSteps/horizontalSteps;
 
            console.log(direction);
            //never too fast
            if (direction > 4 || direction < -4) {
              direction = 0;
            }
 
            direction = direction *-1;
          }
 
          toys.shmup.fireBullet("enemybullets",null, {
            collidegroup:"player",
            from:this,
            colh: gbox.getTiles('bulletTile2').tileh,
            tileset:"bulletTile2",
            tolerance: 6,
            approximation: 3,
            frames:{speed:1,frames:[0,1,2,3,4,5]},
            accx:parseInt(this.enemyspeed*-1.5, 10),
            accy:direction,
          });
        },
        kill: function() {
          gbox.trashObject(this);
          gbox.purgeGarbage();
        },
        hitByBullet: function(by) {
          setScore(5);
          maingame.enemiesToKill -= 1;
          gbox.trashObject(this);
          gbox.purgeGarbage();
        }
      });
    }
 
