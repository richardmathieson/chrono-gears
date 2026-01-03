import { DIRECTIONS } from '../utils/constants.js';

// Direction constants for readability
const TOP = DIRECTIONS.TOP;       // 0
const RIGHT = DIRECTIONS.RIGHT;   // 1
const BOTTOM = DIRECTIONS.BOTTOM; // 2
const LEFT = DIRECTIONS.LEFT;     // 3

export class LevelManager {
  constructor() {
    this.levels = this.createLevels();
  }
  
  createLevels() {
    return [
      // ===========================================
      // LEVEL 1 - TOP TRACK DEMO 🛥️
      // ===========================================
      // 
      //    [SOURCE]═══════════════════════════[END]
      //                |           |           |
      //             [WHEEL 0]  [WHEEL 1]  [WHEEL 2]
      //                |           |           |
      //              [BIN]       [BIN]       [BIN]
      //
      // Balls travel along top track (left to right)
      // Drop into wheels when passing over empty slot
      // Player taps balls in wheels to eject down to bins
      //
      {
        colorCount: 2, // PINK and CYAN to start simple!
        
        // Top track configuration (NEW!)
        topTrack: {
          startX: -2.5,
          endX: 2.5,
          z: -1.5,  // Top of screen
          wheelConnections: [0, 1, 2] // Wheels connected to this track
        },
        
        wheels: [
          { x: -1.5, z: 0, requiredColor: 'PINK' },   // 0 - Left
          { x: 0, z: 0, requiredColor: 'CYAN' },      // 1 - Center
          { x: 1.5, z: 0, requiredColor: 'PINK' }     // 2 - Right
        ],
        
        pipes: [
          // Horizontal pipes connecting wheels (for auto-flow!)
          {
            startX: -1.5, startZ: 0,
            endX: 0, endZ: 0,
            startWheelIndex: 0,
            startDirection: RIGHT,
            endWheelIndex: 1,
            endDirection: LEFT
          },
          {
            startX: 0, startZ: 0,
            endX: 1.5, endZ: 0,
            startWheelIndex: 1,
            startDirection: RIGHT,
            endWheelIndex: 2,
            endDirection: LEFT
          },
          // Vertical pipes from wheels DOWN to bins
          {
            startX: -1.5, startZ: 0,
            endX: -1.5, endZ: 1.5,
            startWheelIndex: 0,
            startDirection: BOTTOM,
            endBinIndex: 0,
            endDirection: TOP
          },
          {
            startX: 0, startZ: 0,
            endX: 0, endZ: 1.5,
            startWheelIndex: 1,
            startDirection: BOTTOM,
            endBinIndex: 1,
            endDirection: TOP
          },
          {
            startX: 1.5, startZ: 0,
            endX: 1.5, endZ: 1.5,
            startWheelIndex: 2,
            startDirection: BOTTOM,
            endBinIndex: 2,
            endDirection: TOP
          }
        ],
        
        bins: [
          { x: -1.5, z: 1.5, direction: TOP, acceptedColors: 'ALL' },
          { x: 0, z: 1.5, direction: TOP, acceptedColors: 'ALL' },
          { x: 1.5, z: 1.5, direction: TOP, acceptedColors: 'ALL' }
        ]
      }
    ];
  }
  
  getLevel(levelNum) {
    const index = levelNum - 1;
    
    if (index < this.levels.length) {
      return this.levels[index];
    }
    
    return this.levels[this.levels.length - 1];
  }
}

