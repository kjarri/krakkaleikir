/*jslint browser: true, devel: true, sloppy: false, sub: false, maxerr: 1000, white: true, plusplus: true*/

var Helpers, DrawGame, Events;

/***************************/
/***** Helpers module ******/
/***************************/
Helpers = (function() { 
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

    //From here: http://stackoverflow.com/a/13844062
    Object.prototype.clone = function() {
        var i, newObj;
        newObj = (this instanceof Array) ? [] : {};

        for (i in this) {
            if (this.hasOwnProperty(i)) {
                if (i !== 'clone') {             
                    if (this[i] && typeof this[i] === "object") {
                        newObj[i] = this[i].clone();
                    } 
                    else { 
                        newObj[i] = this[i]; 
                    }
                }
            }
        } 

        return newObj;
    };

    return { 
        getCursorPosition: getCursorPosition,
        getViewportSize: getViewportSize,
        fisherYates: fisherYates
    };
}());

DrawGame = (function () {
    'use strict';
    var PaintBucket, NewGameButton, BucketSelection, Game, PaintCanvas;

    NewGameButton = function(x, y, width) { 
        this.X = x;
        this.Y = y;
        this.Selected = false;
        this.Width = width;
        this.Height = width;
    };

    NewGameButton.prototype.draw = function(canvas) {
        var canvasContext;

        canvasContext = canvas.getContext('2d');
        //canvasContext.imageSmoothingEnabled = false.
        canvasContext.webkitImageSmoothingEnabled=true;
        if (this.Selected) {
            canvasContext.fillStyle = '#bdbdbd';
        }
        else {
            canvasContext.fillStyle = '#ffffff';
        }   
        canvasContext.strokeStyle = 'black';

        canvasContext.lineWidth = 5;
        canvasContext.fillRect(this.X, this.Y, this.Width, this.Height);
        canvasContext.fill();
        canvasContext.strokeRect(this.X, this.Y, this.Width, this.Height);
    };

    NewGameButton.prototype.wasHit = function(x, y) {
        if (x > this.X && x < this.X + this.Width && y > this.Y && y < this.Y + this.Height ) {
            return true;
        }
        return false;
    };

    PaintBucket = function (color, x, y, radius) {
        this.Color = color; //Color
        this.Selected = false;
        this.X = x;
        this.Y = y;
        this.Radius = radius;
    };

    PaintBucket.prototype.draw = function (canvas) {
        var canvasContext;

        canvasContext = canvas.getContext('2d');
        //canvasContext.imageSmoothingEnabled = false.
        canvasContext.webkitImageSmoothingEnabled=true;
        canvasContext.fillStyle = this.Color;
        if (this.Selected) {
            canvasContext.strokeStyle = 'grey';
        }
        else {
            canvasContext.strokeStyle = 'black';
        }
        canvasContext.lineWidth = 5;
        canvasContext.lineCap = 'round';
        canvasContext.beginPath();
        canvasContext.arc(this.X, this.Y, this.Radius, 0, 2 * Math.PI);
        canvasContext.fill();
        canvasContext.stroke();
    };

    PaintBucket.prototype.wasHit = function(x, y) {
        if ((Math.pow((x - this.X), 2) + Math.pow((y - this.Y), 2)) < Math.pow(this.Radius, 2)) {
            return true;
        }
        return false;
    };

    BucketSelection = function () {    
        this.ViewportSize = Helpers.getViewportSize();
        this.Buckets = [];
        this.SelectedBucket = null;
        this.BucketRadius = 30;
        this.Landscape = true;

        this.Canvas = document.createElement("canvas");
        document.body.appendChild(this.Canvas);

        this.reset();

        this.createBuckets();
        this.draw();
    };

    BucketSelection.prototype.resize = function() {
        this.reset();
        this.createBuckets();
        this.draw();
    };    

    BucketSelection.prototype.reset = function() {
        var context;

        context = this.Canvas.getContext('2d');
        context.clearRect(0, 0, this.Canvas.width, this.Canvas.height);

        this.ViewportSize = Helpers.getViewportSize();
        this.Landscape = this.ViewportSize.width > this.ViewportSize.height;
        if (this.Landscape) {
            this.Canvas.width = Math.floor(this.ViewportSize.width * 0.08);
            this.Canvas.height = this.ViewportSize.height;
        }
        else {
            this.Canvas.height = Math.floor(this.ViewportSize.height * 0.08);
            this.Canvas.width = this.ViewportSize.width;   
        }
        this.Canvas.style.backgroundColor = 'rgba(0,0,0,0.05)';
        this.Canvas.style.zIndex = 100;
    };

    BucketSelection.prototype.createBuckets = function() {
        var colors, bucketX, bucketY, i, bucketRadius;

        this.Buckets = [];

        if (this.Landscape) {
            bucketX = Math.floor(this.ViewportSize.width * 0.04);
            bucketY = Math.floor(this.ViewportSize.width * 0.04);
            bucketRadius = Math.floor(this.Canvas.width * 0.35); 
        }
        else {
            bucketX = Math.floor(this.ViewportSize.height * 0.04);
            bucketY = Math.floor(this.ViewportSize.height * 0.04);
            bucketRadius = Math.floor(this.Canvas.height * 0.35); 
        }

        this.NewGameButton = new NewGameButton(bucketX - bucketRadius, bucketY - bucketRadius, bucketRadius * 2);
        //colors = ['#0099cc', '#9933cc', '#669900', '#ff8800', '#cc0000'];
        //Colors from google UI tips:
        colors = ['#e51c23', '#9c27b0', '#5677fc', '#259b24', '#ff9800', '#000000', '#ffffff'];
        
        for (i = 0; i < colors.length; i++) {
            if (this.Landscape) { bucketY += Math.floor(bucketRadius * 3); }
            else { bucketX += Math.floor(bucketRadius * 3); }
            this.Buckets.push(new PaintBucket(colors[i], bucketX, bucketY, bucketRadius));
        }
        this.Buckets[0].Selected = true;
        if (this.SelectedBucket === null) {
            this.SelectedBucket = this.Buckets[0];  
        }
    };

    BucketSelection.prototype.draw = function () {
        this.NewGameButton.draw(this.Canvas);
        var i;
        for (i = this.Buckets.length - 1; i >= 0; i--) {
            this.Buckets[i].draw(this.Canvas, this.BucketRadius);
        }
    };

    BucketSelection.prototype.clicked = function(x, y) {
        var i;
        for (i = this.Buckets.length - 1; i >= 0; i--) {
            if (this.Buckets[i].wasHit(x, y)) {
                this.changeSelectedBucket(this.Buckets[i]);
            }
        }
    };

    BucketSelection.prototype.changeSelectedBucket = function(bucket) {
        this.SelectedBucket.Selected = false;
        bucket.Selected = true;
        this.SelectedBucket = bucket;
        this.draw();
    };

    BucketSelection.prototype.wasNewGameButtonHit = function(x, y) {
        if (this.NewGameButton.wasHit(x, y)) {
            return true;
        }
        return false;
    };

    BucketSelection.prototype.getHitBucket = function(x,y) {
        var i;
        for (i = this.Buckets.length - 1; i >= 0; i--) {
            if (this.Buckets[i].wasHit(x,y)) {
                return this.Buckets[i];
            }
        }
        return null;
    };

    //PaintCanvas is the drawing area.
    PaintCanvas = function () {
        this.Canvas = document.createElement("canvas");
        this.Canvas.style.zIndex = 10;
        document.body.appendChild(this.Canvas);
        this.ViewportSize = Helpers.getViewportSize();

        this.Canvas.width = this.ViewportSize.width;
        this.Canvas.height = this.ViewportSize.height;

        this.PaintVectors = [];
        this.ColorForVectors = [];
    };

    PaintCanvas.prototype.resize = function() {        
        this.ViewportSize = Helpers.getViewportSize();
        this.Canvas.width = this.ViewportSize.width;
        this.Canvas.height = this.ViewportSize.height;

        this.redraw();
    };

    PaintCanvas.prototype.drawBetweenPoints = function(pointA, pointB, context) {
        var cX, cY;

        cX = (pointA.x + pointB.x) / 2;
        cY = (pointA.y + pointB.y) / 2;

        context.beginPath();
        context.moveTo(pointA.x, pointA.y);

        context.quadraticCurveTo(pointA.x, pointA.y, cX, cY);
        context.quadraticCurveTo(cX, cY, pointB.x, pointB.y);

        context.stroke();
    };

    PaintCanvas.prototype.drawDot = function(point, context) {
        context.beginPath();
        context.arc(point.x, point.y, Math.sqrt(6), 0, 2*Math.PI);
        context.fill();
    };

    PaintCanvas.prototype.redraw = function() {
        var context, i, n, point, nextPoint;
        
        context = this.Canvas.getContext('2d');
        context.lineCap = 'round';
        context.lineWidth = 6;

        for (i = 0; i < this.PaintVectors.length; i += 1) {
            context.strokeStyle = this.ColorForVectors[i];

            if (this.PaintVectors[i].length === 1) {
                point = this.PaintVectors[i];
                this.drawDot(point, context);
            }
            else {
                for (n = 0; n < this.PaintVectors[i].length-1; n += 1) {
                    point = this.PaintVectors[i][n];
                    nextPoint = this.PaintVectors[i][n+1];
                    
                    this.drawBetweenPoints(point, nextPoint, context);
                }
            }   
        }
    };

    Game = function () {
        this.PaintCanvas = new PaintCanvas();
        this.BucketSelection = new BucketSelection();
    };

    Game.prototype.draw = function () {
        this.BucketSelection.draw();
    };

    Game.prototype.reset = function() {
        this.PaintCanvas.PaintVectors = [];
        this.PaintCanvas.ColorForVectors = [];
        this.PaintCanvas.Canvas.width = this.PaintCanvas.ViewportSize.width;
    };

    return {
        //PaintCanvas: PaintCanvas,
        //BucketSelection: BucketSelection,
        Game: Game
    };
}());

Events = (function () {
    'use strict';
    var cursorPos, isDrawing, allPoints, game;

    allPoints = [];
    game = new DrawGame.Game();
    isDrawing = false;

    function drawdot(e) {
        var color, context;
        color = game.BucketSelection.SelectedBucket.Color;

        cursorPos = Helpers.getCursorPosition(e, game.BucketSelection.Canvas);
        context = game.PaintCanvas.Canvas.getContext('2d');
        context.fillStyle = color;
        game.PaintCanvas.drawDot(cursorPos, context);
    }

    function mousedown(e) {
        allPoints[e.identifier] = [];
        cursorPos = Helpers.getCursorPosition(e, game.BucketSelection.Canvas);
        isDrawing = true;

        if (game.BucketSelection.wasNewGameButtonHit(cursorPos.x, cursorPos.y)) {
            console.log('Game reset');
            game.reset();
            return;
        }

        var hitBucket = game.BucketSelection.getHitBucket(cursorPos.x, cursorPos.y);
        if (hitBucket !== null) {
            game.BucketSelection.changeSelectedBucket(hitBucket);
            console.log('bucket changed to', game.BucketSelection.SelectedBucket.Color);
        }
        else {
            drawdot(e);
            cursorPos = Helpers.getCursorPosition(e, game.PaintCanvas.Canvas);
            allPoints[e.identifier].push({'x': cursorPos.x, 'y': cursorPos.y});
        }
    }

    function mousemove(e) {
        var context, touchX, touchY, color, pointA, pointB;
        color = game.BucketSelection.SelectedBucket.Color;
        cursorPos = Helpers.getCursorPosition(e, game.PaintCanvas.Canvas);

        if (isDrawing) {
            context = game.PaintCanvas.Canvas.getContext('2d');
            touchX = cursorPos.x;
            touchY = cursorPos.y;

            allPoints[e.identifier].push({'x': touchX, 'y': touchY});

            context.beginPath();
            context.strokeStyle = color;
            context.lineCap = 'round';
            context.lineWidth = 6;

            if (allPoints[e.identifier].length > 1) {
                pointA = allPoints[e.identifier][allPoints[e.identifier].length-2];
                pointB = cursorPos;
                
                game.PaintCanvas.drawBetweenPoints(pointA, pointB, context);
            }
        }
    }

    function mouseup(e) {
        isDrawing = false;
        game.PaintCanvas.PaintVectors.push(allPoints[e.identifier].clone());
        game.PaintCanvas.ColorForVectors.push(game.BucketSelection.SelectedBucket.Color);
        allPoints[e.identifier] = [];
    }

    function touchstart(e) {
        var i;
        e.preventDefault();
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
        game.PaintCanvas.resize();
        window.setTimeout(function() { game.BucketSelection.resize(); }, 600);
    };

    return {
        Game: game
    };
}());