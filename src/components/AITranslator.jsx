import { useState } from 'react';
import { Bot, ArrowRight, CheckCircle2, Languages } from 'lucide-react';
import { getGenAI, MODELS_TO_TRY } from '../api/ai';

export default function AITranslator() {
  const [sourceText, setSourceText] = useState('');
  const [targetText, setTargetText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState('vi-en'); // vi-en or en-vi

  const handleTranslate = async () => {
    if (!sourceText.trim()) return;
    setIsLoading(true);
    setTargetText('Đang xử lý...');

    try {
      const genAI = getGenAI();
      if (!genAI) throw new Error("Lỗi cấu hình AI");

      let prompt = '';
      if (mode === 'vi-en') {
        prompt = `Bạn là một công cụ dịch thuật chính xác tuyệt đối như Cambridge Dictionary. Hãy dịch đoạn văn tiếng Việt sau sang tiếng Anh: Dịch bám sát SÁT NGHĨA từng câu chữ, đúng ngữ pháp chuẩn xác nhưng KHÔNG tự ý phóng tác, KHÔNG tự làm cho câu văn màu mè hay học thuật hóa nếu văn bản gốc không có. Dịch đúng ngữ nghĩa nguyên câu một cách chân thực nhất:\n\n"${sourceText}"\n\nCHỈ TRẢ VỀ ĐOẠN VĂN ĐÃ DỊCH, KHÔNG GIẢI THÍCH.`;
      } else {
        prompt = `Bạn là một công cụ dịch thuật chính xác tuyệt đối như Cambridge Dictionary. Hãy dịch đoạn văn tiếng Anh sau sang tiếng Việt: Dịch bám sát SÁT NGHĨA đen của từng từ và nguyên câu, giữ nguyên giọng văn gốc, không tự ý thêm thắt. NẾU đoạn tiếng Anh gốc bị sai ngữ pháp cơ bản, hãy âm thầm tự hiểu ý người viết để dịch cho đúng nghĩa, sau đó GHI CHÚ lỗi sai đó ở cuối cùng để người dùng học hỏi:\n\n"${sourceText}"\n\nCHỈ TRẢ VỀ ĐOẠN VĂN ĐÃ DỊCH (KÈM GHI CHÚ LỖI NẾU CÓ), KHÔNG GIẢI THÍCH GÌ THÊM.`;
      }

      let translated = "Hệ thống AI hiện đang quá tải. Vui lòng đợi 15-30 giây rồi thử lại nhé.";
      for (const modelName of MODELS_TO_TRY) {
        try {
          const model = genAI.getGenerativeModel({ model: modelName });
          const result = await model.generateContent(prompt);
          translated = result.response.text();
          break; // success
        } catch (err) {
          const errMsg = err.message.toLowerCase();
          if (errMsg.includes("429") || errMsg.includes("quota")) {
            translated = "Bạn đang thao tác quá nhanh! Vui lòng đợi khoảng 30 giây rồi thử lại nhé.";
            break; // Stop trying other models if rate limited
          }
          if (!errMsg.includes("503") && !errMsg.includes("high demand") && !errMsg.includes("overloaded")) {
            throw err;
          }
        }
      }

      setTargetText(translated);
    } catch (error) {
      console.error(error);
      setTargetText("Lỗi không mong muốn: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column', 
      backgroundColor: '#f8fafc',
      borderRadius: '0.5rem',
      border: '1px solid var(--border-color)',
      overflow: 'hidden'
    }}>
      <div style={{ 
        padding: '0.75rem 1rem', 
        backgroundColor: 'white', 
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, color: 'var(--primary-color)' }}>
          <Languages size={18} /> Trình Dịch & Sửa Lỗi AI
        </div>
        
        <div style={{ display: 'flex', backgroundColor: '#f1f5f9', borderRadius: '0.5rem', padding: '0.25rem' }}>
          <button 
            onClick={() => setMode('vi-en')}
            style={{ 
              padding: '0.25rem 0.75rem', 
              fontSize: '0.85rem', 
              border: 'none', 
              borderRadius: '0.25rem',
              backgroundColor: mode === 'vi-en' ? 'white' : 'transparent',
              boxShadow: mode === 'vi-en' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
              cursor: 'pointer',
              fontWeight: mode === 'vi-en' ? 600 : 400
            }}
          >
            Việt ➔ Anh
          </button>
          <button 
            onClick={() => setMode('en-vi')}
            style={{ 
              padding: '0.25rem 0.75rem', 
              fontSize: '0.85rem', 
              border: 'none', 
              borderRadius: '0.25rem',
              backgroundColor: mode === 'en-vi' ? 'white' : 'transparent',
              boxShadow: mode === 'en-vi' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
              cursor: 'pointer',
              fontWeight: mode === 'en-vi' ? 600 : 400
            }}
          >
            Anh ➔ Việt
          </button>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '1rem', gap: '1rem' }}>
        <textarea 
          placeholder={mode === 'vi-en' ? "Nhập văn bản tiếng Việt cần dịch sang tiếng Anh học thuật..." : "Nhập văn bản tiếng Anh cần dịch và kiểm tra ngữ pháp..."}
          value={sourceText}
          onChange={(e) => setSourceText(e.target.value)}
          style={{
            flex: 1,
            resize: 'none',
            padding: '0.75rem',
            border: '1px solid var(--border-color)',
            borderRadius: '0.5rem',
            fontSize: '0.95rem',
            fontFamily: 'inherit'
          }}
        />
        
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <button 
            className="btn btn-primary"
            onClick={handleTranslate}
            disabled={!sourceText.trim() || isLoading}
            style={{ borderRadius: '2rem', padding: '0.5rem 1.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}
          >
            {isLoading ? <span className="animate-pulse">Đang dịch...</span> : <>Dịch văn bản <ArrowRight size={16} /></>}
          </button>
        </div>

        <div style={{
          flex: 1,
          padding: '0.75rem',
          backgroundColor: 'white',
          border: '1px solid var(--border-color)',
          borderRadius: '0.5rem',
          fontSize: '0.95rem',
          overflowY: 'auto',
          whiteSpace: 'pre-wrap',
          color: targetText ? 'var(--text-color)' : 'var(--text-secondary)'
        }}>
          {targetText || "Kết quả dịch sẽ hiển thị ở đây..."}
        </div>
      </div>
    </div>
  );
}
