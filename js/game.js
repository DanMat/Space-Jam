/*
 * Space-Jam — a horizontal side-scrolling space shooter.
 *
 * Rebuilt from the original Akihabara-engine version into a dependency-free
 * canvas game: you fly on the left and blast enemies streaming in from the
 * right across 10 themed levels, each ending in a boss. Weapon upgrades, homing
 * missiles, shields, smart bombs, combos, enemy movement patterns/formations,
 * and a shared high-score leaderboard. All art is drawn procedurally.
 */
(function () {
	'use strict';

	var W = 960, H = 540;
	var LEVELS = window.SPACEJAM_LEVELS;
	var canvas, ctx, dpr = 1, raf, lastTime;
	var el = {};

	/* ------------------------------- state -------------------------------- */

	// Initialised up front so render() is safe on the title screen, before a
	// game starts (a loop that throws on frame 1 never reschedules itself).
	var state = 'title';
	var player = null, enemies = [], pbul = [], ebul = [], missiles = [], powerups = [], parts = [], stars = [];
	var boss = null, levelIndex = 0, lvl = null;
	var score = 0, lives = 3, bombs = 3, combo = 0, killed = 0, quota = 0;
	var spawnTimer = 0, bossPending = false, shake = 0, hurt = 0, scrollX = 0, elapsed = 0, introTimer = 0;
	var input = { up: false, down: false, left: false, right: false, mouse: null };

	/* --------------------------- data tables ------------------------------ */

	var ENEMY = {
		scout:    { w: 34, h: 24, hp: 1, score: 50,  speed: 3.2, behavior: 'straight', color: '#ff5e6c', fire: 0 },
		weaver:   { w: 34, h: 26, hp: 1, score: 70,  speed: 2.6, behavior: 'sine',     color: '#b06bff', fire: 0 },
		diver:    { w: 34, h: 26, hp: 1, score: 90,  speed: 3.0, behavior: 'diver',    color: '#ff9f43', fire: 0 },
		kamikaze: { w: 28, h: 22, hp: 1, score: 80,  speed: 4.2, behavior: 'homing',   color: '#ffd24a', fire: 0 },
		gunship:  { w: 44, h: 34, hp: 3, score: 130, speed: 2.0, behavior: 'straight', color: '#4aa0ff', fire: 1.4, spread: true },
		turret:   { w: 46, h: 40, hp: 4, score: 150, speed: 1.4, behavior: 'straight', color: '#7ea06a', fire: 1.1 }
	};

	var POWER = {
		W: { name: 'Weapon up', color: '#39ff9e' },
		H: { name: 'Homing missiles', color: '#00e5ff' },
		R: { name: 'Rapid fire', color: '#ffd24a' },
		S: { name: 'Shield', color: '#7b8cff' },
		B: { name: 'Smart bomb', color: '#ff5e7e' },
		L: { name: 'Extra life', color: '#ff2e97' }
	};

	/* ------------------------------ helpers ------------------------------- */

	function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
	function rand(a, b) { return a + Math.random() * (b - a); }
	function dist2(ax, ay, bx, by) { var dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; }
	function pick(a) { return a[(Math.random() * a.length) | 0]; }
	function hitRect(a, b) { return Math.abs(a.x - b.x) < (a.w + b.w) / 2 && Math.abs(a.y - b.y) < (a.h + b.h) / 2; }

	/* ------------------------------- setup -------------------------------- */

	function boot() {
		canvas = document.getElementById('game');
		ctx = canvas.getContext('2d');
		['hudScore', 'hudLevel', 'hudLives', 'hudBombs', 'toast', 'screenTitle', 'screenHowto',
		 'screenIntro', 'screenPause', 'screenGameover', 'screenInitials', 'screenLeaderboard',
		 'introLevel', 'introName', 'introTag', 'goTitle', 'goScore', 'goSub', 'initScore',
		 'lbBody', 'lbMode', 'lbTitle', 'titleTop'].forEach(function (id) { el[id] = document.getElementById(id); });
		makeStars();
		resize();
		window.addEventListener('resize', resize);
		bindInput();
		bindButtons();
		showTitle();
		lastTime = performance.now();
		raf = requestAnimationFrame(loop);
	}

	function resize() {
		dpr = Math.min(window.devicePixelRatio || 1, 2);
		canvas.width = W * dpr; canvas.height = H * dpr;
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
	}

	function makeStars() {
		stars = [];
		for (var i = 0; i < 90; i++) {
			var layer = (i % 3) + 1;
			stars.push({ x: Math.random() * W, y: Math.random() * H, s: layer, speed: layer * 0.6 + 0.4 });
		}
	}

	/* ------------------------------ new game ------------------------------ */

	function newGame() { score = 0; lives = 3; bombs = 3; combo = 0; levelIndex = 0; player = null; startLevel(0); }

	function newPlayer() {
		player = { x: 120, y: H / 2, w: 40, h: 26, speed: 5, fireTimer: 0, fireRate: 0.16, power: 1,
			homing: false, homingTimer: 0, rapid: 0, shield: 0, iframe: 0 };
	}

	function startLevel(idx) {
		levelIndex = idx; lvl = LEVELS[idx];
		enemies = []; ebul = []; pbul = []; missiles = []; powerups = []; parts = [];
		boss = null; bossPending = false; killed = 0; quota = lvl.quota; spawnTimer = 1; combo = 0;
		if (!player) { newPlayer(); } else { player.x = 120; player.y = H / 2; player.shield = 2; player.iframe = 1; }
		showIntro();
	}
	function startGame() { newGame(); }

	/* ------------------------------- flow --------------------------------- */

	function showIntro() {
		state = 'intro'; introTimer = 1.8;
		el.introLevel.textContent = 'Level ' + (levelIndex + 1) + ' / ' + LEVELS.length;
		el.introName.textContent = lvl.name; el.introTag.textContent = lvl.tag;
		showScreen('screenIntro'); updateHud();
	}
	function beginPlay() { state = 'playing'; showScreen(null); lastTime = performance.now(); }

	function loseLife() {
		lives--; combo = 0; updateHud(); shake = 14; hurt = 1;
		if (player.power > 1) { player.power--; }
		player.homing = false;
		if (lives <= 0) { return endGame(false); }
		player.x = 120; player.y = H / 2; player.shield = 2.5; player.iframe = 2; ebul = [];
	}

	function levelCleared() {
		score += 1000 * (levelIndex + 1);
		if (levelIndex >= LEVELS.length - 1) { return endGame(true); }
		startLevel(levelIndex + 1);
	}

	function endGame(won) {
		state = 'ending';
		if (won) { score += lives * 500; }
		Leaderboard.qualifies(score).then(function (ok) { ok ? showInitials() : showGameover(won); });
	}
	function showGameover(won) {
		state = 'gameover';
		el.goTitle.textContent = won ? 'You saved the galaxy!' : 'Game Over';
		el.goScore.textContent = score.toLocaleString();
		el.goSub.textContent = won ? 'All ' + LEVELS.length + ' levels cleared.' : 'Reached level ' + (levelIndex + 1) + '.';
		showScreen('screenGameover');
	}

	/* -------------------------------- loop -------------------------------- */

	function loop(now) {
		var dt = Math.min((now - lastTime) / 1000, 0.05);
		lastTime = now;
		if (state === 'playing') { update(dt); }
		else if (state === 'intro') { introTimer -= dt; scrollStars(dt); if (introTimer <= 0) { beginPlay(); } }
		else { scrollStars(dt * 0.4); }
		render();
		raf = requestAnimationFrame(loop);
	}

	function scrollStars(dt) {
		scrollX += dt * 60; var f = dt * 60;
		for (var i = 0; i < stars.length; i++) { stars[i].x -= stars[i].speed * f; if (stars[i].x < 0) { stars[i].x = W; stars[i].y = Math.random() * H; } }
	}

	function update(dt) {
		elapsed += dt;
		scrollStars(dt * (lvl ? lvl.scrollSpeed / 2.5 : 1));
		updatePlayer(dt);
		updateSpawning(dt);
		updateEnemies(dt);
		if (boss) { updateBoss(dt); }
		updatePBullets(dt);
		updateMissiles(dt);
		updateEBullets(dt);
		updatePowerups(dt);
		updateParts(dt);
		if (shake > 0) { shake = Math.max(0, shake - dt * 60); }
		if (hurt > 0) { hurt = Math.max(0, hurt - dt * 2.5); }
		updateHud();
	}

	/* ------------------------------ player -------------------------------- */

	function updatePlayer(dt) {
		var p = player, f = dt * 60;
		if (input.mouse) {
			p.x += clamp(input.mouse.x - p.x, -p.speed * f, p.speed * f);
			p.y += clamp(input.mouse.y - p.y, -p.speed * f, p.speed * f);
		} else {
			var mx = (input.right ? 1 : 0) - (input.left ? 1 : 0), my = (input.down ? 1 : 0) - (input.up ? 1 : 0);
			p.x += mx * p.speed * f; p.y += my * p.speed * f;
		}
		p.x = clamp(p.x, 40, W * 0.62); p.y = clamp(p.y, 34, H - 34);
		if (p.iframe > 0) { p.iframe -= dt; }
		if (p.shield > 0) { p.shield -= dt; }
		if (p.rapid > 0) { p.rapid -= dt; }
		p.fireTimer -= dt;
		if (p.fireTimer <= 0) { p.fireTimer = p.rapid > 0 ? p.fireRate * 0.55 : p.fireRate; fireMain(); }
		if (p.homing) { p.homingTimer -= dt; if (p.homingTimer <= 0) { p.homingTimer = 0.5; fireMissiles(); } }
	}

	function fireMain() {
		var p = player, n = p.power, angles;
		if (n === 1) { angles = [0]; }
		else if (n === 2) { angles = [-0.05, 0.05]; }
		else if (n === 3) { angles = [-0.14, 0, 0.14]; }
		else if (n === 4) { angles = [-0.2, -0.07, 0.07, 0.2]; }
		else { angles = [-0.26, -0.13, 0, 0.13, 0.26]; }
		var sp = 12;
		angles.forEach(function (a) { pbul.push({ x: p.x + p.w / 2, y: p.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: 4, dmg: 1 }); });
	}

	function fireMissiles() {
		var p = player;
		[-10, 10].forEach(function (dy) { missiles.push({ x: p.x, y: p.y + dy, vx: 4, vy: dy * 0.2, r: 5, dmg: 2, life: 2.5 }); });
	}

	function useBomb() {
		if (bombs <= 0 || state !== 'playing') { return; }
		bombs--; shake = 18; hurt = 0.6; ebul = [];
		for (var i = enemies.length - 1; i >= 0; i--) { damageEnemy(i, 3); }
		if (boss && !boss.entering) { boss.hp -= 40; burst(boss.x, boss.y, boss.color, 20); if (boss.hp <= 0) { killBoss(); } }
		toast('SMART BOMB!'); updateHud();
	}

	/* ------------------------------ spawning ------------------------------ */

	function updateSpawning(dt) {
		if (bossPending || boss) { return; }
		spawnTimer -= dt;
		if (spawnTimer <= 0) {
			spawnTimer = lvl.spawnEvery;
			if (Math.random() < lvl.formations) { spawnFormation(); } else { spawnEnemy(pick(lvl.enemies)); }
		}
		if (killed >= quota) { spawnBoss(); }
	}

	function spawnEnemy(type, y) {
		var b = ENEMY[type];
		var e = { type: type, x: W + 30, y: y == null ? rand(50, H - 50) : y, baseY: 0,
			w: b.w, h: b.h, hp: b.hp, maxHp: b.hp, speed: b.speed, behavior: b.behavior, color: b.color,
			score: b.score, fire: b.fire || 0, spread: !!b.spread, fireTimer: rand(0.5, 1.5),
			t: rand(0, 6.28), amp: rand(30, 70), flash: 0, dropsPower: Math.random() < 0.12 };
		e.baseY = e.y; enemies.push(e); return e;
	}

	function spawnFormation() {
		var type = pick(lvl.enemies), y0 = rand(80, H - 160), n = 4 + ((Math.random() * 3) | 0);
		for (var i = 0; i < n; i++) {
			var e = spawnEnemy(type, y0 + i * (ENEMY[type].h + 14));
			e.x = W + 30 + i * 26;
		}
		enemies[enemies.length - 1].dropsPower = true;
	}

	/* ------------------------------ enemies ------------------------------- */

	function updateEnemies(dt) {
		var f = dt * 60, p = player;
		for (var i = enemies.length - 1; i >= 0; i--) {
			var e = enemies[i];
			e.x -= e.speed * f;
			if (e.behavior === 'sine') { e.t += dt * 3; e.y = e.baseY + Math.sin(e.t) * e.amp; }
			else if (e.behavior === 'diver') { if (e.x > W * 0.5) { e.y += Math.sign(p.y - e.y) * 2.4 * f; } }
			else if (e.behavior === 'homing') { e.y += clamp(p.y - e.y, -3.2, 3.2) * f; }
			if (e.flash > 0) { e.flash -= dt; }
			if (e.fire > 0) { e.fireTimer -= dt; if (e.fireTimer <= 0 && e.x < W - 20) { e.fireTimer = e.fire; enemyFire(e); } }
			if (p.iframe <= 0 && p.shield <= 0 && hitRect(e, p)) { burst(e.x, e.y, e.color, 10); enemies.splice(i, 1); loseLife(); continue; }
			if (e.x < -50) { enemies.splice(i, 1); }
		}
	}

	function enemyFire(e) {
		var p = player, ang = Math.atan2(p.y - e.y, p.x - e.x), sp = 4.2;
		if (e.spread) { for (var k = -1; k <= 1; k++) { ebul.push(mkeb(e, ang + k * 0.2, sp)); } }
		else { ebul.push(mkeb(e, ang, sp)); }
	}
	function mkeb(e, ang, sp) { return { x: e.x, y: e.y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, r: 5 }; }

	function damageEnemy(i, dmg) {
		var e = enemies[i]; e.hp -= dmg; e.flash = 0.07;
		if (e.hp <= 0) {
			score += Math.round(e.score * comboMul()); combo++; killed++;
			burst(e.x, e.y, e.color, 12);
			if (e.dropsPower) { dropPower(e.x, e.y); }
			enemies.splice(i, 1); updateHud();
		}
	}
	function comboMul() { return 1 + Math.min(combo, 20) * 0.1; }

	function dropPower(x, y) {
		var keys = ['W', 'W', 'H', 'R', 'S', 'B', 'L'];
		powerups.push({ x: x, y: y, kind: keys[(Math.random() * keys.length) | 0], vx: -1.4, t: 0 });
	}

	/* ------------------------------- boss --------------------------------- */

	function spawnBoss() {
		bossPending = true; toast('⚠ ' + lvl.boss.name);
		setTimeout(function () {
			if (state === 'playing' || state === 'intro') {
				boss = { x: W + 120, y: H / 2, tx: W - 150, w: 120, h: 130, hp: lvl.boss.hp, maxHp: lvl.boss.hp,
					color: lvl.boss.color, name: lvl.boss.name, t: 0, fireTimer: 1.5, moveDir: 1, flash: 0, entering: true };
			}
			bossPending = false;
		}, 900);
	}

	function updateBoss(dt) {
		var b = boss, f = dt * 60, p = player;
		if (b.entering) { b.x -= 3 * f; if (b.x <= b.tx) { b.x = b.tx; b.entering = false; } }
		else {
			b.t += dt; b.y += b.moveDir * 1.6 * f;
			if (b.y < 90) { b.y = 90; b.moveDir = 1; } else if (b.y > H - 90) { b.y = H - 90; b.moveDir = -1; }
			b.fireTimer -= dt;
			if (b.fireTimer <= 0) { b.fireTimer = clamp(1.3 - levelIndex * 0.06, 0.5, 1.3); bossFire(); }
		}
		if (b.flash > 0) { b.flash -= dt; }
		if (p.iframe <= 0 && p.shield <= 0 && Math.abs(p.x - b.x) < b.w / 2 + p.w / 2 && Math.abs(p.y - b.y) < b.h / 2 + p.h / 2) { loseLife(); }
	}

	function bossFire() {
		var b = boss, p = player, aim = Math.atan2(p.y - b.y, p.x - b.x);
		for (var k = -2; k <= 2; k++) { ebul.push(mkeb({ x: b.x - b.w / 2, y: b.y }, aim + k * 0.16, 4.4)); }
		if (Math.random() < 0.4) { var e = spawnEnemy(pick(lvl.enemies), b.y); e.x = b.x - b.w / 2; }
	}

	function killBoss() {
		burst(boss.x, boss.y, boss.color, 40); shake = 22;
		score += 2000 * (levelIndex + 1); toast(boss.name + ' DESTROYED'); boss = null;
		setTimeout(function () { if (state === 'playing') { levelCleared(); } }, 700);
	}

	/* ------------------------------ bullets ------------------------------- */

	function updatePBullets(dt) {
		var f = dt * 60;
		for (var i = pbul.length - 1; i >= 0; i--) {
			var b = pbul[i]; b.x += b.vx * f; b.y += b.vy * f;
			if (b.x > W + 10 || b.y < -10 || b.y > H + 10) { pbul.splice(i, 1); continue; }
			if (hitBoss(b)) { pbul.splice(i, 1); continue; }
			var done = false;
			for (var j = enemies.length - 1; j >= 0; j--) {
				if (Math.abs(b.x - enemies[j].x) < enemies[j].w / 2 && Math.abs(b.y - enemies[j].y) < enemies[j].h / 2) { damageEnemy(j, b.dmg); done = true; break; }
			}
			if (done) { pbul.splice(i, 1); }
		}
	}

	function updateMissiles(dt) {
		var f = dt * 60;
		for (var i = missiles.length - 1; i >= 0; i--) {
			var m = missiles[i]; m.life -= dt;
			var tgt = nearestEnemy(m.x, m.y);
			if (tgt) { var a = Math.atan2(tgt.y - m.y, tgt.x - m.x); m.vx += Math.cos(a) * 0.6 * f; m.vy += Math.sin(a) * 0.6 * f; }
			var mag = Math.hypot(m.vx, m.vy); if (mag > 7) { m.vx *= 7 / mag; m.vy *= 7 / mag; }
			m.x += m.vx * f; m.y += m.vy * f;
			if (m.life <= 0 || m.x > W + 10 || m.x < -10) { missiles.splice(i, 1); continue; }
			if (hitBoss(m)) { missiles.splice(i, 1); continue; }
			for (var j = enemies.length - 1; j >= 0; j--) {
				if (Math.abs(m.x - enemies[j].x) < enemies[j].w / 2 + 4 && Math.abs(m.y - enemies[j].y) < enemies[j].h / 2 + 4) { damageEnemy(j, m.dmg); burst(m.x, m.y, '#00e5ff', 5); missiles.splice(i, 1); break; }
			}
		}
	}

	function nearestEnemy(x, y) {
		var best = boss && !boss.entering ? boss : null, bd = best ? dist2(x, y, boss.x, boss.y) : Infinity;
		for (var i = 0; i < enemies.length; i++) { var d = dist2(x, y, enemies[i].x, enemies[i].y); if (d < bd) { bd = d; best = enemies[i]; } }
		return best;
	}

	function hitBoss(b) {
		if (!boss || boss.entering) { return false; }
		if (Math.abs(b.x - boss.x) < boss.w / 2 && Math.abs(b.y - boss.y) < boss.h / 2) {
			boss.hp -= b.dmg; boss.flash = 0.05; burst(b.x, b.y, '#fff', 3);
			if (boss.hp <= 0) { killBoss(); }
			return true;
		}
		return false;
	}

	function updateEBullets(dt) {
		var f = dt * 60, p = player;
		for (var i = ebul.length - 1; i >= 0; i--) {
			var b = ebul[i]; b.x += b.vx * f; b.y += b.vy * f;
			if (b.x < -10 || b.x > W + 10 || b.y < -10 || b.y > H + 10) { ebul.splice(i, 1); continue; }
			if (p.iframe <= 0 && p.shield <= 0 && dist2(b.x, b.y, p.x, p.y) < (b.r + p.w / 2) * (b.r + p.h / 3)) {
				loseLife(); // clears the ebul array — stop iterating it this frame
				return;
			}
		}
	}

	/* ----------------------------- power-ups ------------------------------ */

	function updatePowerups(dt) {
		var f = dt * 60, p = player;
		for (var i = powerups.length - 1; i >= 0; i--) {
			var u = powerups[i]; u.x += u.vx * f; u.t += dt; u.y += Math.sin(u.t * 3) * 0.6 * f;
			if (u.x < -20) { powerups.splice(i, 1); continue; }
			if (Math.abs(u.x - p.x) < 24 && Math.abs(u.y - p.y) < 22) { applyPower(u.kind); powerups.splice(i, 1); }
		}
	}

	function applyPower(kind) {
		if (kind === 'W') { player.power = Math.min(5, player.power + 1); }
		else if (kind === 'H') { player.homing = true; }
		else if (kind === 'R') { player.rapid = 8; }
		else if (kind === 'S') { player.shield = 6; }
		else if (kind === 'B') { bombs = Math.min(5, bombs + 1); }
		else if (kind === 'L') { lives = Math.min(5, lives + 1); score += 200; }
		toast(POWER[kind].name + '!'); updateHud();
	}

	/* ------------------------------ particles ----------------------------- */

	function burst(x, y, color, n) { for (var i = 0; i < n; i++) { parts.push({ x: x, y: y, vx: rand(-4, 4), vy: rand(-4, 4), life: 1, color: color }); } }
	function updateParts(dt) {
		var f = dt * 60;
		for (var i = parts.length - 1; i >= 0; i--) { var p = parts[i]; p.x += p.vx * f; p.y += p.vy * f; p.vx *= 0.92; p.vy *= 0.92; p.life -= dt * 2; if (p.life <= 0) { parts.splice(i, 1); } }
	}

	/* -------------------------------- render ------------------------------ */

	function render() {
		ctx.save();
		if (shake > 0) { ctx.translate(rand(-shake, shake) * 0.5, rand(-shake, shake) * 0.5); }
		drawBackground();
		for (var i = 0; i < powerups.length; i++) { drawPower(powerups[i]); }
		for (i = 0; i < enemies.length; i++) { drawEnemy(enemies[i]); }
		if (boss) { drawBoss(); }
		for (i = 0; i < ebul.length; i++) { drawEB(ebul[i]); }
		for (i = 0; i < missiles.length; i++) { drawMissile(missiles[i]); }
		for (i = 0; i < pbul.length; i++) { drawPB(pbul[i]); }
		if (player && state !== 'title') { drawPlayer(); }
		for (i = 0; i < parts.length; i++) { drawPart(parts[i]); }
		ctx.restore();
		if (hurt > 0) { ctx.fillStyle = 'rgba(255,40,60,' + (hurt * 0.3) + ')'; ctx.fillRect(0, 0, W, H); }
	}

	function drawBackground() {
		var t = lvl ? lvl.theme : { a: '#0a0a1c', b: '#1b2a6b', nebula: '#3a4fae', star: '#9fb8ff' };
		var g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, t.a); g.addColorStop(1, t.b);
		ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
		ctx.globalAlpha = 0.18; ctx.fillStyle = t.nebula;
		for (var k = 0; k < 3; k++) { var nx = (W - ((scrollX * 0.2 + k * 400) % (W + 300))) + 150; ctx.beginPath(); ctx.arc(nx, 120 + k * 160, 130, 0, 6.28); ctx.fill(); }
		ctx.globalAlpha = 1;
		for (var i = 0; i < stars.length; i++) { var s = stars[i]; ctx.fillStyle = t.star; ctx.globalAlpha = 0.3 + s.s * 0.22; ctx.fillRect(s.x, s.y, s.s, s.s); }
		ctx.globalAlpha = 1;
	}

	function drawPlayer() {
		var p = player;
		ctx.save(); ctx.translate(p.x, p.y);
		if (p.iframe > 0 && Math.floor(p.iframe * 20) % 2) { ctx.globalAlpha = 0.4; }
		ctx.fillStyle = 'rgba(255,180,60,.8)';
		ctx.beginPath(); ctx.moveTo(-p.w / 2, -5); ctx.lineTo(-p.w / 2 - rand(6, 14), 0); ctx.lineTo(-p.w / 2, 5); ctx.closePath(); ctx.fill();
		ctx.shadowColor = '#00e5ff'; ctx.shadowBlur = 12; ctx.fillStyle = '#00e5ff';
		ctx.beginPath(); ctx.moveTo(p.w / 2 + 4, 0); ctx.lineTo(-p.w / 2, -p.h / 2); ctx.lineTo(-p.w / 3, 0); ctx.lineTo(-p.w / 2, p.h / 2); ctx.closePath(); ctx.fill();
		ctx.shadowBlur = 0; ctx.fillStyle = '#eaffff';
		ctx.beginPath(); ctx.arc(0, 0, 4, 0, 6.28); ctx.fill();
		if (p.shield > 0) { ctx.strokeStyle = 'rgba(123,140,255,' + (0.4 + 0.3 * Math.sin(elapsed * 8)) + ')'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, p.w / 2 + 8, 0, 6.28); ctx.stroke(); }
		ctx.restore();
	}

	function drawEnemy(e) {
		ctx.save(); ctx.translate(e.x, e.y);
		ctx.fillStyle = e.flash > 0 ? '#fff' : e.color; ctx.shadowColor = e.color; ctx.shadowBlur = 8;
		var w = e.w / 2, h = e.h / 2;
		if (e.type === 'turret' || e.type === 'gunship') {
			ctx.beginPath(); ctx.moveTo(-w, -h); ctx.lineTo(w * 0.6, -h * 0.7); ctx.lineTo(-w * 0.4, 0); ctx.lineTo(w * 0.6, h * 0.7); ctx.lineTo(-w, h); ctx.closePath(); ctx.fill();
			ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.beginPath(); ctx.arc(-w * 0.2, 0, h * 0.4, 0, 6.28); ctx.fill();
		} else {
			ctx.beginPath(); ctx.moveTo(-w - 3, 0); ctx.lineTo(w, -h); ctx.lineTo(w * 0.5, 0); ctx.lineTo(w, h); ctx.closePath(); ctx.fill();
		}
		ctx.restore();
		if (e.maxHp > 1) { ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(e.x - e.w / 2, e.y - e.h / 2 - 7, e.w, 3); ctx.fillStyle = e.color; ctx.fillRect(e.x - e.w / 2, e.y - e.h / 2 - 7, e.w * (e.hp / e.maxHp), 3); }
	}

	function drawBoss() {
		var b = boss;
		ctx.save(); ctx.translate(b.x, b.y);
		ctx.fillStyle = b.flash > 0 ? '#fff' : b.color; ctx.shadowColor = b.color; ctx.shadowBlur = 24;
		var w = b.w / 2, h = b.h / 2;
		ctx.beginPath(); ctx.moveTo(-w - 10, 0); ctx.lineTo(w * 0.4, -h); ctx.lineTo(w, -h * 0.4); ctx.lineTo(w * 0.6, 0); ctx.lineTo(w, h * 0.4); ctx.lineTo(w * 0.4, h); ctx.closePath(); ctx.fill();
		ctx.shadowBlur = 0; ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.beginPath(); ctx.arc(-w * 0.2, 0, h * 0.4, 0, 6.28); ctx.fill();
		ctx.fillStyle = '#ff4d6d'; ctx.beginPath(); ctx.arc(-w * 0.2, 0, h * 0.18, 0, 6.28); ctx.fill();
		ctx.restore();
		ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(W / 2 - 200, 14, 400, 10);
		ctx.fillStyle = b.color; ctx.fillRect(W / 2 - 200, 14, 400 * Math.max(0, b.hp / b.maxHp), 10);
		ctx.fillStyle = '#fff'; ctx.font = '10px monospace'; ctx.textAlign = 'center'; ctx.fillText(b.name, W / 2, 34);
	}

	function drawPB(b) { ctx.save(); ctx.shadowColor = '#7dffea'; ctx.shadowBlur = 8; ctx.fillStyle = '#eafffb'; ctx.fillRect(b.x - 5, b.y - 2, 10, 4); ctx.restore(); }
	function drawMissile(m) { ctx.save(); ctx.shadowColor = '#00e5ff'; ctx.shadowBlur = 8; ctx.fillStyle = '#00e5ff'; ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, 6.28); ctx.fill(); ctx.restore(); }
	function drawEB(b) { ctx.save(); ctx.shadowColor = '#ff5e7e'; ctx.shadowBlur = 8; ctx.fillStyle = '#ff5e7e'; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 6.28); ctx.fill(); ctx.restore(); }
	function drawPower(u) {
		var m = POWER[u.kind];
		ctx.save(); ctx.shadowColor = m.color; ctx.shadowBlur = 12; ctx.fillStyle = m.color; roundRect(u.x - 13, u.y - 13, 26, 26, 7); ctx.fill(); ctx.restore();
		ctx.fillStyle = '#05131a'; ctx.font = 'bold 15px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(u.kind, u.x, u.y + 1);
	}
	function drawPart(p) { ctx.globalAlpha = Math.max(0, p.life); ctx.fillStyle = p.color; ctx.fillRect(p.x - 2, p.y - 2, 4, 4); ctx.globalAlpha = 1; }
	function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

	/* -------------------------------- HUD --------------------------------- */

	function updateHud() {
		el.hudScore.textContent = score.toLocaleString();
		el.hudLevel.textContent = 'Lv ' + (levelIndex + 1);
		el.hudLives.textContent = '▲'.repeat(Math.max(0, lives));
		el.hudBombs.textContent = '✸'.repeat(Math.max(0, bombs));
	}
	var toastTimer;
	function toast(msg) { el.toast.textContent = msg; el.toast.classList.add('toast--show'); clearTimeout(toastTimer); toastTimer = setTimeout(function () { el.toast.classList.remove('toast--show'); }, 1400); }

	/* --------------------------- initials entry --------------------------- */

	var initSlots = ['A', 'A', 'A'], initCursor = 0;
	function showInitials() { state = 'initials'; initSlots = ['A', 'A', 'A']; initCursor = 0; el.initScore.textContent = score.toLocaleString(); renderInitials(); showScreen('screenInitials'); }
	function renderInitials() { el.screenInitials.querySelectorAll('.slot').forEach(function (s, i) { s.querySelector('.slot__ch').textContent = initSlots[i]; s.classList.toggle('slot--active', i === initCursor); }); }
	function cycleSlot(i, d) { var c = (initSlots[i].charCodeAt(0) - 65 + d + 26) % 26; initSlots[i] = String.fromCharCode(65 + c); initCursor = i; renderInitials(); }
	function submitInitials() { Leaderboard.submit(initSlots.join(''), score, levelIndex + 1).then(function () { showLeaderboard(initSlots.join('')); }); }

	/* ----------------------------- leaderboard ---------------------------- */

	function showLeaderboard(highlight) {
		state = 'leaderboard';
		el.lbTitle.textContent = 'High Scores';
		el.lbMode.textContent = Leaderboard.mode === 'supabase' ? 'online' : 'this device';
		el.lbBody.innerHTML = '<tr><td colspan="4" class="lb-loading">Loading…</td></tr>';
		showScreen('screenLeaderboard');
		Leaderboard.top().then(function (rows) {
			if (!rows.length) { el.lbBody.innerHTML = '<tr><td colspan="4" class="lb-loading">No scores yet — be the first!</td></tr>'; return; }
			var used = false;
			el.lbBody.innerHTML = rows.map(function (row, i) {
				var me = !used && highlight && row.initials === highlight && row.score === score; if (me) { used = true; }
				return '<tr' + (me ? ' class="lb-me"' : '') + '><td>' + (i + 1) + '</td><td class="lb-ini">' + esc(row.initials) + '</td><td class="lb-score">' + Number(row.score).toLocaleString() + '</td><td>' + (row.stage || '-') + '</td></tr>';
			}).join('');
		});
	}
	function refreshTitleTop() { Leaderboard.top(1).then(function (rows) { el.titleTop.textContent = rows.length ? 'Best: ' + Number(rows[0].score).toLocaleString() + ' — ' + rows[0].initials : ''; }); }
	function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

	/* ------------------------------ screens ------------------------------- */

	function showScreen(id) {
		['screenTitle', 'screenHowto', 'screenIntro', 'screenPause', 'screenGameover', 'screenInitials', 'screenLeaderboard']
			.forEach(function (s) { el[s].hidden = (s !== id); });
	}
	function showTitle() { state = 'title'; showScreen('screenTitle'); refreshTitleTop(); }
	function togglePause() { if (state === 'playing') { state = 'paused'; showScreen('screenPause'); } else if (state === 'paused') { showScreen(null); state = 'playing'; lastTime = performance.now(); } }

	/* ------------------------------- input -------------------------------- */

	function pt(cx, cy) { var r = canvas.getBoundingClientRect(); return { x: (cx - r.left) / r.width * W, y: (cy - r.top) / r.height * H }; }
	function bindInput() {
		canvas.addEventListener('mousemove', function (e) { input.mouse = pt(e.clientX, e.clientY); });
		canvas.addEventListener('mouseleave', function () { input.mouse = null; });
		canvas.addEventListener('mousedown', function () { if (state === 'playing') { useBomb(); } });
		canvas.addEventListener('touchstart', tmove, { passive: false });
		canvas.addEventListener('touchmove', tmove, { passive: false });
		canvas.addEventListener('touchend', function () { input.mouse = null; });
		function tmove(e) { var t = e.touches[0]; if (t) { input.mouse = pt(t.clientX, t.clientY); } e.preventDefault(); }

		document.addEventListener('keydown', function (e) {
			var k = e.key.toLowerCase();
			if (state === 'initials') { return initKey(e); }
			if (k === 'arrowup' || k === 'w') { input.up = true; input.mouse = null; }
			else if (k === 'arrowdown' || k === 's') { input.down = true; input.mouse = null; }
			else if (k === 'arrowleft' || k === 'a') { input.left = true; input.mouse = null; }
			else if (k === 'arrowright' || k === 'd') { input.right = true; input.mouse = null; }
			else if (k === 'b') { useBomb(); }
			else if (k === 'p' || k === 'escape') { togglePause(); }
			else if (k === ' ' || k === 'enter') { if (state === 'title') { startGame(); } else if (state === 'intro') { beginPlay(); } else if (state === 'playing') { useBomb(); } }
			if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].indexOf(k) !== -1) { e.preventDefault(); }
		});
		document.addEventListener('keyup', function (e) {
			var k = e.key.toLowerCase();
			if (k === 'arrowup' || k === 'w') { input.up = false; }
			else if (k === 'arrowdown' || k === 's') { input.down = false; }
			else if (k === 'arrowleft' || k === 'a') { input.left = false; }
			else if (k === 'arrowright' || k === 'd') { input.right = false; }
		});
	}
	function initKey(e) {
		var k = e.key;
		if (/^[a-zA-Z]$/.test(k)) { initSlots[initCursor] = k.toUpperCase(); if (initCursor < 2) { initCursor++; } renderInitials(); }
		else if (k === 'ArrowUp') { cycleSlot(initCursor, 1); }
		else if (k === 'ArrowDown') { cycleSlot(initCursor, -1); }
		else if (k === 'ArrowLeft') { initCursor = Math.max(0, initCursor - 1); renderInitials(); }
		else if (k === 'ArrowRight') { initCursor = Math.min(2, initCursor + 1); renderInitials(); }
		else if (k === 'Backspace') { initCursor = Math.max(0, initCursor - 1); renderInitials(); }
		else if (k === 'Enter') { submitInitials(); }
		e.preventDefault();
	}

	function bindButtons() {
		on('btnPlay', startGame); on('btnHow', function () { showScreen('screenHowto'); }); on('btnHowClose', showTitle);
		on('btnTitleLb', function () { showLeaderboard(null); });
		on('btnResume', togglePause); on('btnPauseMenu', showTitle);
		on('btnAgain', startGame); on('btnGoLb', function () { showLeaderboard(null); }); on('btnMenu', showTitle);
		on('btnInitEnter', submitInitials); on('btnLbAgain', startGame); on('btnLbMenu', showTitle);
		el.screenInitials.querySelectorAll('.slot').forEach(function (slot, i) {
			slot.querySelector('.slot__up').addEventListener('click', function () { cycleSlot(i, 1); });
			slot.querySelector('.slot__down').addEventListener('click', function () { cycleSlot(i, -1); });
			slot.addEventListener('click', function (e) { if (!e.target.closest('button')) { initCursor = i; renderInitials(); } });
		});
	}
	function on(id, fn) { var n = document.getElementById(id); if (n) { n.addEventListener('click', fn); } }

	if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', boot); }
	else { boot(); }
})();
