import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  MessageSquare, 
  Send, 
  ArrowLeft, 
  Star, 
  Code2, 
  Heart,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../utils/firebase';

const FEEDBACK_CATEGORIES = [
  'General',
  'AI Interviewer Quality',
  'Vision/Screen Sharing',
  'Audio/Voice Quality',
  'Technical Bug',
  'Feature Request',
  'UI/UX Design'
];

export default function FeedbackPage() {
  const navigate = useNavigate();
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [category, setCategory] = useState(FEEDBACK_CATEGORIES[0]);
  const [comment, setComment] = useState('');
  const [name, setName] = useState(auth.currentUser?.displayName || '');
  const [role, setRole] = useState('');
  const [company, setCompany] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0 || !comment.trim()) return;

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'app_feedback'), {
        userId: auth.currentUser?.uid || 'anonymous',
        userEmail: auth.currentUser?.email || 'anonymous',
        userName: name,
        userRole: role,
        userCompany: company,
        rating,
        category,
        comment,
        timestamp: serverTimestamp(),
        url: window.location.href,
        userAgent: navigator.userAgent
      });
      setIsSuccess(true);
    } catch (error) {
      console.error('Error submitting feedback:', error);
      alert('Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-6 text-white font-inter">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full text-center space-y-6 bg-white/[0.02] border border-white/5 rounded-3xl p-10"
        >
          <div className="flex justify-center">
            <div className="h-20 w-20 rounded-full bg-green-500/10 flex items-center justify-center text-green-500">
              <CheckCircle2 size={40} />
            </div>
          </div>
          <h1 className="text-3xl font-black">Thank You!</h1>
          <p className="text-gray-400">
            Your feedback means the world to us. We're building MockInterview.ai to help people like you ace their interviews.
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full py-4 rounded-2xl bg-blue-600 font-bold hover:bg-blue-500 transition-all shadow-lg shadow-blue-500/20"
          >
            Back to Dashboard
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white font-inter">
      {/* Background Decor */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-6 py-20">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-white transition-colors mb-8 group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          Back
        </button>

        <header className="mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-wider mb-4">
            <MessageSquare size={12} />
            Beta Feedback
          </div>
          <h1 className="text-4xl font-black tracking-tight mb-4">Help us build the <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">future of interviewing</span>.</h1>
          <p className="text-gray-400 text-lg leading-relaxed">
            Spotted a bug? Have a feature request? Or just want to tell us what you love? We're listening.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Rating */}
          <div className="space-y-4">
            <label className="text-sm font-bold text-gray-400 uppercase tracking-widest">How would you rate your experience?</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  onClick={() => setRating(star)}
                  className="transition-transform active:scale-90"
                >
                  <Star 
                    size={40} 
                    fill={(hoveredRating || rating) >= star ? '#3b82f6' : 'none'} 
                    stroke={(hoveredRating || rating) >= star ? '#3b82f6' : '#1f2937'} 
                    className="transition-colors"
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Category */}
            <div className="space-y-3">
              <label className="text-sm font-bold text-gray-400 uppercase tracking-widest">Feedback Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-white/[0.03] border border-white/5 rounded-2xl px-4 py-4 text-white focus:border-blue-500/50 outline-none transition-all appearance-none cursor-pointer"
              >
                {FEEDBACK_CATEGORIES.map(c => (
                  <option key={c} value={c} className="bg-[#0a0a0f]">{c}</option>
                ))}
              </select>
            </div>

            {/* Name */}
            <div className="space-y-3">
              <label className="text-sm font-bold text-gray-400 uppercase tracking-widest">Your Name (Optional)</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Interview King"
                className="w-full bg-white/[0.03] border border-white/5 rounded-2xl px-4 py-4 text-white focus:border-blue-500/50 outline-none transition-all placeholder:text-gray-700"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Current Role */}
            <div className="space-y-3">
              <label className="text-sm font-bold text-gray-400 uppercase tracking-widest">Current Role</label>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="Software Engineer / Student"
                className="w-full bg-white/[0.03] border border-white/5 rounded-2xl px-4 py-4 text-white focus:border-blue-500/50 outline-none transition-all placeholder:text-gray-700"
              />
            </div>

            {/* Company / Industry */}
            <div className="space-y-3">
              <label className="text-sm font-bold text-gray-400 uppercase tracking-widest">Target Company / Industry</label>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Google / Tech"
                className="w-full bg-white/[0.03] border border-white/5 rounded-2xl px-4 py-4 text-white focus:border-blue-500/50 outline-none transition-all placeholder:text-gray-700"
              />
            </div>
          </div>

          {/* Comment */}
          <div className="space-y-3">
            <label className="text-sm font-bold text-gray-400 uppercase tracking-widest">What's on your mind?</label>
            <textarea
              required
              rows={6}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Tell us everything — the good, the bad, and the glitchy..."
              className="w-full bg-white/[0.03] border border-white/5 rounded-2xl px-4 py-4 text-white focus:border-blue-500/50 outline-none transition-all placeholder:text-gray-700 resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting || rating === 0 || !comment.trim()}
            className="w-full group relative flex items-center justify-center gap-3 py-5 rounded-2xl bg-blue-600 font-black text-lg hover:bg-blue-500 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
          >
            {isSubmitting ? (
              <div className="h-6 w-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                Submit Feedback
                <Send size={20} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              </>
            )}
          </button>
        </form>

        <footer className="mt-20 pt-8 border-t border-white/5 text-center">
          <p className="text-gray-600 text-xs flex items-center justify-center gap-2">
            Made with <Heart size={12} className="text-pink-500 fill-pink-500" /> by the MockInterview.ai team
          </p>
        </footer>
      </div>
    </div>
  );
}
