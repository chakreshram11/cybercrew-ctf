import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Challenge, Category, ChallengeDifficulty, ChallengeType, ChallengeStatus } from '../../types';
import { DifficultyBadge, CategoryBadge, StatusBadge } from '../../components/common/Badges';
import {
  Flag,
  Plus,
  Search,
  Edit2,
  Trash2,
  Terminal,
  AlertCircle,
  FileCode,
  Upload,
  Download,
  X,
  CheckCircle2,
} from 'lucide-react';
import { formatPoints } from '../../lib/utils';
import { supabase } from '../../lib/supabase';
import { useRealtimeChallenges } from '../../hooks/useRealtimeChallenges';

const ALLOWED_EXTENSIONS = new Set([
  // Images
  'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg',
  // Documents
  'pdf', 'txt', 'md', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
  // Archives
  'zip', '7z', 'tar', 'gz', 'tgz', 'bz2', 'xz', 'rar',
  // Audio
  'mp3', 'wav', 'ogg', 'flac', 'm4a',
  // Video
  'mp4', 'webm', 'mov', 'mkv',
  // Networking / Forensics
  'pcap', 'pcapng', 'cap', 'har', 'eml', 'evtx', 'reg', 'log', 'vmem', 'dmp', 'raw',
  // Data
  'json', 'xml', 'csv', 'yaml', 'yml',
  // Code / Source
  'py', 'js', 'ts', 'java', 'c', 'cpp', 'h', 'hpp', 'cs', 'go', 'rs', 'php', 'sh', 'ps1', 'sql', 'html', 'css', 'asm',
  // Security / CTF Binaries
  'bin', 'elf', 'exe', 'dll', 'apk', 'ipa', 'iso', 'img',
]);

export const AdminChallengesPage: React.FC = () => {
  const queryClient = useQueryClient();
  useRealtimeChallenges();

  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingChallenge, setEditingChallenge] = useState<Challenge | null>(null);

  // Form State for Create/Edit
  const [formData, setFormData] = useState<{
    name: string;
    slug: string;
    category_id: string;
    difficulty: ChallengeDifficulty;
    challenge_type: ChallengeType;
    description: string;
    base_points: number;
    minimum_points: number;
    first_blood_bonus: number;
    flag: string;
    status: ChallengeStatus;
    target_url?: string;
    target_host?: string;
    target_port?: number;
  }>({
    name: '',
    slug: '',
    category_id: '',
    difficulty: 'EASY',
    challenge_type: 'STATIC',
    description: '',
    base_points: 500,
    minimum_points: 100,
    first_blood_bonus: 50,
    flag: 'CCCTF{sample_flag}',
    status: 'ACTIVE',
  });

  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Multi-file attachment upload state
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const { data: challengesData, isLoading, refetch } = useQuery({
    queryKey: ['admin-challenges'],
    queryFn: async () => {
      const res = await api.get<Challenge[]>('/admin/challenges');
      return res.success && res.data ? res.data : [];
    },
  });

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await api.get<Category[]>('/categories');
      return res.success && res.data ? res.data : [];
    },
  });

  const challenges = challengesData || [];
  const categories = categoriesData || [];

  const { data: challengeFiles, refetch: refetchChallengeFiles } = useQuery({
    queryKey: ['admin-challenge-files', editingChallenge?.id],
    queryFn: async () => {
      if (!editingChallenge?.id) return [];
      const res = await api.get<any[]>(`/challenges/${editingChallenge.id}/files`);
      return res.success && res.data ? res.data : [];
    },
    enabled: !!editingChallenge?.id,
  });

  const getChallengeTypeFromCategory = (categorySlug?: string): ChallengeType => {
    switch (categorySlug) {
      case 'crypto':
        return 'CRYPTO';
      case 'web':
        return 'WEB';
      case 'pwn':
        return 'PWN';
      case 'reverse':
        return 'REVERSE';
      case 'forensics':
        return 'FORENSICS';
      case 'osint':
        return 'OSINT';
      case 'networking':
        return 'NETWORK';
      case 'linux':
        return 'LINUX';
      case 'windows':
        return 'WINDOWS';
      case 'mobile':
        return 'MOBILE';
      case 'cloud':
        return 'CLOUD';
      case 'ai-security':
        return 'AI_SECURITY';
      default:
        return 'MISC';
    }
  };

  const validateFiles = (files: FileList | File[], existingCount: number = 0): { valid: File[]; error?: string } => {
    const fileArray = Array.from(files);
    const maxMb = 100;
    const maxFiles = 20;

    if (existingCount + pendingFiles.length + fileArray.length > maxFiles) {
      return { valid: [], error: `Exceeds maximum allowed attachments (${maxFiles} files per challenge).` };
    }

    const validFiles: File[] = [];
    for (const f of fileArray) {
      const ext = f.name.split('.').pop()?.toLowerCase() || '';
      if (!ALLOWED_EXTENSIONS.has(ext)) {
        return {
          valid: [],
          error: `Disallowed extension: .${ext}. Allowed formats include PNG, JPG, PDF, ZIP, 7Z, PCAP, PCAPNG, MP3, WAV, MP4, PY, JS, BIN, ELF, EXE, APK, ISO, and standard CTF artifacts.`,
        };
      }
      if (f.size > maxMb * 1024 * 1024) {
        return { valid: [], error: `File "${f.name}" exceeds maximum permitted size (${maxMb} MB).` };
      }
      validFiles.push(f);
    }

    return { valid: validFiles };
  };

  const handleAddFiles = (fileList: FileList | File[]) => {
    setUploadError(null);
    const existingCount = challengeFiles?.length || 0;
    const { valid, error } = validateFiles(fileList, existingCount);
    if (error) {
      setUploadError(error);
      return;
    }
    setPendingFiles((prev) => [...prev, ...valid]);
  };

  const handleRemovePendingFile = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleAddFiles(e.dataTransfer.files);
    }
  };

  const uploadSingleFileToChallenge = async (challengeId: string, file: File) => {
    // Attempt 1: Direct backend multipart upload
    const formData = new FormData();
    formData.append('file', file);

    const uploadRes = await api.uploadFile(`/admin/challenges/${challengeId}/files/upload`, formData);
    if (uploadRes.success) {
      return { success: true };
    }

    // Fallback: Upload to Supabase Storage client directly and register
    const storagePath = `challenges/${challengeId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const { error: storageError } = await supabase.storage
      .from('challenge-files')
      .upload(storagePath, file, { upsert: true });

    if (storageError) {
      return { success: false, error: storageError.message };
    }

    const { data: urlData } = supabase.storage.from('challenge-files').getPublicUrl(storagePath);
    const publicUrl = urlData?.publicUrl || storagePath;

    const regRes = await api.post(`/admin/challenges/${challengeId}/files`, {
      file_name: file.name,
      file_size: file.size,
      file_path: publicUrl,
      mime_type: file.type || 'application/octet-stream',
    });

    return { success: regRes.success, error: regRes.error?.message };
  };

  const handleDeleteFile = async (fileId: string) => {
    if (!window.confirm('Delete this artifact file?')) return;
    try {
      const res = await api.delete(`/admin/files/${fileId}`);
      if (res.success) {
        refetchChallengeFiles();
        refetch();
        invalidateAllQueries();
      }
    } catch {
      alert('Failed to delete file.');
    }
  };

  const invalidateAllQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['challenges'] });
    queryClient.invalidateQueries({ queryKey: ['admin-challenges'] });
    queryClient.invalidateQueries({ queryKey: ['team-progress'] });
    queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    queryClient.invalidateQueries({ queryKey: ['categories'] });
    queryClient.invalidateQueries({ queryKey: ['scoreboard'] });
  };

  const filteredChallenges = challenges.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.category?.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenCreate = () => {
    setEditingChallenge(null);
    setPendingFiles([]);
    setUploadError(null);
    const defaultCat = categories[0];
    const defaultType = defaultCat ? getChallengeTypeFromCategory(defaultCat.slug) : 'STATIC';
    setFormData({
      name: '',
      slug: '',
      category_id: defaultCat?.id || '',
      difficulty: 'EASY',
      challenge_type: defaultType,
      description: '',
      base_points: 500,
      minimum_points: 100,
      first_blood_bonus: 50,
      flag: 'CCCTF{sample_flag}',
      status: 'ACTIVE',
      target_url: '',
      target_host: '',
      target_port: undefined,
    });
    setFormError(null);
    setShowModal(true);
  };

  const handleOpenEdit = (ch: Challenge) => {
    setEditingChallenge(ch);
    setPendingFiles([]);
    setUploadError(null);
    setFormData({
      name: ch.name,
      slug: ch.slug,
      category_id: ch.category_id,
      difficulty: ch.difficulty,
      challenge_type: ch.challenge_type,
      description: ch.description,
      base_points: ch.base_points,
      minimum_points: ch.minimum_points,
      first_blood_bonus: ch.first_blood_bonus,
      flag: '', // Never populate existing flag hash for security
      status: ch.status,
      target_url: ch.target?.target_url || '',
      target_host: ch.target?.target_host || '',
      target_port: ch.target?.target_port || undefined,
    });
    setFormError(null);
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    setSaving(true);
    setFormError(null);

    const payload = {
      name: formData.name.trim(),
      slug: formData.slug.trim(),
      category_id: formData.category_id,
      difficulty: formData.difficulty,
      challenge_type: formData.challenge_type,
      description: formData.description,
      base_points: Number(formData.base_points),
      minimum_points: Number(formData.minimum_points),
      first_blood_bonus: Number(formData.first_blood_bonus),
      flag: formData.flag && formData.flag.trim() ? formData.flag.trim() : undefined,
      status: formData.status,
      target_url: formData.target_url && formData.target_url.trim() ? formData.target_url.trim() : undefined,
      target_host: formData.target_host && formData.target_host.trim() ? formData.target_host.trim() : undefined,
      target_port: formData.target_port ? Number(formData.target_port) : undefined,
    };

    try {
      let targetId = editingChallenge?.id;

      if (editingChallenge) {
        // Update existing challenge
        const res = await api.patch(`/admin/challenges/${editingChallenge.id}`, payload);
        if (!res.success) {
          setFormError(res.error?.message || 'Failed to update challenge.');
          setSaving(false);
          return;
        }
      } else {
        // Create new challenge
        const res = await api.post<any>('/admin/challenges', payload);
        if (!res.success || !res.data) {
          setFormError(res.error?.message || 'Failed to create challenge.');
          setSaving(false);
          return;
        }
        targetId = res.data.id;
      }

      // Process pending file attachments if any
      if (targetId && pendingFiles.length > 0) {
        setUploadingFile(true);
        for (const file of pendingFiles) {
          const uploadRes = await uploadSingleFileToChallenge(targetId, file);
          if (!uploadRes.success) {
            console.warn(`File upload failed for ${file.name}: ${uploadRes.error}`);
          }
        }
        setUploadingFile(false);
      }

      setShowModal(false);
      setPendingFiles([]);
      refetch();
      refetchChallengeFiles();
      invalidateAllQueries();
    } catch {
      setFormError('Network connection error.');
    } finally {
      setSaving(false);
      setUploadingFile(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to permanently delete this challenge and all attached artifacts?')) return;
    try {
      const res = await api.delete(`/admin/challenges/${id}`);
      if (res.success) {
        refetch();
        invalidateAllQueries();
      }
    } catch {
      alert('Failed to delete challenge.');
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-mono font-bold text-white flex items-center gap-2">
            <Flag className="w-5 h-5 text-cyan-400" />
            CHALLENGE MANAGEMENT
          </h2>
          <p className="text-xs font-mono text-slate-400 mt-0.5">
            PROVISION, CONFIGURE, AND ORCHESTRATE CTF SCENARIOS
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-400 to-teal-400 text-slate-950 font-mono text-xs font-bold shadow-md shadow-cyan-500/20 hover:scale-[1.02] transition-all"
        >
          <Plus className="w-4 h-4" />
          NEW CHALLENGE
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-sm">
        <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter challenges..."
          className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-400"
        />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-800 bg-[#090e1c] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead className="bg-[#0a1020] text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Challenge Name</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Difficulty</th>
                <th className="px-4 py-3 text-right">Base Points</th>
                <th className="px-4 py-3 text-center">Solves</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-cyan-400">
                    <Terminal className="w-4 h-4 animate-spin inline mr-2" />
                    LOADING CHALLENGE INVENTORY...
                  </td>
                </tr>
              ) : filteredChallenges.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    No challenges in inventory.
                  </td>
                </tr>
              ) : (
                filteredChallenges.map((ch) => (
                  <tr key={ch.id} className="hover:bg-slate-800/30">
                    <td className="px-4 py-3 font-semibold text-white">
                      {ch.name}
                      <span className="block text-[10px] text-slate-500 font-normal">
                        /{ch.slug}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <CategoryBadge category={ch.category?.name || ch.challenge_type} />
                    </td>
                    <td className="px-4 py-3">
                      <DifficultyBadge difficulty={ch.difficulty} />
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-cyan-400">
                      <div>{formatPoints(ch.base_points)} PTS</div>
                      {ch.current_points !== undefined && ch.current_points !== ch.base_points && (
                        <div className="text-[10px] text-amber-400 font-normal">
                          ({formatPoints(ch.current_points)} dynamic)
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-slate-300">{ch.solves_count}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={ch.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(ch)}
                          className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-cyan-400 transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(ch.id)}
                          className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-rose-400 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Challenge Edit / Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-[#090e1c] border border-slate-700 rounded-2xl shadow-2xl p-6 font-mono text-xs max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <Flag className="w-4 h-4 text-cyan-400" />
              {editingChallenge ? 'EDIT CHALLENGE CONFIGURATION' : 'CREATE NEW CHALLENGE'}
            </h3>

            {formError && (
              <div className="mb-4 p-3 rounded bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 uppercase mb-1">Challenge Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        name: e.target.value,
                        slug: e.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9]+/g, '-')
                          .replace(/(^-|-$)/g, ''),
                      })
                    }
                    placeholder="e.g. SQL Nightmare"
                    className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-700 text-slate-100 focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 uppercase mb-1">Slug</label>
                  <input
                    type="text"
                    required
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-700 text-slate-100 focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-slate-300 uppercase mb-1">Category</label>
                  <select
                    value={formData.category_id}
                    onChange={(e) => {
                      const catId = e.target.value;
                      const cat = categories.find((c) => c.id === catId);
                      const suggestedType = cat ? getChallengeTypeFromCategory(cat.slug) : formData.challenge_type;
                      setFormData({ ...formData, category_id: catId, challenge_type: suggestedType });
                    }}
                    className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-700 text-slate-100 focus:outline-none focus:border-cyan-400"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 uppercase mb-1">Challenge Type</label>
                  <select
                    value={formData.challenge_type}
                    onChange={(e) =>
                      setFormData({ ...formData, challenge_type: e.target.value as ChallengeType })
                    }
                    className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-700 text-slate-100 focus:outline-none focus:border-cyan-400"
                  >
                    <option value="STATIC">Static</option>
                    <option value="CRYPTO">Cryptography</option>
                    <option value="WEB">Web</option>
                    <option value="NETWORK">Network</option>
                    <option value="PWN">Pwn (Binary Exploit)</option>
                    <option value="REVERSE">Reverse Engineering</option>
                    <option value="FORENSICS">Forensics</option>
                    <option value="OSINT">OSINT</option>
                    <option value="LINUX">Linux</option>
                    <option value="WINDOWS">Windows</option>
                    <option value="MOBILE">Mobile</option>
                    <option value="CLOUD">Cloud</option>
                    <option value="AI_SECURITY">AI Security</option>
                    <option value="MISC">Misc</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 uppercase mb-1">Difficulty</label>
                  <select
                    value={formData.difficulty}
                    onChange={(e) =>
                      setFormData({ ...formData, difficulty: e.target.value as ChallengeDifficulty })
                    }
                    className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-700 text-slate-100 focus:outline-none focus:border-cyan-400"
                  >
                    <option value="EASY">Easy</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HARD">Hard</option>
                    <option value="EXPERT">Expert</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 uppercase mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value as ChallengeStatus })
                    }
                    className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-700 text-slate-100 focus:outline-none focus:border-cyan-400"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="DRAFT">Draft</option>
                    <option value="DISABLED">Disabled</option>
                    <option value="ARCHIVED">Archived</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 uppercase mb-1">Description (Markdown Supported)</label>
                <textarea
                  rows={4}
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe the challenge briefing, target details, and objectives..."
                  className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-700 text-slate-100 focus:outline-none focus:border-cyan-400 font-sans"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 uppercase mb-1">Base Points</label>
                  <input
                    type="number"
                    value={formData.base_points}
                    onChange={(e) =>
                      setFormData({ ...formData, base_points: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-700 text-slate-100"
                  />
                  <span className="text-[10px] text-slate-500 block mt-0.5">Authoritative starting value</span>
                </div>
                <div>
                  <label className="block text-slate-300 uppercase mb-1">Min Points (Dynamic)</label>
                  <input
                    type="number"
                    value={formData.minimum_points}
                    onChange={(e) =>
                      setFormData({ ...formData, minimum_points: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-700 text-slate-100"
                  />
                  <span className="text-[10px] text-slate-500 block mt-0.5">Dynamic decay floor</span>
                </div>
                <div>
                  <label className="block text-slate-300 uppercase mb-1">First Blood Bonus</label>
                  <input
                    type="number"
                    value={formData.first_blood_bonus}
                    onChange={(e) =>
                      setFormData({ ...formData, first_blood_bonus: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-700 text-slate-100"
                  />
                  <span className="text-[10px] text-slate-500 block mt-0.5">Bonus for 1st solve</span>
                </div>
              </div>

              {/* Secret Flag input */}
              <div>
                <label className="block text-slate-300 uppercase mb-1">
                  Secret Flag (Will be hashed server-side with HMAC-SHA256)
                </label>
                <input
                  type="text"
                  value={formData.flag}
                  onChange={(e) => setFormData({ ...formData, flag: e.target.value })}
                  placeholder={editingChallenge ? '(Leave blank to retain current flag)' : 'CCCTF{...}'}
                  className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-700 text-slate-100"
                />
              </div>

              {/* Target options */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-slate-300 uppercase mb-1">Target Web URL (Optional)</label>
                  <input
                    type="text"
                    value={formData.target_url || ''}
                    onChange={(e) => setFormData({ ...formData, target_url: e.target.value })}
                    placeholder="https://web01.ctf.cybercrew.online"
                    className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-700 text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 uppercase mb-1">TCP Port (Optional)</label>
                  <input
                    type="number"
                    value={formData.target_port || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        target_port: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                    placeholder="1337"
                    className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-700 text-slate-100"
                  />
                </div>
              </div>

              {/* Attached Artifacts & Files Section */}
              <div className="pt-3 border-t border-slate-800/80 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-slate-300 uppercase tracking-wider text-xs font-bold flex items-center gap-1.5">
                    <FileCode className="w-4 h-4 text-cyan-400" />
                    <span>Challenge Artifacts & Attachments ({ (challengeFiles?.length || 0) + pendingFiles.length })</span>
                  </label>
                </div>

                {uploadError && (
                  <p className="text-xs text-rose-400 font-mono bg-rose-500/10 p-2 rounded border border-rose-500/20">{uploadError}</p>
                )}

                {/* Drag and Drop Upload Zone */}
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  className={`p-4 rounded-xl border-2 border-dashed transition-all text-center relative ${
                    dragActive
                      ? 'border-cyan-400 bg-cyan-500/10'
                      : 'border-slate-800 hover:border-slate-700 bg-slate-900/50'
                  }`}
                >
                  <Upload className="w-6 h-6 text-cyan-400 mx-auto mb-1.5" />
                  <p className="text-xs text-slate-200 font-bold mb-0.5">
                    Drag & drop challenge artifacts here, or{' '}
                    <label className="text-cyan-400 hover:underline cursor-pointer">
                      browse files
                      <input
                        type="file"
                        multiple
                        onChange={(e) => e.target.files && handleAddFiles(e.target.files)}
                        className="hidden"
                      />
                    </label>
                  </p>
                  <p className="text-[10px] text-slate-500 font-mono">
                    Supported: PNG, JPG, PDF, ZIP, 7Z, PCAP, PCAPNG, MP3, WAV, MP4, PY, JS, BIN, ELF, EXE, APK, ISO (Max 100 MB per file)
                  </p>
                </div>

                {/* Pending Files to upload */}
                {pendingFiles.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] text-slate-400 font-mono uppercase font-bold">New Files Selected (Will upload on save):</span>
                    {pendingFiles.map((file, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 rounded bg-cyan-950/20 border border-cyan-500/30 text-xs font-mono"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Upload className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                          <span className="text-slate-200 font-semibold truncate">{file.name}</span>
                          <span className="text-slate-400 text-[10px]">({(file.size / (1024 * 1024)).toFixed(2)} MB)</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemovePendingFile(idx)}
                          className="p-1 text-slate-400 hover:text-rose-400 transition-colors"
                          title="Remove file"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Existing Registered Files (when editing) */}
                {editingChallenge && challengeFiles && challengeFiles.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] text-slate-400 font-mono uppercase font-bold">Existing Registered Artifacts:</span>
                    {challengeFiles.map((f) => (
                      <div
                        key={f.id}
                        className="flex items-center justify-between p-2 rounded bg-slate-900 border border-slate-800 text-xs font-mono"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                          <span className="font-semibold text-white truncate">{f.file_name}</span>
                          <span className="text-slate-500 text-[10px]">
                            ({(f.file_size / 1024).toFixed(1)} KB)
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <a
                            href={f.file_path}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 rounded text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition-colors"
                            title="Download artifact"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                          <button
                            type="button"
                            onClick={() => handleDeleteFile(f.id)}
                            className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                            title="Delete artifact"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded bg-slate-900 border border-slate-700 text-slate-300 hover:text-white"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={saving || uploadingFile}
                  className="px-4 py-2 rounded bg-cyan-400 text-slate-950 font-bold hover:bg-cyan-300 disabled:opacity-50 flex items-center gap-1.5"
                >
                  {saving || uploadingFile ? (
                    <>
                      <Terminal className="w-3.5 h-3.5 animate-spin" />
                      <span>{uploadingFile ? 'UPLOADING ATTACHMENTS...' : 'SAVING...'}</span>
                    </>
                  ) : (
                    'SAVE CONFIGURATION'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
