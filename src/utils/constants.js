// Game Constants - DESERT STRIKE EDITION 🚁

// Colors - Desert military palette
export const BALL_COLORS = {
  BLUE: 0x3388ff,      // Bright blue
  RED: 0xff3333,       // Bright red
  YELLOW: 0xffdd33,    // Yellow
  GREEN: 0x33ff66,     // Green
};

export const BALL_COLOR_NAMES = ['BLUE', 'RED', 'YELLOW', 'GREEN'];

// Wheel configuration
export const WHEEL_RADIUS = 2.0;
export const WHEEL_SLOT_COUNT = 4;
export const BALL_RADIUS = 0.5;
export const SLOT_DISTANCE = 1.4;

// Grid configuration
export const GRID_SPACING = 8;  // Wider spacing for 2x2 grid

// Directions - for slot/pipe alignment
export const DIRECTIONS = {
  TOP: 0,    // -Z in world space (UP on screen)
  RIGHT: 1,  // +X
  BOTTOM: 2, // +Z (DOWN on screen)
  LEFT: 3    // -X
};

// Animation speeds
export const ROTATION_SPEED = Math.PI / 2;
export const ROTATION_DURATION = 150;
export const BALL_SPEED = 5;
export const TOP_TRACK_SPEED = 4;
export const AUTO_FLOW_INTERVAL = 2000; // Synchronized auto-release every 2 seconds!

// Game timing
export const TRACK_TIMER = 10;
export const SPAWN_DELAY = 400;

// Visual
export const PIPE_WIDTH = 0.6;

// DESERT STRIKE PALETTE! 🚁
export const DESERT_SAND = 0xd4a574;      // Sandy ground
export const DESERT_DARK = 0x8b7355;      // Dark sand
export const PIPE_GREEN = 0x2d5016;       // Military green pipes
export const METAL_GRAY = 0x707070;       // Metal structures
export const METAL_DARK = 0x404040;       // Dark metal
export const BUILDING_TAN = 0xc9b896;     // Desert building color

