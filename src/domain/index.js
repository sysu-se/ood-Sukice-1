// src/domain/index.js

export function createSudoku(inputGrid) {
  let grid = JSON.parse(JSON.stringify(inputGrid));

  const self = {
    getGrid: () => grid,

    guess: ({ row, col, value }) => {
      grid[row][col] = value;
    },

    clone: () => createSudoku(grid),

    toJSON: () => ({ grid: JSON.parse(JSON.stringify(grid)) }),

    toString: () => grid.map(row => row.join(', ')).join('\n'),

    getInvalidCells: () => {
      const invalid = [];
      const addInvalid = (x, y) => {
        const xy = x + ',' + y;
        if (!invalid.includes(xy)) invalid.push(xy);
      };

      for (let y = 0; y < 9; y++) {
        for (let x = 0; x < 9; x++) {
          const value = grid[y][x];
          if (value === 0) continue;

          for (let i = 0; i < 9; i++) {
            if (i !== x && grid[y][i] === value) addInvalid(x, y);
            if (i !== y && grid[i][x] === value) addInvalid(x, y);
          }

          const startY = Math.floor(y / 3) * 3;
          const startX = Math.floor(x / 3) * 3;
          for (let r = startY; r < startY + 3; r++) {
            for (let c = startX; c < startX + 3; c++) {
              if (r !== y && c !== x && grid[r][c] === value) {
                addInvalid(x, y);
              }
            }
          }
        }
      }
      return invalid;
    },

    // ======== HW2 新增: 提示功能 (Hint) ========
    // 1. 获取某个格子的候选数集合
    getCandidates: (row, col) => {
      if (grid[row][col] !== 0) return [];
      const invalid = new Set();
      // 检查行列
      for (let i = 0; i < 9; i++) {
        if (grid[row][i] !== 0) invalid.add(grid[row][i]);
        if (grid[i][col] !== 0) invalid.add(grid[i][col]);
      }
      // 检查 3x3 宫格
      const startR = Math.floor(row / 3) * 3;
      const startC = Math.floor(col / 3) * 3;
      for (let r = startR; r < startR + 3; r++) {
        for (let c = startC; c < startC + 3; c++) {
          if (grid[r][c] !== 0) invalid.add(grid[r][c]);
        }
      }
      const cands = [];
      for (let v = 1; v <= 9; v++) {
        if (!invalid.has(v)) cands.push(v);
      }
      return cands;
    },

    // 2. 下一步推定数提示
    getNextHint: () => {
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          if (grid[r][c] === 0) {
            const cands = self.getCandidates(r, c);
            if (cands.length === 1) { // 唯一候选数
              return { row: r, col: c, value: cands[0] };
            }
          }
        }
      }
      return null; // 若没有必然的下一步，则需要使用 Explore 模式
    }
  };

  return self;
}

export function createSudokuFromJSON(json) {
  return createSudoku(json.grid);
}

export function createGame({ sudoku }) {
  let current = sudoku;
  let undoStack = [];
  let redoStack = [];

  // ======== HW2 新增: 探索模式 (Explore Mode) 的状态帧与回溯 ========
  let exploreStack = []; // 探索栈：支持树状嵌套探索，且每个探索层级都有独立的 Undo/Redo 
  let failedPaths = new Set(); // 记忆死胡同（路径哈希）

  // 获取当前处于活跃状态的会话层级（主线 或 某层探索分支）
  const getActiveState = () => {
    if (exploreStack.length > 0) return exploreStack[exploreStack.length - 1];
    return { current, undoStack, redoStack };
  };

  const setActiveCurrent = (newCurrent) => {
    if (exploreStack.length > 0) exploreStack[exploreStack.length - 1].current = newCurrent;
    else current = newCurrent;
  };

  return {
    getSudoku: () => getActiveState().current,

    guess: (move) => {
      const s = getActiveState();
      s.undoStack.push(s.current.clone()); // 自动推入当前层级的 undo 栈
      s.redoStack.length = 0; // 清空 redo 栈（保持引用）
      s.current.guess(move);
    },

    undo: () => {
      const s = getActiveState();
      if (s.undoStack.length > 0) {
        s.redoStack.push(s.current.clone());
        setActiveCurrent(s.undoStack.pop());
      }
    },

    redo: () => {
      const s = getActiveState();
      if (s.redoStack.length > 0) {
        s.undoStack.push(s.current.clone());
        setActiveCurrent(s.redoStack.pop());
      }
    },

    canUndo: () => getActiveState().undoStack.length > 0,
    canRedo: () => getActiveState().redoStack.length > 0,

    // ======== HW2 API: Explore Mode ========
    startExplore: () => {
      const s = getActiveState();
      exploreStack.push({
        current: s.current.clone(), // 深度拷贝进入新分支
        undoStack: [],              // 分支独立的撤销
        redoStack: []               // 分支独立的重做
      });
    },

    commitExplore: () => {
      if (exploreStack.length === 0) return;
      const committed = exploreStack.pop(); // 弹出探索栈
      const parent = getActiveState();      // 获取上层状态
      // 将整段探索结果作为上层的一次“原子操作”压入撤销历史
      parent.undoStack.push(parent.current.clone());
      parent.redoStack = [];
      
      if (exploreStack.length > 0) {
        exploreStack[exploreStack.length - 1].current = committed.current;
      } else {
        current = committed.current;
      }
    },

    cancelExplore: () => {
      if (exploreStack.length === 0) return;
      const cancelled = exploreStack.pop();
      // 记录失败路径，避免重复踩坑
      failedPaths.add(cancelled.current.toString());
    },

    isExploring: () => exploreStack.length > 0,
    getExploreDepth: () => exploreStack.length,
    isFailedPath: () => {
      const s = getActiveState();
      const hash = s.current.toString();
      // 如果当前棋局在黑名单中，或者棋盘已经出现了非法冲突，则判断为探索失败
      return failedPaths.has(hash) || s.current.getInvalidCells().length > 0;
    },

    toJSON: () => ({
      current: current.toJSON(),
      undoStack: undoStack.map(x => x.toJSON()),
      redoStack: redoStack.map(x => x.toJSON())
    })
  };
}

export function createGameFromJSON(json) {
  return createGame({ sudoku: createSudokuFromJSON(json.current) });
}