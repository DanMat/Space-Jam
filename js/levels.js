/*
 * Space-Jam level definitions — pure data.
 *
 * Levels reference enemy type ids defined in game.js. `quota` is how many
 * enemies you must destroy before the level boss warps in; defeating the boss
 * clears the level. Difficulty ramps via scrollSpeed, spawnEvery and the enemy
 * mix. `formations` is the chance (0..1) that a spawn is a grouped formation.
 */
window.SPACEJAM_LEVELS = [
	{
		name: 'Orbit Patrol', tag: 'Clear the perimeter',
		theme: { a: '#0b1030', b: '#1b2a6b', nebula: '#3a4fae', star: '#9fb8ff' },
		scrollSpeed: 2.2, spawnEvery: 1.1, enemies: ['scout', 'scout', 'weaver'],
		formations: 0.15, quota: 16,
		boss: { name: 'Sentinel', hp: 60, color: '#6b8cff' }
	},
	{
		name: 'Asteroid Belt', tag: 'Weave through the swarm',
		theme: { a: '#1a1206', b: '#4a2f10', nebula: '#8a5a2a', star: '#ffd9a0' },
		scrollSpeed: 2.5, spawnEvery: 1.0, enemies: ['scout', 'weaver', 'diver'],
		formations: 0.22, quota: 18,
		boss: { name: 'Rockbreaker', hp: 80, color: '#ff9f43' }
	},
	{
		name: 'Nebula Drift', tag: 'Ghosts in the clouds',
		theme: { a: '#25062e', b: '#5a1a6b', nebula: '#a03ac0', star: '#f0b0ff' },
		scrollSpeed: 2.8, spawnEvery: 0.95, enemies: ['weaver', 'diver', 'turret'],
		formations: 0.28, quota: 20,
		boss: { name: 'Phantom', hp: 100, color: '#c400ff' }
	},
	{
		name: 'Ion Storm', tag: 'Static in the void',
		theme: { a: '#001a1a', b: '#054a52', nebula: '#12a0b0', star: '#a0f0ff' },
		scrollSpeed: 3.1, spawnEvery: 0.9, enemies: ['scout', 'diver', 'turret', 'kamikaze'],
		formations: 0.3, quota: 22,
		boss: { name: 'Tempest', hp: 120, color: '#12c0d0' }
	},
	{
		name: 'Derelict Fleet', tag: 'Salvage turns hostile',
		theme: { a: '#101418', b: '#2a3540', nebula: '#5a6f80', star: '#cfe0ec' },
		scrollSpeed: 3.3, spawnEvery: 0.85, enemies: ['weaver', 'turret', 'kamikaze', 'gunship'],
		formations: 0.32, quota: 24,
		boss: { name: 'Warden', hp: 150, color: '#8aa0b4' }
	},
	{
		name: 'Solar Flare', tag: 'Into the heat',
		theme: { a: '#2a0500', b: '#7a1e00', nebula: '#e0521a', star: '#ffd07a' },
		scrollSpeed: 3.6, spawnEvery: 0.8, enemies: ['diver', 'turret', 'kamikaze', 'gunship'],
		formations: 0.35, quota: 26,
		boss: { name: 'Helios', hp: 180, color: '#ff7043' }
	},
	{
		name: 'Frozen Expanse', tag: 'Cold precision',
		theme: { a: '#04121e', b: '#0a3a5a', nebula: '#2a90c0', star: '#d0f0ff' },
		scrollSpeed: 3.8, spawnEvery: 0.78, enemies: ['weaver', 'diver', 'gunship', 'kamikaze'],
		formations: 0.38, quota: 28,
		boss: { name: 'Glacier', hp: 210, color: '#90e0ef' }
	},
	{
		name: 'Void Gate', tag: 'Something watches back',
		theme: { a: '#0a0016', b: '#26064a', nebula: '#5a1ab0', star: '#c0a0ff' },
		scrollSpeed: 4.1, spawnEvery: 0.72, enemies: ['diver', 'turret', 'gunship', 'kamikaze'],
		formations: 0.4, quota: 30,
		boss: { name: 'Gatekeeper', hp: 250, color: '#7b2cff' }
	},
	{
		name: 'Hyperlane', tag: 'Full throttle',
		theme: { a: '#160a2a', b: '#3a1a6b', nebula: '#7b3ac0', star: '#e0c0ff' },
		scrollSpeed: 4.5, spawnEvery: 0.66, enemies: ['scout', 'diver', 'gunship', 'kamikaze', 'turret'],
		formations: 0.42, quota: 32,
		boss: { name: 'Overdrive', hp: 300, color: '#c400ff' }
	},
	{
		name: 'The Core', tag: 'End of the line',
		theme: { a: '#0a0e14', b: '#132030', nebula: '#1aa07a', star: '#a0ffd0' },
		scrollSpeed: 4.8, spawnEvery: 0.6, enemies: ['weaver', 'diver', 'turret', 'gunship', 'kamikaze'],
		formations: 0.45, quota: 36,
		boss: { name: 'Motherbrain', hp: 420, color: '#00ffa3' }
	}
];
