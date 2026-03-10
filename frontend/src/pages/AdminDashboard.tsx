import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Users, 
  UserCheck, 
  Clock, 
  Mail, 
  ArrowLeft,
  Search,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot,
  doc,
  updateDoc
} from "firebase/firestore";
import { db } from "../utils/firebase";

// CONFIG: Mets ton email ici pour bloquer l'accès aux autres !
const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || "";
const ADMIN_EMAILS = [ADMIN_EMAIL]; // Use env variable

export default function AdminDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Redirect if not admin
  if (!authLoading && (!user || !ADMIN_EMAILS.includes(user.email || ""))) {
    return <Navigate to="/dashboard" replace />;
  }

  useEffect(() => {
    const q = query(collection(db, "waitlist"), orderBy("joined_at", "desc"));
    
    // Real-time listener
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        joined_at: doc.data().joined_at?.toDate() || new Date()
      }));
      setEntries(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleInvite = async (id: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/waitlist/invite/${id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to invite user');
      }
      
      // The onSnapshot will automatically update the UI
    } catch (err) {
      console.error("Error inviting user:", err);
      alert("Error inviting user");
    }
  };

  const filteredEntries = entries.filter(e => 
    e.email.toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total: entries.length,
    pending: entries.filter(e => e.status === 'pending').length,
    invited: entries.filter(e => e.status === 'invited').length,
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white font-outfit p-8">
      {/* Background Decor */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[120px]" />
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <Link to="/dashboard" className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors mb-4">
              <ArrowLeft size={16} /> Back to Dashboard
            </Link>
            <h1 className="text-4xl font-black tracking-tight">Waitlist <span className="text-blue-500">Backoffice</span></h1>
            <p className="text-gray-500 mt-2">Manage Beta access for future users</p>
          </div>

          <div className="flex gap-4">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-4 min-w-[120px]">
              <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                <Users size={20} />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Total</p>
                <p className="text-xl font-black">{stats.total}</p>
              </div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-4 min-w-[120px]">
              <div className="h-10 w-10 rounded-xl bg-yellow-500/10 flex items-center justify-center text-yellow-500">
                <Clock size={20} />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Pending</p>
                <p className="text-xl font-black text-yellow-500">{stats.pending}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="relative mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
          <input 
            type="text" 
            placeholder="Search email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-6 focus:border-blue-500/50 outline-none transition-all"
          />
        </div>

        {/* Table/List */}
        <div className="bg-white/[0.02] border border-white/5 rounded-3xl overflow-hidden backdrop-blur-xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02]">
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">User</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">Date</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">Status</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence mode="popLayout">
                {filteredEntries.map((entry) => (
                  <motion.tr 
                    key={entry.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center text-blue-400 font-bold">
                          {entry.email[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-sm tracking-tight">{entry.email}</p>
                          <p className="text-[10px] text-gray-600 uppercase font-black">{entry.source || 'Landing Page'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-sm text-gray-400">
                      {entry.joined_at.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-6 py-5">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        entry.status === 'invited' 
                          ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
                          : 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'
                      }`}>
                        {entry.status === 'invited' ? <CheckCircle2 size={10} /> : <Clock size={10} />}
                        {entry.status}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-right">
                      {entry.status === 'pending' ? (
                        <button 
                          onClick={() => handleInvite(entry.id)}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-bold transition-all shadow-lg shadow-blue-500/20"
                        >
                          Invite
                        </button>
                      ) : (
                        <span className="text-gray-600 text-xs font-bold flex items-center justify-end gap-1">
                          Access enabled <UserCheck size={14} className="text-green-500" />
                        </span>
                      )}
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>

          {filteredEntries.length === 0 && !loading && (
            <div className="p-20 text-center flex flex-col items-center gap-4">
              <AlertCircle size={48} className="text-gray-700" />
              <p className="text-gray-500">No users found for this search.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
