import React, { useState, useEffect } from 'react';
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import useWebSocket from 'react-use-websocket';

const App = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loggedIn, setLoggedIn] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [chat, setChat] = useState([]);
  const [userList, setUserList] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);

  const { sendMessage, lastMessage, readyState } = useWebSocket(`ws://localhost:5000/private-chat?username=${username}`);

  useEffect(() => {
    if (lastMessage !== null) {
      const messageData = JSON.parse(lastMessage.data);
      if (messageData.type === 'user-list') {
        setUserList(messageData.users);
      } else {
        const { sender, content } = messageData;
        setChat(prevChat => [...prevChat, `${sender}: ${content}`]);
      }
    }
  }, [lastMessage]);

  const handleSignup = async () => {
    try {
      await axios.post('http://localhost:5000/signup', { username, password });
      login(username, password);
    } catch (err) {
      setError(err.response?.data?.error || 'An error occurred during signup.');
    }
  };

  const handleLogin = async () => {
    login(username, password);
  };

  const login = async (username, password) => {
    try {
      const response = await axios.post('http://localhost:5000/login', { username, password });
      setLoggedIn(true);
      setError('');
      setUserList(response.data.users);
    } catch (err) {
      setError(err.response?.data?.error || 'An error occurred during login.');
    }
  };

  const handleLogout = () => {
    setLoggedIn(false);
    setUsername('');
    setPassword('');
    setChat([]);
    setUserList([]);
    setSelectedUser(null);
  };

  const handleSendMessage = () => {
    if (message.trim() === '') return;

    const messageData = {
      recipient: selectedUser,
      content: message
    };
    sendMessage(JSON.stringify(messageData));
    setChat(prevChat => [...prevChat, `${username}: ${message}`]);
    setMessage('');
  };

  const handleUserClick = async (user) => {
    setSelectedUser(user);
    setChat([]);

    try {
      const response = await axios.get('http://localhost:5000/messages', {
        params: { username, recipient: user }
      });
      const messages = response.data.map(msg => `${msg.sender}: ${msg.content}`);
      setChat(messages);
    } catch (err) {
      setError('An error occurred while retrieving messages.');
    }
  };

  return (
    <div className="container-fluid h-100">
      <div className="row h-100">
        <aside className={`col-3 p-0 bg-dark text-light ${loggedIn ? '' : 'd-none'}`}>
          <div className="position-fixed top-0 start-0 w-100 bg-dark text-light px-3 py-2">
            <h3>Users Online</h3>
          </div>
          <ul className="list-group chat-sidebar">
            {userList.filter(user => user !== username).map((user, index) => (
              <li key={index} className={`list-group-item ${selectedUser === user ? 'active' : ''}`} onClick={() => handleUserClick(user)}>
                {user}
              </li>
            ))}
          </ul>
        </aside>
        <main className="col-9 p-0">
          {loggedIn ? (
            <div className="container-fluid h-100 d-flex flex-column justify-content-center align-items-center">
              <h1 className="display-4 mb-4">Welcome, {username}!</h1>
              <button className="btn btn-danger mb-3" onClick={handleLogout}>
                Logout
              </button>
              {selectedUser ? (
                <div className="card chat-card">
                  <div className="card-header bg-primary text-white">
                    <h2>Private Chat {selectedUser && `with ${selectedUser}`}</h2>
                  </div>
                  <div className="card-body overflow-auto">
                    {chat.map((msg, index) => (
                      <div key={index} className="message">
                        {msg}
                      </div>
                    ))}
                  </div>
                  <div className="card-footer">
                    <div className="input-group">
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Type a message"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                      />
                      <button className="btn btn-primary" onClick={handleSendMessage}>Send</button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center mt-5">
                  <h1>RabbitMQ - Express.js - MongoDB ChatAPP</h1>
                </div>
              )}
            </div>
          ) : (
            <div className="container-fluid h-100 d-flex flex-column justify-content-center align-items-center">
              <h1 className="display-4 mb-4">Login</h1>
              <div className="mb-3">
                <input
                  type="text"
                  className="form-control mb-3"
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
                <input
                  type="password"
                  className="form-control mb-3"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div>
                <button className="btn btn-success me-2" onClick={handleLogin}>Login</button>
                <button className="btn btn-primary" onClick={handleSignup}>Signup</button>
              </div>
              {error && <p className="text-danger mt-2">{error}</p>}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default App;
