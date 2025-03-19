import React, { useState } from 'react';

function TokenGenerator() {
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const generateToken = async () => {
    setLoading(true);
    try {
      const response = await fetch('/account/generate-vscode-token', {
        method: 'POST',
        credentials: 'include'
      });
      
      if (!response.ok) throw new Error('Failed to generate token');
      
      const data = await response.json();
      setToken(data.token);
      setLoading(false);
    } catch (error) {
      console.error('Error:', error);
      setLoading(false);
    }
  };
  
  const copyToken = () => {
    navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  return (
    <div className="token-generator">
      <h3>VSCode Extension Integration</h3>
      <p>Generate a token to use with the Softcodes VSCode extension.</p>
      
      {!token ? (
        <button 
          onClick={generateToken} 
          disabled={loading}
          className="generate-btn"
        >
          {loading ? 'Generating...' : 'Generate VSCode Token'}
        </button>
      ) : (
        <div className="token-display">
          <p>Your token (valid for 90 days):</p>
          <div className="token-container">
            <input 
              type="text" 
              value={token} 
              readOnly 
              className="token-input"
            />
            <button onClick={copyToken} className="copy-btn">
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <div className="instructions">
            <h4>How to use this token:</h4>
            <ol>
              <li>Copy the token above</li>
              <li>Open VSCode with the Softcodes extension installed</li>
              <li>Click on the Softcodes icon in the status bar</li>
              <li>Paste the token when prompted</li>
              <li>You're now authenticated in the extension!</li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}

export default TokenGenerator;