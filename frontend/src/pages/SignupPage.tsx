import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  Code2, 
  Mail, 
  Lock, 
  ArrowRight, 
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { 
  createUserWithEmailAndPassword,
} from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../utils/firebase';

export default function SignupPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    if (password !== confirmPassword) {
      setError('The passwords do not match');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const adminEmail = import.meta.env.VITE_ADMIN_EMAIL;
      // Admin bypass
      if (email === adminEmail) {
        await createUserWithEmailAndPassword(auth, email, password);
        navigate('/admin');
        return;
      }

      // 1. Check if email is in waitlist AND is invited
      const waitlistRef = collection(db, "waitlist");
      const q = query(waitlistRef, where("email", "==", email), where("status", "==", "invited"));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        // Let's check why: not in waitlist at all, or just hasn't been invited yet?
        const checkAny = query(waitlistRef, where("email", "==", email));
        const anySnapshot = await getDocs(checkAny);
        
        if (anySnapshot.empty) {
          setError("Sorry, this email is not on the waitlist. Sign up first!");
        } else {
          setError("Your request is pending. You will receive an email as soon as your access is activated!");
        }
        setLoading(false);
        return;
      }

      // 2. Create user in Firebase Auth
      await createUserWithEmailAndPassword(auth, email, password);
      navigate('/dashboard');
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') {
        setError('This email is already used');
      } else {
        setError('Error during account creation');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex items-center justify-center font-outfit">
      {/* Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.03)_1px,transparent_1px)] bg-[size:64px_64px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md px-6 py-10 rounded-3xl border border-white/5 bg-white/[0.02] backdrop-blur-xl shadow-2xl"
      >
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 shadow-lg shadow-blue-500/25 mb-4">
            <Code2 size={28} />
          </div>
          <h1 className="text-2xl font-black tracking-tight">
            Create an account
          </h1>
          <p className="mt-2 text-sm text-gray-500 text-center">Reserved for waitlist members</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSignup} className="space-y-4">
          <div className="space-y-4">
            <div className="relative">
              <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your email (used for the waitlist)"
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] py-3.5 pl-12 pr-4 text-white focus:border-blue-500/50 outline-none transition-all"
                required
              />
            </div>
            
            <div className="relative">
              <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] py-3.5 pl-12 pr-4 text-white focus:border-blue-500/50 outline-none transition-all"
                required
              />
            </div>

            <div className="relative">
              <CheckCircle2 size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] py-3.5 pl-12 pr-4 text-white focus:border-blue-500/50 outline-none transition-all"
                required
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-xs text-red-400">
              <AlertCircle size={14} />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 font-bold hover:bg-blue-500 transition-all disabled:opacity-50"
          >
            {loading ? "Checking..." : "Sign up"}
            <ArrowRight size={18} />
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-gray-500">
          Already have an account ? <Link to="/login" className="text-blue-400 hover:underline">Log in</Link>
        </p>
      </motion.div>
    </div>
  );
}
