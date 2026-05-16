"use client";

import { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import api from '../lib/api';
import styles from './ChatWidget.module.css';

export default function ChatWidget() {
  const { user, socket } = useAppContext();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [targetDepartment, setTargetDepartment] = useState('All');
  const [unreadCount, setUnreadCount] = useState(0);
  const [isRinging, setIsRinging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  
  const messagesEndRef = useRef(null);
  const audioRef = useRef(null);

  // Define departments available to chat with
  const departments = ['Manager', 'Sales', 'Kitchen', 'Store', 'Finance', 'Order', 'SuperAdmin', 'All'];

  useEffect(() => {
    // Create a simple beep audio directly in code to avoid missing file errors
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    const playBeep = () => {
      if (!audioContext) return;
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.type = 'sine';
      oscillator.frequency.value = 800; // Beep frequency
      
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.5, audioContext.currentTime + 0.1);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    };

    audioRef.current = {
      play: playBeep,
      interval: null
    };

    return () => {
      if (audioRef.current.interval) clearInterval(audioRef.current.interval);
    };
  }, []);

  useEffect(() => {
    if (!user || !socket) return;

    // Join department room
    socket.emit('join_department', user.role);

    // Fetch initial messages
    fetchMessages();

    // Socket listener for new messages
    const handleNewMessage = (msg) => {
      setMessages(prev => {
        // Prevent duplicate messages
        if (prev.find(m => m._id === msg._id)) return prev;
        return [...prev, msg];
      });

      // If we didn't send it, and the chat is closed or we are not focused, trigger ring
      if (msg.sender?._id !== user._id) {
        if (!isOpen) {
          setUnreadCount(prev => prev + 1);
          startRinging();
        } else {
          // If open, mark as read immediately
          markAsRead();
        }
      }
    };

    // Socket listener for read receipts
    const handleMessagesRead = (data) => {
      if (data.department === user.role) {
        stopRinging();
        setUnreadCount(0);
      }
    };

    socket.on('new_message', handleNewMessage);
    socket.on('messages_read', handleMessagesRead);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('messages_read', handleMessagesRead);
      stopRinging();
    };
  }, [user, socket, isOpen]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging) return;
      setPosition({
        x: e.clientX - dragOffset.current.x,
        y: e.clientY - dragOffset.current.y
      });
    };
    const handleMouseUp = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const handleMouseDown = (e) => {
    setIsDragging(true);
    dragOffset.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    };
  };

  const fetchMessages = async () => {
    try {
      const res = await api.get(`/messages/${user.role}`);
      setMessages(res.data);
      
      // Calculate unread
      const unread = res.data.filter(m => !m.isRead && m.sender?._id !== user._id && (m.targetDepartment === user.role || m.targetDepartment === 'All')).length;
      if (unread > 0) {
        setUnreadCount(unread);
        startRinging();
      }
    } catch (err) {
      console.error('Error fetching messages', err);
    }
  };

  const startRinging = () => {
    setIsRinging(true);
    if (audioRef.current && !audioRef.current.interval) {
      audioRef.current.play();
      audioRef.current.interval = setInterval(() => {
        audioRef.current.play();
      }, 2000); // Beep every 2 seconds
    }
  };

  const stopRinging = () => {
    setIsRinging(false);
    if (audioRef.current && audioRef.current.interval) {
      clearInterval(audioRef.current.interval);
      audioRef.current.interval = null;
    }
  };

  const markAsRead = async () => {
    if (unreadCount === 0) return;
    try {
      await api.put('/messages/read', { department: user.role });
      setUnreadCount(0);
      stopRinging();
    } catch (err) {
      console.error('Error marking as read', err);
    }
  };

  const handleToggle = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      markAsRead();
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      await api.post('/messages', {
        targetDepartment,
        content: newMessage,
        senderRole: user.role
      });
      setNewMessage('');
    } catch (err) {
      console.error('Error sending message', err);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  if (!user) return null;

  return (
    <div 
      className={styles.chatContainer}
      style={{ transform: `translate(${position.x}px, ${position.y}px)`, zIndex: isDragging ? 9999 : 1000 }}
    >
      {isOpen && (
        <div className={styles.chatWindow}>
          <div className={styles.chatHeader} onMouseDown={handleMouseDown} style={{ cursor: isDragging ? 'grabbing' : 'grab' }}>
            <h3>Departmental Chat</h3>
            <button className={styles.closeBtn} onClick={handleToggle} onMouseDown={e => e.stopPropagation()}>✕</button>
          </div>
          
          <div className={styles.chatBody} onMouseDown={e => e.stopPropagation()}>
            {messages.length === 0 ? (
              <div className={styles.emptyState}>No messages yet. Say hello!</div>
            ) : (
              messages.map(msg => {
                const isMine = msg.sender?._id === user._id;
                return (
                  <div key={msg._id} className={`${styles.messageWrapper} ${isMine ? styles.sent : styles.received}`}>
                    <div className={styles.messageSender}>
                      {isMine ? 'You' : `${msg.sender?.username} (${msg.senderRole})`} 
                      {msg.targetDepartment !== 'All' && !isMine && ` to ${msg.targetDepartment}`}
                    </div>
                    <div className={styles.messageBubble}>
                      {msg.content}
                    </div>
                    <div className={styles.messageTime}>
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          <form className={styles.chatFooter} onSubmit={handleSend} onMouseDown={e => e.stopPropagation()}>
            <div className={styles.formGroup}>
              <select 
                className={styles.select} 
                value={targetDepartment} 
                onChange={e => setTargetDepartment(e.target.value)}
              >
                {departments.map(dep => (
                  <option key={dep} value={dep}>
                    {dep === 'All' ? 'Broadcast to All' : `To: ${dep}`}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.inputGroup}>
              <input 
                type="text" 
                className={styles.input} 
                placeholder="Type a message..." 
                value={newMessage} 
                onChange={e => setNewMessage(e.target.value)}
              />
              <button type="submit" className={styles.sendBtn} disabled={!newMessage.trim()}>
                ➤
              </button>
            </div>
          </form>
        </div>
      )}

      <button 
        className={`${styles.chatButton} ${isRinging ? styles.ringing : ''}`} 
        onClick={handleToggle}
        onMouseDown={handleMouseDown}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        💬
        {unreadCount > 0 && <span className={styles.badge}>{unreadCount}</span>}
      </button>
    </div>
  );
}
