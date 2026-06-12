import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { suggestVocabulary } from '../api/ai';
import { Send, Bot, Trash2 } from 'lucide-react';
import { marked } from 'marked';

const ChatAssistant = forwardRef(({ topic, currentContent, chatHistory, setChatHistory }, ref) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatHistory]);

  const processMessage = async (userMsg) => {
    const historyToSend = [...chatHistory];
    
    setChatHistory(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsLoading(true);

    const contextText = `Intro: ${currentContent.intro}\nBody: ${currentContent.body}\nConclusion: ${currentContent.conclusion}`;
    
    const responseText = await suggestVocabulary(topic || 'Chưa có chủ đề', contextText, userMsg, historyToSend);
    
    setChatHistory(prev => [...prev, { role: 'ai', text: responseText }]);
    setIsLoading(false);
  };

  useImperativeHandle(ref, () => ({
    sendMessage: (msg) => {
      if (!isLoading) {
        processMessage(msg);
      }
    }
  }));

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    const userMsg = input.trim();
    setInput('');
    processMessage(userMsg);
  };

  const handleClearChat = () => {
    setChatHistory([{ role: 'ai', text: 'Chào bạn! Mình là trợ lý AI đến từ Google đây. Mình có thể giúp gì cho bài Essay của bạn hôm nay?' }]);
    setShowConfirmModal(false);
  };

  return (
    <div className="chat-container" style={{ position: 'relative' }}>
      <div className="chat-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Bot color="var(--primary-color)" /> Assistant (Gợi ý từ vựng)
        </div>
        <button 
          onClick={() => setShowConfirmModal(true)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
          title="Xóa lịch sử trò chuyện"
        >
          <Trash2 size={20} />
        </button>
      </div>
      
      <div className="chat-messages" ref={scrollRef}>
        {chatHistory.map((msg, idx) => (
          <div key={idx} className={`message ${msg.role === 'ai' ? 'msg-ai' : 'msg-user'}`}>
            {msg.role === 'ai' ? (
              <div 
                className="markdown-content" 
                dangerouslySetInnerHTML={{ __html: marked.parse(msg.text) }} 
              />
            ) : (
              <div style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="message msg-ai">
            <span className="animate-pulse">Đang suy nghĩ...</span>
          </div>
        )}
      </div>

      <div className="chat-input-area">
        <input 
          type="text" 
          className="input-field" 
          placeholder="Ví dụ: Cho mình từ đồng nghĩa với 'important'..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
        />
        <button 
          className="btn btn-primary" 
          onClick={handleSend}
          disabled={isLoading || !input.trim()}
          style={{ padding: '0 1rem' }}
        >
          <Send size={18} />
        </button>
      </div>

      {showConfirmModal && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 10, borderRadius: '1rem'
        }}>
          <div style={{
            background: 'var(--surface-color)', padding: '1.5rem', borderRadius: '1rem',
            textAlign: 'center', width: '80%', maxWidth: '300px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
          }}>
            <h4 style={{ margin: '0 0 1rem 0' }}>Xóa lịch sử chat?</h4>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              Thao tác này sẽ xóa toàn bộ nội dung trò chuyện cũ để làm nhẹ trang web. Bạn có chắc chắn không?
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button 
                className="btn" 
                onClick={() => setShowConfirmModal(false)}
                style={{ background: 'var(--bg-color)', color: 'var(--text-color)' }}
              >
                Hủy
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handleClearChat}
                style={{ background: '#ef4444' }}
              >
                Xóa ngay
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

ChatAssistant.displayName = 'ChatAssistant';

export default ChatAssistant;
