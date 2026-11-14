// Load three.js once and share it, so Globe.gl and our own stones/serpents use the same copy.
// index.html loads this file before Globe.gl.
import * as THREE from './lib/three/three.module.js';
window.THREE = THREE;
