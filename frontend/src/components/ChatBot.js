import React, { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Bot, X, Send, MessageSquare, Loader2 } from 'lucide-react';
import api from '../utils/api';

export const ChatBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [chat, setChat] = useState([
    { role: 'bot', content: 'Hello! I am Magnova AI. How can I help you today?' }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chat, isOpen]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    const userMessage = { role: 'user', content: message };
    setChat(prev => [...prev, userMessage]);
    setMessage('');
    setIsLoading(true);

    try {
      const response = await api.post('/chat', { message: userMessage.content });
      setChat(prev => [...prev, { role: 'bot', content: response.data.response }]);
    } catch (error) {
      console.error('Chat error:', error);
      setChat(prev => [...prev, { role: 'bot', content: 'I encountered an error processing your request. Please ensure the backend server and Gemini API are connected.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[1000] font-sans">
      {/* Floating Button */}
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          style={{ backgroundColor: '#BFC9D1' }}
          className="w-14 h-14 rounded-full shadow-2xl text-gray-900 flex items-center justify-center transition-all hover:scale-110 active:scale-95 border-2 border-white"
        >
          <MessageSquare className="w-6 h-6" />
        </Button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <Card className="w-[380px] h-[550px] shadow-[0_20px_50px_rgba(0,0,0,0.2)] flex flex-col border border-neutral-200 overflow-hidden animate-in slide-in-from-bottom-5 duration-300 rounded-2xl">
          <CardHeader style={{ backgroundColor: '#BFC9D1' }} className="text-gray-900 p-4 flex flex-row items-center justify-between space-y-0">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-black/10 rounded-xl">
                <Bot className="w-5 h-5 text-gray-900" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold tracking-tight text-gray-900">Magnova AI</CardTitle>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-green-600 rounded-full animate-pulse"></span>
                  <p className="text-[10px] text-gray-700 font-medium uppercase tracking-wider">Operational</p>
                </div>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setIsOpen(false)} 
              className="text-gray-900 hover:bg-black/10 rounded-full h-8 w-8"
            >
              <X className="w-5 h-5" />
            </Button>
          </CardHeader>
          
          <CardContent 
            className="flex-1 overflow-y-auto p-4 space-y-4" 
            ref={scrollRef}
            style={{ 
              backgroundColor: '#EAEFEF',
              backgroundImage: 'radial-gradient(#BFC9D1 0.5px, transparent 0.5px)', 
              backgroundSize: '20px 20px' 
            }}
          >
            {chat.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} items-end gap-2`}>
                {msg.role === 'bot' && (
                  <div className="w-6 h-6 rounded-full bg-neutral-200 flex items-center justify-center flex-shrink-0 mb-1">
                    <Bot className="w-3.5 h-3.5 text-neutral-600" />
                  </div>
                )}
                <div className={`max-w-[85%] p-3.5 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'user' 
                    ? 'bg-neutral-800 text-white rounded-br-none shadow-md shadow-neutral-200' 
                    : 'bg-white text-neutral-800 border border-neutral-200 rounded-bl-none shadow-sm'
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start items-end gap-2">
                <div className="w-6 h-6 rounded-full bg-neutral-200 flex items-center justify-center flex-shrink-0 mb-1">
                    <Bot className="w-3.5 h-3.5 text-neutral-600" />
                </div>
                <div className="bg-white border border-neutral-200 p-3 rounded-2xl rounded-bl-none shadow-sm flex items-center gap-2">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce"></span>
                    <span className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                    <span className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>

          <div className="p-4 border-t border-neutral-200 bg-white">
            <form onSubmit={handleSend} className="flex gap-2">
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Ask Magnova AI..."
                className="flex-1 text-sm border-neutral-200 focus-visible:ring-gray-900 h-10 rounded-xl"
                disabled={isLoading}
              />
              <Button 
                type="submit" 
                size="icon"
                style={{ backgroundColor: '#BFC9D1' }}
                className="text-gray-900 shrink-0 h-10 w-10 rounded-xl transition-transform active:scale-90 shadow-lg shadow-gray-100" 
                disabled={isLoading || !message.trim()}
              >
                <Send className="w-4 h-4" />
              </Button>
            </form>
            <p className="text-[9px] text-center text-neutral-400 mt-2">
              Powered by Magnova Intelligence • Gemini Flash
            </p>
          </div>
        </Card>
      )}
    </div>
  );
};
