/**
 * @file gameSolver.ts (Ported from gameSolver.py)
 * @description Một bộ giải mê cung sử dụng thuật toán A* để tìm đường đi tối ưu, có xử lý các mục tiêu phụ.
 * Hiện tại hỗ trợ di chuyển cơ bản, nhận diện tường và tìm đến điểm kết thúc.
 * Có thể mở rộng để xử lý các đối tượng tương tác phức tạp hơn (công tắc, cổng dịch chuyển).
 */

// Định nghĩa các kiểu dữ liệu cần thiết cho solver
interface Position {
  x: number;
  y: number;
  z: number;
}

interface GameConfig {
  blocks: { position: Position, modelKey: string }[]; // THÊM: modelKey cho block
  players: { start: Position & { direction?: number } }[]; // THÊM: direction cho người chơi
  finish: Position;
  // THÊM: interactibles và collectibles để solver biết mục tiêu
  collectibles?: { position: Position; id: string; type: string }[];
  interactibles?: { position: Position; id: string; type: string; initialState?: 'on' | 'off' }[];
  // ĐÃ XÓA: solution không còn là một phần của GameConfig
}

interface Action {
  type: string; // Mở rộng để chấp nhận các loại action khác như 'maze_repeat'
  [key: string]: any; // Cho phép các thuộc tính khác như direction, times, actions
}

// THÊM: Định nghĩa cấu trúc cho Blockly Toolbox để dễ dàng xử lý
interface BlocklyToolbox {
  kind: 'categoryToolbox';
  contents: ({ kind: string; type?: string; custom?: string; contents?: any[] })[];
}

// SỬA LỖI: Mở rộng interface Solution để bao gồm tất cả các trường có thể có
// trong object solution của file JSON, không chỉ rawActions và structuredSolution.
interface Solution {
  type?: string;
  itemGoals?: Record<string, any>;
  optimalBlocks?: number;
  optimalLines?: number;
  rawActions: (string | Action)[]; // SỬA LỖI: Cho phép cả chuỗi và đối tượng Action
  structuredSolution: { main: Action[], procedures?: Record<string, any> };
  basicSolution?: { main: Action[]; procedures?: Record<string, any> }; // SỬA LỖI: Cho phép basicSolution có procedures
  // Giữ lại các trường khác có thể tồn tại
  [key: string]: any;
}

interface QuestBlocklyConfig {
  toolbox?: BlocklyToolbox | any; // SỬA LỖI: `toolbox` là tùy chọn để tương thích với augmented config
  [key: string]: any;
}

// --- START: LOGIC PORTED FROM PYTHON ---

/**
 * Đại diện cho một "bản chụp" của toàn bộ game tại một thời điểm.
 * Tương đương với lớp GameState trong Python.
 */
class GameState {
  position: Position; // Vị trí hiện tại
  direction: number;  // Hướng hiện tại (0: +X, 1: +Z, 2: -X, 3: -Z)
  collectedItems: Set<string>; // Các vật phẩm đã thu thập
  switchStates: Map<string, 'on' | 'off'>; // Trạng thái của các công tắc

  constructor(startPos: Position, startDir: number, world: GameWorld) {
    this.position = { ...startPos };
    this.direction = startDir;
    this.collectedItems = new Set();
    this.switchStates = new Map(Object.entries(world.initialSwitchStates));
  }

  clone(): GameState {
    // SỬA LỖI: Tạo một instance mới và sao chép các thuộc tính một cách thủ công
    // thay vì gọi lại constructor với dữ liệu không chính xác.
    // Điều này đảm bảo rằng trạng thái của `switchStates` và `collectedItems` được giữ lại chính xác.
    const newState = Object.create(Object.getPrototypeOf(this));
    newState.position = { ...this.position };
    newState.direction = this.direction;
    newState.collectedItems = new Set(this.collectedItems);
    newState.switchStates = new Map(this.switchStates);
    return newState;
  }

  getKey(): string {
    const items = Array.from(this.collectedItems).sort().join(',');
    const switches = Array.from(this.switchStates.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}:${v}`).join(',');
    return `${this.position.x},${this.position.y},${this.position.z},${this.direction}|i:${items}|s:${switches}`;
  }
}

// SỬA LỖI: Hoán đổi hướng Tới (+Z) và Lùi (-Z) để khớp với thực tế game.
// Quy ước đã sửa (theo chiều kim đồng hồ):
// 0: -Z (Lùi / Backward)
// 1: +X (Phải / Right)
// 2: +Z (Tới / Forward)
// 3: -X (Trái / Left)
const directions = [
  { x: 0, z: -1 }, // 0: -Z
  { x: 1, z: 0 },  // 1: +X
  { x: 0, z: 1 },  // 2: +Z
  { x: -1, z: 0 }, // 3: -X
];

/**
 * Nút chứa trạng thái và các thông tin chi phí cho thuật toán A*.
 * Tương đương lớp PathNode trong Python.
 */
class PathNode {
  state: GameState;
  parent: PathNode | null = null; // Sửa đổi: parent sẽ là một node vị trí, không phải hành động
  action: string | null = null;
  gCost: number = 0; // Chi phí từ điểm bắt đầu đến nút hiện tại
  hCost: number = 0; // Chi phí ước tính từ nút hiện tại đến đích (heuristic)

  constructor(state: GameState) {
    this.state = state;
  }

  // HÀM MỚI: Dùng để lưu trữ chuỗi hành động thô dẫn đến node này
  rawActionsToReach: string[] = [];

  // HÀM MỚI: Lấy key chỉ dựa trên vị trí, bỏ qua hướng và các trạng thái khác
  getPosKey = (): string => `${this.state.position.x},${this.state.position.y},${this.state.position.z}`;

  get fCost(): number {
    return this.gCost + this.hCost;
  }
}

/**
 * Mô hình hóa thế giới game để solver dễ truy vấn.
 * Tương đương lớp GameWorld trong Python.
 */
class GameWorld {
  walkableGrounds: Set<string> = new Set(['wall.brick01', 'wall.brick02', 'wall.brick03', 'wall.brick04', 'wall.brick05', 'wall.brick06', 'ground.checker', 'ground.earth', 'ground.earthChecker', 'ground.mud', 'ground.normal', 'ground.snow', 'stone.stone01', 'stone.stone02', 'stone.stone03', 'stone.stone04', 'stone.stone05', 'stone.stone06', 'stone.stone07', 'ice.ice01']);
  worldMap: Map<string, string> = new Map();
  collectiblesByPos: Map<string, { id: string, type: string }> = new Map();
  collectiblesById: Map<string, { position: Position, type: string }> = new Map();
  switchesByPos: Map<string, { id: string, initialState: 'on' | 'off' }> = new Map();
  initialSwitchStates: Record<string, 'on' | 'off'> = {}; // THÊM: Lưu trạng thái ban đầu của công tắc
  solutionConfig: Solution; // THAY ĐỔI: solutionConfig giờ là kiểu Solution
  finishPos: Position;

  constructor(gameConfig: GameConfig, solutionConfig: Solution) { // THAY ĐỔI: Nhận solutionConfig
    this.finishPos = gameConfig.finish;
    this.solutionConfig = solutionConfig; // THAY ĐỔI: Gán solutionConfig trực tiếp
    // SỬA LỖI: Lưu modelKey của block thay vì chỉ là chuỗi 'block'
    gameConfig.blocks.forEach(b => {
      const posKey = `${b.position.x},${b.position.y},${b.position.z}`;
      this.worldMap.set(posKey, b.modelKey);
    });
    (gameConfig.collectibles || []).forEach(c => {
      const posKey = `${c.position.x},${c.position.y},${c.position.z}`;
      this.collectiblesByPos.set(posKey, { id: c.id, type: c.type });
      this.collectiblesById.set(c.id, { position: c.position, type: c.type });
    });
    (gameConfig.interactibles || []).forEach(i => {
      if (i.type === 'switch') {
        const posKey = `${i.position.x},${i.position.y},${i.position.z}`;
        this.switchesByPos.set(posKey, { id: i.id, initialState: i.initialState || 'off' });
        this.initialSwitchStates[i.id] = i.initialState || 'off';
      }
    });
  }

  /**
   * HÀM MỚI: Kiểm tra xem một vị trí có nền đất đi được (walkable) ở bên dưới không.
   * @param pos Vị trí cần kiểm tra.
   * @returns `true` nếu có nền đi được, ngược lại `false`.
   */
  isWalkable(pos: Position): boolean {
    const groundModel = this.worldMap.get(`${pos.x},${pos.y},${pos.z}`);
    // SỬA ĐỔI: Không thể đi trên 'wall.stone01'
    return groundModel !== undefined 
        && groundModel !== 'wall.stone01' 
        && this.walkableGrounds.has(groundModel);
  }
}
// --- END: LOGIC PORTED FROM PYTHON ---

/**
 * HÀM MỚI: Chuyển đổi một mảng chuỗi rawActions thành một mảng đối tượng Action
 * để tương thích với hàm createStructuredSolution.
 * @param rawActions Mảng các chuỗi hành động thô.
 * @returns Một mảng các đối tượng Action.
 */
const convertRawToStructuredActions = (rawActions: (string | Action)[] | Action[]): Action[] => {
  // SỬA LỖI: Xử lý cả chuỗi và đối tượng trong mảng đầu vào để đảm bảo tính nhất quán.
  return (rawActions as (string | Action)[]).map((action) => {
    const actionObj = typeof action === 'string' ? { type: action } : action;

    switch (actionObj.type) {
      case 'moveForward':
        return { type: 'maze_moveForward' };
      case 'turnLeft':
      case 'maze_turnLeft': // Xử lý các biến thể
        return { type: 'maze_turn', direction: 'turnLeft' };
      case 'turnRight':
      case 'maze_turnRight': // Xử lý các biến thể
        return { type: 'maze_turn', direction: 'turnRight' };
      case 'collect':
        return { type: 'maze_collect' };
      case 'toggleSwitch':
        // SỬA LỖI: Chuẩn hóa 'toggleSwitch' thành 'maze_toggle_switch'
        return { type: 'maze_toggle_switch' };
      case 'jump':
        return { type: 'maze_jump' };
      default:
        // Giữ nguyên các khối đã có cấu trúc hoặc các khối chưa được xử lý
        return actionObj;
    }
  });
};

/**
 * HÀM NÂNG CẤP: Tối ưu hóa một chuỗi hành động thô thành một giải pháp có cấu trúc,
 * dựa trên các khối lệnh có sẵn trong toolbox.
 * @param actions Mảng các hành động thô.
 * @param blocklyConfig Cấu hình toolbox của thử thách.
 * @returns Một đối tượng structuredSolution được tối ưu hóa.
 */

/**
 * HÀM MỚI (PORTED FROM PYTHON): Tìm chuỗi con lặp lại không liền kề thường xuyên nhất.
 * Được sử dụng để xác định các ứng cử viên tốt nhất cho việc tạo hàm (procedure).
 * @param actions Chuỗi hành động cần phân tích.
 * @param minLen Độ dài tối thiểu của chuỗi.
 * @param maxLen Độ dài tối đa của chuỗi.
 * @returns Một tuple chứa chuỗi tốt nhất và số lần xuất hiện, hoặc null.
 */
function findMostFrequentSequence(
  actions: Action[],
  minLen: number = 3,
  maxLen: number = 10
): { sequence: Action[]; count: number } | null {
  const sequenceCounts = new Map<string, { sequence: Action[]; count: number }>();

  // Giới hạn maxLen để tránh quá tải
  const effectiveMaxLen = Math.min(maxLen, Math.floor(actions.length / 2));

  for (let length = minLen; length <= effectiveMaxLen; length++) {
    for (let i = 0; i <= actions.length - length; i++) {
      const sequence = actions.slice(i, i + length);
      const key = JSON.stringify(sequence);
      if (sequenceCounts.has(key)) {
        sequenceCounts.get(key)!.count++;
      } else {
        sequenceCounts.set(key, { sequence, count: 1 });
      }
    }
  }

  let bestSequence: Action[] | null = null;
  let maxSavings = 0;

  sequenceCounts.forEach(({ sequence, count }) => {
    if (count > 1) {
      // Lợi ích = (số khối tiết kiệm được) - (chi phí gọi hàm)
      // SỬA ĐỔI: Thêm một trọng số nhỏ cho độ dài của chuỗi.
      // Điều này giúp ưu tiên các chuỗi dài hơn và có ý nghĩa hơn khi "lợi ích" bằng nhau,
      // tránh việc tạo ra các hàm từ các chuỗi con quá nhỏ.
      const savings = (count - 1) * sequence.length - count + (sequence.length * 0.1);
      if (savings > maxSavings) { // Chỉ cần lớn hơn, không cần >=
        maxSavings = savings;
        bestSequence = sequence;
      }
    }
  });

  if (bestSequence) {
    const key = JSON.stringify(bestSequence);
    return { sequence: bestSequence, count: sequenceCounts.get(key)!.count };
  }

  return null;
}

/**
 * HÀM MỚI (PORTED FROM PYTHON): Tìm chuỗi con lặp lại liên tiếp dài nhất và mang lại "lợi ích" cao nhất.
 * Lợi ích được tính bằng số khối lệnh tiết kiệm được.
 */
function findLongestRepeatingSequence(actions: Action[]): { sequence: Action[] | null, repeats: number, length: number, startIndex: number, savings: number } {
    const n = actions.length;
    let bestSeq: Action[] | null = null;
    let bestRepeats = 0;
    let bestLen = 0;
    let bestStartIndex = -1;
    let maxSavings = 0;

    for (let length = 1; length <= Math.floor(n / 2); length++) {
        for (let i = 0; i <= n - length; i++) {
            let repeats = 1;
            while (i + (repeats + 1) * length <= n) {
                const currentSegment = actions.slice(i, i + length);
                const nextSegment = actions.slice(i + repeats * length, i + (repeats + 1) * length);
                if (JSON.stringify(currentSegment) === JSON.stringify(nextSegment)) {
                    repeats++;
                } else {
                    break;
                }
            }

            if (repeats > 1) {
                // Lợi ích = (số khối ban đầu) - (số khối trong thân vòng lặp + 1 khối repeat)
                const savings = (repeats * length) - (length + 1);
                if (savings > maxSavings) {
                    maxSavings = savings;
                    bestSeq = actions.slice(i, i + length);
                    bestRepeats = repeats;
                    bestLen = length;
                    bestStartIndex = i;
                }
            }
        }
    }
    return { sequence: bestSeq, repeats: bestRepeats, length: bestLen, startIndex: bestStartIndex, savings: maxSavings };
}

/**
 * HÀM MỚI (PORTED FROM PYTHON): Phân tích một số thành các thừa số nguyên.
 * Dùng để quyết định có nên tạo vòng lặp lồng nhau hay không.
 */
function findFactors(n: number): [number, number] | null {
    if (n < 4) return null;
    const factors: [number, number][] = [];
    for (let i = 2; i <= Math.sqrt(n); i++) {
        if (n % i === 0) {
            factors.push([n / i, i]);
        }
    }
    if (factors.length === 0) return null;
    // Ưu tiên các thừa số gần nhau nhất (ví dụ: 16 -> 4x4 thay vì 8x2)
    factors.sort((a, b) => Math.abs(a[0] - a[1]) - Math.abs(b[0] - b[1]));
    return factors[0];
}

/**
 * HÀM MỚI: Tối ưu hóa chỉ bằng vòng lặp.
 */
const optimizeWithLoops = (
  actions: Action[],
  availableBlocks: Set<string>,
  solutionConfig: Solution
): { main: Action[]; procedures?: Record<string, Action[]> } => {
  // SỬA LỖI: Nếu không có khối lệnh vòng lặp nào trong toolbox,
  // không thực hiện tối ưu hóa bằng vòng lặp và trả về hành động gốc.
  if (!availableBlocks.has('maze_repeat') && !availableBlocks.has('maze_for')) {
    return { main: actions, procedures: {} };
  }

  const loopStructureConfig = solutionConfig.loop_structure || 'auto';

  // Hàm đệ quy nội bộ để xử lý tối ưu hóa
  const optimizeRecursively = (currentActions: Action[]): Action[] => {
    // Đệ quy vào bên trong các khối lặp hiện có trước (tối ưu từ trong ra ngoài)
    let optimizedInnerActions = currentActions.map(action => {
      if ((action.type === 'maze_repeat' || action.type === 'maze_for') && Array.isArray(action.actions)) {
        return { ...action, actions: optimizeRecursively(action.actions) };
      }
      return action;
    });

    // Bây giờ, tìm chuỗi lặp lại ở cấp độ hiện tại
    const { sequence, repeats, length, startIndex, savings } = findLongestRepeatingSequence(optimizedInnerActions);

    if (sequence && savings > 0) {
      const beforeLoop = optimizedInnerActions.slice(0, startIndex);
      const afterLoop = optimizedInnerActions.slice(startIndex + repeats * length);
      
      // Tối ưu hóa phần thân của vòng lặp mới một lần nữa
      const loopBody = optimizeRecursively(sequence);

      // TỐI ƯU HÓA: Luôn tạo một vòng lặp duy nhất để có giải pháp tối ưu nhất về số khối lệnh.
      const loopType = availableBlocks.has('maze_for') ? 'maze_for' : 'maze_repeat';
      const loopBlock: Action = { type: loopType, times: repeats, actions: loopBody };

      // Sau khi thay thế, gọi lại đệ quy trên toàn bộ chuỗi để tìm thêm cơ hội
      return optimizeRecursively([...beforeLoop, loopBlock, ...afterLoop]);
    }

    // Nếu không còn gì để tối ưu hóa ở cấp này, trả về chuỗi hành động đã tối ưu hóa bên trong
    return optimizedInnerActions;
  };

  const finalActions = optimizeRecursively(actions);
  return { main: finalActions };
};

/**
 * HÀM MỚI: Tối ưu hóa bằng vòng lặp có điều kiện (while/until).
 * Hàm này tìm kiếm các chuỗi hành động đơn giản lặp lại cho đến khi gặp một điều kiện kết thúc.
 * Ví dụ: đi thẳng cho đến khi đến đích.
 */
const optimizeWithWhileLoops = (
  actions: Action[],
  availableBlocks: Set<string>,
  world: GameWorld // Cần world để kiểm tra điều kiện
): Action[] => {
  // SỬA LỖI: Kiểm tra cả 'maze_repeat_until' (dùng trong engine) và 'controls_whileUntil' (dùng trong toolbox)
  // THÊM MỚI: Kiểm tra cả khối `maze_forever`
  const hasWhileBlock = availableBlocks.has('maze_repeat_until') || availableBlocks.has('controls_whileUntil') || availableBlocks.has('maze_forever');
  if (!hasWhileBlock) {
    return actions;
  }

  // --- SỬA LỖI LOGIC ---
  // Chỉ áp dụng tối ưu hóa `while` cho các trường hợp cực kỳ đơn giản:
  // toàn bộ đường đi chỉ bao gồm các hành động 'moveForward'.
  const containsOtherActions = actions.some(action => action.type !== 'maze_moveForward');
  if (containsOtherActions) {
    return actions; // Nếu có hành động khác, không tối ưu hóa bằng while, để các chiến lược khác xử lý.
  }

  let optimizedActions: Action[] = [];
  let i = 0;
  while (i < actions.length) {
    const action = actions[i];

    // Chỉ xem xét tối ưu hóa cho hành động 'moveForward'
    if (action.type !== 'maze_moveForward') {
      optimizedActions.push(action);
      i++;
      continue;
    }

    // Tìm một chuỗi các hành động 'moveForward' liên tiếp
    let sequenceEnd = i;
    while (sequenceEnd < actions.length && actions[sequenceEnd].type === 'maze_moveForward') {
      sequenceEnd++;
    }

    const sequenceLength = sequenceEnd - i;

    // Nếu chuỗi đủ dài (ví dụ: > 2) và kết thúc ở đích, chúng ta có thể dùng 'repeat_until'
    // Đây là một logic đơn giản, có thể mở rộng để xử lý các điều kiện khác (e.g., until wall)
    if (sequenceLength > 2) {
       // Giả định rằng chuỗi moveForward này dẫn đến đích.
       // ƯU TIÊN: Nếu có khối `maze_forever`, hãy sử dụng nó vì nó tối ưu hơn (tiết kiệm 1 khối).
       if (availableBlocks.has('maze_forever')) {
         optimizedActions.push({
           type: 'maze_forever',
           actions: [{ type: 'maze_moveForward' }]
         });
       } else {
         // Fallback: Nếu không, sử dụng khối `controls_whileUntil` như cũ.
         optimizedActions.push({
           type: 'maze_repeat_until',
           condition: 'at_finish',
           actions: [{ type: 'maze_moveForward' }]
         });
       }
       i = sequenceEnd; // Bỏ qua tất cả các hành động đã được thay thế
    } else {
      optimizedActions.push(action);
      i++;
    }
  }
  return optimizedActions;
};

/**
 * HÀM MỚI: Tối ưu hóa bằng vòng lặp có điều kiện và các hành động bên trong.
 * Đây là chiến lược dành cho các bản đồ đường thẳng có itemGoals xen kẽ.
 * Ví dụ: move, move, collect, move, move -> while(true) { move; if(item) collect; }
 */
const optimizeWithConditionalWhile = (
  actions: Action[],
  availableBlocks: Set<string>,
  solutionConfig: Solution
): { main: Action[]; procedures?: Record<string, Action[]> } | null => {
  const hasWhile = availableBlocks.has('maze_forever') || availableBlocks.has('controls_whileUntil');
  const hasIf = availableBlocks.has('controls_if');

  if (!hasWhile || !hasIf) {
    return null; // Không đủ khối lệnh để áp dụng chiến lược này.
  }

  // Kiểm tra xem đường đi có phù hợp không: chỉ chứa moveForward và các hành động itemGoal.
  const allowedActionTypes = new Set(['maze_moveForward', 'maze_collect', 'maze_toggle_switch']);
  const containsOnlyAllowedActions = actions.every(action => allowedActionTypes.has(action.type));
  const containsMove = actions.some(action => action.type === 'maze_moveForward');

  if (!containsOnlyAllowedActions || !containsMove) {
    return null; // Không phải là mẫu đường thẳng có ngắt quãng.
  }

  // Tạo các khối `if` cho các hành động phụ có thể xảy ra.
  const conditionalActions: Action[] = [];
  const itemGoals = solutionConfig.itemGoals || {};

  for (const goalType in itemGoals) {
    if (goalType === 'switch' && actions.some(a => a.type === 'maze_toggle_switch')) {
      conditionalActions.push({
        type: 'controls_if',
        condition: { type: 'maze_is_switch_state', state: 'off' },
        if_actions: [{ type: 'maze_toggle_switch' }]
      });
    } else if (goalType !== 'switch' && actions.some(a => a.type === 'maze_collect')) {
      conditionalActions.push({
        type: 'controls_if',
        condition: { type: 'maze_is_item_present', item_type: goalType },
        if_actions: [{ type: 'maze_collect' }]
      });
    }
  }

  const loopBlock: Action = { type: 'maze_forever', actions: [{ type: 'maze_moveForward' }, ...conditionalActions] };
  return { main: [loopBlock], procedures: {} };
};

/**
 * HÀM MỚI: Tối ưu hóa chỉ bằng hàm (procedure).
 */
const optimizeWithFunctions = (
  initialActions: Action[],
  availableBlocks: Set<string>,
  solutionConfig: Solution
): { main: Action[]; procedures?: Record<string, Action[]> } => {
  // SỬA LỖI: Nếu toolbox không cho phép tạo hàm (PROCEDURE),
  // không thực hiện tối ưu hóa bằng hàm và trả về hành động gốc.
  if (!availableBlocks.has('PROCEDURE')) {
    return { main: initialActions, procedures: {} };
  }

  let currentActions = [...initialActions];
  const procedures: Record<string, Action[]> = {};
  let procedureCount = 0;

  if (availableBlocks.has('PROCEDURE')) {
    let changed = true;
    while (changed) {
      changed = false;
      const result = findMostFrequentSequence(currentActions);
      if (result) {
        const { sequence } = result;
        procedureCount++;
        const procName = `PROCEDURE_${procedureCount}`;
        
        // SỬA LỖI: Chỉ tối ưu hóa phần thân của hàm bằng vòng lặp.
        // Không gọi lại createStructuredSolution để tránh đệ quy vô hạn và logic phức tạp.
        procedures[procName] = optimizeWithLoops(sequence, availableBlocks, solutionConfig).main;
        
        const callBlock: Action = { type: 'CALL', name: procName };
        const newActions: Action[] = [];
        let i = 0;
        while (i < currentActions.length) {
          if (i <= currentActions.length - sequence.length && JSON.stringify(currentActions.slice(i, i + sequence.length)) === JSON.stringify(sequence)) {
            newActions.push(callBlock);
            i += sequence.length;
          } else {
            newActions.push(currentActions[i]);
            i++;
          }
        }
        currentActions = newActions;
        changed = true;
      }
    }
  }
  return { main: currentActions, procedures };
};

/**
 * HÀM MỚI: Tối ưu hóa bằng cách sử dụng biến và vòng lặp for.
 * Hàm này tìm kiếm các mẫu cấp số cộng, ví dụ: đi 2, rẽ, đi 3, rẽ, đi 4, rẽ...
 * và chuyển đổi chúng thành một vòng lặp for với một biến đếm.
 */
const optimizeWithVariablesAndLoops = (
  actions: Action[],
  availableBlocks: Set<string>
): { main: Action[]; procedures?: Record<string, any> } | null => {
  // 1. Kiểm tra xem các khối cần thiết có sẵn không
  const hasVarBlocks = availableBlocks.has('variables_set') && availableBlocks.has('math_change');
  const hasLoopVarBlock = availableBlocks.has('maze_repeat_variable'); // Khối lặp với biến
  const hasForLoop = availableBlocks.has('maze_repeat'); // Vòng lặp for cơ bản

  if (!hasVarBlocks || !hasLoopVarBlock || !hasForLoop) {
    return null; // Không thể áp dụng chiến lược này
  }

  // 2. Nén chuỗi hành động: ['f', 'f', 'r'] -> [{type: 'f', count: 2}, {type: 'r', count: 1}]
  // SỬA LỖI GỐC: Lưu trữ toàn bộ đối tượng action thay vì chỉ `type` để không làm mất `direction`.
  const groupedActions: { action: Action; count: number }[] = [];
  if (actions.length === 0) return null;

  let currentActionKey = JSON.stringify(actions[0]);
  let currentCount = 0;
  for (const action of actions) {
    const actionKey = JSON.stringify(action);
    if (actionKey === currentActionKey) {
      currentCount++;
    } else {
      groupedActions.push({ action: JSON.parse(currentActionKey), count: currentCount });
      currentActionKey = actionKey;
      currentCount = 1;
    }
  }
  groupedActions.push({ action: JSON.parse(currentActionKey), count: currentCount });

  // 3. Tìm kiếm mẫu cấp số cộng
  // Chúng ta tìm một "đoạn mã" (chunk) lặp lại, trong đó một hành động có số lần lặp tăng dần.
  for (let chunkSize = 1; chunkSize <= Math.floor(groupedActions.length / 2); chunkSize++) {
    for (let i = 0; i <= groupedActions.length - chunkSize * 2; i++) {
      const chunk1 = groupedActions.slice(i, i + chunkSize);
      const chunk2 = groupedActions.slice(i + chunkSize, i + chunkSize * 2);

      // So sánh cấu trúc của 2 đoạn (không tính số lượng)
      // SỬA LỖI: Chỉ so sánh `action.type` và `action.direction` để bỏ qua các khác biệt về số lần lặp.
      // Điều này cho phép nhận diện các mẫu phức tạp hơn.
      const structure1 = chunk1.map(a => JSON.stringify(a.action));
      const structure2 = chunk2.map(a => JSON.stringify(a.action));
      if (JSON.stringify(structure1) !== JSON.stringify(structure2)) continue;

      // Tìm vị trí của hành động có số lần lặp thay đổi
      // SỬA LỖI & NÂNG CẤP: Tìm tất cả các chỉ số có sự thay đổi, không chỉ một.
      const diffIndices: number[] = [];
      for (let k = 0; k < chunkSize; k++) {
        if (chunk1[k].count !== chunk2[k].count) {
          diffIndices.push(k);
        }
      }

      // Nếu tìm thấy ít nhất một hành động có số lần lặp thay đổi
      if (diffIndices.length > 0) {
        // Tính toán công sai cho tất cả các chuỗi thay đổi
        const differences = diffIndices.map(k => ({
          initialValue: chunk1[k].count,
          commonDifference: chunk2[k].count - chunk1[k].count
        }));

        // Xác định xem quy luật này kéo dài bao lâu
        let repeats = 2;
        while (i + (repeats + 1) * chunkSize <= groupedActions.length) {
          const nextChunk = groupedActions.slice(i + repeats * chunkSize, i + (repeats + 1) * chunkSize);

          // SỬA LỖI: Kiểm tra xem tất cả các hành động thay đổi có tuân theo quy luật không.
          let patternHolds = true;
          for (let k = 0; k < chunkSize; k++) {
            if (chunk1[k].count !== chunk2[k].count) { // Nếu đây là một hành động thay đổi
              if (nextChunk[k].count !== chunk1[k].count + repeats * (chunk2[k].count - chunk1[k].count)) {
                patternHolds = false;
                break;
              }
            }
          }
          if (JSON.stringify(nextChunk.map(a => JSON.stringify(a.action))) === JSON.stringify(structure1) && patternHolds) {
            repeats++;
          } else {
            break;
          }
        }

        // Nếu quy luật đủ dài để tối ưu hóa
        // SỬA LỖI: Tính toán lại tổng số hành động gốc và tổng số khối gốc
        // để có thể so sánh chi phí một cách chính xác.
        let totalOriginalActions = 0;
        let totalOriginalGroupedBlocks = 0;
        for (let r = 0; r < repeats; r++) {
          const currentChunk = groupedActions.slice(i + r * chunkSize, i + (r + 1) * chunkSize);
          totalOriginalGroupedBlocks += currentChunk.length;
          for (const group of currentChunk) {
            totalOriginalActions += group.count;
          }
        }
        const newBlocksCost = (diffIndices.length * 2) + 1 + chunkSize; // set, change cho mỗi biến + 1 vòng lặp for + body
        if (repeats > 1 && totalOriginalGroupedBlocks > newBlocksCost) {
          console.log(`Solver: Phát hiện quy luật đa biến số! Lặp ${repeats} lần.`);

          // SỬA LỖI: Khai báo mảng `finalSolution` trước khi sử dụng.
          const finalSolution: Action[] = [];

          const varName = 'i';

          // SỬA LỖI: Tính toán lại tổng số hành động gốc trong mẫu đã phát hiện
          // để có thể cắt mảng `actions` một cách chính xác.

          // Tạo phần thân của vòng lặp for
          const loopBody: Action[] = [];
          diffIndices.forEach((k, index) => {
            const varName = `i_${index}`;
            finalSolution.push({
              type: 'variables_set',
              variable: varName,
              value: { type: 'math_number', value: differences[index].initialValue }
            });
          });

          chunk1.forEach((group, k) => {
            const diffIndex = diffIndices.indexOf(k);
            if (diffIndex !== -1) { // Hành động này dùng biến
              const varName = `i_${diffIndex}`;
              loopBody.push({ type: 'maze_repeat', times: { type: 'variables_get', variable: varName }, actions: [group.action] });
            } else { // Hành động này không đổi
              for (let c = 0; c < group.count; c++) loopBody.push(group.action);
            }
          });

          // Thêm các khối thay đổi giá trị cho tất cả các biến vào cuối thân vòng lặp
          diffIndices.forEach((k, index) => {
            loopBody.push({
              type: 'math_change',
              variable: `i_${index}`,
              value: { type: 'math_number', value: differences[index].commonDifference }
            });
          });

          // SỬA LỖI: Khai báo `beforePattern` và `afterPattern`.
          // Tính toán chỉ số bắt đầu của mẫu trong mảng `actions` gốc.
          let startActionIndex = 0;
          for (let j = 0; j < i; j++) {
            startActionIndex += groupedActions[j].count;
          }
          const beforePattern = actions.slice(0, startActionIndex);
          const afterPattern = actions.slice(startActionIndex + totalOriginalActions);
          
          // Thêm khối lặp chính vào sau các khối gán biến
          finalSolution.push({
            type: 'maze_repeat',
            times: repeats,
            actions: loopBody
          });
          return { main: [...beforePattern, ...finalSolution, ...afterPattern], procedures: {} };
        }
      }
    }
  }
  return null; // Không tìm thấy quy luật phù hợp
};

const createStructuredSolution = (
  initialActions: Action[],
  availableBlocks: Set<string>, // THAY ĐỔI: Chỉ cần truyền vào các khối lệnh có sẵn
  solutionConfig: Solution, // THÊM: solutionConfig để đọc các gợi ý tối ưu hóa
  world: GameWorld // THÊM: world để kiểm tra điều kiện cho các vòng lặp phức tạp
): { main: Action[]; procedures?: Record<string, Action[]> } => {

  const strategies: { name: string; solution: { main: Action[]; procedures?: Record<string, Action[]> } }[] = [];

  // --- SỬA LỖI: Không nên áp dụng while loop trước cho mọi trường hợp ---
  // Giữ lại chuỗi hành động ban đầu để các chiến lược khác có thể xử lý.
  const originalActions = [...initialActions];

  // BƯỚC 0 (MỚI): Thử chiến lược với biến số trước tiên, vì nó có khả năng tối ưu hóa cao nhất
  const varSolution = optimizeWithVariablesAndLoops(originalActions, availableBlocks);
  if (varSolution) {
    // SỬA LỖI: Sau khi áp dụng tối ưu hóa biến, tiếp tục tối ưu hóa các phần còn lại
    // (ví dụ: các đoạn moveForward lặp lại) bằng vòng lặp đơn giản.
    const furtherOptimizedMain = optimizeWithLoops(varSolution.main, availableBlocks, solutionConfig).main;
    varSolution.main = furtherOptimizedMain;

    strategies.push({ name: 'variable_loop', solution: varSolution });
  }

  // BƯỚC 1: Áp dụng các chiến lược tối ưu hóa khác nhau
  // Chiến lược 0 (MỚI): Thử tối ưu hóa bằng `while` có điều kiện.
  const conditionalWhileSolution = optimizeWithConditionalWhile(originalActions, availableBlocks, solutionConfig);
  if (conditionalWhileSolution) {
    strategies.push({ name: 'conditional_while', solution: conditionalWhileSolution });
  }

  // Tối ưu hóa bằng while đơn giản (chỉ đi thẳng)
  const simpleWhileActions = optimizeWithWhileLoops(originalActions, availableBlocks, world);

  // Chiến lược 1: Chỉ tối ưu hóa bằng vòng lặp 'for' (nếu được phép)
  const loopOnlySolution = optimizeWithLoops(simpleWhileActions, availableBlocks, solutionConfig);
  strategies.push({ name: 'loop_only', solution: loopOnlySolution });

  // Chiến lược 2: Chỉ tối ưu hóa bằng hàm (nếu được phép)
  const funcOnlySolution = optimizeWithFunctions(originalActions, availableBlocks, solutionConfig);
  strategies.push({ name: 'func_only', solution: funcOnlySolution });

  // Chiến lược 3: Tối ưu hóa hàm trước, sau đó tối ưu hóa vòng lặp trên KẾT QUẢ
  const mainAfterFuncs = funcOnlySolution.main;
  const loopsAfterFuncs = optimizeWithLoops(mainAfterFuncs, availableBlocks, solutionConfig);
  strategies.push({ name: 'func_then_loop', solution: { main: loopsAfterFuncs.main, procedures: funcOnlySolution.procedures } });

  // Nếu không có chiến lược nào hoạt động, trả về giải pháp gốc
  if (strategies.length === 0) {
    return { main: originalActions, procedures: {} };
  }

  // Tính toán chi phí cho mỗi chiến lược và chọn ra cái tốt nhất
  let bestSolution = strategies[0].solution;
  let minCost = calculateTotalBlocksInSolution(bestSolution);

  for (let i = 1; i < strategies.length; i++) {
    const cost = calculateTotalBlocksInSolution(strategies[i].solution);
    if (cost < minCost) {
      minCost = cost;
      bestSolution = strategies[i].solution;
    }
  }

  // Chuyển đổi các khối 'CALL' tạm thời thành khối 'procedures_callnoreturn' chuẩn
  const finalMain = bestSolution.main.map(action => {
    if (action.type === 'CALL' && action.name) {
      return {
        type: 'procedures_callnoreturn',
        mutation: {
          name: action.name // Tên hàm sẽ được hiển thị trên khối
        }
      };
    }
    return action;
  });

  // Trả về kết quả cuối cùng
  return { main: finalMain, procedures: bestSolution.procedures && Object.keys(bestSolution.procedures).length > 0 ? bestSolution.procedures : undefined };
};

/**
 * HÀM MỚI: Đếm tổng số khối lệnh trong một structuredSolution.
 * Hàm này sẽ đệ quy vào các khối 'maze_repeat' để đếm các khối bên trong.
 * @param actions Mảng các hành động từ structuredSolution.main.
 * @returns Tổng số khối lệnh.
 */
const countBlocksInStructure = (actions: Action[]): number => {
  let count = 0;
  for (const action of actions) {
    count++; // Mỗi action ở cấp hiện tại được tính là 1 khối.

    // SỬA LỖI: Đệ quy vào TẤT CẢ các loại khối có cấu trúc
    if (Array.isArray(action.actions)) {
      count += countBlocksInStructure(action.actions);
    }

    // Xử lý khối if/else if/else
    if (action.type === 'controls_if') {
      // Đếm khối điều kiện
      if (action.condition) {
        count++;
      }
      if (Array.isArray(action.if_actions)) {
        count += countBlocksInStructure(action.if_actions);
      }
      (action.else_if_actions || []).forEach((elseIf: any) => {
        count++; // Đếm khối else if
        if (elseIf.condition) count++; // Đếm khối điều kiện của else if
        if (Array.isArray(elseIf.actions)) count += countBlocksInStructure(elseIf.actions);
      });
      if (Array.isArray(action.else_actions)) {
        count += countBlocksInStructure(action.else_actions);
      }
    }
  }
  return count;
};

/**
 * HÀM MỚI: Đếm tổng số khối lệnh trong toàn bộ structuredSolution, bao gồm cả chương trình chính và các hàm.
 * Tương đương với hàm `count_blocks` trong Python.
 * @param structuredSolution Đối tượng structuredSolution chứa main và procedures.
 * @returns Tổng số khối lệnh.
 */
const calculateTotalBlocksInSolution = (structuredSolution: { main: Action[], procedures?: Record<string, Action[]> }): number => {
  let total = 0;

  // Đếm khối "On start" cho chương trình chính
  total += 1;
  total += countBlocksInStructure(structuredSolution.main);

  // Đếm các khối trong các hàm đã định nghĩa
  if (structuredSolution.procedures) {
    for (const procName in structuredSolution.procedures) {
      total += 1; // Đếm khối "DEFINE PROCEDURE"
      total += countBlocksInStructure(structuredSolution.procedures[procName]);
    }
  }
  return total;
};

/**
 * [REWRITTEN] Tính toán số dòng code logic (LLOC) từ structuredSolution.
 * Logic này mô phỏng lại cách tính của `calculate_optimal_lines_from_structured` trong Python.
 * @param structuredSolution Đối tượng structuredSolution chứa main và procedures.
 * @returns Tổng số dòng code.
 */
const calculateOptimalLines = (structuredSolution: { main: Action[], procedures?: Record<string, Action[]> }): number => {
  const _countLinesRecursively = (blockList: Action[], declaredVars: Set<string>): number => {
    let lloc = 0;
    if (!blockList) return 0;

    for (const block of blockList) {
      const blockType = block.type;
      if (blockType === "variables_set") {
        const varName = block.variable;
        if (varName && !declaredVars.has(varName)) {
          lloc++; // Đếm dòng 'var x;'
          declaredVars.add(varName);
        }
        lloc++; // Đếm dòng 'x = ...;'
      } else if (blockType === 'maze_repeat' || blockType === 'maze_for' || blockType === 'maze_forever' || blockType === 'maze_repeat_until') {
        lloc++; // Đếm dòng 'for (...) {'
        lloc += _countLinesRecursively(block.actions || block.body, declaredVars);
      } else if (blockType === 'controls_if') {
        // THÊM MỚI: Xử lý đếm dòng cho khối if/else
        lloc++; // Đếm dòng 'if (...) {'
        if (block.if_actions) {
            lloc += _countLinesRecursively(block.if_actions, declaredVars);
        }
        if (block.else_if_actions) {
            block.else_if_actions.forEach((elseIfBlock: any) => {
                lloc++; // Đếm dòng 'else if (...) {'
                lloc += _countLinesRecursively(elseIfBlock.actions || [], declaredVars);
            });
        }
        if (block.else_actions) {
            lloc++; // Đếm dòng 'else {'
            lloc += _countLinesRecursively(block.else_actions || [], declaredVars);
        }
      } else if (blockType) { // Các khối khác (move, turn, call, collect...)
        lloc++;
      }
    }
    return lloc;
  };

  let totalLloc = 0;
  const declaredVariables = new Set<string>();

  if (structuredSolution.procedures) {
    for (const procName in structuredSolution.procedures) {
      totalLloc++; // Đếm dòng 'function procName() {'
      totalLloc += _countLinesRecursively(structuredSolution.procedures[procName], declaredVariables);
    }
  }

  totalLloc += _countLinesRecursively(structuredSolution.main, declaredVariables);

  return totalLloc;
};

/**
 * Tìm lời giải cho một cấu hình game mê cung.
 * @param gameConfig Đối tượng cấu hình game.
 * @returns Một đối tượng Solution chứa lời giải, hoặc null nếu không tìm thấy.
 * @param blocklyConfig Cấu hình toolbox của thử thách.
 * @param solutionConfig Đối tượng cấu hình solution (chứa itemGoals).
 */
export const solveMaze = (gameConfig: GameConfig, solutionConfig: Solution, blocklyConfig?: QuestBlocklyConfig): Solution | null => { // THAY ĐỔI: Thêm blocklyConfig
  return aStarPathSolver(gameConfig, solutionConfig, blocklyConfig);
};

/** TÁI CẤU TRÚC: Thuật toán A* mới, tìm đường đi theo VỊ TRÍ thay vì HÀNH ĐỘNG */
const aStarPathSolver = (gameConfig: GameConfig, solutionConfig: Solution, blocklyConfig?: QuestBlocklyConfig): Solution | null => { // THAY ĐỔI: Thêm blocklyConfig
    if (!gameConfig.players?.[0]?.start || !gameConfig.finish) {
        console.error("Solver: Thiếu điểm bắt đầu hoặc kết thúc.");
        return null;
    }

    // BƯỚC 1: Phân tích toolbox để lấy các khối lệnh có sẵn ngay từ đầu.
    const availableBlocks = new Set<string>();
    // SỬA LỖI: Củng cố logic để xử lý các cấu trúc blocklyConfig khác nhau.
    // `augmented_config` có thể lồng `toolbox` trong một cấp nữa.
    // SỬA LỖI: Sử dụng thuộc tính `availableBlocks` đã được tính toán sẵn từ App.tsx
    if (blocklyConfig?.availableBlocks && Array.isArray(blocklyConfig.availableBlocks)) {
      blocklyConfig.availableBlocks.forEach(block => availableBlocks.add(block));
    } else { // Fallback nếu `availableBlocks` không được truyền vào
      const queue = [...((blocklyConfig as any)?.toolbox?.contents || blocklyConfig?.contents || [])];
      while (queue.length > 0) {
        const item = queue.shift();
        if (!item) continue;
        if (item.type) availableBlocks.add(item.type);
        if (item.custom === 'PROCEDURE') availableBlocks.add('PROCEDURE');
        if (Array.isArray(item.contents)) queue.push(...item.contents); 
      }
    }
    console.log("Solver: Các khối lệnh có sẵn từ toolbox:", Array.from(availableBlocks));

    // --- THÊM MỚI: Chế độ tạo thuật toán tự hành ---
    const hasLogicBlocks = availableBlocks.has('controls_if') && availableBlocks.has('maze_is_path');
    const hasLoopBlock = availableBlocks.has('maze_forever') || availableBlocks.has('controls_whileUntil');
    const isAlgorithmicMode = hasLogicBlocks && hasLoopBlock;

    const world = new GameWorld(gameConfig, solutionConfig);
    const startPos = gameConfig.players[0].start;
    const startDir = gameConfig.players[0].start.direction !== undefined ? gameConfig.players[0].start.direction : 2; // Sửa mặc định thành 2 (+Z)
    const startState = new GameState(startPos, startDir, world); // world đã có solutionConfig
    const startNode = new PathNode(startState);

    const openList: PathNode[] = [];
    const closedList: Map<string, number> = new Map(); // Map<stateKey, gCost>

    const manhattan = (p1: Position, p2: Position): number => {
        return Math.abs(p1.x - p2.x) + Math.abs(p1.y - p2.y) + Math.abs(p1.z - p2.z);
    };

    const heuristic = (state: GameState): number => {
      const currentPos = state.position; // THAY ĐỔI: Sử dụng solutionConfig từ world
      const requiredGoals = world.solutionConfig.itemGoals || {}; // THAY ĐỔI: Sử dụng solutionConfig từ world
      const remainingGoalPositions: Position[] = [];
  
      // Thêm vị trí các vật phẩm chưa thu thập vào danh sách mục tiêu
      for (const goalType in requiredGoals) {
        if (goalType !== 'switch') {
          const requiredCount = requiredGoals[goalType];
          const collectedCount = Array.from(state.collectedItems).filter(id => world.collectiblesById.get(id)?.type === goalType).length;
          if (collectedCount < requiredCount) {
            world.collectiblesById.forEach((item, id) => {
              if (item.type === goalType && !state.collectedItems.has(id)) {
                remainingGoalPositions.push(item.position);
              }
            });
          }
        }
      }
  
      // Thêm vị trí các công tắc chưa bật vào danh sách mục tiêu
      if (requiredGoals['switch']) {
        world.switchesByPos.forEach((s, posKey) => {
          if (state.switchStates.get(s.id) !== 'on') {
            const [x, y, z] = posKey.split(',').map(Number);
            remainingGoalPositions.push({ x, y, z });
          }
        });
      }
  
      // Nếu không còn mục tiêu phụ, heuristic là khoảng cách đến đích
      // SỬA ĐỔI: Khi không còn mục tiêu phụ, heuristic chỉ cần là khoảng cách đến đích.
      // Logic cũ tính toán phức tạp hơn một cách không cần thiết.
      if (remainingGoalPositions.length === 0) { 
        return manhattan(currentPos, world.finishPos);
      }
  
      let maxHeuristic = manhattan(currentPos, world.finishPos); // Bắt đầu với khoảng cách đến đích cuối cùng

      // Cải tiến Heuristic: Nếu có thể dùng hàm, giảm nhẹ heuristic để khuyến khích các đường đi có thể tối ưu hóa
      if (availableBlocks.has('PROCEDURE')) {
        maxHeuristic *= 0.95;
      }

      for (const pos of remainingGoalPositions) {
        // Tính tổng chi phí ước tính nếu đi qua mục tiêu này
        const costViaThisGoal = manhattan(currentPos, pos) + manhattan(pos, world.finishPos);
        // Heuristic là chi phí tối đa trong tất cả các khả năng
        maxHeuristic = Math.max(maxHeuristic, costViaThisGoal);
      }
      
      return maxHeuristic;
    };

    const isGoalAchieved = (state: GameState): boolean => {
        // THAY ĐỔI: Logic kiểm tra mục tiêu bị sai. Cần đếm số lượng vật phẩm đã thu thập theo đúng `goalType`.
        const requiredGoals = world.solutionConfig.itemGoals || {};
        for (const goalType in requiredGoals) {
            const requiredCount = requiredGoals[goalType];
            if (goalType === 'switch') {
                // [SỬA LỖI] Xử lý linh hoạt mục tiêu 'switch' dựa trên `requiredCount`.
                // [SỬA LỖI & CẢI TIẾN] Xử lý linh hoạt mục tiêu 'switch' dựa trên `requiredCount`.
                const toggledOnCount = Array.from(state.switchStates.values()).filter(s => s === 'on').length;
                if (typeof requiredCount === 'string' && requiredCount.toLowerCase() === 'all') {
                    const totalSwitches = world.switchesByPos.size;
                    if (toggledOnCount < totalSwitches) {
                        return false;
                    }
                    if (toggledOnCount < totalSwitches) return false;
                } else {
                    // Chuyển đổi requiredCount thành số để so sánh
                    const numericRequiredCount = Number(requiredCount);
                    // Nếu requiredCount là một số hợp lệ, hãy so sánh số công tắc đã bật với nó.
                    if (!isNaN(numericRequiredCount) && toggledOnCount < numericRequiredCount) {
                        return false;
                    }
                }
            } else {
                // Đếm số vật phẩm đã thu thập thuộc `goalType` này
                const collectedCount = Array.from(state.collectedItems).filter(id => world.collectiblesById.get(id)?.type === goalType).length;

                if (typeof requiredCount === 'string' && requiredCount.toLowerCase() === 'all') {
                    // Nếu yêu cầu là 'all', so sánh với tổng số vật phẩm loại đó có trên bản đồ
                    const totalOfType = Array.from(world.collectiblesById.values()).filter(c => c.type === goalType).length;
                    if (collectedCount < totalOfType) return false;
                } else {
                    // Nếu yêu cầu là một con số cụ thể
                    const numericRequiredCount = Number(requiredCount);
                    // Thêm kiểm tra `!isNaN` để đảm bảo an toàn
                    if (!isNaN(numericRequiredCount) && collectedCount < numericRequiredCount) return false;
                }
            }
        }

        // [SỬA LỖI QUAN TRỌNG] Logic trả về bị sai.
        // Hàm chỉ nên trả về `true` nếu vòng lặp `for` hoàn tất mà không `return false` lần nào.
        // Điều này có nghĩa là tất cả các mục tiêu đã được đáp ứng.
        // Nếu không có mục tiêu nào (`requiredGoals` rỗng), nó cũng nên trả về `true` để cho phép
        // các màn chơi chỉ cần đi đến đích.
        return true;
    };

    startNode.hCost = heuristic(startState);
    openList.push(startNode);

    // XÓA BỎ KHỐI TIỀN XỬ LÝ: Logic này phức tạp và gây ra lỗi không nhất quán
    // giữa lần quay đầu và các lần quay sau. Vòng lặp A* chính sẽ xử lý tất cả
    // các hành động xoay một cách đồng bộ.
    while (openList.length > 0) {
        openList.sort((a, b) => a.fCost - b.fCost);
        const currentNode = openList.shift()!;
        const stateKey = currentNode.state.getKey();

        if (closedList.has(stateKey) && closedList.get(stateKey)! <= currentNode.gCost) {
            continue;
        }
        closedList.set(stateKey, currentNode.gCost);

        const state = currentNode.state;

        if (isGoalAchieved(state)) {
            // TÌM THẤY TRẠNG THÁI HOÀN THÀNH MỤC TIÊU!
            // Bây giờ, cần tìm đường đi từ đây đến ô kết thúc.
            const finalPathNode = findPathToFinish(currentNode, world, heuristic);
            
            if (!finalPathNode) {
                // Nếu không thể tìm thấy đường đến đích từ trạng thái hoàn thành mục tiêu,
                // tiếp tục tìm kiếm các trạng thái hoàn thành mục tiêu khác.
                console.warn("Solver: Đã hoàn thành mục tiêu nhưng không tìm thấy đường đến đích. Tiếp tục tìm kiếm...");
                continue; 
            }

            // Lấy đường đi cuối cùng
            const path = finalPathNode.rawActionsToReach;

            console.log("Solver: Tìm thấy lời giải tối ưu!", path);

            // Đếm số lần rẽ trong đường đi thô để xác định độ phức tạp
            const turnCount = path.filter(action => action.includes('turn')).length;
            const isComplexPath = turnCount > 2; // Có thể điều chỉnh ngưỡng này

            let finalStructuredSolution;
            // --- LOGIC MỚI: GHI ĐÈ LỜI GIẢI CÓ CẤU TRÚC ---
            // Chỉ kích hoạt chế độ thuật toán nếu đường đi thực sự phức tạp
            if (isAlgorithmicMode && isComplexPath) {
                console.log(`Solver: Chế độ thuật toán đang hoạt động (số lần rẽ: ${turnCount}). Ghi đè structuredSolution bằng thuật toán bám tường.`);
                finalStructuredSolution = createWallFollowerSolution(solutionConfig);
            } else {
                // Nếu không phải chế độ thuật toán, tối ưu hóa rawActions như bình thường.
                finalStructuredSolution = createStructuredSolution(convertRawToStructuredActions(path), availableBlocks, solutionConfig, world);
            }

            // Tính toán số khối và số dòng tối ưu
            // Luôn tính toán dựa trên lời giải có cấu trúc cuối cùng (finalStructuredSolution)
            const finalOptimalBlocks = calculateTotalBlocksInSolution(finalStructuredSolution);
            const finalOptimalLines = calculateOptimalLines(finalStructuredSolution);

            // THÊM MỚI: Tạo một phiên bản "basicSolution" đã được chuẩn hóa từ rawActions.
            // Điều này đảm bảo basicSolution cũng sử dụng định dạng { type: 'maze_turn', direction: '...' }
            const basicSolutionMain = convertRawToStructuredActions(path);

            // Trả về kết quả cuối cùng
            return {
                optimalBlocks: finalOptimalBlocks,
                optimalLines: finalOptimalLines,
                rawActions: path,
                structuredSolution: finalStructuredSolution,
                basicSolution: { main: basicSolutionMain, procedures: {} } // Trả về basicSolution đã chuẩn hóa
            };
        }

        const neighbors = findNeighbors(state, world);

        for (const neighbor of neighbors) {
            const { pos: neighborPos, action: moveAction } = neighbor;
            const nextState = state.clone();
            nextState.position = neighborPos;
            const neighborPosKey = `${neighborPos.x},${neighborPos.y},${neighborPos.z}`;

            let cost = 0;
            const actionsToReachNeighbor: string[] = [];
            const lastAction = currentNode.rawActionsToReach.length > 0 ? currentNode.rawActionsToReach[currentNode.rawActionsToReach.length - 1] : null;

            // --- LOGIC MỚI: Truyền `lastAction` vào `calculateTurnActions` để có thể áp dụng chiết khấu lặp lại ---
            const { actions: turnActions, newDirection: targetDir, cost: turnCost } = calculateTurnActions(state, neighborPos, lastAction);
            actionsToReachNeighbor.push(...turnActions);
            cost += turnCost;

            // --- LOGIC MỚI: KHUYẾN KHÍCH SỰ LẶP LẠI ---
            // Giảm nhẹ chi phí nếu hành động giống hành động trước đó để A* ưu tiên các chuỗi lặp lại.
            const REPETITION_DISCOUNT = 0.01; // Tăng nhẹ chiết khấu để có tác động rõ ràng hơn

            // Thêm hành động và chi phí cho di chuyển (walk/jump)
            if (moveAction === 'walk') {
                actionsToReachNeighbor.push('moveForward');
                let moveCost = 1.0;
                if (lastAction === 'moveForward') {
                    moveCost -= REPETITION_DISCOUNT;
                }
                cost += moveCost;
            } else { // jump
                actionsToReachNeighbor.push('jump');
                let jumpCost = 1.2; // Nhảy tốn nhiều chi phí hơn một chút
                if (lastAction === 'jump') {
                    jumpCost -= REPETITION_DISCOUNT;
                }
                cost += jumpCost;
            }
            
            nextState.direction = targetDir;

            // Tính chi phí và hành động thu thập/bật công tắc tại ô ĐẾN (chi phí rất nhỏ để ưu tiên)
            const item = world.collectiblesByPos.get(neighborPosKey);
            if (item && !nextState.collectedItems.has(item.id)) {
                nextState.collectedItems.add(item.id);
                cost += 0.01;
                actionsToReachNeighbor.push('collect');
            }

            const switchInfo = world.switchesByPos.get(neighborPosKey);
            if (switchInfo && nextState.switchStates.get(switchInfo.id) !== 'on') {
                nextState.switchStates.set(switchInfo.id, 'on');
                cost += 0.01;
                actionsToReachNeighbor.push('toggleSwitch');
            }

            const newGCost = currentNode.gCost + cost;
            const nextStateKey = nextState.getKey();

            if (closedList.has(nextStateKey) && closedList.get(nextStateKey)! <= newGCost) {
                continue;
            }

            const existingNode = openList.find(n => n.state.getKey() === nextStateKey);
            if (existingNode && existingNode.gCost <= newGCost) {
                continue;
            }

            const nextNode = new PathNode(nextState);
            nextNode.parent = currentNode;
            nextNode.gCost = newGCost;
            nextNode.hCost = heuristic(nextState);
            nextNode.rawActionsToReach = [...currentNode.rawActionsToReach, ...actionsToReachNeighbor];

            if (existingNode) {
                const index = openList.indexOf(existingNode);
                openList[index] = nextNode;
            } else {
                openList.push(nextNode);
            }
        }
    }

    console.error("Solver: Không tìm thấy lời giải.");
    return null;
}

/**
 * HÀM MỚI: Sau khi đã hoàn thành tất cả các mục tiêu (itemGoals), hàm này sẽ
 * tìm đường đi ngắn nhất từ trạng thái hiện tại đến ô kết thúc.
 * Đây là một thuật toán A* thứ hai, đơn giản hơn, chỉ tập trung vào việc di chuyển.
 * @param startNode Node bắt đầu (trạng thái đã hoàn thành mục tiêu).
 * @param world Thế giới game.
 * @param heuristic Hàm heuristic để ước tính khoảng cách.
 * @returns Node kết thúc chứa đường đi hoàn chỉnh, hoặc null nếu không tìm thấy.
 */
function findPathToFinish(startNode: PathNode, world: GameWorld, heuristic: (state: GameState) => number): PathNode | null {
    const openList: PathNode[] = [startNode];
    // SỬA LỖI: Sử dụng stateKey đầy đủ (bao gồm cả hướng) thay vì chỉ posKey.
    // Điều này ngăn việc loại bỏ sớm các đường đi đến cùng một vị trí nhưng với hướng tốt hơn (chi phí quay đầu ít hơn).
    const closedList: Map<string, number> = new Map(); 

    while (openList.length > 0) {
        openList.sort((a, b) => a.fCost - b.fCost);
        const currentNode = openList.shift()!;
        const stateKey = currentNode.state.getKey();

        if (closedList.has(stateKey) && closedList.get(stateKey)! <= currentNode.gCost) {
            continue;
        }
        closedList.set(stateKey, currentNode.gCost);

        const state = currentNode.state;

        // Kiểm tra xem đã đến đích chưa
        if (state.position.x === world.finishPos.x && state.position.y === world.finishPos.y && state.position.z === world.finishPos.z) {
            return currentNode; // Tìm thấy đường đi!
        }

        const neighbors = findNeighbors(state, world);

        for (const neighbor of neighbors) {
            const { pos: neighborPos, action: moveAction } = neighbor;
            const nextState = state.clone();
            nextState.position = neighborPos;

            let cost = 0;
            const actionsToReachNeighbor: string[] = [];
            const lastAction = currentNode.rawActionsToReach.length > 0 ? currentNode.rawActionsToReach[currentNode.rawActionsToReach.length - 1] : null;

            const { actions: turnActions, newDirection: targetDir, cost: turnCost } = calculateTurnActions(state, neighborPos, lastAction);
            actionsToReachNeighbor.push(...turnActions);
            cost += turnCost;

            const moveActionStr = moveAction === 'walk' ? 'moveForward' : 'jump';
            actionsToReachNeighbor.push(moveActionStr);
            cost += 1; // Chi phí di chuyển cơ bản

            nextState.direction = targetDir;

            const newGCost = currentNode.gCost + cost;
            const nextStateKey = nextState.getKey();

            if (closedList.has(nextStateKey) && closedList.get(nextStateKey)! <= newGCost) {
                continue;
            }

            const nextNode = new PathNode(nextState);
            nextNode.parent = currentNode;
            nextNode.gCost = newGCost;
            nextNode.hCost = heuristic(nextState); // Heuristic bây giờ chỉ là khoảng cách đến đích
            nextNode.rawActionsToReach = [...currentNode.rawActionsToReach, ...actionsToReachNeighbor];
            openList.push(nextNode);
        }
    }
    return null; // Không tìm thấy đường đến đích
}

/**
 * HÀM MỚI: Tìm tất cả các hàng xóm hợp lệ từ một trạng thái nhất định.
 * @param state Trạng thái hiện tại.
 * @param world Thế giới game.
 * @returns Một mảng các hàng xóm hợp lệ.
 */
function findNeighbors(state: GameState, world: GameWorld): { pos: Position, action: 'walk' | 'jump' }[] {
    const neighbors: { pos: Position, action: 'walk' | 'jump' }[] = [];
    const { x, y, z } = state.position;

    // Duyệt qua 4 hướng chính
    for (const dir of directions) {
        const nextX = x + dir.x;
        const nextZ = z + dir.z;

        // 1. Kiểm tra đi bộ (Walk)
        const walkPos = { x: nextX, y: y, z: nextZ };
        const groundBelowWalkPos = { x: nextX, y: y - 1, z: nextZ };
        const blockAtWalkPos = world.worldMap.get(`${walkPos.x},${walkPos.y},${walkPos.z}`);
        // SỬA ĐỔI: Kiểm tra tường minh khối `wall.stone01` như một vật cản không thể đi xuyên qua.
        if (blockAtWalkPos !== 'wall.stone01' && !world.worldMap.has(`${walkPos.x},${walkPos.y},${walkPos.z}`) && 
            world.isWalkable(groundBelowWalkPos)) {
            neighbors.push({ pos: walkPos, action: 'walk' });
        }

        // 2. Kiểm tra nhảy lên (Jump Up)
        const jumpUpObstaclePos = { x: nextX, y: y, z: nextZ };
        const jumpUpLandingPos = { x: nextX, y: y + 1, z: nextZ };
        const obstacleKey = `${jumpUpObstaclePos.x},${jumpUpObstaclePos.y},${jumpUpObstaclePos.z}`;
        const obstacleModel = world.worldMap.get(obstacleKey);
        // SỬA ĐỔI: Không thể nhảy qua khối 'wall.stone01'
        if (obstacleModel && obstacleModel !== 'wall.stone01' &&
            !world.worldMap.has(`${jumpUpLandingPos.x},${jumpUpLandingPos.y},${jumpUpLandingPos.z}`)) {
            neighbors.push({ pos: jumpUpLandingPos, action: 'jump' });
        }

        // 3. Kiểm tra nhảy xuống (Jump Down)
        const jumpDownAirPos = { x: nextX, y: y, z: nextZ };
        const jumpDownLandingPos = { x: nextX, y: y - 1, z: nextZ };
        const groundBelowJumpDown = { x: nextX, y: y - 2, z: nextZ };
        if (!world.worldMap.has(`${jumpDownAirPos.x},${jumpDownAirPos.y},${jumpDownAirPos.z}`) &&
            !world.worldMap.has(`${jumpDownLandingPos.x},${jumpDownLandingPos.y},${jumpDownLandingPos.z}`) &&
            world.isWalkable(groundBelowJumpDown)) {
            neighbors.push({ pos: jumpDownLandingPos, action: 'jump' });
        }
    }
    return neighbors;
}

/**
 * HÀM MỚI: Kiểm tra xem có đường đi hợp lệ theo một hướng tương đối (trước, trái, phải) so với hướng hiện tại của người chơi không.
 * @param state Trạng thái hiện tại của người chơi.
 * @param relativeDir Hướng tương đối ('ahead', 'left', 'right').
 * @param world Thế giới game.
 * @returns `true` nếu có đường, ngược lại `false`.
 */
const hasPathRelative = (state: GameState, relativeDir: 'ahead' | 'left' | 'right', world: GameWorld): boolean => {
    const currentDir = state.direction;
    let targetDir: number;

    if (relativeDir === 'ahead') {
        targetDir = currentDir;
    } else if (relativeDir === 'left') {
        targetDir = (currentDir - 1 + 4) % 4;
    } else { // right
        targetDir = (currentDir + 1) % 4;
    }

    const dirVector = directions[targetDir];
    const nextPos = {
        x: state.position.x + dirVector.x,
        y: state.position.y,
        z: state.position.z + dirVector.z
    };

    // Kiểm tra xem ô phía trước có trống và có nền đất đi được bên dưới không.
    const isBlocked = world.worldMap.has(`${nextPos.x},${nextPos.y},${nextPos.z}`);
    const groundBelow = { ...nextPos, y: nextPos.y - 1 };
    const hasGround = world.isWalkable(groundBelow);

    return !isBlocked && hasGround;
};

/**
 * HÀM MỚI: Mô phỏng thuật toán bám tường để tạo ra một chuỗi rawActions.
 * @param world Thế giới game.
 * @param startState Trạng thái bắt đầu.
 * @returns Một mảng các hành động thô.
 */
const simulateWallFollower = (world: GameWorld, startState: GameState): string[] => {
    const rawActions: string[] = [];
    let currentState = startState.clone();
    const maxSteps = 1000; // Giới hạn để tránh lặp vô tận

    for (let i = 0; i < maxSteps; i++) {
        // Kiểm tra đã đến đích chưa
        if (currentState.position.x === world.finishPos.x && currentState.position.z === world.finishPos.z) {
            break;
        }

        if (hasPathRelative(currentState, 'right', world)) {
            // Quay phải
            currentState.direction = (currentState.direction + 1) % 4;
            rawActions.push('turnRight');
            // Đi tới
            const dirVector = directions[currentState.direction];
            currentState.position.x += dirVector.x;
            currentState.position.z += dirVector.z;
            rawActions.push('moveForward');
        } else if (hasPathRelative(currentState, 'ahead', world)) {
            // Đi tới
            const dirVector = directions[currentState.direction];
            currentState.position.x += dirVector.x;
            currentState.position.z += dirVector.z;
            rawActions.push('moveForward');
        } else {
            // Quay trái
            currentState.direction = (currentState.direction - 1 + 4) % 4;
            rawActions.push('turnLeft');
        }

        // Logic xử lý mục tiêu phụ (ví dụ: bật công tắc) có thể được thêm vào đây nếu cần
        const posKey = `${currentState.position.x},${currentState.position.y},${currentState.position.z}`;
        if (world.switchesByPos.has(posKey) && currentState.switchStates.get(world.switchesByPos.get(posKey)!.id) !== 'on') {
            currentState.switchStates.set(world.switchesByPos.get(posKey)!.id, 'on');
            rawActions.push('toggleSwitch');
        }
        // THÊM MỚI: Logic xử lý thu thập vật phẩm
        const collectible = world.collectiblesByPos.get(posKey);
        if (collectible && !currentState.collectedItems.has(collectible.id)) {
            currentState.collectedItems.add(collectible.id);
            rawActions.push('collect');
        }
    }
    return rawActions;
};

/**
 * HÀM MỚI: Tạo ra một lời giải có cấu trúc dựa trên thuật toán bám tường (Right-hand wall follower).
 * Đây là một thuật toán tự hành, không phụ thuộc vào một đường đi cố định.
 * @returns Một đối tượng structuredSolution chứa thuật toán.
 */
const createWallFollowerSolution = (solutionConfig: Solution): { main: Action[]; procedures?: Record<string, Action[]> } => {
    // Logic của thuật toán:
    // loop forever {
    //   if (path to the right) {
    //     turn right;
    //     move forward;
    //   } else if (path ahead) {
    //     move forward;
    //   } else {
    //     turn left;
    //   }
    //   // Sau khi di chuyển, kiểm tra các hành động phụ
    //   if (item present) {
    //     collect;
    //   }
    //   if (switch is off) {
    //     toggle switch;
    //   }
    // }

    const itemGoalActions: Action[] = [];
    const itemGoals = solutionConfig.itemGoals || {};

    // THÊM MỚI: Tự động tạo các khối 'if' cho từng loại vật phẩm trong itemGoals
    for (const goalType in itemGoals) {
        // Bỏ qua 'switch' vì nó được xử lý riêng
        if (goalType !== 'switch') {
            itemGoalActions.push({
                type: 'controls_if',
                condition: { type: 'maze_is_item_present', item_type: goalType }, // Sử dụng đúng loại vật phẩm từ itemGoals
                if_actions: [{ type: 'maze_collect' }]
            });
        }
    }

    // Chỉ thêm logic cho công tắc nếu nó có trong itemGoals
    if (itemGoals.switch) {
        itemGoalActions.push({
            type: 'controls_if',
            condition: { type: 'maze_is_switch_state', state: 'off' }, // Kiểm tra công tắc đang tắt
            if_actions: [{ type: 'maze_toggle_switch' }]
        });
    }
    const solution: { main: Action[]; procedures?: Record<string, Action[]> } = {
        main: [
            {
                type: 'maze_forever', // Hoặc 'controls_whileUntil' với điều kiện 'maze_at_finish'
                actions: [
                    {
                        // Khối logic di chuyển
                        type: 'controls_if',
                        condition: { type: 'maze_is_path', direction: 'path to the right' },
                        if_actions: [
                            { type: 'maze_turn', direction: 'turnRight' },
                            { type: 'maze_moveForward' }
                        ],
                        else_if_actions: [{
                            condition: { type: 'maze_is_path', direction: 'path ahead' },
                            actions: [{ type: 'maze_moveForward' }]
                        }],
                        else_actions: [{ type: 'maze_turn', direction: 'turnLeft' }]
                    },
                    // Nối các khối logic cho itemGoals đã được tạo tự động
                    ...itemGoalActions
                ]
            }
        ]
    };
    return solution;
};

/**
 * HÀM MỚI: Tính toán các hành động xoay, hướng mới và chi phí để đi từ trạng thái hiện tại đến vị trí tiếp theo.
 */
function calculateTurnActions(currentState: GameState, nextPos: Position, lastAction: string | null): { actions: string[], newDirection: number, cost: number } {
    const actions: string[] = [];
    const REPETITION_DISCOUNT = 0.01; // Tăng nhẹ chiết khấu để có tác động rõ ràng hơn
    let cost = 0;

    const dx = nextPos.x - currentState.position.x;
    const dz = nextPos.z - currentState.position.z;
    
    // SỬA LỖI VÀ TÁI CẤU TRÚC: Logic ánh xạ dx, dz sang targetDir đã được sửa lại cho chính xác và dễ đọc hơn.
    // Quy ước hướng: 0: -Z, 1: +X, 2: +Z, 3: -X
    let targetDir: number;
    if (dx === 1 && dz === 0) targetDir = 1;      // +X -> Phải
    else if (dx === -1 && dz === 0) targetDir = 3; // -X -> Trái
    else if (dx === 0 && dz === 1) targetDir = 2;   // +Z -> Tới
    else if (dx === 0 && dz === -1) targetDir = 0;  // -Z -> Lùi
    else targetDir = currentState.direction;

    if (targetDir !== currentState.direction) {
        // SỬA LỖI DỨT ĐIỂM: Logic quay đang bị ngược. Hoán đổi lại turnLeft và turnRight.
        // diff = 1 (theo chiều kim đồng hồ) phải là turnRight.
        // diff = 3 (ngược chiều kim đồng hồ) phải là turnLeft.
        const diff = (targetDir - currentState.direction + 4) % 4;
        if (diff === 1) { // Quay phải
            actions.push('turnRight');
            cost += (lastAction === 'turnRight' ? 0.1 - REPETITION_DISCOUNT : 0.1);
        } else if (diff === 3) { // Quay trái
            actions.push('turnLeft');
            cost += (lastAction === 'turnLeft' ? 0.1 - REPETITION_DISCOUNT : 0.1);
        } else if (diff === 2) {
            actions.push('turnRight', 'turnRight');
            cost += 0.2; // Khó áp dụng chiết khấu cho quay 180 độ, tạm giữ nguyên
        }
    }

    return { actions, newDirection: targetDir, cost };
}