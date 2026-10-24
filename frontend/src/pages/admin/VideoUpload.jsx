import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { NavLink, useParams } from 'react-router';
import { CheckCircle2, FileVideo, UploadCloud, X } from 'lucide-react';
import axiosClient, { getErrorMessage } from '../../api/client';
import { refreshProblems } from '../../hooks/useProblems';
import { formatDuration, formatFileSize } from '../../lib/format';
import { DifficultyBadge } from '../../components/ui';
import { useToast } from '../../components/ui/Toast';

const MAX_BYTES = 100 * 1024 * 1024;

function VideoUpload() {
  const { problemId } = useParams();
  const toast = useToast();
  const inputRef = useRef(null);
  const [problem, setProblem] = useState(null);
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(null);

  useEffect(() => {
    axiosClient
      .get(`/problem/problemById/${problemId}`)
      .then(({ data }) => setProblem(data))
      .catch((e) => setError(getErrorMessage(e, 'Could not load problem')));
  }, [problemId]);

  const pick = (f) => {
    setError('');
    setDone(null);
    if (!f) return;
    if (!f.type.startsWith('video/')) return setError('Please choose a video file.');
    if (f.size > MAX_BYTES) return setError('File must be smaller than 100 MB.');
    setFile(f);
  };

  const upload = async () => {
    if (!file) return;
    setUploading(true);
    setProgress(0);
    setError('');
    try {
      // 1. Signed upload parameters from our backend.
      const { data: sig } = await axiosClient.get(`/video/create/${problemId}`);

      // 2. Upload straight to Cloudinary.
      const form = new FormData();
      form.append('file', file);
      form.append('signature', sig.signature);
      form.append('timestamp', sig.timestamp);
      form.append('public_id', sig.public_id);
      form.append('api_key', sig.api_key);
      const { data: cloud } = await axios.post(sig.upload_url, form, {
        onUploadProgress: (e) => e.total && setProgress(Math.round((e.loaded * 100) / e.total)),
      });

      // 3. Save metadata (backend verifies the asset exists on Cloudinary).
      const { data } = await axiosClient.post('/video/save', {
        problemId,
        cloudinaryPublicId: cloud.public_id,
        secureUrl: cloud.secure_url,
        duration: cloud.duration,
      });

      setDone(data.videoSolution);
      setFile(null);
      refreshProblems();
      toast.success('Video editorial uploaded');
    } catch (e) {
      const msg = e.response?.data?.error?.message || getErrorMessage(e, 'Upload failed. Please try again.');
      setError(msg);
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <NavLink to="/admin/problems?view=video" className="link link-hover text-sm text-base-content/60">
          ← Video editorials
        </NavLink>
        <h1 className="text-3xl font-bold">Upload video editorial</h1>
        {problem && (
          <p className="mt-1 flex items-center gap-2 text-base-content/70">
            {problem.title} <DifficultyBadge difficulty={problem.difficulty} />
            {problem.secureUrl && <span className="badge badge-warning badge-soft badge-sm">replaces existing video</span>}
          </p>
        )}
      </div>

      <div className="card border border-base-300 bg-base-100">
        <div className="card-body gap-5">
          <button
            type="button"
            className={`flex flex-col items-center justify-center gap-2 rounded-box border-2 border-dashed p-10 text-center transition ${
              dragOver ? 'border-primary bg-primary/5' : 'border-base-300 hover:border-primary/50'
            }`}
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              pick(e.dataTransfer.files?.[0]);
            }}
            disabled={uploading}
          >
            <UploadCloud size={36} className="text-primary" aria-hidden="true" />
            <span className="font-medium">Drop a video here or click to browse</span>
            <span className="text-xs text-base-content/50">MP4, WebM, MOV · up to 100 MB</span>
          </button>
          <input ref={inputRef} type="file" accept="video/*" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />

          {file && (
            <div className="flex items-center gap-3 rounded-box bg-base-200 p-3">
              <FileVideo size={20} className="text-secondary" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{file.name}</p>
                <p className="text-xs text-base-content/60">{formatFileSize(file.size)}</p>
              </div>
              {!uploading && (
                <button className="btn btn-ghost btn-xs btn-circle" onClick={() => setFile(null)} aria-label="Remove file">
                  <X size={14} />
                </button>
              )}
            </div>
          )}

          {uploading && (
            <div>
              <div className="mb-1 flex justify-between text-xs">
                <span>{progress < 100 ? 'Uploading to Cloudinary…' : 'Processing…'}</span>
                <span className="tabular-nums">{progress}%</span>
              </div>
              <progress className="progress progress-primary" value={progress} max={100} />
            </div>
          )}

          {error && (
            <div role="alert" className="alert alert-error alert-soft text-sm">
              {error}
            </div>
          )}

          {done && (
            <div role="status" className="alert alert-success alert-soft text-sm">
              <CheckCircle2 size={16} />
              <span>
                Uploaded · {formatDuration(done.duration)} ·{' '}
                <NavLink to={`/problem/${problemId}`} className="link">
                  view in workspace
                </NavLink>
              </span>
            </div>
          )}

          <div className="card-actions justify-end">
            <button className="btn btn-primary" onClick={upload} disabled={!file || uploading}>
              {uploading ? <span className="loading loading-spinner loading-sm" /> : <UploadCloud size={16} />}
              {uploading ? 'Uploading…' : 'Upload video'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default VideoUpload;
