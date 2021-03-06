// Canvas Asteroids
//
// Copyright (c) 2010 Doug McInnes
// Modified by John Thurmond

KEY_CODES = {
  32: 'space',
  37: 'left',
  38: 'up',
  39: 'right',
  40: 'down',
  70: 'f',
  71: 'g',
  72: 'h',
  77: 'm',
  80: 'p'
}

KEY_STATUS = { keyDown:false };
for (code in KEY_CODES) {
  KEY_STATUS[KEY_CODES[code]] = false;
}

$(window).keydown(function (e) {
  KEY_STATUS.keyDown = true;
  if (KEY_CODES[e.keyCode]) {
    e.preventDefault();
    KEY_STATUS[KEY_CODES[e.keyCode]] = true;
  }
}).keyup(function (e) {
  KEY_STATUS.keyDown = false;
  if (KEY_CODES[e.keyCode]) {
    e.preventDefault();
    KEY_STATUS[KEY_CODES[e.keyCode]] = false;
  }
});

GRID_SIZE = 60;

Matrix = function (rows, columns) {
  var i, j;
  this.data = new Array(rows);
  for (i = 0; i < rows; i++) {
    this.data[i] = new Array(columns);
  }

  this.configure = function (rot, scale, transx, transy) {
    var rad = (rot * Math.PI)/180;
    var sin = Math.sin(rad) * scale;
    var cos = Math.cos(rad) * scale;
    this.set(cos, -sin, transx,
             sin,  cos, transy);
  };

  this.set = function () {
    var k = 0;
    for (i = 0; i < rows; i++) {
      for (j = 0; j < columns; j++) {
        this.data[i][j] = arguments[k];
        k++;
      }
    }
  }

  this.multiply = function () {
    var vector = new Array(rows);
    for (i = 0; i < rows; i++) {
      vector[i] = 0;
      for (j = 0; j < columns; j++) {
        vector[i] += this.data[i][j] * arguments[j];
      }
    }
    return vector;
  };
};

Sprite = function () {
  this.init = function (name, points) {
    this.name     = name;
    this.points   = points;

    this.vel = {
      x:   0,
      y:   0,
      rot: 0
    };

    this.acc = {
      x:   0,
      y:   0,
      rot: 0
    };
  };

  this.children = {};

  this.visible  = false;
  this.reap     = false;
  this.bridgesH = true;
  this.bridgesV = true;

  this.collidesWith = [];

  this.x     = 0;
  this.y     = 0;
  this.rot   = 0;
  this.scale = 1;

  this.currentNode = null;
  this.nextSprite  = null;

  this.preMove  = null;
  this.postMove = null;

  this.run = function(delta) {

    this.move(delta);
    this.updateGrid();

    this.context.save();
    this.configureTransform();
    this.draw();

    var canidates = this.findCollisionCanidates();

    this.matrix.configure(this.rot, this.scale, this.x, this.y);
    this.checkCollisionsAgainst(canidates);

    this.context.restore();

    if (this.bridgesH && this.currentNode && this.currentNode.dupe.horizontal) {
      this.x += this.currentNode.dupe.horizontal;
      this.context.save();
      this.configureTransform();
      this.draw();
      this.checkCollisionsAgainst(canidates);
      this.context.restore();
      if (this.currentNode) {
        this.x -= this.currentNode.dupe.horizontal;
      }
    }
    if (this.bridgesV && this.currentNode && this.currentNode.dupe.vertical) {
      this.y += this.currentNode.dupe.vertical;
      this.context.save();
      this.configureTransform();
      this.draw();
      this.checkCollisionsAgainst(canidates);
      this.context.restore();
      if (this.currentNode) {
        this.y -= this.currentNode.dupe.vertical;
      }
    }
    if (this.bridgesH && this.bridgesV &&
        this.currentNode &&
        this.currentNode.dupe.vertical &&
        this.currentNode.dupe.horizontal) {
      this.x += this.currentNode.dupe.horizontal;
      this.y += this.currentNode.dupe.vertical;
      this.context.save();
      this.configureTransform();
      this.draw();
      this.checkCollisionsAgainst(canidates);
      this.context.restore();
      if (this.currentNode) {
        this.x -= this.currentNode.dupe.horizontal;
        this.y -= this.currentNode.dupe.vertical;
      }
    }
  };
  this.move = function (delta) {
    if (!this.visible) return;
    this.transPoints = null; // clear cached points

    if ($.isFunction(this.preMove)) {
      this.preMove(delta);
    }

    this.vel.x += this.acc.x * delta;
    this.vel.y += this.acc.y * delta;
    this.x += this.vel.x * delta;
    this.y += this.vel.y * delta;
    this.rot += this.vel.rot * delta;
    if (this.rot > 360) {
      this.rot -= 360;
    } else if (this.rot < 0) {
      this.rot += 360;
    }

    if ($.isFunction(this.postMove)) {
      this.postMove(delta);
    }
  };
  this.updateGrid = function () {
    if (!this.visible) return;
    var gridx = Math.floor(this.x / GRID_SIZE);
    var gridy = Math.floor(this.y / GRID_SIZE);
    gridx = (gridx >= this.grid.length) ? 0 : gridx;
    gridy = (gridy >= this.grid[0].length) ? 0 : gridy;
    gridx = (gridx < 0) ? this.grid.length-1 : gridx;
    gridy = (gridy < 0) ? this.grid[0].length-1 : gridy;
    var newNode = this.grid[gridx][gridy];
    if (newNode != this.currentNode) {
      if (this.currentNode) {
        this.currentNode.leave(this);
      }
      newNode.enter(this);
      this.currentNode = newNode;
    }

    if (KEY_STATUS.g && this.currentNode) {
      this.context.lineWidth = 3.0;
      this.context.strokeStyle = 'green';
      this.context.strokeRect(gridx*GRID_SIZE+2, gridy*GRID_SIZE+2, GRID_SIZE-4, GRID_SIZE-4);
      this.context.strokeStyle = 'black';
      this.context.lineWidth = 1.0;
    }
  };
  this.configureTransform = function () {
    if (!this.visible) return;

    var rad = (this.rot * Math.PI)/180;

    this.context.translate(this.x, this.y);
    this.context.rotate(rad);
    this.context.scale(this.scale, this.scale);
  };
  this.draw = function () {
    if (!this.visible) return;

    this.context.lineWidth = 1.0 / this.scale;

    for (child in this.children) {
      this.children[child].draw();
    }

    this.context.beginPath();

    this.context.moveTo(this.points[0], this.points[1]);
    for (var i = 1; i < this.points.length/2; i++) {
      var xi = i*2;
      var yi = xi + 1;
      this.context.lineTo(this.points[xi], this.points[yi]);
    }

    this.context.closePath();
    this.context.stroke();
  };
  this.findCollisionCanidates = function () {
    if (!this.visible || !this.currentNode) return [];
    var cn = this.currentNode;
    var canidates = [];
    if (cn.nextSprite) canidates.push(cn.nextSprite);
    if (cn.north.nextSprite) canidates.push(cn.north.nextSprite);
    if (cn.south.nextSprite) canidates.push(cn.south.nextSprite);
    if (cn.east.nextSprite) canidates.push(cn.east.nextSprite);
    if (cn.west.nextSprite) canidates.push(cn.west.nextSprite);
    if (cn.north.east.nextSprite) canidates.push(cn.north.east.nextSprite);
    if (cn.north.west.nextSprite) canidates.push(cn.north.west.nextSprite);
    if (cn.south.east.nextSprite) canidates.push(cn.south.east.nextSprite);
    if (cn.south.west.nextSprite) canidates.push(cn.south.west.nextSprite);
    return canidates
  };
  this.checkCollisionsAgainst = function (canidates) {
    for (var i = 0; i < canidates.length; i++) {
      var ref = canidates[i];
      do {
        this.checkCollision(ref);
        ref = ref.nextSprite;
      } while (ref)
    }
  };
  this.checkCollision = function (other) {
    if (!other.visible ||
         this == other ||
         this.collidesWith.indexOf(other.name) == -1) return;
    var trans = other.transformedPoints();
    var px, py;
    var count = trans.length/2;
    for (var i = 0; i < count; i++) {
      px = trans[i*2];
      py = trans[i*2 + 1];
      // mozilla doesn't take into account transforms with isPointInPath >:-P
      if (($.browser.mozilla) ? this.pointInPolygon(px, py) : this.context.isPointInPath(px, py)) {
        other.collision(this);
        this.collision(other);
        return;
      }
    }
  };
  this.pointInPolygon = function (x, y) {
    var points = this.transformedPoints();
    var j = 2;
    var y0, y1;
    var oddNodes = false;
    for (var i = 0; i < points.length; i += 2) {
      y0 = points[i + 1];
      y1 = points[j + 1];
      if ((y0 < y && y1 >= y) ||
          (y1 < y && y0 >= y)) {
        if (points[i]+(y-y0)/(y1-y0)*(points[j]-points[i]) < x) {
          oddNodes = !oddNodes;
        }
      }
      j += 2
      if (j == points.length) j = 0;
    }
    return oddNodes;
  };
  this.collision = function () {
  };
  this.die = function () {
    this.visible = false;
    this.reap = true;
    if (this.currentNode) {
      this.currentNode.leave(this);
      this.currentNode = null;
    }
  };
  this.transformedPoints = function () {
    if (this.transPoints) return this.transPoints;
    var trans = new Array(this.points.length);
    this.matrix.configure(this.rot, this.scale, this.x, this.y);
    for (var i = 0; i < this.points.length/2; i++) {
      var xi = i*2;
      var yi = xi + 1;
      var pts = this.matrix.multiply(this.points[xi], this.points[yi], 1);
      trans[xi] = pts[0];
      trans[yi] = pts[1];
    }
    this.transPoints = trans; // cache translated points
    return trans;
  };
  this.isClear = function () {
    if (this.collidesWith.length == 0) return true;
    var cn = this.currentNode;
    if (cn == null) {
      var gridx = Math.floor(this.x / GRID_SIZE);
      var gridy = Math.floor(this.y / GRID_SIZE);
      gridx = (gridx >= this.grid.length) ? 0 : gridx;
      gridy = (gridy >= this.grid[0].length) ? 0 : gridy;
      cn = this.grid[gridx][gridy];
    }
    return (cn.isEmpty(this.collidesWith) &&
            cn.north.isEmpty(this.collidesWith) &&
            cn.south.isEmpty(this.collidesWith) &&
            cn.east.isEmpty(this.collidesWith) &&
            cn.west.isEmpty(this.collidesWith) &&
            cn.north.east.isEmpty(this.collidesWith) &&
            cn.north.west.isEmpty(this.collidesWith) &&
            cn.south.east.isEmpty(this.collidesWith) &&
            cn.south.west.isEmpty(this.collidesWith));
  };
  this.wrapPostMove = function () {
    if (this.x > Game.canvasWidth) {
      this.x = 0;
    } else if (this.x < 0) {
      this.x = Game.canvasWidth;
    }
    if (this.y > Game.canvasHeight) {
      this.y = 0;
    } else if (this.y < 0) {
      this.y = Game.canvasHeight;
    }
  };

};

Ship = function () {
  this.init("ship",
 //           [-5,   4,
 //             0, -12,
 //             5,   4]);
[0,-5,
-5,-5,
-5,-1,
-8,-4,
-15,-4,
-15,-12,
-22,-12,
-22,-4,
-29,-4,
-29,4,
-22,4,
-22,12,
-15,12,
-15,4,
-8,4,
-5,1,
-5,5,
-1,5,
-5,8,
5,8,
1,5,
5,5,
5,1,
8,4,
15,4,
15,12,
22,12,
22,4,
29,4,
29,-4,
22,-4,
22,-12,
15,-12,
15,-4,
8,-4,
5,-1,
5,-5,
0,-5]);

  this.children.exhaust = new Sprite();
  this.children.exhaust.init("exhaust",
  //                           [-3,  6,
  //                             0, 11,
  //                             3,  6]);
  [0,0]);

  this.bulletCounter = 0;

  this.postMove = this.wrapPostMove;

  this.collidesWith = ["asteroid", "bigalien", "alienbullet"];

  this.preMove = function (delta) {
    if (KEY_STATUS.left) {
      this.vel.rot = -6;
    } else if (KEY_STATUS.right) {
      this.vel.rot = 6;
    } else {
      this.vel.rot = 0;
    }

    if (KEY_STATUS.up) {
      var rad = ((this.rot-90) * Math.PI)/180;
      this.acc.x = 0.5 * Math.cos(rad);
      this.acc.y = 0.5 * Math.sin(rad);
      this.children.exhaust.visible = Math.random() > 0.1;
    } else {
      this.acc.x = 0;
      this.acc.y = 0;
      this.children.exhaust.visible = false;
    }

    if (this.bulletCounter > 0) {
      this.bulletCounter -= delta;
    }
    if (KEY_STATUS.space) {
      if (this.bulletCounter <= 0) {
        this.bulletCounter = 10;
        for (var i = 0; i < this.bullets.length; i++) {
          if (!this.bullets[i].visible) {
            SFX.laser();
            var bullet = this.bullets[i];
            var rad = ((this.rot-90) * Math.PI)/180;
            var vectorx = Math.cos(rad);
            var vectory = Math.sin(rad);
            // move to the nose of the ship
            bullet.x = this.x + vectorx * 4;
            bullet.y = this.y + vectory * 4;
            bullet.vel.x = 6 * vectorx + this.vel.x;
            bullet.vel.y = 6 * vectory + this.vel.y;
            bullet.visible = true;
            break;
          }
        }
      }
    }

    // limit the ship's speed
    if (Math.sqrt(this.vel.x * this.vel.x + this.vel.y * this.vel.y) > 8) {
      this.vel.x *= 0.95;
      this.vel.y *= 0.95;
    }
  };

  this.collision = function (other) {
    SFX.explosion();
    Game.explosionAt(other.x, other.y);
    Game.FSM.state = 'player_died';
    this.visible = false;
    this.currentNode.leave(this);
    this.currentNode = null;
    Game.lives--;
  };

};
Ship.prototype = new Sprite();

BigAlien = function () {
  this.init("bigalien",
            [
    0.39277600, 15.81628262, 0.39277600, 15.81628262, -0.54812400, 5.72378262, -0.54812400, 5.72378262,
    -0.54812400, 5.72378262, -0.54812400, 5.72378262, -0.71912400, 4.78308262, -0.71912400, 4.78308262,
    -0.71912400, 4.78308262, -0.71912400, 4.78308262, -0.37702400, 4.78308262, -0.37702400, 4.78308262,
    -0.37702400, 4.78308262, -0.37702400, 4.78308262, -0.37702400, 3.75658262, -0.37702400, 3.75658262,
    -0.37702400, 3.75658262, -0.37702400, 3.75658262, -0.63362400, 3.83958262, -0.63362400, 3.83958262,
    -0.63362400, 3.83958262, -0.63362400, 3.83958262, -0.80462400, 1.44478262, -0.80462400, 1.44478262,
    -0.80462400, 1.44478262, -0.80462400, 1.44478262, -2.94282400, 0.16198262, -2.94282400, 0.16198262,
    -2.94282400, 0.16198262, -2.94282400, 0.16198262, -3.62712400, 0.67508262, -3.62712400, 0.67508262,
    -3.62712400, 0.67508262, -3.62712400, 0.67508262, -4.22582400, -3.60121738, -4.22582400, -3.60121738,
    -4.22582400, -3.60121738, -4.22582400, -3.60121738, -5.67982400, -8.04851738, -5.67982400, -8.04851738,
    -5.67982400, -8.04851738, -5.67982400, -8.04851738, -7.13382400, -11.04121738, -7.13382400, -11.04121738,
    -7.13382400, -11.04121738, -7.13382400, -11.04121738, -5.59432400, -10.10051738, -5.59432400, -10.10051738,
    -5.59432400, -10.10051738, -5.59432400, -10.10051738, -4.39692400, -9.15941738, -4.39692400, -9.15941738,
    -4.39692400, -9.15941738, -4.39692400, -9.15941738, -2.94292400, -7.53451738, -2.94292400, -7.53451738,
    -2.94292400, -7.53451738, -2.94292400, -7.53451738, -4.31142400, -8.04731738, -4.31142400, -8.04731738,
    -4.31142400, -8.04731738, -4.31142400, -8.04731738, -3.11402400, -4.62651738, -3.11402400, -4.62651738,
    -3.11402400, -4.62651738, -3.11402400, -4.62651738, -2.42972400, -1.29101738, -2.42972400, -1.29101738,
    -2.42972400, -1.29101738, -2.42972400, -1.29101738, -0.71912400, -0.69201738, -0.71912400, -0.69201738,
    -0.71912400, -0.69201738, -0.71912400, -0.69201738, -0.54812400, -11.29781738, -0.54812400, -11.29781738,
    -0.54812400, -11.29781738, -0.54812400, -11.29781738, -0.37702400, -11.81091738, -0.37702400, -11.81091738,
    -0.37702400, -11.81091738, -0.37702400, -11.81091738, -1.66002400, -10.87021738, -1.66002400, -10.87021738,
    -1.66002400, -10.87021738, -1.66002400, -10.87021738, -1.23232400, -13.26501738, -1.23232400, -13.26501738,
    -1.23232400, -13.26501738, -1.23232400, -13.26501738, -0.46262400, -15.48851738, -0.46262400, -15.48851738,
    -0.46262400, -15.48851738, -0.46262400, -15.48851738, 0.30717600, -16.68611738, 0.30717600, -16.68611738,
    0.30717600, -16.68611738, 0.30717600, -16.68611738, 1.07697600, -14.97571738, 1.07697600, -14.97571738,
    1.07697600, -14.97571738, 1.07697600, -14.97571738, 1.93227600, -12.75161738, 1.93227600, -12.75161738,
    1.93227600, -12.75161738, 1.93227600, -12.75161738, 2.10327600, -10.69901738, 2.10327600, -10.69901738,
    2.10327600, -10.69901738, 2.10327600, -10.69901738, 0.82037600, -11.72561738, 0.82037600, -11.72561738,
    0.82037600, -11.72561738, 0.82037600, -11.72561738, 1.07687600, -11.46881738, 1.07687600, -11.46881738,
    1.07687600, -11.46881738, 1.07687600, -11.46881738, 1.16287600, -0.69201738, 1.16287600, -0.69201738,
    1.16287600, -0.69201738, 1.16287600, -0.69201738, 2.95897600, -1.29101738, 2.95897600, -1.29101738,
    2.95897600, -1.29101738, 2.95897600, -1.29101738, 3.55767600, -4.36971738, 3.55767600, -4.36971738,
    3.55767600, -4.36971738, 3.55767600, -4.36971738, 4.24187600, -6.50831738, 4.24187600, -6.50831738,
    4.24187600, -6.50831738, 4.24187600, -6.50831738, 4.92617600, -8.04731738, 4.92617600, -8.04731738,
    4.92617600, -8.04731738, 4.92617600, -8.04731738, 3.64317600, -7.61971738, 3.64317600, -7.61971738,
    3.64317600, -7.61971738, 3.64317600, -7.61971738, 4.49847600, -8.73181738, 4.49847600, -8.73181738,
    4.49847600, -8.73181738, 4.49847600, -8.73181738, 5.86697600, -10.10051738, 5.86697600, -10.10051738,
    5.86697600, -10.10051738, 5.86697600, -10.10051738, 7.74857600, -11.12661738, 7.74857600, -11.12661738,
    7.74857600, -11.12661738, 7.74857600, -11.12661738, 5.95247600, -7.44901738, 5.95247600, -7.44901738,
    5.95247600, -7.44901738, 5.95247600, -7.44901738, 5.01167600, -3.77131738, 5.01167600, -3.77131738,
    5.01167600, -3.77131738, 5.01167600, -3.77131738, 4.15637600, 0.67628262, 4.15637600, 0.67628262,
    4.15637600, 0.67628262, 4.15637600, 0.67628262, 3.64317600, 0.16318262, 3.64317600, 0.16318262,
    3.64317600, 0.16318262, 3.64317600, 0.16318262, 1.16287600, 1.44598262, 1.16287600, 1.44598262,
    1.16287600, 1.44598262, 1.16287600, 1.44598262, 1.24787600, 3.66988262, 1.24787600, 3.66988262,
    1.24787600, 3.66988262, 1.24787600, 3.66988262, 1.07677600, 3.66988262, 1.07677600, 3.66988262,
    1.07677600, 3.66988262, 1.07677600, 3.66988262, 1.07677600, 4.69598262, 1.07677600, 4.69598262,
    1.07677600, 4.69598262, 1.07677600, 4.69598262, 1.24787600, 4.69598262, 1.24787600, 4.69598262,
    1.24787600, 4.69598262, 1.24787600, 4.69598262, 0.39277600, 15.81628262, 0.39277600, 15.81628262

]);

  this.children.top = new Sprite();
  this.children.top.init("bigalien_top",
                         [-8, -4,
                          -6, -6,
                           6, -6,
                           8, -4]);
  this.children.top.visible = false;

  this.children.bottom = new Sprite();
  this.children.bottom.init("bigalien_top",
                            [ 8, 4,
                              6, 6,
                             -6, 6,
                             -8, 4]);
  this.children.bottom.visible = false;

  this.collidesWith = ["asteroid", "ship", "bullet"];

  this.bridgesH = false;

  this.bullets = [];
  this.bulletCounter = 0;

  this.newPosition = function () {
    if (Math.random() < 0.5) {
      this.x = -20;
      this.vel.x = 1.5;
    } else {
      this.x = Game.canvasWidth + 20;
      this.vel.x = -1.5;
    }
    this.y = Math.random() * Game.canvasHeight;
  };

  this.setup = function () {
    this.newPosition();

    for (var i = 0; i < 3; i++) {
      var bull = new AlienBullet();
      this.bullets.push(bull);
      Game.sprites.push(bull);
    }
  };

  this.preMove = function (delta) {
    var cn = this.currentNode;
    if (cn == null) return;

    var topCount = 0;
    if (cn.north.nextSprite) topCount++;
    if (cn.north.east.nextSprite) topCount++;
    if (cn.north.west.nextSprite) topCount++;

    var bottomCount = 0;
    if (cn.south.nextSprite) bottomCount++;
    if (cn.south.east.nextSprite) bottomCount++;
    if (cn.south.west.nextSprite) bottomCount++;

    if (topCount > bottomCount) {
      this.vel.y = 1;
    } else if (topCount < bottomCount) {
      this.vel.y = -1;
    } else if (Math.random() < 0.01) {
      this.vel.y = -this.vel.y;
    }

    this.bulletCounter -= delta;
    if (this.bulletCounter <= 0) {
      this.bulletCounter = 22;
      for (var i = 0; i < this.bullets.length; i++) {
        if (!this.bullets[i].visible) {
          bullet = this.bullets[i];
          var rad = 2 * Math.PI * Math.random();
          var vectorx = Math.cos(rad);
          var vectory = Math.sin(rad);
          bullet.x = this.x;
          bullet.y = this.y;
          bullet.vel.x = 6 * vectorx;
          bullet.vel.y = 6 * vectory;
          bullet.visible = true;
          SFX.laser();
          break;
        }
      }
    }

  };

  BigAlien.prototype.collision = function (other) {
    if (other.name == "bullet") Game.score += 200;
    SFX.explosion();
    Game.explosionAt(other.x, other.y);
    this.visible = false;
    this.newPosition();
  };

  this.postMove = function () {
    if (this.y > Game.canvasHeight) {
      this.y = 0;
    } else if (this.y < 0) {
      this.y = Game.canvasHeight;
    }

    if ((this.vel.x > 0 && this.x > Game.canvasWidth + 20) ||
        (this.vel.x < 0 && this.x < -20)) {
      // why did the alien cross the road?
      this.visible = false;
      this.newPosition();
    }
  }
};
BigAlien.prototype = new Sprite();

Bullet = function () {
  this.init("bullet", [0, 0]);
  this.time = 0;
  this.bridgesH = false;
  this.bridgesV = false;
  this.postMove = this.wrapPostMove;
  // asteroid can look for bullets so doesn't have
  // to be other way around
  //this.collidesWith = ["asteroid"];

  this.configureTransform = function () {};
  this.draw = function () {
    if (this.visible) {
      this.context.save();
      this.context.lineWidth = 2;
      this.context.beginPath();
      this.context.moveTo(this.x-1, this.y-1);
      this.context.lineTo(this.x+1, this.y+1);
      this.context.moveTo(this.x+1, this.y-1);
      this.context.lineTo(this.x-1, this.y+1);
      this.context.stroke();
      this.context.restore();
    }
  };
  this.preMove = function (delta) {
    if (this.visible) {
      this.time += delta;
    }
    if (this.time > 50) {
      this.visible = false;
      this.time = 0;
    }
  };
  this.collision = function (other) {
    this.time = 0;
    this.visible = false;
    this.currentNode.leave(this);
    this.currentNode = null;
  };
  this.transformedPoints = function (other) {
    return [this.x, this.y];
  };

};
Bullet.prototype = new Sprite();

AlienBullet = function () {
  this.init("alienbullet");

  this.draw = function () {
    if (this.visible) {
      this.context.save();
      this.context.lineWidth = 2;
      this.context.beginPath();
      this.context.moveTo(this.x, this.y);
      this.context.lineTo(this.x-this.vel.x, this.y-this.vel.y);
      this.context.stroke();
      this.context.restore();
    }
  };
};
AlienBullet.prototype = new Bullet();

Asteroid = function () {
  this.init("asteroid",
//            [-10,   0,
//              -5,   7,
//              -3,   4,
//               1,  10,
//               5,   4,
//              10,   0,
//               5,  -6,
//               2, -10,
//              -4, -10,
//              -4,  -5]);
    [    0.28054043, 0.47042000, 0.28054043, 0.47042000, 1.65020340, -0.55682000, 1.65020340, -0.55682000,
    1.65020340, -0.55682000, 1.65020340, -0.55682000, 3.70469740, -1.14382000, 3.70469740, -1.14382000,
    3.70469740, -1.14382000, 3.70469740, -1.14382000, 5.27002640, -0.16549000, 5.27002640, -0.16549000,
    5.27002640, -0.16549000, 5.27002640, -0.16549000, 6.05269040, 0.81284000, 6.05269040, 0.81284000,
    6.05269040, 0.81284000, 6.05269040, 0.81284000, 6.05269040, 1.25309000, 6.05269040, 1.25309000,
    6.05269040, 1.25309000, 6.05269040, 1.25309000, 6.10161040, 2.62275000, 6.10161040, 2.62275000,
    6.10161040, 2.62275000, 6.10161040, 2.62275000, 5.17219540, 3.79675000, 5.17219540, 3.79675000,
    5.17219540, 3.79675000, 5.17219540, 3.79675000, 4.29169840, 4.53050000, 4.29169840, 4.53050000,
    4.29169840, 4.53050000, 4.29169840, 4.53050000, 1.84587240, 4.62830000, 1.84587240, 4.62830000,
    1.84587240, 4.62830000, 1.84587240, 4.62830000, 0.37837643, 3.64997000, 0.37837643, 3.64997000,
    0.37837643, 3.64997000, 0.37837643, 3.64997000, -0.01295517, 1.20414000, -0.01295517, 1.20414000,
    -0.01295517, 1.20414000, -0.01295517, 1.20414000, 0.18271073, 0.76389000, 0.18271073, 0.76389000,
    0.18271073, 0.76389000, 0.18271073, 0.76389000, 2.72636940, 1.44872000, 2.72636940, 1.44872000,
    2.72636940, 1.44872000, 2.72636940, 1.44872000, 1.11212440, -0.06769000, 1.11212440, -0.06769000,
    1.11212440, -0.06769000, 1.11212440, -0.06769000, 2.77528640, 1.35089000, 2.77528640, 1.35089000,
    2.77528640, 1.35089000, 2.77528640, 1.35089000, 2.18828840, -0.55685000, 2.18828840, -0.55685000,
    2.18828840, -0.55685000, 2.18828840, -0.55685000, 2.77528640, 1.35089000, 2.77528640, 1.35089000,
    2.77528640, 1.35089000, 2.77528640, 1.35089000, 2.57962040, -0.70360000, 2.57962040, -0.70360000,
    2.57962040, -0.70360000, 2.57962040, -0.70360000, 2.82420340, 1.44872000, 2.82420340, 1.44872000,
    2.82420340, 1.44872000, 2.82420340, 1.44872000, 3.70470040, -1.14385000, 3.70470040, -1.14385000,
    3.70470040, -1.14385000, 3.70470040, -1.14385000, 2.87311940, 1.15522000, 2.87311940, 1.15522000,
    2.87311940, 1.15522000, 2.87311940, 1.15522000, 4.82978040, -0.60577000, 4.82978040, -0.60577000,
    4.82978040, -0.60577000, 4.82978040, -0.60577000, 2.72636940, 1.25306000, 2.72636940, 1.25306000,
    2.72636940, 1.25306000, 2.72636940, 1.25306000, 5.95486040, 0.56823000, 5.95486040, 0.56823000,
    5.95486040, 0.56823000, 5.95486040, 0.56823000, 2.62853640, 1.25306000, 2.82420340, 1.30197000,
    2.82420340, 1.30197000, 3.01986940, 1.35087000, 6.15052640, 1.30197000, 6.15052640, 1.30197000,
    6.15052640, 1.30197000, 6.15052640, 1.30197000, 2.38395440, 0.95956000, 2.82420340, 1.25307000,
    2.82420340, 1.25307000, 3.26445140, 1.54658000, 6.44402540, 2.18249000, 6.44402540, 2.18249000,
    6.44402540, 2.18249000, 6.44402540, 2.18249000, 2.82420340, 1.35091000, 2.82420340, 1.35091000,
    2.82420340, 1.35091000, 2.82420340, 1.35091000, 5.95486040, 3.11190000, 5.95486040, 3.11190000,
    5.95486040, 3.11190000, 5.95486040, 3.11190000, 2.87311940, 1.39982000, 2.87311940, 1.39982000,
    2.87311940, 1.39982000, 2.87311940, 1.39982000, 5.56352840, 3.79673000, 5.56352840, 3.79673000,
    5.56352840, 3.79673000, 5.56352840, 3.79673000, 2.67745340, 1.54658000, 2.67745340, 1.54658000,
    2.67745340, 1.54658000, 2.67745340, 1.54658000, 4.68303040, 4.77506000, 4.68303040, 4.77506000,
    4.68303040, 4.77506000, 4.68303040, 4.77506000, 2.87311940, 1.35091000, 2.87311940, 1.35091000,
    2.87311940, 1.35091000, 2.87311940, 1.35091000, 3.50903440, 4.97073000, 3.50903440, 4.97073000,
    3.50903440, 4.97073000, 3.50903440, 4.97073000, 2.67745340, 1.05741000, 2.72636940, 1.35091000,
    2.72636940, 1.35091000, 2.77528940, 1.64440000, 1.99262240, 4.82398000, 1.99262240, 4.82398000,
    1.99262240, 4.82398000, 1.99262240, 4.82398000, 2.67745340, 0.76391000, 2.67745340, 1.39982000,
    2.67745340, 1.39982000, 2.67745340, 2.03574000, 0.96537443, 4.92181000, 0.96537443, 4.92181000,
    0.96537443, 4.92181000, 0.96537443, 4.92181000, 2.67745340, 1.35091000, 2.67745340, 1.35091000,
    2.67745340, 1.35091000, 2.67745340, 1.35091000, -0.06187167, 3.84565000, -0.06187167, 3.84565000,
    -0.06187167, 3.84565000, -0.06187167, 3.84565000, 2.38395440, 1.44874000, 2.38395440, 1.44874000,
    2.38395440, 1.44874000, 2.38395440, 1.44874000, -0.35537097, 2.23140000, -0.35537097, 2.23140000,
    -0.35537097, 2.23140000, -0.35537097, 2.23140000, 2.33503840, 1.39982000, 2.33503840, 1.39982000,
    2.33503840, 1.39982000, 2.33503840, 1.39982000, 5.12327940, 3.89457000, 5.12327940, 3.89457000,
    5.12327940, 3.89457000, 5.12327940, 3.89457000, 2.67745340, 1.20416000, 2.67745340, 1.20416000,
    2.67745340, 1.20416000, 2.67745340, 1.20416000, 0.67187643, 0.07908000, 0.67187643, 0.07908000,
    0.67187643, 0.07908000, 0.67187643, 0.07908000, -0.69778677, -0.41009000, -0.69778677, -0.41009000,
    -0.69778677, -0.41009000, -0.69778677, -0.41009000, -0.25753807, -1.82867000, -0.25753807, -1.82867000,
    -0.25753807, -1.82867000, -0.25753807, -1.82867000, -0.30645407, -3.29616000, -0.30645407, -3.29616000,
    -0.30645407, -3.29616000, -0.30645407, -3.29616000, -1.72503330, -4.12774000, -1.72503330, -4.12774000,
    -1.72503330, -4.12774000, -1.72503330, -4.12774000, -3.29036190, -3.63858000, -3.29036190, -3.63858000,
    -3.29036190, -3.63858000, -3.29036190, -3.63858000, -4.41544230, -2.22000000, -4.41544230, -2.22000000,
    -4.41544230, -2.22000000, -4.41544230, -2.22000000, -4.26869240, -0.89925000, -4.26869240, -0.89925000,
    -4.26869240, -0.89925000, -4.26869240, -0.89925000, -3.48602830, 0.17691000, -3.48602830, 0.17691000,
    -3.48602830, 0.17691000, -3.48602830, 0.17691000, -2.45878140, 0.56824000, -2.45878140, 0.56824000,
    -2.45878140, 0.56824000, -2.45878140, 0.56824000, -1.38261750, 0.07908000, -1.38261750, 0.07908000,
    -1.38261750, 0.07908000, -1.38261750, 0.07908000, -0.84453577, -0.26334000, -0.84453577, -0.26334000,
    -0.84453577, -0.26334000, -0.84453577, -0.26334000, -2.06744910, -1.92650000, -2.06744910, -1.92650000,
    -2.06744910, -1.92650000, -2.06744910, -1.92650000, -0.69778637, -0.80142000, -0.69778637, -0.80142000,
    -0.69778637, -0.80142000, -0.69778637, -0.80142000, -2.06744910, -2.02433000, -2.06744910, -2.02433000,
    -2.06744910, -2.02433000, -2.06744910, -2.02433000, -0.25753767, -2.17109000, -0.25753767, -2.17109000,
    -0.25753767, -2.17109000, -0.25753767, -2.17109000, -1.87178320, -2.02433000, -1.87178320, -2.02433000,
    -1.87178320, -2.02433000, -1.87178320, -2.02433000, -0.79561937, -3.63858000, -0.79561937, -3.63858000,
    -0.79561937, -3.63858000, -0.79561937, -3.63858000, -2.11636560, -2.12216000, -2.11636560, -2.12216000,
    -2.11636560, -2.12216000, -2.11636560, -2.12216000, -1.82286630, -4.37233000, -1.82286630, -4.37233000,
    -1.82286630, -4.37233000, -1.82286630, -4.37233000, -2.21419850, -2.12216000, -2.21419850, -2.12216000,
    -2.21419850, -2.12216000, -2.21419850, -2.12216000, -3.29036190, -3.88316000, -3.29036190, -3.88316000,
    -3.29036190, -3.88316000, -3.29036190, -3.88316000, -2.01853270, -2.02433000, -2.01853270, -2.02433000,
    -2.01853270, -2.02433000, -2.01853270, -2.02433000, -4.17085940, -3.19833000, -3.92627710, -3.14941000,
    -3.92627710, -3.14941000, -3.68169420, -3.10051000, -2.01853270, -2.12216000, -2.01853270, -2.12216000,
    -2.01853270, -2.12216000, -2.01853270, -2.12216000, -4.90460740, -2.41567000, -4.90460740, -2.41567000,
    -4.90460740, -2.41567000, -4.90460740, -2.41567000, -2.06744910, -2.07325000, -2.06744910, -2.07325000,
    -2.06744910, -2.07325000, -2.06744910, -2.07325000, -4.36652580, -1.58408000, -4.36652580, -1.58408000,
    -4.36652580, -1.58408000, -4.36652580, -1.58408000, -2.21419850, -1.97541000, -2.21419850, -1.97541000,
    -2.21419850, -1.97541000, -2.21419850, -1.97541000, -4.12194300, -0.70359000, -4.12194300, -0.70359000,
    -4.12194300, -0.70359000, -4.12194300, -0.70359000, -2.31203200, -1.92650000, -2.31203200, -1.92650000,
    -2.31203200, -1.92650000, -2.31203200, -1.92650000, -3.68169420, -0.21442000, -3.68169420, -0.21442000,
    -3.68169420, -0.21442000, -3.68169420, -0.21442000, -2.21419850, -2.36675000, -2.21419850, -1.87758000,
    -2.21419850, -1.87758000, -2.21419850, -1.38842000, -1.77394980, 0.27474000, -1.77394980, 0.27474000,
    -1.77394980, 0.27474000, -1.77394980, 0.27474000, -2.36094850, -2.17109000, -2.36094850, -1.92650000,
    -2.36094850, -1.92650000, -2.36094850, -1.68192000, -3.29036190, 0.37258000, -3.29036190, 0.37258000,
    -3.29036190, 0.37258000, -3.29036190, 0.37258000, -3.53494480, 0.71499000, -3.53494480, 0.71499000,
    -3.53494480, 0.71499000, -3.53494480, 0.71499000, -3.19252900, 1.59549000, -3.19252900, 1.59549000,
    -3.19252900, 1.59549000, -3.19252900, 1.59549000, -3.04577960, 2.23140000, -3.04577960, 2.23140000,
    -3.04577960, 2.23140000, -3.04577960, 2.23140000, -3.24144550, 3.20973000, -3.24144550, 3.20973000,
    -3.24144550, 3.20973000, -3.24144550, 3.20973000, -3.09469600, 4.09023000, -3.09469600, 4.09023000,
    -3.09469600, 4.09023000, -3.09469600, 4.09023000, -3.09469600, 4.62831000, -3.09469600, 4.62831000,
    -3.09469600, 4.62831000, -3.09469600, 4.62831000, -2.40986490, 5.36206000, -2.40986490, 5.36206000,
    -2.40986490, 5.36206000, -2.40986490, 5.36206000, -0.40428707, 6.09581000, -0.40428707, 6.09581000,
    -0.40428707, 6.09581000, -0.40428707, 6.09581000, 0.42729343, 6.58498000, 0.42729343, 6.58498000,
    0.42729343, 6.58498000, 0.42729343, 6.58498000, -2.11636560, 6.04689000, -2.11636560, 6.04689000,
    -2.11636560, 6.04689000, -2.11636560, 6.04689000, -4.46435880, 4.92181000, -4.46435880, 4.92181000,
    -4.46435880, 4.92181000, -4.46435880, 4.92181000, -6.32318660, 3.45432000, -6.32318660, 3.45432000,
    -6.32318660, 3.45432000, -6.32318660, 3.45432000, -7.20368410, 0.81282000, -7.20368410, 0.81282000,
    -7.20368410, 0.81282000, -7.20368410, 0.81282000, -7.15476810, -0.94817000, -7.15476810, -0.94817000,
    -7.15476810, -0.94817000, -7.15476810, -0.94817000, -6.32318760, -3.24724000, -6.32318760, -3.24724000,
    -6.32318760, -3.24724000, -6.32318760, -3.24724000, -4.26869340, -5.79090000, -4.26869340, -5.79090000,
    -4.26869340, -5.79090000, -4.26869340, -5.79090000, -2.26311600, -7.74757000, -2.26311600, -7.74757000,
    -2.26311600, -7.74757000, -2.26311600, -7.74757000, 0.18271013, -8.87265000, 0.18271013, -8.87265000,
    0.18271013, -8.87265000, 0.18271013, -8.87265000, 3.46011640, -8.48132000, 3.46011640, -8.48132000,
    3.46011640, -8.48132000, 3.46011640, -8.48132000, 6.15052540, -7.06273000, 6.15052540, -7.06273000,
    6.15052540, -7.06273000, 6.15052540, -7.06273000, 8.74310140, -4.76366000, 8.74310140, -4.76366000,
    8.74310140, -4.76366000, 8.74310140, -4.76366000, 10.21059700, -2.07325000, 10.21059700, -2.07325000,
    10.21059700, -2.07325000, 10.21059700, -2.07325000, 9.72143240, 1.05741000, 9.72143240, 1.05741000,
    9.72143240, 1.05741000, 9.72143240, 1.05741000, 7.86260440, 4.09023000, 7.86260440, 4.09023000,
    7.86260440, 4.09023000, 7.86260440, 4.09023000, 5.66136140, 6.14472000, 5.66136140, 6.14472000,
    5.66136140, 6.14472000, 5.66136140, 6.14472000, 2.82420240, 6.38931000, 2.82420240, 6.38931000,
    2.82420240, 6.38931000, 2.82420240, 6.38931000, 1.16104040, 6.38931000, 1.16104040, 6.38931000,
    1.16104040, 6.38931000, 1.16104040, 6.38931000, 0.42729243, 5.99798000, 0.42729243, 5.99798000,
    0.42729243, 5.99798000, 0.42729243, 5.99798000, -1.04020320, 5.45989000, -1.04020320, 5.45989000,
    -1.04020320, 5.45989000, -1.04020320, 5.45989000, -2.36094950, 4.82398000, -2.36094950, 4.82398000,
    -2.36094950, 4.82398000, -2.36094950, 4.82398000, -2.45878250, 3.30757000, -2.45878250, 3.30757000,
    -2.45878250, 3.30757000, -2.45878250, 3.30757000, -2.26311610, 2.23140000, -2.26311610, 2.23140000,
    -2.26311610, 2.23140000, -2.26311610, 2.23140000, -2.65444840, 1.15524000, -2.65444840, 1.15524000,
    -2.65444840, 1.15524000, -2.65444840, 1.15524000, -3.19253010, 0.42149000, -3.19253010, 0.42149000,
    -3.19253010, 0.42149000, -3.19253010, 0.42149000, -2.31203310, -1.97541000, -2.31203310, -1.97541000,
    -2.31203310, -1.97541000, -2.31203310, -1.97541000, -0.69778747, -0.41009000, -0.69778747, -0.41009000,
    -0.69778747, -0.41009000, -0.69778747, -0.41009000, 0.28054043, 0.47042000, 0.28054043, 0.47042000]);



  this.visible = true;
  this.scale = 6;
  this.postMove = this.wrapPostMove;

  this.collidesWith = ["ship", "bullet", "bigalien", "alienbullet"];

  this.collision = function (other) {
    SFX.explosion();
    if (other.name == "bullet") Game.score += 120 / this.scale;
    this.scale /= 3;
    if (this.scale > 0.5) {
      // break into fragments
      for (var i = 0; i < 3; i++) {
        var roid = $.extend(true, {}, this);
        roid.vel.x = Math.random() * 6 - 3;
        roid.vel.y = Math.random() * 6 - 3;
        if (Math.random() > 0.5) {
          roid.points.reverse();
        }
        roid.vel.rot = Math.random() * 2 - 1;
        roid.move(roid.scale * 3); // give them a little push
        Game.sprites.push(roid);
      }
    }
    Game.explosionAt(other.x, other.y);
    this.die();
  };
};
Asteroid.prototype = new Sprite();

Explosion = function () {
  this.init("explosion");

  this.bridgesH = false;
  this.bridgesV = false;

  this.lines = [];
  for (var i = 0; i < 5; i++) {
    var rad = 2 * Math.PI * Math.random();
    var x = Math.cos(rad);
    var y = Math.sin(rad);
    this.lines.push([x, y, x*2, y*2]);
  }

  this.draw = function () {
    if (this.visible) {
      this.context.save();
      this.context.lineWidth = 1.0 / this.scale;
      this.context.beginPath();
      for (var i = 0; i < 5; i++) {
        var line = this.lines[i];
        this.context.moveTo(line[0], line[1]);
        this.context.lineTo(line[2], line[3]);
      }
      this.context.stroke();
      this.context.restore();
    }
  };

  this.preMove = function (delta) {
    if (this.visible) {
      this.scale += delta;
    }
    if (this.scale > 8) {
      this.die();
    }
  };
};
Explosion.prototype = new Sprite();

GridNode = function () {
  this.north = null;
  this.south = null;
  this.east  = null;
  this.west  = null;

  this.nextSprite = null;

  this.dupe = {
    horizontal: null,
    vertical:   null
  };

  this.enter = function (sprite) {
    sprite.nextSprite = this.nextSprite;
    this.nextSprite = sprite;
  };

  this.leave = function (sprite) {
    var ref = this;
    while (ref && (ref.nextSprite != sprite)) {
      ref = ref.nextSprite;
    }
    if (ref) {
      ref.nextSprite = sprite.nextSprite;
      sprite.nextSprite = null;
    }
  };

  this.eachSprite = function(sprite, callback) {
    var ref = this;
    while (ref.nextSprite) {
      ref = ref.nextSprite;
      callback.call(sprite, ref);
    }
  };

  this.isEmpty = function (collidables) {
    var empty = true;
    var ref = this;
    while (ref.nextSprite) {
      ref = ref.nextSprite;
      empty = !ref.visible || collidables.indexOf(ref.name) == -1
      if (!empty) break;
    }
    return empty;
  };
};

// borrowed from typeface-0.14.js
// http://typeface.neocracy.org
Text = {
  renderGlyph: function (ctx, face, char) {

    var glyph = face.glyphs[char];

    if (glyph.o) {

      var outline;
      if (glyph.cached_outline) {
        outline = glyph.cached_outline;
      } else {
        outline = glyph.o.split(' ');
        glyph.cached_outline = outline;
      }

      var outlineLength = outline.length;
      for (var i = 0; i < outlineLength; ) {

        var action = outline[i++];

        switch(action) {
          case 'm':
            ctx.moveTo(outline[i++], outline[i++]);
            break;
          case 'l':
            ctx.lineTo(outline[i++], outline[i++]);
            break;

          case 'q':
            var cpx = outline[i++];
            var cpy = outline[i++];
            ctx.quadraticCurveTo(outline[i++], outline[i++], cpx, cpy);
            break;

          case 'b':
            var x = outline[i++];
            var y = outline[i++];
            ctx.bezierCurveTo(outline[i++], outline[i++], outline[i++], outline[i++], x, y);
            break;
        }
      }
    }
    if (glyph.ha) {
      ctx.translate(glyph.ha, 0);
    }
  },

  renderText: function(text, size, x, y) {
    this.context.save();

    this.context.translate(x, y);

    var pixels = size * 72 / (this.face.resolution * 100);
    this.context.scale(pixels, -1 * pixels);
    this.context.beginPath();
    var chars = text.split('');
    var charsLength = chars.length;
    for (var i = 0; i < charsLength; i++) {
      this.renderGlyph(this.context, this.face, chars[i]);
    }
    this.context.fill();

    this.context.restore();
  },

  context: null,
  face: null
};

SFX = {
  laser:     new Audio('39459__THE_bizniss__laser.wav'),
  explosion: new Audio('51467__smcameron__missile_explosion.wav')
};

// preload audio
for (var sfx in SFX) {
  (function () {
    var audio = SFX[sfx];
    audio.muted = true;
    audio.play();

    SFX[sfx] = function () {
      if (!this.muted) {
        if (audio.duration == 0) {
          // somehow dropped out
          audio.load();
          audio.play();
        } else {
          audio.muted = false;
          audio.currentTime = 0;
        }
      }
      return audio;
    }
  })();
}
// pre-mute audio
SFX.muted = true;

Game = {
  score: 0,
  totalAsteroids: 5,
  lives: 0,

  canvasWidth: 800,
  canvasHeight: 600,

  sprites: [],
  ship: null,
  bigAlien: null,

  nextBigAlienTime: null,


  spawnAsteroids: function (count) {
    if (!count) count = this.totalAsteroids;
    for (var i = 0; i < count; i++) {
      var roid = new Asteroid();
      roid.x = Math.random() * this.canvasWidth;
      roid.y = Math.random() * this.canvasHeight;
      while (!roid.isClear()) {
        roid.x = Math.random() * this.canvasWidth;
        roid.y = Math.random() * this.canvasHeight;
      }
      roid.vel.x = Math.random() * 4 - 2;
      roid.vel.y = Math.random() * 4 - 2;
      if (Math.random() > 0.5) {
        roid.points.reverse();
      }
      roid.vel.rot = Math.random() * 2 - 1;
      Game.sprites.push(roid);
    }
  },

  explosionAt: function (x, y) {
    var splosion = new Explosion();
    splosion.x = x;
    splosion.y = y;
    splosion.visible = true;
    Game.sprites.push(splosion);
  },

  FSM: {
    boot: function () {
      Game.spawnAsteroids(5);
      this.state = 'waiting';
    },
    waiting: function () {
      Text.renderText(window.ipad ? 'Psyche - Touch to start' : 'Psyche - Space to start', 30, Game.canvasWidth/2 - 270, Game.canvasHeight/2);
      if (KEY_STATUS.space || window.gameStart) {
        KEY_STATUS.space = false; // hack so we don't shoot right away
        window.gameStart = false;
        this.state = 'start';
      }
    },
    start: function () {
      for (var i = 0; i < Game.sprites.length; i++) {
        if (Game.sprites[i].name == 'asteroid') {
          Game.sprites[i].die();
        } else if (Game.sprites[i].name == 'bullet' ||
                   Game.sprites[i].name == 'bigalien') {
          Game.sprites[i].visible = false;
        }
      }

      Game.score = 0;
      Game.lives = 2;
      Game.totalAsteroids = 2;
      Game.spawnAsteroids();

      //Game.nextBigAlienTime = Date.now() + 30000 + (30000 * Math.random());
      Game.nextBigAlienTime = Date.now() + 10000 + (10000 * Math.random());
      this.state = 'spawn_ship';
    },
    spawn_ship: function () {
      Game.ship.x = Game.canvasWidth / 2;
      Game.ship.y = Game.canvasHeight / 2;
      if (Game.ship.isClear()) {
        Game.ship.rot = 0;
        Game.ship.vel.x = 0;
        Game.ship.vel.y = 0;
        Game.ship.visible = true;
        this.state = 'run';
      }
    },
    run: function () {
      for (var i = 0; i < Game.sprites.length; i++) {
        if (Game.sprites[i].name == 'asteroid') {
          break;
        }
      }
      if (i == Game.sprites.length) {
        this.state = 'new_level';
      }
      if (!Game.bigAlien.visible &&
          Date.now() > Game.nextBigAlienTime) {
        Game.bigAlien.visible = true;
        Game.nextBigAlienTime = Date.now() + (30000 * Math.random());
      }
    },
    new_level: function () {
      if (this.timer == null) {
        this.timer = Date.now();
      }
      // wait a second before spawning more asteroids
      if (Date.now() - this.timer > 1000) {
        this.timer = null;
        Game.totalAsteroids++;
        if (Game.totalAsteroids > 12) Game.totalAsteroids = 12;
        Game.spawnAsteroids();
        this.state = 'run';
      }
    },
    player_died: function () {
      if (Game.lives < 0) {
        this.state = 'end_game';
      } else {
        if (this.timer == null) {
          this.timer = Date.now();
        }
        // wait a second before spawning
        if (Date.now() - this.timer > 1000) {
          this.timer = null;
          this.state = 'spawn_ship';
        }
      }
    },
    end_game: function () {
      Text.renderText('MISSION OVER', 40, Game.canvasWidth/2 - 160, Game.canvasHeight/2 + 10);
      if (this.timer == null) {
        this.timer = Date.now();
      }
      // wait 5 seconds then go back to waiting state
      if (Date.now() - this.timer > 5000) {
        this.timer = null;
        this.state = 'waiting';
      }

      window.gameStart = false;
    },

    execute: function () {
      this[this.state]();
    },
    state: 'boot'
  }

};


$(function () {
  var canvas = $("#canvas");
  Game.canvasWidth  = canvas.width();
  Game.canvasHeight = canvas.height();

  var context = canvas[0].getContext("2d");

  Text.context = context;
  Text.face = vector_battle;

  var gridWidth = Math.round(Game.canvasWidth / GRID_SIZE);
  var gridHeight = Math.round(Game.canvasHeight / GRID_SIZE);
  var grid = new Array(gridWidth);
  for (var i = 0; i < gridWidth; i++) {
    grid[i] = new Array(gridHeight);
    for (var j = 0; j < gridHeight; j++) {
      grid[i][j] = new GridNode();
    }
  }

  // set up the positional references
  for (var i = 0; i < gridWidth; i++) {
    for (var j = 0; j < gridHeight; j++) {
      var node   = grid[i][j];
      node.north = grid[i][(j == 0) ? gridHeight-1 : j-1];
      node.south = grid[i][(j == gridHeight-1) ? 0 : j+1];
      node.west  = grid[(i == 0) ? gridWidth-1 : i-1][j];
      node.east  = grid[(i == gridWidth-1) ? 0 : i+1][j];
    }
  }

  // set up borders
  for (var i = 0; i < gridWidth; i++) {
    grid[i][0].dupe.vertical            =  Game.canvasHeight;
    grid[i][gridHeight-1].dupe.vertical = -Game.canvasHeight;
  }

  for (var j = 0; j < gridHeight; j++) {
    grid[0][j].dupe.horizontal           =  Game.canvasWidth;
    grid[gridWidth-1][j].dupe.horizontal = -Game.canvasWidth;
  }

  var sprites = [];
  Game.sprites = sprites;

  // so all the sprites can use it
  Sprite.prototype.context = context;
  Sprite.prototype.grid    = grid;
  Sprite.prototype.matrix  = new Matrix(2, 3);

  var ship = new Ship();

  ship.x = Game.canvasWidth / 2;
  ship.y = Game.canvasHeight / 2;

  sprites.push(ship);

  ship.bullets = [];
  for (var i = 0; i < 10; i++) {
    var bull = new Bullet();
    ship.bullets.push(bull);
    sprites.push(bull);
  }
  Game.ship = ship;

  var bigAlien = new BigAlien();
  bigAlien.setup();
  sprites.push(bigAlien);
  Game.bigAlien = bigAlien;

  var extraDude = new Ship();
  extraDude.scale = 0.6;
  extraDude.visible = true;
  extraDude.preMove = null;
  extraDude.children = [];

  var i, j = 0;

  var paused = false;
  var showFramerate = false;
  var avgFramerate = 0;
  var frameCount = 0;
  var elapsedCounter = 0;

  var lastFrame = Date.now();
  var thisFrame;
  var elapsed;
  var delta;

  var canvasNode = canvas[0];

  // shim layer with setTimeout fallback
  // from here:
  // http://paulirish.com/2011/requestanimationframe-for-smart-animating/
  window.requestAnimFrame = (function () {
    return  window.requestAnimationFrame       ||
            window.webkitRequestAnimationFrame ||
            window.mozRequestAnimationFrame    ||
            window.oRequestAnimationFrame      ||
            window.msRequestAnimationFrame     ||
            function (/* function */ callback, /* DOMElement */ element) {
              window.setTimeout(callback, 1000 / 60);
            };
  })();

  var mainLoop = function () {
    context.clearRect(0, 0, Game.canvasWidth, Game.canvasHeight);

    Game.FSM.execute();

    if (KEY_STATUS.g) {
      context.beginPath();
      for (var i = 0; i < gridWidth; i++) {
        context.moveTo(i * GRID_SIZE, 0);
        context.lineTo(i * GRID_SIZE, Game.canvasHeight);
      }
      for (var j = 0; j < gridHeight; j++) {
        context.moveTo(0, j * GRID_SIZE);
        context.lineTo(Game.canvasWidth, j * GRID_SIZE);
      }
      context.closePath();
      context.stroke();
    }

    thisFrame = Date.now();
    elapsed = thisFrame - lastFrame;
    lastFrame = thisFrame;
    delta = elapsed / 30;

    for (i = 0; i < sprites.length; i++) {

      sprites[i].run(delta);

      if (sprites[i].reap) {
        sprites[i].reap = false;
        sprites.splice(i, 1);
        i--;
      }
    }

    // score
    var score_text = ''+Game.score;
    Text.renderText(score_text, 18, Game.canvasWidth - 14 * score_text.length, 20);

    // extra dudes
    for (i = 0; i < Game.lives; i++) {
      context.save();
      extraDude.x = Game.canvasWidth - (40 * (i + 1));
      extraDude.y = 32;
      extraDude.configureTransform();
      extraDude.draw();
      context.restore();
    }

    if (showFramerate) {
      Text.renderText(''+avgFramerate, 24, Game.canvasWidth - 38, Game.canvasHeight - 2);
    }

    frameCount++;
    elapsedCounter += elapsed;
    if (elapsedCounter > 1000) {
      elapsedCounter -= 1000;
      avgFramerate = frameCount;
      frameCount = 0;
    }

    if (paused) {
      Text.renderText('PAUSED', 72, Game.canvasWidth/2 - 160, 120);
    } else {
      requestAnimFrame(mainLoop, canvasNode);
    }
  };

  mainLoop();

  $(window).keydown(function (e) {
    switch (KEY_CODES[e.keyCode]) {
      case 'f': // show framerate
        showFramerate = !showFramerate;
        break;
      case 'p': // pause
        paused = !paused;
        if (!paused) {
          // start up again
          lastFrame = Date.now();
          mainLoop();
        }
        break;
      case 'm': // mute
        SFX.muted = !SFX.muted;
        break;
    }
  });
});

// vim: fdl=0
