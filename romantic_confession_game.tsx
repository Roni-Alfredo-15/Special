import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc } from 'firebase/firestore';
import { Music, Sparkles, Mail, MailOpen, ArrowRight, Heart } from 'lucide-react';

// --- Firebase Initialization ---
let firebaseConfig = {};
try {
  if (typeof __firebase_config !== 'undefined') {
    firebaseConfig = JSON.parse(__firebase_config);
  }
} catch (e) {
  console.warn("Could not parse Firebase config.");
}

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-confession-app';

export default function App() {
  const [user, setUser] = useState(null);
  const [currentLevel, setCurrentLevel] = useState(0); 
  const [raccoonMsg, setRaccoonMsg] = useState("Hi there! Ready for a little adventure? ✨");
  const [raccoonAnim, setRaccoonAnim] = useState('animate-float');
  
  // Level 1: Hearts
  const [hearts, setHearts] = useState([]);
  const [heartsCollected, setHeartsCollected] = useState(0);
  
  // Level 2: Flower
  const [flowerClicks, setFlowerClicks] = useState(0);
  
  // Level 3: Letter
  const [isLetterOpen, setIsLetterOpen] = useState(false);
  
  // Level 4: Lanterns
  const [lanterns, setLanterns] = useState([false, false, false]);

  // Level 5: Confession
  const [noBtnPos, setNoBtnPos] = useState({ top: '50%', left: '75%' });
  const [isNoMoving, setIsNoMoving] = useState(false);

  // --- Audio Track ---
  // Using a hidden YouTube iframe for "Best Part" by Daniel Caesar
  const youtubeVideoId = "vGJTaP6anOU";

  // --- Firebase Auth ---
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Auth error:", error);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // --- Dynamic Raccoon Messages ---
  const updateDefaultRaccoonMsg = (level) => {
    switch(level) {
      case 1: setRaccoonMsg("Catch 5 hearts to start our journey! 💕"); break;
      case 2: setRaccoonMsg("Our love is growing! Tap to water the seedling! 🌱"); break;
      case 3: setRaccoonMsg("Ooh, a secret letter just for you! Open it! 💌"); break;
      case 4: setRaccoonMsg("Light all 3 lanterns to show the way to my heart. 🏮"); break;
      case 5: setRaccoonMsg("This is it... listen to your heart! ❤️"); break;
      case 6: setRaccoonMsg("Yay! Best day ever! ❤️"); break;
      default: setRaccoonMsg("Hi there! Ready for a little adventure? ✨"); break;
    }
  };

  useEffect(() => {
    updateDefaultRaccoonMsg(currentLevel);
    if (currentLevel === 6) {
      setRaccoonAnim('animate-raccoon-bounce-infinite');
    } else {
      setRaccoonAnim('animate-float');
    }
  }, [currentLevel]);

  const triggerRaccoonReaction = (msg, anim, duration = 1500) => {
    setRaccoonMsg(msg);
    setRaccoonAnim(anim);
    
    // Don't reset if it's the final level animation or if it's currently panicking continuously
    if (anim !== 'animate-raccoon-panic' && currentLevel !== 6) {
      setTimeout(() => {
        updateDefaultRaccoonMsg(currentLevel);
        setRaccoonAnim('animate-float');
      }, duration);
    }
  };

  // --- Level 1 Setup ---
  useEffect(() => {
    if (currentLevel === 1) {
      const initialHearts = Array.from({ length: 5 }).map((_, i) => ({
        id: i,
        top: `${Math.floor(Math.random() * 60 + 15)}%`, // Safe bounds for mobile
        left: `${Math.floor(Math.random() * 70 + 10)}%`,
        collected: false
      }));
      setHearts(initialHearts);
    }
  }, [currentLevel]);

  // --- Start Game & Audio ---
  const startGame = () => {
    setCurrentLevel(1);
    // The hidden YouTube iframe will render and auto-play now that the user has interacted
  };

  // --- Level Handlers ---
  const collectHeart = (id) => {
    triggerRaccoonReaction("Got one! 💕", "animate-raccoon-jump", 800);
    setHearts(prev => prev.map(h => h.id === id ? { ...h, collected: true } : h));
    setHeartsCollected(prev => {
        const newCount = prev + 1;
        if (newCount === 5) setTimeout(() => setCurrentLevel(2), 1000);
        return newCount;
    });
  };

  const handleFlowerClick = () => {
    const nextStage = flowerClicks + 1;
    setFlowerClicks(nextStage);
    triggerRaccoonReaction("It's growing! 🌱", "animate-raccoon-bounce", 1000);
    if (nextStage === 4) {
      triggerRaccoonReaction("It bloomed beautifully! 🌸", "animate-raccoon-jump", 2000);
      setTimeout(() => setCurrentLevel(3), 2000);
    }
  };

  const toggleLantern = (index) => {
    const newLanterns = [...lanterns];
    newLanterns[index] = true;
    setLanterns(newLanterns);
    triggerRaccoonReaction("So bright! ✨", "animate-raccoon-jump", 1000);
    if (newLanterns.every(l => l === true)) {
      triggerRaccoonReaction("It's so bright now! Let's go to the final step! ✨", "animate-raccoon-bounce", 2000);
      setTimeout(() => setCurrentLevel(5), 2000);
    }
  };

  const moveNoButton = (e) => {
    if(e) e.preventDefault();
    triggerRaccoonReaction("Nooo! Please don't click that! 😭", "animate-raccoon-panic", 2000);
    
    const newTop = `${Math.floor(Math.random() * 60 + 20)}%`; // Keep in middle vertically
    const newLeft = `${Math.floor(Math.random() * 60 + 20)}%`; // Keep in middle horizontally
    setNoBtnPos({ top: newTop, left: newLeft });
    setIsNoMoving(true);
    
    // Reset panic if they stop chasing the button
    setTimeout(() => {
      if (currentLevel === 5) {
        updateDefaultRaccoonMsg(5);
        setRaccoonAnim('animate-float');
      }
    }, 2500);
  };

  const handleYes = async () => {
    if (!user) return;
    try {
      const confessionsRef = collection(db, 'artifacts', appId, 'public', 'data', 'confessions');
      await addDoc(confessionsRef, { answer: 'Yes', timestamp: new Date().toISOString() });
      setCurrentLevel(6); 
    } catch (error) {
      console.error("Error saving confession:", error);
      setCurrentLevel(6); // Allow proceeding even if db fails
    }
  };

  // --- Rendering Helpers ---
  const renderParticles = () => (
    <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-40">
      {Array.from({ length: 20 }).map((_, i) => (
        <div key={i} className="absolute text-pink-300 animate-float"
             style={{
               top: `${Math.random() * 100}%`, left: `${Math.random() * 100}%`,
               fontSize: `${Math.random() * 15 + 10}px`, animationDelay: `${Math.random() * 5}s`,
               animationDuration: `${Math.random() * 3 + 3}s`
             }}>
          {i % 2 === 0 ? '✨' : '💖'}
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-red-50 to-pink-100 text-slate-800 font-sans relative overflow-hidden flex flex-col items-center justify-center select-none font-['Comic_Sans_MS',_cursive,sans-serif]">
      
      {/* Global Styles */}
      <style>{`
        @keyframes float { 0%, 100% { transform: translateY(0) scale(1); } 50% { transform: translateY(-15px) scale(1.1); } }
        @keyframes sway { 0%, 100% { transform: rotate(-5deg); } 50% { transform: rotate(5deg); } }
        @keyframes pop { 0% { transform: scale(0.8); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
        @keyframes raccoon-jump { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-40px) scale(1.1); } }
        @keyframes raccoon-panic { 0%, 100% { transform: translateX(0) rotate(0); } 25% { transform: translateX(-15px) rotate(-15deg) scale(1.2); } 75% { transform: translateX(15px) rotate(15deg) scale(1.2); } }
        @keyframes raccoon-bounce { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.3) translateY(-15px); } }
        .animate-float { animation: float 4s ease-in-out infinite; }
        .animate-sway { animation: sway 3s ease-in-out infinite; }
        .animate-pop { animation: pop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
        .animate-raccoon-jump { animation: raccoon-jump 0.5s ease-in-out forwards; }
        .animate-raccoon-panic { animation: raccoon-panic 0.3s infinite; }
        .animate-raccoon-bounce { animation: raccoon-bounce 0.6s ease-in-out forwards; }
        .animate-raccoon-bounce-infinite { animation: raccoon-bounce 1s ease-in-out infinite; }
        .touch-action-none { touch-action: none; }
      `}</style>

      {/* Audio Setup - Hidden YouTube Iframe */}
      {currentLevel > 0 && (
        <iframe
          width="1"
          height="1"
          src={`https://www.youtube.com/embed/${youtubeVideoId}?autoplay=1&loop=1&playlist=${youtubeVideoId}`}
          frameBorder="0"
          allow="autoplay; encrypted-media"
          style={{ position: 'absolute', top: '-9999px', left: '-9999px' }}
          title="Background Music"
        ></iframe>
      )}

      {/* Interactive Mascot (Always present after start) */}
      {currentLevel > 0 && (
        <div className="fixed bottom-4 md:bottom-10 right-4 md:right-10 z-50 flex flex-col items-end max-w-[80vw]">
          <div className="bg-white px-4 py-3 rounded-2xl rounded-br-none shadow-xl border border-pink-200 mb-2 animate-pop relative">
            <p className="text-sm md:text-base font-semibold text-pink-600 text-right">{raccoonMsg}</p>
            <div className="absolute -bottom-2 right-4 w-4 h-4 bg-white border-b border-r border-pink-200 transform rotate-45"></div>
          </div>
          <div 
            onClick={() => triggerRaccoonReaction("Hey! Stop poking me and play! 😆", "animate-raccoon-bounce", 1500)}
            className={`text-5xl md:text-6xl drop-shadow-xl hover:scale-110 transition-transform cursor-pointer ${raccoonAnim}`}
          >
            🦝
          </div>
        </div>
      )}

      {renderParticles()}

      {/* Main Content Area */}
      <div className="w-full max-w-2xl px-4 z-10 flex flex-col items-center justify-center min-h-[70vh]">
        
        {/* LEVEL 0: START */}
        {currentLevel === 0 && (
          <div className="text-center animate-pop flex flex-col items-center">
            <div className="text-8xl mb-6 animate-float drop-shadow-xl">🦝</div>
            <h1 className="text-3xl md:text-5xl font-bold text-pink-500 mb-4 drop-shadow-sm">
              Hello there...
            </h1>
            <p className="text-lg md:text-xl text-pink-400 mb-8 max-w-md">
              I made a little something for you. Turn on your sound for the best experience! ✨
            </p>
            <button onClick={startGame} className="group flex items-center gap-2 px-8 py-4 bg-pink-500 text-white rounded-full font-bold text-lg shadow-lg hover:bg-pink-600 hover:shadow-xl hover:-translate-y-1 transition-all">
              Start Journey <Sparkles className="w-5 h-5 group-hover:animate-spin" />
            </button>
          </div>
        )}

        {/* LEVEL 1: HEARTS */}
        {currentLevel === 1 && (
          <div className="w-full h-[60vh] relative border-4 border-white/50 rounded-3xl bg-white/30 backdrop-blur-sm shadow-xl p-4">
            <div className="absolute top-4 left-0 w-full text-center text-pink-600 font-bold text-xl drop-shadow-md">
              Level 1: The Adventure ({heartsCollected}/5)
            </div>
            {hearts.map((heart) => (
              !heart.collected && (
                <button
                  key={heart.id}
                  onClick={() => collectHeart(heart.id)}
                  className="absolute text-5xl md:text-6xl animate-float cursor-pointer hover:scale-125 transition-transform touch-manipulation drop-shadow-md"
                  style={{ top: heart.top, left: heart.left, animationDelay: `${heart.id * 0.2}s` }}
                >
                  ❤️
                </button>
              )
            ))}
          </div>
        )}

        {/* LEVEL 2: FLOWER */}
        {currentLevel === 2 && (
          <div className="text-center flex flex-col items-center justify-center animate-pop">
            <h2 className="text-2xl md:text-3xl font-bold text-pink-500 mb-8">Level 2: Growing Closer</h2>
            <button 
              onClick={flowerClicks < 4 ? handleFlowerClick : undefined}
              className={`transition-all duration-300 touch-manipulation ${flowerClicks < 4 ? 'hover:scale-110 active:scale-95 cursor-pointer' : 'animate-sway cursor-default'}`}
            >
              {flowerClicks === 0 && <div className="text-7xl md:text-9xl">🌱</div>}
              {flowerClicks === 1 && <div className="text-7xl md:text-9xl">🌿</div>}
              {flowerClicks === 2 && <div className="text-7xl md:text-9xl">🌷</div>}
              {flowerClicks >= 3 && <div className="text-8xl md:text-[10rem] animate-pop">🌸</div>}
            </button>
            <div className="mt-8 flex gap-2">
              {[0, 1, 2, 3].map(step => (
                <div key={step} className={`h-2 w-8 rounded-full ${flowerClicks >= step ? 'bg-pink-500' : 'bg-pink-200'}`} />
              ))}
            </div>
          </div>
        )}

        {/* LEVEL 3: LETTER */}
        {currentLevel === 3 && (
          <div className="text-center flex flex-col items-center animate-pop w-full">
            <h2 className="text-2xl md:text-3xl font-bold text-pink-500 mb-8">Level 3: A Little Secret</h2>
            
            <div className="relative w-full max-w-sm aspect-square flex items-center justify-center">
              {!isLetterOpen ? (
                <button 
                  onClick={() => {
                    setIsLetterOpen(true);
                    triggerRaccoonReaction("Awww, read it carefully! 🥰", "animate-raccoon-bounce", 2000);
                  }} 
                  onMouseEnter={() => triggerRaccoonReaction("Ooo, open it! 💌", "animate-raccoon-jump", 1500)}
                  className="animate-float hover:scale-110 transition-transform"
                >
                  <Mail className="w-32 h-32 md:w-48 md:h-48 text-pink-400 drop-shadow-xl" strokeWidth={1.5} />
                </button>
              ) : (
                <div className="bg-white p-6 md:p-8 rounded-2xl shadow-2xl border-2 border-pink-100 animate-pop transform rotate-1 w-full">
                  <MailOpen className="w-12 h-12 text-pink-400 mx-auto mb-4" />
                  <p className="text-lg md:text-xl text-slate-700 font-medium italic mb-6">
                    "I've been holding onto these feelings for a while now, waiting for the perfect moment..."
                  </p>
                  <button onClick={() => setCurrentLevel(4)} className="w-full py-3 bg-pink-500 text-white rounded-full font-bold shadow hover:bg-pink-600 transition-colors flex items-center justify-center gap-2">
                    Next <ArrowRight size={18} />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* LEVEL 4: LANTERNS */}
        {currentLevel === 4 && (
          <div className="text-center flex flex-col items-center animate-pop w-full">
            <h2 className="text-2xl md:text-3xl font-bold text-pink-500 mb-12">Level 4: Lighting the Way</h2>
            <div className="flex justify-center gap-6 md:gap-12 mb-8">
              {lanterns.map((isLit, index) => (
                <button 
                  key={index} 
                  onClick={() => toggleLantern(index)}
                  className={`text-6xl md:text-8xl transition-all duration-500 hover:scale-110 ${isLit ? 'animate-sway drop-shadow-[0_0_20px_rgba(251,191,36,0.8)]' : 'opacity-50 grayscale'}`}
                >
                  {isLit ? '🏮' : '🏮'}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* LEVEL 5: CONFESSION */}
        {currentLevel === 5 && (
          <div className="w-full flex flex-col items-center justify-center p-6 bg-white/80 rounded-3xl shadow-2xl backdrop-blur-md border border-pink-200 animate-pop relative min-h-[400px]">
            <h2 className="text-xl md:text-2xl font-bold text-pink-600 mb-8 uppercase tracking-widest">Just for You</h2>
            
            <p className="text-2xl md:text-4xl font-extrabold text-slate-800 mb-12 leading-tight text-center">
              Do I have a chance to win your heart? <br/> Will you be mine?
            </p>

            <div className="relative w-full h-40 flex justify-center items-center">
              {/* YES BUTTON - Always center/left-ish */}
              <button 
                onClick={handleYes}
                className="absolute md:left-[35%] px-10 py-4 bg-green-500 hover:bg-green-600 text-white font-bold rounded-full shadow-[0_10px_20px_rgba(34,197,94,0.3)] transform transition-transform hover:scale-110 active:scale-95 text-xl z-20"
              >
                Yes! 😍
              </button>

              {/* NO BUTTON - The Runaway */}
              <button 
                onMouseEnter={moveNoButton}
                onTouchStart={moveNoButton}
                style={{
                  position: isNoMoving ? 'fixed' : 'absolute',
                  top: isNoMoving ? noBtnPos.top : 'auto',
                  left: isNoMoving ? noBtnPos.left : 'auto',
                  right: isNoMoving ? 'auto' : '10%',
                  transform: isNoMoving ? 'translate(-50%, -50%)' : 'translateX(0)',
                  transition: 'all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
                }}
                className="touch-action-none px-10 py-4 bg-slate-300 text-slate-600 font-bold rounded-full shadow-md text-xl z-50 cursor-not-allowed border-2 border-transparent"
              >
                No 😢
              </button>
            </div>
          </div>
        )}

        {/* LEVEL 6: SUCCESS */}
        {currentLevel === 6 && (
          <div className="w-full text-center animate-pop flex flex-col items-center bg-white p-8 md:p-12 rounded-3xl shadow-2xl border-4 border-pink-200">
            <div className="text-7xl md:text-9xl mb-6 animate-sway">👩‍❤️‍👨</div>
            <h1 className="text-3xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-red-500 mb-6 leading-tight">
              YAY! It's Official! ❤️
            </h1>
            <p className="text-lg md:text-2xl text-pink-600 font-medium">
              Thank you for saying yes! You just made me the happiest person (and raccoon) in the world!
            </p>
          </div>
        )}

      </div>
    </div>
  );
}