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
  [
    [[1,1,1,1]],
    [[1],[1],[1],[1]]
  ],
  [
    [[2,2],[2,2]]
  ],
  [
    [[0,3,3],[3,3,0]],
    [[3,0],[3,3],[0,3]]
  ],
  [
    [[4,4,0],[0,4,4]],
    [[0,4],[4,4],[4,0]]
  ],
  [
    [[5,0],[5,0],[5,5]],
    [[0,0,5],[5,5,5]],
    [[5,5],[0,5],[0,5]],
    [[5,5,5],[5,0,0]]
  ],
  [
    [[0,6],[0,6],[6,6]],
    [[6,0,0],[6,6,6]],
    [[6,6],[6,0],[6,0]],
    [[6,6,6],[0,0,6]]
  ],
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