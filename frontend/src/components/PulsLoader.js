import React from 'react';

const PulsLoader = () => (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    width: '100%',
  }}>
    <style>{`
      @keyframes puls-bounce {
        0%   { transform: scale(1); }
        6%   { transform: scaleY(1.25) scaleX(0.9); }
        12%  { transform: scaleY(0.9) scaleX(1.15); }
        18%  { transform: scaleY(1.08) scaleX(0.96); }
        24%  { transform: scale(1); }
        100% { transform: scale(1); }
      }
      .puls-loader-wrap {
        display: flex;
        font-size: 42px;
        font-weight: 700;
        color: #1db954;
        letter-spacing: -4px;
        font-family: "Arial Rounded MT Bold", "Trebuchet MS", Verdana, sans-serif;
      }
      .puls-loader-wrap span {
        display: inline-block;
        animation: puls-bounce 3s ease-in-out infinite;
      }
      .puls-loader-wrap span:nth-child(1) { animation-delay: 0s; }
      .puls-loader-wrap span:nth-child(2) { animation-delay: 0.25s; }
      .puls-loader-wrap span:nth-child(3) { animation-delay: 0.5s; }
      .puls-loader-wrap span:nth-child(4) { animation-delay: 0.75s; }
    `}</style>
    <div className="puls-loader-wrap">
      <span>P</span>
      <span>U</span>
      <span>L</span>
      <span>S</span>
    </div>
  </div>
);

export default PulsLoader;
