// Game Constants - STEAMPUNK GEARS EDITION ⚙️

// Colors - Vibrant gem colors (like the reference image!)
export const BALL_COLORS = {
  BLUE: 0x4da6ff,      // Bright blue gem
  RED: 0xff4d4d,       // Ruby red
  YELLOW: 0xffd700,    // Gold/amber
  GREEN: 0x4dff88,     // Emerald green
};

export const BALL_COLOR_NAMES = ['BLUE', 'RED', 'YELLOW', 'GREEN'];

// Wheel configuration
export const WHEEL_RADIUS = 2.0;   // Bigger gears!
export const WHEEL_SLOT_COUNT = 4;
export const BALL_RADIUS = 0.5;    // Gem-sized balls
export const SLOT_DISTANCE = 1.4;  // Slots near edge

// Grid configuration  
export const GRID_SPACING = 6;

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
export const BALL_SPEED = 5; // Speed on tracks
export const TOP_TRACK_SPEED = 4; // Speed on top track
export const AUTO_FLOW_INTERVAL = 2000; // Synchronized auto-release every 2 seconds!

// Game timing
export const TRACK_TIMER = 10; // Seconds before game over if ball doesn't drop!
export const SPAWN_DELAY = 400; // ms delay before next ball spawns

// Visual
export const PIPE_WIDTH = 0.6;

// Scene - STEAMPUNK! ⚙️
export const SCENE_BG_COLOR = 0x1a1510;   // Dark brown/bronze
export const FLOOR_COLOR = 0x2a2015;       // Darker bronze
export const GRID_LINE_COLOR = 0x3d3020;   // Bronze grid
export const ACCENT_COLOR = 0xd4a84b;      // Gold accent

// Steampunk palette
export const BRONZE_COLOR = 0xb87333;
export const COPPER_COLOR = 0xcd7f32;
export const GOLD_COLOR = 0xd4a84b;
export const DARK_METAL = 0x2a2520;

