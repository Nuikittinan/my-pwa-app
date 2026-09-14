import { useState } from 'react'
import './App.css'

function App() {
  const [todos, setTodos] = useState([])
  const [input, setInput] = useState('')

  const addTodo = () => {
    if (!input) return
    setTodos([...todos, input])
    setInput('')
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>📱 My name is Nui this is my First PWA App</h1>
      <p>รองรับการใช้งานแบบ Offline และกด Install ติดตั้งลงเครื่องได้!</p>
      
      <div style={{ marginBottom: '10px' }}>
        <input 
          type="text" 
          value={input} 
          onChange={(e) => setInput(e.target.value)}
          placeholder="เพิ่มรายการ..."
          style={{ padding: '8px', marginRight: '5px' }}
        />
        <button onClick={addTodo} style={{ padding: '8px 16px' }}>เพิ่ม</button>
      </div>

      <ul>
        {todos.map((todo, index) => (
          <li key={index}>{todo}</li>
        ))}
      </ul>
    </div>
  )
}

export default App