/*jslint browser: true, devel: true, sloppy: true, sub: false, white: true, maxerr: 1000 */
var DEBUG = false;

// var canvas = document.getElementById("dragCanvas");
// var menuCanvas = document.getElementById("menuCanvas");

var canvas = document.createElement("canvas");
var menuCanvas = document.createElement("canvas");
document.body.appendChild(canvas);
document.body.appendChild(menuCanvas);

canvas.style.background = "#ffeb3b";

// var soundObject = document.getElementById("sound");
// var soundEnabled = false;

var targetLetters = [];
var dragLetters = [];
var letterSize = 50;

var resetButton = null;

function getViewportSize() {
  var viewWidth = 0, viewHeight = 0;

  if (typeof (window.innerWidth) === 'number' ) {
    //Modern browsers
    viewWidth = window.innerWidth;
    viewHeight = window.innerHeight;
  } 
  else if( document.documentElement && document.documentElement.clientWidth ) {
    //IE 6+ in 'standards compliant mode'
    viewWidth = document.documentElement.clientWidth;
    viewHeight = document.documentElement.clientHeight;
  }

  return { 'width': viewWidth, 'height': viewHeight };
}

function drawFrame() {
  var ctx = canvas.getContext('2d');
  ctx.clearRect(0,0,canvas.width,canvas.height);
  targetLetters.forEach(function(letter) { 
    letter.draw();
  });

  dragLetters.forEach(function(letter) {
    letter.draw();
  });
}

function ResetButton() {
  this.x = Math.floor(canvas.width*0.88);
  this.y = 10;
  this.width = canvas.width * 0.1;
  this.height = this.width;
  this.image = new Image();
  this.image.src = 'refreshsprite.png';
  this.active = false;

  this.draw = function() {
    var ctx = menuCanvas.getContext('2d');
    if (!this.active) {
      ctx.drawImage(resetButton.image, 0, 0, 100, 111, resetButton.x, resetButton.y, this.width, this.height);
    }
    else {
      ctx.drawImage(resetButton.image, 100, 0, 100, 111, resetButton.x, resetButton.y, this.width, this.height);
    }
  };

  this.wasHit = function(x, y) {
    if (x > this.x && x < this.x + this.width && y > this.y && y < this.y + this.height) {
      return true;
    }
  };
}

//Classes
function Character(value, x, y, width, height, type) {
  this.value = value;
  this.originalX = x;
  this.originalY = y;
  this.x = x;
  this.y = y;
  this.width = width*0.8;
  this.height = height;
  this.type = type;
  this.matched = false;
  this.touchOffsetX = 0;
  this.touchOffsetY = 0;
  this.touchEventId = -1;

  this.draw = function() {
    var ctx = canvas.getContext('2d');
    ctx.font = letterSize + "px Courier";
    ctx.fillStyle = "#9c27b0";
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#e91e63";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    
    //Draw letters
    if (this.matched && this.type === 'drag') {
      return;
    } 

    if (this.matched || this.type === 'drag') {
      ctx.fillText(value, this.x, this.y);
    } else {
      ctx.strokeText(value, this.x, this.y);
    }
    
    if (DEBUG) {
      ctx.fillStyle = "rgba(193, 44, 44, 0.1)";
      ctx.fillRect(this.x, this.y, this.width, this.height);
    }
  };

  this.wasHit = function(x,y) {
    if (this.matched) {
      return false;
    }
    if (x >= this.x && x <= this.x + this.width && y >= this.y && y <= this.y + this.height) {
      return true;
    }
  };
}

function drawMenuCanvas() {
  var ctx = menuCanvas.getContext('2d');
  ctx.clearRect(0,0,menuCanvas.width, menuCanvas.height);
  resetButton.draw();
}

//currentSoundSprite = {};

// //Sound
// function loadSound() {
//   sound.load();
// }

// function playSound(start, length) {
//   if (soundEnabled) {
//     currentSoundSprite = {start: start, length: length};
//     sound.currentTime = start;
//     sound.play();
//   }
// }

// var onTimeUpdate = function() {
//   if (this.currentTime >= currentSoundSprite.start + currentSoundSprite.length) {
//       this.pause();
//   }
// };

// sound.addEventListener('timeupdate', onTimeUpdate, false);


//Events
window.requestAnimFrame = (function() {
  return window.requestAnimationFrame
       || window.webkitRequestAnimationFrame
       || window.mozRequestAnimationFrame
       || function(callback) {
          window.setTimeout(callback, 1000 / 60);
      };
}());

//Fisher-Yates Array shuffling algorithm.
//From here: http://sedition.com/perl/javascript-fy.html
function fisherYates(myArray) {
  var i, j, tempi, tempj;
  i = myArray.length;
  if ( i === 0 ) {
    return false;
  }
  while ( --i ) {
    j = Math.floor( Math.random() * ( i + 1 ) );
    tempi = myArray[i];
    tempj = myArray[j];
    myArray[i] = tempj;
    myArray[j] = tempi;
  }
}

function resetGame() {
  var viewportSize, words, word;
  viewportSize = getViewportSize();
  canvas.width = viewportSize.width;
  canvas.height = viewportSize.height;
  menuCanvas.width = viewportSize.width;
  menuCanvas.height = viewportSize.height;
  resetButton = new ResetButton();

  targetLetters = [];
  dragLetters = [];

  words = ['GAMAN', 'HRÖNN', 'KJARTAN', 'ÍSSKÁPUR', 'BÁTUR', 'KÚLUSÚKK', 'ERLENDUR', 'LOVÍSA', 'FANNAR', 
    'HÁLFDÁN', 'HJÖRDÍS', 'ÍSAK', 'RUT', 'BENJAMÍN', 'ALBERT', 'ÁGÚST', 'HREFNA', 'ÁRNI', 'HELGI', 'BERGSVEINN', 
    'SÆÞÓR' ];
  fisherYates(words);

  word = words.pop();

  function getLettersFromWord(word) {
    var letterX, letterY, i, char;

    letterSize = Math.floor(canvas.width * 0.9 / word.length);
    if (letterSize > 200) {
      letterSize = 200;
    }
    letterX = Math.floor(canvas.width * 0.18);
    letterY = Math.floor(canvas.height / 2 - letterSize / 2);
    for (i=0;i<word.length;i++) {
      if (word.charAt(i) !== ' ') { 
        char = new Character(word.charAt(i), letterX, letterY, letterSize * 0.7, letterSize, 'word');
        targetLetters.push(char);
        letterX += letterSize * 0.7;
      }
    }
  }

  getLettersFromWord(word);

  function generateDragLetters() {
    var xScatter, yScatter, i, char;
    xScatter = [];
    yScatter = [Math.floor(canvas.height*0.03*(Math.floor(Math.random())+1)),
                    Math.floor(canvas.height*0.1*(Math.floor(Math.random())+1)),
                    Math.floor(canvas.height*0.55*(Math.floor(Math.random())+1)),
                    Math.floor(canvas.height*0.7*(Math.floor(Math.random())+1)),
                    Math.floor(canvas.height*0.15*(Math.floor(Math.random())+1)),
                    Math.floor(canvas.height*0.05*(Math.floor(Math.random())+1)),
                    Math.floor(canvas.height*0.6*(Math.floor(Math.random())+1)),
                    Math.floor(canvas.height*0.75*(Math.floor(Math.random())+1)),
                    Math.floor(canvas.height*0.13*(Math.floor(Math.random())+1)),
                    Math.floor(canvas.height*0.22*(Math.floor(Math.random())+1)) ];

    targetLetters.forEach(function(letter) { 
      xScatter.push(letter.x * (Math.floor(Math.random())+1));
    });

    fisherYates(xScatter);
    fisherYates(yScatter);

    for (i=0;i<word.length;i++) {
      char = new Character(word.charAt(i), xScatter.pop(), yScatter.pop(), letterSize * 0.7, letterSize, 'drag');
      dragLetters.push(char);
    }
  }

  generateDragLetters();

  drawFrame();
  setTimeout(function() { drawMenuCanvas(); }, 100);
}

function getCursorPosition(e) {
  var x, y;
  if (e.pageX !== undefined && e.pageY !== undefined) {
    x = e.pageX;
    y = e.pageY;
  }
  else {
    x = e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
    y = e.clientY + document.body.scrollTop + document.documentElement.scrollTop;
  }
  x -= canvas.offsetLeft;
  y -= canvas.offsetTop;
  
  return {'x': x, 'y': y};
}

function mousedown(e) {
  var cursorPos = getCursorPosition(e);

  dragLetters.some(function(letter) {
    if (letter.wasHit(cursorPos.x, cursorPos.y)) {
      letter.touchOffsetX = cursorPos.x - letter.x;
      letter.touchOffsetY = cursorPos.y - letter.y;
      letter.touchEventId = e.identifier;
      return true;
    }
  });

  if (resetButton.wasHit(cursorPos.x, cursorPos.y)) {
    resetButton.active = true;
    drawMenuCanvas();
  }
}

function mousemove(e) {
  var cursorPos = getCursorPosition(e);
  
  dragLetters.forEach(function(letter) {
    if (e.identifier === letter.touchEventId) {
      letter.x = cursorPos.x - letter.touchOffsetX;
      letter.y = cursorPos.y - letter.touchOffsetY;

      window.requestAnimFrame(function() { drawFrame(); });
    }
  });
}

function mouseup(e) {
  var selectedLetter, cursorPos;
  selectedLetter = null;
  
  dragLetters.forEach(function(letter) { 
    if (letter.touchEventId === e.identifier) {
      selectedLetter = letter;
    }
  });
  if (selectedLetter) { 
    targetLetters.some(function(letter) {
      if (letter.wasHit(selectedLetter.x, selectedLetter.y)
          || letter.wasHit(selectedLetter.x, selectedLetter.y + selectedLetter.height)
          || letter.wasHit(selectedLetter.x + selectedLetter.width, selectedLetter.y)
          || letter.wasHit(selectedLetter.x + selectedLetter.width, selectedLetter.y + selectedLetter.height)) {
        if (selectedLetter.value === letter.value){
          letter.matched = true;
          selectedLetter.matched = true;

          // if (letter.value == 'A') {
          //   playSound(0, 0.4);
          // }
          // else if (letter.value == 'B') {
          //   playSound(1, 0.5);
          // }

          return true;
        }
        // else {
        //   playSound(4, 0.8);
        // }
      }
    });

    selectedLetter.touchEventId = -1;

    window.requestAnimFrame(function() {
      drawFrame();
    });
  }
  else {
    cursorPos = getCursorPosition(e);
    if (resetButton.wasHit(cursorPos.x, cursorPos.y)) {
      resetGame();
    }
  }

  resetButton.active = false;
  drawMenuCanvas();
}

function touchstart(e) {
  var i;
  for (i=0; i<e.touches.length; i++) {
    mousedown(e.touches[i]);
  }
}

function touchmove(e) {
  var i;
  for (i=0; i<e.touches.length; i++) {
    mousemove(e.touches[i]);
  }
}

function touchend(e) {
  var i;
  for (i=0; i<e.changedTouches.length; i++) {
    mouseup(e.changedTouches[i]);
  }
}

//Android touch event fix.
function touchHandlerDummy(e)
{
    e.preventDefault();
    return false;
}
document.addEventListener("touchstart", touchHandlerDummy, false);
document.addEventListener("touchmove", touchHandlerDummy, false);
document.addEventListener("touchend", touchHandlerDummy, false);

document.addEventListener("click", touchHandlerDummy, false);

//Mouse events
document.addEventListener("mousedown", mousedown, false);
document.addEventListener("mouseup", mouseup, false);
document.addEventListener("mousemove", mousemove, false);

//Touch events
document.addEventListener("touchstart", touchstart, false);
document.addEventListener("touchend", touchend, false);
document.addEventListener("touchmove", touchmove, false);


window.onresize = function() {
  //TODO: do this more gracefully.
  resetGame();
  setTimeout(function() { drawMenuCanvas(); }, 300);
};

resetGame();
setTimeout(function() { drawMenuCanvas(); }, 300);