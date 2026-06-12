import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot, getDocs, getDoc, setDoc, deleteDoc, doc, addDoc } from 'firebase/firestore';
import { PlusCircle, FileText, Trash2, Clock } from 'lucide-react';

const EssayDashboard = ({ user, onOpenEssay }) => {
  const [essays, setEssays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    if (!user) return;
    
    const q = query(collection(db, 'users', user.uid, 'essays'), orderBy('updatedAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      const filteredDocs = docs.filter(d => d.id !== 'current_draft' && d.id !== 'test_doc_diagnostic');
      
      setEssays(filteredDocs);
      setLoading(false);
      setErrorMsg(null);
    }, (error) => {
      console.error("Lỗi lấy danh sách bài viết:", error);
      setErrorMsg("Lỗi: " + error.message);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleCreateNew = async () => {
    // Generate a new empty doc in Firestore
    const newDoc = {
      topic: '',
      content: { intro: '', body: '', conclusion: '' },
      scores: { organization: 0, content: 0, vocabulary: 0, grammar: 0 },
      feedback: '',
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };
    try {
      const docRef = await addDoc(collection(db, 'users', user.uid, 'essays'), newDoc);
      onOpenEssay(docRef.id);
    } catch (e) {
      console.error("Error creating new essay", e);
      alert("Không thể tạo bài mới. Vui lòng thử lại.");
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation(); // prevent opening the essay
    if (window.confirm("Bạn có chắc chắn muốn xóa bài viết này không? Không thể khôi phục sau khi xóa.")) {
      try {
        await deleteDoc(doc(db, 'users', user.uid, 'essays', id));
      } catch (err) {
        console.error("Error deleting", err);
      }
    }
  };

  const calculateTotalScore = (scores) => {
    if (!scores) return 0;
    return (scores.organization || 0) + (scores.content || 0) + (scores.vocabulary || 0) + (scores.grammar || 0);
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Kho Bài Viết Của Tôi</h1>
        <button className="btn btn-primary" onClick={handleCreateNew}>
          <PlusCircle size={18} /> Viết bài mới
        </button>
      </div>

      {errorMsg ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'red' }}>Lỗi: {errorMsg}</div>
      ) : loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>Đang tải danh sách bài viết...</div>
      ) : essays.length === 0 ? (
        <div className="empty-state">
          <FileText size={48} color="var(--border-color)" />
          <p>Bạn chưa có bài viết nào trong kho.</p>
          <button className="btn btn-primary" onClick={handleCreateNew} style={{ marginTop: '1rem' }}>
            <PlusCircle size={18} /> Viết bài đầu tiên
          </button>
        </div>
      ) : (
        <div className="essays-grid">
          {essays.map(essay => {
            const date = new Date(essay.updatedAt).toLocaleDateString('vi-VN', {
              day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute:'2-digit'
            });
            const totalScore = calculateTotalScore(essay.scores);
            
            return (
              <div key={essay.id} className="essay-card" onClick={() => onOpenEssay(essay.id)}>
                <div className="essay-card-header">
                  <div className="essay-date">
                    <Clock size={14} /> {date}
                  </div>
                  <button className="btn-icon delete-btn" onClick={(e) => handleDelete(e, essay.id)} title="Xóa bài">
                    <Trash2 size={16} />
                  </button>
                </div>
                <h3 className="essay-topic">
                  {essay.topic ? essay.topic : <span className="untitled">Chưa nhập đề bài...</span>}
                </h3>
                <div className="essay-card-footer">
                  <div className="essay-score">
                    Điểm: <strong>{totalScore}/20</strong>
                  </div>
                  <div className="essay-status">
                    {essay.topic ? "Đang viết" : "Trống"}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default EssayDashboard;
