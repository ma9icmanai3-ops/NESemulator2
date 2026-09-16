/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, useParams } from 'react-router-dom';
import { Gamepad2, Maximize, Minimize } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { io, Socket } from 'socket.io-client';
import { DriveGameSelector } from './components/DriveGameSelector';
import { Emulator } from './components/Emulator';
import { ControllerOverlay } from './components/ControllerOverlay';

const ControllerView = ({ socket }: { socket: Socket | null }) => {
  const { sessionId: urlSessionId, playerId: urlPlayerId } = useParams();
  const [code, setCode] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(urlSessionId || null);
  const [playerId, setPlayerId] = useState<string>(urlPlayerId || '1');
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (urlSessionId) {
      setSessionId(urlSessionId);
    }
    if (urlPlayerId) {
      setPlayerId(urlPlayerId);
    }
  }, [urlSessionId, urlPlayerId]);

  useEffect(() => {
    if (!socket) return;

    const onCodeVerified = (data: { sessionId: string }) => {
        console.log("Code verified, session:", data.sessionId);
        setSessionId(data.sessionId);
        setError(null);
    };

    const onCodeError = (data: { message: string }) => {
        console.log("Code error:", data.message);
        setError(data.message || "Invalid code");
        setCode('');
    };

    const onConnectError = (err: any) => {
        console.error('Socket connection error:', err);
        setError(`Connection failed: ${err.message}`);
    };

    const onConnected = (data: any) => {
        console.log("Connected to game session", data);
        setIsConnected(true);
    };

    socket.on('code-verified', onCodeVerified);
    socket.on('code-error', onCodeError);
    socket.on('connect_error', onConnectError);
    socket.on('connected', onConnected);

    return () => { 
        socket.off('code-verified', onCodeVerified);
        socket.off('code-error', onCodeError);
        socket.off('connect_error', onConnectError);
        socket.off('connected', onConnected);
    };
  }, [socket]);

  useEffect(() => {
      if (sessionId && playerId && socket) {
        const doJoin = () => {
          console.log("Attempting join-session", sessionId, playerId);
          socket.emit('join-session', { sessionId, playerId: parseInt(playerId || '1') });
        };
        if (socket.connected) {
          doJoin();
        }
        socket.on('connect', doJoin);
        return () => {
          socket.off('connect', doJoin);
        };
      }
  }, [sessionId, playerId, socket]);

  const joinByCode = () => {
      if (!socket) {
          setError("Connecting to server... please wait");
          return;
      }
      if (!socket.connected) {
          setError("Socket disconnected, reconnecting...");
          return;
      }
      if (code.length < 4) {
          setError("Please enter the 4-digit code");
          return;
      }
      const pId = parseInt(playerId || '1');
      console.log("Emitting join-by-code", { code, playerId: pId });
      setError(null);
      socket.emit('join-by-code', { code, playerId: pId });
  };

  const handleKeypadPress = (key: string | number) => {
      setError(null);
      if (key === 'Enter') {
          joinByCode();
      } else if (key === 'Clear') {
          setCode('');
      } else {
          if (code.length < 4) setCode(prev => prev + key);
      }
  };

  const sendInput = (button: number, type: 'down' | 'up') => {
    if (!sessionId) return;
    socket?.emit('controller-input', { sessionId, playerId: parseInt(playerId || '1'), button, type });
  };

  const sendExit = () => {
    if (!sessionId) return;
    socket?.emit('controller-exit', { sessionId, playerId: parseInt(playerId || '1') });
  };

  const sendFullscreen = () => {
    if (!sessionId) return;
    socket?.emit('controller-fullscreen', { sessionId, playerId: parseInt(playerId || '1') });
  };

  if (!socket) {
    return <div className="text-white flex items-center justify-center h-screen bg-stone-900">Connecting to server...</div>;
  }

  if (!sessionId) {
      return (
          <div className="relative w-screen h-screen bg-stone-900 flex flex-col items-center justify-center p-4">
              <div className="absolute top-3 right-4">
                <button
                  onClick={() => {
                    if (!document.fullscreenElement && !(document as any).webkitFullscreenElement) {
                      if (document.documentElement.requestFullscreen) {
                        document.documentElement.requestFullscreen().catch(() => {});
                      } else if ((document.documentElement as any).webkitRequestFullscreen) {
                        (document.documentElement as any).webkitRequestFullscreen();
                      }
                    } else {
                      if (document.exitFullscreen) {
                        document.exitFullscreen().catch(() => {});
                      } else if ((document as any).webkitExitFullscreen) {
                        (document as any).webkitExitFullscreen();
                      }
                    }
                  }}
                  className="bg-stone-800/90 hover:bg-stone-700 active:bg-amber-600 text-stone-300 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 border border-stone-700 shadow select-none"
                  title="Toggle Fullscreen"
                >
                  <Maximize className="w-3.5 h-3.5" />
                  <span>Fullscreen</span>
                </button>
              </div>

              <h2 className="text-white mb-2 text-xl font-bold">Controller P{playerId}</h2>
              <p className="text-stone-400 mb-6 text-sm">Enter the 4-digit code from the TV</p>
              <div className="text-amber-500 text-3xl font-mono mb-8 tracking-widest h-12 flex items-center justify-center bg-stone-800 px-6 py-2 rounded-lg border border-amber-600/40">
                {code.padEnd(4, '_')}
              </div>
              
              <div className="grid grid-cols-3 gap-3 sm:gap-4 w-full max-w-xs">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 'Clear', 0, 'Enter'].map((key) => (
                      <button 
                          key={key} 
                          onClick={() => handleKeypadPress(key)}
                          className="bg-stone-700 text-white p-4 rounded-lg text-xl font-semibold hover:bg-stone-600 active:bg-amber-600 transition"
                      >
                          {key}
                      </button>
                  ))}
              </div>
              {error && <div className="text-red-400 mt-6 font-medium">{error}</div>}
          </div>
      );
  }

  return (
    <div className="w-screen h-screen bg-stone-900 flex flex-col items-center justify-center">
      <h2 className="text-white mb-4">Controller P{playerId}</h2>
      {isConnected && <div className="text-green-500 mb-2 font-bold">CONNECTED</div>}
      <ControllerOverlay 
        onButtonDown={(btn) => sendInput(btn, 'down')}
        onButtonUp={(btn) => sendInput(btn, 'up')}
        onExit={sendExit}
        onToggleFullscreen={sendFullscreen}
      />
    </div>
  );
};

const EmulatorView = ({ socket, sessionId, player1Connected, player2Connected, romData, setRomData }: any) => {
  const emulatorRef = useRef<any>(null);
  const gameSelectorRef = useRef<any>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [connectionCode] = useState(() => Math.floor(1000 + Math.random() * 9000).toString());
  const [scale, setScale] = useState(1);

  const handleConnect = (playerId: number) => {
    window.open(`${window.location.origin}/controller/${playerId}`, '_blank');
  };

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setScale(Math.min(window.innerWidth / 400, 1));
      } else {
        setScale(1);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!socket) return;
    const inputHandler = (data: any) => {
        if (romData) {
            if (data.type === 'down') {
                emulatorRef.current?.buttonDown(data.playerId, data.button);
            } else {
                emulatorRef.current?.buttonUp(data.playerId, data.button);
            }
        } else {
            gameSelectorRef.current?.handleInput(data.button, data.type);
        }
    };
    
    const exitHandler = () => {
        setRomData(null);
        setIsFullScreen(false);
    };

    const fullscreenHandler = () => {
        setIsFullScreen(prev => !prev);
    };

    socket.on('game-input', inputHandler);
    socket.on('game-exit', exitHandler);
    socket.on('game-fullscreen', fullscreenHandler);
    const registerCode = () => {
        console.log("Registering code:", connectionCode, "session:", sessionId);
        socket.emit('register-code', { code: connectionCode, sessionId });
    };

    if (socket.connected) {
        registerCode();
    }
    socket.on('connect', registerCode);
    registerCode();

    return () => { 
        socket.off('game-input', inputHandler); 
        socket.off('game-exit', exitHandler);
        socket.off('game-fullscreen', fullscreenHandler);
        socket.off('connect', registerCode);
    };
  }, [socket, romData, connectionCode, sessionId]);

  const triggerFullScreen = () => {
    setIsFullScreen(prev => !prev);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullScreen) {
        setIsFullScreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullScreen]);

  return (
    <div 
      className="relative w-screen h-screen overflow-hidden flex flex-col items-center justify-start pt-10 sm:pt-32 gap-6 sm:gap-20" 
      style={isFullScreen ? undefined : { transform: `scale(${scale})`, transformOrigin: 'top center' }}
    >
      <img 
        src="/assets/background.png" 
        alt="Room background" 
        className="absolute inset-0 w-full h-full object-cover -z-10" 
      />

      {/* Emulator container */}
      <div 
        className={`transition-all duration-300 ${romData ? 'opacity-100' : 'opacity-0'} ${
          isFullScreen 
            ? '!fixed !inset-0 !z-50 !w-screen !h-screen !bg-black flex items-center justify-center p-0 m-0 cursor-default' 
            : 'cursor-pointer'
        }`}
        style={isFullScreen ? { 
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            zIndex: 50,
            backgroundColor: '#000000'
        } : { 
            width: '32vw',
            height: '35vh' 
        }}
        onClick={isFullScreen ? undefined : triggerFullScreen}
      >
        <Emulator ref={emulatorRef} romData={romData} onStart={triggerFullScreen} isFullScreen={isFullScreen} />
        {isFullScreen && (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setIsFullScreen(false);
            }}
            className="absolute top-4 right-4 bg-stone-900/80 hover:bg-stone-800 text-white text-xs px-3 py-1.5 rounded-lg border border-stone-600 shadow z-50 flex items-center gap-1.5 backdrop-blur transition"
            title="Exit Fullscreen"
          >
            <Minimize className="w-3.5 h-3.5" />
            <span>Exit Fullscreen</span>
          </button>
        )}
      </div>

      {/* UI Overlay */}
      <div 
        className="bg-black/80 p-2 sm:p-4 rounded-xl border border-amber-600 backdrop-blur-md shadow-2xl flex flex-col items-center gap-2 sm:gap-3"
        style={{
            width: '340px',
        }}
      >
        <DriveGameSelector ref={gameSelectorRef} onGameSelected={setRomData} />

        <div className="flex gap-2 sm:gap-4 justify-center w-full items-center">
            {/* P1 */}
            <div key={1} className="flex flex-col items-center gap-1 sm:gap-2 w-full">
                <QRCodeSVG value={`${window.location.origin}/controller/${sessionId}/1`} size={50} />
                <div className="flex flex-col gap-0.5 sm:gap-1 w-full">
                    <button 
                        className="bg-amber-600 text-white text-[9px] py-1 rounded w-full hover:bg-amber-700 transition"
                        onClick={() => handleConnect(1)}
                    >
                        Connect
                    </button>
                </div>
                <div className={`flex items-center gap-0.5 text-[8px] ${player1Connected ? 'text-green-400' : 'text-gray-400'}`}>
                    <Gamepad2 size={8} /> P1: {player1Connected ? 'CONNECTED' : 'DISCONNECTED'}
                </div>
            </div>

            {/* Central Connection Code */}
            <div className="flex flex-col items-center text-[9px] text-white text-center whitespace-nowrap px-1">
                <div>Connect with:</div>
                <div className="font-bold text-sm text-amber-500">{connectionCode}</div>
                <div className="flex items-center gap-2 mt-0.5">
                  <button 
                      onClick={() => window.open(`${window.location.origin}/controller`, '_blank')}
                      className="text-[8px] text-amber-300/80 hover:text-amber-200 underline"
                      title="Open keypad to enter PIN"
                  >
                      Enter PIN
                  </button>
                  {romData && (
                    <button
                      onClick={triggerFullScreen}
                      className="text-[8px] text-stone-300 hover:text-white flex items-center gap-0.5 bg-stone-800 px-1.5 py-0.5 rounded border border-stone-700"
                      title="Toggle Canvas Fullscreen"
                    >
                      <Maximize className="w-2.5 h-2.5" />
                      <span>Fullscreen</span>
                    </button>
                  )}
                </div>
            </div>

            {/* P2 */}
            <div key={2} className="flex flex-col items-center gap-1 sm:gap-2 w-full">
                <QRCodeSVG value={`${window.location.origin}/controller/${sessionId}/2`} size={50} />
                <div className="flex flex-col gap-0.5 sm:gap-1 w-full">
                    <button 
                        className="bg-amber-600 text-white text-[9px] py-1 rounded w-full hover:bg-amber-700 transition"
                        onClick={() => handleConnect(2)}
                    >
                        Connect
                    </button>
                </div>
                <div className={`flex items-center gap-0.5 text-[8px] ${player2Connected ? 'text-green-400' : 'text-gray-400'}`}>
                    <Gamepad2 size={8} /> P2: {player2Connected ? 'CONNECTED' : 'DISCONNECTED'}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [romData, setRomData] = useState<Uint8Array | null>(null);
  const [sessionId] = useState(() => crypto.randomUUID());
  const [player1Connected, setPlayer1Connected] = useState(false);
  const [player2Connected, setPlayer2Connected] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    console.log("Initializing socket client for:", window.location.origin);
    const s = io(window.location.origin, { 
        path: '/socket.io',
        transports: ['websocket'], // Use only websocket initially
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000
    });
    
    s.on('connect', () => {
      console.log('Socket connected successfully:', s.id);
      s.emit('join-session', { sessionId, playerId: 0 }); // Join as viewer initially
    });
    
    s.on('connect_error', (err) => {
        console.error('Socket connection error:', err);
    });

    s.on('player-connected', (playerId) => {
        if (playerId === 1) setPlayer1Connected(true);
        if (playerId === 2) setPlayer2Connected(true);
    });
    setSocket(s);
    return () => { 
        console.log("Disconnecting socket");
        s.disconnect(); 
    };
  }, [sessionId]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/controller/:sessionId/:playerId" element={<ControllerView socket={socket} />} />
        <Route path="/controller/:playerId" element={<ControllerView socket={socket} />} />
        <Route path="/controller" element={<ControllerView socket={socket} />} />
        <Route path="/" element={<EmulatorView 
          socket={socket} 
          sessionId={sessionId}
          player1Connected={player1Connected}
          player2Connected={player2Connected}
          romData={romData}
          setRomData={setRomData}
        />} />
      </Routes>
    </BrowserRouter>
  );
}

