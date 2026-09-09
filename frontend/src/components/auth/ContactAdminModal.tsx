import React, { useEffect } from 'react';
import { ShieldAlert, Mail, X, HelpCircle, LockKeyhole } from 'lucide-react';

interface ContactAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ContactAdminModal: React.FC<ContactAdminModalProps> = ({ isOpen, onClose }) => {
  const adminEmail = import.meta.env.VITE_ADMIN_CONTACT_EMAIL;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-[#090e1c] border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close dialog"
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mx-auto mb-4">
            <LockKeyhole className="w-6 h-6 text-cyan-400" />
          </div>
          <h2 id="modal-title" className="text-xl font-mono font-bold text-white tracking-wide">
            Password Reset
          </h2>
          <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-700/60 text-slate-400 font-mono text-xs">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
            <span>Administrative Policy Enforced</span>
          </div>
        </div>

        {/* Content Details */}
        <div className="space-y-4 font-mono text-xs text-slate-300">
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
            <p className="font-semibold text-slate-200 leading-relaxed">
              For security reasons, password resets are handled by Cyber Crew CTF administrators.
            </p>
            <p className="text-slate-400 leading-relaxed">
              Please contact an administrator to reset your password.
            </p>
          </div>

          {adminEmail ? (
            <div className="p-3.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-between text-cyan-300">
              <div className="flex items-center gap-2 truncate">
                <Mail className="w-4 h-4 flex-shrink-0 text-cyan-400" />
                <span className="truncate">{adminEmail}</span>
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center gap-2 text-amber-400">
              <HelpCircle className="w-4 h-4 flex-shrink-0" />
              <span>Please contact a Cyber Crew CTF administrator.</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="mt-8 flex flex-col sm:flex-row gap-3">
          {adminEmail ? (
            <a
              href={`mailto:${adminEmail}?subject=Cyber%20Crew%20CTF%20Password%20Reset%20Request`}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-gradient-to-r from-cyan-400 to-teal-400 hover:from-cyan-300 hover:to-teal-300 text-slate-950 font-mono font-bold text-xs shadow-md shadow-cyan-500/20 transition-all text-center"
            >
              <Mail className="w-4 h-4" />
              Contact Admin
            </a>
          ) : (
            <div className="flex-1 text-center py-2.5 px-4 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 font-mono text-xs">
              Please contact a Cyber Crew CTF administrator.
            </div>
          )}
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-5 rounded-lg bg-slate-900 border border-slate-700 hover:border-slate-500 text-slate-200 font-mono font-bold text-xs transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
