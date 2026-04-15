// client/js/game/constants/gameConstants.js — Game constants (SRP)

export const BOARD_CONFIG = {
  WIDTH: 10,
  HEIGHT: 20,
  CELL_SIZE: 24
};

export const COLORS = [
  null,
  '#00f0f0', // I cyan
  '#f0f000', // O yellow
  '#00f000', // S green
  '#0000f0', // Z blue
  '#f0a000', // L orange
  '#a000f0', // J purple
  '#f00000'  // T red
];

export const PIECES = [
  // Type 1 - I
  [
    [[1,1,1,1]],
    [[1],[1],[1],[1]]
  ],
  // Type 2 - O
  [
    [[2,2],[2,2]]
  ],
  // Type 3 - S
  [
    [[0,3,3],[3,3,0]],
    [[3,0],[3,3],[0,3]]
  ],
  // Type 4 - Z
  [
    [[4,4,0],[0,4,4]],
    [[0,4],[4,4],[4,0]]
  ],
  // Type 5 - L
  [
    [[5,0],[5,0],[5,5]],
    [[0,0,5],[5,5,5]],
    [[5,5],[0,5],[0,5]],
    [[5,5,5],[5,0,0]]
  ],
  // Type 6 - J
  [
    [[0,6],[0,6],[6,6]],
    [[6,0,0],[6,6,6]],
    [[6,6],[6,0],[6,0]],
    [[6,6,6],[0,0,6]]
  ],
  // Type 7 - T
  [
    [[0,7,0],[7,7,7]],
    [[7,0],[7,7],[7,0]],
    [[7,7,7],[0,7,0]],
    [[0,7],[7,7],[0,7]]
  ]
];

export const GAME_SPEED = {
  INITIAL_DROP_INTERVAL: 1000,
  MIN_DROP_INTERVAL: 50,
  ACCELERATION_PER_LINES: 30
};

export const SCORE_CONFIG = {
  LINE_BONUS: 100,
  LEVEL_BONUS: 50
};

