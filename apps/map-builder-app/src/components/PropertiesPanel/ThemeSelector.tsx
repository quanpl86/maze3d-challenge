import React, { useState, useRef, useEffect } from 'react';
import { Themes } from './theme';

/**
 * Định nghĩa một đối tượng theme từ file config.
 */
interface Theme {
    ground: string;
    obstacle: string;
    tags: string[];
    prohibited_if_item?: string;
}

/**
 * Định nghĩa props cho component ThemeSelector.
 */
interface ThemeSelectorProps {
    // Danh sách các item đang có trên map để lọc theme bị cấm.
    // Ví dụ: ['crystal', 'player', 'switch']
    currentMapItems: string[];

    // Theme đang được chọn để highlight trong UI.
    selectedTheme: { ground: string; obstacle: string };

    // Hàm callback được gọi khi người dùng chọn một theme mới.
    onSelectTheme: (theme: { ground: string; obstacle: string }) => void;
}

const ThemeSelector: React.FC<ThemeSelectorProps> = ({
    currentMapItems = [], // Cung cấp giá trị mặc định là một mảng rỗng
    selectedTheme = Themes.COMPREHENSIVE_THEMES[0], // Cung cấp theme mặc định
    onSelectTheme = () => {}, // Cung cấp hàm rỗng làm giá trị mặc định
}) => {
    const [isListOpen, setIsListOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Lọc ra các theme bị cấm dựa trên các item đang có trên map.
    const prohibitedAssets = ['wall.stone01', 'water', 'lava'];

    const availableThemes = Themes.COMPREHENSIVE_THEMES.filter(theme => {
        // Kiểm tra xem ground hoặc obstacle có nằm trong danh sách cấm không
        return !prohibitedAssets.includes(theme.ground) && !prohibitedAssets.includes(theme.obstacle);
    });

    // Xử lý click ra ngoài để đóng danh sách
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsListOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [wrapperRef]);

    const selectedThemeName = `${selectedTheme.ground} / ${selectedTheme.obstacle}`;

    return (
        <div style={{ padding: '10px', position: 'relative' }} ref={wrapperRef}>
            <h4>Chọn Theme</h4>
            <button
                onClick={() => setIsListOpen(!isListOpen)}
                style={{
                    width: '100%',
                    padding: '8px 12px',
                    backgroundColor: '#3c3c41',
                    color: '#f0f0f0',
                    border: '1px solid #555',
                    borderRadius: '4px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '13px'
                }}
            >
                <span>{selectedThemeName}</span>
                <span style={{ transform: isListOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>▼</span>
            </button>
            {isListOpen && (
                <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: '10px',
                    right: '10px',
                    backgroundColor: '#3c3c41',
                    border: '1px solid #555',
                    borderRadius: '4px',
                    marginTop: '4px',
                    maxHeight: '250px',
                    overflowY: 'auto',
                    zIndex: 100
                }}>
                    {availableThemes.map((theme, index) => {
                        const themeName = `${theme.ground} / ${theme.obstacle}`;
                        const isSelected = theme.ground === selectedTheme.ground && theme.obstacle === selectedTheme.obstacle;
                        return (
                            <div
                                key={index}
                                onClick={() => {
                                    onSelectTheme(theme);
                                    setIsListOpen(false);
                                }}
                                style={{ padding: '10px 12px', cursor: 'pointer', backgroundColor: isSelected ? '#007bff' : 'transparent', fontSize: '13px' }}
                            >
                                {themeName}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default ThemeSelector;