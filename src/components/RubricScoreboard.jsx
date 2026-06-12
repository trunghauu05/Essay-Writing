import React from 'react';

const ScoreBar = ({ title, score }) => {
  const percentage = (score / 5) * 100;
  
  let color = 'var(--primary-color)';
  if (score < 2) color = 'var(--danger-color)';
  else if (score < 3.5) color = 'var(--warning-color)';
  else if (score >= 4) color = 'var(--success-color)';

  return (
    <div style={{ marginBottom: '1rem' }}>
      <div className="criterion-header">
        <span>{title}</span>
        <span style={{ fontWeight: 600, color }}>{score}/5</span>
      </div>
      <div className="score-bar-bg">
        <div 
          className="score-bar-fill" 
          style={{ width: `${percentage}%`, backgroundColor: color }}
        ></div>
      </div>
    </div>
  );
};

const RubricScoreboard = ({ scores, feedback }) => {
  const totalScore = (
    (scores.organization || 0) + 
    (scores.content || 0) + 
    (scores.vocabulary || 0) + 
    (scores.grammar || 0)
  );

  return (
    <div className="rubric-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2>Rubric Evaluation</h2>
        <div style={{ 
          backgroundColor: '#f1f5f9', 
          padding: '0.5rem 1rem', 
          borderRadius: '0.5rem',
          fontWeight: 'bold',
          color: 'var(--text-primary)'
        }}>
          Tổng: <span style={{ color: 'var(--primary-color)' }}>{totalScore.toFixed(1)}/20</span>
        </div>
      </div>
      
      <ScoreBar title="Organization (Bố cục)" score={scores.organization || 0} />
      <ScoreBar title="Content (Nội dung)" score={scores.content || 0} />
      <ScoreBar title="Vocabulary (Từ vựng)" score={scores.vocabulary || 0} />
      <ScoreBar title="Grammar (Ngữ pháp)" score={scores.grammar || 0} />

      {feedback && (
        <div className="feedback-text">
          <strong>Nhận xét & Gợi ý:</strong><br/>
          {feedback}
        </div>
      )}
    </div>
  );
};

export default RubricScoreboard;
