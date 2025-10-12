import json
import random

class LevelGenerator:
    """
    Tạo ra một cấu hình màn chơi mê cung 3D phức tạp một cách tự động.
    Sử dụng thuật toán Randomized DFS để đảm bảo có ít nhất một đường đi
    từ điểm bắt đầu đến điểm kết thúc.
    """

    def __init__(self, level_id, level_num):
        self.level_id = level_id
        self.level_num = level_num
        self.config = {}

        # Các list để lưu trữ các đối tượng của game
        self.blocks = []
        self.players = []
        self.collectibles = []
        self.finish = {}
        self.portals = []
        self.interactives = []

        # Map để theo dõi các ô đã được sử dụng
        self.grid = {}

    def _create_pos(self, x, y, z):
        return {"x": x, "y": y, "z": z}

    def _get_neighbors(self, pos, bounds, visited):
        """Tìm các ô hàng xóm hợp lệ cho việc tạo đường đi."""
        x, y, z = pos
        max_x, max_y, max_z = bounds
        neighbors = []
        
        # Di chuyển trên mặt phẳng (x, z)
        for dx, dz in [(0, 1), (0, -1), (1, 0), (-1, 0)]:
            nx, nz = x + dx, z + dz
            # Kiểm tra xem có nằm trong giới hạn và chưa được thăm
            if 0 <= nx < max_x and 0 <= nz < max_z and (nx, y, nz) not in visited:
                neighbors.append((nx, y, nz))
        
        # Di chuyển lên/xuống (nhảy)
        for dy in [1, -1]:
            ny = y + dy
            if 0 <= ny < max_y and (x, ny, z) not in visited:
                neighbors.append((x, ny, z))
        
        random.shuffle(neighbors)
        return neighbors

    def _generate_path(self, start_pos, finish_pos, bounds):
        """Tạo đường đi chính từ start đến finish bằng Randomized DFS."""
        path = []
        visited = set()
        stack = [(start_pos, [start_pos])] # (current_pos, current_path)

        while stack:
            current_pos, current_path = stack.pop()

            if current_pos == finish_pos:
                # Tìm thấy đường đi
                return current_path

            if current_pos in visited:
                continue
            
            visited.add(current_pos)

            neighbors = self._get_neighbors(current_pos, bounds, visited)
            for neighbor in neighbors:
                stack.append((neighbor, current_path + [neighbor]))
        
        return None # Không tìm thấy đường đi (trường hợp hiếm)

    def generate(
        self,
        bounds=(10, 5, 10),
        start_pos=(0, 0, 0),
        start_direction=0,
        finish_pos=(9, 0, 9),
        path_model_key="ground.normal",
        collectibles_to_place={"crystal": 5, "key": 1},
        portal_pairs=1,
        wall_height=3,
        decoration_density=0.1
    ):
        """
        Hàm chính để tạo toàn bộ cấu hình màn chơi.

        Args:
            bounds (tuple): Kích thước (max_x, max_y, max_z) của màn chơi.
            start_pos (tuple): Tọa độ (x, y, z) bắt đầu.
            start_direction (int): Hướng bắt đầu (0:N, 1:E, 2:S, 3:W).
            finish_pos (tuple): Tọa độ (x, y, z) kết thúc.
            path_model_key (str): Model sử dụng cho đường đi.
            collectibles_to_place (dict): Số lượng vật phẩm cần đặt.
            portal_pairs (int): Số cặp cổng dịch chuyển.
            wall_height (int): Chiều cao của tường ngẫu nhiên.
            decoration_density (float): Mật độ vật phẩm trang trí (0.0 -> 1.0).
        """
        print("Bắt đầu tạo màn chơi...")

        # 1. Đặt điểm bắt đầu và kết thúc
        self.players.append({
            "id": "player1",
            "start": {**self._create_pos(*start_pos), "direction": start_direction}
        })
        self.finish = self._create_pos(*finish_pos)
        
        # 2. Tạo đường đi chính
        print("Đang tạo đường đi chính...")
        main_path = self._generate_path(start_pos, finish_pos, bounds)
        if not main_path:
            print("Lỗi: Không thể tạo đường đi từ start đến finish.")
            return

        for x, y, z in main_path:
            self.blocks.append({"modelKey": path_model_key, "position": self._create_pos(x, y, z)})
            self.grid[(x, y, z)] = "path"

        # 3. Đặt các vật phẩm thu thập trên đường đi
        print("Đang đặt vật phẩm...")
        path_without_ends = main_path[1:-1]
        random.shuffle(path_without_ends)
        
        item_counter = 0
        for item_type, count in collectibles_to_place.items():
            for _ in range(count):
                if not path_without_ends:
                    break
                x, y, z = path_without_ends.pop()
                item_counter += 1
                self.collectibles.append({
                    "id": f"c{item_counter}",
                    "type": item_type,
                    "position": self._create_pos(x, y + 1, z)
                })

        # 4. Đặt cổng dịch chuyển
        print("Đang đặt cổng dịch chuyển...")
        if path_without_ends and portal_pairs > 0:
            for i in range(portal_pairs):
                if len(path_without_ends) < 5: # Cần đủ không gian để tạo cổng
                    break
                # Chọn 2 điểm trên đường đi
                p1_idx = random.randint(0, len(main_path) - 1)
                p2_idx = random.randint(0, len(main_path) - 1)
                # Đảm bảo chúng không quá gần nhau
                if abs(p1_idx - p2_idx) < 3:
                    continue

                p1 = main_path[p1_idx]
                p2 = main_path[p2_idx]

                portal_id = f"portal_pair_{i+1}"
                self.portals.append({
                    "id": portal_id,
                    "endpoints": [
                        {"id": f"{portal_id}_a", "position": self._create_pos(p1[0], p1[1] + 1, p1[2])},
                        {"id": f"{portal_id}_b", "position": self._create_pos(p2[0], p2[1] + 1, p2[2])}
                    ]
                })

                # Xóa đường đi giữa 2 cổng
                start_idx, end_idx = min(p1_idx, p2_idx), max(p1_idx, p2_idx)
                for j in range(start_idx + 1, end_idx):
                    pos_to_remove = main_path[j]
                    # Tìm và xóa block tương ứng
                    block_to_remove = {"modelKey": path_model_key, "position": self._create_pos(*pos_to_remove)}
                    if block_to_remove in self.blocks:
                        self.blocks.remove(block_to_remove)
                        del self.grid[pos_to_remove]


        # 5. Tạo tường và cảnh quan trang trí
        print("Đang tạo tường và cảnh quan...")
        max_x, max_y, max_z = bounds
        for x in range(max_x):
            for z in range(max_z):
                # Nếu ô trống, có thể thêm tường hoặc đồ trang trí
                if (x, 0, z) not in self.grid: # Kiểm tra ở y=0
                    if random.random() < decoration_density:
                        # Thêm tường hoặc đá
                        is_wall = random.choice([True, False])
                        if is_wall:
                            model = f"wall.{random.choice(['brick01', 'stone01'])}"
                            for y_offset in range(wall_height):
                                self.blocks.append({"modelKey": model, "position": self._create_pos(x, y_offset, z)})
                        else: # Thêm đá trang trí
                             model = f"stone.{random.choice(['stone01', 'stone04', 'stone06'])}"
                             self.blocks.append({"modelKey": model, "position": self._create_pos(x, 0, z)})

        return self.build_json()


    def build_json(self):
        """Tổng hợp tất cả dữ liệu thành cấu trúc JSON cuối cùng."""
        game_config = {
            "type": "maze",
            "renderer": "3d",
            "blocks": self.blocks,
            "players": self.players,
            "collectibles": self.collectibles,
            "finish": self.finish
        }
        if self.portals:
            game_config["portals"] = self.portals
        if self.interactives:
            game_config["interactives"] = self.interactives

        full_config = {
            "id": self.level_id,
            "gameType": "maze",
            "level": self.level_num,
            "gameConfig": game_config,
            # Các phần khác như blocklyConfig, translations có thể thêm vào đây
            # ...
        }
        return full_config

    def save_to_file(self, config, filename):
        """Lưu cấu hình ra file."""
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(config, f, indent=2, ensure_ascii=False)
        print(f"Đã tạo thành công file cấu hình: {filename}")

# --- VÍ DỤ SỬ DỤNG ---
if __name__ == "__main__":
    # Khởi tạo generator cho level 5
    generator = LevelGenerator(level_id="maze-procedural-5", level_num=5)

    # Tùy chỉnh các tham số để tạo ra một màn chơi độc đáo
    level_config = generator.generate(
        bounds=(11, 5, 11),              # Không gian 12x5x12
        start_pos=(1, 0, 1),             # Bắt đầu ở góc
        finish_pos=(10, 2, 10),          # Kết thúc ở góc đối diện và cao hơn 2 block
        path_model_key="ground.snow",    # Theme tuyết
        collectibles_to_place={
            "crystal": 5                 # 8 viên crystal
        },
        portal_pairs=1,                  # 1 cặp cổng dịch chuyển
        wall_height=0,                   # Tường cao 4 block
        decoration_density=0.15          # Mật độ trang trí/tường là 15%
    )

    # Lưu file
    if level_config:
        generator.save_to_file(level_config, "generated_level_5.json")