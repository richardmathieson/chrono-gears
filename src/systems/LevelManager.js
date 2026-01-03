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
      // LEVEL 1 - DESERT STRIKE! 🚁
      // ===========================================
      //
      //    [SOURCE]═════════════════════════[END]
      //                  |         |
      //              [WHEEL 0] [WHEEL 1]
      //                  |
      //              [WHEEL 2]
      //
      // 2x2 grid with bottom-right missing
      //
      {
        colorCount: 2, // Start with 2 colors

        // Top track configuration
        topTrack: {
          startX: -2,
          endX: 2,
          z: -1.5,
          wheelConnections: [0, 1] // Top two wheels
        },

        wheels: [
          { x: -1, z: 0, requiredColor: 'RED' },    // 0 - Top Left
          { x: 1, z: 0, requiredColor: 'BLUE' },    // 1 - Top Right
          { x: -1, z: 1, requiredColor: 'RED' }     // 2 - Bottom Left
        ],

        pipes: [
          // Horizontal: Wheel 0 → Wheel 1
          {
            startX: -1, startZ: 0,
            endX: 1, endZ: 0,
            startWheelIndex: 0,
            startDirection: RIGHT,
            endWheelIndex: 1,
            endDirection: LEFT
          },
          // Vertical: Wheel 0 → Wheel 2
          {
            startX: -1, startZ: 0,
            endX: -1, endZ: 1,
            startWheelIndex: 0,
            startDirection: BOTTOM,
            endWheelIndex: 2,
            endDirection: TOP
          }
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

