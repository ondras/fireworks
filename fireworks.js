var Particle = OZ.Class();
Particle.prototype.init = function(position, velocity, size, color) {
	this.phase = 0;
	this.position = [position[0], position[1], position[2]];
	this.size = size;
	this.color = color;

	this._created = new Date().getTime();
	this._time = this._created;
	this._velocity = velocity;
	this._c = [color[0], color[1], color[2]];
}

Particle.prototype.step = function(time) {
	var dt = (time - this._time) * 0.1;
	this._time = time;
	this.phase = (time - this._created) / 2000;
	
	for (var i=0;i<3;i++) {
		this.position[i] += dt * this._velocity[i];
	}
	
	this._velocity[1] += dt * 0.02; /* gravity */

	for (var i=0;i<3;i++) {
		this.color[i] = Math.round(this._c[i] * Math.cos(this.phase * Math.PI/2));
	}
}

var Fireworks = OZ.Class();
Fireworks.prototype.init = function(canvas) {
	this._width = null;
	this._height = null;
	this._ctx = canvas.getContext("2d");
	this._sync();
	
	this._status = OZ.$("status");

	OZ.Event.add(window, "resize", this._sync.bind(this));

	this._particles = [];
	this._interval = null;
}

Fireworks.prototype._randomColor = function() {
	var colors = [
		[255, 255, 255],
		[255, 255,   0],
		[255,   0, 255],
		[  0, 255, 255],
		[255,   0,   0],
		[  0, 255,   0],
		[  0,   0, 255]
	];
	return colors[Math.floor(Math.random()*colors.length)];
}

Fireworks.prototype._randomPlane = function() {
	var PI = Math.PI;
	var PI2 = PI*2;
	
	var theta = Math.random() * PI;
	var phi = Math.random() * PI2;
	var p1 = this._sphericalToXYZ(theta, 0, 1);
	var p2 = this._sphericalToXYZ(PI / 2, phi, 1);

//	var theta1 = Math.random() * PI;
//	var theta2 = Math.random() * PI;
//	var p1 = this._sphericalToXYZ(theta1, 0, 1);
//	var p2 = this._sphericalToXYZ(theta2, PI/2, 1);

	return [p1, p2];
}

Fireworks.prototype._randomShape = function() {
	var map = {
		0: 8,
		1: 3,
		2: 1
	}
	
	var total = 0;
	for (var p in map) { total += map[p]; }
	var index = Math.floor(Math.random()*total);
	for (var p in map) {
		total -= map[p];
		if (total <= index) { return parseInt(p); }
	}
}

Fireworks.prototype.createRandom = function(x, y, options) {
	var o = {
		shape: -1,
		color: -1,
		speed: -1,
		particles: -1,
		secondary: -1,
		secondayColor: -1
	}
	for (var p in options) { o[p] = options[p]; }
	
	var distance = Math.random(); /* 1 close, 0 far */
	var z = (distance-0.5) * 10; /* dummy */
	var size = 1 + distance * 3; /* size 1..4 */
	var position = [x, y, z];
	
	if (window.Audio) {
		var sounds = 2;
		var a = new Audio("sound" + (1+Math.floor(Math.random()*sounds)) + ".ogg");
		a.volume = 0.2 + distance * 0.8;
		a.play();
	}

	/* random values */
	if (o.shape == -1) { o.shape = this._randomShape(); }
	if (o.color == -1) {
		o.color = (Math.random() > 0.2 ? this._randomColor() : 0);
	}
	if (o.speed == -1) { o.speed = 0.5 + Math.random() * 3; }
	if (o.particles == -1) { o.particles = 50 + Math.round(Math.random() * 200); }
	if (o.secondary == -1) { o.secondary = Math.random() > 0.6; }
	
	var plane = this._randomPlane();
	switch (o.shape) {
		case 0:
			this._createSphere(position, o.particles, size, o.speed, o.color);
		break;
		case 1:
		case 2:
			if (o.shape == 1) {
				this._createCircle(position, o.particles, size, o.speed, o.color, plane);
			} else {
				this._createSpiral(position, o.particles, size, o.speed, o.color, plane);
			}
		break;
	}
	
	if (o.shape != 2 && o.secondary) {
		if (o.secondaryColor == -1) {
			o.secondaryColor = (Math.random() > 0.2 ? this._randomColor() : 0);
		}
		o.speed *= (1.5 + Math.random());
		this._createCircle(position, o.particles, size, o.speed, o.secondaryColor, plane);
	}

	this._redraw();
}

Fireworks.prototype._createSphere = function(position, particles, particleSize, speed, color) {
	var PI = Math.PI;
	var PI2 = PI*2;
	for (var i=0;i<particles;i++) {
		var theta = Math.random() * PI;
		var phi = Math.random() * PI2;
		var velocity = this._sphericalToXYZ(theta, phi, speed);
		var c = color || this._randomColor();

		var p = new Particle(position, velocity, particleSize, c);
		this._addParticle(p);
	}
}

Fireworks.prototype._createCircle = function(position, particles, particleSize, speed, color, plane) {
	var PI = Math.PI;
	var PI2 = PI*2;

	for (var i=0;i<particles;i++) {
		var alpha = i * PI2 / particles;
		var sa = Math.sin(alpha) * speed;
		var ca = Math.cos(alpha) * speed;
		var velocity = [
			plane[0][0]*sa + plane[1][0]*ca,
			plane[0][1]*sa + plane[1][1]*ca,
			plane[0][2]*sa + plane[1][2]*ca
		];
		var c = color || this._randomColor();

		var p = new Particle(position, velocity, particleSize, c);
		this._addParticle(p);
	}
}

Fireworks.prototype._createSpiral = function(position, particles, particleSize, speed, color, plane) {
	var PI = Math.PI;
	var PI2 = PI*2;
	var rotations = 2;

	for (var i=0;i<particles;i++) {
		var dist = (i+1)/particles;
		var alpha = PI2 * rotations * dist;

		var sa = Math.sin(alpha) * speed * dist;
		var ca = Math.cos(alpha) * speed * dist;
		var velocity = [
			plane[0][0]*sa + plane[1][0]*ca,
			plane[0][1]*sa + plane[1][1]*ca,
			plane[0][2]*sa + plane[1][2]*ca
		];
		var c = color || this._randomColor();

		var p = new Particle(position, velocity, particleSize, c);
		this._addParticle(p);
	}
}


Fireworks.prototype._addParticle = function(particle) {
	var len = this._particles.push(particle);
	if (len == 1) { 
		this._interval = setInterval(this._step.bind(this), 30);
	}
}

Fireworks.prototype._step = function() {
	var time = new Date().getTime();

	for (var i=0;i<this._particles.length;i++) {
		this._particles[i].step(time);
	}
	this._redraw();
	
	var t2 = new Date().getTime();
	diff = t2 - time || 1;
	var fps = Math.round(1000 / diff);
	var count = this._particles.length;
	if (count) { 
		this._status.innerHTML = "Particles: "+this._particles.length+"<br/>FPS: "+fps;
	} else {
		this._status.innerHTML = "";
	}
}

Fireworks.prototype._clear = function() {
	this._ctx.clearRect(0, 0, this._width, this._height);
}

Fireworks.prototype._redraw = function() {
	var size = 2;
	this._clear();
	var remove = [];
	var pi2 = Math.PI*2;

	for (var i=0;i<this._particles.length;i++) {
		var p = this._particles[i];
		var pos = p.position;
		if (pos[0] < 0 || pos[0] > this._width || pos[1] > this._height || p.phase >= 1) { 
			remove.push(i); 
		} else {
//			var color = this._hsl2rgb(p.color, 1, p.lightness);
		
			this._ctx.beginPath();
			this._ctx.arc(pos[0], pos[1], p.size, 0, pi2, true);
			this._ctx.closePath();
			if (!p.color.join) {debugger;}
			this._ctx.fillStyle = "rgb(" + p.color.join(",") + ")";
			this._ctx.fill();
		}
	}
	
	while (remove.length) { this._removeParticle(remove.pop()); }
}

Fireworks.prototype._removeParticle = function(index) {
	this._particles.splice(index, 1);
	if (!this._particles.length) {
		clearInterval(this._interval);
	}
}

Fireworks.prototype._sync = function() {
	var win = OZ.DOM.win();
	var c = this._ctx.canvas;
	c.width = win[0];
	c.height = win[1];
	this._resize();
}

Fireworks.prototype._resize = function() {
	this._width = this._ctx.canvas.offsetWidth;
	this._height = this._ctx.canvas.offsetHeight;
}

/**
 * Theta 0-pi
 * Phi 0-2*pi
 * r Radius
 */
Fireworks.prototype._sphericalToXYZ = function(theta, phi, r) {
	return [
		r * Math.sin(theta) * Math.cos(phi),
		r * Math.sin(theta) * Math.sin(phi),
		r * Math.cos(theta)
	];
}

/**
 * h 0-360
 * s 0-1
 * v 0-255
 * @returns 3x 0-255
 */
Fireworks.prototype._hsv2rgb = function(h, s, v) {
	var hi = Math.floor(h/60) % 6;
	var f = h/60 - hi;
	var p = Math.round(v * (1 - s));
	var q = Math.round(v * (1 - f*s));
	var t = Math.round(v * (1 - (1 - f)*s));
	switch (hi) {
		case 0: return [v,t,p]; break;
		case 1: return [q,v,p]; break;
		case 2: return [p,v,t]; break;
		case 3: return [p,q,v]; break;
		case 4: return [t,p,v]; break;
		case 5: return [v,p,q]; break;
	}
}

Fireworks.prototype._hsl2rgb = function(h, s, l) {
	l = l / 255;

	while (h < 0){ h += 360; }
	while (h > 360){ h -= 360; }
	var r, g, b;
	if (h < 120){
		r = (120 - h) / 60;
		g = h / 60;
		b = 0;
	}else if (h < 240){
		r = 0;
		g = (240 - h) / 60;
		b = (h - 120) / 60;
	}else{
		r = (h - 240) / 60;
		g = 0;
		b = (360 - h) / 60;
	}

	r = Math.min(r, 1);
	g = Math.min(g, 1);
	b = Math.min(b, 1);

	r = 2 * s * r + (1 - s);
	g = 2 * s * g + (1 - s);
	b = 2 * s * b + (1 - s);

	if (l < 0.5){
		r = l * r;
		g = l * g;
		b = l * b;
	}else{
		r = (1 - l) * r + 2 * l - 1;
		g = (1 - l) * g + 2 * l - 1;
		b = (1 - l) * b + 2 * l - 1;
	}

	r = Math.ceil(r * 255);
	g = Math.ceil(g * 255);
	b = Math.ceil(b * 255);

	return [r, g, b];
}
