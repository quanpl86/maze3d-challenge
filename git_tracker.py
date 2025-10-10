#!/usr/bin/env python3
"""
Git File Tracker for React Projects
Tự động theo dõi và cập nhật các file theo loại khi có commit mới
"""

import os
import subprocess
import json
import hashlib
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Set, Any # Added Any for errorDict typing
import argparse
import logging
import fnmatch
import sys
import math # Di chuyển lên đầu file
import re


core_files = [
    # Bootloader and common assets/styles
    "appengine/common/boot.js",
    "appengine/common/common.css",
    "appengine/common/prettify.css",
    "appengine/common/prettify.js",
    "appengine/common/back.js",
    
    # Core libraries for UI, logic, and integration
    "appengine/src/html.js",
    "appengine/src/lib-games.js",
    "appengine/src/lib-interface.js",
    "appengine/src/lib-dialogs.js",
    "appengine/src/lib-code.js",
    "appengine/src/lib-storage.js",
    "appengine/src/lib-ace.js",
    "appengine/src/lib-gallery.js",
    "appengine/src/slider.js",

    # Third-party and externs for JS execution environment
    "third-party/base.js",
    "externs/interpreter-externs.js",
    "externs/prettify-externs.js",
    "externs/soundJS-externs.js",
    "externs/storage-externs.js",
    "externs/svg-externs.js",

    # App Engine configuration
    "appengine/app.yaml"
]

# =================================================================
# ==                    GAME-SPECIFIC FILES                      ==
# =================================================================

# --- Game: Maze (Mê cung) ---
maze_files = core_files + [
    "appengine/maze.html",
    "appengine/maze/style.css",
    "appengine/maze/src/main.js",
    "appengine/maze/src/blocks.js",
    "appengine/maze/src/html.js"
]

# --- Game: Bird (Chú chim) ---
bird_files = core_files + [
    "appengine/bird.html",
    "appengine/bird/style.css",
    "appengine/bird/src/main.js",
    "appengine/bird/src/blocks.js",
    "appengine/bird/src/html.js"
]

# --- Game: Turtle (Rùa vẽ) ---
turtle_files = [
    "appengine/turtle.html",
    "appengine/turtle/style.css",
    "appengine/turtle/src/main.js",
    "appengine/turtle/src/blocks.js",
    "appengine/turtle/src/html.js"
]

# --- Game: Movie (Làm phim) ---
movie_files = core_files + [
    "appengine/movie.html",
    "appengine/movie/style.css",
    "appengine/movie/src/main.js",
    "appengine/movie/src/blocks.js",
    "appengine/movie/src/html.js",
    "appengine/movie/src/scrubber.js"
]

# --- Game: Music (Âm nhạc) ---
music_files = core_files + [
    "appengine/music.html",
    "appengine/music/style.css",
    "appengine/music/src/main.js",
    "appengine/music/src/blocks.js",
    "appengine/music/src/html.js",
    "appengine/music/src/field_pitch.js",
    "appengine/music/src/startcount.js"
]

# --- Game: Puzzle (Xếp hình) ---
puzzle_files = core_files + [
    "appengine/puzzle.html",
    "appengine/puzzle/style.css",
    "appengine/puzzle/src/main.js",
    "appengine/puzzle/src/blocks.js",
    "appengine/puzzle/src/html.js",
    "appengine/puzzle/src/data.js"
]

# --- Game: Pond (Ao nước) ---
pond_files = core_files + [
    # Entry points
    "appengine/pond-tutor.html",
    "appengine/pond-duck.html",
    "appengine/pond/docs.html",
    
    # Core Pond logic
    "appengine/pond/src/pond.js",
    "appengine/pond/src/avatar.js",
    "appengine/pond/src/battle.js",
    "appengine/pond/src/visualization.js",
    "appengine/pond/src/blocks.js",
    "appengine/pond/src/js-blocks.js",
    "appengine/pond/src/html.js",
    "appengine/pond/style.css",

    # Tutor specific
    "appengine/pond/tutor/style.css",
    "appengine/pond/tutor/src/main.js",
    "appengine/pond/tutor/src/html.js",

    # Duck specific
    "appengine/pond/duck/style.css",
    "appengine/pond/duck/src/main.js",
    "appengine/pond/duck/src/html.js",
    "appengine/pond/duck/default-ducks.js",
    
    # Docs specific
    "appengine/pond/docs/style.css",
    "appengine/pond/docs/docs.js"
]

# --- Gallery (Thư viện) ---
gallery_files = core_files + [
    "appengine/gallery.html",
    "appengine/gallery/style.css",
    "appengine/gallery/src/main.js",
    "appengine/gallery/src/html.js",
    # API backend files
    "appengine/gallery_api/admin.py",
    "appengine/gallery_api/common.py",
    "appengine/gallery_api/expire.py",
    "appengine/gallery_api/submit.py",
    "appengine/gallery_api/view.py"
]

# --- Index (Trang chủ) ---
index_files = core_files + [
    "appengine/index.html",
    "appengine/index/style.css",
    "appengine/index/src/main.js",
    "appengine/index/src/html.js"
]


# ===== KHAI BÁO BIẾN fileList TOÀN CỤC =====
fileList: List[str] = []



# [
#   "packages/interactive-quiz-kit/src/client-services.ts",
#   "packages/interactive-quiz-kit/src/react-ui.ts",
#   "packages/interactive-quiz-kit/src/ai.ts",
#   "packages/interactive-quiz-kit/src/types.ts",
#   "packages/interactive-quiz-kit/src/index.ts",
#   "packages/interactive-quiz-kit/src/i18n.ts",
#   "packages/interactive-quiz-kit/src/services/PointAllocationService.ts",
#   "packages/interactive-quiz-kit/src/ai/flows/generate-learning-analysis.ts",
#   "packages/interactive-quiz-kit/src/ai/flows/generate-learning-analysis-types.ts",
#   "packages/interactive-quiz-kit/src/ai/flows/generate-practice-suggestion.ts",
#   "packages/interactive-quiz-kit/src/ai/flows/generate-questions-from-quiz-plan-types.ts",
#   "packages/interactive-quiz-kit/src/ai/flows/generate-quiz-plan-types.ts",
#   "packages/interactive-quiz-kit/src/ai/flows/generate-single-knowledge-card-types.ts"
# ];

# [
#     # 1. UI - Nơi bắt đầu hành động (Click nút "Tạo Mới")
#     "features/core-gameplay/components/Sandbox/LevelManagementPanel.tsx",

#     # 2. Page/View - Nơi điều phối các component UI và gọi logic
#     "features/core-gameplay/components/Sandbox/SandboxView.tsx",

#     # 3. Controller - Nơi chứa logic nghiệp vụ cho chế độ chỉnh sửa
#     "features/core-gameplay/components/EditMode/EditModeController.tsx",
    
#     # 4. State & Services - Các lớp quản lý trạng thái và dữ liệu cốt lõi
#     "core/state/ApplicationStateManager.ts",
#     "services/domains/gameplay/WorldStateService.ts",
#     "services/domains/gameplay/LevelRepository.ts",

#     # 5. Rendering - Các component chịu trách nhiệm vẽ lại thế giới 3D dựa trên state
#     "features/core-gameplay/game-renderer/r3f-components/LevelScene.tsx",
    
#     # 6. Global Setup - Nơi khởi tạo và cung cấp các services
#     "App.tsx",
    
#     # 7. Data Definitions - Nơi định nghĩa cấu trúc dữ liệu
#     "shared/types/index.ts"
# ]


# [
#     "services/domains/gameplay/RobotController.ts",
#     "services/domains/gameplay/WorldStateService.ts",
#     "features/core-gameplay/components/PlayMode/GameplayView.tsx",
#     "features/core-gameplay/components/Sandbox/SandboxView.tsx",
#     "features/core-gameplay/components/EditMode/EditModeView.tsx",
#     "features/core-gameplay/components/EditMode/EditModeController.tsx",
#     "features/core-gameplay/components/PlayMode/GameControls/GameControls.tsx",
#     "features/core-gameplay/game-renderer/config/gameAssets.ts",
#     "shared/types/state.ts",
#     "shared/types/index.ts",
#     "core/state/ApplicationStateManager.ts",
# ]

# [
#   "assets/styles/global.css",
#   "assets/styles/theme.css",
#   "layouts/AdminLayout.css",
#   "layouts/AuthenticatedLayout.css",
#   "layouts/PublicLayout.css",
#   "features/authentication/components/LoginPage.css",
#   "features/competition/components/Leaderboard.css",
#   "features/competition/components/Timer.css",
#   "features/core-gameplay/components/PlayMode/GameHUD.css",
#   "features/gamification/components/AchievementSystem/AchievementSystem.css",
#   "shared/components/LoadingSpinner.css"
# ]





# ============================================

class GitFileTracker:
    def __init__(self, project_path: str, output_dir: str = "tracked_files"):
        self.project_path = Path(project_path).resolve()
        self.output_dir = self.project_path / output_dir
        self.output_dir.mkdir(exist_ok=True)

        self.file_types = {
            'typescript': ['.ts', '.tsx'],
            'javascript': ['.js', '.jsx'],
            # Thêm các loại file khác nếu cần
        }

        self.ignore_patterns: Set[str] = {
            'node_modules/', 'dist/', 'build/', '.git/', '.vscode/',
            '.idea/', 'coverage/', '.nyc_output/', '.cache/',
            '.DS_Store', '*.log',
            '.env.local', '*.env.local', '.env.*.local',
            'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml',
        }

        self.tsconfig_cache: Dict[Path, Dict] = {} 
        
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(self.output_dir / 'tracker.log'),
                logging.StreamHandler()
            ]
        )
        self.logger = logging.getLogger(__name__)

        self.metadata_file = self.output_dir / 'metadata.json'
        self.load_metadata()

    def load_metadata(self):
        if self.metadata_file.exists():
            try:
                with open(self.metadata_file, 'r', encoding='utf-8') as f:
                    self.metadata = json.load(f)
            except json.JSONDecodeError:
                self.logger.error(f"Error decoding JSON from {self.metadata_file}. Initializing new metadata.")
                self._initialize_metadata()
        else:
            self._initialize_metadata()

    def _initialize_metadata(self):
        self.metadata = {
            'last_commit': None,
            'tracked_files': {},
            'file_hashes': {},
            'created': datetime.now().isoformat()
        }

    def save_metadata(self):
        self.metadata['updated'] = datetime.now().isoformat()
        with open(self.metadata_file, 'w', encoding='utf-8') as f:
            json.dump(self.metadata, f, indent=2, ensure_ascii=False)

    def get_current_commit(self) -> str | None: # Python 3.10+ union type
        try:
            result = subprocess.run(
                ['git', 'rev-parse', 'HEAD'],
                cwd=self.project_path,
                capture_output=True,
                text=True,
                check=True,
                encoding='utf-8'
            )
            return result.stdout.strip()
        except subprocess.CalledProcessError as e:
            self.logger.error(f"Không thể lấy commit hash hiện tại: {e}")
            return None
        except FileNotFoundError:
            self.logger.error("Lệnh 'git' không tìm thấy. Hãy đảm bảo Git đã được cài đặt và có trong PATH.")
            return None


    def get_tracked_files(self) -> List[str]:
        try:
            result = subprocess.run(
                ['git', 'ls-files'],
                cwd=self.project_path,
                capture_output=True,
                text=True,
                check=True,
                encoding='utf-8'
            )
            files = result.stdout.strip().split('\n')
            return [f for f in files if f and not self.should_ignore_file(f)]
        except subprocess.CalledProcessError as e:
            self.logger.error(f"Không thể lấy danh sách file tracked: {e}")
            return []
        except FileNotFoundError:
            self.logger.error("Lệnh 'git' không tìm thấy khi lấy danh sách file.")
            return []

    def get_changed_files(self, since_commit: str | None = None) -> List[str]:
        try:
            if since_commit:
                cmd = ['git', 'diff', '--name-only', f'{since_commit}..HEAD']
            else:
                # Lấy các file đã thay đổi và được staged (chưa commit)
                cmd = ['git', 'diff', '--name-only', '--cached']

            result = subprocess.run(
                cmd,
                cwd=self.project_path,
                capture_output=True,
                text=True,
                check=True, # sẽ raise error nếu git diff trả về non-zero (ví dụ, commit hash không tồn tại)
                encoding='utf-8'
            )
            files = result.stdout.strip().split('\n')
            return [f for f in files if f and not self.should_ignore_file(f)]
        except subprocess.CalledProcessError as e:
            # Đây có thể là trường hợp bình thường nếu không có thay đổi, hoặc commit hash sai
            self.logger.warning(f"Không thể lấy danh sách file đã thay đổi (since {since_commit}): {e}. Điều này có thể bình thường nếu không có thay đổi hoặc commit hash không hợp lệ.")
            return []
        except FileNotFoundError:
            self.logger.error("Lệnh 'git' không tìm thấy khi lấy file thay đổi.")
            return []


    def should_ignore_file(self, file_path: str) -> bool:
        path_obj = Path(file_path)
        normalized_path_str = str(path_obj).replace('\\', '/') # Chuẩn hóa cho Windows

        for pattern in self.ignore_patterns:
            if pattern.endswith('/'): # Thư mục
                if normalized_path_str.startswith(pattern):
                    return True
            else: # File pattern
                if fnmatch.fnmatch(path_obj.name, pattern):
                    return True
        return False

    def get_file_type(self, file_path: str) -> str:
        p_file_path = Path(file_path)
        file_ext = p_file_path.suffix.lower()
        # file_name = p_file_path.name.lower() # Không cần thiết nếu chỉ dựa vào extension

        for type_name, extensions in self.file_types.items():
            if file_ext in extensions:
                return type_name
        # Mặc định cho các file không khớp
        if file_ext == '.css': return 'styles'
        if file_ext == '.json': return 'config'
        if file_ext == '.md': return 'markdown'
        if file_ext == '.html': return 'html'
        if file_ext in ['.svg', '.png', '.jpg', '.jpeg', '.gif', '.glb', '.gltf']: return 'assets'

        return 'other'


    def calculate_file_hash(self, file_path: Path) -> str | None:
        try:
            with open(file_path, 'rb') as f:
                return hashlib.md5(f.read()).hexdigest()
        except FileNotFoundError:
            self.logger.warning(f"File not found for hashing: {file_path}")
            return None
        except Exception as e:
            self.logger.error(f"Error hashing file {file_path}: {e}")
            return None

    def read_file_content(self, file_path: Path) -> str:
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                return f.read()
        except UnicodeDecodeError:
            try:
                with open(file_path, 'r', encoding='latin-1') as f: # Thử encoding khác
                    return f.read()
            except Exception as e_latin1:
                self.logger.warning(f"Không thể đọc file (UTF-8 and Latin-1 failed): {file_path} - {e_latin1}")
                return f"# FAILED_TO_READ_FILE_CONTENT (encoding issue): {file_path.name}\n"
        except FileNotFoundError:
            self.logger.warning(f"File not found for reading content: {file_path}")
            return f"# FILE_NOT_FOUND: {file_path.name}\n"
        except Exception as e:
            self.logger.error(f"Lỗi đọc file: {file_path} - {e}")
            return f"# ERROR_READING_FILE: {file_path.name}\n"

    # <<<<<<<<<<<<<<<< FIX HERE: Hàm đã được un-indent để trở thành một method của class >>>>>>>>>>>>>>>>
    def create_consolidated_file(self, file_type: str, files: List[str]):
        output_file = self.output_dir / f"{file_type}_files.txt" # Đổi thành .txt cho dễ đọc
        content = [
            f"# Consolidated {file_type.upper()} Files",
            f"# Generated: {datetime.now().isoformat()}",
            f"# Total files: {len(files)}",
            "=" * 80, ""
        ]

        for file_path_str in sorted(files): # Sắp xếp để output nhất quán
            full_path = self.project_path / file_path_str
            if full_path.exists() and full_path.is_file():
                normalized_file_path_str = file_path_str.replace('\\', '/')
                content.extend([
                    f"# FILE: {normalized_file_path_str}", # Sử dụng biến đã chuẩn hóa
                    "-" * 60,
                    self.read_file_content(full_path),
                    "", "=" * 80, ""
                ])
            else:
                self.logger.warning(f"Skipping non-existent file in consolidated report: {full_path}")

        with open(output_file, 'w', encoding='utf-8') as f:
            f.write('\n'.join(content))
        self.logger.info(f"Tạo file tổng hợp: {output_file} ({len(files)} files)")

    def update_consolidated_files(self, changed_files_paths: List[str]):
        types_affected: Set[str] = set()
        for file_path in changed_files_paths:
            types_affected.add(self.get_file_type(file_path))

        for file_type in types_affected:
            all_current_files_of_type = self.get_files_by_type(file_type)
            if all_current_files_of_type:
                self.create_consolidated_file(file_type, all_current_files_of_type)
            else: # Nếu không còn file nào của loại này
                consolidated_file_path = self.output_dir / f"{file_type}_files.txt"
                if consolidated_file_path.exists():
                    try:
                        consolidated_file_path.unlink()
                        self.logger.info(f"Đã xóa file tổng hợp (không còn file loại này): {consolidated_file_path}")
                    except OSError as e:
                        self.logger.error(f"Không thể xóa file tổng hợp {consolidated_file_path}: {e}")


    def get_files_by_type(self, target_type: str) -> List[str]:
        all_files = self.get_tracked_files() # Lấy danh sách file mới nhất từ git
        return [f for f in all_files if self.get_file_type(f) == target_type]

    def create_project_structure(self):
        structure_file = self.output_dir / "project_structure.txt"
        content = [
            "# Project Structure",
            f"# Generated: {datetime.now().isoformat()}",
            f"# Project Path: {self.project_path}",
            "=" * 80, ""
        ]
        content.extend(self.generate_tree_structure())
        content.extend(["", "=" * 80, "# STATISTICS", "=" * 80])
        content.extend(self.get_project_statistics())

        with open(structure_file, 'w', encoding='utf-8') as f:
            f.write('\n'.join(content))
        self.logger.info(f"Tạo file cấu trúc dự án: {structure_file}")

    def generate_tree_structure(self) -> List[str]:
        tree_lines = []
        # Lấy danh sách file mới nhất từ git để xây dựng cây thư mục
        tracked_files_for_tree = self.get_tracked_files()
        file_tree = {}

        for file_path_str in tracked_files_for_tree:
            parts = Path(file_path_str).parts
            current_level = file_tree
            for i, part in enumerate(parts):
                is_file_node = (i == len(parts) - 1)
                if part not in current_level:
                    current_level[part] = {'_is_file': is_file_node}
                    if is_file_node:
                        # Lưu loại file để hiển thị indicator
                        current_level[part]['_type'] = self.get_file_type(file_path_str)
                current_level = current_level[part]

        # Bắt đầu xây dựng từ thư mục gốc của dự án
        tree_lines.append(f"{self.project_path.name}/")
        self._build_tree_recursive(file_tree, tree_lines, "", True) # True cho is_root_level
        return tree_lines


    def _build_tree_recursive(self, node: dict, lines: List[str], prefix: str, is_root_level: bool = False):
        # Sắp xếp: thư mục trước, file sau, rồi theo tên
        items = sorted(
            [(k, v) for k, v in node.items() if not k.startswith('_')], # Bỏ qua các key nội bộ như '_is_file'
            key=lambda x: (x[1].get('_is_file', False), x[0].lower()) # Sắp xếp thư mục (False) trước file (True)
        )

        for i, (name, value) in enumerate(items):
            is_last_item = (i == len(items) - 1)
            connector = "└── " if is_last_item else "├── "
            current_line_prefix = prefix + connector

            # Prefix cho các dòng con bên trong thư mục này
            children_prefix = prefix + ("    " if is_last_item else "│   ")

            if value.get('_is_file', False): # Là file
                file_type_str = value.get('_type', 'other')
                type_indicator_str = self._get_file_type_indicator(file_type_str)
                lines.append(f"{current_line_prefix}{name} {type_indicator_str}")
            else: # Là thư mục
                lines.append(f"{current_line_prefix}{name}/")
                self._build_tree_recursive(value, lines, children_prefix, False)

    def _load_tsconfig(self, start_path: Path) -> tuple[Dict, Path] | None:
        """
        Tìm và parse file tsconfig.json gần nhất, đi ngược từ thư mục bắt đầu.
        Trả về một tuple (dữ liệu, đường dẫn file) hoặc None.
        Kết quả sẽ được cache lại để tăng tốc độ.
        """
        current_dir = start_path if start_path.is_dir() else start_path.parent
        
        # Đi ngược từ thư mục hiện tại lên thư mục gốc của dự án
        while self.project_path in current_dir.parents or current_dir == self.project_path:
            tsconfig_path = current_dir / "tsconfig.json"
            
            if tsconfig_path in self.tsconfig_cache:
                cached_data = self.tsconfig_cache[tsconfig_path]
                # Trả về từ cache nếu nó không phải là marker lỗi
                return (cached_data, tsconfig_path) if cached_data else None

            if tsconfig_path.is_file():
                try:
                    with open(tsconfig_path, 'r', encoding='utf-8') as f:
                        # Bỏ qua các comment trong file JSON trước khi parse
                        content = re.sub(r'//.*', '', f.read(), flags=re.MULTILINE)
                        data = json.loads(content)
                        self.tsconfig_cache[tsconfig_path] = data
                        return data, tsconfig_path
                except Exception as e:
                    self.logger.warning(f"Lỗi khi đọc hoặc parse {tsconfig_path}: {e}")
                    self.tsconfig_cache[tsconfig_path] = {} # Cache lỗi để không thử lại
                    return None
            
            if current_dir == current_dir.parent: # Đã đến gốc hệ thống
                break
            current_dir = current_dir.parent
        
        return None

    def _resolve_import_path(self, importer_path: Path, import_str: str) -> Path | None:
        """
        Giải quyết một chuỗi import thành đường dẫn file thực tế, có hỗ trợ tsconfig paths.
        """
        # 1. Xử lý import tương đối (ưu tiên cao nhất và nhanh nhất)
        if import_str.startswith('.'):
            base_dir = importer_path.parent
            potential_path = (base_dir / import_str).resolve()
            resolved = self._find_file_with_extension(potential_path)
            if resolved:
                return resolved

        # 2. Xử lý path aliases từ tsconfig.json
        tsconfig_result = self._load_tsconfig(importer_path)
        if tsconfig_result:
            tsconfig_data, tsconfig_path = tsconfig_result
            tsconfig_dir = tsconfig_path.parent # <-- ĐÂY LÀ SỬA LỖI QUAN TRỌNG

            if 'compilerOptions' in tsconfig_data:
                options = tsconfig_data['compilerOptions']
                base_url_str = options.get('baseUrl', '.')
                base_url = (tsconfig_dir / base_url_str).resolve()
                
                paths = options.get('paths', {})
                for alias, real_paths in paths.items():
                    pattern_str = re.escape(alias).replace(r'\*', r'(.*)')
                    if not pattern_str.endswith('$'):
                         pattern_str += '$'
                    
                    match = re.match(pattern_str, import_str)
                    if match:
                        captured_part = match.group(1) if match.groups() else ""
                        for real_path_template in real_paths:
                            real_path_str = real_path_template.replace('*', captured_part, 1)
                            potential_path = (base_url / real_path_str).resolve()
                            resolved = self._find_file_with_extension(potential_path)
                            if resolved:
                                return resolved

        # 3. Xử lý các import tuyệt đối từ gốc project (fallback)
        potential_path_from_root = (self.project_path / import_str).resolve()
        resolved_from_root = self._find_file_with_extension(potential_path_from_root)
        if resolved_from_root:
            return resolved_from_root
            
        return None


    def _find_file_with_extension(self, potential_path: Path) -> Path | None:
        """
        Tìm file thực tế bằng cách thử các extension phổ biến (.ts, .tsx, .js, /index.ts, etc.)
        (HÀM NÀY GIỮ NGUYÊN)
        """
        extensions_to_try = ['.ts', '.tsx', '.js', '.jsx', '.json']
        # 1. Thử với đường dẫn gốc (nếu nó đã có extension)
        if potential_path.exists() and potential_path.is_file():
            return potential_path

        # 2. Thử thêm các extension
        for ext in extensions_to_try:
            path_with_ext = potential_path.with_suffix(ext)
            if path_with_ext.exists() and path_with_ext.is_file():
                return path_with_ext

        # 3. Thử trường hợp là thư mục (import file index)
        if potential_path.is_dir():
            for ext in extensions_to_try:
                # Đặc biệt ưu tiên index.ts/tsx/js
                index_file = potential_path / f"index{ext}"
                if index_file.exists() and index_file.is_file():
                    return index_file
                # Một số package export chính nó, ví dụ: 'packages/interactive-quiz-kit/src/react-ui' -> react-ui.ts
                self_file = potential_path.parent / f"{potential_path.name}{ext}"
                if self_file.exists() and self_file.is_file():
                    return self_file
        
        return None

    def _get_file_type_indicator(self, file_type: str) -> str:
        indicators = {
            'typescript': '🔹', 'javascript': '🟨', 'styles': '🎨',
            'config': '⚙️', 'markdown': '📝', 'html': '🌐',
            'assets': '🖼️', 'other': '📄'
            # Thêm các indicator khác nếu cần
        }
        return indicators.get(file_type, '📄') # Mặc định là 'other'


    def get_project_statistics(self) -> List[str]:
        tracked_files = self.get_tracked_files() # Lấy danh sách file mới nhất
        stats = [f"Total tracked files (respecting .gitignore & script ignores): {len(tracked_files)}"]

        files_by_type_counts: Dict[str, int] = {}
        total_size = 0

        for file_path_str in tracked_files:
            file_type = self.get_file_type(file_path_str)
            files_by_type_counts[file_type] = files_by_type_counts.get(file_type, 0) + 1
            full_path = self.project_path / file_path_str
            try:
                if full_path.is_file():
                    total_size += full_path.stat().st_size
            except FileNotFoundError:
                 self.logger.warning(f"File not found during stat calculation: {full_path}")
            except Exception as e:
                 self.logger.error(f"Error getting size for {full_path}: {e}")


        stats.append(f"Total size: {self._format_size(total_size)}")
        stats.extend(["", "Files by type:"])

        if tracked_files: # Chỉ tính % nếu có file
            for file_type_key in sorted(files_by_type_counts.keys()):
                count = files_by_type_counts[file_type_key]
                percentage = (count / len(tracked_files)) * 100
                indicator = self._get_file_type_indicator(file_type_key)
                stats.append(f"  {indicator} {file_type_key.capitalize()}: {count} files ({percentage:.1f}%)")
        else:
            stats.append("  No files to analyze.")


        stats.extend(["", "Directory statistics (top 10 by file count in top-level dirs):"])
        dir_stats = self._get_directory_stats(tracked_files)
        for dir_name, count in sorted(dir_stats.items(), key=lambda x: x[1], reverse=True)[:10]:
            stats.append(f"  📁 {dir_name}: {count} files")

        return stats

    def _format_size(self, size_bytes: int) -> str:
        if size_bytes < 0: size_bytes = 0 # Handle potential negative (though unlikely)
        if size_bytes == 0: return "0B"
        size_names = ["B", "KB", "MB", "GB", "TB"]
        i = 0
        if size_bytes > 0: # Đảm bảo log không lỗi nếu size_bytes là 0
            i = int(math.floor(math.log(size_bytes, 1024)))
            i = min(i, len(size_names) - 1) # Tránh index out of bounds
        p = math.pow(1024, i)
        s = round(size_bytes / p, 2)
        return f"{s} {size_names[i]}"

    def _get_directory_stats(self, files: List[str]) -> Dict[str, int]:
        dir_stats: Dict[str, int] = {}
        for file_path_str in files:
            path_obj = Path(file_path_str)
            # Chỉ lấy thư mục cấp 1
            if path_obj.parts: # Đảm bảo path có ít nhất một phần
                top_level_dir = path_obj.parts[0]
                if top_level_dir: # Đảm bảo không phải chuỗi rỗng
                    dir_stats[top_level_dir] = dir_stats.get(top_level_dir, 0) + 1
        return dir_stats

    def initial_scan(self):
        self.logger.info("Bắt đầu scan ban đầu...")
        all_tracked_files = self.get_tracked_files()
        files_by_type_map: Dict[str, List[str]] = {}

        for file_path_str in all_tracked_files:
            file_type = self.get_file_type(file_path_str)
            files_by_type_map.setdefault(file_type, []).append(file_path_str)

        for file_type, files_list in files_by_type_map.items():
            if files_list: self.create_consolidated_file(file_type, files_list)

        self.create_project_structure()

        current_commit_hash = self.get_current_commit()
        self.metadata['last_commit'] = current_commit_hash
        self.metadata['tracked_files'] = files_by_type_map

        new_file_hashes = {}
        for file_path_str in all_tracked_files:
            full_path = self.project_path / file_path_str
            if full_path.is_file():
                hash_val = self.calculate_file_hash(full_path)
                if hash_val: new_file_hashes[file_path_str] = hash_val
        self.metadata['file_hashes'] = new_file_hashes

        self.save_metadata()
        self.logger.info(f"Hoàn thành scan ban đầu. Tổng cộng: {len(all_tracked_files)} files tracked.")

    def check_and_update(self):
        self.logger.info("Kiểm tra thay đổi...")
        current_commit_hash = self.get_current_commit()
        if not current_commit_hash:
            self.logger.error("Không thể lấy commit hiện tại. Bỏ qua cập nhật.")
            return

        last_known_commit = self.metadata.get('last_commit')
        # if not last_known_commit: # Sửa: Nếu chưa có commit, luôn thực hiện initial_scan
        #     self.logger.info("Không có commit trước đó. Thực hiện scan ban đầu.")
        #     self.initial_scan()
        #     return
        # Thay vào đó, chỉ cần kiểm tra xem commit có khác không, hoặc nếu last_known_commit là None
        run_full_scan_logic = False
        if not last_known_commit or last_known_commit != current_commit_hash:
            self.logger.info(f"Commit đã thay đổi từ '{last_known_commit}' sang '{current_commit_hash}' hoặc chưa có commit trước. Sẽ kiểm tra thay đổi.")
            run_full_scan_logic = True
        else:
            self.logger.info(f"Không có commit mới kể từ {last_known_commit}. Kiểm tra thay đổi file thủ công.")
            # Vẫn tiếp tục để check hash file

        changed_via_git_diff = []
        if run_full_scan_logic and last_known_commit: # Chỉ diff nếu có commit trước đó để so sánh
             changed_via_git_diff = self.get_changed_files(last_known_commit)


        all_current_git_files = self.get_tracked_files()

        files_to_reprocess_content: Set[str] = set(changed_via_git_diff)
        current_file_hashes: Dict[str, str] = {}
        structure_changed = False

        # So sánh hash cho tất cả các file hiện tại
        for file_path_str in all_current_git_files:
            full_path = self.project_path / file_path_str
            if full_path.is_file():
                current_hash = self.calculate_file_hash(full_path)
                if current_hash:
                    current_file_hashes[file_path_str] = current_hash
                    # Nếu hash khác hoặc file mới (chưa có trong metadata cũ)
                    if self.metadata.get('file_hashes', {}).get(file_path_str) != current_hash:
                        files_to_reprocess_content.add(file_path_str)


        # Xác định file đã bị xóa (có trong hash cũ, không có trong git files hiện tại)
        deleted_files_paths = set(self.metadata.get('file_hashes', {}).keys()) - set(all_current_git_files)
        if deleted_files_paths:
            self.logger.info(f"Phát hiện {len(deleted_files_paths)} file đã bị xóa: {', '.join(deleted_files_paths)}")
            structure_changed = True
            for dfp in deleted_files_paths:
                 types_affected_by_deletion = self.get_file_type(dfp) # Lấy loại file của file đã xóa
                 # Logic cập nhật các file tổng hợp cho loại file này sẽ nằm ở dưới


        # Xác định file mới (có trong git files hiện tại, không có trong hash cũ)
        new_files_paths = set(all_current_git_files) - set(self.metadata.get('file_hashes', {}).keys())
        if new_files_paths:
            self.logger.info(f"Phát hiện {len(new_files_paths)} file mới: {', '.join(new_files_paths)}")
            structure_changed = True
            # files_to_reprocess_content đã bao gồm các file này


        if not files_to_reprocess_content and not structure_changed :
            self.logger.info("Không có file nào thay đổi nội dung hoặc cấu trúc quan trọng.")
        else:
            self.logger.info(f"Xử lý {len(files_to_reprocess_content)} file (thay đổi, mới) và {len(deleted_files_paths)} file đã xóa.")

            # Cập nhật danh sách file theo loại trong metadata
            current_files_by_type_map: Dict[str, List[str]] = {}
            for file_path_str in all_current_git_files:
                file_type = self.get_file_type(file_path_str)
                current_files_by_type_map.setdefault(file_type, []).append(file_path_str)
            self.metadata['tracked_files'] = current_files_by_type_map

            # Xác định các loại file bị ảnh hưởng bởi thay đổi nội dung hoặc xóa
            types_affected: Set[str] = set()
            for f_path in files_to_reprocess_content: # Bao gồm file mới, file thay đổi
                types_affected.add(self.get_file_type(f_path))
            for f_path_deleted in deleted_files_paths: # Và loại file của các file đã xóa
                types_affected.add(self.get_file_type(f_path_deleted))


            # Tạo lại các file tổng hợp cho các loại bị ảnh hưởng
            for file_type in types_affected:
                files_of_this_type_now = current_files_by_type_map.get(file_type, [])
                if files_of_this_type_now:
                    self.create_consolidated_file(file_type, files_of_this_type_now)
                else: # Không còn file nào của loại này
                    consolidated_file_path = self.output_dir / f"{file_type}_files.txt"
                    if consolidated_file_path.exists():
                        consolidated_file_path.unlink(missing_ok=True) # Xóa file nếu không còn file loại đó
                        self.logger.info(f"Đã xóa file tổng hợp (không còn file loại này): {consolidated_file_path}")

            self.metadata['file_hashes'] = current_file_hashes # Cập nhật hash mới
            if structure_changed or files_to_reprocess_content: # Cập nhật cấu trúc nếu cần
                self.create_project_structure()

        self.metadata['last_commit'] = current_commit_hash
        self.save_metadata()
        self.logger.info(f"Hoàn thành cập nhật. Commit hiện tại: {current_commit_hash}")


    def merge_specific_files(self, file_list_to_merge: List[str], output_filename: str = "files-merged.txt"):
        if not file_list_to_merge:
            self.logger.warning("Danh sách file để merge rỗng. Không có hành động nào được thực hiện.")
            return

        self.logger.info(f"Bắt đầu gộp {len(file_list_to_merge)} file vào '{output_filename}'...")

        output_file = self.output_dir / output_filename
        content = [
            f"# Merged Files",
            f"# Generated: {datetime.now().isoformat()}",
            f"# Total files merged: {len(file_list_to_merge)}",
            "=" * 80, ""
        ]

        valid_files_found = 0
        for file_path_str in file_list_to_merge:
            # Tất cả đường dẫn trong file_list_to_merge đều là tương đối so với self.project_path
            full_path = self.project_path / file_path_str

            if full_path.exists() and full_path.is_file():
                valid_files_found += 1
                self.logger.debug(f"  -> Đang đọc file: {file_path_str}")
                normalized_file_path_str = file_path_str.replace('\\', '/')
                content.extend([
                    f"# FILE: {normalized_file_path_str}", # Sử dụng biến đã chuẩn hóa
                    "-" * 60,
                    self.read_file_content(full_path),
                    "", "=" * 80, ""
                ])
            else:
                warning_msg = f"Bỏ qua file không tồn tại hoặc không phải là file: {file_path_str} (Kiểm tra tại: {full_path})"
                self.logger.warning(warning_msg)
                normalized_file_path_str = file_path_str.replace('\\', '/')
                content.extend([
                    f"# FILE: {normalized_file_path_str}", # Sử dụng biến đã chuẩn hóa
                    f"# Reason: Not found or not a regular file at checked path '{full_path}'",
                    "=" * 80, ""
                ])

        if valid_files_found == 0:
            self.logger.warning(f"Không tìm thấy file hợp lệ nào trong danh sách cung cấp để gộp vào '{output_filename}'. File gộp sẽ không được tạo/cập nhật.")
            # Quyết định xem có nên xóa file output cũ nếu không có file nào hợp lệ
            # if output_file.exists():
            #     output_file.unlink()
            #     self.logger.info(f"Đã xóa file output cũ '{output_filename}' do không có file hợp lệ mới.")
            return


        try:
            with open(output_file, 'w', encoding='utf-8') as f:
                f.write('\n'.join(content))
            self.logger.info(f"✅ Hoàn thành! Đã gộp thành công {valid_files_found} file vào: {output_file}")
        except Exception as e:
            self.logger.error(f"❌ Lỗi khi ghi file gộp '{output_file}': {e}")

    def merge_directory_files(self, dir_path_str: str, output_filename_base: str = "dir-merged"):
        target_dir = self.project_path / dir_path_str
        self.logger.info(f"Bắt đầu tìm kiếm file trong thư mục: '{target_dir}' để gộp...")

        if not target_dir.is_dir():
            self.logger.error(f"Lỗi: Đường dẫn '{dir_path_str}' không tồn tại hoặc không phải là thư mục.")
            return

        files_to_merge_from_dir = []
        for path_obj in target_dir.rglob('*'):
            if path_obj.is_file():
                relative_path = path_obj.relative_to(self.project_path)
                relative_path_str = str(relative_path).replace('\\', '/')
                if not self.should_ignore_file(relative_path_str):
                    files_to_merge_from_dir.append(relative_path_str)
                else:
                    self.logger.debug(f"Bỏ qua file bị ignore trong thư mục: {relative_path_str}")

        if not files_to_merge_from_dir:
            self.logger.warning(f"Không tìm thấy file nào hợp lệ để gộp trong thư mục '{dir_path_str}'.")
            return

        files_to_merge_from_dir.sort()
        output_filename = f"{output_filename_base}-{target_dir.name.replace(' ', '_')}.txt"
        self.merge_specific_files(files_to_merge_from_dir, output_filename=output_filename)

    # ===== START: CHỨC NĂNG MERGE THEO ERROR DICT =====
    def load_error_dict(self, error_dict_path_str: str) -> Dict[str, Any] | None:
        """Đọc và parse file JSON errorDict."""
        error_dict_path = Path(error_dict_path_str)
        if not error_dict_path.is_file():
            self.logger.error(f"File errorDict không tìm thấy tại: {error_dict_path}")
            return None
        try:
            with open(error_dict_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            if "error_troubleshooting_map" not in data:
                self.logger.error(f"File errorDict '{error_dict_path}' không có key 'error_troubleshooting_map' ở cấp cao nhất.")
                return None
            return data
        except json.JSONDecodeError as e:
            self.logger.error(f"Lỗi parse JSON trong file errorDict '{error_dict_path}': {e}")
            return None
        except Exception as e:
            self.logger.error(f"Lỗi không xác định khi đọc file errorDict '{error_dict_path}': {e}")
            return None

    def merge_files_by_error_id(self, error_dict_data: Dict[str, Any], error_id: str):
        """
        Gộp các file liên quan đến một ID lỗi cụ thể từ errorDict.
        """
        if not error_dict_data or "error_troubleshooting_map" not in error_dict_data:
            self.logger.error("Dữ liệu errorDict không hợp lệ hoặc thiếu 'error_troubleshooting_map'.")
            return

        all_files_to_merge: Set[str] = set()
        error_item_found: Dict[str, Any] | None = None
        error_name_for_file = f"error-{error_id.replace('.', '_')}" # Tên file mặc định

        for category in error_dict_data.get("error_troubleshooting_map", []):
            if error_item_found: break
            for sub_category in category.get("sub_categories", []):
                if sub_category.get("id") == error_id:
                    error_item_found = sub_category
                    error_name_for_file = f"error-{category.get('category_id', 'cat')}_{error_id.replace('.', '_')}-{sub_category.get('name', 'unknown').replace(' ', '_').lower()[:30]}"
                    break
            # Nếu không tìm thấy trong sub_categories, thử tìm ở category level (nếu cấu trúc cho phép)
            if not error_item_found and category.get("id") == error_id: # Giả sử category cũng có thể có "id"
                 error_item_found = category
                 error_name_for_file = f"error-cat_{error_id.replace('.', '_')}-{category.get('name', 'unknown').replace(' ', '_').lower()[:30]}"


        if not error_item_found:
            self.logger.error(f"Không tìm thấy lỗi với ID '{error_id}' trong errorDict.")
            return

        self.logger.info(f"Đã tìm thấy lỗi: '{error_item_found.get('name', 'Không có tên')}' (ID: {error_id})")

        # Thu thập file, đảm bảo đường dẫn là tương đối với project_path
        # và chuẩn hóa về '/'
        for key in ["direct_files_frontend", "direct_files_backend", "indirect_files_frontend", "indirect_files_backend"]:
            for file_path in error_item_found.get(key, []):
                # Giả định các đường dẫn trong errorDict là tương đối với src/
                # Nếu không, bạn cần điều chỉnh logic này.
                # Ví dụ: nếu path là "features/auth/Login.tsx", nó sẽ thành "src/features/auth/Login.tsx"
                # nếu project_path của bạn là gốc và errorDict dùng path từ src.
                # Hiện tại, giả sử path trong errorDict đã là tương đối so với project_path
                # hoặc là đường dẫn tuyệt đối cần được xử lý.
                # Script này mong đợi đường dẫn tương đối so với project_path
                # Nếu file JSON chứa path kiểu "src/...", thì không cần thêm "src/" nữa.
                # Còn nếu file JSON chỉ chứa "features/...", thì bạn cần xác định gốc của chúng.
                # Giả sử file JSON cung cấp đường dẫn tương đối từ thư mục `src`
                # và script này chạy từ thư mục gốc của dự án (nơi có `src`).
                
                # Chuyển đổi để đảm bảo đường dẫn là tương đối với gốc dự án
                # và sử dụng / làm dấu phân cách
                # Nếu file_path đã là "src/...", thì không cần làm gì nhiều.
                # Nếu file_path là "features/...", thì cần ghép với "src/"
                
                # Để đơn giản, giả sử các đường dẫn trong JSON đã chuẩn
                # và là tương đối với self.project_path
                # Nếu không, bạn cần chuẩn hóa chúng ở đây.
                # Ví dụ, nếu path trong JSON là "features/..." và bạn muốn nó là "src/features/..."
                # standardized_path = Path("src") / file_path if not file_path.startswith("src/") else Path(file_path)
                # all_files_to_merge.add(str(standardized_path).replace('\\', '/'))
                
                # Hiện tại, giữ nguyên:
                all_files_to_merge.add(str(Path(file_path)).replace('\\', '/'))


        if not all_files_to_merge:
            self.logger.warning(f"Không có file nào được liệt kê cho lỗi ID '{error_id}'.")
            return

        sorted_files_list = sorted(list(all_files_to_merge))
        output_filename = f"{error_name_for_file}.merged.txt"
        self.merge_specific_files(sorted_files_list, output_filename=output_filename)
    # ===== END: CHỨC NĂNG MERGE THEO ERROR DICT =====


    def create_git_hook(self):
        git_dir = self.project_path / '.git'
        if not git_dir.is_dir():
            self.logger.error(f"Thư mục .git không tồn tại tại {self.project_path}. Không thể tạo hook.")
            return

        hook_dir = git_dir / 'hooks'
        hook_dir.mkdir(exist_ok=True)
        hook_file = hook_dir / 'post-commit'
        script_path = Path(__file__).resolve() # Lấy đường dẫn tuyệt đối của script này

        # Đảm bảo các đường dẫn được truyền vào hook là tuyệt đối hoặc script biết cách tìm
        # Sử dụng sys.executable để gọi đúng interpreter Python
        hook_content = f"""#!/bin/sh
# Auto-generated git hook for file tracking by GitFileTracker
echo "GitFileTracker: Running post-commit hook..."
cd "{self.project_path}"
"{sys.executable}" "{script_path}" --project-path "{self.project_path}" --output-dir "{self.output_dir.name}" --check-update
echo "GitFileTracker: Post-commit hook finished."
"""
        try:
            with open(hook_file, 'w', encoding='utf-8') as f:
                f.write(hook_content)
            # Đặt quyền thực thi cho hook file
            os.chmod(hook_file, 0o755) # rwxr-xr-x
            self.logger.info(f"Đã tạo/cập nhật git hook: {hook_file}")
        except Exception as e:
            self.logger.error(f"Không thể tạo git hook: {e}")

    def _find_file_with_extension(self, potential_path: Path) -> Path | None:
        """
        Tìm file thực tế bằng cách thử các extension phổ biến (.ts, .tsx, .js, /index.ts, etc.)
        """
        extensions_to_try = ['.ts', '.tsx', '.js', '.jsx', '.json']
        # 1. Thử với đường dẫn gốc (nếu nó đã có extension)
        if potential_path.exists() and potential_path.is_file():
            return potential_path

        # 2. Thử thêm các extension
        for ext in extensions_to_try:
            path_with_ext = potential_path.with_suffix(ext)
            if path_with_ext.exists() and path_with_ext.is_file():
                return path_with_ext

        # 3. Thử trường hợp là thư mục (import file index)
        if potential_path.is_dir():
            for ext in extensions_to_try:
                index_file = potential_path / f"index{ext}"
                if index_file.exists() and index_file.is_file():
                    return index_file
        
        # self.logger.debug(f"Không thể giải quyết đường dẫn import: {potential_path}")
        return None

    def _extract_imports_from_file(self, file_path: Path) -> Set[Path]:
        """
        Đọc một file và trích xuất tất cả các file nó import.
        """
        resolved_imports: Set[Path] = set()
        if not file_path.exists() or not file_path.is_file():
            return resolved_imports

        content = self.read_file_content(file_path)
        
        # Regex để tìm 'from "./path"' hoặc require("./path")
        # Bao gồm cả dấu ' và "
        import_regex = re.compile(r"(?:import|export)[\s\S]*?from\s*['\"](.*?)['\"]|require\s*\(\s*['\"](.*?)['\"]\s*\)")
        
        matches = import_regex.finditer(content)
        for match in matches:
            # Match.group(1) cho from '...', match.group(2) cho require('...')
            import_str = match.group(1) or match.group(2)
            if import_str:
                resolved_path = self._resolve_import_path(file_path, import_str)
                if resolved_path and resolved_path.is_file():
                    resolved_imports.add(resolved_path)

        return resolved_imports

    def _find_dependencies_recursively(self, start_file: Path, all_project_files_abs: Set[Path]) -> Set[Path]:
        """
        Tìm tất cả các file mà start_file phụ thuộc vào, một cách đệ quy.
        """
        to_visit = [start_file]
        visited: Set[Path] = set()

        while to_visit:
            current_file = to_visit.pop()
            if current_file in visited:
                continue
            
            # Chỉ xử lý các file nằm trong dự án
            if current_file not in all_project_files_abs:
                continue

            visited.add(current_file)
            
            imports = self._extract_imports_from_file(current_file)
            for imp in imports:
                if imp not in visited:
                    to_visit.append(imp)
        
        return visited

    def _find_usages(self, target_file: Path, all_project_files_abs: Set[Path]) -> Set[Path]:
        """
        Tìm tất cả các file trong dự án mà đang import `target_file`.
        """
        usages: Set[Path] = set()
        self.logger.info(f"Bắt đầu tìm kiếm usages cho file: {target_file.relative_to(self.project_path)}")
        for file_to_scan in all_project_files_abs:
            if file_to_scan == target_file:
                continue
            
            imports = self._extract_imports_from_file(file_to_scan)
            if target_file in imports:
                usages.add(file_to_scan)
        
        return usages

    def merge_dependencies_for_file(self, target_file_str: str):
        """
        Chức năng chính: tìm dependencies, usages và gộp tất cả lại.
        """
        target_file_path = (self.project_path / target_file_str).resolve()

        if not target_file_path.is_file():
            self.logger.error(f"File đích không tồn tại: {target_file_path}")
            return

        self.logger.info("Bắt đầu thu thập danh sách file trong dự án...")
        all_tracked_files_relative = self.get_tracked_files()
        all_tracked_files_abs = { (self.project_path / f).resolve() for f in all_tracked_files_relative }

        self.logger.info(f"1. Tìm các file phụ thuộc (dependencies) của '{target_file_str}'...")
        dependencies = self._find_dependencies_recursively(target_file_path, all_tracked_files_abs)
        self.logger.info(f" -> Tìm thấy {len(dependencies)} dependencies (bao gồm cả file gốc).")

        self.logger.info(f"2. Tìm các file sử dụng (usages) '{target_file_str}'...")
        usages = self._find_usages(target_file_path, all_tracked_files_abs)
        self.logger.info(f" -> Tìm thấy {len(usages)} file sử dụng nó.")
        
        # Gộp tất cả kết quả lại và loại bỏ trùng lặp
        all_related_files_abs = dependencies.union(usages)
        
        # Chuyển đổi lại thành đường dẫn tương đối để gộp file
        all_related_files_relative = sorted([
            str(p.relative_to(self.project_path)).replace('\\', '/') for p in all_related_files_abs
        ])
        
        if not all_related_files_relative:
            self.logger.warning("Không tìm thấy file liên quan nào.")
            return

        self.logger.info(f"Tổng cộng có {len(all_related_files_relative)} file liên quan. Bắt đầu gộp...")
        
        output_filename = f"deps-{Path(target_file_str).name.replace('.', '_')}.merged.txt"
        self.merge_specific_files(all_related_files_relative, output_filename=output_filename)            

    def status(self):
        print("\n=== Git File Tracker Status ===")
        print(f"Project Path: {self.project_path}")
        print(f"Output Directory: {self.output_dir.relative_to(self.project_path)}")
        log_file_path = self.output_dir / 'tracker.log'
        meta_file_path = self.metadata_file
        if log_file_path.exists(): print(f"Log File: {log_file_path.relative_to(self.project_path)}")
        if meta_file_path.exists(): print(f"Metadata File: {meta_file_path.relative_to(self.project_path)}")

        last_commit_stored = self.metadata.get('last_commit', 'None')
        print(f"Last Processed Commit: {last_commit_stored}")

        current_git_commit = self.get_current_commit()
        if current_git_commit:
            print(f"Current Git HEAD Commit: {current_git_commit}")
            if current_git_commit != last_commit_stored:
                print("⚠️  Trạng thái: Có commit mới chưa được xử lý bởi tracker.")
            else:
                print("✅ Trạng thái: Đã cập nhật với commit mới nhất (theo git commit hash).")
        else:
            print("⚠️  Không thể lấy commit hiện tại từ Git.")

        print(f"Total Files in Metadata Hashes: {len(self.metadata.get('file_hashes', {}))}")

        print("\nFile Statistics (từ metadata['tracked_files']):")
        meta_tracked_files_map = self.metadata.get('tracked_files', {})
        if isinstance(meta_tracked_files_map, dict):
            total_files_in_map = sum(len(files) for files in meta_tracked_files_map.values())
            print(f"  Total files grouped by type in metadata: {total_files_in_map}")
            for file_type, files_list in sorted(meta_tracked_files_map.items()):
                indicator = self._get_file_type_indicator(file_type)
                print(f"  {indicator} {file_type.capitalize()}: {len(files_list)} files")
        else:
            print("  (Dữ liệu thống kê file theo loại trong metadata không có hoặc có định dạng không mong muốn)")


        print("\nGenerated Files (excluding log/metadata):")
        generated_count = 0
        if self.output_dir.is_dir():
            for item in sorted(self.output_dir.iterdir()): # Sắp xếp để output nhất quán
                if item.is_file() and item.name not in ['tracker.log', 'metadata.json']:
                    print(f"  - {item.name}")
                    generated_count +=1
            if generated_count == 0: print("  (Chưa có file tổng hợp nào được tạo)")
        else: print("  (Thư mục output chưa được tạo)")


def main():
    parser = argparse.ArgumentParser(
        description='Git File Tracker for React Projects',
        formatter_class=argparse.RawTextHelpFormatter # Giữ nguyên định dạng xuống dòng trong help
    )
    parser.add_argument('--project-path', default=os.getcwd(), help='Đường dẫn đến dự án (mặc định: thư mục hiện tại)')
    parser.add_argument('--output-dir', default='tracked_files', help='Thư mục output (tương đối với project-path)')

    action_group = parser.add_argument_group('Hành động')
    action_group.add_argument(
        '--merge',
        nargs='+', # Chấp nhận một hoặc nhiều file
        metavar='FILE_PATH',
        help='Gộp các file được chỉ định thành files-merged.txt.\n'
             'Argument này sẽ ghi đè lên danh sách fileList được khai báo trong code.\n'
             'Hành động này sẽ được ưu tiên thực hiện.'
    )
    action_group.add_argument(
        '--merge-dir',
        metavar='DIR_PATH',
        help='(MỚI) Gộp tất cả các file trong một thư mục và các thư mục con của nó.\n'
             'Các file trong node_modules, .git, v.v. sẽ được bỏ qua.\n'
             'Ví dụ: --merge-dir src/components'
    )
    # ===== START: ARGUMENT MỚI CHO ERROR DICT =====
    action_group.add_argument(
        '--merge-error',
        metavar='ERROR_ID',
        help='(MỚI) Gộp các file liên quan đến một ID lỗi từ errorDict.json.\n'
             'Cần cung cấp đường dẫn đến errorDict.json qua --error-dict-path.\n'
             'Ví dụ: --merge-error 9.2'
    )
    parser.add_argument( # Thêm argument riêng cho đường dẫn errorDict
        '--error-dict-path',
        default='errorDict.json', # Mặc định tìm file errorDict.json ở thư mục chạy script
        help='Đường dẫn đến file errorDict.json (mặc định: errorDict.json)'
    )
    # ===== END: ARGUMENT MỚI CHO ERROR DICT =====
    action_group.add_argument('--initial-scan', action='store_true', help='Thực hiện scan ban đầu toàn bộ dự án')
    action_group.add_argument('--check-update', action='store_true', help='Kiểm tra và cập nhật thay đổi từ commit mới nhất')
    action_group.add_argument('--status', action='store_true', help='Hiển thị trạng thái hiện tại của tracker')
    action_group.add_argument('--create-hook', action='store_true', help='Tạo/cập nhật git post-commit hook')
    
    action_group.add_argument(
        '--merge-deps',
        metavar='FILE_PATH',
        help='(MỚI) Tìm và gộp một file cùng tất cả các file phụ thuộc (dependencies) và các file sử dụng nó (usages).'
    )

    args = parser.parse_args()

    global fileList # Khai báo để có thể thay đổi biến toàn cục
    if args.merge:
        fileList = args.merge # Ghi đè fileList nếu --merge được dùng

    project_path_resolved = Path(args.project_path).resolve()
    tracker = GitFileTracker(str(project_path_resolved), args.output_dir)

    # Ưu tiên các hành động merge
    if fileList: # Xử lý --merge hoặc fileList toàn cục
        tracker.merge_specific_files(fileList)
    elif args.merge_dir:
        tracker.merge_directory_files(args.merge_dir)
    # ===== START: XỬ LÝ HÀNH ĐỘNG MERGE THEO ERROR =====
    elif args.merge_error:
        error_dict_data = tracker.load_error_dict(args.error_dict_path)
        if error_dict_data:
            tracker.merge_files_by_error_id(error_dict_data, args.merge_error)
        else:
            # logger đã báo lỗi rồi, có thể không cần print thêm
            pass
    # ===== END: XỬ LÝ HÀNH ĐỘNG MERGE THEO ERROR =====
    elif args.merge_deps:
        tracker.merge_dependencies_for_file(args.merge_deps)
    elif args.initial_scan:
        tracker.initial_scan()
    elif args.check_update:
        tracker.check_and_update()
    elif args.status:
        tracker.status()
    elif args.create_hook:
        tracker.create_git_hook()
    else:
        # Hành động mặc định nếu không có cờ nào được chỉ định VÀ fileList rỗng
        print("Không có hành động nào được chỉ định và fileList rỗng. Hiển thị trạng thái.")
        print("Sử dụng --help để xem các tùy chọn.")
        tracker.status()

if __name__ == '__main__':
    main()




# parser.add_argument('--project-path', default=os.getcwd(), help='Đường dẫn đến dự án (mặc định: thư mục hiện tại)')
# parser.add_argument('--output-dir', default='tracked_files', help='Thư mục output (tương đối với project-path)')

# action_group.add_argument('--initial-scan', action='store_true', help='Thực hiện scan ban đầu toàn bộ dự án')
# action_group.add_argument('--check-update', action='store_true', help='Kiểm tra và cập nhật thay đổi từ commit mới nhất')
# action_group.add_argument('--status', action='store_true', help='Hiển thị trạng thái hiện tại của tracker')
# action_group.add_argument('--create-hook', action='store_true', help='Tạo/cập nhật git post-commit hook')

# action_group.add_argument(
#     '--merge',
#     nargs='+', # Chấp nhận một hoặc nhiều file
#     metavar='FILE_PATH',
#     help='Gộp các file được chỉ định thành files-merged.txt.\n'
#             'Argument này sẽ ghi đè lên danh sách fileList được khai báo trong code.\n'
#             'Hành động này sẽ được ưu tiên thực hiện.'
# )

# action_group.add_argument(
#     '--merge-dir',
#     metavar='DIR_PATH',
#     help='(MỚI) Gộp tất cả các file trong một thư mục và các thư mục con của nó.\n'
#             'Các file trong node_modules, .git, v.v. sẽ được bỏ qua.\n'
#             'Ví dụ: --merge-dir src/components'
# )

# action_group.add_argument(
#     '--merge-error',
#     metavar='ERROR_ID',
#     help='(MỚI) Gộp các file liên quan đến một ID lỗi từ errorDict.json.\n'
#             'Cần cung cấp đường dẫn đến errorDict.json qua --error-dict-path.\n'
#             'Ví dụ: --merge-error 9.2'
# )

# parser.add_argument( # Thêm argument riêng cho đường dẫn errorDict
#     '--error-dict-path',
#     default='errorDict.json', # Mặc định tìm file errorDict.json ở thư mục chạy script
#     help='Đường dẫn đến file errorDict.json (mặc định: errorDict.json)'
# )