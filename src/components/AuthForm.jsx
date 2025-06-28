import { useState } from 'react';
import { auth } from '../firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";

export default function AuthForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSignUp = async () => {
    await createUserWithEmailAndPassword(auth, email, password);
    alert("Signed up!");
  };

  const handleSignIn = async () => {
    await signInWithEmailAndPassword(auth, email, password);
    alert("Signed in!");
  };

  return (
    <div className="p-4 text-center">
      <h2 className="text-xl mb-2">🔑 Auth</h2>
      <input className="border p-2 m-1" placeholder="email" value={email} onChange={e => setEmail(e.target.value)} />
      <input className="border p-2 m-1" type="password" placeholder="password" value={password} onChange={e => setPassword(e.target.value)} />
      <div>
        <button className="bg-green-500 p-2 m-1 rounded" onClick={handleSignUp}>Sign Up</button>
        <button className="bg-blue-500 p-2 m-1 rounded" onClick={handleSignIn}>Sign In</button>
      </div>
    </div>
  );
}
