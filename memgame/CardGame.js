/*jslint browser: true, devel: true, sloppy: true, sub: false, white: true, maxerr: 1000 */
// Card Game
var board, card, clickEnabled, flippedCards, matchedCardsCount;

flippedCards = [];
matchedCardsCount = 0;
clickEnabled = true;

/***************************/
/***** Helpers module ******/
/***************************/
var Helpers = (function() { 
    "use strict";
    var getCursorPosition, getViewportSize, fisherYates;

    getCursorPosition = function(e, canvas) {
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
            
        //Android touch co-ordinates
        if (x === 0 && y === 0) {
            x = e.changedTouches[0].pageX;
            y = e.changedTouches[0].pageY;
        }

        return {'x': x, 'y': y};
    };

    getViewportSize = function() {
        var viewWidth = 0, viewHeight = 0;

        if (typeof(window.innerWidth) === 'number') 
        {
          //Modern browsers
          viewWidth = window.innerWidth;
          viewHeight = window.innerHeight;
        } 
        else if(document.documentElement && document.documentElement.clientWidth)
        {
            //IE 6+ in 'standards compliant mode'
            viewWidth = document.documentElement.clientWidth;
            viewHeight = document.documentElement.clientHeight;
        }
        return {'width': viewWidth, 'height': viewHeight};
    };

    fisherYates = function(myArray) {
        var i = myArray.length, j, tempi, tempj;
        if ( i === 0 ) { return false; }
        while (i > 0) {
            j = Math.floor(Math.random() * i);
            tempi = myArray[i-1];
            tempj = myArray[j];
            myArray[i-1] = tempj;
            myArray[j] = tempi;
            i -= 1;
        }
    };

    return { 
        getCursorPosition: getCursorPosition,
        getViewportSize: getViewportSize,
        fisherYates: fisherYates
    };
}());

/****************/
/***** Card *****/
/****************/

var Card = function(col, row, value, flipped, xpos, ypos, matched) {
    this.col = col;
    this.row = row;
    this.value = value;
    this.flipped = flipped;
    this.xpos = xpos;
    this.ypos = ypos;
    this.matched = matched;
    this.image = new Image();
    this.beinghovered = false;
};

Card.prototype.toJSON = function() {
    return {
        'col': this.col,
        'row': this.row,
        'value' : this.value,
        'flipped': this.flipped,
        'xpos': this.xpos,
        'ypos': this.ypos,
        'matched': this.matched
        };
};

Card.fromJSON = function(json) {
    return new Card(json.col, json.row, json.value, json.flipped, json.xpos, json.ypos, json.matched);
};

Card.prototype.loadImage = function() {
    console.log('loading image for', this.value);
    this.image = new Image();
    this.image.src = "memgame_imgs/" + this.value;
};

Card.prototype.draw = function(canvasContext, width, height) {
    var imgHeight, imgWidth, imgRatio, x, y;

    if (this.flipped || this.matched) {
        canvasContext.fillStyle = '#9c27b0';
        canvasContext.fillRect(this.xpos, this.ypos, width, height);
        canvasContext.fillStyle = '#ffffff';
        canvasContext.fillRect(this.xpos+5, this.ypos+5, width-10, height-10);

        //The following should be done differently.
        imgHeight = this.image.height;
        imgWidth = this.image.width;
        imgRatio = height / imgHeight;

        if (imgHeight >= height) {
            imgHeight = imgRatio * imgHeight;
            imgWidth = imgRatio * imgWidth;
        }
        else if (imgHeight * 1.5 < height) {
            imgHeight *= 1.4;
            imgWidth *= 1.4;
        }

        x = this.xpos + (width - imgWidth)/2;
        y = this.ypos + (height - imgHeight)/2; 

        canvasContext.drawImage(this.image, x, y, imgWidth, imgHeight);
    }
    else if (this.beinghovered) {
        canvasContext.fillStyle = '#fbc02d';
        canvasContext.fillRect(this.xpos+2, this.ypos+2, width-4, height-4);
    }
    else {
        canvasContext.fillStyle = '#ffeb3b';
        canvasContext.fillRect(this.xpos, this.ypos, width, height);
    }

    //console.log('Card drawn at (',this.xpos,',',this.ypos,')');
};

/********/
/* Menu */
/********/
var MenuItem = function(text, width, height, xpos, ypos, action) {
    this.text = text;
    this.xpos = xpos;
    this.ypos = ypos;
    this.width = width;
    this.height = height;
    this.action = action;
    this.beinghovered = false;
};

var Menu = function() {
    this.menuItems = [];
};

Menu.prototype.draw = function(canvasContext) {
    var i;

    for (i = 0; i < this.menuItems.length; i += 1) {
        this.menuItems[i].draw(canvasContext);
    }
};

MenuItem.prototype.draw = function(canvasContext) {
    var fontSize;

    if (this.beinghovered) { canvasContext.fillStyle = '#bf360c'; }
    else { canvasContext.fillStyle = '#ff5722'; }

    canvasContext.fillRect(this.xpos, this.ypos, this.width, this.height);

    canvasContext.fillStyle = "white";
    fontSize = Math.ceil(this.height * 0.6);
    canvasContext.font = fontSize + "px Georgia";
    canvasContext.textAlign = "center";
    canvasContext.textBaseline = "middle";
    canvasContext.fillText(this.text, (this.xpos + this.width/2), (this.ypos + this.height/2));
};

Menu.prototype.menuItemHit = function(x, y) {
    var i;
    for (i = 0; i < this.menuItems.length; i += 1) {
        if (x >= this.menuItems[i].xpos && x <= this.menuItems[i].xpos + this.menuItems[i].width && y >= this.menuItems[i].ypos && y <= this.menuItems[i].ypos + this.menuItems[i].height) {
            this.menuItems[i].beinghovered = true;
        }
        else {
            this.menuItems[i].beinghovered = false;
        }
    }
};


/*****************/
/***** Board *****/
/*****************/
var Board = function(canvas, boardShortEdge, boardLongEdge) {
    //Properties
    this.boardShortEdge = boardShortEdge;
    this.boardLongEdge = boardLongEdge;
    this.columnCount = 0;
    this.rowCount = 0;
    this.spacerWidth = 0;
    this.cards = [];
    this.cardWidth = 0;
    this.cardHeight = 0;
    this.menuHeight = 0;
    this.canvas = canvas;
    this.viewportSize = null;
    this.menu = new Menu();
    //Get size of inner window and apply to canvas.

    //this.initialize(true, boardShortEdge, boardLongEdge);    
};

Board.prototype.initialize = function(generateCards, boardShortEdge, boardLongEdge) {

    if (boardShortEdge !== undefined) { this.boardShortEdge = boardShortEdge; }
    if (boardShortEdge !== undefined) { this.boardLongEdge = boardLongEdge; }
    this.viewportSize = Helpers.getViewportSize();
    this.menuHeight = this.viewportSize.height * 0.07;

    this.prepareCanvas();
    this.findOrientation();
    this.findCardDimensions();        

    if (generateCards) {
        this.generateCards();
        this.assignValuesToCards();
    }

    this.setCardPositions();

    this.createMenuItems();
    this.draw();
};

Board.prototype.prepareCanvas = function() {
    var canvasContext;
    
    this.canvas.width = this.viewportSize.width;
    this.canvas.height = this.viewportSize.height;

    canvasContext = this.canvas.getContext("2d");
    canvasContext.clearRect(0, 0, this.canvas.width, this.canvas.height);
};

Board.prototype.findOrientation = function() {
    if (this.viewportSize.width <= this.viewportSize.height) {
        //Device / window is in portrait.
        this.columnCount = this.boardShortEdge;
        this.rowCount = this.boardLongEdge;
        this.spacerWidth = Math.floor(this.viewportSize.height * 0.01);
    }
    else {
        //Device / window is in landscape.
        this.columnCount = this.boardLongEdge;
        this.rowCount = this.boardShortEdge;
        this.spacerWidth = Math.floor(this.viewportSize.width * 0.01);
    }
};

Board.prototype.createMenuItems = function() {
    var menuItemWidth, menuItemHeight, menuItemCount, menuItemXpos, menuItemYpos, board;
    this.menu.menuItems = [];
    board = this; //to be used when setting the action of the menu item.

    menuItemCount = 3;
    menuItemWidth = (this.viewportSize.width - this.spacerWidth * (menuItemCount + 1)) / menuItemCount;
    menuItemHeight = this.menuHeight - this.spacerWidth;
    menuItemYpos = this.spacerWidth;
                                            
    menuItemXpos = this.spacerWidth;
    
    this.menu.menuItems.push(new MenuItem("Nýtt 3x4", menuItemWidth, menuItemHeight, menuItemXpos, menuItemYpos, function() {board.initialize(true, 3, 4); } ));
    menuItemXpos = menuItemWidth * this.menu.menuItems.length + this.spacerWidth * this.menu.menuItems.length + this.spacerWidth;
    this.menu.menuItems.push(new MenuItem("Nýtt 4x5", menuItemWidth, menuItemHeight, menuItemXpos, menuItemYpos, function() {board.initialize(true, 4, 5);} ));
    menuItemXpos = menuItemWidth * this.menu.menuItems.length + this.spacerWidth * this.menu.menuItems.length + this.spacerWidth;
    menuItemWidth -= 2;
    this.menu.menuItems.push(new MenuItem("Nýtt 5x6", menuItemWidth, menuItemHeight, menuItemXpos, menuItemYpos, function() {board.initialize(true, 5, 6);} ));
};

Board.prototype.findCardDimensions = function() {
    //Determine what the width and height of the cards should be.
    this.cardWidth = Math.floor(((this.viewportSize.width - this.spacerWidth) / this.columnCount) - this.spacerWidth);
    this.cardHeight = Math.floor(((this.viewportSize.height - this.menuHeight - this.spacerWidth) / this.rowCount) - this.spacerWidth);
};

Board.prototype.setCardPositions = function() {
    var i;

    for (i = 0; i < this.cards.length; i += 1) {
        this.cards[i].col = i % this.columnCount;
        this.cards[i].row = i % this.rowCount;
        this.cards[i].xpos = this.spacerWidth + (this.cards[i].col * this.cardWidth + this.spacerWidth * this.cards[i].col);
        this.cards[i].ypos = this.spacerWidth + (this.cards[i].row * this.cardHeight + this.spacerWidth * this.cards[i].row) + this.menuHeight;
    }
};

Board.prototype.draw = function() {
    var canvasContext, i;
    //Draw background
    canvasContext = this.canvas.getContext("2d");
    canvasContext.fillStyle = '#2c3e50';
    canvasContext.fillRect(0, 0, this.canvas.width, this.canvas.height);

    //Draw all cards
    for (i = 0; i < this.cards.length; i += 1) {
        this.cards[i].draw(canvasContext, this.cardWidth, this.cardHeight);
    }

    this.menu.draw(canvasContext);
    this.updateLocalStorage();
};

Board.prototype.addCard = function(card) {
    if (this.cards.length >= this.columnCount * this.rowCount) {
        //Trying to add more cards than there are places in the board.
        return;
    }

    card.col = this.cards.length % this.columnCount;
    card.row = this.cards.length % this.rowCount;

    this.cards.push(card);
};

Board.prototype.generateCards = function() {
    var i, cardCount, card;
    this.cards = [];

    cardCount = this.columnCount * this.rowCount;

    for (i = 0; i < cardCount; i += 1) {
        card = new Card(0, 0, null, false, 0, 0, false);
        this.addCard(card);
    }
};

Board.prototype.assignValuesToCards = function() {
    var values, valuesCount, i, n;
    values = ['128_dog5.png', '1_fish.png', '2_fish.png', 'babelfish.png', 'big_foot.png', 'bird.png', 'black_cat.png', 'black_leopard.png', 'bullfinch_2.png', 'cat(1).png', 'cat(2).png', 'cat(3).png', 'cat(4).png', 'cat(5).png', 'cat.png', 'cat5.png', 'cat_3.png', 'dog(1).png', 'dog.png', 'dog_2.png', 'dog_vista_archigraphs.png', 'dragon_fly.png', 'elephant.png', 'fish.png', 'flying_bird_sparkles.png', 'frog.png', 'hp_cat.png', 'hp_dog.png', 'i_hate_cats.png', 'jelly_fish.png', 'kbugbuster.png', 'ladybug.png', 'nessy.png', 'penguin.png', 'polar_bear.png', 'remember_the_milk.png', 'turtle.png', 'wallace_128.png', 'ware_wolf.png'];
    Helpers.fisherYates(values);

    valuesCount = this.cards.length/2;

    values = values.slice(0,valuesCount);
    for (i = 0; i < valuesCount; i += 1) {
        values.push(values[i]);
    }

    Helpers.fisherYates(values);

    for (n = 0; n < values.length; n += 1)
    {
        this.cards[n].value = values[n];
        this.cards[n].loadImage();
    }
};

Board.prototype.cardHit = function(x, y) {
    var i, card;
    card = -1;

    for (i = 0; i < this.cards.length; i += 1) {
        if (x >= this.cards[i].xpos && x <= this.cards[i].xpos + this.cardWidth
            && y >= this.cards[i].ypos && y <= this.cards[i].ypos + this.cardHeight) {
            card = this.cards[i];
            card.beinghovered = true;
        }
        else {
            this.cards[i].beinghovered = false;
        }
    }

    return card;
};

Board.prototype.doFlipLogic = function(card) {
    if (this.matched) {
        return;
    }

    card.flipped = true;    
    
    if (flippedCards.length === 0) {    
        flippedCards.push(card);
    }
    else if (flippedCards.length === 1) {
        if (flippedCards[0].col === card.col && flippedCards[0].row === card.row) {
            //Already flipped card clicked.
            return;
        }
        if (flippedCards[0].value === card.value) {
            //Match found.
            card.matched = true;
            flippedCards[0].matched = true;
            matchedCardsCount += 2;
            flippedCards = [];
        }
        else {
            //No match!
            flippedCards.push(card);
        }
    }
    else if (flippedCards.length === 2) {
        if ((flippedCards[0].col === card.col && flippedCards[0].row === card.row) || (flippedCards[1].col === card.col && flippedCards[1].row === card.row)) {
            //Already flipped card clicked.
            return;
        }
        var cardToReflip = flippedCards.pop();
        cardToReflip.flipped = false;
        cardToReflip = flippedCards.pop();
        cardToReflip.flipped = false;

        flippedCards = [];
        flippedCards.push(card);
    }
    else {
        alert("This shouldn't have happened! More than 2 cards flipped!");
    }
    this.draw();
    
    //if (matchedCardsCount == boardLongEdge * boardShortEdge)
    //    gameOver();
};

Board.prototype.readFromLocalStorage = function() {
    var i, card, storedCards;

    matchedCardsCount = 0;
    
    if (localStorage.cards && localStorage.cards !== '') {
        console.log('reading from localStorage');
        storedCards = JSON.parse(localStorage.cards);
        for (i = 0; i < storedCards.length; i += 1) {
            card = storedCards[i];
            if (card.flipped && !card.matched) {
                card.flipped = false;
            }
            else if (card.matched) {
                matchedCardsCount += 1;
            }

            this.cards.push(Card.fromJSON(storedCards[i]));
            this.cards[i].loadImage();
        }
        this.boardLongEdge = parseInt(localStorage.boardLongEdge, 10) || 4;
        this.boardShortEdge = parseInt(localStorage.boardShortEdge, 10) || 3;
        this.initialize(false);
        return true;
    }
    return false;     
};

 Board.prototype.updateLocalStorage = function() {
     var cardsForJSON, i;
     cardsForJSON = [];
     localStorage.cards = '';

     for (i = 0; i < this.cards.length; i += 1) {
         cardsForJSON.push(this.cards[i].toJSON());
     }

     localStorage.cards = JSON.stringify(cardsForJSON);
     localStorage.boardLongEdge = this.boardLongEdge;
     localStorage.boardShortEdge = this.boardShortEdge;
 };

/* Board ends */


/********/
/* Game */
/********/
var Game = function(canvas) {
    var localStorageUsed = false;
    this.board = new Board(canvas, 3, 4);
    localStorageUsed = this.board.readFromLocalStorage();
    if (!localStorageUsed) { 
       this.board.initialize(true);
    }
};


var canvas = document.createElement("canvas");
document.body.appendChild(canvas);

var game = new Game(canvas);


/******************/
/* Event handlers */
/******************/
function imagesLoadedEventHandler() {
    game.board.draw();
}

game.board.cards[game.board.cards.length-1].image.addEventListener('load', imagesLoadedEventHandler, false);

function onClick(e) {
    var cursorPos, card, i, len;
    cursorPos = Helpers.getCursorPosition(e, game.board.canvas);

    card = game.board.cardHit(cursorPos.x, cursorPos.y);

    if (card === -1) {
        game.board.menu.menuItemHit(cursorPos.x, cursorPos.y);
    }

    for (i = 0, len = game.board.cards.length; i < len; i += 1) {
        if (game.board.cards[i].beinghovered) {
            game.board.doFlipLogic(game.board.cards[i]);
        }
    }

    return false;
}

function clickevent(e) {
    console.log('clicked');
    e.preventDefault(); 
    if (clickEnabled) {
        return onClick(e);
    }
}

function touchstartevent(e) {
    console.log('touched');
    e.preventDefault();
    clickEnabled = false;
}    

function touchmoveevent(e) {
    var cursorPos;
    e.preventDefault();

    cursorPos = Helpers.getCursorPosition(e, game.board.canvas);
    card = game.board.cardHit(cursorPos.x, cursorPos.y);

    if (card === -1) {
        game.board.menu.menuItemHit(cursorPos.x, cursorPos.y);
    }

    game.board.draw();
}

function touchendevent(e) {
    var cursorPos, card, i, len;
    e.preventDefault();

    cursorPos = Helpers.getCursorPosition(e, game.board.canvas);
    console.log(cursorPos);

    card = game.board.cardHit(cursorPos.x, cursorPos.y);

    if (card === -1) {
        game.board.menu.menuItemHit(cursorPos.x, cursorPos.y);
    }

    for (i = 0, len = game.board.cards.length; i < len; i += 1) {
        if (game.board.cards[i].beinghovered) {
            game.board.cards[i].beinghovered = false;
            game.board.doFlipLogic(game.board.cards[i]);
        }
    }

    for (i = 0; i < game.board.menu.menuItems.length; i += 1) {
        if (game.board.menu.menuItems[i].beinghovered) {
            game.board.menu.menuItems[i].beinghovered = false;
            game.board.menu.menuItems[i].action();
        }
    }

    game.board.draw();
}

//document.addEventListener('click', clickevent, false);
document.addEventListener('mousedown', touchstartevent, false);
document.addEventListener('mousemove', touchmoveevent, false);
document.addEventListener('mouseup', touchendevent, false);
document.addEventListener('touchstart', touchstartevent, false);
document.addEventListener('touchmove', touchmoveevent, false);
document.addEventListener('touchend', touchendevent, false);


//When window is resized or orientation changed, update the board.
window.onresize = function() {
    console.log('resized');
    game.board.initialize(false, game.board.boardShortEdge, game.board.boardLongEdge);
};