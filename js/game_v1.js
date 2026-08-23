//v 3.1
// Create the canvas
var canvas =document.getElementById('responsive-canvas');
var heightRatio = 1.5;
canvas.height = canvas.width * heightRatio;
var ctx = canvas.getContext("2d");
let level = 1;
var speed = 256;
var key_speed_modifier=1/10;
var level2threshold=3;
var level3threshold=10;
var level4threshold=20;
var level5threshold=30;

var gotoX;
var gotoY;

var monster1_gotoX;
var monster1_gotoY;

var monster2_gotoX;
var monster2_gotoY;

var monster2_gotoX;
var monster2_gotoY;

//canvas.width = 512;
//canvas.height = 200;
//document.body.appendChild(canvas);

var posError = 0.9;

canvas.addEventListener('click', evt => {
	var rect = canvas.getBoundingClientRect();
  
      gotoX= evt.clientX - rect.left,
      gotoY= evt.clientY - rect.top
    
  //alert('Click count: '+gotoX+','+gotoY);
});

// Background image
var bgReady = false;
var bgImage = new Image();
bgImage.onload = function () {
	bgReady = true;
};
bgImage.src = "images/background2.png";

// Hero image
var heroReady = false;
var heroImage = new Image();
heroImage.onload = function () {
	heroReady = true;
};
heroImage.src = "images/mum.png";

// Monster image
var monsterReady = false;
var monsterImage = new Image();
monsterImage.onload = function () {
	monsterReady = true;
};
monsterImage.src = "images/poop3.png";



// baby image
var babyReady = false;
var babyImage = new Image();
babyImage.onload = function () {
	babyReady = true;
};
babyImage.src = "images/monster.png";

// baby image 2
var babyReady2 = false;
var babyImage2 = new Image();
babyImage2.onload = function () {
	babyReady2 = true;
};
babyImage2.src = "images/monster2.png";

// baby image 3
var babyReady3 = false;
var babyImage3 = new Image();
babyImage3.onload = function () {
	babyReady3 = true;
};
babyImage3.src = "images/monster3.png";

// Game objects
var hero = {
	speed: speed // movement in pixels per second
};
var baby = {};
var baby2 = {};
var baby3 = {};

var monster = {};
var monster2 = {};
var monster3 = {};

var monstersCaught = 0;

// Handle keyboard controls
var keysDown = {};

addEventListener("keydown", function (e) {
	keysDown[e.keyCode] = true;
}, false);

addEventListener("keyup", function (e) {
	delete keysDown[e.keyCode];
}, false);



// Reset the game when the player catches a monster
var updateMonster = function () {

//gotoX =-1;
//gotoY = -1;

if(level==1){
		// Throw the monster somewhere on the screen randomly
		monster.x = 32 + (Math.random() * (canvas.width - 64));
		monster.y = 32 + (Math.random() * (canvas.height - 64));
		
			// Throw the baby up of monster/poop 
		baby.x =  monster.x;
		baby.y =  monster.y -32;
		
		monster.alive=true;
	}
		
	
	
	if(level==2){
		
		if(!monster2.alive){
			// Throw the monster somewhere on the screen randomly
			monster2.x = 32 + (Math.random() * (canvas.width - 64));
			monster2.y = 32 + (Math.random() * (canvas.height - 64));
			
				// Throw the baby up of monster/poop 
			baby2.x =  monster2.x;
			baby2.y =  monster2.y -32;
			monster2.alive=true;
		}
		
		if(!monster.alive){
			// Throw the monster somewhere on the screen randomly
			monster.x = 32 + (Math.random() * (canvas.width - 64));
			monster.y = 32 + (Math.random() * (canvas.height - 64));
			
				// Throw the baby up of monster/poop 
			baby.x =  monster.x;
			baby.y =  monster.y -32;
			monster.alive=true;
		}
		
		
	}
	
	if(level>=3){
		
		if(!monster3.alive){
			// Throw the monster somewhere on the screen randomly
			monster3.x = 32 + (Math.random() * (canvas.width - 64));
			monster3.y = 32 + (Math.random() * (canvas.height - 64));
			
				// Throw the baby up of monster/poop 
			baby3.x =  monster3.x;
			baby3.y =  monster3.y -32;
			monster3.alive=true;
			
			if(level>4){
			monster3.gotox = 32 + (Math.random() * (canvas.width - 64));
			monster3.gotoy = 32 + (Math.random() * (canvas.height - 64));
			}
		}
		
		
		if(!monster2.alive){
			// Throw the monster somewhere on the screen randomly
			monster2.x = 32 + (Math.random() * (canvas.width - 64));
			monster2.y = 32 + (Math.random() * (canvas.height - 64));
			
				// Throw the baby up of monster/poop 
			baby2.x =  monster2.x;
			baby2.y =  monster2.y -32;
			monster2.alive=true;
			
			if(level>4){
			monster2.gotox = 32 + (Math.random() * (canvas.width - 64));
			monster2.gotoy = 32 + (Math.random() * (canvas.height - 64));
			}
			
		}
		
		if(!monster.alive){
			// Throw the monster somewhere on the screen randomly
			monster.x = 32 + (Math.random() * (canvas.width - 64));
			monster.y = 32 + (Math.random() * (canvas.height - 64));
			
				// Throw the baby up of monster/poop 
			baby.x =  monster.x;
			baby.y =  monster.y -32;
			monster.alive=true;
			
			if(level>4){
			monster.gotox = 32 + (Math.random() * (canvas.width - 64));
			monster.gotoy = 32 + (Math.random() * (canvas.height - 64));
			}
		}
		
		
	}
	
};

// Reset the game when the player catches a monster
var reset = function () {
	hero.x = canvas.width / 2;
	hero.y = canvas.height / 2;

	// Throw the monster somewhere on the screen randomly
	monster.x = canvas.width/3 + (Math.random() * (canvas.width - canvas.width/3));
	monster.y = canvas.height/3 + (Math.random() * (canvas.height - canvas.height/3));
	
	monster.alive=true;
	
	
	// Throw the baby up of monster/poop 
	baby.x =  monster.x;
	baby.y =  monster.y -32;
};

var checkLevel = function(){
	if(monstersCaught>=level2threshold && level==1){
		
		gaSendEvent('game','goToLevel','2');
		
		
		hero.speed=300;
		level=2;
		//SPAWN baby2
		monster2.alive=true;
		monster2.x = 32 + (Math.random() * (canvas.width - 64));
		monster2.y = 32 + (Math.random() * (canvas.height - 64));
		baby2.x =  monster2.x;
		baby2.y =  monster2.y -32;
		
		}
		if(monstersCaught>=level3threshold  && level==2) {
		gaSendEvent('game','goToLevel','3');
		level=3;
		hero.speed=350;
			//SPAWN baby3
		monster3.alive=true;
		monster3.x = 32 + (Math.random() * (canvas.width - 64));
		monster3.y = 32 + (Math.random() * (canvas.height - 64));
		baby3.x =  monster3.x;
		baby3.y =  monster3.y -32;
		
		}
		if(monstersCaught>=level4threshold  && level==3){
		gaSendEvent('game','goToLevel','4');
			
		level=4;
		heroImage.src = "images/mum2.png";
		hero.speed=400;
		}
		
		if(monstersCaught>=level5threshold  && level==4){
			
		gaSendEvent('game','goToLevel','5');
			
			level=5;
			monster.speed = hero.speed-100;
		}
}

// Update game objects
var update = function (modifier) {
	if (38 in keysDown) { // Player holding up
		hero.y -= hero.speed * modifier;
	}
	if (40 in keysDown) { // Player holding down
		hero.y += hero.speed * modifier;
	}
	if (37 in keysDown) { // Player holding left
		hero.x -= hero.speed * modifier;
	}
	if (39 in keysDown) { // Player holding right
		hero.x += hero.speed * modifier;
	}
	//if using mouse or touch
	if(gotoX>=0 && gotoY>=0){
	   var theta = Math.atan2(gotoY - hero.y, gotoX - hero.x);

        var valX = (modifier * hero.speed) * Math.cos(theta);
        var valY = (modifier * hero.speed) * Math.sin(theta);

        hero.x += valX;
        hero.y += valY;
			
		}
		

		
	//is arrived to target?
	if(hero.x <= (gotoX + 2)
		&& gotoX <= (hero.x + 2)
		&& hero.y <= (gotoY + 2)
		&& gotoY <= (hero.y + 2)) {
			
			gotoX=-1;
			gotoY=-1;
	}
	
	
	//Are outside  canvas?
	if(monster.x+32>canvas.width  && monster.y+32>canvas.height)
		monster.alive=false;
	
	if(monster.x+32<0  && monster.y+32<0)
		monster.alive=false;
	
	
	
	//move monster
	if (level > 4) {
		
		
		
	    var theta = Math.atan2(monster.gotoy - monster.y, monster.gotox - monster.x);
        var valX = (modifier * monster.speed) * Math.cos(theta);
        var valY = (modifier * monster.speed) * Math.sin(theta);
        
        var btheta = Math.atan2(monster.gotoy - baby.y, monster.gotox - baby.x);
        var bvalX = (modifier * monster.speed) * Math.cos(theta);
        var bvalY = (modifier * monster.speed) * Math.sin(theta);
        
        
        //arrived
        if(Math.abs(monster.x -monster.gotox)>32 ||  Math.abs(monster.y -monster.gotoy)>32 ){
			monster.x += valX;
			monster.y += valY;
			
			baby.x += valX;
			baby.y += valY;
		}
        
        
		
	}

	// Are they touching?
	if (
		hero.x <= (monster.x + 32)
		&& monster.x <= (hero.x + 32)
		&& hero.y <= (monster.y + 32)
		&& monster.y <= (hero.y + 32)
	) {
		monster.alive=false;
		++monstersCaught;
		checkLevel();
		updateMonster();
		return;
	}
	
	if(level>1){
		
		if (
		hero.x <= (monster2.x + 32)
		&& monster2.x <= (hero.x + 32)
		&& hero.y <= (monster2.y + 32)
		&& monster2.y <= (hero.y + 32)
	) {
		monster2.alive=false;
		++monstersCaught;
		checkLevel();
		updateMonster();
		return;
		
	}
		
	}
	
		if(level>2){
		
		if (
		hero.x <= (monster3.x + 32)
		&& monster3.x <= (hero.x + 32)
		&& hero.y <= (monster3.y + 32)
		&& monster3.y <= (hero.y + 32)
	) {
		monster3.alive=false;
		++monstersCaught;
		checkLevel();
		updateMonster();
		return;
		
	}
		
	}
};

    const setUpCanvas = () => {
    	// Feed the size back to the canvas.
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
    };

// Draw everything
var render = function () {
	setUpCanvas();
	if (bgReady) {
		ctx.clearRect(0, 0, canvas.width ,canvas.height);
		ctx.drawImage(bgImage, 0, 0);
	}

	if (heroReady) {
		ctx.drawImage(heroImage, hero.x, hero.y);
	}

	if (monsterReady && monster.alive) {
		ctx.drawImage(monsterImage, monster.x, monster.y);
	}
	
	if (babyReady  && monster.alive) {
		ctx.drawImage(babyImage, baby.x, baby.y);
	}
	
	if(level>1){
		
	if (monsterReady  && monster2.alive) {
		ctx.drawImage(monsterImage, monster2.x, monster2.y);
	}
	
	if (babyReady   && monster2.alive) {
		ctx.drawImage(babyImage2, baby2.x, baby2.y);
	}
		
	}
	
	if(level>2){
		
	if (monsterReady  && monster3.alive) {
		ctx.drawImage(monsterImage, monster3.x, monster3.y);
	}
	
	if (babyReady   && monster3.alive) {
		ctx.drawImage(babyImage3, baby3.x, baby3.y);
	}
		
	}

	// Score
	ctx.fillStyle = "rgb(0, 0, 0)";
	ctx.font = "24px Indie Flower";
	ctx.textAlign = "left";
	ctx.textBaseline = "top";
	ctx.fillText("Poops caught: " + monstersCaught, 32, 32);
	ctx.fillText("Level: " + level, 32, 64);
};



function moveup() {
    hero.y -= hero.speed * key_speed_modifier;
}

function movedown() {
    hero.y += hero.speed * key_speed_modifier;
}

function moveleft() {
    hero.x -= hero.speed * key_speed_modifier;
}

function moveright() {
   hero.x += hero.speed * key_speed_modifier;
}

// The main game loop
var main = function () {
	var now = Date.now();
	var delta = now - then;

	
	update(delta / 1000);
	render();

	then = now;

	// Request to do this again ASAP
	requestAnimationFrame(main);
};

// Cross-browser support for requestAnimationFrame
var w = window;
requestAnimationFrame = w.requestAnimationFrame || w.webkitRequestAnimationFrame || w.msRequestAnimationFrame || w.mozRequestAnimationFrame;

// Let's play this game!
var then = Date.now();
setUpCanvas();
reset();
main();

function resize(){    
    $("#responsive-canvas").outerHeight($(window).height()-$("#responsive-canvas").offset().top- Math.abs($("#responsive-canvas").outerHeight(true) - $("#responsive-canvas").outerHeight()));
  }
  $(document).ready(function(){
    resize();
    $(window).on("resize", function(){                      
        resize();
    });
  });
