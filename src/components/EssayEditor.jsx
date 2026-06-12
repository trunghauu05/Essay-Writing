import { useState } from 'react';
import { gradeEssaySection } from '../api/ai';
import { Loader2, CheckCircle, CheckSquare } from 'lucide-react';

import TextareaAutosize from 'react-textarea-autosize';

const EditorBlock = ({ title, type, topic, value, onChange, onGrade, onAskAssistant }) => {
  const [isGrading, setIsGrading] = useState(false);

  const handleGrade = async () => {
    if (!value.trim()) return;
    setIsGrading(true);

    if (onAskAssistant) {
      onAskAssistant(`Hãy nhận xét và hướng dẫn tôi cách tối ưu đoạn ${title} sau đây để đạt điểm cao nhất:\n\n"${value}"`);
    }

    const result = await gradeEssaySection(topic, type, value);
    if (result) {
      onGrade(result);
    }
    setIsGrading(false);
  };

  return (
    <div className="card">
      <div className="section-header">
        <h2 className="section-title">{title}</h2>
        <button 
          className="btn btn-primary" 
          onClick={handleGrade}
          disabled={isGrading || !value.trim() || !topic.trim()}
          title={!topic.trim() ? "Vui lòng nhập Đề bài ở trên trước khi chấm" : ""}
        >
          {isGrading ? <><Loader2 className="animate-spin" size={16} /> Đang chấm...</> : <><CheckCircle size={16} /> Kiểm tra</>}
        </button>
      </div>
      <TextareaAutosize 
        className="input-field" 
        placeholder={`Viết phần ${title} của bạn tại đây...`}
        minRows={5}
        value={value}
        onChange={(e) => onChange(type, e.target.value)}
        style={{ resize: 'vertical' }}
      />
    </div>
  );
};

const EssayEditor = ({ topic, content, onUpdate, onGrade, onAskAssistant }) => {
  const [isGradingAll, setIsGradingAll] = useState(false);

  const handleGradeAll = async () => {
    const fullText = `
[Introduction]:
${content.intro}

[Body Paragraphs]:
${content.body}

[Conclusion]:
${content.conclusion}
    `;
    
    if (!fullText.trim() || fullText.trim().length < 20) {
      alert("Vui lòng viết bài trước khi chấm toàn bộ.");
      return;
    }
    
    setIsGradingAll(true);

    if (onAskAssistant) {
      onAskAssistant(`Hãy tổng hợp nhận xét toàn bộ bài viết hoàn chỉnh dưới đây và hướng dẫn tôi các điểm cần cải thiện:\n\n${fullText}`);
    }

    const result = await gradeEssaySection(topic, "Entire Complete Essay", fullText);
    if (result) {
      onGrade(result);
    }
    setIsGradingAll(false);
  };

  return (
    <div className="essay-editor-wrapper">
      <EditorBlock 
        title="Introduction (Mở bài)" 
        type="intro"
        topic={topic}
        value={content.intro}
        onChange={onUpdate}
        onGrade={onGrade}
        onAskAssistant={onAskAssistant}
      />
      <EditorBlock 
        title="Body Paragraphs (Thân bài)" 
        type="body"
        topic={topic}
        value={content.body}
        onChange={onUpdate}
        onGrade={onGrade}
        onAskAssistant={onAskAssistant}
      />
      <EditorBlock 
        title="Conclusion (Kết bài)" 
        type="conclusion"
        topic={topic}
        value={content.conclusion}
        onChange={onUpdate}
        onGrade={onGrade}
        onAskAssistant={onAskAssistant}
      />

      <div style={{ display: 'flex', justifyContent: 'center', margin: '2rem 0' }}>
        <button 
          className="btn btn-primary" 
          onClick={handleGradeAll}
          disabled={isGradingAll || !topic.trim()}
          style={{ padding: '0.75rem 2rem', fontSize: '1rem', backgroundColor: 'var(--success-color)' }}
        >
          {isGradingAll ? <><Loader2 className="animate-spin" size={20} /> Đang chấm toàn bộ bài...</> : <><CheckSquare size={20} /> CHẤM TOÀN BỘ BÀI VIẾT</>}
        </button>
      </div>
    </div>
  );
};

export default EssayEditor;
