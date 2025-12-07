import React, { useState } from 'react';
import './WelcomeModal.css';

interface WelcomeModalProps {
  onClose: (dontShowAgain: boolean) => void;
}

export const WelcomeModal: React.FC<WelcomeModalProps> = ({ onClose }) => {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const handleClose = () => {
    onClose(dontShowAgain);
  };

  return (
    <div className="welcome-modal-overlay" onClick={handleClose}>
      <div className="welcome-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="welcome-modal-header">
          <h2>Chào mừng đến với Map Builder!</h2>
          <button onClick={handleClose} className="welcome-modal-close-btn">&times;</button>
        </div>
        <div className="welcome-modal-body">
          <p>Đây là công cụ giúp bạn tạo và chỉnh sửa các màn chơi (map) cho game một cách trực quan.</p>
          
          <h3>Tính năng chính</h3>

          <h4>1. Tải và Chỉnh sửa Map có sẵn (Load Map)</h4>
          <p>Cách nhanh nhất để bắt đầu là khám phá các map đã được tạo sẵn.</p>
          <ul>
            <li><strong>Import JSON:</strong> Nhấn nút "Import JSON" để tải lên một file map <code>.json</code> từ máy tính của bạn.</li>
            <li><strong>Load Map from Project:</strong> Chọn một map từ danh sách dropdown "Load Map from Project" để tải các màn chơi có sẵn trong dự án.</li>
            <li>Sau khi tải, map sẽ được hiển thị trong không gian 3D và toàn bộ thông tin sẽ xuất hiện ở thanh bên phải (sidebar).</li>
          </ul>

          <h4>2. Tạo Map từ đầu (Create from Scratch)</h4>
          <p>Bạn có thể tự do sáng tạo màn chơi của riêng mình.</p>
          <ol>
            <li><strong>Bắt đầu:</strong> Ứng dụng khởi động với một không gian trống.</li>
            <li><strong>Chọn Asset:</strong> Ở thanh công cụ bên trái (Asset Palette), chọn một đối tượng (ví dụ: `ground.checker`, `player_start`).</li>
            <li><strong>Xây dựng:</strong> Click vào các ô lưới trong không gian 3D để đặt đối tượng đã chọn. Bạn có thể dùng các chế độ "Build" (đặt từng khối) hoặc "Select Area" (thao tác trên vùng lớn).</li>
            <li><strong>Chỉnh sửa thông tin:</strong>
              <ul>
                <li>Sau khi đặt đối tượng, nhấn <strong>"Render from JSON"</strong> ở panel "JSON Output / Editor" để render các đối tượng và tạo cấu trúc JSON ban đầu.</li>
                <li>Ở thanh bên phải, panel "Quest Details", bạn có thể chỉnh sửa ID, Level, Tiêu đề, Mô tả.</li>
                <li>Chọn <strong>"Toolbox Preset"</strong> để thiết lập các khối lệnh sẽ có sẵn cho người chơi. Lời giải của hệ thống sẽ tuân thủ theo các khối lệnh này.</li>
              </ul>
            </li>
            <li><strong>Tự động giải:</strong> Sau khi đặt xong các đối tượng bắt buộc (Player Start, Finish Point), nhấn nút <strong>"Tự động giải"</strong> để hệ thống tìm lời giải. Kết quả sẽ được hiển thị ở các trường: <code>Raw Action</code>, <code>Basic Solution</code>, <code>Structured Solution</code>, và <code>Full Solution Object</code>.</li>
            <li><strong>Tạo Start Blocks:</strong>
              <ul>
                <li>Tính năng này tạo ra chương trình mẫu cho người chơi. Bạn có thể tạo "Start Blocks cho lời giải cơ bản" hoặc "Start Blocks cho lời giải tối ưu".</li>
                <li>Mã XML tương ứng sẽ xuất hiện ở ô <strong>Start Blocks (XML)</strong>.</li>
                <li>Để chỉnh sửa trực quan, nhấn <strong>"Hiển thị Blocks"</strong>, thay đổi trong cửa sổ pop-up và nhấn "Lưu & Đóng". Mã XML sẽ được tự động cập nhật.</li>
              </ul>
            </li>
            <li><strong>Hoàn tất:</strong> Panel "JSON Output / Editor" sẽ hiển thị file JSON hoàn chỉnh. Bạn có thể sao chép hoặc nhấn <strong>"Download"</strong> để lưu file <code>.json</code>.</li>
          </ol>

          <h3>Thao tác với Đối tượng & Môi trường</h3>
          <ul>
            <li><strong>Di chuyển camera (Pan):</strong> Giữ phím <code>Space</code> và kéo chuột trái/phải.</li>
            <li><strong>Xem/Sửa thuộc tính:</strong> Nhấn chuột phải vào một đối tượng để mở menu thuộc tính. Tại đây bạn có thể <strong>Copy, Duplicate, Delete</strong> hoặc thiết lập hướng (Direction) cho Player Start.</li>
            <li><strong>Di chuyển đối tượng (Chuột):</strong> Chọn đối tượng, sau đó giữ chuột và kéo đến vị trí mới. Giữ thêm phím <code>Shift</code> để chỉ di chuyển theo trục dọc (trục Y).</li>
            <li><strong>Di chuyển đối tượng (Phím):</strong> Chọn đối tượng và dùng các phím mũi tên để di chuyển. Giữ thêm phím <code>Shift</code> để di chuyển theo trục Y.</li>
          </ul>

          <h3>Ghi chú quan trọng</h3>
          <ul>
            <li><strong>Đối tượng bắt buộc:</strong> Mỗi map phải có ít nhất một <code>Player Start</code> và một <code>Finish Point</code> để thuật toán tìm lời giải có thể hoạt động.</li>
            <li><strong>Đối tượng không thể đi qua:</strong> Nhân vật không thể di chuyển hay nhảy trên các khối như <code>water</code>, <code>larva</code>, <code>wall stone01</code>.</li>
          </ul>

          <h3>Các phím tắt hữu ích</h3>
          <ul>
            <li><strong>V:</strong> Chế độ điều hướng (Navigate).</li>
            <li><strong>B:</strong> Chế độ xây dựng (Build).</li>
            <li><strong>S:</strong> Chế độ chọn vùng (Select Area).</li>
            <li><strong>C:</strong> Sao chép đối tượng đã chọn (Copy).</li>
            <li><strong>R:</strong> Xoay đối tượng đã chọn (Rotate).</li>
            <li><strong>Phím mũi tên:</strong> Di chuyển đối tượng đã chọn.</li>
            <li><strong>Shift + Phím mũi tên:</strong> Di chuyển đối tượng theo trục Y.</li>
            <li><strong>Shift + Click:</strong> Chọn nhiều đối tượng.</li>
            <li><strong>Ctrl/Cmd + A:</strong> Chọn tất cả đối tượng.</li>
            <li><strong>Delete/Backspace:</strong> Xóa đối tượng/vùng đã chọn.</li>
            <li><strong>Ctrl/Cmd + Z:</strong> Hoàn tác (Undo).</li>
            <li><strong>Ctrl/Cmd + Y (hoặc Shift + Ctrl/Cmd + Z):</strong> Làm lại (Redo).</li>
          </ul>
        </div>
        <div className="welcome-modal-footer">
          <label>
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
            />
            Không hiển thị lại
          </label>
          <button onClick={handleClose} className="welcome-modal-ok-btn">Đã hiểu</button>
        </div>
      </div>
    </div>
  );
};