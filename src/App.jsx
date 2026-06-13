import { useState, useEffect, useRef } from 'react';
import { db, auth } from './firebase';
import { doc, setDoc, getDoc, collection, writeBatch } from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import EssayEditor from './components/EssayEditor';
import ChatAssistant from './components/ChatAssistant';
import Auth from './components/Auth';
import EssayDashboard from './components/EssayDashboard';
import { LogOut, Play, ChevronLeft, Lock, Unlock } from 'lucide-react';
import Split from 'react-split';
import TextareaAutosize from 'react-textarea-autosize';
import './index.css';

function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard' | 'editor'
  const [currentEssayId, setCurrentEssayId] = useState(null);
  
  const chatAssistantRef = useRef(null);

  const handleAskAssistant = (message) => {
    if (chatAssistantRef.current) {
      chatAssistantRef.current.sendMessage(message);
    }
  };

  const [topic, setTopic] = useState('');
  const [isTopicLocked, setIsTopicLocked] = useState(false);
  
  const [content, setContent] = useState({ intro: '', body: '', conclusion: '' });
  const [scores, setScores] = useState({ organization: 0, content: 0, vocabulary: 0, grammar: 0 });
  const [feedback, setFeedback] = useState('');
  const [chatHistory, setChatHistory] = useState([
    { role: 'ai', text: 'Chào bạn! Mình là trợ lý AI. Mình sẽ theo dõi chủ đề bạn viết và gợi ý từ vựng đơn giản, dễ nhớ nhất khi bạn cần. Bạn muốn hỏi gì nào?' }
  ]);
  const [saveStatus, setSaveStatus] = useState('Đã đồng bộ');

  // Handle Authentication State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Migrate old 'current_draft' to the new structure
  useEffect(() => {
    if (!user) return;
    // Tạm thời vô hiệu hóa đoạn code migrate dữ liệu cũ 
    // vì Firestore có thể đang bị nghẽn nếu lệnh setDoc/writeBatch bị treo.
  }, [user]);

  // Load selected essay from Firebase
  useEffect(() => {
    if (!user || !currentEssayId) return;
    
    const loadEssay = async () => {
      setSaveStatus('Đang tải...');
      try {
        const docRef = doc(db, 'users', user.uid, 'essays', currentEssayId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setTopic(data.topic || '');
          setIsTopicLocked(!!data.topic); 
          setContent(data.content || { intro: '', body: '', conclusion: '' });
          setScores(data.scores || { organization: 0, content: 0, vocabulary: 0, grammar: 0 });
          setFeedback(data.feedback || '');
          setChatHistory(data.chatHistory || [{ role: 'ai', text: 'Chào bạn! Mình là trợ lý AI. Mình sẽ theo dõi chủ đề bạn viết và gợi ý từ vựng đơn giản, dễ nhớ nhất khi bạn cần. Bạn muốn hỏi gì nào?' }]);
          setSaveStatus('Đã đồng bộ');
        }
      } catch (e) {
        console.error("Error loading essay:", e);
        setSaveStatus('Lỗi tải bài');
      }
    };
    loadEssay();
  }, [user, currentEssayId]);

  // Auto-save logic (5s debounce)
  const timerRef = useRef(null);
  
  useEffect(() => {
    if (!user || !currentEssayId) return;
    if (!topic && !content.intro && !content.body && !content.conclusion && chatHistory.length === 1) return;
    
    setSaveStatus('Đang lưu nháp...');
    if (timerRef.current) clearTimeout(timerRef.current);
    
    timerRef.current = setTimeout(async () => {
      try {
        const docRef = doc(db, 'users', user.uid, 'essays', currentEssayId);
        await setDoc(docRef, {
          topic,
          content,
          scores,
          feedback,
          chatHistory,
          updatedAt: new Date().toISOString()
        }, { merge: true });
        setSaveStatus('Đã lưu (Vừa xong)');
      } catch (e) {
        console.error("Auto-save failed", e);
        setSaveStatus('Lỗi lưu nháp');
      }
    }, 5000);
    return () => clearTimeout(timerRef.current);
  }, [topic, content, scores, feedback, chatHistory, user, currentEssayId]);

  const handleUpdateContent = (section, text) => {
    setContent(prev => ({ ...prev, [section]: text }));
  };

  const handleGradingResult = (result) => {
    if (result && result.error) {
      alert(result.error);
    } else if (result && result.scores) {
      setScores(result.scores);
      setFeedback(result.feedback);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.error("Lỗi đăng xuất", e);
    }
  };

  const openEssay = (id) => {
    setCurrentEssayId(id);
    setCurrentView('editor');
  };

  const closeEssay = () => {
    setCurrentEssayId(null);
    setCurrentView('dashboard');
  };

  if (authLoading) {
    return <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>Đang tải...</div>;
  }

  if (!user) {
    return <Auth />;
  }

  if (currentView === 'dashboard') {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '1rem 2rem', borderBottom: '1px solid var(--border-color)', backgroundColor: 'white' }}>
          <button className="btn" onClick={handleLogout} style={{ backgroundColor: '#f1f5f9', color: 'var(--text-primary)', padding: '0.4rem 0.8rem' }}>
            <LogOut size={16} /> Đăng xuất
          </button>
        </div>
        <EssayDashboard user={user} onOpenEssay={openEssay} />
      </div>
    );
  }

  return (
    <div className="app-container">
      <Split 
        sizes={[65, 35]} 
        minSize={[400, 250]} 
        gutterSize={8}
        direction="horizontal" 
        className="split-horizontal"
      >
        <div className="left-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button className="btn" onClick={closeEssay} style={{ padding: '0.4rem 0.8rem' }}>
                <ChevronLeft size={16} /> Kho bài
              </button>
              <h1 style={{ fontSize: '1.25rem', margin: 0 }}>Essay Writing Practice</h1>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
              <div className="draft-status">
                <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: saveStatus.includes('Lỗi') ? 'red' : saveStatus.includes('Đang') ? 'orange' : 'green' }}></span>
                {saveStatus}
              </div>
            </div>
          </div>

          <div className="card">
            <label className="section-title" style={{ display: 'block', marginBottom: '0.5rem' }}>Writing Topic (Đề bài)</label>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
              <TextareaAutosize 
                className="input-field" 
                placeholder="Ví dụ: The spread of Western fast food chains..." 
                value={topic}
                minRows={1}
                onChange={(e) => setTopic(e.target.value)}
                disabled={isTopicLocked}
                style={{ backgroundColor: isTopicLocked ? '#f8fafc' : '#fff', resize: 'none' }}
              />
              {!isTopicLocked ? (
                <button 
                  className="btn btn-primary" 
                  onClick={() => topic.trim() && setIsTopicLocked(true)}
                  disabled={!topic.trim()}
                  style={{ padding: '0 1.5rem', whiteSpace: 'nowrap', height: '42px' }}
                >
                  <Lock size={16} /> Khóa đề
                </button>
              ) : (
                <button 
                  className="btn" 
                  onClick={() => setIsTopicLocked(false)}
                  style={{ border: '1px solid var(--border-color)', padding: '0 1.5rem', whiteSpace: 'nowrap', height: '42px' }}
                >
                  <Unlock size={16} /> Sửa đề
                </button>
              )}
            </div>
          </div>

          {isTopicLocked ? (
            <EssayEditor 
              topic={topic}
              content={content}
              onUpdate={handleUpdateContent}
              onGrade={handleGradingResult}
              onAskAssistant={handleAskAssistant}
            />
          ) : (
            <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-secondary)' }}>
              {topic.trim() ? "Nhấn 'Khóa đề' để bắt đầu viết bài." : "Vui lòng nhập Đề bài và nhấn 'Khóa đề' để viết bài."}
            </div>
          )}
        </div>

        <div className="right-panel">
          {isTopicLocked ? (
              <div className="chat-container" style={{ height: '100%' }}>
                <ChatAssistant 
                  ref={chatAssistantRef}
                  topic={topic} 
                  currentContent={content} 
                  chatHistory={chatHistory}
                  setChatHistory={setChatHistory}
                />
              </div>
          ) : (
            <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
              Chờ nạp đề bài...
            </div>
          )}
        </div>
      </Split>
    </div>
  );
}

export default App;
